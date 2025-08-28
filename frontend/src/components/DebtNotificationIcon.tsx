import React, { useState } from 'react';
import { Bell, AlertCircle, Clock, AlertTriangle, X, RefreshCw, Package, PackageX, Calendar, Archive } from 'lucide-react';
import { useNotifications, Notification } from '../contexts/DebtNotificationContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from '@/lib/utils';

const NotificationIcon: React.FC = () => {
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead, 
    dismissNotification,
    refreshNotifications 
  } = useNotifications();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const getNotificationIcon = (notification: Notification) => {
    switch (notification.type) {
      case 'debt':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'inventory':
        return <Package className="h-4 w-4 text-orange-500" />;
      case 'update':
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationStyle = (notification: Notification) => {
    const baseStyle = "border-r-4 transition-all duration-200 bg-white shadow-sm";
    
    if (notification.type === 'debt') {
      return `${baseStyle} border-r-red-500 hover:bg-red-50`;
    } else if (notification.type === 'inventory') {
      return `${baseStyle} border-r-orange-500 hover:bg-orange-50`;
    } else if (notification.type === 'update') {
      return `${baseStyle} border-r-blue-500 hover:bg-blue-50`;
    }
    return `${baseStyle} border-r-gray-500 hover:bg-gray-50`;
  };

  const getNotificationTypeText = (notification: Notification) => {
    if (notification.type === 'debt') {
      return 'دين';
    } else if (notification.type === 'inventory') {
      return 'مخزون';
    } else if (notification.type === 'update') {
      return 'تحديث';
    }
    return 'إشعار';
  };

  const getNotificationTypeBadge = (notification: Notification) => {
    if (notification.type === 'debt') {
      return 'bg-red-100 text-red-800 border-red-200';
    } else if (notification.type === 'inventory') {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    } else if (notification.type === 'update') {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.type === 'debt') {
      navigate(`/debts?customer_id=${notification.debt.customer_id}`);
    } else if (notification.type === 'inventory') {
      navigate(`/inventory?search=${notification.product.name}`);
    } else if (notification.type === 'update') {
      // Handle update notification - open settings page
      navigate('/settings');
    }
    setIsOpen(false);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleDismissNotification = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    dismissNotification(notificationId);
  };

  const handleRefresh = () => {
    refreshNotifications();
  };

  const getNotificationDetails = (notification: Notification) => {
    if (notification.type === 'debt') {
      return {
        subtitle: `فاتورة: ${notification.debt.invoice_no}`,
        date: formatDate(notification.debt.due_date)
      };
    } else if (notification.type === 'inventory') {
      return {
        subtitle: `كود المنتج: ${notification.product.sku}`,
        date: notification.product.expiry_date ? formatDate(notification.product.expiry_date) : 'لا يوجد تاريخ انتهاء'
      };
    } else if (notification.type === 'update') {
      return {
        subtitle: `الإصدار الجديد: ${notification.update.version}`,
        date: formatDate(notification.timestamp.toISOString())
      };
    }
    return {
      subtitle: '',
      date: ''
    };
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen} dir="rtl">
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-white hover:bg-white/20 transition-all duration-200 bg-primary rounded-full shadow-lg hover:shadow-xl"
        >
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white rounded-full animate-pulse shadow-md"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-96 max-h-[500px] overflow-hidden bg-white shadow-xl border-0 rounded-lg"
        sideOffset={8}
      >
        <DropdownMenuLabel className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-b">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <span className="font-semibold text-gray-800">الإشعارات</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="bg-primary/20 text-primary">
                {unreadCount} جديد
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="h-8 w-8 p-0 hover:bg-primary/20 rounded-full"
              title="تحديث الإشعارات"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs h-8 px-3 hover:bg-primary/20 rounded-full"
                title="قراءة جميع الإشعارات"
              >
                قراءة الكل
              </Button>
            )}
          </div>
        </DropdownMenuLabel>
        
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium mb-1">لا توجد إشعارات</p>
            <p className="text-xs text-gray-400">ستظهر هنا عند وجود ديون مستحقة أو مشاكل في المخزون</p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.map((notification) => {
              const details = getNotificationDetails(notification);
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    "flex flex-col items-start p-4 cursor-pointer m-1 mx-2 rounded-lg",
                    getNotificationStyle(notification)
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-gray-800 truncate">
                              {notification.title}
                            </h4>
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs px-2 py-0.5", getNotificationTypeBadge(notification))}
                            >
                              {getNotificationTypeText(notification)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDismissNotification(e, notification.id)}
                              className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                              title="إزالة الإشعار"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mb-3 text-right leading-relaxed">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="bg-gray-100 px-2 py-1 rounded-full">
                            <span className="text-xs text-gray-700 font-medium">
                              {details.subtitle}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {details.date}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                navigate('/debts');
                setIsOpen(false);
              }}
              className="text-center text-primary hover:text-primary/90 justify-center p-4 m-2 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">عرض جميع الإشعارات</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationIcon; 