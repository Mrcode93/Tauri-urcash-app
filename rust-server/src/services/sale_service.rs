use anyhow::Result;
use crate::database::Database;
use crate::models::{
    sale::*,
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
pub struct SaleService;

impl SaleService {
    pub fn new() -> Self {
        Self
    }

    // Validation helpers
    pub fn validate_payment_method(method: &str) -> Result<()> {
        let valid_methods = vec!["cash", "card", "bank_transfer"];
        if !valid_methods.contains(&method) {
            return Err(anyhow::anyhow!("Invalid payment method. Must be one of: {}", valid_methods.join(", ")));
        }
        Ok(())
    }

    pub fn validate_payment_status(status: &str) -> Result<()> {
        let valid_statuses = vec!["paid", "unpaid", "partial"];
        if !valid_statuses.contains(&status) {
            return Err(anyhow::anyhow!("Invalid payment status. Must be one of: {}", valid_statuses.join(", ")));
        }
        Ok(())
    }

    pub fn validate_sale_status(status: &str) -> Result<()> {
        let valid_statuses = vec!["completed", "pending", "cancelled", "returned", "partially_returned"];
        if !valid_statuses.contains(&status) {
            return Err(anyhow::anyhow!("Invalid sale status. Must be one of: {}", valid_statuses.join(", ")));
        }
        Ok(())
    }

    pub fn validate_sale_item(item: &CreateSaleItemRequest) -> Result<()> {
        // Check if this is a manual item
        let is_manual_item = item.is_manual_item();
        
        if is_manual_item {
            // For manual items, provide a default name if not provided
            if item.name.as_ref().map_or(true, |name| name.trim().is_empty()) {
                // Default name will be set in the service
            }
        } else {
            // For real products, we need a valid product_id
            if item.product_id.is_none() || item.product_id.unwrap() <= 0 {
                return Err(anyhow::anyhow!("Real products must have a valid positive product_id"));
            }
        }
        
        if item.quantity <= 0 {
            return Err(anyhow::anyhow!("Invalid quantity in sale item"));
        }
        if item.price <= 0.0 {
            return Err(anyhow::anyhow!("Invalid price in sale item"));
        }
        if let Some(discount) = item.discount_percent {
            if discount < 0.0 || discount > 100.0 {
                return Err(anyhow::anyhow!("Invalid discount_percent in sale item"));
            }
        }
        if let Some(tax) = item.tax_percent {
            if tax < 0.0 || tax > 100.0 {
                return Err(anyhow::anyhow!("Invalid tax_percent in sale item"));
            }
        }
        Ok(())
    }

    // Calculate sale totals
    pub fn calculate_sale_totals(items: &[CreateSaleItemRequest], discount_amount: f64, tax_amount: f64) -> (f64, f64, f64, f64) {
        let subtotal = items.iter().map(|item| {
            let item_total = item.quantity as f64 * item.price;
            let item_discount = item_total * (item.discount_percent.unwrap_or(0.0) / 100.0);
            item_total - item_discount
        }).sum::<f64>();

        let total_discount = discount_amount + (subtotal * discount_amount / 100.0);
        let total_tax = tax_amount + (subtotal * tax_amount / 100.0);
        let net_amount = subtotal - total_discount + total_tax;

        (subtotal, total_discount, total_tax, net_amount)
    }

    // Get all sales with related data
    pub async fn get_all(&self, db: &Database, query: &SaleQuery) -> Result<SaleListResponse> {
        let page = query.page.unwrap_or(1);
        let limit = query.limit.unwrap_or(50);
        let offset = (page - 1) * limit;

        let mut conditions = Vec::new();
        let mut params: Vec<String> = Vec::new();

        // Add filters
        if let Some(customer_id) = query.customer_id {
            conditions.push("s.customer_id = ?");
            params.push(customer_id.to_string());
        }
        if let Some(delegate_id) = query.delegate_id {
            conditions.push("s.delegate_id = ?");
            params.push(delegate_id.to_string());
        }
        if let Some(ref payment_status) = query.payment_status {
            conditions.push("s.payment_status = ?");
            params.push(payment_status.clone());
        }
        if let Some(ref status) = query.status {
            conditions.push("s.status = ?");
            params.push(status.clone());
        }
        if let Some(ref start_date) = query.start_date {
            conditions.push("s.invoice_date >= ?");
            params.push(start_date.to_string());
        }
        if let Some(ref end_date) = query.end_date {
            conditions.push("s.invoice_date <= ?");
            params.push(end_date.to_string());
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        // Get total count for pagination
        let count_query = format!(
            "SELECT COUNT(*) as total FROM sales s {}",
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

        // Get sales with details
        let sales_query = format!(
            r#"
            SELECT 
                s.*,
                c.name as customer_name,
                r.name as delegate_name,
                u.name as created_by_name,
                u.username as created_by_username,
                json_group_array(
                    json_object(
                        'id', si.id,
                        'product_id', si.product_id,
                        'product_name', CASE 
                            WHEN si.product_name IS NOT NULL THEN si.product_name
                            WHEN si.product_id IS NOT NULL THEN p.name 
                            ELSE 'مواد اخرى'
                        END,
                        'sku', CASE 
                            WHEN si.product_name IS NOT NULL THEN 'MANUAL'
                            WHEN si.product_id IS NOT NULL THEN p.sku 
                            ELSE 'MANUAL'
                        END,
                        'unit', CASE 
                            WHEN si.product_name IS NOT NULL THEN 'قطعة'
                            WHEN si.product_id IS NOT NULL THEN p.unit 
                            ELSE 'قطعة'
                        END,
                        'quantity', si.quantity,
                        'returned_quantity', si.returned_quantity,
                        'price', si.price,
                        'discount_percent', si.discount_percent,
                        'tax_percent', si.tax_percent,
                        'total', si.total,
                        'line_total', si.line_total
                    )
                ) as items
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN representatives r ON s.delegate_id = r.id
            LEFT JOIN users u ON s.created_by = u.id
            LEFT JOIN sale_items si ON s.id = si.sale_id
            LEFT JOIN products p ON si.product_id = p.id AND si.product_id IS NOT NULL
            {}
            GROUP BY s.id
            ORDER BY s.created_at DESC
            LIMIT ? OFFSET ?
            "#,
            where_clause
        );

        let mut query_builder = sqlx::query(&sales_query);
        for param in &params {
            query_builder = query_builder.bind(param.as_str());
        }
        query_builder = query_builder.bind(limit).bind(offset);

        let sales_rows = query_builder.fetch_all(&db.pool).await?;

        let mut sales = Vec::new();
        for row in sales_rows {
            let sale = self.map_sale_row_to_with_details(row).await?;
            sales.push(sale);
        }

        Ok(SaleListResponse {
            items: sales,
            total,
            page,
            limit,
            total_pages: (total + limit - 1) / limit,
        })
    }

    // Get sale by ID with related data
    pub async fn get_by_id(&self, db: &Database, id: i64) -> Result<Option<SaleWithDetails>> {
        let sale_row = sqlx::query(r#"
            SELECT 
                s.*,
                c.name as customer_name,
                r.name as delegate_name,
                u.name as created_by_name,
                u.username as created_by_username,
                json_group_array(
                    json_object(
                        'id', si.id,
                        'product_id', si.product_id,
                        'product_name', CASE 
                            WHEN si.product_name IS NOT NULL THEN si.product_name
                            WHEN si.product_id IS NOT NULL THEN p.name 
                            ELSE 'مواد اخرى'
                        END,
                        'sku', CASE 
                            WHEN si.product_name IS NOT NULL THEN 'MANUAL'
                            WHEN si.product_id IS NOT NULL THEN p.sku 
                            ELSE 'MANUAL'
                        END,
                        'unit', CASE 
                            WHEN si.product_name IS NOT NULL THEN 'قطعة'
                            WHEN si.product_id IS NOT NULL THEN p.unit 
                            ELSE 'قطعة'
                        END,
                        'quantity', si.quantity,
                        'returned_quantity', si.returned_quantity,
                        'price', si.price,
                        'discount_percent', si.discount_percent,
                        'tax_percent', si.tax_percent,
                        'total', si.total,
                        'line_total', si.line_total
                    )
                ) as items
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN representatives r ON s.delegate_id = r.id
            LEFT JOIN users u ON s.created_by = u.id
            LEFT JOIN sale_items si ON s.id = si.sale_id
            LEFT JOIN products p ON si.product_id = p.id AND si.product_id IS NOT NULL
            WHERE s.id = ?
            GROUP BY s.id
        "#)
        .bind(id)
        .fetch_optional(&db.pool)
        .await?;

        if let Some(row) = sale_row {
            let sale = self.map_sale_row_to_with_details(row).await?;
            Ok(Some(sale))
        } else {
            Ok(None)
        }
    }

    // Get customer sales
    pub async fn get_by_customer(&self, db: &Database, customer_id: i64) -> Result<Vec<SaleWithDetails>> {
        let sales_rows = sqlx::query(r#"
            SELECT 
                s.*,
                c.name as customer_name,
                r.name as delegate_name,
                u.name as created_by_name,
                u.username as created_by_username,
                json_group_array(
                    json_object(
                        'id', si.id,
                        'product_id', si.product_id,
                        'product_name', CASE 
                            WHEN si.product_name IS NOT NULL THEN si.product_name
                            WHEN si.product_id IS NOT NULL THEN p.name 
                            ELSE 'مواد اخرى'
                        END,
                        'sku', CASE 
                            WHEN si.product_name IS NOT NULL THEN 'MANUAL'
                            WHEN si.product_id IS NOT NULL THEN p.sku 
                            ELSE 'MANUAL'
                        END,
                        'unit', CASE 
                            WHEN si.product_name IS NOT NULL THEN 'قطعة'
                            WHEN si.product_id IS NOT NULL THEN p.unit 
                            ELSE 'قطعة'
                        END,
                        'quantity', si.quantity,
                        'returned_quantity', si.returned_quantity,
                        'price', si.price,
                        'discount_percent', si.discount_percent,
                        'tax_percent', si.tax_percent,
                        'total', si.total,
                        'line_total', si.line_total
                    )
                ) as items
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN representatives r ON s.delegate_id = r.id
            LEFT JOIN users u ON s.created_by = u.id
            LEFT JOIN sale_items si ON s.id = si.sale_id
            LEFT JOIN products p ON si.product_id = p.id AND si.product_id IS NOT NULL
            WHERE s.customer_id = ?
            GROUP BY s.id
            ORDER BY s.created_at DESC
        "#)
        .bind(customer_id)
        .fetch_all(&db.pool)
        .await?;

        let mut sales = Vec::new();
        for row in sales_rows {
            let sale = self.map_sale_row_to_with_details(row).await?;
            sales.push(sale);
        }

        Ok(sales)
    }

    // Create new sale
    pub async fn create(&self, db: &Database, sale_data: CreateSaleRequest) -> Result<SaleWithDetails> {
        info!("Creating new sale: customer_id={:?}, items_count={}", sale_data.customer_id, sale_data.items.len());

        // Validate sale data
        if sale_data.customer_id.is_none() && sale_data.customer_id != Some(999) {
            return Err(anyhow::anyhow!("Customer ID is required"));
        }
        if sale_data.items.is_empty() {
            return Err(anyhow::anyhow!("Sale must have at least one item"));
        }

        // Validate each sale item
        for item in &sale_data.items {
            Self::validate_sale_item(item)?;
        }

        // Validate payment method and status
        if let Some(ref payment_method) = sale_data.payment_method {
            Self::validate_payment_method(payment_method)?;
        }
        if let Some(ref payment_status) = sale_data.payment_status {
            Self::validate_payment_status(payment_status)?;
        }

        // Check for duplicate sales (same barcode)
        if let Some(ref barcode) = sale_data.barcode {
            let existing_sale = sqlx::query("SELECT id, invoice_no FROM sales WHERE barcode = ?")
                .bind(barcode)
                .fetch_optional(&db.pool)
                .await?;
            
            if existing_sale.is_some() {
                return Err(anyhow::anyhow!("Sale with barcode {} already exists", barcode));
            }
        }

        // Calculate totals
        let (_subtotal, total_discount, total_tax, net_amount) = Self::calculate_sale_totals(
            &sale_data.items,
            sale_data.discount_amount.unwrap_or(0.0),
            sale_data.tax_amount.unwrap_or(0.0)
        );

        // Generate invoice number
        let timestamp = chrono::Utc::now().timestamp_millis();
        let random_suffix = rand::random::<u32>() % 10000;
        let invoice_no = format!("INV-{}-{}", timestamp, random_suffix);

        // Use database transaction
        let mut tx = db.pool.begin().await?;
                // Double-check for duplicates within transaction
                if let Some(ref barcode) = sale_data.barcode {
                    let duplicate_check = sqlx::query("SELECT id FROM sales WHERE barcode = ?")
                        .bind(barcode)
                        .fetch_optional(&mut *tx)
                        .await?;
                    
                    if duplicate_check.is_some() {
                        return Err(anyhow::anyhow!("Sale with barcode {} already exists", barcode));
                    }
                }

                // Create sale record
                let sale_id = sqlx::query(r#"
                    INSERT INTO sales (
                        customer_id, delegate_id, invoice_no, invoice_date, due_date,
                        total_amount, discount_amount, tax_amount, net_amount,
                        paid_amount, payment_method, payment_status, status,
                        notes, barcode, created_by, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                "#)
                .bind(sale_data.customer_id)
                .bind(sale_data.delegate_id)
                .bind(&invoice_no)
                .bind(sale_data.invoice_date.unwrap_or_else(|| chrono::Utc::now().date_naive()))
                .bind(sale_data.due_date)
                .bind(net_amount)
                .bind(total_discount)
                .bind(total_tax)
                .bind(net_amount)
                .bind(sale_data.paid_amount.unwrap_or(0.0))
                .bind(sale_data.payment_method.as_deref().unwrap_or("cash"))
                .bind(sale_data.payment_status.as_deref().unwrap_or("unpaid"))
                .bind("completed")
                .bind(&sale_data.notes)
                .bind(sale_data.barcode)
                .bind(sale_data.customer_id) // created_by - using customer_id as placeholder
                .execute(&mut *tx)
                .await?
                .last_insert_rowid();

                // Create sale items
                for item in &sale_data.items {
                    let item_total = item.total.unwrap_or_else(|| item.quantity as f64 * item.price);
                    let line_total = item.line_total.unwrap_or(item_total);
                    
                    if item.is_manual_item() {
                        // For manual items, use product_name and NULL product_id
                        sqlx::query(r#"
                            INSERT INTO sale_items (
                                sale_id, product_id, product_name, quantity, price,
                                discount_percent, tax_percent, total, line_total,
                                created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        "#)
                        .bind(sale_id)
                        .bind::<Option<i64>>(None)
                        .bind(item.name.as_deref().unwrap_or("مواد اخرى"))
                        .bind(item.quantity)
                        .bind(item.price)
                        .bind(item.discount_percent.unwrap_or(0.0))
                        .bind(item.tax_percent.unwrap_or(0.0))
                        .bind(item_total)
                        .bind(line_total)
                        .execute(&mut *tx)
                        .await?;
                    } else {
                        // For real products, use product_id and NULL product_name
                        sqlx::query(r#"
                            INSERT INTO sale_items (
                                sale_id, product_id, product_name, quantity, price,
                                discount_percent, tax_percent, total, line_total,
                                created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        "#)
                        .bind(sale_id)
                        .bind(item.product_id)
                        .bind::<Option<String>>(None)
                        .bind(item.quantity)
                        .bind(item.price)
                        .bind(item.discount_percent.unwrap_or(0.0))
                        .bind(item.tax_percent.unwrap_or(0.0))
                        .bind(item_total)
                        .bind(line_total)
                        .execute(&mut *tx)
                        .await?;
                    }
                }

                // Create debt record if payment is not fully paid
                if sale_data.payment_status.as_deref() != Some("paid") && (sale_data.paid_amount.unwrap_or(0.0) < net_amount) {
                    let debt_amount = net_amount - sale_data.paid_amount.unwrap_or(0.0);
                    sqlx::query(r#"
                        INSERT INTO debts (
                            customer_id, sale_id, amount, due_date, status, notes, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    "#)
                    .bind(sale_data.customer_id)
                    .bind(sale_id)
                    .bind(debt_amount)
                    .bind(sale_data.due_date)
                    .bind(if debt_amount > 0.0 { "unpaid" } else { "paid" })
                    .bind(&sale_data.notes)
                    .execute(&mut *tx)
                    .await?;
                }

        tx.commit().await?;
        let result = sale_id;

        // Get the created sale with details
        let sale = self.get_by_id(db, result).await?;
        sale.ok_or_else(|| anyhow::anyhow!("Failed to retrieve created sale"))
    }

    // Update sale
    pub async fn update(&self, db: &Database, id: i64, sale_data: UpdateSaleRequest) -> Result<SaleWithDetails> {
        // Validate payment method and status if provided
        if let Some(ref payment_method) = sale_data.payment_method {
            Self::validate_payment_method(payment_method)?;
        }
        if let Some(ref payment_status) = sale_data.payment_status {
            Self::validate_payment_status(payment_status)?;
        }

        // Validate items if provided
        if let Some(ref items) = sale_data.items {
            for item in items {
                Self::validate_sale_item(item)?;
            }
        }

        let mut tx = db.pool.begin().await?;
                // Get existing sale
                let existing_sale = sqlx::query("SELECT * FROM sales WHERE id = ?")
                    .bind(id)
                    .fetch_optional(&mut *tx)
                    .await?;
                
                if existing_sale.is_none() {
                    return Err(anyhow::anyhow!("Sale not found"));
                }

                // Delete existing sale items if new items are provided
                if sale_data.items.is_some() {
                    sqlx::query("DELETE FROM sale_items WHERE sale_id = ?")
                        .bind(id)
                        .execute(&mut *tx)
                        .await?;
                }

                // Calculate new totals if items are provided
                let mut totals = (0.0, 0.0, 0.0, 0.0);
                if let Some(ref items) = sale_data.items {
                    totals = Self::calculate_sale_totals(
                        items,
                        sale_data.discount_amount.unwrap_or(0.0),
                        sale_data.tax_amount.unwrap_or(0.0)
                    );
                }

                // Update sale
                let mut query_parts = Vec::new();
                let mut has_updates = false;

                if sale_data.customer_id.is_some() {
                    query_parts.push("customer_id = ?");
                    has_updates = true;
                }
                if sale_data.delegate_id.is_some() {
                    query_parts.push("delegate_id = ?");
                    has_updates = true;
                }
                if sale_data.invoice_date.is_some() {
                    query_parts.push("invoice_date = ?");
                    has_updates = true;
                }
                if sale_data.due_date.is_some() {
                    query_parts.push("due_date = ?");
                    has_updates = true;
                }
                if sale_data.payment_method.is_some() {
                    query_parts.push("payment_method = ?");
                    has_updates = true;
                }
                if sale_data.payment_status.is_some() {
                    query_parts.push("payment_status = ?");
                    has_updates = true;
                }
                if sale_data.notes.is_some() {
                    query_parts.push("notes = ?");
                    has_updates = true;
                }
                if sale_data.barcode.is_some() {
                    query_parts.push("barcode = ?");
                    has_updates = true;
                }
                if sale_data.items.is_some() {
                    query_parts.push("total_amount = ?");
                    query_parts.push("discount_amount = ?");
                    query_parts.push("tax_amount = ?");
                    query_parts.push("net_amount = ?");
                    has_updates = true;
                }

                if has_updates {
                    query_parts.push("updated_at = CURRENT_TIMESTAMP");
                    let update_query = format!(
                        "UPDATE sales SET {} WHERE id = ?",
                        query_parts.join(", ")
                    );
                    
                    let mut query_builder = sqlx::query(&update_query);
                    
                    if let Some(customer_id) = sale_data.customer_id {
                        query_builder = query_builder.bind(customer_id);
                    }
                    if let Some(delegate_id) = sale_data.delegate_id {
                        query_builder = query_builder.bind(delegate_id);
                    }
                    if let Some(invoice_date) = sale_data.invoice_date {
                        query_builder = query_builder.bind(invoice_date);
                    }
                    if let Some(due_date) = sale_data.due_date {
                        query_builder = query_builder.bind(due_date);
                    }
                    if let Some(ref payment_method) = sale_data.payment_method {
                        query_builder = query_builder.bind(payment_method);
                    }
                    if let Some(ref payment_status) = sale_data.payment_status {
                        query_builder = query_builder.bind(payment_status);
                    }
                    if let Some(ref notes) = sale_data.notes {
                        query_builder = query_builder.bind(notes);
                    }
                    if let Some(ref barcode) = sale_data.barcode {
                        query_builder = query_builder.bind(barcode);
                    }
                    if sale_data.items.is_some() {
                        query_builder = query_builder.bind(totals.0);
                        query_builder = query_builder.bind(totals.1);
                        query_builder = query_builder.bind(totals.2);
                        query_builder = query_builder.bind(totals.3);
                    }
                    
                    query_builder = query_builder.bind(id);
                    query_builder.execute(&mut *tx).await?;
                }

                // Insert new sale items if provided
                if let Some(items) = sale_data.items {
                    for item in items {
                        let item_total = item.total.unwrap_or_else(|| item.quantity as f64 * item.price);
                        let line_total = item.line_total.unwrap_or(item_total);

                        if item.is_manual_item() {
                            sqlx::query(r#"
                                INSERT INTO sale_items (
                                    sale_id, product_id, product_name, quantity, price,
                                    discount_percent, tax_percent, total, line_total,
                                    created_at, updated_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                            "#)
                            .bind(id)
                            .bind::<Option<i64>>(None)
                            .bind(item.name.as_deref().unwrap_or("مواد اخرى"))
                            .bind(item.quantity)
                            .bind(item.price)
                            .bind(item.discount_percent.unwrap_or(0.0))
                            .bind(item.tax_percent.unwrap_or(0.0))
                            .bind(item_total)
                            .bind(line_total)
                            .execute(&mut *tx)
                            .await?;
                        } else {
                            sqlx::query(r#"
                                INSERT INTO sale_items (
                                    sale_id, product_id, product_name, quantity, price,
                                    discount_percent, tax_percent, total, line_total,
                                    created_at, updated_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                            "#)
                            .bind(id)
                            .bind(item.product_id)
                            .bind::<Option<String>>(None)
                            .bind(item.quantity)
                            .bind(item.price)
                            .bind(item.discount_percent.unwrap_or(0.0))
                            .bind(item.tax_percent.unwrap_or(0.0))
                            .bind(item_total)
                            .bind(line_total)
                            .execute(&mut *tx)
                            .await?;
                        }
                    }
                }

        tx.commit().await?;

        // Get the updated sale with details
        let sale = self.get_by_id(db, id).await?;
        sale.ok_or_else(|| anyhow::anyhow!("Failed to retrieve updated sale"))
    }

    // Delete sale
    pub async fn delete(&self, db: &Database, id: i64) -> Result<bool> {
        let mut tx = db.pool.begin().await?;
                // Delete related records
                sqlx::query("DELETE FROM debts WHERE sale_id = ?")
                    .bind(id)
                    .execute(&mut *tx)
                    .await?;
                
                sqlx::query("DELETE FROM sale_items WHERE sale_id = ?")
                    .bind(id)
                    .execute(&mut *tx)
                    .await?;
                
                // Delete sale
                let changes = sqlx::query("DELETE FROM sales WHERE id = ?")
                    .bind(id)
                    .execute(&mut *tx)
                    .await?
                    .rows_affected();
                
        tx.commit().await?;
        let result = changes > 0;

        Ok(result)
    }

    // Process sale return
    pub async fn process_return(&self, db: &Database, id: i64, return_data: SaleReturnRequest) -> Result<SaleReturnResult> {
        let mut tx = db.pool.begin().await?;
                let sale = sqlx::query("SELECT * FROM sales WHERE id = ?")
                    .bind(id)
                    .fetch_one(&mut *tx)
                    .await?;
                
                if sale.get::<String, _>("status") != "completed" {
                    return Err(anyhow::anyhow!("Only completed sales can be returned"));
                }

                // Validate return items
                let sale_items = sqlx::query("SELECT * FROM sale_items WHERE sale_id = ?")
                    .bind(id)
                    .fetch_all(&mut *tx)
                    .await?;
                
                let item_map: HashMap<i64, sqlx::sqlite::SqliteRow> = sale_items
                    .into_iter()
                    .map(|row| (row.get::<i64, _>("id"), row))
                    .collect();

                // Calculate total return amount
                let mut total_return_amount = 0.0;
                for return_item in &return_data.items {
                    let original_item = item_map.get(&return_item.sale_item_id)
                        .ok_or_else(|| anyhow::anyhow!("Invalid sale item id: {}", return_item.sale_item_id))?;
                    
                    let current_returned_quantity: i64 = original_item.get("returned_quantity");
                    let original_quantity: i64 = original_item.get("quantity");
                    let remaining_quantity = original_quantity - current_returned_quantity;
                    
                    if return_item.quantity > remaining_quantity {
                        return Err(anyhow::anyhow!("Return quantity exceeds remaining quantity for item {}", return_item.sale_item_id));
                    }
                    
                    let price: f64 = original_item.get("price");
                    total_return_amount += return_item.quantity as f64 * price;
                }

                // Create return record
                let return_id = sqlx::query(r#"
                    INSERT INTO sale_returns (
                        sale_id, return_date, reason, status, refund_method, total_amount, created_by
                    ) VALUES (?, CURRENT_TIMESTAMP, ?, 'completed', ?, ?, ?)
                "#)
                .bind(id)
                .bind(&return_data.reason)
                .bind(&return_data.refund_method)
                .bind(total_return_amount)
                .bind(sale.get::<Option<i64>, _>("created_by"))
                .execute(&mut *tx)
                .await?
                .last_insert_rowid();

                // Process each return item
                for item in &return_data.items {
                    let original_item = item_map.get(&item.sale_item_id).unwrap();
                    let price: f64 = original_item.get("price");
                    
                    // Insert return item record
                    sqlx::query(r#"
                        INSERT INTO sale_return_items (
                            return_id, sale_item_id, quantity, price, total
                        ) VALUES (?, ?, ?, ?, ?)
                    "#)
                    .bind(return_id)
                    .bind(item.sale_item_id)
                    .bind(item.quantity)
                    .bind(price)
                    .bind(item.quantity as f64 * price)
                    .execute(&mut *tx)
                    .await?;

                    // Update sale item with returned quantity
                    let current_returned_quantity: i64 = original_item.get("returned_quantity");
                    let new_returned_quantity = current_returned_quantity + item.quantity;
                    let original_quantity: i64 = original_item.get("quantity");
                    let remaining_quantity = original_quantity - new_returned_quantity;
                    let new_total = remaining_quantity as f64 * price;
                    let discount_percent: f64 = original_item.get("discount_percent");
                    let tax_percent: f64 = original_item.get("tax_percent");
                    let discount_amount = new_total * (discount_percent / 100.0);
                    let tax_amount = (new_total - discount_amount) * (tax_percent / 100.0);
                    let new_line_total = new_total - discount_amount + tax_amount;

                    sqlx::query(r#"
                        UPDATE sale_items 
                        SET returned_quantity = ?, total = ?, line_total = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    "#)
                    .bind(new_returned_quantity)
                    .bind(new_total)
                    .bind(new_line_total)
                    .bind(item.sale_item_id)
                    .execute(&mut *tx)
                    .await?;
                }

                // Check if all items are returned
                let updated_sale_items = sqlx::query("SELECT * FROM sale_items WHERE sale_id = ?")
                    .bind(id)
                    .fetch_all(&mut *tx)
                    .await?;
                
                let all_items_returned = updated_sale_items.iter().all(|item| {
                    let returned_quantity: i64 = item.get("returned_quantity");
                    let quantity: i64 = item.get("quantity");
                    returned_quantity >= quantity
                });

                let new_status = if all_items_returned { "returned" } else { "partially_returned" };
                
                // Calculate new sale amounts
                let total_amount: f64 = sale.get("total_amount");
                let paid_amount: f64 = sale.get("paid_amount");
                let new_total_amount = total_amount - total_return_amount;
                let new_paid_amount = paid_amount.min(new_total_amount);
                let new_remaining_amount = new_total_amount - new_paid_amount;
                
                // Determine new payment status
                let new_payment_status = if new_total_amount <= 0.0 {
                    "paid"
                } else if new_paid_amount > 0.0 && new_paid_amount < new_total_amount {
                    "partial"
                } else {
                    "unpaid"
                };

                // Update sale
                sqlx::query(r#"
                    UPDATE sales 
                    SET total_amount = ?, paid_amount = ?, payment_status = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                "#)
                .bind(new_total_amount)
                .bind(new_paid_amount)
                .bind(new_payment_status)
                .bind(new_status)
                .bind(id)
                .execute(&mut *tx)
                .await?;

                // Update debt record
                let existing_debt = sqlx::query("SELECT * FROM debts WHERE sale_id = ?")
                    .bind(id)
                    .fetch_optional(&mut *tx)
                    .await?;
                
                if let Some(_) = existing_debt {
                    if new_payment_status == "paid" || new_total_amount <= 0.0 {
                        sqlx::query("DELETE FROM debts WHERE sale_id = ?")
                            .bind(id)
                            .execute(&mut *tx)
                            .await?;
                    } else if new_remaining_amount > 0.0 {
                        sqlx::query(r#"
                            UPDATE debts 
                            SET amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
                            WHERE sale_id = ?
                        "#)
                        .bind(new_remaining_amount)
                        .bind(if new_payment_status == "unpaid" { "unpaid" } else { "partial" })
                        .bind(id)
                        .execute(&mut *tx)
                        .await?;
                    }
                } else if (new_payment_status == "unpaid" || new_payment_status == "partial") && new_remaining_amount > 0.0 {
                    sqlx::query(r#"
                        INSERT INTO debts (
                            sale_id, customer_id, amount, status, due_date, notes, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    "#)
                    .bind(id)
                    .bind(sale.get::<Option<i64>, _>("customer_id"))
                    .bind(new_remaining_amount)
                    .bind(if new_payment_status == "unpaid" { "unpaid" } else { "partial" })
                    .bind(sale.get::<Option<NaiveDate>, _>("due_date"))
                    .bind(format!("Debt updated due to return - Invoice: {}", sale.get::<String, _>("invoice_no")))
                    .execute(&mut *tx)
                    .await?;
                }

        tx.commit().await?;
        let result = (return_id, new_status, new_total_amount, new_paid_amount, new_remaining_amount, new_payment_status);

        let (return_id, new_status, new_total_amount, new_paid_amount, new_remaining_amount, new_payment_status) = result;

        // Get updated sale
        let updated_sale = self.get_by_id(db, id).await?
            .ok_or_else(|| anyhow::anyhow!("Failed to retrieve updated sale"))?;

        Ok(SaleReturnResult {
            return_id,
            sale_id: id,
            status: new_status.to_string(),
            total_amount: return_data.items.iter().map(|item| item.total).sum(),
            return_items: return_data.items,
            new_sale_amounts: SaleAmounts {
                total: new_total_amount,
                paid: new_paid_amount,
                remaining: new_remaining_amount,
                payment_status: new_payment_status.to_string(),
            },
            sale: updated_sale,
        })
    }

    // Get product by barcode for POS
    pub async fn get_product_by_barcode(&self, db: &Database, barcode: &str, allow_negative_stock: bool) -> Result<Option<ProductByBarcodeResponse>> {
        if barcode.is_empty() {
            return Ok(None);
        }

        let stock_condition = if allow_negative_stock { "" } else { "AND p.current_stock > 0" };
        
        let product = sqlx::query(&format!(r#"
            SELECT 
                p.*,
                COALESCE(SUM(si.quantity), 0) as total_sold,
                COALESCE(SUM(pi.quantity), 0) as total_purchased,
                p.current_stock
            FROM products p
            LEFT JOIN sale_items si ON p.id = si.product_id
            LEFT JOIN purchase_items pi ON p.id = pi.product_id
            WHERE p.barcode = ? {}
            GROUP BY p.id
        "#, stock_condition))
        .bind(barcode)
        .fetch_optional(&db.pool)
        .await?;

        if let Some(row) = product {
            Ok(Some(ProductByBarcodeResponse {
                id: row.get("id"),
                name: row.get("name"),
                sku: row.get("sku"),
                barcode: row.get("barcode"),
                description: row.get("description"),
                purchase_price: row.get("purchase_price"),
                selling_price: row.get("selling_price"),
                current_stock: row.get("current_stock"),
                unit: row.get("unit"),
                category_id: row.get("category_id"),
                category_name: row.get("category_name"),
                is_active: row.get("is_active"),
                stock: row.get("current_stock"),
                total_sold: row.get("total_sold"),
                total_purchased: row.get("total_purchased"),
            }))
        } else {
            Ok(None)
        }
    }

    // Helper method to map database row to SaleWithDetails
    async fn map_sale_row_to_with_details(&self, row: sqlx::sqlite::SqliteRow) -> Result<SaleWithDetails> {
        let items_json: String = row.get("items");
        let items: Vec<SaleItemWithDetails> = if items_json == "[null]" {
            Vec::new()
        } else {
            serde_json::from_str(&items_json).unwrap_or_else(|_| Vec::new())
        };

        Ok(SaleWithDetails {
            id: row.get("id"),
            customer_id: row.get("customer_id"),
            customer_name: row.get("customer_name"),
            delegate_id: row.get("delegate_id"),
            delegate_name: row.get("delegate_name"),
            invoice_no: row.get("invoice_no"),
            invoice_date: row.get("invoice_date"),
            due_date: row.get("due_date"),
            total_amount: row.get("total_amount"),
            discount_amount: row.get("discount_amount"),
            tax_amount: row.get("tax_amount"),
            net_amount: row.get("net_amount"),
            paid_amount: row.get("paid_amount"),
            remaining_amount: row.get("remaining_amount"),
            payment_method: row.get("payment_method"),
            payment_status: row.get("payment_status"),
            status: row.get("status"),
            notes: row.get("notes"),
            barcode: row.get("barcode"),
            created_by: row.get("created_by"),
            created_by_name: row.get("created_by_name"),
            created_by_username: row.get("created_by_username"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            total_items: items.len() as i64,
            items,
        })
    }
}
