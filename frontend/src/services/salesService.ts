import api from '../lib/api';
import { SaleData, SalesFilters } from '../types/sales';

export const salesService = {
  // Get all sales with optional filters
  getSales: async (filters?: SalesFilters) => {
    const response = await api.get('/sales', { params: filters });
    return response.data;
  },

  // Get a single sale by ID
  getSale: async (id: string) => {
    const response = await api.get(`/sales/${id}`);
    return response.data;
  },

  // Create a new sale
  createSale: async (saleData: Partial<SaleData>) => {
    const response = await api.post('/sales', saleData);
    return response.data;
  },

  // Update a sale
  updateSale: async (id: string, saleData: Partial<SaleData>) => {
    const response = await api.put(`/sales/${id}`, saleData);
    return response.data;
  },

  // Delete a sale
  deleteSale: async (id: string) => {
    const response = await api.delete(`/sales/${id}`);
    return response.data;
  }
}; 