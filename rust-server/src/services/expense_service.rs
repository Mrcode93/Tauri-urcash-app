use anyhow::Result;
use crate::database::Database;
use crate::models::{
    expense::*,
    ApiResponse,
    PaginatedResponse
};
use sqlx::Row;
use chrono::{Utc, DateTime};
use crate::models::PaginationInfo;

#[derive(Clone)]
pub struct ExpenseService;

impl ExpenseService {
    pub fn new() -> Self {
        Self
    }

    // Get all expenses
    pub async fn get_all(&self, db: &Database, query: &ExpenseQuery) -> Result<ExpenseListResponse> {
        let page = query.page.unwrap_or(1);
        let limit = query.limit.unwrap_or(50);
        let offset = (page - 1) * limit;

        let mut where_conditions = vec!["1=1".to_string()];
        let mut query_params: Vec<String> = vec![];

        if let Some(ref search) = query.search {
            where_conditions.push("(description LIKE ? OR category LIKE ?)".to_string());
            let search_term = format!("%{}%", search);
            query_params.push(search_term.clone());
            query_params.push(search_term);
        }

        if let Some(ref category) = query.category {
            where_conditions.push("category = ?".to_string());
            query_params.push(category.clone());
        }

        if let Some(start_date) = query.start_date {
            where_conditions.push("date >= ?".to_string());
            query_params.push(start_date.to_string());
        }

        if let Some(end_date) = query.end_date {
            where_conditions.push("date <= ?".to_string());
            query_params.push(end_date.to_string());
        }

        let where_clause = where_conditions.join(" AND ");

        // Get total count
        let count_query = format!(
            "SELECT COUNT(*) as total FROM expenses WHERE {}",
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

        // Get expenses
        let query_str = format!(
            r#"
            SELECT 
                id, description, amount, category, date, money_box_id, created_by, created_at, updated_at
            FROM expenses
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

        let expenses = query_builder
            .fetch_all(&db.pool)
            .await?
            .into_iter()
            .map(|row| Expense {
                id: row.get("id"),
                description: row.get("description"),
                amount: row.get("amount"),
                category: row.get("category"),
                date: row.get("date"),
                money_box_id: row.get("money_box_id"),
                created_by: row.get("created_by"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            })
            .collect();

        let total_pages = (total + limit - 1) / limit;

        Ok(ExpenseListResponse {
            expenses,
            pagination: PaginationInfo {
                page,
                limit,
                total,
                total_pages,
            },
        })
    }

    // Get expense by ID
    pub async fn get_by_id(&self, db: &Database, id: i64) -> Result<Option<Expense>> {
        let query = r#"
            SELECT 
                id, description, amount, category, date, money_box_id, created_by, created_at, updated_at
            FROM expenses
            WHERE id = ?
        "#;

        let result = sqlx::query(query)
            .bind(id)
            .fetch_optional(&db.pool)
            .await?;

        if let Some(row) = result {
            Ok(Some(Expense {
                id: row.get("id"),
                description: row.get("description"),
                amount: row.get("amount"),
                category: row.get("category"),
                date: row.get("date"),
                money_box_id: row.get("money_box_id"),
                created_by: row.get("created_by"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            }))
        } else {
            Ok(None)
        }
    }

    // Get expenses by category
    pub async fn get_by_category(&self, db: &Database, category: &str) -> Result<Vec<Expense>> {
        let query = r#"
            SELECT 
                id, description, amount, category, date, money_box_id, created_by, created_at, updated_at
            FROM expenses
            WHERE category = ?
            ORDER BY created_at DESC
        "#;

        let expenses = sqlx::query(query)
            .bind(category)
            .fetch_all(&db.pool)
            .await?
            .into_iter()
            .map(|row| Expense {
                id: row.get("id"),
                description: row.get("description"),
                amount: row.get("amount"),
                category: row.get("category"),
                date: row.get("date"),
                money_box_id: row.get("money_box_id"),
                created_by: row.get("created_by"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            })
            .collect();

        Ok(expenses)
    }

    // Get expenses by date range
    pub async fn get_by_date_range(&self, db: &Database, start_date: &str, end_date: &str) -> Result<Vec<Expense>> {
        let query = r#"
            SELECT 
                id, description, amount, category, date, money_box_id, created_by, created_at, updated_at
            FROM expenses
            WHERE date BETWEEN ? AND ?
            ORDER BY date DESC
        "#;

        let expenses = sqlx::query(query)
            .bind(start_date)
            .bind(end_date)
            .fetch_all(&db.pool)
            .await?
            .into_iter()
            .map(|row| Expense {
                id: row.get("id"),
                description: row.get("description"),
                amount: row.get("amount"),
                category: row.get("category"),
                date: row.get("date"),
                money_box_id: row.get("money_box_id"),
                created_by: row.get("created_by"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            })
            .collect();

        Ok(expenses)
    }

    // Create new expense
    pub async fn create(&self, db: &Database, payload: CreateExpenseRequest) -> Result<Expense> {
        // Validate required fields
        if payload.description.trim().is_empty() {
            return Err(anyhow::anyhow!("وصف المصروف مطلوب"));
        }
        
        if payload.amount <= 0.0 {
            return Err(anyhow::anyhow!("المبلغ يجب أن يكون أكبر من صفر"));
        }
        
        if payload.category.trim().is_empty() {
            return Err(anyhow::anyhow!("فئة المصروف مطلوبة"));
        }

        let sql = r#"
            INSERT INTO expenses (description, amount, category, date, money_box_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        "#;

        let result = sqlx::query(sql)
            .bind(&payload.description.trim())
            .bind(payload.amount)
            .bind(&payload.category.trim())
            .bind(payload.date)
            .bind(payload.money_box_id)
            .execute(&db.pool)
            .await?;

        // Get the created expense
        let expense = self.get_by_id(db, result.last_insert_rowid()).await?;
        if let Some(expense) = expense {
            Ok(expense)
        } else {
            Err(anyhow::anyhow!("فشل في إنشاء المصروف"))
        }
    }

    // Update expense
    pub async fn update(&self, db: &Database, id: i64, payload: UpdateExpenseRequest) -> Result<Expense> {
        // Check if expense exists
        let existing = self.get_by_id(db, id).await?;
        if existing.is_none() {
            return Err(anyhow::anyhow!("المصروف غير موجود"));
        }

        // Validate required fields
        if payload.description.trim().is_empty() {
            return Err(anyhow::anyhow!("وصف المصروف مطلوب"));
        }
        
        if payload.amount <= 0.0 {
            return Err(anyhow::anyhow!("المبلغ يجب أن يكون أكبر من صفر"));
        }
        
        if payload.category.trim().is_empty() {
            return Err(anyhow::anyhow!("فئة المصروف مطلوبة"));
        }

        let sql = r#"
            UPDATE expenses
            SET description = ?, amount = ?, category = ?, date = ?, money_box_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        "#;

        let changes = sqlx::query(sql)
            .bind(&payload.description.trim())
            .bind(payload.amount)
            .bind(&payload.category.trim())
            .bind(payload.date)
            .bind(payload.money_box_id)
            .bind(id)
            .execute(&db.pool)
            .await?;

        if changes.rows_affected() == 0 {
            return Err(anyhow::anyhow!("فشل في تحديث المصروف"));
        }

        // Get the updated expense
        let expense = self.get_by_id(db, id).await?;
        if let Some(expense) = expense {
            Ok(expense)
        } else {
            Err(anyhow::anyhow!("فشل في تحديث المصروف"))
        }
    }

    // Delete expense
    pub async fn delete(&self, db: &Database, id: i64) -> Result<Expense> {
        // Check if expense exists
        let expense = self.get_by_id(db, id).await?;
        if expense.is_none() {
            return Err(anyhow::anyhow!("المصروف غير موجود"));
        }
        let expense = expense.unwrap();

        let changes = sqlx::query("DELETE FROM expenses WHERE id = ?")
            .bind(id)
            .execute(&db.pool)
            .await?;

        if changes.rows_affected() == 0 {
            return Err(anyhow::anyhow!("فشل في حذف المصروف"));
        }

        Ok(expense)
    }

    // Get total by category
    pub async fn get_total_by_category(&self, db: &Database, start_date: &str, end_date: &str) -> Result<Vec<ExpenseTotalByCategory>> {
        let query = r#"
            SELECT 
                category,
                SUM(amount) as total_amount,
                COUNT(id) as expense_count
            FROM expenses
            WHERE date BETWEEN ? AND ?
            GROUP BY category
            ORDER BY total_amount DESC
        "#;

        let totals = sqlx::query(query)
            .bind(start_date)
            .bind(end_date)
            .fetch_all(&db.pool)
            .await?
            .into_iter()
            .map(|row| ExpenseTotalByCategory {
                category: row.get("category"),
                total_amount: row.get("total_amount"),
                expense_count: row.get("expense_count"),
            })
            .collect();

        Ok(totals)
    }

    // Get total by date range
    pub async fn get_total_by_date_range(&self, db: &Database, start_date: &str, end_date: &str) -> Result<ExpenseTotalByDateRange> {
        let query = r#"
            SELECT 
                SUM(amount) as total_amount,
                COUNT(id) as expense_count
            FROM expenses
            WHERE date BETWEEN ? AND ?
        "#;

        let result = sqlx::query(query)
            .bind(start_date)
            .bind(end_date)
            .fetch_one(&db.pool)
            .await?;

        Ok(ExpenseTotalByDateRange {
            total_amount: result.get::<Option<f64>, _>("total_amount").unwrap_or(0.0),
            expense_count: result.get::<Option<i64>, _>("expense_count").unwrap_or(0),
        })
    }
}
