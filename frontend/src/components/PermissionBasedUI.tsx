import React, { ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/store';
import { selectHasPermission, selectHasAnyPermission, selectHasAllPermissions } from '@/features/auth/authSlice';

interface PermissionBasedUIProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  showFallback?: boolean;
}

interface PermissionButtonProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  disabled?: boolean;
  disabledMessage?: string;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

interface PermissionLinkProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

interface PermissionMenuItemProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

const PermissionBasedUI: React.FC<PermissionBasedUIProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback,
  showFallback = false
}) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  // If not authenticated, show fallback or nothing
  if (!isAuthenticated || !user) {
    return showFallback ? <>{fallback}</> : null;
  }

  let hasAccess = false;

  // Single permission check
  if (permission) {
    hasAccess = useSelector(selectHasPermission(permission));
  }
  // Multiple permissions check
  else if (permissions && permissions.length > 0) {
    if (requireAll) {
      hasAccess = useSelector(selectHasAllPermissions(permissions));
    } else {
      hasAccess = useSelector(selectHasAnyPermission(permissions));
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

  // Show fallback if provided and showFallback is true
  if (showFallback && fallback) {
    return <>{fallback}</>;
  }

  // Otherwise, render nothing
  return null;
};

// Permission-based button component
export const PermissionButton: React.FC<PermissionButtonProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback,
  disabled = false,
  disabledMessage = 'ليس لديك صلاحية لتنفيذ هذا الإجراء',
  onClick,
  className,
  variant = 'default',
  size = 'default',
  ...props
}) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  let hasAccess = false;

  if (isAuthenticated && user) {
    if (permission) {
      hasAccess = useSelector(selectHasPermission(permission));
    } else if (permissions && permissions.length > 0) {
      if (requireAll) {
        hasAccess = useSelector(selectHasAllPermissions(permissions));
      } else {
        hasAccess = useSelector(selectHasAnyPermission(permissions));
      }
    } else {
      hasAccess = true;
    }
  }

  // If no access, show fallback or nothing
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return null;
  }

  // If disabled, show disabled button with message
  if (disabled) {
    return (
      <button
        className={`btn btn-${variant} btn-${size} ${className || ''}`}
        disabled
        title={disabledMessage}
        {...props}
      >
        {children}
      </button>
    );
  }

  // Render normal button
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${className || ''}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

// Permission-based link component
export const PermissionLink: React.FC<PermissionLinkProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback,
  href,
  onClick,
  className,
  disabled = false
}) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  let hasAccess = false;

  if (isAuthenticated && user) {
    if (permission) {
      hasAccess = useSelector(selectHasPermission(permission));
    } else if (permissions && permissions.length > 0) {
      if (requireAll) {
        hasAccess = useSelector(selectHasAllPermissions(permissions));
      } else {
        hasAccess = useSelector(selectHasAnyPermission(permissions));
      }
    } else {
      hasAccess = true;
    }
  }

  // If no access, show fallback or nothing
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return null;
  }

  // If disabled, show disabled link
  if (disabled) {
    return (
      <span className={`text-gray-400 cursor-not-allowed ${className || ''}`}>
        {children}
      </span>
    );
  }

  // Render normal link
  return (
    <a
      href={href}
      onClick={onClick}
      className={`text-blue-600 hover:text-blue-800 cursor-pointer ${className || ''}`}
    >
      {children}
    </a>
  );
};

// Permission-based menu item component
export const PermissionMenuItem: React.FC<PermissionMenuItemProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback,
  onClick,
  className,
  disabled = false
}) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  let hasAccess = false;

  if (isAuthenticated && user) {
    if (permission) {
      hasAccess = useSelector(selectHasPermission(permission));
    } else if (permissions && permissions.length > 0) {
      if (requireAll) {
        hasAccess = useSelector(selectHasAllPermissions(permissions));
      } else {
        hasAccess = useSelector(selectHasAnyPermission(permissions));
      }
    } else {
      hasAccess = true;
    }
  }

  // If no access, show fallback or nothing
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return null;
  }

  // If disabled, show disabled menu item
  if (disabled) {
    return (
      <div className={`menu-item disabled text-gray-400 cursor-not-allowed ${className || ''}`}>
        {children}
      </div>
    );
  }

  // Render normal menu item
  return (
    <div
      className={`menu-item cursor-pointer hover:bg-gray-100 ${className || ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// Export convenience components
export const RequirePermissionUI: React.FC<{ children: ReactNode; permission: string; fallback?: ReactNode }> = ({ 
  children, 
  permission, 
  fallback 
}) => (
  <PermissionBasedUI permission={permission} fallback={fallback}>
    {children}
  </PermissionBasedUI>
);

export const RequireAnyPermissionUI: React.FC<{ children: ReactNode; permissions: string[]; fallback?: ReactNode }> = ({ 
  children, 
  permissions, 
  fallback 
}) => (
  <PermissionBasedUI permissions={permissions} requireAll={false} fallback={fallback}>
    {children}
  </PermissionBasedUI>
);

export const RequireAllPermissionsUI: React.FC<{ children: ReactNode; permissions: string[]; fallback?: ReactNode }> = ({ 
  children, 
  permissions, 
  fallback 
}) => (
  <PermissionBasedUI permissions={permissions} requireAll={true} fallback={fallback}>
    {children}
  </PermissionBasedUI>
);

export default PermissionBasedUI; 