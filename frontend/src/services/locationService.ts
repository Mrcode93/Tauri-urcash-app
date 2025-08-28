export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
  error?: string;
  source?: string;
}

// Google Geolocation API response interface
interface GoogleGeolocationResponse {
  location: {
    lat: number;
    lng: number;
  };
  accuracy: number;
}

// Google Geocoding API response interface (for reverse geocoding)
interface GoogleGeocodingResponse {
  success: boolean;
  coordinates: {
    lat: string;
    lng: string;
  };
  plus_code?: string;
  formatted_address?: string;
  address_components?: {
    plus_code?: string;
    locality?: string;
    political?: string;
    administrative_area_level_1?: string;
    country?: string;
  };
  raw_data?: Record<string, unknown>;
}

export interface GeolocationError {
  code: number;
  message: string;
}

// Note: ElectronAPI is already declared in types/electron.d.ts

export class LocationService {
  private static instance: LocationService;
  
  // Google Geolocation API Key - you should replace this with your actual API key
  // In Electron app, this will use the API key from the main process environment
  private readonly GOOGLE_API_KEY = process.env.VITE_APP_GOOGLE_GEOLOCATION_API_KEY || 'AIzaSyCmnGIu0zHpAjkRFxrKcfURbQ8snVmpk-k';
  

  
  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }



  /**
   * Get location using Google Geolocation API as fallback with enhanced error handling
   */
  private async getGoogleGeolocation(): Promise<LocationData> {
    // Try Electron API first if available
    if (window.electron?.getGoogleGeolocation) {
      try {
        const result = await window.electron.getGoogleGeolocation();
        if (result.success && result.data) {
          return result.data;
        } else {
          throw new Error(result.error || 'Electron Google Geolocation API failed');
        }
      } catch (electronError) {
        console.warn('Electron Google Geolocation API failed:', electronError);
        // Fall back to browser implementation
      }
    }

    // Browser implementation (fallback)
    if (!this.GOOGLE_API_KEY) {
      throw new Error('Google Geolocation API key not configured');
    }

    try {
      
      const url = `https://www.googleapis.com/geolocation/v1/geolocate?key=${this.GOOGLE_API_KEY}`;
      
      // Enhanced request with better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          // Add WiFi access points if available for better accuracy
          wifiAccessPoints: [],
          // Add cell towers if available
          cellTowers: []
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        
        // Handle specific error codes
        if (response.status === 403) {
          // Check for specific 403 error types
          if (errorText.includes('HTTP_REFERRER_BLOCKED') || errorText.includes('referer')) {
            throw new Error('API key has HTTP referrer restrictions. Please update your Google Cloud Console settings to allow requests from your domain or set restrictions to "None".');
          } else if (errorText.includes('API_KEY_INVALID')) {
            throw new Error('API key is invalid. Please check your Google Cloud Console settings.');
          } else if (errorText.includes('API_KEY_HTTP_REFERRER_BLOCKED')) {
            throw new Error('API key is blocked by HTTP referrer restrictions. Go to Google Cloud Console > Credentials and update your API key restrictions.');
          } else {
            throw new Error('API key is invalid or has insufficient permissions. Please check your Google Cloud Console settings.');
          }
        } else if (response.status === 429) {
          throw new Error('API quota exceeded. Please try again later or upgrade your Google Cloud plan.');
        } else if (response.status === 400) {
          throw new Error('Invalid request format. Please check the API documentation.');
        }
        
        throw new Error(`Google Geolocation API failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Handle both response formats
      let latitude: number;
      let longitude: number;
      let accuracy: number = 1000; // Default accuracy for IP-based location

      if (data.location && data.location.lat && data.location.lng) {
        // Standard Google Geolocation API response
        latitude = data.location.lat;
        longitude = data.location.lng;
        accuracy = data.accuracy || 1000;
      } else if (data.coordinates && data.coordinates.lat && data.coordinates.lng) {
        // Your custom response format
        latitude = parseFloat(data.coordinates.lat);
        longitude = parseFloat(data.coordinates.lng);
        accuracy = 1000; // IP-based location accuracy
      } else {
        throw new Error('Invalid response format from Google Geolocation API');
      }

      const result = {
        latitude,
        longitude,
        accuracy,
        timestamp: Date.now(),
        source: 'google_api'
      };
      
      return result;
    } catch (error) {
      // Enhanced error handling with specific suggestions
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out. Please check your internet connection and try again.');
        } else if (error.message.includes('Failed to fetch')) {
          throw new Error('Network error. Please check your internet connection and firewall settings.');
        } else if (error.message.includes('CORS')) {
          throw new Error('CORS error. This might be due to browser security settings or network restrictions.');
        }
      }
      
      throw error;
    }
  }

  /**
   * Get current location using browser's geolocation API with multiple fallbacks
   */
  async getCurrentLocation(): Promise<LocationData> {
    if (navigator.geolocation) {
      try {
        return await new Promise<LocationData>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            pos => {
              const result = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                timestamp: Date.now(),
                source: 'browser'
              };
              resolve(result);
            },
            async (error) => {
              try {
                const googleLoc = await this.getGoogleGeolocation();
                resolve(googleLoc); // Return the Google API result directly
              } catch (googleError) {
                reject(googleError);
              }
            },
            { 
              enableHighAccuracy: true, 
              timeout: 10000, 
              maximumAge: 300000 
            }
          );
        });
      } catch (error) {
        return this.getGoogleGeolocation();
      }
    } else {
      return this.getGoogleGeolocation();
    }
  }
  

  /**
   * Try to get location using Electron API
   */
  private async tryElectronGeolocation(): Promise<LocationData> {
    try {
      // Check if electron API is available and has getGeolocation method
      if (window.electron?.getGeolocation) {
        const result = await window.electron.getGeolocation();
        if (result.success && result.data) {
          const locationData: LocationData = {
            latitude: result.data.latitude,
            longitude: result.data.longitude,
            accuracy: result.data.accuracy,
            timestamp: result.data.timestamp,
            source: result.data.source || 'electron'
          };
          return locationData;
        } else if (result.error) {
          throw new Error(result.error);
        }
      }
    } catch (electronError) {
      console.warn('Electron geolocation failed:', electronError);
      throw electronError;
    }
    
    throw new Error('Electron geolocation is not available');
  }

  /**
   * Try to get location with low accuracy (fallback method)
   */
  private async tryLowAccuracyGeolocation(): Promise<LocationData> {
    return new Promise<LocationData>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      const options = {
        enableHighAccuracy: false, // Use low accuracy
        timeout: 15000, // Longer timeout
        maximumAge: 600000 // 10 minutes cache
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          };
          resolve(locationData);
        },
        (error) => {
          console.warn('Low accuracy geolocation failed:', error);
          reject(error);
        },
        options
      );
    });
  }

  /**
   * Get location with fallback to IP-based location
   */
  async getLocationWithFallback(): Promise<LocationData> {
    try {
      // Try to get precise location first
      return await this.getCurrentLocation();
    } catch (error) {
      console.warn('Precise location failed, trying IP-based fallback:', error);
      
      // Try IP-based location as fallback
      try {
        const ipLocation = await this.getIPBasedLocation();
        return ipLocation;
      } catch (ipError) {
        console.warn('IP-based location also failed:', ipError);
        
        // Final fallback - return default location with error flag
        return {
          latitude: 33.3152, // Default to Iraq coordinates
          longitude: 44.3661,
          accuracy: 50000, // Very low accuracy
          timestamp: Date.now(),
          error: 'Using default location due to geolocation failure',
          source: 'fallback'
        };
      }
    }
  }

  /**
   * Get approximate location using IP address
   */
  private async getIPBasedLocation(): Promise<LocationData> {
    try {
      // Try multiple IP geolocation services
      const services = [
        'https://ipapi.co/json/',
        'https://ipapi.com/ip_api.php?ip=',
        'https://freegeoip.app/json/'
      ];

      for (const service of services) {
        try {
          const response = await fetch(service);
          if (response.ok) {
            const data = await response.json();
            
            if (data.latitude && data.longitude) {
              return {
                latitude: parseFloat(data.latitude),
                longitude: parseFloat(data.longitude),
                accuracy: 50000, // IP-based location is not very accurate
                timestamp: Date.now(),
                source: 'ip_based'
              };
            }
          }
        } catch (serviceError) {
          console.warn(`IP service ${service} failed:`, serviceError);
          continue;
        }
      }
      
      throw new Error('All IP geolocation services failed');
    } catch (error) {
      console.error('IP-based location failed:', error);
      throw error;
    }
  }

  /**
   * Check if geolocation is available
   */
  isGeolocationAvailable(): boolean {
    const browserAvailable = 'geolocation' in navigator;
    const electronAvailable = window.electron?.getGeolocation !== undefined;
    const googleAvailable = !!this.GOOGLE_API_KEY;
    
    return browserAvailable || electronAvailable || googleAvailable;
  }

  /**
   * Get user-friendly error message with suggestions
   */
  private getGeolocationErrorMessage(code: number): { message: string; suggestion: string; systemPermission?: boolean } {
    switch (code) {
      case 1:
        return {
          message: 'Location access denied by user',
          suggestion: 'Please enable location permissions in your system settings. Go to System Preferences > Security & Privacy > Location Services and enable location access for this app.',
          systemPermission: true
        };
      case 2:
        return {
          message: 'Location information is unavailable',
          suggestion: 'Please check your location services and internet connection. Try moving to an area with better GPS signal or check your network connection.'
        };
      case 3:
        return {
          message: 'Location request timed out',
          suggestion: 'Please try again or check your network connection. The request took too long to complete.'
        };
      default:
        return {
          message: 'An unknown error occurred while retrieving location',
          suggestion: 'Please try again or contact support if the problem persists.'
        };
    }
  }

  /**
   * Request location permission
   */
  async requestLocationPermission(): Promise<boolean> {
    try {
      if (!this.isGeolocationAvailable()) {
        return false;
      }

      // Try to get location to check permission
      await this.getCurrentLocation();
      return true;
    } catch (error) {
      return false;
    }
  }


}

export const locationService = LocationService.getInstance();
