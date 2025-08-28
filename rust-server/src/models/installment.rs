use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{NaiveDateTime, NaiveDate};

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Installment {
    pub id: i64,
    pub sale_id: i64,
    pub customer_id: Option<i64>,
    pub due_date: NaiveDate,
    pub amount: f64,
    pub paid_amount: f64,
    pub payment_status: String,
    pub payment_method: Option<String>,
    pub paid_at: Option<NaiveDateTime>,
    pub notes: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InstallmentQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub search: Option<String>,
    pub customer_id: Option<i64>,
    pub sale_id: Option<i64>,
    pub payment_status: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateInstallmentRequest {
    pub sale_id: i64,
    pub customer_id: i64,
    pub due_date: NaiveDate,
    pub amount: f64,
    pub payment_method: String,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateInstallmentRequest {
    pub due_date: NaiveDate,
    pub amount: f64,
    pub payment_method: String,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InstallmentPaymentRequest {
    pub paid_amount: f64,
    pub payment_method: String,
    pub notes: Option<String>,
    pub money_box_id: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateInstallmentPlanRequest {
    pub customer_id: i64,
    pub selected_products: Vec<InstallmentProduct>,
    pub installment_months: i64,
    pub starting_due_date: NaiveDate,
    pub payment_method: String,
    pub notes: Option<String>,
    pub total_amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InstallmentProduct {
    pub product_id: i64,
    pub quantity: i64,
    pub price: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InstallmentListResponse {
    pub items: Vec<InstallmentWithDetails>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
    pub total_pages: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InstallmentWithDetails {
    pub id: i64,
    pub sale_id: i64,
    pub customer_id: Option<i64>,
    pub due_date: NaiveDate,
    pub amount: f64,
    pub paid_amount: f64,
    pub payment_status: String,
    pub payment_method: Option<String>,
    pub paid_at: Option<NaiveDateTime>,
    pub notes: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub invoice_no: Option<String>,
    pub customer_name: Option<String>,
    pub customer_phone: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InstallmentGroupedBySale {
    pub sale_id: i64,
    pub invoice_no: Option<String>,
    pub customer_name: Option<String>,
    pub customer_phone: Option<String>,
    pub sale_total: Option<f64>,
    pub sale_paid_amount: Option<f64>,
    pub installments: Vec<InstallmentWithDetails>,
    pub total_installments: i64,
    pub total_amount: f64,
    pub total_paid: f64,
    pub total_remaining: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InstallmentSummary {
    pub total_installments: i64,
    pub total_amount: f64,
    pub total_paid: f64,
    pub total_remaining: f64,
    pub unpaid_count: i64,
    pub partial_count: i64,
    pub paid_count: i64,
    pub overdue_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InstallmentPlan {
    pub sale_id: i64,
    pub customer_id: i64,
    pub total_amount: f64,
    pub installment_months: i64,
    pub installment_amount: f64,
    pub starting_due_date: NaiveDate,
    pub payment_method: String,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InstallmentPlanResponse {
    pub plan: InstallmentPlan,
    pub installments: Vec<Installment>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaymentRecordResponse {
    pub installment: InstallmentWithDetails,
    pub receipt: serde_json::Value,
    pub payment: PaymentRecord,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaymentRecord {
    pub paid_amount: f64,
    pub payment_method: String,
    pub notes: Option<String>,
    pub recorded_at: NaiveDateTime,
}
