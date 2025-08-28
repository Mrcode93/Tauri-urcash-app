// Enhanced logger with structured logging for important processes
const fs = require('fs');
const path = require('path');
const os = require('os');

// Create logs directory
const APP_DATA_DIR = path.join(os.homedir(), '.urcash');
const LOGS_DIR = path.join(APP_DATA_DIR, 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Log level configuration for performance optimization
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Get log level from environment variable, default to INFO for production
let CURRENT_LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

// Helper function to check if a log level should be output
const shouldLog = (level) => {
  const currentLevel = global.CURRENT_LOG_LEVEL !== undefined ? global.CURRENT_LOG_LEVEL : CURRENT_LOG_LEVEL;
  return LOG_LEVELS[level] <= currentLevel;
};

// Helper function to safely stringify objects with circular references
const safeStringify = (obj) => {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }
    return value;
  });
};

// Helper function to sanitize data for logging
const sanitizeData = (data) => {
  if (!data) return data;
  
  // If data is an array, sanitize each item
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }
  
  // If data is an object, sanitize it
  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip circular references and complex objects
      if (value && typeof value === 'object') {
        if (value.constructor && value.constructor.name === 'Socket') {
          sanitized[key] = '[Socket Object]';
        } else if (value.constructor && value.constructor.name === 'HTTPParser') {
          sanitized[key] = '[HTTPParser Object]';
        } else if (value.constructor && value.constructor.name === 'IncomingMessage') {
          sanitized[key] = '[Request Object]';
        } else if (value.constructor && value.constructor.name === 'ServerResponse') {
          sanitized[key] = '[Response Object]';
        } else {
          sanitized[key] = sanitizeData(value);
        }
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  
  return data;
};

// Helper function to write to log file (only for ERROR and WARN levels for performance)
const writeToLogFile = (level, message, data) => {
  // Only write to file for ERROR and WARN levels to improve performance
  if (level !== 'ERROR' && level !== 'WARN') {
    return;
  }
  
  const timestamp = new Date().toISOString();
  const date = timestamp.split('T')[0];
  const logFile = path.join(LOGS_DIR, `app-${date}.log`);
  
  const logEntry = {
    timestamp,
    level,
    message,
    data: sanitizeData(data),
    pid: process.pid
  };
  
  try {
    const logLine = safeStringify(logEntry) + '\n';
    fs.appendFileSync(logFile, logLine);
  } catch (error) {
    console.error('Failed to write to log file:', error);
    // Fallback to simple logging
    const fallbackEntry = {
      timestamp,
      level,
      message,
      data: '[Error serializing data]',
      pid: process.pid
    };
    fs.appendFileSync(logFile, JSON.stringify(fallbackEntry) + '\n');
  }
};

