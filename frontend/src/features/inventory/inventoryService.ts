import { ApiResponse } from "@/lib/types";
import api from '@/lib/api';
import { AxiosError } from 'axios';

interface StockMovement {
  id: number;
  movement_date: string;
  movement_type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'initial';
  quantity: number;
  before_quantity: number;
  after_quantity: number;
  notes?: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  scientific_name?: string;
  sku: string;
  barcode?: string;
  supported?: boolean;
  purchase_price: number;
  selling_price: number;
  wholesale_price: number;
  company_name?: string;
  current_stock: number;
  min_stock: number;
  unit: string;
  category_id?: number;
  supplier_id?: number;
  stock_id?: number;
  expiry_date?: string;
  units_per_box: number;
  is_dolar?: boolean;
  created_at: string;
  updated_at: string;
  total_sold?: number;
  total_purchased?: number;
  category?: {
    id: number;
    name: string;
  };
  supplier?: {
    id: number;
    name: string;
  };
  movements?: StockMovement[];
  days_until_expiry?: number;
}

export interface CreateProductData {
  name: string;
  description: string;
  sku?: string;
  barcode?: string;
  scientific_name?: string;
  supported?: boolean;
  purchase_price: number;
  selling_price: number;
  wholesale_price: number;
  company_name?: string;
  current_stock: number;
  min_stock: number;
  unit: string;
  category_id?: number;
  supplier_id?: number;
  stock_id?: number;
  expiry_date?: string;
  units_per_box: number;
  is_dolar?: boolean;
}

export interface UpdateProductData {
  name: string;
  description: string;
  sku: string;
  scientific_name?: string;
  barcode?: string;
  supported?: boolean;
  purchase_price: number;
  selling_price: number;
  wholesale_price: number;
  company_name?: string;
  current_stock: number;
  min_stock: number;
  unit: string;
  category_id?: number;
  supplier_id?: number;
  stock_id?: number;
  expiry_date?: string;
  units_per_box: number;
  is_dolar?: boolean;
}

// Enhanced error handling with Arabic messages
const handleApiError = (error: any, operation: string): never => {
  if (error instanceof AxiosError) {
    const response = error.response;
    
    // Add detailed logging for debugging
    console.error('API Error Details:', {
      status: response?.status,
      statusText: response?.statusText,
      data: response?.data,
      url: error.config?.url,
      method: error.config?.method,
      requestData: error.config?.data
    });
    
    if (response?.data?.message) {
      // Use the Arabic message from the server
      throw new Error(response.data.message);
    }
    
    if (response?.status === 404) {
      throw new Error('المنتج غير موجود');
    }
    
    if (response?.status === 400) {
      if (response.data?.errors) {
        // Handle validation errors
        const errorMessages = response.data.errors;
        console.error('Validation errors:', errorMessages);
        if (Array.isArray(errorMessages)) {
          throw new Error(errorMessages[0]);
        }
      }
      throw new Error('بيانات غير صحيحة');
    }
    
    if (response?.status === 409) {
      throw new Error('المنتج موجود مسبقاً');
    }
    
    if (response?.status === 500) {
      throw new Error('خطأ في الخادم');
    }
    
    if (response?.status === 413) {
      throw new Error('الملف كبير جداً');
    }
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error('انتهت مهلة الاتصال - يرجى المحاولة مرة أخرى');
    }
    
    if (!response) {
      throw new Error('خطأ في الاتصال بالخادم');
    }
  }
  
  // Fallback error message
  throw new Error(error.message || `حدث خطأ أثناء ${operation}`);
};

// Get all products with enhanced error handling
export const getAllProducts = async (params?: {
  page?: number;
  limit?: number;
  name?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  lowStock?: number;
  stock_id?: number;
  barcode?: string;
  cache?: boolean;
}): Promise<{ products: Product[]; total: number; hasMore: boolean }> => {
  try {
     // Debug log
    
    const response = await api.get<{ 
      success: boolean; 
      data: { 
        products: Product[]; 
        pagination: {
          currentPage: number;
          totalPages: number;
          totalItems: number;
          itemsPerPage: number;
          hasNextPage: boolean;
          hasPrevPage: boolean;
        }
      } 
    }>('/products', { params });
    
     // Debug log
    
    const { products, pagination } = response.data.data;
    console.log('Pagination info:', response.data);
    const hasMore = pagination.hasNextPage;
    
    return {
      products,
      total: pagination.totalItems,
      hasMore
    };
  } catch (error) {
    handleApiError(error, 'جلب المنتجات');
  }
};

