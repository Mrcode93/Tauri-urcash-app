use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// ==================== CASH BOX MODELS ====================
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct CashBox {
    pub id: i64,
    pub user_id: i64,
    pub name: String,
    pub initial_amount: f64,
    pub current_amount: f64,
    pub status: String,
    pub opened_at: Option<DateTime<Utc>>,
    pub closed_at: Option<DateTime<Utc>>,
    pub opened_by: Option<i64>,
    pub closed_by: Option<i64>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    // Joined fields
    pub user_name: Option<String>,
    pub username: Option<String>,
    pub opened_by_name: Option<String>,
    pub closed_by_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct CashBoxTransaction {
    pub id: i64,
    pub cash_box_id: i64,
    pub user_id: i64,
    pub transaction_type: String,
    pub amount: f64,
    pub balance_before: f64,
    pub balance_after: f64,
    pub reference_type: String,
    pub reference_id: Option<i64>,
    pub sale_id: Option<i64>,
    pub purchase_id: Option<i64>,
    pub expense_id: Option<i64>,
    pub customer_receipt_id: Option<i64>,
    pub supplier_receipt_id: Option<i64>,
    pub description: Option<String>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    // Joined fields
    pub user_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct UserCashBoxSettings {
    pub id: i64,
    pub user_id: i64,
    pub default_opening_amount: f64,
    pub require_opening_amount: i32,
    pub require_closing_count: i32,
    pub allow_negative_balance: i32,
    pub max_withdrawal_amount: f64,
    pub require_approval_for_withdrawal: i32,
    pub auto_close_at_end_of_day: i32,
    pub auto_close_time: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ==================== REQUEST MODELS ====================
#[derive(Debug, Serialize, Deserialize)]
pub struct OpenCashBoxRequest {
    pub opening_amount: Option<f64>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CloseCashBoxRequest {
    pub closing_amount: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AddTransactionRequest {
    pub cash_box_id: i64,
    pub transaction_type: String,
    pub amount: f64,
    pub reference_type: String,
    pub reference_id: Option<i64>,
    pub description: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ManualTransactionRequest {
    pub cash_box_id: i64,
    pub transaction_type: String,
    pub amount: f64,
    pub description: String,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateCashBoxSettingsRequest {
    pub default_opening_amount: Option<f64>,
    pub require_opening_amount: Option<bool>,
    pub require_closing_count: Option<bool>,
    pub allow_negative_balance: Option<bool>,
    pub max_withdrawal_amount: Option<f64>,
    pub require_approval_for_withdrawal: Option<bool>,
    pub auto_close_at_end_of_day: Option<bool>,
    pub auto_close_time: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ForceCloseCashBoxRequest {
    pub reason: Option<String>,
    pub money_box_id: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransferToMoneyBoxRequest {
    pub cash_box_id: i64,
    pub amount: f64,
    pub target_type: String,
    pub target_money_box: Option<String>,
    pub notes: Option<String>,
}

// ==================== RESPONSE MODELS ====================
#[derive(Debug, Serialize, Deserialize)]
pub struct CashBoxSummary {
    pub has_open_cash_box: bool,
    pub cash_box_id: Option<i64>,
    pub current_amount: f64,
    pub opened_at: Option<DateTime<Utc>>,
    pub today_transactions: i64,
    pub today_amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CashBoxWithMoneyBoxSummary {
    pub cash_box: Option<CashBox>,
    pub daily_money_box: Option<MoneyBox>,
    pub cash_box_summary: CashBoxSummary,
    pub integration: CashBoxIntegration,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CashBoxIntegration {
    pub can_transfer_to_daily: bool,
    pub can_transfer_from_daily: bool,
    pub daily_box_balance: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CashBoxReport {
    pub cash_box: CashBox,
    pub transactions: Vec<CashBoxTransaction>,
    pub summary: CashBoxReportSummary,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CashBoxReportSummary {
    pub total_deposits: f64,
    pub total_withdrawals: f64,
    pub total_transactions: i64,
    pub opening_balance: f64,
    pub current_balance: f64,
    pub net_change: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ComprehensiveCashBoxReport {
    pub cash_box: Option<CashBox>,
    pub daily_money_box: Option<MoneyBox>,
    pub cash_box_transactions: Vec<CashBoxTransaction>,
    pub money_box_transactions: Vec<MoneyBoxTransaction>,
    pub summary: ComprehensiveReportSummary,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ComprehensiveReportSummary {
    pub cash_box_balance: f64,
    pub daily_money_box_balance: f64,
    pub total_balance: f64,
}

// ==================== MONEY BOX MODELS ====================
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct MoneyBox {
    pub id: i64,
    pub name: String,
    pub amount: f64,
    pub notes: Option<String>,
    pub created_by: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct MoneyBoxTransaction {
    pub id: i64,
    pub box_id: i64,
    pub r#type: String,
    pub amount: f64,
    pub balance_after: Option<f64>,
    pub notes: Option<String>,
    pub related_box_id: Option<i64>,
    pub created_by: Option<i64>,
    pub created_at: DateTime<Utc>,
}

// ==================== QUERY MODELS ====================
#[derive(Debug, Serialize, Deserialize)]
pub struct CashBoxTransactionsQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CashBoxHistoryQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CashBoxReportQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

// ==================== TRANSACTION TYPES ====================
pub const TRANSACTION_TYPES: &[&str] = &[
    "opening", "closing", "deposit", "withdrawal", "sale", 
    "purchase", "expense", "customer_receipt", "supplier_payment", 
    "adjustment", "sale_return", "purchase_return", "cash_deposit",
    "transfer_from", "transfer_from_cash_box", "transfer_from_daily_box", "transfer_from_money_box",
    "transfer_to_cashier", "transfer_to_money_box", "transfer_to_bank", "cash_box_closing"
];

pub const REFERENCE_TYPES: &[&str] = &[
    "sale", "purchase", "expense", "customer_receipt", 
    "supplier_payment", "manual", "opening", "closing", 
    "sale_return", "purchase_return", "debt", "installment"
];

pub const CASH_BOX_STATUSES: &[&str] = &["open", "closed"];
