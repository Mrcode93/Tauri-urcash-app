use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{NaiveDateTime, NaiveDate};

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Supplier {
    pub id: i64,
    pub name: String,
    pub contact_person: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub tax_number: Option<String>,
    pub notes: Option<String>,
    pub is_active: bool,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SupplierWithStats {
    pub id: i64,
    pub name: String,
    pub contact_person: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub tax_number: Option<String>,
    pub notes: Option<String>,
    pub is_active: bool,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub products_count: i64,
    pub total_supplier_value: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SupplierWithProducts {
    pub id: i64,
    pub name: String,
    pub contact_person: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub tax_number: Option<String>,
    pub notes: Option<String>,
    pub is_active: bool,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub products: Vec<SupplierProduct>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SupplierProduct {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub price: f64,
    pub stock_quantity: i64,
    pub supplier_price: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSupplierRequest {
    pub name: String,
    pub contact_person: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub tax_number: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateSupplierRequest {
    pub name: Option<String>,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub tax_number: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SupplierQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub search: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SupplierListResponse {
    pub items: Vec<SupplierWithStats>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
    pub total_pages: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SupplierSearchResponse {
    pub items: Vec<Supplier>,
    pub total: i64,
    pub query: String,
}

impl Supplier {
    pub fn is_active(&self) -> bool {
        self.is_active
    }

    pub fn has_contact_info(&self) -> bool {
        self.phone.is_some() || self.email.is_some()
    }

    pub fn get_primary_contact(&self) -> Option<String> {
        self.phone.clone().or(self.email.clone())
    }
}

impl SupplierWithStats {
    pub fn get_products_count(&self) -> i64 {
        self.products_count
    }

    pub fn get_total_value(&self) -> f64 {
        self.total_supplier_value
    }

    pub fn has_products(&self) -> bool {
        self.products_count > 0
    }
}

impl SupplierWithProducts {
    pub fn get_products_count(&self) -> usize {
        self.products.len()
    }

    pub fn get_total_products_value(&self) -> f64 {
        self.products.iter().map(|p| p.supplier_price).sum()
    }

    pub fn get_products_by_price_range(&self, min_price: f64, max_price: f64) -> Vec<&SupplierProduct> {
        self.products
            .iter()
            .filter(|p| p.supplier_price >= min_price && p.supplier_price <= max_price)
            .collect()
    }
}

impl SupplierProduct {
    pub fn is_in_stock(&self) -> bool {
        self.stock_quantity > 0
    }

    pub fn get_profit_margin(&self) -> f64 {
        if self.supplier_price > 0.0 {
            ((self.price - self.supplier_price) / self.supplier_price) * 100.0
        } else {
            0.0
        }
    }

    pub fn get_total_value(&self) -> f64 {
        self.stock_quantity as f64 * self.supplier_price
    }
}
