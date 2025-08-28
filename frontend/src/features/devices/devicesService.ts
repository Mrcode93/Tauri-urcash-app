import api from '@/lib/api';

// Types
export interface Device {
  id: string;
  name: string;
  ip_address: string;
  mac_address: string;
  device_type: 'pos' | 'kiosk' | 'tablet' | 'desktop';
  status: 'active' | 'inactive' | 'maintenance';
  cash_balance: number;
  max_cash_limit: number;
  created_at: string;
  last_connected: string;
  permissions: string[];
  notes: string;
  cash_info?: DeviceCashInfo;
}

export interface DeviceCashInfo {
  current_balance: number;
  total_deposited: number;
  total_withdrawn: number;
  last_transaction: DeviceTransaction | null;
  transactions: DeviceTransaction[];
}

export interface DeviceTransaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  previous_balance: number;
  new_balance: number;
  reason: string;
  timestamp: string;
}

export interface DeviceStats {
  total_devices: number;
  active_devices: number;
  last_updated: string;
}

export interface CashSummary {
  current_balance: number;
  total_deposited: number;
  total_withdrawn: number;
  last_transaction: DeviceTransaction | null;
  recent_transactions: DeviceTransaction[];
  total_transactions: number;
}

export interface OverallCashSummary {
  total_cash: number;
  total_deposited: number;
  total_withdrawn: number;
  total_devices: number;
  active_devices: number;
  devices_with_cash: number;
  last_updated: string;
  recent_history: CashHistoryItem[];
}

export interface CashHistoryItem {
  device_id: string;
  device_name: string;
  transaction: DeviceTransaction;
  timestamp: string;
}

export interface DeviceStatistics {
  devices: DeviceStats;
  cash: OverallCashSummary;
  summary: {
    total_devices: number;
    active_devices: number;
    total_cash: number;
    devices_with_cash: number;
  };
}

// Device Management Service
class DevicesService {
  // Get all devices
  async getAllDevices(): Promise<{ success: boolean; data: Device[]; stats: DeviceStats }> {
    try {
      const response = await api.get('/devices');
      return response.data;
    } catch (error) {
      console.error('Error fetching devices:', error);
      throw error;
    }
  }

  // Get device by ID
  async getDeviceById(deviceId: string): Promise<{ success: boolean; data: Device }> {
    try {
      const response = await api.get(`/devices/${deviceId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching device:', error);
      throw error;
    }
  }

  // Add new device
  async addDevice(deviceInfo: {
    name: string;
    ip_address?: string;
    mac_address?: string;
    device_type?: 'pos' | 'kiosk' | 'tablet' | 'desktop';
    max_cash_limit?: number;
    permissions?: string[];
    notes?: string;
  }): Promise<{ success: boolean; message: string; data: Device }> {
    try {
      const response = await api.post('/devices', deviceInfo);
      return response.data;
    } catch (error) {
      console.error('Error adding device:', error);
      throw error;
    }
  }

  // Remove device
  async removeDevice(deviceId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.delete(`/devices/${deviceId}`);
      return response.data;
    } catch (error) {
      console.error('Error removing device:', error);
      throw error;
    }
  }

  // Update device status
  async updateDeviceStatus(
    deviceId: string, 
    status: 'active' | 'inactive' | 'maintenance'
  ): Promise<{ success: boolean; message: string; data: Device }> {
    try {
      const response = await api.patch(`/devices/${deviceId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Error updating device status:', error);
      throw error;
    }
  }

  // Add cash to device
  async addCashToDevice(
    deviceId: string, 
    amount: number, 
    reason?: string
  ): Promise<{ 
    success: boolean; 
    message: string; 
    data: { transaction: DeviceTransaction; new_balance: number } 
  }> {
    try {
      const response = await api.post(`/devices/${deviceId}/cash/add`, { amount, reason });
      return response.data;
    } catch (error) {
      console.error('Error adding cash to device:', error);
      throw error;
    }
  }

  // Withdraw cash from device
  async withdrawCashFromDevice(
    deviceId: string, 
    amount: number, 
    reason?: string
  ): Promise<{ 
    success: boolean; 
    message: string; 
    data: { transaction: DeviceTransaction; new_balance: number } 
  }> {
    try {
      const response = await api.post(`/devices/${deviceId}/cash/withdraw`, { amount, reason });
      return response.data;
    } catch (error) {
      console.error('Error withdrawing cash from device:', error);
      throw error;
    }
  }

  // Get device cash summary
  async getDeviceCashSummary(deviceId: string): Promise<{ 
    success: boolean; 
    data: { device_name: string; cash_summary: CashSummary } 
  }> {
    try {
      const response = await api.get(`/devices/${deviceId}/cash/summary`);
      return response.data;
    } catch (error) {
      console.error('Error fetching device cash summary:', error);
      throw error;
    }
  }

  // Get overall cash summary
  async getOverallCashSummary(): Promise<{ success: boolean; data: OverallCashSummary }> {
    try {
      const response = await api.get('/devices/cash/summary');
      return response.data;
    } catch (error) {
      console.error('Error fetching overall cash summary:', error);
      throw error;
    }
  }

  // Get device transactions
  async getDeviceTransactions(
    deviceId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<{ 
    success: boolean; 
    data: { transactions: DeviceTransaction[]; total: number; device_name: string } 
  }> {
    try {
      const response = await api.get(`/devices/${deviceId}/transactions`, {
        params: { limit, offset }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching device transactions:', error);
      throw error;
    }
  }

  // Search devices
  async searchDevices(query: string): Promise<{ 
    success: boolean; 
    data: { devices: Device[]; total_found: number } 
  }> {
    try {
      const response = await api.get('/devices/search', { params: { query } });
      return response.data;
    } catch (error) {
      console.error('Error searching devices:', error);
      throw error;
    }
  }

  // Get device statistics
  async getDeviceStatistics(): Promise<{ success: boolean; data: DeviceStatistics }> {
    try {
      const response = await api.get('/devices/statistics');
      return response.data;
    } catch (error) {
      console.error('Error fetching device statistics:', error);
      throw error;
    }
  }
}

export default new DevicesService(); 