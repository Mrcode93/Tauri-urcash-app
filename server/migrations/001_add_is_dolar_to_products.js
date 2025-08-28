const logger = require('../utils/logger');

/**
 * Migration: Add is_dolar column to products table
 * 
 * This migration adds the is_dolar column to the products table
 * for existing databases that don't have this column.
 * 
 * The column is used to indicate if a product is priced in dollars
 * instead of the default local currency.
 */

function up(db) {
  return new Promise((resolve, reject) => {
    try {
      logger.info('Starting migration: Add is_dolar column to products table');
      
      // Check if the column already exists
      const tableInfo = db.prepare("PRAGMA table_info(products)").all();
      const columnExists = tableInfo.some(col => col.name === 'is_dolar');
      
      if (columnExists) {
        logger.info('Column is_dolar already exists in products table, skipping migration');
        resolve();
        return;
      }
      
      // Add the is_dolar column
      db.prepare(`
        ALTER TABLE products 
        ADD COLUMN is_dolar BOOLEAN DEFAULT FALSE
      `).run();
      
      logger.info('Successfully added is_dolar column to products table');
      resolve();
      
    } catch (error) {
      logger.error('Migration failed: Add is_dolar column to products table', error);
      reject(error);
    }
  });
}

function down(db) {
  return new Promise((resolve, reject) => {
    try {
      logger.info('Rolling back migration: Remove is_dolar column from products table');
      
      // SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
      // This is a complex operation that should be done carefully
      
      // First, check if the column exists
      const tableInfo = db.prepare("PRAGMA table_info(products)").all();
      const columnExists = tableInfo.some(col => col.name === 'is_dolar');
      
      if (!columnExists) {
        logger.info('Column is_dolar does not exist in products table, nothing to rollback');
        resolve();
        return;
      }
      
      // For safety, we'll just log that this migration cannot be easily rolled back
      // In a production environment, you would need to recreate the table without the column
      logger.warn('Rollback not implemented for is_dolar column removal. Manual intervention required.');
      logger.warn('To rollback: recreate products table without is_dolar column and restore data');
      
      resolve();
      
    } catch (error) {
      logger.error('Rollback failed: Remove is_dolar column from products table', error);
      reject(error);
    }
  });
}

module.exports = {
  version: '001',
  description: 'Add is_dolar column to products table',
  up,
  down,
  dependencies: []
}; 