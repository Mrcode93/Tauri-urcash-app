import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/features/auth/authSlice';
import salesReducer from '@/features/sales/salesSlice';
import purchasesReducer from '@/features/purchases/purchasesSlice';
import customersReducer from '@/features/customers/customersSlice';
import productsReducer from '@/features/inventory/inventorySlice';
import suppliersReducer from '@/features/suppliers/suppliersSlice';
import inventoryReducer from '../features/inventory/inventorySlice';
import expensesReducer from '@/features/expenses/expensesSlice';
import reportsReducer from '@/features/reports/reportsSlice';
import debtsReducer from '@/features/debts/debtsSlice';
import appReducer from '@/features/app/appSlice';
import settingsReducer from '@/features/settings/settingsSlice';
import posReducer from '../features/pos/posSlice';
import installmentsReducer from '@/features/installments/installmentsSlice';
import cashBoxReducer from '@/features/cashBox/cashBoxSlice';
import moneyBoxesReducer from '@/features/moneyBoxes/moneyBoxesSlice';
import devicesReducer from '@/features/devices/devicesSlice';
import billsReducer from '@/features/bills/billsSlice';
import delegatesReducer from '@/features/delegates/delegatesSlice';
import employeesReducer from '@/features/employees/employeesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    sales: salesReducer,
    purchases: purchasesReducer,
    customers: customersReducer,
    products: productsReducer,
    suppliers: suppliersReducer,
    inventory: inventoryReducer,
    expenses: expensesReducer,
    reports: reportsReducer,
    debts: debtsReducer,
    app: appReducer,
    settings: settingsReducer,
    pos: posReducer,
    installments: installmentsReducer,
    cashBox: cashBoxReducer,
    moneyBoxes: moneyBoxesReducer,
    devices: devicesReducer,
    bills: billsReducer,
    delegates: delegatesReducer,
    employees: employeesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
  devTools: process.env.NODE_ENV !== 'production', // Re-enable Redux DevTools
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
