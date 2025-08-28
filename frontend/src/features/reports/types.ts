// frontend/src/features/reports/types.ts

export interface SaleSummary {
  total: number;
  count: number;
  paid_amount: number;
  partial_amount: number;
  unpaid_amount: number;
  customers_count: number;
  returns?: {
    total_amount: number;
    count: number;
    paid_amount: number;
    partial_amount: number;
    unpaid_amount: number;
  };
  profit?: {
    revenue: number;
    cost: number;
    gross_profit: number;
  };
}

export interface ExpenseSummary {
  total: number;
  count: number;
}

export interface FinancialSummary {
  total_sales: number;
  net_profit: number;
  cost_of_goods: number;
  revenue: number;
  expenses: number;
  profit_margin: number;
}

export interface InventorySummary {
  total_products: number;
  total_stock: number;
  stock_value: number;
  low_stock_products: number;
  out_of_stock_products: number;
}

export interface BestSellingProduct {
  id: number;
  name: string;
  code: string;
  total_quantity: number;
  total_revenue: number;
  current_stock?: number;
}

export interface DebtSummary {
  total_debts: number;
  total_remaining: number;
  overdue_debts: number;
  overdue_amount: number;
  customers_with_debt: number;
}

export interface SupplierDebtSummary {
  total_debts: number;
  total_remaining: number;
  suppliers_with_debt: number;
  overdue_debts: number;
  overdue_amount: number;
}

export interface CashFlowSummary {
  cash_sales: number;
  cash_purchases: number;
  cash_expenses: number;
  cash_receipts: number;
  cash_supplier_payments: number;
}

export interface TopDebtor {
  id: number;
  name: string;
  phone: string;
  debt_count: number;
  total_debt: number;
  latest_due_date: string;
  overdue_count: number;
}

export interface CustomerSummary {
  total: number;
  new_customers: number;
}

export interface SupplierSummary {
  total: number;
}

export interface TodayStats {
  invoices_count: number;
  paid_count: number;
  partial_count: number;
  unpaid_count: number;
  sales_total: number;
  sales_comparison: number;
}

export interface SalesTrend {
  labels: string[];
  data: number[];
  average: number;
}

export interface PurchasesTrend {
  labels: string[];
  data: number[];
  average: number;
}

export interface DateRange {
  start: string;
  end: string;
}

// This type represents the raw structure from the server (Report interface from reportsService)
export interface RawDashboardSummary {
  report_type: string;
  period_start: string;
  period_end: string;
  sales: SaleSummary;
  purchases: {
    total: number;
    count: number;
    suppliers_count: number;
  };
  expenses: ExpenseSummary;
  debts: DebtSummary;
  supplier_debts: SupplierDebtSummary;
  cash_flow: CashFlowSummary;
  top_customers_with_debts: TopDebtor[];
  top_suppliers_with_debts: TopDebtor[];
  cash_flow_trend: SalesTrend;
  inventory: InventorySummary;
  customers: CustomerSummary;
  suppliers: SupplierSummary;
  financial_summary: FinancialSummary;
  sales_trend: SalesTrend;
  purchases_trend: PurchasesTrend;
  today_stats: TodayStats;
  best_selling_products: BestSellingProduct[];
}

// This type represents the formatted structure returned by getReportSummary
export interface ReportSummary {
  sales: {
    total: number;
    count: number;
    paidAmount: number;
    unpaidAmount: number;
  };
  expenses: {
    total: number;
    count: number;
  };
  financial: FinancialSummary;
  bestSellers: BestSellingProduct[];
}

export interface PremiumReportData {
  // Define premium report data structure
  [key: string]: any;
}

export interface ProfitLossEntry {
  // Define the structure of an individual profit/loss entry
  [key: string]: any;
}

// Returns Report Types
export interface ReturnsSummary {
  total_returns: number;
  full_returns: number;
  partial_returns: number;
  total_return_value: number;
  customers_with_returns: number;
  average_return_value: number;
}

export interface MonthlyReturnsData {
  month_key: string;
  month_name: string;
  return_count: number;
  full_returns: number;
  partial_returns: number;
  return_value: number;
  unique_customers: number;
  average_return_value: number;
}

export interface ReturnsByProduct {
  id: number;
  name: string;
  code: string;
  return_count: number;
  total_returned_quantity: number;
  total_returned_value: number;
  average_return_value: number;
}

export interface ReturnsByCustomer {
  id: number;
  name: string;
  phone: string;
  return_count: number;
  total_return_value: number;
  full_returns: number;
  partial_returns: number;
  average_return_value: number;
}

export interface DetailedReturn {
  id: number;
  invoice_no: string;
  invoice_date: string;
  total_amount: number;
  status: string;
  payment_status: string;
  customer_name: string;
  customer_phone: string;
  created_by_name: string;
  total_returned_items: number;
  returned_value: number;
}

export interface ReturnsReport {
  summary: ReturnsSummary;
  monthly_breakdown: MonthlyReturnsData[];
  top_products: ReturnsByProduct[];
  top_customers: ReturnsByCustomer[];
  detailed_returns: DetailedReturn[];
}

// For reportsSlice state
export interface ReportsState {
  dashboardSummary: RawDashboardSummary | null;
  profitLoss: ProfitLossEntry[] | null;
  premiumReportData: PremiumReportData | null;
  returnsReport: ReturnsReport | null;
  isLoading: boolean;
  error: string | null;
  dateRange: DateRange;
  reportType: string;
  activeTab: 'dashboard' | 'profit-loss' | 'returns' | 'premium-reports';
  isPrintModalOpen: boolean;
}
