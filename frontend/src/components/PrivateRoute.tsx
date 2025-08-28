import { Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useState } from 'react';
import { AppDispatch, RootState } from '../app/store';
import { getCurrentUserWithPermissions, logout } from '../features/auth/authSlice';
import { Button } from '@/components/ui/button';

interface PrivateRouteProps {
  children: JSX.Element;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { token, isAuthenticated, authChecked, user, userPermissions } = useSelector(
    (state: RootState) => state.auth
  );
  const [permissionLoadAttempts, setPermissionLoadAttempts] = useState(0);
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);

  // Load user data and permissions if we have a token but no user data
  // OR if we have user data but no permissions
  useEffect(() => {
    if (token) {
      // Case 1: No user data and auth not checked, load everything
      if (!user && !authChecked) {
        dispatch(getCurrentUserWithPermissions());
      }
      // Case 2: User exists but no permissions (legacy login), load permissions
      else if (user && !userPermissions) {
        setPermissionLoadAttempts(prev => prev + 1);
        dispatch(getCurrentUserWithPermissions());
      }
    }
  }, [token, user, userPermissions, authChecked, dispatch]);

  // Handle permission loading timeout
  useEffect(() => {
    if (isAuthenticated && user && !userPermissions && permissionLoadAttempts > 0) {
      const timeout = setTimeout(() => {
        if (!userPermissions) {
          setShowTimeoutMessage(true);
          // After 10 seconds, clear the session to force re-login
          setTimeout(() => {
            dispatch(logout());
          }, 5000);
        }
      }, 10000); // 10 seconds timeout

      return () => clearTimeout(timeout);
    }
  }, [isAuthenticated, user, userPermissions, permissionLoadAttempts, dispatch]);

  const handleRetryPermissions = () => {
    setPermissionLoadAttempts(prev => prev + 1);
    dispatch(getCurrentUserWithPermissions());
  };

  const handleClearSession = () => {
    dispatch(logout());
  };

  // Show loading while checking authentication
  if (token && !authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحقق من المصادقة...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if no token or not authenticated
  if (!token || !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Show loading while permissions are being loaded
  if (isAuthenticated && user && !userPermissions) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل الصلاحيات...</p>
          
          {permissionLoadAttempts > 1 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-800 text-sm mb-3">
                يبدو أن هناك مشكلة في تحميل الصلاحيات. يمكنك المحاولة مرة أخرى أو تسجيل الدخول من جديد.
              </p>
              <div className="flex gap-2 justify-center">
                <Button 
                  onClick={handleRetryPermissions}
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  إعادة المحاولة
                </Button>
                <Button 
                  onClick={handleClearSession}
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  تسجيل الدخول من جديد
                </Button>
              </div>
            </div>
          )}
          
          {showTimeoutMessage && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-yellow-800 text-sm">
                يستغرق تحميل الصلاحيات وقتاً أطول من المعتاد. سيتم إعادة توجيهك لصفحة تسجيل الدخول تلقائياً...
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return children;
};

export default PrivateRoute;
