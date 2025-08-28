use anyhow::Result;
use crate::database::Database;
use crate::models::{
    Installment, CreateInstallmentRequest, UpdateInstallmentRequest, InstallmentQuery, InstallmentFilters,
    InstallmentListResponse, ApiResponse, PaginatedResponse
};
use sqlx::Row;
use chrono::{Utc, DateTime};
use crate::models::PaginationInfo;
use serde_json::Value;

#[derive(Clone)]
pub struct InstallmentsService;

impl InstallmentsService {
    pub fn new() -> Self {
        Self
    }

    // Get all installments with pagination and filters
    pub async fn get_all(&self, db: &Database, query: &InstallmentQuery) -> Result<InstallmentListResponse> {
        let page = query.page.unwrap_or(1);
        let limit = query.limit.unwrap_or(50);
        let offset = (page - 1) * limit;

        let mut where_conditions = vec!["1=1".to_string()];
        let mut query_params: Vec<String> = vec![];

        if let Some(customer_id) = query.customer_id {
            where_conditions.push("i.customer_id = ?".to_string());
            query_params.push(customer_id.to_string());
        }

        if let Some(sale_id) = query.sale_id {
            where_conditions.push("i.sale_id = ?".to_string());
            query_params.push(sale_id.to_string());
        }

        if let Some(ref payment_status) = query.payment_status {
            where_conditions.push("i.payment_status = ?".to_string());
            query_params.push(payment_status.clone());
        }

        if let Some(start_date) = query.start_date {
            where_conditions.push("i.due_date >= ?".to_string());
            query_params.push(start_date.to_string());
        }

        if let Some(end_date) = query.end_date {
            where_conditions.push("i.due_date <= ?".to_string());
            query_params.push(end_date.to_string());
        }

        if let Some(ref search) = query.search {
            where_conditions.push("(c.name LIKE ? OR s.invoice_no LIKE ? OR i.notes LIKE ?)".to_string());
            let search_pattern = format!("%{}%", search);
            query_params.push(search_pattern.clone());
            query_params.push(search_pattern.clone());
            query_params.push(search_pattern);
        }

        let where_clause = where_conditions.join(" AND ");

        // Get total count
        let count_query = format!(
            r#"
            SELECT COUNT(*) as total
            FROM installments i
            LEFT JOIN sales s ON i.sale_id = s.id
            LEFT JOIN customers c ON i.customer_id = c.id
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

        // Get installments
        let query_str = format!(
            r#"
            SELECT 
                i.id, i.sale_id, i.customer_id, i.due_date, i.amount, i.paid_amount,
                i.payment_status, i.payment_method, i.paid_at, i.notes, i.created_at, i.updated_at,
                s.invoice_no, c.name as customer_name, c.phone as customer_phone
            FROM installments i
            LEFT JOIN sales s ON i.sale_id = s.id
            LEFT JOIN customers c ON i.customer_id = c.id
            WHERE {}
            ORDER BY i.due_date ASC, i.created_at DESC
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
            .map(|row| InstallmentWithDetails {
                id: row.get("id"),
                sale_id: row.get("sale_id"),
                customer_id: row.get("customer_id"),
                due_date: row.get("due_date"),
                amount: row.get("amount"),
                paid_amount: row.get("paid_amount"),
                payment_status: row.get("payment_status"),
                payment_method: row.get("payment_method"),
                paid_at: row.get("paid_at"),
                notes: row.get("notes"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                invoice_no: row.get("invoice_no"),
                customer_name: row.get("customer_name"),
                customer_phone: row.get("customer_phone"),
            })
            .collect();

        let total_pages = (total + limit - 1) / limit;

        Ok(InstallmentListResponse {
            items,
            total,
            page,
            limit,
            total_pages,
        })
    }

    // Get installment by ID
    pub async fn get_by_id(&self, db: &Database, id: i64) -> Result<Option<InstallmentWithDetails>> {
        let query = r#"
            SELECT 
                i.id, i.sale_id, i.customer_id, i.due_date, i.amount, i.paid_amount,
                i.payment_status, i.payment_method, i.paid_at, i.notes, i.created_at, i.updated_at,
                s.invoice_no, c.name as customer_name, c.phone as customer_phone
            FROM installments i
            LEFT JOIN customers c ON i.customer_id = c.id
            LEFT JOIN sales s ON i.sale_id = s.id
            WHERE i.id = ?
        "#;

        let result = sqlx::query(query)
            .bind(id)
            .fetch_optional(&db.pool)
            .await?;

        if let Some(row) = result {
            Ok(Some(InstallmentWithDetails {
                id: row.get("id"),
                sale_id: row.get("sale_id"),
                customer_id: row.get("customer_id"),
                due_date: row.get("due_date"),
                amount: row.get("amount"),
                paid_amount: row.get("paid_amount"),
                payment_status: row.get("payment_status"),
                payment_method: row.get("payment_method"),
                paid_at: row.get("paid_at"),
                notes: row.get("notes"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                invoice_no: row.get("invoice_no"),
                customer_name: row.get("customer_name"),
                customer_phone: row.get("customer_phone"),
            }))
        } else {
            Ok(None)
        }
    }

    // Get installments by sale ID
    pub async fn get_by_sale_id(&self, db: &Database, sale_id: i64) -> Result<Vec<InstallmentWithDetails>> {
        let query = r#"
            SELECT 
                i.id, i.sale_id, i.customer_id, i.due_date, i.amount, i.paid_amount,
                i.payment_status, i.payment_method, i.paid_at, i.notes, i.created_at, i.updated_at,
                s.invoice_no, c.name as customer_name, c.phone as customer_phone
            FROM installments i
            LEFT JOIN customers c ON i.customer_id = c.id
            LEFT JOIN sales s ON i.sale_id = s.id
            WHERE i.sale_id = ?
            ORDER BY i.due_date ASC
        "#;

        let installments = sqlx::query(query)
            .bind(sale_id)
            .fetch_all(&db.pool)
            .await?
            .into_iter()
            .map(|row| InstallmentWithDetails {
                id: row.get("id"),
                sale_id: row.get("sale_id"),
                customer_id: row.get("customer_id"),
                due_date: row.get("due_date"),
                amount: row.get("amount"),
                paid_amount: row.get("paid_amount"),
                payment_status: row.get("payment_status"),
                payment_method: row.get("payment_method"),
                paid_at: row.get("paid_at"),
                notes: row.get("notes"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                invoice_no: row.get("invoice_no"),
                customer_name: row.get("customer_name"),
                customer_phone: row.get("customer_phone"),
            })
            .collect();

        Ok(installments)
    }

    // Get installments by customer ID
    pub async fn get_by_customer_id(&self, db: &Database, customer_id: i64) -> Result<Vec<InstallmentWithDetails>> {
        let query = r#"
            SELECT 
                i.id, i.sale_id, i.customer_id, i.due_date, i.amount, i.paid_amount,
                i.payment_status, i.payment_method, i.paid_at, i.notes, i.created_at, i.updated_at,
                s.invoice_no, c.name as customer_name, c.phone as customer_phone
            FROM installments i
            LEFT JOIN customers c ON i.customer_id = c.id
            LEFT JOIN sales s ON i.sale_id = s.id
            WHERE i.customer_id = ?
            ORDER BY i.due_date ASC
        "#;

        let installments = sqlx::query(query)
            .bind(customer_id)
            .fetch_all(&db.pool)
            .await?
            .into_iter()
            .map(|row| InstallmentWithDetails {
                id: row.get("id"),
                sale_id: row.get("sale_id"),
                customer_id: row.get("customer_id"),
                due_date: row.get("due_date"),
                amount: row.get("amount"),
                paid_amount: row.get("paid_amount"),
                payment_status: row.get("payment_status"),
                payment_method: row.get("payment_method"),
                paid_at: row.get("paid_at"),
                notes: row.get("notes"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                invoice_no: row.get("invoice_no"),
                customer_name: row.get("customer_name"),
                customer_phone: row.get("customer_phone"),
            })
            .collect();

        Ok(installments)
    }

    // Create new installment
    pub async fn create(&self, db: &Database, payload: CreateInstallmentRequest) -> Result<InstallmentWithDetails> {
        // Validate required fields
        if payload.amount <= 0.0 {
            return Err(anyhow::anyhow!("مبلغ القسط يجب أن يكون أكبر من صفر"));
        }

        // Check if sale exists
        let sale = sqlx::query("SELECT id FROM sales WHERE id = ?")
            .bind(payload.sale_id)
            .fetch_optional(&db.pool)
            .await?;
        if sale.is_none() {
            return Err(anyhow::anyhow!("الفاتورة غير موجودة"));
        }

        // Check if customer exists
        let customer = sqlx::query("SELECT id FROM customers WHERE id = ?")
            .bind(payload.customer_id)
            .fetch_optional(&db.pool)
            .await?;
        if customer.is_none() {
            return Err(anyhow::anyhow!("العميل غير موجود"));
        }

        let sql = r#"
            INSERT INTO installments (sale_id, customer_id, due_date, amount, payment_method, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        "#;

        let result = sqlx::query(sql)
            .bind(payload.sale_id)
            .bind(payload.customer_id)
            .bind(payload.due_date)
            .bind(payload.amount)
            .bind(&payload.payment_method)
            .bind(&payload.notes)
            .execute(&db.pool)
            .await?;

        // Get the created installment
        let installment = self.get_by_id(db, result.last_insert_rowid()).await?;
        if let Some(installment) = installment {
            Ok(installment)
        } else {
            Err(anyhow::anyhow!("فشل في إنشاء القسط"))
        }
    }

    // Update installment
    pub async fn update(&self, db: &Database, id: i64, payload: UpdateInstallmentRequest) -> Result<InstallmentWithDetails> {
        // Check if installment exists
        let existing = self.get_by_id(db, id).await?;
        if existing.is_none() {
            return Err(anyhow::anyhow!("القسط غير موجود"));
        }

        // Validate required fields
        if payload.amount <= 0.0 {
            return Err(anyhow::anyhow!("مبلغ القسط يجب أن يكون أكبر من صفر"));
        }

        let sql = r#"
            UPDATE installments 
            SET due_date = ?, amount = ?, payment_method = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        "#;

        let changes = sqlx::query(sql)
            .bind(payload.due_date)
            .bind(payload.amount)
            .bind(&payload.payment_method)
            .bind(&payload.notes)
            .bind(id)
            .execute(&db.pool)
            .await?;

        if changes.rows_affected() == 0 {
            return Err(anyhow::anyhow!("فشل في تحديث القسط"));
        }

        // Get the updated installment
        let installment = self.get_by_id(db, id).await?;
        if let Some(installment) = installment {
            Ok(installment)
        } else {
            Err(anyhow::anyhow!("فشل في تحديث القسط"))
        }
    }

    // Delete installment
    pub async fn delete(&self, db: &Database, id: i64) -> Result<Value, anyhow::Error> {
        // Check if installment exists
        let installment = self.get_by_id(db, id).await?;
        if installment.is_none() {
            return Err(anyhow::anyhow!("القسط غير موجود"));
        }

        let changes = sqlx::query("DELETE FROM installments WHERE id = ?")
            .bind(id)
            .execute(&db.pool)
            .await?;

        if changes.rows_affected() == 0 {
            return Err(anyhow::anyhow!("فشل في حذف القسط"));
        }

        Ok(serde_json::json!({
            "id": id,
            "deleted": true
        }))
    }

    // Record payment for an installment
    pub async fn record_payment(&self, db: &Database, id: i64, payload: InstallmentPaymentRequest) -> Result<PaymentRecordResponse> {
        // Validate required fields
        if payload.paid_amount <= 0.0 {
            return Err(anyhow::anyhow!("مبلغ الدفع يجب أن يكون أكبر من صفر"));
        }

        // Get current installment
        let installment = self.get_by_id(db, id).await?;
        if installment.is_none() {
            return Err(anyhow::anyhow!("القسط غير موجود"));
        }
        let installment = installment.unwrap();

        let new_paid_amount = installment.paid_amount + payload.paid_amount;
        let total_amount = installment.amount;
        
        // Determine new payment status
        let new_payment_status = if new_paid_amount >= total_amount {
            "paid".to_string()
        } else if new_paid_amount > 0.0 {
            "partial".to_string()
        } else {
            "unpaid".to_string()
        };

        // Update installment
        let changes = sqlx::query(r#"
            UPDATE installments 
            SET paid_amount = ?, payment_status = ?, paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        "#)
        .bind(new_paid_amount)
        .bind(&new_payment_status)
        .bind(id)
        .execute(&db.pool)
        .await?;

        if changes.rows_affected() == 0 {
            return Err(anyhow::anyhow!("فشل في تسجيل الدفع"));
        }

        // Get the updated installment
        let updated_installment = self.get_by_id(db, id).await?.unwrap();

        // Create a simple receipt record (simplified version)
        let receipt = serde_json::json!({
            "id": 1,
            "customer_id": installment.customer_id,
            "sale_id": installment.sale_id,
            "amount": payload.paid_amount,
            "payment_method": payload.payment_method,
            "notes": payload.notes,
            "created_at": chrono::Utc::now()
        });

        let payment_record = PaymentRecord {
            paid_amount: payload.paid_amount,
            payment_method: payload.payment_method,
            notes: payload.notes,
            recorded_at: chrono::Utc::now().naive_utc(),
        };

        Ok(PaymentRecordResponse {
            installment: updated_installment,
            receipt,
            payment: payment_record,
        })
    }

    // Get installments grouped by sale
    pub async fn get_grouped_by_sale(&self, db: &Database, query: &InstallmentQuery) -> Result<Value, anyhow::Error> {
        let installments = self.get_all(db, query).await?;
        
        // Group installments by sale_id
        let mut grouped: HashMap<i64, Vec<Installment>> = HashMap::new();
        for installment in installments.items {
            grouped.entry(installment.sale_id).or_insert_with(Vec::new).push(installment);
        }
        
        Ok(serde_json::json!({
            "grouped_installments": grouped,
            "total_groups": grouped.len()
        }))
    }

    // Group installments by sale
    fn group_installments_by_sale(&self, installments: Vec<InstallmentWithDetails>) -> Vec<InstallmentGroupedBySale> {
        use std::collections::HashMap;
        
        let mut grouped: HashMap<i64, InstallmentGroupedBySale> = HashMap::new();
        
        for installment in installments {
            let sale_id = installment.sale_id;
            let entry = grouped.entry(sale_id).or_insert_with(|| InstallmentGroupedBySale {
                sale_id,
                invoice_no: installment.invoice_no.clone(),
                customer_name: installment.customer_name.clone(),
                customer_phone: installment.customer_phone.clone(),
                sale_total: None,
                sale_paid_amount: None,
                installments: vec![],
                total_installments: 0,
                total_amount: 0.0,
                total_paid: 0.0,
                total_remaining: 0.0,
            });
            
            entry.installments.push(installment.clone());
            entry.total_installments += 1;
            entry.total_amount += installment.amount;
            entry.total_paid += installment.paid_amount;
        }
        
        // Calculate remaining amounts
        for group in grouped.values_mut() {
            group.total_remaining = group.total_amount - group.total_paid;
        }
        
        grouped.into_values().collect()
    }

    // Get installments summary
    pub async fn get_summary(&self, db: &Database, query: &InstallmentQuery) -> Result<InstallmentSummary> {
        let mut where_conditions = vec!["1=1".to_string()];
        let mut query_params: Vec<String> = vec![];

        if let Some(customer_id) = query.customer_id {
            where_conditions.push("i.customer_id = ?".to_string());
            query_params.push(customer_id.to_string());
        }

        if let Some(ref payment_status) = query.payment_status {
            where_conditions.push("i.payment_status = ?".to_string());
            query_params.push(payment_status.clone());
        }

        let where_clause = where_conditions.join(" AND ");

        let query_str = format!(
            r#"
            SELECT 
                COUNT(*) as total_installments,
                SUM(i.amount) as total_amount,
                SUM(COALESCE(i.paid_amount, 0)) as total_paid,
                SUM(i.amount - COALESCE(i.paid_amount, 0)) as total_remaining,
                COUNT(CASE WHEN i.payment_status = 'unpaid' THEN 1 END) as unpaid_count,
                COUNT(CASE WHEN i.payment_status = 'partial' THEN 1 END) as partial_count,
                COUNT(CASE WHEN i.payment_status = 'paid' THEN 1 END) as paid_count,
                COUNT(CASE WHEN i.due_date < DATE('now') AND i.payment_status != 'paid' THEN 1 END) as overdue_count
            FROM installments i
            WHERE {}
            "#,
            where_clause
        );

        let mut query_builder = sqlx::query(&query_str);
        for param in &query_params {
            query_builder = query_builder.bind(param);
        }

        let result = query_builder.fetch_one(&db.pool).await?;

        Ok(InstallmentSummary {
            total_installments: result.get("total_installments"),
            total_amount: result.get::<Option<f64>, _>("total_amount").unwrap_or(0.0),
            total_paid: result.get::<Option<f64>, _>("total_paid").unwrap_or(0.0),
            total_remaining: result.get::<Option<f64>, _>("total_remaining").unwrap_or(0.0),
            unpaid_count: result.get("unpaid_count"),
            partial_count: result.get("partial_count"),
            paid_count: result.get("paid_count"),
            overdue_count: result.get("overdue_count"),
        })
    }

    // Create installment plan
    pub async fn create_installment_plan(&self, db: &Database, payload: CreateInstallmentPlanRequest) -> Result<InstallmentPlanResponse> {
        // Validate required fields
        if payload.installment_months <= 0 {
            return Err(anyhow::anyhow!("عدد الأشهر يجب أن يكون أكبر من صفر"));
        }

        if payload.total_amount <= 0.0 {
            return Err(anyhow::anyhow!("المبلغ الإجمالي يجب أن يكون أكبر من صفر"));
        }

        // Check if customer exists
        let customer = sqlx::query("SELECT id FROM customers WHERE id = ?")
            .bind(payload.customer_id)
            .fetch_optional(&db.pool)
            .await?;
        if customer.is_none() {
            return Err(anyhow::anyhow!("العميل غير موجود"));
        }

        // Create a dummy sale record for the installment plan
        let dummy_sale_id = sqlx::query(r#"
            INSERT INTO sales (
                customer_id, invoice_no, invoice_date, total_amount, discount_amount, 
                tax_amount, paid_amount, payment_method, payment_status, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        "#)
        .bind(payload.customer_id)
        .bind(format!("INST-{}", chrono::Utc::now().timestamp()))
        .bind(chrono::Utc::now().date_naive())
        .bind(payload.total_amount)
        .bind(0.0)
        .bind(0.0)
        .bind(0.0)
        .bind(&payload.payment_method)
        .bind("unpaid")
        .bind(format!("Installment Plan: {}", payload.notes.as_deref().unwrap_or("")))
        .execute(&db.pool)
        .await?
        .last_insert_rowid();

        // Calculate installment amount
        let installment_amount = payload.total_amount / payload.installment_months as f64;

        // Create installments
        let mut installments = Vec::new();
        let mut current_date = payload.starting_due_date;

        for _ in 0..payload.installment_months {
            let installment_id = sqlx::query(r#"
                INSERT INTO installments (sale_id, customer_id, due_date, amount, payment_method, notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            "#)
            .bind(dummy_sale_id)
            .bind(payload.customer_id)
            .bind(current_date)
            .bind(installment_amount)
            .bind(&payload.payment_method)
            .bind(&payload.notes)
            .execute(&db.pool)
            .await?
            .last_insert_rowid();

            installments.push(Installment {
                id: installment_id,
                sale_id: dummy_sale_id,
                customer_id: Some(payload.customer_id),
                due_date: current_date,
                amount: installment_amount,
                paid_amount: 0.0,
                payment_status: "unpaid".to_string(),
                payment_method: Some(payload.payment_method.clone()),
                paid_at: None,
                notes: payload.notes.clone(),
                created_at: chrono::Utc::now().naive_utc(),
                updated_at: chrono::Utc::now().naive_utc(),
            });

            // Add one month to current date
            current_date = current_date + chrono::Duration::days(30);
        }

        let plan = InstallmentPlan {
            sale_id: dummy_sale_id,
            customer_id: payload.customer_id,
            total_amount: payload.total_amount,
            installment_months: payload.installment_months,
            installment_amount,
            starting_due_date: payload.starting_due_date,
            payment_method: payload.payment_method,
            notes: payload.notes,
        };

        Ok(InstallmentPlanResponse {
            plan,
            installments,
        })
    }

    // Get overdue installments
    pub async fn get_overdue(&self, db: &Database, query: &InstallmentQuery) -> Result<InstallmentListResponse> {
        let mut overdue_query = InstallmentQuery {
            payment_status: Some("unpaid".to_string()),
            end_date: Some(chrono::Utc::now().date_naive()),
            ..(*query).clone()
        };
        
        self.get_all(db, &overdue_query).await
    }

    // Get upcoming installments
    pub async fn get_upcoming(&self, db: &Database, query: &InstallmentQuery) -> Result<InstallmentListResponse> {
        let start_date = chrono::Utc::now().date_naive();
        let end_date = start_date + chrono::Duration::days(30);
        
        let mut upcoming_query = InstallmentQuery {
            start_date: Some(start_date),
            end_date: Some(end_date),
            ..(*query).clone()
        };
        
        self.get_all(db, &upcoming_query).await
    }

    // Legacy method aliases for compatibility
    pub async fn get_by_sale(&self, db: &Database, sale_id: i64, _query: &InstallmentQuery) -> Result<Value, anyhow::Error> {
        let installments = self.get_by_sale_id(db, sale_id).await?;
        Ok(serde_json::json!({
            "installments": installments
        }))
    }

    pub async fn get_by_customer(&self, db: &Database, customer_id: i64, _query: &InstallmentQuery) -> Result<Value, anyhow::Error> {
        let installments = self.get_by_customer_id(db, customer_id).await?;
        Ok(serde_json::json!({
            "installments": installments
        }))
    }

    pub async fn create_plan(&self, db: &Database, payload: CreateInstallmentPlanRequest) -> Result<Value, anyhow::Error> {
        let result = self.create_installment_plan(db, payload).await?;
        Ok(serde_json::json!(result))
    }

    pub async fn record_installment_payment(&self, db: &Database, id: i64, payload: InstallmentPaymentRequest) -> Result<Value, anyhow::Error> {
        let result = self.record_payment(db, id, payload).await?;
        Ok(serde_json::json!(result))
    }

    pub async fn update_installment(&self, db: &Database, id: i64, payload: UpdateInstallmentRequest) -> Result<Value, anyhow::Error> {
        let result = self.update(db, id, payload).await?;
        Ok(serde_json::json!(result))
    }

    pub async fn delete_installment(&self, db: &Database, id: i64) -> Result<(), anyhow::Error> {
        self.delete(db, id).await?;
        Ok(())
    }

    pub async fn get_overdue_installments(&self, db: &Database, query: &InstallmentQuery) -> Result<Value, anyhow::Error> {
        let result = self.get_overdue(db, query).await?;
        Ok(serde_json::json!(result))
    }

    pub async fn get_customer_installments(&self, db: &Database, customer_id: i64, query: &InstallmentQuery) -> Result<Value, anyhow::Error> {
        let installments = self.get_by_customer_id(db, customer_id).await?;
        Ok(serde_json::json!({
            "installments": installments
        }))
    }

    pub async fn get_installment_summary(&self, db: &Database) -> Result<Value, anyhow::Error> {
        let query = InstallmentQuery::default();
        let result = self.get_summary(db, &query).await?;
        Ok(serde_json::json!(result))
    }
}

impl Default for InstallmentQuery {
    fn default() -> Self {
        Self {
            page: None,
            limit: None,
            search: None,
            customer_id: None,
            sale_id: None,
            payment_status: None,
            start_date: None,
            end_date: None,
        }
    }
}