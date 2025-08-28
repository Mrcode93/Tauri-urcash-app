const { initializeDatabase, db, needsInitialization } = require('./database');
const logger = require('./utils/logger');

/**
 * Initialize the database
 * @param {boolean} force - Force reinitialization even if database exists
 * @returns {Promise<boolean>} Success status
 */
async function initDb(force = false) {
  try {
    logger.info('Starting database initialization...');
    
    // Check if initialization is needed
    if (!force && !needsInitialization()) {
      logger.info('Database already initialized');
      return true;
    }
    
    // Initialize database
    await initializeDatabase(force);
    
    logger.info('Database initialization completed successfully');
    return true;
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

/**
 * Reset the database by dropping all tables and recreating them
 * @returns {Promise<boolean>} Success status
 */
async function resetDatabase() {
  try {
    logger.info('Resetting database...');
    
    // Force reinitialization
    await initializeDatabase(true);
    
    logger.info('Database reset completed successfully');
    return true;
  } catch (error) {
    logger.error('Database reset failed:', error);
    throw error;
  }
}

/**
 * Check database health and connectivity
 * @returns {Promise<object>} Database health status
 */
async function checkDatabaseHealth() {
  try {
    // Test basic connectivity
    const result = db.prepare('SELECT 1 as test').get();
    
    // Check if main tables exist
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();
    
    const expectedTables = [
      'users', 'settings', 'customers', 'suppliers', 'products',
      'sales', 'sale_items', 'purchases', 'purchase_items',
      'cash_boxes', 'cash_box_transactions', 'bills', 'bill_items',
      'customer_receipts', 'supplier_payment_receipts', 'expenses',
      'installments', 'debts', 'licenses'
    ];
    
    const missingTables = expectedTables.filter(table => 
      !tables.find(t => t.name === table)
    );
    
    return {
      connected: result.test === 1,
      tablesCount: tables.length,
      expectedTables: expectedTables.length,
      missingTables,
      needsInitialization: missingTables.length > 0
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      connected: false,
      error: error.message,
      needsInitialization: true
    };
  }
}

/**
 * Get database statistics
 * @returns {Promise<object>} Database statistics
 */
async function getDatabaseStats() {
  try {
    const stats = {
      users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      customers: db.prepare('SELECT COUNT(*) as count FROM customers').get().count,
      suppliers: db.prepare('SELECT COUNT(*) as count FROM suppliers').get().count,
      products: db.prepare('SELECT COUNT(*) as count FROM products').get().count,
      sales: db.prepare('SELECT COUNT(*) as count FROM sales').get().count,
      purchases: db.prepare('SELECT COUNT(*) as count FROM purchases').get().count,
      cash_boxes: db.prepare('SELECT COUNT(*) as count FROM cash_boxes').get().count,
      bills: db.prepare('SELECT COUNT(*) as count FROM bills').get().count,
      expenses: db.prepare('SELECT COUNT(*) as count FROM expenses').get().count
    };
    
    return stats;
  } catch (error) {
    logger.error('Failed to get database stats:', error);
    return {};
  }
}

/**
 * Backup database to a file
 * @param {string} backupPath - Path to save backup file
 * @returns {Promise<boolean>} Success status
 */
async function backupDatabase(backupPath) {
  try {
    logger.info(`Creating database backup at: ${backupPath}`);
    
    // Use SQLite backup API for safe backup
    const fs = require('fs');
    const path = require('path');
    
    // Ensure backup directory exists
    const backupDir = path.dirname(backupPath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Create backup
    const backup = db.backup(backupPath);
    
    // Wait for backup to complete
    let remaining = backup.step(-1);
    while (remaining > 0) {
      remaining = backup.step(-1);
    }
    
    backup.finish();
    
    logger.info('Database backup completed successfully');
    return true;
  } catch (error) {
    logger.error('Database backup failed:', error);
    throw error;
  }
}

/**
 * Restore database from a backup file
 * @param {string} backupPath - Path to backup file
 * @returns {Promise<boolean>} Success status
 */
async function restoreDatabase(backupPath) {
  try {
    logger.info(`Restoring database from: ${backupPath}`);
    
    const fs = require('fs');
    
    // Check if backup file exists
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }
    
    // Close current database connection
    if (db) {
      db.close();
    }
    
    // Copy backup file to database location
    const Database = require('better-sqlite3');
    const os = require('os');
    const path = require('path');
    
    const APP_DATA_DIR = path.join(os.homedir(), '.urcash');
    const DB_PATH = path.join(APP_DATA_DIR, 'database.sqlite');
    
    fs.copyFileSync(backupPath, DB_PATH);
    
    // Reconnect to restored database
    const { reconnect } = require('./database');
    reconnect();
    
    logger.info('Database restored successfully');
    return true;
  } catch (error) {
    logger.error('Database restore failed:', error);
    throw error;
  }
}

// Export functions
module.exports = {
  initDb,
  resetDatabase,
  checkDatabaseHealth,
  getDatabaseStats,
  backupDatabase,
  restoreDatabase
};

// If this script is run directly
if (require.main === module) {
  initDb()
    .then(() => {
      
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database initialization failed:', error);
      process.exit(1);
    });
}