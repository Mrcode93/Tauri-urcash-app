use anyhow::Result;
use crate::database::Database;
use crate::models::{
    Customer, CreateCustomerRequest, UpdateCustomerRequest, CustomerQuery, CustomerFilters,
    CustomerListResponse, CustomerWithSales, CustomerDetails, CustomerInstallment,
    CustomerBill, CustomerReceipt, CustomerFinancialSummary, CustomerSale, CustomerSaleItem,
    ApiResponse, PaginatedResponse, CustomerSaleDebt
};
use sqlx::Row;
use tracing::{info, warn};
use chrono::{Utc, DateTime};
use crate::models::PaginationInfo;

#[derive(Clone)]
pub struct CustomerService;

impl CustomerService {
    pub fn new() -> Self {
        Self
    }

    // Convert customer data from database format (similar to Node.js _convertCustomerData)
    fn convert_customer_data(&self, customer: Option<Customer>) -> Option<Customer> {
        customer
    }

    // Convert array of customer data
    fn convert_customers_data(&self, customers: Vec<Customer>) -> Vec<Customer> {
        customers
    }

    // Load all customers into cache (placeholder for now)
    pub async fn load_all_customers_to_cache(&self, _db: &Database) -> Result<Vec<Customer>> {
        // TODO: Implement cache service
        Ok(vec![])
    }

    // Get all customers with search and pagination
    pub async fn get_all(
        &self,
        db: &Database,
        filters: Option<CustomerFilters>,
        page: Option<i64>,
        limit: Option<i64>,
    ) -> Result<CustomerListResponse> {
        let filters = filters.unwrap_or_default();
        let page = page.unwrap_or(1);
        let limit = limit.unwrap_or(50);
        let offset = (page - 1) * limit;

        // Build WHERE conditions
        let mut where_conditions = vec!["1=1".to_string()];
        let mut values: Vec<String> = vec![];

        // Add search filter
        if let Some(search) = filters.search {
            where_conditions.push("(name LIKE ? OR email LIKE ? OR phone LIKE ? OR address LIKE ?)".to_string());
            let search_pattern = format!("%{}%", search);
            values.push(search_pattern.clone());
            values.push(search_pattern.clone());
            values.push(search_pattern.clone());
            values.push(search_pattern);
        }

        // Add exclude anonymous filter
        if filters.exclude_anonymous.unwrap_or(true) {
            where_conditions.push("LOWER(name) != ?".to_string());
            values.push("anonymous".to_string());
        }

        let where_clause = where_conditions.join(" AND ");

        // Optimized query with pagination
        let query = format!(
            r#"
            SELECT 
                id,
                name,
                email,
                phone,
                address,
                credit_limit,
                current_balance,
                is_active,
                customer_type,
                tax_number,
                due_date,
                representative_id,
                created_at,
                updated_at
            FROM customers
            WHERE {}
            ORDER BY name ASC
            LIMIT ? OFFSET ?
            "#,
            where_clause
        );

        // Get total count for pagination
        let count_query = format!(
            "SELECT COUNT(*) as total FROM customers WHERE {}",
            where_clause
        );

        // Execute queries
        let mut query_builder = sqlx::query_as::<_, Customer>(&query);
        let mut count_builder = sqlx::query(&count_query);

        // Add values to query builders
        for value in values.iter() {
            query_builder = query_builder.bind(value);
            count_builder = count_builder.bind(value);
        }

        let customers = query_builder
            .bind(limit)
            .bind(offset)
            .fetch_all(&db.pool)
            .await?;

        let total_result = count_builder.fetch_one(&db.pool).await?;
        let total: i64 = total_result.get("total");

        let total_pages = (total + limit - 1) / limit;

        Ok(CustomerListResponse {
            items: self.convert_customers_data(customers),
            total,
            page,
            limit,
            total_pages,
            has_more: page < total_pages,
        })
    }

