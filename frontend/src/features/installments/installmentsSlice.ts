import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '@/app/store';
import installmentsService, {
  Installment,
  CreateInstallmentData,
  UpdateInstallmentData,
  PaymentData,
  InstallmentPlanData,
  InstallmentsFilters,
  InstallmentsResponse,
  InstallmentPlanResponse,
  InstallmentsStats
} from './installmentsService';
import { ApiError } from '@/lib/errorHandler';

interface InstallmentPlan {
  sale_id: number;
  invoice_no: string;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  total_installments: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  installments: Installment[];
  payment_status: 'paid' | 'unpaid' | 'partial';
  created_at: string;
}

interface InstallmentsState {
  items: (Installment | InstallmentPlan)[];
  selectedInstallment: Installment | null;
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null;
  planCreating: boolean;
  planError: string | null;
  // New state for optimized features
  stats: InstallmentsStats | null;
  overdueItems: Installment[];
  upcomingItems: Installment[];
  statsLoading: boolean;
  overdueLoading: boolean;
  upcomingLoading: boolean;
  cacheStats: {
    lastRefresh: string;
    cacheHits: number;
    cacheMisses: number;
  };
}

const initialState: InstallmentsState = {
  items: [],
  selectedInstallment: null,
  loading: false,
  error: null,
  pagination: null,
  planCreating: false,
  planError: null,
  stats: null,
  overdueItems: [],
  upcomingItems: [],
  statsLoading: false,
  overdueLoading: false,
  upcomingLoading: false,
  cacheStats: {
    lastRefresh: new Date().toISOString(),
    cacheHits: 0,
    cacheMisses: 0
  }
};

// Get all installments
export const getInstallments = createAsyncThunk(
  'installments/getInstallments',
  async (filters: InstallmentsFilters | undefined, { rejectWithValue }) => {
    try {
      const response = await installmentsService.getInstallments(filters);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message || 'Failed to fetch installments');
    }
  }
);

// Get installments grouped by sale (optimized)
export const getGroupedInstallments = createAsyncThunk(
  'installments/getGroupedInstallments',
  async (filters: InstallmentsFilters | undefined, { rejectWithValue }) => {
    try {
      const response = await installmentsService.getGroupedInstallments(filters);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message || 'Failed to fetch grouped installments');
    }
  }
);

// Get installments statistics
export const getInstallmentsStats = createAsyncThunk(
  'installments/getInstallmentsStats',
  async (filters: InstallmentsFilters | undefined, { rejectWithValue }) => {
    try {
      const response = await installmentsService.getInstallmentsStats(filters);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message || 'Failed to fetch installments statistics');
    }
  }
);

// Get overdue installments
export const getOverdueInstallments = createAsyncThunk(
  'installments/getOverdueInstallments',
  async (filters: InstallmentsFilters | undefined, { rejectWithValue }) => {
    try {
      const response = await installmentsService.getOverdueInstallments(filters);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message || 'Failed to fetch overdue installments');
    }
  }
);

// Get upcoming installments
export const getUpcomingInstallments = createAsyncThunk(
  'installments/getUpcomingInstallments',
  async (filters: InstallmentsFilters | undefined, { rejectWithValue }) => {
    try {
      const response = await installmentsService.getUpcomingInstallments(filters);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message || 'Failed to fetch upcoming installments');
    }
  }
);

// Get single installment
export const getInstallment = createAsyncThunk(
  'installments/getInstallment',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await installmentsService.getInstallment(id);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message || 'Failed to fetch installment');
    }
  }
);

// Create installment
export const createInstallment = createAsyncThunk(
  'installments/createInstallment',
  async (installmentData: CreateInstallmentData, { rejectWithValue }) => {
    try {
      const response = await installmentsService.createInstallment(installmentData);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message || 'Failed to create installment');
    }
  }
);

// Update installment
export const updateInstallment = createAsyncThunk(
  'installments/updateInstallment',
  async ({ id, installmentData }: { id: number; installmentData: UpdateInstallmentData }, { rejectWithValue }) => {
    try {
      const response = await installmentsService.updateInstallment(id, installmentData);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message || 'Failed to update installment');
    }
  }
);

