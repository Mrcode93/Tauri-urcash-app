const cloudBackupsService = require('../services/cloudBackupsService');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const { setTimeout } = require('timers/promises');

// Constants
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;
const BUSY_ERROR_CODES = ['EBUSY', 'EPERM', 'EACCES'];

/**
 * Create a cloud backup and send it to remote server
 * POST /api/cloud-backup/create
 */
const createCloudBackup = async (req, res) => {
  try {
    const { userId, backupName, description } = req.body;

    const result = await cloudBackupsService.createCloudBackup({
      backupName,
      description,
      userId
    });

    res.status(200).json({
      success: true,
      message: 'Cloud backup created successfully',
      data: result.data
    });

  } catch (error) {
    logger.error('Error creating cloud backup:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create cloud backup',
      errorCode: error.code
    });
  }
};

/**
 * Get user backups from remote server
 * GET /api/cloud-backup/user/:userId?
 */
const getUserBackups = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await cloudBackupsService.getUserBackups(userId);

    res.status(200).json({
      success: true,
      message: 'User backups retrieved successfully',
      data: result.data
    });

  } catch (error) {
    logger.error('Error retrieving user backups:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve user backups',
      errorCode: error.code
    });
  }
};

/**
 * Get backup statistics for the current user
 * GET /api/cloud-backup/stats/:userId?
 */
const getBackupStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const stats = await cloudBackupsService.getBackupStats(userId);

    res.status(200).json({
      success: true,
      message: 'Backup statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    logger.error('Error retrieving backup stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve backup statistics',
      errorCode: error.code
    });
  }
};

/**
 * Check remote server connectivity
 * GET /api/cloud-backup/health
 */
const checkServerHealth = async (req, res) => {
  try {
    const isConnected = await cloudBackupsService.checkServerConnectivity();

    res.status(200).json({
      success: true,
      message: 'Server health check completed',
      data: {
        connected: isConnected,
        serverUrl: cloudBackupsService.remoteServerUrl
      }
    });

  } catch (error) {
    logger.error('Error checking server health:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check server health',
      errorCode: error.code
    });
  }
};

/**
 * Get license information for debugging
 * GET /api/cloud-backup/license-info
 */
const getLicenseInfo = async (req, res) => {
  try {
    const licenseInfo = await cloudBackupsService.getLicenseInfo();

    res.status(200).json({
      success: true,
      message: 'License information retrieved successfully',
      data: licenseInfo
    });

  } catch (error) {
    logger.error('Error retrieving license info:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve license information',
      errorCode: error.code
    });
  }
};

/**
 * Download a specific backup by ID
 * GET /api/cloud-backup/download/:backupid
 */
const downloadUserBackup = async (req, res) => {
  try {
    const { backupid } = req.params;

    if (!backupid) {
      return res.status(400).json({
        success: false,
        message: 'Backup ID is required'
      });
    }

    const result = await cloudBackupsService.downloadBackup(backupid);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message || 'Backup not found'
      });
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.fileSize);

    res.send(result.fileData);

  } catch (error) {
    logger.error('Error downloading backup:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to download backup',
      errorCode: error.code
    });
  }
};

/**
 * Attempt to restore database with retry logic
 */
const attemptDatabaseRestoration = async (fileData, backupId) => {
  let retries = MAX_RETRY_ATTEMPTS;
  let lastError;

  while (retries > 0) {
    try {
      const restoreResult = await cloudBackupsService.restoreDatabase(fileData);
      
      if (!restoreResult.success) {
        throw new Error(restoreResult.message || 'Failed to restore database');
      }

      return restoreResult;
    } catch (error) {
      lastError = error;
      retries--;

      if (BUSY_ERROR_CODES.includes(error.code) && retries > 0) {
        logger.warn(`Database busy (attempt ${MAX_RETRY_ATTEMPTS - retries}/${MAX_RETRY_ATTEMPTS}), retrying...`, {
          backupId,
          error: error.message,
          code: error.code
        });
        await setTimeout(RETRY_DELAY_MS);
      } else {
        throw error;
      }
    }
  }

  throw lastError;
};

/**
 * Restore database from a cloud backup
 * POST /api/cloud-backup/restore/:backupid
 */
