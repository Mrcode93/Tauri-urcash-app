const express = require('express');
const router = express.Router();
const {
  createUser,
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  uploadData,
  syncData,
  testConnection,
  testConnectionPublic,
  getSyncStatus,
  getLicenseInfo,
  getUserIdFromLicense,
  getLocalData,
  getDatabaseTables,
  getDataAvailability,
  addUserToCurrentUserData,
  createUploadSchedule,
  getUploadSchedules,
  updateUploadSchedule,
  deleteUploadSchedule,
  executeScheduledUploads,
  getAutoUploadSettings,
  saveAutoUploadSettings,
  uploadDataToRemote
} = require('../controllers/mobile-live-data');
const { protect, requireAdmin } = require('../middleware/authMiddleware');
const { premiumFeatures } = require('../middleware/premiumMiddleware');

// Public routes (no authentication required)
router.get('/test-connection-public', testConnectionPublic); // Public endpoint for testing

// Apply authentication middleware to all routes
router.use(protect);

// Apply premium middleware for mobile live data feature to all routes
router.use(premiumFeatures.mobileLiveData);

// User management routes (admin only)
router.post('/users', protect, requireAdmin, createUser);
router.get('/users', protect, requireAdmin, getAllUsers);
router.get('/users/:userId', protect, requireAdmin, getUser);
router.put('/users/:userId', protect, requireAdmin, updateUser);
router.delete('/users/:userId', protect, requireAdmin, deleteUser);

// add users to current user data can access
router.post('/users/add-user/:userId', protect, requireAdmin, addUserToCurrentUserData);

// Data management routes (admin only)
router.post('/upload', protect, requireAdmin, uploadData);
router.post('/sync/:dataType', protect, requireAdmin, syncData);
router.get('/test-connection', protect, requireAdmin, testConnection);
router.get('/sync-status', protect, requireAdmin, getSyncStatus);
router.get('/license-info', protect, requireAdmin, getLicenseInfo);
router.get('/user-id', protect, requireAdmin, getUserIdFromLicense);
router.get('/local-data/:dataType', protect, requireAdmin, getLocalData);
router.get('/database-tables', protect, requireAdmin, getDatabaseTables);
router.get('/data-availability', protect, requireAdmin, getDataAvailability);

// Remote data upload route (admin only)
router.post('/remote-upload', protect, requireAdmin, uploadDataToRemote);

// Upload Schedule routes (admin only)
router.post('/schedules', protect, requireAdmin, createUploadSchedule);
router.get('/schedules', protect, requireAdmin, getUploadSchedules);
router.put('/schedules/:scheduleId', protect, requireAdmin, updateUploadSchedule);
router.delete('/schedules/:scheduleId', protect, requireAdmin, deleteUploadSchedule);
router.post('/schedules/execute', protect, requireAdmin, executeScheduledUploads);

// Auto Upload Settings routes (admin only)
router.get('/auto-upload-settings', protect, requireAdmin, getAutoUploadSettings);
router.post('/auto-upload-settings', protect, requireAdmin, saveAutoUploadSettings);

module.exports = router; 