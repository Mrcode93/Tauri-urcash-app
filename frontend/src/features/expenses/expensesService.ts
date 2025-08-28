import api from '@/lib/api';

// Error handler for expenses API
const handleExpensesApiError = (error: any, operation: string): never => {
  console.error(`Expenses API Error (${operation}):`, error);
  
  // Handle validation errors - preserve the original structure
  if (error?.response?.data?.errors || error?.errors) {
    // For validation errors, throw the original error to preserve structure
    throw error;
  }
  
  // Handle different types of errors
  if (error?.response?.data?.message) {
    // Backend Arabic error message
    throw new Error(error.response.data.message);
  }
  
  if (error.message) {
    // Network or other errors
    throw new Error(error.message);
  }
  
  // Default error message
  const defaultMessages: { [key: string]: string } = {
    getExpenses: 'حدث خطأ أثناء جلب المصروفات',
    getById: 'حدث خطأ أثناء جلب بيانات المصروف',
    createExpense: 'حدث خطأ أثناء إنشاء المصروف',
    updateExpense: 'حدث خطأ أثناء تحديث المصروف',
    deleteExpense: 'حدث خطأ أثناء حذف المصروف',
    getByCategory: 'حدث خطأ أثناء جلب المصروفات حسب الفئة',
    getByDateRange: 'حدث خطأ أثناء جلب المصروفات حسب التاريخ'
  };
  
  throw new Error(defaultMessages[operation] || 'حدث خطأ في نظام المصروفات');
};

export interface Expense {
  id: number;
  amount: number;
  description: string;
  category: string;
  date: string;
  money_box_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseData {
  amount: number;
  description: string;
  category: string;
  date: string;
  moneyBoxId: string;
}

export const getExpenses = async (): Promise<Expense[]> => {
  try {
    const response = await api.get('/expenses');
    return response.data.data.expenses;
  } catch (error) {
    handleExpensesApiError(error, 'getExpenses');
  }
};

export const createExpense = async (data: CreateExpenseData): Promise<Expense> => {
  try {
    const response = await api.post('/expenses', data);
    return response.data.data.expense;
  } catch (error) {
    handleExpensesApiError(error, 'createExpense');
  }
};

export const updateExpense = async (id: number, data: Partial<CreateExpenseData>): Promise<Expense> => {
  try {
    const response = await api.put(`/expenses/${id}`, data);
    return response.data.data.expense;
  } catch (error) {
    handleExpensesApiError(error, 'updateExpense');
  }
};

export const deleteExpense = async (id: number): Promise<Expense> => {
  try {
    const response = await api.delete(`/expenses/${id}`);
    return response.data.data.expense;
  } catch (error) {
    handleExpensesApiError(error, 'deleteExpense');
  }
};

export const getExpensesByCategory = async (category: string): Promise<Expense[]> => {
  try {
    const response = await api.get(`/expenses/category/${category}`);
    return response.data.data.expenses;
  } catch (error) {
    handleExpensesApiError(error, 'getByCategory');
  }
};

export const getExpensesByDateRange = async (startDate: string, endDate: string): Promise<Expense[]> => {
  try {
    const response = await api.get(`/expenses/date-range?startDate=${startDate}&endDate=${endDate}`);
    return response.data.data.expenses;
  } catch (error) {
    handleExpensesApiError(error, 'getByDateRange');
  }
};

const expensesService = {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpensesByCategory,
  getExpensesByDateRange,
};

export default expensesService; 