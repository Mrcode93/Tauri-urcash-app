import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { toast } from '@/lib/toast';
import {
  getAllDelegates,
  createDelegate,
  updateDelegate,
  deleteDelegate,
  getDelegateSales,
  createDelegateSale,
  getDelegateCollections,
  createDelegateCollection,
  calculateDelegateCommission,
  createCommissionPayment,
  generatePerformanceReport,
  getPerformanceReports,
  getDelegateDashboard,
  getCustomersForDropdown,
  getDelegatesByCustomerId,
  bulkGeneratePerformanceReports,
  getDelegateAnalytics,
  type Delegate,
  type CreateDelegateData,
  type UpdateDelegateData,
  type DelegatesResponse,
  type DelegateSale,
  type CreateDelegateSaleData,
  type DelegateSalesResponse,
  type DelegateCollection,
  type CreateDelegateCollectionData,
  type DelegateCollectionsResponse,
  type DelegateCommission,
  type CreateCommissionPaymentData,
  type DelegatePerformanceReport,
  type CreatePerformanceReportData,
  type PerformanceReportsResponse,
  type DelegateDashboard,
  type DelegateAnalytics,
  type Customer
} from './delegatesService';

// ===== STATE INTERFACES =====

interface DelegatesState {
  // Basic delegate management
  delegates: Delegate[];
  customers: Customer[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  searchTerm: string;
  selectedCustomerId: number | null;

  // Delegate sales
  sales: DelegateSale[];
  salesLoading: boolean;
  salesPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  // Delegate collections
  collections: DelegateCollection[];
  collectionsLoading: boolean;
  collectionsPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  // Delegate commission
  commission: DelegateCommission | null;
  commissionLoading: boolean;

  // Performance reports
  performanceReports: DelegatePerformanceReport[];
  performanceReportsLoading: boolean;
  performanceReportsPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  // Dashboard
  dashboard: DelegateDashboard | null;
  dashboardLoading: boolean;

  // Analytics
  analytics: DelegateAnalytics | null;
  analyticsLoading: boolean;

  // Selected delegate
  selectedDelegateId: number | null;
}

const initialState: DelegatesState = {
  // Basic delegate management
  delegates: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  },
  searchTerm: '',

  // Delegate sales
  sales: [],
  salesLoading: false,
  salesPagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  },

  // Delegate collections
  collections: [],
  collectionsLoading: false,
  collectionsPagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  },

  // Delegate commission
  commission: null,
  commissionLoading: false,

  // Performance reports
  performanceReports: [],
  performanceReportsLoading: false,
  performanceReportsPagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  },

  // Dashboard
  dashboard: null,
  dashboardLoading: false,

  // Analytics
  analytics: null,
  analyticsLoading: false,

  // Selected delegate
  selectedDelegateId: null,
};

// ===== ASYNC THUNKS =====

// ===== BASIC DELEGATE MANAGEMENT =====

export const fetchDelegates = createAsyncThunk(
  'delegates/fetchDelegates',
  async (params: { page?: number; limit?: number; search?: string }, { rejectWithValue }) => {
    try {
      const response = await getAllDelegates(
        params.page || 1,
        params.limit || 50,
        params.search || ''
      );
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch delegates');
    }
  }
);

export const addDelegate = createAsyncThunk(
  'delegates/addDelegate',
  async (data: CreateDelegateData, { rejectWithValue }) => {
    try {
      const response = await createDelegate(data);
      toast.success('تم إضافة المندوب بنجاح');
      return response;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في إضافة المندوب');
      return rejectWithValue(error.response?.data?.message || 'Failed to add delegate');
    }
  }
);

export const editDelegate = createAsyncThunk(
  'delegates/editDelegate',
  async ({ id, data }: { id: number; data: UpdateDelegateData }, { rejectWithValue }) => {
    try {
      const response = await updateDelegate(id, data);
      toast.success('تم تحديث المندوب بنجاح');
      return { id, data };
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في تحديث المندوب');
      return rejectWithValue(error.response?.data?.message || 'Failed to update delegate');
    }
  }
);

export const removeDelegate = createAsyncThunk(
  'delegates/removeDelegate',
  async (id: number, { rejectWithValue }) => {
    try {
      await deleteDelegate(id);
      toast.success('تم حذف المندوب بنجاح');
      return id;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في حذف المندوب');
      return rejectWithValue(error.response?.data?.message || 'Failed to delete delegate');
    }
  }
);

