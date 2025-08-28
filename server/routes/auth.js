const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');
const { requirePermission, addUserPermissions } = require('../middleware/permissionMiddleware');

const router = express.Router();

// Public routes
router.post('/register', [
  body('username').isString().notEmpty(),
  body('password').isLength({ min: 6 }),
  body('name').isString().notEmpty(),
  body('role').optional().isIn(['admin', 'user', 'manager']),
], authController.register);

router.post('/login', [
  body('username').isString().notEmpty(),
  body('password').exists(),
], authController.login);

// Protected routes
router.get('/logout', protect, authController.logout);
router.get('/user', protect, authController.getUser);
router.put('/user', protect, authController.updateUser);

// Admin management routes
router.get('/users', protect, requireAdmin, authController.getUsers);
router.post('/users', protect, requireAdmin, [
  body('username').isString().notEmpty().isLength({ min: 3 }),
  body('password').isLength({ min: 6 }),
  body('name').isString().notEmpty().isLength({ min: 2 }),
  body('role').isIn(['admin', 'user', 'manager']),
], authController.createUser);

router.put('/users/:id', protect, requireAdmin, [
  body('username').optional().isString().isLength({ min: 3 }),
  body('name').optional().isString().isLength({ min: 2 }),
  body('role').optional().isIn(['admin', 'user', 'manager']),
], authController.updateUser);

router.delete('/users/:id', protect, requireAdmin, authController.deleteUser);

// Database management route
router.delete('/database/reset', protect, requireAdmin, authController.resetDatabase);

// Permission management routes
router.get('/permissions', protect, requirePermission('users.permissions'), authController.getAllPermissions);
router.get('/permissions/grouped', protect, requirePermission('users.permissions'), authController.getPermissionsGroupedByCategory);
router.get('/permissions/category/:category', protect, requirePermission('users.permissions'), authController.getPermissionsByCategory);
router.get('/permissions/role/:role', protect, requirePermission('users.permissions'), authController.getRolePermissions);
router.put('/permissions/role/:role', protect, requirePermission('users.permissions'), [
  body('permission_ids').isArray().notEmpty(),
], authController.updateRolePermissions);

// User permission management routes
router.get('/users/:id/permissions', protect, requirePermission('users.permissions'), authController.getUserPermissions);
router.get('/user/permissions', protect, addUserPermissions(), authController.getUserPermissions);
router.post('/users/:id/permissions', protect, requirePermission('users.permissions'), [
  body('permission_id').isString().notEmpty(),
  body('expires_at').optional().isISO8601(),
], authController.grantPermission);
router.delete('/users/:id/permissions/:permission_id', protect, requirePermission('users.permissions'), authController.revokePermission);

// Role permission management routes
router.delete('/users/:id/role-permissions/:permission_id', protect, requirePermission('users.permissions'), authController.revokeRolePermission);

// Permission CRUD routes
router.post('/permissions', protect, requirePermission('users.permissions'), [
  body('permission_id').isString().notEmpty().matches(/^[a-z]+\.[a-z]+$/),
  body('name').isString().notEmpty(),
  body('description').optional().isString(),
  body('category').isString().notEmpty(),
], authController.createPermission);

router.put('/permissions/:id', protect, requirePermission('users.permissions'), [
  body('name').optional().isString().notEmpty(),
  body('description').optional().isString(),
  body('category').optional().isString().notEmpty(),
  body('is_active').optional().isBoolean(),
], authController.updatePermission);

router.delete('/permissions/:id', protect, requirePermission('users.permissions'), authController.deletePermission);

module.exports = router; 