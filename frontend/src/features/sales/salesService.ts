import api from '@/lib/api';
import { handleApiError, ApiError } from '@/lib/errorHandler';
import { AxiosError } from 'axios';
import { Product } from '../inventory/types';
import { generateSaleBarcode } from '@/lib/barcode';

export interface SaleItem {
  id: number;
  product_id: number;
  product_name: string;
  sku?: string;
  unit?: string;
  quantity: number;
  price: number;
  total: number;
  discount_percent: number;
  tax_percent: number;
  line_total: number;
  returned_quantity?: number;
  product?: {
    id: number;
    name: string;
    description: string;
    sku: string;
    purchase_price: number;
    selling_price: number;
    current_stock: number;
    min_stock: number;
    unit: string;
    supplier_id: number;
    created_at: string;
    updated_at: string;
    total_sold: number;
    total_purchased: number;
  };
}

export interface SaleData {
  id: number;
  invoice_no: string;
  customer_id: number | null;
  customer_name: string | null;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_method: string;
  payment_status: 'paid' | 'unpaid' | 'partial';
  bill_type?: 'retail' | 'wholesale';
  notes: string;
  created_at: string;
  updated_at: string;
  items: SaleItem[];
  status: string;
  customer?: {
    id: number;
    name: string;
  };
  barcode?: string;
  created_by?: number;
  created_by_name?: string;
  created_by_username?: string;
  returns?: any[];
}

export interface Sale {
  id: number;
  invoice_no: string;
  customer_id: number | null;
  customer_name: string | null;
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
  bill_type?: 'retail' | 'wholesale';
  notes?: string;
  items: SaleItem[];
  status: 'completed' | 'pending' | 'cancelled' | 'returned' | 'partially_returned';
  created_at: string;
  updated_at: string;
  barcode?: string;
  created_by?: number;
  created_by_name?: string;
  created_by_username?: string;
  returns?: any[];
  excess_payment?: {
    excess_amount: number;
    customer_id: number;
    customer_name: string;
    new_balance: number;
  };
}

export interface CreateSaleData {
  customer_id: number | null;
  invoice_date: string;
  due_date: string;
  items: {
    product_id: number;
    name?: string; // Optional name for manual items
    quantity: number;
    price: number;
    discount_percent?: number;
    tax_percent?: number;
  }[];
  total_amount?: number;
  discount_amount?: number;
  tax_amount?: number;
  net_amount?: number;
  paid_amount?: number;
  payment_method: 'cash' | 'card' | 'bank_transfer';
  payment_status: 'paid' | 'unpaid' | 'partial';
  bill_type?: 'retail' | 'wholesale';
  notes?: string;
  status?: 'completed' | 'pending' | 'cancelled';
  barcode?: string;
}

export interface UpdateSaleData {
  customer_id?: number;
  invoice_date?: string;
  due_date?: string;
  payment_method?: 'cash' | 'card' | 'bank_transfer';
  payment_status?: 'paid' | 'unpaid' | 'partial';
  bill_type?: 'retail' | 'wholesale';
  paid_amount?: number;
  notes?: string;
  total_amount?: number;
  discount_amount?: number;
  tax_amount?: number;
  net_amount?: number;
  items?: Array<{
    product_id: number;
    quantity: number;
    price: number;
    discount_percent?: number;
    tax_percent?: number;
  }>;
}