// Delete installment
export const deleteInstallment = createAsyncThunk(
  'installments/deleteInstallment',
  async (id: number, { rejectWithValue }) => {
    try {
      await installmentsService.deleteInstallment(id);
      return id;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message || 'Failed to delete installment');
    }
  }
);

// Get installments by sale ID
export const getInstallmentsBySale = createAsyncThunk(
  'installments/getInstallmentsBySale',
  async (saleId: number, { rejectWithValue }) => {
    try {
      const response = await installmentsService.getInstallmentsBySale(saleId);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message || 'Failed to fetch sale installments');
    }
  }
);

// Get installments by customer ID
export const getInstallmentsByCustomer = createAsyncThunk(
  'installments/getInstallmentsByCustomer',
  async (customerId: number, { rejectWithValue }) => {
    try {
      const response = await installmentsService.getInstallmentsByCustomer(customerId);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message || 'Failed to fetch customer installments');
    }
  }
);

// Record payment
export const recordPayment = createAsyncThunk(
  'installments/recordPayment',
  async ({ id, paymentData }: { id: number; paymentData: PaymentData }, { rejectWithValue }) => {
    try {
      const response = await installmentsService.recordPayment(id, paymentData);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message || 'Failed to record payment');
    }
  }
);

// Create installment plan
export const createInstallmentPlan = createAsyncThunk(
  'installments/createInstallmentPlan',
  async (planData: InstallmentPlanData, { rejectWithValue }) => {
    try {
      const response = await installmentsService.createInstallmentPlan(planData);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message || 'Failed to create installment plan');
    }
  }
);

// Refresh cache
export const refreshCache = createAsyncThunk(
  'installments/refreshCache',
  async (_, { rejectWithValue }) => {
    try {
      await installmentsService.refreshCache();
      return { success: true };
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message || 'Failed to refresh cache');
    }
  }
);

