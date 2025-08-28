import React from 'react';
import { PermissionBasedLink, PermissionBasedButton } from './PermissionBasedNavigation';
import { useRoutePermissions } from '@/hooks/useRoutePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, CheckCircle, XCircle } from 'lucide-react';

/**
 * Example component demonstrating how to use the permission-based navigation system
 * This component shows different ways to implement permission checks
 */
const PermissionNavigationExample: React.FC = () => {
  const { 
    hasRoutePermission, 
    getAccessibleRoutes, 
    getInaccessibleRoutes,
    getRoutePermission 
  } = useRoutePermissions();

  const accessibleRoutes = getAccessibleRoutes();
  const inaccessibleRoutes = getInaccessibleRoutes();

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            مثال على نظام الصلاحيات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            هذا المثال يوضح كيفية استخدام نظام الصلاحيات للتنقل في التطبيق
          </p>
          
          {/* Example 1: Basic Permission-Based Links */}
          <div className="space-y-2">
            <h3 className="font-semibold">1. روابط مع صلاحيات:</h3>
            <div className="flex flex-wrap gap-2">
              <PermissionBasedLink 
                to="/sales" 
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                showAccessDenied={true}
                accessDeniedMessage="ليس لديك صلاحية للوصول إلى المبيعات"
              >
                المبيعات
              </PermissionBasedLink>
              
              <PermissionBasedLink 
                to="/inventory" 
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                showAccessDenied={true}
                accessDeniedMessage="ليس لديك صلاحية للوصول إلى المخزون"
              >
                المخزون
              </PermissionBasedLink>
              
              <PermissionBasedLink 
                to="/reports" 
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                showAccessDenied={true}
                accessDeniedMessage="ليس لديك صلاحية للوصول إلى التقارير"
              >
                التقارير
              </PermissionBasedLink>
            </div>
          </div>

          {/* Example 2: Permission-Based Buttons */}
          <div className="space-y-2">
            <h3 className="font-semibold">2. أزرار مع صلاحيات:</h3>
            <div className="flex flex-wrap gap-2">
              <PermissionBasedButton 
                onClick={() => alert('تم تنفيذ الإجراء')}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                showAccessDenied={true}
                accessDeniedMessage="ليس لديك صلاحية لتنفيذ هذا الإجراء"
              >
                إجراء محمي
              </PermissionBasedButton>
            </div>
          </div>

          {/* Example 3: Route Permission Status */}
          <div className="space-y-2">
            <h3 className="font-semibold">3. حالة صلاحيات الصفحات:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Accessible Routes */}
              <div className="space-y-2">
                <h4 className="font-medium text-green-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  الصفحات المتاحة
                </h4>
                <div className="space-y-1">
                  {accessibleRoutes.length > 0 ? (
                    accessibleRoutes.map(route => (
                      <div key={route} className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <span className="text-sm">{route}</span>
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          متاح
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">لا توجد صفحات متاحة</p>
                  )}
                </div>
              </div>

              {/* Inaccessible Routes */}
              <div className="space-y-2">
                <h4 className="font-medium text-red-700 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  الصفحات غير المتاحة
                </h4>
                <div className="space-y-1">
                  {inaccessibleRoutes.length > 0 ? (
                    inaccessibleRoutes.map(route => {
                      const permission = getRoutePermission(route);
                      return (
                        <div key={route} className="flex items-center justify-between p-2 bg-red-50 rounded">
                          <div className="flex flex-col">
                            <span className="text-sm">{route}</span>
                            {permission && (
                              <span className="text-xs text-gray-500">يتطلب: {permission}</span>
                            )}
                          </div>
                          <Badge variant="outline" className="bg-red-100 text-red-800">
                            محظور
                          </Badge>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-gray-500">جميع الصفحات متاحة</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Example 4: Dynamic Permission Checks */}
          <div className="space-y-2">
            <h3 className="font-semibold">4. فحص الصلاحيات ديناميكياً:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['/sales', '/inventory', '/reports', '/settings'].map(route => (
                <div key={route} className="p-3 border rounded text-center">
                  <div className="text-sm font-medium">{route}</div>
                  <div className="text-xs text-gray-500">
                    {hasRoutePermission(route) ? 'متاح' : 'غير متاح'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PermissionNavigationExample; 