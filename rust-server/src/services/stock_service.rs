use anyhow::Result;
use crate::database::Database;
use crate::models::stock::*;
use sqlx::{Row, SqlitePool};
use tracing::{info, warn, error};
use chrono::{Utc, DateTime, NaiveDate, NaiveDateTime};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Clone)]
pub struct StockService;

impl StockService {
    pub fn new() -> Self {
        Self
    }

    // Get all stocks with statistics
    pub async fn get_all(&self, db: &Database, query: &StockQuery) -> Result<StockListResponse> {
        let page = query.page.unwrap_or(1);
        let limit = query.limit.unwrap_or(50);
        let offset = (page - 1) * limit;

        let mut conditions = Vec::new();
        let mut params = Vec::new();

        // Add filters
        if let Some(is_main_stock) = query.is_main_stock {
            conditions.push("s.is_main_stock = ?");
            params.push(if is_main_stock { "1" } else { "0" }.to_string());
        }
        if let Some(is_active) = query.is_active {
            conditions.push("s.is_active = ?");
            params.push(if is_active { "1" } else { "0" }.to_string());
        } else {
            // Default to active stocks only
            conditions.push("s.is_active = 1");
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        // Get total count for pagination
        let count_query = format!(
            "SELECT COUNT(*) as total FROM stocks s {}",
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

        // Get stocks with statistics
        let stocks_query = format!(
            r#"
            SELECT 
                s.*,
                COALESCE(
                    (SELECT COUNT(DISTINCT p2.id)
                     FROM products p2
                     WHERE p2.is_active = 1
                       AND EXISTS (
                         SELECT 1 FROM stock_movements sm 
                         WHERE sm.product_id = p2.id 
                           AND (sm.to_stock_id = s.id OR sm.from_stock_id = s.id)
                       )
                       AND COALESCE(
                         (SELECT SUM(CASE WHEN to_stock_id = s.id THEN quantity ELSE 0 END) - SUM(CASE WHEN from_stock_id = s.id THEN quantity ELSE 0 END)
                          FROM stock_movements 
                          WHERE product_id = p2.id AND (to_stock_id = s.id OR from_stock_id = s.id)), 0
                       ) > 0
                    ), 0
                ) as total_products,
                COALESCE(
                    (SELECT SUM(CASE WHEN to_stock_id = s.id THEN quantity ELSE 0 END) - SUM(CASE WHEN from_stock_id = s.id THEN quantity ELSE 0 END)
                     FROM stock_movements 
                     WHERE to_stock_id = s.id OR from_stock_id = s.id), 0
                ) as total_stock_quantity
            FROM stocks s
            {}
            ORDER BY s.is_main_stock DESC, s.name ASC
            LIMIT ? OFFSET ?
            "#,
            where_clause
        );

        let mut query_builder = sqlx::query(&stocks_query);
        for param in &params {
            query_builder = query_builder.bind(param.as_str());
        }
        query_builder = query_builder.bind(limit).bind(offset);

        let stocks_rows = query_builder.fetch_all(&db.pool).await?;

        let mut stocks = Vec::new();
        for row in stocks_rows {
            let stock = self.map_stock_row_to_with_stats(row).await?;
            stocks.push(stock);
        }

        Ok(StockListResponse {
            items: stocks,
            total,
            page,
            limit,
            total_pages: (total + limit - 1) / limit,
        })
    }

    // Get stock by ID with statistics
    pub async fn get_by_id(&self, db: &Database, id: i64) -> Result<Option<StockWithStats>> {
        let stock_row = sqlx::query(r#"
            SELECT 
                s.*,
                COALESCE(
                    (SELECT COUNT(DISTINCT p2.id)
                     FROM products p2
                     WHERE p2.is_active = 1
                       AND EXISTS (
                         SELECT 1 FROM stock_movements sm 
                         WHERE sm.product_id = p2.id 
                           AND (sm.to_stock_id = s.id OR sm.from_stock_id = s.id)
                       )
                       AND COALESCE(
                         (SELECT SUM(CASE WHEN to_stock_id = s.id THEN quantity ELSE 0 END) - SUM(CASE WHEN from_stock_id = s.id THEN quantity ELSE 0 END)
                          FROM stock_movements 
                          WHERE product_id = p2.id AND (to_stock_id = s.id OR from_stock_id = s.id)), 0
                       ) > 0
                    ), 0
                ) as total_products,
                COALESCE(
                    (SELECT SUM(CASE WHEN to_stock_id = s.id THEN quantity ELSE 0 END) - SUM(CASE WHEN from_stock_id = s.id THEN quantity ELSE 0 END)
                     FROM stock_movements 
                     WHERE to_stock_id = s.id OR from_stock_id = s.id), 0
                ) as total_stock_quantity
            FROM stocks s
            WHERE s.id = ? AND s.is_active = 1
        "#)
        .bind(id)
        .fetch_optional(&db.pool)
        .await?;

        if let Some(row) = stock_row {
            let stock = self.map_stock_row_to_with_stats(row).await?;
            Ok(Some(stock))
        } else {
            Ok(None)
        }
    }

    // Create new stock
    pub async fn create(&self, db: &Database, stock_data: CreateStockRequest) -> Result<StockWithStats> {
        info!("Creating new stock: name={}, code={}", stock_data.name, stock_data.code);

        // Validate required fields
        if stock_data.name.trim().is_empty() {
            return Err(anyhow::anyhow!("Name is required"));
        }
        if stock_data.code.trim().is_empty() {
            return Err(anyhow::anyhow!("Code is required"));
        }
        if stock_data.address.trim().is_empty() {
            return Err(anyhow::anyhow!("Address is required"));
        }

        // Check if code already exists
        let existing_stock = sqlx::query("SELECT id FROM stocks WHERE code = ?")
            .bind(&stock_data.code)
            .fetch_optional(&db.pool)
            .await?;
        
        if existing_stock.is_some() {
            return Err(anyhow::anyhow!("Stock code already exists"));
        }

        let mut tx = db.pool.begin().await?;
                // If this is a main stock, unset other main stocks
                if stock_data.is_main_stock.unwrap_or(false) {
                    sqlx::query("UPDATE stocks SET is_main_stock = 0 WHERE is_main_stock = 1")
                        .execute(&mut *tx)
                        .await?;
                }

                // Create stock record
                let stock_id = sqlx::query(r#"
                    INSERT INTO stocks (
                        name, code, description, address, city, state, country,
                        postal_code, phone, email, manager_name, manager_phone,
                        manager_email, is_main_stock, is_active, capacity,
                        current_capacity_used, notes, created_by, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                "#)
                .bind(&stock_data.name)
                .bind(&stock_data.code)
                .bind(stock_data.description)
                .bind(&stock_data.address)
                .bind(stock_data.city)
                .bind(stock_data.state)
                .bind(stock_data.country)
                .bind(stock_data.postal_code)
                .bind(stock_data.phone)
                .bind(stock_data.email)
                .bind(stock_data.manager_name)
                .bind(stock_data.manager_phone)
                .bind(stock_data.manager_email)
                .bind(stock_data.is_main_stock.unwrap_or(false))
                .bind(true) // is_active
                .bind(stock_data.capacity.unwrap_or(0))
                .bind(0) // current_capacity_used
                .bind(stock_data.notes)
                .bind(1) // created_by - placeholder
                .execute(&mut *tx)
                .await?
                .last_insert_rowid();

        tx.commit().await?;
        let result = stock_id;

        // Get the created stock with details
        let stock = self.get_by_id(db, result).await?;
        stock.ok_or_else(|| anyhow::anyhow!("Failed to retrieve created stock"))
    }

    // Update stock
    pub async fn update(&self, db: &Database, id: i64, stock_data: UpdateStockRequest) -> Result<StockWithStats> {
        // Check if stock exists
        let existing_stock = sqlx::query("SELECT id FROM stocks WHERE id = ?")
            .bind(id)
            .fetch_optional(&db.pool)
            .await?;
        
        if existing_stock.is_none() {
            return Err(anyhow::anyhow!("Stock not found"));
        }

        // Check if code already exists for other stocks
        if let Some(ref code) = stock_data.code {
            let duplicate_code = sqlx::query("SELECT id FROM stocks WHERE code = ? AND id != ?")
                .bind(code)
                .bind(id)
                .fetch_optional(&db.pool)
                .await?;
            
            if duplicate_code.is_some() {
                return Err(anyhow::anyhow!("Stock code already exists"));
            }
        }

        let mut tx = db.pool.begin().await?;
                // If this is a main stock, unset other main stocks
                if stock_data.is_main_stock.unwrap_or(false) {
                    sqlx::query("UPDATE stocks SET is_main_stock = 0 WHERE is_main_stock = 1 AND id != ?")
                        .bind(id)
                        .execute(&mut *tx)
                        .await?;
                }

                // Update stock
                let mut query_parts = Vec::new();
                let mut has_updates = false;

                if stock_data.name.is_some() {
                    query_parts.push("name = ?");
                    has_updates = true;
                }
                if stock_data.code.is_some() {
                    query_parts.push("code = ?");
                    has_updates = true;
                }
                if stock_data.description.is_some() {
                    query_parts.push("description = ?");
                    has_updates = true;
                }
                if stock_data.address.is_some() {
                    query_parts.push("address = ?");
                    has_updates = true;
                }
                if stock_data.city.is_some() {
                    query_parts.push("city = ?");
                    has_updates = true;
                }
                if stock_data.state.is_some() {
                    query_parts.push("state = ?");
                    has_updates = true;
                }
                if stock_data.country.is_some() {
                    query_parts.push("country = ?");
                    has_updates = true;
                }
                if stock_data.postal_code.is_some() {
                    query_parts.push("postal_code = ?");
                    has_updates = true;
                }
                if stock_data.phone.is_some() {
                    query_parts.push("phone = ?");
                    has_updates = true;
                }
                if stock_data.email.is_some() {
                    query_parts.push("email = ?");
                    has_updates = true;
                }
                if stock_data.manager_name.is_some() {
                    query_parts.push("manager_name = ?");
                    has_updates = true;
                }
                if stock_data.manager_phone.is_some() {
                    query_parts.push("manager_phone = ?");
                    has_updates = true;
                }
                if stock_data.manager_email.is_some() {
                    query_parts.push("manager_email = ?");
                    has_updates = true;
                }
                if stock_data.is_main_stock.is_some() {
                    query_parts.push("is_main_stock = ?");
                    has_updates = true;
                }
                if stock_data.is_active.is_some() {
                    query_parts.push("is_active = ?");
                    has_updates = true;
                }
                if stock_data.capacity.is_some() {
                    query_parts.push("capacity = ?");
                    has_updates = true;
                }
                if stock_data.notes.is_some() {
                    query_parts.push("notes = ?");
                    has_updates = true;
                }

                if has_updates {
                    query_parts.push("updated_at = CURRENT_TIMESTAMP");
                    let update_query = format!(
                        "UPDATE stocks SET {} WHERE id = ?",
                        query_parts.join(", ")
                    );
                    
                    let mut query_builder = sqlx::query(&update_query);
                    
                    if let Some(ref name) = stock_data.name {
                        query_builder = query_builder.bind(name);
                    }
                    if let Some(ref code) = stock_data.code {
                        query_builder = query_builder.bind(code);
                    }
                    if let Some(ref description) = stock_data.description {
                        query_builder = query_builder.bind(description);
                    }
                    if let Some(ref address) = stock_data.address {
                        query_builder = query_builder.bind(address);
                    }
                    if let Some(ref city) = stock_data.city {
                        query_builder = query_builder.bind(city);
                    }
                    if let Some(ref state) = stock_data.state {
                        query_builder = query_builder.bind(state);
                    }
                    if let Some(ref country) = stock_data.country {
                        query_builder = query_builder.bind(country);
                    }
                    if let Some(ref postal_code) = stock_data.postal_code {
                        query_builder = query_builder.bind(postal_code);
                    }
                    if let Some(ref phone) = stock_data.phone {
                        query_builder = query_builder.bind(phone);
                    }
                    if let Some(ref email) = stock_data.email {
                        query_builder = query_builder.bind(email);
                    }
                    if let Some(ref manager_name) = stock_data.manager_name {
                        query_builder = query_builder.bind(manager_name);
                    }
                    if let Some(ref manager_phone) = stock_data.manager_phone {
                        query_builder = query_builder.bind(manager_phone);
                    }
                    if let Some(ref manager_email) = stock_data.manager_email {
                        query_builder = query_builder.bind(manager_email);
                    }
                    if let Some(is_main_stock) = stock_data.is_main_stock {
                        query_builder = query_builder.bind(is_main_stock);
                    }
                    if let Some(is_active) = stock_data.is_active {
                        query_builder = query_builder.bind(is_active);
                    }
                    if let Some(capacity) = stock_data.capacity {
                        query_builder = query_builder.bind(capacity);
                    }
                    if let Some(ref notes) = stock_data.notes {
                        query_builder = query_builder.bind(notes);
                    }
                    
                    query_builder = query_builder.bind(id);
                    query_builder.execute(&mut *tx).await?;
                }

        tx.commit().await?;

        // Get the updated stock with details
        let stock = self.get_by_id(db, id).await?;
        stock.ok_or_else(|| anyhow::anyhow!("Failed to retrieve updated stock"))
    }

    // Delete stock (soft delete)
    pub async fn delete(&self, db: &Database, id: i64) -> Result<bool> {
        // Check if stock exists
        let existing_stock = sqlx::query("SELECT id, is_main_stock FROM stocks WHERE id = ?")
            .bind(id)
            .fetch_optional(&db.pool)
            .await?;
        
        if existing_stock.is_none() {
            return Ok(false);
        }

        let stock = existing_stock.unwrap();
        let is_main_stock: bool = stock.get("is_main_stock");

        // Check if it's the main stock
        if is_main_stock {
            return Err(anyhow::anyhow!("Cannot delete the main stock"));
        }

        // Check if stock has products
        let products_count: i64 = sqlx::query("SELECT COUNT(*) as count FROM products WHERE stock_id = ?")
            .bind(id)
            .fetch_one(&db.pool)
            .await?
            .get("count");

        if products_count > 0 {
            return Err(anyhow::anyhow!("Cannot delete stock that has products assigned to it"));
        }

        // Soft delete by setting is_active = 0
        sqlx::query("UPDATE stocks SET is_active = 0 WHERE id = ?")
            .bind(id)
            .execute(&db.pool)
            .await?;

        Ok(true)
    }

    // Get products in a specific stock
    pub async fn get_products(&self, db: &Database, stock_id: i64) -> Result<Vec<StockProduct>> {
        let products_rows = sqlx::query(r#"
            SELECT 
                p.*,
                c.name as category_name,
                s.name as stock_name,
                COALESCE(
                    (SELECT SUM(CASE WHEN to_stock_id = ? THEN quantity ELSE 0 END) - SUM(CASE WHEN from_stock_id = ? THEN quantity ELSE 0 END)
                     FROM stock_movements 
                     WHERE product_id = p.id AND (to_stock_id = ? OR from_stock_id = ?)), 0
                ) as current_stock_in_stock
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN stocks s ON p.stock_id = s.id
            WHERE p.is_active = 1
              AND EXISTS (
                SELECT 1 FROM stock_movements sm 
                WHERE sm.product_id = p.id 
                  AND (sm.to_stock_id = ? OR sm.from_stock_id = ?)
              )
              AND COALESCE(
                (SELECT SUM(CASE WHEN to_stock_id = ? THEN quantity ELSE 0 END) - SUM(CASE WHEN from_stock_id = ? THEN quantity ELSE 0 END)
                 FROM stock_movements 
                 WHERE product_id = p.id AND (to_stock_id = ? OR from_stock_id = ?)), 0
              ) > 0
            ORDER BY p.name ASC
        "#)
        .bind(stock_id)
        .bind(stock_id)
        .bind(stock_id)
        .bind(stock_id)
        .bind(stock_id)
        .bind(stock_id)
        .bind(stock_id)
        .bind(stock_id)
        .bind(stock_id)
        .bind(stock_id)
        .fetch_all(&db.pool)
        .await?;

        let mut products = Vec::new();
        for row in products_rows {
            let product = self.map_stock_product_row(row).await?;
            products.push(product);
        }

        Ok(products)
    }

    // Get stock movements
    pub async fn get_movements(&self, db: &Database, stock_id: i64, query: &StockMovementQuery) -> Result<StockMovementListResponse> {
        let page = query.page.unwrap_or(1);
        let limit = query.limit.unwrap_or(50);
        let offset = (page - 1) * limit;

        let mut conditions = vec!["(from_stock_id = ? OR to_stock_id = ?)"];
        let mut params = vec![
            stock_id.to_string(),
            stock_id.to_string()
        ];

        if let Some(ref movement_type) = query.movement_type {
            conditions.push("movement_type = ?");
            params.push(movement_type.clone());
        }

        let where_clause = format!("WHERE {}", conditions.join(" AND "));

        // Get total count
        let count_query = format!(
            "SELECT COUNT(*) as total FROM stock_movements sm {}",
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

        // Get movements with details
        let movements_query = format!(
            r#"
            SELECT 
                sm.*,
                p.name as product_name,
                p.sku as product_sku,
                fs.name as from_stock_name,
                ts.name as to_stock_name,
                u.name as created_by_name
            FROM stock_movements sm
            LEFT JOIN products p ON sm.product_id = p.id
            LEFT JOIN stocks fs ON sm.from_stock_id = fs.id
            LEFT JOIN stocks ts ON sm.to_stock_id = ts.id
            LEFT JOIN users u ON sm.created_by = u.id
            {}
            ORDER BY sm.movement_date DESC
            LIMIT ? OFFSET ?
            "#,
            where_clause
        );

        let mut query_builder = sqlx::query(&movements_query);
        for param in &params {
            query_builder = query_builder.bind(param.as_str());
        }
        query_builder = query_builder.bind(limit).bind(offset);

        let movements_rows = query_builder.fetch_all(&db.pool).await?;

        let mut movements = Vec::new();
        for row in movements_rows {
            let movement = self.map_stock_movement_row_to_with_details(row).await?;
            movements.push(movement);
        }

        Ok(StockMovementListResponse {
            items: movements,
            total,
            page,
            limit,
            total_pages: (total + limit - 1) / limit,
        })
    }

    // Get stock statistics
    pub async fn get_statistics(&self, db: &Database, stock_id: i64) -> Result<Option<StockStats>> {
        let stats_row = sqlx::query(r#"
            SELECT 
                s.id,
                s.name,
                s.capacity,
                s.current_capacity_used,
                COUNT(p.id) as total_products,
                SUM(p.current_stock) as total_stock_quantity,
                COUNT(CASE WHEN p.current_stock <= p.min_stock THEN 1 END) as low_stock_products,
                COUNT(CASE WHEN p.current_stock = 0 THEN 1 END) as out_of_stock_products,
                COUNT(CASE WHEN p.current_stock > p.min_stock THEN 1 END) as normal_stock_products
            FROM stocks s
            LEFT JOIN products p ON s.id = p.stock_id AND p.is_active = 1
            WHERE s.id = ? AND s.is_active = 1
            GROUP BY s.id
        "#)
        .bind(stock_id)
        .fetch_optional(&db.pool)
        .await?;

        if let Some(row) = stats_row {
            Ok(Some(StockStats {
                id: row.get("id"),
                name: row.get("name"),
                capacity: row.get("capacity"),
                current_capacity_used: row.get("current_capacity_used"),
                total_products: row.get("total_products"),
                total_stock_quantity: row.get("total_stock_quantity"),
                low_stock_products: row.get("low_stock_products"),
                out_of_stock_products: row.get("out_of_stock_products"),
                normal_stock_products: row.get("normal_stock_products"),
            }))
        } else {
            Ok(None)
        }
    }

    // Add product to stock
    pub async fn add_product(&self, db: &Database, stock_id: i64, request: AddProductToStockRequest) -> Result<()> {
        // Validate required fields
        if request.quantity <= 0 {
            return Err(anyhow::anyhow!("Quantity must be greater than 0"));
        }

        // Check if stock exists
        let stock = sqlx::query("SELECT id, capacity, current_capacity_used FROM stocks WHERE id = ? AND is_active = 1")
            .bind(stock_id)
            .fetch_optional(&db.pool)
            .await?;
        
        if stock.is_none() {
            return Err(anyhow::anyhow!("Stock not found"));
        }

        let stock = stock.unwrap();
        let capacity: i64 = stock.get("capacity");
        let current_capacity_used: i64 = stock.get("current_capacity_used");

        // Check if product exists
        let product = sqlx::query("SELECT id, name, current_stock FROM products WHERE id = ? AND is_active = 1")
            .bind(request.product_id)
            .fetch_optional(&db.pool)
            .await?;
        
        if product.is_none() {
            return Err(anyhow::anyhow!("Product not found"));
        }

        let product = product.unwrap();
        let current_stock: i64 = product.get("current_stock");

        // Check capacity if stock has capacity limit
        if capacity > 0 {
            let new_capacity_used = current_capacity_used + request.quantity;
            if new_capacity_used > capacity {
                return Err(anyhow::anyhow!("Adding this quantity would exceed stock capacity"));
            }
        }

        let mut tx = db.pool.begin().await?;
                // Update product stock
                let new_stock_quantity = current_stock + request.quantity;
                sqlx::query("UPDATE products SET current_stock = ?, stock_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
                    .bind(new_stock_quantity)
                    .bind(stock_id)
                    .bind(request.product_id)
                    .execute(&mut *tx)
                    .await?;

                // Update stock capacity used
                if capacity > 0 {
                    sqlx::query("UPDATE stocks SET current_capacity_used = current_capacity_used + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
                        .bind(request.quantity)
                        .bind(stock_id)
                        .execute(&mut *tx)
                        .await?;
                }

                // Create stock movement record
                let reference_number = format!("ADD-{}", chrono::Utc::now().timestamp_millis());
                let notes = if let Some(ref location) = request.location_in_stock {
                    format!("تم إضافة المنتج إلى المخزن في الموقع: {}", location)
                } else {
                    "تم إضافة المنتج إلى المخزن".to_string()
                };

                sqlx::query(r#"
                    INSERT INTO stock_movements (
                        movement_type, to_stock_id, product_id, quantity,
                        reference_type, reference_number, notes, created_by, movement_date, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                "#)
                .bind("adjustment")
                .bind(stock_id)
                .bind(request.product_id)
                .bind(request.quantity)
                .bind("adjustment")
                .bind(reference_number)
                .bind(notes)
                .bind(1) // created_by - placeholder
                .execute(&mut *tx)
                .await?;

        tx.commit().await?;

        Ok(())
    }

    // Helper method to map database row to StockWithStats
    async fn map_stock_row_to_with_stats(&self, row: sqlx::sqlite::SqliteRow) -> Result<StockWithStats> {
        let total_stock_quantity: i64 = row.get("total_stock_quantity");
        
        Ok(StockWithStats {
            id: row.get("id"),
            name: row.get("name"),
            code: row.get("code"),
            description: row.get("description"),
            address: row.get("address"),
            city: row.get("city"),
            state: row.get("state"),
            country: row.get("country"),
            postal_code: row.get("postal_code"),
            phone: row.get("phone"),
            email: row.get("email"),
            manager_name: row.get("manager_name"),
            manager_phone: row.get("manager_phone"),
            manager_email: row.get("manager_email"),
            is_main_stock: row.get("is_main_stock"),
            is_active: row.get("is_active"),
            capacity: row.get("capacity"),
            current_capacity_used: total_stock_quantity, // Use calculated total_stock_quantity instead of database field
            notes: row.get("notes"),
            created_by: row.get("created_by"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            total_products: row.get("total_products"),
            total_stock_quantity: total_stock_quantity,
        })
    }

    // Helper method to map database row to StockProduct
    async fn map_stock_product_row(&self, row: sqlx::sqlite::SqliteRow) -> Result<StockProduct> {
        Ok(StockProduct {
            id: row.get("id"),
            name: row.get("name"),
            sku: row.get("sku"),
            barcode: row.get("barcode"),
            description: row.get("description"),
            purchase_price: row.get("purchase_price"),
            selling_price: row.get("selling_price"),
            current_stock: row.get("current_stock"),
            min_stock: row.get("min_stock"),
            max_stock: row.get("max_stock"),
            unit: row.get("unit"),
            category_id: row.get("category_id"),
            category_name: row.get("category_name"),
            stock_id: row.get("stock_id"),
            stock_name: row.get("stock_name"),
            is_active: row.get("is_active"),
            current_stock_in_stock: row.get("current_stock_in_stock"),
        })
    }

    // Helper method to map database row to StockMovementWithDetails
    async fn map_stock_movement_row_to_with_details(&self, row: sqlx::sqlite::SqliteRow) -> Result<StockMovementWithDetails> {
        Ok(StockMovementWithDetails {
            id: row.get("id"),
            movement_type: row.get("movement_type"),
            from_stock_id: row.get("from_stock_id"),
            to_stock_id: row.get("to_stock_id"),
            product_id: row.get("product_id"),
            quantity: row.get("quantity"),
            unit_cost: row.get("unit_cost"),
            total_value: row.get("total_value"),
            reference_type: row.get("reference_type"),
            reference_id: row.get("reference_id"),
            reference_number: row.get("reference_number"),
            movement_date: row.get("movement_date"),
            notes: row.get("notes"),
            created_by: row.get("created_by"),
            created_at: row.get("created_at"),
            product_name: row.get("product_name"),
            product_sku: row.get("product_sku"),
            from_stock_name: row.get("from_stock_name"),
            to_stock_name: row.get("to_stock_name"),
            created_by_name: row.get("created_by_name"),
        })
    }

    // Legacy methods for compatibility
    pub async fn get_all_stocks_summary(&self, db: &Database) -> Result<Value> {
        let stocks = self.get_all(db, &StockQuery { page: None, limit: None, is_main_stock: None, is_active: Some(true) }).await?;
        Ok(serde_json::to_value(stocks)?)
    }

    pub async fn get_all_products(&self, db: &Database, _query: &StockProductQuery) -> Result<Value> {
        // This would need to be implemented based on specific requirements
        Ok(serde_json::json!([]))
    }

    pub async fn update_product_in_stock(&self, _db: &Database, _stock_id: i64, _product_id: i64, _payload: UpdateStockProductRequest) -> Result<Value> {
        // This would need to be implemented based on specific requirements
        Ok(serde_json::json!({}))
    }

    pub async fn remove_product_from_stock(&self, _db: &Database, _stock_id: i64, _product_id: i64) -> Result<()> {
        // This would need to be implemented based on specific requirements
        Ok(())
    }

    pub async fn transfer_product(&self, _db: &Database, _payload: TransferProductRequest) -> Result<Value> {
        // This would need to be implemented based on specific requirements
        Ok(serde_json::json!({}))
    }

    pub async fn adjust_stock(&self, _db: &Database, _payload: AdjustStockRequest) -> Result<Value> {
        // This would need to be implemented based on specific requirements
        Ok(serde_json::json!({}))
    }
}
