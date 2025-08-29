import api from '../../lib/api';
import { handleApiError } from '../../utils/apiUtils';

// ==================== TYPES ====================

export interface BillItem {
  product_id: number;
  stock_id?: number;
  quantity: number;
  price: number;
  discount_percent?: number;
  discount?: number;
  discount_type?: 'fixed' | 'percentage';
  tax_percent?: number;
  expiry_date?: string;
  batch_number?: string;
  notes?: string;
  sale_item_id?: number;
  purchase_item_id?: number;
  reason?: string;
  product_name?: string;
  product_sku?: string;
  product_barcode?: string;
  product_unit?: string;
  total?: number;
}

export interface SaleBillData {
  customer_id: number;
  delegate_id?: number;
  employee_id?: number;
  invoice_date: string;
  due_date?: string;
  discount_amount?: number;
  discount?: number;
  discount_type?: 'fixed' | 'percentage';
  tax_amount?: number;
  tax_rate?: number;
  paid_amount?: number;
  payment_method?: string;
  payment_status?: string;
  bill_type?: 'retail' | 'wholesale';
  notes?: string;
  barcode?: string;
  created_by?: number;
  installments?: any[];
  moneyBoxId?: string | null;
  transactionNotes?: string;
}

export interface PurchaseBillData {
  supplier_id: number;
  invoice_date: string;
  due_date?: string;
  discount_amount?: number;
  tax_amount?: number;
  paid_amount?: number;
  payment_method?: string;
  payment_status?: string;
  notes?: string;
  created_by?: number;
}

export interface ReturnBillData {
  return_type: 'sale' | 'purchase';
  sale_id?: number;
  purchase_id?: number;
  return_date: string;
  total_amount: number;
  refund_amount?: number;
  reason?: string;
  refund_method?: 'cash' | 'bank';
  notes?: string;
  created_by?: number;
}

