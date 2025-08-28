const { sendResponse } = require('../utils/response');
const authService = require('../services/authService');
const logger = require('../utils/logger');

/**
 * Middleware to check if user has a specific permission
 * @param {string} permissionId - The permission ID to check
 * @returns {Function} Express middleware function
 */
const requirePermission = (permissionId) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        logger.warn('Permission check failed: No user in request');
        return sendResponse(res, 401, null, 'Authentication required');
      }

      const hasPermission = authService.hasPermission(req.user.id, permissionId);
      
      if (!hasPermission) {
        logger.warn(`Permission denied: User ${req.user.id} (${req.user.username}) lacks permission ${permissionId}`);
        return sendResponse(res, 403, null, `Access denied. Permission '${permissionId}' required.`);
      }

      // Permission granted
      next();
    } catch (error) {
      logger.error('Permission middleware error:', error);
      return sendResponse(res, 500, null, 'Permission check failed');
    }
  };
};

/**
 * Middleware to check if user has any of the specified permissions
 * @param {string[]} permissionIds - Array of permission IDs to check
 * @returns {Function} Express middleware function
 */
const requireAnyPermission = (permissionIds) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        logger.warn('Permission check failed: No user in request');
        return sendResponse(res, 401, null, 'Authentication required');
      }

      const userPermissions = authService.getUserPermissions(req.user.id);
      const hasAnyPermission = permissionIds.some(permissionId => 
        userPermissions.includes(permissionId)
      );
      
      if (!hasAnyPermission) {
        logger.warn(`Permission denied: User ${req.user.id} (${req.user.username}) lacks any of permissions: ${permissionIds.join(', ')}`);
        return sendResponse(res, 403, null, `Access denied. One of permissions required: ${permissionIds.join(', ')}`);
      }

      // Permission granted
      next();
    } catch (error) {
      logger.error('Permission middleware error:', error);
      return sendResponse(res, 500, null, 'Permission check failed');
    }
  };
};

/**
 * Middleware to check if user has all of the specified permissions
 * @param {string[]} permissionIds - Array of permission IDs to check
 * @returns {Function} Express middleware function
 */
const requireAllPermissions = (permissionIds) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        logger.warn('Permission check failed: No user in request');
        return sendResponse(res, 401, null, 'Authentication required');
      }

      const userPermissions = authService.getUserPermissions(req.user.id);
      const hasAllPermissions = permissionIds.every(permissionId => 
        userPermissions.includes(permissionId)
      );
      
      if (!hasAllPermissions) {
        const missingPermissions = permissionIds.filter(permissionId => 
          !userPermissions.includes(permissionId)
        );
        logger.warn(`Permission denied: User ${req.user.id} (${req.user.username}) lacks permissions: ${missingPermissions.join(', ')}`);
        return sendResponse(res, 403, null, `Access denied. All permissions required: ${permissionIds.join(', ')}`);
      }

      // Permission granted
      next();
    } catch (error) {
      logger.error('Permission middleware error:', error);
      return sendResponse(res, 500, null, 'Permission check failed');
    }
  };
};

/**
 * Middleware to check if user has permission for a specific resource
 * @param {string} permissionId - The permission ID to check
 * @param {Function} resourceOwnerCheck - Function to check if user owns the resource
 * @returns {Function} Express middleware function
 */
const requirePermissionOrOwnership = (permissionId, resourceOwnerCheck) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        logger.warn('Permission check failed: No user in request');
        return sendResponse(res, 401, null, 'Authentication required');
      }

      // Check if user has the permission
      const hasPermission = authService.hasPermission(req.user.id, permissionId);
      
      if (hasPermission) {
        // Permission granted
        return next();
      }

      // Check if user owns the resource
      if (resourceOwnerCheck && resourceOwnerCheck(req)) {
        // Ownership granted
        return next();
      }

      logger.warn(`Access denied: User ${req.user.id} (${req.user.username}) lacks permission ${permissionId} and doesn't own the resource`);
      return sendResponse(res, 403, null, `Access denied. Permission '${permissionId}' required or resource ownership.`);
    } catch (error) {
      logger.error('Permission middleware error:', error);
      return sendResponse(res, 500, null, 'Permission check failed');
    }
  };
};

/**
 * Middleware to add user permissions to request object
 * @returns {Function} Express middleware function
 */
const addUserPermissions = () => {
  return (req, res, next) => {
    try {
      // Starting middleware
      
      if (!req.user || !req.user.id) {
        // No user or user ID, skipping
        return next();
      }

      // Getting permissions for user
      const permissions = authService.getUserPermissionsWithDetails(req.user.id);
      
      req.userPermissions = permissions;
      
      // Add helper methods to req.user
      req.user.hasPermission = (permissionId) => permissions.includes(permissionId);
      req.user.hasAnyPermission = (permissionIds) => permissionIds.some(id => permissions.includes(id));
      req.user.hasAllPermissions = (permissionIds) => permissionIds.every(id => permissions.includes(id));
      
      // Middleware completed
      next();
    } catch (error) {
      logger.error('Add user permissions middleware error:', error);
      next();
    }
  };
};

module.exports = {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requirePermissionOrOwnership,
  addUserPermissions
}; 