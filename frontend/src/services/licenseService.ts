import api from '../lib/api';
import { locationService, type LocationData } from './locationService';

// License API service
export interface LicenseData {
  device_id?: string;
  type?: 'trial' | 'full' | 'partial' | 'custom' | 'premium' | 'enterprise';
  features?: string[];
  activated_at?: string;
  expires_at?: string | null;
  userId?: string;
  feature_licenses?: string[];
  feature_expiration_status?: string[];
  signature?: string;
  created_at?: string;
}

export interface LicenseStatus {
  success: boolean;
  message?: string;
  needsFirstActivation?: boolean;
  device_id?: string;
  type?: 'trial' | 'full' | 'partial' | 'custom' | 'premium' | 'enterprise';
  type_?: 'trial' | 'full' | 'partial' | 'custom' | 'premium' | 'enterprise';
  license_type?: 'trial' | 'full' | 'partial' | 'custom' | 'premium' | 'enterprise';
  features?: string[];
  activated_at?: string;
  expires_at?: string | null;
  userId?: string;
  user_id?: string;
  feature_licenses?: Record<string, {
    activated_at: string;
    expires_at: string | null;
    activation_code: string;
    type: string;
  }>;
  feature_expiration_status?: Array<{
    feature: string;
    is_active: boolean;
    expires_at: string;
    activated_at: string;
    activation_code: string;
    type: string;
    days_remaining: number;
  }>;
  signature?: string;
  activated?: boolean;
  licenseData?: LicenseData;
  source?: 'remote_server' | 'local_fallback' | 'local_only' | 'local' | 'remote' | 'session_cache';
  serverConnected?: boolean;
  verified?: boolean;
  created_at?: string;
  offline?: boolean;
  expired?: boolean;
  localError?: string;
  networkError?: string;
  errorCode?: string;
  details?: any;
}

export interface ActivationResult {
  success: boolean;
  activated: boolean;
  message: string;
  licenseData?: LicenseData;
  isReactivation?: boolean;
  source?: 'remote_server' | 'local_fallback' | 'local_only';
  activation_info?: {
    device_id: string;
    location: string;
    ip_address: string;
    activated_at: string;
  };
  device_id?: string;
  files_saved?: {
    device_id: boolean;
    public_key: boolean;
    license: boolean;
  };
  errorCode?: string;
  details?: any;
}

export interface CodeValidationResult {
  success: boolean;
  valid: boolean;
  message: string;
  source?: 'remote_server' | 'local_fallback';
  codeInfo?: {
    code: string;
    type: string;
    features: string[];
    expires_at?: string;
    used: boolean;
  };
}

export interface ServerStats {
  success: boolean;
  message?: string;
  licenseStats?: {
    total: number;
    active: number;
    expired: number;
    recent_activations: number;
    by_type: Record<string, number>;
  };
  codeStats?: {
    total: number;
    used: number;
    available: number;
    expired: number;
    by_type: Record<string, number>;
  };
}

export interface ConnectivityTest {
  success: boolean;
  connected: boolean;
  responseTime?: number;
  server: string;
  serverInfo?: Record<string, unknown>;
  status?: string;
  version?: string;
  error?: string;
  message?: string;
}

export interface FirstActivationResult {
  success: boolean;
  message: string;
  activated: boolean;
  files?: {
    'public.pem': string;
    'license.json': string;
  };
  activation_info?: {
    device_id: string;
    location: string;
    ip_address: string;
    activated_at: string;
  };
  device_id?: string;
  files_saved?: {
    device_id: boolean;
    public_key: boolean;
    license: boolean;
  };
}

export interface VerificationResult {
  success: boolean;
  valid: boolean;
  message: string;
  license?: Record<string, unknown>;
  verificationTimestamp?: string;
}

export interface DeactivationResult {
  success: boolean;
  message: string;
}

export interface DeviceInfo {
  device_id: string;
  platform: string;
  arch: string;
  hostname: string;
  username: string;
  primary_ip: string;
  cpu_count: number;
  cpu_model: string;
  total_memory: number;
  node_version: string;
  app_version: string;
  timestamp: string;
}

