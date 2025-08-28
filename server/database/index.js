const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const logger = require('../utils/logger');

const APP_DATA_DIR = path.join(os.homedir(), '.urcash');
const DB_PATH = path.join(APP_DATA_DIR, 'database.sqlite');

let db = null;

// Ensure the app data directory exists
const fs = require('fs');
if (!fs.existsSync(APP_DATA_DIR)) {
  fs.mkdirSync(APP_DATA_DIR, { recursive: true });
}

// Initialize database connection
function initializeConnection() {
  try {
    if (db && !db.closed) {
      return; // Connection already exists and is open
    }
    
    db = new Database(DB_PATH, { verbose: logger.debug });
    db.pragma('foreign_keys = ON');
    // Database connection initialized
  } catch (err) {
    logger.error('Database connection error:', err);
    throw err;
  }
}

// Initialize connection on module load
initializeConnection();

// Export both the raw db instance and wrapper functions
module.exports = {
  get db() {
    if (!db || db.closed) {
      initializeConnection();
    }
    return db;
  }, // Dynamic getter for database instance
  query: (sql, params = []) => {
    try {
      if (!db || db.closed) {
        initializeConnection();
      }
      const stmt = db.prepare(sql);
      return stmt.all(params);
    } catch (err) {
      logger.error('Query error:', err);
      throw err;
    }
  },
  
  queryOne: (sql, params = []) => {
    try {
      if (!db || db.closed) {
        initializeConnection();
      }
      const stmt = db.prepare(sql);
      return stmt.get(params);
    } catch (err) {
      logger.error('QueryOne error:', err);
      throw err;
    }
  },
  
  insert: (sql, params = []) => {
    try {
      if (!db || db.closed) {
        initializeConnection();
      }
      const stmt = db.prepare(sql);
      const result = stmt.run(params);
      return result.lastInsertRowid;
    } catch (err) {
      logger.error('Insert error:', err);
      throw err;
    }
  },
  
  update: (sql, params = []) => {
    try {
      if (!db || db.closed) {
        initializeConnection();
      }
      const stmt = db.prepare(sql);
      const result = stmt.run(params);
      return result.changes;
    } catch (err) {
      logger.error('Update error:', err);
      throw err;
    }
  },
  
  delete: (sql, params = []) => {
    try {
      if (!db || db.closed) {
        initializeConnection();
      }
      const stmt = db.prepare(sql);
      const result = stmt.run(params);
      return result.changes;
    } catch (err) {
      logger.error('Delete error:', err);
      throw err;
    }
  },

  transaction: (cb) => {
    if (!db || db.closed) {
      initializeConnection();
    }
    const trx = db.transaction(cb);
    return trx();
  },

  closeConnection: () => {
    try {
      if (db && !db.closed) {
        db.close();
        logger.info('Database connection closed successfully');
      }
    } catch (err) {
      logger.error('Error closing database connection:', err);
      throw err;
    }
  },

  forceCloseAllConnections: () => {
    try {
      // Close the main database connection
      if (db && !db.closed) {
        db.close();
        logger.info('Main database connection force closed');
      }
      
      // Set db to null to ensure no cached references
      db = null;
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        logger.info('Garbage collection forced');
      }
      
      logger.info('All database connections force closed');
    } catch (err) {
      logger.error('Error force closing database connections:', err);
      // Don't throw here, just log the error
    }
  },

  forceCloseForRestoration: () => {
    try {
      logger.info('Force closing all database connections for restoration...');
      
      // Close the main database connection
      if (db && !db.closed) {
        db.close();
        logger.info('Main database connection closed for restoration');
      }
      
      // Set db to null to ensure no cached references
      db = null;
      
      // Force garbage collection multiple times to ensure cleanup
      if (global.gc) {
        global.gc();
        setTimeout(() => global.gc(), 100);
        setTimeout(() => global.gc(), 500);
        logger.info('Multiple garbage collection cycles forced');
      }
      
      // Wait a bit to ensure all handles are released
      setTimeout(() => {
        // Database connections cleanup completed
      }, 1000);
      
      logger.info('All database connections force closed for restoration');
    } catch (err) {
      logger.error('Error force closing database connections for restoration:', err);
      // Don't throw here, just log the error
    }
  },

  pauseForRestoration: () => {
    try {
      logger.info('Pausing all database operations for restoration...');
      
      // Close the main database connection
      if (db && !db.closed) {
        db.close();
        logger.info('Database connection closed for restoration pause');
      }
      
      // Set db to null to prevent any new operations
      db = null;
      
      // Set a flag to indicate restoration is in progress
      global.__DB_RESTORATION_IN_PROGRESS__ = true;
      
      logger.info('Database operations paused for restoration');
    } catch (err) {
      logger.error('Error pausing database operations:', err);
    }
  },

  resumeAfterRestoration: () => {
    try {
      logger.info('Resuming database operations after restoration...');
      
      // Clear the restoration flag
      global.__DB_RESTORATION_IN_PROGRESS__ = false;
      
      // Reinitialize the database connection
      initializeConnection();
      
      logger.info('Database operations resumed after restoration');
    } catch (err) {
      logger.error('Error resuming database operations:', err);
    }
  },

  reconnect: () => {
    try {
      // Close existing connection if it exists
      if (db && !db.closed) {
        db.close();
      }
      
      // Create new connection
      db = new Database(DB_PATH, { verbose: logger.debug });
      db.pragma('foreign_keys = ON');
      // Database connection reinitialized
    } catch (err) {
      logger.error('Error reconnecting to database:', err);
      throw err;
    }
  },

  getBackupReadyDatabase: () => {
    // Ensure we have a fresh, open connection for backup operations
    if (!db || db.closed) {
      initializeConnection();
    }
    
    // Perform a simple query to ensure the connection is actually working
    try {
      db.prepare('SELECT 1').get();
      return db;
    } catch (err) {
      // If that fails, try to reinitialize
      logger.warn('Database connection test failed, reinitializing:', err);
      initializeConnection();
      return db;
    }
  },

  initializeDatabase: (reset = false) => {
    try {
      if (reset && db && !db.closed) {
        db.close();
      }
      
      if (reset || !db || db.closed) {
        db = new Database(DB_PATH, { verbose: logger.debug });
        db.pragma('foreign_keys = ON');
      }
      
      // Database initialized
    } catch (err) {
      logger.error('Error initializing database:', err);
      throw err;
    }
  }
};
