use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::NaiveDateTime;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Receipt {
    pub id: i64,
    pub receipt_number: Option<String>,
    pub amount: f64,
    pub payment_method: Option<String>,
    pub receipt_date: NaiveDateTime,
    pub created_by: Option<i64>,
    pub notes: Option<String>,
}
