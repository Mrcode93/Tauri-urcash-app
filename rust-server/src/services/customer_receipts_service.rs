use crate::models::customer::CustomerReceipt;
use crate::models::ApiResponse;
use crate::database::Database;
use anyhow::Result;
use chrono::{NaiveDateTime, Utc, Datelike};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::Row;
use tracing::{error, info};

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCustomerReceiptRequest {
    pub customer_id: i64,
    pub sale_id: Option<i64>,
    pub receipt_date: Option<String>,
    pub amount: f64,
    pub payment_method: String,
    pub reference_number: Option<String>,
    pub notes: Option<String>,
    pub money_box_id: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateCustomerReceiptRequest {
    pub customer_id: Option<i64>,
    pub sale_id: Option<i64>,
    pub receipt_date: Option<String>,
    pub amount: Option<f64>,
    pub payment_method: Option<String>,
    pub reference_number: Option<String>,
    pub notes: Option<String>,
    pub money_box_id: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomerReceiptQuery {
    pub customer_id: Option<i64>,
    pub sale_id: Option<i64>,
    pub payment_method: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub min_amount: Option<f64>,
    pub max_amount: Option<f64>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Clone)]
pub struct CustomerReceiptsService;

impl CustomerReceiptsService {
    pub fn new() -> Self {
        Self
    }

    pub async fn get_all_receipts(&self, db: &Database, _query: &CustomerReceiptQuery) -> Result<Vec<Value>> {
        let rows = sqlx::query(
            "SELECT 
                cr.id,
                cr.receipt_no as receipt_number,
                cr.customer_id,
                cr.sale_id,
                cr.receipt_date,
                cr.amount,
                cr.payment_method,
                cr.reference_no as reference_number,
                cr.notes,
                cr.created_at,
                cr.updated_at,
                cr.money_box_id,
                c.name as customer_name,
                c.phone as customer_phone,
                c.email as customer_email,
                s.invoice_no as sale_invoice_no,
                u.name as created_by_name
            FROM customer_receipts cr
            LEFT JOIN customers c ON cr.customer_id = c.id
            LEFT JOIN sales s ON cr.sale_id = s.id
            LEFT JOIN users u ON cr.created_by = u.id
            ORDER BY cr.created_at DESC"
        )
        .fetch_all(&db.pool)
        .await?;

        let mut receipts = Vec::new();

        for row in rows {
            let receipt = json!({
                "id": row.get::<i64, _>("id"),
                "receipt_number": row.get::<String, _>("receipt_number"),
                "customer_id": row.get::<i64, _>("customer_id"),
                "sale_id": row.get::<Option<i64>, _>("sale_id"),
                "receipt_date": row.get::<String, _>("receipt_date"),
                "amount": row.get::<f64, _>("amount"),
                "payment_method": row.get::<String, _>("payment_method"),
                "reference_number": row.get::<Option<String>, _>("reference_number"),
                "notes": row.get::<Option<String>, _>("notes"),
                "created_at": row.get::<String, _>("created_at"),
                "updated_at": row.get::<String, _>("updated_at"),
                "money_box_id": row.get::<Option<i64>, _>("money_box_id"),
                "customer_name": row.get::<String, _>("customer_name"),
                "customer_phone": row.get::<Option<String>, _>("customer_phone"),
                "customer_email": row.get::<Option<String>, _>("customer_email"),
                "sale_invoice_no": row.get::<Option<String>, _>("sale_invoice_no"),
                "created_by_name": row.get::<String, _>("created_by_name")
            });
            receipts.push(receipt);
        }

        Ok(receipts)
    }

    pub async fn get_receipt_by_id(&self, db: &Database, id: i64) -> Result<Option<Value>> {
        let row = sqlx::query(
            "SELECT 
                cr.id,
                cr.receipt_no as receipt_number,
                cr.customer_id,
                cr.sale_id,
                cr.receipt_date,
                cr.amount,
                cr.payment_method,
                cr.reference_no as reference_number,
                cr.notes,
                cr.created_at,
                cr.updated_at,
                cr.money_box_id,
                c.name as customer_name,
                c.phone as customer_phone,
                c.email as customer_email,
                s.invoice_no as sale_invoice_no,
                u.name as created_by_name
            FROM customer_receipts cr
            LEFT JOIN customers c ON cr.customer_id = c.id
            LEFT JOIN sales s ON cr.sale_id = s.id
            LEFT JOIN users u ON cr.created_by = u.id
            WHERE cr.id = ?"
        )
        .bind(id)
        .fetch_optional(&db.pool)
        .await?;

        match row {
            Some(row) => {
                let receipt = json!({
                    "id": row.get::<i64, _>("id"),
                    "receipt_number": row.get::<String, _>("receipt_number"),
                    "customer_id": row.get::<i64, _>("customer_id"),
                    "sale_id": row.get::<Option<i64>, _>("sale_id"),
                    "receipt_date": row.get::<String, _>("receipt_date"),
                    "amount": row.get::<f64, _>("amount"),
                    "payment_method": row.get::<String, _>("payment_method"),
                    "reference_number": row.get::<Option<String>, _>("reference_number"),
                    "notes": row.get::<String, _>("notes"),
                    "created_at": row.get::<String, _>("created_at"),
                    "updated_at": row.get::<String, _>("updated_at"),
                    "money_box_id": row.get::<Option<i64>, _>("money_box_id"),
                    "customer_name": row.get::<String, _>("customer_name"),
                    "customer_phone": row.get::<Option<String>, _>("customer_phone"),
                    "customer_email": row.get::<Option<String>, _>("customer_email"),
                    "sale_invoice_no": row.get::<Option<String>, _>("sale_invoice_no"),
                    "created_by_name": row.get::<String, _>("created_by_name")
                });
                Ok(Some(receipt))
            }
            None => Ok(None)
        }
    }

    pub async fn create_receipt(&self, db: &Database, request: CreateCustomerReceiptRequest, user_id: i64) -> Result<Value> {
        // Generate receipt number
        let receipt_number = self.generate_receipt_number(db).await?;
        
        // Parse receipt date or use current date
        let receipt_date = if let Some(date_str) = request.receipt_date {
            NaiveDateTime::parse_from_str(&format!("{} 00:00:00", date_str), "%Y-%m-%d %H:%M:%S")
                .unwrap_or_else(|_| Utc::now().naive_utc())
        } else {
            Utc::now().naive_utc()
        };

        let now = Utc::now().naive_utc();

        let receipt_id = sqlx::query(
            "INSERT INTO customer_receipts (
                receipt_no, customer_id, sale_id, receipt_date, amount, 
                payment_method, reference_no, notes, created_by, created_at, updated_at, money_box_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&receipt_number)
        .bind(request.customer_id)
        .bind(request.sale_id)
        .bind(receipt_date)
        .bind(request.amount)
        .bind(&request.payment_method)
        .bind(request.reference_number)
        .bind(request.notes)
        .bind(user_id)
        .bind(now)
        .bind(now)
        .bind(request.money_box_id)
        .execute(&db.pool)
        .await?
        .last_insert_rowid();

        // Add money to the selected money box if specified
        if let Some(money_box_id) = request.money_box_id {
            // Import the money box service
            use crate::services::money_boxes_service::{MoneyBoxesService, InternalAddTransactionRequest};
            
            let money_box_service = MoneyBoxesService::new();
            let transaction_request = InternalAddTransactionRequest {
                transaction_type: "deposit".to_string(),
                amount: request.amount,
                notes: Some(format!("إيصال دفع عميل - {}", receipt_number)),
                reference_id: None, // Don't set reference_id to avoid foreign key issues
                created_by: None, // Don't set created_by to avoid foreign key issues
            };
            
            // Add transaction to money box
            match money_box_service.add_transaction(db, money_box_id, transaction_request).await {
                Ok(_) => info!("Successfully added transaction to money box {}", money_box_id),
                Err(e) => error!("Failed to add transaction to money box {}: {}", money_box_id, e),
            }
        }

        // Get the created receipt
        self.get_receipt_by_id(db, receipt_id).await?.ok_or_else(|| {
            anyhow::anyhow!("Failed to retrieve created receipt")
        })
    }

    pub async fn update_receipt(&self, db: &Database, id: i64, _request: UpdateCustomerReceiptRequest) -> Result<Option<Value>> {
        // Check if receipt exists
        let existing = sqlx::query("SELECT id FROM customer_receipts WHERE id = ?")
            .bind(id)
            .fetch_optional(&db.pool)
            .await?;

        if existing.is_none() {
            return Ok(None);
        }

        // For now, just update the updated_at timestamp
        sqlx::query("UPDATE customer_receipts SET updated_at = ? WHERE id = ?")
            .bind(Utc::now().naive_utc())
            .bind(id)
            .execute(&db.pool)
            .await?;

        // Get the updated receipt
        self.get_receipt_by_id(db, id).await
    }

    pub async fn delete_receipt(&self, db: &Database, id: i64) -> Result<bool> {
        let result = sqlx::query("DELETE FROM customer_receipts WHERE id = ?")
            .bind(id)
            .execute(&db.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn get_customer_summary(&self, db: &Database, customer_id: i64) -> Result<Value> {
        let row = sqlx::query(
            "SELECT 
                COUNT(*) as total_receipts,
                COALESCE(CAST(SUM(amount) AS REAL), 0.0) as total_amount,
                MIN(receipt_date) as first_receipt_date,
                MAX(receipt_date) as last_receipt_date
            FROM customer_receipts 
            WHERE customer_id = ?"
        )
        .bind(customer_id)
        .fetch_one(&db.pool)
        .await?;

        Ok(json!({
            "customer_id": customer_id,
            "total_receipts": row.get::<i64, _>("total_receipts"),
            "total_amount": row.get::<f64, _>("total_amount"),
            "first_receipt_date": row.get::<Option<String>, _>("first_receipt_date"),
            "last_receipt_date": row.get::<Option<String>, _>("last_receipt_date")
        }))
    }

    pub async fn get_statistics(&self, db: &Database, _query: &CustomerReceiptQuery) -> Result<Value> {
        let row = sqlx::query(
            "SELECT 
                COUNT(*) as total_receipts,
                COALESCE(CAST(SUM(amount) AS REAL), 0.0) as total_amount,
                AVG(amount) as average_amount,
                MIN(amount) as min_amount,
                MAX(amount) as max_amount
            FROM customer_receipts cr"
        )
        .fetch_one(&db.pool)
        .await?;

        Ok(json!({
            "total_receipts": row.get::<i64, _>("total_receipts"),
            "total_amount": row.get::<f64, _>("total_amount"),
            "average_amount": row.get::<Option<f64>, _>("average_amount"),
            "min_amount": row.get::<Option<f64>, _>("min_amount"),
            "max_amount": row.get::<Option<f64>, _>("max_amount")
        }))
    }

    async fn generate_receipt_number(&self, db: &Database) -> Result<String> {
        let year = Utc::now().year();
        let month = Utc::now().month();
        
        let prefix = format!("CR{}{:02}", year, month);
        
        let count: i64 = sqlx::query(
            "SELECT COUNT(*) FROM customer_receipts WHERE receipt_no LIKE ?"
        )
        .bind(format!("{}%", prefix))
        .fetch_one(&db.pool)
        .await?
        .get(0);

        let receipt_number = format!("{}{:04}", prefix, count + 1);
        Ok(receipt_number)
    }

    // Get customer bills (unpaid sales)
    pub async fn get_customer_bills(&self, db: &Database, customer_id: i64) -> Result<Vec<Value>> {
        let rows = sqlx::query(
            "SELECT 
                s.id,
                s.invoice_no,
                s.invoice_date,
                s.total_amount,
                s.paid_amount,
                (s.total_amount - COALESCE(s.paid_amount, 0)) as remaining_amount
            FROM sales s
            WHERE s.customer_id = ? 
            AND (s.total_amount - COALESCE(s.paid_amount, 0)) > 0
            ORDER BY s.invoice_date DESC"
        )
        .bind(customer_id)
        .fetch_all(&db.pool)
        .await?;

        let mut bills = Vec::new();
        for row in rows {
            let bill = json!({
                "id": row.get::<i64, _>("id"),
                "invoice_no": row.get::<String, _>("invoice_no"),
                "invoice_date": row.get::<String, _>("invoice_date"),
                "total_amount": row.get::<f64, _>("total_amount"),
                "paid_amount": row.get::<Option<f64>, _>("paid_amount"),
                "remaining_amount": row.get::<f64, _>("remaining_amount")
            });
            bills.push(bill);
        }

        Ok(bills)
    }

    // Get customer debts (unpaid sales)
    pub async fn get_customer_debts(&self, db: &Database, customer_id: i64) -> Result<Vec<Value>> {
        let rows = sqlx::query(
            "SELECT 
                s.id,
                s.invoice_no,
                s.invoice_date,
                s.total_amount,
                s.paid_amount,
                (s.total_amount - COALESCE(s.paid_amount, 0)) as debt_amount
            FROM sales s
            WHERE s.customer_id = ? 
            AND (s.total_amount - COALESCE(s.paid_amount, 0)) > 0
            ORDER BY s.invoice_date DESC"
        )
        .bind(customer_id)
        .fetch_all(&db.pool)
        .await?;

        let mut debts = Vec::new();
        for row in rows {
            let debt = json!({
                "id": row.get::<i64, _>("id"),
                "invoice_no": row.get::<String, _>("invoice_no"),
                "invoice_date": row.get::<String, _>("invoice_date"),
                "total_amount": row.get::<f64, _>("total_amount"),
                "paid_amount": row.get::<Option<f64>, _>("paid_amount"),
                "debt_amount": row.get::<f64, _>("debt_amount")
            });
            debts.push(debt);
        }

        Ok(debts)
    }

    // Get customer sales (all sales for a customer)
    pub async fn get_customer_sales(&self, db: &Database, customer_id: i64) -> Result<Vec<Value>> {
        let rows = sqlx::query(
            "SELECT 
                s.id,
                s.invoice_no,
                s.invoice_date,
                s.total_amount,
                s.paid_amount,
                (s.total_amount - COALESCE(s.paid_amount, 0)) as remaining_amount,
                s.payment_status,
                s.status
            FROM sales s
            WHERE s.customer_id = ? 
            ORDER BY s.invoice_date DESC"
        )
        .bind(customer_id)
        .fetch_all(&db.pool)
        .await?;

        let mut sales = Vec::new();
        for row in rows {
            let sale = json!({
                "id": row.get::<i64, _>("id"),
                "invoice_no": row.get::<String, _>("invoice_no"),
                "invoice_date": row.get::<String, _>("invoice_date"),
                "total_amount": row.get::<f64, _>("total_amount"),
                "paid_amount": row.get::<Option<f64>, _>("paid_amount"),
                "remaining_amount": row.get::<f64, _>("remaining_amount"),
                "payment_status": row.get::<String, _>("payment_status"),
                "status": row.get::<String, _>("status")
            });
            sales.push(sale);
        }

        Ok(sales)
    }

    // Get customer financial summary
    pub async fn get_customer_financial_summary(&self, db: &Database, customer_id: i64) -> Result<Option<Value>> {
        let row = sqlx::query(
            "SELECT 
                COUNT(DISTINCT s.id) as total_sales,
                COALESCE(SUM(s.total_amount), 0.0) as total_sales_amount,
                COALESCE(SUM(s.paid_amount), 0.0) as total_paid_amount,
                COALESCE(SUM(s.total_amount - COALESCE(s.paid_amount, 0)), 0.0) as total_debt_amount,
                COUNT(DISTINCT cr.id) as total_receipts,
                COALESCE(SUM(cr.amount), 0.0) as total_receipts_amount
            FROM customers c
            LEFT JOIN sales s ON c.id = s.customer_id
            LEFT JOIN customer_receipts cr ON c.id = cr.customer_id
            WHERE c.id = ?"
        )
        .bind(customer_id)
        .fetch_optional(&db.pool)
        .await?;

        match row {
            Some(row) => {
                let summary = json!({
                    "customer_id": customer_id,
                    "total_sales": row.get::<i64, _>("total_sales"),
                    "total_sales_amount": row.get::<f64, _>("total_sales_amount"),
                    "total_paid_amount": row.get::<f64, _>("total_paid_amount"),
                    "total_debt_amount": row.get::<f64, _>("total_debt_amount"),
                    "total_receipts": row.get::<i64, _>("total_receipts"),
                    "total_receipts_amount": row.get::<f64, _>("total_receipts_amount")
                });
                Ok(Some(summary))
            }
            None => Ok(None)
        }
    }

    // Export customer receipts to CSV
    pub async fn export_to_csv(&self, db: &Database, query: &CustomerReceiptQuery) -> Result<String> {
        let rows = sqlx::query(
            r#"
            SELECT 
                cr.id,
                cr.receipt_no,
                cr.receipt_date,
                cr.amount,
                cr.payment_method,
                cr.reference_no,
                cr.notes,
                cr.created_at,
                cr.updated_at,
                c.name as customer_name,
                c.phone as customer_phone,
                c.email as customer_email,
                u.name as created_by_name,
                mb.name as money_box_name,
                s.invoice_no as sale_invoice_no
            FROM customer_receipts cr
            LEFT JOIN customers c ON cr.customer_id = c.id
            LEFT JOIN users u ON cr.created_by = u.id
            LEFT JOIN money_boxes mb ON cr.money_box_id = mb.id
            LEFT JOIN sales s ON cr.sale_id = s.id
            ORDER BY cr.created_at DESC
            "#
        )
        .fetch_all(&db.pool)
        .await?;

        let mut csv_content = String::new();
        
        // Add CSV header
        csv_content.push_str("ID,رقم الإيصال,تاريخ الإيصال,المبلغ,طريقة الدفع,المرجع,ملاحظات,تاريخ الإنشاء,تاريخ التحديث,اسم العميل,هاتف العميل,بريد العميل,أنشئ بواسطة,صندوق المال,رقم الفاتورة\n");
        
        // Add data rows
        for row in rows {
            let id = row.get::<i64, _>("id");
            let receipt_no = row.get::<String, _>("receipt_no");
            let receipt_date = row.get::<String, _>("receipt_date");
            let amount = row.get::<f64, _>("amount");
            let payment_method = row.get::<String, _>("payment_method");
            let reference_no = row.get::<Option<String>, _>("reference_no").unwrap_or_default();
            let notes = row.get::<Option<String>, _>("notes").unwrap_or_default();
            let created_at = row.get::<String, _>("created_at");
            let updated_at = row.get::<String, _>("updated_at");
            let customer_name = row.get::<Option<String>, _>("customer_name").unwrap_or_default();
            let customer_phone = row.get::<Option<String>, _>("customer_phone").unwrap_or_default();
            let customer_email = row.get::<Option<String>, _>("customer_email").unwrap_or_default();
            let created_by_name = row.get::<Option<String>, _>("created_by_name").unwrap_or_default();
            let money_box_name = row.get::<Option<String>, _>("money_box_name").unwrap_or_default();
            let sale_invoice_no = row.get::<Option<String>, _>("sale_invoice_no").unwrap_or_default();
            
            // Escape CSV fields that contain commas or quotes
            let escape_csv_field = |field: &str| {
                if field.contains(',') || field.contains('"') || field.contains('\n') {
                    format!("\"{}\"", field.replace("\"", "\"\""))
                } else {
                    field.to_string()
                }
            };
            
            csv_content.push_str(&format!("{},{},{},{},{},{},{},{},{},{},{},{},{},{},{}\n",
                id,
                escape_csv_field(&receipt_no),
                escape_csv_field(&receipt_date),
                amount,
                escape_csv_field(&payment_method),
                escape_csv_field(&reference_no),
                escape_csv_field(&notes),
                escape_csv_field(&created_at),
                escape_csv_field(&updated_at),
                escape_csv_field(&customer_name),
                escape_csv_field(&customer_phone),
                escape_csv_field(&customer_email),
                escape_csv_field(&created_by_name),
                escape_csv_field(&money_box_name),
                escape_csv_field(&sale_invoice_no)
            ));
        }
        
        Ok(csv_content)
    }

    // Export customer receipts to PDF
    pub async fn export_to_pdf(&self, db: &Database, query: &CustomerReceiptQuery) -> Result<Vec<u8>> {
        let rows = sqlx::query(
            r#"
            SELECT 
                cr.id,
                cr.receipt_no,
                cr.receipt_date,
                cr.amount,
                cr.payment_method,
                cr.reference_no,
                cr.notes,
                cr.created_at,
                cr.updated_at,
                c.name as customer_name,
                c.phone as customer_phone,
                c.email as customer_email,
                u.name as created_by_name,
                mb.name as money_box_name,
                s.invoice_no as sale_invoice_no
            FROM customer_receipts cr
            LEFT JOIN customers c ON cr.customer_id = c.id
            LEFT JOIN users u ON cr.created_by = u.id
            LEFT JOIN money_boxes mb ON cr.money_box_id = mb.id
            LEFT JOIN sales s ON cr.sale_id = s.id
            ORDER BY cr.created_at DESC
            "#
        )
        .fetch_all(&db.pool)
        .await?;

        // Create PDF content using a simple HTML-like structure
        let mut pdf_content = String::new();
        
        // Add PDF header
        pdf_content.push_str(r#"
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <title>تقرير سندات القبض</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; direction: rtl; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header h1 { color: #333; margin: 0; }
        .header p { color: #666; margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: right; font-size: 12px; }
        th { background-color: #f2f2f2; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .summary { margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; }
        .summary h3 { margin-top: 0; color: #333; }
        .summary p { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>تقرير سندات القبض</h1>
        <p>تاريخ التقرير: "#);
        
        // Add current date
        let now = chrono::Utc::now();
        pdf_content.push_str(&format!("{}</p>", now.format("%Y-%m-%d %H:%M:%S")));
        
        pdf_content.push_str(r#"
    </div>
    
    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>رقم الإيصال</th>
                <th>تاريخ الإيصال</th>
                <th>المبلغ</th>
                <th>طريقة الدفع</th>
                <th>المرجع</th>
                <th>ملاحظات</th>
                <th>اسم العميل</th>
                <th>هاتف العميل</th>
                <th>أنشئ بواسطة</th>
                <th>صندوق المال</th>
                <th>رقم الفاتورة</th>
            </tr>
        </thead>
        <tbody>
"#);

        let mut total_amount = 0.0;
        let mut receipt_count = 0;
        
        // Add data rows
        for row in rows {
            let id = row.get::<i64, _>("id");
            let receipt_no = row.get::<String, _>("receipt_no");
            let receipt_date = row.get::<String, _>("receipt_date");
            let amount = row.get::<f64, _>("amount");
            let payment_method = row.get::<String, _>("payment_method");
            let reference_no = row.get::<Option<String>, _>("reference_no").unwrap_or_default();
            let notes = row.get::<Option<String>, _>("notes").unwrap_or_default();
            let customer_name = row.get::<Option<String>, _>("customer_name").unwrap_or_default();
            let customer_phone = row.get::<Option<String>, _>("customer_phone").unwrap_or_default();
            let created_by_name = row.get::<Option<String>, _>("created_by_name").unwrap_or_default();
            let money_box_name = row.get::<Option<String>, _>("money_box_name").unwrap_or_default();
            let sale_invoice_no = row.get::<Option<String>, _>("sale_invoice_no").unwrap_or_default();
            
            total_amount += amount;
            receipt_count += 1;
            
            pdf_content.push_str(&format!(r#"
            <tr>
                <td>{}</td>
                <td>{}</td>
                <td>{}</td>
                <td>{:.2}</td>
                <td>{}</td>
                <td>{}</td>
                <td>{}</td>
                <td>{}</td>
                <td>{}</td>
                <td>{}</td>
                <td>{}</td>
                <td>{}</td>
            </tr>"#,
                id,
                receipt_no,
                receipt_date,
                amount,
                payment_method,
                reference_no,
                notes,
                customer_name,
                customer_phone,
                created_by_name,
                money_box_name,
                sale_invoice_no
            ));
        }
        
        pdf_content.push_str(r#"
        </tbody>
    </table>
    
    <div class="summary">
        <h3>ملخص التقرير</h3>
        <p><strong>إجمالي عدد السندات:</strong> "#);
        
        pdf_content.push_str(&format!("{}", receipt_count));
        
        pdf_content.push_str(r#"</p>
        <p><strong>إجمالي المبالغ:</strong> "#);
        
        pdf_content.push_str(&format!("{:.2} دينار", total_amount));
        
        pdf_content.push_str(r#"
        </p>
    </div>
</body>
</html>"#);

        // For now, we'll return the HTML content as bytes
        // In a production environment, you would use a proper PDF library like wkhtmltopdf or similar
        Ok(pdf_content.into_bytes())
    }
}
