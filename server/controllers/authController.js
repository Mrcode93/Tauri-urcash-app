const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const { sendResponse } = require('../utils/response');
const authService = require('../services/authService');
const logger = require('../utils/logger');

class AuthController {
  register = asyncHandler((req, res) => {
    const startTime = logger.performance.start('AUTH_REGISTER', { username: req.body.username });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('AUTH_REGISTER_VALIDATION_ERROR', { 
        errors: errors.array(),
        ip: req.ip 
      });
      return sendResponse(res, 400, null, 'Validation failed', errors.array());
    }

    try {
      const { username, password, name, role } = req.body;
      const user = authService.register({ username, password, name, role });
      
      logger.performance.end('AUTH_REGISTER', startTime, { userId: user.id });
      logger.process.auth.register(user.id, username, req.ip);
      
      sendResponse(res, 201, {user}, 'User registered successfully');
    } catch (err) {
      logger.errorWithContext(err, { operation: 'register', username: req.body.username, ip: req.ip });
      sendResponse(res, 400, null, err.message);
    }
  });

  login = asyncHandler((req, res) => {
    const startTime = logger.performance.start('AUTH_LOGIN', { username: req.body.username });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('AUTH_LOGIN_VALIDATION_ERROR', { 
        errors: errors.array(),
        ip: req.ip 
      });
      return sendResponse(res, 400, null, 'Validation failed', errors.array());
    }

    try {
      const { username, password } = req.body;
      const user = authService.login({ username, password });
      
      logger.performance.end('AUTH_LOGIN', startTime, { userId: user.id });
      logger.process.auth.login(user.id, username, req.ip);
      
      sendResponse(res, 200, {user}, 'User logged in successfully');
    } catch (err) {
      logger.process.auth.failedLogin(req.body.username, req.ip, err.message);
      logger.errorWithContext(err, { operation: 'login', username: req.body.username, ip: req.ip });
      sendResponse(res, 401, null, err.message);
    }
  });

  logout = asyncHandler((req, res) => {
    logger.process.auth.logout(req.user?.id, req.user?.username);
    logger.info('AUTH_LOGOUT_SUCCESS', { userId: req.user?.id, username: req.user?.username });
    sendResponse(res, 200, {}, 'User logged out successfully');
  });

  getUser = asyncHandler((req, res) => {
    try {
      const startTime = logger.performance.start('AUTH_GET_USER', { userId: req.user.id });
      
      const user = authService.getUserById(req.user.id);
      
      logger.performance.end('AUTH_GET_USER', startTime, { found: !!user });
      logger.process.auth.dataAccess(req.user.id, 'user_profile', 'read');
      
      if (!user) {
        logger.warn('AUTH_USER_NOT_FOUND', { userId: req.user.id });
        return sendResponse(res, 404, null, 'User not found');
      }
      sendResponse(res, 200, user, 'User fetched successfully');
    } catch (err) {
      logger.errorWithContext(err, { operation: 'getUser', userId: req.user?.id });
      sendResponse(res, 400, null, err.message);
    }
  });

  updateUser = asyncHandler((req, res) => {
    const startTime = logger.performance.start('AUTH_UPDATE_USER', { userId: req.user.id });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('AUTH_UPDATE_USER_VALIDATION_ERROR', { 
        errors: errors.array(),
        userId: req.user?.id 
      });
      return sendResponse(res, 400, null, 'Validation failed', errors.array());
    }

    try {
      const { username, password, name } = req.body;
      const updated = authService.updateUser(req.user.id, { username, password, name });
      
      logger.performance.end('AUTH_UPDATE_USER', startTime, { userId: req.user.id });
      logger.process.auth.passwordChange(req.user.id, req.user.username);
      
      sendResponse(res, 200, updated, 'User updated successfully');
    } catch (err) {
      logger.errorWithContext(err, { operation: 'updateUser', userId: req.user?.id });
      sendResponse(res, 400, null, err.message);
    }
  });

  // Admin management methods
  getUsers = asyncHandler((req, res) => {
    try {
      const startTime = logger.performance.start('AUTH_GET_USERS', { role: req.query.role });
      
      const { role } = req.query;
      const users = authService.getUsers(role);
      
      logger.performance.end('AUTH_GET_USERS', startTime, { count: users.length });
      logger.process.auth.dataAccess(req.user?.id, 'users', 'read');
      
      sendResponse(res, 200, users, 'Users fetched successfully');
    } catch (err) {
      logger.errorWithContext(err, { operation: 'getUsers', userId: req.user?.id });
      sendResponse(res, 400, null, err.message);
    }
  });

  createUser = asyncHandler((req, res) => {
    const startTime = logger.performance.start('AUTH_CREATE_USER', { 
      username: req.body.username,
      role: req.body.role 
    });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('AUTH_CREATE_USER_VALIDATION_ERROR', { 
        errors: errors.array(),
        adminUserId: req.user?.id 
      });
      return sendResponse(res, 400, null, 'Validation failed', errors.array());
    }

    try {
      const { username, password, name, role, permissions = [] } = req.body;
      const user = authService.createUser({ username, password, name, role, permissions });
      
      logger.performance.end('AUTH_CREATE_USER', startTime, { userId: user.id });
      logger.process.auth.userCreate(user.id, username, role, req.user?.id);
      
      sendResponse(res, 201, user, 'User created successfully');
    } catch (err) {
      logger.errorWithContext(err, { operation: 'createUser', adminUserId: req.user?.id });
      sendResponse(res, 400, null, err.message);
    }
  });

  updateUser = asyncHandler((req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, 400, null, 'Validation failed', errors.array());
    }

    try {
      const { username, password, name, role } = req.body;
      const updated = authService.updateUser(req.params.id, { username, password, name, role });
      if (!updated) {
        return sendResponse(res, 404, null, 'User not found');
      }
      logger.info('User updated successfully', { userId: req.params.id });
      sendResponse(res, 200, updated, 'User updated successfully');
    } catch (err) {
      logger.error('Update user error:', err);
      sendResponse(res, 400, null, err.message);
    }
  });

  deleteUser = asyncHandler((req, res) => {
    try {
      const result = authService.deleteUser(req.params.id);
      if (!result) {
        return sendResponse(res, 404, null, 'User not found');
      }
      logger.info('User deleted successfully', { userId: req.params.id });
      sendResponse(res, 200, null, 'User deleted successfully');
    } catch (err) {
      logger.error('Delete user error:', err);
      sendResponse(res, 400, null, err.message);
    }
  });

  resetDatabase = asyncHandler((req, res) => {
    try {
      authService.resetDatabase();
      logger.info('Database reset successfully', { userId: req.user.id });
      sendResponse(res, 200, null, 'Database reset successfully');
    } catch (err) {
      logger.error('Reset database error:', err);
      sendResponse(res, 500, null, err.message);
    }
  });

  // Permission Management Methods
  getUserPermissions = asyncHandler((req, res) => {
    try {
      const startTime = logger.performance.start('AUTH_GET_USER_PERMISSIONS', { userId: req.params.id || req.user.id });
      
      const userId = req.params.id || req.user.id;
      
      // Use getUserPermissionsWithDetails for the detailed response that the frontend expects
      const permissions = authService.getUserPermissionsWithDetails(userId);
      
      logger.performance.end('AUTH_GET_USER_PERMISSIONS', startTime, { permissionsCount: permissions.allPermissions.length });
      logger.process.auth.dataAccess(req.user?.id, 'user_permissions', 'read');
      
      sendResponse(res, 200, permissions, 'User permissions fetched successfully');
    } catch (err) {
      logger.errorWithContext(err, { operation: 'getUserPermissions', userId: req.user?.id });
      sendResponse(res, 400, null, err.message);
    }
  });

  grantPermission = asyncHandler((req, res) => {
    const startTime = logger.performance.start('AUTH_GRANT_PERMISSION', { 
      targetUserId: req.params.id,
      permissionId: req.body.permission_id 
    });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('AUTH_GRANT_PERMISSION_VALIDATION_ERROR', { 
        errors: errors.array(),
        adminUserId: req.user?.id 
      });
      return sendResponse(res, 400, null, 'Validation failed', errors.array());
    }

    try {
      const { permission_id, expires_at } = req.body;
      const userId = req.params.id;
      
      authService.grantPermission(userId, permission_id, req.user.id, expires_at);
      
      logger.performance.end('AUTH_GRANT_PERMISSION', startTime, { success: true });
      logger.process.auth.permissionGrant(userId, permission_id, req.user?.id);
      
      sendResponse(res, 200, null, 'Permission granted successfully');
    } catch (err) {
      logger.errorWithContext(err, { operation: 'grantPermission', adminUserId: req.user?.id });
      sendResponse(res, 400, null, err.message);
    }
  });

  revokePermission = asyncHandler((req, res) => {
    const startTime = logger.performance.start('AUTH_REVOKE_PERMISSION', { 
      targetUserId: req.params.id,
      permissionId: req.params.permission_id 
    });

    try {
      const { id: userId, permission_id } = req.params;
      
      authService.revokePermission(userId, permission_id, req.user.id);
      
      logger.performance.end('AUTH_REVOKE_PERMISSION', startTime, { success: true });
      logger.process.auth.permissionRevoke(userId, permission_id, req.user?.id);
      
      sendResponse(res, 200, null, 'Permission revoked successfully');
    } catch (err) {
      logger.errorWithContext(err, { operation: 'revokePermission', adminUserId: req.user?.id });
      sendResponse(res, 400, null, err.message);
    }
  });

  revokeRolePermission = asyncHandler((req, res) => {
    const startTime = logger.performance.start('AUTH_REVOKE_ROLE_PERMISSION', { 
      targetUserId: req.params.id,
      permissionId: req.params.permission_id 
    });

    try {
      const { id: userId, permission_id } = req.params;
      
      authService.revokeRolePermission(userId, permission_id, req.user.id);
      
      logger.performance.end('AUTH_REVOKE_ROLE_PERMISSION', startTime, { success: true });
      logger.process.auth.rolePermissionRevoke(userId, permission_id, req.user?.id);
      
      sendResponse(res, 200, null, 'Role permission revoked successfully');
    } catch (err) {
      logger.errorWithContext(err, { operation: 'revokeRolePermission', adminUserId: req.user?.id });
      sendResponse(res, 400, null, err.message);
    }
  });

  getAllPermissions = asyncHandler((req, res) => {
    try {
      const startTime = logger.performance.start('AUTH_GET_ALL_PERMISSIONS');
      
      const permissions = authService.getAllPermissions();
      
      logger.performance.end('AUTH_GET_ALL_PERMISSIONS', startTime, { count: permissions.length });
      logger.process.auth.dataAccess(req.user?.id, 'permissions', 'read');
      
      sendResponse(res, 200, permissions, 'Permissions fetched successfully');
    } catch (err) {
      logger.errorWithContext(err, { operation: 'getAllPermissions', userId: req.user?.id });
      sendResponse(res, 400, null, err.message);
    }
  });

  getPermissionsGroupedByCategory = asyncHandler((req, res) => {
    try {
      const startTime = logger.performance.start('AUTH_GET_PERMISSIONS_GROUPED');
      
      const permissions = authService.getPermissionsGroupedByCategory();
      
      logger.performance.end('AUTH_GET_PERMISSIONS_GROUPED', startTime, { categoriesCount: Object.keys(permissions).length });
      logger.process.auth.dataAccess(req.user?.id, 'permissions', 'read');
      
      sendResponse(res, 200, permissions, 'Permissions grouped by category fetched successfully');
    } catch (err) {
      logger.errorWithContext(err, { operation: 'getPermissionsGroupedByCategory', userId: req.user?.id });
      sendResponse(res, 400, null, err.message);
    }
  });

  getPermissionsByCategory = asyncHandler((req, res) => {
    try {
      const startTime = logger.performance.start('AUTH_GET_PERMISSIONS_BY_CATEGORY', { category: req.params.category });
      
      const { category } = req.params;
      const permissions = authService.getPermissionsByCategory(category);
      
      logger.performance.end('AUTH_GET_PERMISSIONS_BY_CATEGORY', startTime, { count: permissions.length });
      logger.process.auth.dataAccess(req.user?.id, 'permissions', 'read');
      
      sendResponse(res, 200, permissions, 'Permissions fetched successfully');
    } catch (err) {
      logger.errorWithContext(err, { operation: 'getPermissionsByCategory', userId: req.user?.id });
      sendResponse(res, 400, null, err.message);
    }
  });

  getRolePermissions = asyncHandler((req, res) => {
    try {
      const startTime = logger.performance.start('AUTH_GET_ROLE_PERMISSIONS', { role: req.params.role });
      
      const { role } = req.params;
      const permissions = authService.getRolePermissions(role);
      
      logger.performance.end('AUTH_GET_ROLE_PERMISSIONS', startTime, { count: permissions.length });
      logger.process.auth.dataAccess(req.user?.id, 'role_permissions', 'read');
      
      sendResponse(res, 200, permissions, 'Role permissions fetched successfully');
    } catch (err) {
      logger.errorWithContext(err, { operation: 'getRolePermissions', userId: req.user?.id });
      sendResponse(res, 400, null, err.message);
    }
  });

  updateRolePermissions = asyncHandler((req, res) => {
    const startTime = logger.performance.start('AUTH_UPDATE_ROLE_PERMISSIONS', { role: req.params.role });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('AUTH_UPDATE_ROLE_PERMISSIONS_VALIDATION_ERROR', { 
        errors: errors.array(),
        adminUserId: req.user?.id 
      });
      return sendResponse(res, 400, null, 'Validation failed', errors.array());
    }

    try {
      const { role } = req.params;
      const { permission_ids } = req.body;
      
      authService.updateRolePermissions(role, permission_ids);
      
      logger.performance.end('AUTH_UPDATE_ROLE_PERMISSIONS', startTime, { success: true });
      logger.process.auth.rolePermissionUpdate(role, req.user?.id);
      
      sendResponse(res, 200, null, 'Role permissions updated successfully');
    } catch (err) {
      logger.errorWithContext(err, { operation: 'updateRolePermissions', adminUserId: req.user?.id });
      sendResponse(res, 400, null, err.message);
    }
  });

  createPermission = asyncHandler((req, res) => {
    const startTime = logger.performance.start('AUTH_CREATE_PERMISSION', { permissionId: req.body.permission_id });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('AUTH_CREATE_PERMISSION_VALIDATION_ERROR', { 
        errors: errors.array(),
        adminUserId: req.user?.id 
      });
      return sendResponse(res, 400, null, 'Validation failed', errors.array());
    }

    try {
      const { permission_id, name, description, category } = req.body;
      const permission = authService.createPermission({ permission_id, name, description, category });
      
      logger.performance.end('AUTH_CREATE_PERMISSION', startTime, { permissionId: permission.id });
      logger.process.auth.permissionCreate(permission_id, req.user?.id);
      
      sendResponse(res, 201, permission, 'Permission created successfully');
    } catch (err) {
      logger.errorWithContext(err, { operation: 'createPermission', adminUserId: req.user?.id });
      sendResponse(res, 400, null, err.message);
    }
  });

  updatePermission = asyncHandler((req, res) => {
    const startTime = logger.performance.start('AUTH_UPDATE_PERMISSION', { permissionId: req.params.id });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('AUTH_UPDATE_PERMISSION_VALIDATION_ERROR', { 
        errors: errors.array(),
        adminUserId: req.user?.id 
      });
      return sendResponse(res, 400, null, 'Validation failed', errors.array());
    }

    try {
      const { id: permissionId } = req.params;
      const { name, description, category, is_active } = req.body;
      
      const permission = authService.updatePermission(permissionId, { name, description, category, is_active });
      
      logger.performance.end('AUTH_UPDATE_PERMISSION', startTime, { success: true });
      logger.process.auth.permissionUpdate(permissionId, req.user?.id);
      
      sendResponse(res, 200, permission, 'Permission updated successfully');
    } catch (err) {
      logger.errorWithContext(err, { operation: 'updatePermission', adminUserId: req.user?.id });
      sendResponse(res, 400, null, err.message);
    }
  });

  deletePermission = asyncHandler((req, res) => {
    const startTime = logger.performance.start('AUTH_DELETE_PERMISSION', { permissionId: req.params.id });

    try {
      const { id: permissionId } = req.params;
      
      authService.deletePermission(permissionId);
      
      logger.performance.end('AUTH_DELETE_PERMISSION', startTime, { success: true });
      logger.process.auth.permissionDelete(permissionId, req.user?.id);
      
      sendResponse(res, 200, null, 'Permission deleted successfully');
    } catch (err) {
      logger.errorWithContext(err, { operation: 'deletePermission', adminUserId: req.user?.id });
      sendResponse(res, 400, null, err.message);
    }
  });
}

module.exports = new AuthController(); 