const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

/**
 * Cache middleware for Express routes
 * @param {number} ttl - Time to live in seconds (default: 300)
 * @param {string} keyPrefix - Prefix for cache keys (default: 'api')
 * @param {Function} keyGenerator - Custom key generator function
 * @returns {Function} Express middleware
 */
const cacheMiddleware = (ttl = 300, keyPrefix = 'api', keyGenerator = null) => {
  return (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    let cacheKey;
    if (keyGenerator && typeof keyGenerator === 'function') {
      cacheKey = keyGenerator(req);
    } else {
      // Default key generation
      const url = req.originalUrl || req.url;
      const query = JSON.stringify(req.query);
      const params = JSON.stringify(req.params);
      cacheKey = `${keyPrefix}:${req.method}:${url}:${query}:${params}`;
    }

    // Try to get from cache
    const cachedResponse = cacheService.get(cacheKey);
    if (cachedResponse !== undefined) {
      // Cache hit
      return res.json(cachedResponse);
    }

    // Store original send method
    const originalSend = res.json;

    // Override send method to cache the response
    res.json = function(data) {
      // Cache the response
      cacheService.set(cacheKey, data, ttl);
      // Cache set
      
      // Call original send method
      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Cache invalidation middleware for POST/PUT/DELETE requests
 * @param {Array<string>} dataTypes - Array of data types to invalidate
 * @param {Object} options - Additional options
 * @returns {Function} Express middleware
 */
const cacheInvalidationMiddleware = (dataTypes = [], options = {}) => {
  return (req, res, next) => {
    // Store original send method
    const originalSend = res.json;

    // Override send method to invalidate cache after successful response
    res.json = function(data) {
      // Only invalidate cache for successful responses
      if (data && (data.success === true || res.statusCode < 400)) {
        try {
          // Ensure dataTypes is an array
          if (!Array.isArray(dataTypes)) {
            logger.warn(`Invalid dataTypes parameter in middleware: expected array, got ${typeof dataTypes}. Converting to array.`);
            dataTypes = [dataTypes].filter(Boolean);
          }
          
          // Invalidate specified data types
          if (dataTypes.length > 0) {
            cacheService.invalidateMultipleDataTypes(dataTypes, options);
            // Cache invalidated
          }
        } catch (error) {
          logger.error('Error invalidating cache:', error);
        }
      }
      
      // Call original send method
      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Specific cache invalidation middlewares for different data types
 */
const salesCacheInvalidation = cacheInvalidationMiddleware(['sales', 'debts', 'customers', 'cash_box', 'inventory']);
const debtsCacheInvalidation = cacheInvalidationMiddleware(['debts', 'sales', 'customers', 'cash_box', 'customer_receipts']);
const installmentsCacheInvalidation = cacheInvalidationMiddleware(['installments', 'sales', 'customers', 'cash_box', 'customer_receipts']);
const customersCacheInvalidation = cacheInvalidationMiddleware(['customers', 'sales', 'debts', 'installments']);
const cashBoxCacheInvalidation = cacheInvalidationMiddleware(['cash_box', 'sales', 'purchases', 'expenses', 'customer_receipts', 'supplier_payment_receipts']);
const inventoryCacheInvalidation = cacheInvalidationMiddleware(['inventory', 'sales', 'purchases']);


const purchasesCacheInvalidation = cacheInvalidationMiddleware(['purchases', 'suppliers', 'inventory', 'cash_box', 'supplier_payment_receipts']);
const suppliersCacheInvalidation = cacheInvalidationMiddleware(['suppliers', 'purchases', 'supplier_payment_receipts']);

/**
 * Financial data cache invalidation middleware
 * Invalidates all financial-related caches
 */
const financialDataCacheInvalidation = cacheInvalidationMiddleware([
  'sales', 'debts', 'installments', 'customers', 'cash_box', 'customer_receipts'
]);

/**
 * Comprehensive cache invalidation middleware
 * Invalidates all caches (nuclear option)
 */
const comprehensiveCacheInvalidation = (req, res, next) => {
  // Store original send method
  const originalSend = res.json;

  // Override send method to invalidate all caches after successful response
  res.json = function(data) {
    // Only invalidate cache for successful responses
    if (data && (data.success === true || res.statusCode < 400)) {
      try {
        cacheService.invalidateAll();
        logger.info('All caches invalidated');
      } catch (error) {
        logger.error('Error invalidating all caches:', error);
      }
    }
    
    // Call original send method
    return originalSend.call(this, data);
  };

  next();
};

/**
 * Smart cache invalidation middleware
 * Automatically determines which caches to invalidate based on the route
 */
const smartCacheInvalidation = (req, res, next) => {
  const route = req.originalUrl || req.url;
  const method = req.method;
  
  // Only invalidate on non-GET requests
  if (method === 'GET') {
    return next();
  }

  // Store original send method
  const originalSend = res.json;

  // Override send method to invalidate cache after successful response
  res.json = function(data) {
    // Only invalidate cache for successful responses
    if (data && (data.success === true || res.statusCode < 400)) {
      try {
        let dataTypesToInvalidate = [];

        // Determine which caches to invalidate based on the route
        if (route.includes('/sales')) {
          dataTypesToInvalidate = ['sales', 'debts', 'customers', 'cash_box', 'inventory'];
        } else if (route.includes('/debts')) {
          dataTypesToInvalidate = ['debts', 'sales', 'customers', 'cash_box', 'customer_receipts'];
        } else if (route.includes('/installments')) {
          dataTypesToInvalidate = ['installments', 'sales', 'customers', 'cash_box', 'customer_receipts'];
        } else if (route.includes('/customers')) {
          dataTypesToInvalidate = ['customers', 'sales', 'debts', 'installments'];
        } else if (route.includes('/cash-box') || route.includes('/cashbox')) {
          dataTypesToInvalidate = ['cash_box', 'sales', 'purchases', 'expenses', 'customer_receipts', 'supplier_payment_receipts'];
        } else if (route.includes('/inventory') || route.includes('/products')) {
          dataTypesToInvalidate = ['inventory', 'sales', 'purchases'];
        } else if (route.includes('/purchases')) {
          dataTypesToInvalidate = ['purchases', 'suppliers', 'inventory', 'cash_box', 'supplier_payment_receipts'];
        } else if (route.includes('/suppliers')) {
          dataTypesToInvalidate = ['suppliers', 'purchases', 'supplier_payment_receipts'];
        } else if (route.includes('/customer-receipts') || route.includes('/customer_receipts')) {
          dataTypesToInvalidate = ['customer_receipts', 'sales', 'debts', 'customers', 'cash_box'];
        } else if (route.includes('/supplier-payment-receipts') || route.includes('/supplier_payment_receipts')) {
          dataTypesToInvalidate = ['supplier_payment_receipts', 'purchases', 'suppliers', 'cash_box'];
        } else {
          // Default to financial data invalidation for unknown routes
          dataTypesToInvalidate = ['sales', 'debts', 'installments', 'customers', 'cash_box'];
        }

        if (dataTypesToInvalidate.length > 0) {
          cacheService.invalidateMultipleDataTypes(dataTypesToInvalidate);
          // Smart cache invalidation
        }
      } catch (error) {
        logger.error('Error in smart cache invalidation:', error);
      }
    }
    
    // Call original send method
    return originalSend.call(this, data);
  };

  next();
};

/**
 * Cache statistics middleware
 * @returns {Function} Express middleware
 */
const cacheStatsMiddleware = () => {
  return (req, res, next) => {
    if (req.path === '/api/cache/stats') {
      const stats = cacheService.getStats();
      return res.json({
        success: true,
        data: stats
      });
    }
    next();
  };
};

/**
 * Cache flush middleware
 * @returns {Function} Express middleware
 */
const cacheFlushMiddleware = () => {
  return (req, res, next) => {
    if (req.path === '/api/cache/flush' && req.method === 'POST') {
      cacheService.flush();
      return res.json({
        success: true,
        message: 'Cache flushed successfully'
      });
    }
    next();
  };
};

/**
 * Cache keys middleware
 * @returns {Function} Express middleware
 */
const cacheKeysMiddleware = () => {
  return (req, res, next) => {
    if (req.path === '/api/cache/keys') {
      const keys = cacheService.getKeys();
      return res.json({
        success: true,
        data: {
          keys,
          count: keys.length
        }
      });
    }
    next();
  };
};

/**
 * Cache memory usage middleware
 * @returns {Function} Express middleware
 */
const cacheMemoryMiddleware = () => {
  return (req, res, next) => {
    if (req.path === '/api/cache/memory') {
      const memoryUsage = cacheService.getMemoryUsage();
      return res.json({
        success: true,
        data: memoryUsage
      });
    }
    next();
  };
};

module.exports = {
  cacheMiddleware,
  cacheInvalidationMiddleware,
  salesCacheInvalidation,
  debtsCacheInvalidation,
  installmentsCacheInvalidation,
  customersCacheInvalidation,
  cashBoxCacheInvalidation,
  inventoryCacheInvalidation,
  purchasesCacheInvalidation,
  suppliersCacheInvalidation,
  financialDataCacheInvalidation,
  comprehensiveCacheInvalidation,
  smartCacheInvalidation,
  cacheStatsMiddleware,
  cacheFlushMiddleware,
  cacheKeysMiddleware,
  cacheMemoryMiddleware
}; 