export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
  error?: string;
  source?: string;
}

export interface ElectronAPI {
  // File system operations
  readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
  deleteFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  listFiles: (directoryPath: string) => Promise<{ success: boolean; files?: string[]; error?: string }>;
  createDirectory: (directoryPath: string) => Promise<{ success: boolean; error?: string }>;
  fileExists: (filePath: string) => Promise<{ success: boolean; exists?: boolean; error?: string }>;
  getFileInfo: (filePath: string) => Promise<{ success: boolean; info?: Record<string, unknown>; error?: string }>;
  
  // App configuration
  getAppConfig: () => Promise<{ success: boolean; config?: any; error?: string }>;
  setAppConfig: (config: any) => Promise<{ success: boolean; error?: string }>;
  resetAppConfig: () => Promise<{ success: boolean; error?: string }>;
  
  // System settings
  getSystemSettings: () => Promise<{ success: boolean; settings?: any; error?: string }>;
  setSystemSettings: (settings: any) => Promise<{ success: boolean; error?: string }>;
  resetSystemSettings: () => Promise<{ success: boolean; error?: string }>;
  
  // Database operations
  backupDatabase: (backupPath: string) => Promise<{ success: boolean; error?: string }>;
  restoreDatabase: (backupPath: string) => Promise<{ success: boolean; error?: string }>;
  getDatabaseInfo: () => Promise<{ success: boolean; info?: any; error?: string }>;
  
  // License management
  getLicenseInfo: () => Promise<{ success: boolean; info?: any; error?: string }>;
  verifyLicense: (licenseKey: string) => Promise<{ success: boolean; error?: string }>;
  activateLicense: (licenseKey: string) => Promise<{ success: boolean; error?: string }>;
  
  // Logging
  getLogs: (options?: any) => Promise<{ success: boolean; logs?: any[]; error?: string }>;
  clearLogs: () => Promise<{ success: boolean; error?: string }>;
  exportLogs: (exportPath: string) => Promise<{ success: boolean; error?: string }>;
  
  // Performance monitoring
  getPerformanceStats: () => Promise<{ success: boolean; stats?: any; error?: string }>;
  getMemoryUsage: () => Promise<{ success: boolean; usage?: any; error?: string }>;
  getCpuUsage: () => Promise<{ success: boolean; usage?: any; error?: string }>;
  
  // Network utilities
  getLocalIp: () => Promise<{ success: boolean; ip?: string; error?: string }>;
  testNetworkConnection: (host: string, port: number) => Promise<{ success: boolean; error?: string }>;
  checkInternetConnectivity: () => Promise<{ success: boolean; isOnline: boolean; error?: string }>;
  getConnectivityStatus: () => Promise<{ success: boolean; isOnline: boolean }>;
  startConnectivityMonitoring: () => Promise<{ success: boolean; message?: string; error?: string }>;
  stopConnectivityMonitoring: () => Promise<{ success: boolean; message?: string; error?: string }>;
  
  // Geolocation
  getGeolocation: () => Promise<{ success: boolean; data?: LocationData; error?: string; code?: number; suggestion?: string; systemPermission?: boolean }>;
  getGoogleGeolocation: () => Promise<{ success: boolean; data?: LocationData; error?: string; code?: number; suggestion?: string }>;
  testGoogleGeolocation: () => Promise<{ success: boolean; message?: string; error?: string; environment?: { apiKeySet: boolean; nodeEnv?: string; apiKeyLength: number } }>;
  
  // App lifecycle
  getAppVersion: () => Promise<{ success: boolean; version?: string; error?: string }>;
  getAppInfo: () => Promise<{ success: boolean; info?: any; error?: string }>;
  restartApp: () => Promise<{ success: boolean; error?: string }>;
  quitApp: () => Promise<{ success: boolean; error?: string }>;
  
  // Update management
  checkForUpdates: () => Promise<{ success: boolean; error?: string }>;
  downloadUpdate: (releaseUrl: string) => Promise<{ success: boolean; error?: string }>;
  installUpdate: () => Promise<{ success: boolean; error?: string }>;
  getUpdateSettings: () => Promise<{ success: boolean; settings?: any; error?: string }>;
  setUpdateSettings: (settings: any) => Promise<{ success: boolean; error?: string }>;
  enableAutoUpdateChecking: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
  setUpdateCheckInterval: (interval: number) => Promise<{ success: boolean; error?: string }>;
  setUpdateNotification: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
  onUpdateStatus: (callback: (status: any) => void) => void;
  removeUpdateStatusListener: () => void;
  
  // Internet connectivity events
  onInternetConnectivityChanged: (callback: (data: { isOnline: boolean }) => void) => void;
  removeInternetConnectivityListener: () => void;
  
  // Toast notifications
  onShowToastNotification: (callback: (data: { title: string; message: string; type: string }) => void) => void;
  removeToastNotificationListener: () => void;
  
  // Print functionality
  printToPDF: (html: string, options?: {
    printBackground?: boolean;
    color?: boolean;
    margin?: {
      marginType?: 'default' | 'none' | 'printableArea' | 'custom';
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
    };
    landscape?: boolean;
    pagesPerSheet?: number;
    collate?: boolean;
    copies?: number;
    header?: string;
    footer?: string;
  }) => Promise<{ success: boolean; data?: string; error?: string }>;
  
  printDirect: (html: string, options?: {
    silent?: boolean;
    printBackground?: boolean;
    color?: boolean;
    margins?: {
      marginType?: 'default' | 'none' | 'printableArea' | 'custom';
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
    };
    landscape?: boolean;
    pagesPerSheet?: number;
    collate?: boolean;
    copies?: number;
  }) => Promise<{ success: boolean; error?: string }>;
  
  showPrintDialog: (html: string, options?: {
    printBackground?: boolean;
    color?: boolean;
    margins?: {
      marginType?: 'default' | 'none' | 'printableArea' | 'custom';
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
    };
    landscape?: boolean;
    pagesPerSheet?: number;
    collate?: boolean;
    copies?: number;
  }) => Promise<{ success: boolean; error?: string }>;
  
  // Utility function to check if a channel is valid
  isValidChannel: (channel: string) => boolean;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}