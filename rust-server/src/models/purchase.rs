use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{NaiveDateTime, NaiveDate};

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Purchase {
    pub id: i64,
    pub supplier_id: i64,
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
    pub created_by: Option<i64>,
    pub money_box_id: Option<i64>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct PurchaseItem {
    pub id: i64,
    pub purchase_id: i64,
    pub product_id: i64,
    pub stock_id: Option<i64>,
    pub quantity: i64,
    pub price: f64,
    pub discount_percent: f64,
    pub tax_percent: f64,
    pub total: f64,
    pub returned_quantity: i64,
    pub expiry_date: Option<NaiveDate>,
    pub batch_number: Option<String>,
    pub notes: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePurchaseRequest {
    pub supplier_id: i64,
    pub invoice_no: Option<String>,
    pub invoice_date: NaiveDate,
    pub due_date: Option<NaiveDate>,
    pub items: Vec<CreatePurchaseItemRequest>,
    pub payment_method: Option<String>,
    pub payment_status: Option<String>,
    pub status: Option<String>,
    pub notes: Option<String>,
    pub money_box_id: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePurchaseItemRequest {
    pub product_id: i64,
    pub stock_id: i64,
    pub quantity: i64,
    pub price: f64,
    pub discount_percent: Option<f64>,
    pub tax_percent: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdatePurchaseRequest {
    pub supplier_id: Option<i64>,
    pub invoice_no: Option<String>,
    pub invoice_date: Option<NaiveDate>,
    pub due_date: Option<NaiveDate>,
    pub items: Vec<CreatePurchaseItemRequest>,
    pub payment_method: Option<String>,
    pub payment_status: Option<String>,
    pub status: Option<String>,
    pub notes: Option<String>,
    pub money_box_id: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PurchaseWithDetails {
    pub id: i64,
    pub supplier_id: i64,
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
    pub created_by: Option<i64>,
    pub money_box_id: Option<i64>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub supplier_name: Option<String>,
    pub supplier_contact: Option<String>,
    pub supplier_phone: Option<String>,
    pub supplier_email: Option<String>,
    pub supplier_address: Option<String>,
    pub total_returned_amount: f64,
    pub return_count: i64,
    pub last_return_date: Option<NaiveDate>,
    pub items: Vec<PurchaseItemWithDetails>,
    pub warnings: Option<Vec<PurchaseWarning>>,
    pub credit_status: Option<CreditStatus>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PurchaseItemWithDetails {
    pub id: i64,
    pub purchase_id: i64,
    pub product_id: i64,
    pub stock_id: Option<i64>,
    pub quantity: i64,
    pub price: f64,
    pub discount_percent: f64,
    pub tax_percent: f64,
    pub total: f64,
    pub returned_quantity: i64,
    pub expiry_date: Option<NaiveDate>,
    pub batch_number: Option<String>,
    pub notes: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub product_name: Option<String>,
    pub product_sku: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PurchaseWarning {
    pub r#type: String,
    pub message: String,
    pub data: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreditStatus {
    pub exceeded: bool,
    pub unlimited: bool,
    pub new_balance: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PurchaseReturnRequest {
    pub items: Vec<PurchaseReturnItemRequest>,
    pub reason: String,
    pub refund_method: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PurchaseReturnItemRequest {
    pub purchase_item_id: i64,
    pub quantity: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PurchaseReturn {
    pub id: i64,
    pub purchase_id: i64,
    pub return_date: NaiveDateTime,
    pub reason: String,
    pub status: String,
    pub refund_method: String,
    pub total_amount: f64,
    pub created_by: Option<i64>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub created_by_name: Option<String>,
    pub items: Vec<PurchaseReturnItem>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PurchaseReturnItem {
    pub id: i64,
    pub return_id: i64,
    pub purchase_item_id: i64,
    pub quantity: i64,
    pub price: f64,
    pub total: f64,
    pub product_id: Option<i64>,
    pub product_name: Option<String>,
    pub product_sku: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PurchaseWithReturns {
    pub id: i64,
    pub supplier_id: i64,
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
    pub created_by: Option<i64>,
    pub money_box_id: Option<i64>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub supplier_name: Option<String>,
    pub supplier_contact: Option<String>,
    pub supplier_phone: Option<String>,
    pub supplier_email: Option<String>,
    pub supplier_address: Option<String>,
    pub total_returned_amount: f64,
    pub return_count: i64,
    pub last_return_date: Option<NaiveDate>,
    pub items: Vec<PurchaseItemWithDetails>,
    pub return_stats: ReturnStats,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReturnStats {
    pub total_returns: i64,
    pub total_returned_amount: f64,
    pub total_returned_items: i64,
    pub last_return_date: Option<NaiveDate>,
    pub returns: Vec<crate::models::bill::PurchaseReturn>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PurchaseListResponse {
    pub purchases: Vec<PurchaseWithDetails>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PurchaseReturnResponse {
    pub return_id: i64,
    pub total_amount: f64,
    pub new_purchase_status: String,
}

impl Purchase {
    pub fn new(
        supplier_id: i64,
        invoice_no: String,
        invoice_date: NaiveDate,
        total_amount: f64,
        net_amount: f64,
    ) -> Self {
        let now = chrono::Utc::now().naive_utc();
        Self {
            id: 0, // Will be set by database
            supplier_id,
            invoice_no,
            invoice_date,
            due_date: None,
            total_amount,
            discount_amount: 0.0,
            tax_amount: 0.0,
            net_amount,
            paid_amount: 0.0,
            remaining_amount: net_amount,
            payment_method: "cash".to_string(),
            payment_status: "unpaid".to_string(),
            status: "completed".to_string(),
            notes: None,
            created_by: None,
            money_box_id: None,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn is_paid(&self) -> bool {
        self.payment_status == "paid"
    }

    pub fn is_partially_paid(&self) -> bool {
        self.payment_status == "partial"
    }

    pub fn is_unpaid(&self) -> bool {
        self.payment_status == "unpaid"
    }

    pub fn is_returned(&self) -> bool {
        self.status == "returned" || self.status == "partially_returned"
    }

    pub fn is_cancelled(&self) -> bool {
        self.status == "cancelled"
    }

    pub fn is_pending(&self) -> bool {
        self.status == "pending"
    }

    pub fn is_completed(&self) -> bool {
        self.status == "completed"
    }
}

impl PurchaseItem {
    pub fn new(
        purchase_id: i64,
        product_id: i64,
        stock_id: i64,
        quantity: i64,
        price: f64,
    ) -> Self {
        let now = chrono::Utc::now().naive_utc();
        let total = quantity as f64 * price;
        Self {
            id: 0, // Will be set by database
            purchase_id,
            product_id,
            stock_id: Some(stock_id),
            quantity,
            price,
            discount_percent: 0.0,
            tax_percent: 0.0,
            total,
            returned_quantity: 0,
            expiry_date: None,
            batch_number: None,
            notes: None,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn calculate_total(&self) -> f64 {
        let subtotal = self.quantity as f64 * self.price;
        let discount = subtotal * (self.discount_percent / 100.0);
        let after_discount = subtotal - discount;
        let tax = after_discount * (self.tax_percent / 100.0);
        after_discount + tax
    }

    pub fn get_remaining_quantity(&self) -> i64 {
        self.quantity - self.returned_quantity
    }

    pub fn is_fully_returned(&self) -> bool {
        self.returned_quantity >= self.quantity
    }

    pub fn is_partially_returned(&self) -> bool {
        self.returned_quantity > 0 && self.returned_quantity < self.quantity
    }
}
