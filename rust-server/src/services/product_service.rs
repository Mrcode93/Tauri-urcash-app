use anyhow::Result;
use crate::database::Database;
use crate::models::{
    Product, ProductQuery, CreateProductRequest, UpdateProductRequest, 
    ProductListResponse, ProductWithDetails, ProductSearchResponse, 
    UpdateStockRequest, LowStockProduct, ImportResult
};
use crate::utils::generate_unique_sku;
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
                p.*, c.name as category_name, s.name as stock_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN stocks s ON p.stock_id = s.id
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
                supplier_name: None, // Removed supplier relationship
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
                p.*, c.name as category_name, s.name as stock_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN stocks s ON p.stock_id = s.id
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
                supplier_name: None, // Removed supplier relationship
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

        // Generate unique SKU if not provided
        let sku = if let Some(provided_sku) = &payload.sku {
            // Check if provided SKU already exists
            let existing_sku = sqlx::query("SELECT id FROM products WHERE sku = ?")
                .bind(provided_sku)
                .fetch_optional(&db.pool)
                .await?;
            if existing_sku.is_some() {
                return Err(anyhow::anyhow!("رمز المنتج موجود مسبقاً"));
            }
            provided_sku.clone()
        } else {
            // Auto-generate unique SKU based on product name
            generate_unique_sku(&payload.name, &db.pool).await?
        };

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

        // If no stock_id is provided, assign to main stock automatically
        let stock_id = if let Some(provided_stock_id) = payload.stock_id {
            provided_stock_id
        } else {
            // Get main stock ID
            let main_stock = sqlx::query("SELECT id FROM stocks WHERE is_main_stock = 1 AND is_active = 1 LIMIT 1")
                .fetch_optional(&db.pool)
                .await?;

            match main_stock {
                Some(row) => row.get::<i64, _>("id"),
                None => return Err(anyhow::anyhow!("لم يتم العثور على مخزن رئيسي. يرجى إنشاء مخزن رئيسي أولاً"))
            }
        };

        // Use database transaction to ensure consistency
        let result = sqlx::query(r#"
            INSERT INTO products (
                name, scientific_name, description, supported, sku, barcode,
                purchase_price, selling_price, wholesale_price, company_name,
                current_stock, min_stock, max_stock, unit, units_per_box,
                is_dolar, expiry_date, is_active, last_purchase_price,
                average_cost, reorder_point, category_id, stock_id,
                location_in_stock, shelf_number, rack_number, bin_number
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#)
        .bind(&payload.name)
        .bind(&payload.scientific_name)
        .bind(&payload.description)
        .bind(payload.supported.unwrap_or(true))
        .bind(&sku)
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
        .bind(stock_id)
        .bind(&payload.location_in_stock)
        .bind(&payload.shelf_number)
        .bind(&payload.rack_number)
        .bind(&payload.bin_number)
        .execute(&db.pool)
        .await?;

        let product_id = result.last_insert_rowid();

        // Fetch the created product with details
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
                p.*, c.name as category_name, s.name as stock_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN stocks s ON p.stock_id = s.id
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
            supplier_name: None, // Removed supplier relationship
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
                p.*, c.name as category_name, s.name as stock_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN stocks s ON p.stock_id = s.id
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
                supplier_name: None, // Removed supplier relationship
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
                c.name as category_name, s.name as stock_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN stocks s ON p.stock_id = s.id
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
            supplier_name: None, // Removed supplier relationship
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
            "p.id, p.name, p.scientific_name, p.description, p.supported, p.sku, p.barcode, p.purchase_price, p.selling_price, p.wholesale_price, p.company_name, p.current_stock, p.min_stock, p.max_stock, p.total_sold, p.total_purchased, p.unit, p.units_per_box, p.is_dolar, p.expiry_date, p.is_active, p.last_purchase_date, p.last_purchase_price, p.average_cost, p.reorder_point, p.category_id, p.stock_id, p.location_in_stock, p.shelf_number, p.rack_number, p.bin_number, p.last_stock_check, p.created_at, p.updated_at".to_string()
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
            SELECT {}, c.name as category_name, s.name as stock_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN stocks s ON p.stock_id = s.id
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
                supplier_name: None, // Removed supplier relationship
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

    // Import products from Excel/CSV file
    pub async fn import_products(&self, db: &Database, file_content: &[u8], filename: &str) -> Result<ImportResult> {
        use calamine::{open_workbook, DataType, Xlsx, Reader};
        use std::io::Cursor;
        use chrono::NaiveDate;

        let mut errors = Vec::new();
        let mut imported = 0;
        let mut failed = 0;
        let mut total = 0;

        // Get default stock ID
        let default_stock = sqlx::query("SELECT id FROM stocks WHERE is_main_stock = 1 AND is_active = 1 LIMIT 1")
            .fetch_optional(&db.pool)
            .await?;

        let default_stock_id = match default_stock {
            Some(row) => row.get::<i64, _>("id"),
            None => return Err(anyhow::anyhow!("No default main stock found. Please create a main stock first."))
        };

        // Determine file type and process accordingly
        if filename.to_lowercase().ends_with(".xlsx") || filename.to_lowercase().ends_with(".xls") {
            // Process Excel file using temporary file
            use std::fs::File;
            use std::io::Write;
            use tempfile::NamedTempFile;
            
            // Create temporary file
            let mut temp_file = NamedTempFile::new()?;
            temp_file.write_all(file_content)?;
            let temp_path = temp_file.path();
            
            // Open workbook from temporary file
            let mut workbook: Xlsx<_> = open_workbook(temp_path)?;
            
            if let Some(Ok(range)) = workbook.worksheet_range_at(0) {
                let rows: Vec<Vec<String>> = range.rows()
                    .map(|row| {
                        row.iter().map(|cell| {
                            match cell {
                                DataType::Empty => String::new(),
                                DataType::String(s) => s.clone(),
                                DataType::Float(f) => f.to_string(),
                                DataType::Int(i) => i.to_string(),
                                DataType::Bool(b) => b.to_string(),
                                _ => String::new(),
                            }
                        }).collect()
                    })
                    .collect();

                if rows.is_empty() {
                    return Err(anyhow::anyhow!("Excel file is empty"));
                }

                // Use first row as headers
                let headers = &rows[0];
                let data_rows = &rows[1..];

                // Find column indices
                let product_name_index = headers.iter().position(|h| {
                    ["product_name", "name", "product name", "product", "اسم المنتج", "المنتج"]
                        .contains(&h.to_lowercase().trim())
                }).ok_or_else(|| anyhow::anyhow!("Missing required product name header"))?;

                let company_index = headers.iter().position(|h| {
                    ["company", "company_name", "شركة", "اسم الشركة"]
                        .contains(&h.to_lowercase().trim())
                });

                let price_index = headers.iter().position(|h| {
                    ["price", "dollar_price", "dinar_price", "سعر", "السعر"]
                        .contains(&h.to_lowercase().trim())
                });

                let expiry_index = headers.iter().position(|h| {
                    ["expiration", "expiry", "expiry_date", "expirstion", "تاريخ الانتهاء", "تاريخ الصلاحية"]
                        .contains(&h.to_lowercase().trim())
                });

                // Process data rows
                for (row_index, row) in data_rows.iter().enumerate() {
                    total += 1;
                    let actual_row_index = row_index + 2; // +1 for 0-based index, +1 for header

                    // Extract product name
                    let product_name = if product_name_index < row.len() {
                        row[product_name_index].trim().to_string()
                    } else {
                        String::new()
                    };

                    if product_name.is_empty() || product_name.len() < 2 {
                        continue;
                    }

                    // Extract company name
                    let company_name = if let Some(idx) = company_index {
                        if idx < row.len() {
                            row[idx].trim().to_string()
                        } else {
                            String::new()
                        }
                    } else {
                        String::new()
                    };

                    // Extract and parse price
                    let mut price = 0.0;
                    if let Some(idx) = price_index {
                        if idx < row.len() {
                            let price_str = row[idx].trim();
                            if let Ok(parsed_price) = price_str.parse::<f64>() {
                                price = parsed_price;
                            } else {
                                // Try to clean the price string
                                let cleaned_price = price_str.replace(|c: char| !c.is_numeric() && c != '.' && c != '-', "");
                                if let Ok(parsed_price) = cleaned_price.parse::<f64>() {
                                    price = parsed_price;
                                }
                            }
                        }
                    }

                    if price <= 0.0 {
                        errors.push(format!("Row {}: Invalid or missing price value", actual_row_index));
                        failed += 1;
                        continue;
                    }

                    // Extract and parse expiry date
                    let mut expiry_date = None;
                    if let Some(idx) = expiry_index {
                        if idx < row.len() {
                            let date_str = row[idx].trim();
                            if !date_str.is_empty() {
                                // Try different date formats
                                if let Ok(date) = NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
                                    expiry_date = Some(date);
                                } else if let Ok(date) = NaiveDate::parse_from_str(date_str, "%d/%m/%Y") {
                                    expiry_date = Some(date);
                                } else if let Ok(date) = NaiveDate::parse_from_str(date_str, "%m/%d/%Y") {
                                    expiry_date = Some(date);
                                }
                            }
                        }
                    }

                    // Check if product already exists
                    let existing_product = sqlx::query("SELECT id FROM products WHERE name = ?")
                        .bind(&product_name)
                        .fetch_optional(&db.pool)
                        .await?;

                    if existing_product.is_some() {
                        errors.push(format!("Row {}: Product \"{}\" already exists", actual_row_index, product_name));
                        failed += 1;
                        continue;
                    }

                    // Generate unique SKU
                    let sku = generate_unique_sku(&product_name, &db.pool).await?;

                    // Insert product
                    let result = sqlx::query(r#"
                        INSERT INTO products (
                            name, description, supported, sku, company_name,
                            purchase_price, selling_price, wholesale_price,
                            current_stock, min_stock, unit, units_per_box,
                            is_dolar, expiry_date, stock_id
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    "#)
                    .bind(&product_name)
                    .bind("") // description
                    .bind(true) // supported
                    .bind(&sku)
                    .bind(&company_name)
                    .bind(price)
                    .bind(price * 1.2) // selling_price = purchase_price * 1.2
                    .bind(price * 1.1) // wholesale_price = purchase_price * 1.1
                    .bind(0) // current_stock
                    .bind(0) // min_stock
                    .bind("قطعة") // unit
                    .bind(1) // units_per_box
                    .bind(false) // is_dolar
                    .bind(expiry_date)
                    .bind(default_stock_id)
                    .execute(&db.pool)
                    .await?;

                    if result.rows_affected() > 0 {
                        imported += 1;
                    } else {
                        failed += 1;
                        errors.push(format!("Row {}: Failed to insert product \"{}\"", actual_row_index, product_name));
                    }
                }
            } else {
                return Err(anyhow::anyhow!("Could not read Excel worksheet"));
            }
        } else if filename.to_lowercase().ends_with(".csv") {
            // Process CSV file
            let cursor = Cursor::new(file_content);
            let mut reader = csv::Reader::from_reader(cursor);

            // Read headers
            let headers = reader.headers()?.iter()
                .map(|h| h.to_lowercase().trim().to_string())
                .collect::<Vec<String>>();

            // Find column indices
            let product_name_index = headers.iter().position(|h| {
                ["product_name", "name", "product name", "product", "اسم المنتج", "المنتج"]
                    .contains(&h.as_str())
            }).ok_or_else(|| anyhow::anyhow!("Missing required product name header"))?;

            let company_index = headers.iter().position(|h| {
                ["company", "company_name", "شركة", "اسم الشركة"]
                    .contains(&h.as_str())
            });

            let price_index = headers.iter().position(|h| {
                ["price", "dollar_price", "dinar_price", "سعر", "السعر"]
                    .contains(&h.as_str())
            });

            let expiry_index = headers.iter().position(|h| {
                ["expiration", "expiry", "expiry_date", "expirstion", "تاريخ الانتهاء", "تاريخ الصلاحية"]
                    .contains(&h.as_str())
            });

            // Process data rows
            for (row_index, result) in reader.records().enumerate() {
                total += 1;
                let actual_row_index = row_index + 2; // +1 for 0-based index, +1 for header

                let row = result?;

                // Extract product name
                let product_name = if product_name_index < row.len() {
                    row[product_name_index].trim().to_string()
                } else {
                    String::new()
                };

                if product_name.is_empty() || product_name.len() < 2 {
                    continue;
                }

                // Extract company name
                let company_name = if let Some(idx) = company_index {
                    if idx < row.len() {
                        row[idx].trim().to_string()
                    } else {
                        String::new()
                    }
                } else {
                    String::new()
                };

                // Extract and parse price
                let mut price = 0.0;
                if let Some(idx) = price_index {
                    if idx < row.len() {
                        let price_str = row[idx].trim();
                        if let Ok(parsed_price) = price_str.parse::<f64>() {
                            price = parsed_price;
                        } else {
                            // Try to clean the price string
                            let cleaned_price = price_str.replace(|c: char| !c.is_numeric() && c != '.' && c != '-', "");
                            if let Ok(parsed_price) = cleaned_price.parse::<f64>() {
                                price = parsed_price;
                            }
                        }
                    }
                }

                if price <= 0.0 {
                    errors.push(format!("Row {}: Invalid or missing price value", actual_row_index));
                    failed += 1;
                    continue;
                }

                // Extract and parse expiry date
                let mut expiry_date = None;
                if let Some(idx) = expiry_index {
                    if idx < row.len() {
                        let date_str = row[idx].trim();
                        if !date_str.is_empty() {
                            // Try different date formats
                            if let Ok(date) = NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
                                expiry_date = Some(date);
                            } else if let Ok(date) = NaiveDate::parse_from_str(date_str, "%d/%m/%Y") {
                                expiry_date = Some(date);
                            } else if let Ok(date) = NaiveDate::parse_from_str(date_str, "%m/%d/%Y") {
                                expiry_date = Some(date);
                            }
                        }
                    }
                }

                // Check if product already exists
                let existing_product = sqlx::query("SELECT id FROM products WHERE name = ?")
                    .bind(&product_name)
                    .fetch_optional(&db.pool)
                    .await?;

                if existing_product.is_some() {
                    errors.push(format!("Row {}: Product \"{}\" already exists", actual_row_index, product_name));
                    failed += 1;
                    continue;
                }

                // Generate unique SKU
                let sku = generate_unique_sku(&product_name, &db.pool).await?;

                // Insert product
                let result = sqlx::query(r#"
                    INSERT INTO products (
                        name, description, supported, sku, company_name,
                        purchase_price, selling_price, wholesale_price,
                        current_stock, min_stock, unit, units_per_box,
                        is_dolar, expiry_date, stock_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#)
                .bind(&product_name)
                .bind("") // description
                .bind(true) // supported
                .bind(&sku)
                .bind(&company_name)
                .bind(price)
                .bind(price * 1.2) // selling_price = purchase_price * 1.2
                .bind(price * 1.1) // wholesale_price = purchase_price * 1.1
                .bind(0) // current_stock
                .bind(0) // min_stock
                .bind("قطعة") // unit
                .bind(1) // units_per_box
                .bind(false) // is_dolar
                .bind(expiry_date)
                .bind(default_stock_id)
                .execute(&db.pool)
                .await?;

                if result.rows_affected() > 0 {
                    imported += 1;
                } else {
                    failed += 1;
                    errors.push(format!("Row {}: Failed to insert product \"{}\"", actual_row_index, product_name));
                }
            }
        } else {
            return Err(anyhow::anyhow!("الملف غير مدعوم. يرجى تحميل ملف Excel (.xlsx/.xls) أو CSV."));
        }

        // Store error count before moving errors
        let error_count = errors.len();
        
        // Limit errors to prevent large responses
        let limited_errors = if errors.len() > 100 {
            errors[..100].to_vec()
        } else {
            errors
        };

        Ok(ImportResult {
            imported,
            failed,
            total,
            errors: limited_errors,
            error_count,
        })
    }

    // Get expiring products within specified days
    pub async fn get_expiring_products(&self, db: &Database, days: i64) -> Result<Vec<ProductWithDetails>> {
        let query = r#"
            SELECT 
                p.*, c.name as category_name, s.name as stock_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN stocks s ON p.stock_id = s.id
            WHERE p.expiry_date IS NOT NULL 
            AND p.expiry_date <= DATE('now', '+' || ? || ' days')
            AND p.expiry_date >= DATE('now')
            AND p.is_active = 1
            ORDER BY p.expiry_date ASC
        "#;

        let rows = sqlx::query(query)
            .bind(days)
            .fetch_all(&db.pool)
            .await?;

        let products = rows
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
                supplier_name: None, // Removed supplier relationship
                category_name: row.get("category_name"),
                stock_name: row.get("stock_name"),
            })
            .collect();

        Ok(products)
    }
}
