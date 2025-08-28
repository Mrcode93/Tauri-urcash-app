import { API_CONFIG } from './api';
import cacheService from './cacheService';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

class ApiService {
  private baseUrl = `http://localhost:${API_CONFIG.API_PORT}/api`;

  /**
   * Make a cached API request
   */
  async cachedRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    ttl: number = 300000 // 5 minutes default
  ): Promise<T> {
    const cacheKey = `api:${endpoint}:${JSON.stringify(options)}`;
    
    return cacheService.wrap(cacheKey, async () => {
      const response = await this.request<T>(endpoint, options);
      return response;
    }, ttl);
  }

  /**
   * Make a regular API request
   */
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse<T> = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'API request failed');
      }

      return data.data as T;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Check server status with caching
   */
  async checkServerStatus(): Promise<boolean> {
    const cacheKey = 'server:status';
    
    return cacheService.wrap(cacheKey, async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // Reduced timeout
        
        const response = await fetch(`${this.baseUrl}/status`, {
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return response.ok;
      } catch (error) {
        console.error('Server status check failed:', error);
        return false;
      }
    }, 30000); // Cache server status for 30 seconds
  }

  /**
   * Get cached customers data
   */
  async getCustomers(params: { limit?: number; page?: number } = {}) {
    const queryString = new URLSearchParams(params as Record<string, string>).toString();
    const endpoint = `/customers${queryString ? `?${queryString}` : ''}`;
    
    return this.cachedRequest(endpoint, {}, 600000); // 10 minutes cache
  }

  /**
   * Get cached suppliers data
   */
  async getSuppliers() {
    return this.cachedRequest('/suppliers', {}, 900000); // 15 minutes cache
  }

  /**
   * Get cached settings data
   */
  async getSettings() {
    return this.cachedRequest('/settings', {}, 1800000); // 30 minutes cache
  }

  /**
   * Get cached sales data
   */
  async getSales(params: { limit?: number; page?: number } = {}) {
    const queryString = new URLSearchParams(params as Record<string, string>).toString();
    const endpoint = `/sales${queryString ? `?${queryString}` : ''}`;
    
    return this.cachedRequest(endpoint, {}, 300000); // 5 minutes cache
  }

  /**
   * Get cached debts data
   */
  async getDebts(params: { limit?: number; page?: number } = {}) {
    const queryString = new URLSearchParams(params as Record<string, string>).toString();
    const endpoint = `/debts${queryString ? `?${queryString}` : ''}`;
    
    return this.cachedRequest(endpoint, {}, 300000); // 5 minutes cache
  }

  /**
   * Get cached debt stats
   */
  async getDebtStats(params: { period?: string } = {}) {
    const queryString = new URLSearchParams(params as Record<string, string>).toString();
    const endpoint = `/debts/stats${queryString ? `?${queryString}` : ''}`;
    
    return this.cachedRequest(endpoint, {}, 600000); // 10 minutes cache
  }

  /**
   * Invalidate cache for specific patterns
   */
  invalidateCache(pattern: string): number {
    return cacheService.invalidatePattern(pattern);
  }

  /**
   * Clear all API cache
   */
  clearCache(): void {
    cacheService.invalidatePattern('api:*');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return cacheService.getStats();
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService; 