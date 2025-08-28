# Permission Guard System Documentation

## Overview

The Permission Guard System provides comprehensive permission-based access control for the Urcash application. It's built on top of the database permissions defined in the server and provides multiple ways to implement permission checks throughout the application.

## Database Permissions

The system is based on the following permissions defined in the database:

```javascript
{
  permission_id: 'products.manage', name: 'إدارة المنتجات', description: 'عرض وإضافة وتعديل وحذف المنتجات', category: 'products',
  permission_id: 'sales.manage', name: 'إدارة المبيعات', description: 'عرض وإنشاء وتعديل وحذف الفواتير والمرتجعات', category: 'sales',
  permission_id: 'customers.manage', name: 'إدارة العملاء', description: 'عرض وإضافة وتعديل وحذف العملاء', category: 'customers',
  permission_id: 'purchases.manage', name: 'إدارة المشتريات', description: 'عرض وإنشاء وتعديل وحذف المشتريات', category: 'purchases',
  permission_id: 'suppliers.manage', name: 'إدارة الموردين', description: 'عرض وإضافة وتعديل وحذف الموردين', category: 'suppliers',
  permission_id: 'inventory.manage', name: 'إدارة المخزون', description: 'عرض وتحريك المخزون', category: 'inventory',
  permission_id: 'cashbox.manage', name: 'إدارة الصندوق', description: 'عرض وإدارة العمليات المالية بالصندوق', category: 'cashbox',
  permission_id: 'debts.manage', name: 'إدارة الديون', description: 'عرض وتسوية الديون والمدفوعات', category: 'debts',
  permission_id: 'installments.manage', name: 'إدارة الأقساط', description: 'عرض وتسوية الأقساط والمدفوعات', category: 'installments',
  permission_id: 'reports.view', name: 'عرض التقارير', description: 'عرض كل أنواع التقارير', category: 'reports',
  permission_id: 'settings.manage', name: 'إعدادات النظام', description: 'عرض وتعديل إعدادات النظام', category: 'settings',
  permission_id: 'users.manage', name: 'إدارة المستخدمين', description: 'إضافة وتعديل صلاحيات المستخدمين', category: 'users',
  permission_id: 'users.permissions', name: 'إدارة صلاحيات المستخدمين', description: 'إدارة صلاحيات المستخدمين', category: 'users',
  permission_id: 'backup.manage', name: 'النسخ الاحتياطي', description: 'إنشاء واستعادة النسخ الاحتياطية', category: 'backup',
  permission_id: 'profile.manage', name: 'إدارة الملف الشخصي', description: 'عرض وتعديل بيانات المستخدم', category: 'profile',
}
```

## Components

### 1. PermissionGuard

The main component for permission-based access control.

```tsx
import PermissionGuard, { 
  RequirePermission, 
  RequireAnyPermission, 
  RequireAllPermissions 
} from '@/components/PermissionGuard';
import { PERMISSIONS } from '@/constants/permissions';

// Single permission check
<RequirePermission permission={PERMISSIONS.PRODUCTS_MANAGE}>
  <div>This content requires products.manage permission</div>
</RequirePermission>

// Multiple permissions - any of them
<RequireAnyPermission permissions={[PERMISSIONS.SALES_MANAGE, PERMISSIONS.CUSTOMERS_MANAGE]}>
  <div>This content requires either sales.manage OR customers.manage</div>
</RequireAnyPermission>

// Multiple permissions - all of them
<RequireAllPermissions permissions={[PERMISSIONS.USERS_MANAGE, PERMISSIONS.USERS_PERMISSIONS]}>
  <div>This content requires BOTH users.manage AND users.permissions</div>
</RequireAllPermissions>
```

### 2. ProtectedRoute

For protecting routes with authentication and permission checks.

```tsx
import ProtectedRoute, {
  RequireAuth,
  RequirePermissionRoute,
  RequireAnyPermissionRoute,
  RequireAllPermissionsRoute
} from '@/components/ProtectedRoute';

// Basic authentication protection
<RequireAuth>
  <YourComponent />
</RequireAuth>

// Route with single permission
<RequirePermissionRoute permission={PERMISSIONS.REPORTS_VIEW}>
  <ReportsPage />
</RequirePermissionRoute>

// Route with multiple permissions
<RequireAnyPermissionRoute permissions={[PERMISSIONS.SETTINGS_MANAGE, PERMISSIONS.BACKUP_MANAGE]}>
  <SettingsPage />
</RequireAnyPermissionRoute>
```

