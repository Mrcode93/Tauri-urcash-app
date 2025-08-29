use chrono::{NaiveDateTime};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone, Default)]
pub struct MoneyBox {
    pub id: i64,
    pub name: String,
    pub notes: Option<String>,
    pub balance: f64,
    pub created_by: Option<i32>,
    pub created_by_name: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone, Default)]
pub struct MoneyBoxTransaction {
    pub id: i64,
    #[serde(rename = "box_id")]
    pub money_box_id: i64,
    #[serde(rename = "type")]
    pub transaction_type: String,
    pub amount: f64,
    pub balance_after: f64,
    pub notes: Option<String>,
    #[serde(rename = "related_box_id")]
    pub reference_id: Option<i32>,
    pub created_by: Option<i32>,
    pub created_by_name: Option<String>,
    pub box_name: Option<String>,
    pub created_at: Option<String>,
}