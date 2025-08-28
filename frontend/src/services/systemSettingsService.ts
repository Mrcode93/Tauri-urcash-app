// System Settings Service for Electron
// This service provides access to system settings and permissions through Electron

export interface SystemSettingsResult {
  success: boolean;
  message: string;
  platform?: string;
  settingType?: string;
  error?: string;
}

export interface SystemPermissionResult {
  success: boolean;
  hasPermission?: boolean;
  message: string;
  platform?: string;
  permissionType?: string;
  error?: string;
}

export interface SystemInfo {
  platform: string;
  arch: string;
  release: string;
  hostname: string;
  userInfo: {
    username: string;
    uid: number;
    gid: number;
    shell: string;
    homedir: string;
  };
  totalMemory: number;
  freeMemory: number;
  cpus: number;
  networkInterfaces: string[];
}

export interface SystemInfoResult {
  success: boolean;
  data?: SystemInfo;
  error?: string;
}

class SystemSettingsService {
  private isElectronAvailable(): boolean {
    return typeof window !== 'undefined' && 
           window.electron !== undefined && 
           typeof window.electron.openSystemSettings === 'function';
  }

  /**
   * Open system settings for a specific setting type
   * @param settingType - The type of settings to open (location, privacy, security, etc.)
   * @returns Promise<SystemSettingsResult>
   */
  async openSystemSettings(settingType: string): Promise<SystemSettingsResult> {
    try {
      if (!this.isElectronAvailable()) {
        return {
          success: false,
          message: 'System settings access is only available in Electron',
          error: 'NOT_ELECTRON'
        };
      }

      const result = await window.electron!.openSystemSettings(settingType);
      return result;
    } catch (error: any) {
      console.error('Failed to open system settings:', error);
      return {
        success: false,
        message: error.message || 'Failed to open system settings',
        error: error.toString()
      };
    }
  }

  /**
   * Check system permissions for a specific permission type
   * @param permissionType - The type of permission to check
   * @returns Promise<SystemPermissionResult>
   */
  async checkSystemPermissions(permissionType: string): Promise<SystemPermissionResult> {
    try {
      if (!this.isElectronAvailable()) {
        return {
          success: false,
          message: 'System permissions check is only available in Electron',
          error: 'NOT_ELECTRON'
        };
      }

      const result = await window.electron!.checkSystemPermissions(permissionType);
      return result;
    } catch (error: any) {
      console.error('Failed to check system permissions:', error);
      return {
        success: false,
        message: error.message || 'Failed to check system permissions',
        error: error.toString()
      };
    }
  }

  /**
   * Request system permission for a specific permission type
   * @param permissionType - The type of permission to request
   * @returns Promise<SystemSettingsResult>
   */
  async requestSystemPermission(permissionType: string): Promise<SystemSettingsResult> {
    try {
      if (!this.isElectronAvailable()) {
        return {
          success: false,
          message: 'System permission requests are only available in Electron',
          error: 'NOT_ELECTRON'
        };
      }

      const result = await window.electron!.requestSystemPermission(permissionType);
      return result;
    } catch (error: any) {
      console.error('Failed to request system permission:', error);
      return {
        success: false,
        message: error.message || 'Failed to request system permission',
        error: error.toString()
      };
    }
  }

  /**
   * Get system information
   * @returns Promise<SystemInfoResult>
   */
  async getSystemInfo(): Promise<SystemInfoResult> {
    try {
      if (!this.isElectronAvailable()) {
        return {
          success: false,
          error: 'System info is only available in Electron'
        };
      }

      const result = await window.electron!.getSystemInfo();
      return result;
    } catch (error: any) {
      console.error('Failed to get system info:', error);
      return {
        success: false,
        error: error.message || 'Failed to get system info'
      };
    }
  }

  /**
   * Open location settings specifically
   * @returns Promise<SystemSettingsResult>
   */
  async openLocationSettings(): Promise<SystemSettingsResult> {
    return this.openSystemSettings('location');
  }

  /**
   * Open privacy settings
   * @returns Promise<SystemSettingsResult>
   */
  async openPrivacySettings(): Promise<SystemSettingsResult> {
    return this.openSystemSettings('privacy');
  }

