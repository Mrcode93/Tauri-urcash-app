import { invoke } from '@tauri-apps/api/tauri';

// App configuration interface
export interface AppConfig {
  branch: string;
  ip: string;
  auto_connect: boolean;
  port: number;
  updated_at: string;
}

// Tauri Services - equivalent to Electron main.js services
export class TauriServices {
  // App Configuration Management
  static async getAppConfig(): Promise<AppConfig> {
    return await invoke('get_app_config');
  }

  static async saveAppConfig(config: AppConfig): Promise<void> {
    return await invoke('save_app_config_command', { config });
  }

  // Internet Connectivity
  static async checkConnectivity(): Promise<boolean> {
    return await invoke('check_connectivity');
  }

  static async requireInternetConnection(operation: string): Promise<boolean> {
    return await invoke('require_internet_connection', { operation });
  }

  // System Services
  static async killProcessByPort(port: number): Promise<void> {
    return await invoke('kill_process_by_port', { port });
  }

  static async getLocalIpAddress(): Promise<string> {
    return await invoke('get_local_ip_address_command');
  }

  // App Information
  static async getAppVersion(): Promise<string> {
    return await invoke('get_app_version');
  }

  static async getAppName(): Promise<string> {
    return await invoke('get_app_name');
  }

  // Toast Notifications
  static async showToastNotification(
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ): Promise<void> {
    return await invoke('show_toast_notification', {
      title,
      message,
      notificationType: type,
    });
  }

  // Server Management
  static async startRustServer(): Promise<string> {
    return await invoke('start_rust_server');
  }

  static async checkServerStatus(): Promise<string> {
    return await invoke('check_server_status');
  }

  // Configuration Management (equivalent to Electron config.js)
  static async getConfigValue(key: string): Promise<string | null> {
    return await invoke('get_config_value', { key });
  }

  static async setConfigValue(key: string, value: string): Promise<void> {
    return await invoke('set_config_value', { key, value });
  }

  static async getAllConfig(): Promise<Record<string, string>> {
    return await invoke('get_all_config');
  }

  static async updateApiKey(newApiKey: string): Promise<void> {
    return await invoke('update_api_key', { newApiKey });
  }

  static async getGoogleGeolocationApiKey(): Promise<string> {
    return await invoke('get_google_geolocation_api_key');
  }

  // Connectivity monitoring
  static async startConnectivityMonitoring(): Promise<void> {
    return await invoke('start_connectivity_monitoring_command');
  }
}

// Event listeners for Tauri events
export const setupTauriEventListeners = () => {
  // Listen for internet connectivity changes
  document.addEventListener('internet-connectivity-changed', (event: Event) => {
    const customEvent = event as CustomEvent;
    const { isOnline } = customEvent.detail;
    console.log('Internet connectivity changed:', isOnline);
    
    // Emit custom event for React components
    window.dispatchEvent(new CustomEvent('urcash-connectivity-changed', {
      detail: { isOnline }
    }));
  });

  // Listen for toast notifications
  document.addEventListener('show-toast-notification', (event: Event) => {
    const customEvent = event as CustomEvent;
    const { title, message, type } = customEvent.detail;
    console.log('Toast notification:', { title, message, type });
    
    // Emit custom event for React components
    window.dispatchEvent(new CustomEvent('urcash-toast-notification', {
      detail: { title, message, type }
    }));
  });
};

// React hooks for Tauri services
export const useTauriServices = () => {
  return {
    getAppConfig: TauriServices.getAppConfig,
    saveAppConfig: TauriServices.saveAppConfig,
    checkConnectivity: TauriServices.checkConnectivity,
    requireInternetConnection: TauriServices.requireInternetConnection,
    killProcessByPort: TauriServices.killProcessByPort,
    getLocalIpAddress: TauriServices.getLocalIpAddress,
    getAppVersion: TauriServices.getAppVersion,
    getAppName: TauriServices.getAppName,
    showToastNotification: TauriServices.showToastNotification,
    startRustServer: TauriServices.startRustServer,
    checkServerStatus: TauriServices.checkServerStatus,
    // Configuration management
    getConfigValue: TauriServices.getConfigValue,
    setConfigValue: TauriServices.setConfigValue,
    getAllConfig: TauriServices.getAllConfig,
    updateApiKey: TauriServices.updateApiKey,
    getGoogleGeolocationApiKey: TauriServices.getGoogleGeolocationApiKey,
    startConnectivityMonitoring: TauriServices.startConnectivityMonitoring,
  };
};

// Initialize Tauri services
export const initializeTauriServices = () => {
  setupTauriEventListeners();
  
  // Set up global error handler for Tauri commands
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && typeof event.reason === 'string' && event.reason.includes('tauri')) {
      console.error('Tauri command error:', event.reason);
      // You can show a toast notification here
    }
  });
};

export default TauriServices;