    // Get customer by ID
    pub async fn get_by_id(&self, db: &Database, id: i64) -> Result<Option<Customer>> {
        let customer = sqlx::query_as::<_, Customer>(
            "SELECT * FROM customers WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(&db.pool)
        .await?;

        Ok(self.convert_customer_data(customer))
    }

    // Create new customer
    pub async fn create(&self, db: &Database, data: CreateCustomerRequest) -> Result<Customer> {
        // Convert empty email strings to null
        let email = if data.email.as_deref() == Some("") {
            None
        } else {
            data.email
        };

        // Convert boolean values to integers for SQLite compatibility
        let is_active = data.is_active.unwrap_or(true) as i64;

        let last_id = sqlx::query(
            r#"
            INSERT INTO customers (
                name, email, phone, address, credit_limit, customer_type,
                tax_number, due_date, representative_id, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&data.name)
        .bind(email)
        .bind(&data.phone)
        .bind(&data.address)
        .bind(data.credit_limit.unwrap_or(1000000.0))
        .bind(data.customer_type.unwrap_or_else(|| "retail".to_string()))
        .bind(&data.tax_number)
        .bind(data.due_date)
        .bind(data.representative_id)
        .bind(is_active)
        .execute(&db.pool)
        .await?
        .last_insert_rowid();

        self.get_by_id(db, last_id).await?.ok_or_else(|| {
            anyhow::anyhow!("Failed to retrieve created customer")
        })
    }

    // Update customer
    pub async fn update(&self, db: &Database, id: i64, data: UpdateCustomerRequest) -> Result<Option<Customer>> {
        // Convert empty email strings to null
        let email = if data.email.as_deref() == Some("") {
            None
        } else {
            data.email
        };

        // Convert boolean values to integers for SQLite compatibility
        let is_active = data.is_active.map(|b| b as i64);

        let mut query_builder = sqlx::query(
            r#"
            UPDATE customers SET
                name = COALESCE(?, name),
                email = ?,
                phone = COALESCE(?, phone),
                address = COALESCE(?, address),
                credit_limit = COALESCE(?, credit_limit),
                customer_type = COALESCE(?, customer_type),
                tax_number = COALESCE(?, tax_number),
                due_date = COALESCE(?, due_date),
                representative_id = COALESCE(?, representative_id),
                is_active = COALESCE(?, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            "#
        )
        .bind(&data.name)
        .bind(email)
        .bind(&data.phone)
        .bind(&data.address)
        .bind(data.credit_limit)
        .bind(&data.customer_type)
        .bind(&data.tax_number)
        .bind(data.due_date)
        .bind(data.representative_id)
        .bind(is_active)
        .bind(id);

        let changes = query_builder.execute(&db.pool).await?.rows_affected();

        if changes > 0 {
            self.get_by_id(db, id).await
        } else {
        Ok(None)
        }
    }

    // Delete customer
    pub async fn delete(&self, db: &Database, id: i64) -> Result<bool> {
        let changes = sqlx::query("DELETE FROM customers WHERE id = ?")
            .bind(id)
            .execute(&db.pool)
            .await?
            .rows_affected();

        Ok(changes > 0)
    }

    // Search customers
    pub async fn search_customers(&self, db: &Database, query: &str) -> Result<Vec<Customer>> {
        let search_pattern = format!("%{}%", query);
        
        let customers = sqlx::query_as::<_, Customer>(
            r#"
            SELECT * FROM customers 
            WHERE (name LIKE ? OR email LIKE ? OR phone LIKE ? OR address LIKE ?)
            AND LOWER(name) != 'anonymous'
            ORDER BY name ASC
            "#
        )
        .bind(&search_pattern)
        .bind(&search_pattern)
        .bind(&search_pattern)
        .bind(&search_pattern)
        .fetch_all(&db.pool)
        .await?;

        Ok(self.convert_customers_data(customers))
    }

    // Get customer with sales history
    pub async fn get_customer_with_sales(&self, db: &Database, customer_id: i64) -> Result<Option<CustomerWithSales>> {
        let customer = self.get_by_id(db, customer_id).await?;
        if customer.is_none() {
            return Ok(None);
        }
        let customer = customer.unwrap();

        // Get sales with items
        let sales = sqlx::query_as::<_, CustomerSale>(
            r#"
            SELECT 
                s.id,
                s.invoice_no,
                s.customer_id,
                s.total_amount,
                s.paid_amount,
                s.payment_status,
                s.status,
                s.created_at,
                s.updated_at
            FROM sales s
            WHERE s.customer_id = ?
            ORDER BY s.created_at DESC
            "#
        )
        .bind(customer_id)
        .fetch_all(&db.pool)
        .await?;

        // For now, return sales without items (would need to join with sale_items table)
        let sales_with_items: Vec<CustomerSale> = sales;

        Ok(Some(CustomerWithSales {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            credit_limit: customer.credit_limit,
            current_balance: customer.current_balance,
            is_active: customer.is_active,
            customer_type: customer.customer_type,
            tax_number: customer.tax_number,
            due_date: customer.due_date,
            representative_id: customer.representative_id,
            created_at: customer.created_at,
            updated_at: customer.updated_at,
            sales: sales_with_items,
        }))
    }

    // Get customer debts
    pub async fn get_customer_debts(&self, db: &Database, customer_id: i64) -> Result<Vec<CustomerSaleDebt>> {
        let debts = sqlx::query_as::<_, CustomerSaleDebt>(
            r#"
            SELECT 
                s.id as sale_id,
                s.invoice_no,
                s.customer_id,
                c.name as customer_name,
                s.total_amount,
                s.paid_amount,
                (s.total_amount - COALESCE(s.paid_amount, 0)) as remaining_amount,
                s.due_date,
                CASE 
                    WHEN s.paid_amount >= s.total_amount THEN 'paid'
                    WHEN s.paid_amount > 0 THEN 'partial'
                    ELSE 'pending'
                END as status,
                s.created_at,
                s.updated_at
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            WHERE s.customer_id = ? AND s.total_amount > COALESCE(s.paid_amount, 0)
            ORDER BY s.due_date ASC
            "#
        )
        .bind(customer_id)
        .fetch_all(&db.pool)
        .await?;

        Ok(debts)
    }

    // Get customer installments
    pub async fn get_customer_installments(&self, db: &Database, customer_id: i64) -> Result<Vec<CustomerInstallment>> {
        let installments = sqlx::query_as::<_, CustomerInstallment>(
            r#"
            SELECT 
                i.*,
                s.invoice_no
            FROM installments i
            LEFT JOIN sales s ON i.sale_id = s.id
            WHERE i.customer_id = ?
            ORDER BY i.due_date ASC
            "#
        )
        .bind(customer_id)
        .fetch_all(&db.pool)
        .await?;

        Ok(installments)
    }

    // Get customer bills
    pub async fn get_customer_bills(&self, db: &Database, customer_id: i64) -> Result<Vec<CustomerBill>> {
        let bills = sqlx::query_as::<_, CustomerBill>(
            r#"
            SELECT 
                s.id,
                s.invoice_no,
                s.invoice_date,
                s.due_date,
                s.total_amount,
                s.paid_amount,
                (s.total_amount - s.paid_amount) as remaining_amount,
                s.payment_status,
                s.status,
                s.notes,
                c.name as customer_name,
                c.phone as customer_phone,
                u.name as created_by_name
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN users u ON s.created_by = u.id
            WHERE s.customer_id = ?
            ORDER BY s.invoice_date DESC
            "#
        )
        .bind(customer_id)
        .fetch_all(&db.pool)
        .await?;

        Ok(bills)
    }

    // Get customer receipts
    pub async fn get_customer_receipts(&self, db: &Database, customer_id: i64) -> Result<Vec<CustomerReceipt>> {
        let receipts = sqlx::query_as::<_, CustomerReceipt>(
            r#"
            SELECT 
                cr.id,
                cr.receipt_number,
                cr.customer_id,
                cr.sale_id,
                cr.receipt_date,
                cr.amount,
                cr.payment_method,
                cr.reference_number,
                cr.notes,
                cr.created_at,
                cr.updated_at,
                c.name as customer_name,
                c.phone as customer_phone,
                c.email as customer_email,
                s.invoice_no as sale_invoice_no,
                u.name as created_by_name
            FROM customer_receipts cr
            LEFT JOIN customers c ON cr.customer_id = c.id
            LEFT JOIN sales s ON cr.sale_id = s.id
            LEFT JOIN users u ON cr.created_by = u.id
            WHERE cr.customer_id = ?
            ORDER BY cr.created_at DESC
            "#
        )
        .bind(customer_id)
        .fetch_all(&db.pool)
        .await?;

        Ok(receipts)
    }

    // Get customer financial summary
    pub async fn get_customer_financial_summary(&self, db: &Database, customer_id: i64) -> Result<Option<CustomerFinancialSummary>> {
        let customer = self.get_by_id(db, customer_id).await?;
        if customer.is_none() {
            return Ok(None);
        }
        let customer = customer.unwrap();

        let summary = sqlx::query(
            r#"
            SELECT 
                COUNT(s.id) as total_bills_count,
                COALESCE(SUM(s.total_amount), 0) as total_bills,
                COALESCE(SUM(s.paid_amount), 0) as total_paid,
                COALESCE(SUM(s.total_amount - s.paid_amount), 0) as total_debt,
                COUNT(CASE WHEN s.payment_status = 'paid' THEN 1 END) as paid_bills_count,
                COUNT(CASE WHEN s.payment_status = 'unpaid' OR s.payment_status = 'partial' THEN 1 END) as unpaid_bills_count
            FROM customers c
            LEFT JOIN sales s ON c.id = s.customer_id
            WHERE c.id = ?
            GROUP BY c.id
            "#
        )
        .bind(customer_id)
        .fetch_optional(&db.pool)
        .await?;

        if let Some(row) = summary {
            Ok(Some(CustomerFinancialSummary {
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email,
                total_bills: row.get("total_bills"),
                total_paid: row.get("total_paid"),
                total_debt: row.get("total_debt"),
                total_bills_count: row.get("total_bills_count"),
                unpaid_bills_count: row.get("unpaid_bills_count"),
                paid_bills_count: row.get("paid_bills_count"),
            }))
        } else {
            Ok(Some(CustomerFinancialSummary {
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email,
                total_bills: 0.0,
                total_paid: 0.0,
                total_debt: 0.0,
                total_bills_count: 0,
                unpaid_bills_count: 0,
                paid_bills_count: 0,
            }))
        }
    }

    // Get customer details (optimized endpoint)
    pub async fn get_customer_details(&self, db: &Database, customer_id: i64) -> Result<Option<CustomerDetails>> {
        // Get all customer data in parallel for better performance
        let customer = self.get_by_id(db, customer_id).await?;
        let debts = self.get_customer_debts(db, customer_id).await;
        let installments = self.get_customer_installments(db, customer_id).await;
        let bills = self.get_customer_bills(db, customer_id).await;
        let receipts = self.get_customer_receipts(db, customer_id).await;
        let financial_summary = self.get_customer_financial_summary(db, customer_id).await;

        if customer.is_none() {
            return Ok(None);
        }

        Ok(Some(CustomerDetails {
            customer: customer.unwrap(),
            debts: debts.unwrap_or_else(|_| vec![]),
            installments: installments.unwrap_or_else(|_| vec![]),
            bills: bills.unwrap_or_else(|_| vec![]),
            receipts: receipts.unwrap_or_else(|_| vec![]),
            financial_summary: financial_summary.unwrap_or_else(|_| None),
        }))
    }

    // Update customer balance (add or subtract amount)
    pub async fn update_balance(&self, db: &Database, customer_id: i64, amount: f64, operation: &str) -> Result<Option<Customer>> {
        info!("updateBalance called: customerId={}, amount={}, operation={}", customer_id, amount, operation);

        if customer_id == 0 || customer_id == 999 {
            warn!("Invalid customer ID: {}", customer_id);
            return Err(anyhow::anyhow!("Invalid customer ID"));
        }

        let operation_sql = if operation == "subtract" { "-" } else { "+" };
        let abs_amount = amount.abs();

        info!("Executing SQL: UPDATE customers SET current_balance = current_balance {} {} WHERE id = {}", operation_sql, abs_amount, customer_id);

        let changes = sqlx::query(
            &format!(
                "UPDATE customers SET current_balance = current_balance {} ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                operation_sql
            )
        )
        .bind(abs_amount)
        .bind(customer_id)
        .execute(&db.pool)
        .await?
        .rows_affected();

        info!("Database update result: {} rows affected", changes);

        if changes > 0 {
            info!("Updated customer {} balance: {} {}", customer_id, operation, amount);
            let updated_customer = self.get_by_id(db, customer_id).await?;
            if let Some(ref customer) = updated_customer {
                info!("Retrieved updated customer: {:?}", customer);
            }
            Ok(updated_customer)
        } else {
            warn!("No rows affected for customer {}. Customer might not exist.", customer_id);
            Ok(None)
        }
    }
}