// Category types and functions
export interface Category {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

// Get all categories
export const getAllCategories = async (): Promise<Category[]> => {
  try {
    const response = await api.get<{ success: boolean; data: Category[] }>('/products/categories');
    console.log('Categories:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Error in getAllCategories:', error);
    handleApiError(error, 'جلب الفئات');
  }
};

// Add new category
export const addCategory = async (name: string): Promise<Category> => {
  try {
    const response = await api.post<{ success: boolean; data: Category }>('/products/categories', { name });
    return response.data.data;
  } catch (error) {
    handleApiError(error, 'إضافة الفئة');
  }
};

// Update category
export const updateCategory = async (id: number, name: string): Promise<Category> => {
  try {
    const response = await api.put<{ success: boolean; data: Category }>(`/products/categories/${id}`, { name });
    return response.data.data;
  } catch (error) {
    handleApiError(error, 'تحديث الفئة');
  }
};

// Delete category
export const deleteCategory = async (id: number): Promise<void> => {
  try {
    await api.delete(`/products/categories/${id}`);
  } catch (error) {
    handleApiError(error, 'حذف الفئة');
  }
};

// Get products by stock with filtering
export const getProductsByStock = async (stockId: number, params?: {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: number;
}): Promise<any> => {
  try {
    const response = await api.get(`/stocks/${stockId}/products`, { params });
    return response.data;
  } catch (error) {
    handleApiError(error, 'جلب منتجات المخزن');
  }
};

// Get products for POS with enhanced error handling
export const getProductsForPOS = async (params?: {
  search?: string;
  limit?: number;
  category?: string;
}): Promise<Product[]> => {
  try {
    const response = await api.get<{ success: boolean; data: { products: Product[]; pagination: any } }>('/products/pos', { params });
    return response.data.data.products;
  } catch (error) {
    handleApiError(error, 'جلب منتجات نقاط البيع');
  }
};

// Get single product with enhanced error handling
export const getProductById = async (id: number): Promise<Product> => {
  try {
    const response = await api.get<{ success: boolean; data: Product }>(`/products/${id}`);
    return response.data.data;
  } catch (error) {
    handleApiError(error, 'جلب المنتج');
  }
};

// Get product by barcode with enhanced error handling
export const getProductByBarcode = async (barcode: string): Promise<Product> => {
  try {
    const response = await api.get<{ success: boolean; data: Product }>(`/products/barcode/${barcode}`);
    return response.data.data;
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 404) {
      // Create a custom error with a specific code for product not found
      const notFoundError = new Error('المنتج غير موجود') as Error & { code: string };
      notFoundError.code = 'PRODUCT_NOT_FOUND';
      throw notFoundError;
    }
    handleApiError(error, 'البحث عن المنتج بالباركود');
  }
};

// Create product with enhanced error handling
export const createProduct = async (data: CreateProductData): Promise<Product> => {
  try {
    const response = await api.post<{ success: boolean; data: Product }>('/products', data);
    return response.data.data;
  } catch (error) {
    handleApiError(error, 'إضافة المنتج');
  }
};

// Update product with enhanced error handling
export const updateProduct = async (id: number, data: UpdateProductData): Promise<Product> => {
  try {
     // Debug log
    const response = await api.put<{ success: boolean; data: Product }>(`/products/${id}`, data);
    return response.data.data;
  } catch (error) {
    handleApiError(error, 'تحديث المنتج');
  }
};

// Delete product with enhanced error handling
export const deleteProduct = async (id: number, force: boolean = false): Promise<void> => {
  try {
    await api.delete(`/products/${id}`, { params: { force } });
  } catch (error) {
    handleApiError(error, 'حذف المنتج');
  }
};

// Get product references with enhanced error handling
export const getProductReferences = async (id: number): Promise<{
  product: { id: number; name: string; sku: string };
  references: Record<string, number>;
  totalReferences: number;
  canDelete: boolean;
}> => {
  try {
    const response = await api.get<{ success: boolean; data: any }>(`/products/${id}/references`);
    return response.data.data;
  } catch (error) {
    handleApiError(error, 'جلب مراجع المنتج');
  }
};

// Get product movements with enhanced error handling
export const getProductMovements = async (id: number, params?: {
  startDate?: string;
  endDate?: string;
  movementType?: string;
}): Promise<StockMovement[]> => {
  try {
    const response = await api.get<{ success: boolean; data: StockMovement[] }>(`/products/${id}/movements`, { params });
    return response.data.data;
  } catch (error) {
    handleApiError(error, 'جلب حركات المنتج');
  }
};

// Get expiring products with enhanced error handling
export const getExpiringProducts = async (days: number = 30): Promise<Product[]> => {
  try {
    const response = await api.get<{ success: boolean; data: Product[] }>('/products/expiring', { params: { days } });
    return response.data.data;
  } catch (error) {
    handleApiError(error, 'جلب المنتجات القاربة على انتهاء الصلاحية');
  }
};