export interface BillsFilters {
  customer_id?: number;
  supplier_id?: number;
  payment_status?: string;
  bill_type?: 'retail' | 'wholesale';
  return_type?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface BillsStatistics {
  total_bills?: number;
  total_purchases?: number;
  total_returns?: number;
  total_amount: number;
  total_paid: number;
  total_unpaid?: number;
  total_refunded?: number;
  total_returned_amount?: number;
  return_count?: number;
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

export interface Bill {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  invoice_no: string;
  invoice_date: string;
  due_date?: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  paid_amount: number;
  payment_method: string;
  payment_status: string;
  bill_type?: 'retail' | 'wholesale';
  status: string;
  notes?: string;
  barcode?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
  items?: BillItem[];
  // Return information
  total_returned_amount?: number;
  return_count?: number;
  last_return_date?: string;
  returns?: ReturnBill[];
}

export interface Purchase {
  id: number;
  supplier_id: number;
  supplier_name: string;
  supplier_phone: string;
  supplier_email: string;
  invoice_no: string;
  invoice_date: string;
  due_date?: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_method: string;
  payment_status: string;
  status: string;
  notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
  items?: BillItem[];
  // Return information
  total_returned_amount?: number;
  return_count?: number;
  last_return_date?: string;
  returns?: ReturnBill[];
}

export interface ReturnBill {
  id: number;
  return_type: 'sale' | 'purchase';
  return_number?: string;
  return_date: string;
  total_amount: number;
  refund_amount?: number;
  status: string;
  notes?: string;
  reason?: string;
  refund_method?: string;
  sale_id?: number;
  purchase_id?: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
  original_invoice_no: string;
  original_sale_date?: string;
  original_purchase_date?: string;
  original_sale_amount?: number;
  original_purchase_amount?: number;
  original_payment_status?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  supplier_name?: string;
  supplier_phone?: string;
  supplier_email?: string;
  created_by_name?: string;
  items?: BillItem[];
}

// ==================== SALE BILLS API ====================

export const createSaleBill = async (
  billData: SaleBillData, 
  items: BillItem[], 
  moneyBoxId?: string | null, 
  transactionNotes?: string
): Promise<any> => {
  try {
    const requestData = { 
      bill_data: billData, 
      items,
      money_box_id: moneyBoxId,
      transaction_notes: transactionNotes
    };
    
    const response = await api.post('/bills/sale', requestData);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getAllSaleBills = async (filters?: BillsFilters, page?: number, limit?: number): Promise<PaginatedResponse<Bill>> => {
  try {
    const params = new URLSearchParams();
    
    if (filters?.customer_id) params.append('customer_id', filters.customer_id.toString());
    if (filters?.payment_status) params.append('payment_status', filters.payment_status);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.search) params.append('search', filters.search);
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());

    const url = `/bills/sale?${params.toString()}`;
    
    
    const response = await api.get(url);

    console.log(response.data);
    
    // The API returns data nested under response.data.data
    return response.data.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getSaleBillById = async (id: number): Promise<any> => {
  try {
    const response = await api.get(`/bills/sale/${id}`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getBillByNumber = async (billNumber: string): Promise<any> => {
  try {
    const response = await api.get(`/bills/sale/number/${billNumber}`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const updateBillPaymentStatus = async (id: number, paymentData: any): Promise<any> => {
  try {
    const response = await api.put(`/bills/sale/${id}/payment`, paymentData);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const deleteBill = async (id: number): Promise<any> => {
  try {
    const response = await api.delete(`/bills/sale/${id}`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// ==================== PURCHASE BILLS API ====================

export const createPurchaseBill = async (
  billData: PurchaseBillData, 
  items: BillItem[], 
  moneyBoxId?: number, 
  transactionNotes?: string
): Promise<any> => {
  try {
    const requestData = { 
      bill_data: billData, 
      items,
      money_box_id: moneyBoxId,
      transaction_notes: transactionNotes
    };
    
    const response = await api.post('/bills/purchase', requestData);
    
    return response.data.data;
  } catch (error) {
    console.error('API error in createPurchaseBill:', error);
    throw handleApiError(error);
  }
};

export const getAllPurchaseBills = async (filters?: BillsFilters, page?: number, limit?: number): Promise<PaginatedResponse<Purchase>> => {
  try {
    const params = new URLSearchParams();
    
    if (filters?.supplier_id) params.append('supplier_id', filters.supplier_id.toString());
    if (filters?.payment_status) params.append('payment_status', filters.payment_status);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.search) params.append('search', filters.search);
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    // Add cache busting parameter
    params.append('_cache_bust', Date.now().toString());

    const url = `/bills/purchase?${params.toString()}`;
    
    
    const response = await api.get(url);
    
    // The API returns data nested under response.data.data
    return response.data.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getPurchaseBillById = async (id: number): Promise<any> => {
  try {
    const response = await api.get(`/bills/purchase/${id}`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getPurchaseByNumber = async (invoiceNumber: string): Promise<any> => {
  try {
    const response = await api.get(`/bills/purchase/number/${invoiceNumber}`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const updatePurchasePaymentStatus = async (id: number, paymentData: any): Promise<any> => {
  try {
    const response = await api.put(`/bills/purchase/${id}/payment`, paymentData);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const deletePurchase = async (id: number): Promise<any> => {
  try {
    const response = await api.delete(`/bills/purchase/${id}`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// ==================== RETURN BILLS API ====================

export const createReturnBill = async (returnData: ReturnBillData, items: BillItem[]): Promise<any> => {
  try {
    const response = await api.post('/bills/return', { returnData, items });
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getAllReturnBills = async (filters?: BillsFilters, page?: number, limit?: number): Promise<PaginatedResponse<ReturnBill>> => {
  try {
    const params = new URLSearchParams();
    
    if (filters?.return_type) params.append('return_type', filters.return_type);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.search) params.append('search', filters.search);
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    // Add cache busting parameter
    params.append('_cache_bust', Date.now().toString());

    const url = `/bills/return?${params.toString()}`;
    
    const response = await api.get(url);
    
    // The API returns data nested under response.data.data
    return response.data.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getReturnBillById = async (id: number, returnType: 'sale' | 'purchase'): Promise<any> => {
  try {
    const response = await api.get(`/bills/return/${id}?type=${returnType}`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getReturnByNumber = async (returnNumber: string, returnType: 'sale' | 'purchase'): Promise<any> => {
  try {
    const response = await api.get(`/bills/return/number/${returnNumber}?type=${returnType}`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const deleteReturn = async (id: number, returnType: 'sale' | 'purchase'): Promise<any> => {
  try {
    const response = await api.delete(`/bills/return/${id}?type=${returnType}`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getReturnsBySaleId = async (saleId: number): Promise<any> => {
  try {
    const response = await api.get(`/bills/return/sale/${saleId}`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getReturnsByPurchaseId = async (purchaseId: number): Promise<any> => {
  try {
    const response = await api.get(`/bills/return/purchase/${purchaseId}`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// ==================== STATISTICS API ====================

export const getBillsStatistics = async (filters?: BillsFilters): Promise<BillsStatistics> => {
  try {
    const params = new URLSearchParams();
    
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);

    const response = await api.get(`/bills/statistics/sale?${params.toString()}`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getPurchasesStatistics = async (filters?: BillsFilters): Promise<BillsStatistics> => {
  try {
    const params = new URLSearchParams();
    
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);

    const response = await api.get(`/bills/statistics/purchase?${params.toString()}`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getReturnsStatistics = async (filters?: BillsFilters): Promise<BillsStatistics> => {
  try {
    const params = new URLSearchParams();
    
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);

    const response = await api.get(`/bills/statistics/return?${params.toString()}`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Default export for backward compatibility
const billsService = {
  createSaleBill,
  getAllSaleBills,
  getSaleBillById,
  getBillByNumber,
  updateBillPaymentStatus,
  deleteBill,
  createPurchaseBill,
  getAllPurchaseBills,
  getPurchaseBillById,
  getPurchaseByNumber,
  updatePurchasePaymentStatus,
  deletePurchase,
  createReturnBill,
  getAllReturnBills,
  getReturnBillById,
  getReturnByNumber,
  deleteReturn,
  getBillsStatistics,
  getPurchasesStatistics,
  getReturnsStatistics
};

export default billsService; 