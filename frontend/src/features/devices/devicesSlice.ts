import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import devicesService, { 
  Device, 
  DeviceStats, 
  CashSummary, 
  OverallCashSummary, 
  DeviceTransaction, 
  DeviceStatistics 
} from './devicesService';

// Async thunks
export const fetchAllDevices = createAsyncThunk(
  'devices/fetchAllDevices',
  async () => {
    const response = await devicesService.getAllDevices();
    return response;
  }
);

export const fetchDeviceById = createAsyncThunk(
  'devices/fetchDeviceById',
  async (deviceId: string) => {
    const response = await devicesService.getDeviceById(deviceId);
    return response;
  }
);

export const addDevice = createAsyncThunk(
  'devices/addDevice',
  async (deviceInfo: {
    name: string;
    ip_address?: string;
    mac_address?: string;
    device_type?: 'pos' | 'kiosk' | 'tablet' | 'desktop';
    max_cash_limit?: number;
    permissions?: string[];
    notes?: string;
  }) => {
    const response = await devicesService.addDevice(deviceInfo);
    return response;
  }
);

export const removeDevice = createAsyncThunk(
  'devices/removeDevice',
  async (deviceId: string) => {
    const response = await devicesService.removeDevice(deviceId);
    return { ...response, deviceId };
  }
);

export const updateDeviceStatus = createAsyncThunk(
  'devices/updateDeviceStatus',
  async ({ deviceId, status }: { deviceId: string; status: 'active' | 'inactive' | 'maintenance' }) => {
    const response = await devicesService.updateDeviceStatus(deviceId, status);
    return { ...response, deviceId };
  }
);

export const addCashToDevice = createAsyncThunk(
  'devices/addCashToDevice',
  async ({ deviceId, amount, reason }: { deviceId: string; amount: number; reason?: string }) => {
    const response = await devicesService.addCashToDevice(deviceId, amount, reason);
    return { ...response, deviceId };
  }
);

export const withdrawCashFromDevice = createAsyncThunk(
  'devices/withdrawCashFromDevice',
  async ({ deviceId, amount, reason }: { deviceId: string; amount: number; reason?: string }) => {
    const response = await devicesService.withdrawCashFromDevice(deviceId, amount, reason);
    return { ...response, deviceId };
  }
);

export const fetchDeviceCashSummary = createAsyncThunk(
  'devices/fetchDeviceCashSummary',
  async (deviceId: string) => {
    const response = await devicesService.getDeviceCashSummary(deviceId);
    return { ...response, deviceId };
  }
);

export const fetchOverallCashSummary = createAsyncThunk(
  'devices/fetchOverallCashSummary',
  async () => {
    const response = await devicesService.getOverallCashSummary();
    return response;
  }
);

export const fetchDeviceTransactions = createAsyncThunk(
  'devices/fetchDeviceTransactions',
  async ({ deviceId, limit, offset }: { deviceId: string; limit?: number; offset?: number }) => {
    const response = await devicesService.getDeviceTransactions(deviceId, limit, offset);
    return { ...response, deviceId };
  }
);

export const searchDevices = createAsyncThunk(
  'devices/searchDevices',
  async (query: string) => {
    const response = await devicesService.searchDevices(query);
    return response;
  }
);

export const fetchDeviceStatistics = createAsyncThunk(
  'devices/fetchDeviceStatistics',
  async () => {
    const response = await devicesService.getDeviceStatistics();
    return response;
  }
);

// State interface
interface DevicesState {
  devices: Device[];
  selectedDevice: Device | null;
  deviceStats: DeviceStats | null;
  overallCashSummary: OverallCashSummary | null;
  deviceStatistics: DeviceStatistics | null;
  searchResults: Device[];
  searchQuery: string;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  currentDeviceTransactions: {
    [deviceId: string]: {
      transactions: DeviceTransaction[];
      total: number;
      loading: boolean;
    };
  };
  currentDeviceCashSummary: {
    [deviceId: string]: {
      cash_summary: CashSummary | null;
      loading: boolean;
    };
  };
}

// Initial state
const initialState: DevicesState = {
  devices: [],
  selectedDevice: null,
  deviceStats: null,
  overallCashSummary: null,
  deviceStatistics: null,
  searchResults: [],
  searchQuery: '',
  loading: false,
  error: null,
  successMessage: null,
  currentDeviceTransactions: {},
  currentDeviceCashSummary: {},
};

