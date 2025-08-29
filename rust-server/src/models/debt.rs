use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{NaiveDateTime, NaiveDate};

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Debt {
    pub id: i64,
    pub customer_id: i64,
    pub sale_id: i64,
    pub amount: f64,
    pub due_date: NaiveDate,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct DebtDetail {
    pub debt_id: Option<i64>,
    pub sale_id: i64,
    pub invoice_no: String,
    pub customer_id: i64,
    pub customer_name: String,
    pub customer_email: Option<String>,
    pub customer_phone: Option<String>,
    pub customer_address: Option<String>,
    pub total_amount: f64,
    pub paid_amount: f64,
    pub debt_amount: Option<f64>,
    pub remaining_amount: f64,
    pub due_date: Option<NaiveDate>,
    pub debt_status: Option<String>,
    pub calculated_status: String,
    pub notes: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct CustomerWithDebts {
    pub customer: CustomerDebtInfo,
    pub debts: Vec<DebtDetail>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct CustomerDebtInfo {
    pub id: i64,
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub credit_limit: f64,
    pub current_balance: f64,
    pub is_active: bool,
    pub customer_type: Option<String>,
    pub tax_number: Option<String>,
    pub due_date: Option<NaiveDateTime>,
    pub representative_id: Option<i64>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub total_sales: i64,
    pub total_purchased: f64,
    pub total_paid: f64,
    pub total_owed: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DebtQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub customer_id: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateDebtRequest {
    pub paid_amount: f64,
    pub due_date: Option<NaiveDate>,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RepayDebtRequest {
    pub paid_amount: f64,
    pub payment_method: Option<String>,
    pub reference_number: Option<String>,
    pub notes: Option<String>,
    pub receipt_date: Option<NaiveDate>,
    pub money_box_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RepayDebtLegacyRequest {
    pub paid_amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DebtStats {
    pub total_pending: i64,
    pub total_paid: i64,
    pub total_partial: i64,
    pub total_count: i64,
    pub total_outstanding_amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DebtPaginationInfo {
    pub page: i64,
    pub limit: i64,
    pub total: i64,
    pub total_pages: i64,
    pub has_more: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DebtListResponse {
    pub data: Vec<DebtDetail>,
    pub pagination: DebtPaginationInfo,
}



#[derive(Debug, Serialize, Deserialize)]
pub struct AppliedPayment {
    pub debt_id: i64,
    pub amount: f64,
    pub invoice_no: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RepayDebtResponse {
    pub debt: DebtDetail,
    pub receipt: Option<serde_json::Value>,
    pub applied_payments: Vec<AppliedPayment>,
    pub excess_amount: f64,
    pub total_paid: f64,
}
