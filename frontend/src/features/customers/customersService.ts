import api from '@/lib/api';

// Force module reload - clear cache


export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  credit_limit?: number;
  current_balance?: number;
  is_active?: boolean;
  customer_type?: 'retail' | 'wholesale' | 'vip';
  tax_number?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerDetails {
  customer: Customer;
  debts: DebtData[];
  installments: Installment[];
  bills: CustomerBill[];
  receipts: CustomerReceipt[];
  financialSummary: CustomerFinancialSummary | null;
}

export interface DebtData {
  sale_id: number;
  invoice_no: string;
  customer_id: number;
  customer_name: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface Installment {
  id: number;
  sale_id: number;
  customer_id: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  payment_status: string;
  payment_method?: string;
  paid_at?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  invoice_no?: string;
}

export interface CustomerBill {
  id: number;
  invoice_no: string;
  invoice_date: string;
  due_date?: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: string;
  status: string;
  notes?: string;
  customer_name?: string;
  customer_phone?: string;
  created_by_name?: string;
}

export interface CustomerReceipt {
  id: number;
  receipt_number: string;
  customer_id: number;
  sale_id?: number;
  receipt_date: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  sale_invoice_no?: string;
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

// Handle API errors with Arabic messages
const handleCustomersApiError = (error: any, operation: string): never => {
  console.error(`Customers API Error (${operation}):`, error);
  
  if (error.response?.data?.message) {
    // Use the Arabic message from the backend
    throw new Error(error.response.data.message);
  }
  
  if (error.message) {
    throw new Error(error.message);
  }
  
  // Default Arabic error messages
  const defaultMessages: Record<string, string> = {
    'getCustomers': 'حدث خطأ أثناء جلب العملاء',
    'getCustomer': 'حدث خطأ أثناء جلب بيانات العميل',
    'getCustomerDetails': 'حدث خطأ أثناء جلب تفاصيل العميل',
    'createCustomer': 'حدث خطأ أثناء إنشاء العميل',
    'updateCustomer': 'حدث خطأ أثناء تحديث بيانات العميل',
    'deleteCustomer': 'حدث خطأ أثناء حذف العميل',
    'searchCustomers': 'حدث خطأ أثناء البحث في العملاء',
    'getCustomerWithSales': 'حدث خطأ أثناء جلب مبيعات العميل'
  };
  
  throw new Error(defaultMessages[operation] || 'حدث خطأ في معالجة العميل');
};

class CustomersService {
  // Get all customers with pagination and search
  async getCustomers(params: {
    page?: number;
    limit?: number;
    search?: string;
    exclude_anonymous?: boolean;
  } = {}): Promise<{
    items: Customer[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  }> {
    try {
      const response = await api.get('/customers', { params });
      return response.data.data;
    } catch (error) {
      handleCustomersApiError(error, 'getCustomers');
    }
  }

  // Get single customer
  async getCustomer(id: number): Promise<Customer> {
    try {
      const response = await api.get(`/customers/${id}`);
      return response.data.data;
    } catch (error) {
      handleCustomersApiError(error, 'getCustomer');
    }
  }

  // Get customer details (optimized single request)
  async getCustomerDetails(id: number): Promise<CustomerDetails> {
    try {
      const response = await api.get(`/customers/${id}/details`);
      return response.data.data;
    } catch (error) {
      handleCustomersApiError(error, 'getCustomerDetails');
    }
  }

  // Create new customer
  async createCustomer(customerData: Omit<Customer, 'id'>): Promise<Customer> {
    try {
      const response = await api.post('/customers', customerData);
      return response.data.data;
    } catch (error) {
      handleCustomersApiError(error, 'createCustomer');
    }
  }

  // Update customer
  async updateCustomer(id: number, customerData: Partial<Customer>): Promise<Customer> {
    try {
      const response = await api.put(`/customers/${id}`, customerData);
      return response.data.data;
    } catch (error) {
      handleCustomersApiError(error, 'updateCustomer');
    }
  }

  // Delete customer
  async deleteCustomer(id: number): Promise<void> {
    try {
      await api.delete(`/customers/${id}`);
    } catch (error) {
      handleCustomersApiError(error, 'deleteCustomer');
    }
  }

  // Search customers
  async searchCustomers(query: string): Promise<Customer[]> {
    try {
      const response = await api.get('/customers/search', {
        params: { query }
      });
      return response.data.data;
    } catch (error) {
      handleCustomersApiError(error, 'searchCustomers');
    }
  }
}


export default new CustomersService(); 