import React from 'react';
import { Navigate } from 'react-router-dom';
import { useLicense, PREMIUM_FEATURES } from '@/contexts/LicenseContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PremiumRouteGuardProps {
  feature: string;
  featureName: string;
  featureDescription: string;
  children: React.ReactNode;
  redirectTo?: string;
}

const PremiumRouteGuard: React.FC<PremiumRouteGuardProps> = ({
  feature,
  featureName,
  featureDescription,
  children,
  redirectTo = '/dashboard'
}) => {
  const { hasFeatureAccess, isLoading, isPremium } = useLicense();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if user has access to this feature
  if (hasFeatureAccess(feature)) {
    return <>{children}</>;
  }

  // Show premium feature locked page
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-yellow-600" />
          </div>
          <CardTitle className="text-xl font-bold text-gray-900">
            ميزة مميزة مقفلة
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">{featureName}</h3>
            <p className="text-gray-600 text-sm">{featureDescription}</p>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-center mb-2">
              <Crown className="w-5 h-5 text-yellow-600 mr-2" />
              <span className="font-medium text-yellow-800">
                مطلوب ترخيص مميز
              </span>
            </div>
            <p className="text-yellow-700 text-sm">
              هذه الميزة متاحة فقط مع الاشتراك المميز. يرجى تفعيل الاشتراك المميز للوصول إلى هذه الميزة.
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={() => window.location.href = '/settings?tab=premium'}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              <Crown className="w-4 h-4 mr-2" />
              تفعيل الاشتراك المميز
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.location.href = redirectTo}
              className="w-full"
            >
              العودة إلى لوحة التحكم
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Specific guards for each feature
export const ExpensesRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PremiumRouteGuard
    feature={PREMIUM_FEATURES.EXPENSES}
    featureName="إدارة المصروفات"
    featureDescription="تتبع وتصنيف جميع مصروفات الشركة مع تقارير تفصيلية"
  >
    {children}
  </PremiumRouteGuard>
);

export const SuppliersRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PremiumRouteGuard
    feature={PREMIUM_FEATURES.SUPPLIERS}
    featureName="إدارة الموردين"
    featureDescription="قاعدة بيانات شاملة للموردين مع تاريخ المشتريات والتعاملات"
  >
    {children}
  </PremiumRouteGuard>
);

export const CustomersRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PremiumRouteGuard
    feature={PREMIUM_FEATURES.CUSTOMERS}
    featureName="إدارة العملاء"
    featureDescription="قاعدة بيانات شاملة للعملاء مع تاريخ المشتريات"
  >
    {children}
  </PremiumRouteGuard>
);

export const ReportsRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PremiumRouteGuard
    feature={PREMIUM_FEATURES.REPORTS}
    featureName="التقارير المتقدمة"
    featureDescription="تقارير مفصلة للمبيعات والأرباح والمنتجات"
  >
    {children}
  </PremiumRouteGuard>
);

export const DebtsRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PremiumRouteGuard
    feature={PREMIUM_FEATURES.DEBTS}
    featureName="إدارة الديون"
    featureDescription="تتبع ديون العملاء والموردين مع تنبيهات الاستحقاق"
  >
    {children}
  </PremiumRouteGuard>
);

export const InstallmentsRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PremiumRouteGuard
    feature={PREMIUM_FEATURES.INSTALLMENTS}
    featureName="إدارة الأقساط"
    featureDescription="تتبع وإدارة أقساط العملاء مع تنبيهات الدفع"
  >
    {children}
  </PremiumRouteGuard>
);

// mobile live data route guard
export const MobileLiveDataRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PremiumRouteGuard
    feature={PREMIUM_FEATURES.MOBILE_LIVE_DATA}
    featureName="البيانات الحية المحمولة"
    featureDescription="تتبع وإدارة البيانات الحية المحمولة"
  >
    {children}
  </PremiumRouteGuard>
);

export default PremiumRouteGuard;
