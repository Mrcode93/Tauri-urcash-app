import React, { useState, ReactNode } from 'react';
import { useLicense, PREMIUM_FEATURES } from '@/contexts/LicenseContext';
import PremiumPopup from '@/components/PremiumPopup';

interface PremiumFeatureWrapperProps {
  children: ReactNode;
  feature: string;
  featureName: string;
  featureDescription?: string;
  fallback?: ReactNode;
  showPopupOnClick?: boolean;
}

const PremiumFeatureWrapper: React.FC<PremiumFeatureWrapperProps> = ({
  children,
  feature,
  featureName,
  featureDescription,
  fallback,
  showPopupOnClick = true
}) => {
  const { hasFeatureAccess, isLoading } = useLicense();
  const [showPremiumPopup, setShowPremiumPopup] = useState(false);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if user has access to this feature
  const hasAccess = hasFeatureAccess(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  // If no access, show fallback or handle click to show popup
  if (fallback) {
    return <>{fallback}</>;
  }

  if (showPopupOnClick) {
    return (
      <>
        <div
          onClick={() => setShowPremiumPopup(true)}
          className="cursor-pointer"
        >
          {children}
        </div>
        
        <PremiumPopup
          isOpen={showPremiumPopup}
          onClose={() => setShowPremiumPopup(false)}
          featureName={featureName}
          featureDescription={featureDescription}
        />
      </>
    );
  }

  // Default: don't render anything
  return null;
};

// Hook for checking premium access
export const usePremiumFeature = (feature: string) => {
  const { hasFeatureAccess, isLoading } = useLicense();
  const [showPremiumPopup, setShowPremiumPopup] = useState(false);

  return {
    hasAccess: hasFeatureAccess(feature),
    isLoading,
    showPremiumPopup,
    setShowPremiumPopup
  };
};

// Pre-configured wrappers for specific features
export const InstallmentsWrapper: React.FC<Omit<PremiumFeatureWrapperProps, 'feature' | 'featureName'>> = (props) => (
  <PremiumFeatureWrapper
    {...props}
    feature={PREMIUM_FEATURES.INSTALLMENTS}
    featureName="إدارة الأقساط"
    featureDescription="تتبع وإدارة أقساط العملاء بسهولة مع تنبيهات الدفع التلقائية"
  />
);

export const ReportsWrapper: React.FC<Omit<PremiumFeatureWrapperProps, 'feature' | 'featureName'>> = (props) => (
  <PremiumFeatureWrapper
    {...props}
    feature={PREMIUM_FEATURES.REPORTS}
    featureName="التقارير المتقدمة"
    featureDescription="احصل على تقارير مفصلة ومتقدمة لمبيعاتك ومخزونك وأرباحك"
  />
);

export const DebtsWrapper: React.FC<Omit<PremiumFeatureWrapperProps, 'feature' | 'featureName'>> = (props) => (
  <PremiumFeatureWrapper
    {...props}
    feature={PREMIUM_FEATURES.DEBTS}
    featureName="إدارة الديون"
    featureDescription="تتبع ديون العملاء والموردين مع تنبيهات الاستحقاق"
  />
);

export const CustomersWrapper: React.FC<Omit<PremiumFeatureWrapperProps, 'feature' | 'featureName'>> = (props) => (
  <PremiumFeatureWrapper
    {...props}
    feature={PREMIUM_FEATURES.CUSTOMERS}
    featureName="إدارة العملاء"
    featureDescription="قاعدة بيانات شاملة للعملاء مع تاريخ المشتريات والتفضيلات"
  />
);

export const MobileLiveDataWrapper: React.FC<Omit<PremiumFeatureWrapperProps, 'feature' | 'featureName'>> = (props) => (
  <PremiumFeatureWrapper
    {...props}
    feature={PREMIUM_FEATURES.MOBILE_LIVE_DATA}
    featureName="البيانات الحية المحمولة"
    featureDescription="تتبع وإدارة البيانات الحية المحمولة"
  />
);

// add multi device support
export const MultiDeviceWrapper: React.FC<Omit<PremiumFeatureWrapperProps, 'feature' | 'featureName'>> = (props) => (
  <PremiumFeatureWrapper
    {...props}
    feature={PREMIUM_FEATURES.MULTI_DEVICE}
    featureName="إدارة الأجهزة"
    featureDescription="إدارة الأجهزة المتصلة والتحكم في الصلاحيات والاتصالات"
  />
);

export default PremiumFeatureWrapper;