const logger = {
  // Basic logging methods
  info: (...args) => {
    if (!shouldLog('INFO')) return;
    const message = args[0];
    const data = args.slice(1);
    console.log(new Date().toISOString(), 'INFO:', ...args);
    writeToLogFile('INFO', message, data);
  },
  success: (...args) => {
    if (!shouldLog('INFO')) return;
    const message = args[0];
    const data = args.slice(1);
    console.log(new Date().toISOString(), 'SUCCESS:', ...args);
    writeToLogFile('SUCCESS', message, data);
  },
  error: (...args) => {
    if (!shouldLog('ERROR')) return;
    const message = args[0];
    const data = args.slice(1);
    console.log(new Date().toISOString(), 'ERROR:', ...args);
    writeToLogFile('ERROR', message, data);
  },
  warn: (...args) => {
    if (!shouldLog('WARN')) return;
    const message = args[0];
    const data = args.slice(1);
    console.log(new Date().toISOString(), 'WARN:', ...args);
    writeToLogFile('WARN', message, data);
  },
  debug: (...args) => {
    if (!shouldLog('DEBUG')) return;
    const message = args[0];
    const data = args.slice(1);
    console.log(new Date().toISOString(), 'DEBUG:', ...args);
    // Don't write DEBUG logs to file for performance
  },
  
  // Process-specific logging methods
  process: {
    // Authentication & Authorization
    auth: {
      login: (userId, username, ip) => logger.info('AUTH_LOGIN', { userId, username, ip }),
      logout: (userId, username) => logger.info('AUTH_LOGOUT', { userId, username }),
      failedLogin: (username, ip, reason) => logger.warn('AUTH_FAILED_LOGIN', { username, ip, reason }),
      passwordChange: (userId, username) => logger.info('AUTH_PASSWORD_CHANGE', { userId, username }),
      sessionExpired: (userId, username) => logger.warn('AUTH_SESSION_EXPIRED', { userId, username }),
      attempt: (username, ip, path) => logger.info('AUTH_ATTEMPT', { username, ip, path }),
      register: (userId, username, ip) => logger.info('AUTH_REGISTER', { userId, username, ip }),
      userCreate: (userId, username, role, adminUserId) => logger.info('AUTH_USER_CREATE', { userId, username, role, adminUserId }),
      permissionGrant: (userId, permissionId, adminUserId) => logger.info('AUTH_PERMISSION_GRANT', { userId, permissionId, adminUserId }),
      permissionRevoke: (userId, permissionId, adminUserId) => logger.info('AUTH_PERMISSION_REVOKE', { userId, permissionId, adminUserId }),
      rolePermissionRevoke: (userId, permissionId, adminUserId) => logger.info('AUTH_ROLE_PERMISSION_REVOKE', { userId, permissionId, adminUserId }),
      rolePermissionUpdate: (role, adminUserId) => logger.info('AUTH_ROLE_PERMISSION_UPDATE', { role, adminUserId }),
      permissionCreate: (permissionId, adminUserId) => logger.info('AUTH_PERMISSION_CREATE', { permissionId, adminUserId }),
      permissionUpdate: (permissionId, adminUserId) => logger.info('AUTH_PERMISSION_UPDATE', { permissionId, adminUserId }),
      permissionDelete: (permissionId, adminUserId) => logger.info('AUTH_PERMISSION_DELETE', { permissionId, adminUserId }),
      dataAccess: (userId, dataType, action) => logger.info('AUTH_DATA_ACCESS', { userId, dataType, action })
    },
    
    // Sales Operations
    sales: {
      create: (saleId, customerId, totalAmount, itemsCount, userId) => 
        logger.info('SALES_CREATE', { saleId, customerId, totalAmount, itemsCount, userId }),
      update: (saleId, changes, userId) => 
        logger.info('SALES_UPDATE', { saleId, changes, userId }),
      delete: (saleId, reason, userId) => 
        logger.warn('SALES_DELETE', { saleId, reason, userId }),
      return: (saleId, returnAmount, itemsCount, userId) => 
        logger.info('SALES_RETURN', { saleId, returnAmount, itemsCount, userId }),
      payment: (saleId, amount, method, userId) => 
        logger.info('SALES_PAYMENT', { saleId, amount, method, userId }),
      dataAccess: (userId, dataType, action) => 
        logger.info('SALES_DATA_ACCESS', { userId, dataType, action })
    },
    
    // Inventory Operations
    inventory: {
      productCreate: (productId, name, stock, supplierId, userId) => 
        logger.info('INVENTORY_PRODUCT_CREATE', { productId, name, stock, supplierId, userId }),
      productUpdate: (productId, changes, userId) => 
        logger.info('INVENTORY_PRODUCT_UPDATE', { productId, changes, userId }),
      productDelete: (productId, name, reason, userId) => 
        logger.warn('INVENTORY_PRODUCT_DELETE', { productId, name, reason, userId }),
      stockAdjustment: (productId, adjustment, newStock, userId) => 
        logger.info('INVENTORY_STOCK_ADJUSTMENT', { productId, adjustment, newStock, userId }),
      movement: (productId, movementType, quantity, userId) => 
        logger.info('INVENTORY_MOVEMENT', { productId, movementType, quantity, userId }),
              dataAccess: (userId, dataType, action) => {
          // Inventory data access logged
        }
    },
    
    // Customer Operations
    customers: {
      create: (customerId, name, phone, userId) => 
        logger.info('CUSTOMERS_CREATE', { customerId, name, phone, userId }),
      update: (customerId, changes, userId) => 
        logger.info('CUSTOMERS_UPDATE', { customerId, changes, userId }),
      delete: (customerId, name, reason, userId) => 
        logger.warn('CUSTOMERS_DELETE', { customerId, name, reason, userId }),
      debt: (customerId, amount, type, userId) => 
        logger.info('CUSTOMERS_DEBT', { customerId, amount, type, userId }),
      dataAccess: (userId, dataType, action) => 
        logger.info('CUSTOMERS_DATA_ACCESS', { userId, dataType, action })
    },
    
    // Supplier Operations
    suppliers: {
      create: (supplierId, name, phone, userId) => 
        logger.info('SUPPLIERS_CREATE', { supplierId, name, phone, userId }),
      update: (supplierId, changes, userId) => 
        logger.info('SUPPLIERS_UPDATE', { supplierId, changes, userId }),
      delete: (supplierId, name, reason, userId) => 
        logger.warn('SUPPLIERS_DELETE', { supplierId, name, reason, userId }),
      payment: (supplierId, amount, method, userId) => 
        logger.info('SUPPLIERS_PAYMENT', { supplierId, amount, method, userId }),
      dataAccess: (userId, dataType, action) => 
        logger.info('SUPPLIERS_DATA_ACCESS', { userId, dataType, action })
    },
    
    // Purchase Operations
    purchases: {
      create: (purchaseId, supplierId, totalAmount, itemsCount, userId) => 
        logger.info('PURCHASES_CREATE', { purchaseId, supplierId, totalAmount, itemsCount, userId }),
      update: (purchaseId, changes, userId) => 
        logger.info('PURCHASES_UPDATE', { purchaseId, changes, userId }),
      delete: (purchaseId, reason, userId) => 
        logger.warn('PURCHASES_DELETE', { purchaseId, reason, userId }),
      payment: (purchaseId, amount, method, userId) => 
        logger.info('PURCHASES_PAYMENT', { purchaseId, amount, method, userId }),
      dataAccess: (userId, dataType, action) => 
        logger.info('PURCHASES_DATA_ACCESS', { userId, dataType, action })
    },
    
    // Cash Box Operations
    cashBox: {
      open: (cashBoxId, amount, userId) => 
        logger.info('CASHBOX_OPEN', { cashBoxId, amount, userId }),
      close: (cashBoxId, amount, userId) => 
        logger.info('CASHBOX_CLOSE', { cashBoxId, amount, userId }),
      transaction: (cashBoxId, type, amount, reason, userId) => 
        logger.info('CASHBOX_TRANSACTION', { cashBoxId, type, amount, reason, userId }),
      adjustment: (cashBoxId, adjustment, reason, userId) => 
        logger.info('CASHBOX_ADJUSTMENT', { cashBoxId, adjustment, reason, userId }),
      dataAccess: (userId, dataType, action) => 
        logger.info('CASHBOX_DATA_ACCESS', { userId, dataType, action })
    },
    
    // Financial Operations
    financial: {
      expense: (expenseId, amount, category, userId) => 
        logger.info('FINANCIAL_EXPENSE', { expenseId, amount, category, userId }),
      debt: (debtId, customerId, amount, type, userId) => 
        logger.info('FINANCIAL_DEBT', { debtId, customerId, amount, type, userId }),
      installment: (installmentId, debtId, amount, userId) => 
        logger.info('FINANCIAL_INSTALLMENT', { installmentId, debtId, amount, userId }),
      receipt: (receiptId, type, amount, userId) => 
        logger.info('FINANCIAL_RECEIPT', { receiptId, type, amount, userId }),
      dataAccess: (userId, dataType, action) => 
        logger.info('FINANCIAL_DATA_ACCESS', { userId, dataType, action })
    },
    
    // System Operations
    system: {
      backup: (backupId, size, location, userId) => 
        logger.info('SYSTEM_BACKUP', { backupId, size, location, userId }),
      restore: (backupId, userId) => 
        logger.warn('SYSTEM_RESTORE', { backupId, userId }),
      settings: (changes, userId) => 
        logger.info('SYSTEM_SETTINGS', { changes, userId }),
      license: (action, details, userId) => 
        logger.info('SYSTEM_LICENSE', { action, details, userId }),
      database: (action, details, userId) => 
        logger.info('SYSTEM_DATABASE', { action, details, userId }),
      dataAccess: (userId, dataType, action) => 
        logger.info('SYSTEM_DATA_ACCESS', { userId, dataType, action })
    },
    
    // Device Operations
    devices: {
      connect: (deviceId, type, userId) => 
        logger.info('DEVICES_CONNECT', { deviceId, type, userId }),
      disconnect: (deviceId, reason, userId) => 
        logger.warn('DEVICES_DISCONNECT', { deviceId, reason, userId }),
      print: (deviceId, documentType, userId) => 
        logger.info('DEVICES_PRINT', { deviceId, documentType, userId }),
      scan: (deviceId, documentType, userId) => 
        logger.info('DEVICES_SCAN', { deviceId, documentType, userId }),
      dataAccess: (userId, dataType, action) => 
        logger.info('DEVICES_DATA_ACCESS', { userId, dataType, action })
    },
    
    // Reports Operations
    reports: {
      generate: (reportType, period, userId) => 
        logger.info('REPORTS_GENERATE', { reportType, period, userId }),
      export: (reportType, format, userId) => 
        logger.info('REPORTS_EXPORT', { reportType, format, userId }),
      print: (reportType, userId) => 
        logger.info('REPORTS_PRINT', { reportType, userId }),
      dataAccess: (userId, dataType, action) => 
        logger.info('REPORTS_DATA_ACCESS', { userId, dataType, action })
    }
  },
  
  // Error logging with context
  errorWithContext: (error, context) => {
    logger.error('ERROR_WITH_CONTEXT', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      context
    });
  },
  
  // Performance logging
  performance: {
    start: (operation, params) => {
      const startTime = Date.now();
      logger.debug('PERFORMANCE_START', { operation, params, startTime });
      return startTime;
    },
    end: (operation, startTime, result) => {
      const duration = Date.now() - startTime;
      logger.debug('PERFORMANCE_END', { operation, duration, result });
      return duration;
    }
  },

  // Get current log level
  getLogLevel: () => {
    const levelNames = Object.keys(LOG_LEVELS);
    return levelNames.find(level => LOG_LEVELS[level] === CURRENT_LOG_LEVEL) || 'INFO';
  },

  // Set log level (for runtime configuration)
  setLogLevel: (level) => {
    const upperLevel = level?.toUpperCase();
    if (LOG_LEVELS.hasOwnProperty(upperLevel)) {
      global.CURRENT_LOG_LEVEL = LOG_LEVELS[upperLevel];
      console.log(`Log level changed to: ${upperLevel}`);
    } else {
      console.warn(`Invalid log level: ${level}. Valid levels: ${Object.keys(LOG_LEVELS).join(', ')}`);
    }
  },
  
  // Security logging
  security: {
    unauthorized: (action, ip, userId) => 
      logger.warn('SECURITY_UNAUTHORIZED', { action, ip, userId }),
    suspicious: (action, details, ip) => 
      logger.warn('SECURITY_SUSPICIOUS', { action, details, ip }),
    dataAccess: (userId, dataType, action) => 
      logger.info('SECURITY_DATA_ACCESS', { userId, dataType, action })
  }
};

module.exports = logger;