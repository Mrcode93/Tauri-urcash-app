import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/store';
import { selectHasPermission, selectHasAnyPermission, selectHasAllPermissions } from '@/features/auth/authSlice';
import PermissionGuard from './PermissionGuard';

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  redirectTo?: string;
  showAccessDenied?: boolean;
  accessDeniedMessage?: string;
  fallback?: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  redirectTo = '/login',
  showAccessDenied = true,
  accessDeniedMessage = 'ليس لديك صلاحية للوصول إلى هذه الصفحة',
  fallback
}) => {
  const location = useLocation();
  const { isAuthenticated, authChecked } = useSelector((state: RootState) => state.auth);

  // If auth is still being checked, show loading
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If no permission requirements, just render children
  if (!permission && (!permissions || permissions.length === 0)) {
    return <>{children}</>;
  }

  // Check permissions using PermissionGuard
  return (
    <PermissionGuard
      permission={permission}
      permissions={permissions}
      requireAll={requireAll}
      redirectTo={redirectTo}
      showAccessDenied={showAccessDenied}
      accessDeniedMessage={accessDeniedMessage}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
};

// Convenience components for different use cases
export const RequireAuth: React.FC<{ children: ReactNode; redirectTo?: string }> = ({ 
  children, 
  redirectTo = '/login' 
}) => (
  <ProtectedRoute redirectTo={redirectTo}>
    {children}
  </ProtectedRoute>
);

export const RequirePermissionRoute: React.FC<{
  children: ReactNode;
  permission: string;
  redirectTo?: string;
  showAccessDenied?: boolean;
  accessDeniedMessage?: string;
}> = ({ 
  children, 
  permission, 
  redirectTo = '/dashboard',
  showAccessDenied = true,
  accessDeniedMessage 
}) => (
  <ProtectedRoute 
    permission={permission}
    redirectTo={redirectTo}
    showAccessDenied={showAccessDenied}
    accessDeniedMessage={accessDeniedMessage}
  >
    {children}
  </ProtectedRoute>
);

export const RequireAnyPermissionRoute: React.FC<{
  children: ReactNode;
  permissions: string[];
  redirectTo?: string;
  showAccessDenied?: boolean;
  accessDeniedMessage?: string;
}> = ({ 
  children, 
  permissions, 
  redirectTo = '/dashboard',
  showAccessDenied = true,
  accessDeniedMessage 
}) => (
  <ProtectedRoute 
    permissions={permissions}
    requireAll={false}
    redirectTo={redirectTo}
    showAccessDenied={showAccessDenied}
    accessDeniedMessage={accessDeniedMessage}
  >
    {children}
  </ProtectedRoute>
);

export const RequireAllPermissionsRoute: React.FC<{
  children: ReactNode;
  permissions: string[];
  redirectTo?: string;
  showAccessDenied?: boolean;
  accessDeniedMessage?: string;
}> = ({ 
  children, 
  permissions, 
  redirectTo = '/dashboard',
  showAccessDenied = true,
  accessDeniedMessage 
}) => (
  <ProtectedRoute 
    permissions={permissions}
    requireAll={true}
    redirectTo={redirectTo}
    showAccessDenied={showAccessDenied}
    accessDeniedMessage={accessDeniedMessage}
  >
    {children}
  </ProtectedRoute>
);

export default ProtectedRoute; 