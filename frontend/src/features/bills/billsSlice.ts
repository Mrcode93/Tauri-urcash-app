import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import billsService, { 
  Bill, 
  Purchase, 
  ReturnBill, 
  SaleBillData, 
  PurchaseBillData, 
  ReturnBillData, 
  BillItem, 
  BillsFilters, 
  BillsStatistics,
  PaginatedResponse 
} from './billsService';

// Async thunks
export const createSaleBill = createAsyncThunk(
  'bills/createSaleBill',
  async ({ billData, items }: { billData: SaleBillData; items: BillItem[] }) => {
    const response = await billsService.createSaleBill(billData, items, billData.moneyBoxId, billData.transactionNotes);
    return response;
  }
);

export const createPurchaseBill = createAsyncThunk(
  'bills/createPurchaseBill',
  async ({ billData, items, moneyBoxId, transactionNotes }: { 
    billData: PurchaseBillData; 
    items: BillItem[];
    moneyBoxId?: number;
    transactionNotes?: string;
  }) => {
    const response = await billsService.createPurchaseBill(billData, items, moneyBoxId, transactionNotes);
    return response;
  }
);

export const createReturnBill = createAsyncThunk(
  'bills/createReturnBill',
  async ({ returnData, items }: { returnData: ReturnBillData; items: BillItem[] }) => {
    const response = await billsService.createReturnBill(returnData, items);
    return response;
  }
);

export const fetchSaleBills = createAsyncThunk(
  'bills/fetchSaleBills',
  async ({ filters, page, limit }: { filters?: BillsFilters; page?: number; limit?: number }) => {
    const response = await billsService.getAllSaleBills(filters, page, limit);
    return response;
  }
);

export const fetchPurchaseBills = createAsyncThunk(
  'bills/fetchPurchaseBills',
  async ({ filters, page, limit }: { filters?: BillsFilters; page?: number; limit?: number }) => {
    const response = await billsService.getAllPurchaseBills(filters, page, limit);
    return response;
  }
);

export const fetchReturnBills = createAsyncThunk(
  'bills/fetchReturnBills',
  async ({ filters, page, limit }: { filters?: BillsFilters; page?: number; limit?: number }) => {
    const response = await billsService.getAllReturnBills(filters, page, limit);
    return response;
  }
);

export const fetchSaleBillById = createAsyncThunk(
  'bills/fetchSaleBillById',
  async (id: number) => {
    const response = await billsService.getSaleBillById(id);
    return response;
  }
);

export const fetchPurchaseBillById = createAsyncThunk(
  'bills/fetchPurchaseBillById',
  async (id: number) => {
    const response = await billsService.getPurchaseBillById(id);
    return response;
  }
);

export const fetchReturnBillById = createAsyncThunk(
  'bills/fetchReturnBillById',
  async (id: number) => {
    const response = await billsService.getReturnBillById(id);
    return response;
  }
);

export const fetchBillByNumber = createAsyncThunk(
  'bills/fetchBillByNumber',
  async (billNumber: string) => {
    const response = await billsService.getBillByNumber(billNumber);
    return response;
  }
);

export const fetchPurchaseByNumber = createAsyncThunk(
  'bills/fetchPurchaseByNumber',
  async (invoiceNumber: string) => {
    const response = await billsService.getPurchaseByNumber(invoiceNumber);
    return response;
  }
);

export const fetchReturnByNumber = createAsyncThunk(
  'bills/fetchReturnByNumber',
  async (returnNumber: string) => {
    const response = await billsService.getReturnByNumber(returnNumber);
    return response;
  }
);

export const updateBillPaymentStatus = createAsyncThunk(
  'bills/updateBillPaymentStatus',
  async ({ id, paymentData }: { id: number; paymentData: { paid_amount: number; payment_method: string; payment_status?: string } }) => {
    const response = await billsService.updateBillPaymentStatus(id, paymentData);
    return response;
  }
);

export const updatePurchasePaymentStatus = createAsyncThunk(
  'bills/updatePurchasePaymentStatus',
  async ({ id, paymentData }: { id: number; paymentData: { paid_amount: number; payment_method: string; payment_status?: string } }) => {
    const response = await billsService.updatePurchasePaymentStatus(id, paymentData);
    return response;
  }
);

