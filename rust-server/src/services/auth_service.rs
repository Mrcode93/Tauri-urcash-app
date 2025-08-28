use crate::database::Database;
use crate::models::{user::*, ApiResponse};
use bcrypt::{hash, verify, DEFAULT_COST};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::collections::HashMap;
use tracing::{info, warn};
use anyhow::Result;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    sub: String, // user_id
    username: String,
    role: String,
    exp: usize, // expiration time
    iat: usize, // issued at
}

impl Claims {
    pub fn get_user_id(&self) -> Result<i64> {
        self.sub.parse::<i64>().map_err(|e| anyhow::anyhow!("Invalid user ID: {}", e))
    }
}

#[derive(Clone)]
pub struct AuthService {
    jwt_secret: String,
}

impl AuthService {
    pub fn new() -> Self {
        let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| {
            warn!("JWT_SECRET not set, using default secret");
            "your-secret-key".to_string()
        });

        Self { jwt_secret }
    }

    pub async fn register(&self, db: &Database, request: RegisterRequest) -> Result<ApiResponse<AuthResponse>> {
        // Check if username already exists
        let existing_user = sqlx::query("SELECT id FROM users WHERE username = ?")
            .bind(&request.username)
            .fetch_optional(&db.pool)
            .await?;

        if existing_user.is_some() {
            return Ok(ApiResponse::error("Username already exists".to_string()));
        }

        // Check if email already exists (if provided)
        if let Some(email) = &request.email {
            let existing_email = sqlx::query("SELECT id FROM users WHERE email = ?")
                .bind(email)
                .fetch_optional(&db.pool)
                .await?;

            if existing_email.is_some() {
                return Ok(ApiResponse::error("Email already exists".to_string()));
            }
        }

        // Hash password
        let hashed_password = hash(&request.password, DEFAULT_COST)?;

        // Create user
        let role = request.role.unwrap_or_else(|| "user".to_string());
        let user_id = sqlx::query(
            r#"
            INSERT INTO users (username, password, name, email, role, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            "#
        )
        .bind(&request.username)
        .bind(hashed_password)
        .bind(&request.name)
        .bind(&request.email)
        .bind(&role)
        .execute(&db.pool)
        .await?
        .last_insert_rowid();

        // Get the created user
        let user = self.get_user_by_id(db, user_id).await?
            .ok_or_else(|| anyhow::anyhow!("Failed to retrieve created user"))?;
        let token = self.generate_token(&user)?;

        Ok(ApiResponse::success(AuthResponse { token, user }))
    }

    pub async fn login(&self, db: &Database, request: LoginRequest) -> Result<ApiResponse<AuthResponse>> {
        // Find user by username
        let user = match self.find_by_username(db, &request.username).await? {
            Some(user) => user,
            None => {
                return Ok(ApiResponse::error("Invalid username or password".to_string()));
            }
        };

        // Check if user is active
        if !user.is_active() {
            return Ok(ApiResponse::error("Account is deactivated".to_string()));
        }

        // Check if user is locked
        if user.is_locked() {
            return Ok(ApiResponse::error("Account is temporarily locked".to_string()));
        }

        // Verify password
        if !verify(&request.password, &user.password)? {
            // Increment login attempts
            self.increment_login_attempts(db, user.id.unwrap_or(0)).await?;
            return Ok(ApiResponse::error("Invalid username or password".to_string()));
        }

        // Reset login attempts on successful login
        self.reset_login_attempts(db, user.id.unwrap_or(0)).await?;

        // Update last login
        self.update_last_login(db, user.id.unwrap_or(0)).await?;

        // Generate token
        let token = self.generate_token(&user)?;

        Ok(ApiResponse::success(AuthResponse { token, user }))
    }

    pub async fn get_user_from_token(&self, db: &Database, token: &str) -> Result<User> {
        let claims = self.verify_token(token)?;
        let user_id: i64 = claims.sub.parse()?;
        
        match self.get_user_by_id(db, user_id).await? {
            Some(user) => Ok(user),
            None => Err(anyhow::anyhow!("User not found")),
        }
    }

    pub fn verify_token(&self, token: &str) -> Result<Claims> {
        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(self.jwt_secret.as_ref()),
            &Validation::default(),
        )?;

        Ok(token_data.claims)
    }

    pub async fn get_users(&self, db: &Database) -> Result<Vec<User>> {
        let rows = sqlx::query(
            r#"
            SELECT id, username, password, name, email, role, is_active, last_login, login_attempts, locked_until, created_at, updated_at
            FROM users
            ORDER BY created_at DESC
            "#
        )
        .fetch_all(&db.pool)
        .await?;

        let users = rows.iter().map(|row| User {
            id: row.get("id"),
            username: row.get("username"),
            password: row.get("password"),
            name: row.get("name"),
            email: row.get("email"),
            role: row.get("role"),
            is_active: row.get("is_active"),
            last_login: row.get("last_login"),
            login_attempts: row.get("login_attempts"),
            locked_until: row.get("locked_until"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        }).collect();

        Ok(users)
    }

    pub async fn get_user_by_id(&self, db: &Database, id: i64) -> Result<Option<User>> {
        let row = sqlx::query(
            r#"
            SELECT id, username, password, name, email, role, is_active, last_login, login_attempts, locked_until, created_at, updated_at
            FROM users WHERE id = ?
            "#
        )
        .bind(id)
        .fetch_optional(&db.pool)
        .await?;

        let user = row.map(|row| User {
            id: row.get("id"),
            username: row.get("username"),
            password: row.get("password"),
            name: row.get("name"),
            email: row.get("email"),
            role: row.get("role"),
            is_active: row.get("is_active"),
            last_login: row.get("last_login"),
            login_attempts: row.get("login_attempts"),
            locked_until: row.get("locked_until"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        });

        Ok(user)
    }

    async fn find_by_username(&self, db: &Database, username: &str) -> Result<Option<User>> {
        let row = sqlx::query(
            r#"
            SELECT id, username, password, name, email, role, is_active, last_login, login_attempts, locked_until, created_at, updated_at
            FROM users WHERE username = ?
            "#
        )
        .bind(username)
        .fetch_optional(&db.pool)
        .await?;

        let user = row.map(|row| User {
            id: row.get("id"),
            username: row.get("username"),
            password: row.get("password"),
            name: row.get("name"),
            email: row.get("email"),
            role: row.get("role"),
            is_active: row.get("is_active"),
            last_login: row.get("last_login"),
            login_attempts: row.get("login_attempts"),
            locked_until: row.get("locked_until"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        });

        Ok(user)
    }

    fn generate_token(&self, user: &User) -> Result<String> {
        let now = chrono::Utc::now();
        let exp = (now + chrono::Duration::hours(24)).timestamp() as usize;
        let iat = now.timestamp() as usize;

        let claims = Claims {
            sub: user.id.unwrap_or(0).to_string(),
            username: user.username.clone(),
            role: user.role.clone().unwrap_or_else(|| "user".to_string()),
            exp,
            iat,
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.jwt_secret.as_ref()),
        )?;

        Ok(token)
    }

    async fn increment_login_attempts(&self, db: &Database, user_id: i64) -> Result<()> {
        sqlx::query(
            "UPDATE users SET login_attempts = COALESCE(login_attempts, 0) + 1 WHERE id = ?"
        )
        .bind(user_id)
        .execute(&db.pool)
        .await?;

        // Check if we should lock the account (after 5 failed attempts)
        let user = self.get_user_by_id(db, user_id).await?;
        if let Some(user) = user {
            if user.login_attempts.unwrap_or(0) >= 5 {
                let lock_until = chrono::Utc::now() + chrono::Duration::minutes(15);
                sqlx::query(
                    "UPDATE users SET locked_until = ? WHERE id = ?"
                )
                .bind(lock_until.naive_utc())
                .bind(user_id)
                .execute(&db.pool)
                .await?;
            }
        }

        Ok(())
    }

    async fn reset_login_attempts(&self, db: &Database, user_id: i64) -> Result<()> {
        sqlx::query(
            "UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = ?"
        )
        .bind(user_id)
        .execute(&db.pool)
        .await?;

        Ok(())
    }

    async fn update_last_login(&self, db: &Database, user_id: i64) -> Result<()> {
        sqlx::query(
            "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?"
        )
        .bind(user_id)
        .execute(&db.pool)
        .await?;

        Ok(())
    }

    // Get all users (admin only)
    pub async fn get_all_users(&self, db: &Database, role_filter: Option<&str>) -> Result<Vec<User>> {
        let query = if let Some(role) = role_filter {
            sqlx::query(
                r#"
                SELECT id, username, name, role, created_at
                FROM users
                WHERE role = ?
                ORDER BY created_at DESC
                "#
            )
            .bind(role)
        } else {
            sqlx::query(
                r#"
                SELECT id, username, name, role, created_at
                FROM users
                ORDER BY created_at DESC
                "#
            )
        };

        let rows = query.fetch_all(&db.pool).await?;

        let users = rows.iter().map(|row| User {
            id: row.get("id"),
            username: row.get("username"),
            password: "".to_string(), // Don't return actual password
            name: row.get("name"),
            email: None, // Don't return email for security
            role: row.get("role"),
            is_active: Some(1), // Assume active users
            last_login: None, // Don't return sensitive info
            login_attempts: None,
            locked_until: None,
            created_at: row.get("created_at"),
            updated_at: None, // Don't return updated_at
        }).collect();

        Ok(users)
    }

    // Update user
    pub async fn update_user(&self, db: &Database, user_id: i64, request: crate::models::UpdateUserRequest) -> Result<Option<User>> {
        // Check if user exists
        let existing_user = self.get_user_by_id(db, user_id).await?;
        if existing_user.is_none() {
            return Ok(None);
        }

        // Build update query based on provided fields
        if let Some(name) = request.name {
            sqlx::query("UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
                .bind(name)
                .bind(user_id)
                .execute(&db.pool)
                .await?;
        }

        if let Some(email) = request.email {
            sqlx::query("UPDATE users SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
                .bind(email)
                .bind(user_id)
                .execute(&db.pool)
                .await?;
        }

        if let Some(role) = request.role {
            sqlx::query("UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
                .bind(role)
                .bind(user_id)
                .execute(&db.pool)
                .await?;
        }

        if let Some(is_active) = request.is_active {
            let active_value = if is_active { 1 } else { 0 };
            sqlx::query("UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
                .bind(active_value)
                .bind(user_id)
                .execute(&db.pool)
                .await?;
        }

        if let Some(password) = request.password {
            let hashed_password = hash(&password, DEFAULT_COST)?;
            sqlx::query("UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
                .bind(hashed_password)
                .bind(user_id)
                .execute(&db.pool)
                .await?;
        }

        // Return updated user
        self.get_user_by_id(db, user_id).await
    }

    // Delete user
    pub async fn delete_user(&self, db: &Database, user_id: i64) -> Result<bool> {
        let result = sqlx::query("DELETE FROM users WHERE id = ?")
            .bind(user_id)
            .execute(&db.pool)
            .await?;
        
        Ok(result.rows_affected() > 0)
    }
}
