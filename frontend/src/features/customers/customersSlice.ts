import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '@/app/store';
import customersService, { Customer } from './customersService';
import { ApiError } from '@/lib/errorHandler';
import { ListState, SingleItemState } from '@/lib/types';

interface CustomersState {
  items: Customer[];
  selectedCustomer: Customer | null;
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  } | null;
}

const initialState: CustomersState = {
  items: [],
  selectedCustomer: null,
  loading: false,
  error: null,
  pagination: null,
};

// Get all customers
export const getCustomers = createAsyncThunk(
  'customers/getCustomers',
  async (params: {
    page?: number;
    limit?: number;
    search?: string;
    exclude_anonymous?: boolean;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await customersService.getCustomers(params);
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'حدث خطأ أثناء جلب العملاء';
      return rejectWithValue(message);
    }
  }
);

// Get single customer
export const getCustomer = createAsyncThunk(
  'customers/getCustomer',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await customersService.getCustomer(id);
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'حدث خطأ أثناء جلب بيانات العميل';
      return rejectWithValue(message);
    }
  }
);

// Create customer
export const createCustomer = createAsyncThunk(
  'customers/createCustomer',
  async (customerData: Omit<Customer, 'id'>, { rejectWithValue }) => {
    try {
      const response = await customersService.createCustomer(customerData);
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء العميل';
      return rejectWithValue(message);
    }
  }
);

// Update customer
export const updateCustomer = createAsyncThunk(
  'customers/updateCustomer',
  async ({ id, customerData }: { id: number; customerData: Partial<Customer> }, { rejectWithValue }) => {
    try {
      const response = await customersService.updateCustomer(id, customerData);
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث بيانات العميل';
      return rejectWithValue(message);
    }
  }
);

// Delete customer
export const deleteCustomer = createAsyncThunk(
  'customers/deleteCustomer',
  async (id: number, { rejectWithValue }) => {
    try {
      await customersService.deleteCustomer(id);
      return id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'حدث خطأ أثناء حذف العميل';
      return rejectWithValue(message);
    }
  }
);

const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    clearSelectedCustomer: (state) => {
      state.selectedCustomer = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get all customers
      .addCase(getCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          limit: action.payload.limit,
          totalPages: action.payload.totalPages,
          hasMore: action.payload.hasMore
        };
      })
      .addCase(getCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get single customer
      .addCase(getCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedCustomer = action.payload;
      })
      .addCase(getCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create customer
      .addCase(createCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update customer
      .addCase(updateCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedCustomer?.id === action.payload.id) {
          state.selectedCustomer = action.payload;
        }
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete customer
      .addCase(deleteCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter(c => c.id !== action.payload);
        if (state.selectedCustomer?.id === action.payload) {
          state.selectedCustomer = null;
        }
      })
      .addCase(deleteCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearSelectedCustomer, clearError } = customersSlice.actions;

export const selectCustomers = (state: RootState) => state.customers;

export default customersSlice.reducer;