### 3. PermissionBasedUI

For conditionally rendering UI elements based on permissions.

```tsx
import PermissionBasedUI, {
  RequirePermissionUI,
  PermissionButton,
  PermissionLink,
  PermissionMenuItem
} from '@/components/PermissionBasedUI';

// Conditional UI rendering
<RequirePermissionUI permission={PERMISSIONS.CASHBOX_MANAGE}>
  <div className="cashbox-widget">
    <h3>إدارة الصندوق</h3>
    <p>محتوى خاص بإدارة الصندوق</p>
  </div>
</RequirePermissionUI>

// Permission-based button
<PermissionButton 
  permission={PERMISSIONS.PRODUCTS_MANAGE}
  onClick={() => }
  className="btn-primary"
>
  إضافة منتج جديد
</PermissionButton>

// Permission-based link
<PermissionLink 
  permission={PERMISSIONS.CUSTOMERS_MANAGE}
  href="/customers"
  className="text-blue-600"
>
  إدارة العملاء
</PermissionLink>
```

## Hooks

### usePermissionGuard

A comprehensive hook for permission checking and user role detection.

```tsx
import { usePermissionGuard } from '@/hooks/usePermissionGuard';
import { PERMISSIONS } from '@/constants/permissions';

const MyComponent = () => {
  const { 
    hasPermission, 
    canAccess, 
    isAdmin, 
    isManager, 
    isSeller,
    getAllUserPermissions 
  } = usePermissionGuard();

  // Check specific permission
  const canManageProducts = hasPermission(PERMISSIONS.PRODUCTS_MANAGE);

  // Check feature access
  const canAccessSales = canAccess.sales();

  // Check user role
  const isUserAdmin = isAdmin();

  // Get all user permissions with metadata
  const userPermissions = getAllUserPermissions();

  return (
    <div>
      {canManageProducts && <button>Add Product</button>}
      {canAccessSales && <div>Sales Dashboard</div>}
      {isUserAdmin && <div>Admin Panel</div>}
    </div>
  );
};
```

## Higher-Order Components

For wrapping components with permission checks.

```tsx
import { withPermission, withAnyPermission, withAllPermissions } from '@/components/PermissionGuard';

// Wrap component with single permission
const AdminOnlyComponent = withPermission(
  MyComponent, 
  PERMISSIONS.USERS_MANAGE
);

// Wrap component with multiple permissions (any)
const ManagerOrAdminComponent = withAnyPermission(
  MyComponent,
  [PERMISSIONS.SETTINGS_MANAGE, PERMISSIONS.USERS_MANAGE]
);

// Wrap component with multiple permissions (all)
const SuperAdminComponent = withAllPermissions(
  MyComponent,
  [PERMISSIONS.USERS_MANAGE, PERMISSIONS.USERS_PERMISSIONS]
);
```

## Constants

### PERMISSIONS

All available permissions as constants.

```tsx
import { PERMISSIONS } from '@/constants/permissions';

// Available permissions:
PERMISSIONS.PRODUCTS_MANAGE
PERMISSIONS.SALES_MANAGE
PERMISSIONS.CUSTOMERS_MANAGE
PERMISSIONS.PURCHASES_MANAGE
PERMISSIONS.SUPPLIERS_MANAGE
PERMISSIONS.INVENTORY_MANAGE
PERMISSIONS.CASHBOX_MANAGE
PERMISSIONS.DEBTS_MANAGE
PERMISSIONS.INSTALLMENTS_MANAGE
PERMISSIONS.REPORTS_VIEW
PERMISSIONS.SETTINGS_MANAGE
PERMISSIONS.USERS_MANAGE
PERMISSIONS.USERS_PERMISSIONS
PERMISSIONS.BACKUP_MANAGE
PERMISSIONS.PROFILE_MANAGE
```

### PERMISSION_CATEGORIES

Permission categories for grouping.

```tsx
import { PERMISSION_CATEGORIES } from '@/constants/permissions';

PERMISSION_CATEGORIES.PRODUCTS
PERMISSION_CATEGORIES.SALES
PERMISSION_CATEGORIES.CUSTOMERS
// ... etc
```

## Usage Examples

