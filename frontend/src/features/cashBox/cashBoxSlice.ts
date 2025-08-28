import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/lib/api';

// Types
export interface CashBox {
  id: number;
  user_id: number;
  name: string;
  initial_amount: number;
  current_amount: number;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at?: string;
  opened_by: number;
  closed_by?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
  username?: string;
  opened_by_name?: string;
  closed_by_name?: string;
}

export interface CashBoxTransaction {
  id: number;
  cash_box_id: number;
  user_id: number;
  transaction_type: 'opening' | 'closing' | 'deposit' | 'withdrawal' | 'sale' | 'purchase' | 'expense' | 'customer_receipt' | 'supplier_payment' | 'adjustment' | 'sale_return' | 'purchase_return';
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_type: 'sale' | 'purchase' | 'expense' | 'customer_receipt' | 'supplier_payment' | 'manual' | 'opening' | 'closing' | 'sale_return' | 'purchase_return' | 'debt' | 'installment';
  reference_id?: number;
  description?: string;
  notes?: string;
  created_at: string;
  user_name?: string;
}

export interface CashBoxSettings {
  id: number;
  user_id: number;
  default_opening_amount: number;
  require_opening_amount: boolean;
  require_closing_count: boolean;
  allow_negative_balance: boolean;
  max_withdrawal_amount: number;
  require_approval_for_withdrawal: boolean;
  auto_close_at_end_of_day: boolean;
  auto_close_time: string;
  created_at: string;
  updated_at: string;
}

export interface CashBoxSummary {
  hasOpenCashBox: boolean;
  cashBoxId?: number;
  currentAmount: number;
  openedAt?: string;
  todayTransactions: number;
  todayAmount: number;
}

export interface CashBoxReport {
  cashBox: CashBox;
  transactions: CashBoxTransaction[];
  summary: {
    totalDeposits: number;
    totalWithdrawals: number;
    totalTransactions: number;
    openingBalance: number;
    currentBalance: number;
    netChange: number;
  };
}

interface CashBoxState {
  currentCashBox: CashBox | null;
  cashBoxSettings: CashBoxSettings | null;
  cashBoxSummary: CashBoxSummary | null;
  cashBoxHistory: CashBox[];
  transactions: CashBoxTransaction[];
  openCashBoxes: CashBox[]; // For admin
  allUsersCashBoxHistory: CashBox[]; // For admin
  selectedCashBoxDetails: CashBox | null; // For admin cash box details
  loading: boolean;
  error: string | null;
  successMessage: string | null;
}

const initialState: CashBoxState = {
  currentCashBox: null,
  cashBoxSettings: null,
  cashBoxSummary: null,
  cashBoxHistory: [],
  transactions: [],
  openCashBoxes: [],
  allUsersCashBoxHistory: [],
  selectedCashBoxDetails: null,
  loading: false,
  error: null,
  successMessage: null,
};

// Async thunks
export const fetchUserCashBox = createAsyncThunk(
  'cashBox/fetchUserCashBox',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/cash-box/my-cash-box');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'فشل في جلب بيانات الصندوق');
    }
  }
);

export const fetchCashBoxSettings = createAsyncThunk(
  'cashBox/fetchCashBoxSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/cash-box/my-settings');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'فشل في جلب إعدادات الصندوق');
    }
  }
);

export const fetchCashBoxSummary = createAsyncThunk(
  'cashBox/fetchCashBoxSummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/cash-box/my-summary');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'فشل في جلب ملخص الصندوق');
    }
  }
);

export const openCashBox = createAsyncThunk(
  'cashBox/openCashBox',
  async ({ openingAmount, notes }: { openingAmount: number; notes?: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/cash-box/open', { openingAmount, notes });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'فشل في فتح الصندوق');
    }
  }
);

export const closeCashBox = createAsyncThunk(
  'cashBox/closeCashBox',
  async ({ closingAmount, notes }: { closingAmount: number; notes?: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/cash-box/close', { closingAmount, notes });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'فشل في إغلاق الصندوق');
    }
  }
);

