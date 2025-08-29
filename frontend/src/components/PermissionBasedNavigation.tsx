import React, { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/store';
import { selectHasPermission, selectHasAnyPermission, selectHasAllPermissions } from '@/features/auth/authSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Shield, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import AccessDeniedMessage from './AccessDeniedMessage';

// Route to permission mapping
export const ROUTE_PERMISSIONS = {
  '/pos': 'sales.manage',
  '/sales': 'sales.manage',
  '/purchases': 'purchases.manage',
  '/inventory': 'inventory.manage',
  '/stocks': 'inventory.manage',
  '/stock-movements': 'inventory.manage',
  '/customers': 'customers.manage',
  '/suppliers': 'suppliers.manage',
  '/expenses': 'settings.manage',
  '/bills': 'sales.manage',
  '/reports': 'reports.view',
  '/debts': 'debts.manage',
  '/installments': 'installments.manage',
  '/customer-receipts': 'customers.manage',
  '/supplier-payment-receipts': 'suppliers.manage',
  '/settings': 'settings.manage',
  '/admin-profiles': 'users.manage',
} as const;

interface PermissionBasedLinkProps {
  to: string;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  showAccessDenied?: boolean;
  accessDeniedMessage?: string;
  fallback?: ReactNode;
  disabled?: boolean;
  disabledMessage?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

interface PermissionBasedButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  showAccessDenied?: boolean;
  accessDeniedMessage?: string;
  fallback?: ReactNode;
  disabled?: boolean;
  disabledMessage?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

interface PermissionBasedNavigationProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  showAccessDenied?: boolean;
  accessDeniedMessage?: string;
}

const PermissionBasedNavigation: React.FC<PermissionBasedNavigationProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback,
  showAccessDenied = true,
  accessDeniedMessage = 'ليس لديك صلاحية للوصول إلى هذه الصفحة'
}) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  // Always call hooks, but use empty arrays/strings as fallbacks
  const hasSinglePermission = useSelector(selectHasPermission(permission || ''));
  const hasAnyPermission = useSelector(selectHasAnyPermission(permissions || []));
  const hasAllPermissions = useSelector(selectHasAllPermissions(permissions || []));
  
  // If not authenticated, show fallback or nothing
  if (!isAuthenticated || !user) {
    return showAccessDenied ? <>{fallback}</> : null;
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

  // Show fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Otherwise, render nothing
  return null;
};

