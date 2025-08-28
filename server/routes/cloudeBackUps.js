// cloud back ups routes
const express = require('express');
const router = express.Router();
const {
  createCloudBackup,
  getUserBackups,
  getBackupStats,
  checkServerHealth,
  getLicenseInfo,
  downloadUserBackup,
  restoreFromCloudBackup,
  checkDatabaseAccessibility,
  getDatabaseFileInfo,
  checkFileLocks
} = require('../controllers/cloudeBackupsController');

/**
 * Create a cloud backup and send it to remote server
 * POST /api/cloud-backup/create
 * Body: { userId?, backupName?, description? }
 */
router.post('/create', createCloudBackup);

/**
 * Get user backups from remote server
 * GET /api/cloud-backup/user/:userId?
 */
router.get('/user/:userId?', getUserBackups);

/**
 * Get backup statistics for the current user
 * GET /api/cloud-backup/stats/:userId?
 */
router.get('/stats/:userId?', getBackupStats);

/**
 * Check remote server connectivity
 * GET /api/cloud-backup/health
 */
router.get('/health', checkServerHealth);

/**
 * Get license information for debugging
 * GET /api/cloud-backup/license-info
 */
router.get('/license-info', getLicenseInfo);

/**
 * Download a specific backup by ID
 * GET /api/cloud-backup/download/:backupid
 */
router.get('/download/:backupid', downloadUserBackup);

/**
 * Restore database from a cloud backup
 * POST /api/cloud-backup/restore/:backupid
 */
router.post('/restore/:backupid', restoreFromCloudBackup);

/**
 * Check database accessibility for restoration
 * GET /api/cloud-backup/check-accessibility
 */
router.get('/check-accessibility', checkDatabaseAccessibility);

/**
 * Get detailed database file information for diagnostics
 * GET /api/cloud-backup/file-info
 */
router.get('/file-info', getDatabaseFileInfo);

/**
 * Check for file locks on the database
 * GET /api/cloud-backup/check-locks
 */
router.get('/check-locks', checkFileLocks);

module.exports = router;