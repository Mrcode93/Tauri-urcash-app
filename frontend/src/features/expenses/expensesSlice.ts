import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import expensesService, { Expense, CreateExpenseData } from './expensesService';
import type { PayloadAction } from '@reduxjs/toolkit';

interface ExpensesState {
  expenses: Expense[];
  expense: Expense | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  message: string;
}

const initialState: ExpensesState = {
  expenses: [],
  expense: null,
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: '',
};

export const getExpenses = createAsyncThunk(
  'expenses/getAll',
  async (_, thunkAPI) => {
    try {
      return await expensesService.getExpenses();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const createExpense = createAsyncThunk(
  'expenses/create',
  async (data: CreateExpenseData, thunkAPI) => {
    try {
      return await expensesService.createExpense(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const updateExpense = createAsyncThunk(
  'expenses/update',
  async ({ id, data }: { id: number; data: Partial<CreateExpenseData> }, thunkAPI) => {
    try {
      return await expensesService.updateExpense(id, data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const deleteExpense = createAsyncThunk(
  'expenses/delete',
  async (id: number, thunkAPI) => {
    try {
      return await expensesService.deleteExpense(id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const expensesSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
  },
  extraReducers: (builder) => {
    builder
      // Get all expenses
      .addCase(getExpenses.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getExpenses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.expenses = action.payload;
      })
      .addCase(getExpenses.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })
      // Create expense
      .addCase(createExpense.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createExpense.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.expenses.push(action.payload);
      })
      .addCase(createExpense.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })
      // Update expense
      .addCase(updateExpense.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateExpense.fulfilled, (state, action: PayloadAction<Expense>) => {
        state.isLoading = false;
        state.isSuccess = true;
        const idx = state.expenses.findIndex(e => e.id === action.payload.id);
        if (idx !== -1) {
          state.expenses[idx] = action.payload;
        }
      })
      .addCase(updateExpense.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })
      // Delete expense
      .addCase(deleteExpense.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteExpense.fulfilled, (state, action: PayloadAction<Expense>) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.expenses = state.expenses.filter(e => e.id !== action.payload.id);
      })
      .addCase(deleteExpense.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      });
  },
});

export const { reset } = expensesSlice.actions;
export default expensesSlice.reducer;
