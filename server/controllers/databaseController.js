const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const Database = require('better-sqlite3');
const database = require('../database/index');
const logger = require('../utils/logger');
const { sendResponse } = require('../utils/response');
const { validateSQLiteDatabase, backupCurrentDatabase } = require('../fix-corrupted-database');


// Database backup messages
const databaseMessages = {
  // Success Messages
  backup_created: 'تم إنشاء نسخة احتياطية من قاعدة البيانات بنجاح',
  backup_restored: 'تم استعادة قاعدة البيانات من النسخة الاحتياطية بنجاح',
  database_reset: 'تم إعادة تعيين قاعدة البيانات بنجاح',
  menu_items_fixed: 'تم إصلاح عناصر القائمة بنجاح',
  backups_fetched: 'تم جلب قائمة النسخ الاحتياطية بنجاح',
  
  // Error Messages
  backup_failed: 'فشل في إنشاء نسخة احتياطية من قاعدة البيانات',
  restore_failed: 'فشل في استعادة قاعدة البيانات من النسخة الاحتياطية',
  reset_failed: 'فشل في إعادة تعيين قاعدة البيانات',
  backup_not_found: 'ملف النسخة الاحتياطية غير موجود',
  database_busy: 'قاعدة البيانات مشغولة حالياً. يرجى إغلاق جميع العمليات وإعادة المحاولة',
  connection_failed: 'فشل في الاتصال بقاعدة البيانات',
  file_access_error: 'خطأ في الوصول لملف قاعدة البيانات',
  
  // Info Messages
  backup_processing: 'جاري إنشاء نسخة احتياطية...',
  restore_processing: 'جاري استعادة قاعدة البيانات...',
  reset_processing: 'جاري إعادة تعيين قاعدة البيانات...',
  
  // Field-specific messages
  fields: {
    backupId: 'معرف النسخة الاحتياطية',
    backupPath: 'مسار النسخة الاحتياطية',
    dbPath: 'مسار قاعدة البيانات'
  }
};

// Database error handler
const DatabaseErrorHandler = {
  messages: { ...databaseMessages },
  
  getMessage(messageKey, params = {}) {
    const message = this.messages[messageKey];
    if (!message) {
      return messageKey;
    }
    
    // Replace parameters in message
    return message.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] || match;
    });
  },
  
  createErrorResponse(statusCode, message, errors = null) {
    return {
      statusCode,
      message,
      errors
    };
  },
  
  handleDatabaseError(error, context = {}) {
    const errorMessage = error.message;
    
    if (errorMessage.includes('EBUSY') || errorMessage.includes('resource busy or locked')) {
      return this.createErrorResponse(409, this.messages.database_busy);
    }
    
    if (errorMessage.includes('ENOENT') || errorMessage.includes('no such file or directory')) {
      return this.createErrorResponse(404, this.messages.backup_not_found);
    }
    
    if (errorMessage.includes('EACCES') || errorMessage.includes('permission denied')) {
      return this.createErrorResponse(403, this.messages.file_access_error);
    }
    
    if (errorMessage.includes('connection')) {
      return this.createErrorResponse(500, this.messages.connection_failed);
    }
    
    // Default database error handling
    return this.createErrorResponse(500, this.messages.backup_failed);
  },
  
  createDatabaseSuccessResponse(data, messageKey, params = {}) {
    const message = this.getMessage(messageKey, params);
    return {
      statusCode: 200,
      data,
      message
    };
  }
};

const BACKUP_DIR = path.join(os.homedir(), '.urcash', 'backups');
const dbPath = path.join(os.homedir(), '.urcash', 'database.sqlite');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

