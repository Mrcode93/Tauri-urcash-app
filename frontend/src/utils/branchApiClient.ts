import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { DeviceConfigManager } from './deviceConfig';
import { toast } from "@/lib/toast";

export interface BranchApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export class BranchApiClient {
  private axiosInstance: AxiosInstance;
  private isMainDevice: boolean;
  private mainDeviceUrl: string;
  private connectionTimeout: number;

  constructor() {
    this.isMainDevice = DeviceConfigManager.isMainDevice();
    this.mainDeviceUrl = DeviceConfigManager.getMainDeviceUrl();
    this.connectionTimeout = DeviceConfigManager.loadConfig().connection_timeout;

    // Create axios instance with base configuration
    this.axiosInstance = axios.create({
      baseURL: this.isMainDevice ? '/api' : `${this.mainDeviceUrl}/api`,
      timeout: this.connectionTimeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging and device mode handling
    this.axiosInstance.interceptors.request.use(
      (config) => {
        if (!this.isMainDevice) {
          
        }
        return config;
      },
      (error) => {
        console.error('[BRANCH] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        if (!this.isMainDevice) {
          
        }
        return response;
      },
      (error) => {
        if (!this.isMainDevice) {
          console.error('[BRANCH] Response error from main device:', error.message);
          
          // Handle common network errors for secondary devices
          if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
            toast.error('Unable to connect to main device. Please check network connection and main device status.');
          } else if (error.code === 'ECONNABORTED') {
            toast.error('Connection to main device timed out. Please try again.');
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Update configuration (refresh axios instance)
   */
  updateConfig(): void {
    this.isMainDevice = DeviceConfigManager.isMainDevice();
    this.mainDeviceUrl = DeviceConfigManager.getMainDeviceUrl();
    this.connectionTimeout = DeviceConfigManager.loadConfig().connection_timeout;

    // Update axios instance configuration
    this.axiosInstance.defaults.baseURL = this.isMainDevice ? '/api' : `${this.mainDeviceUrl}/api`;
    this.axiosInstance.defaults.timeout = this.connectionTimeout;
  }

  /**
   * Generic API request method
   */
  private async request<T = unknown>(config: AxiosRequestConfig): Promise<BranchApiResponse<T>> {
    try {
      const response: AxiosResponse<T> = await this.axiosInstance(config);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('[BRANCH] API request failed:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Test connection to API
   */
  async testConnection(): Promise<BranchApiResponse> {
    return this.request({
      method: 'GET',
      url: '/health',
    });
  }

  // === SALES API ===
  async getSales(params?: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'GET',
      url: '/sales',
      params,
    });
  }

  async getSale(id: string | number): Promise<BranchApiResponse> {
    return this.request({
      method: 'GET',
      url: `/sales/${id}`,
    });
  }

  async createSale(saleData: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'POST',
      url: '/sales',
      data: saleData,
    });
  }

  async updateSale(id: string | number, saleData: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'PUT',
      url: `/sales/${id}`,
      data: saleData,
    });
  }

  async deleteSale(id: string | number): Promise<BranchApiResponse> {
    return this.request({
      method: 'DELETE',
      url: `/sales/${id}`,
    });
  }

  // === CUSTOMERS API ===
  async getCustomers(params?: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'GET',
      url: '/customers',
      params,
    });
  }

  async getCustomer(id: string | number): Promise<BranchApiResponse> {
    return this.request({
      method: 'GET',
      url: `/customers/${id}`,
    });
  }

  async createCustomer(customerData: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'POST',
      url: '/customers',
      data: customerData,
    });
  }

  async updateCustomer(id: string | number, customerData: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'PUT',
      url: `/customers/${id}`,
      data: customerData,
    });
  }

  async deleteCustomer(id: string | number): Promise<BranchApiResponse> {
    return this.request({
      method: 'DELETE',
      url: `/customers/${id}`,
    });
  }

  // === PRODUCTS/INVENTORY API ===
  async getProducts(params?: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'GET',
      url: '/products',
      params,
    });
  }

  async getProduct(id: string | number): Promise<BranchApiResponse> {
    return this.request({
      method: 'GET',
      url: `/products/${id}`,
    });
  }

  async createProduct(productData: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'POST',
      url: '/products',
      data: productData,
    });
  }

  async updateProduct(id: string | number, productData: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'PUT',
      url: `/products/${id}`,
      data: productData,
    });
  }

  async deleteProduct(id: string | number): Promise<BranchApiResponse> {
    return this.request({
      method: 'DELETE',
      url: `/products/${id}`,
    });
  }

  // === SUPPLIERS API ===
  async getSuppliers(params?: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'GET',
      url: '/suppliers',
      params,
    });
  }

  async getSupplier(id: string | number): Promise<BranchApiResponse> {
    return this.request({
      method: 'GET',
      url: `/suppliers/${id}`,
    });
  }

  async createSupplier(supplierData: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'POST',
      url: '/suppliers',
      data: supplierData,
    });
  }

  async updateSupplier(id: string | number, supplierData: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'PUT',
      url: `/suppliers/${id}`,
      data: supplierData,
    });
  }

  async deleteSupplier(id: string | number): Promise<BranchApiResponse> {
    return this.request({
      method: 'DELETE',
      url: `/suppliers/${id}`,
    });
  }

  // === PURCHASES API ===
  async getPurchases(params?: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'GET',
      url: '/purchases',
      params,
    });
  }

  async getPurchase(id: string | number): Promise<BranchApiResponse> {
    return this.request({
      method: 'GET',
      url: `/purchases/${id}`,
    });
  }

  async createPurchase(purchaseData: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'POST',
      url: '/purchases',
      data: purchaseData,
    });
  }

  async updatePurchase(id: string | number, purchaseData: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'PUT',
      url: `/purchases/${id}`,
      data: purchaseData,
    });
  }

  async deletePurchase(id: string | number): Promise<BranchApiResponse> {
    return this.request({
      method: 'DELETE',
      url: `/purchases/${id}`,
    });
  }

  // === EXPENSES API ===
  async getExpenses(params?: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'GET',
      url: '/expenses',
      params,
    });
  }

  async getExpense(id: string | number): Promise<BranchApiResponse> {
    return this.request({
      method: 'GET',
      url: `/expenses/${id}`,
    });
  }

  async createExpense(expenseData: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'POST',
      url: '/expenses',
      data: expenseData,
    });
  }

  async updateExpense(id: string | number, expenseData: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'PUT',
      url: `/expenses/${id}`,
      data: expenseData,
    });
  }

  async deleteExpense(id: string | number): Promise<BranchApiResponse> {
    return this.request({
      method: 'DELETE',
      url: `/expenses/${id}`,
    });
  }

  // === REPORTS API ===
  async getReports(params?: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'GET',
      url: '/reports',
      params,
    });
  }

  async getDashboardData(params?: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'GET',
      url: '/reports/dashboard',
      params,
    });
  }

  async getSalesReport(params?: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'GET',
      url: '/reports/sales',
      params,
    });
  }

  async getInventoryReport(params?: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'GET',
      url: '/reports/inventory',
      params,
    });
  }

  // === SETTINGS API ===
  async getSettings(): Promise<BranchApiResponse> {
    return this.request({
      method: 'GET',
      url: '/settings',
    });
  }

  async updateSettings(settingsData: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'PUT',
      url: '/settings',
      data: settingsData,
    });
  }

  // === DEBTS API ===
  async getDebts(params?: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'GET',
      url: '/debts',
      params,
    });
  }

  async getDebt(id: string | number): Promise<BranchApiResponse> {
    return this.request({
      method: 'GET',
      url: `/debts/${id}`,
    });
  }

  async createDebt(debtData: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'POST',
      url: '/debts',
      data: debtData,
    });
  }

  async updateDebt(id: string | number, debtData: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'PUT',
      url: `/debts/${id}`,
      data: debtData,
    });
  }

  async deleteDebt(id: string | number): Promise<BranchApiResponse> {
    return this.request({
      method: 'DELETE',
      url: `/debts/${id}`,
    });
  }

  // === INSTALLMENTS API ===
  async getInstallments(params?: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'GET',
      url: '/installments',
      params,
    });
  }

  async getInstallment(id: string | number): Promise<BranchApiResponse> {
    return this.request({
      method: 'GET',
      url: `/installments/${id}`,
    });
  }

  async createInstallment(installmentData: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'POST',
      url: '/installments',
      data: installmentData,
    });
  }

  async updateInstallment(id: string | number, installmentData: Record<string, unknown>): Promise<BranchApiResponse> {
    return this.request({
      method: 'PUT',
      url: `/installments/${id}`,
      data: installmentData,
    });
  }

  async deleteInstallment(id: string | number): Promise<BranchApiResponse> {
    return this.request({
      method: 'DELETE',
      url: `/installments/${id}`,
    });
  }

  // === UTILITY METHODS ===

  /**
   * Get device mode information
   */
  getDeviceInfo(): {
    isMainDevice: boolean;
    deviceMode: 'main' | 'secondary';
    mainDeviceUrl: string;
    connectionTimeout: number;
  } {
    return {
      isMainDevice: this.isMainDevice,
      deviceMode: DeviceConfigManager.getDeviceMode(),
      mainDeviceUrl: this.mainDeviceUrl,
      connectionTimeout: this.connectionTimeout,
    };
  }

  /**
   * Check if we're currently connected to main device (for secondary devices)
   */
  async checkConnection(): Promise<{ connected: boolean; latency?: number; error?: string }> {
    if (this.isMainDevice) {
      return { connected: true };
    }

    const startTime = Date.now();
    const result = await this.testConnection();
    
    if (result.success) {
      return {
        connected: true,
        latency: Date.now() - startTime,
      };
    } else {
      return {
        connected: false,
        error: result.error,
      };
    }
  }
}

// Create singleton instance
export const branchApiClient = new BranchApiClient();

// Export default instance
export default branchApiClient; 