export const transferToMoneyBox = createAsyncThunk(
  'cashBox/transferToMoneyBox',
  async ({ 
    cashBoxId, 
    amount, 
    targetType, 
    targetMoneyBox, 
    notes 
  }: {
    cashBoxId: number;
    amount: number;
    targetType: 'daily_money_box' | 'custom_money_box';
    targetMoneyBox?: string;
    notes?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await api.post('/cash-box/transfer-to-money-box', {
        cashBoxId,
        amount,
        targetType,
        targetMoneyBox,
        notes
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'فشل في التحويل إلى صندوق المال');
    }
  }
);

export const addManualTransaction = createAsyncThunk(
  'cashBox/addManualTransaction',
  async ({ 
    cashBoxId, 
    transactionType, 
    amount, 
    description, 
    notes 
  }: {
    cashBoxId: number;
    transactionType: 'deposit' | 'withdrawal' | 'adjustment';
    amount: number;
    description: string;
    notes?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await api.post('/cash-box/manual-transaction', {
        cashBoxId,
        transactionType,
        amount,
        description,
        notes
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'فشل في إضافة المعاملة');
    }
  }
);

export const fetchCashBoxTransactions = createAsyncThunk(
  'cashBox/fetchCashBoxTransactions',
  async ({ cashBoxId, limit = 50, offset = 0 }: { cashBoxId: number; limit?: number; offset?: number }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/cash-box/transactions/${cashBoxId}?limit=${limit}&offset=${offset}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'فشل في جلب المعاملات');
    }
  }
);

export const fetchCashBoxHistory = createAsyncThunk(
  'cashBox/fetchCashBoxHistory',
  async ({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get(`/cash-box/my-history?limit=${limit}&offset=${offset}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'فشل في جلب تاريخ الصندوق');
    }
  }
);

export const updateCashBoxSettings = createAsyncThunk(
  'cashBox/updateCashBoxSettings',
  async (settings: Partial<CashBoxSettings>, { rejectWithValue }) => {
    try {
      const response = await api.put('/cash-box/settings', settings);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'فشل في تحديث الإعدادات');
    }
  }
);

export const fetchAllOpenCashBoxes = createAsyncThunk(
  'cashBox/fetchAllOpenCashBoxes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/cash-box/admin/open-cash-boxes');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'فشل في جلب الصناديق المفتوحة');
    }
  }
);

export const forceCloseCashBox = createAsyncThunk(
  'cashBox/forceCloseCashBox',
  async ({ cashBoxId, reason, moneyBoxId }: { cashBoxId: number; reason?: string; moneyBoxId?: string }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/cash-box/admin/force-close/${cashBoxId}`, { reason, money_box_id: moneyBoxId });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'فشل في إغلاق الصندوق إجبارياً');
    }
  }
);

export const getCashBoxReport = createAsyncThunk(
  'cashBox/getCashBoxReport',
  async ({ cashBoxId, startDate, endDate }: { cashBoxId: number; startDate?: string; endDate?: string }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await api.get(`/cash-box/report/${cashBoxId}?${params.toString()}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'فشل في جلب تقرير الصندوق');
    }
  }
);

export const fetchCashBoxDetails = createAsyncThunk(
  'cashBox/fetchCashBoxDetails',
  async (cashBoxId: number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/cash-box/admin/cash-box/${cashBoxId}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'فشل في جلب تفاصيل الصندوق');
    }
  }
);

// Add admin: fetch all users' cash box history
export const fetchAllUsersCashBoxHistory = createAsyncThunk(
  'cashBox/fetchAllUsersCashBoxHistory',
  async ({ limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get(`/cash-box/admin/history?limit=${limit}&offset=${offset}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'فشل في جلب تاريخ جميع الصناديق');
    }
  }
);