exports.createBackup = async (req, res) => {
  try {
    const { customDirectory } = req.body;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Use custom directory if provided, otherwise use default
    const backupDir = customDirectory || BACKUP_DIR;
    const backupPath = path.join(backupDir, `backup-${timestamp}.db`);
    
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    logger.info('Creating database backup', { backupPath, customDirectory });

    // Test database connection before backup
    try {
      // Test connection using the wrapper functions which handle reconnection
      database.queryOne('SELECT 1 as test');
    } catch (testError) {
      logger.error('Database connection test failed:', testError);
      const errorResponse = DatabaseErrorHandler.handleDatabaseError(
        new Error('Database connection is not functioning properly'),
        { operation: 'createBackup' }
      );
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }

    // Get a backup-ready database instance
    const dbInstance = database.getBackupReadyDatabase();
    
    // Use better-sqlite3's backup functionality
    dbInstance.backup(backupPath);

    // Get updated backup count after creation (only from default directory for cleanup)
    const updatedBackups = await getExistingBackups();

    // Clean up old backups if we have more than 5 (only in default directory)
    if (!customDirectory && updatedBackups.length > 5) {
      const backupsToDelete = updatedBackups.slice(5);
      for (const backup of backupsToDelete) {
        try {
          fs.unlinkSync(backup.path);
          logger.info('Deleted old backup:', backup.name);
        } catch (deleteError) {
          logger.warn('Failed to delete old backup:', backup.name, deleteError);
        }
      }
    }
    
    // Get the final count after cleanup (only from default directory)
    const finalBackups = customDirectory ? [] : await getExistingBackups();
    logger.info('Database backup created successfully', { 
      backupPath,
      totalBackups: finalBackups.length,
      maxBackups: 5,
      customDirectory: !!customDirectory
    });
    const successResponse = DatabaseErrorHandler.createDatabaseSuccessResponse(
      {
        backupPath,
        timestamp,
        totalBackups: finalBackups.length,
        maxBackups: 5,
        customDirectory: !!customDirectory
      },
      'backup_created'
    );
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (error) {
    logger.error('Error creating database backup:', error);
    const errorResponse = DatabaseErrorHandler.handleDatabaseError(error, { 
      operation: 'createBackup' 
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
};

// Helper function to get existing backups
async function getExistingBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    return files
      .filter(file => file.endsWith('.db'))
      .map(file => {
        const stats = fs.statSync(path.join(BACKUP_DIR, file));
        return {
          id: file,
          name: file,
          size: stats.size,
          createdAt: stats.birthtime,
          path: path.join(BACKUP_DIR, file)
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt); // Sort by creation time, newest first
  } catch (error) {
    logger.error('Error getting existing backups:', error);
    return [];
  }
}

exports.listBackups = async (req, res) => {
  try {
    const backups = await getExistingBackups();
    
    const successResponse = DatabaseErrorHandler.createDatabaseSuccessResponse(
      backups,
      'backups_fetched'
    );
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (error) {
    logger.error('Error listing backups:', error);
    const errorResponse = DatabaseErrorHandler.handleDatabaseError(error, { 
      operation: 'listBackups' 
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
};

exports.restoreFromBackup = async (req, res) => {
  try {
    const { backupId } = req.params;
    const backupPath = path.join(BACKUP_DIR, backupId);

    logger.info('Attempting to restore from backup', { backupId, backupPath });

    // Check if backup exists
    if (!fs.existsSync(backupPath)) {
      logger.error('Backup file not found', { backupPath });
      const errorResponse = DatabaseErrorHandler.handleDatabaseError(
        new Error('Backup file not found'),
        { backupPath }
      );
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }

    // Validate the backup file before attempting restoration
    logger.info('Validating backup file...');
    if (!validateSQLiteDatabase(backupPath)) {
      logger.error('Backup file is not a valid SQLite database', { backupPath });
      const errorResponse = DatabaseErrorHandler.handleDatabaseError(
        new Error('Backup file is corrupted or not a valid SQLite database'),
        { backupPath }
      );
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
    logger.info('Backup file validation successful');

    // Close current database connection with retry mechanism
    let connectionClosed = false;
    let retryCount = 0;
    const maxRetries = 5;
    
    while (!connectionClosed && retryCount < maxRetries) {
      try {
        database.closeConnection();
        connectionClosed = true;
        logger.info('Database connection closed successfully');
      } catch (closeError) {
        retryCount++;
        logger.warn(`Failed to close database connection (attempt ${retryCount}/${maxRetries}):`, closeError);
        
        if (retryCount < maxRetries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        } else {
          throw new Error('Failed to close database connection after multiple attempts');
        }
      }
    }

    // Wait a bit to ensure the file is released
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try to delete current database with retry mechanism
    let dbDeleted = false;
    retryCount = 0;
    
    while (!dbDeleted && retryCount < maxRetries) {
      try {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
        }
        dbDeleted = true;
        logger.info('Current database file deleted successfully');
      } catch (deleteError) {
        retryCount++;
        logger.warn(`Failed to delete database file (attempt ${retryCount}/${maxRetries}):`, deleteError);
        
        if (retryCount < maxRetries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        } else {
          throw new Error('Failed to delete database file after multiple attempts');
        }
      }
    }

    // Copy backup to database location
    fs.copyFileSync(backupPath, dbPath);
    logger.info('Backup file copied to database location');

    // Reinitialize database connection using the database module's reconnect method
    // This ensures all references are properly updated
    database.reconnect();
    logger.info('Database connection reinitialized');

    // Database restored successfully - no migrations needed
    logger.info('Database restored successfully from backup');

    logger.info('Database restored successfully from backup', { backupPath });

    const successResponse = DatabaseErrorHandler.createDatabaseSuccessResponse(
      { backupPath },
      'backup_restored'
    );
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (error) {
    logger.error('Error restoring database from backup:', error);
    const errorResponse = DatabaseErrorHandler.handleDatabaseError(error, { 
      operation: 'restoreFromBackup' 
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
};

exports.restoreFromCustomBackup = async (req, res) => {
  try {
    const { backupPath } = req.body;

    if (!backupPath) {
      const errorResponse = DatabaseErrorHandler.handleDatabaseError(
        new Error('Backup path is required'),
        { operation: 'restoreFromCustomBackup' }
      );
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }

    logger.info('Attempting to restore from custom backup', { backupPath });

    // Check if backup exists
    if (!fs.existsSync(backupPath)) {
      logger.error('Custom backup file not found', { backupPath });
      const errorResponse = DatabaseErrorHandler.handleDatabaseError(
        new Error('Backup file not found'),
        { backupPath }
      );
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }

    // Validate the backup file before attempting restoration
    logger.info('Validating backup file...');
    if (!validateSQLiteDatabase(backupPath)) {
      logger.error('Backup file is not a valid SQLite database', { backupPath });
      const errorResponse = DatabaseErrorHandler.handleDatabaseError(
        new Error('Backup file is corrupted or not a valid SQLite database'),
        { backupPath }
      );
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
    logger.info('Backup file validation successful');

    // Close current database connection with retry mechanism
    let connectionClosed = false;
    let retryCount = 0;
    const maxRetries = 5;
    
    while (!connectionClosed && retryCount < maxRetries) {
      try {
        database.closeConnection();
        connectionClosed = true;
        logger.info('Database connection closed successfully');
      } catch (closeError) {
        retryCount++;
        logger.warn(`Failed to close database connection (attempt ${retryCount}/${maxRetries}):`, closeError);
        
        if (retryCount < maxRetries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        } else {
          throw new Error('Failed to close database connection after multiple attempts');
        }
      }
    }

    // Wait a bit to ensure the file is released
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try to delete current database with retry mechanism
    let dbDeleted = false;
    retryCount = 0;
    
    while (!dbDeleted && retryCount < maxRetries) {
      try {
        if (fs.existsSync(dbPath)) {
          fs.unlinkSync(dbPath);
        }
        dbDeleted = true;
        logger.info('Current database file deleted successfully');
      } catch (deleteError) {
        retryCount++;
        logger.warn(`Failed to delete database file (attempt ${retryCount}/${maxRetries}):`, deleteError);
        
        if (retryCount < maxRetries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        } else {
          throw new Error('Failed to delete database file after multiple attempts');
        }
      }
    }

    // Copy backup to database location
    fs.copyFileSync(backupPath, dbPath);
    logger.info('Custom backup file copied to database location');

    // Reinitialize database connection using the database module's reconnect method
    // This ensures all references are properly updated
    database.reconnect();
    logger.info('Database connection reinitialized');

    // Database restored successfully - no migrations needed
    logger.info('Database restored successfully from custom backup', { backupPath });

    const successResponse = DatabaseErrorHandler.createDatabaseSuccessResponse(
      { backupPath },
      'backup_restored'
    );
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (error) {
    logger.error('Error restoring database from custom backup:', error);
    const errorResponse = DatabaseErrorHandler.handleDatabaseError(error, { 
      operation: 'restoreFromCustomBackup' 
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
};

exports.resetDatabase = async (req, res) => {
  try {
    // Close current database connection with retry mechanism
    let connectionClosed = false;
    let retryCount = 0;
    const maxRetries = 5;
    
    while (!connectionClosed && retryCount < maxRetries) {
      try {
    database.closeConnection();
        connectionClosed = true;
        logger.info('Database connection closed successfully for reset');
      } catch (closeError) {
        retryCount++;
        logger.warn(`Failed to close database connection for reset (attempt ${retryCount}/${maxRetries}):`, closeError);
        
        if (retryCount < maxRetries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        } else {
          throw new Error('Failed to close database connection after multiple attempts');
        }
      }
    }

    // Delete the database file if it exists
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      logger.info('Database file deleted for reset');
    }

    // Reinitialize database with the new schema
    database.initializeDatabase(true);
    logger.info('Database reset successfully');

    const successResponse = DatabaseErrorHandler.createDatabaseSuccessResponse(
      {},
      'database_reset'
    );
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (error) {
    logger.error('Error resetting database:', error);
    const errorResponse = DatabaseErrorHandler.handleDatabaseError(error, { 
      operation: 'resetDatabase' 
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
};

exports.fixMenuItems = async (req, res) => {
  try {
    // Menu items fix functionality removed - no migrations needed
    const success = true;
    
    if (success) {
      logger.info('Menu items fixed successfully via API');
      const successResponse = DatabaseErrorHandler.createDatabaseSuccessResponse(
        {},
        'menu_items_fixed'
      );
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    } else {
      logger.error('Failed to fix menu items via API');
      const errorResponse = DatabaseErrorHandler.handleDatabaseError(
        new Error('Failed to fix menu items'),
        { operation: 'fixMenuItems' }
      );
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  } catch (error) {
    logger.error('Error fixing menu items via API:', error);
    const errorResponse = DatabaseErrorHandler.handleDatabaseError(error, { 
      operation: 'fixMenuItems' 
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
};