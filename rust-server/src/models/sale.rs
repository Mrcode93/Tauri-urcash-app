use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{NaiveDateTime, NaiveDate};

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Sale {
    pub id: i64,
    pub customer_id: Option<i64>,
    pub delegate_id: Option<i64>,
    pub invoice_no: String,
    pub invoice_date: NaiveDate,
    pub due_date: Option<NaiveDate>,
    pub total_amount: f64,
    pub discount_amount: f64,
    pub tax_amount: f64,
    pub net_amount: f64,
    pub paid_amount: f64,
    pub remaining_amount: f64,
    pub payment_method: String,
    pub payment_status: String,
    pub status: String,
    pub notes: Option<String>,
    pub barcode: Option<String>,
    pub created_by: Option<i64>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaleWithDetails {
    pub id: i64,
    pub customer_id: Option<i64>,
    pub customer_name: Option<String>,
    pub delegate_id: Option<i64>,
    pub delegate_name: Option<String>,
    pub invoice_no: String,
    pub invoice_date: NaiveDate,
    pub due_date: Option<NaiveDate>,
    pub total_amount: f64,
    pub discount_amount: f64,
    pub tax_amount: f64,
    pub net_amount: f64,
    pub paid_amount: f64,
    pub remaining_amount: f64,
    pub payment_method: String,
    pub payment_status: String,
    pub status: String,
    pub notes: Option<String>,
    pub barcode: Option<String>,
    pub created_by: Option<i64>,
    pub created_by_name: Option<String>,
    pub created_by_username: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub items: Vec<SaleItemWithDetails>,
    pub total_items: i64,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct SaleItem {
    pub id: i64,
    pub sale_id: i64,
    pub product_id: Option<i64>,
    pub product_name: Option<String>,
    pub quantity: i64,
    pub returned_quantity: i64,
    pub price: f64,
    pub discount_percent: f64,
    pub tax_percent: f64,
    pub total: f64,
    pub line_total: f64,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaleItemWithDetails {
    pub id: i64,
    pub sale_id: i64,
    pub product_id: Option<i64>,
    pub product_name: String,
    pub sku: String,
    pub unit: String,
    pub quantity: i64,
    pub returned_quantity: i64,
    pub price: f64,
    pub discount_percent: f64,
    pub tax_percent: f64,
    pub total: f64,
    pub line_total: f64,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSaleRequest {
    pub customer_id: Option<i64>,
    pub delegate_id: Option<i64>,
    pub invoice_date: Option<NaiveDate>,
    pub due_date: Option<NaiveDate>,
    pub payment_method: Option<String>,
    pub payment_status: Option<String>,
    pub paid_amount: Option<f64>,
    pub notes: Option<String>,
    pub items: Vec<CreateSaleItemRequest>,
    pub total_amount: Option<f64>,
    pub discount_amount: Option<f64>,
    pub tax_amount: Option<f64>,
    pub is_anonymous: Option<bool>,
    pub barcode: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSaleItemRequest {
    pub product_id: Option<i64>,
    pub name: Option<String>,
    pub quantity: i64,
    pub price: f64,
    pub discount_percent: Option<f64>,
    pub tax_percent: Option<f64>,
    pub total: Option<f64>,
    pub line_total: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateSaleRequest {
    pub customer_id: Option<i64>,
    pub delegate_id: Option<i64>,
    pub invoice_date: Option<NaiveDate>,
    pub due_date: Option<NaiveDate>,
    pub payment_method: Option<String>,
    pub payment_status: Option<String>,
    pub paid_amount: Option<f64>,
    pub notes: Option<String>,
    pub items: Option<Vec<CreateSaleItemRequest>>,
    pub total_amount: Option<f64>,
    pub discount_amount: Option<f64>,
    pub tax_amount: Option<f64>,
    pub barcode: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaleQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub customer_id: Option<i64>,
    pub delegate_id: Option<i64>,
    pub payment_status: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaleListResponse {
    pub items: Vec<SaleWithDetails>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
    pub total_pages: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaleReturnRequest {
    pub items: Vec<SaleReturnItemRequest>,
    pub reason: String,
    pub refund_method: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaleReturnItemRequest {
    pub sale_item_id: i64,
    pub quantity: i64,
    pub price: f64,
    pub total: f64,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct SaleReturn {
    pub id: i64,
    pub sale_id: i64,
    pub return_date: NaiveDateTime,
    pub reason: String,
    pub status: String,
    pub refund_method: String,
    pub total_amount: f64,
    pub created_by: Option<i64>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct SaleReturnItem {
    pub id: i64,
    pub return_id: i64,
    pub sale_item_id: i64,
    pub quantity: i64,
    pub price: f64,
    pub total: f64,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaleReturnWithDetails {
    pub id: i64,
    pub sale_id: i64,
    pub return_date: NaiveDateTime,
    pub reason: String,
    pub status: String,
    pub refund_method: String,
    pub total_amount: f64,
    pub created_by: Option<i64>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub items: Vec<SaleReturnItemWithDetails>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaleReturnItemWithDetails {
    pub id: i64,
    pub return_id: i64,
    pub sale_item_id: i64,
    pub quantity: i64,
    pub price: f64,
    pub total: f64,
    pub product_name: String,
    pub product_sku: String,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductByBarcodeResponse {
    pub id: i64,
    pub name: String,
    pub sku: String,
    pub barcode: String,
    pub description: Option<String>,
    pub purchase_price: f64,
    pub selling_price: f64,
    pub current_stock: i64,
    pub unit: String,
    pub category_id: Option<i64>,
    pub category_name: Option<String>,
    pub is_active: bool,
    pub stock: i64, // Alias for current_stock
    pub total_sold: i64,
    pub total_purchased: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaleReturnResult {
    pub return_id: i64,
    pub sale_id: i64,
    pub status: String,
    pub return_items: Vec<SaleReturnItemRequest>,
    pub total_amount: f64,
    pub new_sale_amounts: SaleAmounts,
    pub sale: SaleWithDetails,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaleAmounts {
    pub total: f64,
    pub paid: f64,
    pub remaining: f64,
    pub payment_status: String,
}

impl Sale {
    pub fn is_paid(&self) -> bool {
        self.payment_status == "paid"
    }

    pub fn is_returned(&self) -> bool {
        self.status == "returned" || self.status == "partially_returned"
    }

    pub fn get_remaining_amount(&self) -> f64 {
        self.total_amount - self.paid_amount
    }
}

impl SaleItem {
    pub fn get_remaining_quantity(&self) -> i64 {
        self.quantity - self.returned_quantity
    }

    pub fn calculate_total(&self) -> f64 {
        let subtotal = self.quantity as f64 * self.price;
        let discount = subtotal * (self.discount_percent / 100.0);
        let tax = (subtotal - discount) * (self.tax_percent / 100.0);
        subtotal - discount + tax
    }
}

impl CreateSaleItemRequest {
    pub fn is_manual_item(&self) -> bool {
        self.product_id.is_none() || self.product_id.unwrap() <= 0
    }

    pub fn get_display_name(&self) -> String {
        if let Some(name) = &self.name {
            name.clone()
        } else if self.is_manual_item() {
            "مواد اخرى".to_string()
        } else {
            "Unknown Product".to_string()
        }
    }

    pub fn get_sku(&self) -> String {
        if self.is_manual_item() {
            "MANUAL".to_string()
        } else {
            "PRODUCT".to_string()
        }
    }

    pub fn get_unit(&self) -> String {
        if self.is_manual_item() {
            "قطعة".to_string()
        } else {
            "قطعة".to_string()
        }
    }
}
