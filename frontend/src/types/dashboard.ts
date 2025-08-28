export interface DashboardSummary {
  sales?: {
    total: number;
    paid_amount: number;
    partial_amount: number;
    unpaid_amount: number;
    count: number;
    returns?: {
      total_amount: number;
    };
    profit?: {
      cost: number;
      gross_profit: number;
    };
  };
  purchases?: {
    total: number;
    count: number;
  };
  expenses?: {
    total: number;
    count: number;
  };
  inventory?: {
    total_products: number;
    low_stock_products: number;
    out_of_stock_products: number;
    stock_value: number;
    total_stock: number;
  };
  customers?: {
    total: number;
    new_customers: number;
  };
  suppliers?: {
    total: number;
  };
  debts?: {
    total_debts: number;
    total_remaining: number;
    overdue_debts: number;
    overdue_amount: number;
    customers_with_debt: number;
  };
  supplier_debts?: {
    total_remaining: number;
    overdue_debts: number;
    overdue_amount: number;
    suppliers_with_debt: number;
  };
  cash_flow?: {
    cash_sales: number;
    cash_receipts: number;
    cash_purchases: number;
    cash_expenses: number;
    cash_supplier_payments: number;
  };
  today_stats?: {
    invoices_count: number;
    sales_total: number;
    sales_comparison: number;
    paid_count: number;
    partial_count: number;
    unpaid_count: number;
  };
  financial_summary?: {
    total_sales: number;
    net_profit: number;
    cost_of_goods: number;
    revenue: number;
    profit_margin: number;
  };
  top_customers_with_debts?: Array<{
    id: number;
    name: string;
    phone?: string;
    total_debt: number;
    debt_count: number;
    overdue_count: number;
  }>;
  top_suppliers_with_debts?: Array<{
    id: number;
    name: string;
    phone?: string;
    total_debt: number;
    debt_count: number;
    overdue_count: number;
  }>;
  best_selling_products?: Array<{
    id: number;
    name: string;
    code?: string;
    total_quantity: number;
    total_revenue: number;
    current_stock?: number;
  }>;
}

export interface MostSoldProduct {
  id: number;
  name: string;
  code?: string;
  total_quantity: number;
  total_revenue: number;
  current_stock?: number;
}

export type DashboardPeriod = 'week' | 'month' | 'year' | 'custom';

export interface DashboardPeriodSelectorProps {
  selectedPeriod: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
  startDate: Date | undefined;
  endDate: Date | undefined;
  isDatePickerOpen: boolean;
  setIsDatePickerOpen: (open: boolean) => void;
  setStartDate: (date: Date | undefined) => void;
  setEndDate: (date: Date | undefined) => void;
}

export interface DashboardStatsGridProps {
  dashboardSummary: DashboardSummary;
}

export interface SalesOverviewChartProps {
  dashboardSummary: DashboardSummary;
}

export interface RevenueBreakdownChartProps {
  dashboardSummary: DashboardSummary;
}

export interface MostSoldProductsTableProps {
  products: MostSoldProduct[];
  isLoading: boolean;
}

export interface PerformanceIndicatorsProps {
  dashboardSummary: DashboardSummary;
}

export interface ProfitAnalysisSectionProps {
  dashboardSummary: DashboardSummary;
} 