import api from '../../lib/api';

export interface Stock {
  id: number;
  name: string;
  code: string;
  description?: string;
  address: string;
  city?: string;
  state?: string;
  country: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  manager_name?: string;
  manager_phone?: string;
  manager_email?: string;
  is_main_stock: boolean;
  is_active: boolean;
  capacity: number;
  current_capacity_used: number;
  notes?: string;
  total_products?: number;
  total_stock_quantity?: number;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: number;
  movement_type: 'transfer' | 'adjustment' | 'purchase' | 'sale' | 'return' | 'damage' | 'expiry';
  from_stock_id?: number;
  to_stock_id?: number;
  product_id: number;
  quantity: number;
  unit_cost?: number;
  total_value?: number;
  reference_type?: string;
  reference_id?: number;
  reference_number?: string;
  movement_date: string;
  notes?: string;
  created_by?: number;
  created_at: string;
  product_name?: string;
  product_sku?: string;
  from_stock_name?: string;
  to_stock_name?: string;
  created_by_name?: string;
}

export interface StockStats {
  id: number;
  name: string;
  capacity: number;
  current_capacity_used: number;
  total_products: number;
  total_stock_quantity: number;
  low_stock_products: number;
  out_of_stock_products: number;
  normal_stock_products: number;
}

export interface CreateStockData {
  name: string;
  code: string;
  description?: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  manager_name?: string;
  manager_phone?: string;
  manager_email?: string;
  is_main_stock?: boolean;
  capacity?: number;
  notes?: string;
}

export interface UpdateStockData extends Partial<CreateStockData> {
  is_active?: boolean;
}

export interface CreateMovementData {
  movement_type: 'transfer' | 'adjustment' | 'purchase' | 'sale' | 'return' | 'damage' | 'expiry';
  from_stock_id?: number | null;
  to_stock_id?: number;
  product_id: number;
  quantity: number;
  unit_cost?: number;
  total_value?: number;
  reference_type?: string;
  reference_id?: number;
  reference_number?: string;
  notes?: string;
}

class StocksService {
  // Get all stocks
  async getAllStocks(): Promise<Stock[]> {
    const response = await api.get('/stocks');
    // Handle paginated response structure from Rust server
    if (response.data.data && response.data.data.items && Array.isArray(response.data.data.items)) {
      return response.data.data.items;
    } else if (Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return [];
  }

  // Get stock by ID
  async getStockById(id: number): Promise<Stock> {
    const response = await api.get(`/stocks/${id}`);
    return response.data.data;
  }

  // Create new stock
  async createStock(data: CreateStockData): Promise<{ id: number }> {
    const response = await api.post('/stocks', data);
    return response.data.data;
  }

  // Update stock
  async updateStock(id: number, data: UpdateStockData): Promise<void> {
    await api.put(`/stocks/${id}`, data);
  }

  // Delete stock
  async deleteStock(id: number): Promise<void> {
    await api.delete(`/stocks/${id}`);
  }

  // Get products in a specific stock
  async getStockProducts(stockId: number): Promise<any[]> {
    const response = await api.get(`/stocks/${stockId}/products`);
    return response.data.data;
  }

  // Get stock movements
  async getStockMovements(stockId: number, params?: {
    page?: number;
    limit?: number;
    movement_type?: string;
  }): Promise<{
    data: StockMovement[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await api.get(`/stocks/${stockId}/movements`, { params });
    return response.data;
  }

  // Get stock statistics
  async getStockStats(stockId: number): Promise<StockStats> {
    const response = await api.get(`/stocks/${stockId}/stats`);
    return response.data.data;
  }

  // Get all stock movements
  async getAllMovements(params?: {
    page?: number;
    limit?: number;
    movement_type?: string;
    from_stock_id?: number;
    to_stock_id?: number;
    product_id?: number;
  }): Promise<{
    data: StockMovement[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await api.get('/stock-movements', { params });
    return response.data;
  }

  // Create stock movement
  async createMovement(data: CreateMovementData): Promise<{ 
    id: number;
    updatedStocks?: any[];
    updatedProduct?: any;
  }> {
    const response = await api.post('/stock-movements', data);
    return response.data.data;
  }

  // Get movement by ID
  async getMovementById(id: number): Promise<StockMovement> {
    const response = await api.get(`/stock-movements/${id}`);
    return response.data.data;
  }

  // Get movement statistics
  async getMovementStats(params?: {
    period?: number;
    movement_type?: string;
  }): Promise<any> {
    const response = await api.get('/stock-movements/stats', { params });
    return response.data.data;
  }

  // Reverse movement
  async reverseMovement(id: number, notes?: string): Promise<{ id: number }> {
    const response = await api.post(`/stock-movements/${id}/reverse`, { notes });
    return response.data.data;
  }

  // Get available products for adding to stock
  async getAvailableProducts(): Promise<any[]> {
    const response = await api.get('/products?format=simple&limit=1000');
    // Handle different response structures
    if (response.data.data && Array.isArray(response.data.data)) {
      return response.data.data;
    } else if (response.data.data && response.data.data.products && Array.isArray(response.data.data.products)) {
      return response.data.data.products;
    } else if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  }

  // Add product to stock
  async addProductToStock(stockId: number, data: {
    product_id: string;
    quantity: number;
    location_in_stock?: string;
  }): Promise<void> {
    const response = await api.post(`/stocks/${stockId}/products`, data);
    return response.data;
  }
}

export const stocksService = new StocksService(); 