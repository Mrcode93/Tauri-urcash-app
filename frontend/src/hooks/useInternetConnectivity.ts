import { useState, useEffect, useCallback } from 'react';

export const useInternetConnectivity = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  // Check internet connectivity
  const checkConnectivity = useCallback(async () => {
    if (!window.electron) {
      console.warn('Electron API not available');
      return false;
    }

    setIsChecking(true);
    try {
      const result = await window.electron.checkInternetConnectivity();
      if (result.success) {
        setIsOnline(result.isOnline);
        return result.isOnline;
      }
      return false;
    } catch (error) {
      console.error('Error checking internet connectivity:', error);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Get current connectivity status
  const getStatus = useCallback(async () => {
    if (!window.electron) {
      console.warn('Electron API not available');
      return false;
    }

    try {
      const result = await window.electron.getConnectivityStatus();
      if (result.success) {
        setIsOnline(result.isOnline);
        return result.isOnline;
      }
      return false;
    } catch (error) {
      console.error('Error getting connectivity status:', error);
      return false;
    }
  }, []);

  // Require internet connection for an operation
  const requireInternetConnection = useCallback(async (operation: string) => {
    const isConnected = await checkConnectivity();
    
    if (!isConnected) {
      // Show toast notification through electron
      if (window.electron) {
        // This will trigger the toast notification in the main process
        
      }
      return false;
    }
    
    return true;
  }, [checkConnectivity]);

  // Set up event listeners
  useEffect(() => {
    if (!window.electron) {
      console.warn('Electron API not available');
      return;
    }

    // Listen for connectivity changes
    window.electron.onInternetConnectivityChanged((data) => {
      setIsOnline(data.isOnline);
      
    });

    // Listen for toast notifications
    window.electron.onShowToastNotification((data) => {
      // You can integrate this with your toast system
      
      // Example: showToast(data.title, data.message, data.type);
    });

    // Cleanup listeners on unmount
    return () => {
      window.electron?.removeInternetConnectivityListener();
      window.electron?.removeToastNotificationListener();
    };
  }, []);

  // Initialize connectivity status on mount
  useEffect(() => {
    getStatus();
  }, [getStatus]);

  return {
    isOnline,
    isChecking,
    checkConnectivity,
    getStatus,
    requireInternetConnection
  };
}; 