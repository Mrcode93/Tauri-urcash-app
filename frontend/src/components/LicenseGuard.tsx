import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/store';
import { useLicense } from '@/contexts/LicenseContext';
import { licenseService } from '@/services/licenseService';
import { Loader2 } from 'lucide-react';

interface LicenseGuardProps {
  children: React.ReactNode;
}

const LicenseGuard: React.FC<LicenseGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, authChecked } = useSelector((state: RootState) => state.auth);
  const { isActivated, isLoading, needsFirstActivation, isAppStartup, clearLicenseCache, forceRefreshLicense } = useLicense();
  const [isCheckingLicense, setIsCheckingLicense] = useState(false);
  const [hasCheckedLicense, setHasCheckedLicense] = useState(false);

  // Check if current route should skip license check
  const shouldSkipLicenseCheck = () => {
    const skipRoutes = ['/activation'];
    return skipRoutes.includes(location.pathname);
  };

  // Force check license status directly
  const forceCheckLicense = async () => {
    try {
      setIsCheckingLicense(true);
      
      // Check cache stats before clearing
      const cacheStats = licenseService.getCacheStats();
      
      
      // Clear cache first if needed
      clearLicenseCache();
      
      // Small delay to ensure cache is cleared
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check license status directly with service (will use cache if available)
      const status = await licenseService.checkLocalLicense(false);
      

      
      // Force refresh the license context
      await forceRefreshLicense();
      
      return status;
    } catch (error) {
      console.error('🔍 LicenseGuard - Error checking license:', error);
      return { success: false, needsFirstActivation: true };
    } finally {
      setIsCheckingLicense(false);
      setHasCheckedLicense(true);
    }
  };

  useEffect(() => {
    // Initial license check when component mounts
    const initialCheck = async () => {
      if (!shouldSkipLicenseCheck() && !hasCheckedLicense) {
        const status = await forceCheckLicense();
        
        // If license is found and valid, redirect to main app
        if (status?.success && !status?.needsFirstActivation) {
          
          navigate('/', { replace: true });
        }
      }
    };

    initialCheck();
  }, [location.pathname, hasCheckedLicense]);

  useEffect(() => {
    // Handle navigation based on license status from context
    if (!isLoading && hasCheckedLicense) {
   
      
      if (isActivated && location.pathname === '/activation') {
        // Immediately redirect if license is activated and we're on activation page
        
        navigate('/', { replace: true });
      } else if (!isActivated && !shouldSkipLicenseCheck()) {
        // Redirect to activation if not activated and not already there
        
        navigate('/activation', { replace: true });
      }
    }
  }, [isLoading, isActivated, navigate, location.pathname, hasCheckedLicense]);

  // Additional effect to handle immediate license status changes
  useEffect(() => {
    // If license becomes activated while on activation page, redirect immediately
    if (isActivated && location.pathname === '/activation' && !isLoading && hasCheckedLicense) {
      
      navigate('/', { replace: true });
    }
  }, [isActivated, location.pathname, isLoading, navigate, hasCheckedLicense]);

  // Show loading only during initial app startup or when checking license
  if ((isLoading || isCheckingLicense || !hasCheckedLicense) && !shouldSkipLicenseCheck()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">
            {isAppStartup ? 'جاري تحميل التطبيق...' : 'جاري التحقق من الترخيص...'}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default LicenseGuard;
