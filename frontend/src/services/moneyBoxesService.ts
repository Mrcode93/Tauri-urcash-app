import api from '@/lib/api';

export interface MoneyBox {
  id: number;
  name: string;
  balance: number;
  notes?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface MoneyBoxTransaction {
  id: number;
  box_id: number;
  type: 'deposit' | 'withdraw' | 'transfer_in' | 'transfer_out';
  amount: number;
  balance_after: number;
  notes?: string;
  related_box_id?: number;
  created_by?: number;
  created_by_name?: string;
  box_name?: string;
  created_at: string;
}

export interface MoneyBoxSummary {
  id: number;
  name: string;
  amount: number;
  total_deposits: number;
  total_withdrawals: number;
  total_transactions: number;
}

export interface AllMoneyBoxesSummary {
  total_boxes: number;
  total_balance: number;
  total_deposits: number;
  total_withdrawals: number;
  total_transactions: number;
}

export interface CreateMoneyBoxData {
  name: string;
  amount?: number;
  notes?: string;
}

export interface UpdateMoneyBoxData {
  name: string;
  notes?: string;
}

export interface AddTransactionData {
  type_: 'deposit' | 'withdraw' | 'transfer_in' | 'transfer_out';
  amount: number;
  notes?: string;
}

export interface TransferData {
  fromBoxId: number;
  toBoxId: number;
  amount: number;
  notes?: string;
}

class MoneyBoxesService {
  // Get all money boxes
  async getAllMoneyBoxes(): Promise<MoneyBox[]> {
    const response = await api.get('/money-boxes');
    console.log(response.data);
    return response.data.data;
  }

  // Get money box by ID
  async getMoneyBoxById(id: number): Promise<MoneyBox> {
    const response = await api.get(`/money-boxes/${id}`);
    return response.data.data;
  }

  // Create new money box
  async createMoneyBox(data: CreateMoneyBoxData): Promise<MoneyBox> {
    const response = await api.post('/money-boxes', data);
    return response.data.data;
  }

  // Update money box
  async updateMoneyBox(id: number, data: UpdateMoneyBoxData): Promise<MoneyBox> {
    const response = await api.put(`/money-boxes/${id}`, data);
    return response.data.data;
  }

  // Delete money box
  async deleteMoneyBox(id: number): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/money-boxes/${id}`);
    return response.data;
  }

  // Get money box transactions
  async getMoneyBoxTransactions(
    id: number, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<{
    transactions: MoneyBoxTransaction[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const response = await api.get(`/money-boxes/${id}/transactions`, {
      params: { limit, offset }
    });
    console.log('transactions', response.data);
    return response.data.data;
  }

  // Add transaction to money box
  async addTransaction(id: number, data: AddTransactionData): Promise<{
    transactionId: number;
    newBalance: number;
    transaction: MoneyBoxTransaction;
  }> {
    const response = await api.post(`/money-boxes/${id}/transactions`, data);
    return response.data.data;
  }

  // Transfer between money boxes
  async transferBetweenBoxes(data: TransferData): Promise<{
    success: boolean;
    message: string;
    fromBox: MoneyBox;
    toBox: MoneyBox;
  }> {
    const response = await api.post('/money-boxes/transfer', data);
    const responseData = response.data.data;
    return {
      success: true,
      message: responseData.message,
      fromBox: responseData.from_box,
      toBox: responseData.to_box
    };
  }

  // Get money box summary
  async getMoneyBoxSummary(id: number): Promise<MoneyBoxSummary> {
    const response = await api.get(`/money-boxes/${id}/summary`);
    return response.data.data;
  }

  // Get all money boxes summary
  async getAllMoneyBoxesSummary(): Promise<AllMoneyBoxesSummary> {
    const response = await api.get('/money-boxes/summary');
    return response.data.data;
  }

  // Get transactions by date range
  async getTransactionsByDateRange(
    id: number,
    startDate: string,
    endDate: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    transactions: MoneyBoxTransaction[];
    total: number;
    limit: number;
    offset: number;
    dateRange: { startDate: string; endDate: string };
  }> {
    const response = await api.get(`/money-boxes/${id}/transactions/date-range`, {
      params: { startDate, endDate, limit, offset }
    });
    return response.data.data;
  }

  // Get money box by name
  async getMoneyBoxByName(name: string): Promise<MoneyBox> {
    const response = await api.get(`/money-boxes/name/${encodeURIComponent(name)}`);
    return response.data.data;
  }
}

export default new MoneyBoxesService(); 