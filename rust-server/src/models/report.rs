use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{NaiveDateTime, NaiveDate};
use super::PaginationInfo;

#[derive(Debug, Serialize, Deserialize)]
pub struct ReportQuery {
    pub start: Option<String>,
    pub end: Option<String>,
    pub period: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub payment_status: Option<String>,
    pub product_id: Option<i64>,
    pub customer_id: Option<i64>,
    pub company_id: Option<i64>,
    pub category_id: Option<i64>,
    pub debt_type: Option<String>,
    pub debt_status: Option<String>,
    pub box_id: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardSummary {
    pub report_type: String,
    pub period_start: String,
    pub period_end: String,
    pub sales: SalesSummary,
    pub today_stats: TodayStats,
    pub purchases: PurchasesSummary,
    pub expenses: ExpensesSummary,
    pub debts: DebtsSummary,
    pub supplier_debts: SupplierDebtsSummary,
    pub cash_flow: CashFlowData,
    pub top_customers_with_debts: Vec<CustomerWithDebt>,
    pub top_suppliers_with_debts: Vec<SupplierWithDebt>,
    pub cash_flow_trend: CashFlowTrend,
    pub inventory: InventorySummary,
    pub customers: CustomerSummary,
    pub suppliers: SupplierSummary,
    pub best_selling_products: Vec<BestSellingProduct>,
    pub financial_summary: FinancialSummary,
    pub sales_trend: TrendData,
    pub purchases_trend: TrendData,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SalesSummary {
    pub total: f64,
    pub count: i64,
    pub customers_count: i64,
    pub paid_amount: f64,
    pub partial_amount: f64,
    pub unpaid_amount: f64,
    pub returns: ReturnsSummary,
    pub profit: ProfitSummary,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReturnsSummary {
    pub total_amount: f64,
    pub count: i64,
    pub paid_amount: f64,
    pub partial_amount: f64,
    pub unpaid_amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProfitSummary {
    pub revenue: f64,
    pub cost: f64,
    pub gross_profit: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TodayStats {
    pub invoices_count: i64,
    pub sales_total: f64,
    pub sales_comparison: f64,
    pub paid_count: i64,
    pub partial_count: i64,
    pub unpaid_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PurchasesSummary {
    pub total: f64,
    pub count: i64,
    pub suppliers_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExpensesSummary {
    pub total: f64,
    pub count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DebtsSummary {
    pub total_debts: i64,
    pub total_remaining: f64,
    pub customers_with_debt: i64,
    pub overdue_debts: i64,
    pub overdue_amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SupplierDebtsSummary {
    pub total_debts: i64,
    pub total_remaining: f64,
    pub suppliers_with_debt: i64,
    pub overdue_debts: i64,
    pub overdue_amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CashFlowData {
    pub cash_sales: f64,
    pub cash_purchases: f64,
    pub cash_expenses: f64,
    pub cash_receipts: f64,
    pub cash_supplier_payments: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomerWithDebt {
    pub id: i64,
    pub name: String,
    pub phone: Option<String>,
    pub debt_count: i64,
    pub total_debt: f64,
    pub latest_due_date: Option<NaiveDate>,
    pub overdue_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SupplierWithDebt {
    pub id: i64,
    pub name: String,
    pub phone: Option<String>,
    pub debt_count: i64,
    pub total_debt: f64,
    pub latest_due_date: Option<NaiveDate>,
    pub overdue_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CashFlowTrend {
    pub labels: Vec<String>,
    pub data: Vec<f64>,
    pub average: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InventorySummary {
    pub total_products: i64,
    pub total_stock: i64,
    pub stock_value: f64,
    pub low_stock_products: i64,
    pub out_of_stock_products: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomerSummary {
    pub total: i64,
    pub new_customers: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SupplierSummary {
    pub total: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BestSellingProduct {
    pub id: i64,
    pub name: String,
    pub code: Option<String>,
    pub total_quantity: i64,
    pub total_revenue: f64,
    pub current_stock: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FinancialSummary {
    pub total_sales: f64,
    pub net_profit: f64,
    pub cost_of_goods: f64,
    pub revenue: f64,
    pub expenses: f64,
    pub profit_margin: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TrendData {
    pub labels: Vec<String>,
    pub data: Vec<f64>,
    pub average: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProfitLossReport {
    pub id: i64,
    pub report_type: String,
    pub period_start: String,
    pub period_end: String,
    pub total_sales: f64,
    pub total_purchases: f64,
    pub total_expenses: f64,
    pub net_profit: f64,
    pub total_customers: i64,
    pub total_suppliers: i64,
    pub total_products: i64,
    pub low_stock_products: i64,
    pub out_of_stock_products: i64,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReturnsReport {
    pub summary: ReturnsReportSummary,
    pub monthly_breakdown: Vec<MonthlyReturns>,
    pub top_products: Vec<ReturnsByProduct>,
    pub top_customers: Vec<ReturnsByCustomer>,
    pub detailed_returns: Vec<DetailedReturn>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReturnsReportSummary {
    pub total_returns: i64,
    pub full_returns: i64,
    pub partial_returns: i64,
    pub total_return_value: f64,
    pub customers_with_returns: i64,
    pub average_return_value: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MonthlyReturns {
    pub month_key: String,
    pub month_name: String,
    pub return_count: i64,
    pub full_returns: i64,
    pub partial_returns: i64,
    pub return_value: f64,
    pub unique_customers: i64,
    pub average_return_value: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReturnsByProduct {
    pub id: i64,
    pub name: String,
    pub code: Option<String>,
    pub return_count: i64,
    pub total_returned_quantity: i64,
    pub total_returned_value: f64,
    pub average_return_value: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReturnsByCustomer {
    pub id: i64,
    pub name: String,
    pub phone: Option<String>,
    pub return_count: i64,
    pub total_return_value: f64,
    pub full_returns: i64,
    pub partial_returns: i64,
    pub average_return_value: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DetailedReturn {
    pub id: i64,
    pub invoice_no: String,
    pub invoice_date: NaiveDate,
    pub total_amount: f64,
    pub status: String,
    pub payment_status: String,
    pub customer_name: String,
    pub customer_phone: Option<String>,
    pub created_by_name: String,
    pub total_returned_items: i64,
    pub returned_value: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StocksReport {
    pub pagination: PaginationInfo,
    pub summary: StockQuantitiesSummary,
    pub expiry_alerts: Vec<ExpiryAlert>,
    pub low_stock_alerts: Vec<LowStockAlert>,
    pub top_selling_products: Vec<TopSellingProduct>,
    pub stock_movements: Vec<StockMovement>,
    pub stock_value_by_category: Vec<StockValueByCategory>,
    pub recent_activities: Vec<RecentStockActivity>,
    pub inventory_aging: Vec<InventoryAging>,
    pub stock_value_analysis: Vec<StockValueAnalysis>,
    pub stock_movement_summary: Vec<StockMovementSummary>,
}



#[derive(Debug, Serialize, Deserialize)]
pub struct StockQuantitiesSummary {
    pub total_products: i64,
    pub total_quantity: i64,
    pub total_value: f64,
    pub out_of_stock_count: i64,
    pub low_stock_count: i64,
    pub good_stock_count: i64,
    pub average_stock_per_product: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExpiryAlert {
    pub id: i64,
    pub product_name: String,
    pub product_sku: String,
    pub current_stock: i64,
    pub expiry_date: NaiveDate,
    pub purchase_price: f64,
    pub selling_price: f64,
    pub stock_value: f64,
    pub expiry_status: String,
    pub days_until_expiry: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LowStockAlert {
    pub id: i64,
    pub product_name: String,
    pub product_sku: String,
    pub current_stock: i64,
    pub min_stock_level: i64,
    pub purchase_price: f64,
    pub selling_price: f64,
    pub stock_value: f64,
    pub category_name: String,
    pub stock_status: String,
    pub stock_status_text: String,
    pub current_value: f64,
    pub min_stock_value: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TopSellingProduct {
    pub id: i64,
    pub product_name: String,
    pub product_sku: String,
    pub current_stock: i64,
    pub purchase_price: f64,
    pub selling_price: f64,
    pub total_sold_quantity: i64,
    pub total_sold_value: f64,
    pub total_profit: f64,
    pub sales_count: i64,
    pub average_quantity_per_sale: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockMovement {
    pub id: i64,
    pub product_name: String,
    pub product_sku: String,
    pub current_stock: i64,
    pub total_purchased: i64,
    pub total_sold: i64,
    pub total_returned: i64,
    pub total_adjusted: i64,
    pub purchase_movements: i64,
    pub sale_movements: i64,
    pub return_movements: i64,
    pub adjustment_movements: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockValueByCategory {
    pub category_name: String,
    pub products_count: i64,
    pub total_quantity: i64,
    pub total_value: f64,
    pub average_stock_per_product: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecentStockActivity {
    pub id: i64,
    pub movement_type: String,
    pub quantity: i64,
    pub created_at: NaiveDateTime,
    pub product_name: String,
    pub product_sku: String,
    pub category_name: String,
    pub notes: Option<String>,
    pub reference_type: Option<String>,
    pub reference_number: Option<String>,
    pub movement_type_text: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InventoryAging {
    pub id: i64,
    pub product_name: String,
    pub product_sku: String,
    pub current_stock: i64,
    pub purchase_price: f64,
    pub selling_price: f64,
    pub stock_value: f64,
    pub category_name: String,
    pub stock_level: String,
    pub stock_level_text: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockValueAnalysis {
    pub category_name: String,
    pub products_count: i64,
    pub total_quantity: i64,
    pub total_purchase_value: f64,
    pub total_selling_value: f64,
    pub potential_profit: f64,
    pub average_stock_per_product: f64,
    pub average_purchase_price: f64,
    pub average_selling_price: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockMovementSummary {
    pub movement_type: String,
    pub movement_count: i64,
    pub total_quantity: i64,
    pub movement_type_text: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SalesAnalysis {
    pub summary: SalesAnalysisSummary,
    pub trends: SalesTrends,
    pub top_products: Vec<SalesAnalysisProduct>,
    pub top_customers: Vec<SalesAnalysisCustomer>,
    pub sales_by_category: Vec<SalesByCategory>,
    pub payment_analysis: PaymentAnalysis,
    pub performance_metrics: PerformanceMetrics,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SalesAnalysisSummary {
    pub total_sales: f64,
    pub total_orders: i64,
    pub average_order_value: f64,
    pub total_customers: i64,
    pub new_customers: i64,
    pub repeat_customers: i64,
    pub conversion_rate: f64,
    pub total_profit: f64,
    pub profit_margin: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SalesTrends {
    pub daily_sales: Vec<DailySales>,
    pub monthly_sales: Vec<MonthlySales>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DailySales {
    pub date: String,
    pub sales: f64,
    pub orders: i64,
    pub customers: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MonthlySales {
    pub month: String,
    pub sales: f64,
    pub orders: i64,
    pub profit: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SalesAnalysisProduct {
    pub id: i64,
    pub name: String,
    pub sku: String,
    pub quantity_sold: i64,
    pub revenue: f64,
    pub profit: f64,
    pub profit_margin: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SalesAnalysisCustomer {
    pub id: i64,
    pub name: String,
    pub phone: Option<String>,
    pub total_orders: i64,
    pub total_spent: f64,
    pub average_order: f64,
    pub last_order_date: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SalesByCategory {
    pub category: String,
    pub sales: f64,
    pub orders: i64,
    pub products: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaymentAnalysis {
    pub payment_methods: Vec<PaymentMethodData>,
    pub payment_status: Vec<PaymentStatusData>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaymentMethodData {
    pub method: String,
    pub count: i64,
    pub amount: f64,
    pub percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaymentStatusData {
    pub status: String,
    pub count: i64,
    pub amount: f64,
    pub percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub sales_growth: f64,
    pub customer_growth: f64,
    pub average_order_growth: f64,
    pub profit_growth: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DelegateReport {
    pub id: i64,
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub total_sales: i64,
    pub total_revenue: f64,
    pub avg_sale_value: f64,
    pub unique_customers: i64,
    pub last_sale_date: Option<NaiveDateTime>,
    pub products: Vec<DelegateProduct>,
    pub customer_receipts: Vec<DelegateReceipt>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DelegateProduct {
    pub delegate_id: i64,
    pub product_id: i64,
    pub product_name: String,
    pub product_sku: String,
    pub product_barcode: Option<String>,
    pub total_quantity_sold: i64,
    pub total_revenue: f64,
    pub avg_price: f64,
    pub number_of_sales: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DelegateReceipt {
    pub delegate_id: i64,
    pub receipt_id: i64,
    pub receipt_number: String,
    pub receipt_date: NaiveDate,
    pub amount: f64,
    pub payment_method: String,
    pub notes: Option<String>,
    pub customer_name: String,
    pub customer_phone: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomerReport {
    pub id: i64,
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub total_invoices: i64,
    pub total_spent: f64,
    pub avg_invoice_value: f64,
    pub paid_amount: f64,
    pub partial_amount: f64,
    pub unpaid_amount: f64,
    pub last_purchase_date: Option<NaiveDateTime>,
    pub payment_status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SupplierReport {
    pub id: i64,
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub total_purchases: i64,
    pub total_spent: f64,
    pub avg_purchase_value: f64,
    pub paid_amount: f64,
    pub partial_amount: f64,
    pub unpaid_amount: f64,
    pub last_purchase_date: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SalesReport {
    pub id: i64,
    pub invoice_no: String,
    pub created_at: NaiveDateTime,
    pub customer_name: String,
    pub delegate_name: Option<String>,
    pub product_name: String,
    pub product_code: String,
    pub quantity: i64,
    pub price: f64,
    pub total_amount: f64,
    pub payment_status: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductReport {
    pub id: i64,
    pub name: String,
    pub sku: String,
    pub description: Option<String>,
    pub category_name: Option<String>,
    pub total_sales: i64,
    pub total_quantity_sold: i64,
    pub total_revenue: f64,
    pub avg_sale_price: f64,
    pub min_sale_price: f64,
    pub max_sale_price: f64,
    pub unique_customers: i64,
    pub last_sale_date: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompanyReport {
    pub id: i64,
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub total_invoices: i64,
    pub total_spent: f64,
    pub avg_invoice_value: f64,
    pub paid_amount: f64,
    pub partial_amount: f64,
    pub unpaid_amount: f64,
    pub last_purchase_date: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockReport {
    pub id: i64,
    pub name: String,
    pub sku: String,
    pub category_name: Option<String>,
    pub current_stock: i64,
    pub min_stock_level: i64,
    pub cost_price: f64,
    pub sale_price: f64,
    pub stock_value: f64,
    pub movement_count: i64,
    pub total_in: i64,
    pub total_out: i64,
    pub last_movement_date: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DebtsReport {
    pub customer_debts: Vec<CustomerDebt>,
    pub supplier_debts: Vec<SupplierDebt>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomerDebt {
    pub debt_type: String,
    pub id: i64,
    pub name: String,
    pub phone: Option<String>,
    pub total_debt: f64,
    pub partial_amount: f64,
    pub unpaid_amount: f64,
    pub invoice_count: i64,
    pub last_invoice_date: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SupplierDebt {
    pub debt_type: String,
    pub id: i64,
    pub name: String,
    pub phone: Option<String>,
    pub total_debt: f64,
    pub partial_amount: f64,
    pub unpaid_amount: f64,
    pub purchase_count: i64,
    pub last_purchase_date: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MoneyBoxReport {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub initial_balance: f64,
    pub total_deposits: f64,
    pub total_withdrawals: f64,
    pub current_balance: f64,
    pub transaction_count: i64,
    pub last_transaction_date: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExpensesReport {
    pub id: i64,
    pub description: String,
    pub amount: f64,
    pub date: NaiveDate,
    pub category_name: Option<String>,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomerDebtsDetailedReport {
    pub id: i64,
    pub invoice_no: String,
    pub created_at: NaiveDateTime,
    pub due_date: NaiveDate,
    pub customer_name: String,
    pub customer_phone: Option<String>,
    pub total_amount: f64,
    pub paid_amount: f64,
    pub remaining_amount: f64,
    pub payment_status: String,
    pub days_overdue: i64,
}
