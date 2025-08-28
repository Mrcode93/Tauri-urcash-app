use anyhow::Result;
use crate::database::Database;
use crate::models::{
    Debt, CreateDebtRequest, UpdateDebtRequest, DebtQuery, DebtFilters,
    DebtListResponse, ApiResponse, PaginatedResponse
};
use sqlx::{Row, SqlitePool};
use chrono::{Utc, DateTime};
use crate::models::PaginationInfo;
use serde_json::Value;

#[derive(Clone)]
pub struct DebtService;

impl DebtService {
    pub fn new() -> Self {
        Self
    }

    // Get all debts with pagination and filtering
    pub async fn get_all(&self, db: &Database, query: &DebtQuery) -> Result<DebtListResponse> {
        let page = query.page.unwrap_or(1);
        let limit = query.limit.unwrap_or(50);
        let offset = (page - 1) * limit;

        // Build WHERE conditions - only show sales with outstanding balances
        let mut where_conditions = vec!["(s.total_amount > COALESCE(s.paid_amount, 0) OR d.id IS NOT NULL)".to_string()];
        let mut query_params: Vec<String> = vec![];

        if let Some(ref search) = query.search {
            where_conditions.push("(c.name LIKE ? OR s.invoice_no LIKE ?)".to_string());
            let search_pattern = format!("%{}%", search);
            query_params.push(search_pattern.clone());
            query_params.push(search_pattern);
        }

        if let Some(ref status) = query.status {
            if status != "all" {
                match status.as_str() {
                    "pending" => {
                        where_conditions.push("d.status = ?".to_string());
                        query_params.push("unpaid".to_string());
                    }
                    "partial" => {
                        where_conditions.push("d.status = ?".to_string());
                        query_params.push("partial".to_string());
                    }
                    "paid" => {
                        where_conditions.push("d.status = ?".to_string());
                        query_params.push("paid".to_string());
                    }
                    _ => {}
                }
            }
        }

        if let Some(customer_id) = query.customer_id {
            where_conditions.push("s.customer_id = ?".to_string());
            query_params.push(customer_id.to_string());
        }

        let where_clause = where_conditions.join(" AND ");

        // Build the main query
        let query_str = format!(
            r#"
            SELECT 
                d.id as debt_id,
                d.sale_id,
                s.invoice_no,
                s.customer_id,
                c.name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                c.address as customer_address,
                s.total_amount,
                COALESCE(s.paid_amount, 0) as paid_amount,
                d.amount as debt_amount,
                (s.total_amount - COALESCE(s.paid_amount, 0)) as remaining_amount,
                COALESCE(d.due_date, s.due_date) as due_date,
                d.status as debt_status,
                CASE 
                    WHEN d.amount <= 0 THEN 'paid'
                    WHEN COALESCE(s.paid_amount, 0) >= s.total_amount THEN 'paid'
                    WHEN COALESCE(s.paid_amount, 0) > 0 THEN 'partial'
                    ELSE 'pending'
                END as calculated_status,
                d.notes,
                s.created_at,
                s.updated_at
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN debts d ON s.id = d.sale_id
            WHERE {}
            ORDER BY s.created_at DESC
            LIMIT ? OFFSET ?
            "#,
            where_clause
        );

        // Execute the main query
        let mut query_builder = sqlx::query(&query_str);
        for param in &query_params {
            query_builder = query_builder.bind(param);
        }
        query_builder = query_builder.bind(limit).bind(offset);

        let debts = query_builder
            .fetch_all(&db.pool)
            .await?
            .into_iter()
            .map(|row| DebtDetail {
                debt_id: row.get("debt_id"),
                sale_id: row.get("sale_id"),
                invoice_no: row.get("invoice_no"),
                customer_id: row.get("customer_id"),
                customer_name: row.get("customer_name"),
                customer_email: row.get("customer_email"),
                customer_phone: row.get("customer_phone"),
                customer_address: row.get("customer_address"),
                total_amount: row.get("total_amount"),
                paid_amount: row.get("paid_amount"),
                debt_amount: row.get("debt_amount"),
                remaining_amount: row.get("remaining_amount"),
                due_date: row.get("due_date"),
                debt_status: row.get("debt_status"),
                calculated_status: row.get("calculated_status"),
                notes: row.get("notes"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            })
            .collect();

        // Get total count for pagination
        let count_query = format!(
            r#"
            SELECT COUNT(*) as total
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN debts d ON s.id = d.sale_id
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

        let total_pages = (total + limit - 1) / limit;
        let has_more = (page * limit) < total;

        Ok(DebtListResponse {
            data: debts,
            pagination:   DebtPaginationInfo {
                page,
                limit,
                total,
                total_pages,
                has_more,
            },
        })
    }

    // Get debt statistics
    pub async fn get_statistics(&self, db: &Database, customer_id: Option<i64>) -> Result<DebtStats> {
        let mut where_conditions = vec!["(s.total_amount > COALESCE(s.paid_amount, 0) OR d.id IS NOT NULL)".to_string()];
        let mut query_params: Vec<String> = vec![];

        if let Some(customer_id) = customer_id {
            where_conditions.push("s.customer_id = ?".to_string());
            query_params.push(customer_id.to_string());
        }

        let where_clause = where_conditions.join(" AND ");

        let query_str = format!(
            r#"
            SELECT 
                COUNT(*) as total_count,
                SUM(CASE 
                    WHEN (s.total_amount - COALESCE(s.paid_amount, 0)) > 0 THEN 1 
                    ELSE 0 
                END) as total_pending,
                SUM(CASE 
                    WHEN COALESCE(s.paid_amount, 0) >= s.total_amount THEN 1 
                    ELSE 0 
                END) as total_paid,
                SUM(CASE 
                    WHEN COALESCE(s.paid_amount, 0) > 0 AND COALESCE(s.paid_amount, 0) < s.total_amount THEN 1 
                    ELSE 0 
                END) as total_partial,
                SUM(s.total_amount - COALESCE(s.paid_amount, 0)) as total_outstanding_amount
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN debts d ON s.id = d.sale_id
            WHERE {}
            "#,
            where_clause
        );

        let mut query_builder = sqlx::query(&query_str);
        for param in &query_params {
            query_builder = query_builder.bind(param);
        }

        let row = query_builder.fetch_one(&db.pool).await?;

        Ok(DebtStats {
            total_pending: row.get("total_pending"),
            total_paid: row.get("total_paid"),
            total_partial: row.get("total_partial"),
            total_count: row.get("total_count"),
            total_outstanding_amount: row.get("total_outstanding_amount"),
        })
    }

    // Get customer with debts
    pub async fn get_customer_with_debts(&self, db: &Database, customer_id: i64) -> Result<Option<CustomerWithDebts>> {
        // Get customer information
        let customer_query = r#"
            SELECT 
                c.*,
                COUNT(s.id) as total_sales,
                COALESCE(SUM(s.total_amount), 0) as total_purchased,
                COALESCE(SUM(s.paid_amount), 0) as total_paid,
                COALESCE(SUM(s.total_amount - COALESCE(s.paid_amount, 0)), 0) as total_owed
            FROM customers c
            LEFT JOIN sales s ON c.id = s.customer_id AND s.status = 'completed'
            WHERE c.id = ?
            GROUP BY c.id
        "#;

        let customer_row = sqlx::query(customer_query)
            .bind(customer_id)
            .fetch_optional(&db.pool)
            .await?;

        if customer_row.is_none() {
            return Ok(None);
        }

        let row = customer_row.unwrap();
        let customer = CustomerDebtInfo {
            id: row.get("id"),
            name: row.get("name"),
            email: row.get("email"),
            phone: row.get("phone"),
            address: row.get("address"),
            credit_limit: row.get("credit_limit"),
            current_balance: row.get("current_balance"),
            is_active: row.get("is_active"),
            customer_type: row.get("customer_type"),
            tax_number: row.get("tax_number"),
            due_date: row.get("due_date"),
            representative_id: row.get("representative_id"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            total_sales: row.get("total_sales"),
            total_purchased: row.get("total_purchased"),
            total_paid: row.get("total_paid"),
            total_owed: row.get("total_owed"),
        };

        // Get customer's debts
        let debts_query = r#"
            SELECT 
                d.id as debt_id,
                d.sale_id,
                s.invoice_no,
                s.invoice_date,
                s.total_amount,
                COALESCE(s.paid_amount, 0) as paid_amount,
                d.amount as debt_amount,
                (s.total_amount - COALESCE(s.paid_amount, 0)) as remaining_amount,
                COALESCE(d.due_date, s.due_date) as due_date,
                d.status as debt_status,
                CASE 
                    WHEN d.amount <= 0 THEN 'paid'
                    WHEN COALESCE(s.paid_amount, 0) >= s.total_amount THEN 'paid'
                    WHEN COALESCE(s.paid_amount, 0) > 0 THEN 'partial'
                    ELSE 'pending'
                END as calculated_status,
                d.notes,
                s.created_at,
                s.updated_at
            FROM sales s
            LEFT JOIN debts d ON s.id = d.sale_id
            WHERE s.customer_id = ? AND (s.total_amount > COALESCE(s.paid_amount, 0) OR d.id IS NOT NULL)
            ORDER BY s.created_at DESC
        "#;

        let debts = sqlx::query(debts_query)
            .bind(customer_id)
            .fetch_all(&db.pool)
            .await?
            .into_iter()
            .map(|row| DebtDetail {
                debt_id: row.get("debt_id"),
                sale_id: row.get("sale_id"),
                invoice_no: row.get("invoice_no"),
                customer_id: row.get("customer_id"),
                customer_name: customer.name.clone(),
                customer_email: customer.email.clone(),
                customer_phone: customer.phone.clone(),
                customer_address: customer.address.clone(),
                total_amount: row.get("total_amount"),
                paid_amount: row.get("paid_amount"),
                debt_amount: row.get("debt_amount"),
                remaining_amount: row.get("remaining_amount"),
                due_date: row.get("due_date"),
                debt_status: row.get("debt_status"),
                calculated_status: row.get("calculated_status"),
                notes: row.get("notes"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            })
            .collect();

        Ok(Some(CustomerWithDebts { customer, debts }))
    }

    // Get debts by customer
    pub async fn get_by_customer(&self, db: &Database, customer_id: i64) -> Result<Vec<DebtDetail>> {
        let query = r#"
            SELECT 
                d.id as debt_id,
                d.sale_id,
                s.invoice_no,
                s.customer_id,
                c.name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                c.address as customer_address,
                s.total_amount,
                COALESCE(s.paid_amount, 0) as paid_amount,
                d.amount as debt_amount,
                (s.total_amount - COALESCE(s.paid_amount, 0)) as remaining_amount,
                COALESCE(d.due_date, s.due_date) as due_date,
                d.status as debt_status,
                CASE 
                    WHEN d.amount <= 0 THEN 'paid'
                    WHEN COALESCE(s.paid_amount, 0) >= s.total_amount THEN 'paid'
                    WHEN COALESCE(s.paid_amount, 0) > 0 THEN 'partial'
                    ELSE 'pending'
                END as calculated_status,
                d.notes,
                s.created_at,
                s.updated_at
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN debts d ON s.id = d.sale_id
            WHERE s.customer_id = ? AND (s.total_amount > COALESCE(s.paid_amount, 0) OR d.id IS NOT NULL)
            ORDER BY s.created_at DESC
        "#;

        let debts = sqlx::query(query)
            .bind(customer_id)
            .fetch_all(&db.pool)
            .await?
            .into_iter()
            .map(|row| DebtDetail {
                debt_id: row.get("debt_id"),
                sale_id: row.get("sale_id"),
                invoice_no: row.get("invoice_no"),
                customer_id: row.get("customer_id"),
                customer_name: row.get("customer_name"),
                customer_email: row.get("customer_email"),
                customer_phone: row.get("customer_phone"),
                customer_address: row.get("customer_address"),
                total_amount: row.get("total_amount"),
                paid_amount: row.get("paid_amount"),
                debt_amount: row.get("debt_amount"),
                remaining_amount: row.get("remaining_amount"),
                due_date: row.get("due_date"),
                debt_status: row.get("debt_status"),
                calculated_status: row.get("calculated_status"),
                notes: row.get("notes"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            })
            .collect();

        Ok(debts)
    }

    // Get debt by ID (supports both debt ID and sale ID)
    pub async fn get_by_id(&self, db: &Database, id: i64) -> Result<Option<DebtDetail>> {
        // First try to find by debt ID
        let mut query = r#"
            SELECT 
                d.id as debt_id,
                d.sale_id,
                s.invoice_no,
                s.customer_id,
                c.name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                c.address as customer_address,
                s.total_amount,
                COALESCE(s.paid_amount, 0) as paid_amount,
                d.amount as debt_amount,
                (s.total_amount - COALESCE(s.paid_amount, 0)) as remaining_amount,
                COALESCE(d.due_date, s.due_date) as due_date,
                d.status as debt_status,
                CASE 
                    WHEN d.amount <= 0 THEN 'paid'
                    WHEN COALESCE(s.paid_amount, 0) >= s.total_amount THEN 'paid'
                    WHEN COALESCE(s.paid_amount, 0) > 0 THEN 'partial'
                    ELSE 'pending'
                END as calculated_status,
                d.notes,
                s.created_at,
                s.updated_at
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN debts d ON s.id = d.sale_id
            WHERE d.id = ?
        "#;

        let mut result = sqlx::query(query)
            .bind(id)
            .fetch_optional(&db.pool)
            .await?;

        // If not found by debt ID, try by sale ID
        if result.is_none() {
            query = r#"
                SELECT 
                    d.id as debt_id,
                    d.sale_id,
                    s.invoice_no,
                    s.customer_id,
                    c.name as customer_name,
                    c.email as customer_email,
                    c.phone as customer_phone,
                    c.address as customer_address,
                    s.total_amount,
                    COALESCE(s.paid_amount, 0) as paid_amount,
                    d.amount as debt_amount,
                    (s.total_amount - COALESCE(s.paid_amount, 0)) as remaining_amount,
                    COALESCE(d.due_date, s.due_date) as due_date,
                    d.status as debt_status,
                    CASE 
                        WHEN d.amount <= 0 THEN 'paid'
                        WHEN COALESCE(s.paid_amount, 0) >= s.total_amount THEN 'paid'
                        WHEN COALESCE(s.paid_amount, 0) > 0 THEN 'partial'
                        ELSE 'pending'
                    END as calculated_status,
                    d.notes,
                    s.created_at,
                    s.updated_at
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.id
                LEFT JOIN debts d ON s.id = d.sale_id
                WHERE s.id = ?
            "#;

            result = sqlx::query(query)
                .bind(id)
                .fetch_optional(&db.pool)
                .await?;
        }

        if let Some(row) = result {
            Ok(Some(DebtDetail {
                debt_id: row.get("debt_id"),
                sale_id: row.get("sale_id"),
                invoice_no: row.get("invoice_no"),
                customer_id: row.get("customer_id"),
                customer_name: row.get("customer_name"),
                customer_email: row.get("customer_email"),
                customer_phone: row.get("customer_phone"),
                customer_address: row.get("customer_address"),
                total_amount: row.get("total_amount"),
                paid_amount: row.get("paid_amount"),
                debt_amount: row.get("debt_amount"),
                remaining_amount: row.get("remaining_amount"),
                due_date: row.get("due_date"),
                debt_status: row.get("debt_status"),
                calculated_status: row.get("calculated_status"),
                notes: row.get("notes"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            }))
        } else {
        Ok(None)
        }
    }

    // Update debt
    pub async fn update(&self, db: &Database, id: i64, payload: UpdateDebtRequest) -> Result<DebtDetail> {
        // Update the sale record
        let update_query = r#"
            UPDATE sales 
            SET 
                paid_amount = ?,
                due_date = ?,
                payment_status = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        "#;

        sqlx::query(update_query)
            .bind(payload.paid_amount)
            .bind(payload.due_date)
            .bind(&payload.status)
            .bind(id)
            .execute(&db.pool)
            .await?;

        // Get updated debt
        self.get_by_id(db, id).await?.ok_or_else(|| anyhow::anyhow!("Debt not found"))
    }

    // Delete debt (mark as paid)
    pub async fn delete(&self, db: &Database, id: i64) -> Result<()> {
        let query = r#"
            UPDATE sales 
            SET 
                payment_status = 'paid',
                paid_amount = total_amount,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        "#;

        sqlx::query(query)
            .bind(id)
            .execute(&db.pool)
            .await?;

        Ok(())
    }

    // Repay debt with receipt (simplified version)
    pub async fn repay_debt(&self, db: &Database, id: i64, payload: RepayDebtRequest) -> Result<RepayDebtResponse> {
        // Get debt details
        let debt = self.get_by_id(db, id).await?
            .ok_or_else(|| anyhow::anyhow!("Debt not found"))?;

        // Validate payment amount
        if payload.paid_amount <= 0.0 {
            return Err(anyhow::anyhow!("Payment amount must be greater than 0"));
        }

        // Calculate new paid amount
        let new_paid_amount = debt.paid_amount + payload.paid_amount;
        let final_paid_amount = new_paid_amount.min(debt.total_amount);
        let final_remaining_amount = debt.total_amount - final_paid_amount;

        // Determine new payment status
        let new_payment_status = if final_paid_amount >= debt.total_amount {
            "paid"
        } else if final_paid_amount > 0.0 {
            "partial"
        } else {
            "unpaid"
        };

        // Update the sale
        sqlx::query(r#"
            UPDATE sales 
            SET paid_amount = ?, 
                payment_status = ?,
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        "#)
        .bind(final_paid_amount)
        .bind(new_payment_status)
        .bind(debt.sale_id)
        .execute(&db.pool)
        .await?;

        // Update or delete the debt record
        if new_payment_status == "paid" || final_remaining_amount <= 0.0 {
            // Delete debt if fully paid
            sqlx::query("DELETE FROM debts WHERE sale_id = ?")
                .bind(debt.sale_id)
                .execute(&db.pool)
                .await?;
        } else {
            // Update debt amount and status
            sqlx::query(r#"
                UPDATE debts 
                SET amount = ?, 
                    status = ?,
                    updated_at = CURRENT_TIMESTAMP 
                WHERE sale_id = ?
            "#)
            .bind(final_remaining_amount)
            .bind(if new_payment_status == "unpaid" { "unpaid" } else { "partial" })
            .bind(debt.sale_id)
            .execute(&db.pool)
            .await?;
        }

        // Create applied payment record
        let applied_payment = AppliedPayment {
            debt_id: debt.sale_id,
            amount: payload.paid_amount.min(debt.remaining_amount),
            invoice_no: debt.invoice_no,
        };

        // Calculate excess amount
        let excess_amount = if payload.paid_amount > debt.remaining_amount {
            payload.paid_amount - debt.remaining_amount
        } else {
            0.0
        };

        // Get updated debt
        let updated_debt = self.get_by_id(db, id).await?
            .ok_or_else(|| anyhow::anyhow!("Failed to get updated debt"))?;

        Ok(RepayDebtResponse {
            debt: updated_debt,
            receipt: None, // TODO: Implement customer receipt creation
            applied_payments: vec![applied_payment],
            excess_amount,
            total_paid: payload.paid_amount,
        })
    }

    // Legacy repay debt method
    pub async fn repay_debt_legacy(&self, db: &Database, payload: RepayDebtLegacyRequest) -> Result<Value> {
        // This is a simplified legacy implementation
        // In a real implementation, you would need the debt ID
        Ok(serde_json::json!({
            "success": true,
            "message": "Legacy debt repayment not fully implemented"
        }))
    }
}
