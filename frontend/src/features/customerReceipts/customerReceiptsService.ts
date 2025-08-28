import api from '@/lib/api';

// Error handler for customer receipts API
const handleCustomerReceiptsApiError = (error: any, operation: string): never => {
  console.error(`Customer Receipts API Error (${operation}):`, error);
  
  // Handle validation errors - preserve the original structure
  if (error?.response?.data?.errors || error?.errors) {
    // For validation errors, throw the original error to preserve structure
    throw error;
  }
  
  // Handle different types of errors
  if (error?.response?.data?.message) {
    // Backend Arabic error message
    throw new Error(error.response.data.message);
  }
  
  if (error.message) {
    // Network or other errors
    throw new Error(error.message);
  }
  
  // Default error message
  const defaultMessages: { [key: string]: string } = {
    getAll: 'حدث خطأ أثناء جلب إيصالات الدفع',
    getById: 'حدث خطأ أثناء جلب بيانات إيصال الدفع',
    create: 'حدث خطأ أثناء إنشاء إيصال الدفع',
    update: 'حدث خطأ أثناء تحديث إيصال الدفع',
    delete: 'حدث خطأ أثناء حذف إيصال الدفع',
    getStatistics: 'حدث خطأ أثناء جلب الإحصائيات',
    getCustomerSales: 'حدث خطأ أثناء جلب فواتير العميل',
    getCustomerDebts: 'حدث خطأ أثناء جلب ديون العميل',
    getCustomerBills: 'حدث خطأ أثناء جلب فواتير العميل',
    getCustomerFinancialSummary: 'حدث خطأ أثناء جلب الملخص المالي',
    exportToCSV: 'حدث خطأ أثناء تصدير البيانات'
  };
  
  throw new Error(defaultMessages[operation] || 'حدث خطأ في نظام إيصالات الدفع');
};

export interface CustomerReceipt {
  id: number;
  receipt_number: string;
  customer_id: number;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  sale_id?: number;
  sale_invoice_no?: string;
  sale_total_amount?: number;
  sale_paid_amount?: number;
  sale_remaining_amount?: number;
  receipt_date: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'check';
  reference_number?: string;
  notes?: string;
  money_box_id?: string;
  delegate_id?: number;
  delegate_name?: string;
  delegate_phone?: string;
  employee_id?: number;
  employee_name?: string;
  employee_phone?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerReceiptData {
  customer_id: number;
  sale_id?: number;
  receipt_date: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'check';
  reference_number?: string;
  notes?: string;
  receipt_number?: string;
  money_box_id?: string;
  delegate_id?: number;
  employee_id?: number;
}

export type UpdateCustomerReceiptData = Partial<CreateCustomerReceiptData>;

export interface CustomerReceiptFilters {
  customer_id?: number;
  sale_id?: number;
  payment_method?: string;
  date_from?: string;
  date_to?: string;
  reference_number?: string;
  page?: number;
  limit?: number;
}

export interface CustomerReceiptSummary {
  total_receipts: number;
  total_amount: number;
  first_receipt_date: string;
  last_receipt_date: string;
}

export interface CustomerReceiptStatistics {
  total_receipts: number;
  total_amount: number;
  average_amount: number;
  min_amount: number;
  max_amount: number;
  unique_customers: number;
}

export interface CustomerSale {
  id: number;
  invoice_no: string;
  invoice_date: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: string;
}

export interface CustomerDebt {
  id: number;
  invoice_no: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: string;
  notes?: string;
  customer_name: string;
  customer_phone?: string;
}

export interface CustomerBill {
  id: number;
  invoice_no: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: string;
  status: string;
  notes?: string;
  customer_name: string;
  customer_phone?: string;
  created_by_name?: string;
}

export interface CustomerFinancialSummary {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  total_bills: number;
  total_paid: number;
  total_debt: number;
  total_bills_count: number;
  unpaid_bills_count: number;
  paid_bills_count: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class CustomerReceiptsService {
  // Get all customer receipts with pagination and filters
  async getAll(filters: CustomerReceiptFilters = {}): Promise<PaginatedResponse<CustomerReceipt>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    try {
      const response = await api.get(`/customer-receipts?${params.toString()}`);
      return response.data;
    } catch (error) {
      handleCustomerReceiptsApiError(error, 'getAll');
    }
  }

