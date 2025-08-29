import  api  from '@/lib/api';

// Error handler for supplier payment receipts API
const handleSupplierPaymentReceiptsApiError = (error: any, operation: string): never => {
  console.error(`Supplier Payment Receipts API Error (${operation}):`, error);
  
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
    getAll: 'حدث خطأ أثناء جلب إيصالات دفع الموردين',
    getById: 'حدث خطأ أثناء جلب بيانات إيصال الدفع',
    create: 'حدث خطأ أثناء إنشاء إيصال الدفع',
    update: 'حدث خطأ أثناء تحديث إيصال الدفع',
    delete: 'حدث خطأ أثناء حذف إيصال الدفع',
    getStatistics: 'حدث خطأ أثناء جلب الإحصائيات',
    getSupplierPurchases: 'حدث خطأ أثناء جلب فواتير الشراء للمورد',
    getSupplierSummary: 'حدث خطأ أثناء جلب ملخص إيصالات المورد',
    exportToCSV: 'حدث خطأ أثناء تصدير البيانات'
  };
  
  throw new Error(defaultMessages[operation] || 'حدث خطأ في نظام إيصالات دفع الموردين');
};

export interface SupplierPaymentReceipt {
  id: number;
  receipt_number: string;
  supplier_id: number;
  supplier_name: string;
  supplier_phone?: string;
  supplier_email?: string;
  supplier_address?: string;
  purchase_id?: number;
  purchase_invoice_no?: string;
  purchase_total_amount?: number;
  purchase_paid_amount?: number;
  purchase_remaining_amount?: number;
  receipt_date: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'check';
  reference_number?: string;
  notes?: string;
  money_box_id?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierPaymentReceiptData {
  supplier_id: number;
  purchase_id?: number;
  receipt_date: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'check';
  reference_number?: string;
  notes?: string;
  receipt_number?: string;
  money_box_id?: string;
}

export interface UpdateSupplierPaymentReceiptData extends Partial<CreateSupplierPaymentReceiptData> {}

export interface SupplierPaymentReceiptFilters {
  supplier_id?: number;
  purchase_id?: number;
  payment_method?: string;
  date_from?: string;
  date_to?: string;
  reference_number?: string;
  page?: number;
  limit?: number;
}

export interface SupplierPaymentReceiptSummary {
  total_receipts: number;
  total_amount: number;
  first_receipt_date: string;
  last_receipt_date: string;
}

export interface SupplierPaymentReceiptStatistics {
  total_receipts: number;
  total_amount: number;
  average_amount: number;
  min_amount: number;
  max_amount: number;
  unique_suppliers: number;
}

export interface SupplierPurchase {
  id: number;
  invoice_no: string;
  invoice_date: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: string;
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

class SupplierPaymentReceiptsService {
  // Get all supplier payment receipts with pagination and filters
  async getAll(filters: SupplierPaymentReceiptFilters = {}): Promise<PaginatedResponse<SupplierPaymentReceipt>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    try {
      const response = await api.get(`/supplier-payment-receipts?${params.toString()}`);
      // Transform the backend response to match the expected frontend structure
      return {
        data: response.data.data.items || [],
        pagination: {
          page: response.data.data.page || 1,
          limit: response.data.data.limit || 10,
          total: response.data.data.total || 0,
          totalPages: response.data.data.total_pages || 0
        }
      };
    } catch (error) {
      handleSupplierPaymentReceiptsApiError(error, 'getAll');
    }
  }

  // Get receipt by ID
  async getById(id: number): Promise<SupplierPaymentReceipt> {
    try {
      const response = await api.get(`/supplier-payment-receipts/${id}`);
      return response.data.data;
    } catch (error) {
      handleSupplierPaymentReceiptsApiError(error, 'getById');
    }
  }

  // Create new receipt
  async create(data: CreateSupplierPaymentReceiptData): Promise<SupplierPaymentReceipt> {
    try {
      const response = await api.post('/supplier-payment-receipts', data);
      return response.data.data;
    } catch (error) {
      handleSupplierPaymentReceiptsApiError(error, 'create');
    }
  }

  // Update receipt
  async update(id: number, data: UpdateSupplierPaymentReceiptData): Promise<SupplierPaymentReceipt> {
    try {
      const response = await api.put(`/supplier-payment-receipts/${id}`, data);
      return response.data.data;
    } catch (error) {
      handleSupplierPaymentReceiptsApiError(error, 'update');
    }
  }

  // Delete receipt
  async delete(id: number): Promise<void> {
    try {
      await api.delete(`/supplier-payment-receipts/${id}`);
    } catch (error) {
      handleSupplierPaymentReceiptsApiError(error, 'delete');
    }
  }

  // Get supplier receipt summary
  async getSupplierSummary(supplierId: number): Promise<SupplierPaymentReceiptSummary> {
    try {
      const response = await api.get(`/supplier-payment-receipts/supplier/${supplierId}/summary`);
      return response.data.data;
    } catch (error) {
      handleSupplierPaymentReceiptsApiError(error, 'getSupplierSummary');
    }
  }

  // Get receipt statistics
  async getStatistics(filters: SupplierPaymentReceiptFilters = {}): Promise<SupplierPaymentReceiptStatistics> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    try {
      const response = await api.get(`/supplier-payment-receipts/statistics?${params.toString()}`);
      return response.data.data;
    } catch (error) {
      handleSupplierPaymentReceiptsApiError(error, 'getStatistics');
    }
  }

  // Get available purchases for a supplier
  async getSupplierPurchases(supplierId: number): Promise<SupplierPurchase[]> {
    try {
      const response = await api.get(`/supplier-payment-receipts/supplier/${supplierId}/purchases`);
      return response.data.data;
    } catch (error) {
      handleSupplierPaymentReceiptsApiError(error, 'getSupplierPurchases');
    }
  }

  // Get receipt by receipt number
  async getByReceiptNumber(receiptNumber: string): Promise<SupplierPaymentReceipt> {
    try {
      const response = await api.get(`/supplier-payment-receipts/number/${receiptNumber}`);
      return response.data.data;
    } catch (error) {
      handleSupplierPaymentReceiptsApiError(error, 'getByReceiptNumber');
    }
  }

  // Bulk create receipts
  async bulkCreate(receipts: CreateSupplierPaymentReceiptData[]): Promise<{
    created: SupplierPaymentReceipt[];
    errors: Array<{ index: number; errors: string[] }>;
  }> {
    try {
      const response = await api.post('/supplier-payment-receipts/bulk', { receipts });
      return response.data.data;
    } catch (error) {
      handleSupplierPaymentReceiptsApiError(error, 'bulkCreate');
    }
  }

  // Export receipts to CSV
  async exportToCSV(filters: SupplierPaymentReceiptFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    try {
      const response = await api.get(`/supplier-payment-receipts/export?${params.toString()}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      handleSupplierPaymentReceiptsApiError(error, 'exportToCSV');
    }
  }

  // Download CSV file
  async downloadCSV(filters: SupplierPaymentReceiptFilters = {}): Promise<void> {
    const blob = await this.exportToCSV(filters);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `supplier_payment_receipts_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const supplierPaymentReceiptsService = new SupplierPaymentReceiptsService(); 