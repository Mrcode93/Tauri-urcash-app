import axios from 'axios';
import { getToken, saveToken, clearAuth } from '@/lib/auth';

const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');
const isDev = process.env.NODE_ENV === 'development';

// Use different ports based on environment
const API_PORT = isDev ? 39000 : 39000; // Fixed: dev should use 8000, prod uses 39000



// Function to get device configuration from localStorage (appConfig structure)
const getDeviceConfig = async () => {
  try {
    // Get urcash_device_config from localStorage (this contains the appConfig structure)
    const existingConfig = localStorage.getItem('urcash_device_config');
    
    if (existingConfig) {
      try {
        const config = JSON.parse(existingConfig);
        
        
        // Return the config in the expected format
        return {
          device_mode: config.branch === 'main' ? 'main' : 'secondary',
          branch: config.branch,
          main_device_ip: config.ip,
          port: config.port || 39000,
          auto_connect: config.auto_connect || false,
          connection_timeout: config.connection_timeout || 10000
        };
      } catch (error) {
        console.warn('Failed to parse device config from localStorage:', error);
      }
    }

    // Fallback: try to get from server if localStorage is empty
    try {
      const response = await axios.get(`http://localhost:${API_PORT}/api/branch-config`);
      const serverConfig = response.data?.data || {};
      
      const deviceConfig = {
        device_mode: serverConfig.branch === 'main' ? 'main' : 'secondary',
        branch: serverConfig.branch || 'main',
        main_device_ip: serverConfig.ip || '192.168.0.103',
        port: serverConfig.port || 39000,
        auto_connect: serverConfig.auto_connect || false,
        connection_timeout: serverConfig.connection_timeout || 10000
      };

      // Save to localStorage for future use
      localStorage.setItem('urcash_device_config', JSON.stringify({
        branch: deviceConfig.branch,
        ip: deviceConfig.main_device_ip,
        port: deviceConfig.port,
        auto_connect: deviceConfig.auto_connect,
        connection_timeout: deviceConfig.connection_timeout,
        updated_at: new Date().toISOString()
      }));
      
      return deviceConfig;
    } catch (serverError) {
      console.warn('Failed to load device config from server:', serverError);
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to load device config:', error);
    return null;
  }
};

// Function to initialize device config with IP from branch-config
const initializeDeviceConfig = async () => {
  try {
    // Check if we already have a valid config from server
    const existingConfig = localStorage.getItem('urcash_device_config');
    
    // Always try to get fresh config from server
    const deviceConfigFromApi = await getDeviceConfig();
    
    if (deviceConfigFromApi) {
      // Server responded - use server config as source of truth
      
    } else if (!existingConfig) {
      // Only create defaults if NO config exists AND server is unavailable
      console.warn('Server unavailable and no existing config - using minimal defaults');
      // Don't create any default config - let the app handle it
    } else {
      // Keep existing config if server is unavailable but we have saved config
      
    }
  } catch (error) {
    console.warn('Failed to initialize device config:', error);
  }
};

// Initialize device config on module load

initializeDeviceConfig();

// Function to dynamically get API URL based on device mode
const getApiUrl = () => {
  try {
    const savedConfig = localStorage.getItem('urcash_device_config');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      
      if (config.branch === 'main') {
        // Main branch - always use localhost
        return `http://localhost:${API_PORT}/api`;
      } else if (config.branch === 'secondary') {
        // Secondary branch - use the IP from config
        const mainDeviceIp = config.ip || '192.168.0.103';
        const port = config.port || API_PORT;
        return `http://${mainDeviceIp}:${port}/api`;
      }
    }
  } catch (error) {
    console.warn('Error parsing device config:', error);
  }
  
  // Default to localhost for main device mode
  return `http://localhost:${API_PORT}/api`;
};

// Get initial API URL
let API_URL = getApiUrl();


// Create axios instance with better configuration
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
  // Only use withCredentials in browser environment
  withCredentials: !isElectron,
});

// Function to update API URL dynamically
export const updateApiUrl = () => {
  const newApiUrl = getApiUrl();
  if (newApiUrl !== API_URL) {
    API_URL = newApiUrl;
    api.defaults.baseURL = API_URL;
    
  }
};