export const deleteBill = createAsyncThunk(
  'bills/deleteBill',
  async (id: number) => {
    await billsService.deleteBill(id);
    return id;
  }
);

export const deletePurchase = createAsyncThunk(
  'bills/deletePurchase',
  async (id: number) => {
    await billsService.deletePurchase(id);
    return id;
  }
);

export const deleteReturn = createAsyncThunk(
  'bills/deleteReturn',
  async (id: number) => {
    await billsService.deleteReturn(id);
    return id;
  }
);

export const fetchBillsStatistics = createAsyncThunk(
  'bills/fetchBillsStatistics',
  async (filters?: BillsFilters) => {
    const response = await billsService.getBillsStatistics(filters);
    return response;
  }
);

export const fetchPurchasesStatistics = createAsyncThunk(
  'bills/fetchPurchasesStatistics',
  async (filters?: BillsFilters) => {
    const response = await billsService.getPurchasesStatistics(filters);
    return response;
  }
);

export const fetchReturnsStatistics = createAsyncThunk(
  'bills/fetchReturnsStatistics',
  async (filters?: BillsFilters) => {
    const response = await billsService.getReturnsStatistics(filters);
    return response;
  }
);

// State interface
interface BillsState {
  // Sale bills
  saleBills: Bill[];
  saleBillsPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  currentSaleBill: Bill | null;
  
  // Purchase bills
  purchaseBills: Purchase[];
  purchaseBillsPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  currentPurchaseBill: Purchase | null;
  
  // Return bills
  returnBills: ReturnBill[];
  returnBillsPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  currentReturnBill: ReturnBill | null;
  
  // Statistics
  billsStatistics: BillsStatistics | null;
  purchasesStatistics: BillsStatistics | null;
  returnsStatistics: BillsStatistics | null;
  
  // Loading states
  loading: {
    saleBills: boolean;
    purchaseBills: boolean;
    returnBills: boolean;
    currentSaleBill: boolean;
    currentPurchaseBill: boolean;
    currentReturnBill: boolean;
    statistics: boolean;
    creating: boolean;
    updating: boolean;
    deleting: boolean;
  };
  
  // Error states
  error: {
    saleBills: string | null;
    purchaseBills: string | null;
    returnBills: string | null;
    currentSaleBill: string | null;
    currentPurchaseBill: string | null;
    currentReturnBill: string | null;
    statistics: string | null;
    creating: string | null;
    updating: string | null;
    deleting: string | null;
  };
  
  // Filters
  filters: {
    saleBills: BillsFilters;
    purchaseBills: BillsFilters;
    returnBills: BillsFilters;
  };
}

// Initial state
const initialState: BillsState = {
  // Sale bills
  saleBills: [],
  saleBillsPagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  },
  currentSaleBill: null,
  
  // Purchase bills
  purchaseBills: [],
  purchaseBillsPagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  },
  currentPurchaseBill: null,
  
  // Return bills
  returnBills: [],
  returnBillsPagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  },
  currentReturnBill: null,
  
  // Statistics
  billsStatistics: null,
  purchasesStatistics: null,
  returnsStatistics: null,
  
  // Loading states
  loading: {
    saleBills: false,
    purchaseBills: false,
    returnBills: false,
    currentSaleBill: false,
    currentPurchaseBill: false,
    currentReturnBill: false,
    statistics: false,
    creating: false,
    updating: false,
    deleting: false
  },
  
  // Error states
  error: {
    saleBills: null,
    purchaseBills: null,
    returnBills: null,
    currentSaleBill: null,
    currentPurchaseBill: null,
    currentReturnBill: null,
    statistics: null,
    creating: null,
    updating: null,
    deleting: null
  },
  
  // Filters
  filters: {
    saleBills: {},
    purchaseBills: {},
    returnBills: {}
  }
};