// Session storage cache management
const CACHE_KEYS = {
  LICENSE_DATA: 'urcash_license_data',
  LICENSE_TIMESTAMP: 'urcash_license_timestamp',
  LICENSE_SESSION: 'urcash_license_session',
  APP_STARTUP: 'urcash_app_startup'
};

const CACHE_TTL = {
  LICENSE: 30 * 60 * 1000, // 30 minutes
  SESSION: 24 * 60 * 60 * 1000 // 24 hours (session duration)
};

// Cache management functions
const getLicenseFromCache = (): LicenseStatus | null => {
  try {
    const cachedData = sessionStorage.getItem(CACHE_KEYS.LICENSE_DATA);
    const timestamp = sessionStorage.getItem(CACHE_KEYS.LICENSE_TIMESTAMP);
    const sessionId = sessionStorage.getItem(CACHE_KEYS.LICENSE_SESSION);
    
    if (!cachedData || !timestamp || !sessionId) {
      return null;
    }
    
    const now = Date.now();
    const cacheTime = parseInt(timestamp, 10);
    const sessionTime = parseInt(sessionId, 10);
    
    // Validate timestamps
    if (isNaN(cacheTime) || isNaN(sessionTime)) {
      console.warn('⚠️ Invalid cache timestamps, clearing cache');
      clearLicenseCache();
      return null;
    }
    
    // Check if cache is expired
    if (now - cacheTime > CACHE_TTL.LICENSE) {
      
      return null;
    }
    
    // Check if session is still valid
    if (now - sessionTime > CACHE_TTL.SESSION) {
      
      clearLicenseCache();
      return null;
    }
    
    const licenseData = JSON.parse(cachedData);
    
    // Validate cached data structure
    if (!licenseData || typeof licenseData !== 'object' || !licenseData.hasOwnProperty('success')) {
      console.warn('⚠️ Invalid cached license data structure, clearing cache');
      clearLicenseCache();
      return null;
    }
    
    
    return {
      ...licenseData,
      source: 'session_cache'
    };
  } catch (error) {
    console.error('❌ Error reading license cache:', error);
    // Clear corrupted cache
    clearLicenseCache();
    return null;
  }
};

const saveLicenseToCache = (licenseData: LicenseStatus): void => {
  try {
    // Validate license data before caching
    if (!licenseData || typeof licenseData !== 'object') {
      console.warn('⚠️ Invalid license data, skipping cache save');
      return;
    }
    
    // Only cache successful responses
    if (!licenseData.success) {
      
      return;
    }
    
    const now = Date.now();
    sessionStorage.setItem(CACHE_KEYS.LICENSE_DATA, JSON.stringify(licenseData));
    sessionStorage.setItem(CACHE_KEYS.LICENSE_TIMESTAMP, now.toString());
    
    // Set session ID if not exists
    if (!sessionStorage.getItem(CACHE_KEYS.LICENSE_SESSION)) {
      sessionStorage.setItem(CACHE_KEYS.LICENSE_SESSION, now.toString());
    }
    
    
  } catch (error) {
    console.error('❌ Error saving license cache:', error);
    // Try to clear potentially corrupted cache
    try {
      clearLicenseCache();
    } catch (clearError) {
      console.error('❌ Error clearing cache after save failure:', clearError);
    }
  }
};

const clearLicenseCache = (): void => {
  try {
    sessionStorage.removeItem(CACHE_KEYS.LICENSE_DATA);
    sessionStorage.removeItem(CACHE_KEYS.LICENSE_TIMESTAMP);
    sessionStorage.removeItem(CACHE_KEYS.LICENSE_SESSION);
    sessionStorage.removeItem(CACHE_KEYS.APP_STARTUP);
    
  } catch (error) {
    console.error('❌ Error clearing license cache:', error);
  }
};

const isAppStartup = (): boolean => {
  const startupFlag = sessionStorage.getItem(CACHE_KEYS.APP_STARTUP);
  if (!startupFlag) {
    sessionStorage.setItem(CACHE_KEYS.APP_STARTUP, Date.now().toString());
    return true;
  }
  return false;
};

