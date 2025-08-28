use anyhow::Result;
use crate::database::Database;
use crate::models::{
    Employee, EmployeeQuery, CreateEmployeeRequest, UpdateEmployeeRequest, 
    CalculateCommissionRequest, CommissionCalculation, EmployeeListResponse, 
    EmployeeDropdown, EmployeeWithCommission
};
use crate::models::PaginationInfo;
use sqlx::{Row, SqlitePool};
use tracing::{info, warn, error};
use chrono::{Utc, DateTime, NaiveDate};
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
    pub async fn create(&self, db: &Database, payload: CreateEmployeeRequest) -> Result<Value> {
        // Validate required fields
        if payload.name.trim().is_empty() {
            return Err(anyhow::anyhow!("Name is required"));
        }

        // Validate commission rate
        if let Some(rate) = payload.commission_rate {
            if rate < 0.0 || rate > 100.0 {
                return Err(anyhow::anyhow!("Commission rate must be between 0 and 100"));
            }
        }

        // Validate commission amount
        if let Some(amount) = payload.commission_amount {
            if amount < 0.0 {
                return Err(anyhow::anyhow!("Commission amount cannot be negative"));
            }
        }

        // Validate salary
        if let Some(salary) = payload.salary {
            if salary < 0.0 {
                return Err(anyhow::anyhow!("Salary cannot be negative"));
            }
        }

        let sql = r#"
            INSERT INTO employees (
                name, phone, email, address, salary, commission_rate, commission_type, 
                commission_amount, commission_start_date, commission_end_date, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        "#;

        let result = sqlx::query(sql)
            .bind(&payload.name)
            .bind(&payload.phone)
            .bind(&payload.email)
            .bind(&payload.address)
            .bind(payload.salary.unwrap_or(0.0))
            .bind(payload.commission_rate.unwrap_or(0.0))
            .bind(payload.commission_type.unwrap_or_else(|| "percentage".to_string()))
            .bind(payload.commission_amount.unwrap_or(0.0))
            .bind(&payload.commission_start_date)
            .bind(&payload.commission_end_date)
            .execute(&db.pool)
            .await?;

        Ok(serde_json::json!({
            "id": result.last_insert_rowid(),
            "message": "تم إنشاء الموظف بنجاح"
        }))
    }

    // Update employee
    pub async fn update(&self, db: &Database, id: i64, payload: UpdateEmployeeRequest) -> Result<Value> {
        // Check if employee exists
        let existing = sqlx::query("SELECT id FROM employees WHERE id = ?")
            .bind(id)
            .fetch_optional(&db.pool)
            .await?;

        if existing.is_none() {
            return Err(anyhow::anyhow!("Employee not found"));
        }

        // Validate required fields
        if payload.name.trim().is_empty() {
            return Err(anyhow::anyhow!("Name is required"));
        }

        // Validate commission rate
        if let Some(rate) = payload.commission_rate {
            if rate < 0.0 || rate > 100.0 {
                return Err(anyhow::anyhow!("Commission rate must be between 0 and 100"));
            }
        }

        // Validate commission amount
        if let Some(amount) = payload.commission_amount {
            if amount < 0.0 {
                return Err(anyhow::anyhow!("Commission amount cannot be negative"));
            }
        }

        // Validate salary
        if let Some(salary) = payload.salary {
            if salary < 0.0 {
                return Err(anyhow::anyhow!("Salary cannot be negative"));
            }
        }

        let sql = r#"
            UPDATE employees 
            SET name = ?, phone = ?, email = ?, address = ?, salary = ?, 
                commission_rate = ?, commission_type = ?, commission_amount = ?, 
                commission_start_date = ?, commission_end_date = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        "#;

        sqlx::query(sql)
            .bind(&payload.name)
            .bind(&payload.phone)
            .bind(&payload.email)
            .bind(&payload.address)
            .bind(payload.salary.unwrap_or(0.0))
            .bind(payload.commission_rate.unwrap_or(0.0))
            .bind(payload.commission_type.unwrap_or_else(|| "percentage".to_string()))
            .bind(payload.commission_amount.unwrap_or(0.0))
            .bind(&payload.commission_start_date)
            .bind(&payload.commission_end_date)
            .bind(id)
            .execute(&db.pool)
            .await?;

        Ok(serde_json::json!({
            "success": true,
            "message": "تم تحديث الموظف بنجاح"
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
    pub async fn get_dropdown_list(&self, db: &Database) -> Result<Value> {
        let sql = r#"
            SELECT id, name, phone 
            FROM employees 
            ORDER BY name
        "#;

        let employees: Vec<EmployeeDropdown> = sqlx::query(sql)
            .fetch_all(&db.pool)
            .await?
            .into_iter()
            .map(|row| EmployeeDropdown {
                id: row.get("id"),
                name: row.get("name"),
                phone: row.get("phone"),
            })
            .collect();

        Ok(serde_json::json!({
            "employees": employees
        }))
    }

    // Get employees with commission information
    pub async fn get_commission_list(&self, db: &Database) -> Result<Value> {
        let sql = r#"
            SELECT 
                id, name, phone, email, salary, commission_rate, 
                commission_type, commission_amount, commission_start_date, 
                commission_end_date
            FROM employees 
            WHERE commission_rate > 0 OR commission_amount > 0
            ORDER BY name
        "#;

        let employees: Vec<EmployeeWithCommission> = sqlx::query(sql)
            .fetch_all(&db.pool)
            .await?
            .into_iter()
            .map(|row| EmployeeWithCommission {
                id: row.get("id"),
                name: row.get("name"),
                phone: row.get("phone"),
                email: row.get("email"),
                salary: row.get("salary"),
                commission_rate: row.get("commission_rate"),
                commission_type: row.get("commission_type"),
                commission_amount: row.get("commission_amount"),
                commission_start_date: row.get("commission_start_date"),
                commission_end_date: row.get("commission_end_date"),
            })
            .collect();

        Ok(serde_json::json!({
            "employees": employees
        }))
    }

    // Calculate commission for an employee
    pub async fn calculate_commission(&self, db: &Database, payload: CalculateCommissionRequest) -> Result<Value> {
        let employee = self.get_by_id(db, payload.employee_id).await?;
        if employee.is_none() {
            return Err(anyhow::anyhow!("Employee not found"));
        }
        let employee = employee.unwrap();

        let mut commission = 0.0;

        if employee.commission_type == "percentage" && employee.commission_rate > 0.0 {
            commission = (payload.sales_amount * employee.commission_rate) / 100.0;
        } else if employee.commission_type == "fixed" && employee.commission_amount > 0.0 {
            commission = employee.commission_amount;
        }

        let calculation = CommissionCalculation {
            employee_id: payload.employee_id,
            employee_name: employee.name,
            sales_amount: payload.sales_amount,
            commission_rate: employee.commission_rate,
            commission_type: employee.commission_type,
            commission_amount: employee.commission_amount,
            calculated_commission: commission,
        };

        Ok(serde_json::json!({
            "calculation": calculation
        }))
    }
}
