use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{NaiveDateTime, NaiveDate};

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
pub struct CreateStockMovementRequest {
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
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockMovementQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub movement_type: Option<String>,
    pub from_stock_id: Option<i64>,
    pub to_stock_id: Option<i64>,
    pub product_id: Option<i64>,
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
pub struct StockMovementStats {
    pub movement_type: String,
    pub total_movements: i64,
    pub total_quantity: i64,
    pub total_value: f64,
    pub unique_products: i64,
    pub unique_from_stocks: i64,
    pub unique_to_stocks: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockMovementStatsResponse {
    pub period_days: i64,
    pub movement_type: String,
    pub stats: Vec<StockMovementStats>,
    pub summary: StockMovementStatsSummary,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockMovementStatsSummary {
    pub total_movements: i64,
    pub total_quantity: i64,
    pub total_value: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReverseStockMovementRequest {
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductStockHistoryQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub movement_type: Option<String>,
    pub from_date: Option<NaiveDate>,
    pub to_date: Option<NaiveDate>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockMovementsSummaryQuery {
    pub period: Option<i64>,
    pub movement_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BulkCreateMovementsRequest {
    pub movements: Vec<CreateStockMovementRequest>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApproveMovementRequest {
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RejectMovementRequest {
    pub reason: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdatedStock {
    pub id: i64,
    pub name: String,
    pub total_stock_quantity: i64,
    pub total_products: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdatedProduct {
    pub id: i64,
    pub name: String,
    pub current_stock: i64,
    pub current_stock_in_stock: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockMovementResult {
    pub id: i64,
    pub updated_stocks: Vec<UpdatedStock>,
    pub updated_product: Option<UpdatedProduct>,
}

impl StockMovement {
    pub fn is_transfer(&self) -> bool {
        self.movement_type == "transfer"
    }

    pub fn is_purchase(&self) -> bool {
        self.movement_type == "purchase"
    }

    pub fn is_sale(&self) -> bool {
        self.movement_type == "sale"
    }

    pub fn is_adjustment(&self) -> bool {
        self.movement_type == "adjustment"
    }

    pub fn is_return(&self) -> bool {
        self.movement_type == "return"
    }

    pub fn is_initial(&self) -> bool {
        self.movement_type == "initial"
    }

    pub fn is_inbound(&self) -> bool {
        self.to_stock_id.is_some()
    }

    pub fn is_outbound(&self) -> bool {
        self.from_stock_id.is_some()
    }

    pub fn get_movement_description(&self) -> String {
        match self.movement_type.as_str() {
            "transfer" => "نقل مخزون".to_string(),
            "purchase" => "شراء".to_string(),
            "sale" => "بيع".to_string(),
            "adjustment" => "تعديل مخزون".to_string(),
            "return" => "إرجاع".to_string(),
            "initial" => "مخزون أولي".to_string(),
            _ => "حركة مخزون".to_string(),
        }
    }

    pub fn get_total_value(&self) -> f64 {
        self.total_value.unwrap_or(0.0)
    }

    pub fn get_unit_cost(&self) -> f64 {
        self.unit_cost.unwrap_or(0.0)
    }
}

impl StockMovementWithDetails {
    pub fn get_movement_description(&self) -> String {
        match self.movement_type.as_str() {
            "transfer" => "نقل مخزون".to_string(),
            "purchase" => "شراء".to_string(),
            "sale" => "بيع".to_string(),
            "adjustment" => "تعديل مخزون".to_string(),
            "return" => "إرجاع".to_string(),
            "initial" => "مخزون أولي".to_string(),
            _ => "حركة مخزون".to_string(),
        }
    }

    pub fn get_from_stock_display(&self) -> String {
        self.from_stock_name.clone().unwrap_or_else(|| "بدون مخزن".to_string())
    }

    pub fn get_to_stock_display(&self) -> String {
        self.to_stock_name.clone().unwrap_or_else(|| "بدون مخزن".to_string())
    }

    pub fn get_product_display(&self) -> String {
        if let Some(sku) = &self.product_sku {
            format!("{} ({})", self.product_name.as_deref().unwrap_or("غير معروف"), sku)
        } else {
            self.product_name.clone().unwrap_or_else(|| "غير معروف".to_string())
        }
    }
}

impl StockMovementStats {
    pub fn get_average_value(&self) -> f64 {
        if self.total_movements > 0 {
            self.total_value / self.total_movements as f64
        } else {
            0.0
        }
    }

    pub fn get_average_quantity(&self) -> f64 {
        if self.total_movements > 0 {
            self.total_quantity as f64 / self.total_movements as f64
        } else {
            0.0
        }
    }
}

impl StockMovementStatsSummary {
    pub fn get_average_value(&self) -> f64 {
        if self.total_movements > 0 {
            self.total_value / self.total_movements as f64
        } else {
            0.0
        }
    }

    pub fn get_average_quantity(&self) -> f64 {
        if self.total_movements > 0 {
            self.total_quantity as f64 / self.total_movements as f64
        } else {
            0.0
        }
    }
}
