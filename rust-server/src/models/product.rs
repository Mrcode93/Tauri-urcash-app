use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{DateTime, Utc, NaiveDateTime, NaiveDate};

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Product {
    pub id: i64,
    pub name: String,
    pub scientific_name: Option<String>,
    pub description: Option<String>,
    pub supported: bool,
    pub sku: String,
    pub barcode: Option<String>,
    pub purchase_price: f64,
    pub selling_price: f64,
    pub wholesale_price: f64,
    pub company_name: Option<String>,
    pub current_stock: i64,
    pub min_stock: i64,
    pub max_stock: Option<i64>,
    pub total_sold: i64,
    pub total_purchased: i64,
    pub unit: String,
    pub units_per_box: i64,
    pub is_dolar: bool,
    pub expiry_date: Option<NaiveDate>,
    pub is_active: bool,
    pub last_purchase_date: Option<NaiveDate>,
    pub last_purchase_price: Option<f64>,
    pub average_cost: f64,
    pub reorder_point: i64,
    pub category_id: Option<i64>,
    pub stock_id: Option<i64>,
    pub location_in_stock: Option<String>,
    pub shelf_number: Option<String>,
    pub rack_number: Option<String>,
    pub bin_number: Option<String>,
    pub last_stock_check: Option<NaiveDateTime>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub search: Option<String>,
    pub category: Option<String>,
    pub fields: Option<String>,
    pub format: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProductRequest {
    pub name: String,
    pub scientific_name: Option<String>,
    pub description: Option<String>,
    pub supported: Option<bool>,
    pub sku: Option<String>,
    pub barcode: Option<String>,
    pub purchase_price: f64,
    pub selling_price: f64,
    pub wholesale_price: f64,
    pub company_name: Option<String>,
    pub current_stock: Option<i64>,
    pub min_stock: Option<i64>,
    pub max_stock: Option<i64>,
    pub unit: Option<String>,
    pub units_per_box: Option<i64>,
    pub is_dolar: Option<bool>,
    pub expiry_date: Option<NaiveDate>,
    pub is_active: Option<bool>,
    pub last_purchase_price: Option<f64>,
    pub average_cost: Option<f64>,
    pub reorder_point: Option<i64>,
    pub category_id: Option<i64>,
    pub stock_id: Option<i64>,
    pub location_in_stock: Option<String>,
    pub shelf_number: Option<String>,
    pub rack_number: Option<String>,
    pub bin_number: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProductRequest {
    pub name: Option<String>,
    pub scientific_name: Option<String>,
    pub description: Option<String>,
    pub supported: Option<bool>,
    pub sku: Option<String>,
    pub barcode: Option<String>,
    pub purchase_price: Option<f64>,
    pub selling_price: Option<f64>,
    pub wholesale_price: Option<f64>,
    pub company_name: Option<String>,
    pub current_stock: Option<i64>,
    pub min_stock: Option<i64>,
    pub max_stock: Option<i64>,
    pub unit: Option<String>,
    pub units_per_box: Option<i64>,
    pub is_dolar: Option<bool>,
    pub expiry_date: Option<NaiveDate>,
    pub is_active: Option<bool>,
    pub last_purchase_price: Option<f64>,
    pub average_cost: Option<f64>,
    pub reorder_point: Option<i64>,
    pub category_id: Option<i64>,
    pub stock_id: Option<i64>,
    pub location_in_stock: Option<String>,
    pub shelf_number: Option<String>,
    pub rack_number: Option<String>,
    pub bin_number: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductListResponse {
    pub items: Vec<ProductWithDetails>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
    pub total_pages: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductWithDetails {
    pub id: i64,
    pub name: String,
    pub scientific_name: Option<String>,
    pub description: Option<String>,
    pub supported: bool,
    pub sku: String,
    pub barcode: Option<String>,
    pub purchase_price: f64,
    pub selling_price: f64,
    pub wholesale_price: f64,
    pub company_name: Option<String>,
    pub current_stock: i64,
    pub min_stock: i64,
    pub max_stock: Option<i64>,
    pub total_sold: i64,
    pub total_purchased: i64,
    pub unit: String,
    pub units_per_box: i64,
    pub is_dolar: bool,
    pub expiry_date: Option<NaiveDate>,
    pub is_active: bool,
    pub last_purchase_date: Option<NaiveDate>,
    pub last_purchase_price: Option<f64>,
    pub average_cost: f64,
    pub reorder_point: i64,
    pub category_id: Option<i64>,
    pub stock_id: Option<i64>,
    pub location_in_stock: Option<String>,
    pub shelf_number: Option<String>,
    pub rack_number: Option<String>,
    pub bin_number: Option<String>,
    pub last_stock_check: Option<NaiveDateTime>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub supplier_name: Option<String>,
    pub category_name: Option<String>,
    pub stock_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductSearchResponse {
    pub products: Vec<ProductWithDetails>,
    pub total: i64,
    pub has_more: bool,
    pub page: i64,
    pub limit: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProductStockRequest {
    pub quantity: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LowStockProduct {
    pub id: i64,
    pub name: String,
    pub sku: String,
    pub barcode: Option<String>,
    pub current_stock: i64,
    pub min_stock: i64,
    pub unit: String,
    pub supplier_name: Option<String>,
    pub category_name: Option<String>,
    pub stock_name: Option<String>,
}

impl Product {
    pub fn new(
        name: String,
        sku: String,
        purchase_price: f64,
        selling_price: f64,
        wholesale_price: f64,
    ) -> Self {
        let now = Utc::now().naive_utc();
        Self {
            id: 0, // Will be set by database
            name,
            scientific_name: None,
            description: None,
            supported: true,
            sku,
            barcode: None,
            purchase_price,
            selling_price,
            wholesale_price,
            company_name: None,
            current_stock: 0,
            min_stock: 0,
            max_stock: None,
            total_sold: 0,
            total_purchased: 0,
            unit: "قطعة".to_string(),
            units_per_box: 1,
            is_dolar: false,
            expiry_date: None,
            is_active: true,
            last_purchase_date: None,
            last_purchase_price: None,
            average_cost: 0.0,
            reorder_point: 0,
            category_id: None,
            stock_id: None,
            location_in_stock: None,
            shelf_number: None,
            rack_number: None,
            bin_number: None,
            last_stock_check: None,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn profit_margin(&self) -> f64 {
        if self.purchase_price > 0.0 {
            ((self.selling_price - self.purchase_price) / self.purchase_price) * 100.0
        } else {
            0.0
        }
    }

    pub fn profit_per_unit(&self) -> f64 {
        self.selling_price - self.purchase_price
    }

    pub fn is_low_stock(&self) -> bool {
        self.current_stock <= self.min_stock
    }

    pub fn is_out_of_stock(&self) -> bool {
        self.current_stock <= 0
    }

    pub fn is_expired(&self) -> bool {
        if let Some(expiry_date) = self.expiry_date {
            expiry_date < Utc::now().date_naive()
        } else {
            false
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportResult {
    pub imported: i64,
    pub failed: i64,
    pub total: i64,
    pub errors: Vec<String>,
    pub error_count: usize,
}
