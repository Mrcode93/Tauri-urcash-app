use anyhow::Result;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use tracing::info;

use crate::database::Database;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Permission {
    pub id: i64,
    pub permission_id: String,
    pub name: String,
    pub description: Option<String>,
    pub category: String,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserPermissionsResponse {
    pub role: String,
    #[serde(rename = "rolePermissions")]
    pub role_permissions: Vec<Permission>,
    #[serde(rename = "customPermissions")]
    pub custom_permissions: Vec<Permission>,
    #[serde(rename = "allPermissions")]
    pub all_permissions: Vec<Permission>,
}

#[derive(Clone)]
pub struct PermissionsService;

impl PermissionsService {
    pub fn new() -> Self {
        Self
    }

    /// Get user permissions exactly like Node.js getUserPermissions method
    pub async fn get_user_permissions(&self, db: &Database, user_id: i64) -> Result<Vec<String>> {
        // Get user info
        let user_row = sqlx::query(
            "SELECT id, username, role FROM users WHERE id = ? AND is_active = 1"
        )
        .bind(user_id)
        .fetch_optional(&db.pool)
        .await?;

        let user = match user_row {
            Some(row) => row,
            None => return Err(anyhow::anyhow!("User not found")),
        };

        let mut role_permissions = Vec::new();
        
        // Only admin users get role-based permissions automatically
        if user.get::<Option<String>, _>("role").as_deref() == Some("admin") {
            let role_perms = sqlx::query(
                "SELECT rp.permission_id FROM role_permissions rp WHERE rp.role = ?"
            )
            .bind(user.get::<Option<String>, _>("role"))
            .fetch_all(&db.pool)
            .await?;
            
            role_permissions = role_perms.into_iter().map(|p| p.get::<String, _>("permission_id")).collect();
        }

        // Get custom permissions
        let custom_perms = sqlx::query(
            r#"
            SELECT up.permission_id 
            FROM user_permissions up 
            WHERE up.user_id = ? AND up.is_active = 1 
            AND (up.expires_at IS NULL OR up.expires_at > datetime('now'))
            "#
        )
        .bind(user_id)
        .fetch_all(&db.pool)
        .await?;
        
        let custom_permissions: Vec<String> = custom_perms.into_iter().map(|p| p.get::<String, _>("permission_id")).collect();

        // Combine role and custom permissions
        let mut all_permissions = role_permissions;
        all_permissions.extend(custom_permissions);

        // Remove duplicates
        all_permissions.sort();
        all_permissions.dedup();

        Ok(all_permissions)
    }

    /// Get user permissions with details (similar to Node.js getUserPermissionsWithDetails)
    pub async fn get_user_permissions_with_details(&self, db: &Database, user_id: i64) -> Result<UserPermissionsResponse> {
        // Get user info
        let user_row = sqlx::query(
            "SELECT id, username, role FROM users WHERE id = ? AND is_active = 1"
        )
        .bind(user_id)
        .fetch_optional(&db.pool)
        .await?;

        let user = match user_row {
            Some(row) => {
                let role: Option<String> = row.get("role");
                (row.get::<i64, _>("id"), row.get::<String, _>("username"), role)
            },
            None => return Err(anyhow::anyhow!("User not found")),
        };

        let mut role_permissions_ids = Vec::new();
        
        // Only admin users get role-based permissions automatically
        if user.2.as_deref() == Some("admin") {
            let role_perms = sqlx::query(
                "SELECT rp.permission_id FROM role_permissions rp WHERE rp.role = ?"
            )
            .bind(&user.2)
            .fetch_all(&db.pool)
            .await?;
            
            role_permissions_ids = role_perms.into_iter().map(|row| row.get::<String, _>("permission_id")).collect();
        }

        // Get custom permissions
        let custom_perms = sqlx::query(
            r#"
            SELECT up.permission_id 
            FROM user_permissions up 
            WHERE up.user_id = ? AND up.is_active = 1 
            AND (up.expires_at IS NULL OR up.expires_at > datetime('now'))
            "#
        )
        .bind(user_id)
        .fetch_all(&db.pool)
        .await?;
        
        let custom_permissions_ids: Vec<String> = custom_perms.into_iter().map(|row| row.get::<String, _>("permission_id")).collect();

        // Combine role and custom permissions IDs
        let mut all_permissions_ids = role_permissions_ids.clone();
        all_permissions_ids.extend(custom_permissions_ids.clone());

        // Remove duplicates
        all_permissions_ids.sort();
        all_permissions_ids.dedup();

        // Now get full Permission objects for each permission ID
        let role_permissions = self.get_permission_objects_by_ids(db, &role_permissions_ids).await?;
        let custom_permissions = self.get_permission_objects_by_ids(db, &custom_permissions_ids).await?;
        let all_permissions = self.get_permission_objects_by_ids(db, &all_permissions_ids).await?;

        Ok(UserPermissionsResponse {
            role: user.2.unwrap_or_else(|| "user".to_string()),
            role_permissions,
            custom_permissions,
            all_permissions,
        })
    }

    /// Helper method to get Permission objects by their IDs
    async fn get_permission_objects_by_ids(&self, db: &Database, permission_ids: &[String]) -> Result<Vec<Permission>> {
        if permission_ids.is_empty() {
            return Ok(Vec::new());
        }

        // Create a placeholder string for the IN clause
        let placeholders = permission_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        let query = format!(
            "SELECT id, permission_id, name, description, category, is_active, created_at, updated_at 
             FROM permissions 
             WHERE permission_id IN ({}) AND is_active = 1 
             ORDER BY category, name",
            placeholders
        );

        let mut query_builder = sqlx::query(&query);
        for permission_id in permission_ids {
            query_builder = query_builder.bind(permission_id);
        }

        let permissions = query_builder.fetch_all(&db.pool).await?;

        let result = permissions.into_iter().map(|p| Permission {
            id: p.get("id"),
            permission_id: p.get("permission_id"),
            name: p.get("name"),
            description: p.get("description"),
            category: p.get("category"),
            is_active: p.get::<Option<i64>, _>("is_active").unwrap_or(0) == 1,
            created_at: p.get::<Option<chrono::NaiveDateTime>, _>("created_at").map(|d| d.to_string()).unwrap_or_else(|| "".to_string()),
            updated_at: p.get::<Option<chrono::NaiveDateTime>, _>("updated_at").map(|d| d.to_string()).unwrap_or_else(|| "".to_string()),
        }).collect();

        Ok(result)
    }

    /// Check if user has a specific permission
    pub async fn has_permission(&self, db: &Database, user_id: i64, permission_id: &str) -> Result<bool> {
        let permissions = self.get_user_permissions(db, user_id).await?;
        Ok(permissions.contains(&permission_id.to_string()))
    }

    /// Get all available permissions
    pub async fn get_all_permissions(&self, db: &Database) -> Result<Vec<Permission>> {
        let permissions = sqlx::query(
            "SELECT id, permission_id, name, description, category, is_active, created_at, updated_at FROM permissions WHERE is_active = 1 ORDER BY category, name"
        )
        .fetch_all(&db.pool)
        .await?;

        let result = permissions.into_iter().map(|p| Permission {
            id: p.get("id"),
            permission_id: p.get("permission_id"),
            name: p.get("name"),
            description: p.get("description"),
            category: p.get("category"),
            is_active: p.get::<Option<i64>, _>("is_active").unwrap_or(0) == 1,
            created_at: p.get::<Option<chrono::NaiveDateTime>, _>("created_at").map(|d| d.to_string()).unwrap_or_else(|| "".to_string()),
            updated_at: p.get::<Option<chrono::NaiveDateTime>, _>("updated_at").map(|d| d.to_string()).unwrap_or_else(|| "".to_string()),
        }).collect();

        Ok(result)
    }

    /// Grant permission to user
    pub async fn grant_permission(&self, db: &Database, user_id: i64, permission_id: &str, granted_by: Option<i64>) -> Result<()> {
        sqlx::query(
            r#"
            INSERT INTO user_permissions (user_id, permission_id, granted_by, granted_at, is_active)
            VALUES (?, ?, ?, datetime('now'), 1)
            ON CONFLICT(user_id, permission_id) DO UPDATE SET
                is_active = 1,
                granted_by = excluded.granted_by,
                granted_at = excluded.granted_at
            "#
        )
        .bind(user_id)
        .bind(permission_id)
        .bind(granted_by)
        .execute(&db.pool)
        .await?;

        info!("Permission '{}' granted to user {}", permission_id, user_id);
        Ok(())
    }

    /// Revoke permission from user
    pub async fn revoke_permission(&self, db: &Database, user_id: i64, permission_id: &str) -> Result<()> {
        sqlx::query(
            "UPDATE user_permissions SET is_active = 0 WHERE user_id = ? AND permission_id = ?"
        )
        .bind(user_id)
        .bind(permission_id)
        .execute(&db.pool)
        .await?;

        info!("Permission '{}' revoked from user {}", permission_id, user_id);
        Ok(())
    }
}

impl Default for PermissionsService {
    fn default() -> Self {
        Self::new()
    }
}