const installmentsSlice = createSlice({
  name: 'installments',
  initialState,
  reducers: {
    clearSelectedInstallment: (state) => {
      state.selectedInstallment = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearPlanError: (state) => {
      state.planError = null;
    },
    updateCacheStats: (state, action: PayloadAction<{ hits: number; misses: number }>) => {
      state.cacheStats.cacheHits = action.payload.hits;
      state.cacheStats.cacheMisses = action.payload.misses;
      state.cacheStats.lastRefresh = new Date().toISOString();
    },
    clearCache: (state) => {
      installmentsService.clearCache();
      state.cacheStats.lastRefresh = new Date().toISOString();
    }
  },
  extraReducers: (builder) => {
    builder
      // Get all installments
      .addCase(getInstallments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getInstallments.fulfilled, (state, action: PayloadAction<InstallmentsResponse>) => {
        state.loading = false;
        state.items = action.payload.items;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          limit: action.payload.limit,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(getInstallments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get grouped installments
      .addCase(getGroupedInstallments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getGroupedInstallments.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        
        try {
          // Handle the server response format
          const responseData = action.payload;
          
          // Server returns: { success: true, message: '...', data: {...} }
          if (responseData && typeof responseData === 'object' && 'data' in responseData) {
            const data = responseData.data as any;
            if (data && Array.isArray(data.items)) {
              state.items = data.items;
              state.pagination = {
                total: data.total || 0,
                page: data.page || 1,
                limit: data.limit || 20,
                totalPages: data.totalPages || 1,
              };
            } else {
              state.items = [];
              state.pagination = null;
            }
          } else if (responseData && typeof responseData === 'object' && 'items' in responseData && Array.isArray((responseData as any).items)) {
            // Fallback for direct response format
            const directData = responseData as any;
            state.items = directData.items;
            state.pagination = {
              total: directData.total || 0,
              page: directData.page || 1,
              limit: directData.limit || 20,
              totalPages: directData.totalPages || 1,
            };
          } else if (responseData && typeof responseData === 'object' && 'installments' in responseData && Array.isArray((responseData as any).installments)) {
            // Handle grouped installments format: { installments: [...] }
            const groupedData = responseData as any;
            state.items = groupedData.installments;
            state.pagination = {
              total: groupedData.total || groupedData.installments.length || 0,
              page: groupedData.page || 1,
              limit: groupedData.limit || 20,
              totalPages: groupedData.totalPages || 1,
            };
          } else {
            state.items = [];
            state.pagination = null;
          }
        } catch (error) {
          state.items = [];
          state.pagination = null;
          state.error = 'Error processing installments data';
        }
      })
      .addCase(getGroupedInstallments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get installments statistics
      .addCase(getInstallmentsStats.pending, (state) => {
        state.statsLoading = true;
      })
      .addCase(getInstallmentsStats.fulfilled, (state, action: PayloadAction<InstallmentsStats>) => {
        state.statsLoading = false;
        state.stats = action.payload;
      })
      .addCase(getInstallmentsStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.error = action.payload as string;
      })
      // Get overdue installments
      .addCase(getOverdueInstallments.pending, (state) => {
        state.overdueLoading = true;
      })
      .addCase(getOverdueInstallments.fulfilled, (state, action: PayloadAction<InstallmentsResponse>) => {
        state.overdueLoading = false;
        state.overdueItems = action.payload.items;
      })
      .addCase(getOverdueInstallments.rejected, (state, action) => {
        state.overdueLoading = false;
        state.error = action.payload as string;
      })
      // Get upcoming installments
      .addCase(getUpcomingInstallments.pending, (state) => {
        state.upcomingLoading = true;
      })
      .addCase(getUpcomingInstallments.fulfilled, (state, action: PayloadAction<InstallmentsResponse>) => {
        state.upcomingLoading = false;
        state.upcomingItems = action.payload.items;
      })
      .addCase(getUpcomingInstallments.rejected, (state, action) => {
        state.upcomingLoading = false;
        state.error = action.payload as string;
      })
      // Get single installment
      .addCase(getInstallment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getInstallment.fulfilled, (state, action: PayloadAction<Installment>) => {
        state.loading = false;
        state.selectedInstallment = action.payload;
      })
      .addCase(getInstallment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create installment
      .addCase(createInstallment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createInstallment.fulfilled, (state, action: PayloadAction<Installment>) => {
        state.loading = false;
        state.items.push(action.payload);
      })
      .addCase(createInstallment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update installment
      .addCase(updateInstallment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateInstallment.fulfilled, (state, action: PayloadAction<Installment>) => {
        state.loading = false;
        const index = state.items.findIndex(i => 'id' in i && i.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedInstallment?.id === action.payload.id) {
          state.selectedInstallment = action.payload;
        }
      })
      .addCase(updateInstallment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete installment
      .addCase(deleteInstallment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteInstallment.fulfilled, (state, action: PayloadAction<number>) => {
        state.loading = false;
        state.items = state.items.filter(i => 'id' in i && i.id !== action.payload);
        if (state.selectedInstallment?.id === action.payload) {
          state.selectedInstallment = null;
        }
      })
      .addCase(deleteInstallment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get installments by sale
      .addCase(getInstallmentsBySale.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getInstallmentsBySale.fulfilled, (state, action: PayloadAction<Installment[]>) => {
        state.loading = false;
        // Update items with sale installments (you might want to handle this differently)
        state.items = action.payload;
      })
      .addCase(getInstallmentsBySale.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get installments by customer
      .addCase(getInstallmentsByCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getInstallmentsByCustomer.fulfilled, (state, action: PayloadAction<Installment[]>) => {
        state.loading = false;
        // Update items with customer installments (you might want to handle this differently)
        state.items = action.payload;
      })
      .addCase(getInstallmentsByCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Record payment
      .addCase(recordPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(recordPayment.fulfilled, (state, action: PayloadAction<{ installment: Installment; receipt: any }>) => {
        state.loading = false;
        const updatedInstallment = action.payload.installment;
        
        
        
        // Update installment in nested structure (InstallmentPlan.installments[])
        state.items = state.items.map(item => {
          // Check if this is an InstallmentPlan with installments array
          if ('installments' in item && Array.isArray(item.installments)) {
            const plan = item as InstallmentPlan;
            const updatedInstallments = plan.installments.map(inst => 
              inst.id === updatedInstallment.id ? updatedInstallment : inst
            );
            
            // Recalculate plan totals based on updated installments
            const totalPaid = updatedInstallments.reduce((sum, inst) => sum + (inst.paid_amount || 0), 0);
            const totalAmount = updatedInstallments.reduce((sum, inst) => sum + inst.amount, 0);
            const remainingAmount = totalAmount - totalPaid;
            
            // Determine plan payment status
            let paymentStatus: 'paid' | 'unpaid' | 'partial' = 'unpaid';
            if (totalPaid === 0) {
              paymentStatus = 'unpaid';
            } else if (totalPaid >= totalAmount) {
              paymentStatus = 'paid';
            } else {
              paymentStatus = 'partial';
            }
            
            return {
              ...plan,
              installments: updatedInstallments,
              paid_amount: totalPaid,
              remaining_amount: remainingAmount,
              payment_status: paymentStatus
            };
          }
          
          // Handle individual installment items (fallback)
          if ('id' in item && (item as Installment).id === updatedInstallment.id) {
            return updatedInstallment;
          }
          
          return item;
        });
        
        // Update selected installment if it matches
        if (state.selectedInstallment?.id === updatedInstallment.id) {
          state.selectedInstallment = updatedInstallment;
        }
      })
      .addCase(recordPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create installment plan
      .addCase(createInstallmentPlan.pending, (state) => {
        state.planCreating = true;
        state.planError = null;
      })
      .addCase(createInstallmentPlan.fulfilled, (state, action: PayloadAction<InstallmentPlanResponse>) => {
        state.planCreating = false;
        
        // Handle the response structure safely
        const response = action.payload;
        
        // The server returns { success: true, data: { plan: {...}, installments: [...] }, message: '...' }
        if (response.data?.installments && Array.isArray(response.data.installments)) {
          // Add the new installments to the state
          state.items = [...state.items, ...response.data.installments];
        } else if (response.installments && Array.isArray(response.installments)) {
          // Fallback for direct installments array
          state.items = [...state.items, ...response.installments];
        }
        // Note: We don't add the plan object to state.items as it's not the right type
      })
      .addCase(createInstallmentPlan.rejected, (state, action) => {
        state.planCreating = false;
        state.planError = action.payload as string;
      })
      // Refresh cache
      .addCase(refreshCache.pending, (state) => {
        // No loading state for cache refresh
      })
      .addCase(refreshCache.fulfilled, (state) => {
        state.cacheStats.lastRefresh = new Date().toISOString();
      })
      .addCase(refreshCache.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { 
  clearSelectedInstallment, 
  clearError, 
  clearPlanError, 
  updateCacheStats, 
  clearCache 
} = installmentsSlice.actions;

// Selectors
export const selectInstallments = (state: RootState) => state.installments.items;
export const selectSelectedInstallment = (state: RootState) => state.installments.selectedInstallment;
export const selectInstallmentsLoading = (state: RootState) => state.installments.loading;
export const selectInstallmentsError = (state: RootState) => state.installments.error;
export const selectInstallmentsPagination = (state: RootState) => state.installments.pagination;
export const selectPlanCreating = (state: RootState) => state.installments.planCreating;
export const selectPlanError = (state: RootState) => state.installments.planError;

// New selectors for optimized features
export const selectInstallmentsStats = (state: RootState) => state.installments.stats;
export const selectInstallmentsStatsLoading = (state: RootState) => state.installments.statsLoading;
export const selectOverdueInstallments = (state: RootState) => state.installments.overdueItems;
export const selectOverdueInstallmentsLoading = (state: RootState) => state.installments.overdueLoading;
export const selectUpcomingInstallments = (state: RootState) => state.installments.upcomingItems;
export const selectUpcomingInstallmentsLoading = (state: RootState) => state.installments.upcomingLoading;
export const selectCacheStats = (state: RootState) => state.installments.cacheStats;

export default installmentsSlice.reducer;