// ===== DELEGATE SALES =====

export const fetchDelegateSales = createAsyncThunk(
  'delegates/fetchDelegateSales',
  async ({ delegateId, page = 1, limit = 50 }: { delegateId: number; page?: number; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await getDelegateSales(delegateId, page, limit);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch delegate sales');
    }
  }
);

export const addDelegateSale = createAsyncThunk(
  'delegates/addDelegateSale',
  async ({ delegateId, data }: { delegateId: number; data: CreateDelegateSaleData }, { rejectWithValue }) => {
    try {
      const response = await createDelegateSale(delegateId, data);
      toast.success('تم إضافة مبيعات المندوب بنجاح');
      return response;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في إضافة مبيعات المندوب');
      return rejectWithValue(error.response?.data?.message || 'Failed to add delegate sale');
    }
  }
);

// ===== DELEGATE COLLECTIONS =====

export const fetchDelegateCollections = createAsyncThunk(
  'delegates/fetchDelegateCollections',
  async ({ delegateId, page = 1, limit = 50 }: { delegateId: number; page?: number; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await getDelegateCollections(delegateId, page, limit);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch delegate collections');
    }
  }
);

export const addDelegateCollection = createAsyncThunk(
  'delegates/addDelegateCollection',
  async ({ delegateId, data }: { delegateId: number; data: CreateDelegateCollectionData }, { rejectWithValue }) => {
    try {
      const response = await createDelegateCollection(delegateId, data);
      toast.success('تم إضافة تحصيل المندوب بنجاح');
      return response;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في إضافة تحصيل المندوب');
      return rejectWithValue(error.response?.data?.message || 'Failed to add delegate collection');
    }
  }
);

// ===== DELEGATE COMMISSION =====

export const fetchDelegateCommission = createAsyncThunk(
  'delegates/fetchDelegateCommission',
  async ({ delegateId, periodStart, periodEnd }: { delegateId: number; periodStart: string; periodEnd: string }, { rejectWithValue }) => {
    try {
      const response = await calculateDelegateCommission(delegateId, periodStart, periodEnd);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to calculate delegate commission');
    }
  }
);

export const addCommissionPayment = createAsyncThunk(
  'delegates/addCommissionPayment',
  async ({ delegateId, data }: { delegateId: number; data: CreateCommissionPaymentData }, { rejectWithValue }) => {
    try {
      const response = await createCommissionPayment(delegateId, data);
      toast.success('تم إضافة دفعة العمولة بنجاح');
      return response;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في إضافة دفعة العمولة');
      return rejectWithValue(error.response?.data?.message || 'Failed to add commission payment');
    }
  }
);

// ===== PERFORMANCE REPORTS =====

export const fetchPerformanceReports = createAsyncThunk(
  'delegates/fetchPerformanceReports',
  async ({ delegateId, page = 1, limit = 50 }: { delegateId: number; page?: number; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await getPerformanceReports(delegateId, page, limit);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch performance reports');
    }
  }
);

export const addPerformanceReport = createAsyncThunk(
  'delegates/addPerformanceReport',
  async ({ delegateId, data }: { delegateId: number; data: CreatePerformanceReportData }, { rejectWithValue }) => {
    try {
      const response = await generatePerformanceReport(delegateId, data);
      toast.success('تم إنشاء تقرير الأداء بنجاح');
      return response;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في إنشاء تقرير الأداء');
      return rejectWithValue(error.response?.data?.message || 'Failed to generate performance report');
    }
  }
);

// ===== DASHBOARD =====

export const fetchDelegateDashboard = createAsyncThunk(
  'delegates/fetchDelegateDashboard',
  async (delegateId: number, { rejectWithValue }) => {
    try {
      const response = await getDelegateDashboard(delegateId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch delegate dashboard');
    }
  }
);

// ===== CUSTOMER ASSIGNMENTS =====

export const fetchCustomers = createAsyncThunk(
  'delegates/fetchCustomers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getCustomersForDropdown();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch customers');
    }
  }
);