  // Get receipt by ID
  async getById(id: number): Promise<CustomerReceipt> {
    try {
      const response = await api.get(`/customer-receipts/${id}`);
      return response.data.data;
    } catch (error) {
      handleCustomerReceiptsApiError(error, 'getById');
    }
  }

  // Create new receipt
  async create(data: CreateCustomerReceiptData): Promise<CustomerReceipt> {
    try {
      const response = await api.post('/customer-receipts', data);
      return response.data.data;
    } catch (error) {
      handleCustomerReceiptsApiError(error, 'create');
    }
  }

  // Update receipt
  async update(id: number, data: UpdateCustomerReceiptData): Promise<CustomerReceipt> {
    try {
      const response = await api.put(`/customer-receipts/${id}`, data);
      return response.data.data;
    } catch (error) {
      handleCustomerReceiptsApiError(error, 'update');
    }
  }

  // Delete receipt
  async delete(id: number): Promise<void> {
    try {
      await api.delete(`/customer-receipts/${id}`);
    } catch (error) {
      handleCustomerReceiptsApiError(error, 'delete');
    }
  }

  // Get customer receipt summary
  async getCustomerSummary(customerId: number): Promise<CustomerReceiptSummary> {
    try {
      const response = await api.get(`/customer-receipts/customer/${customerId}/summary`);
      return response.data.data;
    } catch (error) {
      handleCustomerReceiptsApiError(error, 'getCustomerSummary');
    }
  }

  // Get receipt statistics
  async getStatistics(filters: CustomerReceiptFilters = {}): Promise<CustomerReceiptStatistics> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    try {
      const response = await api.get(`/customer-receipts/statistics?${params.toString()}`);
      return response.data.data;
    } catch (error) {
      handleCustomerReceiptsApiError(error, 'getStatistics');
    }
  }

  // Get available sales for a customer
  async getCustomerSales(customerId: number): Promise<CustomerSale[]> {
    try {
      const response = await api.get(`/customer-receipts/customer/${customerId}/sales`);
      return response.data.data;
    } catch (error) {
      handleCustomerReceiptsApiError(error, 'getCustomerSales');
    }
  }

  // Get customer debts (unpaid sales)
  async getCustomerDebts(customerId: number): Promise<CustomerDebt[]> {
    try {
      const response = await api.get(`/customer-receipts/customer/${customerId}/debts`);
      return response.data.data;
    } catch (error) {
      handleCustomerReceiptsApiError(error, 'getCustomerDebts');
    }
  }

  // Get customer bills (all sales)
  async getCustomerBills(customerId: number): Promise<CustomerBill[]> {
    try {
      const response = await api.get(`/customer-receipts/customer/${customerId}/bills`);
      return response.data.data;
    } catch (error) {
      handleCustomerReceiptsApiError(error, 'getCustomerBills');
    }
  }

  // Get customer financial summary
  async getCustomerFinancialSummary(customerId: number): Promise<CustomerFinancialSummary> {
    try {
      const response = await api.get(`/customer-receipts/customer/${customerId}/financial-summary`);
      return response.data.data;
    } catch (error) {
      handleCustomerReceiptsApiError(error, 'getCustomerFinancialSummary');
    }
  }

  // Get receipt by receipt number
  async getByReceiptNumber(receiptNumber: string): Promise<CustomerReceipt> {
    try {
      const response = await api.get(`/customer-receipts/number/${receiptNumber}`);
      return response.data.data;
    } catch (error) {
      handleCustomerReceiptsApiError(error, 'getByReceiptNumber');
    }
  }

  // Bulk create receipts
  async bulkCreate(receipts: CreateCustomerReceiptData[]): Promise<{
    created: CustomerReceipt[];
    errors: Array<{ index: number; errors: string[] }>;
  }> {
    try {
      const response = await api.post('/customer-receipts/bulk', { receipts });
      return response.data.data;
    } catch (error) {
      handleCustomerReceiptsApiError(error, 'bulkCreate');
    }
  }

  // Export receipts to CSV
  async exportToCSV(filters: CustomerReceiptFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    try {
      const response = await api.get(`/customer-receipts/export?${params.toString()}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      handleCustomerReceiptsApiError(error, 'exportToCSV');
    }
  }

  // Download CSV file
  async downloadCSV(filters: CustomerReceiptFilters = {}): Promise<void> {
    const blob = await this.exportToCSV(filters);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customer_receipts_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const customerReceiptsService = new CustomerReceiptsService(); 