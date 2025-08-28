use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{NaiveDateTime, NaiveDate};
use super::PaginationInfo;
    
#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Expense {
    pub id: i64,
    pub description: String,
    pub amount: f64,
    pub category: String,
    pub date: NaiveDate,
    pub money_box_id: Option<i64>,
    pub created_by: Option<i64>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExpenseQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub search: Option<String>,
    pub category: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateExpenseRequest {
    pub description: String,
    pub amount: f64,
    pub category: String,
    pub date: NaiveDate,
    pub money_box_id: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateExpenseRequest {
    pub description: String,
    pub amount: f64,
    pub category: String,
    pub date: NaiveDate,
    pub money_box_id: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExpenseListResponse {
    pub expenses: Vec<Expense>,
    pub pagination: PaginationInfo,
}



#[derive(Debug, Serialize, Deserialize)]
pub struct ExpenseTotalByCategory {
    pub category: String,
    pub total_amount: f64,
    pub expense_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExpenseTotalByDateRange {
    pub total_amount: f64,
    pub expense_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DateRangeQuery {
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
}
