use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::NaiveDateTime;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Setting {
    pub id: i64,
    pub key: String,
    pub value: Option<String>,
    pub description: Option<String>,
    pub updated_at: NaiveDateTime,
}
