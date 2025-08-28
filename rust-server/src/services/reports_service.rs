use anyhow::Result;
use crate::database::Database;
use crate::models::report::*;
use sqlx::{Row, SqlitePool};
use tracing::{info, warn, error};
use chrono::{Utc, DateTime, NaiveDate, NaiveDateTime, Datelike};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Clone)]
pub struct ReportsService;

impl ReportsService {
    pub fn new() -> Self {
        Self
    }

    // Get dashboard summary
    pub async fn get_dashboard_summary(&self, db: &Database, start_date: Option<String>, end_date: Option<String>, period: Option<String>) -> Result<DashboardSummary> {
        let (first_day_of_month, last_day_of_month) = self.calculate_period_dates(start_date, end_date, period).await?;
        
        // Get today's date in YYYY-MM-DD format
        let today = chrono::Utc::now().date_naive().to_string();
        let yesterday = (chrono::Utc::now().date_naive() - chrono::Duration::days(1)).to_string();

        // Get today's invoices count and total
        let today_invoices_result = sqlx::query(r#"
            SELECT 
                COUNT(*) as count, 
                COALESCE(SUM(CASE WHEN status != 'returned' THEN total_amount ELSE 0 END), 0) as total,
                COUNT(CASE WHEN payment_status = 'paid' AND status != 'returned' THEN 1 END) as paid_count,
                COUNT(CASE WHEN payment_status = 'partial' AND status != 'returned' THEN 1 END) as partial_count,
                COUNT(CASE WHEN payment_status = 'unpaid' AND status != 'returned' THEN 1 END) as unpaid_count
            FROM sales 
            WHERE DATE(created_at) = ?
        "#)
        .bind(&today)
        .fetch_one(&db.pool)
        .await?;

        // Get yesterday's sales total for comparison
        let yesterday_sales_result = sqlx::query(r#"
            SELECT 
                COALESCE(SUM(CASE WHEN status != 'returned' THEN total_amount ELSE 0 END), 0) as total,
                COUNT(CASE WHEN status != 'returned' THEN 1 END) as count
            FROM sales 
            WHERE DATE(created_at) = ?
        "#)
        .bind(&yesterday)
        .fetch_one(&db.pool)
        .await?;

        // Consolidated sales and profit calculation - MAIN QUERY
        let sales_and_profit_result = sqlx::query(r#"
            SELECT 
                -- Sales totals by payment status
                COALESCE(SUM(
                    CASE WHEN s.payment_status = 'paid' AND s.status != 'returned' THEN 
                        (si.quantity - COALESCE(si.returned_quantity, 0)) * si.price
                    ELSE 0 END
                ), 0) as paid_amount,
                
                COALESCE(SUM(
                    CASE WHEN s.payment_status = 'partial' AND s.status != 'returned' THEN 
                        (si.quantity - COALESCE(si.returned_quantity, 0)) * si.price
                    ELSE 0 END
                ), 0) as partial_amount,
                
                COALESCE(SUM(
                    CASE WHEN s.payment_status = 'unpaid' AND s.status != 'returned' THEN 
                        (si.quantity - COALESCE(si.returned_quantity, 0)) * si.price
                    ELSE 0 END
                ), 0) as unpaid_amount,
                
                -- Total sales (net of returns)
                COALESCE(SUM(
                    CASE WHEN s.status != 'returned' THEN 
                        (si.quantity - COALESCE(si.returned_quantity, 0)) * si.price
                    ELSE 0 END
                ), 0) as total_sales,
                
                -- Cost of goods sold (net of returns)
                COALESCE(SUM(
                    CASE WHEN s.status != 'returned' THEN 
                        (si.quantity - COALESCE(si.returned_quantity, 0)) * p.purchase_price
                    ELSE 0 END
                ), 0) as cost_of_goods,
                
                -- Gross profit (net of returns)
                COALESCE(SUM(
                    CASE WHEN s.status != 'returned' THEN 
                        (si.quantity - COALESCE(si.returned_quantity, 0)) * (si.price - p.purchase_price)
                    ELSE 0 END
                ), 0) as gross_profit,
                
                -- Counts
                COUNT(DISTINCT CASE WHEN s.status != 'returned' THEN s.id END) as sales_count,
                COUNT(DISTINCT CASE WHEN s.status != 'returned' THEN s.customer_id END) as customers_count,
                
                -- Returns data
                COALESCE(SUM(
                    CASE WHEN s.status = 'returned' THEN 
                        (si.quantity - COALESCE(si.returned_quantity, 0)) * si.price
                    ELSE 0 END
                ), 0) as returns_amount,
                
                COUNT(CASE WHEN s.status = 'returned' THEN 1 END) as returns_count
            FROM sales s
            JOIN sale_items si ON s.id = si.sale_id
            LEFT JOIN products p ON si.product_id = p.id AND si.product_id > 0
            WHERE DATE(s.created_at) BETWEEN ? AND ?
              AND s.status NOT IN ('cancelled')
              AND (si.quantity - COALESCE(si.returned_quantity, 0)) > 0
        "#)
        .bind(&first_day_of_month)
        .bind(&last_day_of_month)
        .fetch_one(&db.pool)
        .await?;

        // Get best selling products (excluding returned items)
        let best_selling_products_result = sqlx::query(r#"
            SELECT 
                p.id,
                p.name,
                p.sku as code,
                SUM(si.quantity - COALESCE(si.returned_quantity, 0)) as total_quantity,
                SUM((si.quantity - COALESCE(si.returned_quantity, 0)) * si.price) as total_revenue,
                p.current_stock as current_stock
            FROM sale_items si
            LEFT JOIN products p ON si.product_id = p.id AND si.product_id > 0
            JOIN sales s ON si.sale_id = s.id
            WHERE DATE(s.created_at) BETWEEN ? AND ?
              AND s.status != 'returned'
              AND (si.quantity - COALESCE(si.returned_quantity, 0)) > 0
            GROUP BY p.id, p.name, p.sku, p.current_stock
            ORDER BY total_quantity DESC
            LIMIT 5
        "#)
        .bind(&first_day_of_month)
        .bind(&last_day_of_month)
        .fetch_all(&db.pool)
        .await?;

        // Get expenses for the period
        let expenses_result = sqlx::query(r#"
            SELECT 
                COALESCE(SUM(amount), 0) as total,
                COUNT(*) as count
            FROM expenses 
            WHERE date BETWEEN ? AND ?
        "#)
        .bind(&first_day_of_month)
        .bind(&last_day_of_month)
        .fetch_one(&db.pool)
        .await?;

        // Get purchases for the period
        let purchases_result = sqlx::query(r#"
            SELECT 
                COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as total,
                COUNT(*) as count,
                COUNT(DISTINCT supplier_id) as suppliers_count
            FROM purchases 
            WHERE DATE(created_at) BETWEEN ? AND ?
        "#)
        .bind(&first_day_of_month)
        .bind(&last_day_of_month)
        .fetch_one(&db.pool)
        .await?;

        // Get debts statistics
        let debts_result = sqlx::query(r#"
            SELECT 
                COUNT(*) as total_debts,
                COALESCE(SUM(total_amount - paid_amount), 0) as total_remaining,
                COUNT(DISTINCT customer_id) as customers_with_debt,
                COUNT(CASE WHEN due_date < DATE('now') THEN 1 END) as overdue_debts,
                COALESCE(SUM(CASE WHEN due_date < DATE('now') THEN (total_amount - paid_amount) ELSE 0 END), 0) as overdue_amount
            FROM sales 
            WHERE payment_status IN ('partial', 'unpaid')
        "#)
        .fetch_one(&db.pool)
        .await?;

        // Get supplier debts (unpaid purchases)
        let supplier_debts_result = sqlx::query(r#"
            SELECT 
                COUNT(*) as total_debts,
                COALESCE(SUM(remaining_amount), 0) as total_remaining,
                COUNT(DISTINCT supplier_id) as suppliers_with_debt,
                COUNT(CASE WHEN due_date < DATE('now') THEN 1 END) as overdue_debts,
                COALESCE(SUM(CASE WHEN due_date < DATE('now') THEN remaining_amount ELSE 0 END), 0) as overdue_amount
            FROM purchases 
            WHERE payment_status IN ('partial', 'unpaid')
        "#)
        .fetch_one(&db.pool)
        .await?;

        // Get period cash flow
        let period_cash_flow_result = sqlx::query(r#"
            SELECT 
                -- Cash sales (money in)
                COALESCE(SUM(CASE 
                    WHEN s.status != 'returned' 
                    THEN (si.quantity - COALESCE(si.returned_quantity, 0)) * si.price
                    ELSE 0 
                END), 0) as cash_sales,
                
                -- Cash purchases (money out) for the period
                (SELECT COALESCE(SUM(total_amount), 0) FROM purchases 
                    WHERE DATE(created_at) BETWEEN ? AND ? 
                      AND status != 'cancelled' AND payment_method = 'cash') as cash_purchases,
                
                -- Cash expenses (all expenses are considered cash for now)
                (SELECT COALESCE(SUM(amount), 0) FROM expenses 
                    WHERE date BETWEEN ? AND ?) as cash_expenses,
                
                -- Cash customer receipts
                (SELECT COALESCE(SUM(amount), 0) FROM customer_receipts 
                    WHERE receipt_date BETWEEN ? AND ? AND payment_method = 'cash') as cash_receipts,
                
                -- Cash supplier payments
                (SELECT COALESCE(SUM(amount), 0) FROM supplier_payment_receipts 
                    WHERE receipt_date BETWEEN ? AND ? AND payment_method = 'cash') as cash_supplier_payments
            FROM sales s
            LEFT JOIN sale_items si ON s.id = si.sale_id
            WHERE DATE(s.created_at) BETWEEN ? AND ?
        "#)
        .bind(&first_day_of_month)
        .bind(&last_day_of_month)
        .bind(&first_day_of_month)
        .bind(&last_day_of_month)
        .bind(&first_day_of_month)
        .bind(&last_day_of_month)
        .bind(&first_day_of_month)
        .bind(&last_day_of_month)
        .bind(&first_day_of_month)
        .bind(&last_day_of_month)
        .fetch_one(&db.pool)
        .await?;

        // Get top customers with debts
        let top_customers_with_debts_result = sqlx::query(r#"
            SELECT 
                c.id,
                c.name as customer_name,
                c.phone as customer_phone,
                COUNT(s.id) as debt_count,
                COALESCE(SUM(s.total_amount - s.paid_amount), 0) as total_debt,
                MAX(s.due_date) as latest_due_date,
                COUNT(CASE WHEN s.due_date < DATE('now') THEN 1 END) as overdue_count
            FROM customers c
            JOIN sales s ON c.id = s.customer_id
            WHERE s.payment_status IN ('partial', 'unpaid')
            GROUP BY c.id, c.name, c.phone
            ORDER BY total_debt DESC
            LIMIT 5
        "#)
        .fetch_all(&db.pool)
        .await?;

        // Get top suppliers with debts
        let top_suppliers_with_debts_result = sqlx::query(r#"
            SELECT 
                s.id,
                s.name as supplier_name,
                s.phone as supplier_phone,
                COUNT(p.id) as debt_count,
                COALESCE(SUM(p.remaining_amount), 0) as total_debt,
                MAX(p.due_date) as latest_due_date,
                COUNT(CASE WHEN p.due_date < DATE('now') THEN 1 END) as overdue_count
            FROM suppliers s
            JOIN purchases p ON s.id = p.supplier_id
            WHERE p.payment_status IN ('partial', 'unpaid')
            GROUP BY s.id, s.name, s.phone
            ORDER BY total_debt DESC
            LIMIT 5
        "#)
        .fetch_all(&db.pool)
        .await?;

        // Get cash flow trend for the last 7 days
        let cash_flow_trend_result = sqlx::query(r#"
            SELECT 
                DATE(s.created_at) as date,
                -- Daily cash sales
                COALESCE(SUM(CASE 
                    WHEN s.payment_method = 'cash' AND s.status != 'returned' 
                    THEN (si.quantity - COALESCE(si.returned_quantity, 0)) * si.price
                    ELSE 0 
                END), 0) as cash_sales,
                
                -- Daily cash purchases
                COALESCE(SUM(CASE 
                    WHEN p.payment_method = 'cash' AND p.status != 'cancelled'
                    THEN p.total_amount
                    ELSE 0 
                END), 0) as cash_purchases,
                
                -- Daily cash expenses (all expenses are considered cash for now)
                COALESCE(SUM(e.amount), 0) as cash_expenses
            FROM sales s
            LEFT JOIN sale_items si ON s.id = si.sale_id
            LEFT JOIN purchases p ON DATE(p.created_at) = DATE(s.created_at)
            LEFT JOIN expenses e ON DATE(e.date) = DATE(s.created_at)
            WHERE s.created_at >= DATE('now', '-7 days')
            GROUP BY DATE(s.created_at)
            ORDER BY DATE(s.created_at)
        "#)
        .fetch_all(&db.pool)
        .await?;

        let customers_result = sqlx::query(r#"
            SELECT 
                COUNT(*) as count,
                COUNT(CASE WHEN created_at >= ? THEN 1 END) as new_customers
            FROM customers
        "#)
        .bind(&first_day_of_month)
        .fetch_one(&db.pool)
        .await?;

        let suppliers_result = sqlx::query("SELECT COUNT(*) as count FROM suppliers")
            .fetch_one(&db.pool)
            .await?;
        
        let products_result = sqlx::query(r#"
            SELECT 
                COUNT(*) as count,
                COALESCE(SUM(current_stock), 0) as total_stock,
                COALESCE(SUM(current_stock * purchase_price), 0) as stock_value
            FROM products
        "#)
        .fetch_one(&db.pool)
        .await?;
        
        let low_stock_result = sqlx::query(r#"
            SELECT COUNT(*) as count 
            FROM products 
            WHERE current_stock < 10 AND current_stock > 0
        "#)
        .fetch_one(&db.pool)
        .await?;

        let out_of_stock_result = sqlx::query(r#"
            SELECT COUNT(*) as count 
            FROM products 
            WHERE current_stock = 0
        "#)
        .fetch_one(&db.pool)
        .await?;

        // Calculate sales comparison
        let today_sales: f64 = today_invoices_result.get("total");
        let yesterday_sales: f64 = yesterday_sales_result.get("total");
        let sales_comparison = if yesterday_sales == 0.0 { 100.0 } else { ((today_sales - yesterday_sales) / yesterday_sales) * 100.0 };

        // Get daily sales trend for the current month
        let sales_trend_result = sqlx::query(r#"
            SELECT 
                DATE(s.created_at) as date,
                COALESCE(SUM(CASE WHEN s.status != 'returned' THEN 
                    (si.quantity - COALESCE(si.returned_quantity, 0)) * si.price
                ELSE 0 END), 0) as daily_sales
            FROM sales s
            JOIN sale_items si ON s.id = si.sale_id
            WHERE DATE(s.created_at) BETWEEN ? AND ?
              AND s.status NOT IN ('cancelled', 'returned')
            GROUP BY DATE(s.created_at)
            ORDER BY DATE(s.created_at)
        "#)
        .bind(&first_day_of_month)
        .bind(&last_day_of_month)
        .fetch_all(&db.pool)
        .await?;

        // Get daily purchases trend for the current month
        let purchases_trend_result = sqlx::query(r#"
            SELECT 
                DATE(created_at) as date,
                COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as daily_purchases
            FROM purchases
            WHERE DATE(created_at) BETWEEN ? AND ?
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at)
        "#)
        .bind(&first_day_of_month)
        .bind(&last_day_of_month)
        .fetch_all(&db.pool)
        .await?;

        // Extract data from the main consolidated query
        let sales_data = sales_and_profit_result;
        
        // Calculate net profit
        let gross_profit: f64 = sales_data.get("gross_profit");
        let total_expenses: f64 = expenses_result.get("total");
        let net_profit = gross_profit - total_expenses;
        
        // Calculate profit margin
        let total_sales: f64 = sales_data.get("total_sales");
        let profit_margin = if total_sales > 0.0 { 
            (net_profit / total_sales) * 100.0 
        } else { 
            0.0 
        };

        // Format trend data
        let sales_trend_labels: Vec<String> = sales_trend_result.iter().map(|row| {
            let date_str: String = row.get("date");
            let date = NaiveDate::parse_from_str(&date_str, "%Y-%m-%d").unwrap_or_default();
            format!("{}/{}", date.day(), date.month())
        }).collect();
        
        let sales_trend_data: Vec<f64> = sales_trend_result.iter().map(|row| {
            row.get::<f64, _>("daily_sales")
        }).collect();
        
        let purchases_trend_labels: Vec<String> = purchases_trend_result.iter().map(|row| {
            let date_str: String = row.get("date");
            let date = NaiveDate::parse_from_str(&date_str, "%Y-%m-%d").unwrap_or_default();
            format!("{}/{}", date.day(), date.month())
        }).collect();
        
        let purchases_trend_data: Vec<f64> = purchases_trend_result.iter().map(|row| {
            row.get::<f64, _>("daily_purchases")
        }).collect();

        // Format cash flow trend data
        let cash_flow_trend_labels: Vec<String> = cash_flow_trend_result.iter().map(|row| {
            let date_str: String = row.get("date");
            let date = NaiveDate::parse_from_str(&date_str, "%Y-%m-%d").unwrap_or_default();
            format!("{}/{}", date.day(), date.month())
        }).collect();
        
        let cash_flow_trend_data: Vec<f64> = cash_flow_trend_result.iter().map(|row| {
            let cash_sales: f64 = row.get("cash_sales");
            let cash_purchases: f64 = row.get("cash_purchases");
            let cash_expenses: f64 = row.get("cash_expenses");
            cash_sales + cash_purchases + cash_expenses
        }).collect();

        // Build the report data
        let report_data = DashboardSummary {
            report_type: "monthly".to_string(),
            period_start: first_day_of_month.clone(),
            period_end: last_day_of_month.clone(),
            
            sales: SalesSummary {
                total: sales_data.get("total_sales"),
                count: sales_data.get("sales_count"),
                customers_count: sales_data.get("customers_count"),
                paid_amount: sales_data.get("paid_amount"),
                partial_amount: sales_data.get("partial_amount"),
                unpaid_amount: sales_data.get("unpaid_amount"),
                returns: ReturnsSummary {
                    total_amount: sales_data.get::<f64, _>("returns_amount"),
                    count: sales_data.get::<i64, _>("returns_count"),
                    paid_amount: 0.0,
                    partial_amount: 0.0,
                    unpaid_amount: 0.0,
                },
                profit: ProfitSummary {
                    revenue: sales_data.get::<f64, _>("total_sales"),
                    cost: sales_data.get::<f64, _>("cost_of_goods"),
                    gross_profit: sales_data.get::<f64, _>("gross_profit"),
                }
            },

            today_stats: TodayStats {
                invoices_count: today_invoices_result.get::<i64, _>("count"),
                sales_total: today_sales,
                sales_comparison,
                paid_count: today_invoices_result.get::<i64, _>("paid_count"),
                partial_count: today_invoices_result.get::<i64, _>("partial_count"),
                unpaid_count: today_invoices_result.get::<i64, _>("unpaid_count"),
            },

            purchases: PurchasesSummary {
                total: purchases_result.get::<f64, _>("total"),
                count: purchases_result.get::<i64, _>("count"),
                suppliers_count: purchases_result.get::<i64, _>("suppliers_count"),
            },

            expenses: ExpensesSummary {
                total: expenses_result.get::<f64, _>("total"),
                count: expenses_result.get::<i64, _>("count"),
            },

            debts: DebtsSummary {
                total_debts: debts_result.get::<i64, _>("total_debts"),
                total_remaining: debts_result.get::<f64, _>("total_remaining"),
                customers_with_debt: debts_result.get::<i64, _>("customers_with_debt"),
                overdue_debts: debts_result.get::<i64, _>("overdue_debts"),
                overdue_amount: debts_result.get::<f64, _>("overdue_amount"),
            },

            supplier_debts: SupplierDebtsSummary {
                total_debts: supplier_debts_result.get::<i64, _>("total_debts"),
                total_remaining: supplier_debts_result.get::<f64, _>("total_remaining"),
                suppliers_with_debt: supplier_debts_result.get::<i64, _>("suppliers_with_debt"),
                overdue_debts: supplier_debts_result.get::<i64, _>("overdue_debts"),
                overdue_amount: supplier_debts_result.get::<f64, _>("overdue_amount"),
            },

            cash_flow: CashFlowData {
                cash_sales: period_cash_flow_result.get::<f64, _>("cash_sales"),
                cash_purchases: period_cash_flow_result.get::<f64, _>("cash_purchases"),
                cash_expenses: period_cash_flow_result.get::<f64, _>("cash_expenses"),
                cash_receipts: period_cash_flow_result.get::<f64, _>("cash_receipts"),
                cash_supplier_payments: period_cash_flow_result.get::<f64, _>("cash_supplier_payments"),
            },

            top_customers_with_debts: top_customers_with_debts_result.iter().map(|row| CustomerWithDebt {
                id: row.get::<i64, _>("id"),
                name: row.get::<String, _>("customer_name"),
                phone: row.get::<Option<String>, _>("customer_phone"),
                debt_count: row.get::<i64, _>("debt_count"),
                total_debt: row.get::<f64, _>("total_debt"),
                latest_due_date: row.get::<Option<NaiveDate>, _>("latest_due_date"),
                overdue_count: row.get::<i64, _>("overdue_count"),
            }).collect(),

            top_suppliers_with_debts: top_suppliers_with_debts_result.iter().map(|row| SupplierWithDebt {
                id: row.get::<i64, _>("id"),
                name: row.get::<String, _>("supplier_name"),
                phone: row.get::<Option<String>, _>("supplier_phone"),
                debt_count: row.get::<i64, _>("debt_count"),
                total_debt: row.get::<f64, _>("total_debt"),
                latest_due_date: row.get::<Option<NaiveDate>, _>("latest_due_date"),
                overdue_count: row.get::<i64, _>("overdue_count"),
            }).collect(),

            cash_flow_trend: CashFlowTrend {
                labels: cash_flow_trend_labels,
                data: cash_flow_trend_data.clone(),
                average: if !cash_flow_trend_data.is_empty() { 
                    cash_flow_trend_data.iter().sum::<f64>() / cash_flow_trend_data.len() as f64 
                } else { 
                    0.0 
                },
            },

            inventory: InventorySummary {
                total_products: products_result.get::<i64, _>("count"),
                total_stock: products_result.get::<i64, _>("total_stock"),
                stock_value: products_result.get::<f64, _>("stock_value"),
                low_stock_products: low_stock_result.get::<i64, _>("count"),
                out_of_stock_products: out_of_stock_result.get::<i64, _>("count"),
            },

            customers: CustomerSummary {
                total: customers_result.get::<i64, _>("count"),
                new_customers: customers_result.get::<i64, _>("new_customers"),
            },

            suppliers: SupplierSummary {
                total: suppliers_result.get::<i64, _>("count"),
            },

            best_selling_products: best_selling_products_result.iter().map(|row| BestSellingProduct {
                id: row.get::<i64, _>("id"),
                name: row.get::<String, _>("name"),
                code: row.get::<Option<String>, _>("code"),
                total_quantity: row.get::<i64, _>("total_quantity"),
                total_revenue: row.get::<f64, _>("total_revenue"),
                current_stock: row.get::<i64, _>("current_stock"),
            }).collect(),

            financial_summary: FinancialSummary {
                total_sales: sales_data.get("total_sales"),
                net_profit,
                cost_of_goods: sales_data.get("cost_of_goods"),
                revenue: sales_data.get("total_sales"),
                expenses: expenses_result.get("total"),
                profit_margin,
            },

            sales_trend: TrendData {
                labels: sales_trend_labels,
                data: sales_trend_data.clone(),
                average: if !sales_trend_data.is_empty() { 
                    sales_trend_data.iter().sum::<f64>() / sales_trend_data.len() as f64 
                } else { 
                    0.0 
                },
            },

            purchases_trend: TrendData {
                labels: purchases_trend_labels,
                data: purchases_trend_data.clone(),
                average: if !purchases_trend_data.is_empty() { 
                    purchases_trend_data.iter().sum::<f64>() / purchases_trend_data.len() as f64 
                } else { 
                    0.0 
                },
            },
        };

        // Check if a report already exists for this month
        let existing_report = sqlx::query(r#"
            SELECT * FROM reports 
            WHERE period_start = ? AND period_end = ?
        "#)
        .bind(&first_day_of_month)
        .bind(&last_day_of_month)
        .fetch_optional(&db.pool)
        .await?;

        if existing_report.is_none() {
            // Insert new report
            sqlx::query(r#"
                INSERT INTO reports (
                    report_type, period_start, period_end, total_sales, total_purchases,
                    total_expenses, net_profit, total_customers, total_suppliers,
                    total_products, low_stock_products, out_of_stock_products,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            "#)
            .bind(&report_data.report_type)
            .bind(&report_data.period_start)
            .bind(&report_data.period_end)
            .bind(report_data.sales.total)
            .bind(report_data.purchases.total)
            .bind(report_data.expenses.total)
            .bind(report_data.financial_summary.net_profit)
            .bind(report_data.customers.total)
            .bind(report_data.suppliers.total)
            .bind(report_data.inventory.total_products)
            .bind(report_data.inventory.low_stock_products)
            .bind(report_data.inventory.out_of_stock_products)
            .execute(&db.pool)
            .await?;
        } else {
            // Update existing report
            sqlx::query(r#"
                UPDATE reports 
                SET 
                    total_sales = ?,
                    total_purchases = ?,
                    total_expenses = ?,
                    net_profit = ?,
                    total_customers = ?,
                    total_suppliers = ?,
                    total_products = ?,
                    low_stock_products = ?,
                    out_of_stock_products = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE period_start = ? AND period_end = ?
            "#)
            .bind(report_data.sales.total)
            .bind(report_data.purchases.total)
            .bind(report_data.expenses.total)
            .bind(report_data.financial_summary.net_profit)
            .bind(report_data.customers.total)
            .bind(report_data.suppliers.total)
            .bind(report_data.inventory.total_products)
            .bind(report_data.inventory.low_stock_products)
            .bind(report_data.inventory.out_of_stock_products)
            .bind(&report_data.period_start)
            .bind(&report_data.period_end)
            .execute(&db.pool)
            .await?;
        }

        Ok(report_data)
    }

    // Helper function to calculate period dates
    async fn calculate_period_dates(&self, start_date: Option<String>, end_date: Option<String>, period: Option<String>) -> Result<(String, String)> {
        let (first_day_of_month, last_day_of_month) = if let (Some(start), Some(end)) = (start_date, end_date) {
            (start, end)
        } else {
            let current_date = chrono::Utc::now().date_naive();
            
            match period.as_deref() {
                Some("week") => {
                    // Get current week (Monday to Sunday)
                    let day_of_week = current_date.weekday().num_days_from_monday();
                    let monday = current_date - chrono::Duration::days(day_of_week as i64);
                    let sunday = monday + chrono::Duration::days(6);
                    (monday.to_string(), sunday.to_string())
                },
                Some("year") => {
                    // Get current year
                    let year = current_date.year();
                    let first_day = NaiveDate::from_ymd_opt(year, 1, 1).unwrap();
                    let last_day = NaiveDate::from_ymd_opt(year, 12, 31).unwrap();
                    (first_day.to_string(), last_day.to_string())
                },
                Some("month") => {
                    // Get current month (1st to last day)
                    let year = current_date.year();
                    let month = current_date.month();
                    let first_day = NaiveDate::from_ymd_opt(year, month, 1).unwrap();
                    let last_day = NaiveDate::from_ymd_opt(year, month + 1, 1).unwrap().pred_opt().unwrap();
                    (first_day.to_string(), last_day.to_string())
                },
                _ => {
                    // Default to last 30 days
                    let thirty_days_ago = current_date - chrono::Duration::days(30);
                    (thirty_days_ago.to_string(), current_date.to_string())
                }
            }
        };
        
        Ok((first_day_of_month, last_day_of_month))
    }
}
