import { useState, useEffect } from 'react';

export const useMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isConnectivityMonitoring, setIsConnectivityMonitoring] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Internet connectivity checking
  const checkInternetConnectivity = async () => {
    if (!window.electron) {
      console.warn('Electron API not available');
      return false;
    }

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
    }
  };

  const getConnectivityStatus = async () => {
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
  };

  const startConnectivityMonitoring = async () => {
    if (!window.electron) {
      console.warn('Electron API not available');
      return false;
    }

    try {
      const result = await window.electron.startConnectivityMonitoring();
      if (result.success) {
        setIsConnectivityMonitoring(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error starting connectivity monitoring:', error);
      return false;
    }
  };

  const stopConnectivityMonitoring = async () => {
    if (!window.electron) {
      console.warn('Electron API not available');
      return false;
    }

    try {
      const result = await window.electron.stopConnectivityMonitoring();
      if (result.success) {
        setIsConnectivityMonitoring(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error stopping connectivity monitoring:', error);
      return false;
    }
  };

  // Set up event listeners for connectivity changes and toast notifications
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

  // Initialize connectivity monitoring on mount
  useEffect(() => {
    const initializeConnectivity = async () => {
      await getConnectivityStatus();
      await startConnectivityMonitoring();
    };

    if (window.electron) {
      initializeConnectivity();
    }
  }, []);

  return {
    isMobile,
    isOnline,
    isConnectivityMonitoring,
    checkInternetConnectivity,
    getConnectivityStatus,
    startConnectivityMonitoring,
    stopConnectivityMonitoring
  };
};
