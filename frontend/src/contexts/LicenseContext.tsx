import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { licenseService, LicenseData } from '../services/licenseService';
import { toast } from '@/lib/toast';

// Premium features that require license activation
export const PREMIUM_FEATURES = {
  INSTALLMENTS: 'installments',
  REPORTS: 'reports', 
  DEBTS: 'debts',
  CUSTOMERS: 'customers',
  EXPENSES: 'expenses',
  SUPPLIERS: 'suppliers',
  ANALYTICS: 'analytics',
  ADVANCED_INVENTORY: 'advanced_inventory',
  MULTI_STORE: 'multi_store',
  STAFF_MANAGEMENT: 'staff_management',
  LOYALTY_PROGRAM: 'loyalty',
  ACCOUNTING_INTEGRATION: 'accounting',
  MOBILE_LIVE_DATA: 'mobile_live_data',
  MULTI_DEVICE: 'multi_device'
} as const;

interface LicenseContextType {
  isActivated: boolean;
  isLoading: boolean;
  licenseData: LicenseData | null;
  error: string | null;
  needsFirstActivation: boolean;
  isPremium: boolean;
  isLicenseExpired: boolean;
  premiumFeatures: string[];
  checkLicenseStatus: () => Promise<void>;
  activateLicense: () => Promise<boolean>;
  performFirstActivation: () => Promise<boolean>;
  activateWithCode: (code: string) => Promise<boolean>;
  hasFeatureAccess: (feature: string) => boolean;
  verifyLicense: (includeServerCheck?: boolean) => Promise<boolean>;
  getDetailedLicenseInfo: () => Promise<LicenseData | null>;
  forceRefreshLicense: () => Promise<void>;
  clearLicenseCache: () => void;
  isAppStartup: boolean;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

interface LicenseProviderProps {
  children: ReactNode;
}

export const LicenseProvider: React.FC<LicenseProviderProps> = ({ children }) => {
  const [isActivated, setIsActivated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [licenseData, setLicenseData] = useState<LicenseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsFirstActivation, setNeedsFirstActivation] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAppStartup, setIsAppStartup] = useState(false);

  // Fast license check with minimal API calls
  const checkLicenseStatus = async (forceRefresh: boolean = false) => {
    const isStartup = licenseService.isAppStartup();
    
    if (isStartup) {
      setIsAppStartup(true);
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Use the cached version that checks session storage first
      const data = await licenseService.checkLocalLicense(forceRefresh);
      
      if (data.success) {
        setIsActivated(true);
        const licenseData: LicenseData = {
          device_id: data.device_id,
          type: data.type_ || data.license_type || data.type,
          features: data.features,
          activated_at: data.activated_at,
          expires_at: data.expires_at,
          userId: data.user_id || data.userId,
          feature_licenses: data.feature_licenses ? Object.keys(data.feature_licenses) : [],
          feature_expiration_status: data.feature_expiration_status?.map(f => f.feature) || [],
          signature: data.signature,
          created_at: data.created_at
        };
        setLicenseData(licenseData);
        setNeedsFirstActivation(false);
        setError(null);
        
        // Log cache source for debugging
        if (data.source === 'session_cache') {
          
        } else {
          
        }
      } else {
        setIsActivated(false);
        setLicenseData(null);
        setNeedsFirstActivation(data.needsFirstActivation || true);
        setError(data.message || 'License not activated');
      }
    } catch (err: unknown) {
      console.error('Error checking license status:', err);
      const errorMessage = (err as Error)?.message || 'Failed to check license status';
      setError(errorMessage);
      setIsActivated(false);
      setNeedsFirstActivation(true);
    } finally {
      setIsLoading(false);
    }
  };

  const forceRefreshLicense = async () => {
    await checkLicenseStatus(true);
  };

  const clearLicenseCache = () => {
    try {
      // Use the service's cache management
      licenseService.clearCache();
      
      // Also clear server cache
      fetch('http://localhost:39000/api/license/cache/clear', { method: 'POST' })
        .catch(error => console.error('Error clearing server cache:', error));
    } catch (error) {
      console.error('Error clearing license cache:', error);
    }
  };

  const activateLicense = async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const status = await licenseService.checkStatus();
      
