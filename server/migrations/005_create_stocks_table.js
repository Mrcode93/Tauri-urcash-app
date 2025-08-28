const logger = require('../utils/logger');

/**
 * Migration: Create stocks table
 * 
 * This migration creates the stocks table for managing multiple stock locations.
 * The stocks table allows for multi-location inventory management.
 */

function up(db) {
  return new Promise((resolve, reject) => {
    try {
      logger.info('Starting migration: Create stocks table');
      
      // Check if the table already exists
      const tableExists = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='stocks'
      `).get();
      
      if (tableExists) {
        logger.info('Stocks table already exists, skipping migration');
        resolve();
        return;
      }
      
      // Create stocks table
      db.prepare(`
        CREATE TABLE stocks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          code TEXT UNIQUE NOT NULL COLLATE NOCASE,
          description TEXT,
          address TEXT NOT NULL,
          city TEXT,
          state TEXT,
          country TEXT DEFAULT 'Iraq',
          postal_code TEXT,
          phone TEXT,
          email TEXT COLLATE NOCASE,
          manager_name TEXT,
          manager_phone TEXT,
          manager_email TEXT COLLATE NOCASE,
          is_main_stock INTEGER DEFAULT 0 CHECK(is_main_stock IN (0, 1)),
          is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
          capacity DECIMAL(12,2) DEFAULT 0 CHECK(capacity >= 0),
          current_capacity_used DECIMAL(12,2) DEFAULT 0 CHECK(current_capacity_used >= 0),
          notes TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
          CHECK(current_capacity_used <= capacity OR capacity = 0)
        )
      `).run();
      
      // Create indexes for stocks table
      db.prepare('CREATE INDEX IF NOT EXISTS idx_stocks_name ON stocks(name)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_stocks_code ON stocks(code)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_stocks_is_active ON stocks(is_active)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_stocks_is_main ON stocks(is_main_stock)').run();
      
      // Insert default main stock if no stocks exist
      const stocksCount = db.prepare('SELECT COUNT(*) as count FROM stocks').get();
      if (stocksCount.count === 0) {
        db.prepare(`
          INSERT INTO stocks (
            name, code, description, address, city, state, country,
            phone, email, manager_name, manager_phone, manager_email,
            is_main_stock, is_active, capacity, current_capacity_used,
            notes, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(
          'المخزن الرئيسي', 'MAIN-STOCK-001', 'المخزن الرئيسي للشركة',
          'بغداد، العراق', 'بغداد', 'بغداد', 'Iraq',
          '+964 770 123 4567', 'stock@company.com',
          'مدير المخزن', '+964 770 123 4568', 'manager@company.com',
          1, 1, 10000.00, 0.00,
          'المخزن الرئيسي للشركة - يحتوي على جميع المنتجات',
          1
        );
        logger.info('Default main stock created');
      }
      
      logger.info('Successfully created stocks table');
      resolve();
      
    } catch (error) {
      logger.error('Migration failed: Create stocks table', error);
      reject(error);
    }
  });
}

function down(db) {
  return new Promise((resolve, reject) => {
    try {
      logger.info('Rolling back migration: Drop stocks table');
      
      // Check if the table exists
      const tableExists = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='stocks'
      `).get();
      
      if (!tableExists) {
        logger.info('Stocks table does not exist, nothing to rollback');
        resolve();
        return;
      }
      
      // Drop indexes first
      db.prepare('DROP INDEX IF EXISTS idx_stocks_name').run();
      db.prepare('DROP INDEX IF EXISTS idx_stocks_code').run();
      db.prepare('DROP INDEX IF EXISTS idx_stocks_is_active').run();
      db.prepare('DROP INDEX IF EXISTS idx_stocks_is_main').run();
      
      // Drop the table
      db.prepare('DROP TABLE IF EXISTS stocks').run();
      
      logger.info('Successfully dropped stocks table');
      resolve();
      
    } catch (error) {
      logger.error('Rollback failed: Drop stocks table', error);
      reject(error);
    }
  });
}

module.exports = {
  version: '005',
  description: 'Create stocks table for multi-location inventory management',
  up,
  down,
  dependencies: []
}; 