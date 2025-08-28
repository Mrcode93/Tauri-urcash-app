import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../app/store';
import { getCurrentUser } from '../features/auth/authSlice';
import Sidebar from '@/components/Sidebar';
import Navbar from '../components/Navbar';
import KeyboardToggleButton from '@/components/KeyboardToggleButton';
import { NotificationProvider } from '../contexts/DebtNotificationContext';

const PrivateLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if current page is Dashboard (should not show navbar)
  const isDashboardPage = location.pathname === '/' || location.pathname === '/dashboard';

  useEffect(() => {
    dispatch(getCurrentUser());
  }, [dispatch]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleCollapse = () => {
    setCollapsed((prev) => !prev);
  };

  if (!user) {
    return null; // Optionally, show a loading spinner or placeholder
  }

  // If it's the dashboard page, render without the layout wrapper
  if (isDashboardPage) {
    return (
      <NotificationProvider>
        <Outlet />
      </NotificationProvider>
    );
  }

  return (
    <NotificationProvider>
      <div className="flex h-screen">
        {/* Sidebar removed for tile-based navigation */}
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
          {/* Navbar */}
          
          
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-2">
            <div className="mx-auto">
              {/* Back Button */}
              {location.pathname !== "/" && location.pathname !== "/dashboard" && (
                <button
                  onClick={() => navigate(-1)}
                  className="mb-4 px-4 py-2 rounded bg-primary text-white hover:bg-primary/90 transition-colors shadow"
                >
                  رجوع
                </button>
              )}
              <Outlet />
            </div>
          </main>
        </div>

        {/* Global Floating Keyboard Button - Always visible */}
        <KeyboardToggleButton 
          variant="floating" 
          size="lg" 
          position="relative"
          showLabel={false}
          className="fixed bottom-6 left-6 border-1 border-gray-800 z-[999999] shadow-xl hover:shadow-2xl transition-all duration-300 bg-primary "
        />
      </div>
    </NotificationProvider>
  );
};

export default PrivateLayout;
