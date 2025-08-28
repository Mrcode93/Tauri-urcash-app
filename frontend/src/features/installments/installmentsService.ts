import api from '@/lib/api';

export interface Installment {
  id: number;
  sale_id: number;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  payment_status: 'paid' | 'unpaid' | 'partial';
  payment_method: 'cash' | 'card' | 'bank_transfer';
  paid_at: string | null;
  notes: string;
  invoice_no: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInstallmentData {
  sale_id: number;
  customer_id: number;
  due_date: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'bank_transfer';
  notes?: string;
}

export interface UpdateInstallmentData {
  due_date: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'bank_transfer';
  notes?: string;
}

export interface PaymentData {
  paid_amount: number;
  payment_method: 'cash' | 'card' | 'bank_transfer';
  notes?: string;
  money_box_id?: string;
}

export interface InstallmentPlanData {
  customer_id: number;
  selectedProducts: Array<{
    product_id: number;
    quantity: number;
    price: number;
  }>;
  installmentMonths: number;
  startingDueDate: string;
  paymentMethod: 'cash' | 'card' | 'bank_transfer';
  notes?: string;
  totalAmount: number;
}

export interface InstallmentsFilters {
  customer_id?: number;
  sale_id?: number;
  payment_status?: 'paid' | 'unpaid' | 'partial';
  start_date?: string;
  end_date?: string;
  search?: string;
}

export interface InstallmentsResponse {
  items: Installment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InstallmentPlanResponse {
  plan: {
    sale_id: number;
    customer_id: number;
    total_amount: number;
    installment_months: number;
    installment_amount: number;
    starting_due_date: string;
    payment_method: 'cash' | 'card' | 'bank_transfer';
    notes: string;
  };
  installments: Installment[];
}

export interface InstallmentsStats {
  total_installments: number;
  total_amount: number;
  total_paid: number;
  total_remaining: number;
  unpaid_count: number;
  partial_count: number;
  paid_count: number;
  overdue_count: number;
}

const installmentsService = {
  // Get all installments
  getInstallments: async (filters?: InstallmentsFilters): Promise<InstallmentsResponse> => {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await api.get(`/installments?${params.toString()}`);
    return response.data.data;
  },

  // Get installments grouped by sale
  getGroupedInstallments: async (filters?: InstallmentsFilters) => {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await api.get(`/installments/grouped?${params.toString()}`);
    return response.data.data;
  },

  // Get installments summary
  getInstallmentsSummary: async (filters?: { customer_id?: number; payment_status?: string }) => {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await api.get(`/installments/summary?${params.toString()}`);
    return response.data.data;
  },

  // Get installment by ID
  getInstallmentById: async (id: number): Promise<Installment> => {
    const response = await api.get(`/installments/${id}`);
    return response.data.data.installment;
  },

  // Get installments by sale ID
  getInstallmentsBySaleId: async (saleId: number): Promise<Installment[]> => {
    const response = await api.get(`/installments/sale/${saleId}`);
    return response.data.data.installments;
  },

  // Get installments by customer ID
  getInstallmentsByCustomerId: async (customerId: number): Promise<Installment[]> => {
    const response = await api.get(`/installments/customer/${customerId}`);
    return response.data.data.installments;
  },

  // Create new installment
  createInstallment: async (data: CreateInstallmentData): Promise<Installment> => {
    const response = await api.post('/installments', data);
    return response.data.data.installment;
  },

  // Update installment
  updateInstallment: async (id: number, data: UpdateInstallmentData): Promise<Installment> => {
    const response = await api.put(`/installments/${id}`, data);
    return response.data.data.installment;
  },

  // Delete installment
  deleteInstallment: async (id: number): Promise<void> => {
    await api.delete(`/installments/${id}`);
  },

  // Record payment for installment
  recordPayment: async (id: number, data: PaymentData): Promise<{
    installment: Installment;
    receipt: {
      id: number;
      receipt_number: string;
      customer_id: number;
      sale_id: number;
      amount: number;
      payment_method: string;
      receipt_date: string;
      notes?: string;
    };
  }> => {
    const response = await api.post(`/installments/${id}/payment`, data);
    return response.data.data;
  },

  // Create installment plan
  createInstallmentPlan: async (data: InstallmentPlanData): Promise<InstallmentPlanResponse> => {
    const response = await api.post('/installments/plan', data);
    return response.data.data;
  },

  // Get overdue installments
  getOverdueInstallments: async (): Promise<Installment[]> => {
    const response = await api.get('/installments/overdue');
    return response.data.data.installments;
  },

  // Get upcoming installments
  getUpcomingInstallments: async (): Promise<Installment[]> => {
    const response = await api.get('/installments/upcoming');
    return response.data.data.installments;
  }
};

export default installmentsService;
