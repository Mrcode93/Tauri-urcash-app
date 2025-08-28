use crate::database::Database;
use crate::models::{
    ApiResponse, PaginatedResponse, BillsQuery, ReturnsQuery, BillsStatistics, PurchasesStatistics, ReturnsStatistics,
};
use crate::models::bill::{
    Sale, SaleItem, PurchaseBill, PurchaseBillItem, SaleReturn, PurchaseReturn,
    SaleReturnItem, PurchaseReturnItem, CreateSaleBillRequest, CreatePurchaseBillRequest,
    CreateReturnBillRequest, UpdateSalePaymentRequest, UpdatePurchasePaymentRequest,
};
use anyhow::Result;
use chrono::{Utc, DateTime};
use sqlx::Row;
use tracing::info;
use uuid::Uuid;

#[derive(Clone)]
pub struct BillsService;

impl BillsService {
    pub fn new() -> Self {
        Self
    }
    // ==================== SALE BILLS ====================

    pub async fn create_sale_bill(
        &self,
        db: &Database,
        request: CreateSaleBillRequest,
    ) -> Result<ApiResponse<Sale>> {
        let mut transaction = db.pool.begin().await?;

        // Generate unique invoice number
        let invoice_no = self.generate_sale_invoice_number(db).await?;
        
        // Calculate totals
        let total_amount: f64 = request.items.iter()
            .map(|item| item.quantity as f64 * item.price)
            .sum();
        
        let discount_amount = request.bill_data.discount_amount.unwrap_or(0.0);
        let tax_amount = request.bill_data.tax_amount.unwrap_or(0.0);
        let net_amount = total_amount - discount_amount + tax_amount;

        // Determine payment status
        let paid_amount = request.bill_data.paid_amount.unwrap_or(0.0);
        let payment_status = if paid_amount >= net_amount {
            "paid".to_string()
        } else if paid_amount > 0.0 {
            "partial".to_string()
        } else {
            "unpaid".to_string()
        };

        // Set default due date
        let due_date = if let Some(due_date) = request.bill_data.due_date {
            Some(due_date)
        } else {
            // Default to 1 month from invoice date
            let invoice_date = chrono::NaiveDate::parse_from_str(&request.bill_data.invoice_date, "%Y-%m-%d")?;
            let default_due_date = invoice_date + chrono::Duration::days(30);
            Some(default_due_date.format("%Y-%m-%d").to_string())
        };

        // Insert sale record
        let sale_id = sqlx::query(
            r#"
            INSERT INTO sales (
                customer_id, delegate_id, employee_id, invoice_no, invoice_date, due_date,
                total_amount, discount_amount, tax_amount, paid_amount, payment_method,
                payment_status, bill_type, status, notes, barcode, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(request.bill_data.customer_id)
        .bind(request.bill_data.delegate_id)
        .bind(request.bill_data.employee_id)
        .bind(&invoice_no)
        .bind(&request.bill_data.invoice_date)
        .bind(&due_date)
        .bind(total_amount)
        .bind(discount_amount)
        .bind(tax_amount)
        .bind(paid_amount)
        .bind(request.bill_data.payment_method.as_deref().unwrap_or("cash"))
        .bind(&payment_status)
        .bind(request.bill_data.bill_type.as_deref().unwrap_or("retail"))
        .bind("completed")
        .bind(&request.bill_data.notes)
        .bind(&request.bill_data.barcode)
        .bind(request.bill_data.created_by)
        .bind(Utc::now())
        .bind(Utc::now())
        .execute(&mut *transaction)
        .await?
        .last_insert_rowid();

        // Insert sale items
        for item in request.items {
            let line_total = (item.quantity as f64 * item.price) * 
                (1.0 - (item.discount_percent.unwrap_or(0.0) / 100.0));
            
            sqlx::query(
                r#"
                INSERT INTO sale_items (
                    sale_id, product_id, stock_id, quantity, price, discount_percent,
                    tax_percent, total, line_total, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#
            )
            .bind(sale_id)
            .bind(item.product_id)
            .bind(item.stock_id)
            .bind(item.quantity)
            .bind(item.price)
            .bind(item.discount_percent.unwrap_or(0.0))
            .bind(item.tax_percent.unwrap_or(0.0))
            .bind(item.quantity as f64 * item.price)
            .bind(line_total)
            .bind(Utc::now())
            .execute(&mut *transaction)
            .await?;

            // Update inventory (simplified - would need inventory service)
            if let Some(stock_id) = item.stock_id {
                self.update_stock_inventory(
                    &mut transaction,
                    item.product_id,
                    stock_id,
                    item.quantity,
                    "subtract",
                    "sale",
                    sale_id,
                    &invoice_no,
                    &format!("تم بيع المنتج {} من المخزن {}", item.product_id, stock_id),
                    request.bill_data.created_by,
                ).await?;
            }
        }

        // Update customer balance if payment made
        if paid_amount > 0.0 {
            sqlx::query(
                "UPDATE customers SET current_balance = current_balance + ? WHERE id = ?"
            )
            .bind(paid_amount)
            .bind(request.bill_data.customer_id)
            .execute(&mut *transaction)
            .await?;
        }

        // Handle money box transaction if payment made
        if paid_amount > 0.0 {
            if let Some(money_box_id) = request.money_box_id {
                let notes = request.transaction_notes
                    .unwrap_or_else(|| format!("دفع فاتورة بيع رقم: {}", invoice_no));
                
                // This would integrate with money box service
                info!("Adding money box transaction: moneyBoxId={}, amount={}, invoiceNo={}", 
                      money_box_id, paid_amount, invoice_no);
            }
        }

        transaction.commit().await?;

        // Get the created sale
        let sale = self.get_sale_by_id(db, sale_id).await?;

        info!("تم إنشاء فاتورة البيع بنجاح: {}", invoice_no);
        Ok(ApiResponse::success(sale))
    }

    pub async fn get_all_sale_bills(
        &self,
        db: &Database,
        query: BillsQuery,
    ) -> Result<ApiResponse<PaginatedResponse<Sale>>> {
        let page = query.page.unwrap_or(1);
        let limit = query.limit.unwrap_or(20);
        let offset = (page - 1) * limit;

        // Simplified query without dynamic parameters for now
        let count_query = "SELECT COUNT(*) as count FROM sales s WHERE s.status != 'cancelled'";
        let total: i64 = sqlx::query(count_query)
            .fetch_one(&db.pool)
            .await?
            .get("count");

        // Get paginated results
        let sales_query = r#"
            SELECT s.* FROM sales s
            WHERE s.status != 'cancelled'
            ORDER BY s.created_at DESC
            LIMIT ? OFFSET ?
        "#;

        let rows = sqlx::query(sales_query)
            .bind(limit)
            .bind(offset)
            .fetch_all(&db.pool)
            .await?;
        
        let mut sales = Vec::new();

        for row in rows {
            let sale = Sale {
                id: row.get("id"),
                customer_id: row.get("customer_id"),
                delegate_id: row.get("delegate_id"),
                employee_id: row.get("employee_id"),
                invoice_no: row.get("invoice_no"),
                invoice_date: row.get("invoice_date"),
                due_date: row.get("due_date"),
                total_amount: row.get("total_amount"),
                discount_amount: row.get("discount_amount"),
                tax_amount: row.get("tax_amount"),
                paid_amount: row.get("paid_amount"),
                payment_method: row.get("payment_method"),
                payment_status: row.get("payment_status"),
                bill_type: row.get("bill_type"),
                status: row.get("status"),
                notes: row.get("notes"),
                barcode: row.get("barcode"),
                created_by: row.get("created_by"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            };
            sales.push(sale);
        }

        let paginated_response = PaginatedResponse::new(sales, total, page, limit);
        Ok(ApiResponse::success(paginated_response))
    }

    pub async fn get_sale_by_id(&self, db: &Database, id: i64) -> Result<Sale> {
        let row = sqlx::query(
            "SELECT * FROM sales WHERE id = ?"
        )
        .bind(id)
        .fetch_one(&db.pool)
        .await?;

        Ok(Sale {
            id: row.get("id"),
            customer_id: row.get("customer_id"),
            delegate_id: row.get("delegate_id"),
            employee_id: row.get("employee_id"),
            invoice_no: row.get("invoice_no"),
            invoice_date: row.get("invoice_date"),
            due_date: row.get("due_date"),
            total_amount: row.get("total_amount"),
            discount_amount: row.get("discount_amount"),
            tax_amount: row.get("tax_amount"),
            paid_amount: row.get("paid_amount"),
            payment_method: row.get("payment_method"),
            payment_status: row.get("payment_status"),
            bill_type: row.get("bill_type"),
            status: row.get("status"),
            notes: row.get("notes"),
            barcode: row.get("barcode"),
            created_by: row.get("created_by"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
    }

    pub async fn get_sale_by_invoice_number(&self, db: &Database, invoice_no: &str) -> Result<Sale> {
        let row = sqlx::query(
            "SELECT * FROM sales WHERE invoice_no = ?"
        )
        .bind(invoice_no)
        .fetch_one(&db.pool)
        .await?;

        Ok(Sale {
            id: row.get("id"),
            customer_id: row.get("customer_id"),
            delegate_id: row.get("delegate_id"),
            employee_id: row.get("employee_id"),
            invoice_no: row.get("invoice_no"),
            invoice_date: row.get("invoice_date"),
            due_date: row.get("due_date"),
            total_amount: row.get("total_amount"),
            discount_amount: row.get("discount_amount"),
            tax_amount: row.get("tax_amount"),
            paid_amount: row.get("paid_amount"),
            payment_method: row.get("payment_method"),
            payment_status: row.get("payment_status"),
            bill_type: row.get("bill_type"),
            status: row.get("status"),
            notes: row.get("notes"),
            barcode: row.get("barcode"),
            created_by: row.get("created_by"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
    }

    pub async fn update_sale_payment_status(
        &self,
        db: &Database,
        id: i64,
        request: UpdateSalePaymentRequest,
    ) -> Result<ApiResponse<Sale>> {
        let mut transaction = db.pool.begin().await?;

        // Get current sale
        let current_sale = self.get_sale_by_id(db, id).await?;
        let net_amount = current_sale.total_amount - current_sale.discount_amount + current_sale.tax_amount;
        
        // Calculate new payment status
        let new_payment_status = if request.paid_amount >= net_amount {
            "paid".to_string()
        } else if request.paid_amount > 0.0 {
            "partial".to_string()
        } else {
            "unpaid".to_string()
        };

        // Update sale payment status
        sqlx::query(
            r#"
            UPDATE sales 
            SET paid_amount = ?, payment_method = ?, payment_status = ?, updated_at = ?
            WHERE id = ?
            "#
        )
        .bind(request.paid_amount)
        .bind(request.payment_method.as_deref().unwrap_or("cash"))
        .bind(&new_payment_status)
        .bind(Utc::now())
        .bind(id)
        .execute(&mut *transaction)
        .await?;

        // Update customer balance
        let balance_change = request.paid_amount - current_sale.paid_amount;
        if balance_change != 0.0 {
            sqlx::query(
                "UPDATE customers SET current_balance = current_balance + ? WHERE id = ?"
            )
            .bind(balance_change)
            .bind(current_sale.customer_id)
            .execute(&mut *transaction)
            .await?;
        }

        transaction.commit().await?;

        let updated_sale = self.get_sale_by_id(db, id).await?;
        Ok(ApiResponse::success(updated_sale))
    }

    pub async fn delete_sale(&self, db: &Database, id: i64) -> Result<ApiResponse<String>> {
        let mut transaction = db.pool.begin().await?;

        // Get sale details before deletion
        let sale = self.get_sale_by_id(db, id).await?;

        // Update customer balance (reverse the payment)
        if sale.paid_amount > 0.0 {
            sqlx::query(
                "UPDATE customers SET current_balance = current_balance - ? WHERE id = ?"
            )
            .bind(sale.paid_amount)
            .bind(sale.customer_id)
            .execute(&mut *transaction)
            .await?;
        }

        // Delete sale items first
        sqlx::query("DELETE FROM sale_items WHERE sale_id = ?")
            .bind(id)
            .execute(&mut *transaction)
            .await?;

        // Delete the sale
        sqlx::query("DELETE FROM sales WHERE id = ?")
            .bind(id)
            .execute(&mut *transaction)
            .await?;

        transaction.commit().await?;

        Ok(ApiResponse::message(format!("تم حذف فاتورة البيع رقم: {}", sale.invoice_no)))
    }

    // ==================== PURCHASE BILLS ====================

    pub async fn create_purchase_bill(
        &self,
        db: &Database,
        request: CreatePurchaseBillRequest,
    ) -> Result<ApiResponse<PurchaseBill>> {
        let mut transaction = db.pool.begin().await?;

        // Generate unique invoice number
        let invoice_no = self.generate_purchase_invoice_number(db).await?;
        
        // Calculate totals
        let total_amount: f64 = request.items.iter()
            .map(|item| item.quantity as f64 * item.price)
            .sum();
        
        let discount_amount = request.bill_data.discount_amount.unwrap_or(0.0);
        let tax_amount = request.bill_data.tax_amount.unwrap_or(0.0);
        let net_amount = total_amount - discount_amount + tax_amount;

        // Determine payment status
        let paid_amount = request.bill_data.paid_amount.unwrap_or(0.0);
        let payment_status = if paid_amount >= net_amount {
            "paid".to_string()
        } else if paid_amount > 0.0 {
            "partial".to_string()
        } else {
            "unpaid".to_string()
        };

        // Set default due date
        let due_date = if let Some(due_date) = request.bill_data.due_date {
            Some(due_date)
        } else {
            let invoice_date = chrono::NaiveDate::parse_from_str(&request.bill_data.invoice_date, "%Y-%m-%d")?;
            let default_due_date = invoice_date + chrono::Duration::days(30);
            Some(default_due_date.format("%Y-%m-%d").to_string())
        };

        // Insert purchase record
        let purchase_id = sqlx::query(
            r#"
            INSERT INTO purchases (
                supplier_id, delegate_id, employee_id, invoice_no, invoice_date, due_date,
                total_amount, discount_amount, tax_amount, paid_amount, payment_method,
                payment_status, bill_type, status, notes, barcode, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(request.bill_data.supplier_id)
        .bind(request.bill_data.delegate_id)
        .bind(request.bill_data.employee_id)
        .bind(&invoice_no)
        .bind(&request.bill_data.invoice_date)
        .bind(&due_date)
        .bind(total_amount)
        .bind(discount_amount)
        .bind(tax_amount)
        .bind(paid_amount)
        .bind(request.bill_data.payment_method.as_deref().unwrap_or("cash"))
        .bind(&payment_status)
        .bind(request.bill_data.bill_type.as_deref().unwrap_or("retail"))
        .bind("completed")
        .bind(&request.bill_data.notes)
        .bind(&request.bill_data.barcode)
        .bind(request.bill_data.created_by)
        .bind(Utc::now())
        .bind(Utc::now())
        .execute(&mut *transaction)
        .await?
        .last_insert_rowid();

        // Insert purchase items
        for item in request.items {
            let line_total = (item.quantity as f64 * item.price) * 
                (1.0 - (item.discount_percent.unwrap_or(0.0) / 100.0));
            
            sqlx::query(
                r#"
                INSERT INTO purchase_items (
                    purchase_id, product_id, stock_id, quantity, price, discount_percent,
                    tax_percent, total, line_total, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#
            )
            .bind(purchase_id)
            .bind(item.product_id)
            .bind(item.stock_id)
            .bind(item.quantity)
            .bind(item.price)
            .bind(item.discount_percent.unwrap_or(0.0))
            .bind(item.tax_percent.unwrap_or(0.0))
            .bind(item.quantity as f64 * item.price)
            .bind(line_total)
            .bind(Utc::now())
            .execute(&mut *transaction)
            .await?;

            // Update inventory (add stock for purchases)
            if let Some(stock_id) = item.stock_id {
                self.update_stock_inventory(
                    &mut transaction,
                    item.product_id,
                    stock_id,
                    item.quantity,
                    "add",
                    "purchase",
                    purchase_id,
                    &invoice_no,
                    &format!("تم شراء المنتج {} للمخزن {}", item.product_id, stock_id),
                    request.bill_data.created_by,
                ).await?;
            }
        }

        // Update supplier balance if payment made
        if paid_amount > 0.0 {
            sqlx::query(
                "UPDATE suppliers SET current_balance = current_balance - ? WHERE id = ?"
            )
            .bind(paid_amount)
            .bind(request.bill_data.supplier_id)
            .execute(&mut *transaction)
            .await?;
        }

        transaction.commit().await?;

        // Get the created purchase
        let purchase = self.get_purchase_by_id(db, purchase_id).await?;

        info!("تم إنشاء فاتورة الشراء بنجاح: {}", invoice_no);
        Ok(ApiResponse::success(purchase))
    }

    pub async fn get_all_purchase_bills(
        &self,
        db: &Database,
        query: BillsQuery,
    ) -> Result<ApiResponse<PaginatedResponse<PurchaseBill>>> {
        let page = query.page.unwrap_or(1);
        let limit = query.limit.unwrap_or(20);
        let offset = (page - 1) * limit;

        // Simplified query without dynamic parameters for now
        let count_query = "SELECT COUNT(*) as count FROM purchases p WHERE p.status != 'cancelled'";
        let total: i64 = sqlx::query(count_query)
            .fetch_one(&db.pool)
            .await?
            .get("count");

        // Get paginated results
        let purchases_query = r#"
            SELECT p.* FROM purchases p
            WHERE p.status != 'cancelled'
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        "#;

        let rows = sqlx::query(purchases_query)
            .bind(limit)
            .bind(offset)
            .fetch_all(&db.pool)
            .await?;
        
        let mut purchases = Vec::new();

        for row in rows {
            let purchase = PurchaseBill {
                id: row.get("id"),
                supplier_id: row.get("supplier_id"),
                delegate_id: row.get("delegate_id"),
                employee_id: row.get("employee_id"),
                invoice_no: row.get("invoice_no"),
                invoice_date: row.get("invoice_date"),
                due_date: row.get("due_date"),
                total_amount: row.get("total_amount"),
                discount_amount: row.get("discount_amount"),
                tax_amount: row.get("tax_amount"),
                paid_amount: row.get("paid_amount"),
                payment_method: row.get("payment_method"),
                payment_status: row.get("payment_status"),
                bill_type: row.get("bill_type"),
                status: row.get("status"),
                notes: row.get("notes"),
                barcode: row.get("barcode"),
                created_by: row.get("created_by"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            };
            purchases.push(purchase);
        }

        let paginated_response = PaginatedResponse::new(purchases, total, page, limit);
        Ok(ApiResponse::success(paginated_response))
    }

    pub async fn get_purchase_by_id(&self, db: &Database, id: i64) -> Result<PurchaseBill> {
        let row = sqlx::query(
            "SELECT * FROM purchases WHERE id = ?"
        )
        .bind(id)
        .fetch_one(&db.pool)
        .await?;

        Ok(PurchaseBill {
            id: row.get("id"),
            supplier_id: row.get("supplier_id"),
            delegate_id: row.get("delegate_id"),
            employee_id: row.get("employee_id"),
            invoice_no: row.get("invoice_no"),
            invoice_date: row.get("invoice_date"),
            due_date: row.get("due_date"),
            total_amount: row.get("total_amount"),
            discount_amount: row.get("discount_amount"),
            tax_amount: row.get("tax_amount"),
            paid_amount: row.get("paid_amount"),
            payment_method: row.get("payment_method"),
            payment_status: row.get("payment_status"),
            bill_type: row.get("bill_type"),
            status: row.get("status"),
            notes: row.get("notes"),
            barcode: row.get("barcode"),
            created_by: row.get("created_by"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
    }

    pub async fn get_purchase_by_invoice_number(&self, db: &Database, invoice_no: &str) -> Result<PurchaseBill> {
        let row = sqlx::query(
            "SELECT * FROM purchases WHERE invoice_no = ?"
        )
        .bind(invoice_no)
        .fetch_one(&db.pool)
        .await?;

        Ok(PurchaseBill {
            id: row.get("id"),
            supplier_id: row.get("supplier_id"),
            delegate_id: row.get("delegate_id"),
            employee_id: row.get("employee_id"),
            invoice_no: row.get("invoice_no"),
            invoice_date: row.get("invoice_date"),
            due_date: row.get("due_date"),
            total_amount: row.get("total_amount"),
            discount_amount: row.get("discount_amount"),
            tax_amount: row.get("tax_amount"),
            paid_amount: row.get("paid_amount"),
            payment_method: row.get("payment_method"),
            payment_status: row.get("payment_status"),
            bill_type: row.get("bill_type"),
            status: row.get("status"),
            notes: row.get("notes"),
            barcode: row.get("barcode"),
            created_by: row.get("created_by"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
    }

    pub async fn update_purchase_payment_status(
        &self,
        db: &Database,
        id: i64,
        request: UpdatePurchasePaymentRequest,
    ) -> Result<ApiResponse<PurchaseBill>> {
        let mut transaction = db.pool.begin().await?;

        // Get current purchase
        let current_purchase = self.get_purchase_by_id(db, id).await?;
        let net_amount = current_purchase.total_amount - current_purchase.discount_amount + current_purchase.tax_amount;
        
        // Calculate new payment status
        let new_payment_status = if request.paid_amount >= net_amount {
            "paid".to_string()
        } else if request.paid_amount > 0.0 {
            "partial".to_string()
        } else {
            "unpaid".to_string()
        };

        // Update purchase payment status
        sqlx::query(
            r#"
            UPDATE purchases 
            SET paid_amount = ?, payment_method = ?, payment_status = ?, updated_at = ?
            WHERE id = ?
            "#
        )
        .bind(request.paid_amount)
        .bind(request.payment_method.as_deref().unwrap_or("cash"))
        .bind(&new_payment_status)
        .bind(Utc::now())
        .bind(id)
        .execute(&mut *transaction)
        .await?;

        // Update supplier balance
        let balance_change = request.paid_amount - current_purchase.paid_amount;
        if balance_change != 0.0 {
            sqlx::query(
                "UPDATE suppliers SET current_balance = current_balance - ? WHERE id = ?"
            )
            .bind(balance_change)
            .bind(current_purchase.supplier_id)
            .execute(&mut *transaction)
            .await?;
        }

        transaction.commit().await?;

        let updated_purchase = self.get_purchase_by_id(db, id).await?;
        Ok(ApiResponse::success(updated_purchase))
    }

    pub async fn delete_purchase(&self, db: &Database, id: i64) -> Result<ApiResponse<String>> {
        let mut transaction = db.pool.begin().await?;

        // Get purchase details before deletion
        let purchase = self.get_purchase_by_id(db, id).await?;

        // Update supplier balance (reverse the payment)
        if purchase.paid_amount > 0.0 {
            sqlx::query(
                "UPDATE suppliers SET current_balance = current_balance + ? WHERE id = ?"
            )
            .bind(purchase.paid_amount)
            .bind(purchase.supplier_id)
            .execute(&mut *transaction)
            .await?;
        }

        // Delete purchase items first
        sqlx::query("DELETE FROM purchase_items WHERE purchase_id = ?")
            .bind(id)
            .execute(&mut *transaction)
            .await?;

        // Delete the purchase
        sqlx::query("DELETE FROM purchases WHERE id = ?")
            .bind(id)
            .execute(&mut *transaction)
            .await?;

        transaction.commit().await?;

        Ok(ApiResponse::message(format!("تم حذف فاتورة الشراء رقم: {}", purchase.invoice_no)))
    }

    // ==================== HELPER METHODS ====================

    async fn generate_sale_invoice_number(&self, db: &Database) -> Result<String> {
        let today = chrono::Utc::now().format("%Y%m%d").to_string();
        
        // Get the last invoice number for today
        let last_invoice = sqlx::query(
            "SELECT invoice_no FROM sales WHERE invoice_no LIKE ? ORDER BY id DESC LIMIT 1"
        )
        .bind(format!("{}%", today))
        .fetch_optional(&db.pool)
        .await?;

        let sequence = if let Some(row) = last_invoice {
            let last_no: String = row.get("invoice_no");
            let last_sequence = last_no[8..].parse::<i32>().unwrap_or(0);
            last_sequence + 1
        } else {
            1
        };

        Ok(format!("{}{:04}", today, sequence))
    }

    async fn generate_purchase_invoice_number(&self, db: &Database) -> Result<String> {
        let today = chrono::Utc::now().format("%Y%m%d").to_string();
        
        // Get the last invoice number for today
        let last_invoice = sqlx::query(
            "SELECT invoice_no FROM purchases WHERE invoice_no LIKE ? ORDER BY id DESC LIMIT 1"
        )
        .bind(format!("{}%", today))
        .fetch_optional(&db.pool)
        .await?;

        let sequence = if let Some(row) = last_invoice {
            let last_no: String = row.get("invoice_no");
            let last_sequence = last_no[8..].parse::<i32>().unwrap_or(0);
            last_sequence + 1
        } else {
            1
        };

        Ok(format!("{}{:04}", today, sequence))
    }

    async fn update_stock_inventory(
        &self,
        transaction: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
        product_id: i64,
        stock_id: i64,
        quantity: i32,
        operation: &str, // "add" or "subtract"
        transaction_type: &str,
        transaction_id: i64,
        reference_no: &str,
        notes: &str,
        created_by: Option<i64>,
    ) -> Result<()> {
        // Update stock quantity
        let quantity_change = if operation == "add" {
            quantity
        } else {
            -quantity
        };

        sqlx::query(
            "UPDATE stock_products SET quantity = quantity + ? WHERE product_id = ? AND stock_id = ?"
        )
        .bind(quantity_change)
        .bind(product_id)
        .bind(stock_id)
        .execute(&mut **transaction)
        .await?;

        // Record stock movement
        sqlx::query(
            r#"
            INSERT INTO stock_movements (
                product_id, stock_id, quantity, movement_type, transaction_type,
                transaction_id, reference_no, notes, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(product_id)
        .bind(stock_id)
        .bind(quantity)
        .bind(operation)
        .bind(transaction_type)
        .bind(transaction_id)
        .bind(reference_no)
        .bind(notes)
        .bind(created_by)
        .bind(Utc::now())
        .execute(&mut **transaction)
        .await?;

        Ok(())
    }
}
