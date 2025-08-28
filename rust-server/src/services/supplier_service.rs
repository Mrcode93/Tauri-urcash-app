use anyhow::Result;
use crate::database::Database;
use crate::models::{
    supplier::*,
    ApiResponse,
    PaginatedResponse
};
use sqlx::Row;
use tracing::info;
use chrono::{Utc, DateTime};
use crate::models::PaginationInfo;
use serde_json::Value;
use std::collections::HashMap;

#[derive(Clone)]
pub struct SupplierService;

impl SupplierService {
    pub fn new() -> Self {
        Self
    }

    // Get all suppliers
    pub async fn get_all(&self, db: &Database, query: &SupplierQuery) -> Result<SupplierListResponse> {
        let page = query.page.unwrap_or(1);
        let limit = query.limit.unwrap_or(50);
        let offset = (page - 1) * limit;

        let mut conditions = Vec::new();
        let mut params: Vec<String> = Vec::new();

        // Add filters
        if let Some(is_active) = query.is_active {
            conditions.push("s.is_active = ?");
            params.push(if is_active { "1" } else { "0" }.to_string());
        } else {
            // Default to active suppliers only
            conditions.push("s.is_active = 1");
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        // Get total count for pagination
        let count_query = format!(
            "SELECT COUNT(*) as total FROM suppliers s {}",
            where_clause
        );
        
        let mut count_query_builder = sqlx::query(&count_query);
        for param in &params {
            count_query_builder = count_query_builder.bind(param.as_str());
        }
        let total: i64 = count_query_builder
            .fetch_one(&db.pool)
            .await?
            .get("total");

        // Get suppliers with statistics
        let suppliers_query = format!(
            r#"
            SELECT 
                s.*,
                COALESCE(COUNT(DISTINCT p.id), 0) as products_count,
                COALESCE(SUM(ps.supplier_price), 0) as total_supplier_value
            FROM suppliers s
            LEFT JOIN product_suppliers ps ON s.id = ps.supplier_id AND ps.is_active = 1
            LEFT JOIN products p ON ps.product_id = p.id AND p.is_active = 1
            {}
            GROUP BY s.id
            ORDER BY s.created_at DESC
            LIMIT ? OFFSET ?
            "#,
            where_clause
        );

        let mut query_builder = sqlx::query(&suppliers_query);
        for param in &params {
            query_builder = query_builder.bind(param.as_str());
        }
        query_builder = query_builder.bind(limit).bind(offset);

        let suppliers_rows = query_builder.fetch_all(&db.pool).await?;

        let mut suppliers = Vec::new();
        for row in suppliers_rows {
            let supplier = self.map_supplier_row_to_with_stats(row).await?;
            suppliers.push(supplier);
        }

        Ok(SupplierListResponse {
            items: suppliers,
            total,
            page,
            limit,
            total_pages: (total + limit - 1) / limit,
        })
    }

    // Get supplier by ID
    pub async fn get_by_id(&self, db: &Database, id: i64) -> Result<Option<Supplier>> {
        let supplier_row = sqlx::query(r#"
            SELECT * FROM suppliers WHERE id = ?
        "#)
        .bind(id)
        .fetch_optional(&db.pool)
        .await?;

        if let Some(row) = supplier_row {
            Ok(Some(self.map_supplier_row(row).await?))
        } else {
            Ok(None)
        }
    }

    // Search suppliers
    pub async fn search(&self, db: &Database, query: &str) -> Result<Vec<Supplier>> {
        if query.trim().is_empty() {
            return Err(anyhow::anyhow!("يجب إدخال مطلوب البحث"));
        }

        let search_pattern = format!("%{}%", query);
        let suppliers_rows = sqlx::query(r#"
            SELECT * FROM suppliers
            WHERE name LIKE ? OR contact_person LIKE ? OR email LIKE ? OR phone LIKE ?
            ORDER BY created_at DESC
        "#)
        .bind(&search_pattern)
        .bind(&search_pattern)
        .bind(&search_pattern)
        .bind(&search_pattern)
        .fetch_all(&db.pool)
        .await?;

        if suppliers_rows.is_empty() {
            return Err(anyhow::anyhow!("لم يتم العثور على نتائج للبحث"));
        }

        let mut suppliers = Vec::new();
        for row in suppliers_rows {
            let supplier = self.map_supplier_row(row).await?;
            suppliers.push(supplier);
        }

        Ok(suppliers)
    }

    // Get supplier with products
    pub async fn get_with_products(&self, db: &Database, id: i64) -> Result<Option<SupplierWithProducts>> {
        let supplier_row = sqlx::query(r#"
            SELECT s.*, 
                GROUP_CONCAT(
                    json_object(
                        'id', p.id,
                        'name', p.name,
                        'description', p.description,
                        'price', p.selling_price,
                        'stock_quantity', p.current_stock,
                        'supplier_price', ps.supplier_price
                    )
                ) as products
            FROM suppliers s
            LEFT JOIN product_suppliers ps ON s.id = ps.supplier_id AND ps.is_active = 1
            LEFT JOIN products p ON ps.product_id = p.id AND p.is_active = 1
            WHERE s.id = ?
            GROUP BY s.id
        "#)
        .bind(id)
        .fetch_optional(&db.pool)
        .await?;

        if let Some(row) = supplier_row {
            let supplier = self.map_supplier_row_to_with_products(row).await?;
            Ok(Some(supplier))
        } else {
            Ok(None)
        }
    }

    // Create new supplier
    pub async fn create(&self, db: &Database, supplier_data: CreateSupplierRequest) -> Result<Supplier> {
        info!("Creating new supplier: name={}", supplier_data.name);

        // Validate required fields
        if supplier_data.name.trim().is_empty() {
            return Err(anyhow::anyhow!("اسم المورد مطلوب"));
        }
        
        if supplier_data.contact_person.trim().is_empty() {
            return Err(anyhow::anyhow!("اسم المسؤول مطلوب"));
        }

        let supplier_id = sqlx::query(r#"
            INSERT INTO suppliers (name, contact_person, phone, email, address, tax_number, notes, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        "#)
        .bind(&supplier_data.name)
        .bind(&supplier_data.contact_person)
        .bind(supplier_data.phone)
        .bind(supplier_data.email)
        .bind(supplier_data.address)
        .bind(supplier_data.tax_number)
        .bind(supplier_data.notes)
        .execute(&db.pool)
        .await?
        .last_insert_rowid();

        // Get the created supplier
        let supplier = self.get_by_id(db, supplier_id).await?;
        supplier.ok_or_else(|| anyhow::anyhow!("Failed to retrieve created supplier"))
    }

    // Update supplier
    pub async fn update(&self, db: &Database, id: i64, supplier_data: UpdateSupplierRequest) -> Result<Supplier> {
        // Check if supplier exists
        let existing_supplier = self.get_by_id(db, id).await?;
        if existing_supplier.is_none() {
            return Err(anyhow::anyhow!("المورد غير موجود"));
        }

        // Validate required fields if provided
        if let Some(ref name) = supplier_data.name {
            if name.trim().is_empty() {
                return Err(anyhow::anyhow!("اسم المورد مطلوب"));
            }
        }
        
        if let Some(ref contact_person) = supplier_data.contact_person {
            if contact_person.trim().is_empty() {
                return Err(anyhow::anyhow!("اسم المسؤول مطلوب"));
            }
        }

        let mut query_parts = Vec::new();
        let mut has_updates = false;

        if supplier_data.name.is_some() {
            query_parts.push("name = ?");
            has_updates = true;
        }
        if supplier_data.contact_person.is_some() {
            query_parts.push("contact_person = ?");
            has_updates = true;
        }
        if supplier_data.phone.is_some() {
            query_parts.push("phone = ?");
            has_updates = true;
        }
        if supplier_data.email.is_some() {
            query_parts.push("email = ?");
            has_updates = true;
        }
        if supplier_data.address.is_some() {
            query_parts.push("address = ?");
            has_updates = true;
        }
        if supplier_data.tax_number.is_some() {
            query_parts.push("tax_number = ?");
            has_updates = true;
        }
        if supplier_data.notes.is_some() {
            query_parts.push("notes = ?");
            has_updates = true;
        }

        if has_updates {
            query_parts.push("updated_at = CURRENT_TIMESTAMP");
            let update_query = format!(
                "UPDATE suppliers SET {} WHERE id = ?",
                query_parts.join(", ")
            );
            
            let mut query_builder = sqlx::query(&update_query);
            
            if let Some(ref name) = supplier_data.name {
                query_builder = query_builder.bind(name);
            }
            if let Some(ref contact_person) = supplier_data.contact_person {
                query_builder = query_builder.bind(contact_person);
            }
            if let Some(ref phone) = supplier_data.phone {
                query_builder = query_builder.bind(phone);
            }
            if let Some(ref email) = supplier_data.email {
                query_builder = query_builder.bind(email);
            }
            if let Some(ref address) = supplier_data.address {
                query_builder = query_builder.bind(address);
            }
            if let Some(ref tax_number) = supplier_data.tax_number {
                query_builder = query_builder.bind(tax_number);
            }
            if let Some(ref notes) = supplier_data.notes {
                query_builder = query_builder.bind(notes);
            }
            
            query_builder = query_builder.bind(id);
            query_builder.execute(&db.pool).await?;
        }

        // Get the updated supplier
        let supplier = self.get_by_id(db, id).await?;
        supplier.ok_or_else(|| anyhow::anyhow!("Failed to retrieve updated supplier"))
    }

    // Delete supplier
    pub async fn delete(&self, db: &Database, id: i64) -> Result<bool> {
        // Check if supplier exists
        let existing_supplier = self.get_by_id(db, id).await?;
        if existing_supplier.is_none() {
            return Ok(false);
        }

        let mut tx = db.pool.begin().await?;
        
        // Check if supplier has related records
        let has_products: i64 = sqlx::query("SELECT COUNT(*) as count FROM product_suppliers WHERE supplier_id = ?")
            .bind(id)
            .fetch_one(&mut *tx)
            .await?
            .get("count");

        if has_products > 0 {
            return Err(anyhow::anyhow!("لا يمكن حذف المورد لوجود منتجات مرتبطة به"));
        }

        let has_purchases: i64 = sqlx::query("SELECT COUNT(*) as count FROM purchases WHERE supplier_id = ?")
            .bind(id)
            .fetch_one(&mut *tx)
            .await?
            .get("count");

        if has_purchases > 0 {
            return Err(anyhow::anyhow!("لا يمكن حذف المورد لوجود فواتير شراء مرتبطة به"));
        }

        // Delete supplier
        let changes = sqlx::query("DELETE FROM suppliers WHERE id = ?")
            .bind(id)
            .execute(&mut *tx)
            .await?
            .rows_affected();

        if changes == 0 {
            return Err(anyhow::anyhow!("المورد غير موجود"));
        }

        tx.commit().await?;
        let result = true;

        Ok(result)
    }

    // Helper method to map database row to Supplier
    async fn map_supplier_row(&self, row: sqlx::sqlite::SqliteRow) -> Result<Supplier> {
        Ok(Supplier {
            id: row.get("id"),
            name: row.get("name"),
            contact_person: row.get("contact_person"),
            phone: row.get("phone"),
            email: row.get("email"),
            address: row.get("address"),
            tax_number: row.get("tax_number"),
            notes: row.get("notes"),
            is_active: row.get("is_active"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
    }

    // Helper method to map database row to SupplierWithStats
    async fn map_supplier_row_to_with_stats(&self, row: sqlx::sqlite::SqliteRow) -> Result<SupplierWithStats> {
        Ok(SupplierWithStats {
            id: row.get("id"),
            name: row.get("name"),
            contact_person: row.get("contact_person"),
            phone: row.get("phone"),
            email: row.get("email"),
            address: row.get("address"),
            tax_number: row.get("tax_number"),
            notes: row.get("notes"),
            is_active: row.get("is_active"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            products_count: row.get("products_count"),
            total_supplier_value: row.get("total_supplier_value"),
        })
    }

    // Helper method to map database row to SupplierWithProducts
    async fn map_supplier_row_to_with_products(&self, row: sqlx::sqlite::SqliteRow) -> Result<SupplierWithProducts> {
        let products_json: Option<String> = row.get("products");
        let products: Vec<SupplierProduct> = if let Some(json_str) = products_json {
            if json_str == "null" {
                Vec::new()
            } else {
                let products_list: Vec<SupplierProduct> = serde_json::from_str(&json_str)
                    .unwrap_or_else(|_| Vec::new());
                
                // Filter out products with null id (no products)
                products_list.into_iter()
                    .filter(|p| p.id != 0)
                    .collect()
            }
        } else {
            Vec::new()
        };

        Ok(SupplierWithProducts {
            id: row.get("id"),
            name: row.get("name"),
            contact_person: row.get("contact_person"),
            phone: row.get("phone"),
            email: row.get("email"),
            address: row.get("address"),
            tax_number: row.get("tax_number"),
            notes: row.get("notes"),
            is_active: row.get("is_active"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            products,
        })
    }
}
