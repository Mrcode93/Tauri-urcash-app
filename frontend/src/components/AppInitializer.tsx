import { useEffect, useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { AppDispatch, RootState } from '@/app/store';
import { initializeApp } from '@/features/app/appSlice';
import { Loader2, RefreshCw, Zap } from 'lucide-react';
import { API_CONFIG } from '@/lib/api';
import apiService from '@/lib/apiService';
import cacheService from '@/lib/cacheService';

interface AppInitializerProps {
  children: React.ReactNode;
}

const AppInitializer = ({ children }: AppInitializerProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const { isInitialized, isLoading, error } = useSelector((state: RootState) => state.app);
  const { isAuthenticated, token, authChecked } = useSelector((state: RootState) => state.auth);
  const [retryCount, setRetryCount] = useState(0);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [cacheStats, setCacheStats] = useState(cacheService.getStats());

  // Check if current route is private (not login)
  const isPrivateRoute = useMemo(() => {
    return location.pathname !== '/login' && location.pathname !== '/register';
  }, [location.pathname]);

  // Memoized server status check with caching
  const checkServerStatus = useCallback(async () => {
    try {
      setServerStatus('checking');
      
      // Use cached server status check
      const isOnline = await apiService.checkServerStatus();
      
      setServerStatus(isOnline ? 'online' : 'offline');
      return isOnline;
    } catch (error) {
      console.error('Server status check failed:', error);
      setServerStatus('offline');
      return false;
    }
  }, []);

  // Preload essential data with caching
  const preloadEssentialData = useCallback(async () => {
    try {
      
      
      // Only preload if we have a valid token and user is authenticated
      if (!token || !isAuthenticated) {
        
        return { customers: null, settings: null };
      }

      
      
      // Preload critical data in parallel with caching
      const [customers, settings] = await Promise.all([
        apiService.getCustomers({ limit: 50 }).catch((error) => {
          console.warn('Failed to preload customers:', error);
          return null;
        }),
        apiService.getSettings().catch((error) => {
          console.warn('Failed to preload settings:', error);
          return null;
        })
      ]);

      // Cache the results for faster subsequent loads
      if (customers) {
        cacheService.set('preload:customers', customers, 300000); // 5 minutes
      }
      if (settings) {
        cacheService.set('preload:settings', settings, 600000); // 10 minutes
      }

      return { customers, settings };
    } catch (error) {
      console.warn('Preload failed:', error);
      return { customers: null, settings: null };
    }
  }, [token, isAuthenticated]);

  const handleInitialize = useCallback(async () => {
    try {
      
      
      // Check server status first with caching
      const serverOnline = await checkServerStatus();
      if (!serverOnline) {
        throw new Error('Server is not available');
      }
      
      // Only preload data if user is authenticated and we have a valid token
      // Skip preload entirely for now to avoid 401 errors
      
      // TODO: Re-enable preload once authentication is properly handled
      // if (isAuthenticated && token && authChecked) {
      //   
      //   preloadEssentialData().catch(console.warn);
      // } else {
      //   
      // }
      
      // Initialize app with optimized loading
      await dispatch(initializeApp()).unwrap();
      
      // Update cache stats
      setCacheStats(cacheService.getStats());
    } catch (error: any) {
      console.error('App initialization failed:', error);
      setRetryCount(prev => prev + 1);
    }
  }, [dispatch, checkServerStatus, preloadEssentialData, isAuthenticated, token, authChecked]);

  useEffect(() => {
    
    
    // Only initialize app if user is authenticated, auth has been checked, and we're on a private route
    if (isPrivateRoute && isAuthenticated && token && authChecked && !isInitialized && !isLoading) {
      
      handleInitialize();
    } else {
      
    }
  }, [dispatch, isInitialized, isLoading, isAuthenticated, token, authChecked, handleInitialize, isPrivateRoute]);

  const handleRetry = useCallback(() => {
    setRetryCount(0);
    // Clear cache on retry to ensure fresh data
    cacheService.invalidatePattern('api:*');
    handleInitialize();
  }, [handleInitialize]);

  // If user is not authenticated or auth hasn't been checked yet, just render children (login page)
  if (!isAuthenticated || !token || !authChecked) {
    return <>{children}</>;
  }

  // If we're on a public route (login/register), just render children without initialization
  if (!isPrivateRoute) {
    return <>{children}</>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">
            <RefreshCw className="h-12 w-12 mx-auto mb-2" />
            <h2 className="text-xl font-bold mb-2">خطأ في تحميل البيانات</h2>
          </div>
          
          <div className="text-sm text-gray-600 mb-4">
            <p className="mb-2">{error}</p>
            {serverStatus === 'offline' && (
              <p className="text-orange-600">
                ⚠️ الخادم غير متاح على المنفذ {API_CONFIG.API_PORT}
              </p>
            )}
            {retryCount > 0 && (
              <p className="text-gray-500">
                محاولة {retryCount} من 3
              </p>
            )}
            {cacheStats.hits > 0 && (
              <p className="text-green-600 text-xs">
                🚀 Cache hit rate: {Math.round(cacheStats.hitRate * 100)}%
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <button
              onClick={handleRetry}
              disabled={retryCount >= 3}
              className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {retryCount >= 3 ? 'تم تجاوز الحد الأقصى للمحاولات' : 'إعادة المحاولة'}
            </button>
            
            {retryCount >= 3 && (
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                إعادة تحميل الصفحة
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mr-2" />
            {cacheStats.hits > 0 && (
              <Zap className="h-8 w-8 text-green-500 animate-pulse" />
            )}
          </div>
          <p className="text-gray-600 mb-2">جاري تحميل البيانات...</p>
          {serverStatus === 'checking' && (
            <p className="text-sm text-gray-500">جاري التحقق من حالة الخادم...</p>
          )}
          {serverStatus === 'offline' && (
            <p className="text-sm text-orange-600">⚠️ الخادم غير متاح</p>
          )}
          {cacheStats.hits > 0 && (
            <p className="text-sm text-green-600">
              🚀 Cache active - {cacheStats.hits} hits
            </p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AppInitializer; 