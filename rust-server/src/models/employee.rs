use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{NaiveDateTime, NaiveDate};
use super::PaginationInfo;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Employee {
    pub id: i64,
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub salary: f64,
    pub commission_rate: f64,
    pub commission_type: String,
    pub commission_amount: f64,
    pub commission_start_date: Option<NaiveDate>,
    pub commission_end_date: Option<NaiveDate>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EmployeeQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub search: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateEmployeeRequest {
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub salary: Option<f64>,
    pub commission_rate: Option<f64>,
    pub commission_type: Option<String>,
    pub commission_amount: Option<f64>,
    pub commission_start_date: Option<NaiveDate>,
    pub commission_end_date: Option<NaiveDate>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateEmployeeRequest {
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub salary: Option<f64>,
    pub commission_rate: Option<f64>,
    pub commission_type: Option<String>,
    pub commission_amount: Option<f64>,
    pub commission_start_date: Option<NaiveDate>,
    pub commission_end_date: Option<NaiveDate>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CalculateCommissionRequest {
    pub employee_id: i64,
    pub sales_amount: f64,
    pub period: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CommissionCalculation {
    pub employee_id: i64,
    pub employee_name: String,
    pub sales_amount: f64,
    pub commission_rate: f64,
    pub commission_type: String,
    pub commission_amount: f64,
    pub calculated_commission: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EmployeeListResponse {
    pub employees: Vec<Employee>,
    pub pagination: PaginationInfo,
}



#[derive(Debug, Serialize, Deserialize)]
pub struct EmployeeDropdown {
    pub id: i64,
    pub name: String,
    pub phone: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EmployeeWithCommission {
    pub id: i64,
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub salary: f64,
    pub commission_rate: f64,
    pub commission_type: String,
    pub commission_amount: f64,
    pub commission_start_date: Option<NaiveDate>,
    pub commission_end_date: Option<NaiveDate>,
}