// Bills slice
const billsSlice = createSlice({
  name: 'bills',
  initialState,
  reducers: {
    // Clear current bill
    clearCurrentSaleBill: (state) => {
      state.currentSaleBill = null;
      state.error.currentSaleBill = null;
    },
    
    clearCurrentPurchaseBill: (state) => {
      state.currentPurchaseBill = null;
      state.error.currentPurchaseBill = null;
    },
    
    clearCurrentReturnBill: (state) => {
      state.currentReturnBill = null;
      state.error.currentReturnBill = null;
    },
    
    // Set filters
    setSaleBillsFilters: (state, action: PayloadAction<BillsFilters>) => {
      state.filters.saleBills = action.payload;
    },
    
    setPurchaseBillsFilters: (state, action: PayloadAction<BillsFilters>) => {
      state.filters.purchaseBills = action.payload;
    },
    
    setReturnBillsFilters: (state, action: PayloadAction<BillsFilters>) => {
      state.filters.returnBills = action.payload;
    },
    
    // Clear errors
    clearErrors: (state) => {
      state.error = {
        saleBills: null,
        purchaseBills: null,
        returnBills: null,
        currentSaleBill: null,
        currentPurchaseBill: null,
        currentReturnBill: null,
        statistics: null,
        creating: null,
        updating: null,
        deleting: null
      };
    },
    
    // Clear all bills data
    clearAllBills: (state) => {
      state.saleBills = [];
      state.purchaseBills = [];
      state.returnBills = [];
      state.currentSaleBill = null;
      state.currentPurchaseBill = null;
      state.currentReturnBill = null;
      state.billsStatistics = null;
      state.purchasesStatistics = null;
      state.returnsStatistics = null;
      state.saleBillsPagination = { page: 1, limit: 20, total: 0, totalPages: 0 };
      state.purchaseBillsPagination = { page: 1, limit: 20, total: 0, totalPages: 0 };
      state.returnBillsPagination = { page: 1, limit: 20, total: 0, totalPages: 0 };
    }
  },
  extraReducers: (builder) => {
    // Create sale bill
    builder
      .addCase(createSaleBill.pending, (state) => {
        state.loading.creating = true;
        state.error.creating = null;
      })
      .addCase(createSaleBill.fulfilled, (state, action) => {
        state.loading.creating = false;
        state.saleBills.unshift(action.payload);
        state.saleBillsPagination.total += 1;
      })
      .addCase(createSaleBill.rejected, (state, action) => {
        state.loading.creating = false;
        state.error.creating = action.error.message || 'حدث خطأ أثناء إنشاء فاتورة البيع';
      });

    // Create purchase bill
    builder
      .addCase(createPurchaseBill.pending, (state) => {
        state.loading.creating = true;
        state.error.creating = null;
      })
      .addCase(createPurchaseBill.fulfilled, (state, action) => {
        state.loading.creating = false;
        state.purchaseBills.unshift(action.payload);
        state.purchaseBillsPagination.total += 1;
      })
      .addCase(createPurchaseBill.rejected, (state, action) => {
        state.loading.creating = false;
        state.error.creating = action.error.message || 'حدث خطأ أثناء إنشاء فاتورة الشراء';
      });

    // Create return bill
    builder
      .addCase(createReturnBill.pending, (state) => {
        state.loading.creating = true;
        state.error.creating = null;
      })
      .addCase(createReturnBill.fulfilled, (state, action) => {
        state.loading.creating = false;
        state.returnBills.unshift(action.payload);
        state.returnBillsPagination.total += 1;
      })
      .addCase(createReturnBill.rejected, (state, action) => {
        state.loading.creating = false;
        state.error.creating = action.error.message || 'حدث خطأ أثناء إنشاء فاتورة الإرجاع';
      });

    // Fetch sale bills
    builder
      .addCase(fetchSaleBills.pending, (state) => {
        state.loading.saleBills = true;
        state.error.saleBills = null;
      })
      .addCase(fetchSaleBills.fulfilled, (state, action) => {
        state.loading.saleBills = false;
        state.saleBills = action.payload.data;
        state.saleBillsPagination = action.payload.pagination;
      })
      .addCase(fetchSaleBills.rejected, (state, action) => {
        state.loading.saleBills = false;
        state.error.saleBills = action.error.message || 'حدث خطأ أثناء جلب فواتير البيع';
      });

    // Fetch purchase bills
    builder
      .addCase(fetchPurchaseBills.pending, (state) => {
        state.loading.purchaseBills = true;
        state.error.purchaseBills = null;
      })
      .addCase(fetchPurchaseBills.fulfilled, (state, action) => {
        state.loading.purchaseBills = false;
        state.purchaseBills = action.payload.data;
        state.purchaseBillsPagination = action.payload.pagination;
      })
      .addCase(fetchPurchaseBills.rejected, (state, action) => {
        state.loading.purchaseBills = false;
        state.error.purchaseBills = action.error.message || 'حدث خطأ أثناء جلب فواتير الشراء';
      });

    // Fetch return bills
    builder
      .addCase(fetchReturnBills.pending, (state) => {
        state.loading.returnBills = true;
        state.error.returnBills = null;
      })
      .addCase(fetchReturnBills.fulfilled, (state, action) => {
        state.loading.returnBills = false;
        state.returnBills = action.payload.data;
        state.returnBillsPagination = action.payload.pagination;
      })
      .addCase(fetchReturnBills.rejected, (state, action) => {
        state.loading.returnBills = false;
        state.error.returnBills = action.error.message || 'حدث خطأ أثناء جلب فواتير الإرجاع';
      });

    // Fetch sale bill by ID
    builder
      .addCase(fetchSaleBillById.pending, (state) => {
        state.loading.currentSaleBill = true;
        state.error.currentSaleBill = null;
      })
      .addCase(fetchSaleBillById.fulfilled, (state, action) => {
        state.loading.currentSaleBill = false;
        state.currentSaleBill = action.payload;
      })
      .addCase(fetchSaleBillById.rejected, (state, action) => {
        state.loading.currentSaleBill = false;
        state.error.currentSaleBill = action.error.message || 'حدث خطأ أثناء جلب فاتورة البيع';
      });

    // Fetch purchase bill by ID
    builder
      .addCase(fetchPurchaseBillById.pending, (state) => {
        state.loading.currentPurchaseBill = true;
        state.error.currentPurchaseBill = null;
      })
      .addCase(fetchPurchaseBillById.fulfilled, (state, action) => {
        state.loading.currentPurchaseBill = false;
        state.currentPurchaseBill = action.payload;
      })
      .addCase(fetchPurchaseBillById.rejected, (state, action) => {
        state.loading.currentPurchaseBill = false;
        state.error.currentPurchaseBill = action.error.message || 'حدث خطأ أثناء جلب فاتورة الشراء';
      });

    // Fetch return bill by ID
    builder
      .addCase(fetchReturnBillById.pending, (state) => {
        state.loading.currentReturnBill = true;
        state.error.currentReturnBill = null;
      })
      .addCase(fetchReturnBillById.fulfilled, (state, action) => {
        state.loading.currentReturnBill = false;
        state.currentReturnBill = action.payload;
      })
      .addCase(fetchReturnBillById.rejected, (state, action) => {
        state.loading.currentReturnBill = false;
        state.error.currentReturnBill = action.error.message || 'حدث خطأ أثناء جلب فاتورة الإرجاع';
      });

    // Update bill payment status
    builder
      .addCase(updateBillPaymentStatus.pending, (state) => {
        state.loading.updating = true;
        state.error.updating = null;
      })
      .addCase(updateBillPaymentStatus.fulfilled, (state, action) => {
        state.loading.updating = false;
        const index = state.saleBills.findIndex(bill => bill.id === action.payload.id);
        if (index !== -1) {
          state.saleBills[index] = action.payload;
        }
        if (state.currentSaleBill?.id === action.payload.id) {
          state.currentSaleBill = action.payload;
        }
      })
      .addCase(updateBillPaymentStatus.rejected, (state, action) => {
        state.loading.updating = false;
        state.error.updating = action.error.message || 'حدث خطأ أثناء تحديث حالة الدفع';
      });

    // Update purchase payment status
    builder
      .addCase(updatePurchasePaymentStatus.pending, (state) => {
        state.loading.updating = true;
        state.error.updating = null;
      })
      .addCase(updatePurchasePaymentStatus.fulfilled, (state, action) => {
        state.loading.updating = false;
        const index = state.purchaseBills.findIndex(purchase => purchase.id === action.payload.id);
        if (index !== -1) {
          state.purchaseBills[index] = action.payload;
        }
        if (state.currentPurchaseBill?.id === action.payload.id) {
          state.currentPurchaseBill = action.payload;
        }
      })
      .addCase(updatePurchasePaymentStatus.rejected, (state, action) => {
        state.loading.updating = false;
        state.error.updating = action.error.message || 'حدث خطأ أثناء تحديث حالة الدفع';
      });

    // Delete bill
    builder
      .addCase(deleteBill.pending, (state) => {
        state.loading.deleting = true;
        state.error.deleting = null;
      })
      .addCase(deleteBill.fulfilled, (state, action) => {
        state.loading.deleting = false;
        state.saleBills = state.saleBills.filter(bill => bill.id !== action.payload);
        state.saleBillsPagination.total -= 1;
      })
      .addCase(deleteBill.rejected, (state, action) => {
        state.loading.deleting = false;
        state.error.deleting = action.error.message || 'حدث خطأ أثناء حذف الفاتورة';
      });

    // Delete purchase
    builder
      .addCase(deletePurchase.pending, (state) => {
        state.loading.deleting = true;
        state.error.deleting = null;
      })
      .addCase(deletePurchase.fulfilled, (state, action) => {
        state.loading.deleting = false;
        state.purchaseBills = state.purchaseBills.filter(purchase => purchase.id !== action.payload);
        state.purchaseBillsPagination.total -= 1;
      })
      .addCase(deletePurchase.rejected, (state, action) => {
        state.loading.deleting = false;
        state.error.deleting = action.error.message || 'حدث خطأ أثناء حذف فاتورة الشراء';
      });

    // Delete return
    builder
      .addCase(deleteReturn.pending, (state) => {
        state.loading.deleting = true;
        state.error.deleting = null;
      })
      .addCase(deleteReturn.fulfilled, (state, action) => {
        state.loading.deleting = false;
        state.returnBills = state.returnBills.filter(returnBill => returnBill.id !== action.payload);
        state.returnBillsPagination.total -= 1;
      })
      .addCase(deleteReturn.rejected, (state, action) => {
        state.loading.deleting = false;
        state.error.deleting = action.error.message || 'حدث خطأ أثناء حذف فاتورة الإرجاع';
      });

    // Fetch statistics
    builder
      .addCase(fetchBillsStatistics.pending, (state) => {
        state.loading.statistics = true;
        state.error.statistics = null;
      })
      .addCase(fetchBillsStatistics.fulfilled, (state, action) => {
        state.loading.statistics = false;
        state.billsStatistics = action.payload;
      })
      .addCase(fetchBillsStatistics.rejected, (state, action) => {
        state.loading.statistics = false;
        state.error.statistics = action.error.message || 'حدث خطأ أثناء جلب الإحصائيات';
      });

    builder
      .addCase(fetchPurchasesStatistics.pending, (state) => {
        state.loading.statistics = true;
        state.error.statistics = null;
      })
      .addCase(fetchPurchasesStatistics.fulfilled, (state, action) => {
        state.loading.statistics = false;
        state.purchasesStatistics = action.payload;
      })
      .addCase(fetchPurchasesStatistics.rejected, (state, action) => {
        state.loading.statistics = false;
        state.error.statistics = action.error.message || 'حدث خطأ أثناء جلب الإحصائيات';
      });

    builder
      .addCase(fetchReturnsStatistics.pending, (state) => {
        state.loading.statistics = true;
        state.error.statistics = null;
      })
      .addCase(fetchReturnsStatistics.fulfilled, (state, action) => {
        state.loading.statistics = false;
        state.returnsStatistics = action.payload;
      })
      .addCase(fetchReturnsStatistics.rejected, (state, action) => {
        state.loading.statistics = false;
        state.error.statistics = action.error.message || 'حدث خطأ أثناء جلب الإحصائيات';
      });
  }
});

export const {
  clearCurrentSaleBill,
  clearCurrentPurchaseBill,
  clearCurrentReturnBill,
  setSaleBillsFilters,
  setPurchaseBillsFilters,
  setReturnBillsFilters,
  clearErrors,
  clearAllBills
} = billsSlice.actions;

export default billsSlice.reducer; 