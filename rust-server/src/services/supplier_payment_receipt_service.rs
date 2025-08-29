use anyhow::Result;
use crate::database::Database;
use crate::models::supplier_payment_receipt::*;
use sqlx::{Row, SqlitePool};
use tracing::{info, warn, error};
use chrono::{Utc, DateTime, NaiveDate, NaiveDateTime};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Clone)]
pub struct SupplierPaymentReceiptService;

impl SupplierPaymentReceiptService {
    pub fn new() -> Self {
        Self
    }

    // Get all supplier payment receipts with pagination and filters
    pub async fn get_all(&self, db: &Database, query: &SupplierPaymentReceiptQuery) -> Result<SupplierPaymentReceiptListResponse> {
        let page = query.page.unwrap_or(1);
        let limit = query.limit.unwrap_or(50);
        let offset = (page - 1) * limit;

        let mut conditions = Vec::new();
        let mut params: Vec<String> = Vec::new();

        // Add filters
        if let Some(supplier_id) = query.supplier_id {
            conditions.push("spr.supplier_id = ?");
            params.push(supplier_id.to_string());
        }

        if let Some(purchase_id) = query.purchase_id {
            conditions.push("spr.purchase_id = ?");
            params.push(purchase_id.to_string());
        }

        if let Some(ref payment_method) = query.payment_method {
            conditions.push("spr.payment_method = ?");
            params.push(payment_method.clone());
        }

        if let Some(ref date_from) = query.date_from {
            conditions.push("spr.receipt_date >= ?");
            params.push(date_from.clone());
        }

        if let Some(ref date_to) = query.date_to {
            conditions.push("spr.receipt_date <= ?");
            params.push(date_to.clone());
        }

        if let Some(ref reference_number) = query.reference_number {
            conditions.push("spr.reference_number LIKE ?");
            params.push(format!("%{}%", reference_number));
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        // Get total count for pagination
        let count_query = format!(
            "SELECT COUNT(*) as total FROM supplier_payment_receipts spr {}",
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

        // Get receipts with supplier details
        let receipts_query = format!(
            r#"
            SELECT 
                spr.id,
                spr.receipt_number as receipt_number,
                spr.supplier_id,
                spr.receipt_date,
                CAST(spr.amount AS REAL) as amount,
                spr.payment_method,
                spr.reference_number as reference_number,
                spr.notes,
                spr.money_box_id,
                spr.created_at,
                spr.updated_at,
                s.name as supplier_name,
                s.phone as supplier_phone,
                s.email as supplier_email,
                s.address as supplier_address,
                NULL as purchase_id,
                NULL as purchase_invoice_no,
                NULL as purchase_total_amount,
                NULL as purchase_paid_amount,
                NULL as purchase_remaining_amount,
                NULL as created_by_name
            FROM supplier_payment_receipts spr
            LEFT JOIN suppliers s ON spr.supplier_id = s.id
            {}
            ORDER BY spr.created_at DESC
            LIMIT ? OFFSET ?
            "#,
            where_clause
        );

        let mut query_builder = sqlx::query(&receipts_query);
        for param in &params {
            query_builder = query_builder.bind(param.as_str());
        }
        query_builder = query_builder.bind(limit).bind(offset);

        let receipts_rows = query_builder.fetch_all(&db.pool).await?;

        let mut receipts = Vec::new();
        for row in receipts_rows {
            let receipt = self.map_receipt_row(row).await?;
            receipts.push(receipt);
        }

        Ok(SupplierPaymentReceiptListResponse {
            items: receipts,
            total,
            page,
            limit,
            total_pages: (total + limit - 1) / limit,
        })
    }

    // Get receipt by ID
    pub async fn get_by_id(&self, db: &Database, id: i64) -> Result<Option<SupplierPaymentReceipt>> {
        let receipt_row = sqlx::query(r#"
            SELECT 
                spr.id,
                spr.receipt_number as receipt_number,
                spr.supplier_id,
                spr.receipt_date,
                CAST(spr.amount AS REAL) as amount,
                spr.payment_method,
                spr.reference_number as reference_number,
                spr.notes,
                spr.money_box_id,
                spr.created_at,
                spr.updated_at,
                s.name as supplier_name,
                s.phone as supplier_phone,
                s.email as supplier_email,
                s.address as supplier_address,
                NULL as purchase_id,
                NULL as purchase_invoice_no,
                NULL as purchase_total_amount,
                NULL as purchase_paid_amount,
                NULL as purchase_remaining_amount,
                NULL as created_by_name
            FROM supplier_payment_receipts spr
            LEFT JOIN suppliers s ON spr.supplier_id = s.id
            WHERE spr.id = ?
        "#)
        .bind(id)
        .fetch_optional(&db.pool)
        .await?;

        if let Some(row) = receipt_row {
            Ok(Some(self.map_receipt_row(row).await?))
        } else {
            Ok(None)
        }
    }

    // Create new receipt
    pub async fn create(&self, db: &Database, receipt_data: CreateSupplierPaymentReceiptRequest) -> Result<SupplierPaymentReceipt> {
        info!("Creating new supplier payment receipt: supplier_id={}, amount={}", receipt_data.supplier_id, receipt_data.amount);

        // Validate required fields
        if receipt_data.amount <= 0.0 {
            return Err(anyhow::anyhow!("مبلغ الإيصال يجب أن يكون أكبر من صفر"));
        }

        if receipt_data.payment_method.trim().is_empty() {
            return Err(anyhow::anyhow!("طريقة الدفع مطلوبة"));
        }

        // Generate receipt number if not provided
        let receipt_number = if let Some(ref number) = receipt_data.receipt_number {
            number.clone()
        } else {
            self.generate_receipt_number(&db.pool).await?
        };

        let receipt_id = sqlx::query(r#"
            INSERT INTO supplier_payment_receipts (
                receipt_number, supplier_id, receipt_date, amount,
                payment_method, reference_number, notes, money_box_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        "#)
        .bind(&receipt_number)
        .bind(receipt_data.supplier_id)
        .bind(&receipt_data.receipt_date)
        .bind(receipt_data.amount)
        .bind(&receipt_data.payment_method)
        .bind(receipt_data.reference_number)
        .bind(receipt_data.notes)
        .bind(receipt_data.money_box_id)
        .execute(&db.pool)
        .await?
        .last_insert_rowid();

        // Get the created receipt
        let receipt = self.get_by_id(db, receipt_id).await?;
        receipt.ok_or_else(|| anyhow::anyhow!("Failed to retrieve created receipt"))
    }

    // Update receipt
    pub async fn update(&self, db: &Database, id: i64, receipt_data: UpdateSupplierPaymentReceiptRequest) -> Result<SupplierPaymentReceipt> {
        info!("Updating supplier payment receipt: id={}", id);

        // Check if receipt exists
        let existing_receipt = self.get_by_id(db, id).await?;
        if existing_receipt.is_none() {
            return Err(anyhow::anyhow!("إيصال الدفع غير موجود"));
        }

        // For now, implement a simple update with all fields
        // In a production environment, you'd want to build the query dynamically
        let changes = sqlx::query(r#"
            UPDATE supplier_payment_receipts 
            SET 
                supplier_id = COALESCE(?, supplier_id),
                receipt_date = COALESCE(?, receipt_date),
                amount = COALESCE(?, amount),
                payment_method = COALESCE(?, payment_method),
                reference_number = ?,
                notes = ?,
                money_box_id = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        "#)
        .bind(receipt_data.supplier_id)
        .bind(receipt_data.receipt_date)
        .bind(receipt_data.amount)
        .bind(receipt_data.payment_method)
        .bind(receipt_data.reference_number)
        .bind(receipt_data.notes)
        .bind(receipt_data.money_box_id)
        .bind(id)
        .execute(&db.pool)
        .await?
        .rows_affected();

        if changes == 0 {
            return Err(anyhow::anyhow!("فشل في تحديث إيصال الدفع"));
        }

        // Get the updated receipt
        let receipt = self.get_by_id(db, id).await?;
        receipt.ok_or_else(|| anyhow::anyhow!("Failed to retrieve updated receipt"))
    }

    // Delete receipt
    pub async fn delete(&self, db: &Database, id: i64) -> Result<bool> {
        // Check if receipt exists
        let existing_receipt = self.get_by_id(db, id).await?;
        if existing_receipt.is_none() {
            return Ok(false);
        }

        let changes = sqlx::query("DELETE FROM supplier_payment_receipts WHERE id = ?")
            .bind(id)
            .execute(&db.pool)
            .await?
            .rows_affected();

        Ok(changes > 0)
    }

    // Get supplier summary
    pub async fn get_supplier_summary(&self, db: &Database, supplier_id: i64) -> Result<SupplierPaymentReceiptSummary> {
        let summary_row = sqlx::query(r#"
            SELECT 
                COUNT(*) as total_receipts,
                COALESCE(CAST(SUM(amount) AS REAL), 0.0) as total_amount,
                MIN(receipt_date) as first_receipt_date,
                MAX(receipt_date) as last_receipt_date
            FROM supplier_payment_receipts
            WHERE supplier_id = ?
        "#)
        .bind(supplier_id)
        .fetch_one(&db.pool)
        .await?;

        Ok(SupplierPaymentReceiptSummary {
            total_receipts: summary_row.get("total_receipts"),
            total_amount: summary_row.get::<f64, _>("total_amount"),
            first_receipt_date: summary_row.get::<Option<String>, _>("first_receipt_date"),
            last_receipt_date: summary_row.get::<Option<String>, _>("last_receipt_date"),
        })
    }

    // Get supplier purchases
    pub async fn get_supplier_purchases(&self, db: &Database, supplier_id: i64) -> Result<Vec<SupplierPurchase>> {
        let purchases_rows = sqlx::query(r#"
            SELECT 
                p.id,
                p.invoice_no as invoice_number,
                CAST(p.net_amount AS REAL) as total_amount,
                CAST(COALESCE(p.paid_amount, 0) AS REAL) as paid_amount,
                CAST(COALESCE(p.remaining_amount, 0) AS REAL) as remaining_amount,
                p.invoice_date as purchase_date,
                p.supplier_id,
                s.name as supplier_name
            FROM purchases p
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.supplier_id = ?
            ORDER BY p.invoice_date DESC
        "#)
        .bind(supplier_id)
        .fetch_all(&db.pool)
        .await?;

        let mut purchases = Vec::new();
        for row in purchases_rows {
            let purchase = SupplierPurchase {
                id: row.get("id"),
                invoice_number: row.get("invoice_number"),
                total_amount: row.get::<f64, _>("total_amount"),
                paid_amount: row.get::<f64, _>("paid_amount"),
                remaining_amount: row.get::<f64, _>("remaining_amount"),
                purchase_date: row.get("purchase_date"),
                supplier_id: row.get("supplier_id"),
                supplier_name: row.get("supplier_name"),
            };
            purchases.push(purchase);
        }

        Ok(purchases)
    }

    // Get statistics
    pub async fn get_statistics(&self, db: &Database, query: &SupplierPaymentReceiptQuery) -> Result<SupplierPaymentReceiptStatistics> {
        let mut conditions = Vec::new();
        let mut params: Vec<String> = Vec::new();

        // Add filters
        if let Some(supplier_id) = query.supplier_id {
            conditions.push("supplier_id = ?");
            params.push(supplier_id.to_string());
        }

        if let Some(ref payment_method) = query.payment_method {
            conditions.push("payment_method = ?");
            params.push(payment_method.clone());
        }

        if let Some(ref date_from) = query.date_from {
            conditions.push("receipt_date >= ?");
            params.push(date_from.clone());
        }

        if let Some(ref date_to) = query.date_to {
            conditions.push("receipt_date <= ?");
            params.push(date_to.clone());
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        let stats_query = format!(
            r#"
            SELECT 
                COUNT(*) as total_receipts,
                COALESCE(CAST(SUM(amount) AS REAL), 0.0) as total_amount,
                COALESCE(CAST(AVG(amount) AS REAL), 0.0) as average_amount,
                COALESCE(CAST(MIN(amount) AS REAL), 0.0) as min_amount,
                COALESCE(CAST(MAX(amount) AS REAL), 0.0) as max_amount
            FROM supplier_payment_receipts
            {}
            "#,
            where_clause
        );

        let mut query_builder = sqlx::query(&stats_query);
        for param in &params {
            query_builder = query_builder.bind(param.as_str());
        }

        let stats_row = query_builder.fetch_one(&db.pool).await?;

        Ok(SupplierPaymentReceiptStatistics {
            total_receipts: stats_row.get("total_receipts"),
            total_amount: stats_row.get::<f64, _>("total_amount"),
            average_amount: stats_row.get::<f64, _>("average_amount"),
            min_amount: stats_row.get::<f64, _>("min_amount"),
            max_amount: stats_row.get::<f64, _>("max_amount"),
        })
    }

    // Helper method to generate receipt number
    async fn generate_receipt_number(&self, pool: &SqlitePool) -> Result<String> {
        let count: i64 = sqlx::query("SELECT COUNT(*) FROM supplier_payment_receipts")
            .fetch_one(pool)
            .await?
            .get(0);

        let receipt_number = format!("SPR{:06}", count + 1);
        Ok(receipt_number)
    }

    // Helper method to map database row to SupplierPaymentReceipt
    async fn map_receipt_row(&self, row: sqlx::sqlite::SqliteRow) -> Result<SupplierPaymentReceipt> {
        Ok(SupplierPaymentReceipt {
            id: row.get("id"),
            receipt_number: row.get("receipt_number"),
            supplier_id: row.get("supplier_id"),
            supplier_name: row.get("supplier_name"),
            supplier_phone: row.get("supplier_phone"),
            supplier_email: row.get("supplier_email"),
            supplier_address: row.get("supplier_address"),
            purchase_id: row.get("purchase_id"),
            purchase_invoice_no: row.get("purchase_invoice_no"),
            purchase_total_amount: row.get("purchase_total_amount"),
            purchase_paid_amount: row.get("purchase_paid_amount"),
            purchase_remaining_amount: row.get("purchase_remaining_amount"),
            receipt_date: row.get("receipt_date"),
            amount: row.get::<f64, _>("amount"),
            payment_method: row.get("payment_method"),
            reference_number: row.get("reference_number"),
            notes: row.get("notes"),
            money_box_id: row.get("money_box_id"),
            created_by_name: row.get("created_by_name"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
    }
}
