import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import purchasesService, { Purchase, CreatePurchaseData, UpdatePurchaseData, ReturnPurchaseData } from './purchasesService';

interface PurchasesState {
  purchases: Purchase[];
  selectedPurchase: Purchase | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  message: string;
  error: string | null;
}

const initialState: PurchasesState = {
  purchases: [],
  selectedPurchase: null,
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: '',
  error: null,
};

// Get all purchases
export const getPurchases = createAsyncThunk(
  'purchases/getAll',
  async (_, thunkAPI) => {
    try {
      return await purchasesService.getPurchases();
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get single purchase
export const getPurchase = createAsyncThunk(
  'purchases/getOne',
  async (id: number, thunkAPI) => {
    try {
      return await purchasesService.getPurchase(id);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Create purchase
export const createPurchase = createAsyncThunk(
  'purchases/create',
  async (purchaseData: CreatePurchaseData, thunkAPI) => {
    try {
      // Check if we're already creating a purchase
      const state = thunkAPI.getState() as { purchases: PurchasesState };
      if (state.purchases.isLoading) {
        throw new Error('Purchase creation already in progress');
      }
      
      return await purchasesService.createPurchase(purchaseData);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  },
  {
    // Prevent multiple simultaneous purchase creations
    condition: (_, { getState }) => {
      const state = getState() as { purchases: PurchasesState };
      if (state.purchases.isLoading) {
        return false; // Don't dispatch if already loading
      }
      return true;
    }
  }
);

// Update purchase
export const updatePurchase = createAsyncThunk(
  'purchases/update',
  async ({ id, data }: { id: number; data: UpdatePurchaseData }, thunkAPI) => {
    try {
      // Check if we're already updating a purchase
      const state = thunkAPI.getState() as { purchases: PurchasesState };
      if (state.purchases.isLoading) {
        throw new Error('Purchase update already in progress');
      }
      
      return await purchasesService.updatePurchase(id, data);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  },
  {
    // Prevent multiple simultaneous purchase updates
    condition: (_, { getState }) => {
      const state = getState() as { purchases: PurchasesState };
      if (state.purchases.isLoading) {
        return false; // Don't dispatch if already loading
      }
      return true;
    }
  }
);

// Delete purchase
export const deletePurchase = createAsyncThunk(
  'purchases/delete',
  async (id: number, thunkAPI) => {
    try {
      await purchasesService.deletePurchase(id);
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Return purchase
export const returnPurchase = createAsyncThunk(
  'purchases/return',
  async ({ id, returnData }: { id: number; returnData: ReturnPurchaseData }, thunkAPI) => {
    try {
      return await purchasesService.returnPurchase(id, returnData);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get purchase returns
export const getPurchaseReturns = createAsyncThunk(
  'purchases/getReturns',
  async (id: number, thunkAPI) => {
    try {
      return await purchasesService.getPurchaseReturns(id);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const purchasesSlice = createSlice({
  name: 'purchases',
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    setSelectedPurchase: (state, action) => {
      state.selectedPurchase = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get all purchases
      .addCase(getPurchases.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getPurchases.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.purchases = action.payload;
      })
      .addCase(getPurchases.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })
      // Get single purchase
      .addCase(getPurchase.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getPurchase.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.selectedPurchase = action.payload;
      })
      .addCase(getPurchase.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })
      // Create purchase
      .addCase(createPurchase.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createPurchase.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.purchases.push(action.payload);
      })
      .addCase(createPurchase.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })
      // Update purchase
      .addCase(updatePurchase.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updatePurchase.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.purchases = state.purchases.map((purchase) =>
          purchase.id === action.payload.id ? action.payload : purchase
        );
        if (state.selectedPurchase?.id === action.payload.id) {
          state.selectedPurchase = action.payload;
        }
      })
      .addCase(updatePurchase.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })
      // Delete purchase
      .addCase(deletePurchase.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deletePurchase.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.purchases = state.purchases.filter((purchase) => purchase.id !== action.payload);
        if (state.selectedPurchase?.id === action.payload) {
          state.selectedPurchase = null;
        }
      })
      .addCase(deletePurchase.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })
      // Return purchase
      .addCase(returnPurchase.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(returnPurchase.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Update the purchase status in the list
        const purchaseIndex = state.purchases.findIndex(p => p.id === action.payload.purchaseId);
        if (purchaseIndex !== -1) {
          state.purchases[purchaseIndex].status = action.payload.newPurchaseStatus;
        }
      })
      .addCase(returnPurchase.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })
      // Get purchase returns
      .addCase(getPurchaseReturns.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getPurchaseReturns.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
      })
      .addCase(getPurchaseReturns.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      });
  },
});

export const { reset, setSelectedPurchase } = purchasesSlice.actions;
export default purchasesSlice.reducer;
