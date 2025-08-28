import React from 'react';
import { Link } from 'react-router-dom';
import { PERMISSIONS } from '@/constants/permissions';
import PermissionGuard, { 
  RequirePermission, 
  RequireAnyPermission, 
  RequireAllPermissions,
  withPermission,
  withAnyPermission,
  withAllPermissions 
} from '@/components/PermissionGuard';
import ProtectedRoute, {
  RequireAuth,
  RequirePermissionRoute,
  RequireAnyPermissionRoute,
  RequireAllPermissionsRoute
} from '@/components/ProtectedRoute';
import PermissionBasedUI, {
  RequirePermissionUI,
  RequireAnyPermissionUI,
  RequireAllPermissionsUI,
  PermissionButton,
  PermissionLink,
  PermissionMenuItem
} from '@/components/PermissionBasedUI';
import { usePermissionGuard } from '@/hooks/usePermissionGuard';

// Example 1: Basic Permission Guard Usage
const BasicPermissionExample: React.FC = () => {
  return (
    <div>
      <h2>Basic Permission Examples</h2>
      
      {/* Single permission check */}
      <RequirePermission permission={PERMISSIONS.PRODUCTS_VIEW}>
        <div>This content is only visible to users with products.view permission</div>
      </RequirePermission>

      {/* Multiple permissions - any of them */}
      <RequireAnyPermission permissions={[PERMISSIONS.SALES_VIEW, PERMISSIONS.CUSTOMERS_VIEW]}>
        <div>This content is visible to users with either sales.view OR customers.view</div>
      </RequireAnyPermission>

      {/* Multiple permissions - all of them */}
      <RequireAllPermissions permissions={[PERMISSIONS.USERS_PERMISSIONS, PERMISSIONS.SETTINGS_MANAGE]}>
        <div>This content is only visible to users with BOTH users.permissions AND settings.manage</div>
      </RequireAllPermissions>
    </div>
  );
};

// Example 2: Route Protection
const RouteProtectionExample: React.FC = () => {
  return (
    <div>
      <h2>Route Protection Examples</h2>
      
      {/* Protected route with single permission */}
      <RequirePermissionRoute permission={PERMISSIONS.REPORTS_VIEW}>
        <div>Reports Page Content</div>
      </RequirePermissionRoute>

      {/* Protected route with multiple permissions */}
      <RequireAnyPermissionRoute permissions={[PERMISSIONS.SETTINGS_MANAGE, PERMISSIONS.BACKUP_MANAGE]}>
        <div>Settings or Backup Page Content</div>
      </RequireAnyPermissionRoute>
    </div>
  );
};

// Example 3: UI Elements with Permissions
const UIPermissionExample: React.FC = () => {
  return (
    <div>
      <h2>UI Permission Examples</h2>
      
      {/* Permission-based button */}
      <PermissionButton 
        permission={PERMISSIONS.PRODUCTS_ADD}
        onClick={() => }
        className="btn-primary"
      >
        إضافة منتج جديد
      </PermissionButton>

      {/* Permission-based link */}
      <PermissionLink 
        permission={PERMISSIONS.CUSTOMERS_VIEW}
        href="/customers"
        className="text-blue-600"
      >
        إدارة العملاء
      </PermissionLink>

      {/* Permission-based menu item */}
      <PermissionMenuItem 
        permission={PERMISSIONS.REPORTS_VIEW}
        onClick={() => }
      >
        التقارير
      </PermissionMenuItem>

      {/* Conditional UI rendering */}
      <RequirePermissionUI permission={PERMISSIONS.CASHBOX_VIEW}>
        <div className="cashbox-widget">
          <h3>عرض الصندوق</h3>
          <p>محتوى خاص بعرض الصندوق</p>
        </div>
      </RequirePermissionUI>
    </div>
  );
};

// Example 4: Higher-Order Components
const AdminOnlyComponent: React.FC = () => {
  return <div>This component is only for admins</div>;
};

