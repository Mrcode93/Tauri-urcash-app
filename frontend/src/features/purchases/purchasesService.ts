import api from '@/lib/api';

export interface PurchaseItem {
  id: number;
  product_id: number;
  stock_id?: number; // Optional for backward compatibility
  product_name: string;
  product_sku?: string;
  product_description?: string;
  quantity: number;
  price: number;
  discount_percent: number;
  tax_percent: number;
  total: number;
  returned_quantity?: number;
}

export interface Purchase {
  id: number;
  invoice_no: string;
  supplier_id: number;
  supplier_name: string;
  supplier_contact?: string;
  supplier_phone?: string;
  supplier_email?: string;
  supplier_address?: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_method: 'cash' | 'card' | 'bank_transfer';
  payment_status: 'paid' | 'unpaid' | 'partial';
  status: 'completed' | 'pending' | 'cancelled' | 'returned' | 'partially_returned';
  notes: string;
  items: PurchaseItem[];
  money_box_id?: string;
  created_at: string;
  updated_at: string;
  // Return information
  total_returned_amount?: number;
  return_count?: number;
  last_return_date?: string;
}

export interface CreatePurchaseData {
  supplier_id: number;
  invoice_no?: string;
  invoice_date: string;
  due_date: string;
  items: {
    product_id: number;
    stock_id: number; // Required stock selection
    quantity: number;
    price: number;
    discount_percent?: number;
    tax_percent?: number;
  }[];
  payment_method?: 'cash' | 'card' | 'bank_transfer';
  payment_status?: 'paid' | 'unpaid' | 'partial';
  status?: 'completed' | 'pending' | 'cancelled' | 'returned' | 'partially_returned';
  notes?: string;
  paid_amount?: number;
  moneyBoxId?: string;
}

export interface UpdatePurchaseData {
  supplier_id?: number;
  invoice_no?: string;
  invoice_date?: string;
  due_date?: string;
  items?: {
    product_id: number;
    stock_id: number; // Required stock selection
    quantity: number;
    price: number;
    discount_percent?: number;
    tax_percent?: number;
  }[];
  payment_method?: 'cash' | 'card' | 'bank_transfer';
  payment_status?: 'paid' | 'unpaid' | 'partial';
  status?: 'completed' | 'pending' | 'cancelled' | 'returned' | 'partially_returned';
  paid_amount?: number;
  notes?: string;
  moneyBoxId?: string;
}

export interface ReturnPurchaseData {
  items: Array<{
    purchase_item_id: number;
    quantity: number;
    price: number;
  }>;
  reason: string;
  refund_method: string;
}

// Handle API errors with Arabic messages
const handlePurchasesApiError = (error: any, operation: string): never => {
  console.error(`Purchases API Error (${operation}):`, error);
  
  if (error.response?.data?.message) {
    // Use the Arabic message from the backend
    throw new Error(error.response.data.message);
  }
  
  if (error.message) {
    throw new Error(error.message);
  }
  
  // Default Arabic error messages
  const defaultMessages: Record<string, string> = {
    'getPurchases': 'حدث خطأ أثناء جلب المشتريات',
    'getPurchase': 'حدث خطأ أثناء جلب بيانات المشتريات',
    'createPurchase': 'حدث خطأ أثناء إنشاء المشتريات',
    'updatePurchase': 'حدث خطأ أثناء تحديث المشتريات',
    'deletePurchase': 'حدث خطأ أثناء حذف المشتريات',
    'returnPurchase': 'حدث خطأ أثناء إرجاع المشتريات',
    'getPurchaseReturns': 'حدث خطأ أثناء جلب مرتجعات المشتريات'
  };
  
  throw new Error(defaultMessages[operation] || 'حدث خطأ في معالجة المشتريات');
};

// Helper function to validate API response
const validateApiResponse = (response: any, operation: string): any => {
  if (!response || !response.data) {
    throw new Error(`استجابة غير صحيحة من الخادم - ${operation}`);
  }
  
  if (!response.data.success) {
    throw new Error(response.data.message || `فشل في ${operation}`);
  }
  
  return response.data.data;
};

// Get all purchases
export const getPurchases = async (): Promise<Purchase[]> => {
  try {
    const response = await api.get('/purchases');
    const data = validateApiResponse(response, 'جلب المشتريات');
    return data.purchases || [];
  } catch (error) {
    handlePurchasesApiError(error, 'getPurchases');
  }
};

// Get single purchase
export const getPurchase = async (id: number): Promise<Purchase> => {
  try {
    const response = await api.get(`/purchases/${id}`);
    const data = validateApiResponse(response, 'جلب بيانات المشتريات');
    return data.purchase;
  } catch (error) {
    handlePurchasesApiError(error, 'getPurchase');
  }
};

export const getPurchaseWithReturns = async (id: number): Promise<Purchase> => {
  try {
    const response = await api.get(`/purchases/${id}/with-returns`);
    const data = validateApiResponse(response, 'جلب بيانات المشتريات مع المرتجعات');
    return data.purchase;
  } catch (error) {
    handlePurchasesApiError(error, 'getPurchaseWithReturns');
  }
};

// Create purchase
export const createPurchase = async (purchaseData: CreatePurchaseData): Promise<Purchase> => {
  try {
    const response = await api.post('/purchases', purchaseData);
    const data = validateApiResponse(response, 'إنشاء المشتريات');
    return data.purchase;
  } catch (error) {
    handlePurchasesApiError(error, 'createPurchase');
  }
};

// Update purchase
export const updatePurchase = async (id: number, data: UpdatePurchaseData): Promise<Purchase> => {
  try {
    const response = await api.put(`/purchases/${id}`, data);
    const responseData = validateApiResponse(response, 'تحديث المشتريات');
    return responseData.purchase;
  } catch (error) {
    handlePurchasesApiError(error, 'updatePurchase');
  }
};

// Delete purchase
export const deletePurchase = async (id: number): Promise<void> => {
  try {
    const response = await api.delete(`/purchases/${id}`);
    validateApiResponse(response, 'حذف المشتريات');
  } catch (error) {
    handlePurchasesApiError(error, 'deletePurchase');
  }
};

// Return purchase
export const returnPurchase = async (id: number, returnData: ReturnPurchaseData): Promise<any> => {
  try {
    const response = await api.post(`/purchases/${id}/return`, returnData);
    const data = validateApiResponse(response, 'إرجاع المشتريات');
    return data;
  } catch (error) {
    handlePurchasesApiError(error, 'returnPurchase');
  }
};

// Get purchase returns
export const getPurchaseReturns = async (id: number): Promise<any[]> => {
  try {
    const response = await api.get(`/purchases/${id}/returns`);
    const data = validateApiResponse(response, 'جلب مرتجعات المشتريات');
    return data.returns || [];
  } catch (error) {
    handlePurchasesApiError(error, 'getPurchaseReturns');
  }
};

const purchasesService = {
  getPurchases,
  getPurchase,
  createPurchase,
  updatePurchase,
  deletePurchase,
  returnPurchase,
  getPurchaseReturns,
};

export default purchasesService; 