// Permission-based link component
export const PermissionBasedLink: React.FC<PermissionBasedLinkProps> = ({
  to,
  children,
  className,
  style,
  onClick,
  showAccessDenied = true,
  accessDeniedMessage = 'ليس لديك صلاحية للوصول إلى هذه الصفحة',
  fallback,
  disabled = false,
  disabledMessage = 'هذا الرابط معطل',
  variant = 'default',
  size = 'default'
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [showAccessDeniedDialog, setShowAccessDeniedDialog] = React.useState(false);
  
  // Get permission for this route
  const requiredPermission = ROUTE_PERMISSIONS[to as keyof typeof ROUTE_PERMISSIONS];
  
  // Always call the hook, but use empty string as fallback
  const hasPermission = useSelector(selectHasPermission(requiredPermission || ''));
  
  let hasAccess = false;

  if (isAuthenticated && user) {
    if (requiredPermission) {
      hasAccess = hasPermission;
    } else {
      hasAccess = true; // No permission required for this route
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    if (!hasAccess) {
      e.preventDefault();
      if (showAccessDenied) {
        setShowAccessDeniedDialog(true);
      }
      return;
    }
    
    if (onClick) {
      onClick();
    }
  };

  // If no access and fallback is provided, show fallback
  if (!hasAccess && fallback) {
    return <>{fallback}</>;
  }

  // If no access and no fallback, show disabled link or nothing
  if (!hasAccess) {
    if (showAccessDenied) {
      return (
        <>
          <div className="relative rounded-2xl" style={style}>
            <button
              onClick={handleClick}
              className={cn(
                'flex items-center justify-center transition-colors cursor-pointer opacity-50 w-full h-full z-10 rounded-2xl',
                className
              )}
              title={accessDeniedMessage}
            >
              {children}
            </button>
            <Lock className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 z-10" />
          </div>
          
          <Dialog open={showAccessDeniedDialog} onOpenChange={setShowAccessDeniedDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col justify-center items-center overflow-y-auto">
              <AccessDeniedMessage 
                route={to}
                message={accessDeniedMessage}
                showBackButton={false}
                showHomeButton={false}
                className="min-h-0 p-0 bg-transparent"
              />
             
            </DialogContent>
          </Dialog>
        </>
      );
    }
    return null;
  }

  // If disabled, show disabled link
  if (disabled) {
    return (
      <span 
        className={cn(
          'flex items-center gap-2 px-4 py-2 opacity-50 cursor-not-allowed',
          className
        )}
        title={disabledMessage}
      >
        {children}
        <X className="w-4 h-4" />
      </span>
    );
  }

  // Render normal link
  return (
    <Link
      to={to}
      className={className}
      style={style}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
};

// Permission-based button component
export const PermissionBasedButton: React.FC<PermissionBasedButtonProps> = ({
  children,
  onClick,
  className,
  showAccessDenied = true,
  accessDeniedMessage = 'ليس لديك صلاحية لتنفيذ هذا الإجراء',
  fallback,
  disabled = false,
  disabledMessage = 'هذا الزر معطل',
  variant = 'default',
  size = 'default'
}) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [showAccessDeniedDialog, setShowAccessDeniedDialog] = React.useState(false);
  
  // Always call the hook with the permissions array
  const hasAnyPermission = useSelector(selectHasAnyPermission([
    'sales.manage',
    'purchases.manage',
    'inventory.manage',
    'customers.manage',
    'suppliers.manage',
    'settings.manage',
    'reports.view',
    'debts.manage',
    'installments.manage',
    'users.manage'
  ]));
  
  let hasAccess = false;

  if (isAuthenticated && user) {
    // For buttons, we need to check if user has any relevant permissions
    hasAccess = hasAnyPermission;
  }

  const handleClick = () => {
    if (!hasAccess) {
      if (showAccessDenied) {
        setShowAccessDeniedDialog(true);
      }
      return;
    }
    
    if (onClick) {
      onClick();
    }
  };

  // If no access and fallback is provided, show fallback
  if (!hasAccess && fallback) {
    return <>{fallback}</>;
  }

  // If no access and no fallback, show disabled button or nothing
  if (!hasAccess) {
    if (showAccessDenied) {
      return (
        <>
          <Button
            variant={variant}
            size={size}
            className={cn('opacity-50', className)}
            onClick={handleClick}
            title={accessDeniedMessage}
          >
            {children}
            <Lock className="w-4 h-4 ml-2" />
          </Button>
          
          <Dialog open={showAccessDeniedDialog} onOpenChange={setShowAccessDeniedDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <AccessDeniedMessage 
                message={accessDeniedMessage}
                showBackButton={false}
                showHomeButton={false}
                className="min-h-0 p-0 bg-transparent"
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAccessDeniedDialog(false)}
                >
                  إغلاق
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      );
    }
    return null;
  }

  // If disabled, show disabled button
  if (disabled) {
    return (
      <Button
        variant={variant}
        size={size}
        className={cn('opacity-50 cursor-not-allowed', className)}
        disabled
        title={disabledMessage}
      >
        {children}
        <X className="w-4 h-4 ml-2" />
      </Button>
    );
  }

  // Render normal button
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
    >
      {children}
    </Button>
  );
};

// Helper function to check if user has permission for a route
export const hasRoutePermission = (route: string): boolean => {
  const requiredPermission = ROUTE_PERMISSIONS[route as keyof typeof ROUTE_PERMISSIONS];
  if (!requiredPermission) return true; // No permission required
  
  // This would need to be used within a component that has access to Redux state
  // For now, return true and let the component handle the actual check
  return true;
};

// Helper function to get permission for a route
export const getRoutePermission = (route: string): string | null => {
  return ROUTE_PERMISSIONS[route as keyof typeof ROUTE_PERMISSIONS] || null;
};

export default PermissionBasedNavigation; 