### 1. Navigation Menu

```tsx
const NavigationMenu = () => {
  const { canAccess } = usePermissionGuard();

  return (
    <nav>
      <RequirePermissionUI permission={PERMISSIONS.PRODUCTS_MANAGE}>
        <Link to="/products">المنتجات</Link>
      </RequirePermissionUI>
      
      <RequirePermissionUI permission={PERMISSIONS.SALES_MANAGE}>
        <Link to="/sales">المبيعات</Link>
      </RequirePermissionUI>
      
      <RequirePermissionUI permission={PERMISSIONS.CUSTOMERS_MANAGE}>
        <Link to="/customers">العملاء</Link>
      </RequirePermissionUI>
      
      {/* ... more menu items */}
    </nav>
  );
};
```

### 2. Dashboard Widgets

```tsx
const DashboardWidgets = () => {
  return (
    <div className="widgets-grid">
      <RequirePermissionUI permission={PERMISSIONS.SALES_MANAGE}>
        <div className="widget sales-widget">
          <h3>المبيعات</h3>
          <p>إجمالي المبيعات اليوم: 1,500 ريال</p>
          <PermissionButton 
            permission={PERMISSIONS.SALES_MANAGE}
            onClick={() => navigate('/sales')}
          >
            عرض التفاصيل
          </PermissionButton>
        </div>
      </RequirePermissionUI>

      <RequirePermissionUI permission={PERMISSIONS.INVENTORY_MANAGE}>
        <div className="widget inventory-widget">
          <h3>المخزون</h3>
          <p>المنتجات منخفضة المخزون: 5 منتجات</p>
        </div>
      </RequirePermissionUI>
    </div>
  );
};
```

### 3. Route Protection

```tsx
// In your routes file
const routes = [
  {
    path: '/products',
    element: (
      <RequirePermissionRoute permission={PERMISSIONS.PRODUCTS_MANAGE}>
        <ProductsPage />
      </RequirePermissionRoute>
    )
  },
  {
    path: '/reports',
    element: (
      <RequirePermissionRoute permission={PERMISSIONS.REPORTS_VIEW}>
        <ReportsPage />
      </RequirePermissionRoute>
    )
  },
  {
    path: '/settings',
    element: (
      <RequirePermissionRoute permission={PERMISSIONS.SETTINGS_MANAGE}>
        <SettingsPage />
      </RequirePermissionRoute>
    )
  }
];
```

### 4. Action Buttons

```tsx
const ProductActions = () => {
  return (
    <div className="product-actions">
      <PermissionButton 
        permission={PERMISSIONS.PRODUCTS_MANAGE}
        onClick={() => setShowAddModal(true)}
        className="btn-primary"
      >
        إضافة منتج جديد
      </PermissionButton>
      
      <PermissionButton 
        permission={PERMISSIONS.PRODUCTS_MANAGE}
        onClick={() => handleEdit()}
        className="btn-secondary"
      >
        تعديل المنتج
      </PermissionButton>
      
      <PermissionButton 
        permission={PERMISSIONS.PRODUCTS_MANAGE}
        onClick={() => handleDelete()}
        className="btn-danger"
      >
        حذف المنتج
      </PermissionButton>
    </div>
  );
};
```

## Best Practices

1. **Use constants**: Always use `PERMISSIONS` constants instead of hardcoded strings
2. **Check permissions early**: Implement permission checks at the route level when possible
3. **Provide fallbacks**: Use fallback content for users without permissions
4. **Group related permissions**: Use `RequireAnyPermission` for related features
5. **Document permissions**: Keep permission requirements documented in component comments
6. **Test thoroughly**: Test all permission combinations to ensure proper access control

## Error Handling

The system provides graceful handling for:
- Unauthenticated users (redirects to login)
- Users without required permissions (shows access denied page)
- Missing permission data (shows loading state)
- Invalid permission IDs (graceful fallback)

## Performance Considerations

- Permission checks are memoized using Redux selectors
- User permissions are cached in Redux store
- Components only re-render when permission state changes
- Permission metadata is statically defined for fast access

## Migration Guide

If migrating from the old permission system:

1. Replace old permission constants with new `PERMISSIONS` constants
2. Update permission checks to use new components
3. Replace role-based checks with permission-based checks
4. Update route protection to use new `ProtectedRoute` components
5. Test all permission combinations thoroughly 