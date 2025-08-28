import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/store';
import { usePermissionGuard } from '@/hooks/usePermissionGuard';
import { PERMISSIONS } from '@/constants/permissions';

const PermissionTest: React.FC = () => {
  const { user, isAuthenticated, userPermissions } = useSelector((state: RootState) => state.auth);
  const { hasPermission, getAllUserPermissions } = usePermissionGuard();

  const allUserPermissions = getAllUserPermissions();

  return (
    <div className="p-8 bg-white">
      <h1 className="text-2xl font-bold mb-6">🔧 Permission Test Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Authentication Status */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Authentication Status:</h2>
          <div className="space-y-2">
            <p><strong>Is Authenticated:</strong> {isAuthenticated ? '✅ Yes' : '❌ No'}</p>
            <p><strong>User:</strong> {user?.name || 'No user'}</p>
            <p><strong>Role:</strong> {user?.role || 'No role'}</p>
            <p><strong>User ID:</strong> {user?.id || 'No ID'}</p>
          </div>
        </div>

        {/* Permissions Status */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Permissions Status:</h2>
          <div className="space-y-2">
            <p><strong>Has User Permissions:</strong> {userPermissions ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Total Permissions:</strong> {userPermissions?.allPermissions?.length || 0}</p>
            <p><strong>Role Permissions:</strong> {userPermissions?.rolePermissions?.length || 0}</p>
            <p><strong>Custom Permissions:</strong> {userPermissions?.customPermissions?.length || 0}</p>
          </div>
        </div>

        {/* Permission Tests */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Permission Tests:</h2>
          <div className="space-y-2">
            <p><strong>sales.manage:</strong> {hasPermission(PERMISSIONS.SALES_MANAGE) ? '✅ Yes' : '❌ No'}</p>
            <p><strong>products.manage:</strong> {hasPermission(PERMISSIONS.PRODUCTS_MANAGE) ? '✅ Yes' : '❌ No'}</p>
            <p><strong>customers.manage:</strong> {hasPermission(PERMISSIONS.CUSTOMERS_MANAGE) ? '✅ Yes' : '❌ No'}</p>
            <p><strong>inventory.manage:</strong> {hasPermission(PERMISSIONS.INVENTORY_MANAGE) ? '✅ Yes' : '❌ No'}</p>
            <p><strong>reports.view:</strong> {hasPermission(PERMISSIONS.REPORTS_VIEW) ? '✅ Yes' : '❌ No'}</p>
            <p><strong>settings.manage:</strong> {hasPermission(PERMISSIONS.SETTINGS_MANAGE) ? '✅ Yes' : '❌ No'}</p>
          </div>
        </div>

        {/* All User Permissions */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">All User Permissions:</h2>
          <div className="max-h-64 overflow-y-auto">
            {allUserPermissions.length > 0 ? (
              <ul className="space-y-1">
                {allUserPermissions.map((permission, index) => (
                  <li key={`${permission.permission_id}-${permission.source}-${index}`} className="flex justify-between items-center text-sm">
                    <span>{permission.permission_id}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      permission.source === 'role' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {permission.source}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No permissions found</p>
            )}
          </div>
        </div>
      </div>

      {/* Test Links */}
      <div className="mt-8 bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Test Links:</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a href="/dashboard" className="block p-3 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-center">
            Dashboard (No permissions)
          </a>
          <a href="/pos" className="block p-3 bg-green-100 text-green-800 rounded hover:bg-green-200 text-center">
            POS (Requires sales.manage)
          </a>
          <a href="/sales" className="block p-3 bg-green-100 text-green-800 rounded hover:bg-green-200 text-center">
            Sales (Requires sales.manage)
          </a>
          <a href="/inventory" className="block p-3 bg-green-100 text-green-800 rounded hover:bg-green-200 text-center">
            Inventory (Requires inventory.manage)
          </a>
        </div>
      </div>

      {/* Raw Data */}
      <div className="mt-8 bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Raw Permission Data:</h2>
        <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-64">
          {JSON.stringify(userPermissions, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default PermissionTest; 