import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import moneyBoxesService, {
  MoneyBox,
  MoneyBoxTransaction,
  MoneyBoxSummary,
  AllMoneyBoxesSummary,
  CreateMoneyBoxData,
  UpdateMoneyBoxData,
  AddTransactionData,
  TransferData
} from '@/services/moneyBoxesService';

interface MoneyBoxesState {
  moneyBoxes: MoneyBox[];
  selectedMoneyBox: MoneyBox | null;
  selectedMoneyBoxTransactions: MoneyBoxTransaction[];
  selectedMoneyBoxSummary: MoneyBoxSummary | null;
  allMoneyBoxesSummary: AllMoneyBoxesSummary | null;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
}

const initialState: MoneyBoxesState = {
  moneyBoxes: [],
  selectedMoneyBox: null,
  selectedMoneyBoxTransactions: [],
  selectedMoneyBoxSummary: null,
  allMoneyBoxesSummary: null,
  loading: false,
  error: null,
  successMessage: null,
};

// Async thunks
export const fetchAllMoneyBoxes = createAsyncThunk(
  'moneyBoxes/fetchAllMoneyBoxes',
  async (_, { rejectWithValue }) => {
    try {
      return await moneyBoxesService.getAllMoneyBoxes();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في جلب صناديق المال';
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchMoneyBoxById = createAsyncThunk(
  'moneyBoxes/fetchMoneyBoxById',
  async (id: number, { rejectWithValue }) => {
    try {
      return await moneyBoxesService.getMoneyBoxById(id);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في جلب صندوق المال';
      return rejectWithValue(errorMessage);
    }
  }
);

export const createMoneyBox = createAsyncThunk(
  'moneyBoxes/createMoneyBox',
  async (data: CreateMoneyBoxData, { rejectWithValue }) => {
    try {
      const result = await moneyBoxesService.createMoneyBox(data);
      return { moneyBox: result, message: 'تم إنشاء صندوق المال بنجاح' };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في إنشاء صندوق المال';
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateMoneyBox = createAsyncThunk(
  'moneyBoxes/updateMoneyBox',
  async ({ id, data }: { id: number; data: UpdateMoneyBoxData }, { rejectWithValue }) => {
    try {
      const result = await moneyBoxesService.updateMoneyBox(id, data);
      return { moneyBox: result, message: 'تم تحديث صندوق المال بنجاح' };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في تحديث صندوق المال';
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteMoneyBox = createAsyncThunk(
  'moneyBoxes/deleteMoneyBox',
  async (id: number, { rejectWithValue }) => {
    try {
      const result = await moneyBoxesService.deleteMoneyBox(id);
      return { id, message: result.message };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في حذف صندوق المال';
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchMoneyBoxTransactions = createAsyncThunk(
  'moneyBoxes/fetchMoneyBoxTransactions',
  async ({ id, limit = 50, offset = 0 }: { id: number; limit?: number; offset?: number }, { rejectWithValue }) => {
    try {
      return await moneyBoxesService.getMoneyBoxTransactions(id, limit, offset);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في جلب العمليات';
      return rejectWithValue(errorMessage);
    }
  }
);

export const addMoneyBoxTransaction = createAsyncThunk(
  'moneyBoxes/addMoneyBoxTransaction',
  async ({ id, data }: { id: number; data: AddTransactionData }, { rejectWithValue }) => {
    try {
      const result = await moneyBoxesService.addTransaction(id, data);
      return { 
        result,
        message: 'تم إضافة العملية بنجاح'
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في إضافة العملية';
      return rejectWithValue(errorMessage);
    }
  }
);

export const transferBetweenMoneyBoxes = createAsyncThunk(
  'moneyBoxes/transferBetweenMoneyBoxes',
  async (data: TransferData, { rejectWithValue }) => {
    try {
      const result = await moneyBoxesService.transferBetweenBoxes(data);
      return { result, message: result.message };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في التحويل بين الصناديق';
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchMoneyBoxSummary = createAsyncThunk(
  'moneyBoxes/fetchMoneyBoxSummary',
  async (id: number, { rejectWithValue }) => {
    try {
      return await moneyBoxesService.getMoneyBoxSummary(id);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في جلب الملخص';
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchAllMoneyBoxesSummary = createAsyncThunk(
  'moneyBoxes/fetchAllMoneyBoxesSummary',
  async (_, { rejectWithValue }) => {
    try {
      return await moneyBoxesService.getAllMoneyBoxesSummary();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في جلب ملخص الصناديق';
      return rejectWithValue(errorMessage);
    }
  }
);

const moneyBoxesSlice = createSlice({
  name: 'moneyBoxes',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccessMessage: (state) => {
      state.successMessage = null;
    },
    clearSelectedMoneyBox: (state) => {
      state.selectedMoneyBox = null;
      state.selectedMoneyBoxTransactions = [];
      state.selectedMoneyBoxSummary = null;
    },
    setSelectedMoneyBox: (state, action: PayloadAction<MoneyBox>) => {
      state.selectedMoneyBox = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all money boxes
      .addCase(fetchAllMoneyBoxes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllMoneyBoxes.fulfilled, (state, action) => {
        state.loading = false;
        state.moneyBoxes = action.payload;
      })
      .addCase(fetchAllMoneyBoxes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch money box by ID
      .addCase(fetchMoneyBoxById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMoneyBoxById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedMoneyBox = action.payload;
      })
      .addCase(fetchMoneyBoxById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Create money box
      .addCase(createMoneyBox.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createMoneyBox.fulfilled, (state, action) => {
        state.loading = false;
        state.moneyBoxes.unshift(action.payload.moneyBox);
        state.successMessage = action.payload.message;
      })
      .addCase(createMoneyBox.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Update money box
      .addCase(updateMoneyBox.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateMoneyBox.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.moneyBoxes.findIndex(box => box.id === action.payload.moneyBox.id);
        if (index !== -1) {
          state.moneyBoxes[index] = action.payload.moneyBox;
        }
        if (state.selectedMoneyBox?.id === action.payload.moneyBox.id) {
          state.selectedMoneyBox = action.payload.moneyBox;
        }
        state.successMessage = action.payload.message;
      })
      .addCase(updateMoneyBox.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Delete money box
      .addCase(deleteMoneyBox.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteMoneyBox.fulfilled, (state, action) => {
        state.loading = false;
        state.moneyBoxes = state.moneyBoxes.filter(box => box.id !== action.payload.id);
        if (state.selectedMoneyBox?.id === action.payload.id) {
          state.selectedMoneyBox = null;
        }
        state.successMessage = action.payload.message;
      })
      .addCase(deleteMoneyBox.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch money box transactions
      .addCase(fetchMoneyBoxTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMoneyBoxTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedMoneyBoxTransactions = action.payload.transactions;
      })
      .addCase(fetchMoneyBoxTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Add money box transaction
      .addCase(addMoneyBoxTransaction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addMoneyBoxTransaction.fulfilled, (state, action) => {
        state.loading = false;
        // Update the money box amount
        const index = state.moneyBoxes.findIndex(box => box.id === action.payload.result.transaction.box_id);
        if (index !== -1) {
          state.moneyBoxes[index].amount = action.payload.result.newBalance;
        }
        if (state.selectedMoneyBox?.id === action.payload.result.transaction.box_id) {
          state.selectedMoneyBox.amount = action.payload.result.newBalance;
        }
        state.successMessage = action.payload.message;
      })
      .addCase(addMoneyBoxTransaction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Transfer between money boxes
      .addCase(transferBetweenMoneyBoxes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(transferBetweenMoneyBoxes.fulfilled, (state, action) => {
        state.loading = false;
        // Update both money boxes
        const fromIndex = state.moneyBoxes.findIndex(box => box.id === action.payload.result.fromBox.id);
        const toIndex = state.moneyBoxes.findIndex(box => box.id === action.payload.result.toBox.id);
        
        if (fromIndex !== -1) {
          state.moneyBoxes[fromIndex] = action.payload.result.fromBox;
        }
        if (toIndex !== -1) {
          state.moneyBoxes[toIndex] = action.payload.result.toBox;
        }
        
        state.successMessage = action.payload.message;
      })
      .addCase(transferBetweenMoneyBoxes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch money box summary
      .addCase(fetchMoneyBoxSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMoneyBoxSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedMoneyBoxSummary = action.payload;
      })
      .addCase(fetchMoneyBoxSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch all money boxes summary
      .addCase(fetchAllMoneyBoxesSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllMoneyBoxesSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.allMoneyBoxesSummary = action.payload;
      })
      .addCase(fetchAllMoneyBoxesSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearSuccessMessage, clearSelectedMoneyBox, setSelectedMoneyBox } = moneyBoxesSlice.actions;
export default moneyBoxesSlice.reducer; 