// Get low stock products with enhanced error handling
export const getLowStockProducts = async (threshold: number = 10): Promise<Product[]> => {
  try {
    const response = await api.get<{ success: boolean; data: Product[] }>('/products/low-stock', { params: { threshold } });
    return response.data.data;
  } catch (error) {
    handleApiError(error, 'جلب المنتجات منخفضة المخزون');
  }
};

export interface ImportResponse {
  success: boolean;
  message: string;
  data?: {
    imported: number;
    failed: number;
    total: number;
    errors: string[];
    errorCount?: number;
  };
}

// Import products from XLSX/CSV with enhanced error handling
export const importFromFile = async (file: File): Promise<ImportResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<ImportResponse>('/products/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5 minutes timeout for large imports
    });
    
    return response.data;
  } catch (error) {
    handleApiError(error, 'استيراد المنتجات');
  }
};

// Get most sold products with enhanced error handling
export const getMostSoldProducts = async (params: { limit?: number; period?: 'week' | 'month' | 'year' }): Promise<ApiResponse<{ products: Product[] }>> => {
  try {
    const response = await api.get<{ success: boolean; data: Product[] }>('/products/most-sold', { params });
    return {
      success: response.data.success,
      data: { products: response.data.data }
    };
  } catch (error) {
    handleApiError(error, 'جلب المنتجات الأكثر مبيعاً');
  }
};

// Export products to CSV with enhanced error handling
export const exportToCSV = async (params?: {
  search?: string;
  category?: number;
  supplier?: number;
  lowStock?: boolean;
  expiring?: boolean;
}): Promise<Blob> => {
  try {
    const response = await api.get('/products/export', { 
      params,
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    handleApiError(error, 'تصدير المنتجات');
  }
};

// Generate monthly inventory report with enhanced error handling
export const generateMonthlyInventoryReport = async (year: number, month: number) => {
  try {
    const response = await api.get<{ success: boolean; data: any }>('/products/reports/monthly', { 
      params: { year, month } 
    });
    return response.data.data;
  } catch (error) {
    handleApiError(error, 'إنشاء تقرير المخزون الشهري');
  }
};

// Generate yearly inventory report with enhanced error handling
export const generateYearlyInventoryReport = async (year: number) => {
  try {
    const response = await api.get<{ success: boolean; data: any }>('/products/reports/yearly', { 
      params: { year } 
    });
    return response.data.data;
  } catch (error) {
    handleApiError(error, 'إنشاء تقرير المخزون السنوي');
  }
};

// Generate custom inventory report with enhanced error handling
export const generateCustomInventoryReport = async (startDate: string, endDate: string, reportType?: string) => {
  try {
    const response = await api.get<{ success: boolean; data: any }>('/products/reports/custom', { 
      params: { start_date: startDate, end_date: endDate, report_type: reportType } 
    });
    return response.data.data;
  } catch (error) {
    handleApiError(error, 'إنشاء تقرير المخزون المخصص');
  }
};

// Get inventory report with enhanced error handling
export const getInventoryReport = async (startDate: string, endDate: string, reportType: string = 'comprehensive') => {
  try {
    const response = await api.get<{ success: boolean; data: any }>('/inventory/report', { 
      params: { start_date: startDate, end_date: endDate, report_type: reportType } 
    });
    return response.data.data;
  } catch (error) {
    handleApiError(error, 'جلب تقرير المخزون');
  }
};

// Adjust stock with enhanced error handling
export const adjustStock = async (data: {
  product_id: number;
  adjustment_type: 'add' | 'subtract';
  quantity: number;
  notes?: string;
}): Promise<Product> => {
  try {
    const response = await api.post<{ success: boolean; data: Product }>('/products/adjust-stock', data);
    return response.data.data;
  } catch (error) {
    handleApiError(error, 'تعديل المخزون');
  }
};

// Adjust stock with purchase with enhanced error handling
export const adjustStockWithPurchase = async (data: {
  product_id: number;
  quantity: number;
  supplier_id: number;
  purchase_price: number;
  invoice_no?: string;
  notes?: string;
}): Promise<Product> => {
  try {
    const response = await api.post<{ success: boolean; data: Product }>('/products/adjust-stock-with-purchase', data);
    return response.data.data;
  } catch (error) {
    handleApiError(error, 'تعديل المخزون مع الشراء');
  }
};

const inventoryService = {
  getAllProducts,
  getAllCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getProductsForPOS,
  getProductById,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductReferences,
  getProductMovements,
  getExpiringProducts,
  getLowStockProducts,
  importFromFile,
  getMostSoldProducts,
  exportToCSV,
  generateMonthlyInventoryReport,
  generateYearlyInventoryReport,
  generateCustomInventoryReport,
  getInventoryReport,
  adjustStock,
  adjustStockWithPurchase,
};

export default inventoryService;