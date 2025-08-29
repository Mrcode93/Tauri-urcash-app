use chrono::{DateTime, Utc, NaiveDateTime};
use serde::{Deserialize, Serialize};

pub mod user;
pub mod license;
pub mod bill;
pub mod money_box;
pub mod cloud_backup;
pub mod customer;
pub mod database;
pub mod debt;
pub mod delegate;
pub mod employee;
pub mod expense;
pub mod installment;
pub mod sale;
pub mod stock;
pub mod stock_movement;
pub mod supplier;
pub mod supplier_payment_receipt;
pub mod product;
pub mod purchase;
pub mod inventory;
pub mod setting;
pub mod device;


pub mod receipt;
pub mod report;

pub use user::*;
pub use license::*;
pub use bill::*;
pub use money_box::*;
pub use cloud_backup::*;
pub use customer::*;
pub use database::*;
pub use debt::*;
pub use delegate::*;
pub use employee::*;
pub use expense::*;
pub use installment::*;
pub use sale::*;
pub use stock::*;
pub use stock_movement::*;
pub use supplier::*;
pub use supplier_payment_receipt::*;
pub use product::*;
pub use purchase::*;
pub use inventory::*;
pub use setting::*;
pub use device::*;


pub use receipt::*;
pub use report::*;

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: Option<String>,
    pub error: Option<String>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            message: None,
            error: None,
        }
    }

    pub fn error(message: String) -> Self {
        Self {
            success: false,
            data: None,
            message: None,
            error: Some(message),
        }
    }

    pub fn message(message: String) -> Self {
        Self {
            success: true,
            data: None,
            message: Some(message),
            error: None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i32>,
    pub limit: Option<i32>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub total: i64,
    pub page: i32,
    pub limit: i32,
    pub total_pages: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginationInfo {
    pub page: i64,
    pub limit: i64,
    pub total: i64,
    pub total_pages: i64,
}

impl<T> PaginatedResponse<T> {
    pub fn new(data: Vec<T>, total: i64, page: i32, limit: i32) -> Self {
        let total_pages = (total as f64 / limit as f64).ceil() as i32;
        Self {
            data,
            total,
            page,
            limit,
            total_pages,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DateRangeFilter {
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StatusFilter {
    pub status: Option<String>,
    pub is_active: Option<bool>,
}