export interface ReturnSaleData {
  items: Array<{
    sale_item_id: number;
    quantity: number;
    price: number;
  }>;
  reason: string;
  refund_method: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface SalesFilters {
  page?: number;
  limit?: number;
  search?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  bill_type?: 'retail' | 'wholesale';
}

// Enhanced error handling for sales API calls
const handleSalesApiError = (error: any, operation: string): never => {
  if (error instanceof AxiosError) {
    const response = error.response;
    
    if (response?.data?.message) {
      // Backend is already returning Arabic messages
      throw new Error(response.data.message);
    }
    
    if (response?.status === 400) {
      // Provide more specific error messages based on the operation
      switch (operation) {
        case 'إنشاء المبيعة':
          throw new Error('بيانات المبيعة غير صحيحة - يرجى التحقق من جميع الحقول المطلوبة');
        case 'تحديث المبيعة':
          throw new Error('بيانات التحديث غير صحيحة - يرجى التحقق من جميع الحقول المطلوبة');
        case 'إرجاع المبيعة':
          throw new Error('بيانات الإرجاع غير صحيحة - يرجى التحقق من الكميات والأسباب');
        default:
          throw new Error('بيانات المبيعة غير صحيحة');
      }
    }
    
    if (response?.status === 404) {
      switch (operation) {
        case 'جلب المبيعة':
          throw new Error('المبيعة غير موجودة');
        case 'تحديث المبيعة':
          throw new Error('المبيعة المراد تحديثها غير موجودة');
        case 'حذف المبيعة':
          throw new Error('المبيعة المراد حذفها غير موجودة');
        default:
          throw new Error('المبيعة غير موجودة');
      }
    }
    
    if (response?.status === 409) {
      throw new Error('تعارض في البيانات - قد تكون المبيعة محجوزة أو تم تعديلها من مكان آخر');
    }
    
    if (response?.status === 422) {
      throw new Error('البيانات المرسلة غير صالحة - يرجى التحقق من صحة المعلومات');
    }
    
    if (response?.status === 500) {
      throw new Error('حدث خطأ في الخادم - يرجى المحاولة مرة أخرى لاحقاً');
    }
    
    if (response?.status === 503) {
      throw new Error('الخدمة غير متاحة حالياً - يرجى المحاولة مرة أخرى لاحقاً');
    }
  }
  
  // Network errors
  if (error.code === 'NETWORK_ERROR' || error.code === 'ERR_NETWORK') {
    throw new Error('خطأ في الاتصال بالخادم - يرجى التحقق من الاتصال بالإنترنت');
  }
  
  if (error.code === 'ECONNABORTED') {
    throw new Error('انتهت مهلة الاتصال - يرجى المحاولة مرة أخرى');
  }
  
  // Fallback to generic error handling
  throw handleApiError(error);
};

// Type guard for ApiResponse<SaleData[]>
function isApiResponseWithData(obj: unknown): obj is { data: SaleData[] } {
  return typeof obj === 'object' && obj !== null && Array.isArray((obj as { data?: unknown }).data);
}

// Get all sales
export const getSales = async (filters?: SalesFilters): Promise<ApiResponse<SaleData[]>> => {
  try {
    const response = await api.get('/sales', { params: filters });
    
    // Handle the nested response structure
    const data = response.data?.data?.items || response.data?.items || response.data || [];
    
    // Ensure items are properly parsed
    const sales = Array.isArray(data) ? data.map(sale => ({
      ...sale,
      items: Array.isArray(sale.items) ? sale.items : []
    })) : [];
    
    return {
      success: true,
      message: 'تم جلب المبيعات بنجاح',
      data: sales
    };
  } catch (error) {
    handleSalesApiError(error, 'جلب المبيعات');
  }
};

// Get single sale
export const getSale = async (id: number): Promise<ApiResponse<Sale>> => {
  try {
    const response = await api.get<ApiResponse<Sale>>(`/sales/${id}`);
    
    // The server returns { success: true, message: string, data: Sale }
    // We need to return the actual sale data
    if (response.data && response.data.success && response.data.data) {
      const sale = {
        ...response.data.data,
        items: Array.isArray(response.data.data.items) ? response.data.data.items : []
      };
      
      return {
        success: true,
        message: 'تم جلب المبيعة بنجاح',
        data: sale
      };
    }
    
    throw new Error('استجابة غير صحيحة من الخادم');
  } catch (error) {
    handleSalesApiError(error, 'جلب المبيعة');
  }
};

// Create sale
export const createSale = async (saleData: CreateSaleData): Promise<ApiResponse<Sale>> => {
  try {
    // Use the provided barcode or generate a new one
    const barcode = saleData.barcode || generateSaleBarcode();
    
    // Calculate totals if not provided
    if (!saleData.total_amount) {
      saleData.total_amount = saleData.items.reduce((total, item) => {
        const itemTotal = item.quantity * item.price;
        const discount = (itemTotal * (item.discount_percent || 0)) / 100;
        const tax = (itemTotal * (item.tax_percent || 0)) / 100;
        return total + (itemTotal - discount + tax);
      }, 0);
    }

    // Ensure numeric types before sending
    saleData.total_amount = Number(saleData.total_amount);
    saleData.paid_amount = Number(saleData.paid_amount || 0);
    saleData.discount_amount = Number(saleData.discount_amount || 0);
    saleData.tax_amount = Number(saleData.tax_amount || 0);
    saleData.items = saleData.items.map(item => ({
      ...item,
      price: Number(item.price),
      quantity: Number(item.quantity),
      product_id: Number(item.product_id)
    }));

    // Set default values if not provided
    saleData.payment_method = saleData.payment_method || 'cash';
    saleData.status = saleData.status || 'completed';

    // Let the server calculate net_amount to avoid conflicts
    const response = await api.post<ApiResponse<Sale>>('/sales', {
      ...saleData,
      barcode // Include the barcode in the request
    });
    
    if (response.data && response.data.success && response.data.data) {
      // Ensure items are properly parsed
      const sale = {
        ...response.data.data,
        items: Array.isArray(response.data.data.items) ? response.data.data.items : []
      };
      
      return {
        success: true,
        message: 'تم إنشاء المبيعة بنجاح',
        data: sale
      };
    }

    throw new Error('استجابة غير صحيحة من الخادم');
  } catch (error) {
    handleSalesApiError(error, 'إنشاء المبيعة');
  }
};

// Update sale
export const updateSale = async (id: number, saleData: UpdateSaleData): Promise<ApiResponse<Sale>> => {
  try {
    const response = await api.put<ApiResponse<Sale>>(`/sales/${id}`, saleData);
    
    if (response.data && response.data.success && response.data.data) {
      // Ensure items are properly parsed
      const sale = {
        ...response.data.data,
        items: Array.isArray(response.data.data.items) ? response.data.data.items : []
      };
      
      return {
        success: true,
        message: 'تم تحديث المبيعة بنجاح',
        data: sale
      };
    }

    throw new Error('استجابة غير صحيحة من الخادم');
  } catch (error) {
    handleSalesApiError(error, 'تحديث المبيعة');
  }
};

// Delete sale
export const deleteSale = async (id: number): Promise<void> => {
  try {
    await api.delete(`/sales/${id}`);
  } catch (error) {
    handleSalesApiError(error, 'حذف المبيعة');
  }
};

// Search sales - now uses the same endpoint with search parameter
export const searchSales = async (searchTerm: string): Promise<ApiResponse<SaleData[]>> => {
  try {
    const filters: SalesFilters = {
      search: searchTerm,
      page: 1,
      limit: 50
    };
    
    return await getSales(filters);
  } catch (error) {
    console.error('Search error:', error);
    throw new Error('فشل في البحث عن المبيعات');
  }
};

// Return sale
export const returnSale = async (id: number, returnData: ReturnSaleData): Promise<ApiResponse<Sale>> => {
  try {
    const response = await api.post<ApiResponse<Sale>>(`/sales/${id}/return`, returnData);
    
    if (response.data && response.data.success && response.data.data) {
      return {
        success: true,
        message: 'تم إرجاع المبيعة بنجاح',
        data: response.data.data
      };
    }

    throw new Error('استجابة غير صحيحة من الخادم');
  } catch (error) {
    handleSalesApiError(error, 'إرجاع المبيعة');
  }
};

// Get product by barcode for POS
export const getProductByBarcode = async (barcode: string | null): Promise<Product | null> => {
  try {
    // If barcode is null or empty, return null
    if (!barcode) {
      return null;
    }

    const response = await api.get<{ success: boolean; data: Product }>(`/sales/pos/product/${barcode}`);
    return response.data.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 404) {
        return null;
      }
      if (error.response?.status === 400) {
        throw new Error('تنسيق الباركود غير صحيح');
      }
      if (error.response?.status === 500) {
        throw new Error('حدث خطأ في الخادم');
      }
      if (!error.response) {
        throw new Error('خطأ في الشبكة - يرجى التحقق من الاتصال');
      }
    }
    return null;
  }
};

const salesService = {
  getSales,
  getSale,
  createSale,
  updateSale,
  deleteSale,
  searchSales,
  returnSale,
  getProductByBarcode,
};

export default salesService;