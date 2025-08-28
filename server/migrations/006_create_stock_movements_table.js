const logger = require('../utils/logger');

/**
 * Migration: Create stock_movements table
 * 
 * This migration creates the stock_movements table for tracking stock movements
 * between different stock locations. This enables comprehensive inventory tracking.
 */

function up(db) {
  return new Promise((resolve, reject) => {
    try {
      logger.info('Starting migration: Create stock_movements table');
      
      // Check if the table already exists
      const tableExists = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='stock_movements'
      `).get();
      
      if (tableExists) {
        logger.info('Stock_movements table already exists, skipping migration');
        resolve();
        return;
      }
      
      // Create stock_movements table
      db.prepare(`
        CREATE TABLE stock_movements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          movement_type TEXT NOT NULL CHECK(movement_type IN ('transfer', 'adjustment', 'purchase', 'sale', 'return', 'damage', 'expiry')),
          from_stock_id INTEGER,
          to_stock_id INTEGER,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL CHECK(quantity > 0),
          unit_cost DECIMAL(10,2),
          total_value DECIMAL(10,2),
          reference_type TEXT CHECK(reference_type IN ('purchase', 'sale', 'return', 'transfer', 'adjustment')),
          reference_id INTEGER,
          reference_number TEXT,
          movement_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          notes TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (from_stock_id) REFERENCES stocks(id) ON DELETE SET NULL,
          FOREIGN KEY (to_stock_id) REFERENCES stocks(id) ON DELETE SET NULL,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
          CHECK(from_stock_id IS NOT NULL OR to_stock_id IS NOT NULL)
        )
      `).run();
      
      // Create indexes for stock_movements table
      db.prepare('CREATE INDEX IF NOT EXISTS idx_stock_movements_from_stock_id ON stock_movements(from_stock_id)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_stock_movements_to_stock_id ON stock_movements(to_stock_id)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON stock_movements(movement_type)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_stock_movements_reference_type ON stock_movements(reference_type)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_stock_movements_reference_id ON stock_movements(reference_id)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_stock_movements_created_by ON stock_movements(created_by)').run();
      
      logger.info('Successfully created stock_movements table');
      resolve();
      
    } catch (error) {
      logger.error('Migration failed: Create stock_movements table', error);
      reject(error);
    }
  });
}

function down(db) {
  return new Promise((resolve, reject) => {
    try {
      logger.info('Rolling back migration: Drop stock_movements table');
      
      // Check if the table exists
      const tableExists = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='stock_movements'
      `).get();
      
      if (!tableExists) {
        logger.info('Stock_movements table does not exist, nothing to rollback');
        resolve();
        return;
      }
      
      // Drop indexes first
      db.prepare('DROP INDEX IF EXISTS idx_stock_movements_from_stock_id').run();
      db.prepare('DROP INDEX IF EXISTS idx_stock_movements_to_stock_id').run();
      db.prepare('DROP INDEX IF EXISTS idx_stock_movements_product_id').run();
      db.prepare('DROP INDEX IF EXISTS idx_stock_movements_movement_type').run();
      db.prepare('DROP INDEX IF EXISTS idx_stock_movements_reference_type').run();
      db.prepare('DROP INDEX IF EXISTS idx_stock_movements_reference_id').run();
      db.prepare('DROP INDEX IF EXISTS idx_stock_movements_created_at').run();
      db.prepare('DROP INDEX IF EXISTS idx_stock_movements_created_by').run();
      
      // Drop the table
      db.prepare('DROP TABLE IF EXISTS stock_movements').run();
      
      logger.info('Successfully dropped stock_movements table');
      resolve();
      
    } catch (error) {
      logger.error('Rollback failed: Drop stock_movements table', error);
      reject(error);
    }
  });
}

module.exports = {
  version: '006',
  description: 'Create stock_movements table for tracking inventory movements',
  up,
  down,
  dependencies: ['005'] // Depends on stocks table
}; 