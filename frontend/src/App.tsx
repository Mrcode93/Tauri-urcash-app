import { HashRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './app/store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import AppRoutes from './routes';
import AppInitializer from './components/AppInitializer';
import { Toaster as Sonner } from "@/components/ui/sonner";
import ThemeProvider from './components/ThemeProvider';
import { BackupNotificationProvider } from './contexts/NotificationContext';
import { LicenseProvider } from './contexts/LicenseContext';
import { KeyboardProvider } from './contexts/KeyboardContext';
import BackupNotification from './components/BackupNotification';
import LicenseGuard from './components/LicenseGuard';
import GlobalKeyboard from './components/GlobalKeyboard';
import { ErrorBoundary } from 'react-error-boundary';
import CustomErrorBoundary from './components/ErrorBoundary';
import LicenseNotificationManager from './components/LicenseNotification';
import { initAuthStorage } from '@/lib/auth';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { initializeAuth } from '@/features/auth/authSlice';
import { AppDispatch } from './app/store';

// Optimized QueryClient configuration for better performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce unnecessary refetches
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: unknown) => {
        // Don't retry on 4xx errors
        const errorWithResponse = error as { response?: { status?: number } };
        if (errorWithResponse?.response?.status >= 400 && errorWithResponse?.response?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">حدث خطأ غير متوقع</h2>
        <p className="text-gray-600 mb-6">يرجى إعادة تحميل الصفحة أو المحاولة مرة أخرى</p>
        <button
          onClick={resetErrorBoundary}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          إعادة المحاولة
        </button>
        <details className="mt-4 text-left">
          <summary className="cursor-pointer text-sm text-gray-500">تفاصيل الخطأ</summary>
          <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
            {error.message}
          </pre>
        </details>
      </div>
    </div>
  );
};

// Authentication initializer component
const AuthInitializer = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize auth storage first
        await initAuthStorage();
        
        // Then initialize authentication state from storage
        await dispatch(initializeAuth()).unwrap();
      } catch (error) {
        console.error('Failed to initialize authentication:', error);
      }
    };

    initializeApp();
  }, [dispatch]);

  return <>{children}</>;
};

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <ThemeProvider>
              <LicenseProvider>
                <BackupNotificationProvider>
                  <KeyboardProvider>
                    <HashRouter>
                      <AuthInitializer>
                        <Sonner 
                          position="top-center" 
                          richColors 
                          className="z-[99999] !opacity-100" 
                          toastOptions={{
                            style: {
                              marginBottom: "8px",
                            },
                          }}
                          expand={false}
                          closeButton
                        />
                        <BackupNotification />
                        <GlobalKeyboard />
                        <LicenseNotificationManager />
                        <LicenseGuard>
                          <AppInitializer>
                            <CustomErrorBoundary>
                              <AppRoutes />
                            </CustomErrorBoundary>
                          </AppInitializer>
                        </LicenseGuard>
                      </AuthInitializer>
                    </HashRouter>
                  </KeyboardProvider>
                </BackupNotificationProvider>
              </LicenseProvider>
            </ThemeProvider>
          </TooltipProvider>
          {/* Only show devtools in development */}
          {process.env.NODE_ENV === 'development' && (
            <ReactQueryDevtools initialIsOpen={false} />
          )}
        </QueryClientProvider>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
