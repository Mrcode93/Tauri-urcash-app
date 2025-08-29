use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{NaiveDateTime, NaiveDate};

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct SupplierPaymentReceipt {
    pub id: i64,
    pub receipt_number: String,
    pub supplier_id: i64,
    pub supplier_name: Option<String>,
    pub supplier_phone: Option<String>,
    pub supplier_email: Option<String>,
    pub supplier_address: Option<String>,
    pub purchase_id: Option<i64>,
    pub purchase_invoice_no: Option<String>,
    pub purchase_total_amount: Option<f64>,
    pub purchase_paid_amount: Option<f64>,
    pub purchase_remaining_amount: Option<f64>,
    pub receipt_date: NaiveDate,
    pub amount: f64,
    pub payment_method: String,
    pub reference_number: Option<String>,
    pub notes: Option<String>,
    pub money_box_id: Option<String>,
    pub created_by_name: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSupplierPaymentReceiptRequest {
    pub supplier_id: i64,
    pub purchase_id: Option<i64>,
    pub receipt_date: String,
    pub amount: f64,
    pub payment_method: String,
    pub reference_number: Option<String>,
    pub notes: Option<String>,
    pub receipt_number: Option<String>,
    pub money_box_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateSupplierPaymentReceiptRequest {
    pub supplier_id: Option<i64>,
    pub purchase_id: Option<i64>,
    pub receipt_date: Option<String>,
    pub amount: Option<f64>,
    pub payment_method: Option<String>,
    pub reference_number: Option<String>,
    pub notes: Option<String>,
    pub money_box_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SupplierPaymentReceiptQuery {
    pub supplier_id: Option<i64>,
    pub purchase_id: Option<i64>,
    pub payment_method: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub reference_number: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SupplierPaymentReceiptListResponse {
    pub items: Vec<SupplierPaymentReceipt>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
    pub total_pages: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SupplierPaymentReceiptSummary {
    pub total_receipts: i64,
    pub total_amount: f64,
    pub first_receipt_date: Option<String>,
    pub last_receipt_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SupplierPaymentReceiptStatistics {
    pub total_receipts: i64,
    pub total_amount: f64,
    pub average_amount: f64,
    pub min_amount: f64,
    pub max_amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SupplierPurchase {
    pub id: i64,
    pub invoice_number: String,
    pub total_amount: f64,
    pub paid_amount: f64,
    pub remaining_amount: f64,
    pub purchase_date: String,
    pub supplier_id: i64,
    pub supplier_name: String,
}