const restoreFromCloudBackup = async (req, res) => {
  const { backupid } = req.params;

  if (!backupid) {
    return res.status(400).json({
      success: false,
      message: 'Backup ID is required'
    });
  }

  logger.info('Starting cloud backup restoration', { backupId: backupid });

  try {
    // Check database accessibility before proceeding
    const accessibilityCheck = await cloudBackupsService.checkDatabaseAccessibility();
    if (!accessibilityCheck.accessible) {
      return res.status(400).json({
        success: false,
        message: accessibilityCheck.message,
        errorType: 'DATABASE_LOCKED',
        remediation: 'Please close the application completely and try again. If the problem persists, restart your computer.'
      });
    }

    const result = await cloudBackupsService.downloadBackup(backupid);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message || 'Backup not found'
      });
    }

    const restoreResult = await attemptDatabaseRestoration(result.fileData, backupid);

    logger.info('Cloud backup restoration prepared successfully', { 
      backupId: backupid,
      filename: result.filename,
      size: result.fileSize
    });

    res.json({
      success: true,
      message: 'Database restoration prepared successfully. Please restart the application to complete the restoration.',
      data: {
        backupId: backupid,
        filename: result.filename,
        restoredAt: new Date().toISOString(),
        size: result.fileSize,
        instructions: restoreResult.data?.instructions || [
          '1. Close the application completely',
          '2. Replace the database file manually',
          '3. Restart the application'
        ],
        newDatabasePath: restoreResult.data?.newDatabasePath,
        currentBackupPath: restoreResult.data?.currentBackupPath
      }
    });

  } catch (error) {
    logger.error('Error restoring from cloud backup:', {
      backupId: backupid,
      error: error.message,
      stack: error.stack,
      code: error.code
    });

    const response = {
      success: false,
      message: error.message || 'Failed to restore from cloud backup',
      errorCode: error.code
    };

    // Provide specific guidance for common error types
    if (BUSY_ERROR_CODES.includes(error.code)) {
      response.message = 'Database file is locked and cannot be replaced.';
      response.remediation = 'Please close the application completely and try again. If the problem persists, restart your computer.';
      response.errorType = 'FILE_LOCKED';
    } else if (error.message.includes('Invalid SQLite database')) {
      response.message = 'The backup file appears to be corrupted or invalid.';
      response.remediation = 'Please try downloading the backup again or contact support.';
      response.errorType = 'INVALID_BACKUP';
    } else if (error.message.includes('Failed to delete database file')) {
      response.message = 'Unable to replace the current database file.';
      response.remediation = 'Please ensure no other applications are using the database and try again.';
      response.errorType = 'FILE_ACCESS_DENIED';
    }

    res.status(500).json(response);
  }
};

/**
 * Check database accessibility for restoration
 * GET /api/cloud-backup/check-accessibility
 */
const checkDatabaseAccessibility = async (req, res) => {
  try {
    const accessibilityCheck = await cloudBackupsService.checkDatabaseAccessibility();

    res.status(200).json({
      success: true,
      message: 'Database accessibility check completed',
      data: accessibilityCheck
    });

  } catch (error) {
    logger.error('Error checking database accessibility:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check database accessibility',
      errorCode: error.code
    });
  }
};

/**
 * Get detailed database file information for diagnostics
 * GET /api/cloud-backup/file-info
 */
const getDatabaseFileInfo = async (req, res) => {
  try {
    const fileInfo = await cloudBackupsService.getDatabaseFileInfo();

    res.status(200).json({
      success: true,
      message: 'Database file information retrieved successfully',
      data: fileInfo
    });

  } catch (error) {
    logger.error('Error getting database file info:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get database file information',
      errorCode: error.code
    });
  }
};

/**
 * Check for file locks on the database
 * GET /api/cloud-backup/check-locks
 */
const checkFileLocks = async (req, res) => {
  try {
    const lockInfo = await cloudBackupsService.checkFileLocks();

    res.status(200).json({
      success: true,
      message: 'File lock check completed',
      data: lockInfo
    });

  } catch (error) {
    logger.error('Error checking file locks:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check file locks',
      errorCode: error.code
    });
  }
};

module.exports = {
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
};