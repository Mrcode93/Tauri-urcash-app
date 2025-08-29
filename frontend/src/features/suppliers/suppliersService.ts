import api from '@/lib/api';

export interface Supplier {
  id: number;
  name: string;
  contact_person: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_number?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  products_count?: number;
  total_supplier_value?: number;
}

export type CreateSupplierData = {
  name: string;
  contact_person: string;
  phone?: string;
  email?: string;
  address?: string;
};

export interface UpdateSupplierData {
  name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  credit_limit?: number;
  current_balance?: number;
}

// Error handler for suppliers API
const handleSuppliersApiError = (error: any, operation: string): never => {
  console.error(`Suppliers API Error (${operation}):`, error);
  
  // If it's already an Error object with validation data, preserve it
  if (error instanceof Error && error.message.includes('خطأ في التحقق من البيانات')) {
    // This is likely a validation error that was converted to a string
    // We need to reconstruct the original error structure
    const originalError = {
      response: {
        data: {
          message: error.message,
          errors: [] // We'll need to get this from somewhere
        }
      }
    };
    throw originalError;
  }
  
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
    getSuppliers: 'حدث خطأ أثناء جلب الموردين',
    getSupplier: 'حدث خطأ أثناء جلب بيانات المورد',
    createSupplier: 'حدث خطأ أثناء إنشاء المورد',
    updateSupplier: 'حدث خطأ أثناء تحديث بيانات المورد',
    deleteSupplier: 'حدث خطأ أثناء حذف المورد',
    searchSuppliers: 'حدث خطأ أثناء البحث عن الموردين'
  };
  
  throw new Error(defaultMessages[operation] || 'حدث خطأ في نظام الموردين');
};

// Get all suppliers
export const getSuppliers = async (): Promise<Supplier[]> => {
  try {
    const response = await api.get<{ success: boolean; data: { items: Supplier[] } }>('/suppliers');
    return response.data.data.items;
  } catch (error) {
    handleSuppliersApiError(error, 'getSuppliers');
  }
};

// Get single supplier
export const getSupplier = async (id: number): Promise<Supplier> => {
  try {
    const response = await api.get<{ success: boolean; data: Supplier }>(`/suppliers/${id}`);
    return response.data.data;
  } catch (error) {
    handleSuppliersApiError(error, 'getSupplier');
  }
};

// Create supplier
export const createSupplier = async (supplierData: CreateSupplierData): Promise<Supplier> => {
  try {
    const response = await api.post<{ success: boolean; data: Supplier }>('/suppliers', supplierData);
    return response.data.data;
  } catch (error) {
    handleSuppliersApiError(error, 'createSupplier');
  }
};

// Update supplier
export const updateSupplier = async (id: number, data: UpdateSupplierData): Promise<Supplier> => {
  try {
    const response = await api.put<{ success: boolean; data: Supplier }>(`/suppliers/${id}`, data);
    return response.data.data;
  } catch (error) {
    handleSuppliersApiError(error, 'updateSupplier');
  }
};

// Delete supplier
export const deleteSupplier = async (id: number): Promise<void> => {
  try {
    await api.delete(`/suppliers/${id}`);
  } catch (error) {
    handleSuppliersApiError(error, 'deleteSupplier');
  }
};

// Search suppliers
export const searchSuppliers = async (query: string): Promise<Supplier[]> => {
  try {
    const response = await api.get<{ success: boolean; data: Supplier[] }>(`/suppliers/search?query=${encodeURIComponent(query)}`);
    return response.data.data;
  } catch (error) {
    handleSuppliersApiError(error, 'searchSuppliers');
  }
};

// Update supplier credit limit
export const updateSupplierCreditLimit = async (id: number, credit_limit: number): Promise<Supplier> => {
  try {
    const response = await api.patch<{ success: boolean; data: Supplier }>(`/suppliers/${id}/credit-limit`, { credit_limit });
    return response.data.data;
  } catch (error) {
    handleSuppliersApiError(error, 'updateSupplierCreditLimit');
  }
};

// Update supplier current balance
export const updateSupplierBalance = async (id: number, current_balance: number): Promise<Supplier> => {
  try {
    const response = await api.patch<{ success: boolean; data: Supplier }>(`/suppliers/${id}/current-balance`, { current_balance });
    return response.data.data;
  } catch (error) {
    handleSuppliersApiError(error, 'updateSupplierBalance');
  }
};

// Comprehensive supplier update (including financial fields)
export const updateSupplierComplete = async (id: number, data: UpdateSupplierData): Promise<Supplier> => {
  try {
    const response = await api.patch<{ success: boolean; data: Supplier }>(`/suppliers/${id}`, data);
    return response.data.data;
  } catch (error) {
    handleSuppliersApiError(error, 'updateSupplierComplete');
  }
};

const suppliersService = {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  searchSuppliers,
  updateSupplierCreditLimit,
  updateSupplierBalance,
  updateSupplierComplete
};

export default suppliersService; 