const NodeCache = require('node-cache');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    // Initialize cache with optimized settings for better performance
    this.cache = new NodeCache({
      stdTTL: 300, // 5 minutes default TTL
      checkperiod: 600, // 10 minutes check period
      useClones: false, // Don't clone objects for better performance
      deleteOnExpire: true, // Automatically delete expired keys
      maxKeys: 1000 // Limit cache size to prevent memory issues
    });

    // Set up event listeners for monitoring
    this.cache.on('expired', (key, value) => {
      logger.debug(`Cache key expired: ${key}`);
    });

    this.cache.on('flush', () => {
      logger.info('Cache flushed');
    });

    this.cache.on('del', (key, value) => {
      logger.debug(`Cache key deleted: ${key}`);
    });

    // Initialize cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };

    // Optimized cache invalidation patterns - more specific and targeted
    this.invalidationPatterns = {
      // Sales-related patterns - more specific
      sales: {
        patterns: [
          'sales:list:*',
          'sales:sale:*',
          'sales:stats:*'
        ],
        related: ['debts:*', 'customers:*', 'cash_box:*']
      },
      
      // Debts-related patterns - more specific
      debts: {
        patterns: [
          'debts:list:*',
          'debts:debt:*',
          'debts:stats:*'
        ],
        related: ['sales:*', 'customers:*', 'cash_box:*']
      },
      
      // Installments-related patterns - more specific
      installments: {
        patterns: [
          'installments:list:*',
          'installments:installment:*',
          'installments:summary:*'
        ],
        related: ['sales:*', 'customers:*', 'cash_box:*']
      },
      
      // Customers-related patterns - more specific
      customers: {
        patterns: [
          'customers:list:*',
          'customers:customer:*',
          'customers:balance:*'
        ],
        related: ['sales:*', 'debts:*', 'installments:*']
      },
      
      // Cash box-related patterns - more specific
      cash_box: {
        patterns: [
          'cash_box:list:*',
          'cash_box:transaction:*',
          'cash_box:balance:*'
        ],
        related: ['sales:*', 'purchases:*', 'expenses:*']
      },
      
      // Customer receipts-related patterns - more specific
      customer_receipts: {
        patterns: [
          'customer_receipts:list:*',
          'customer_receipts:receipt:*'
        ],
        related: ['sales:*', 'debts:*', 'customers:*']
      },
      
      // Inventory-related patterns - more specific
      inventory: {
        patterns: [
          'inventory:products:*',
          'inventory:product:*',
          'inventory:categories:*',
          'inventory:pos:*'
        ],
        related: ['sales:*', 'purchases:*']
      },
      
      // Purchases-related patterns - more specific
      purchases: {
        patterns: [
          'purchases:list:*',
          'purchases:purchase:*'
        ],
        related: ['suppliers:*', 'inventory:*', 'cash_box:*']
      },
      
      // Suppliers-related patterns - more specific
      suppliers: {
        patterns: [
          'suppliers:list:*',
          'suppliers:supplier:*'
        ],
        related: ['purchases:*', 'supplier_payment_receipts:*']
      },
      
      // Supplier payment receipts-related patterns - more specific
      supplier_payment_receipts: {
        patterns: [
          'supplier_payment_receipts:list:*',
          'supplier_payment_receipts:receipt:*'
        ],
        related: ['purchases:*', 'suppliers:*', 'cash_box:*']
      },
      
      // Bills-related patterns - more specific
      bills: {
        patterns: [
          'bills:list:*',
          'bills:bill:*',
          'bills:stats:*'
        ],
        related: ['customers:*', 'cash_box:*']
      },
      
      // Stock movements-related patterns - more specific
      stock_movements: {
        patterns: [
          'stock_movements:list:*',
          'stock_movements:movement:*'
        ],
        related: ['inventory:*', 'stocks:*']
      },
      
      // Stocks-related patterns - more specific
      stocks: {
        patterns: [
          'stocks:list:*',
          'stocks:stock:*'
        ],
        related: ['inventory:*', 'stock_movements:*']
      },
      
      // Expenses-related patterns - more specific
      expenses: {
        patterns: [
          'expenses:list:*',
          'expenses:expense:*'
        ],
        related: ['cash_box:*']
      },
      
      // Reports-related patterns - more specific
      reports: {
        patterns: [
          'reports:sales:*',
          'reports:purchases:*',
          'reports:inventory:*',
          'reports:financial:*'
        ],
        related: ['sales:*', 'purchases:*', 'inventory:*', 'cash_box:*']
      }
    };

    // Performance monitoring
    this.performanceStats = {
      totalOperations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageOperationTime: 0,
      lastReset: new Date()
    };
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {boolean} - Success status
   */
  set(key, value, ttl = null) {
    try {
      const success = this.cache.set(key, value, ttl);
      if (success) {
        this.stats.sets++;
        logger.debug(`Cache set: ${key}`);
      }
      return success;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {*} - Cached value or undefined if not found
   */
  get(key) {
    try {
      const value = this.cache.get(key);
      if (value !== undefined) {
        this.stats.hits++;
        logger.debug(`Cache hit: ${key}`);
      } else {
        this.stats.misses++;
        logger.debug(`Cache miss: ${key}`);
      }
      return value;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Delete a specific key from cache
   * @param {string} key - Cache key to delete
   * @returns {number} - Number of keys deleted
   */
  del(key) {
    try {
      const deleted = this.cache.del(key);
      if (deleted > 0) {
        this.stats.deletes++;
        logger.debug(`Cache deleted: ${key}`);
      }
      return deleted;
    } catch (error) {
      logger.error(`Cache del error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Check if a key exists in cache
   * @param {string} key - Cache key to check
   * @returns {boolean} - True if key exists
   */
  has(key) {
    try {
      return this.cache.has(key);
    } catch (error) {
      logger.error(`Cache has error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Flush all cache
   * @returns {void}
   */
  flush() {
    try {
      this.cache.flushAll();
      logger.info('Cache flushed');
    } catch (error) {
      logger.error('Cache flush error:', error);
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   * @param {string} pattern - Pattern to match (supports * wildcard)
   * @returns {number} - Number of keys invalidated
   */
  invalidatePattern(pattern) {
    try {
      const keys = this.cache.keys();
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      let invalidatedCount = 0;

      keys.forEach(key => {
        if (regex.test(key)) {
          this.del(key);
          invalidatedCount++;
        }
      });

      logger.debug(`Invalidated ${invalidatedCount} cache keys matching pattern: ${pattern}`);
      return invalidatedCount;
    } catch (error) {
      logger.error(`Cache invalidatePattern error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Comprehensive cache invalidation for specific data types
   * @param {string} dataType - Type of data that changed (e.g., 'sales', 'debts', 'installments')
   * @param {Object} options - Additional options
   * @param {boolean} options.includeRelated - Whether to invalidate related caches (default: true)
   * @param {string} options.specificId - Specific ID to invalidate (optional)
   * @returns {number} - Total number of keys invalidated
   */
  invalidateDataType(dataType, options = {}) {
    try {
      const { includeRelated = true, specificId = null } = options;
      let totalInvalidated = 0;

      // Get invalidation patterns for this data type
      const patterns = this.invalidationPatterns[dataType];
      if (!patterns) {
        logger.warn(`No invalidation patterns found for data type: ${dataType}`);
        return 0;
      }

      // Invalidate main patterns
      patterns.patterns.forEach(pattern => {
        if (specificId) {
          // Invalidate specific ID pattern
          const specificPattern = pattern.replace('*', specificId);
          totalInvalidated += this.invalidatePattern(specificPattern);
        } else {
          // Invalidate all patterns
          totalInvalidated += this.invalidatePattern(pattern);
        }
      });

      // Invalidate related patterns if requested
      if (includeRelated && patterns.related) {
        patterns.related.forEach(relatedPattern => {
          totalInvalidated += this.invalidatePattern(relatedPattern);
        });
      }

      logger.info(`Invalidated ${totalInvalidated} cache keys for ${dataType}${specificId ? ` (ID: ${specificId})` : ''}`);
      return totalInvalidated;
    } catch (error) {
      logger.error(`Cache invalidateDataType error for ${dataType}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate multiple data types at once
   * @param {Array<string>} dataTypes - Array of data types to invalidate
   * @param {Object} options - Additional options
   * @returns {number} - Total number of keys invalidated
   */
  invalidateMultipleDataTypes(dataTypes, options = {}) {
    try {
      let totalInvalidated = 0;
      
      // Ensure dataTypes is an array
      if (!Array.isArray(dataTypes)) {
        logger.warn(`Invalid dataTypes parameter: expected array, got ${typeof dataTypes}. Converting to array.`);
        dataTypes = [dataTypes].filter(Boolean);
      }
      
      dataTypes.forEach(dataType => {
        totalInvalidated += this.invalidateDataType(dataType, options);
      });

      logger.info(`Invalidated ${totalInvalidated} cache keys for multiple data types: ${dataTypes.join(', ')}`);
      return totalInvalidated;
    } catch (error) {
      logger.error(`Cache invalidateMultipleDataTypes error:`, error);
      return 0;
    }
  }

  /**
   * Invalidate all caches (nuclear option)
   * @returns {number} - Total number of keys invalidated
   */
  invalidateAll() {
    try {
      const keys = this.cache.keys();
      const totalKeys = keys.length;
      
      this.flush();
      
      logger.info(`Invalidated all ${totalKeys} cache keys`);
      return totalKeys;
    } catch (error) {
      logger.error('Cache invalidateAll error:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache statistics
   */
  getStats() {
    try {
      const keys = this.cache.keys();
      const memoryUsage = this.getMemoryUsage();
      
      return {
        ...this.stats,
        totalKeys: keys.length,
        memoryUsage,
        hitRate: this.stats.hits + this.stats.misses > 0 
          ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2) 
          : 0
      };
    } catch (error) {
      logger.error('Cache getStats error:', error);
      return this.stats;
    }
  }

  /**
   * Get memory usage information
   * @returns {Object} - Memory usage statistics
   */
  getMemoryUsage() {
    try {
      const keys = this.cache.keys();
      let totalSize = 0;
      
      keys.forEach(key => {
        const value = this.cache.get(key);
        if (value) {
          totalSize += JSON.stringify(value).length;
        }
      });

      return {
        totalKeys: keys.length,
        totalSize: totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
      };
    } catch (error) {
      logger.error('Cache getMemoryUsage error:', error);
      return { totalKeys: 0, totalSize: 0, totalSizeMB: '0.00' };
    }
  }

  /**
   * Cache wrapper for async functions
   * @param {string} key - Cache key
   * @param {Function} fn - Async function to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<*>} - Cached or fresh result
   */
  async wrap(key, fn, ttl = null) {
    try {
      // Try to get from cache first
      const cached = this.get(key);
      if (cached !== undefined) {
        return cached;
      }

      // If not in cache, execute function and cache result
      const result = await fn();
      this.set(key, result, ttl);
      return result;
    } catch (error) {
      logger.error(`Cache wrap error for key ${key}:`, error);
      // If caching fails, still try to execute the function
      return await fn();
    }
  }

  /**
   * Cache wrapper for synchronous functions
   * @param {string} key - Cache key
   * @param {Function} fn - Sync function to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {*} - Cached or fresh result
   */
  wrapSync(key, fn, ttl = null) {
    try {
      // Try to get from cache first
      const cached = this.get(key);
      if (cached !== undefined) {
        return cached;
      }

      // If not in cache, execute function and cache result
      const result = fn();
      this.set(key, result, ttl);
      return result;
    } catch (error) {
      logger.error(`Cache wrapSync error for key ${key}:`, error);
      // If caching fails, still try to execute the function
      return fn();
    }
  }

  /**
   * Set cache with automatic key generation
   * @param {string} prefix - Key prefix
   * @param {string} identifier - Unique identifier
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {string} - Generated cache key
   */
  setWithKey(prefix, identifier, value, ttl = null) {
    const key = `${prefix}:${identifier}`;
    this.set(key, value, ttl);
    return key;
  }

  /**
   * Get cache with automatic key generation
   * @param {string} prefix - Key prefix
   * @param {string} identifier - Unique identifier
   * @returns {*} - Cached value or undefined
   */
  getWithKey(prefix, identifier) {
    const key = `${prefix}:${identifier}`;
    return this.get(key);
  }

  /**
   * Invalidate cache when sales data changes
   * @param {Object} options - Options for invalidation
   * @param {number} options.saleId - Specific sale ID (optional)
   * @param {number} options.customerId - Specific customer ID (optional)
   * @returns {number} - Number of keys invalidated
   */
  invalidateSalesCache(options = {}) {
    const { saleId, customerId } = options;
    
    if (saleId) {
      return this.invalidateDataType('sales', { specificId: saleId });
    } else if (customerId) {
      // Invalidate customer-specific sales cache
      this.invalidatePattern(`sales:customer:${customerId}`);
      return this.invalidateDataType('sales');
    } else {
      return this.invalidateDataType('sales');
    }
  }

  /**
   * Invalidate cache when debts data changes
   * @param {Object} options - Options for invalidation
   * @param {number} options.debtId - Specific debt ID (optional)
   * @param {number} options.customerId - Specific customer ID (optional)
   * @returns {number} - Number of keys invalidated
   */
  invalidateDebtsCache(options = {}) {
    const { debtId, customerId } = options;
    
    if (debtId) {
      return this.invalidateDataType('debts', { specificId: debtId });
    } else if (customerId) {
      // Invalidate customer-specific debts cache
      this.invalidatePattern(`debts:customer:${customerId}`);
      return this.invalidateDataType('debts');
    } else {
      return this.invalidateDataType('debts');
    }
  }

  /**
   * Invalidate cache when installments data changes
   * @param {Object} options - Options for invalidation
   * @param {number} options.installmentId - Specific installment ID (optional)
   * @param {number} options.saleId - Specific sale ID (optional)
   * @param {number} options.customerId - Specific customer ID (optional)
   * @returns {number} - Number of keys invalidated
   */
  invalidateInstallmentsCache(options = {}) {
    const { installmentId, saleId, customerId } = options;
    
    if (installmentId) {
      return this.invalidateDataType('installments', { specificId: installmentId });
    } else if (saleId) {
      // Invalidate sale-specific installments cache
      this.invalidatePattern(`installments:sale:${saleId}`);
      return this.invalidateDataType('installments');
    } else if (customerId) {
      // Invalidate customer-specific installments cache
      this.invalidatePattern(`installments:customer:${customerId}`);
      return this.invalidateDataType('installments');
    } else {
      return this.invalidateDataType('installments');
    }
  }

  /**
   * Invalidate cache when customer data changes
   * @param {Object} options - Options for invalidation
   * @param {number} options.customerId - Specific customer ID (optional)
   * @returns {number} - Number of keys invalidated
   */
  invalidateCustomersCache(options = {}) {
    const { customerId } = options;
    
    if (customerId) {
      return this.invalidateDataType('customers', { specificId: customerId });
    } else {
      return this.invalidateDataType('customers');
    }
  }

  /**
   * Invalidate cache when cash box data changes
   * @param {Object} options - Options for invalidation
   * @param {number} options.cashBoxId - Specific cash box ID (optional)
   * @returns {number} - Number of keys invalidated
   */
  invalidateCashBoxCache(options = {}) {
    const { cashBoxId } = options;
    
    if (cashBoxId) {
      return this.invalidateDataType('cash_box', { specificId: cashBoxId });
    } else {
      return this.invalidateDataType('cash_box');
    }
  }

  /**
   * Invalidate cache when customer receipts data changes
   * @param {Object} options - Options for invalidation
   * @param {number} options.receiptId - Specific receipt ID (optional)
   * @param {number} options.customerId - Specific customer ID (optional)
   * @returns {number} - Number of keys invalidated
   */
  invalidateCustomerReceiptsCache(options = {}) {
    const { receiptId, customerId } = options;
    
    if (receiptId) {
      return this.invalidateDataType('customer_receipts', { specificId: receiptId });
    } else if (customerId) {
      // Invalidate customer-specific receipts cache
      this.invalidatePattern(`customer_receipts:customer:${customerId}`);
      return this.invalidateDataType('customer_receipts');
    } else {
      return this.invalidateDataType('customer_receipts');
    }
  }

  /**
   * Invalidate all related caches when financial data changes
   * This is useful for operations that affect multiple data types
   * @param {Object} options - Options for invalidation
   * @param {Array<string>} options.dataTypes - Specific data types to invalidate
   * @returns {number} - Number of keys invalidated
   */
  invalidateFinancialData(options = {}) {
    const { dataTypes = ['sales', 'debts', 'installments', 'customers', 'cash_box', 'customer_receipts'] } = options;
    
    return this.invalidateMultipleDataTypes(dataTypes, { includeRelated: true });
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService; 