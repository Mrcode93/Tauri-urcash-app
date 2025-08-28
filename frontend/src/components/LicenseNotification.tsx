import React, { useState, useEffect, useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { X, AlertTriangle, AlertCircle, Clock, CheckCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@/features/settings/useSettings';

interface LicenseNotificationData {
  level: string;
  message: string;
  data: {
    daysUntilExpiry: number;
    expiresAt: string;
    licenseType: string;
    action: string;
  };
  timestamp: string;
}

interface LicenseNotificationProps {
  notification: LicenseNotificationData;
  onDismiss: () => void;
  onRenew: () => void;
  onRemindLater: () => void;
}

const LicenseNotification: React.FC<LicenseNotificationProps> = ({
  notification,
  onDismiss,
  onRenew,
  onRemindLater
}) => {
  // Get settings using the hook for better management
  const { settings } = useSettings();
  
  // Enhanced color system with better contrast using app settings
  const colors = useMemo(() => {
    const primaryColor = settings?.primary_color || '#3B82F6';
    const secondaryColor = settings?.secondary_color || '#64748b';
    
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
  }, [settings]);

  const getNotificationIcon = (level: string) => {
    switch (level) {
      case 'expired':
        return <AlertCircle className="h-12 w-12" style={{ color: colors.accent.danger }} />;
      case 'warning_1_day':
        return <AlertTriangle className="h-12 w-12" style={{ color: colors.accent.danger }} />;
      case 'warning_5_days':
        return <AlertTriangle className="h-12 w-12" style={{ color: colors.accent.warning }} />;
      case 'warning_10_days':
        return <Clock className="h-12 w-12" style={{ color: colors.accent.warning }} />;
      default:
        return <CheckCircle className="h-12 w-12" style={{ color: colors.accent.success }} />;
    }
  };

  const getNotificationTitle = (level: string) => {
    switch (level) {
      case 'expired':
        return 'انتهت صلاحية الترخيص';
      case 'warning_1_day':
        return 'ينتهي الترخيص غداً';
      case 'warning_5_days':
        return 'ينتهي الترخيص قريباً';
      case 'warning_10_days':
        return 'تذكير بتجديد الترخيص';
      default:
        return 'إشعار الترخيص';
    }
  };

  const getActionButtonText = (action: string) => {
    switch (action) {
      case 'renew_immediately':
        return 'جدد الآن';
      case 'renew_urgently':
        return 'جدد الآن';
      case 'renew_soon':
        return 'جدد الترخيص';
      case 'consider_renewal':
        return 'جدد الترخيص';
      default:
        return 'جدد';
    }
  };

  const isUrgent = notification.level === 'expired' || notification.level === 'warning_1_day';
  const isCritical = notification.level === 'expired';

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-md mx-auto shadow-xl border-0"
        style={{
          background: colors.background.DEFAULT,
          border: `2px solid ${colors.border.primary}`,
          borderRadius: '16px'
        }}
      >
        <DialogHeader className="text-center">
          <DialogTitle className="flex items-center justify-center space-x-3 space-x-reverse">
            {getNotificationIcon(notification.level)}
            <span 
              className="text-xl font-bold"
              style={{ color: colors.text.primary }}
            >
              {getNotificationTitle(notification.level)}
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4" dir="rtl">
          <div className="text-center">
            <p 
              className="text-lg font-medium mb-4 leading-relaxed"
              style={{ color: colors.text.primary }}
            >
              {notification.message}
            </p>
            
            <div 
              className="border rounded-lg p-4 space-y-3"
              style={{
                background: colors.background.primary,
                borderColor: colors.border.primary
              }}
            >
              <div className="flex justify-between items-center">
                <span 
                  className="text-sm font-medium text-gray-500"
                >
                  نوع الترخيص:
                </span>
                <span 
                  className="text-sm font-bold"
                  style={{ color: colors.text.accent }}
                >
                  {notification.data.licenseType}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span 
                  className="text-sm font-medium text-gray-500"
                >
                  تاريخ الانتهاء:
                </span>
                <span 
                  className="text-sm font-bold"
                  style={{ color: colors.text.accent }}
                >
                  {new Date(notification.data.expiresAt).toLocaleDateString('ar-IQ')}
                </span>
              </div>
              {notification.data.daysUntilExpiry > 0 && (
                <div className="flex justify-between items-center">
                  <span 
                        className="text-sm font-medium text-gray-500"
                  >
                    الأيام المتبقية:
                  </span>
                  <span 
                    className="text-sm font-bold"
                    style={{
                      color: notification.data.daysUntilExpiry <= 1 
                        ? colors.accent.danger 
                        : notification.data.daysUntilExpiry <= 5 
                          ? colors.accent.warning 
                          : colors.accent.warning
                    }}
                  >
                    {notification.data.daysUntilExpiry} يوم
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            {isUrgent && (
              <Button 
                onClick={onRenew}
                variant={isCritical ? "destructive" : "default"}
                size="lg"
                className="w-full font-bold text-lg py-3"
                style={{
                  background: isCritical 
                    ? colors.accent.danger 
                    : colors.primary.DEFAULT,
                  color: colors.text.inverted,
                  border: 'none'
                }}
              >
                {getActionButtonText(notification.data.action)}
              </Button>
            )}
            
            {!isCritical && (
              <Button 
                onClick={onRemindLater}
                variant="outline"
                size="lg"
                className="w-full font-medium text-lg py-3"
                style={{
                  borderColor: colors.border.primary,
                  color: colors.text.accent,
                  background: 'transparent'
                }}
              >
                <RefreshCw className="h-5 w-5 ml-2" />
                ذكرني لاحقاً
              </Button>
            )}
            
            <Button 
              onClick={onDismiss}
              variant="ghost"
              size="lg"
              className="w-full font-medium text-lg py-3"
              style={{
                color: colors.text.muted,
                background: 'transparent'
              }}
            >
              <X className="h-5 w-5 ml-2" />
              إغلاق
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// License Notification Manager Component
export const LicenseNotificationManager: React.FC = () => {
  const [notifications, setNotifications] = useState<LicenseNotificationData[]>([]);
  const [currentNotificationIndex, setCurrentNotificationIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for HTTP notifications (polling)
    const checkForNotifications = async () => {
      try {
        const response = await fetch('http://localhost:39000/api/license/notifications');
        if (response.ok) {
          const data = await response.json();
          if (data.notifications && data.notifications.length > 0) {
            data.notifications.forEach((notification: LicenseNotificationData) => {
              addNotification(notification);
            });
          }
        }
      } catch (error) {
        // Ignore errors for polling
      }
    };

    // Check immediately on mount
    checkForNotifications();

    // Check again after 2 seconds for immediate response
    const immediateCheck = setTimeout(checkForNotifications, 2000);

    // Set up polling for notifications (every 10 seconds initially, then 30 seconds)
    const pollInterval = setInterval(checkForNotifications, 10000); // Check every 10 seconds

    return () => {
      clearTimeout(immediateCheck);
      clearInterval(pollInterval);
    };
  }, []);

  const addNotification = (notification: LicenseNotificationData) => {
    setNotifications(prev => {
      // Check if notification already exists
      const exists = prev.some(n => 
        n.level === notification.level && 
        n.data.expiresAt === notification.data.expiresAt
      );
      
      if (!exists) {
        return [...prev, notification];
      }
      return prev;
    });
  };

  const dismissNotification = () => {
    setNotifications(prev => {
      const newNotifications = prev.filter((_, i) => i !== currentNotificationIndex);
      if (newNotifications.length === 0) {
        setCurrentNotificationIndex(0);
      } else if (currentNotificationIndex >= newNotifications.length) {
        setCurrentNotificationIndex(0);
      }
      return newNotifications;
    });
  };

  const remindLater = () => {
    // Move to next notification or dismiss if last one
    if (currentNotificationIndex < notifications.length - 1) {
      setCurrentNotificationIndex(currentNotificationIndex + 1);
    } else {
      dismissNotification();
    }
  };

  const handleRenew = () => {
    // Dismiss the current notification first
    dismissNotification();
    // Navigate to settings page and open premium tab
    navigate('/settings?tab=premium');
  };

  // Show only one notification at a time
  const currentNotification = notifications[currentNotificationIndex];

  if (!currentNotification) {
    return null;
  }

  return (
    <LicenseNotification
      notification={currentNotification}
      onDismiss={dismissNotification}
      onRenew={handleRenew}
      onRemindLater={remindLater}
    />
  );
};

export default LicenseNotificationManager; 