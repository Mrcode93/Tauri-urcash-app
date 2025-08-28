const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');
const licenseService = require('../services/licenseService');

/**
 * License-specific cache middleware
 * Handles caching for license operations with app startup detection
 */
class LicenseCacheMiddleware {
  constructor() {
    this.appStartupKey = 'license:app_startup';
    this.lastCheckKey = 'license:last_check';
    this.cacheTTL = {
      startup: 24 * 60 * 60, // 24 hours for app startup
      regular: 10 * 60, // 10 minutes for regular checks
      activation: 0 // No cache for activation operations
    };
  }

  /**
   * Check if this is an app startup (first check of the session)
   */
  isAppStartup() {
    const startupData = cacheService.get(this.appStartupKey);
    return !startupData;
  }

  /**
   * Mark app startup as completed
   */
  markAppStartup() {
    cacheService.set(this.appStartupKey, {
      timestamp: Date.now(),
      session: true
    }, this.cacheTTL.startup);
  }

  /**
   * Get cache key for license operations
   */
  getCacheKey(operation, fingerprint = null) {
    if (fingerprint) {
      return `license:${operation}:${fingerprint}`;
    }
    return `license:${operation}`;
  }

  /**
   * Cache middleware for license verification (app startup optimized)
   */
  verifyLicenseCache() {
    return async (req, res, next) => {
      try {
        // Skip caching for non-GET requests
        if (req.method !== 'GET') {
          return next();
        }

        // Ensure res is properly defined
        if (!res || typeof res.json !== 'function') {
          logger.error('Invalid response object in license cache middleware');
          return next();
        }

        const isStartup = this.isAppStartup();
        const fingerprint = await licenseService.generateDeviceFingerprint();
        const cacheKey = this.getCacheKey('verification', fingerprint);
        
        logger.info(`License cache check - Startup: ${isStartup}, Operation: verification`);

        // Try to get from cache
        const cached = cacheService.get(cacheKey);
        if (cached && !isStartup) {
          logger.info(`✅ License verification cache hit for fingerprint: ${fingerprint.substring(0, 12)}...`);
          return res.json(cached);
        }

        // Store original send method
        const originalJson = res.json;
        const middleware = this;

        // Override send method to cache the response
        res.json = function(data) {
          try {
            // Cache the response with appropriate TTL
            const ttl = isStartup ? middleware.cacheTTL.startup : middleware.cacheTTL.regular;
            cacheService.set(cacheKey, data, ttl);
            
            // Mark app startup as completed if this is the first check
            if (isStartup) {
              middleware.markAppStartup();
              logger.info('✅ App startup license check completed and cached');
            }
            
            logger.info(`📋 License verification cached with TTL: ${ttl}s`);
          } catch (cacheError) {
            logger.error('Error caching license verification response:', cacheError);
          }
          
          // Call original send method
          return originalJson.call(this, data);
        };

        next();
      } catch (error) {
        logger.error('License cache middleware error:', error);
        next();
      }
    };
  }

  /**
   * Cache middleware for local license checks
   */
  localLicenseCache() {
    return async (req, res, next) => {
      try {
        // Skip caching for non-GET requests
        if (req.method !== 'GET') {
          return next();
        }

        // Ensure res is properly defined
        if (!res || typeof res.json !== 'function') {
          logger.error('Invalid response object in license local cache middleware');
          return next();
        }

        const fingerprint = await licenseService.generateDeviceFingerprint();
        const cacheKey = this.getCacheKey('local', fingerprint);
        
        logger.debug(`License local cache check for fingerprint: ${fingerprint.substring(0, 12)}...`);

        // Try to get from cache
        const cached = cacheService.get(cacheKey);
        if (cached) {
          logger.info(`✅ License local check cache hit`);
          return res.json(cached);
        }

        // Store original send method
        const originalJson = res.json;
        const middleware = this;

        // Override send method to cache the response
        res.json = function(data) {
          try {
            // Cache local license checks for 10 minutes
            cacheService.set(cacheKey, data, middleware.cacheTTL.regular);
            logger.debug(`📋 License local check cached`);
          } catch (cacheError) {
            logger.error('Error caching local license check response:', cacheError);
          }
          
          // Call original send method
          return originalJson.call(this, data);
        };

        next();
      } catch (error) {
        logger.error('License local cache middleware error:', error);
        next();
      }
    };
  }

  /**
   * Cache invalidation middleware for license activation
   */
  activationCacheInvalidation() {
    return async (req, res, next) => {
      try {
        // Ensure res is properly defined
        if (!res || typeof res.json !== 'function') {
          logger.error('Invalid response object in license activation cache middleware');
          return next();
        }

        // Store original send method
        const originalJson = res.json;
        const middleware = this;

        // Override send method to invalidate cache after successful activation
        res.json = function(data) {
          try {
            // If activation was successful, invalidate all license cache
            if (data && data.success) {
              logger.info('🔄 Invalidating license cache after successful activation');
              
              // Invalidate all license-related cache
              cacheService.invalidatePattern('license:*');
              
              // Clear app startup flag to force fresh check
              cacheService.del(middleware.appStartupKey);
              
              logger.info('✅ License cache invalidated successfully');
            }
          } catch (cacheError) {
            logger.error('Error invalidating license cache after activation:', cacheError);
          }
          
          // Call original send method
          return originalJson.call(this, data);
        };

        next();
      } catch (error) {
        logger.error('License activation cache invalidation error:', error);
        next();
      }
    };
  }

  /**
   * Force refresh middleware (bypasses cache)
   */
  forceRefresh() {
    return async (req, res, next) => {
      try {
        // Clear all license cache when force refresh is requested
        if (req.query.force_refresh === 'true') {
          logger.info('🔄 Force refresh requested - clearing license cache');
          cacheService.invalidatePattern('license:*');
          cacheService.del(this.appStartupKey);
        }
        
        next();
      } catch (error) {
        logger.error('License force refresh middleware error:', error);
        next();
      }
    };
  }

  /**
   * App startup detection middleware
   */
  appStartupDetection() {
    return async (req, res, next) => {
      try {
        const isStartup = this.isAppStartup();
        
        // Add startup info to request for controllers to use
        req.isAppStartup = isStartup;
        
        if (isStartup) {
          logger.info('🚀 App startup detected - license check will be cached for 24 hours');
        } else {
          logger.debug('🔄 Regular license check - using standard cache TTL');
        }
        
        next();
      } catch (error) {
        logger.error('App startup detection middleware error:', error);
        next();
      }
    };
  }

  /**
   * Get cache statistics for license operations
   */
  getCacheStats() {
    const keys = cacheService.getKeys();
    const licenseKeys = keys.filter(key => key.startsWith('license:'));
    
    return {
      totalKeys: keys.length,
      licenseKeys: licenseKeys.length,
      licenseKeysList: licenseKeys,
      appStartup: cacheService.get(this.appStartupKey) ? 'Active' : 'Not Set',
      lastCheck: cacheService.get(this.lastCheckKey)
    };
  }

  /**
   * Clear all license cache
   */
  clearLicenseCache() {
    logger.info('🧹 Clearing all license cache');
    cacheService.invalidatePattern('license:*');
    cacheService.del(this.appStartupKey);
    cacheService.del(this.lastCheckKey);
    return true;
  }
}

// Create singleton instance
const licenseCacheMiddleware = new LicenseCacheMiddleware();

module.exports = licenseCacheMiddleware; 