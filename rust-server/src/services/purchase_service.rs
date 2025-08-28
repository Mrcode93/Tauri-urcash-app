use anyhow::Result;
use crate::database::Database;
use crate::models::{
    Purchase, PurchaseItem, CreatePurchaseRequest, UpdatePurchaseRequest, 
    PurchaseWithDetails, PurchaseListResponse, PurchaseReturnRequest,
    PurchaseWithReturns, PurchaseReturnResponse,
    PurchaseWarning, CreditStatus
};
use crate::models::bill::{PurchaseReturn, PurchaseReturnItem};
use sqlx::Row;
use tracing::{info, warn};
use chrono::{Utc, DateTime, NaiveDate, NaiveDateTime};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Clone)]
pub struct PurchaseService;

impl PurchaseService {
    pub fn new() -> Self {
        Self
    }

    // Helper function to safely format dates
    fn format_date(date_value: Option<NaiveDate>) -> Option<String> {
        date_value.map(|d| d.to_string())
    }

    // Helper function to safely format datetime
    fn format_datetime(datetime_value: Option<NaiveDateTime>) -> Option<String> {
        datetime_value.map(|dt| dt.to_string())
    }

    // Helper function to check supplier credit limit
    async fn check_supplier_credit_limit(&self, db: &Database, supplier_id: i64, purchase_amount: f64) -> Result<(Vec<PurchaseWarning>, CreditStatus)> {
        let supplier = sqlx::query(r#"
            SELECT id, name, credit_limit, current_balance 
            FROM suppliers 
            WHERE id = ?
        "#)
        .bind(supplier_id)
        .fetch_one(&db.pool)
        .await?;

        let supplier_name: String = supplier.get("name");
        let credit_limit: Option<f64> = supplier.get("credit_limit");
        let current_balance: f64 = supplier.get("current_balance");

        let mut warnings = Vec::new();
        let new_balance = current_balance + purchase_amount;

        // Check if credit limit is set (not NULL)
        if let Some(limit) = credit_limit {
            if new_balance > limit {
                let excess = new_balance - limit;
                warnings.push(PurchaseWarning {
                    r#type: "CREDIT_LIMIT_EXCEEDED".to_string(),
                    message: format!("تم تجاوز الحد الائتماني للمورد {} بمقدار {:.2} دينار", supplier_name, excess),
                    data: serde_json::json!({
                        "supplier_name": supplier_name,
                        "current_balance": current_balance,
                        "credit_limit": limit,
                        "purchase_amount": purchase_amount,
                        "new_balance": new_balance,
                        "excess_amount": excess
                    })
                });
                
                warn!("Credit limit exceeded for supplier {}: supplier_id={}, current_balance={}, credit_limit={}, purchase_amount={}, new_balance={}, excess={}", 
                    supplier_name, supplier_id, current_balance, limit, purchase_amount, new_balance, excess);
            }
        } else {
            // No credit limit set (unlimited credit)
            warnings.push(PurchaseWarning {
                r#type: "NO_CREDIT_LIMIT".to_string(),
                message: format!("المورد {} ليس له حد ائتماني محدد (ائتمان غير محدود)", supplier_name),
                data: serde_json::json!({
                    "supplier_name": supplier_name,
                    "current_balance": current_balance,
                    "credit_limit": null,
                    "purchase_amount": purchase_amount,
                    "new_balance": new_balance
                })
            });
        }

        let credit_status = CreditStatus {
            exceeded: warnings.iter().any(|w| w.r#type == "CREDIT_LIMIT_EXCEEDED"),
            unlimited: warnings.iter().any(|w| w.r#type == "NO_CREDIT_LIMIT"),
            new_balance,
        };

        Ok((warnings, credit_status))
    }

    // Get all purchases
    pub async fn get_all(&self, db: &Database) -> Result<Vec<PurchaseWithDetails>> {
        // First get all purchases without items, including return information
        let purchases = sqlx::query(r#"
            SELECT 
                p.*,
                s.name as supplier_name,
                s.contact_person as supplier_contact,
                s.phone as supplier_phone,
                s.email as supplier_email,
                s.address as supplier_address,
                COALESCE(SUM(pr.total_amount), 0) as total_returned_amount,
                COUNT(pr.id) as return_count,
                MAX(pr.return_date) as last_return_date
            FROM purchases p
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            LEFT JOIN purchase_returns pr ON p.id = pr.purchase_id
            GROUP BY p.id, p.supplier_id, p.invoice_no, p.invoice_date, p.due_date, p.total_amount, 
                     p.discount_amount, p.tax_amount, p.net_amount, p.paid_amount, p.remaining_amount,
                     p.payment_method, p.payment_status, p.status, p.notes, p.created_by, p.created_at, 
                     p.updated_at, p.money_box_id, s.name, s.contact_person, s.phone, s.email, s.address
            ORDER BY p.created_at DESC
        "#)
        .fetch_all(&db.pool)
        .await?;

        // Then fetch items for each purchase
        let mut result = Vec::new();
        for row in purchases {
            let purchase_id: i64 = row.get("id");
            
            // Get purchase items
            let items = sqlx::query(r#"
                SELECT pi.*, p.name as product_name, p.sku as product_sku
                FROM purchase_items pi
                LEFT JOIN products p ON pi.product_id = p.id
                WHERE pi.purchase_id = ?
            "#)
            .bind(purchase_id)
            .fetch_all(&db.pool)
            .await?;

            // Process items
            let purchase_items = items.into_iter().map(|item_row| {
                crate::models::PurchaseItemWithDetails {
                    id: item_row.get("id"),
                    purchase_id: item_row.get("purchase_id"),
                    product_id: item_row.get("product_id"),
                    stock_id: item_row.get("stock_id"),
                    quantity: item_row.get("quantity"),
                    price: item_row.get("price"),
                    discount_percent: item_row.get("discount_percent"),
                    tax_percent: item_row.get("tax_percent"),
                    total: item_row.get("total"),
                    returned_quantity: item_row.get("returned_quantity"),
                    expiry_date: item_row.get("expiry_date"),
                    batch_number: item_row.get("batch_number"),
                    notes: item_row.get("notes"),
                    created_at: item_row.get("created_at"),
                    updated_at: item_row.get("updated_at"),
                    product_name: item_row.get("product_name"),
                    product_sku: item_row.get("product_sku"),
                }
            }).collect();

            let purchase = PurchaseWithDetails {
                id: row.get("id"),
                supplier_id: row.get("supplier_id"),
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
                created_by: row.get("created_by"),
                money_box_id: row.get("money_box_id"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                supplier_name: row.get("supplier_name"),
                supplier_contact: row.get("supplier_contact"),
                supplier_phone: row.get("supplier_phone"),
                supplier_email: row.get("supplier_email"),
                supplier_address: row.get("supplier_address"),
                total_returned_amount: row.get("total_returned_amount"),
                return_count: row.get("return_count"),
                last_return_date: row.get("last_return_date"),
                items: purchase_items,
                warnings: None,
                credit_status: None,
            };

            result.push(purchase);
        }

        Ok(result)
    }

    // Get purchase by ID
    pub async fn get_by_id(&self, db: &Database, id: i64) -> Result<Option<PurchaseWithDetails>> {
        let purchase = sqlx::query(r#"
            SELECT p.*, 
                   s.name as supplier_name,
                   s.contact_person as supplier_contact,
                   s.phone as supplier_phone,
                   s.email as supplier_email,
                   s.address as supplier_address,
                   COALESCE(SUM(pr.total_amount), 0) as total_returned_amount,
                   COUNT(pr.id) as return_count,
                   MAX(pr.return_date) as last_return_date
            FROM purchases p
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            LEFT JOIN purchase_returns pr ON p.id = pr.purchase_id
            WHERE p.id = ?
            GROUP BY p.id, p.supplier_id, p.invoice_no, p.invoice_date, p.due_date, p.total_amount, 
                     p.discount_amount, p.tax_amount, p.net_amount, p.paid_amount, p.remaining_amount,
                     p.payment_method, p.payment_status, p.status, p.notes, p.created_by, p.created_at, 
                     p.updated_at, p.money_box_id, s.name, s.contact_person, s.phone, s.email, s.address
        "#)
        .bind(id)
        .fetch_optional(&db.pool)
        .await?;

        if let Some(row) = purchase {
            // Get purchase items
            let items = sqlx::query(r#"
                SELECT pi.*, p.name as product_name, p.sku as product_sku
                FROM purchase_items pi
                LEFT JOIN products p ON pi.product_id = p.id
                WHERE pi.purchase_id = ?
            "#)
            .bind(id)
            .fetch_all(&db.pool)
            .await?;

            // Process items
            let purchase_items = items.into_iter().map(|item_row| {
                crate::models::PurchaseItemWithDetails {
                    id: item_row.get("id"),
                    purchase_id: item_row.get("purchase_id"),
                    product_id: item_row.get("product_id"),
                    stock_id: item_row.get("stock_id"),
                    quantity: item_row.get("quantity"),
                    price: item_row.get("price"),
                    discount_percent: item_row.get("discount_percent"),
                    tax_percent: item_row.get("tax_percent"),
                    total: item_row.get("total"),
                    returned_quantity: item_row.get("returned_quantity"),
                    expiry_date: item_row.get("expiry_date"),
                    batch_number: item_row.get("batch_number"),
                    notes: item_row.get("notes"),
                    created_at: item_row.get("created_at"),
                    updated_at: item_row.get("updated_at"),
                    product_name: item_row.get("product_name"),
                    product_sku: item_row.get("product_sku"),
                }
            }).collect();

            Ok(Some(PurchaseWithDetails {
                id: row.get("id"),
                supplier_id: row.get("supplier_id"),
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
                created_by: row.get("created_by"),
                money_box_id: row.get("money_box_id"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                supplier_name: row.get("supplier_name"),
                supplier_contact: row.get("supplier_contact"),
                supplier_phone: row.get("supplier_phone"),
                supplier_email: row.get("supplier_email"),
                supplier_address: row.get("supplier_address"),
                total_returned_amount: row.get("total_returned_amount"),
                return_count: row.get("return_count"),
                last_return_date: row.get("last_return_date"),
                items: purchase_items,
                warnings: None,
                credit_status: None,
            }))
        } else {
        Ok(None)
        }
    }

    // Get purchases by supplier
    pub async fn get_by_supplier(&self, db: &Database, supplier_id: i64) -> Result<Vec<PurchaseWithDetails>> {
        // First get purchases without items
        let purchases = sqlx::query(r#"
            SELECT p.*, 
              s.name as supplier_name,
              s.contact_person as supplier_contact,
              s.phone as supplier_phone,
              s.email as supplier_email,
              s.address as supplier_address
            FROM purchases p
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.supplier_id = ?
            ORDER BY p.created_at DESC
        "#)
        .bind(supplier_id)
        .fetch_all(&db.pool)
        .await?;

        // Then fetch items for each purchase
        let mut result = Vec::new();
        for row in purchases {
            let purchase_id: i64 = row.get("id");
            
            // Get purchase items
            let items = sqlx::query(r#"
                SELECT pi.*, p.name as product_name, p.sku as product_sku
                FROM purchase_items pi
                LEFT JOIN products p ON pi.product_id = p.id
                WHERE pi.purchase_id = ?
            "#)
            .bind(purchase_id)
            .fetch_all(&db.pool)
            .await?;

            // Process items
            let purchase_items = items.into_iter().map(|item_row| {
                crate::models::PurchaseItemWithDetails {
                    id: item_row.get("id"),
                    purchase_id: item_row.get("purchase_id"),
                    product_id: item_row.get("product_id"),
                    stock_id: item_row.get("stock_id"),
                    quantity: item_row.get("quantity"),
                    price: item_row.get("price"),
                    discount_percent: item_row.get("discount_percent"),
                    tax_percent: item_row.get("tax_percent"),
                    total: item_row.get("total"),
                    returned_quantity: item_row.get("returned_quantity"),
                    expiry_date: item_row.get("expiry_date"),
                    batch_number: item_row.get("batch_number"),
                    notes: item_row.get("notes"),
                    created_at: item_row.get("created_at"),
                    updated_at: item_row.get("updated_at"),
                    product_name: item_row.get("product_name"),
                    product_sku: item_row.get("product_sku"),
                }
            }).collect();

            let purchase = PurchaseWithDetails {
                id: row.get("id"),
                supplier_id: row.get("supplier_id"),
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
                created_by: row.get("created_by"),
                money_box_id: row.get("money_box_id"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                supplier_name: row.get("supplier_name"),
                supplier_contact: row.get("supplier_contact"),
                supplier_phone: row.get("supplier_phone"),
                supplier_email: row.get("supplier_email"),
                supplier_address: row.get("supplier_address"),
                total_returned_amount: 0.0, // Will be calculated separately if needed
                return_count: 0,
                last_return_date: None,
                items: purchase_items,
                warnings: None,
                credit_status: None,
            };

            result.push(purchase);
        }

        Ok(result)
    }

    // Create new purchase
    pub async fn create(&self, db: &Database, purchase: CreatePurchaseRequest, user_id: Option<i64>) -> Result<PurchaseWithDetails> {
        // Validate required fields
        if purchase.items.is_empty() {
            return Err(anyhow::anyhow!("At least one item is required"));
        }

        // Validate each item
        for item in &purchase.items {
            if item.quantity <= 0 {
                return Err(anyhow::anyhow!("Valid quantity is required for each item"));
            }
            if item.price < 0.0 {
                return Err(anyhow::anyhow!("Valid price is required for each item"));
            }
        }

        // Check for duplicate purchases (same supplier + invoice_no)
        if let Some(invoice_no) = &purchase.invoice_no {
            if !invoice_no.trim().is_empty() {
                let existing_purchase = sqlx::query(r#"
                    SELECT id, invoice_no FROM purchases WHERE supplier_id = ? AND invoice_no = ?
                "#)
                .bind(purchase.supplier_id)
                .bind(invoice_no.trim())
                .fetch_optional(&db.pool)
                .await?;
                
                if existing_purchase.is_some() {
                    return Err(anyhow::anyhow!("Purchase with invoice number {} already exists for this supplier", invoice_no));
                }
            }
        }

        // Calculate totals
        let mut total_amount = 0.0;
        let mut discount_amount = 0.0;
        let mut tax_amount = 0.0;

        for item in &purchase.items {
            let subtotal = item.quantity as f64 * item.price;
            let discount = subtotal * ((item.discount_percent.unwrap_or(0.0)) / 100.0);
            let after_discount = subtotal - discount;
            let tax = after_discount * ((item.tax_percent.unwrap_or(0.0)) / 100.0);
            
            total_amount += subtotal;
            discount_amount += discount;
            tax_amount += tax;
        }

        let net_amount = total_amount - discount_amount + tax_amount;

        // Check credit limit
        let (warnings, credit_status) = self.check_supplier_credit_limit(db, purchase.supplier_id, net_amount).await?;

        // Generate invoice number if not provided
        let timestamp = chrono::Utc::now().timestamp();
        let random_suffix = rand::random::<u32>() % 10000;
        let invoice_no = purchase.invoice_no.as_deref()
            .filter(|s| !s.trim().is_empty())
            .unwrap_or(&format!("PUR-{}-{}", timestamp, random_suffix))
            .to_string();

        // Use database transaction to ensure consistency
        let result = sqlx::query(r#"
            INSERT INTO purchases (
                supplier_id, invoice_no, invoice_date, due_date,
                total_amount, discount_amount, tax_amount, net_amount,
                paid_amount, payment_method, payment_status, status,
                notes, created_by, money_box_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#)
        .bind(purchase.supplier_id)
        .bind(&invoice_no)
        .bind(purchase.invoice_date)
        .bind(purchase.due_date)
        .bind(total_amount)
        .bind(discount_amount)
        .bind(tax_amount)
        .bind(net_amount)
        .bind(purchase.payment_status.as_deref().unwrap_or("unpaid"))
        .bind(purchase.payment_method.as_deref().unwrap_or("cash"))
        .bind(purchase.payment_status.as_deref().unwrap_or("unpaid"))
        .bind(purchase.status.as_deref().unwrap_or("completed"))
        .bind(&purchase.notes)
        .bind(user_id)
        .bind(purchase.money_box_id)
        .execute(&db.pool)
        .await?;

        let purchase_id = result.last_insert_rowid();

        // Insert purchase items
        for item in &purchase.items {
            let item_total = item.quantity as f64 * item.price;
            let item_discount = item_total * ((item.discount_percent.unwrap_or(0.0)) / 100.0);
            let item_tax = (item_total - item_discount) * ((item.tax_percent.unwrap_or(0.0)) / 100.0);
            let item_net_total = item_total - item_discount + item_tax;

            sqlx::query(r#"
                INSERT INTO purchase_items (
                    purchase_id, product_id, stock_id, quantity, price,
                    discount_percent, tax_percent, total, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            "#)
            .bind(purchase_id)
            .bind(item.product_id)
            .bind(item.stock_id)
            .bind(item.quantity)
            .bind(item.price)
            .bind(item.discount_percent.unwrap_or(0.0))
            .bind(item.tax_percent.unwrap_or(0.0))
            .bind(item_net_total)
            .execute(&db.pool)
            .await?;
        }

        // Get the created purchase
        let mut created_purchase = self.get_by_id(db, purchase_id).await?.unwrap();
        
        // Include warnings in the response
        if !warnings.is_empty() {
            created_purchase.warnings = Some(warnings);
            created_purchase.credit_status = Some(credit_status);
        }

        info!("Purchase {} created successfully with {} items, invoice: {}", purchase_id, purchase.items.len(), invoice_no);
        Ok(created_purchase)
    }

    // Update purchase
    pub async fn update(&self, db: &Database, id: i64, purchase: UpdatePurchaseRequest, user_id: Option<i64>) -> Result<Option<PurchaseWithDetails>> {
        // Validate that purchase exists
        let existing_purchase = self.get_by_id(db, id).await?;
        if existing_purchase.is_none() {
            return Err(anyhow::anyhow!("Purchase not found"));
        }

        let existing = existing_purchase.unwrap();

        // Check if purchase can be updated (not returned or cancelled)
        if existing.status == "returned" || existing.status == "cancelled" {
            return Err(anyhow::anyhow!("Cannot update purchase with status: {}", existing.status));
        }

        // Check for duplicate invoice number if invoice_no is being changed
        if let Some(invoice_no) = &purchase.invoice_no {
            if !invoice_no.trim().is_empty() && invoice_no.trim() != existing.invoice_no {
                let duplicate_check = sqlx::query(r#"
                    SELECT id, invoice_no FROM purchases WHERE supplier_id = ? AND invoice_no = ? AND id != ?
                "#)
                .bind(purchase.supplier_id.unwrap_or(existing.supplier_id))
                .bind(invoice_no.trim())
                .bind(id)
                .fetch_optional(&db.pool)
                .await?;
                
                if duplicate_check.is_some() {
                    return Err(anyhow::anyhow!("Purchase with invoice number {} already exists for this supplier", invoice_no));
                }
            }
        }

        // Calculate new totals
        let mut total_amount = 0.0;
        let mut discount_amount = 0.0;
        let mut tax_amount = 0.0;

        for item in &purchase.items {
            if item.quantity <= 0 {
                return Err(anyhow::anyhow!("Invalid quantity for product {}", item.product_id));
            }
            if item.price < 0.0 {
                return Err(anyhow::anyhow!("Invalid price for product {}", item.product_id));
            }

            let item_total = item.quantity as f64 * item.price;
            let item_discount = item_total * ((item.discount_percent.unwrap_or(0.0)) / 100.0);
            let item_tax = (item_total - item_discount) * ((item.tax_percent.unwrap_or(0.0)) / 100.0);

            total_amount += item_total;
            discount_amount += item_discount;
            tax_amount += item_tax;
        }

        let net_amount = total_amount - discount_amount + tax_amount;

        // Generate invoice number if not provided or empty
        let final_invoice_no = purchase.invoice_no.as_deref()
            .filter(|s| !s.trim().is_empty())
            .unwrap_or(&existing.invoice_no)
            .to_string();

        // Update purchase
        let changes = sqlx::query(r#"
            UPDATE purchases 
            SET supplier_id = ?,
                invoice_no = ?,
                total_amount = ?,
                discount_amount = ?,
                tax_amount = ?,
                net_amount = ?,
                payment_method = ?,
                payment_status = ?,
                invoice_date = ?,
                due_date = ?,
                notes = ?,
                status = ?,
                money_box_id = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        "#)
        .bind(purchase.supplier_id.unwrap_or(existing.supplier_id))
        .bind(&final_invoice_no)
        .bind(total_amount)
        .bind(discount_amount)
        .bind(tax_amount)
        .bind(net_amount)
        .bind(purchase.payment_method.as_deref().unwrap_or(&existing.payment_method))
        .bind(purchase.payment_status.as_deref().unwrap_or(&existing.payment_status))
        .bind(purchase.invoice_date.unwrap_or(existing.invoice_date))
        .bind(purchase.due_date.or(existing.due_date))
        .bind(purchase.notes.as_deref().unwrap_or(existing.notes.as_deref().unwrap_or("")))
        .bind(purchase.status.as_deref().unwrap_or(&existing.status))
        .bind(purchase.money_box_id.or(existing.money_box_id))
        .bind(id)
        .execute(&db.pool)
        .await?;

        if changes.rows_affected() == 0 {
            return Err(anyhow::anyhow!("Purchase not found or no changes made"));
        }

        // Delete existing purchase items
        sqlx::query("DELETE FROM purchase_items WHERE purchase_id = ?")
            .bind(id)
            .execute(&db.pool)
            .await?;

        // Insert new purchase items
        for item in &purchase.items {
            let item_total = item.quantity as f64 * item.price;
            let item_discount = item_total * ((item.discount_percent.unwrap_or(0.0)) / 100.0);
            let item_tax = (item_total - item_discount) * ((item.tax_percent.unwrap_or(0.0)) / 100.0);
            let item_net_total = item_total - item_discount + item_tax;

            sqlx::query(r#"
                INSERT INTO purchase_items (
                    purchase_id, product_id, stock_id, quantity, price,
                    discount_percent, tax_percent, total
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#)
            .bind(id)
            .bind(item.product_id)
            .bind(item.stock_id)
            .bind(item.quantity)
            .bind(item.price)
            .bind(item.discount_percent.unwrap_or(0.0))
            .bind(item.tax_percent.unwrap_or(0.0))
            .bind(item_net_total)
            .execute(&db.pool)
            .await?;
        }

        info!("Purchase {} updated successfully with {} items", id, purchase.items.len());
        self.get_by_id(db, id).await
    }

    // Delete purchase
    pub async fn delete(&self, db: &Database, id: i64, user_id: Option<i64>, force: bool) -> Result<bool> {
        // Get existing purchase data for audit log
        let existing_purchase = self.get_by_id(db, id).await?;
        if existing_purchase.is_none() {
            return Err(anyhow::anyhow!("Purchase not found"));
        }

        let existing = existing_purchase.unwrap();

        // Check if purchase can be deleted (not returned or partially returned)
        if !force && (existing.status == "returned" || existing.status == "partially_returned") {
            return Err(anyhow::anyhow!("Cannot delete purchase with status: {}. Please process returns first or use force deletion.", existing.status));
        }

        // Check if purchase has any returns
        let returns_count: i64 = sqlx::query(r#"
            SELECT COUNT(*) as count FROM purchase_returns WHERE purchase_id = ?
        "#)
        .bind(id)
        .fetch_one(&db.pool)
        .await?
        .get("count");

        if !force && returns_count > 0 {
            return Err(anyhow::anyhow!("Cannot delete purchase with {} return(s). Please process all returns first or use force deletion.", returns_count));
        }

        // Check if purchase has any payments
        if !force && existing.paid_amount > 0.0 {
            return Err(anyhow::anyhow!("Cannot delete purchase with paid amount of {}. Please process refunds first or use force deletion.", existing.paid_amount));
        }

        // Delete purchase items first (foreign key constraint)
        sqlx::query("DELETE FROM purchase_items WHERE purchase_id = ?")
            .bind(id)
            .execute(&db.pool)
            .await?;

        // Delete purchase
        let changes = sqlx::query("DELETE FROM purchases WHERE id = ?")
            .bind(id)
            .execute(&db.pool)
            .await?;

        if changes.rows_affected() == 0 {
            return Err(anyhow::anyhow!("Purchase not found"));
        }

        info!("Purchase {} deleted successfully", id);
        Ok(true)
    }

    // Process purchase return
    pub async fn process_purchase_return(&self, db: &Database, purchase_id: i64, return_items: Vec<crate::models::PurchaseReturnItemRequest>, reason: String, user_id: Option<i64>) -> Result<PurchaseReturnResponse> {
        let purchase = self.get_by_id(db, purchase_id).await?;
        if purchase.is_none() {
            return Err(anyhow::anyhow!("Purchase not found"));
        }

        let purchase = purchase.unwrap();
        if purchase.status != "completed" {
            return Err(anyhow::anyhow!("Only completed purchases can be returned"));
        }

        // Validate return items
        let purchase_items = self.get_purchase_items(db, purchase_id).await?;
        let item_map: HashMap<i64, &crate::models::PurchaseItemWithDetails> = purchase_items.iter().map(|item| (item.id, item)).collect();

        // Calculate total return amount
        let mut total_return_amount = 0.0;
        for return_item in &return_items {
            let original_item = item_map.get(&return_item.purchase_item_id)
                .ok_or_else(|| anyhow::anyhow!("Invalid purchase item id: {}", return_item.purchase_item_id))?;
            
            let current_returned_quantity = original_item.returned_quantity;
            let remaining_quantity = original_item.quantity - current_returned_quantity;
            
            if return_item.quantity > remaining_quantity {
                return Err(anyhow::anyhow!("Return quantity exceeds remaining quantity for item {}", return_item.purchase_item_id));
            }
            
            total_return_amount += return_item.quantity as f64 * original_item.price;
        }

        // Create return record
        let return_id = sqlx::query(r#"
            INSERT INTO purchase_returns (
                purchase_id, return_date, reason, status, refund_method, total_amount, created_by
            ) VALUES (?, CURRENT_TIMESTAMP, ?, 'completed', ?, ?, ?)
        "#)
        .bind(purchase_id)
        .bind(&reason)
        .bind("cash") // Default refund method
        .bind(total_return_amount)
        .bind(user_id)
        .execute(&db.pool)
        .await?
        .last_insert_rowid();

        // Process each return item
        for item in &return_items {
            let original_item = item_map.get(&item.purchase_item_id).unwrap();
            
            // Insert return item record
            sqlx::query(r#"
                INSERT INTO purchase_return_items (
                    return_id, purchase_item_id, quantity, price, total
                ) VALUES (?, ?, ?, ?, ?)
            "#)
            .bind(return_id)
            .bind(item.purchase_item_id)
            .bind(item.quantity)
            .bind(original_item.price)
            .bind(item.quantity as f64 * original_item.price)
            .execute(&db.pool)
            .await?;

            // Update purchase item with returned quantity
            let new_returned_quantity = original_item.returned_quantity + item.quantity;
            sqlx::query(r#"
                UPDATE purchase_items 
                SET returned_quantity = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            "#)
            .bind(new_returned_quantity)
            .bind(item.purchase_item_id)
            .execute(&db.pool)
            .await?;
        }

        // Get updated purchase items to check if all items are returned
        let updated_purchase_items = self.get_purchase_items(db, purchase_id).await?;
        let all_items_returned = updated_purchase_items.iter().all(|item| 
            item.returned_quantity >= item.quantity
        );

        // Calculate total returned amount including this return
        let total_returned_amount = updated_purchase_items.iter().map(|item| {
            item.returned_quantity as f64 * item.price
        }).sum::<f64>();

        // Check if total returned amount equals or exceeds the purchase net amount
        let is_fully_returned_monetarily = total_returned_amount >= purchase.net_amount;

        // Determine new status based on both item quantity and monetary amount
        let new_status = if all_items_returned && is_fully_returned_monetarily {
            "returned"
        } else if is_fully_returned_monetarily {
            "returned" // Even if not all items returned, if monetary amount is fully returned
        } else if all_items_returned {
            "returned" // All items returned
        } else {
            "partially_returned"
        };
        
        // Update purchase status
        sqlx::query(r#"
            UPDATE purchases 
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        "#)
        .bind(new_status)
        .bind(purchase_id)
        .execute(&db.pool)
        .await?;

        info!("Purchase return {} created successfully for purchase {}", return_id, purchase_id);
        
        Ok(PurchaseReturnResponse {
            return_id,
            total_amount: total_return_amount,
            new_purchase_status: new_status.to_string(),
        })
    }

    // Get purchase items
    pub async fn get_purchase_items(&self, db: &Database, purchase_id: i64) -> Result<Vec<crate::models::PurchaseItemWithDetails>> {
        let items = sqlx::query(r#"
            SELECT pi.*, p.name as product_name, p.sku as product_sku
            FROM purchase_items pi
            LEFT JOIN products p ON pi.product_id = p.id
            WHERE pi.purchase_id = ?
        "#)
        .bind(purchase_id)
        .fetch_all(&db.pool)
        .await?;

        Ok(items.into_iter().map(|row| crate::models::PurchaseItemWithDetails {
            id: row.get("id"),
            purchase_id: row.get("purchase_id"),
            product_id: row.get("product_id"),
            stock_id: row.get("stock_id"),
            quantity: row.get("quantity"),
            price: row.get("price"),
            discount_percent: row.get("discount_percent"),
            tax_percent: row.get("tax_percent"),
            total: row.get("total"),
            returned_quantity: row.get("returned_quantity"),
            expiry_date: row.get("expiry_date"),
            batch_number: row.get("batch_number"),
            notes: row.get("notes"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            product_name: row.get("product_name"),
            product_sku: row.get("product_sku"),
        }).collect())
    }

    // Get purchase returns
    pub async fn get_purchase_returns(&self, db: &Database, purchase_id: i64) -> Result<Vec<PurchaseReturn>> {
        let returns = sqlx::query(r#"
            SELECT pr.*, u.name as created_by_name
            FROM purchase_returns pr
            LEFT JOIN users u ON pr.created_by = u.id
            WHERE pr.purchase_id = ?
            ORDER BY pr.return_date DESC
        "#)
        .bind(purchase_id)
        .fetch_all(&db.pool)
        .await?;

        let mut result = Vec::new();
        for row in returns {
            let return_id: i64 = row.get("id");
            
            // Get return items for each return
            let return_items = sqlx::query(r#"
                SELECT pri.*, pi.product_id, p.name as product_name, p.sku as product_sku
                FROM purchase_return_items pri
                LEFT JOIN purchase_items pi ON pri.purchase_item_id = pi.id
                LEFT JOIN products p ON pi.product_id = p.id
                WHERE pri.return_id = ?
            "#)
            .bind(return_id)
            .fetch_all(&db.pool)
            .await?;

            let items = return_items.into_iter().map(|item_row| PurchaseReturnItem {
                id: item_row.get("id"),
                return_id: item_row.get("return_id"),
                purchase_item_id: item_row.get("purchase_item_id"),
                quantity: item_row.get("quantity"),
                price: item_row.get("price"),
                total: item_row.get("total"),
                product_id: item_row.get("product_id"),
                product_name: item_row.get("product_name"),
                product_sku: item_row.get("product_sku"),
                created_at: item_row.get("created_at"),
            }).collect();

            result.push(PurchaseReturn {
                id: row.get("id"),
                purchase_id: row.get("purchase_id"),
                supplier_id: row.get("supplier_id"),
                return_date: row.get("return_date"),
                reason: row.get("reason"),
                status: row.get("status"),
                refund_method: row.get("refund_method"),
                total_amount: row.get("total_amount"),
                refund_amount: row.get("refund_amount"),
                notes: row.get("notes"),
                created_by: row.get("created_by"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                created_by_name: row.get("created_by_name"),
                items: Some(items),
            });
        }

        Ok(result)
    }

    // Get detailed purchase with returns information
    pub async fn get_purchase_with_returns(&self, db: &Database, purchase_id: i64) -> Result<Option<PurchaseWithReturns>> {
        let purchase = self.get_by_id(db, purchase_id).await?;
        if purchase.is_none() {
            return Ok(None);
        }

        let purchase = purchase.unwrap();

        // Get detailed returns information
        let returns = self.get_purchase_returns(db, purchase_id).await?;
        
        // Calculate return statistics
        let return_stats = crate::models::ReturnStats {
            total_returns: returns.len() as i64,
            total_returned_amount: returns.iter().map(|ret| ret.total_amount).sum(),
            total_returned_items: returns.iter().map(|ret| ret.items.as_ref().map_or(0, |items| items.len()) as i64).sum(),
            last_return_date: returns.first().and_then(|ret| {
                chrono::NaiveDate::parse_from_str(&ret.return_date, "%Y-%m-%d")
                    .ok()
            }),
            returns,
        };

        Ok(Some(PurchaseWithReturns {
            id: purchase.id,
            supplier_id: purchase.supplier_id,
            invoice_no: purchase.invoice_no,
            invoice_date: purchase.invoice_date,
            due_date: purchase.due_date,
            total_amount: purchase.total_amount,
            discount_amount: purchase.discount_amount,
            tax_amount: purchase.tax_amount,
            net_amount: purchase.net_amount,
            paid_amount: purchase.paid_amount,
            remaining_amount: purchase.remaining_amount,
            payment_method: purchase.payment_method,
            payment_status: purchase.payment_status,
            status: purchase.status,
            notes: purchase.notes,
            created_by: purchase.created_by,
            money_box_id: purchase.money_box_id,
            created_at: purchase.created_at,
            updated_at: purchase.updated_at,
            supplier_name: purchase.supplier_name,
            supplier_contact: purchase.supplier_contact,
            supplier_phone: purchase.supplier_phone,
            supplier_email: purchase.supplier_email,
            supplier_address: purchase.supplier_address,
            total_returned_amount: purchase.total_returned_amount,
            return_count: purchase.return_count,
            last_return_date: purchase.last_return_date,
            items: purchase.items,
            return_stats,
        }))
    }
}
