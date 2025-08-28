const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const logger = require('./utils/logger');

const APP_DATA_DIR = path.join(process.env.APPDATA || process.env.HOME || process.env.USERPROFILE, '.urcash');
const DB_PATH = path.join(APP_DATA_DIR, 'database.sqlite');
const BACKUP_DIR = path.join(APP_DATA_DIR, 'backups');

// Function to validate if a file is a valid SQLite database
function validateSQLiteDatabase(filePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logger.error('File does not exist:', filePath);
      return false;
    }

    // Check file size (SQLite files should be at least 512 bytes)
    const stats = fs.statSync(filePath);
    if (stats.size < 512) {
      logger.error('File is too small to be a valid SQLite database:', filePath, 'Size:', stats.size);
      return false;
    }

    // Try to open the database and run a simple query
    const testDb = new Database(filePath, { readonly: true });
    
    // Test basic SQLite functionality
    const result = testDb.prepare('SELECT sqlite_version()').get();
    logger.info('SQLite version in backup:', result['sqlite_version()']);
    
    // Test if we can read the sqlite_master table
    const tables = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    logger.info('Number of tables found:', tables.length);
    
    // Check for essential tables
    const essentialTables = ['products', 'customers', 'sales', 'purchases', 'suppliers'];
    const tableNames = tables.map(t => t.name);
    const missingTables = essentialTables.filter(table => !tableNames.includes(table));
    
    if (missingTables.length > 0) {
      logger.warn('Missing essential tables:', missingTables);
    }
    
    testDb.close();
    return true;
  } catch (error) {
    logger.error('Database validation failed:', error.message);
    return false;
  }
}

// Function to create a backup of the current database before restoration
function backupCurrentDatabase() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      logger.info('No current database to backup');
      return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `pre-restore-backup-${timestamp}.sqlite`);
    
    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    fs.copyFileSync(DB_PATH, backupPath);
    logger.info('Current database backed up to:', backupPath);
    return backupPath;
  } catch (error) {
    logger.error('Failed to backup current database:', error);
    return null;
  }
}

// Function to safely restore database from backup
function restoreDatabaseFromBackup(backupPath) {
  try {
    logger.info('Starting database restoration from:', backupPath);
    
    // Validate the backup file
    if (!validateSQLiteDatabase(backupPath)) {
      throw new Error('Backup file is not a valid SQLite database');
    }
    
    // Create backup of current database
    const currentBackup = backupCurrentDatabase();
    
    // Close any existing database connections
    try {
      // This will be handled by the calling code
      logger.info('Database connections should be closed by calling code');
    } catch (error) {
      logger.warn('Error closing database connections:', error);
    }
    
    // Wait a moment to ensure file handles are released
    setTimeout(() => {
      try {
        // Remove current database if it exists
        if (fs.existsSync(DB_PATH)) {
          fs.unlinkSync(DB_PATH);
          logger.info('Current database removed');
        }
        
        // Copy backup to database location
        fs.copyFileSync(backupPath, DB_PATH);
        logger.info('Backup copied to database location');
        
        // Validate the restored database
        if (!validateSQLiteDatabase(DB_PATH)) {
          throw new Error('Restored database is corrupted');
        }
        
        logger.info('Database restoration completed successfully');
        
        // If we had a current backup and restoration failed, we could restore it here
        // For now, we'll just log success
        
      } catch (error) {
        logger.error('Error during database restoration:', error);
        
        // If we have a current backup, try to restore it
        if (currentBackup && fs.existsSync(currentBackup)) {
          try {
            logger.info('Attempting to restore original database from backup');
            if (fs.existsSync(DB_PATH)) {
              fs.unlinkSync(DB_PATH);
            }
            fs.copyFileSync(currentBackup, DB_PATH);
            logger.info('Original database restored from backup');
          } catch (restoreError) {
            logger.error('Failed to restore original database:', restoreError);
          }
        }
        
        throw error;
      }
    }, 2000);
    
  } catch (error) {
    logger.error('Database restoration failed:', error);
    throw error;
  }
}

// Function to repair a corrupted database
function repairCorruptedDatabase() {
  try {
    logger.info('Attempting to repair corrupted database');
    
    // Check if database exists
    if (!fs.existsSync(DB_PATH)) {
      logger.error('Database file does not exist');
      return false;
    }
    
    // Try to create a backup of the corrupted database
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const corruptedBackupPath = path.join(BACKUP_DIR, `corrupted-db-${timestamp}.sqlite`);
    
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    fs.copyFileSync(DB_PATH, corruptedBackupPath);
    logger.info('Corrupted database backed up to:', corruptedBackupPath);
    
    // Try to use SQLite's built-in repair functionality
    try {
      const db = new Database(DB_PATH);
      
      // Try to run integrity check
      const integrityResult = db.prepare('PRAGMA integrity_check').get();
      logger.info('Integrity check result:', integrityResult);
      
      // Try to run quick check
      const quickCheck = db.prepare('PRAGMA quick_check').get();
      logger.info('Quick check result:', quickCheck);
      
      // Try to optimize the database
      db.prepare('VACUUM').run();
      logger.info('Database vacuum completed');
      
      db.close();
      
      // Validate the repaired database
      if (validateSQLiteDatabase(DB_PATH)) {
        logger.info('Database repair successful');
        return true;
      } else {
        logger.error('Database repair failed - database still corrupted');
        return false;
      }
      
    } catch (error) {
      logger.error('Error during database repair:', error);
      return false;
    }
    
  } catch (error) {
    logger.error('Failed to repair database:', error);
    return false;
  }
}

// Main function to handle database corruption
function handleDatabaseCorruption(backupPath = null) {
  try {
    logger.info('Handling database corruption...');
    
    if (backupPath && fs.existsSync(backupPath)) {
      logger.info('Attempting to restore from provided backup');
      restoreDatabaseFromBackup(backupPath);
      return true;
    } else {
      logger.info('No valid backup provided, attempting to repair current database');
      return repairCorruptedDatabase();
    }
    
  } catch (error) {
    logger.error('Failed to handle database corruption:', error);
    return false;
  }
}

// Export functions for use in other modules
module.exports = {
  validateSQLiteDatabase,
  backupCurrentDatabase,
  restoreDatabaseFromBackup,
  repairCorruptedDatabase,
  handleDatabaseCorruption
};

// If this script is run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node fix-corrupted-database.js [backup-path]');
    console.log('If no backup path is provided, will attempt to repair current database');
    process.exit(1);
  }
  
  const backupPath = args[0];
  const success = handleDatabaseCorruption(backupPath);
  
  if (success) {
    console.log('Database corruption handled successfully');
    process.exit(0);
  } else {
    console.log('Failed to handle database corruption');
    process.exit(1);
  }
}