      if (status.success) {
        setIsActivated(true);
        const licenseData: LicenseData = {
          device_id: status.device_id,
          type: status.type_ || status.license_type || status.type,
          features: status.features,
          activated_at: status.activated_at,
          expires_at: status.expires_at,
          userId: status.user_id || status.userId,
          feature_licenses: status.feature_licenses ? Object.keys(status.feature_licenses) : [],
          feature_expiration_status: status.feature_expiration_status?.map(f => f.feature) || [],
          signature: status.signature,
          created_at: status.created_at
        };
        setLicenseData(licenseData);
        setNeedsFirstActivation(false);
        return true;
      } else {
        return await performFirstActivation();
      }
    } catch (err: unknown) {
      console.error('Error activating license:', err);
      const errorMessage = (err as Error)?.message || 'Failed to activate license';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const performFirstActivation = async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await licenseService.firstTimeActivation();
      
      if (data.success) {
        setIsActivated(true);
        setNeedsFirstActivation(false);
        setError(null);
        clearLicenseCache();
        await checkLicenseStatus(true);
        return true;
      } else {
        setError(data.message || 'First activation failed');
        return false;
      }
    } catch (err: unknown) {
      console.error('Error performing first activation:', err);
      const errorMessage = (err as Error)?.message || 'Failed to perform first activation';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const activateWithCode = async (code: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await licenseService.activateWithCode(code);
      
      if (result.success) {
        clearLicenseCache();
        await checkLicenseStatus(true);
        toast.success('Premium license activated successfully!');
        return true;
      } else {
        setError(result.message || 'Failed to activate license');
        toast.error(result.message || 'Failed to activate license');
        return false;
      }
    } catch (err: unknown) {
      console.error('Activation error:', err);
      const errorMessage = (err as Error)?.message || 'Error during activation';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyLicense = async (includeServerCheck: boolean = true): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const verificationResult = await licenseService.verifyLicense(includeServerCheck);
      
      if (verificationResult.success && verificationResult.valid) {
        await checkLicenseStatus(true);
        toast.success('License verification successful!');
        return true;
      } else {
        setError(verificationResult.message || 'License verification failed');
        toast.error(verificationResult.message || 'License verification failed');
        return false;
      }
    } catch (err: unknown) {
      console.error('Verification error:', err);
      const errorMessage = (err as Error)?.message || 'Error during license verification';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getDetailedLicenseInfo = async (): Promise<LicenseData | null> => {
    try {
      const detailedStatus = await licenseService.getDetailedLicenseStatus();
      return {
        device_id: detailedStatus.deviceInfo?.device_id || '',
        type: (detailedStatus.status.type || 'trial') as 'trial' | 'full' | 'partial' | 'custom' | 'premium' | 'enterprise',
        features: detailedStatus.status.features || [],
        activated_at: detailedStatus.status.activated_at || '',
        expires_at: detailedStatus.status.expires_at || '',
        userId: detailedStatus.status.userId || '',
        feature_licenses: detailedStatus.status.feature_licenses ? Object.keys(detailedStatus.status.feature_licenses) : [],
        feature_expiration_status: detailedStatus.status.feature_expiration_status?.map(f => f.feature) || [],
      };
    } catch (err: unknown) {
      console.error('Error getting detailed license info:', err);
      throw err;
    }
  };

  const hasFeatureAccess = (feature: string): boolean => {
    if (!isActivated || !licenseData) {
      return false;
    }

    if (licenseData.expires_at) {
      const expirationDate = new Date(licenseData.expires_at);
      const now = new Date();
      if (now > expirationDate) {
        return false;
      }
    }

    const licenseFeatures = licenseData.features || [];
    const featureLicenses = licenseData.feature_licenses || [];
    
    // Check if feature is in the main features array
    if (licenseFeatures.includes(feature)) {
      return true;
    }
    
    // Check if feature is in the feature_licenses array
    return featureLicenses.includes(feature);
  };

  // Computed values
  const isPremium = isActivated && 
    licenseData?.type !== 'trial' && 
    ((licenseData?.features && Object.keys(licenseData.features).length > 0) || (licenseData?.feature_licenses?.length || 0) > 0);

  const isLicenseExpired = licenseData?.expires_at ? 
    new Date() > new Date(licenseData.expires_at) : false;

  const premiumFeatures = (licenseData?.features ? Object.keys(licenseData.features) : []) || licenseData?.feature_licenses || [];

  useEffect(() => {
    const initializeLicense = async () => {
      try {
        await checkLicenseStatus();
      } catch (error) {
        console.error('Error initializing license:', error);
        setIsLoading(false);
      } finally {
        setIsInitialized(true);
      }
    };
    
    initializeLicense();
  }, []);

  const value: LicenseContextType = {
    isActivated,
    isLoading: isLoading || !isInitialized,
    licenseData,
    error,
    needsFirstActivation,
    isPremium,
    isLicenseExpired,
    premiumFeatures,
    checkLicenseStatus,
    activateLicense,
    performFirstActivation,
    activateWithCode,
    hasFeatureAccess,
    verifyLicense,
    getDetailedLicenseInfo,
    forceRefreshLicense,
    clearLicenseCache,
    isAppStartup,
  };

  return (
    <LicenseContext.Provider value={value}>
      {children}
    </LicenseContext.Provider>
  );
};

export const useLicense = (): LicenseContextType => {
  const context = useContext(LicenseContext);
  if (context === undefined) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
};

export default LicenseContext;
