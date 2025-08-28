import { useState, useEffect, useCallback } from 'react';
import { useLicense } from '@/contexts/LicenseContext';

interface UseLicenseCheckOptions {
  feature?: string;
  autoCheck?: boolean;
  cacheDuration?: number;
}

interface UseLicenseCheckReturn {
  hasAccess: boolean;
  isLoading: boolean;
  isActivated: boolean;
  isPremium: boolean;
  checkAccess: () => boolean;
  refresh: () => Promise<void>;
}

/**
 * Fast license check hook for quick access control
 * Uses cached license data from context for maximum speed
 */
export const useLicenseCheck = (options: UseLicenseCheckOptions = {}): UseLicenseCheckReturn => {
  const { feature, autoCheck = true, cacheDuration = 300000 } = options; // 5 minutes default
  const { isActivated, isLoading, hasFeatureAccess, isPremium, forceRefreshLicense } = useLicense();
  const [localLoading, setLocalLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<number>(0);

  // Fast access check using cached data
  const checkAccess = useCallback((): boolean => {
    if (!isActivated) return false;
    if (!feature) return true;
    return hasFeatureAccess(feature);
  }, [isActivated, feature, hasFeatureAccess]);

  // Refresh license data if needed
  const refresh = useCallback(async (): Promise<void> => {
    const now = Date.now();
    if (now - lastCheck < cacheDuration) {
      return; // Use cached data
    }

    setLocalLoading(true);
    try {
      await forceRefreshLicense();
      setLastCheck(now);
    } catch (error) {
      console.error('Error refreshing license:', error);
    } finally {
      setLocalLoading(false);
    }
  }, [forceRefreshLicense, lastCheck, cacheDuration]);

  // Auto-check on mount if enabled
  useEffect(() => {
    if (autoCheck) {
      refresh();
    }
  }, [autoCheck, refresh]);

  return {
    hasAccess: checkAccess(),
    isLoading: isLoading || localLoading,
    isActivated,
    isPremium,
    checkAccess,
    refresh
  };
};

/**
 * Ultra-fast feature access check
 * Returns boolean immediately without any async operations
 */
export const useFeatureAccess = (feature: string): boolean => {
  const { isActivated, hasFeatureAccess } = useLicense();
  
  if (!isActivated) return false;
  return hasFeatureAccess(feature);
};

/**
 * Fast premium status check
 * Returns boolean immediately without any async operations
 */
export const usePremiumStatus = (): boolean => {
  const { isActivated, isPremium } = useLicense();
  return isActivated && isPremium;
};

export default useLicenseCheck; 