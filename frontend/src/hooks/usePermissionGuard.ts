import { useSelector } from 'react-redux';
import { RootState } from '@/app/store';
import { 
  selectHasPermission, 
  selectHasAnyPermission, 
  selectHasAllPermissions,
  selectUserPermissions 
} from '@/features/auth/authSlice';
import { PERMISSIONS, PERMISSION_METADATA, getPermissionName, getPermissionDescription } from '@/constants/permissions';

/**
 * Custom hook for permission-based access control
 * Provides easy access to permission checking functions and metadata
 */
export const usePermissionGuard = () => {
  const userPermissions = useSelector(selectUserPermissions);
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  // Check if user has a specific permission
  const hasPermission = (permissionId: string): boolean => {
    if (!isAuthenticated || !user || !userPermissions) return false;
    return userPermissions.allPermissions.some(permission => 
      permission.permission_id === permissionId
    );
  };

  // Check if user has any of the specified permissions
  const hasAnyPermission = (permissionIds: string[]): boolean => {
    if (!isAuthenticated || !user || !userPermissions) return false;
    return permissionIds.some(permissionId =>
      userPermissions.allPermissions.some(permission => 
        permission.permission_id === permissionId
      )
    );
  };

  // Check if user has all of the specified permissions
  const hasAllPermissions = (permissionIds: string[]): boolean => {
    if (!isAuthenticated || !user || !userPermissions) return false;
    return permissionIds.every(permissionId =>
      userPermissions.allPermissions.some(permission => 
        permission.permission_id === permissionId
      )
    );
  };

  // Get permissions by category
  const getPermissionsByCategory = (category: string) => {
    if (!userPermissions) return [];
    return userPermissions.allPermissions.filter(p => p.category === category);
  };

  // Check if user has role-based permission
  const hasRolePermission = (permissionId: string): boolean => {
    if (!userPermissions) return false;
    return userPermissions.rolePermissions.some(p => p.permission_id === permissionId);
  };

  // Check if user has custom permission
  const hasCustomPermission = (permissionId: string): boolean => {
    if (!userPermissions) return false;
    return userPermissions.customPermissions.some(p => p.permission_id === permissionId);
  };

  // Get permission source (role or custom)
  const getPermissionSource = (permissionId: string): 'role' | 'custom' | null => {
    if (!userPermissions) return null;
    
    if (userPermissions.customPermissions.some(p => p.permission_id === permissionId)) {
      return 'custom';
    }
    
    if (userPermissions.rolePermissions.some(p => p.permission_id === permissionId)) {
      return 'role';
    }
    
    return null;
  };

  // Get permission metadata
  const getPermissionInfo = (permissionId: string) => {
    const metadata = PERMISSION_METADATA[permissionId as keyof typeof PERMISSION_METADATA];
    if (!metadata) return null;

    return {
      id: permissionId,
      name: metadata.name,
      description: metadata.description,
      category: metadata.category,
      hasAccess: hasPermission(permissionId),
      source: getPermissionSource(permissionId),
    };
  };

  // Get all user permissions with metadata
  const getAllUserPermissions = () => {
    if (!userPermissions) return [];
    
    return userPermissions.allPermissions.map(permission => ({
      ...permission,
      metadata: PERMISSION_METADATA[permission.permission_id as keyof typeof PERMISSION_METADATA],
      source: getPermissionSource(permission.permission_id),
    }));
  };

  // Check if user can access a specific feature/module
  const canAccess = {
    products: () => hasPermission(PERMISSIONS.PRODUCTS_MANAGE),
    sales: () => hasPermission(PERMISSIONS.SALES_MANAGE),
    customers: () => hasPermission(PERMISSIONS.CUSTOMERS_MANAGE),
    purchases: () => hasPermission(PERMISSIONS.PURCHASES_MANAGE),
    suppliers: () => hasPermission(PERMISSIONS.SUPPLIERS_MANAGE),
    inventory: () => hasPermission(PERMISSIONS.INVENTORY_MANAGE),
    cashbox: () => hasPermission(PERMISSIONS.CASHBOX_MANAGE),
    debts: () => hasPermission(PERMISSIONS.DEBTS_MANAGE),
    installments: () => hasPermission(PERMISSIONS.INSTALLMENTS_MANAGE),
    reports: () => hasPermission(PERMISSIONS.REPORTS_VIEW),
    settings: () => hasPermission(PERMISSIONS.SETTINGS_MANAGE),
    users: () => hasPermission(PERMISSIONS.USERS_MANAGE),
    userPermissions: () => hasPermission(PERMISSIONS.USERS_PERMISSIONS),
    backup: () => hasPermission(PERMISSIONS.BACKUP_MANAGE),
    profile: () => hasPermission(PERMISSIONS.PROFILE_MANAGE),
  };

  // Check if user is admin (has all permissions)
  const isAdmin = (): boolean => {
    if (!userPermissions) return false;
    const allPermissionIds = Object.values(PERMISSIONS);
    return hasAllPermissions(allPermissionIds);
  };

  // Check if user is manager (has most permissions except user management)
  const isManager = (): boolean => {
    if (!userPermissions) return false;
    const managerPermissions = [
      PERMISSIONS.PRODUCTS_MANAGE,
      PERMISSIONS.SALES_MANAGE,
      PERMISSIONS.CUSTOMERS_MANAGE,
      PERMISSIONS.PURCHASES_MANAGE,
      PERMISSIONS.SUPPLIERS_MANAGE,
      PERMISSIONS.INVENTORY_MANAGE,
      PERMISSIONS.CASHBOX_MANAGE,
      PERMISSIONS.DEBTS_MANAGE,
      PERMISSIONS.INSTALLMENTS_MANAGE,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.SETTINGS_MANAGE,
      PERMISSIONS.BACKUP_MANAGE,
      PERMISSIONS.PROFILE_MANAGE,
    ];
    return hasAllPermissions(managerPermissions) && !hasPermission(PERMISSIONS.USERS_MANAGE);
  };

  // Check if user is seller (limited permissions)
  const isSeller = (): boolean => {
    if (!userPermissions) return false;
    const sellerPermissions = [
      PERMISSIONS.PRODUCTS_MANAGE,
      PERMISSIONS.SALES_MANAGE,
      PERMISSIONS.CUSTOMERS_MANAGE,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.PROFILE_MANAGE,
    ];
    return hasAllPermissions(sellerPermissions) && 
           !hasPermission(PERMISSIONS.USERS_MANAGE) && 
           !hasPermission(PERMISSIONS.SETTINGS_MANAGE);
  };

  return {
    // Authentication state
    isAuthenticated,
    user,
    userPermissions,
    
    // Permission checking
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // Permission metadata
    getPermissionInfo,
    getPermissionName,
    getPermissionDescription,
    getPermissionSource,
    
    // Permission grouping
    getPermissionsByCategory,
    getAllUserPermissions,
    
    // Role-based permission checking
    hasRolePermission,
    hasCustomPermission,
    
    // Feature access checking
    canAccess,
    
    // Role checking
    isAdmin,
    isManager,
    isSeller,
    
    // Constants
    PERMISSIONS,
    PERMISSION_METADATA,
  };
}; 