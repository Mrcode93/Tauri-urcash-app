import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import reportsService from './reportsService';
import { RawDashboardSummary, ProfitLossEntry, ReportsState, DateRange, PremiumReportData } from './types';

const initialState: ReportsState = {
  dashboardSummary: null,
  profitLoss: null,
  premiumReportData: null, // Initialize premiumReportData
  returnsReport: null, // Add returns report state
  isLoading: false,
  error: null,
  dateRange: {
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  },
  reportType: 'daily',
  activeTab: 'dashboard',
  isPrintModalOpen: false,
};

// Get dashboard summary
export const getDashboardSummary = createAsyncThunk<
  RawDashboardSummary,
  { period: 'week' | 'month' | 'year' } | { start: string; end: string } | undefined,
  { rejectValue: string }
>(
  'reports/getDashboardSummary',
  async (params, thunkAPI) => {
    try {
      const response = await reportsService.getDashboardSummary(params);
      return response as unknown as RawDashboardSummary; // Corrected type casting
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch dashboard summary';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get profit and loss report
export const getProfitLoss = createAsyncThunk<
  ProfitLossEntry[],
  DateRange,
  { rejectValue: string }
>(
  'reports/getProfitLoss',
  async (period, thunkAPI) => {
    try {
      const response = await reportsService.getProfitLoss(period);
      return response as unknown as ProfitLossEntry[]; // Corrected type casting, assuming ProfitLossEntry[] is the correct target
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch profit & loss report';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get returns report
export const getReturnsReport = createAsyncThunk<
  any,
  DateRange | undefined,
  { rejectValue: string }
>(
  'reports/getReturnsReport',
  async (period, thunkAPI) => {
    try {
      const response = await reportsService.getReturnsReport(period);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch returns report';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Thunk for fetching premium reports data
export const getPremiumReports = createAsyncThunk<
  PremiumReportData, // Return type
  DateRange, // Argument type (e.g., based on a date range)
  { rejectValue: string } // Type for thunkAPI.rejectWithValue
>(
  'reports/getPremiumReports',
  async (params, thunkAPI) => {
    try {
      // Replace with actual API call to fetch premium reports
      // const response = await reportsService.getPremiumReports(params);
      // Mock data for now (in Arabic):
      const mockResponse: PremiumReportData = {
        overview: {
          totalInsights: 5,
          keyFinding: "زيادة ولاء العملاء بنسبة 15٪ بفضل الحملات المستهدفة.",
        },
        detailedMetrics: [
          { id: '1', title: 'تكلفة اكتساب العميل', metric: '50 ريال سعودي', trend: 'down', details: 'انخفاض بنسبة 10٪ مقارنة بالفترة السابقة.' },
          { id: '2', title: 'متوسط قيمة الطلب', metric: '250 ريال سعودي', trend: 'up', details: 'زيادة بنسبة 5٪.' },
          { id: '3', title: 'دقة توقعات المبيعات', metric: '85%', trend: 'stable', details: 'متوافق مع البيانات التاريخية.' },
          { id: '4', title: 'معدل الاحتفاظ بالعملاء', metric: '70%', trend: 'up', details: 'تحسن بنسبة 7% هذا الربع.' },
          { id: '5', title: 'أداء الحملة التسويقية الأخيرة', metric: '120% عائد استثمار', trend: 'up', details: 'فاقت التوقعات بشكل كبير.' },
        ],
        forecasts: {
          salesProjection: 1200000,
          growthRate: "+8% الربع القادم",
        },
      };
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      return mockResponse;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch premium reports';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    resetState: (state) => {
      state.isLoading = false;
      state.error = null;
    },
    setDateRange: (state, action: PayloadAction<DateRange>) => {
      state.dateRange = action.payload;
    },
    setReportType: (state, action: PayloadAction<string>) => {
      state.reportType = action.payload;
    },
    setActiveTab: (state, action: PayloadAction<'dashboard' | 'profit-loss' | 'returns' | 'premium-reports'>) => {
      state.activeTab = action.payload;
    },
    setPrintModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isPrintModalOpen = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getDashboardSummary.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getDashboardSummary.fulfilled, (state, action: PayloadAction<RawDashboardSummary>) => {
        state.isLoading = false;
        state.dashboardSummary = action.payload;
      })
      .addCase(getDashboardSummary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(getProfitLoss.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getProfitLoss.fulfilled, (state, action: PayloadAction<ProfitLossEntry[]>) => {
        state.isLoading = false;
        state.profitLoss = action.payload;
      })
      .addCase(getProfitLoss.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Add reducers for getReturnsReport
      .addCase(getReturnsReport.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getReturnsReport.fulfilled, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        state.returnsReport = action.payload;
      })
      .addCase(getReturnsReport.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Add reducers for getPremiumReports
      .addCase(getPremiumReports.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getPremiumReports.fulfilled, (state, action: PayloadAction<PremiumReportData>) => {
        state.isLoading = false;
        state.premiumReportData = action.payload;
      })
      .addCase(getPremiumReports.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetState, setDateRange, setReportType, setActiveTab, setPrintModalOpen } = reportsSlice.actions;
export default reportsSlice.reducer;
