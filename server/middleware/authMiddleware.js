const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');
const { sendResponse } = require('../utils/response');
const logger = require('../utils/logger');

const protect = (req, res, next) => {
  try {
    // Starting authentication check
    
    // Get token from header or query parameter (for file:// protocol)
    let token = req.headers.authorization?.split(' ')[1];
    if (!token && req.query.token) {
      token = req.query.token;
    }

    // Token found check

    if (!token) {
      logger.warn('No token provided in request');
      return sendResponse(res, 401, null, 'No token, authorization denied');
    }

    // Verify token
    try {
      // Verifying token
      const decoded = jwt.verify(token, jwtSecret);
      req.user = decoded;
      // Token verified
      next();
    } catch (verifyError) {
      logger.error('Token verification failed:', verifyError);
      return sendResponse(res, 401, null, 'Token is not valid');
    }
  } catch (err) {
    logger.error('Auth middleware error:', err);
    return sendResponse(res, 401, null, 'Authentication failed');
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return sendResponse(res, 401, null, 'Authentication required');
  }
  
  if (req.user.role !== 'admin') {
    logger.warn(`Access denied for user ${req.user.username}: Admin role required`);
    return sendResponse(res, 403, null, 'Access denied. Admin role required.');
  }
  next();
};

module.exports = {
  protect,
  requireAdmin,
  authenticateToken: protect
}; 