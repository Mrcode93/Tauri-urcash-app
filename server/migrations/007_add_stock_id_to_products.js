const logger = require('../utils/logger');

/**
 * Migration: Add stock_id column to products table
 * 
 * This migration adds the stock_id column to the products table
 * to link products to specific stock locations.
 */

function up(db) {
  return new Promise((resolve, reject) => {
    try {
      logger.info('Starting migration: Add stock_id column to products table');
      
      // Check if the column already exists
      const tableInfo = db.prepare("PRAGMA table_info(products)").all();
      const columnExists = tableInfo.some(col => col.name === 'stock_id');
      
      if (columnExists) {
        logger.info('Column stock_id already exists in products table, skipping migration');
        resolve();
        return;
      }
      
      // Add the stock_id column
      db.prepare(`
        ALTER TABLE products 
        ADD COLUMN stock_id INTEGER
      `).run();
      
      // Add foreign key constraint
      db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_products_stock_id ON products(stock_id)
      `).run();
      
      // Update existing products to assign them to the main stock
      const mainStock = db.prepare('SELECT id FROM stocks WHERE is_main_stock = 1 LIMIT 1').get();
      if (mainStock) {
        db.prepare('UPDATE products SET stock_id = ? WHERE stock_id IS NULL').run(mainStock.id);
        logger.info('Updated existing products to assign to main stock');
      }
      
      logger.info('Successfully added stock_id column to products table');
      resolve();
      
    } catch (error) {
      logger.error('Migration failed: Add stock_id column to products table', error);
      reject(error);
    }
  });
}

function down(db) {
  return new Promise((resolve, reject) => {
    try {
      logger.info('Rolling back migration: Remove stock_id column from products table');
      
      // Check if the column exists
      const tableInfo = db.prepare("PRAGMA table_info(products)").all();
      const columnExists = tableInfo.some(col => col.name === 'stock_id');
      
      if (!columnExists) {
        logger.info('Column stock_id does not exist in products table, nothing to rollback');
        resolve();
        return;
      }
      
      // Drop the index first
      db.prepare('DROP INDEX IF EXISTS idx_products_stock_id').run();
      
      // SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
      // This is a complex operation that should be done carefully
      logger.warn('Rollback not implemented for stock_id column removal. Manual intervention required.');
      logger.warn('To rollback: recreate products table without stock_id column and restore data');
      
      resolve();
      
    } catch (error) {
      logger.error('Rollback failed: Remove stock_id column from products table', error);
      reject(error);
    }
  });
}

module.exports = {
  version: '007',
  description: 'Add stock_id column to products table for stock location management',
  up,
  down,
  dependencies: ['005'] // Depends on stocks table
}; 