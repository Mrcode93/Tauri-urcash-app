import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as salesService from './salesService';
import type { Sale, SaleData, CreateSaleData, UpdateSaleData, ReturnSaleData } from './salesService';

interface SalesState {
  items: SaleData[];
  selectedSale: Sale | null;
  loading: boolean;
  error: string | null;
}

const initialState: SalesState = {
  items: [],
  selectedSale: null,
  loading: false,
  error: null
};

// Enhanced error handling for async thunks
const handleAsyncError = (error: any, defaultMessage: string): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return defaultMessage;
};

// Async thunks
export const getSales = createAsyncThunk(
  'sales/getSales',
  async (filters: any = {}, { rejectWithValue }) => {
    try {
      const response = await salesService.getSales(filters);
      return response.data;
    } catch (error: any) {
      const errorMessage = handleAsyncError(error, 'فشل في جلب المبيعات');
      return rejectWithValue(errorMessage);
    }
  }
);

export const getSale = createAsyncThunk(
  'sales/getSale',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await salesService.getSale(id);
      // The service returns { success: true, message: string, data: SaleData }
      // We need to return the actual sale data
      return response.data as SaleData;
    } catch (error: any) {
      const errorMessage = handleAsyncError(error, 'فشل في جلب المبيعة');
      return rejectWithValue(errorMessage);
    }
  }
);

export const createSale = createAsyncThunk(
  'sales/createSale',
  async (data: CreateSaleData, { rejectWithValue, getState }) => {
    try {
      const response = await salesService.createSale(data);
      return response.data;
    } catch (error: any) {
      const errorMessage = handleAsyncError(error, 'فشل في إنشاء المبيعة');
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateSale = createAsyncThunk(
  'sales/updateSale',
  async ({ id, data }: { id: number; data: UpdateSaleData }, { rejectWithValue }) => {
    try {
      const response = await salesService.updateSale(id, data);
      return response.data;
    } catch (error: any) {
      const errorMessage = handleAsyncError(error, 'فشل في تحديث المبيعة');
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteSale = createAsyncThunk(
  'sales/deleteSale',
  async (id: number, { rejectWithValue }) => {
    try {
      await salesService.deleteSale(id);
      return id;
    } catch (error: any) {
      const errorMessage = handleAsyncError(error, 'فشل في حذف المبيعة');
      return rejectWithValue(errorMessage);
    }
  }
);

export const returnSale = createAsyncThunk(
  'sales/returnSale',
  async ({ id, returnData }: { id: number; returnData: ReturnSaleData }, { rejectWithValue }) => {
    try {
      const response = await salesService.returnSale(id, returnData);
      return response.data;
    } catch (error: any) {
      const errorMessage = handleAsyncError(error, 'فشل في إرجاع المبيعة');
      return rejectWithValue(errorMessage);
    }
  }
);

const salesSlice = createSlice({
  name: 'sales',
  initialState,
  reducers: {
    clearSelectedSale: (state) => {
      state.selectedSale = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // getSales
      .addCase(getSales.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSales.fulfilled, (state, action: PayloadAction<SaleData[]>) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(getSales.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // getSale
      .addCase(getSale.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSale.fulfilled, (state, action: PayloadAction<SaleData>) => {
        state.loading = false;
        state.selectedSale = action.payload as unknown as Sale;
      })
      .addCase(getSale.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // createSale
      .addCase(createSale.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSale.fulfilled, (state, action: PayloadAction<Sale>) => {
        state.loading = false;
        state.items.push(action.payload as unknown as SaleData);
      })
      .addCase(createSale.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // updateSale
      .addCase(updateSale.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSale.fulfilled, (state, action: PayloadAction<Sale>) => {
        state.loading = false;
        const index = state.items.findIndex(sale => sale.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload as unknown as SaleData;
        }
        if (state.selectedSale?.id === action.payload.id) {
          state.selectedSale = action.payload;
        }
      })
      .addCase(updateSale.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // deleteSale
      .addCase(deleteSale.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSale.fulfilled, (state, action: PayloadAction<number>) => {
        state.loading = false;
        state.items = state.items.filter(sale => sale.id !== action.payload);
        if (state.selectedSale?.id === action.payload) {
          state.selectedSale = null;
        }
      })
      .addCase(deleteSale.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // returnSale
      .addCase(returnSale.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(returnSale.fulfilled, (state, action: PayloadAction<Sale>) => {
        state.loading = false;
        const index = state.items.findIndex(sale => sale.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload as unknown as SaleData;
        }
        if (state.selectedSale?.id === action.payload.id) {
          state.selectedSale = action.payload;
        }
      })
      .addCase(returnSale.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export const { clearSelectedSale, clearError } = salesSlice.actions;

// Selectors
export const selectSales = (state: { sales: SalesState }) => state.sales.items;
export const selectSelectedSale = (state: { sales: SalesState }) => state.sales.selectedSale;
export const selectSalesLoading = (state: { sales: SalesState }) => state.sales.loading;
export const selectSalesError = (state: { sales: SalesState }) => state.sales.error;

export default salesSlice.reducer;
