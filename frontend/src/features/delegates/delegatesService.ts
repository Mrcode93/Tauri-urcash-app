import api from '@/lib/api';

// ===== BASIC DELEGATE INTERFACES =====

export interface Delegate {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  commission_rate: number;
  commission_type: 'percentage' | 'fixed';
  commission_amount: number;
  sales_target: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CreateDelegateData {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  commission_rate?: number;
  commission_type?: 'percentage' | 'fixed';
  commission_amount?: number;
  sales_target?: number;
}

export interface UpdateDelegateData extends CreateDelegateData {
  is_active?: number;
}

export interface DelegatesResponse {
  delegates: Delegate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ===== DELEGATE SALES INTERFACES =====

export interface DelegateSale {
  id: number;
  delegate_id: number;
  customer_id: number;
  customer_name?: string;
  customer_phone?: string;
  sale_id: number;
  invoice_number?: string;
  invoice_date?: string;
  total_amount: number;
  commission_amount: number;
  commission_rate: number;
  commission_type: 'percentage' | 'fixed';
  payment_status: 'paid' | 'partial' | 'unpaid';
  paid_amount: number;
  remaining_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDelegateSaleData {
  delegate_id: number;
  customer_id: number;
  sale_id: number;
  total_amount: number;
  commission_rate?: number;
  commission_type?: 'percentage' | 'fixed';
  notes?: string;
}

export interface DelegateSalesResponse {
  sales: DelegateSale[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ===== DELEGATE COLLECTIONS INTERFACES =====

export interface DelegateCollection {
  id: number;
  delegate_id: number;
  customer_id: number;
  customer_name?: string;
  customer_phone?: string;
  sale_id?: number;
  invoice_number?: string;
  collection_amount: number;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'check';
  collection_date: string;
  receipt_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDelegateCollectionData {
  delegate_id: number;
  customer_id: number;
  sale_id?: number;
  collection_amount: number;
  payment_method?: 'cash' | 'card' | 'bank_transfer' | 'check';
  collection_date: string;
  receipt_number?: string;
  notes?: string;
}

export interface DelegateCollectionsResponse {
  collections: DelegateCollection[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ===== DELEGATE COMMISSION INTERFACES =====

export interface DelegateCommission {
  delegate_id: number;
  period_start: string;
  period_end: string;
  total_sales: number;
  total_commission: number;
  total_orders: number;
}

export interface DelegateCommissionPayment {
  id: number;
  delegate_id: number;
  period_start: string;
  period_end: string;
  total_sales: number;
  total_commission: number;
  commission_rate: number;
  commission_type: 'percentage' | 'fixed';
  payment_amount: number;
  payment_date?: string;
  payment_status: 'pending' | 'paid' | 'cancelled';
  payment_method: 'cash' | 'bank_transfer' | 'check';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCommissionPaymentData {
  delegate_id: number;
  period_start: string;
  period_end: string;
  payment_amount: number;
  payment_date: string;
  payment_method?: 'cash' | 'bank_transfer' | 'check';
  notes?: string;
}

// ===== DELEGATE PERFORMANCE REPORTS INTERFACES =====

export interface DelegatePerformanceReport {
  id: number;
  delegate_id: number;
  report_date: string;
  period_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  total_sales: number;
  total_orders: number;
  total_customers: number;
  total_collections: number;
  total_commission: number;
  sales_target: number;
  target_achievement_percentage: number;
  average_order_value: number;
  collection_rate: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePerformanceReportData {
  report_date: string;
  period_type?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface PerformanceReportsResponse {
  reports: DelegatePerformanceReport[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ===== DELEGATE DASHBOARD INTERFACES =====

export interface DelegateDashboard {
  delegate: Delegate;
  current_month: {
    total_sales: number;
    total_commission: number;
    total_orders: number;
    total_collections: number;
  };
  overall: {
    total_sales: number;
    total_commission: number;
    total_collections: number;
  };
}

// ===== DELEGATE ANALYTICS INTERFACES =====

export interface DelegateAnalytics {
  overall: {
    total_delegates: number;
    total_sales: number;
    total_sales_amount: number;
    total_commission: number;
    total_collections: number;
    total_collections_amount: number;
  };
  top_delegates: Array<{
    id: number;
    name: string;
    total_sales: number;
    total_sales_amount: number;
    total_commission: number;
    total_collections: number;
  }>;
  sales_trend: Array<{
    date: string;
    sales_count: number;
    sales_amount: number;
  }>;
}

// ===== CUSTOMER INTERFACES =====

export interface Customer {
  id: number;
  name: string;
  phone?: string;
}

// ===== API SERVICE FUNCTIONS =====

// ===== BASIC DELEGATE MANAGEMENT =====

// Get all delegates
export const getAllDelegates = async (
  page: number = 1,
  limit: number = 50,
  search: string = '',
  customerId?: number
): Promise<DelegatesResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    search: search,
  });
  
  if (customerId) {
    params.append('customer_id', customerId.toString());
  }

  const response = await api.get(`/delegates?${params}`);
  console.log(response.data);
  return response.data.data;
};

// Get delegate by ID
export const getDelegateById = async (id: number): Promise<Delegate> => {
  const response = await api.get(`/delegates/${id}`);
  return response.data;
};

// Create new delegate
export const createDelegate = async (data: CreateDelegateData): Promise<{ id: number }> => {
  const response = await api.post('/delegates', data);
  return response.data.data;
};

// Update delegate
export const updateDelegate = async (id: number, data: UpdateDelegateData): Promise<{ success: boolean }> => {
  const response = await api.put(`/delegates/${id}`, data);
  return response.data.data;
};

// Delete delegate
export const deleteDelegate = async (id: number): Promise<{ success: boolean }> => {
  const response = await api.delete(`/delegates/${id}`);
  return response.data.data;
};

// ===== DELEGATE SALES MANAGEMENT =====

// Create delegate sale
export const createDelegateSale = async (delegateId: number, data: CreateDelegateSaleData): Promise<{ id: number }> => {
  const response = await api.post(`/delegates/${delegateId}/sales`, data);
  return response.data.data;
};

// Get delegate sales
export const getDelegateSales = async (
  delegateId: number,
  page: number = 1,
  limit: number = 50
): Promise<DelegateSalesResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  const response = await api.get(`/delegates/${delegateId}/sales?${params}`);
  return response.data.data;
};

// ===== DELEGATE COLLECTIONS MANAGEMENT =====

// Create delegate collection
export const createDelegateCollection = async (delegateId: number, data: CreateDelegateCollectionData): Promise<{ id: number }> => {
  const response = await api.post(`/delegates/${delegateId}/collections`, data);
  return response.data.data;
};

// Get delegate collections
export const getDelegateCollections = async (
  delegateId: number,
  page: number = 1,
  limit: number = 50
): Promise<DelegateCollectionsResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  const response = await api.get(`/delegates/${delegateId}/collections?${params}`);
  return response.data.data;
};

// ===== DELEGATE COMMISSION MANAGEMENT =====

// Calculate delegate commission
export const calculateDelegateCommission = async (
  delegateId: number,
  periodStart: string,
  periodEnd: string
): Promise<DelegateCommission> => {
  const params = new URLSearchParams({
    period_start: periodStart,
    period_end: periodEnd,
  });

  const response = await api.get(`/delegates/${delegateId}/commission?${params}`);
  return response.data.data;
};

// Create commission payment
export const createCommissionPayment = async (delegateId: number, data: CreateCommissionPaymentData): Promise<{ id: number }> => {
  const response = await api.post(`/delegates/${delegateId}/commission-payments`, data);
  return response.data.data;
};

// ===== DELEGATE PERFORMANCE REPORTS =====

// Generate performance report
export const generatePerformanceReport = async (
  delegateId: number,
  data: CreatePerformanceReportData
): Promise<{ id: number }> => {
  const response = await api.post(`/delegates/${delegateId}/performance-reports`, data);
  return response.data.data;
};

// Get performance reports
export const getPerformanceReports = async (
  delegateId: number,
  page: number = 1,
  limit: number = 50
): Promise<PerformanceReportsResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  const response = await api.get(`/delegates/${delegateId}/performance-reports?${params}`);
  return response.data.data;
};

// ===== DELEGATE DASHBOARD =====

// Get delegate dashboard
export const getDelegateDashboard = async (delegateId: number): Promise<DelegateDashboard> => {
  const response = await api.get(`/delegates/${delegateId}/dashboard`);
  return response.data.data;
};

// ===== CUSTOMER ASSIGNMENTS =====

// Get customers for dropdown
export const getCustomersForDropdown = async (): Promise<Customer[]> => {
  const response = await api.get('/delegates/customers/dropdown');
  return response.data.data;
};

// Get delegates by customer ID
export const getDelegatesByCustomerId = async (customerId: number): Promise<Delegate[]> => {
  const response = await api.get(`/delegates/customer/${customerId}`);
  return response.data.data;
};

// ===== BULK OPERATIONS =====

// Bulk generate performance reports
export const bulkGeneratePerformanceReports = async (data: CreatePerformanceReportData): Promise<Array<{ delegate_id: number; success: boolean; report_id?: number; error?: string }>> => {
  const response = await api.post('/delegates/bulk/performance-reports', data);
  return response.data.data;
};

// ===== ANALYTICS =====

// Get delegate analytics
export const getDelegateAnalytics = async (periodStart: string, periodEnd: string): Promise<DelegateAnalytics> => {
  const params = new URLSearchParams({
    period_start: periodStart,
    period_end: periodEnd,
  });

  const response = await api.get(`/delegates/analytics/summary?${params}`);
  return response.data.data;
};