// Slice
const cashBoxSlice = createSlice({
  name: 'cashBox',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccessMessage: (state) => {
      state.successMessage = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    updateCurrentCashBox: (state, action: PayloadAction<CashBox>) => {
      state.currentCashBox = action.payload;
    },
    addTransaction: (state, action: PayloadAction<CashBoxTransaction>) => {
      state.transactions.unshift(action.payload);
      if (state.currentCashBox) {
        state.currentCashBox.current_amount = action.payload.balance_after;
      }
    },
    clearSelectedCashBoxDetails: (state) => {
      state.selectedCashBoxDetails = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch user cash box
      .addCase(fetchUserCashBox.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserCashBox.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCashBox = action.payload;
      })
      .addCase(fetchUserCashBox.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch cash box settings
      .addCase(fetchCashBoxSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCashBoxSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.cashBoxSettings = action.payload;
      })
      .addCase(fetchCashBoxSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch cash box summary
      .addCase(fetchCashBoxSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCashBoxSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.cashBoxSummary = action.payload;
      })
      .addCase(fetchCashBoxSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Open cash box
      .addCase(openCashBox.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(openCashBox.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCashBox = action.payload;
        state.successMessage = 'تم فتح الصندوق بنجاح';
      })
      .addCase(openCashBox.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Close cash box
      .addCase(closeCashBox.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(closeCashBox.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCashBox = action.payload;
        state.successMessage = 'تم إغلاق الصندوق بنجاح';
      })
      .addCase(closeCashBox.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Transfer to money box
      .addCase(transferToMoneyBox.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(transferToMoneyBox.fulfilled, (state, action) => {
        state.loading = false;
        if (state.currentCashBox) {
          state.currentCashBox.current_amount = action.payload.cashBoxTransaction.balanceAfter;
        }
        state.successMessage = action.payload.message;
      })
      .addCase(transferToMoneyBox.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Add manual transaction
      .addCase(addManualTransaction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addManualTransaction.fulfilled, (state, action) => {
        state.loading = false;
        if (state.currentCashBox) {
          state.currentCashBox.current_amount = action.payload.balanceAfter;
        }
        state.successMessage = 'تم إضافة المعاملة بنجاح';
      })
      .addCase(addManualTransaction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch transactions
      .addCase(fetchCashBoxTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCashBoxTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = action.payload;
      })
      .addCase(fetchCashBoxTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch history
      .addCase(fetchCashBoxHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCashBoxHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.cashBoxHistory = action.payload;
      })
      .addCase(fetchCashBoxHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Update settings
      .addCase(updateCashBoxSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCashBoxSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.cashBoxSettings = action.payload;
        state.successMessage = 'تم تحديث الإعدادات بنجاح';
      })
      .addCase(updateCashBoxSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch all open cash boxes
      .addCase(fetchAllOpenCashBoxes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllOpenCashBoxes.fulfilled, (state, action) => {
        state.loading = false;
        state.openCashBoxes = action.payload;
      })
      .addCase(fetchAllOpenCashBoxes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Force close cash box
      .addCase(forceCloseCashBox.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forceCloseCashBox.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = 'تم إغلاق الصندوق إجبارياً بنجاح';
        // Remove from open cash boxes - handle both object and id cases
        const closedBoxId = typeof action.payload === 'object' ? action.payload.id : action.payload;
        const beforeCount = state.openCashBoxes.length;
        state.openCashBoxes = state.openCashBoxes.filter(box => box.id !== closedBoxId);
        const afterCount = state.openCashBoxes.length;
        console.log(`Cash box closed: ${closedBoxId}, open boxes: ${beforeCount} -> ${afterCount}`);
      })
      .addCase(forceCloseCashBox.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch all users cash box history (admin)
      .addCase(fetchAllUsersCashBoxHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllUsersCashBoxHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.allUsersCashBoxHistory = action.payload;
      })
      .addCase(fetchAllUsersCashBoxHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch cash box details
      .addCase(fetchCashBoxDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCashBoxDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedCashBoxDetails = action.payload;
      })
      .addCase(fetchCashBoxDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  clearError, 
  clearSuccessMessage, 
  setLoading, 
  updateCurrentCashBox, 
  addTransaction,
  clearSelectedCashBoxDetails
} = cashBoxSlice.actions;

export default cashBoxSlice.reducer; 