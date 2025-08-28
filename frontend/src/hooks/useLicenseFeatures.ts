import { useState, useEffect } from 'react';
import { licenseService, LicenseStatus } from '../services/licenseService';

interface LicenseFeaturesHook {
  licenseStatus: LicenseStatus | null;
  hasFeature: (featureName: string) => boolean;
  isLoading: boolean;
  isExpired: boolean;
  isPremium: boolean;
  availableFeatures: string[];
  refreshLicense: () => Promise<void>;
}

export const useLicenseFeatures = (): LicenseFeaturesHook => {
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkLicense = async () => {
    setIsLoading(true);
    try {
      const status = await licenseService.checkStatus();
      setLicenseStatus(status);
    } catch (error) {
      console.error('Failed to check license status:', error);
      setLicenseStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkLicense();
  }, []);

  const hasFeature = (featureName: string): boolean => {
    if (!licenseStatus?.licenseData?.features) {
      return false;
    }
    return licenseStatus.licenseData.features.includes(featureName);
  };

  const isExpired = licenseStatus?.licenseData ? 
    licenseService.isLicenseExpired(licenseStatus.licenseData) : true;

  const isPremium = licenseStatus?.licenseData?.type === 'full' || 
    licenseStatus?.licenseData?.type === 'premium' || 
    licenseStatus?.licenseData?.type === 'enterprise';

  const availableFeatures = licenseStatus?.licenseData?.features || [];

  const refreshLicense = async () => {
    await checkLicense();
  };

  return {
    licenseStatus,
    hasFeature,
    isLoading,
    isExpired,
    isPremium,
    availableFeatures,
    refreshLicense
  };
};

// Helper functions for common feature checks
export const usePremiumFeatures = () => {
  const { hasFeature, isPremium } = useLicenseFeatures();

  return {
    canAccessExpenses: hasFeature('expenses'),
    canAccessSuppliers: hasFeature('suppliers'),
    canAccessReports: hasFeature('reports'),
    canAccessDebts: hasFeature('debts'),
    canAccessInstallments: hasFeature('installments'),
    canAccessCustomers: hasFeature('customers'),
    canAccessAnalytics: hasFeature('analytics'),
    canAccessMobileLiveData: hasFeature('mobile_live_data'),
    isPremium
  };
};

export default useLicenseFeatures;
