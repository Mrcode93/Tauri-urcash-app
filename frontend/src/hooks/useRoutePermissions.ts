import { useSelector } from 'react-redux';
import { RootState } from '@/app/store';
import { selectHasPermission } from '@/features/auth/authSlice';
import { ROUTE_PERMISSIONS } from '@/components/PermissionBasedNavigation';

/**
 * Custom hook for checking route permissions
 * Provides easy access to permission checking for specific routes
 */
export const useRoutePermissions = () => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  // Check if user has permission for a specific route
  const hasRoutePermission = (route: string): boolean => {
    if (!isAuthenticated || !user) return false;
    
    const requiredPermission = ROUTE_PERMISSIONS[route as keyof typeof ROUTE_PERMISSIONS];
    if (!requiredPermission) return true; // No permission required for this route
    
    return useSelector(selectHasPermission(requiredPermission));
  };

  // Check if user has permission for multiple routes
  const hasAnyRoutePermission = (routes: string[]): boolean => {
    if (!isAuthenticated || !user) return false;
    
    return routes.some(route => hasRoutePermission(route));
  };

  // Check if user has permission for all routes
  const hasAllRoutePermissions = (routes: string[]): boolean => {
    if (!isAuthenticated || !user) return false;
    
    return routes.every(route => hasRoutePermission(route));
  };

  // Get all accessible routes for the user
  const getAccessibleRoutes = (): string[] => {
    if (!isAuthenticated || !user) return [];
    
    return Object.keys(ROUTE_PERMISSIONS).filter(route => hasRoutePermission(route));
  };

  // Get all inaccessible routes for the user
  const getInaccessibleRoutes = (): string[] => {
    if (!isAuthenticated || !user) return Object.keys(ROUTE_PERMISSIONS);
    
    return Object.keys(ROUTE_PERMISSIONS).filter(route => !hasRoutePermission(route));
  };

  // Get the required permission for a route
  const getRoutePermission = (route: string): string | null => {
    return ROUTE_PERMISSIONS[route as keyof typeof ROUTE_PERMISSIONS] || null;
  };

  return {
    hasRoutePermission,
    hasAnyRoutePermission,
    hasAllRoutePermissions,
    getAccessibleRoutes,
    getInaccessibleRoutes,
    getRoutePermission,
    isAuthenticated,
    user
  };
}; 