import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { lazy, Suspense } from 'react';

import PublicLayout from "./layouts/PublicLayout";
import PrivateLayout from "./layouts/PrivateLayout";
import PrivateRoute from "./components/PrivateRoute";
import { 
  RequirePermissionRoute,
  RequireAnyPermissionRoute
} from "./components/ProtectedRoute";
import { PERMISSIONS } from "@/constants/permissions";
import { 
  ExpensesRouteGuard, 
  SuppliersRouteGuard, 
  CustomersRouteGuard, 
  ReportsRouteGuard, 
  DebtsRouteGuard, 
  InstallmentsRouteGuard 
} from "./components/PremiumRouteGuard";
import { Loader2 } from 'lucide-react';
import { RootState } from '@/app/store';
import PermissionTest from './components/PermissionTest';

// Import Dashboard directly to test if lazy loading is the issue
import Dashboard from "./pages/Dashboard";
// Import DashboardCharts for charts view
import DashboardCharts from "./pages/DashboardCharts";
// Temporarily import Login directly to debug
import Login from "./pages/Login";

// Lazy load all other page components
// const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Sales = lazy(() => import("./pages/Sales"));
const SaleDetails = lazy(() => import("./pages/SaleDetails"));
const Purchases = lazy(() => import("./pages/Purchases"));
const PurchaseDetails = lazy(() => import("./pages/PurchaseDetails"));
const Customers = lazy(() => import("./pages/Customers"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const Inventory = lazy(() => import("./pages/Inventory"));
const InventoryDetails = lazy(() => import("./pages/InventoryDetails"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Reports = lazy(() => import("./pages/Reports"));
const AdminProfiles = lazy(() => import("./pages/AdminProfiles"));
const Debts = lazy(() => import("./pages/Debts"));
const Installments = lazy(() => import("./pages/Installments"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ActivationPage = lazy(() => import("./pages/ActivationPage"));
const POS = lazy(() => import("./pages/POS"));
const CashBox = lazy(() => import("./pages/CashBoxManagement"));
const AdminCashBox = lazy(() => import("./pages/AdminCashBoxManagement"));
const Bills = lazy(() => import("./pages/BillsPage"));
const Stocks = lazy(() => import("./pages/Stocks"));
const StockMovements = lazy(() => import("./pages/StockMovements"));
const CustomerReceipts = lazy(() => import("./pages/CustomerReceipts"));
const SupplierPaymentReceipts = lazy(() => import("./pages/SupplierPaymentReceipts"));
const Settings = lazy(() => import("./pages/Settings"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const Representatives = lazy(() => import("./pages/Representatives")); // This is now used for delegates
const Employees = lazy(() => import("./pages/Employees"));

const RouteLoading = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
      <p className="text-gray-600">جاري تحميل الصفحة...</p>
    </div>
  </div>
);

const EnabledRoute = ({ path, children }: { path: string; children: React.ReactNode }) => {
  const getMenuItems = () => {
    const settings = useSelector((state: RootState) => state.settings.data);
    return settings?.sidebar_menu_items ? JSON.parse(settings.sidebar_menu_items) : [];
  };
  
  const menuItems = getMenuItems();
  const menuItem = menuItems.find((item: any) => item.path === path);
  
  if (!menuItem || !menuItem.enabled) {
    return <div className="text-center p-8">هذه الصفحة غير متاحة حالياً</div>;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/activation" element={
            <Suspense fallback={<RouteLoading />}>
              <ActivationPage />
            </Suspense>
          } />
        </Route>

        {/* Private Routes - All authenticated users with permission-based access */}
        <Route element={<PrivateRoute><PrivateLayout /></PrivateRoute>}>
          {/* Debug test route - no permissions required */}
          <Route path="/test" element={<PermissionTest />} />
          
          {/* Dashboard Routes - No permission required, accessible to all authenticated users */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* POS Routes - Requires pos.view permission */}
          <Route path="/pos" element={
            <EnabledRoute path="/pos">
              <RequirePermissionRoute permission={PERMISSIONS.POS_VIEW}>
                <Suspense fallback={<RouteLoading />}>
                  <POS />
                </Suspense>
              </RequirePermissionRoute>
            </EnabledRoute>
          } />
          
          {/* Sales Routes - Requires sales.manage permission */}
          <Route path="/sales" element={
            <EnabledRoute path="/sales">
              <RequirePermissionRoute permission={PERMISSIONS.SALES_MANAGE}>
                <Suspense fallback={<RouteLoading />}>
                  <Sales />
                </Suspense>
              </RequirePermissionRoute>
            </EnabledRoute>
          } />
          <Route path="/sales/:id" element={
            <EnabledRoute path="/sales">
              <RequirePermissionRoute permission={PERMISSIONS.SALES_MANAGE}>
                <Suspense fallback={<RouteLoading />}>
                  <SaleDetails />
                </Suspense>
              </RequirePermissionRoute>
            </EnabledRoute>
          } />
          
          {/* Purchases Routes - Requires purchases.view permission */}
          <Route path="/purchases" element={
            <EnabledRoute path="/purchases">
              <RequirePermissionRoute permission={PERMISSIONS.PURCHASES_VIEW}>
                <Suspense fallback={<RouteLoading />}>
                  <Purchases />
                </Suspense>
              </RequirePermissionRoute>
            </EnabledRoute>
          } />
          <Route path="/purchases/:id" element={
            <EnabledRoute path="/purchases">
              <RequirePermissionRoute permission={PERMISSIONS.PURCHASES_VIEW}>
                <Suspense fallback={<RouteLoading />}>
                  <PurchaseDetails />
                </Suspense>
              </RequirePermissionRoute>
            </EnabledRoute>
          } />
          
          {/* Customers Routes - Requires customers.manage permission */}
          <Route path="/customers" element={
            <EnabledRoute path="/customers">
              <RequirePermissionRoute permission={PERMISSIONS.CUSTOMERS_MANAGE}>
                <CustomersRouteGuard>
                  <Suspense fallback={<RouteLoading />}>
                    <Customers />
                  </Suspense>
                </CustomersRouteGuard>
              </RequirePermissionRoute>
            </EnabledRoute>
          } />
          
          {/* Suppliers Routes - Requires suppliers.manage permission */}
          <Route path="/suppliers" element={
            <EnabledRoute path="/suppliers">
              <RequirePermissionRoute permission={PERMISSIONS.SUPPLIERS_MANAGE}>
                <SuppliersRouteGuard>
                  <Suspense fallback={<RouteLoading />}>
                    <Suppliers />
                  </Suspense>
                </SuppliersRouteGuard>
              </RequirePermissionRoute>
            </EnabledRoute>
          } />
          
          {/* Products Routes - Requires products.manage permission */}
          <Route path="/inventory" element={
            <EnabledRoute path="/inventory">
              <RequirePermissionRoute permission={PERMISSIONS.PRODUCTS_MANAGE}>
                <Suspense fallback={<RouteLoading />}>
                  <Inventory />
                </Suspense>
              </RequirePermissionRoute>
            </EnabledRoute>
          } />
          <Route path="/inventory/:id" element={
            <EnabledRoute path="/inventory">
              <RequirePermissionRoute permission={PERMISSIONS.PRODUCTS_MANAGE}>
                <Suspense fallback={<RouteLoading />}>
                  <InventoryDetails />
                </Suspense>
              </RequirePermissionRoute>
            </EnabledRoute>
          } />
          
          {/* Stocks Routes - Requires inventory.manage permission */}
          <Route path="/stocks" element={
            <EnabledRoute path="/stocks">
              <RequirePermissionRoute permission={PERMISSIONS.INVENTORY_MANAGE}>
                <Suspense fallback={<RouteLoading />}>
                  <Stocks />
                </Suspense>
              </RequirePermissionRoute>
            </EnabledRoute>
          } />
          <Route path="/stock-movements" element={
            <RequirePermissionRoute permission={PERMISSIONS.INVENTORY_MANAGE}>
              <Suspense fallback={<RouteLoading />}>
                <StockMovements />
              </Suspense>
            </RequirePermissionRoute>
          } />
          
          {/* Bills Routes - Requires sales.view permission */}
          <Route path="/bills" element={
            <EnabledRoute path="/bills">
              <RequirePermissionRoute permission={PERMISSIONS.SALES_VIEW}>
                <Suspense fallback={<RouteLoading />}>
                  <Bills />
                </Suspense>
              </RequirePermissionRoute>
            </EnabledRoute>
          } />
          
          {/* Expenses Routes - Requires expenses.manage permission (if exists) or settings.manage */}
          <Route path="/expenses" element={
            <EnabledRoute path="/expenses">
              <RequirePermissionRoute permission={PERMISSIONS.SETTINGS_MANAGE}>
                <ExpensesRouteGuard>
                  <Suspense fallback={<RouteLoading />}>
                    <Expenses />
                  </Suspense>
                </ExpensesRouteGuard>
              </RequirePermissionRoute>
            </EnabledRoute>
          } />
          
          {/* Customer Receipts Routes - Requires customers.view permission */}
          <Route path="/customer-receipts" element={
            <EnabledRoute path="/customer-receipts">
              <RequirePermissionRoute permission={PERMISSIONS.CUSTOMERS_VIEW}>
                <Suspense fallback={<RouteLoading />}>
                  <CustomerReceipts />
                </Suspense>
              </RequirePermissionRoute>
            </EnabledRoute>
          } />
          
          {/* Supplier Payment Receipts Routes - Requires suppliers.view permission */}
          <Route path="/supplier-payment-receipts" element={
            <EnabledRoute path="/supplier-payment-receipts">
              <RequirePermissionRoute permission={PERMISSIONS.SUPPLIERS_VIEW}>
                <Suspense fallback={<RouteLoading />}>
                  <SupplierPaymentReceipts />
                </Suspense>
              </RequirePermissionRoute>
            </EnabledRoute>
          } />
          
          {/* Reports Routes - Requires reports.view permission */}
          <Route path="/reports" element={
            <EnabledRoute path="/reports">
              <RequirePermissionRoute permission={PERMISSIONS.REPORTS_VIEW}>
                <ReportsRouteGuard>
                  <Suspense fallback={<RouteLoading />}>
                    <Reports />
                  </Suspense>
                </ReportsRouteGuard>
              </RequirePermissionRoute>
            </EnabledRoute>
          } />
          
          {/* Debts Routes - Requires debts.manage permission */}
          <Route path="/debts" element={
            <EnabledRoute path="/debts">
              <RequirePermissionRoute permission={PERMISSIONS.DEBTS_MANAGE}>
                <DebtsRouteGuard>
                  <Suspense fallback={<RouteLoading />}>
                    <Debts />
                  </Suspense>
                </DebtsRouteGuard>
              </RequirePermissionRoute>
            </EnabledRoute>
          } />
          
          {/* Installments Routes - Requires installments.manage permission */}
          <Route path="/installments" element={
            <EnabledRoute path="/installments">
              <RequirePermissionRoute permission={PERMISSIONS.INSTALLMENTS_MANAGE}>
                <InstallmentsRouteGuard>
                  <Suspense fallback={<RouteLoading />}>
                    <Installments />
                  </Suspense>
                </InstallmentsRouteGuard>
              </RequirePermissionRoute>
            </EnabledRoute>
          } />
          
          {/* Cash Box Routes - Requires cashbox.manage permission */}
          <Route path="/cash-box" element={
            <EnabledRoute path="/cash-box">
              <RequirePermissionRoute permission={PERMISSIONS.CASHBOX_MANAGE}>
                <Suspense fallback={<RouteLoading />}>
                  <CashBox />
                </Suspense>
              </RequirePermissionRoute>
            </EnabledRoute>
          } />
          
          {/* Admin Cash Box Routes - Requires users.permissions permission */}
          <Route path="/admin-cash-box" element={
            <EnabledRoute path="/admin-cash-box">
              <RequirePermissionRoute permission={PERMISSIONS.USERS_PERMISSIONS}>
                <Suspense fallback={<RouteLoading />}>
                  <AdminCashBox />
                </Suspense>
              </RequirePermissionRoute>
            </EnabledRoute>
          } />
          
          {/* Dashboard Charts Routes - Requires dashboard.view permission */}
          <Route path="/dashboard-charts" element={
            <EnabledRoute path="/dashboard-charts">
              <RequirePermissionRoute permission={PERMISSIONS.DASHBOARD_VIEW}>
                <Suspense fallback={<RouteLoading />}>
                  <DashboardCharts />
                </Suspense>
              </RequirePermissionRoute>
            </EnabledRoute>
          } />
          
          {/* Admin Profiles Routes - Requires users.permissions permission */}
          <Route path="/admin-profiles" element={
            <RequirePermissionRoute permission={PERMISSIONS.USERS_PERMISSIONS}>
              <Suspense fallback={<RouteLoading />}>
                <AdminProfiles />
              </Suspense>
            </RequirePermissionRoute>
          } />
          
          {/* Representatives Routes (now used for delegates) - Requires users.permissions permission */}
          <Route path="/representatives" element={
            <RequirePermissionRoute permission={PERMISSIONS.USERS_PERMISSIONS}>
              <Suspense fallback={<RouteLoading />}>
                <Representatives />
              </Suspense>
            </RequirePermissionRoute>
          } />
          
          {/* Employees Routes - Requires users.permissions permission */}
          <Route path="/employees" element={
            <RequirePermissionRoute permission={PERMISSIONS.USERS_PERMISSIONS}>
              <Suspense fallback={<RouteLoading />}>
                <Employees />
              </Suspense>
            </RequirePermissionRoute>
          } />
          
          {/* About Routes - No specific permission required */}
          <Route path="/about" element={
            <EnabledRoute path="/about">
              <Suspense fallback={<RouteLoading />}>
                <AboutUs />
              </Suspense>
            </EnabledRoute>
          } />
          
          {/* Settings Routes - Requires settings.manage permission */}
          <Route path="/settings" element={
            <EnabledRoute path="/settings">
              <RequirePermissionRoute permission={PERMISSIONS.SETTINGS_MANAGE}>
                <Suspense fallback={<RouteLoading />}>
                  <Settings />
                </Suspense>
              </RequirePermissionRoute>
            </EnabledRoute>
          } />
        </Route>

        {/* 404 Route */}
        <Route path="*" element={
          <Suspense fallback={<RouteLoading />}>
            <NotFound />
          </Suspense>
        } />
      </Routes>
    </>
  );
};

export default AppRoutes;