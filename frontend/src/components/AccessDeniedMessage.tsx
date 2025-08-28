import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lock, 
  Shield, 
  AlertTriangle, 
  Home, 
  ArrowLeft, 
  User,
  Settings,
  HelpCircle
} from 'lucide-react';
import { useRoutePermissions } from '@/hooks/useRoutePermissions';
import { ROUTE_PERMISSIONS } from './PermissionBasedNavigation';
import { PERMISSION_METADATA } from '@/constants/permissions';

interface AccessDeniedMessageProps {
  route?: string;
  permission?: string;
  message?: string;
  showHelp?: boolean;
  showBackButton?: boolean;
  showHomeButton?: boolean;
  className?: string;
}

const AccessDeniedMessage: React.FC<AccessDeniedMessageProps> = ({
  route,
  permission,
  message,
  showHelp = true,
  showBackButton = false,
  showHomeButton = false,
  className = ''
}) => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { getAccessibleRoutes, getRoutePermission } = useRoutePermissions();

  // Get the required permission for the route
  const requiredPermission = permission || (route ? getRoutePermission(route) : null);
  
  // Get permission metadata
  const permissionInfo = requiredPermission ? PERMISSION_METADATA[requiredPermission as keyof typeof PERMISSION_METADATA] : null;
  
  // Get accessible routes for suggestions
  const accessibleRoutes = getAccessibleRoutes();
  
  // Get route name for display
  const getRouteName = (routePath: string): string => {
    const routeNames: Record<string, string> = {
      '/pos': 'نقطة البيع',
      '/sales': 'المبيعات',
      '/purchases': 'المشتريات',
      '/inventory': 'المنتجات',
      '/stocks': 'المخازن',
      '/stock-movements': 'حركة المخزون',
      '/customers': 'العملاء',
      '/suppliers': 'الموردين',
      '/expenses': 'المصروفات',
      '/bills': 'الفواتير',
      '/reports': 'التقارير',
      '/debts': 'الديون',
      '/installments': 'الأقساط',
      '/customer-receipts': 'سند قبض',
      '/supplier-payment-receipts': 'سند صرف',
      '/cash-box': 'صندوق النقد',
      '/admin-cash-box': 'إدارة الصناديق',
      '/settings': 'الإعدادات',
      '/admin-profiles': 'إدارة المشرفين',
    };
    return routeNames[routePath] || routePath;
  };

  const defaultMessage = route 
    ? `ليس لديك صلاحية للوصول إلى ${getRouteName(route)}`
    : 'ليس لديك صلاحية للوصول إلى هذه الصفحة';

  return (
    <div className={`${className || 'min-h-screen bg-gray-50 flex items-center justify-center p-4'}`}>
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-xl font-bold text-gray-900">
            الوصول مرفوض
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Main Message */}
          <div className="text-center">
            <p className="text-gray-600 text-lg">
              {message || defaultMessage}
            </p>
          </div>

          {/* Permission Information */}
          {permissionInfo && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">الصلاحية المطلوبة</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                    {permissionInfo.name}
                  </Badge>
                </div>
                <p className="text-blue-700 text-sm">
                  {permissionInfo.description}
                </p>
              </div>
            </div>
          )}

          {/* User Information */}
          {user && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">معلومات المستخدم</h3>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>الاسم:</strong> {user.name}</p>
                <p><strong>الدور:</strong> {user.role === 'admin' ? 'مدير النظام' : 'مستخدم'}</p>
                <p><strong>البريد الإلكتروني:</strong> {user.email}</p>
              </div>
            </div>
          )}

          {/* Help Section */}
          {showHelp && (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="w-5 h-5 text-yellow-600" />
                <h3 className="font-semibold text-yellow-900">كيفية الحصول على الصلاحية</h3>
              </div>
              <div className="space-y-2 text-sm text-yellow-800">
                <p>• تواصل مع مدير النظام لطلب الصلاحية المطلوبة</p>
                <p>• تأكد من أن لديك الدور المناسب في النظام</p>
                <p>• قد تحتاج إلى إعادة تسجيل الدخول بعد تحديث الصلاحيات</p>
              </div>
            </div>
          )}

     
      
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessDeniedMessage; 