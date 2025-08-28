import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { toast } from '@/lib/toast';
import {
  getAllEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeesForDropdown,
  getEmployeesWithCommission,
  calculateCommission,
  type Employee,
  type CreateEmployeeData,
  type UpdateEmployeeData,
  type EmployeesResponse,
  type CommissionCalculation
} from './employeesService';

interface EmployeesState {
  employees: Employee[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  searchTerm: string;
  commissionCalculation: CommissionCalculation | null;
}

const initialState: EmployeesState = {
  employees: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  },
  searchTerm: '',
  commissionCalculation: null,
};

// Async thunks
export const fetchEmployees = createAsyncThunk(
  'employees/fetchEmployees',
  async (params: { page?: number; limit?: number; search?: string }, { rejectWithValue }) => {
    try {
      const response = await getAllEmployees(
        params.page || 1,
        params.limit || 50,
        params.search || ''
      );
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch employees');
    }
  }
);

export const addEmployee = createAsyncThunk(
  'employees/addEmployee',
  async (data: CreateEmployeeData, { rejectWithValue }) => {
    try {
      const response = await createEmployee(data);
      toast.success('تم إضافة الموظف بنجاح');
      return response;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في إضافة الموظف');
      return rejectWithValue(error.response?.data?.message || 'Failed to add employee');
    }
  }
);

export const editEmployee = createAsyncThunk(
  'employees/editEmployee',
  async ({ id, data }: { id: number; data: UpdateEmployeeData }, { rejectWithValue }) => {
    try {
      const response = await updateEmployee(id, data);
      toast.success('تم تحديث الموظف بنجاح');
      return { id, data };
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في تحديث الموظف');
      return rejectWithValue(error.response?.data?.message || 'Failed to update employee');
    }
  }
);

export const removeEmployee = createAsyncThunk(
  'employees/removeEmployee',
  async (id: number, { rejectWithValue }) => {
    try {
      await deleteEmployee(id);
      toast.success('تم حذف الموظف بنجاح');
      return id;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في حذف الموظف');
      return rejectWithValue(error.response?.data?.message || 'Failed to delete employee');
    }
  }
);

export const fetchEmployeesForDropdown = createAsyncThunk(
  'employees/fetchEmployeesForDropdown',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getEmployeesForDropdown();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch employees for dropdown');
    }
  }
);

export const fetchEmployeesWithCommission = createAsyncThunk(
  'employees/fetchEmployeesWithCommission',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getEmployeesWithCommission();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch employees with commission');
    }
  }
);

export const calculateEmployeeCommission = createAsyncThunk(
  'employees/calculateCommission',
  async (params: { employeeId: number; salesAmount: number; period?: string }, { rejectWithValue }) => {
    try {
      const response = await calculateCommission(
        params.employeeId,
        params.salesAmount,
        params.period || 'month'
      );
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to calculate commission');
    }
  }
);

const employeesSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearCommissionCalculation: (state) => {
      state.commissionCalculation = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch employees
      .addCase(fetchEmployees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action: PayloadAction<EmployeesResponse>) => {
        state.loading = false;
        state.employees = action.payload.employees;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.employees = []; // Reset employees on error
        state.pagination = { // Reset pagination on error
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0,
        };
      })
      // Add employee
      .addCase(addEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addEmployee.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Edit employee
      .addCase(editEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editEmployee.fulfilled, (state, action) => {
        state.loading = false;
        const { id, data } = action.payload;
        const index = state.employees.findIndex(emp => emp.id === id);
        if (index !== -1) {
          state.employees[index] = { ...state.employees[index], ...data };
        }
      })
      .addCase(editEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Remove employee
      .addCase(removeEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.employees = state.employees.filter(emp => emp.id !== action.payload);
      })
      .addCase(removeEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Calculate commission
      .addCase(calculateEmployeeCommission.fulfilled, (state, action: PayloadAction<CommissionCalculation>) => {
        state.commissionCalculation = action.payload;
      });
  },
});

export const { setSearchTerm, clearError, clearCommissionCalculation } = employeesSlice.actions;
export default employeesSlice.reducer;
