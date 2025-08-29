import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../app/store';
import { logout } from '../features/auth/authSlice';
import { fetchSettings } from '../features/settings/settingsSlice';

import {
  LayoutDashboard,
  ShoppingCart,
  DollarSign,
  Truck,
  Package,
  Users,
  Store,
  ReceiptText,
  BarChart,
  FileText,
  CreditCard,
  Info,
  Settings,
  LogOut,
  UserCircle,
  User,
  Crown,
  Lock,
  Receipt,
  ClipboardList,
  Sparkles,
  TrendingUp,
  Activity,
  Home,
  Briefcase
} from 'lucide-react';
import DebtNotificationIcon from '../components/DebtNotificationIcon';
import { toast } from "@/lib/toast";
import { Link } from 'react-router-dom';
import Logo from '../../assets/logo.png';
import { useLicense, PREMIUM_FEATURES } from '@/contexts/LicenseContext';
import { Badge } from '@/components/ui/badge';
import PremiumPopup from '@/components/PremiumPopup';
import { PermissionBasedLink, ROUTE_PERMISSIONS } from '@/components/PermissionBasedNavigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const Dashboard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { data: settingsData } = useSelector((state: RootState) => state.settings);
  const { hasFeatureAccess, isLoading: licenseLoading, isPremium } = useLicense();
  
  // State for real-time date and time
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Premium popup state
  const [showPremiumPopup, setShowPremiumPopup] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<{name: string, description: string} | null>(null);
  
  // Tile size state
  const [tileSize, setTileSize] = useState(() => {
    return settingsData?.dashboard_tile_size || 'medium';
  });

  // Loading state for menu items
  const [isMenuLoading, setIsMenuLoading] = useState(true);

  // Premium feature mapping
  const premiumFeatureMap = {
    '/customers': { feature: PREMIUM_FEATURES.CUSTOMERS, name: 'إدارة العملاء', description: 'قاعدة بيانات شاملة للعملاء مع تاريخ المشتريات' },
    '/reports': { feature: PREMIUM_FEATURES.REPORTS, name: 'التقارير المتقدمة', description: 'تقارير مفصلة للمبيعات والأرباح والمنتجات' },
    '/debts': { feature: PREMIUM_FEATURES.DEBTS, name: 'إدارة الديون', description: 'تتبع ديون العملاء والموردين مع تنبيهات الاستحقاق' },
    '/installments': { feature: PREMIUM_FEATURES.INSTALLMENTS, name: 'إدارة الأقساط', description: 'تتبع وإدارة أقساط العملاء مع تنبيهات الدفع' },
    '/expenses': { feature: PREMIUM_FEATURES.EXPENSES, name: 'إدارة المصروفات', description: 'تتبع وتصنيف جميع مصروفات الشركة' },
    '/suppliers': { feature: PREMIUM_FEATURES.SUPPLIERS, name: 'إدارة الموردين', description: 'قاعدة بيانات شاملة للموردين مع تاريخ المشتريات' }
  };

  // Default menu items - always available as fallback
  const defaultMenuItems = useMemo(() => [
    { id: 'dashboard', name: 'لوحة التحكم', path: '/dashboard-charts', icon: 'LayoutDashboard', enabled: true, active: true, category: 'main' },
    { id: 'pos', name: 'نقطة البيع', path: '/pos', icon: 'ShoppingCart', enabled: true, active: true, category: 'sales' },
    { id: 'sales', name: 'المبيعات', path: '/sales', icon: 'DollarSign', enabled: true, active: true, category: 'sales' },
    { id: 'purchases', name: 'المشتريات', path: '/purchases', icon: 'Truck', enabled: true, active: true, category: 'purchases' },
    { id: 'inventory', name: 'المنتجات', path: '/inventory', icon: 'Package', enabled: true, active: true, category: 'inventory' },
    { id: 'bills', name: 'الفواتير', path: '/bills', icon: 'ClipboardList', enabled: true, active: true, category: 'bills' },
    { id: 'admin-cash-box', name: 'إدارة الصناديق', path: '/admin-cash-box', icon: 'Settings', enabled: true, active: true, category: 'admin' },
    { id: 'customers', name: 'العملاء', path: '/customers', icon: 'Users', enabled: true, active: true, category: 'customers' },
    { id: 'suppliers', name: 'الموردين', path: '/suppliers', icon: 'Store', enabled: true, active: true, category: 'suppliers' },
    { id: 'customer-receipts', name: 'سند قبض', path: '/customer-receipts', icon: 'Receipt', enabled: true, active: true, category: 'receipts' },
    { id: 'supplier-payment-receipts', name: 'سند صرف', path: '/supplier-payment-receipts', icon: 'CreditCard', enabled: true, active: true, category: 'receipts' },
    { id: 'expenses', name: 'المصروفات', path: '/expenses', icon: 'ReceiptText', enabled: true, active: true, category: 'finance' },
    { id: 'reports', name: 'التقارير', path: '/reports', icon: 'BarChart', enabled: true, active: true, category: 'reports' },
    { id: 'debts', name: 'الديون', path: '/debts', icon: 'FileText', enabled: true, active: true, category: 'finance' },
    { id: 'installments', name: 'الأقساط', path: '/installments', icon: 'CreditCard', enabled: true, active: true, category: 'finance' },
    { id: 'settings', name: 'الإعدادات', path: '/settings', icon: 'Settings', enabled: true, active: true, category: 'settings' },
  ], []);

  // Menu items state with proper initialization
  const [menuItems, setMenuItems] = useState(defaultMenuItems);

  // Call center modal state
  const [showCallCenterModal, setShowCallCenterModal] = useState(false);
  
  // App info state
  const [appInfo, setAppInfo] = useState<{
    name?: string;
    version: string;
    platform?: string;
    arch?: string;
    isPackaged?: boolean;
    isElectron?: boolean;
    nodeVersion?: string;
    electronVersion?: string;
  } | null>(null);

  // Load app info
  const loadAppInfo = async () => {
    try {
      // Set default app info
      setAppInfo({
        name: 'اوركاش',
        version: '1.0.0',
        platform: 'desktop',
        isElectron: true
      });
    } catch (error) {
      console.error('Failed to load app info:', error);
      // Fallback values
      setAppInfo({
        name: 'اوركاش',
        version: '1.0.0',
        platform: 'unknown',
        isElectron: false
      });
    }
  };

  // Helper functions for color manipulation
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 59, g: 130, b: 246 };
  };

  const rgbToHue = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    
    if (max === min) return 0;
    
    const d = max - min;
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    return h * 60;
  };

  const hueToRgb = (h: number, s: number, l: number) => {
    h /= 360;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    const hueToRgbComponent = (t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    return {
      r: Math.round(hueToRgbComponent(h + 1/3) * 255),
      g: Math.round(hueToRgbComponent(h) * 255),
      b: Math.round(hueToRgbComponent(h - 1/3) * 255)
    };
  };

  const getComplementaryColor = (hex: string) => {
    const rgb = hexToRgb(hex);
    return `#${(255 - rgb.r).toString(16).padStart(2, '0')}${(255 - rgb.g).toString(16).padStart(2, '0')}${(255 - rgb.b).toString(16).padStart(2, '0')}`;
  };

  const getAnalogousColor = (hex: string) => {
    const rgb = hexToRgb(hex);
    const hue = rgbToHue(rgb.r, rgb.g, rgb.b);
    const newHue = (hue + 30) % 360;
    const newRgb = hueToRgb(newHue, 0.6, 0.8);
    return `#${newRgb.r.toString(16).padStart(2, '0')}${newRgb.g.toString(16).padStart(2, '0')}${newRgb.b.toString(16).padStart(2, '0')}`;
  };

  const getTriadicColor = (hex: string, position: number) => {
    const rgb = hexToRgb(hex);
    const hue = rgbToHue(rgb.r, rgb.g, rgb.b);
    const newHue = (hue + (position * 120)) % 360;
    const newRgb = hueToRgb(newHue, 0.6, 0.8);
    return `#${newRgb.r.toString(16).padStart(2, '0')}${newRgb.g.toString(16).padStart(2, '0')}${newRgb.b.toString(16).padStart(2, '0')}`;
  };

  const getLighterColor = (hex: string, factor: number) => {
    const rgb = hexToRgb(hex);
    const lighterRgb = {
      r: Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor)),
      g: Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor)),
      b: Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor))
    };
    return `#${lighterRgb.r.toString(16).padStart(2, '0')}${lighterRgb.g.toString(16).padStart(2, '0')}${lighterRgb.b.toString(16).padStart(2, '0')}`;
  };

  const getDarkerColor = (hex: string, factor: number) => {
    const rgb = hexToRgb(hex);
    const darkerRgb = {
      r: Math.max(0, Math.round(rgb.r * (1 - factor))),
      g: Math.max(0, Math.round(rgb.g * (1 - factor))),
      b: Math.max(0, Math.round(rgb.b * (1 - factor)))
    };
    return `#${darkerRgb.r.toString(16).padStart(2, '0')}${darkerRgb.g.toString(16).padStart(2, '0')}${darkerRgb.b.toString(16).padStart(2, '0')}`;
  };

  // Single color based on app settings
  const cardColor = useMemo(() => {
    return settingsData?.primary_color || '#3B82F6';
  }, [settingsData]);

  // Function to get icon color for cards
  const getIconColorForCard = () => {
    // For solid color cards, use white icons for better contrast
    return '#ffffff';
  };

  // Function to get card background color
  const getCardBackground = () => {
    return cardColor;
  };

  useEffect(() => {
    // Always fetch settings if not available
    if (!settingsData) {
      dispatch(fetchSettings());
    }
    
    // Load app info
    loadAppInfo();
    
    // Initialize menu items from settings only
    const initializeMenuItems = () => {
      let items = defaultMenuItems;
      
      // Get from settings only
      if (settingsData?.sidebar_menu_items) {
        try {
          const parsed = JSON.parse(settingsData.sidebar_menu_items);
          if (Array.isArray(parsed) && parsed.length > 0) {
            items = parsed;
          }
        } catch (error) {
          console.error('Error parsing settings menu items:', error);
        }
      }
      
      setMenuItems(items);
      setIsMenuLoading(false); // Menu items initialized
    };

    // Initialize menu items
    initializeMenuItems();
    
    // Set up time interval - update every second for real-time clock
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000); // 1 second
    
    // Event handlers for runtime updates (removed localStorage dependencies)
    const handler = () => {
      // Settings updates will be handled by the settings effect
      // No need for localStorage here anymore
    };
    
    window.addEventListener('dashboardTileSizeChanged', handler);
    window.addEventListener('sidebarMenuItemsChanged', handler);
    
    return () => {
      clearInterval(timeInterval);
      window.removeEventListener('dashboardTileSizeChanged', handler);
      window.removeEventListener('sidebarMenuItemsChanged', handler);
    };
  }, [dispatch, settingsData, defaultMenuItems]);

  // Separate effect to handle settings updates
  useEffect(() => {
    if (settingsData) {
      // Update tile size from settings
      if (settingsData.dashboard_tile_size) {
        setTileSize(settingsData.dashboard_tile_size);
      }
      
      // Update menu items from settings
      if (settingsData.sidebar_menu_items) {
        try {
          const parsed = JSON.parse(settingsData.sidebar_menu_items);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMenuItems(parsed);
            setIsMenuLoading(false);
          }
        } catch (error) {
          console.error('Error parsing settings menu items:', error);
          // Keep default menu items on error
          setMenuItems(defaultMenuItems);
          setIsMenuLoading(false);
        }
      } else {
        // Ensure loading state is cleared even without settings
        setIsMenuLoading(false);
      }
    }
  }, [settingsData, defaultMenuItems]);

  const handleLogout = () => {
    dispatch(logout());
    toast.success('تم تسجيل الخروج بنجاح');
  };

  // Check if a menu item requires premium access
  const isPremiumFeature = (path: string) => {
    return path in premiumFeatureMap;
  };

  // Check if user has access to a premium feature
  const hasAccessToFeature = (path: string) => {
    const featureInfo = premiumFeatureMap[path as keyof typeof premiumFeatureMap];
    if (!featureInfo) return true; // Non-premium feature, always accessible
    return hasFeatureAccess(featureInfo.feature);
  };

  // Handle click on premium feature
  const handlePremiumFeatureClick = (e: React.MouseEvent, path: string) => {
    if (isPremiumFeature(path) && !hasAccessToFeature(path)) {
      e.preventDefault();
      const featureInfo = premiumFeatureMap[path as keyof typeof premiumFeatureMap];
      setSelectedFeature(featureInfo);
      setShowPremiumPopup(true);
    }
  };

  // Modern color scheme with gradients and better contrast using app settings
  const colors = useMemo(() => {
    const primaryColor = settingsData?.primary_color || '#3B82F6';
    const secondaryColor = settingsData?.secondary_color || '#64748b';
    
    // Helper function to convert hex to RGB
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 59, g: 130, b: 246 }; // Default blue
    };
    
    const primaryRgb = hexToRgb(primaryColor);
    const secondaryRgb = hexToRgb(secondaryColor);
    
    // Create variations of the primary color
    const primaryLight = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.1)`;
    const primaryMedium = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.3)`;
    const primaryDark = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.8)`;
    
    // Create variations of the secondary color
    const secondaryLight = `rgba(${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}, 0.1)`;
    const secondaryMedium = `rgba(${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}, 0.3)`;
    
    return {
      primary: {
        DEFAULT: primaryColor,
        dark: primaryDark,
        light: primaryLight,
        medium: primaryMedium,
        gradient: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
        glass: primaryLight,
        rgb: primaryRgb
      },
      secondary: {
        DEFAULT: secondaryColor,
        light: secondaryLight,
        medium: secondaryMedium,
        rgb: secondaryRgb
      },
      background: {
        light: '#f8fafc',
        DEFAULT: '#ffffff',
        dark: '#f1f5f9',
        glass: 'rgba(255, 255, 255, 0.8)',
        glassDark: 'rgba(0, 0, 0, 0.05)',
        primary: primaryLight,
        secondary: secondaryLight
      },
      text: {
        primary: '#1e293b',
        secondary: secondaryColor,
        inverted: '#ffffff',
        muted: '#94a3b8',
        accent: primaryColor
      },
      accent: {
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: primaryColor,
        primary: primaryColor,
        secondary: secondaryColor
      },
      border: {
        light: '#e2e8f0',
        DEFAULT: '#cbd5e1',
        dark: '#94a3b8',
        primary: primaryColor,
        secondary: secondaryColor
      }
    };
  }, [settingsData]);

  const tileSizeClass = tileSize === 'large'
    ? 'min-w-[280px] min-h-[220px] text-lg'
    : tileSize === 'small'
      ? 'min-w-[140px] min-h-[120px] text-sm'
      : 'min-w-[200px] min-h-[180px] text-base';

  const getIcon = (iconName: string) => {
    const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
      'LayoutDashboard': LayoutDashboard,
      'ShoppingCart': ShoppingCart,
      'DollarSign': DollarSign,
      'Truck': Truck,
      'Package': Package,
      'Users': Users,
      'Store': Store,
      'ReceiptText': ReceiptText,
      'Receipt': Receipt,
      'BarChart': BarChart,
      'FileText': FileText,
      'ClipboardList': ClipboardList,
      'CreditCard': CreditCard,
      'Info': Info,
      'Settings': Settings,
    };
    return iconMap[iconName] || LayoutDashboard;
  };

  // Group menu items by category
  const groupedMenuItems = useMemo(() => {
    const items = (menuItems && menuItems.length > 0 ? menuItems : defaultMenuItems)
      .filter(item => item && item.enabled);
    
    const groups = {
      main: items.filter(item => item.category === 'main'),
      sales: items.filter(item => item.category === 'sales'),
      inventory: items.filter(item => item.category === 'inventory'),
      finance: items.filter(item => item.category === 'finance'),
      customers: items.filter(item => item.category === 'customers'),
      suppliers: items.filter(item => item.category === 'suppliers'),
      receipts: items.filter(item => item.category === 'receipts'),
      reports: items.filter(item => item.category === 'reports'),
      settings: items.filter(item => item.category === 'settings'),
      other: items.filter(item => !item.category)
    };
    
    return groups;
  }, [menuItems, defaultMenuItems]);


  return (
    <div className="min-h-screen flex flex-col scrollbar-hide bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Modern Header with Glass Effect */}
      <header className="sticky left-0 top-0 z-50 w-full backdrop-blur-md border-b border-white/20 h-16 shadow-lg" 
        style={{ 
          background: `linear-gradient(135deg, ${colors.primary.DEFAULT} 0%, ${colors.primary.DEFAULT}dd 100%)`,
          boxShadow: `0 4px 20px rgba(0, 0, 0, 0.1)`
        }}>
        <div className="container mx-auto px-4 py-4 flex justify-between items-center h-full">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <img src={Logo} alt="Logo" className="w-24 h-12 object-contain" />
            </div>
          </div>

          {/* Modern Time Display */}
          <div className="hidden md:flex flex-col items-center px-4 py-2 rounded-xl ">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-sm font-medium text-white">
                {currentTime.toLocaleDateString('ar-IQ', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
            <span className="text-lg font-bold text-white">
              {currentTime.toLocaleTimeString('ar-IQ', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
              })}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <DebtNotificationIcon/>
            
            {/* Modern User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105"
                >
                  <UserCircle className="w-6 h-6 text-white" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-64 rounded-2xl border-0 shadow-2xl backdrop-blur-md"
                style={{ 
                  backgroundColor: colors.background.glass,
                  border: `1px solid ${colors.border.light}`
                }}
              >
                <DropdownMenuLabel className="font-normal p-4" style={{ color: colors.text.primary }}>
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.primary.DEFAULT }}>
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                          {user?.name}
                        </p>
                        <p className="text-xs" style={{ color: '#64748b' }}>
                          {user?.role === 'admin' ? 'مدير النظام' : 'مستخدم'}
                        </p>
                      </div>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator style={{ backgroundColor: colors.border.light }} />
                {user?.role === 'admin' && (
                  <DropdownMenuItem asChild>
                    <Link 
                      to="/admin-profiles" 
                      className="w-full cursor-pointer flex items-center gap-3 p-3 rounded-lg transition-colors"
                      style={{ 
                        color: colors.text.primary,
                        backgroundColor: colors.background.light
                      }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: colors.primary.light }}>
                        <User className="w-4 h-4" style={{ color: colors.primary.DEFAULT }} />
                      </div>
                      <span>إدارة المشرفين</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="cursor-pointer p-3 rounded-lg transition-colors"
                  style={{ 
                    color: colors.accent.danger,
                    backgroundColor: colors.background.light
                  }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: colors.accent.danger + '20' }}>
                    <LogOut className="w-4 h-4" style={{ color: colors.accent.danger }} />
                  </div>
                  <span>تسجيل الخروج</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content with Modern Layout */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
   

        {/* Navigation Tiles with Modern Design */}
        {isMenuLoading ? (
          <div className="space-y-8">
            {Object.keys(groupedMenuItems).map((category) => (
              <div key={`skeleton-${category}`} className="space-y-4">
                <div className="h-6 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={`skeleton-${category}-${index}`}
                      className="flex flex-col items-center justify-center rounded-2xl shadow-lg p-6 border animate-pulse h-32"
                style={{
                  backgroundColor: colors.background.glass,
                  borderColor: colors.border.light,
                }}
              >
                <div className="w-12 h-12 bg-gray-300 rounded-2xl mb-4"></div>
                <div className="w-20 h-4 bg-gray-300 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedMenuItems).map(([category, items]) => {
              if (items.length === 0) return null;
              
              return (
                <div key={category} className="space-y-4">
              
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {items.map((item, index) => {
              const Icon = getIcon(item.icon);
              const isPremium = isPremiumFeature(item.path);
              const hasAccess = hasAccessToFeature(item.path);
              const isLocked = isPremium && !hasAccess;
                      // No color index needed - using single color
              
              if (isLocked) {
                return (
                  <div
                    key={item.id || item.path}
                    onClick={(e: React.MouseEvent) => handlePremiumFeatureClick(e, item.path)}
                            className="group relative flex flex-col items-center justify-center rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-105 h-32"
                    style={{
                      background: `linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)`,
                      border: `1px solid ${colors.border.light}`,
                    }}
                  >
                    {/* Premium Badge */}
                            <div className="absolute top-2 right-2 z-10">
                      <Badge 
                        variant="secondary" 
                                className="text-xs bg-gray-500 text-white border-0 rounded-full px-2 py-1"
                      >
                        <Lock className="w-3 h-3 mr-1" />
                        مقفل
                      </Badge>
                    </div>

                    <div 
                              className="p-3 mb-3 rounded-xl transition-all duration-300 group-hover:scale-110"
                      style={{ backgroundColor: 'rgba(156, 163, 175, 0.2)' }}
                    >
                      <Icon 
                                size={28} 
                        className="text-gray-500"
                      />
                    </div>
                            <span className="font-semibold text-sm text-center mb-1" style={{ color: colors.text.primary }}>
                      {item.name}
                    </span>
                    
                    <span className="text-xs text-center" style={{ color: colors.text.muted }}>
                              يتطلب اشتراك مميز
                    </span>
                  </div>
                );
              }

              return (
                <PermissionBasedLink
                  key={item.id || item.path}
                  to={item.path}
                  className="group relative flex flex-col items-center justify-center rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 h-32 w-full"
                  style={{
                    backgroundColor: getCardBackground(),
                    border: `1px solid ${colors.border.light}`,
                  }}
                    showAccessDenied={true}
                    accessDeniedMessage={`ليس لديك صلاحية للوصول إلى ${item.name}`}
                  >
                    {/* Premium Badge for accessible premium features */}
                    {isPremium && hasAccess && (
                    <div className="absolute top-2 right-2">
                        <Badge 
                          variant="default" 
                        className="text-xs bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 rounded-full px-2 py-1 shadow-lg"
                        >
                          <Crown className="w-3 h-3 mr-1" />
                          مميز
                        </Badge>
                      </div>
                    )}

                    <div 
                    className="p-3 mb-3 rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                    >
                      <Icon 
                      size={28} 
                      className="text-white"
                      />
                    </div>
                  <span className="font-semibold text-sm text-center text-white">{item.name}</span>
                  </PermissionBasedLink>
              );
                    })}
                  </div>
                </div>
            );
          })}
          </div>
        )}
      </main>

      {/* Premium Popup */}
      {showPremiumPopup && selectedFeature && (
        <PremiumPopup
          isOpen={showPremiumPopup}
          onClose={() => {
            setShowPremiumPopup(false);
            setSelectedFeature(null);
          }}
          featureName={selectedFeature.name}
          featureDescription={selectedFeature.description}
        />
      )}

      {/* Modern Footer */}
      <footer 
        className="border-t mt-auto py-6 w-full backdrop-blur-md"
        style={{ 
          backgroundColor: colors.background.glass,
          borderColor: colors.border.light
        }}
      >
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-4 text-sm mb-4 md:mb-0" style={{ color: colors.text.primary }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>© {new Date().getFullYear()} URUX System</span>
            </div>
            <span className="hidden md:block">•</span>
            <span>الإصدار {appInfo?.version || '1.0.0'}</span>
          </div>
          <div className="flex items-center gap-6">
            <PermissionBasedLink 
              to="/about"
              className="text-sm hover:underline transition-colors"
              showAccessDenied={false}
            >
              <span style={{ color: colors.accent.primary }}>من نحن</span>
            </PermissionBasedLink>
            <button 
              type="button"
              className="text-sm hover:underline bg-transparent border-0 p-0 m-0 transition-colors"
              style={{ color: colors.accent.primary }}
              onClick={() => setShowCallCenterModal(true)}
            >
              الدعم الفني
            </button>
            <a 
              href="https://urux.guru" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm hover:underline transition-colors"
              style={{ color: colors.accent.primary }}
            >
              تواصل معنا
            </a>
          </div>
        </div>
      </footer>

      {/* Modern Call Center Modal */}
      <Dialog open={showCallCenterModal} onOpenChange={setShowCallCenterModal}>
        <DialogContent className="max-w-md rounded-3xl border-0 shadow-2xl" 
          style={{ 
            backgroundColor: colors.background.glass,
            color: colors.text.primary,
            backdropFilter: 'blur(20px)'
          }}>
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl font-bold mb-2">معلومات مركز الدعم الفني</DialogTitle>
            <DialogDescription className="text-sm" style={{ color: colors.text.secondary }}>
              يمكنك التواصل مع مركز الدعم الفني عبر الطرق التالية
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-center" dir='rtl'>
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
              <span className="font-bold text-blue-600">الهاتف:</span>
              <a href="tel:+9647838584311" className="text-blue-600 hover:underline block mt-1">
                +964&nbsp;783&nbsp;858&nbsp;4311
              </a>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
              <span className="font-bold text-green-600">واتساب:</span>
              <a href="https://wa.me/9647838584311" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline block mt-1">
                +964&nbsp;783&nbsp;858&nbsp;4311
              </a>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-100">
              <span className="font-bold text-purple-600">البريد الإلكتروني:</span>
              <a href="mailto:support@urux.guru" className="text-purple-600 hover:underline block mt-1">
                support@urux.guru
              </a>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100">
              <span className="font-bold text-orange-600">ساعات العمل:</span> 
              <span className="text-orange-600 block mt-1">24/7</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;