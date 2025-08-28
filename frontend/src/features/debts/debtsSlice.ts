import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '@/app/store';
import debtsService, { DebtData, CreateDebtData, UpdateDebtData, DebtStats, RepayDebtData } from './debtsService';
import { ApiError } from '@/lib/errorHandler';
import { ListState } from '@/lib/types';

export interface DebtsState extends ListState<DebtData> {
  selectedDebt: DebtData | null;
  stats: DebtStats | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  } | null;
}

const initialState: DebtsState = {
  items: [],
  selectedDebt: null,
  stats: null,
  pagination: null,
  loading: false,
  error: null,
};

// Get all debts
export const getDebts = createAsyncThunk<
  { debts: DebtData[]; pagination: any },
  { page?: number; limit?: number; search?: string; status?: string; customer_id?: number },
  { rejectValue: string }
>(
  'debts/getDebts',
  async (params, { rejectWithValue }) => {
    try {
      const response = await debtsService.getDebts(params);
      return {
        debts: response.data || [],
        pagination: response.pagination
      };
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message);
    }
  }
);

// Get debt statistics
export const getDebtStats = createAsyncThunk<
  DebtStats,
  { customer_id?: number },
  { rejectValue: string }
>(
  'debts/getDebtStats',
  async (params, { rejectWithValue }) => {
    try {
      const response = await debtsService.getDebtStats(params);
      return response.data;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message);
    }
  }
);

// Get debts by customer
export const getDebtsByCustomer = createAsyncThunk<DebtData[], number, { rejectValue: string }>(
  'debts/getDebtsByCustomer',
  async (customerId, { rejectWithValue }) => {
    try {
      const response = await debtsService.getDebtsByCustomer(customerId);
      return response.data;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message);
    }
  }
);

// Get single debt
export const getDebt = createAsyncThunk<DebtData, number, { rejectValue: string }>(
  'debts/getDebt',
  async (id, { rejectWithValue }) => {
    try {
      const response = await debtsService.getDebt(id);
      return response.data;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message);
    }
  }
);

// Create debt
export const createDebt = createAsyncThunk<DebtData, CreateDebtData, { rejectValue: string }>(
  'debts/createDebt',
  async (debtData, { rejectWithValue }) => {
    try {
      const response = await debtsService.createDebt(debtData);
      return response.data;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message);
    }
  }
);

// Update debt
export const updateDebt = createAsyncThunk<DebtData, { id: number; data: UpdateDebtData }, { rejectValue: string }>(
  'debts/updateDebt',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await debtsService.updateDebt(id, data);
      return response.data;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message);
    }
  }
);

// Delete debt
export const deleteDebt = createAsyncThunk<void, number, { rejectValue: string }>(
  'debts/deleteDebt',
  async (id, { rejectWithValue }) => {
    try {
      await debtsService.deleteDebt(id);
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message);
    }
  }
);

// Repay debt
export const repayDebt = createAsyncThunk<{ 
  debt: DebtData; 
  receipt: any; 
  appliedPayments?: Array<{ debt_id: number; amount: number; invoice_no: string }>;
  excessAmount?: number;
  totalPaid: number;
}, { id: number; repayData: RepayDebtData }, { rejectValue: string }>(
  'debts/repayDebt',
  async ({ id, repayData }, { rejectWithValue }) => {
    try {
      const response = await debtsService.repayDebt(id, repayData);
      return response.data;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message);
    }
  }
);

const debtsSlice = createSlice({
  name: 'debts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedDebt: (state, action: PayloadAction<DebtData | null>) => {
      state.selectedDebt = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get all debts
      .addCase(getDebts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDebts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.debts;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(getDebts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch debts';
      })
      // Get debt statistics
      .addCase(getDebtStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDebtStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
        state.error = null;
      })
      .addCase(getDebtStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch debt statistics';
      })
      // Get debts by customer
      .addCase(getDebtsByCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDebtsByCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.error = null;
      })
      .addCase(getDebtsByCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch customer debts';
      })
      // Get single debt
      .addCase(getDebt.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDebt.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedDebt = action.payload;
        state.error = null;
      })
      .addCase(getDebt.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch debt';
      })
      // Create debt
      .addCase(createDebt.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDebt.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
        state.error = null;
      })
      .addCase(createDebt.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to create debt';
      })
      // Update debt
      .addCase(updateDebt.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateDebt.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(debt => debt.sale_id === action.payload.sale_id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedDebt?.sale_id === action.payload.sale_id) {
          state.selectedDebt = action.payload;
        }
        state.error = null;
      })
      .addCase(updateDebt.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to update debt';
      })
      // Delete debt
      .addCase(deleteDebt.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteDebt.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter(debt => debt.sale_id !== action.meta.arg);
        if (state.selectedDebt?.sale_id === action.meta.arg) {
          state.selectedDebt = null;
        }
        state.error = null;
      })
      .addCase(deleteDebt.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to delete debt';
      })
      // Repay debt
      .addCase(repayDebt.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(repayDebt.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(debt => debt.sale_id === action.payload.debt.sale_id);
        if (index !== -1) {
          state.items[index] = action.payload.debt;
        }
        if (state.selectedDebt?.sale_id === action.payload.debt.sale_id) {
          state.selectedDebt = action.payload.debt;
        }
        state.error = null;
      })
      .addCase(repayDebt.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to repay debt';
      });
  },
});

export const { clearError, setSelectedDebt } = debtsSlice.actions;

export const selectDebts = (state: RootState) => state.debts;

export default debtsSlice.reducer; 