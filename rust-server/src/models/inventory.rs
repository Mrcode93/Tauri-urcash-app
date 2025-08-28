use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::NaiveDateTime;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Inventory {
    pub id: i64,
    pub product_id: i64,
    pub quantity: i32,
    pub reserved_quantity: i32,
    pub available_quantity: i32,
    pub last_updated: NaiveDateTime,
}