export const fetchDelegatesByCustomer = createAsyncThunk(
  'delegates/fetchDelegatesByCustomer',
  async (customerId: number, { rejectWithValue }) => {
    try {
      const response = await getDelegatesByCustomerId(customerId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch delegates by customer');
    }
  }
);

// ===== BULK OPERATIONS =====

export const bulkGenerateReports = createAsyncThunk(
  'delegates/bulkGenerateReports',
  async (data: CreatePerformanceReportData, { rejectWithValue }) => {
    try {
      const response = await bulkGeneratePerformanceReports(data);
      toast.success('تم إنشاء التقارير بنجاح');
      return response;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في إنشاء التقارير');
      return rejectWithValue(error.response?.data?.message || 'Failed to generate reports');
    }
  }
);

// ===== ANALYTICS =====

export const fetchDelegateAnalytics = createAsyncThunk(
  'delegates/fetchDelegateAnalytics',
  async ({ periodStart, periodEnd }: { periodStart: string; periodEnd: string }, { rejectWithValue }) => {
    try {
      const response = await getDelegateAnalytics(periodStart, periodEnd);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch delegate analytics');
    }
  }
);

// ===== SLICE =====

const delegatesSlice = createSlice({
  name: 'delegates',
  initialState,
  reducers: {
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
    setSelectedCustomerId: (state, action: PayloadAction<number | null>) => {
      state.selectedCustomerId = action.payload;
    },
    setSelectedDelegateId: (state, action: PayloadAction<number | null>) => {
      state.selectedDelegateId = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearSales: (state) => {
      state.sales = [];
      state.salesPagination = initialState.salesPagination;
    },
    clearCollections: (state) => {
      state.collections = [];
      state.collectionsPagination = initialState.collectionsPagination;
    },
    clearCommission: (state) => {
      state.commission = null;
    },
    clearPerformanceReports: (state) => {
      state.performanceReports = [];
      state.performanceReportsPagination = initialState.performanceReportsPagination;
    },
    clearDashboard: (state) => {
      state.dashboard = null;
    },
    clearAnalytics: (state) => {
      state.analytics = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ===== BASIC DELEGATE MANAGEMENT =====
      
      // Fetch delegates
      .addCase(fetchDelegates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDelegates.fulfilled, (state, action: PayloadAction<DelegatesResponse>) => {
        state.loading = false;
        state.delegates = action.payload.delegates;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchDelegates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.delegates = [];
      })

      // Add delegate
      .addCase(addDelegate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addDelegate.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addDelegate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Edit delegate
      .addCase(editDelegate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editDelegate.fulfilled, (state, action) => {
        state.loading = false;
        const { id, data } = action.payload;
        const index = state.delegates.findIndex(del => del.id === id);
        if (index !== -1) {
          state.delegates[index] = { ...state.delegates[index], ...data };
        }
      })
      .addCase(editDelegate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Remove delegate
      .addCase(removeDelegate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeDelegate.fulfilled, (state, action) => {
        state.loading = false;
        state.delegates = state.delegates.filter(del => del.id !== action.payload);
      })
      .addCase(removeDelegate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ===== DELEGATE SALES =====

      // Fetch delegate sales
      .addCase(fetchDelegateSales.pending, (state) => {
        state.salesLoading = true;
        state.error = null;
      })
      .addCase(fetchDelegateSales.fulfilled, (state, action: PayloadAction<DelegateSalesResponse>) => {
        state.salesLoading = false;
        state.sales = action.payload.sales;
        state.salesPagination = action.payload.pagination;
      })
      .addCase(fetchDelegateSales.rejected, (state, action) => {
        state.salesLoading = false;
        state.error = action.payload as string;
        state.sales = [];
      })

      // Add delegate sale
      .addCase(addDelegateSale.pending, (state) => {
        state.salesLoading = true;
        state.error = null;
      })
      .addCase(addDelegateSale.fulfilled, (state) => {
        state.salesLoading = false;
      })
      .addCase(addDelegateSale.rejected, (state, action) => {
        state.salesLoading = false;
        state.error = action.payload as string;
      })

      // ===== DELEGATE COLLECTIONS =====

      // Fetch delegate collections
      .addCase(fetchDelegateCollections.pending, (state) => {
        state.collectionsLoading = true;
        state.error = null;
      })
      .addCase(fetchDelegateCollections.fulfilled, (state, action: PayloadAction<DelegateCollectionsResponse>) => {
        state.collectionsLoading = false;
        state.collections = action.payload.collections;
        state.collectionsPagination = action.payload.pagination;
      })
      .addCase(fetchDelegateCollections.rejected, (state, action) => {
        state.collectionsLoading = false;
        state.error = action.payload as string;
        state.collections = [];
      })

      // Add delegate collection
      .addCase(addDelegateCollection.pending, (state) => {
        state.collectionsLoading = true;
        state.error = null;
      })
      .addCase(addDelegateCollection.fulfilled, (state) => {
        state.collectionsLoading = false;
      })
      .addCase(addDelegateCollection.rejected, (state, action) => {
        state.collectionsLoading = false;
        state.error = action.payload as string;
      })

      // ===== DELEGATE COMMISSION =====

      // Fetch delegate commission
      .addCase(fetchDelegateCommission.pending, (state) => {
        state.commissionLoading = true;
        state.error = null;
      })
      .addCase(fetchDelegateCommission.fulfilled, (state, action: PayloadAction<DelegateCommission>) => {
        state.commissionLoading = false;
        state.commission = action.payload;
      })
      .addCase(fetchDelegateCommission.rejected, (state, action) => {
        state.commissionLoading = false;
        state.error = action.payload as string;
        state.commission = null;
      })

      // Add commission payment
      .addCase(addCommissionPayment.pending, (state) => {
        state.commissionLoading = true;
        state.error = null;
      })
      .addCase(addCommissionPayment.fulfilled, (state) => {
        state.commissionLoading = false;
      })
      .addCase(addCommissionPayment.rejected, (state, action) => {
        state.commissionLoading = false;
        state.error = action.payload as string;
      })

      // ===== PERFORMANCE REPORTS =====

      // Fetch performance reports
      .addCase(fetchPerformanceReports.pending, (state) => {
        state.performanceReportsLoading = true;
        state.error = null;
      })
      .addCase(fetchPerformanceReports.fulfilled, (state, action: PayloadAction<PerformanceReportsResponse>) => {
        state.performanceReportsLoading = false;
        state.performanceReports = action.payload.reports;
        state.performanceReportsPagination = action.payload.pagination;
      })
      .addCase(fetchPerformanceReports.rejected, (state, action) => {
        state.performanceReportsLoading = false;
        state.error = action.payload as string;
        state.performanceReports = [];
      })

      // Add performance report
      .addCase(addPerformanceReport.pending, (state) => {
        state.performanceReportsLoading = true;
        state.error = null;
      })
      .addCase(addPerformanceReport.fulfilled, (state) => {
        state.performanceReportsLoading = false;
      })
      .addCase(addPerformanceReport.rejected, (state, action) => {
        state.performanceReportsLoading = false;
        state.error = action.payload as string;
      })

      // ===== DASHBOARD =====

      // Fetch delegate dashboard
      .addCase(fetchDelegateDashboard.pending, (state) => {
        state.dashboardLoading = true;
        state.error = null;
      })
      .addCase(fetchDelegateDashboard.fulfilled, (state, action: PayloadAction<DelegateDashboard>) => {
        state.dashboardLoading = false;
        state.dashboard = action.payload;
      })
      .addCase(fetchDelegateDashboard.rejected, (state, action) => {
        state.dashboardLoading = false;
        state.error = action.payload as string;
        state.dashboard = null;
      })

      // ===== CUSTOMER ASSIGNMENTS =====

      // Fetch customers
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action: PayloadAction<Customer[]>) => {
        state.loading = false;
        state.customers = action.payload;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.customers = [];
      })

      // Fetch delegates by customer
      .addCase(fetchDelegatesByCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDelegatesByCustomer.fulfilled, (state, action: PayloadAction<Delegate[]>) => {
        state.loading = false;
        state.delegates = action.payload;
      })
      .addCase(fetchDelegatesByCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.delegates = [];
      })

      // ===== ANALYTICS =====

      // Fetch delegate analytics
      .addCase(fetchDelegateAnalytics.pending, (state) => {
        state.analyticsLoading = true;
        state.error = null;
      })
      .addCase(fetchDelegateAnalytics.fulfilled, (state, action: PayloadAction<DelegateAnalytics>) => {
        state.analyticsLoading = false;
        state.analytics = action.payload;
      })
      .addCase(fetchDelegateAnalytics.rejected, (state, action) => {
        state.analyticsLoading = false;
        state.error = action.payload as string;
        state.analytics = null;
      });
  },
});

export const { 
  setSearchTerm, 
  setSelectedCustomerId, 
  setSelectedDelegateId,
  clearError, 
  clearSales, 
  clearCollections, 
  clearCommission, 
  clearPerformanceReports, 
  clearDashboard, 
  clearAnalytics 
} = delegatesSlice.actions;

export default delegatesSlice.reducer;