  /**
   * Open security settings
   * @returns Promise<SystemSettingsResult>
   */
  async openSecuritySettings(): Promise<SystemSettingsResult> {
    return this.openSystemSettings('security');
  }

  /**
   * Open general settings
   * @returns Promise<SystemSettingsResult>
   */
  async openGeneralSettings(): Promise<SystemSettingsResult> {
    return this.openSystemSettings('general');
  }

  /**
   * Open network settings
   * @returns Promise<SystemSettingsResult>
   */
  async openNetworkSettings(): Promise<SystemSettingsResult> {
    return this.openSystemSettings('network');
  }

  /**
   * Open notification settings
   * @returns Promise<SystemSettingsResult>
   */
  async openNotificationSettings(): Promise<SystemSettingsResult> {
    return this.openSystemSettings('notifications');
  }

  /**
   * Check location permission specifically
   * @returns Promise<SystemPermissionResult>
   */
  async checkLocationPermission(): Promise<SystemPermissionResult> {
    return this.checkSystemPermissions('location');
  }

  /**
   * Request location permission specifically
   * @returns Promise<SystemSettingsResult>
   */
  async requestLocationPermission(): Promise<SystemSettingsResult> {
    return this.requestSystemPermission('location');
  }

  /**
   * Check if the current environment supports system settings access
   * @returns boolean
   */
  isSupported(): boolean {
    return this.isElectronAvailable();
  }

  /**
   * Get the current platform
   * @returns string | null
   */
  async getPlatform(): Promise<string | null> {
    try {
      const systemInfo = await this.getSystemInfo();
      if (systemInfo.success && systemInfo.data) {
        return systemInfo.data.platform;
      }
      return null;
    } catch (error) {
      console.error('Failed to get platform:', error);
      return null;
    }
  }

  /**
   * Get platform-specific settings instructions
   * @param settingType - The type of settings
   * @returns string
   */
  getPlatformInstructions(settingType: string): string {
    const platform = navigator.platform.toLowerCase();
    
    if (platform.includes('mac')) {
      return this.getMacOSInstructions(settingType);
    } else if (platform.includes('win')) {
      return this.getWindowsInstructions(settingType);
    } else if (platform.includes('linux')) {
      return this.getLinuxInstructions(settingType);
    }
    
    return 'Please open your system settings and look for the relevant options.';
  }

  private getMacOSInstructions(settingType: string): string {
    const instructions = {
      location: '1. افتح "تفضيلات النظام"\n2. انقر على "الأمان والخصوصية"\n3. اختر تبويب "الخصوصية"\n4. اختر "خدمات الموقع" من الشريط الجانبي\n5. تأكد من تفعيل "خدمات الموقع"\n6. ابحث عن التطبيق وحدد المربع بجانبه',
      privacy: '1. افتح "تفضيلات النظام"\n2. انقر على "الأمان والخصوصية"\n3. اختر تبويب "الخصوصية"\n4. اختر الإعداد المطلوب من الشريط الجانبي',
      security: '1. افتح "تفضيلات النظام"\n2. انقر على "الأمان والخصوصية"\n3. اختر التبويب المناسب',
      general: '1. افتح "تفضيلات النظام"\n2. انقر على "عام"\n3. اختر الإعداد المطلوب',
      network: '1. افتح "تفضيلات النظام"\n2. انقر على "الشبكة"\n3. اختر نوع الاتصال المطلوب',
      notifications: '1. افتح "تفضيلات النظام"\n2. انقر على "الإشعارات"\n3. اختر التطبيق المطلوب'
    };
    
    return instructions[settingType as keyof typeof instructions] || instructions.general;
  }