export const licenseService = {
  // Fast local license check with session storage caching
  async checkLocalLicense(forceRefresh: boolean = false): Promise<LicenseStatus> {
    try {
      // Check if this is app startup
      const startup = isAppStartup();
      
      // If not forcing refresh, try to get from cache first
      if (!forceRefresh) {
        const cachedLicense = getLicenseFromCache();
        if (cachedLicense) {
          return cachedLicense;
        }
      }
      
      
      const response = await api.get('/license/check-local');
      const licenseData = response.data?.data || response.data;
      
      // Cache successful responses
      if (licenseData.success) {
        saveLicenseToCache(licenseData);
      }
      
      return licenseData;
    } catch (error: unknown) {
      console.error('Error checking local license:', error);
      
      // If server call fails, try to return cached data as fallback
      if (!forceRefresh) {
        const cachedLicense = getLicenseFromCache();
        if (cachedLicense) {
          
          return {
            ...cachedLicense,
            source: 'session_cache',
            offline: true
          };
        }
      }
      
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to check local license';
      throw new Error(errorMessage);
    }
  },

  // Legacy method for compatibility
  async checkStatus(): Promise<LicenseStatus> {
    return this.checkLocalLicense();
  },

  // Activate license (automatic activation - trial or first activation)
  async activate(locationData?: LocationData): Promise<LicenseStatus> {
    try {
      const payload: Record<string, unknown> = {};
      
      if (locationData) {
        payload.location = {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          timestamp: locationData.timestamp
        };
      }

      const response = await api.post('/license/first-activation', payload);
      return response.data?.data || response.data;
    } catch (error: unknown) {
      console.error('Error activating license:', error);
      return {
        success: false,
        message: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to activate license'
      };
    }
  },

  // Activate with activation code
  async activateWithCode(activationCode: string, locationData?: LocationData): Promise<ActivationResult> {
    try {
      const payload: Record<string, unknown> = {
        activation_code: activationCode
      };
      
      if (locationData) {
        payload.location = {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          timestamp: locationData.timestamp
        };
      }

      const response = await api.post('/license/activation', payload);
      return response.data;
    } catch (error: unknown) {
      console.error('Error activating license with code:', error);
      return {
        success: false,
        activated: false,
        message: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to activate license with code'
      };
    }
  },

  // Perform first activation
  async firstTimeActivation(locationData?: LocationData, code?: string): Promise<FirstActivationResult> {
    try {
      const payload: Record<string, unknown> = {};
      
      if (locationData) {
        payload.location = {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          timestamp: locationData.timestamp
        };
      }

      if (code && code.trim()) {
        payload.code = code.trim();
      }

      const response = await api.post('/license/first-activation', payload);
      return response.data;
    } catch (error: unknown) {
      console.error('Error performing first activation:', error);
      return {
        success: false,
        activated: false,
        message: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to perform first activation'
      };
    }
  },

  // Validate activation code
  async validateCode(activationCode: string): Promise<CodeValidationResult> {
    try {
      const response = await api.post('/license/validate-code', {
        activationCode
      });
      return response.data;
    } catch (error: unknown) {
      console.error('Error validating code:', error);
      return {
        success: false,
        valid: false,
        message: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to validate activation code'
      };
    }
  },

  // Get device information
  async getDeviceInfo(): Promise<{ success: boolean; device_info?: DeviceInfo; error?: string }> {
    try {
      const response = await api.get('/license/device-info');
      return response.data;
    } catch (error: unknown) {
      console.error('Error getting device info:', error);
      return {
        success: false,
        error: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to get device information'
      };
    }
  },

  // Test server connection
  async testConnection(): Promise<ConnectivityTest> {
    try {
      const response = await api.get('/license/test-connection');
      return {
        success: response.data.success,
        connected: response.data.success,
        server: response.data.server,
        message: response.data.message,
        status: response.data.status?.toString()
      };
    } catch (error: unknown) {
      console.error('Connection test failed:', error);
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Connection test failed';
      return {
        success: false,
        connected: false,
        server: 'unknown',
        error: errorMessage,
        message: 'Failed to connect to activation server'
      };
    }
  },

  // Get license information
  async getLicenseInfo(): Promise<LicenseStatus> {
    return this.checkLocalLicense();
  },

  // Get server statistics
  async getServerStats(): Promise<ServerStats> {
    try {
      const response = await api.get('/license/status');
      return response.data;
    } catch (error: unknown) {
      console.error('Server stats error:', error);
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to get server statistics';
      return {
        success: false,
        message: errorMessage
      };
    }
  },

  // Deactivate license
  async deactivate(): Promise<DeactivationResult> {
    try {
      const response = await api.post('/license/status');
      return response.data;
    } catch (error: unknown) {
      console.error('Deactivation error:', error);
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to deactivate license';
      return {
        success: false,
        message: errorMessage
      };
    }
  },

  // Verify license with server
  async verifyWithServer(licenseData: Record<string, unknown>, signature: string): Promise<VerificationResult> {
    try {
        const response = await api.post('/license/status', {
        license_data: licenseData,
        signature: signature
      });
      return {
        ...response.data,
        verificationTimestamp: new Date().toISOString()
      };
    } catch (error: unknown) {
      console.error('License verification error:', error);
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to verify license with server';
      return {
        success: false,
        valid: false,
        message: errorMessage,
        verificationTimestamp: new Date().toISOString()
      };
    }
  },

  // Simple license verification
  async verifyLicense(includeServerCheck: boolean = true): Promise<VerificationResult & { 
    verificationDetails: {
      localCheck: boolean;
      serverCheck: boolean;
      deviceIdMatch: boolean;
      signatureValid: boolean;
      expirationValid: boolean;
      featuresValid: boolean;
    }
  }> {
    try {
      const status = await this.checkLocalLicense();
      
      if (!status.success || !status.licenseData) {
        return {
          success: false,
          valid: false,
          message: 'No license data found for verification',
          verificationTimestamp: new Date().toISOString(),
          verificationDetails: {
            localCheck: false,
            serverCheck: false,
            deviceIdMatch: false,
            signatureValid: false,
            expirationValid: false,
            featuresValid: false
          }
        };
      }

      const licenseData = status.licenseData;
      const verificationDetails = {
        localCheck: true,
        serverCheck: false,
        deviceIdMatch: true,
        signatureValid: false,
        expirationValid: !this.isLicenseExpired(licenseData),
        featuresValid: licenseData.features && licenseData.features.length > 0
      };

      let verificationResult: VerificationResult = {
        success: true,
        valid: false,
        message: 'License verification in progress...',
        verificationTimestamp: new Date().toISOString()
      };

      if (includeServerCheck && licenseData.signature) {
        try {
          const serverResult = await this.verifyWithServer(licenseData, licenseData.signature);
          verificationDetails.serverCheck = true;
          verificationDetails.signatureValid = serverResult.valid;
          verificationResult = {
            ...serverResult,
            verificationTimestamp: new Date().toISOString()
          };
        } catch (error) {
          console.warn('Server verification failed, falling back to local verification');
        }
      }

      if (!verificationDetails.serverCheck) {
        const allLocalChecksPass = verificationDetails.expirationValid && verificationDetails.featuresValid;
        verificationResult.valid = allLocalChecksPass;
        verificationResult.message = allLocalChecksPass 
          ? 'License verified locally (server verification not available)'
          : 'License verification failed - license expired or invalid features';
      }

      return {
        ...verificationResult,
        verificationDetails
      };

    } catch (error: unknown) {
      console.error('License verification error:', error);
      const errorMessage = (error as Error)?.message || 'License verification failed';
      return {
        success: false,
        valid: false,
        message: errorMessage,
        verificationTimestamp: new Date().toISOString(),
        verificationDetails: {
          localCheck: false,
          serverCheck: false,
          deviceIdMatch: false,
          signatureValid: false,
          expirationValid: false,
          featuresValid: false
        }
      };
    }
  },

  // Get detailed license status with verification
  async getDetailedLicenseStatus(): Promise<{
    status: LicenseStatus;
    verification: VerificationResult;
    deviceInfo?: DeviceInfo;
    connectionTest?: ConnectivityTest;
  }> {
    try {
      const [status, verification, deviceInfo, connectionTest] = await Promise.allSettled([
        this.checkLocalLicense(),
        this.verifyLicense(true),
        this.getDeviceInfo(),
        this.testConnection()
      ]);

      return {
        status: status.status === 'fulfilled' ? status.value : {
          success: false,
          activated: false,
          message: 'Failed to get license status'
        },
        verification: verification.status === 'fulfilled' ? verification.value : {
          success: false,
          valid: false,
          message: 'Verification failed',
          verificationTimestamp: new Date().toISOString(),
          verificationDetails: {
            localCheck: false,
            serverCheck: false,
            deviceIdMatch: false,
            signatureValid: false,
            expirationValid: false,
            featuresValid: false
          }
        },
        deviceInfo: deviceInfo.status === 'fulfilled' && deviceInfo.value.success 
          ? deviceInfo.value.device_info 
          : undefined,
        connectionTest: connectionTest.status === 'fulfilled' 
          ? connectionTest.value 
          : undefined
      };
    } catch (error: unknown) {
      console.error('Error getting detailed license status:', error);
      throw error;
    }
  },

  // Clear license cache
  clearCache(): void {
    clearLicenseCache();
    
  },

  // Cache management functions
  getLicenseFromCache(): LicenseStatus | null {
    return getLicenseFromCache();
  },

  saveLicenseToCache(licenseData: LicenseStatus): void {
    saveLicenseToCache(licenseData);
  },

  isAppStartup(): boolean {
    return isAppStartup();
  },

  // Cache statistics and management
  getCacheStats(): {
    hasCachedData: boolean;
    cacheAge: number | null;
    sessionAge: number | null;
    isExpired: boolean;
    isSessionValid: boolean;
  } {
    try {
      const cachedData = sessionStorage.getItem(CACHE_KEYS.LICENSE_DATA);
      const timestamp = sessionStorage.getItem(CACHE_KEYS.LICENSE_TIMESTAMP);
      const sessionId = sessionStorage.getItem(CACHE_KEYS.LICENSE_SESSION);
      
      if (!cachedData || !timestamp || !sessionId) {
        return {
          hasCachedData: false,
          cacheAge: null,
          sessionAge: null,
          isExpired: true,
          isSessionValid: false
        };
      }
      
      const now = Date.now();
      const cacheTime = parseInt(timestamp, 10);
      const sessionTime = parseInt(sessionId, 10);
      
      const cacheAge = now - cacheTime;
      const sessionAge = now - sessionTime;
      
      return {
        hasCachedData: true,
        cacheAge,
        sessionAge,
        isExpired: cacheAge > CACHE_TTL.LICENSE,
        isSessionValid: sessionAge <= CACHE_TTL.SESSION
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        hasCachedData: false,
        cacheAge: null,
        sessionAge: null,
        isExpired: true,
        isSessionValid: false
      };
    }
  },

  // Validate cache and return cached data if valid
  validateCache(): LicenseStatus | null {
    const stats = this.getCacheStats();
    
    if (!stats.hasCachedData || stats.isExpired || !stats.isSessionValid) {
      return null;
    }
    
    return this.getLicenseFromCache();
  },

  // Force refresh cache from server
  async refreshCache(): Promise<LicenseStatus> {
    
    return this.checkLocalLicense(true);
  },

  // Utility methods for license management
  getFeatureDisplayName(feature: string, language: 'en' | 'ar' = 'en'): string {
    const featureNames: Record<string, Record<string, string>> = {
      en: {
        installments: 'Installments',
        reports: 'Reports',
        debts: 'Debts Management',
        customers: 'Customer Management',
        expenses: 'Expenses Management',
        suppliers: 'Suppliers Management',
        analytics: 'Analytics',
        advanced_inventory: 'Advanced Inventory',
        multi_store: 'Multi-Store',
        staff_management: 'Staff Management',
        loyalty: 'Loyalty Program',
        accounting: 'Accounting Integration',
        basic: 'Basic Features',
        premium: 'Premium Features',
        enterprise: 'Enterprise Features',
        pos: 'Point of Sale',
        inventory: 'Inventory Management',
        sales: 'Sales',
        purchases: 'Purchases',
        basic_customers: 'Basic Customer Management',
        basic_reports: 'Basic Reports',
        cloud_backup: 'Cloud Backup',
        'cloud-backup': 'Cloud Backup',
        'cloud-backups': 'Cloud Backup',
        advanced_reports: 'Advanced Reports',
        mobile_live_data: 'Mobile Live Data',
        multi_device: 'Multi-Device Management'
      },
      ar: {
        installments: 'الأقساط',
        reports: 'التقارير',
        debts: 'إدارة الديون',
        customers: 'إدارة العملاء',
        expenses: 'إدارة المصروفات',
        suppliers: 'إدارة الموردين',
        analytics: 'التحليلات',
        advanced_inventory: 'المخزون المتقدم',
        multi_store: 'متعدد المتاجر',
        staff_management: 'إدارة الموظفين',
        loyalty: 'برنامج الولاء',
        accounting: 'تكامل المحاسبة',
        basic: 'الميزات الأساسية',
        premium: 'الميزات المميزة',
        enterprise: 'ميزات المؤسسة',
        pos: 'نقطة البيع',
        inventory: 'إدارة المخزون',
        sales: 'المبيعات',
        purchases: 'المشتريات',
        basic_customers: 'إدارة العملاء الأساسية',
        basic_reports: 'التقارير الأساسية',
        cloud_backup: 'النسخ الاحتياطي السحابي',
        'cloud-backup': 'النسخ الاحتياطي السحابي',
        'cloud-backups': 'النسخ الاحتياطي السحابي',
        advanced_reports: 'التقارير المتقدمة',
        mobile_live_data: 'مشاركة البيانات مع تطبيق دفتري',
        multi_device: 'إدارة ربط الأجهزة المتعددة'
      }
    };

    return featureNames[language]?.[feature] || feature;
  },

  getLicenseTypeDisplayName(type: string, language: 'en' | 'ar' = 'en'): string {
    const typeNames: Record<string, Record<string, string>> = {
      en: {
        trial: 'Trial',
        basic: 'Basic',
        premium: 'Premium',
        enterprise: 'Enterprise',
        custom: 'Custom'
      },
      ar: {
        trial: 'تجريبي',
        basic: 'أساسي',
        premium: 'مميز',
        enterprise: 'مؤسسة',
        custom: 'مخصص'
      }
    };

    return typeNames[language]?.[type] || type;
  },

  isLicenseExpired(licenseData: LicenseData): boolean {
    if (!licenseData.expires_at) return false;
    return new Date() > new Date(licenseData.expires_at);
  },

  getDaysUntilExpiry(licenseData: LicenseData): number | null {
    if (!licenseData.expires_at) return null;
    
    const expirationDate = new Date(licenseData.expires_at);
    const now = new Date();
    const diffTime = expirationDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  },

  formatLicenseStatus(status: LicenseStatus, language: 'en' | 'ar' = 'en'): string {
    if (!status.activated) {
      return language === 'ar' ? 'غير مفعل' : 'Not Activated';
    }

    if (status.licenseData) {
      const type = this.getLicenseTypeDisplayName(status.licenseData.type, language);
      const expiryInfo = this.getExpiryInfo(status.licenseData, language);
      return `${type} - ${expiryInfo}`;
    }

    return language === 'ar' ? 'مفعل' : 'Activated';
  },

  getLicenseHealth(licenseData?: LicenseData): 'healthy' | 'warning' | 'expired' | 'unknown' {
    if (!licenseData) return 'unknown';
    
    if (this.isLicenseExpired(licenseData)) return 'expired';
    
    const daysUntilExpiry = this.getDaysUntilExpiry(licenseData);
    if (daysUntilExpiry !== null && daysUntilExpiry <= 7) return 'warning';
    
    return 'healthy';
  },

  hasFeature(licenseData: LicenseData | undefined, feature: string): boolean {
    if (!licenseData) return false;
    
    const features = licenseData.features || {};
    if (feature in features) {
      const featureData = features[feature];
      if (featureData.expires_at) {
        const expirationDate = new Date(featureData.expires_at);
        const now = new Date();
        if (now > expirationDate) {
          return false;
        }
      }
      return true;
    }
    
    const featureLicenses = licenseData.feature_licenses || [];
    return featureLicenses.includes(feature);
  },

  getLicenseSummary(status: LicenseStatus, language: 'en' | 'ar' = 'en'): {
    status: string;
    type: string;
    features: string[];
    expiryInfo: string;
    health: 'healthy' | 'warning' | 'expired' | 'unknown';
  } {
    const licenseData = status.licenseData;
    
    return {
      status: this.formatLicenseStatus(status, language),
      type: licenseData ? this.getLicenseTypeDisplayName(licenseData.type, language) : 'Unknown',
      features: licenseData?.features || [],
      expiryInfo: licenseData ? this.getExpiryInfo(licenseData, language) : '',
      health: this.getLicenseHealth(licenseData)
    };
  },

  getExpiryInfo(licenseData?: LicenseData, language: 'en' | 'ar' = 'en'): string {
    if (!licenseData?.expires_at) {
      return language === 'ar' ? 'لا تنتهي' : 'Never Expires';
    }

    const daysUntilExpiry = this.getDaysUntilExpiry(licenseData);
    
    if (daysUntilExpiry === null) {
      return language === 'ar' ? 'تاريخ انتهاء غير صحيح' : 'Invalid Expiry Date';
    }

    if (daysUntilExpiry < 0) {
      return language === 'ar' ? 'منتهي الصلاحية' : 'Expired';
    }

    if (daysUntilExpiry === 0) {
      return language === 'ar' ? 'ينتهي اليوم' : 'Expires Today';
    }

    if (daysUntilExpiry === 1) {
      return language === 'ar' ? 'ينتهي غداً' : 'Expires Tomorrow';
    }

    if (daysUntilExpiry <= 7) {
      return language === 'ar' 
        ? `ينتهي خلال ${daysUntilExpiry} أيام`
        : `Expires in ${daysUntilExpiry} days`;
    }

    const months = Math.floor(daysUntilExpiry / 30);
    if (months > 0) {
      return language === 'ar'
        ? `ينتهي خلال ${months} شهر`
        : `Expires in ${months} month${months > 1 ? 's' : ''}`;
    }

    return language === 'ar'
      ? `ينتهي خلال ${daysUntilExpiry} يوم`
      : `Expires in ${daysUntilExpiry} days`;
  },

  getValidationErrorMessage(reason: string, language: 'en' | 'ar' = 'en'): string {
    const errorMessages: Record<string, Record<string, string>> = {
      en: {
        'license_files_missing': 'License files not found. First activation required.',
        'license_data_invalid': 'License data is corrupted or invalid.',
        'invalid_signature': 'License signature verification failed.',
        'device_mismatch': 'License is not valid for this device.',
        'license_expired': 'License has expired.',
        'invalid_features': 'License contains invalid features.',
        'validation_error': 'License validation error occurred.'
      },
      ar: {
        'license_files_missing': 'ملفات الترخيص غير موجودة. مطلوب التفعيل الأول.',
        'license_data_invalid': 'بيانات الترخيص تالفة أو غير صالحة.',
        'invalid_signature': 'فشل التحقق من توقيع الترخيص.',
        'device_mismatch': 'الترخيص غير صالح لهذا الجهاز.',
        'license_expired': 'انتهت صلاحية الترخيص.',
        'invalid_features': 'الترخيص يحتوي على ميزات غير صالحة.',
        'validation_error': 'حدث خطأ في التحقق من الترخيص.'
      }
    };

    return errorMessages[language]?.[reason] || 
           (language === 'ar' ? 'فشل التحقق من الترخيص.' : 'License validation failed.');
  }
};

export default licenseService;