// Slice
const devicesSlice = createSlice({
  name: 'devices',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccessMessage: (state) => {
      state.successMessage = null;
    },
    setSelectedDevice: (state, action: PayloadAction<Device | null>) => {
      state.selectedDevice = action.payload;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.searchQuery = '';
    },
    updateDeviceInList: (state, action: PayloadAction<Device>) => {
      const index = state.devices.findIndex(device => device.id === action.payload.id);
      if (index !== -1) {
        state.devices[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all devices
      .addCase(fetchAllDevices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllDevices.fulfilled, (state, action) => {
        state.loading = false;
        state.devices = action.payload.data;
        state.deviceStats = action.payload.stats;
      })
      .addCase(fetchAllDevices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'فشل في جلب الأجهزة';
      })

      // Fetch device by ID
      .addCase(fetchDeviceById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDeviceById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedDevice = action.payload.data;
      })
      .addCase(fetchDeviceById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'فشل في جلب الجهاز';
      })

      // Add device
      .addCase(addDevice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addDevice.fulfilled, (state, action) => {
        state.loading = false;
        state.devices.push(action.payload.data);
        state.successMessage = action.payload.message;
        state.deviceStats = {
          ...state.deviceStats!,
          total_devices: state.deviceStats!.total_devices + 1,
          active_devices: state.deviceStats!.active_devices + 1,
        };
      })
      .addCase(addDevice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'فشل في إضافة الجهاز';
      })

      // Remove device
      .addCase(removeDevice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeDevice.fulfilled, (state, action) => {
        state.loading = false;
        state.devices = state.devices.filter(device => device.id !== action.payload.deviceId);
        state.successMessage = action.payload.message;
        if (state.deviceStats) {
          state.deviceStats.total_devices = Math.max(0, state.deviceStats.total_devices - 1);
          state.deviceStats.active_devices = Math.max(0, state.deviceStats.active_devices - 1);
        }
      })
      .addCase(removeDevice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'فشل في حذف الجهاز';
      })

      // Update device status
      .addCase(updateDeviceStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateDeviceStatus.fulfilled, (state, action) => {
        state.loading = false;
        const updatedDevice = action.payload.data;
        const index = state.devices.findIndex(device => device.id === action.payload.deviceId);
        if (index !== -1) {
          state.devices[index] = updatedDevice;
        }
        if (state.selectedDevice?.id === action.payload.deviceId) {
          state.selectedDevice = updatedDevice;
        }
        state.successMessage = action.payload.message;
      })
      .addCase(updateDeviceStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'فشل في تحديث حالة الجهاز';
      })

      // Add cash to device
      .addCase(addCashToDevice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addCashToDevice.fulfilled, (state, action) => {
        state.loading = false;
        const { deviceId, data } = action.payload;
        const index = state.devices.findIndex(device => device.id === deviceId);
        if (index !== -1) {
          state.devices[index].cash_balance = data.new_balance;
        }
        if (state.selectedDevice?.id === deviceId) {
          state.selectedDevice.cash_balance = data.new_balance;
        }
        state.successMessage = action.payload.message;
      })
      .addCase(addCashToDevice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'فشل في إضافة النقود للجهاز';
      })

      // Withdraw cash from device
      .addCase(withdrawCashFromDevice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(withdrawCashFromDevice.fulfilled, (state, action) => {
        state.loading = false;
        const { deviceId, data } = action.payload;
        const index = state.devices.findIndex(device => device.id === deviceId);
        if (index !== -1) {
          state.devices[index].cash_balance = data.new_balance;
        }
        if (state.selectedDevice?.id === deviceId) {
          state.selectedDevice.cash_balance = data.new_balance;
        }
        state.successMessage = action.payload.message;
      })
      .addCase(withdrawCashFromDevice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'فشل في سحب النقود من الجهاز';
      })

      // Fetch device cash summary
      .addCase(fetchDeviceCashSummary.pending, (state, action) => {
        const deviceId = action.meta.arg;
        if (!state.currentDeviceCashSummary[deviceId]) {
          state.currentDeviceCashSummary[deviceId] = { cash_summary: null, loading: false };
        }
        state.currentDeviceCashSummary[deviceId].loading = true;
      })
      .addCase(fetchDeviceCashSummary.fulfilled, (state, action) => {
        const deviceId = action.payload.deviceId;
        state.currentDeviceCashSummary[deviceId] = {
          cash_summary: action.payload.data.cash_summary,
          loading: false,
        };
      })
      .addCase(fetchDeviceCashSummary.rejected, (state, action) => {
        const deviceId = action.meta.arg;
        if (state.currentDeviceCashSummary[deviceId]) {
          state.currentDeviceCashSummary[deviceId].loading = false;
        }
      })

      // Fetch overall cash summary
      .addCase(fetchOverallCashSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOverallCashSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.overallCashSummary = action.payload.data;
      })
      .addCase(fetchOverallCashSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'فشل في جلب ملخص النقود';
      })

      // Fetch device transactions
      .addCase(fetchDeviceTransactions.pending, (state, action) => {
        const deviceId = action.meta.arg.deviceId;
        if (!state.currentDeviceTransactions[deviceId]) {
          state.currentDeviceTransactions[deviceId] = { transactions: [], total: 0, loading: false };
        }
        state.currentDeviceTransactions[deviceId].loading = true;
      })
      .addCase(fetchDeviceTransactions.fulfilled, (state, action) => {
        const deviceId = action.payload.deviceId;
        state.currentDeviceTransactions[deviceId] = {
          transactions: action.payload.data.transactions,
          total: action.payload.data.total,
          loading: false,
        };
      })
      .addCase(fetchDeviceTransactions.rejected, (state, action) => {
        const deviceId = action.meta.arg.deviceId;
        if (state.currentDeviceTransactions[deviceId]) {
          state.currentDeviceTransactions[deviceId].loading = false;
        }
      })

      // Search devices
      .addCase(searchDevices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchDevices.fulfilled, (state, action) => {
        state.loading = false;
        state.searchResults = action.payload.data.devices;
        state.searchQuery = action.meta.arg;
      })
      .addCase(searchDevices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'فشل في البحث عن الأجهزة';
      })

      // Fetch device statistics
      .addCase(fetchDeviceStatistics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDeviceStatistics.fulfilled, (state, action) => {
        state.loading = false;
        state.deviceStatistics = action.payload.data;
      })
      .addCase(fetchDeviceStatistics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'فشل في جلب إحصائيات الأجهزة';
      });
  },
});

export const { 
  clearError, 
  clearSuccessMessage, 
  setSelectedDevice, 
  clearSearchResults,
  updateDeviceInList 
} = devicesSlice.actions;

export default devicesSlice.reducer; 