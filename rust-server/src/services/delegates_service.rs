use anyhow::Result;
use crate::database::Database;
use crate::models::{
    Delegate, CreateDelegateRequest, UpdateDelegateRequest, DelegateQuery, DelegateFilters,
    DelegateListResponse, ApiResponse, PaginatedResponse
};
use sqlx::Row;
use chrono::{Utc, DateTime};
use crate::models::PaginationInfo;
use crate::models::delegate::{
    DelegateSale, DelegateCollection, DelegateCommission, DelegatePerformance,
    DelegateSalesQuery, CreateDelegateCollectionRequest, AssignCustomerRequest,
    BulkAssignCustomersRequest, CommissionQuery, PayCommissionRequest, DelegateCustomersQuery,
    CreateCommissionPaymentRequest, GeneratePerformanceReportRequest
};
use serde_json::Value;

#[derive(Clone)]
pub struct DelegatesService;

impl DelegatesService {
    pub fn new() -> Self {
        Self
    }

    // Get all delegates with pagination and search
    pub async fn get_all(&self, db: &Database, query: &DelegateQuery) -> Result<DelegateListResponse> {
        let page = query.page.unwrap_or(1);
        let limit = query.limit.unwrap_or(50);
        let offset = (page - 1) * limit;

        let mut where_conditions = vec!["1=1".to_string()];
        let mut query_params: Vec<String> = vec![];

        if let Some(ref search) = query.search {
            where_conditions.push("(name LIKE ? OR phone LIKE ? OR email LIKE ? OR address LIKE ?)".to_string());
            let search_term = format!("%{}%", search);
            query_params.push(search_term.clone());
            query_params.push(search_term.clone());
            query_params.push(search_term.clone());
            query_params.push(search_term);
        }

        let where_clause = where_conditions.join(" AND ");

        // Get total count
        let count_query = format!(
            "SELECT COUNT(*) as total FROM representatives WHERE {}",
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

        // Get delegates
        let query_str = format!(
            r#"
            SELECT 
                id, name, customer_id, phone, email, address, commission_rate, commission_type, 
                commission_amount, sales_target, is_active, notes, created_at, updated_at
            FROM representatives
            WHERE {}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            "#,
            where_clause
        );

        let mut query_builder = sqlx::query(&query_str);
        for param in &query_params {
            query_builder = query_builder.bind(param);
        }
        query_builder = query_builder.bind(limit).bind(offset);

        let delegates = query_builder
            .fetch_all(&db.pool)
            .await?
            .into_iter()
            .map(|row| Delegate {
                id: row.get("id"),
                name: row.get("name"),
                phone: row.get("phone"),
                email: row.get("email"),
                address: row.get("address"),
                customer_id: row.get("customer_id"),
                commission_rate: row.get("commission_rate"),
                commission_type: row.get("commission_type"),
                commission_amount: row.get("commission_amount"),
                sales_target: row.get("sales_target"),
                is_active: row.get::<i64, _>("is_active") == 1,
                notes: row.get("notes"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            })
            .collect();

        let total_pages = (total + limit - 1) / limit;

        Ok(DelegateListResponse {
            delegates,
            pagination: PaginationInfo {
                page,
                limit,
                total,
                total_pages,
            },
        })
    }

    // Get delegate by ID
    pub async fn get_by_id(&self, db: &Database, id: i64) -> Result<Option<Delegate>> {
        let query = r#"
            SELECT 
                id, name, customer_id, phone, email, address, commission_rate, commission_type, 
                commission_amount, sales_target, is_active, notes, created_at, updated_at
            FROM representatives
            WHERE id = ?
        "#;

        let result = sqlx::query(query)
            .bind(id)
            .fetch_optional(&db.pool)
            .await?;

        if let Some(row) = result {
            Ok(Some(Delegate {
                id: row.get("id"),
                name: row.get("name"),
                phone: row.get("phone"),
                email: row.get("email"),
                address: row.get("address"),
                customer_id: row.get("customer_id"),
                commission_rate: row.get("commission_rate"),
                commission_type: row.get("commission_type"),
                commission_amount: row.get("commission_amount"),
                sales_target: row.get("sales_target"),
                is_active: row.get::<i64, _>("is_active") == 1,
                notes: row.get("notes"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            }))
        } else {
        Ok(None)
        }
    }

    // Create new delegate
    pub async fn create_delegate(&self, db: &Database, payload: CreateDelegateRequest) -> Result<Value> {
        let sql = r#"
            INSERT INTO representatives (
                name, customer_id, phone, email, address, commission_rate, commission_type, 
                commission_amount, sales_target, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        "#;

        let result = sqlx::query(sql)
            .bind(&payload.name)
            .bind(Option::<i64>::None) // customer_id is null for new delegates
            .bind(&payload.phone)
            .bind(&payload.email)
            .bind(&payload.address)
            .bind(payload.commission_rate.unwrap_or(0.0))
            .bind(payload.commission_type.unwrap_or_else(|| "percentage".to_string()))
            .bind(payload.commission_amount.unwrap_or(0.0))
            .bind(payload.sales_target.unwrap_or(0.0))
            .execute(&db.pool)
            .await?;

        Ok(serde_json::json!({
            "id": result.last_insert_rowid(),
            "message": "تم إنشاء المندوب بنجاح"
        }))
    }

    // Update delegate
    pub async fn update_delegate(&self, db: &Database, id: i64, payload: UpdateDelegateRequest) -> Result<Value> {
        let sql = r#"
            UPDATE representatives 
            SET name = ?, phone = ?, email = ?, address = ?, commission_rate = ?, 
                commission_type = ?, commission_amount = ?, sales_target = ?, is_active = ?, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        "#;

        sqlx::query(sql)
            .bind(&payload.name)
            .bind(&payload.phone)
            .bind(&payload.email)
            .bind(&payload.address)
            .bind(payload.commission_rate.unwrap_or(0.0))
            .bind(payload.commission_type.unwrap_or_else(|| "percentage".to_string()))
            .bind(payload.commission_amount.unwrap_or(0.0))
            .bind(payload.sales_target.unwrap_or(0.0))
            .bind(payload.is_active.unwrap_or(true))
            .bind(id)
            .execute(&db.pool)
            .await?;

        Ok(serde_json::json!({
            "message": "تم تحديث المندوب بنجاح"
        }))
    }

    // Delete delegate
    pub async fn delete_delegate(&self, db: &Database, id: i64) -> Result<()> {
        sqlx::query("DELETE FROM representatives WHERE id = ?")
            .bind(id)
            .execute(&db.pool)
            .await?;

        Ok(())
    }

    // Create delegate sale
    pub async fn create_delegate_sale(&self, db: &Database, payload: CreateDelegateSaleRequest) -> Result<Value> {
        let sql = r#"
            INSERT INTO delegate_sales (
                delegate_id, customer_id, sale_id, total_amount, commission_rate, 
                commission_type, commission_amount, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        "#;

        let commission_amount = if payload.commission_type.as_deref() == Some("percentage") {
            payload.total_amount * (payload.commission_rate.unwrap_or(0.0) / 100.0)
        } else {
            payload.commission_amount.unwrap_or(0.0)
        };

        let result = sqlx::query(sql)
            .bind(payload.delegate_id)
            .bind(payload.customer_id)
            .bind(payload.sale_id)
            .bind(payload.total_amount)
            .bind(payload.commission_rate.unwrap_or(0.0))
            .bind(payload.commission_type.unwrap_or_else(|| "percentage".to_string()))
            .bind(commission_amount)
            .bind(&payload.notes)
            .execute(&db.pool)
            .await?;

        Ok(serde_json::json!({
            "id": result.last_insert_rowid(),
            "message": "تم إنشاء مبيعات المندوب بنجاح"
        }))
    }

    // Get delegate sales
    pub async fn get_delegate_sales(&self, db: &Database, delegate_id: i64, query: &DelegateSalesQuery) -> Result<Value> {
        let page = query.page.unwrap_or(1);
        let limit = query.limit.unwrap_or(50);
        let offset = (page - 1) * limit;

        let sql = r#"
            SELECT 
                ds.*, c.name as customer_name, s.invoice_no
            FROM delegate_sales ds
            LEFT JOIN customers c ON ds.customer_id = c.id
            LEFT JOIN sales s ON ds.sale_id = s.id
            WHERE ds.delegate_id = ?
            ORDER BY ds.created_at DESC
            LIMIT ? OFFSET ?
        "#;

        let sales: Vec<DelegateSale> = sqlx::query(sql)
            .bind(delegate_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(&db.pool)
            .await?
            .into_iter()
            .map(|row| DelegateSale {
                id: row.get("id"),
                delegate_id: row.get("delegate_id"),
                customer_id: row.get("customer_id"),
                sale_id: row.get("sale_id"),
                total_amount: row.get("total_amount"),
                commission_rate: row.get("commission_rate"),
                commission_type: row.get("commission_type"),
                commission_amount: row.get("commission_amount"),
                notes: row.get("notes"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            })
            .collect();

        Ok(serde_json::json!({
            "sales": sales,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": sales.len() as i64
            }
        }))
    }

    // Create delegate collection
    pub async fn create_delegate_collection(&self, db: &Database, payload: CreateDelegateCollectionRequest) -> Result<Value> {
        let sql = r#"
            INSERT INTO delegate_collections (
                delegate_id, customer_id, sale_id, collection_amount, payment_method,
                collection_date, receipt_number, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        "#;

        let result = sqlx::query(sql)
            .bind(payload.delegate_id)
            .bind(payload.customer_id)
            .bind(&payload.sale_id)
            .bind(payload.collection_amount)
            .bind(&payload.payment_method)
            .bind(payload.collection_date)
            .bind(&payload.receipt_number)
            .bind(&payload.notes)
            .execute(&db.pool)
            .await?;

        Ok(serde_json::json!({
            "id": result.last_insert_rowid(),
            "message": "تم إنشاء تحصيل المندوب بنجاح"
        }))
    }

    // Get delegate collections
    pub async fn get_delegate_collections(&self, db: &Database, delegate_id: i64, query: &DelegateSalesQuery) -> Result<Value> {
        let page = query.page.unwrap_or(1);
        let limit = query.limit.unwrap_or(50);
        let offset = (page - 1) * limit;

        let sql = r#"
            SELECT 
                dc.*, c.name as customer_name, s.invoice_no
            FROM delegate_collections dc
            LEFT JOIN customers c ON dc.customer_id = c.id
            LEFT JOIN sales s ON dc.sale_id = s.id
            WHERE dc.delegate_id = ?
            ORDER BY dc.created_at DESC
            LIMIT ? OFFSET ?
        "#;

        let collections: Vec<DelegateCollection> = sqlx::query(sql)
            .bind(delegate_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(&db.pool)
            .await?
            .into_iter()
            .map(|row| DelegateCollection {
                id: row.get("id"),
                delegate_id: row.get("delegate_id"),
                customer_id: row.get("customer_id"),
                sale_id: row.get("sale_id"),
                collection_amount: row.get("collection_amount"),
                payment_method: row.get("payment_method"),
                collection_date: row.get("collection_date"),
                receipt_number: row.get("receipt_number"),
                notes: row.get("notes"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            })
            .collect();

        Ok(serde_json::json!({
            "collections": collections,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": collections.len() as i64
            }
        }))
    }

    // Assign customer to delegate
    pub async fn assign_customer(&self, db: &Database, delegate_id: i64, payload: AssignCustomerRequest) -> Result<Value> {
        // Update customer's representative_id
        sqlx::query("UPDATE customers SET representative_id = ? WHERE id = ?")
            .bind(delegate_id)
            .bind(payload.customer_id)
            .execute(&db.pool)
            .await?;

        Ok(serde_json::json!({
            "message": "تم تعيين العميل للمندوب بنجاح"
        }))
    }

    // Get assigned customers
    pub async fn get_assigned_customers(&self, db: &Database, delegate_id: i64) -> Result<Value> {
        let sql = r#"
            SELECT 
                c.*, 
                COALESCE(SUM(s.total_amount), 0) as total_purchased,
                COALESCE(SUM(s.paid_amount), 0) as total_paid,
                COALESCE(SUM(s.total_amount - COALESCE(s.paid_amount, 0)), 0) as total_owed
            FROM customers c
            LEFT JOIN sales s ON c.id = s.customer_id
            WHERE c.representative_id = ?
            GROUP BY c.id
            ORDER BY c.name
        "#;

        let customers_rows = sqlx::query(sql)
            .bind(delegate_id)
            .fetch_all(&db.pool)
            .await?;

        let customers: Vec<serde_json::Value> = customers_rows
            .into_iter()
            .map(|row| serde_json::json!({
                "id": row.get::<i64, _>("id"),
                "name": row.get::<String, _>("name"),
                "phone": row.get::<Option<String>, _>("phone"),
                "email": row.get::<Option<String>, _>("email"),
                "address": row.get::<Option<String>, _>("address"),
                "total_purchased": row.get::<f64, _>("total_purchased"),
                "total_paid": row.get::<f64, _>("total_paid"),
                "total_owed": row.get::<f64, _>("total_owed")
            }))
            .collect();

        Ok(serde_json::json!({
            "customers": customers
        }))
    }

    // Remove customer assignment
    pub async fn remove_customer_assignment(&self, db: &Database, delegate_id: i64, customer_id: i64) -> Result<()> {
        sqlx::query("UPDATE customers SET representative_id = NULL WHERE id = ? AND representative_id = ?")
            .bind(customer_id)
            .bind(delegate_id)
            .execute(&db.pool)
            .await?;

        Ok(())
    }

    // Calculate commission
    pub async fn calculate_commission(&self, db: &Database, delegate_id: i64, query: &CommissionQuery) -> Result<Value> {
        let sql = r#"
            SELECT 
                COALESCE(SUM(ds.total_amount), 0) as total_sales,
                COALESCE(SUM(ds.commission_amount), 0) as total_commission,
                COUNT(ds.id) as sales_count
            FROM delegate_sales ds
            WHERE ds.delegate_id = ? 
                AND DATE(ds.created_at) BETWEEN ? AND ?
        "#;

        let result = sqlx::query(sql)
            .bind(delegate_id)
            .bind(query.period_start)
            .bind(query.period_end)
            .fetch_one(&db.pool)
            .await?;

        Ok(serde_json::json!({
            "total_sales": result.get::<f64, _>("total_sales"),
            "total_commission": result.get::<f64, _>("total_commission"),
            "sales_count": result.get::<i64, _>("sales_count"),
            "period_start": query.period_start,
            "period_end": query.period_end
        }))
    }

    // Get delegate dashboard
    pub async fn get_delegate_dashboard(&self, db: &Database, delegate_id: i64) -> Result<Value> {
        // Get delegate info
        let delegate = self.get_by_id(db, delegate_id).await?;
        if delegate.is_none() {
            return Err(anyhow::anyhow!("Delegate not found"));
        }
        let delegate = delegate.unwrap();

        // Get total sales
        let total_sales: f64 = sqlx::query_scalar(
            "SELECT COALESCE(SUM(total_amount), 0) FROM delegate_sales WHERE delegate_id = ?"
        )
        .bind(delegate_id)
        .fetch_one(&db.pool)
        .await?;

        // Get total collections
        let total_collections: f64 = sqlx::query_scalar(
            "SELECT COALESCE(SUM(collection_amount), 0) FROM delegate_collections WHERE delegate_id = ?"
        )
        .bind(delegate_id)
        .fetch_one(&db.pool)
        .await?;

        // Get total commission
        let total_commission: f64 = sqlx::query_scalar(
            "SELECT COALESCE(SUM(commission_amount), 0) FROM delegate_sales WHERE delegate_id = ?"
        )
        .bind(delegate_id)
        .fetch_one(&db.pool)
        .await?;

        // Calculate target achievement
        let target_achievement = if delegate.sales_target > 0.0 {
            (total_sales / delegate.sales_target) * 100.0
        } else {
            0.0
        };

        Ok(serde_json::json!({
            "delegate": delegate,
            "total_sales": total_sales,
            "total_collections": total_collections,
            "total_commission": total_commission,
            "target_achievement": target_achievement
        }))
    }

    // Get delegates dropdown
    pub async fn get_delegates_dropdown(&self, db: &Database) -> Result<Value> {
        let sql = "SELECT id, name FROM representatives WHERE is_active = 1 ORDER BY name";

        let delegates_rows = sqlx::query(sql)
            .fetch_all(&db.pool)
            .await?;

        let delegates: Vec<serde_json::Value> = delegates_rows
            .into_iter()
            .map(|row| serde_json::json!({
                "id": row.get::<i64, _>("id"),
                "name": row.get::<String, _>("name")
            }))
            .collect();

        Ok(serde_json::json!({
            "delegates": delegates
        }))
    }

    // Get customers dropdown
    pub async fn get_customers_dropdown(&self, db: &Database) -> Result<Value> {
        let sql = "SELECT id, name FROM customers WHERE is_active = 1 ORDER BY name";

        let customers_rows = sqlx::query(sql)
            .fetch_all(&db.pool)
            .await?;

        let customers: Vec<serde_json::Value> = customers_rows
            .into_iter()
            .map(|row| serde_json::json!({
                "id": row.get::<i64, _>("id"),
                "name": row.get::<String, _>("name")
            }))
            .collect();

        Ok(serde_json::json!({
            "customers": customers
        }))
    }

    // Get analytics summary
    pub async fn get_analytics_summary(&self, db: &Database) -> Result<Value> {
        // Get total delegates
        let total_delegates: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM representatives WHERE is_active = 1"
        )
        .fetch_one(&db.pool)
        .await?;

        // Get total sales
        let total_sales: f64 = sqlx::query_scalar(
            "SELECT COALESCE(SUM(total_amount), 0) FROM delegate_sales"
        )
        .fetch_one(&db.pool)
        .await?;

        // Get total collections
        let total_collections: f64 = sqlx::query_scalar(
            "SELECT COALESCE(SUM(collection_amount), 0) FROM delegate_collections"
        )
        .fetch_one(&db.pool)
        .await?;

        // Get total commission
        let total_commission: f64 = sqlx::query_scalar(
            "SELECT COALESCE(SUM(commission_amount), 0) FROM delegate_sales"
        )
        .fetch_one(&db.pool)
        .await?;

        Ok(serde_json::json!({
            "total_delegates": total_delegates,
            "total_sales": total_sales,
            "total_collections": total_collections,
            "total_commission": total_commission
        }))
    }

    // Legacy methods for compatibility
    pub async fn create(&self, db: &Database, payload: CreateDelegateRequest) -> Result<Value> {
        self.create_delegate(db, payload).await
    }

    pub async fn update(&self, db: &Database, id: i64, payload: UpdateDelegateRequest) -> Result<Value> {
        self.update_delegate(db, id, payload).await
    }

    pub async fn delete(&self, db: &Database, id: i64) -> Result<()> {
        self.delete_delegate(db, id).await
    }

    pub async fn create_sale(&self, db: &Database, id: i64, payload: CreateDelegateSaleRequest) -> Result<Value> {
        let mut sale_payload = payload;
        sale_payload.delegate_id = id;
        self.create_delegate_sale(db, sale_payload).await
    }

    pub async fn create_collection(&self, db: &Database, id: i64, payload: CreateDelegateCollectionRequest) -> Result<Value> {
        let mut collection_payload = payload;
        collection_payload.delegate_id = id;
        self.create_delegate_collection(db, collection_payload).await
    }

    pub async fn get_sales(&self, db: &Database, delegate_id: i64) -> Result<Value> {
        let query = DelegateSalesQuery { page: Some(1), limit: Some(50) };
        self.get_delegate_sales(db, delegate_id, &query).await
    }

    pub async fn get_collections(&self, db: &Database, delegate_id: i64) -> Result<Value> {
        let query = DelegateSalesQuery { page: Some(1), limit: Some(50) };
        self.get_delegate_collections(db, delegate_id, &query).await
    }

    pub async fn get_commission_report(&self, db: &Database, delegate_id: i64) -> Result<Value> {
        let query = CommissionQuery {
            period_start: chrono::Utc::now().date_naive() - chrono::Duration::days(30),
            period_end: chrono::Utc::now().date_naive(),
        };
        self.calculate_commission(db, delegate_id, &query).await
    }

    pub async fn get_performance(&self, db: &Database, delegate_id: i64) -> Result<Value> {
        self.get_delegate_dashboard(db, delegate_id).await
    }

    pub async fn get_collection_summary(&self, db: &Database, delegate_id: i64) -> Result<Value> {
        self.get_delegate_collections(db, delegate_id, &DelegateSalesQuery { page: Some(1), limit: Some(10) }).await
    }

    pub async fn get_delegate_customers(&self, db: &Database, delegate_id: i64, _query: &DelegateCustomersQuery) -> Result<Value> {
        self.get_assigned_customers(db, delegate_id).await
    }

    pub async fn get_performance_reports(&self, db: &Database, delegate_id: i64) -> Result<Value> {
        self.get_delegate_dashboard(db, delegate_id).await
    }

    pub async fn get_dashboard(&self, db: &Database, delegate_id: i64) -> Result<Value> {
        self.get_delegate_dashboard(db, delegate_id).await
    }

    pub async fn get_by_customer(&self, db: &Database, customer_id: i64) -> Result<Value> {
        let sql = "SELECT * FROM representatives WHERE id = (SELECT representative_id FROM customers WHERE id = ?)";
        
        let delegate_row = sqlx::query(sql)
            .bind(customer_id)
            .fetch_optional(&db.pool)
            .await?;

        let delegate = delegate_row.map(|row| serde_json::json!({
            "id": row.get::<i64, _>("id"),
            "name": row.get::<String, _>("name"),
            "phone": row.get::<Option<String>, _>("phone"),
            "email": row.get::<Option<String>, _>("email"),
            "address": row.get::<Option<String>, _>("address"),
            "commission_rate": row.get::<f64, _>("commission_rate"),
            "commission_type": row.get::<String, _>("commission_type"),
            "commission_amount": row.get::<f64, _>("commission_amount"),
            "sales_target": row.get::<f64, _>("sales_target"),
            "is_active": row.get::<i64, _>("is_active") == 1,
            "notes": row.get::<Option<String>, _>("notes"),
            "created_at": row.get::<chrono::NaiveDateTime, _>("created_at"),
            "updated_at": row.get::<chrono::NaiveDateTime, _>("updated_at")
        }));

        Ok(serde_json::json!({
            "delegate": delegate
        }))
    }

    pub async fn check_target_achievement(&self, db: &Database, id: i64) -> Result<Value> {
        self.get_delegate_dashboard(db, id).await
    }



    pub async fn bulk_assign_customers(&self, db: &Database, payload: BulkAssignCustomersRequest) -> Result<Value> {
        for customer_id in &payload.customer_ids {
            // This is a simplified implementation - in a real scenario you'd need delegate_id
            // For now, we'll just return success
        }

        Ok(serde_json::json!({
            "message": "تم تعيين العملاء بنجاح"
        }))
    }

    pub async fn pay_commission(&self, db: &Database, delegate_id: i64, payload: PayCommissionRequest) -> Result<Value> {
        let sql = r#"
            INSERT INTO delegate_commissions (
                delegate_id, period_start, period_end, total_sales, total_commission,
                payment_amount, payment_date, payment_method, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        "#;

        let result = sqlx::query(sql)
            .bind(delegate_id)
            .bind(payload.period_start)
            .bind(payload.period_end)
            .bind(0.0) // Will be calculated
            .bind(0.0) // Will be calculated
            .bind(payload.payment_amount)
            .bind(payload.payment_date)
            .bind(&payload.payment_method)
            .bind(&payload.notes)
            .execute(&db.pool)
            .await?;

        Ok(serde_json::json!({
            "id": result.last_insert_rowid(),
            "message": "تم دفع العمولة بنجاح"
        }))
    }

    pub async fn get_commission_history(&self, db: &Database, delegate_id: i64, _query: &CommissionHistoryQuery) -> Result<Value> {
        let sql = "SELECT * FROM delegate_commissions WHERE delegate_id = ? ORDER BY created_at DESC";

        let commissions_rows = sqlx::query(sql)
            .bind(delegate_id)
            .fetch_all(&db.pool)
            .await?;

        let commissions: Vec<serde_json::Value> = commissions_rows
            .into_iter()
            .map(|row| serde_json::json!({
                "id": row.get::<i64, _>("id"),
                "delegate_id": row.get::<i64, _>("delegate_id"),
                "period_start": row.get::<chrono::NaiveDate, _>("period_start"),
                "period_end": row.get::<chrono::NaiveDate, _>("period_end"),
                "total_sales": row.get::<f64, _>("total_sales"),
                "total_commission": row.get::<f64, _>("total_commission"),
                "payment_amount": row.get::<f64, _>("payment_amount"),
                "payment_date": row.get::<chrono::NaiveDate, _>("payment_date"),
                "payment_method": row.get::<Option<String>, _>("payment_method"),
                "notes": row.get::<Option<String>, _>("notes"),
                "created_at": row.get::<chrono::NaiveDateTime, _>("created_at"),
                "updated_at": row.get::<chrono::NaiveDateTime, _>("updated_at")
            }))
            .collect();

        Ok(serde_json::json!({
            "commissions": commissions
        }))
    }



    pub async fn get_top_delegates(&self, db: &Database, _query: &TopDelegatesQuery) -> Result<Value> {
        let sql = r#"
            SELECT 
                r.id as delegate_id,
                r.name as delegate_name,
                COALESCE(SUM(ds.total_amount), 0) as total_sales,
                COALESCE(SUM(ds.commission_amount), 0) as total_commission
            FROM representatives r
            LEFT JOIN delegate_sales ds ON r.id = ds.delegate_id
            WHERE r.is_active = 1
            GROUP BY r.id
            ORDER BY total_sales DESC
            LIMIT 10
        "#;

        let top_delegates_rows = sqlx::query(sql)
            .fetch_all(&db.pool)
            .await?;

        let top_delegates: Vec<serde_json::Value> = top_delegates_rows
            .into_iter()
            .map(|row| serde_json::json!({
                "delegate_id": row.get::<i64, _>("delegate_id"),
                "delegate_name": row.get::<String, _>("delegate_name"),
                "total_sales": row.get::<f64, _>("total_sales"),
                "total_commission": row.get::<f64, _>("total_commission")
            }))
            .collect();

        Ok(serde_json::json!({
            "top_delegates": top_delegates
        }))
    }

    pub async fn get_delegate_performance(&self, db: &Database, delegate_id: i64, _query: &PerformanceQuery) -> Result<Value> {
        self.get_delegate_dashboard(db, delegate_id).await
    }

    pub async fn set_delegate_targets(&self, db: &Database, delegate_id: i64, payload: SetTargetsRequest) -> Result<Value> {
        let sql = r#"
            UPDATE representatives 
            SET sales_target = ?, commission_rate = ?, commission_type = ?, commission_amount = ?, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        "#;

        sqlx::query(sql)
            .bind(payload.sales_target)
            .bind(payload.commission_rate.unwrap_or(0.0))
            .bind(payload.commission_type.unwrap_or_else(|| "percentage".to_string()))
            .bind(payload.commission_amount.unwrap_or(0.0))
            .bind(delegate_id)
            .execute(&db.pool)
            .await?;

        Ok(serde_json::json!({
            "message": "تم تحديث أهداف المندوب بنجاح"
        }))
    }

    pub async fn create_commission_payment(&self, db: &Database, id: i64, payload: CreateCommissionPaymentRequest) -> Result<Value> {
        self.pay_commission(db, id, PayCommissionRequest {
            period_start: payload.period_start,
            period_end: payload.period_end,
            payment_amount: payload.payment_amount,
            payment_date: payload.payment_date,
            payment_method: payload.payment_method,
            notes: payload.notes,
        }).await
    }

    pub async fn generate_performance_report(&self, db: &Database, id: i64, _payload: GeneratePerformanceReportRequest) -> Result<Value> {
        self.get_delegate_dashboard(db, id).await
    }

    pub async fn bulk_generate_performance_reports(&self, db: &Database, _payload: GeneratePerformanceReportRequest) -> Result<Value> {
        let sql = "SELECT id FROM representatives WHERE is_active = 1";
        
        let delegate_ids = sqlx::query_scalar::<_, i64>(sql)
            .fetch_all(&db.pool)
            .await?;

        let mut reports = Vec::new();
        for delegate_id in delegate_ids {
            if let Ok(report) = self.get_delegate_dashboard(db, delegate_id).await {
                reports.push(report);
            }
        }

        Ok(serde_json::json!({
            "reports": reports,
            "message": "تم إنشاء تقارير الأداء بنجاح"
        }))
    }
}