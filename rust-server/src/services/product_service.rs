use anyhow::Result;
use crate::database::Database;
use crate::models::{
    Product, ProductQuery, CreateProductRequest, UpdateProductRequest, 
    ProductListResponse, ProductWithDetails, ProductSearchResponse, 
    UpdateStockRequest, LowStockProduct
};
use sqlx::{Row, SqlitePool};
use tracing::{info, warn, error};
use chrono::{Utc, DateTime, NaiveDate, NaiveDateTime};
use serde_json::Value;

#[derive(Clone)]
pub struct ProductService;

impl ProductService {
    pub fn new() -> Self {
        Self
    }

    // Get all products with pagination and filters
    pub async fn get_all(&self, db: &Database, query: &ProductQuery) -> Result<ProductListResponse> {
        let page = query.page.unwrap_or(1);
        let limit = query.limit.unwrap_or(1000);
        let offset = (page - 1) * limit;

        let mut where_conditions = vec!["1=1".to_string()];
        let mut query_params: Vec<String> = vec![];

        if let Some(ref search) = query.search {
            where_conditions.push("(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR p.description LIKE ?)".to_string());
            let search_pattern = format!("%{}%", search);
            query_params.push(search_pattern.clone());
            query_params.push(search_pattern.clone());
            query_params.push(search_pattern.clone());
            query_params.push(search_pattern);
        }

        if let Some(category) = &query.category {
            where_conditions.push("p.category_id = ?".to_string());
            query_params.push(category.clone());
        }

        let where_clause = where_conditions.join(" AND ");

        // Get total count
        let count_query = format!(
            r#"
            SELECT COUNT(*) as total
            FROM products p
            WHERE {}
            "#,
            where_clause
        );

        let mut count_builder = sqlx::query(&count_query);
        for param in &query_params {
            count_builder = count_builder.bind(param);
        }

        let total: i64 = count_builder
            .fetch_one(&db.pool)
            .await?
            .get("total");

        // Get products
        let query_str = format!(
            r#"
            SELECT 
                p.*, c.name as category_name, s.name as stock_name,
                pps.supplier_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN stocks s ON p.stock_id = s.id
            LEFT JOIN product_primary_suppliers pps ON p.id = pps.product_id
            WHERE {}
            ORDER BY p.name ASC
            LIMIT ? OFFSET ?
            "#,
            where_clause
        );

        let mut query_builder = sqlx::query(&query_str);
        for param in &query_params {
            query_builder = query_builder.bind(param);
        }
        query_builder = query_builder.bind(limit).bind(offset);

        let items = query_builder
            .fetch_all(&db.pool)
            .await?
            .into_iter()
            .map(|row| ProductWithDetails {
                id: row.get("id"),
                name: row.get("name"),
                scientific_name: row.get("scientific_name"),
                description: row.get("description"),
                supported: row.get("supported"),
                sku: row.get("sku"),
                barcode: row.get("barcode"),
                purchase_price: row.get("purchase_price"),
                selling_price: row.get("selling_price"),
                wholesale_price: row.get("wholesale_price"),
                company_name: row.get("company_name"),
                current_stock: row.get("current_stock"),
                min_stock: row.get("min_stock"),
                max_stock: row.get("max_stock"),
                total_sold: row.get("total_sold"),
                total_purchased: row.get("total_purchased"),
                unit: row.get("unit"),
                units_per_box: row.get("units_per_box"),
                is_dolar: row.get("is_dolar"),
                expiry_date: row.get("expiry_date"),
                is_active: row.get("is_active"),
                last_purchase_date: row.get("last_purchase_date"),
                last_purchase_price: row.get("last_purchase_price"),
                average_cost: row.get("average_cost"),
                reorder_point: row.get("reorder_point"),
                category_id: row.get("category_id"),
                stock_id: row.get("stock_id"),
                location_in_stock: row.get("location_in_stock"),
                shelf_number: row.get("shelf_number"),
                rack_number: row.get("rack_number"),
                bin_number: row.get("bin_number"),
                last_stock_check: row.get("last_stock_check"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                supplier_name: row.get("supplier_name"),
                category_name: row.get("category_name"),
                stock_name: row.get("stock_name"),
            })
            .collect();

        let total_pages = (total + limit - 1) / limit;

        Ok(ProductListResponse {
            items,
            total,
            page,
            limit,
            total_pages,
        })
    }

    // Get product by ID
    pub async fn get_by_id(&self, db: &Database, id: i64) -> Result<Option<ProductWithDetails>> {
        let query = r#"
            SELECT 
                p.*, c.name as category_name, s.name as stock_name,
                pps.supplier_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN stocks s ON p.stock_id = s.id
            LEFT JOIN product_primary_suppliers pps ON p.id = pps.product_id
            WHERE p.id = ?
        "#;

        let result = sqlx::query(query)
            .bind(id)
            .fetch_optional(&db.pool)
            .await?;

        if let Some(row) = result {
            Ok(Some(ProductWithDetails {
                id: row.get("id"),
                name: row.get("name"),
                scientific_name: row.get("scientific_name"),
                description: row.get("description"),
                supported: row.get("supported"),
                sku: row.get("sku"),
                barcode: row.get("barcode"),
                purchase_price: row.get("purchase_price"),
                selling_price: row.get("selling_price"),
                wholesale_price: row.get("wholesale_price"),
                company_name: row.get("company_name"),
                current_stock: row.get("current_stock"),
                min_stock: row.get("min_stock"),
                max_stock: row.get("max_stock"),
                total_sold: row.get("total_sold"),
                total_purchased: row.get("total_purchased"),
                unit: row.get("unit"),
                units_per_box: row.get("units_per_box"),
                is_dolar: row.get("is_dolar"),
                expiry_date: row.get("expiry_date"),
                is_active: row.get("is_active"),
                last_purchase_date: row.get("last_purchase_date"),
                last_purchase_price: row.get("last_purchase_price"),
                average_cost: row.get("average_cost"),
                reorder_point: row.get("reorder_point"),
                category_id: row.get("category_id"),
                stock_id: row.get("stock_id"),
                location_in_stock: row.get("location_in_stock"),
                shelf_number: row.get("shelf_number"),
                rack_number: row.get("rack_number"),
                bin_number: row.get("bin_number"),
                last_stock_check: row.get("last_stock_check"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                supplier_name: row.get("supplier_name"),
                category_name: row.get("category_name"),
                stock_name: row.get("stock_name"),
            }))
        } else {
        Ok(None)
        }
    }

    // Create new product
    pub async fn create(&self, db: &Database, payload: CreateProductRequest) -> Result<ProductWithDetails> {
        // Validate required fields
        if payload.purchase_price < 0.0 {
            return Err(anyhow::anyhow!("سعر الشراء يجب أن يكون أكبر من أو يساوي صفر"));
        }

        if payload.selling_price < 0.0 {
            return Err(anyhow::anyhow!("سعر البيع يجب أن يكون أكبر من أو يساوي صفر"));
        }

        if payload.selling_price < payload.purchase_price {
            return Err(anyhow::anyhow!("سعر البيع يجب أن يكون أكبر من أو يساوي سعر الشراء"));
        }

        // Check if SKU already exists
        let existing_sku = sqlx::query("SELECT id FROM products WHERE sku = ?")
            .bind(&payload.sku)
            .fetch_optional(&db.pool)
            .await?;
        if existing_sku.is_some() {
            return Err(anyhow::anyhow!("رمز المنتج موجود مسبقاً"));
        }

        // Check if barcode already exists
        if let Some(ref barcode) = payload.barcode {
            let existing_barcode = sqlx::query("SELECT id FROM products WHERE barcode = ?")
                .bind(barcode)
                .fetch_optional(&db.pool)
                .await?;
            if existing_barcode.is_some() {
                return Err(anyhow::anyhow!("الباركود موجود مسبقاً"));
            }
        }

        // Use database transaction to ensure consistency
        let result = sqlx::query(r#"
            INSERT INTO products (
                name, scientific_name, description, supported, sku, barcode,
                purchase_price, selling_price, wholesale_price, company_name,
                current_stock, min_stock, max_stock, unit, units_per_box,
                is_dolar, expiry_date, is_active, last_purchase_price,
                average_cost, reorder_point, category_id, stock_id,
                location_in_stock, shelf_number, rack_number, bin_number,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        "#)
        .bind(&payload.name)
        .bind(&payload.scientific_name)
        .bind(&payload.description)
        .bind(payload.supported.unwrap_or(true))
        .bind(&payload.sku)
        .bind(&payload.barcode)
        .bind(payload.purchase_price)
        .bind(payload.selling_price)
        .bind(payload.wholesale_price)
        .bind(&payload.company_name)
        .bind(payload.current_stock.unwrap_or(0))
        .bind(payload.min_stock.unwrap_or(0))
        .bind(payload.max_stock)
        .bind(payload.unit.as_deref().unwrap_or("قطعة"))
        .bind(payload.units_per_box.unwrap_or(1))
        .bind(payload.is_dolar.unwrap_or(false))
        .bind(payload.expiry_date)
        .bind(payload.is_active.unwrap_or(true))
        .bind(payload.last_purchase_price)
        .bind(payload.average_cost.unwrap_or(0.0))
        .bind(payload.reorder_point.unwrap_or(0))
        .bind(payload.category_id)
        .bind(payload.stock_id)
        .bind(&payload.location_in_stock)
        .bind(&payload.shelf_number)
        .bind(&payload.rack_number)
        .bind(&payload.bin_number)
        .execute(&db.pool)
        .await?;

        let product_id = result.last_insert_rowid();

        // If the product has initial stock and a supplier, create purchase records
        if let (Some(current_stock), Some(supplier_id)) = (payload.current_stock, payload.supplier_id) {
            if current_stock > 0 {
                // Create product-supplier relationship
                sqlx::query(r#"
                    INSERT INTO product_suppliers (
                        product_id, supplier_id, is_primary, supplier_price,
                        lead_time_days, minimum_order_quantity, is_active,
                        created_at, updated_at
                    ) VALUES (?, ?, 1, ?, 7, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                "#)
                .bind(product_id)
                .bind(supplier_id)
                .bind(payload.purchase_price)
                .execute(&db.pool)
                .await?;

                // Create purchase record
                let purchase_id = sqlx::query(r#"
                    INSERT INTO purchases (
                        supplier_id, invoice_no, invoice_date, total_amount,
                        net_amount, payment_method, payment_status, status,
                        notes, created_by, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                "#)
                .bind(supplier_id)
                .bind(format!("INV-{}-{}", chrono::Utc::now().timestamp(), product_id))
                .bind(chrono::Utc::now().date_naive())
                .bind(payload.purchase_price * current_stock as f64)
                .bind(payload.purchase_price * current_stock as f64)
                .bind("cash")
                .bind("paid")
                .bind("completed")
                .bind(format!("شراء تلقائي للمخزون الأولي للمنتج {}", payload.name))
                .bind(1) // Default admin user
                .execute(&db.pool)
                .await?
                .last_insert_rowid();

                // Create purchase item record
                sqlx::query(r#"
                    INSERT INTO purchase_items (
                        purchase_id, product_id, quantity, unit_price,
                        subtotal, notes, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                "#)
                .bind(purchase_id)
                .bind(product_id)
                .bind(current_stock)
                .bind(payload.purchase_price)
                .bind(payload.purchase_price * current_stock as f64)
                .bind("شراء مخزون أولي")
                .execute(&db.pool)
                .await?;

                info!("Auto-created purchase record for product {}: product_id={}, purchase_id={}, quantity={}, supplier_id={}", 
                    payload.name, product_id, purchase_id, current_stock, supplier_id);
            }
        }

        // Get the created product
        let product = self.get_by_id(db, product_id).await?;
        if let Some(product) = product {
            Ok(product)
        } else {
            Err(anyhow::anyhow!("فشل في إنشاء المنتج"))
        }
    }

    // Update product
    pub async fn update(&self, db: &Database, id: i64, payload: UpdateProductRequest) -> Result<ProductWithDetails> {
        // Check if product exists
        let existing = self.get_by_id(db, id).await?;
        if existing.is_none() {
            return Err(anyhow::anyhow!("المنتج غير موجود"));
        }

        // Build update query dynamically
        let mut update_fields = Vec::new();
        let mut query_params: Vec<String> = vec![];

        if let Some(name) = &payload.name {
            update_fields.push("name = ?".to_string());
            query_params.push(name.clone());
        }

        if let Some(scientific_name) = &payload.scientific_name {
            update_fields.push("scientific_name = ?".to_string());
            query_params.push(scientific_name.clone());
        }

        if let Some(description) = &payload.description {
            update_fields.push("description = ?".to_string());
            query_params.push(description.clone());
        }

        if let Some(supported) = payload.supported {
            update_fields.push("supported = ?".to_string());
            query_params.push(supported.to_string());
        }

        if let Some(sku) = &payload.sku {
            // Check if SKU already exists for other products
            let existing_sku = sqlx::query("SELECT id FROM products WHERE sku = ? AND id != ?")
                .bind(sku)
                .bind(id)
                .fetch_optional(&db.pool)
                .await?;
            if existing_sku.is_some() {
                return Err(anyhow::anyhow!("رمز المنتج موجود مسبقاً"));
            }
            update_fields.push("sku = ?".to_string());
            query_params.push(sku.clone());
        }

        if let Some(barcode) = &payload.barcode {
            // Check if barcode already exists for other products
            let existing_barcode = sqlx::query("SELECT id FROM products WHERE barcode = ? AND id != ?")
                .bind(barcode)
                .bind(id)
                .fetch_optional(&db.pool)
                .await?;
            if existing_barcode.is_some() {
                return Err(anyhow::anyhow!("الباركود موجود مسبقاً"));
            }
            update_fields.push("barcode = ?".to_string());
            query_params.push(barcode.clone());
        }

        if let Some(purchase_price) = payload.purchase_price {
            if purchase_price < 0.0 {
                return Err(anyhow::anyhow!("سعر الشراء يجب أن يكون أكبر من أو يساوي صفر"));
            }
            update_fields.push("purchase_price = ?".to_string());
            query_params.push(purchase_price.to_string());
        }

        if let Some(selling_price) = payload.selling_price {
            if selling_price < 0.0 {
                return Err(anyhow::anyhow!("سعر البيع يجب أن يكون أكبر من أو يساوي صفر"));
            }
            update_fields.push("selling_price = ?".to_string());
            query_params.push(selling_price.to_string());
        }

        if let Some(wholesale_price) = payload.wholesale_price {
            update_fields.push("wholesale_price = ?".to_string());
            query_params.push(wholesale_price.to_string());
        }

        if let Some(company_name) = &payload.company_name {
            update_fields.push("company_name = ?".to_string());
            query_params.push(company_name.clone());
        }

        if let Some(current_stock) = payload.current_stock {
            update_fields.push("current_stock = ?".to_string());
            query_params.push(current_stock.to_string());
        }

        if let Some(min_stock) = payload.min_stock {
            update_fields.push("min_stock = ?".to_string());
            query_params.push(min_stock.to_string());
        }

        if let Some(max_stock) = payload.max_stock {
            update_fields.push("max_stock = ?".to_string());
            query_params.push(max_stock.to_string());
        }

        if let Some(unit) = &payload.unit {
            update_fields.push("unit = ?".to_string());
            query_params.push(unit.clone());
        }

        if let Some(units_per_box) = payload.units_per_box {
            update_fields.push("units_per_box = ?".to_string());
            query_params.push(units_per_box.to_string());
        }

        if let Some(is_dolar) = payload.is_dolar {
            update_fields.push("is_dolar = ?".to_string());
            query_params.push(is_dolar.to_string());
        }

        if let Some(expiry_date) = payload.expiry_date {
            update_fields.push("expiry_date = ?".to_string());
            query_params.push(expiry_date.to_string());
        }

        if let Some(is_active) = payload.is_active {
            update_fields.push("is_active = ?".to_string());
            query_params.push(is_active.to_string());
        }

        if let Some(last_purchase_price) = payload.last_purchase_price {
            update_fields.push("last_purchase_price = ?".to_string());
            query_params.push(last_purchase_price.to_string());
        }

        if let Some(average_cost) = payload.average_cost {
            update_fields.push("average_cost = ?".to_string());
            query_params.push(average_cost.to_string());
        }

        if let Some(reorder_point) = payload.reorder_point {
            update_fields.push("reorder_point = ?".to_string());
            query_params.push(reorder_point.to_string());
        }

        if let Some(category_id) = payload.category_id {
            update_fields.push("category_id = ?".to_string());
            query_params.push(category_id.to_string());
        }

        if let Some(stock_id) = payload.stock_id {
            update_fields.push("stock_id = ?".to_string());
            query_params.push(stock_id.to_string());
        }

        if let Some(location_in_stock) = &payload.location_in_stock {
            update_fields.push("location_in_stock = ?".to_string());
            query_params.push(location_in_stock.clone());
        }

        if let Some(shelf_number) = &payload.shelf_number {
            update_fields.push("shelf_number = ?".to_string());
            query_params.push(shelf_number.clone());
        }

        if let Some(rack_number) = &payload.rack_number {
            update_fields.push("rack_number = ?".to_string());
            query_params.push(rack_number.clone());
        }

        if let Some(bin_number) = &payload.bin_number {
            update_fields.push("bin_number = ?".to_string());
            query_params.push(bin_number.clone());
        }

        if update_fields.is_empty() {
            return Err(anyhow::anyhow!("لا توجد بيانات للتحديث"));
        }

        update_fields.push("updated_at = CURRENT_TIMESTAMP".to_string());

        let update_query = format!(
            "UPDATE products SET {} WHERE id = ?",
            update_fields.join(", ")
        );

        let mut query_builder = sqlx::query(&update_query);
        for param in &query_params {
            query_builder = query_builder.bind(param);
        }
        query_builder = query_builder.bind(id);

        let changes = query_builder.execute(&db.pool).await?;

        if changes.rows_affected() == 0 {
            return Err(anyhow::anyhow!("فشل في تحديث المنتج"));
        }

        // Get the updated product
        let product = self.get_by_id(db, id).await?;
        if let Some(product) = product {
            Ok(product)
        } else {
            Err(anyhow::anyhow!("فشل في تحديث المنتج"))
        }
    }

    // Delete product
    pub async fn delete(&self, db: &Database, id: i64) -> Result<Value> {
        // Check if product exists
        let product = self.get_by_id(db, id).await?;
        if product.is_none() {
            return Err(anyhow::anyhow!("المنتج غير موجود"));
        }

        // Check for associated purchase or sale items
        let purchase_items = sqlx::query("SELECT id FROM purchase_items WHERE product_id = ?")
            .bind(id)
            .fetch_all(&db.pool)
            .await?;

        let sale_items = sqlx::query("SELECT id FROM sale_items WHERE product_id = ?")
            .bind(id)
            .fetch_all(&db.pool)
            .await?;

        if !purchase_items.is_empty() || !sale_items.is_empty() {
            return Err(anyhow::anyhow!("لا يمكن حذف المنتج لوجود سجلات مشتريات أو مبيعات مرتبطة به"));
        }

        let changes = sqlx::query("DELETE FROM products WHERE id = ?")
            .bind(id)
            .execute(&db.pool)
            .await?;

        if changes.rows_affected() == 0 {
            return Err(anyhow::anyhow!("فشل في حذف المنتج"));
        }

        Ok(serde_json::json!({
            "id": id,
            "deleted": true
        }))
    }

    // Search products
    pub async fn search_products(&self, db: &Database, query: &str) -> Result<Vec<ProductWithDetails>> {
        let search_pattern = format!("%{}%", query);
        
        let products = sqlx::query(r#"
            SELECT 
                p.*, c.name as category_name, s.name as stock_name,
                pps.supplier_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN stocks s ON p.stock_id = s.id
            LEFT JOIN product_primary_suppliers pps ON p.id = pps.product_id
            WHERE (p.name LIKE ? OR p.description LIKE ?) 
            AND p.is_active = 1
            ORDER BY p.name ASC
        "#)
        .bind(&search_pattern)
        .bind(&search_pattern)
        .fetch_all(&db.pool)
        .await?
        .into_iter()
        .map(|row| ProductWithDetails {
            id: row.get("id"),
            name: row.get("name"),
            scientific_name: row.get("scientific_name"),
            description: row.get("description"),
            supported: row.get("supported"),
            sku: row.get("sku"),
            barcode: row.get("barcode"),
            purchase_price: row.get("purchase_price"),
            selling_price: row.get("selling_price"),
            wholesale_price: row.get("wholesale_price"),
            company_name: row.get("company_name"),
            current_stock: row.get("current_stock"),
            min_stock: row.get("min_stock"),
            max_stock: row.get("max_stock"),
            total_sold: row.get("total_sold"),
            total_purchased: row.get("total_purchased"),
            unit: row.get("unit"),
            units_per_box: row.get("units_per_box"),
            is_dolar: row.get("is_dolar"),
            expiry_date: row.get("expiry_date"),
            is_active: row.get("is_active"),
            last_purchase_date: row.get("last_purchase_date"),
            last_purchase_price: row.get("last_purchase_price"),
            average_cost: row.get("average_cost"),
            reorder_point: row.get("reorder_point"),
            category_id: row.get("category_id"),
            stock_id: row.get("stock_id"),
            location_in_stock: row.get("location_in_stock"),
            shelf_number: row.get("shelf_number"),
            rack_number: row.get("rack_number"),
            bin_number: row.get("bin_number"),
            last_stock_check: row.get("last_stock_check"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            supplier_name: row.get("supplier_name"),
            category_name: row.get("category_name"),
            stock_name: row.get("stock_name"),
        })
        .collect();

        Ok(products)
    }

    // Get product by barcode
    pub async fn get_by_barcode(&self, db: &Database, barcode: &str) -> Result<Option<ProductWithDetails>> {
        let result = sqlx::query(r#"
            SELECT 
                p.*, c.name as category_name, s.name as stock_name,
                pps.supplier_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN stocks s ON p.stock_id = s.id
            LEFT JOIN product_primary_suppliers pps ON p.id = pps.product_id
            WHERE p.barcode = ? AND p.is_active = 1
        "#)
        .bind(barcode)
        .fetch_optional(&db.pool)
        .await?;

        if let Some(row) = result {
            Ok(Some(ProductWithDetails {
                id: row.get("id"),
                name: row.get("name"),
                scientific_name: row.get("scientific_name"),
                description: row.get("description"),
                supported: row.get("supported"),
                sku: row.get("sku"),
                barcode: row.get("barcode"),
                purchase_price: row.get("purchase_price"),
                selling_price: row.get("selling_price"),
                wholesale_price: row.get("wholesale_price"),
                company_name: row.get("company_name"),
                current_stock: row.get("current_stock"),
                min_stock: row.get("min_stock"),
                max_stock: row.get("max_stock"),
                total_sold: row.get("total_sold"),
                total_purchased: row.get("total_purchased"),
                unit: row.get("unit"),
                units_per_box: row.get("units_per_box"),
                is_dolar: row.get("is_dolar"),
                expiry_date: row.get("expiry_date"),
                is_active: row.get("is_active"),
                last_purchase_date: row.get("last_purchase_date"),
                last_purchase_price: row.get("last_purchase_price"),
                average_cost: row.get("average_cost"),
                reorder_point: row.get("reorder_point"),
                category_id: row.get("category_id"),
                stock_id: row.get("stock_id"),
                location_in_stock: row.get("location_in_stock"),
                shelf_number: row.get("shelf_number"),
                rack_number: row.get("rack_number"),
                bin_number: row.get("bin_number"),
                last_stock_check: row.get("last_stock_check"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                supplier_name: row.get("supplier_name"),
                category_name: row.get("category_name"),
                stock_name: row.get("stock_name"),
            }))
        } else {
        Ok(None)
        }
    }

    // Get low stock products
    pub async fn get_low_stock(&self, db: &Database, threshold: i64) -> Result<Vec<LowStockProduct>> {
        let products = sqlx::query(r#"
            SELECT 
                p.id, p.name, p.sku, p.barcode, p.current_stock, p.min_stock, p.unit,
                c.name as category_name, s.name as stock_name, pps.supplier_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN stocks s ON p.stock_id = s.id
            LEFT JOIN product_primary_suppliers pps ON p.id = pps.product_id
            WHERE p.current_stock <= ? AND p.is_active = 1
            ORDER BY p.current_stock ASC
        "#)
        .bind(threshold)
        .fetch_all(&db.pool)
        .await?
        .into_iter()
        .map(|row| LowStockProduct {
            id: row.get("id"),
            name: row.get("name"),
            sku: row.get("sku"),
            barcode: row.get("barcode"),
            current_stock: row.get("current_stock"),
            min_stock: row.get("min_stock"),
            unit: row.get("unit"),
            supplier_name: row.get("supplier_name"),
            category_name: row.get("category_name"),
            stock_name: row.get("stock_name"),
        })
        .collect();

        Ok(products)
    }

    // Get products optimized for POS
    pub async fn get_for_pos(&self, db: &Database, query: &ProductQuery) -> Result<ProductSearchResponse> {
        let page = query.page.unwrap_or(1);
        let limit = query.limit.unwrap_or(100);
        let offset = (page - 1) * limit;

        // Select only essential fields for POS
        let select_fields = if let Some(fields) = &query.fields {
            fields.split(',').map(|f| format!("p.{}", f.trim())).collect::<Vec<_>>().join(", ")
        } else {
            "p.id, p.name, p.sku, p.barcode, p.selling_price, p.current_stock, p.unit, p.min_stock, p.units_per_box".to_string()
        };

        let mut where_conditions = vec!["1=1".to_string()];
        let mut query_params: Vec<String> = vec![];

        if let Some(ref search) = query.search {
            where_conditions.push("(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)".to_string());
            let search_pattern = format!("%{}%", search);
            query_params.push(search_pattern.clone());
            query_params.push(search_pattern.clone());
            query_params.push(search_pattern);
        }

        if let Some(ref category) = query.category {
            if category != "all" {
                where_conditions.push("p.category_id = ?".to_string());
                query_params.push(category.clone());
            }
        }

        let where_clause = where_conditions.join(" AND ");

        // Get products
        let query_str = format!(
            r#"
            SELECT {}
            FROM products p
            WHERE {}
            ORDER BY p.name ASC
            LIMIT ? OFFSET ?
            "#,
            select_fields, where_clause
        );

        let mut query_builder = sqlx::query(&query_str);
        for param in &query_params {
            query_builder = query_builder.bind(param);
        }
        query_builder = query_builder.bind(limit).bind(offset);

        let products = query_builder
            .fetch_all(&db.pool)
            .await?
            .into_iter()
            .map(|row| ProductWithDetails {
                id: row.get("id"),
                name: row.get("name"),
                scientific_name: row.get("scientific_name"),
                description: row.get("description"),
                supported: row.get("supported"),
                sku: row.get("sku"),
                barcode: row.get("barcode"),
                purchase_price: row.get("purchase_price"),
                selling_price: row.get("selling_price"),
                wholesale_price: row.get("wholesale_price"),
                company_name: row.get("company_name"),
                current_stock: row.get("current_stock"),
                min_stock: row.get("min_stock"),
                max_stock: row.get("max_stock"),
                total_sold: row.get("total_sold"),
                total_purchased: row.get("total_purchased"),
                unit: row.get("unit"),
                units_per_box: row.get("units_per_box"),
                is_dolar: row.get("is_dolar"),
                expiry_date: row.get("expiry_date"),
                is_active: row.get("is_active"),
                last_purchase_date: row.get("last_purchase_date"),
                last_purchase_price: row.get("last_purchase_price"),
                average_cost: row.get("average_cost"),
                reorder_point: row.get("reorder_point"),
                category_id: row.get("category_id"),
                stock_id: row.get("stock_id"),
                location_in_stock: row.get("location_in_stock"),
                shelf_number: row.get("shelf_number"),
                rack_number: row.get("rack_number"),
                bin_number: row.get("bin_number"),
                last_stock_check: row.get("last_stock_check"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                supplier_name: row.get("supplier_name"),
                category_name: row.get("category_name"),
                stock_name: row.get("stock_name"),
            })
            .collect();

        // Get total count for pagination
        let count_query = format!(
            r#"
            SELECT COUNT(*) as total
            FROM products p
            WHERE {}
            "#,
            where_clause
        );

        let mut count_builder = sqlx::query(&count_query);
        for param in &query_params {
            count_builder = count_builder.bind(param);
        }

        let total: i64 = count_builder
            .fetch_one(&db.pool)
            .await?
            .get("total");

        let has_more = (page * limit) < total;

        Ok(ProductSearchResponse {
            products,
            total,
            has_more,
            page,
            limit,
        })
    }

    // Update product stock
    pub async fn update_stock(&self, db: &Database, id: i64, quantity: i64) -> Result<bool> {
        let changes = sqlx::query(r#"
            UPDATE products 
            SET current_stock = current_stock + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        "#)
        .bind(quantity)
        .bind(id)
        .execute(&db.pool)
        .await?;

        Ok(changes.rows_affected() > 0)
    }
}
