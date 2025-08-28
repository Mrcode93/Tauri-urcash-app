import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getDebts } from '../debts/debtsSlice';
import { getDebtStats } from '../debts/debtsSlice';
import { getCustomers } from '../customers/customersSlice';
import { getProducts } from '../inventory/inventorySlice';
import { getSales } from '../sales/salesSlice';
import { getSuppliers } from '../suppliers/suppliersSlice';
import { fetchSettings } from '../settings/settingsSlice';
import { AppDispatch, RootState } from '@/app/store';
import apiService from '@/lib/apiService';

export const initializeApp = createAsyncThunk<
  boolean,
  void,
  { dispatch: AppDispatch; state: RootState }
>(
  'app/initialize',
  async (_, { dispatch }) => {
    try {
      // Load settings first as they are critical for app functionality
      await dispatch(fetchSettings()).unwrap();
      
      // Load minimal essential data for initial app startup with caching
      await Promise.all([
        dispatch(getCustomers({ limit: 100 })),
        // Don't load products initially - they will be loaded on demand in POS
      ]);
      
      // Load other data in background after initial load with optimized caching
      setTimeout(() => {
        Promise.all([
          dispatch(getSuppliers()),
          dispatch(getSales({})), // Fixed: Added empty filters object
          dispatch(getDebts({})),
          dispatch(getDebtStats({}))
        ]).catch(error => {
          console.warn('Background data loading failed:', error);
        });
      }, 1000); // Reduced delay for faster loading
      
      return true;
    } catch (error) {
      console.error('Error initializing app:', error);
      throw error;
    }
  }
);

interface AppState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AppState = {
  isInitialized: false,
  isLoading: false,
  error: null
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    resetApp: (state) => {
      state.isInitialized = false;
      state.isLoading = false;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeApp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initializeApp.fulfilled, (state) => {
        state.isLoading = false;
        state.isInitialized = true;
      })
      .addCase(initializeApp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to initialize app';
      });
  }
});

export const { resetApp } = appSlice.actions;
export default appSlice.reducer; 