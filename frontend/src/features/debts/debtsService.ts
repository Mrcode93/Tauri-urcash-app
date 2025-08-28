import api from '@/lib/api';
import { handleApiError, ApiError } from '@/lib/errorHandler';

export interface DebtData {
  sale_id: number;
  invoice_no: string;
  customer_id: number;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'partial' | 'unpaid';
  created_at: string;
  updated_at: string;
  installments?: Array<{
    id: number;
    sale_id: number;
    customer_id: number;
    amount: number;
    paid_amount: number;
    due_date: string;
    payment_status: 'paid' | 'unpaid' | 'partial';
    payment_method: 'cash' | 'card' | 'bank_transfer';
    paid_at?: string;
    notes?: string;
    invoice_no?: string;
  }>;
}

export interface CreateDebtData {
  sale_id: number;
  paid_amount: number;
  due_date: string;
  status?: 'pending' | 'paid' | 'partial' | 'unpaid';
  // Note: customer_id is derived from sales table in the backend
}

export interface UpdateDebtData {
  paid_amount?: number;
  due_date?: string;
  status?: 'pending' | 'paid' | 'partial' | 'unpaid';
}

export interface DebtStats {
  total_pending: number;
  total_paid: number;
  total_count: number;
}

export interface RepayDebtData {
  paid_amount: number;
  payment_method?: 'cash' | 'card' | 'bank_transfer' | 'check';
  reference_number?: string;
  notes?: string;
  receipt_date?: string;
  money_box_id?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

// Get all debts
export const getDebts = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  customer_id?: number;
}): Promise<ApiResponse<DebtData[]>> => {
  try {
    const response = await api.get('/debts', { 
      params: {
        page: params?.page || 1,
        limit: params?.limit || 50,
        search: params?.search,
        status: params?.status,
        customer_id: params?.customer_id
      }
    });
    
    
    
    return {
      success: true,
      message: 'Debts fetched successfully',
      data: response.data.data || [],
      pagination: response.data.pagination
    };
  } catch (error) {
    console.error('[DebtsService] API Error:', error);
    const apiError = handleApiError(error);
    throw apiError;
  }
};

// Get debt statistics
export const getDebtStats = async (params?: {
  customer_id?: number;
}): Promise<ApiResponse<DebtStats>> => {
  try {
    const response = await api.get('/debts/stats', { 
      params: {
        customer_id: params?.customer_id
      }
    });
    return {
      success: true,
      message: 'Debt statistics fetched successfully',
      data: response.data.data
    };
  } catch (error) {
    const apiError = handleApiError(error);
    throw apiError;
  }
};

// Get debts by customer
export const getDebtsByCustomer = async (customerId: number): Promise<ApiResponse<DebtData[]>> => {
  try {
    const response = await api.get(`/debts/customer/${customerId}`);
    return {
      success: true,
      message: 'Customer debts fetched successfully',
      data: response.data.data || []
    };
  } catch (error) {
    const apiError = handleApiError(error);
    throw apiError;
  }
};

// Get single debt
export const getDebt = async (id: number): Promise<ApiResponse<DebtData>> => {
  try {
    const response = await api.get(`/debts/${id}`);
    return {
      success: true,
      message: 'Debt fetched successfully',
      data: response.data.data
    };
  } catch (error) {
    const apiError = handleApiError(error);
    throw apiError;
  }
};

// Create debt
export const createDebt = async (debtData: CreateDebtData): Promise<ApiResponse<DebtData>> => {
  try {
    const response = await api.post('/debts', debtData);
    return {
      success: true,
      message: 'Debt created successfully',
      data: response.data
    };
  } catch (error) {
    const apiError = handleApiError(error);
    throw apiError;
  }
};

// Update debt
export const updateDebt = async (id: number, debtData: UpdateDebtData): Promise<ApiResponse<DebtData>> => {
  try {
    const response = await api.put(`/debts/${id}`, debtData);
    return {
      success: true,
      message: 'Debt updated successfully',
      data: response.data
    };
  } catch (error) {
    const apiError = handleApiError(error);
    throw apiError;
  }
};

// Delete debt
export const deleteDebt = async (id: number): Promise<void> => {
  try {
    await api.delete(`/debts/${id}`);
  } catch (error) {
    const apiError = handleApiError(error);
    throw apiError;
  }
};

// Repay debt
const repayDebt = async (id: number, repayData: RepayDebtData) => {
  try {
    const response = await api.post(`/debts/${id}/repay`, repayData);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const debtsService = {
  getDebts,
  getDebtStats,
  getDebtsByCustomer,
  getDebt,
  createDebt,
  updateDebt,
  deleteDebt,
  repayDebt
};

export default debtsService; 