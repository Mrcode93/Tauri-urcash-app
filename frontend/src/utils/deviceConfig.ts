interface DeviceConfig {
  device_mode: 'main' | 'secondary';
  main_device_ip?: string;
  port: number;
  auto_connect: boolean;
  connection_timeout: number;
  branch?: string;
  ip?: string;
}

export class DeviceConfigManager {
  private static readonly STORAGE_KEY = 'urcash_device_config';
  
  /**
   * Load device configuration from localStorage
   */
  static loadConfig(): DeviceConfig {
    try {
      const savedConfig = localStorage.getItem(this.STORAGE_KEY);
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        
        // Convert old format to new format if needed
        if (config.branch) {
          return {
            device_mode: config.branch === 'main' ? 'main' : 'secondary',
            main_device_ip: config.ip,
            port: config.port || 39000,
            auto_connect: config.auto_connect || false,
            connection_timeout: config.connection_timeout || 10000,
            branch: config.branch,
            ip: config.ip
          };
        }
        
        return {
          device_mode: config.device_mode || 'main',
          main_device_ip: config.main_device_ip,
          port: config.port || 39000,
          auto_connect: config.auto_connect || false,
          connection_timeout: config.connection_timeout || 10000
        };
      }
    } catch (error) {
      console.warn('Failed to load device config from localStorage:', error);
    }
    
    // Return default config
    return {
      device_mode: 'main',
      port: 39000,
      auto_connect: false,
      connection_timeout: 10000
    };
  }
  
  /**
   * Save device configuration to localStorage
   */
  static saveConfig(config: DeviceConfig): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save device config to localStorage:', error);
    }
  }
  
  /**
   * Check if this is the main device
   */
  static isMainDevice(): boolean {
    const config = this.loadConfig();
    return config.device_mode === 'main';
  }
  
  /**
   * Get device mode
   */
  static getDeviceMode(): 'main' | 'secondary' {
    const config = this.loadConfig();
    return config.device_mode;
  }
  
  /**
   * Get main device URL for secondary devices
   */
  static getMainDeviceUrl(): string {
    const config = this.loadConfig();
    
    if (config.device_mode === 'main') {
      return `http://localhost:${config.port}`;
    }
    
    // For secondary devices, construct URL from main device IP
    const mainDeviceIp = config.main_device_ip || config.ip;
    
    if (!mainDeviceIp) {
      console.warn('Main device IP not configured, using default');
      return 'http://192.168.0.1:39000';
    }
    
    return `http://${mainDeviceIp}:${config.port}`;
  }
  
  /**
   * Get main device IP address
   */
  static getMainDeviceIp(): string | null {
    const config = this.loadConfig();
    return config.main_device_ip || config.ip || null;
  }
  
  /**
   * Update main device IP
   */
  static updateMainDeviceIp(ip: string): void {
    const config = this.loadConfig();
    config.main_device_ip = ip;
    this.saveConfig(config);
  }
  
  /**
   * Set device mode
   */
  static setDeviceMode(mode: 'main' | 'secondary', mainDeviceIp?: string): void {
    const config = this.loadConfig();
    config.device_mode = mode;
    
    if (mode === 'secondary' && mainDeviceIp) {
      config.main_device_ip = mainDeviceIp;
    } else if (mode === 'main') {
      // Clear main device IP when switching to main mode
      delete config.main_device_ip;
    }
    
    this.saveConfig(config);
  }
  
  /**
   * Update entire configuration
   */
  static updateConfig(updates: Partial<DeviceConfig>): void {
    const config = this.loadConfig();
    const updatedConfig = { ...config, ...updates };
    this.saveConfig(updatedConfig);
  }
  
  /**
   * Reset configuration to defaults
   */
  static resetConfig(): void {
    const defaultConfig: DeviceConfig = {
      device_mode: 'main',
      port: 39000,
      auto_connect: false,
      connection_timeout: 10000
    };
    this.saveConfig(defaultConfig);
  }
  
  /**
   * Get full configuration object
   */
  static getConfig(): DeviceConfig {
    return this.loadConfig();
  }
}
