import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../app/store';
import { getDebts } from '../features/debts/debtsSlice';
import { getExpiringProducts, getLowStockProducts } from '../features/inventory/inventorySlice';
import { DebtData } from '../features/debts/debtsService';
import { Product } from '../features/inventory/types';

export interface DebtNotification {
  id: string;
  type: 'debt';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
  debt: any;
}

export interface InventoryNotification {
  id: string;
  type: 'inventory';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
  product: any;
}

interface UpdateNotification {
  id: string;
  type: 'update';
  title: string;
  message: string;
  priority: 'high';
  timestamp: Date;
  update: {
    version: string;
    downloadUrl: string;
    releaseData: any;
  };
}

export type Notification = DebtNotification | InventoryNotification | UpdateNotification;

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  checkNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (notificationId: string) => void;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());

  const dispatch = useDispatch<AppDispatch>();
  const { items: debts } = useSelector((state: RootState) => state.debts);
  const { items: products } = useSelector((state: RootState) => state.inventory);

  // Check for all types of notifications
  const checkNotifications = async () => {
    setIsLoading(true);
    try {
      // Fetch latest debts
      await dispatch(getDebts({ 
        status: 'pending', 
        limit: 100 
      }));
      
      // Fetch expiring products (within 30 days)
      await dispatch(getExpiringProducts(30));
      
      // Fetch low stock products
      await fetchLowStockProducts();
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch low stock products
  const fetchLowStockProducts = async () => {
    try {
      await dispatch(getLowStockProducts(10));
      // The inventory will be updated through the Redux store
    } catch (error) {
      console.error('Error fetching low stock products:', error);
    }
  };

  // Handle update notifications from Electron
  useEffect(() => {
    if ((window as any).electron?.onUpdateNotification) {
      const handleUpdateNotification = (notification: any) => {
        if (notification.type === 'update-available') {
          const updateNotification: UpdateNotification = {
            id: `update_${notification.version}`,
            type: 'update',
            title: notification.title,
            message: notification.message,
            priority: 'high',
            timestamp: new Date(),
            update: {
              version: notification.version,
              downloadUrl: notification.downloadUrl,
              releaseData: notification.releaseData
            }
          };
          
          setNotifications(prev => {
            // Remove any existing update notifications
            const filtered = prev.filter(n => n.type !== 'update');
            return [updateNotification, ...filtered];
          });
        }
      };

      (window as any).electron.onUpdateNotification(handleUpdateNotification);

      return () => {
        if ((window as any).electron?.removeUpdateNotificationListener) {
          (window as any).electron.removeUpdateNotificationListener(handleUpdateNotification);
        }
      };
    }
  }, []);

  // Generate debt notifications
  const generateDebtNotifications = (debts: any[]): DebtNotification[] => {
    const notifications: DebtNotification[] = [];
    const now = new Date();

    debts.forEach(debt => {
      if (!debt.due_date) return;

      const dueDate = new Date(debt.due_date);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Overdue debts (high priority)
      if (daysOverdue > 0) {
        notifications.push({
          id: `overdue_${debt.sale_id}`,
          type: 'debt' as const,
          title: 'دين متأخر',
          message: `الدين من ${debt.customer_name} متأخر ${daysOverdue} يوم - المبلغ: ${debt.remaining_amount} ريال`,
          priority: 'high',
          timestamp: dueDate,
          debt
        });
      }
      // Due today (high priority)
      else if (daysUntilDue === 0) {
        notifications.push({
          id: `due_today_${debt.sale_id}`,
          type: 'debt' as const,
          title: 'دين مستحق اليوم',
          message: `الدين من ${debt.customer_name} مستحق اليوم - المبلغ: ${debt.remaining_amount} ريال`,
          priority: 'high',
          timestamp: dueDate,
          debt
        });
      }
      // Due within 3 days (medium priority)
      else if (daysUntilDue <= 3 && daysUntilDue > 0) {
        notifications.push({
          id: `due_soon_${debt.sale_id}`,
          type: 'debt' as const,
          title: 'دين مستحق قريباً',
          message: `الدين من ${debt.customer_name} مستحق خلال ${daysUntilDue} يوم - المبلغ: ${debt.remaining_amount} ريال`,
          priority: 'medium',
          timestamp: dueDate,
          debt
        });
      }
    });

    return notifications;
  };

  // Generate inventory notifications
  const generateInventoryNotifications = (products: any[]): InventoryNotification[] => {
    const notifications: InventoryNotification[] = [];
    const now = new Date();

    products.forEach(product => {
      // Low stock notifications
      if (product.current_stock <= product.min_stock && product.current_stock > 0) {
        notifications.push({
          id: `low_stock_${product.id}`,
          type: 'inventory',
          title: 'مخزون منخفض',
          message: `المنتج "${product.name}" وصل إلى حد أدنى للمخزون - المتبقي: ${product.current_stock} ${product.unit}`,
          priority: 'medium',
          timestamp: now,
          product
        });
      }

      // Out of stock notifications
      if (product.current_stock <= 0) {
        notifications.push({
          id: `out_of_stock_${product.id}`,
          type: 'inventory',
          title: 'نفاد المخزون',
          message: `المنتج "${product.name}" نفد من المخزون - يتطلب إعادة تموين`,
          priority: 'high',
          timestamp: now,
          product
        });
      }

      // Expiry notifications
      if (product.expiry_date) {
        const expiryDate = new Date(product.expiry_date);
        const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Expired products
        if (daysUntilExpiry < 0) {
          notifications.push({
            id: `expired_${product.id}`,
            type: 'inventory',
            title: 'منتج منتهي الصلاحية',
            message: `المنتج "${product.name}" منتهي الصلاحية منذ ${Math.abs(daysUntilExpiry)} يوم - يجب إزالته`,
            priority: 'high',
            timestamp: expiryDate,
            product
          });
        }
        // Products expiring within 7 days
        else if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
          notifications.push({
            id: `expiring_${product.id}`,
            type: 'inventory',
            title: 'منتج قارب على الانتهاء',
            message: `المنتج "${product.name}" سينتهي خلال ${daysUntilExpiry} يوم - المخزون: ${product.current_stock} ${product.unit}`,
            priority: 'medium',
            timestamp: expiryDate,
            product
          });
        }
      }
    });

    return notifications;
  };

  // Update notifications when data changes
  useEffect(() => {
    const debtNotifications = generateDebtNotifications(debts);
    const inventoryNotifications = generateInventoryNotifications(products);
    
    const allNotifications = [...debtNotifications, ...inventoryNotifications]
      .sort((a, b) => {
        // Sort by priority (high first), then by timestamp
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return b.timestamp.getTime() - a.timestamp.getTime();
      });

    setNotifications(allNotifications);
    
    // Update unread count
    const unreadNotifications = allNotifications.filter(n => !readNotifications.has(n.id));
    setUnreadCount(unreadNotifications.length);
  }, [debts, products, readNotifications]);

  // Mark notification as read
  const markAsRead = (notificationId: string) => {
    setReadNotifications(prev => new Set(prev).add(notificationId));
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    const allNotificationIds = notifications.map(n => n.id);
    setReadNotifications(new Set(allNotificationIds));
    setUnreadCount(0);
  };

  // Dismiss notification
  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    setReadNotifications(prev => {
      const newSet = new Set(prev);
      newSet.delete(notificationId);
      return newSet;
    });
  };

  // Refresh notifications
  const refreshNotifications = () => {
    checkNotifications();
  };

  // Auto-refresh notifications every 15 minutes
  useEffect(() => {
    checkNotifications();
    
    const interval = setInterval(() => {
      checkNotifications();
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(interval);
  }, []);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    checkNotifications,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    refreshNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Keep the old hook for backwards compatibility
export const useDebtNotifications = useNotifications; 