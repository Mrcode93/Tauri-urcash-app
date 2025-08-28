import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from "@/lib/toast";
import api from '@/lib/api';

interface BackupNotificationContextType {
  showBackupReminder: boolean;
  dismissBackupReminder: () => void;
  performBackup: () => Promise<void>;
  checkBackupStatus: () => Promise<void>;
}

const BackupNotificationContext = createContext<BackupNotificationContextType | undefined>(undefined);

interface BackupNotificationProviderProps {
  children: ReactNode;
}

export const BackupNotificationProvider: React.FC<BackupNotificationProviderProps> = ({ children }) => {
  const [showBackupReminder, setShowBackupReminder] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);

  // Check if backup is needed (every day at 12 PM)
  const checkBackupStatus = async () => {
    try {
      // Get last backup date from settings
      const settingsResponse = await api.get('/settings');
      if (settingsResponse.data.success) {
        const lastBackup = settingsResponse.data.data.last_backup_date;
        setLastBackupDate(lastBackup);
        
        if (shouldShowBackupReminder(lastBackup)) {
          setShowBackupReminder(true);
        }
      }
    } catch (error) {
      console.error('Error checking backup status:', error);
    }
  };  // Check if we should show backup reminder
  const shouldShowBackupReminder = (lastBackupDate: string | null): boolean => {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Show reminder at 12 PM (noon)
    if (currentHour !== 12) {
      return false;
    }

    if (!lastBackupDate) {
      return true; // No backup ever made
    }

    const lastBackup = new Date(lastBackupDate);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return lastBackup < oneDayAgo;
  };

  // Perform backup
  const performBackup = async () => {
    try {
      const response = await api.post('/database/backup');

      if (response.data.success) {
        // Update last backup date in settings
        await api.put('/settings', {
          last_backup_date: new Date().toISOString()
        });

        toast.success('تم النسخ الاحتياطي بنجاح - تم إنشاء نسخة احتياطية من قاعدة البيانات');
        
        setShowBackupReminder(false);
        setLastBackupDate(new Date().toISOString());
      } else {
        throw new Error(response.data.message || 'حدث خطأ');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل في النسخ الاحتياطي - حدث خطأ أثناء إنشاء النسخة الاحتياطية');
    }
  };

  // Dismiss backup reminder
  const dismissBackupReminder = () => {
    setShowBackupReminder(false);
    // Set a flag to not show again today
    localStorage.setItem('backupReminderDismissed', new Date().toDateString());
  };

  // Check if reminder was already dismissed today
  const wasReminderDismissedToday = (): boolean => {
    const dismissedDate = localStorage.getItem('backupReminderDismissed');
    if (!dismissedDate) return false;
    
    return dismissedDate === new Date().toDateString();
  };

  // Check backup status on mount and every hour
  useEffect(() => {
    checkBackupStatus();
    
    const interval = setInterval(() => {
      if (!wasReminderDismissedToday()) {
        checkBackupStatus();
      }
    }, 60 * 60 * 1000); // Check every hour

    return () => clearInterval(interval);
  }, []);

  // Clean up dismissed flag at midnight
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const timeout = setTimeout(() => {
      localStorage.removeItem('backupReminderDismissed');
    }, timeUntilMidnight);

    return () => clearTimeout(timeout);
  }, []);  const value: BackupNotificationContextType = {
    showBackupReminder: showBackupReminder && !wasReminderDismissedToday(),
    dismissBackupReminder,
    performBackup,
    checkBackupStatus
  };

  return (
    <BackupNotificationContext.Provider value={value}>
      {children}
    </BackupNotificationContext.Provider>
  );
};

export const useBackupNotification = (): BackupNotificationContextType => {
  const context = useContext(BackupNotificationContext);
  if (!context) {
    throw new Error('useBackupNotification must be used within a BackupNotificationProvider');
  }
  return context;
};
