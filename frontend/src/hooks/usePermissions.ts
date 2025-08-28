import { useSelector } from 'react-redux';
import { 
  selectHasPermission, 
  selectHasAnyPermission, 
  selectHasAllPermissions,
  selectUserPermissions 
} from '../features/auth/authSlice';

/**
 * Custom hook for permission checking
 * Provides easy access to permission checking functions
 */
export const usePermissions = () => {
  const userPermissions = useSelector(selectUserPermissions);

  const hasPermission = (permissionId: string): boolean => {
    return useSelector(selectHasPermission(permissionId));
  };

  const hasAnyPermission = (permissionIds: string[]): boolean => {
    return useSelector(selectHasAnyPermission(permissionIds));
  };

  const hasAllPermissions = (permissionIds: string[]): boolean => {
    return useSelector(selectHasAllPermissions(permissionIds));
  };

  const getPermissionsByCategory = (category: string) => {
    if (!userPermissions) return [];
    return userPermissions.allPermissions.filter(p => p.category === category);
  };

  const hasRolePermission = (permissionId: string): boolean => {
    if (!userPermissions) return false;
    return userPermissions.rolePermissions.some(p => p.permission_id === permissionId);
  };

  const hasCustomPermission = (permissionId: string): boolean => {
    if (!userPermissions) return false;
    return userPermissions.customPermissions.some(p => p.permission_id === permissionId);
  };

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

  return {
    // Permission checking
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRolePermission,
    hasCustomPermission,
    
    // Permission data
    userPermissions,
    getPermissionsByCategory,
    getPermissionSource,
    
    // User role
    userRole: userPermissions?.role || null,
    
    // Permission counts
    totalPermissions: userPermissions?.allPermissions.length || 0,
    rolePermissions: userPermissions?.rolePermissions.length || 0,
    customPermissions: userPermissions?.customPermissions.length || 0,
  };
};
