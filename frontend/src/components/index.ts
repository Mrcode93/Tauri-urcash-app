// Permission Guard System Exports

// Main PermissionGuard component
export { default as PermissionGuard } from './PermissionGuard';
export { 
  RequirePermission, 
  RequireAnyPermission, 
  RequireAllPermissions,
  withPermission,
  withAnyPermission,
  withAllPermissions 
} from './PermissionGuard';

// ProtectedRoute components
export { default as ProtectedRoute } from './ProtectedRoute';
export {
  RequireAuth,
  RequirePermissionRoute,
  RequireAnyPermissionRoute,
  RequireAllPermissionsRoute
} from './ProtectedRoute';

// PermissionBasedUI components
export { default as PermissionBasedUI } from './PermissionBasedUI';
export {
  RequirePermissionUI,
  RequireAnyPermissionUI,
  RequireAllPermissionsUI,
  PermissionButton,
  PermissionLink,
  PermissionMenuItem
} from './PermissionBasedUI';

// Permission constants and utilities
export { 
  PERMISSIONS, 
  PERMISSION_CATEGORIES, 
  PERMISSION_METADATA,
  getPermissionName,
  getPermissionDescription,
  getPermissionCategory,
  getPermissionsByCategory,
  type PermissionId,
  type PermissionCategory
} from '@/constants/permissions';

// Permission hook
export { usePermissionGuard } from '@/hooks/usePermissionGuard'; 