// Function to get current API URL for debugging
export const getCurrentApiUrl = () => {
  try {
    const savedConfig = localStorage.getItem('urcash_device_config');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      
      if (config.device_mode === 'main') {
        // Main device mode - always use localhost
        return `http://localhost:${API_PORT}`;
      } else if (config.device_mode === 'secondary') {
        // Secondary device mode - use main device IP
        const mainDeviceIp = config.main_device_ip ;
        const port = config.port || API_PORT;
        return `http://${mainDeviceIp}:${port}`;
      }
    }
  } catch (error) {
    console.warn('Error parsing device config:', error);
  }
  
  // Default to localhost for main device mode
  return `http://localhost:${API_PORT}`;
};




// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    try {
      // Get token using unified auth storage
      const token = await getToken();
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        // Ensure token is persisted using unified auth storage
        await saveToken(token);
      } else {
        console.warn('No token found for request:', config.url);
      }
    } catch (error) {
      console.error('Error getting token for request:', error);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with retry logic
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const { config } = error;
    
    // Retry logic for network errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout') || !error.response) {
      if (!config || !config.__retryCount) {
        config.__retryCount = 0;
      }
      
      if (config.__retryCount < MAX_RETRIES) {
        config.__retryCount++;
        
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * config.__retryCount));
        
        return api(config);
      }
    }
    
    if (error.response?.status === 401) {
      try {
        // Clear auth data using unified auth storage
        await clearAuth();
        window.location.hash = '/login';
      } catch (clearError) {
        console.error('Error clearing auth data:', clearError);
        // Fallback to direct localStorage/cookie clearing
        localStorage.clear();
        document.cookie.split(";").forEach((c) => {
          const eqPos = c.indexOf("=");
          const name = eqPos > -1 ? c.substr(0, eqPos) : c;
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        });
        window.location.hash = '/login';
      }
    }
    
    // Preserve the original error structure for validation errors
    if (error.response?.data?.errors) {
      // For validation errors, preserve the full error structure
      return Promise.reject(error);
    }
    
    // For other errors, return the response data
    return Promise.reject(error.response?.data || error);
  }
);


// Listen for device config changes and update API URL
if (typeof window !== 'undefined') {
  window.addEventListener('settingsChanged', () => {
    
    updateApiUrl();
  });
  
  // Also update on storage changes (for localStorage updates from other tabs/processes)
  window.addEventListener('storage', (e) => {
    if (e.key === 'urcash_device_config') {
      
      updateApiUrl();
    }
  });
}


export default api;

// Export configuration for debugging - Fixed to provide dynamic values
export const API_CONFIG = {

  API_PORT,
  isElectron,
  isDev,
  getApiUrl,
  updateApiUrl,
  get baseURL() {
    return api.defaults.baseURL;
  },
  get deviceConfig() {
    try {
      const savedConfig = localStorage.getItem('urcash_device_config');
      return savedConfig ? JSON.parse(savedConfig) : null;
    } catch {
      return null;
    }
  }
};

// Export the getDeviceConfig function for external use
export { getDeviceConfig };

// Function to fix device config with correct IP
export const fixDeviceConfig = (correctIp: string): boolean => {
  try {
    const savedConfig = localStorage.getItem('urcash_device_config');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      if (config.device_mode === 'secondary') {
        // Update the IP while preserving other settings
        config.main_device_ip = correctIp;
        localStorage.setItem('urcash_device_config', JSON.stringify(config));
        updateApiUrl();
        
        return true;
      }
    }
  } catch (error) {
    console.warn('Failed to fix device config:', error);
  }
  return false;
};

// Function to reset device config with correct defaults
export const resetDeviceConfigWithCorrectIP = (): boolean => {
  try {
    // Get existing config to preserve some settings
    const existingConfig = localStorage.getItem('urcash_device_config');
    let oldConfig: any = {};
    
    if (existingConfig) {
      try {
        oldConfig = JSON.parse(existingConfig);
      } catch (error) {
        console.warn('Failed to parse existing config during reset:', error);
      }
    }

    // Create new config with correct defaults, preserving some old values
    const resetConfig = {
      device_mode: 'secondary',
      main_device_ip: '192.168.0.1', // Correct IP
      port: oldConfig.port || 39000,
      auto_connect: oldConfig.auto_connect || false,
      connection_timeout: oldConfig.connection_timeout || 10000
    };

    localStorage.setItem('urcash_device_config', JSON.stringify(resetConfig));
    updateApiUrl();
    
    return true;
  } catch (error) {
    console.warn('Failed to reset device config:', error);
    return false;
  }
};