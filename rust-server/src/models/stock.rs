use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{NaiveDateTime, NaiveDate};

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Stock {
    pub id: i64,
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub address: String,
    pub city: Option<String>,
    pub state: Option<String>,
    pub country: Option<String>,
    pub postal_code: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub manager_name: Option<String>,
    pub manager_phone: Option<String>,
    pub manager_email: Option<String>,
    pub is_main_stock: bool,
    pub is_active: bool,
    pub capacity: i64,
    pub current_capacity_used: i64,
    pub notes: Option<String>,
    pub created_by: Option<i64>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockWithStats {
    pub id: i64,
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub address: String,
    pub city: Option<String>,
    pub state: Option<String>,
    pub country: Option<String>,
    pub postal_code: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub manager_name: Option<String>,
    pub manager_phone: Option<String>,
    pub manager_email: Option<String>,
    pub is_main_stock: bool,
    pub is_active: bool,
    pub capacity: i64,
    pub current_capacity_used: i64,
    pub notes: Option<String>,
    pub created_by: Option<i64>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub total_products: i64,
    pub total_stock_quantity: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateStockRequest {
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub address: String,
    pub city: Option<String>,
    pub state: Option<String>,
    pub country: Option<String>,
    pub postal_code: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub manager_name: Option<String>,
    pub manager_phone: Option<String>,
    pub manager_email: Option<String>,
    pub is_main_stock: Option<bool>,
    pub capacity: Option<i64>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateStockRequest {
    pub name: Option<String>,
    pub code: Option<String>,
    pub description: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub country: Option<String>,
    pub postal_code: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub manager_name: Option<String>,
    pub manager_phone: Option<String>,
    pub manager_email: Option<String>,
    pub is_main_stock: Option<bool>,
    pub capacity: Option<i64>,
    pub notes: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub is_main_stock: Option<bool>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockListResponse {
    pub items: Vec<StockWithStats>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
    pub total_pages: i64,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct StockMovement {
    pub id: i64,
    pub movement_type: String,
    pub from_stock_id: Option<i64>,
    pub to_stock_id: Option<i64>,
    pub product_id: i64,
    pub quantity: i64,
    pub unit_cost: Option<f64>,
    pub total_value: Option<f64>,
    pub reference_type: Option<String>,
    pub reference_id: Option<i64>,
    pub reference_number: Option<String>,
    pub movement_date: NaiveDateTime,
    pub notes: Option<String>,
    pub created_by: Option<i64>,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockMovementWithDetails {
    pub id: i64,
    pub movement_type: String,
    pub from_stock_id: Option<i64>,
    pub to_stock_id: Option<i64>,
    pub product_id: i64,
    pub quantity: i64,
    pub unit_cost: Option<f64>,
    pub total_value: Option<f64>,
    pub reference_type: Option<String>,
    pub reference_id: Option<i64>,
    pub reference_number: Option<String>,
    pub movement_date: NaiveDateTime,
    pub notes: Option<String>,
    pub created_by: Option<i64>,
    pub created_at: NaiveDateTime,
    pub product_name: Option<String>,
    pub product_sku: Option<String>,
    pub from_stock_name: Option<String>,
    pub to_stock_name: Option<String>,
    pub created_by_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockMovementQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub movement_type: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockMovementListResponse {
    pub items: Vec<StockMovementWithDetails>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
    pub total_pages: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockProduct {
    pub id: i64,
    pub name: String,
    pub sku: String,
    pub barcode: Option<String>,
    pub description: Option<String>,
    pub purchase_price: f64,
    pub selling_price: f64,
    pub current_stock: i64,
    pub min_stock: i64,
    pub max_stock: i64,
    pub unit: String,
    pub category_id: Option<i64>,
    pub category_name: Option<String>,
    pub stock_id: Option<i64>,
    pub stock_name: Option<String>,
    pub is_active: bool,
    pub current_stock_in_stock: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockProductQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub category_id: Option<i64>,
    pub is_active: Option<bool>,
    pub low_stock: Option<bool>,
    pub out_of_stock: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockProductListResponse {
    pub items: Vec<StockProduct>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
    pub total_pages: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockStats {
    pub id: i64,
    pub name: String,
    pub capacity: i64,
    pub current_capacity_used: i64,
    pub total_products: i64,
    pub total_stock_quantity: i64,
    pub low_stock_products: i64,
    pub out_of_stock_products: i64,
    pub normal_stock_products: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AddProductToStockRequest {
    pub product_id: i64,
    pub quantity: i64,
    pub location_in_stock: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransferProductRequest {
    pub from_stock_id: i64,
    pub to_stock_id: i64,
    pub product_id: i64,
    pub quantity: i64,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AdjustStockRequest {
    pub stock_id: i64,
    pub product_id: i64,
    pub quantity: i64,
    pub adjustment_type: String, // "add" or "subtract"
    pub reason: String,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateStockProductRequest {
    pub quantity: Option<i64>,
    pub location_in_stock: Option<String>,
    pub notes: Option<String>,
}

impl Stock {
    pub fn get_capacity_percentage(&self) -> f64 {
        if self.capacity > 0 {
            (self.current_capacity_used as f64 / self.capacity as f64) * 100.0
        } else {
            0.0
        }
    }

    pub fn has_capacity_for(&self, quantity: i64) -> bool {
        if self.capacity <= 0 {
            true // No capacity limit
        } else {
            self.current_capacity_used + quantity <= self.capacity
        }
    }

    pub fn is_main(&self) -> bool {
        self.is_main_stock
    }

    pub fn is_active(&self) -> bool {
        self.is_active
    }
}

impl StockMovement {
    pub fn is_inbound(&self) -> bool {
        self.to_stock_id.is_some() && self.from_stock_id.is_none()
    }

    pub fn is_outbound(&self) -> bool {
        self.from_stock_id.is_some() && self.to_stock_id.is_none()
    }

    pub fn is_transfer(&self) -> bool {
        self.from_stock_id.is_some() && self.to_stock_id.is_some()
    }

    pub fn get_movement_description(&self) -> String {
        match (self.from_stock_id, self.to_stock_id) {
            (Some(from), Some(to)) => format!("Transfer from stock {} to stock {}", from, to),
            (Some(from), None) => format!("Outbound from stock {}", from),
            (None, Some(to)) => format!("Inbound to stock {}", to),
            (None, None) => "Adjustment".to_string(),
        }
    }
}

impl StockProduct {
    pub fn is_low_stock(&self) -> bool {
        self.current_stock_in_stock <= self.min_stock
    }

    pub fn is_out_of_stock(&self) -> bool {
        self.current_stock_in_stock == 0
    }

    pub fn get_stock_status(&self) -> String {
        if self.is_out_of_stock() {
            "out_of_stock".to_string()
        } else if self.is_low_stock() {
            "low_stock".to_string()
        } else {
            "normal".to_string()
        }
    }
}
