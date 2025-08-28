use chrono::{DateTime, Utc, NaiveDateTime};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct User {
    pub id: Option<i64>,
    pub username: String,
    pub password: String,
    pub name: String,
    pub email: Option<String>,
    pub role: Option<String>,
    pub is_active: Option<i64>,
    pub last_login: Option<NaiveDateTime>,
    pub login_attempts: Option<i64>,
    pub locked_until: Option<NaiveDateTime>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

impl User {
    pub fn new(
        username: String,
        password: String,
        name: String,
        email: Option<String>,
        role: String,
    ) -> Self {
        let now = Utc::now().naive_utc();
        Self {
            id: None, // Will be set by database
            username,
            password,
            name,
            email,
            role: Some(role),
            is_active: Some(1),
            last_login: None,
            login_attempts: Some(0),
            locked_until: None,
            created_at: Some(now),
            updated_at: Some(now),
        }
    }

    pub fn is_admin(&self) -> bool {
        matches!(self.role.as_deref(), Some("admin"))
    }

    pub fn can_manage_users(&self) -> bool {
        matches!(self.role.as_deref(), Some("admin") | Some("manager"))
    }

    pub fn can_view_reports(&self) -> bool {
        matches!(self.role.as_deref(), Some("admin") | Some("manager") | Some("accountant"))
    }

    pub fn is_active(&self) -> bool {
        self.is_active.unwrap_or(0) == 1
    }

    pub fn is_locked(&self) -> bool {
        if let Some(locked_until) = self.locked_until {
            locked_until > Utc::now().naive_utc()
        } else {
            false
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub password: String,
    pub name: String,
    pub email: Option<String>,
    pub role: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: User,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserResponse {
    pub id: i64,
    pub username: String,
    pub name: String,
    pub email: Option<String>,
    pub role: Option<String>,
    pub is_active: Option<i64>,
    pub last_login: Option<NaiveDateTime>,
    pub created_at: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateUserRequest {
    pub name: Option<String>,
    pub email: Option<String>,
    pub role: Option<String>,
    pub is_active: Option<bool>,
    pub password: Option<String>,
}

impl From<User> for UserResponse {
    fn from(user: User) -> Self {
        Self {
            id: user.id.unwrap_or(0),
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
            is_active: user.is_active,
            last_login: user.last_login,
            created_at: user.created_at,
        }
    }
}
