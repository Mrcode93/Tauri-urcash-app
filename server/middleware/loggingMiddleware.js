const logger = require('../utils/logger');

/**
 * Middleware to log all HTTP requests and responses
 * Optimized for performance - only logs important events
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  // Only log requests in development or for specific endpoints
  const shouldLog = process.env.NODE_ENV === 'development' || 
                   req.path.includes('/api/auth/') || 
                   req.path.includes('/api/license/') ||
                   req.path.includes('/api/database/');
  


  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    // Only log slow requests (>500ms) or errors
    if (duration > 500 || res.statusCode >= 400) {
      logger.warn('HTTP_SLOW_OR_ERROR_REQUEST', {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userId: req.user?.id
      });
    }

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Middleware to log authentication attempts
 * Optimized to only log failed attempts
 */
const authLogger = (req, res, next) => {
  // Only log authentication attempts for login/register
  if (req.path.includes('/auth/login') || req.path.includes('/auth/register')) {
    // Store original send to intercept response
    const originalSend = res.json;
    res.json = function(data) {
      // Only log failed authentication attempts
      if (data && !data.success) {
        logger.process.auth.attempt(req.body?.username, req.ip, req.path);
      }
      return originalSend.call(this, data);
    };
  }
  
  next();
};

/**
 * Middleware to log security events
 * Optimized to reduce false positives
 */
const securityLogger = (req, res, next) => {
  // Only log actual security threats, not routine requests
  if (req.path.includes('/admin') && !req.user && req.method !== 'OPTIONS') {
    logger.security.unauthorized('admin_access', req.ip, null);
  }
  
  // Store original end to intercept response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    // Only log security events after the request is processed
    // This allows authentication middleware to run first
    if (req.path.includes('/api/') && req.method === 'POST' && 
        !req.path.includes('/auth/') && !req.path.includes('/license/') &&
        res.statusCode === 401) {
      // Only log if the request was actually unauthorized (401 status)
      // And only for endpoints that should require authentication
      const sensitiveEndpoints = [
        '/api/inventory/',
        '/api/products/',
        '/api/sales/',
        '/api/purchases/',
        '/api/customers/',
        '/api/suppliers/',
        '/api/cash-box/',
        '/api/debts/',
        '/api/installments/',
        '/api/reports/',
        '/api/settings/',
        '/api/users/',
        '/api/database/',
        '/api/backup/',
        '/api/stock-movements/',
        '/api/stocks/',
        '/api/bills/',
        '/api/money-boxes/'
      ];
      
      const isSensitiveEndpoint = sensitiveEndpoints.some(endpoint => 
        req.path.startsWith(endpoint)
      );
      
      if (isSensitiveEndpoint) {
        logger.security.suspicious('unauthenticated_post', {
          path: req.path,
          ip: req.ip,
          statusCode: res.statusCode
        }, req.ip);
      }
    }
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

/**
 * Middleware to log database operations
 * Optimized to only log significant operations
 */
const databaseLogger = (req, res, next) => {
  // Only log database backup/restore operations
  if (req.path.includes('/database/backup') || req.path.includes('/database/restore')) {
    logger.process.system.database('access', {
      path: req.path,
      method: req.method,
      userId: req.user?.id
    });
  }
  
  next();
};

module.exports = {
  requestLogger,
  authLogger,
  securityLogger,
  databaseLogger
}; 