use anyhow::Result;
use crate::database::Database;
use crate::models::{
    Employee, CreateEmployeeRequest, UpdateEmployeeRequest, EmployeeQuery, EmployeeFilters,
    EmployeeListResponse, ApiResponse, PaginatedResponse
};
use sqlx::Row;
use chrono::{Utc, DateTime};
use crate::models::PaginationInfo;
use serde_json::Value;

#[derive(Clone)]
pub struct EmployeeService;

impl EmployeeService {
    pub fn new() -> Self {
        Self
    }

    // Get all employees with pagination and search
    pub async fn get_all(&self, db: &Database, query: &EmployeeQuery) -> Result<EmployeeListResponse> {
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
            "SELECT COUNT(*) as total FROM employees WHERE {}",
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

        // Get employees
        let query_str = format!(
            r#"
            SELECT 
                id, name, phone, email, address, salary, commission_rate, commission_type, 
                commission_amount, commission_start_date, commission_end_date, created_at, updated_at
            FROM employees
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

        let employees = query_builder
            .fetch_all(&db.pool)
            .await?
            .into_iter()
            .map(|row| Employee {
                id: row.get("id"),
                name: row.get("name"),
                phone: row.get("phone"),
                email: row.get("email"),
                address: row.get("address"),
                salary: row.get("salary"),
                commission_rate: row.get("commission_rate"),
                commission_type: row.get("commission_type"),
                commission_amount: row.get("commission_amount"),
                commission_start_date: row.get("commission_start_date"),
                commission_end_date: row.get("commission_end_date"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            })
            .collect();

        let total_pages = (total + limit - 1) / limit;

        Ok(EmployeeListResponse {
            employees,
            pagination: PaginationInfo {
                page,
                limit,
                total,
                total_pages,
            },
        })
    }

    // Get employee by ID
    pub async fn get_by_id(&self, db: &Database, id: i64) -> Result<Option<Employee>> {
        let query = r#"
            SELECT 
                id, name, phone, email, address, salary, commission_rate, commission_type, 
                commission_amount, commission_start_date, commission_end_date, created_at, updated_at
            FROM employees
            WHERE id = ?
        "#;

        let result = sqlx::query(query)
            .bind(id)
            .fetch_optional(&db.pool)
            .await?;

        if let Some(row) = result {
            Ok(Some(Employee {
                id: row.get("id"),
                name: row.get("name"),
                phone: row.get("phone"),
                email: row.get("email"),
                address: row.get("address"),
                salary: row.get("salary"),
                commission_rate: row.get("commission_rate"),
                commission_type: row.get("commission_type"),
                commission_amount: row.get("commission_amount"),
                commission_start_date: row.get("commission_start_date"),
                commission_end_date: row.get("commission_end_date"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            }))
        } else {
            Ok(None)
        }
    }

    // Create new employee
    pub async fn create(&self, db: &Database, payload: CreateEmployeeRequest) -> Result<Value, anyhow::Error> {
        let employee_id = sqlx::query(r#"
            INSERT INTO employees (name, email, phone, address, position, salary, commission_rate, is_active, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#)
        .bind(&payload.name)
        .bind(&payload.email)
        .bind(&payload.phone)
        .bind(&payload.address)
        .bind(&payload.position)
        .bind(payload.salary)
        .bind(payload.commission_rate)
        .bind(payload.is_active)
        .bind(&payload.notes)
        .execute(&db.pool)
        .await?
        .last_insert_rowid();

        let employee = self.get_by_id(db, employee_id).await?;
        
        Ok(serde_json::json!({
            "success": true,
            "message": "تم إنشاء الموظف بنجاح",
            "data": employee
        }))
    }

    // Update employee
    pub async fn update(&self, db: &Database, id: i64, payload: UpdateEmployeeRequest) -> Result<Value, anyhow::Error> {
        let changes = sqlx::query(r#"
            UPDATE employees 
            SET name = ?, email = ?, phone = ?, address = ?, position = ?, salary = ?, commission_rate = ?, is_active = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        "#)
        .bind(&payload.name)
        .bind(&payload.email)
        .bind(&payload.phone)
        .bind(&payload.address)
        .bind(&payload.position)
        .bind(payload.salary)
        .bind(payload.commission_rate)
        .bind(payload.is_active)
        .bind(&payload.notes)
        .bind(id)
        .execute(&db.pool)
        .await?;

        if changes.rows_affected() == 0 {
            return Ok(serde_json::json!({
                "success": false,
                "message": "الموظف غير موجود"
            }));
        }

        let employee = self.get_by_id(db, id).await?;
        
        Ok(serde_json::json!({
            "success": true,
            "message": "تم تحديث بيانات الموظف بنجاح",
            "data": employee
        }))
    }

    // Delete employee
    pub async fn delete(&self, db: &Database, id: i64) -> Result<()> {
        // Check if employee exists
        let existing = sqlx::query("SELECT id FROM employees WHERE id = ?")
            .bind(id)
            .fetch_optional(&db.pool)
            .await?;

        if existing.is_none() {
            return Err(anyhow::anyhow!("Employee not found"));
        }

        sqlx::query("DELETE FROM employees WHERE id = ?")
            .bind(id)
            .execute(&db.pool)
            .await?;

        Ok(())
    }

    // Get employees for dropdown
    pub async fn get_dropdown_list(&self, db: &Database) -> Result<Value, anyhow::Error> {
        let employees = sqlx::query(r#"
            SELECT id, name, position
            FROM employees
            WHERE is_active = 1
            ORDER BY name ASC
        "#)
        .fetch_all(&db.pool)
        .await?
        .into_iter()
        .map(|row| crate::models::EmployeeDropdown {
            id: row.get("id"),
            name: row.get("name"),
            position: row.get("position"),
        })
        .collect::<Vec<_>>();

        Ok(serde_json::json!({
            "success": true,
            "data": employees
        }))
    }

    // Get employees with commission information
    pub async fn get_commission_list(&self, db: &Database) -> Result<Value, anyhow::Error> {
        let employees = sqlx::query(r#"
            SELECT 
                e.id, e.name, e.commission_rate,
                COALESCE(SUM(si.quantity * si.price), 0) as total_sales,
                COALESCE(SUM(si.quantity * si.price * e.commission_rate / 100), 0) as total_commission
            FROM employees e
            LEFT JOIN sales s ON s.employee_id = e.id
            LEFT JOIN sale_items si ON s.id = si.sale_id
            WHERE e.is_active = 1 AND s.status != 'returned'
            GROUP BY e.id, e.name, e.commission_rate
            ORDER BY total_commission DESC
        "#)
        .fetch_all(&db.pool)
        .await?
        .into_iter()
        .map(|row| crate::models::EmployeeWithCommission {
            id: row.get("id"),
            name: row.get("name"),
            commission_rate: row.get("commission_rate"),
            total_sales: row.get("total_sales"),
            total_commission: row.get("total_commission"),
        })
        .collect::<Vec<_>>();

        Ok(serde_json::json!({
            "success": true,
            "data": employees
        }))
    }

    // Calculate commission for an employee
    pub async fn calculate_commission(&self, db: &Database, payload: crate::models::CalculateCommissionRequest) -> Result<Value, anyhow::Error> {
        let employee = self.get_by_id(db, payload.employee_id).await?;
        if employee.is_none() {
            return Ok(serde_json::json!({
                "success": false,
                "message": "الموظف غير موجود"
            }));
        }

        let employee = employee.unwrap();
        let commission_amount = payload.sales_amount * employee.commission_rate / 100.0;

        let calculation = crate::models::CommissionCalculation {
            employee_id: payload.employee_id,
            employee_name: employee.name,
            sales_amount: payload.sales_amount,
            commission_rate: employee.commission_rate,
            commission_amount,
        };

        Ok(serde_json::json!({
            "success": true,
            "data": calculation
        }))
    }
}
