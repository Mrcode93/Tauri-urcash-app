import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import suppliersService, { Supplier, CreateSupplierData, UpdateSupplierData } from './suppliersService';

interface SuppliersState {
  suppliers: Supplier[];
  selectedSupplier: Supplier | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  message: string;
}

const initialState: SuppliersState = {
  suppliers: [],
  selectedSupplier: null,
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: '',
};

// Get all suppliers
export const getSuppliers = createAsyncThunk(
  'suppliers/getAll',
  async (_, thunkAPI) => {
    try {
      const response = await suppliersService.getSuppliers();
      return response;
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'حدث خطأ أثناء جلب الموردين';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get single supplier
export const getSupplier = createAsyncThunk(
  'suppliers/getOne',
  async (id: number, thunkAPI) => {
    try {
      const response = await suppliersService.getSupplier(id);
      return response;
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'حدث خطأ أثناء جلب بيانات المورد';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Create supplier
export const createSupplier = createAsyncThunk(
  'suppliers/create',
  async (data: CreateSupplierData, thunkAPI) => {
    try {
      const response = await suppliersService.createSupplier(data);
      return response;
    } catch (error: any) {
      // Check if it's a validation error
      if (error?.response?.data?.errors) {
        return thunkAPI.rejectWithValue({
          type: 'validation',
          errors: error.response.data.errors
        });
      }
      const message = error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء المورد';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Update supplier
export const updateSupplier = createAsyncThunk(
  'suppliers/update',
  async ({ id, data }: { id: number; data: UpdateSupplierData }, thunkAPI) => {
    try {
      const response = await suppliersService.updateSupplier(id, data);
      return response;
    } catch (error: any) {
      // Check if it's a validation error
      if (error?.response?.data?.errors) {
        return thunkAPI.rejectWithValue({
          type: 'validation',
          errors: error.response.data.errors
        });
      }
      const message = error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث بيانات المورد';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Delete supplier
export const deleteSupplier = createAsyncThunk(
  'suppliers/delete',
  async (id: number, thunkAPI) => {
    try {
      await suppliersService.deleteSupplier(id);
      return id;
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'حدث خطأ أثناء حذف المورد';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Search suppliers
export const searchSuppliers = createAsyncThunk(
  'suppliers/search',
  async (query: string, thunkAPI) => {
    try {
      const response = await suppliersService.searchSuppliers(query);
      return response;
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'حدث خطأ أثناء البحث عن الموردين';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const suppliersSlice = createSlice({
  name: 'suppliers',
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
      // Ensure suppliers remains an array
      if (!Array.isArray(state.suppliers)) {
        state.suppliers = [];
      }
    },
    setSelectedSupplier: (state, action) => {
      state.selectedSupplier = action.payload;
    },
    clearError: (state) => {
      state.isError = false;
      state.message = '';
    },
  },
  extraReducers: (builder) => {
    builder
      // Get all suppliers
      .addCase(getSuppliers.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = '';
      })
      .addCase(getSuppliers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Ensure we always set an array
        state.suppliers = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(getSuppliers.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })
      // Get single supplier
      .addCase(getSupplier.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = '';
      })
      .addCase(getSupplier.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.selectedSupplier = action.payload;
      })
      .addCase(getSupplier.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })
      // Create supplier
      .addCase(createSupplier.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = '';
      })
      .addCase(createSupplier.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Ensure suppliers is an array before pushing
        if (!Array.isArray(state.suppliers)) {
          state.suppliers = [];
        }
        state.suppliers.push(action.payload);
      })
      .addCase(createSupplier.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        // Don't set message for validation errors, let component handle them
        if (typeof action.payload === 'string') {
          state.message = action.payload;
        } else if (action.payload && typeof action.payload === 'object' && 'type' in action.payload && action.payload.type === 'validation') {
          // Don't set message for validation errors
          state.message = '';
        } else {
          state.message = 'حدث خطأ أثناء إنشاء المورد';
        }
      })
      // Update supplier
      .addCase(updateSupplier.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = '';
      })
      .addCase(updateSupplier.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Ensure suppliers is an array before mapping
        if (!Array.isArray(state.suppliers)) {
          state.suppliers = [];
        }
        state.suppliers = state.suppliers.map((supplier) =>
          supplier.id === action.payload.id ? action.payload : supplier
        );
        state.selectedSupplier = action.payload;
      })
      .addCase(updateSupplier.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        // Don't set message for validation errors, let component handle them
        if (typeof action.payload === 'string') {
          state.message = action.payload;
        } else if (action.payload && typeof action.payload === 'object' && 'type' in action.payload && action.payload.type === 'validation') {
          // Don't set message for validation errors
          state.message = '';
        } else {
          state.message = 'حدث خطأ أثناء تحديث بيانات المورد';
        }
      })
      // Delete supplier
      .addCase(deleteSupplier.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = '';
      })
      .addCase(deleteSupplier.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Ensure suppliers is an array before filtering
        if (!Array.isArray(state.suppliers)) {
          state.suppliers = [];
        }
        state.suppliers = state.suppliers.filter((supplier) => supplier.id !== action.payload);
      })
      .addCase(deleteSupplier.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })
      // Search suppliers
      .addCase(searchSuppliers.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = '';
      })
      .addCase(searchSuppliers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Ensure we always set an array
        state.suppliers = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(searchSuppliers.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      });
  },
});

export const { reset, setSelectedSupplier, clearError } = suppliersSlice.actions;
export default suppliersSlice.reducer;