  private getWindowsInstructions(settingType: string): string {
    const instructions = {
      location: '1. افتح "الإعدادات"\n2. انقر على "الخصوصية"\n3. اختر "الموقع"\n4. تأكد من تفعيل "الوصول للموقع"\n5. تأكد من تفعيل "السماح للتطبيقات بالوصول لموقعك"',
      privacy: '1. افتح "الإعدادات"\n2. انقر على "الخصوصية"\n3. اختر الإعداد المطلوب',
      security: '1. افتح "الإعدادات"\n2. انقر على "التحديث والأمان"\n3. اختر "Windows Defender"\n4. اختر الإعداد المطلوب',
      general: '1. افتح "الإعدادات"\n2. اختر الإعداد المطلوب من القائمة الرئيسية',
      network: '1. افتح "الإعدادات"\n2. انقر على "الشبكة والإنترنت"\n3. اختر نوع الاتصال المطلوب',
      notifications: '1. افتح "الإعدادات"\n2. انقر على "النظام"\n3. اختر "الإشعارات والإجراءات"\n4. اختر الإعداد المطلوب'
    };
    
    return instructions[settingType as keyof typeof instructions] || instructions.general;
  }

  private getLinuxInstructions(settingType: string): string {
    const instructions = {
      location: '1. افتح "إعدادات النظام"\n2. ابحث عن "الخصوصية" أو "الموقع"\n3. تأكد من تفعيل خدمات الموقع',
      privacy: '1. افتح "إعدادات النظام"\n2. ابحث عن "الخصوصية"\n3. اختر الإعداد المطلوب',
      security: '1. افتح "إعدادات النظام"\n2. ابحث عن "الأمان"\n3. اختر الإعداد المطلوب',
      general: '1. افتح "إعدادات النظام"\n2. اختر الإعداد المطلوب من القائمة الرئيسية',
      network: '1. افتح "إعدادات النظام"\n2. ابحث عن "الشبكة"\n3. اختر نوع الاتصال المطلوب',
      notifications: '1. افتح "إعدادات النظام"\n2. ابحث عن "الإشعارات"\n3. اختر الإعداد المطلوب'
    };
    
    return instructions[settingType as keyof typeof instructions] || instructions.general;
  }
}

// Create and export a singleton instance
export const systemSettingsService = new SystemSettingsService();

// Extend Window interface for TypeScript
declare global {
  interface Window {
    electron?: {
      openSystemSettings?: (settingType: string) => Promise<SystemSettingsResult>;
      checkSystemPermissions?: (permissionType: string) => Promise<SystemPermissionResult>;
      requestSystemPermission?: (permissionType: string) => Promise<SystemSettingsResult>;
      getSystemInfo?: () => Promise<SystemInfoResult>;
      getGeolocation?: () => Promise<any>;
      getGoogleGeolocation?: () => Promise<any>;
      testGoogleGeolocation?: () => Promise<any>;
      getDeviceId?: () => Promise<string>;
      checkLicenseStatus?: () => Promise<any>;
      activateLicense?: () => Promise<any>;
      startTrial?: () => Promise<any>;
      getDeviceInfo?: () => Promise<any>;
      getAppVersion?: () => Promise<string>;
      checkForUpdates?: () => Promise<any>;
      downloadUpdate?: (releaseUrl: string) => Promise<any>;
      getAppInfo?: () => Promise<any>;
      installUpdate?: () => Promise<any>;
      getAppMode?: () => Promise<any>;
      setAppMode?: (mode: any) => Promise<any>;
      getDeviceConfig?: () => Promise<any>;
      setDeviceConfig?: (config: any) => Promise<any>;
      testMainDeviceConnection?: () => Promise<any>;
      getAppConfig?: () => Promise<any>;
      setAppConfig?: (config: any) => Promise<any>;
      enableAutoUpdateChecking?: (enabled: boolean) => Promise<any>;
      setUpdateCheckInterval?: (interval: number) => Promise<any>;
      setUpdateNotification?: (enabled: boolean) => Promise<any>;
      getUpdateSettings?: () => Promise<any>;
      setUpdateSettings?: (settings: any) => Promise<any>;
      selectBackupDirectory?: () => Promise<any>;
      selectBackupFile?: () => Promise<any>;
      copyFile?: (sourcePath: string, destinationPath: string) => Promise<any>;
      readDirectory?: (directoryPath: string) => Promise<any>;
      deleteFile?: (filePath: string) => Promise<any>;
      getDefaultBackupDirectory?: () => Promise<any>;
    };
  }
} 