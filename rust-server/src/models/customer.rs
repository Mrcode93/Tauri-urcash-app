use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{DateTime, Utc, NaiveDateTime};

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Customer {
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
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCustomerRequest {
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub credit_limit: Option<f64>,
    pub customer_type: Option<String>,
    pub tax_number: Option<String>,
    pub due_date: Option<NaiveDateTime>,
    pub representative_id: Option<i64>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateCustomerRequest {
    pub name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub credit_limit: Option<f64>,
    pub customer_type: Option<String>,
    pub tax_number: Option<String>,
    pub due_date: Option<NaiveDateTime>,
    pub representative_id: Option<i64>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomerQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub search: Option<String>,
    pub exclude_anonymous: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct CustomerFilters {
    pub search: Option<String>,
    pub exclude_anonymous: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomerListResponse {
    pub items: Vec<Customer>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
    pub total_pages: i64,
    pub has_more: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomerWithSales {
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
    pub sales: Vec<CustomerSale>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct CustomerSale {
    pub id: i64,
    pub invoice_no: String,
    pub customer_id: i64,
    pub total_amount: f64,
    pub paid_amount: f64,
    pub payment_status: String,
    pub status: String,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomerSaleItem {
    pub product_id: i64,
    pub quantity: i64,
    pub price: f64,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct CustomerSaleDebt {
    pub sale_id: i64,
    pub invoice_no: String,
    pub customer_id: i64,
    pub customer_name: String,
    pub total_amount: f64,
    pub paid_amount: f64,
    pub remaining_amount: f64,
    pub due_date: Option<NaiveDateTime>,
    pub status: String,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct CustomerInstallment {
    pub id: i64,
    pub sale_id: i64,
    pub customer_id: i64,
    pub amount: f64,
    pub due_date: NaiveDateTime,
    pub paid_amount: f64,
    pub status: String,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub invoice_no: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct CustomerBill {
    pub id: i64,
    pub invoice_no: String,
    pub invoice_date: NaiveDateTime,
    pub due_date: Option<NaiveDateTime>,
    pub total_amount: f64,
    pub paid_amount: f64,
    pub remaining_amount: f64,
    pub payment_status: String,
    pub status: String,
    pub notes: Option<String>,
    pub customer_name: String,
    pub customer_phone: Option<String>,
    pub created_by_name: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct CustomerReceipt {
    pub id: i64,
    pub receipt_number: String,
    pub customer_id: i64,
    pub sale_id: Option<i64>,
    pub receipt_date: NaiveDateTime,
    pub amount: f64,
    pub payment_method: String,
    pub reference_number: Option<String>,
    pub notes: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub customer_name: String,
    pub customer_phone: Option<String>,
    pub customer_email: Option<String>,
    pub sale_invoice_no: Option<String>,
    pub created_by_name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomerFinancialSummary {
    pub id: i64,
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub total_bills: f64,
    pub total_paid: f64,
    pub total_debt: f64,
    pub total_bills_count: i64,
    pub unpaid_bills_count: i64,
    pub paid_bills_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomerDetails {
    pub customer: Customer,
    pub debts: Vec<CustomerSaleDebt>,
    pub installments: Vec<CustomerInstallment>,
    pub bills: Vec<CustomerBill>,
    pub receipts: Vec<CustomerReceipt>,
    pub financial_summary: Option<CustomerFinancialSummary>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomerBalance {
    pub customer_id: i64,
    pub customer_name: String,
    pub total_debts: f64,
    pub total_payments: f64,
    pub current_balance: f64,
    pub credit_limit: f64,
    pub available_credit: f64,
}

impl Customer {
    pub fn new(
        name: String,
        email: Option<String>,
        phone: Option<String>,
        address: Option<String>,
        credit_limit: f64,
        customer_type: Option<String>,
        tax_number: Option<String>,
        due_date: Option<NaiveDateTime>,
        representative_id: Option<i64>,
    ) -> Self {
        let now = Utc::now().naive_utc();
        Self {
            id: 0, // Will be set by database
            name,
            email,
            phone,
            address,
            credit_limit,
            current_balance: 0.0,
            is_active: true,
            customer_type: Some(customer_type.unwrap_or_else(|| "retail".to_string())),
            tax_number,
            due_date,
            representative_id,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn available_credit(&self) -> f64 {
        self.credit_limit - self.current_balance
    }

    pub fn can_borrow(&self, amount: f64) -> bool {
        self.is_active && self.available_credit() >= amount
    }

    pub fn update_balance(&mut self, amount: f64) {
        self.current_balance += amount;
        self.updated_at = Utc::now().naive_utc();
    }
}
