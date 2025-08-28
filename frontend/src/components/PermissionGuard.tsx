import React, { ReactNode, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/store';
import { selectHasPermission, selectHasAnyPermission, selectHasAllPermissions } from '@/features/auth/authSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface PermissionGuardProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  redirectTo?: string;
  showAccessDenied?: boolean;
  accessDeniedMessage?: string;
}

interface PermissionGuardMultipleProps {
  children: ReactNode;
  permissions: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  redirectTo?: string;
  showAccessDenied?: boolean;
  accessDeniedMessage?: string;
}

interface PermissionGuardSingleProps {
  children: ReactNode;
  permission: string;
  fallback?: ReactNode;
  redirectTo?: string;
  showAccessDenied?: boolean;
  accessDeniedMessage?: string;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback,
  redirectTo,
  showAccessDenied = true,
  accessDeniedMessage = 'ليس لديك صلاحية للوصول إلى هذه الصفحة'
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  // Always call useSelector hooks to maintain hook order
  const hasSinglePermission = useSelector(selectHasPermission(permission || ''));
  const hasAllPermissions = useSelector(selectHasAllPermissions(permissions || []));
  const hasAnyPermission = useSelector(selectHasAnyPermission(permissions || []));
  
  // Handle redirects with useEffect (always called)
  useEffect(() => {
    if (redirectTo && (!isAuthenticated || !user)) {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, redirectTo, isAuthenticated, user]);

  // Check if user is authenticated
  if (!isAuthenticated || !user) {
    if (redirectTo) {
      return null;
    }
    return fallback || null;
  }

  let hasAccess = false;

  // Single permission check
  if (permission) {
    hasAccess = hasSinglePermission;
  }
  // Multiple permissions check
  else if (permissions && permissions.length > 0) {
    if (requireAll) {
      hasAccess = hasAllPermissions;
    } else {
      hasAccess = hasAnyPermission;
    }
  }
  // No permissions specified - allow access
  else {
    hasAccess = true;
  }

  // If user has access, render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // Handle access denied with redirect
  if (redirectTo) {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showAccessDenied) {
    return null;
  }

  // Default access denied UI
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-xl font-bold text-gray-900">
            الوصول مرفوض
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            {accessDeniedMessage}
          </p>
  
        </CardContent>
      </Card>
    </div>
  );
};

// Convenience components for different use cases
export const RequirePermission: React.FC<PermissionGuardSingleProps> = (props) => (
  <PermissionGuard {...props} />
);

export const RequireAnyPermission: React.FC<PermissionGuardMultipleProps> = (props) => (
  <PermissionGuard {...props} requireAll={false} />
);

export const RequireAllPermissions: React.FC<PermissionGuardMultipleProps> = (props) => (
  <PermissionGuard {...props} requireAll={true} />
);

// Higher-order component for wrapping components with permission checks
export const withPermission = <P extends object>(
  Component: React.ComponentType<P>,
  permission: string,
  fallback?: ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <RequirePermission permission={permission} fallback={fallback}>
      <Component {...props} />
    </RequirePermission>
  );
  
  WrappedComponent.displayName = `withPermission(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

export const withAnyPermission = <P extends object>(
  Component: React.ComponentType<P>,
  permissions: string[],
  fallback?: ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <RequireAnyPermission permissions={permissions} fallback={fallback}>
      <Component {...props} />
    </RequireAnyPermission>
  );
  
  WrappedComponent.displayName = `withAnyPermission(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

export const withAllPermissions = <P extends object>(
  Component: React.ComponentType<P>,
  permissions: string[],
  fallback?: ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <RequireAllPermissions permissions={permissions} fallback={fallback}>
      <Component {...props} />
    </RequireAllPermissions>
  );
  
  WrappedComponent.displayName = `withAllPermissions(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

export default PermissionGuard; 