const ManagerOrAdminComponent: React.FC = () => {
  return <div>This component is for managers or admins</div>;
};

// Wrap components with permission checks
const AdminOnlyComponentWithGuard = withPermission(
  AdminOnlyComponent, 
  PERMISSIONS.USERS_PERMISSIONS
);

const ManagerOrAdminComponentWithGuard = withAnyPermission(
  ManagerOrAdminComponent,
  [PERMISSIONS.SETTINGS_MANAGE, PERMISSIONS.USERS_PERMISSIONS]
);

// Example 5: Using the Hook
const HookExample: React.FC = () => {
  const { 
    hasPermission, 
    canAccess, 
    isAdmin, 
    isManager, 
    isSeller,
    getAllUserPermissions 
  } = usePermissionGuard();

  const userPermissions = getAllUserPermissions();

  return (
    <div>
      <h2>Hook Examples</h2>
      
      <div>
        <h3>User Role:</h3>
        {isAdmin() && <p>Admin User</p>}
        {isManager() && <p>Manager User</p>}
        {isSeller() && <p>Seller User</p>}
      </div>

      <div>
        <h3>Feature Access:</h3>
        <p>Can access products: {canAccess.products() ? 'Yes' : 'No'}</p>
        <p>Can access sales: {canAccess.sales() ? 'Yes' : 'No'}</p>
        <p>Can access reports: {canAccess.reports() ? 'Yes' : 'No'}</p>
        <p>Can access settings: {canAccess.settings() ? 'Yes' : 'No'}</p>
      </div>

      <div>
        <h3>Specific Permissions:</h3>
        <p>Has products.view: {hasPermission(PERMISSIONS.PRODUCTS_VIEW) ? 'Yes' : 'No'}</p>
        <p>Has users.permissions: {hasPermission(PERMISSIONS.USERS_PERMISSIONS) ? 'Yes' : 'No'}</p>
      </div>

      <div>
        <h3>All User Permissions:</h3>
        <ul>
          {userPermissions.map(permission => (
            <li key={permission.permission_id}>
              {permission.metadata?.name || permission.permission_id} 
              (Source: {permission.source})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// Example 6: Navigation Menu with Permissions
const NavigationMenuExample: React.FC = () => {
  const { canAccess } = usePermissionGuard();

  return (
    <nav className="navigation-menu">
      <ul>
        <li>
          <RequirePermissionUI permission={PERMISSIONS.PRODUCTS_VIEW}>
            <Link to="/products">المنتجات</Link>
          </RequirePermissionUI>
        </li>
        
        <li>
          <RequirePermissionUI permission={PERMISSIONS.SALES_VIEW}>
            <Link to="/sales">المبيعات</Link>
          </RequirePermissionUI>
        </li>
        
        <li>
          <RequirePermissionUI permission={PERMISSIONS.CUSTOMERS_VIEW}>
            <Link to="/customers">العملاء</Link>
          </RequirePermissionUI>
        </li>
        
        <li>
          <RequirePermissionUI permission={PERMISSIONS.PURCHASES_VIEW}>
            <Link to="/purchases">المشتريات</Link>
          </RequirePermissionUI>
        </li>
        
        <li>
          <RequirePermissionUI permission={PERMISSIONS.SUPPLIERS_VIEW}>
            <Link to="/suppliers">الموردين</Link>
          </RequirePermissionUI>
        </li>
        
        <li>
          <RequirePermissionUI permission={PERMISSIONS.INVENTORY_VIEW}>
            <Link to="/inventory">المخزون</Link>
          </RequirePermissionUI>
        </li>
        
        <li>
          <RequirePermissionUI permission={PERMISSIONS.CASHBOX_VIEW}>
            <Link to="/cashbox">الصندوق</Link>
          </RequirePermissionUI>
        </li>
        
        <li>
          <RequirePermissionUI permission={PERMISSIONS.DEBTS_VIEW}>
            <Link to="/debts">الديون</Link>
          </RequirePermissionUI>
        </li>
        
        <li>
          <RequirePermissionUI permission={PERMISSIONS.INSTALLMENTS_VIEW}>
            <Link to="/installments">الأقساط</Link>
          </RequirePermissionUI>
        </li>
        
        <li>
          <RequirePermissionUI permission={PERMISSIONS.REPORTS_VIEW}>
            <Link to="/reports">التقارير</Link>
          </RequirePermissionUI>
        </li>
        
        <li>
          <RequirePermissionUI permission={PERMISSIONS.SETTINGS_MANAGE}>
            <Link to="/settings">الإعدادات</Link>
          </RequirePermissionUI>
        </li>
        
        <li>
          <RequirePermissionUI permission={PERMISSIONS.USERS_PERMISSIONS}>
            <Link to="/users">المستخدمين</Link>
          </RequirePermissionUI>
        </li>
        
        <li>
          <RequirePermissionUI permission={PERMISSIONS.BACKUP_MANAGE}>
            <Link to="/backup">النسخ الاحتياطي</Link>
          </RequirePermissionUI>
        </li>
      </ul>
    </nav>
  );
};

// Example 7: Dashboard Widgets with Permissions
const DashboardWidgetsExample: React.FC = () => {
  return (
    <div className="dashboard-widgets">
      <h2>Dashboard Widgets</h2>
      
      <div className="widgets-grid">
        {/* Sales Widget */}
        <RequirePermissionUI permission={PERMISSIONS.SALES_VIEW}>
          <div className="widget sales-widget">
            <h3>المبيعات</h3>
            <p>إجمالي المبيعات اليوم: 1,500 ريال</p>
            <PermissionButton 
              permission={PERMISSIONS.SALES_VIEW}
              onClick={() => }
            >
              عرض التفاصيل
            </PermissionButton>
          </div>
        </RequirePermissionUI>

        {/* Inventory Widget */}
        <RequirePermissionUI permission={PERMISSIONS.INVENTORY_VIEW}>
          <div className="widget inventory-widget">
            <h3>المخزون</h3>
            <p>المنتجات منخفضة المخزون: 5 منتجات</p>
            <PermissionButton 
              permission={PERMISSIONS.INVENTORY_VIEW}
              onClick={() => }
            >
              عرض المخزون
            </PermissionButton>
          </div>
        </RequirePermissionUI>

        {/* Cash Box Widget */}
        <RequirePermissionUI permission={PERMISSIONS.CASHBOX_VIEW}>
          <div className="widget cashbox-widget">
            <h3>الصندوق</h3>
            <p>الرصيد الحالي: 2,500 ريال</p>
            <PermissionButton 
              permission={PERMISSIONS.CASHBOX_VIEW}
              onClick={() => }
            >
              عرض الصندوق
            </PermissionButton>
          </div>
        </RequirePermissionUI>

        {/* Reports Widget */}
        <RequirePermissionUI permission={PERMISSIONS.REPORTS_VIEW}>
          <div className="widget reports-widget">
            <h3>التقارير</h3>
            <p>آخر تقرير: تقرير المبيعات الشهري</p>
            <PermissionButton 
              permission={PERMISSIONS.REPORTS_VIEW}
              onClick={() => }
            >
              عرض التقارير
            </PermissionButton>
          </div>
        </RequirePermissionUI>
      </div>
    </div>
  );
};

// Main Examples Component
const PermissionGuardExamples: React.FC = () => {
  return (
    <div className="permission-examples">
      <h1>Permission Guard System Examples</h1>
      
      <BasicPermissionExample />
      <RouteProtectionExample />
      <UIPermissionExample />
      <HookExample />
      <NavigationMenuExample />
      <DashboardWidgetsExample />
      
      {/* HOC Examples */}
      <div>
        <h2>Higher-Order Component Examples</h2>
        <AdminOnlyComponentWithGuard />
        <ManagerOrAdminComponentWithGuard />
      </div>
    </div>
  );
};

export default PermissionGuardExamples; 