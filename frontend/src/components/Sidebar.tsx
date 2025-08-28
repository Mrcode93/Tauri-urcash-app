import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../app/store';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Store, 
  Users, 
  Truck, 
  Package, 
  FileText, 
  BarChart,
  ChevronLeft,
  ChevronRight,
  X,
  DollarSign,
  Receipt,
  Info,
  Settings,
  ReceiptText,
  CreditCard,
  Warehouse
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect, useState } from 'react';
import { PermissionBasedLink, ROUTE_PERMISSIONS } from './PermissionBasedNavigation';
import { selectHasPermission } from '@/features/auth/authSlice';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  collapsed?: boolean;
  toggleCollapse?: () => void;
}

interface MenuItem {
  name: string;
  path: string;
  enabled: boolean;
}

const Sidebar = ({ isOpen, toggleSidebar, collapsed = false, toggleCollapse }: SidebarProps) => {
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    // Load saved menu items from localStorage
    const savedMenuItems = localStorage.getItem('sidebarMenuItems');
    if (savedMenuItems) {
      setMenuItems(JSON.parse(savedMenuItems));
    } else {
      // Default menu items
      const defaultMenuItems: MenuItem[] = [
        { name: 'لوحة التحكم', path: '/', enabled: true },
        { name: 'نقطة البيع', path: '/pos', enabled: true },
        { name: 'المبيعات', path: '/sales', enabled: true },        
        { name: 'المشتريات', path: '/purchases', enabled: true },
        { name: 'المنتجات', path: '/inventory', enabled: true },
        { name: 'العملاء', path: '/customers', enabled: true },
        {name: 'المخازن', path: '/stocks', enabled: true},
        { name: 'الموردين', path: '/suppliers', enabled: true },
        { name: 'المصروفات', path: '/expenses', enabled: true },
        { name: 'الفواتير', path: '/bills', enabled: true },
        { name: 'التقارير', path: '/reports', enabled: true },
        { name: 'الديون', path: '/debts', enabled: true },
        { name: 'سند قبض', path: '/customer-receipts', enabled: true },
        { name: 'سند صرف', path: '/customer-payments', enabled: true },
        { name:  'الأقساط', path: '/installments', enabled: true },
        { name: 'من نحن', path: '/about', enabled: true },
        { name: 'الإعدادات', path: '/settings', enabled: true },
      ];
      setMenuItems(defaultMenuItems);
      localStorage.setItem('sidebarMenuItems', JSON.stringify(defaultMenuItems));
    }

    // Listen for custom event to update menu items live
    const handleMenuChange = () => {
      const updatedMenuItems = localStorage.getItem('sidebarMenuItems');
      if (updatedMenuItems) {
        setMenuItems(JSON.parse(updatedMenuItems));
      }
    };
    window.addEventListener('sidebarMenuItemsChanged', handleMenuChange);
    return () => window.removeEventListener('sidebarMenuItemsChanged', handleMenuChange);
  }, []);

  const getIcon = (path: string) => {
    switch (path) {
      case '/':
        return LayoutDashboard;
      case '/pos':
        return Receipt;
      case '/sales':
        return ShoppingCart;
      case '/purchases':
        return Truck;
      case '/inventory':
        return Package;
      case '/customers':
        return Users;
      case '/suppliers':
        return Store;
      case '/expenses':
        return DollarSign;
      case '/reports':
        return BarChart;
      case '/debts':
        return FileText;
      case '/about':
        return Info;
      case '/settings':
        return Settings;
      case '/bills':
        return ReceiptText;
      case '/installments':
        return CreditCard;
      case '/stocks':
        return Warehouse;
      case '/customer-receipts':
        return Receipt;
      case '/customer-payments':
        return CreditCard;
      default:
        return LayoutDashboard;
    }
  };

  return (
    <aside
      className={cn(
        'bg-primary text-primary-foreground shadow-lg fixed inset-y-0 right-0 z-30  ',
        isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0',
        collapsed ? 'w-16 md:w-16' : 'w-40 md:w-40',
        'md:block',
        'transition-all duration-300 ease-in-out '
      )}
      style={{ transitionProperty: 'width, right, left, background, box-shadow' }}
    >
  {/* make open and close button is absolute   */}
  <div className="absolute top-0 left-[-15px] z-999">
    <button onClick={toggleCollapse} className="p-2 rounded-full bg-primary-foreground/30 border border-primary-foreground/50 hover:bg-primary-foreground/20 transition-colors">
      {!collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
    </button>
  </div>

      {/* Menu Items */}
      <nav className="mt-4 flex flex-col justify-start">
        <ul className="flex flex-col justify-start">
          {menuItems.filter(item => item.enabled).map((item) => {
            const Icon = getIcon(item.path);
            const requiredPermission = ROUTE_PERMISSIONS[item.path as keyof typeof ROUTE_PERMISSIONS];
            
            return (
              <li key={item.path} className="mb-1">
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PermissionBasedLink
                        to={item.path}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 hover:bg-primary-foreground/10 transition-colors',
                          location.pathname === item.path
                            ? 'text-primary-foreground border-r-4 border-primary-foreground bg-primary-foreground/10'
                            : 'text-primary-foreground/80',
                          collapsed && 'justify-center px-0'
                        )}
                        showAccessDenied={true}
                        accessDeniedMessage={`ليس لديك صلاحية للوصول إلى ${item.name}`}
                      >
                        <Icon size={20} />
                        {!collapsed && <span className="text-sm">{item.name}</span>}
                      </PermissionBasedLink>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="left" className="bg-primary text-primary-foreground">
                        {item.name}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;

