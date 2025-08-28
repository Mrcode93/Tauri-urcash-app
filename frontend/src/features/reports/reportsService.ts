import api from '@/lib/api';

export interface Report {
  id: number;
  report_type: string;
  period_start: string;
  period_end: string;
  total_sales: number;
  total_purchases: number;
  total_expenses: number;
  net_profit: number;
  total_customers: number;
  total_suppliers: number;
  total_products: number;
  low_stock_products: number;
  out_of_stock_products: number;
  created_at: string;
  updated_at: string;
  inventory: {
    total_products: number;
    low_stock_products: number;
    out_of_stock_products: number;
    stock_value: number;
  };
  sales: {
    total: number;
    count: number;
    paid_amount: number;
    partial_amount: number;
    unpaid_amount: number;
    customers_count: number;
  };
  purchases: {
    total: number;
    count: number;
  };
  expenses: {
    total: number;
    count: number;
  };
  customers: {
    total: number;
    new_customers: number;
  };
  debts: {
    total_remaining: number;
    total_debts: number;
    overdue_amount: number;
    overdue_debts: number;
    customers_with_debt: number;
  };
  financial_summary: {
    net_profit: number;
    profit_margin: number;
  };
  sales_trend: {
    labels: string[];
    data: number[];
    average: number;
  };
  purchases_trend: {
    labels: string[];
    data: number[];
    average: number;
  };
  today_stats: {
    invoices_count: number;
    paid_count: number;
    partial_count: number;
    unpaid_count: number;
    sales_total: number;
    sales_comparison: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  report?: T;
}

const defaultReport: Report = {
  id: 0,
  report_type: '',
  period_start: '',
  period_end: '',
  total_sales: 0,
  total_purchases: 0,
  total_expenses: 0,
  net_profit: 0,
  total_customers: 0,
  total_suppliers: 0,
  total_products: 0,
  low_stock_products: 0,
  out_of_stock_products: 0,
  created_at: '',
  updated_at: '',
  inventory: {
    total_products: 0,
    low_stock_products: 0,
    out_of_stock_products: 0,
    stock_value: 0,
  },
  sales: {
    total: 0,
    count: 0,
    paid_amount: 0,
    partial_amount: 0,
    unpaid_amount: 0,
    customers_count: 0,
  },
  purchases: {
    total: 0,
    count: 0,
  },
  expenses: {
    total: 0,
    count: 0,
  },
  customers: {
    total: 0,
    new_customers: 0,
  },
  debts: {
    total_remaining: 0,
    total_debts: 0,
    overdue_amount: 0,
    overdue_debts: 0,
    customers_with_debt: 0,
  },
  financial_summary: {
    net_profit: 0,
    profit_margin: 0,
  },
  sales_trend: {
    labels: [],
    data: [],
    average: 0,
  },
  purchases_trend: {
    labels: [],
    data: [],
    average: 0,
  },
  today_stats: {
    invoices_count: 0,
    paid_count: 0,
    partial_count: 0,
    unpaid_count: 0,
    sales_total: 0,
    sales_comparison: 0,
  },
};

// Get dashboard summary with default empty report
const getDashboardSummary = async (period?: { period: 'week' | 'month' | 'year' } | { start: string; end: string }): Promise<Report> => {
  try {
    let params = {};
    
    if (period) {
      if ('period' in period) {
        // Period-based request (week, month, year)
        params = { period: period.period };
      } else if ('start' in period && 'end' in period) {
        // Date range-based request
        params = { start: period.start, end: period.end };
      }
    }
    
    const response = await api.get('/reports/dashboard', {
      params
    });
    
    // Handle different response structures
    const reportData = response.data.data?.report || response.data.report || response.data.data || defaultReport;
    return reportData as Report;
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return defaultReport;
  }
};

// Get profit and loss report with empty array default
const getProfitLoss = async (period: { start: string; end: string }): Promise<Report[]> => {
  try {
    const response = await api.get<ApiResponse<{ reports: Report[] }>>('/reports/profit-loss', {
      params: period,
    });
    return response.data.data.reports || [];
  } catch (error) {
    console.error('Error fetching profit and loss report:', error);
    return [];
  }
};

// Get returns report
const getReturnsReport = async (period?: { start: string; end: string }): Promise<any> => {
  try {
    const response = await api.get<ApiResponse<{ returnsReport: any }>>('/reports/returns', {
      params: period,
    });
    return response.data.data.returnsReport || {
      summary: {
        total_returns: 0,
        full_returns: 0,
        partial_returns: 0,
        total_return_value: 0,
        customers_with_returns: 0,
        average_return_value: 0
      },
      monthly_breakdown: [],
      top_products: [],
      top_customers: [],
      detailed_returns: []
    };
  } catch (error) {
    console.error('Error fetching returns report:', error);
    return {
      summary: {
        total_returns: 0,
        full_returns: 0,
        partial_returns: 0,
        total_return_value: 0,
        customers_with_returns: 0,
        average_return_value: 0
      },
      monthly_breakdown: [],
      top_products: [],
      top_customers: [],
      detailed_returns: []
    };
  }
};

// Stocks Report Interfaces
export interface StocksReportSummary {
  total_products: number;
  total_quantity: number;
  total_value: number;
  out_of_stock_count: number;
  low_stock_count: number;
  good_stock_count: number;
  average_stock_per_product: number;
}

export interface ExpiryAlert {
  id: number;
  product_name: string;
  product_sku: string;
  current_stock: number;
  expiry_date: string;
  purchase_price: number;
  selling_price: number;
  stock_value: number;
  category_name: string;
  expiry_status: 'expired' | 'expiring_soon' | 'expiring_later' | 'safe' | 'no_expiry';
  expiry_status_text: string;
  days_until_expiry: number;
}

export interface LowStockAlert {
  id: number;
  product_name: string;
  product_sku: string;
  current_stock: number;
  min_stock_level: number;
  purchase_price: number;
  selling_price: number;
  stock_value: number;
  category_name: string;
  stock_status: 'out_of_stock' | 'below_minimum' | 'low_stock' | 'adequate';
  stock_status_text: string;
  current_value: number;
  min_stock_value: number;
}

export interface TopSellingProduct {
  id: number;
  product_name: string;
  product_sku: string;
  current_stock: number;
  purchase_price: number;
  selling_price: number;
  total_sold_quantity: number;
  total_sold_value: number;
  total_profit: number;
  sales_count: number;
  average_quantity_per_sale: number;
}

export interface StockMovement {
  id: number;
  product_name: string;
  product_sku: string;
  current_stock: number;
  total_purchased: number;
  total_sold: number;
  total_returned: number;
  total_adjusted: number;
  purchase_movements: number;
  sale_movements: number;
  return_movements: number;
  adjustment_movements: number;
}

export interface StockValueByCategory {
  category_name: string;
  products_count: number;
  total_quantity: number;
  total_value: number;
  average_stock_per_product: number;
}

export interface RecentStockActivity {
  id: number;
  movement_type: string;
  quantity: number;
  created_at: string;
  product_name: string;
  product_sku: string;
  category_name: string;
  notes: string;
  reference_type: string;
  reference_number: string;
  movement_type_text: string;
}

export interface InventoryAgingItem {
  id: number;
  product_name: string;
  product_sku: string;
  current_stock: number;
  purchase_price: number;
  selling_price: number;
  stock_value: number;
  category_name: string;
  stock_level: string;
  stock_level_text: string;
}

export interface StockValueAnalysisItem {
  category_name: string;
  products_count: number;
  total_quantity: number;
  total_purchase_value: number;
  total_selling_value: number;
  potential_profit: number;
  average_stock_per_product: number;
  average_purchase_price: number;
  average_selling_price: number;
}

export interface StockMovementSummaryItem {
  movement_type: string;
  movement_count: number;
  total_quantity: number;
  movement_type_text: string;
}

export interface StocksReportPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface StocksReport {
  pagination?: StocksReportPagination;
  summary: StocksReportSummary;
  expiry_alerts: ExpiryAlert[];
  low_stock_alerts: LowStockAlert[];
  top_selling_products: TopSellingProduct[];
  stock_movements: StockMovement[];
  stock_value_by_category: StockValueByCategory[];
  recent_activities: RecentStockActivity[];
  inventory_aging: InventoryAgingItem[];
  stock_value_analysis: StockValueAnalysisItem[];
  stock_movement_summary: StockMovementSummaryItem[];
}

// Custom Reports Interfaces
export interface DelegateProduct {
  product_id: number;
  product_name: string;
  product_sku: string;
  product_barcode: string;
  total_quantity_sold: number;
  total_revenue: number;
  avg_price: number;
  number_of_sales: number;
}

export interface DelegateCustomerReceipt {
  receipt_id: number;
  receipt_number: string;
  receipt_date: string;
  amount: number;
  payment_method: string;
  notes: string;
  customer_name: string;
  customer_phone: string;
}

export interface DelegatesReport {
  id: number;
  name: string;
  phone: string;
  email: string;
  total_sales: number;
  total_revenue: number;
  avg_sale_value: number;
  unique_customers: number;
  last_sale_date: string;
  products: DelegateProduct[];
  customer_receipts: DelegateCustomerReceipt[];
}

export interface CustomerReport {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  total_invoices: number;
  total_spent: number;
  avg_invoice_value: number;
  paid_amount: number;
  partial_amount: number;
  unpaid_amount: number;
  last_purchase_date: string;
  payment_status: string;
}

export interface SupplierReport {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  total_purchases: number;
  total_spent: number;
  avg_purchase_value: number;
  paid_amount: number;
  partial_amount: number;
  unpaid_amount: number;
  last_purchase_date: string;
}

export interface SalesReport {
  id: number;
  invoice_no: string;
  created_at: string;
  customer_name: string;
  delegate_name: string;
  product_name: string;
  product_code: string;
  quantity: number;
  price: number;
  total_amount: number;
  payment_status: string;
  status: string;
}

export interface SpecificProductReport {
  id: number;
  name: string;
  sku: string;
  description: string;
  category_name: string;
  total_sales: number;
  total_quantity_sold: number;
  total_revenue: number;
  avg_sale_price: number;
  min_sale_price: number;
  max_sale_price: number;
  unique_customers: number;
  last_sale_date: string;
}

export interface CompanyReport {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  total_invoices: number;
  total_spent: number;
  avg_invoice_value: number;
  paid_amount: number;
  partial_amount: number;
  unpaid_amount: number;
  last_purchase_date: string;
}

export interface SalesAnalysis {
  summary: {
    total_sales: number;
    total_orders: number;
    average_order_value: number;
    total_customers: number;
    new_customers: number;
    repeat_customers: number;
    conversion_rate: number;
    total_profit: number;
    profit_margin: number;
  };
  trends: {
    daily_sales: Array<{
      date: string;
      sales: number;
      orders: number;
      customers: number;
    }>;
    monthly_sales: Array<{
      month: string;
      sales: number;
      orders: number;
      profit: number;
    }>;
  };
  top_products: Array<{
    id: number;
    name: string;
    sku: string;
    quantity_sold: number;
    revenue: number;
    profit: number;
    profit_margin: number;
  }>;
  top_customers: Array<{
    id: number;
    name: string;
    phone: string;
    total_orders: number;
    total_spent: number;
    average_order: number;
    last_order_date: string;
  }>;
  sales_by_category: Array<{
    category: string;
    sales: number;
    orders: number;
    products: number;
  }>;
  payment_analysis: {
    payment_methods: Array<{
      method: string;
      count: number;
      amount: number;
      percentage: number;
    }>;
    payment_status: Array<{
      status: string;
      count: number;
      amount: number;
      percentage: number;
    }>;
  };
  performance_metrics: {
    sales_growth: number;
    customer_growth: number;
    average_order_growth: number;
    profit_growth: number;
  };
}

export interface StockReport {
  id: number;
  name: string;
  sku: string;
  category_name: string;
  current_stock: number;
  min_stock_level: number;
  cost_price: number;
  sale_price: number;
  stock_value: number;
  movement_count: number;
  total_in: number;
  total_out: number;
  last_movement_date: string;
}

export interface DebtsReport {
  customer_debts: Array<{
    debt_type: string;
    id: number;
    name: string;
    phone: string;
    total_debt: number;
    partial_amount: number;
    unpaid_amount: number;
    invoice_count: number;
    last_invoice_date: string;
  }>;
  supplier_debts: Array<{
    debt_type: string;
    id: number;
    name: string;
    phone: string;
    total_debt: number;
    partial_amount: number;
    unpaid_amount: number;
    purchase_count: number;
    last_purchase_date: string;
  }>;
}

export interface MoneyBoxReport {
  id: number;
  name: string;
  description: string;
  initial_balance: number;
  total_deposits: number;
  total_withdrawals: number;
  current_balance: number;
  transaction_count: number;
  last_transaction_date: string;
}

export interface ExpensesReport {
  id: number;
  description: string;
  amount: number;
  date: string;
  category_name: string;
  created_at: string;
}

export interface CustomerDebtsDetailedReport {
  id: number;
  invoice_no: string;
  created_at: string;
  due_date: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: string;
  days_overdue: number;
}

// Get stocks report
const getStocksReport = async (period?: { start: string; end: string }, page = 1, limit = 50): Promise<StocksReport> => {
  try {
    const response = await api.get<ApiResponse<{ stocksReport: StocksReport }>>('/reports/stocks', {
      params: { ...period, page, limit },
    });
    return response.data.data.stocksReport || {
      summary: {
        total_products: 0,
        total_quantity: 0,
        total_value: 0,
        out_of_stock_count: 0,
        low_stock_count: 0,
        good_stock_count: 0,
        average_stock_per_product: 0
      },
      expiry_alerts: [],
      low_stock_alerts: [],
      top_selling_products: [],
      stock_movements: [],
      stock_value_by_category: [],
      recent_activities: [],
      inventory_aging: [],
      stock_value_analysis: [],
      stock_movement_summary: []
    };
    console.log(response.data.data.stocksReport);
  } catch (error) {
    console.error('Error fetching stocks report:', error);
    return {
      summary: {
        total_products: 0,
        total_quantity: 0,
        total_value: 0,
        out_of_stock_count: 0,
        low_stock_count: 0,
        good_stock_count: 0,
        average_stock_per_product: 0
      },
      expiry_alerts: [],
      low_stock_alerts: [],
      top_selling_products: [],
      stock_movements: [],
      stock_value_by_category: [],
      recent_activities: [],
      inventory_aging: [],
      stock_value_analysis: [],
      stock_movement_summary: []
    };
  }
};

// Custom Reports Service Methods
const getDelegatesReport = async (period?: { start: string; end: string }): Promise<DelegatesReport[]> => {
  try {
    const response = await api.get<ApiResponse<{ delegatesReport: DelegatesReport[] }>>('/reports/delegates', {
      params: period,
    });
    console.log(response.data);
    return response.data.data.delegatesReport || [];
  } catch (error) {
    console.error('Error fetching delegates report:', error);
    return [];
  }
};

const getCustomerReport = async (period?: { start: string; end: string }, paymentStatus?: string): Promise<CustomerReport[]> => {
  try {
    const response = await api.get<ApiResponse<{ customerReport: CustomerReport[] }>>('/reports/customers', {
      params: { ...period, paymentStatus },
    });
    return response.data.data.customerReport || [];
  } catch (error) {
    console.error('Error fetching customer report:', error);
    return [];
  }
};

const getSupplierReport = async (period?: { start: string; end: string }): Promise<SupplierReport[]> => {
  try {
    const response = await api.get<ApiResponse<{ supplierReport: SupplierReport[] }>>('/reports/suppliers', {
      params: period,
    });
    return response.data.data.supplierReport || [];
  } catch (error) {
    console.error('Error fetching supplier report:', error);
    return [];
  }
};

const getSalesReport = async (period?: { start: string; end: string }, productId?: number, customerId?: number): Promise<SalesReport[]> => {
  try {
    const response = await api.get<ApiResponse<{ salesReport: SalesReport[] }>>('/reports/sales', {
      params: { ...period, productId, customerId },
    });
    return response.data.data.salesReport || [];
  } catch (error) {
    console.error('Error fetching sales report:', error);
    return [];
  }
};

const getSpecificProductReport = async (productId: number, period?: { start: string; end: string }): Promise<SpecificProductReport[]> => {
  try {
    const response = await api.get<ApiResponse<{ productReport: SpecificProductReport[] }>>(`/reports/product/${productId}`, {
      params: period,
    });
    return response.data.data.productReport || [];
  } catch (error) {
    console.error('Error fetching specific product report:', error);
    return [];
  }
};

const getCompanyReport = async (companyId: number, period?: { start: string; end: string }): Promise<CompanyReport[]> => {
  try {
    const response = await api.get<ApiResponse<{ companyReport: CompanyReport[] }>>(`/reports/company/${companyId}`, {
      params: period,
    });
    return response.data.data.companyReport || [];
  } catch (error) {
    console.error('Error fetching company report:', error);
    return [];
  }
};

const getStockReport = async (period?: { start: string; end: string }, categoryId?: number): Promise<StockReport[]> => {
  try {
    const response = await api.get<ApiResponse<{ stockReport: StockReport[] }>>('/reports/stock', {
      params: { ...period, categoryId },
    });
    return response.data.data.stockReport || [];
  } catch (error) {
    console.error('Error fetching stock report:', error);
    return [];
  }
};

const getDebtsReport = async (period?: { start: string; end: string }, debtType?: string): Promise<DebtsReport> => {
  try {
    const response = await api.get<ApiResponse<{ debtsReport: DebtsReport }>>('/reports/debts', {
      params: { ...period, debtType },
    });
    return response.data.data.debtsReport || { customer_debts: [], supplier_debts: [] };
  } catch (error) {
    console.error('Error fetching debts report:', error);
    return { customer_debts: [], supplier_debts: [] };
  }
};

const getMoneyBoxReport = async (period?: { start: string; end: string }, boxId?: number): Promise<MoneyBoxReport[]> => {
  try {
    const response = await api.get<ApiResponse<{ moneyBoxReport: MoneyBoxReport[] }>>('/reports/money-box', {
      params: { ...period, boxId },
    });
    return response.data.data.moneyBoxReport || [];
  } catch (error) {
    console.error('Error fetching money box report:', error);
    return [];
  }
};

const getExpensesReport = async (period?: { start: string; end: string }, categoryId?: number): Promise<ExpensesReport[]> => {
  try {
    const response = await api.get<ApiResponse<{ expensesReport: ExpensesReport[] }>>('/reports/expenses', {
      params: { ...period, categoryId },
    });
    return response.data.data.expensesReport || [];
  } catch (error) {
    console.error('Error fetching expenses report:', error);
    return [];
  }
};

const getCustomerDebtsDetailedReport = async (period?: { start: string; end: string }, debtStatus?: string): Promise<CustomerDebtsDetailedReport[]> => {
  try {
    const response = await api.get<ApiResponse<{ customerDebtsReport: CustomerDebtsDetailedReport[] }>>('/reports/customer-debts', {
      params: { ...period, debtStatus },
    });
    return response.data.data.customerDebtsReport || [];
  } catch (error) {
    console.error('Error fetching customer debts detailed report:', error);
    return [];
  }
};

// Get sales analysis report
const getSalesAnalysis = async (period?: { start: string; end: string }): Promise<SalesAnalysis> => {
  try {
    const response = await api.get<ApiResponse<{ salesAnalysis: SalesAnalysis }>>('/reports/sales-analysis', {
      params: period,
    });
    return response.data.data.salesAnalysis || {
      summary: {
        total_sales: 0,
        total_orders: 0,
        average_order_value: 0,
        total_customers: 0,
        new_customers: 0,
        repeat_customers: 0,
        conversion_rate: 0,
        total_profit: 0,
        profit_margin: 0
      },
      trends: {
        daily_sales: [],
        monthly_sales: []
      },
      top_products: [],
      top_customers: [],
      sales_by_category: [],
      payment_analysis: {
        payment_methods: [],
        payment_status: []
      },
      performance_metrics: {
        sales_growth: 0,
        customer_growth: 0,
        average_order_growth: 0,
        profit_growth: 0
      }
    };
  } catch (error) {
    console.error('Error fetching sales analysis:', error);
    return {
      summary: {
        total_sales: 0,
        total_orders: 0,
        average_order_value: 0,
        total_customers: 0,
        new_customers: 0,
        repeat_customers: 0,
        conversion_rate: 0,
        total_profit: 0,
        profit_margin: 0
      },
      trends: {
        daily_sales: [],
        monthly_sales: []
      },
      top_products: [],
      top_customers: [],
      sales_by_category: [],
      payment_analysis: {
        payment_methods: [],
        payment_status: []
      },
      performance_metrics: {
        sales_growth: 0,
        customer_growth: 0,
        average_order_growth: 0,
        profit_growth: 0
      }
    };
  }
};

const reportsService = {
  getDashboardSummary,
  getProfitLoss,
  getReturnsReport,
  getStocksReport,
  getSalesAnalysis,
  getDelegatesReport,
  getCustomerReport,
  getSupplierReport,
  getSalesReport,
  getSpecificProductReport,
  getCompanyReport,
  getStockReport,
  getDebtsReport,
  getMoneyBoxReport,
  getExpensesReport,
  getCustomerDebtsDetailedReport,
};

export default reportsService;
