use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// ==================== SALE BILL MODELS ====================

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Sale {
    pub id: i64,
    pub customer_id: i64,
    pub delegate_id: Option<i64>,
    pub employee_id: Option<i64>,
    pub invoice_no: String,
    pub invoice_date: String,
    pub due_date: Option<String>,
    pub total_amount: f64,
    pub discount_amount: f64,
    pub tax_amount: f64,
    pub paid_amount: f64,
    pub payment_method: String,
    pub payment_status: String,
    pub bill_type: String,
    pub status: String,
    pub notes: Option<String>,
    pub barcode: Option<String>,
    pub created_by: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct SaleItem {
    pub id: i64,
    pub sale_id: i64,
    pub product_id: i64,
    pub stock_id: Option<i64>,
    pub quantity: i32,
    pub price: f64,
    pub discount_percent: f64,
    pub tax_percent: f64,
    pub total: f64,
    pub line_total: f64,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSaleBillRequest {
    pub bill_data: SaleBillData,
    pub items: Vec<SaleItemData>,
    pub money_box_id: Option<i64>,
    pub transaction_notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaleBillData {
    pub customer_id: i64,
    pub delegate_id: Option<i64>,
    pub employee_id: Option<i64>,
    pub invoice_date: String,
    pub due_date: Option<String>,
    pub discount_amount: Option<f64>,
    pub tax_amount: Option<f64>,
    pub paid_amount: Option<f64>,
    pub payment_method: Option<String>,
    pub bill_type: Option<String>,
    pub notes: Option<String>,
    pub barcode: Option<String>,
    pub created_by: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaleItemData {
    pub product_id: i64,
    pub stock_id: Option<i64>,
    pub quantity: i32,
    pub price: f64,
    pub discount_percent: Option<f64>,
    pub tax_percent: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateSalePaymentRequest {
    pub paid_amount: f64,
    pub payment_method: Option<String>,
    pub notes: Option<String>,
}

// ==================== PURCHASE BILL MODELS ====================

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct PurchaseBill {
    pub id: i64,
    pub supplier_id: i64,
    pub delegate_id: Option<i64>,
    pub employee_id: Option<i64>,
    pub invoice_no: String,
    pub invoice_date: String,
    pub due_date: Option<String>,
    pub total_amount: f64,
    pub discount_amount: f64,
    pub tax_amount: f64,
    pub paid_amount: f64,
    pub payment_method: String,
    pub payment_status: String,
    pub bill_type: String,
    pub status: String,
    pub notes: Option<String>,
    pub barcode: Option<String>,
    pub created_by: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct PurchaseBillItem {
    pub id: i64,
    pub purchase_id: i64,
    pub product_id: i64,
    pub stock_id: Option<i64>,
    pub quantity: i32,
    pub price: f64,
    pub discount_percent: f64,
    pub tax_percent: f64,
    pub total: f64,
    pub line_total: f64,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePurchaseBillRequest {
    pub bill_data: PurchaseBillData,
    pub items: Vec<PurchaseItemData>,
    pub money_box_id: Option<i64>,
    pub transaction_notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PurchaseBillData {
    pub supplier_id: i64,
    pub delegate_id: Option<i64>,
    pub employee_id: Option<i64>,
    pub invoice_date: String,
    pub due_date: Option<String>,
    pub discount_amount: Option<f64>,
    pub tax_amount: Option<f64>,
    pub paid_amount: Option<f64>,
    pub payment_method: Option<String>,
    pub bill_type: Option<String>,
    pub notes: Option<String>,
    pub barcode: Option<String>,
    pub created_by: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PurchaseItemData {
    pub product_id: i64,
    pub stock_id: Option<i64>,
    pub quantity: i32,
    pub price: f64,
    pub discount_percent: Option<f64>,
    pub tax_percent: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdatePurchasePaymentRequest {
    pub paid_amount: f64,
    pub payment_method: Option<String>,
    pub notes: Option<String>,
}

// ==================== RETURN BILL MODELS ====================

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct SaleReturn {
    pub id: i64,
    pub sale_id: i64,
    pub customer_id: i64,
    pub return_date: String,
    pub total_amount: f64,
    pub refund_amount: f64,
    pub refund_method: String,
    pub status: String,
    pub notes: Option<String>,
    pub created_by: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct PurchaseReturn {
    pub id: i64,
    pub purchase_id: i64,
    pub supplier_id: i64,
    pub return_date: String,
    pub total_amount: f64,
    pub refund_amount: f64,
    pub refund_method: String,
    pub status: String,
    pub reason: Option<String>,
    pub notes: Option<String>,
    pub created_by: Option<i64>,
    pub created_by_name: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub items: Option<Vec<PurchaseReturnItem>>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct SaleReturnItem {
    pub id: i64,
    pub return_id: i64,
    pub sale_item_id: i64,
    pub quantity: i32,
    pub price: f64,
    pub total: f64,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct PurchaseReturnItem {
    pub id: i64,
    pub return_id: i64,
    pub purchase_item_id: i64,
    pub quantity: i32,
    pub price: f64,
    pub total: f64,
    pub product_id: Option<i64>,
    pub product_name: Option<String>,
    pub product_sku: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateReturnBillRequest {
    pub return_data: ReturnBillData,
    pub items: Vec<ReturnItemData>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReturnBillData {
    pub return_type: String, // "sale" or "purchase"
    pub sale_id: Option<i64>,
    pub purchase_id: Option<i64>,
    pub customer_id: Option<i64>,
    pub supplier_id: Option<i64>,
    pub return_date: String,
    pub refund_method: Option<String>,
    pub notes: Option<String>,
    pub created_by: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReturnItemData {
    pub item_id: i64, // sale_item_id or purchase_item_id
    pub quantity: i32,
    pub price: f64,
}

// ==================== PAYMENT VOUCHER MODELS ====================

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePaymentVoucherRequest {
    pub bill_type: String, // "sale", "purchase", "return"
    pub bill_id: i64,
    pub return_type: Option<String>, // for returns: "sale" or "purchase"
    pub amount: f64,
    pub payment_method: String,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BatchPaymentVoucherRequest {
    pub bills: Vec<BatchPaymentBill>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BatchPaymentBill {
    pub bill_type: String,
    pub bill_id: i64,
    pub return_type: Option<String>,
    pub amount: f64,
    pub payment_method: String,
    pub notes: Option<String>,
}

// ==================== STATISTICS MODELS ====================

#[derive(Debug, Serialize, Deserialize)]
pub struct BillsStatistics {
    pub total_sales: i64,
    pub total_sales_amount: f64,
    pub total_paid_amount: f64,
    pub total_unpaid_amount: f64,
    pub total_discount: f64,
    pub total_tax: f64,
    pub average_sale_amount: f64,
    pub sales_by_status: std::collections::HashMap<String, i64>,
    pub sales_by_payment_method: std::collections::HashMap<String, i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PurchasesStatistics {
    pub total_purchases: i64,
    pub total_purchases_amount: f64,
    pub total_paid_amount: f64,
    pub total_unpaid_amount: f64,
    pub total_discount: f64,
    pub total_tax: f64,
    pub average_purchase_amount: f64,
    pub purchases_by_status: std::collections::HashMap<String, i64>,
    pub purchases_by_payment_method: std::collections::HashMap<String, i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReturnsStatistics {
    pub total_returns: i64,
    pub total_return_amount: f64,
    pub total_refund_amount: f64,
    pub sale_returns: i64,
    pub purchase_returns: i64,
    pub returns_by_status: std::collections::HashMap<String, i64>,
    pub returns_by_refund_method: std::collections::HashMap<String, i64>,
}

// ==================== QUERY MODELS ====================

#[derive(Debug, Serialize, Deserialize)]
pub struct BillsQuery {
    pub page: Option<i32>,
    pub limit: Option<i32>,
    pub customer_id: Option<i64>,
    pub supplier_id: Option<i64>,
    pub delegate_id: Option<i64>,
    pub payment_status: Option<String>,
    pub bill_type: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub invoice_no: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReturnsQuery {
    pub page: Option<i32>,
    pub limit: Option<i32>,
    pub return_type: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}
