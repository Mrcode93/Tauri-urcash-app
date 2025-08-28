use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{NaiveDateTime, NaiveDate};
use super::PaginationInfo;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Delegate {
    pub id: i64,
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub customer_id: Option<i64>,
    pub commission_rate: f64,
    pub commission_type: String,
    pub commission_amount: f64,
    pub sales_target: f64,
    pub is_active: bool,
    pub notes: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct DelegateSale {
    pub id: i64,
    pub delegate_id: i64,
    pub customer_id: i64,
    pub sale_id: i64,
    pub total_amount: f64,
    pub commission_rate: f64,
    pub commission_type: String,
    pub commission_amount: f64,
    pub notes: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct DelegateCollection {
    pub id: i64,
    pub delegate_id: i64,
    pub customer_id: i64,
    pub sale_id: Option<i64>,
    pub collection_amount: f64,
    pub payment_method: String,
    pub collection_date: NaiveDate,
    pub receipt_number: Option<String>,
    pub notes: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct DelegateCommission {
    pub id: i64,
    pub delegate_id: i64,
    pub period_start: NaiveDate,
    pub period_end: NaiveDate,
    pub total_sales: f64,
    pub total_commission: f64,
    pub payment_amount: f64,
    pub payment_date: NaiveDate,
    pub payment_method: Option<String>,
    pub notes: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct DelegatePerformance {
    pub delegate_id: i64,
    pub delegate_name: String,
    pub total_sales: f64,
    pub total_collections: f64,
    pub total_commission: f64,
    pub sales_count: i64,
    pub collections_count: i64,
    pub target_achievement: f64,
    pub period_start: NaiveDate,
    pub period_end: NaiveDate,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DelegateQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub search: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDelegateRequest {
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub commission_rate: Option<f64>,
    pub commission_type: Option<String>,
    pub commission_amount: Option<f64>,
    pub sales_target: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateDelegateRequest {
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub commission_rate: Option<f64>,
    pub commission_type: Option<String>,
    pub commission_amount: Option<f64>,
    pub sales_target: Option<f64>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDelegateSaleRequest {
    pub delegate_id: i64,
    pub customer_id: i64,
    pub sale_id: i64,
    pub total_amount: f64,
    pub commission_rate: Option<f64>,
    pub commission_type: Option<String>,
    pub commission_amount: Option<f64>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DelegateSalesQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDelegateCollectionRequest {
    pub delegate_id: i64,
    pub customer_id: i64,
    pub sale_id: Option<i64>,
    pub collection_amount: f64,
    pub payment_method: String,
    pub collection_date: NaiveDate,
    pub receipt_number: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AssignCustomerRequest {
    pub customer_id: i64,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BulkAssignCustomersRequest {
    pub customer_ids: Vec<i64>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CommissionQuery {
    pub period_start: NaiveDate,
    pub period_end: NaiveDate,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PayCommissionRequest {
    pub period_start: NaiveDate,
    pub period_end: NaiveDate,
    pub payment_amount: f64,
    pub payment_date: NaiveDate,
    pub payment_method: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CommissionHistoryQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardQuery {
    pub period_start: Option<NaiveDate>,
    pub period_end: Option<NaiveDate>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TopDelegatesQuery {
    pub limit: Option<i64>,
    pub period_start: Option<NaiveDate>,
    pub period_end: Option<NaiveDate>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PerformanceQuery {
    pub period_start: NaiveDate,
    pub period_end: NaiveDate,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SetTargetsRequest {
    pub sales_target: f64,
    pub commission_rate: Option<f64>,
    pub commission_type: Option<String>,
    pub commission_amount: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DelegateCustomersQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCommissionPaymentRequest {
    pub period_start: NaiveDate,
    pub period_end: NaiveDate,
    pub payment_amount: f64,
    pub payment_date: NaiveDate,
    pub payment_method: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GeneratePerformanceReportRequest {
    pub report_date: NaiveDate,
    pub period_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DelegateListResponse {
    pub delegates: Vec<Delegate>,
    pub pagination: PaginationInfo,
}



#[derive(Debug, Serialize, Deserialize)]
pub struct DelegateDashboard {
    pub delegate: Delegate,
    pub total_sales: f64,
    pub total_collections: f64,
    pub total_commission: f64,
    pub sales_count: i64,
    pub collections_count: i64,
    pub target_achievement: f64,
    pub recent_sales: Vec<DelegateSale>,
    pub recent_collections: Vec<DelegateCollection>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DelegateAnalytics {
    pub total_delegates: i64,
    pub active_delegates: i64,
    pub total_sales: f64,
    pub total_collections: f64,
    pub total_commission: f64,
    pub average_target_achievement: f64,
    pub top_performers: Vec<DelegatePerformance>,
}
