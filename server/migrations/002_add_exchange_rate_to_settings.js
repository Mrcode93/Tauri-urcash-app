const logger = require('../utils/logger');

/**
 * Migration: Add exchange_rate column to settings table
 * 
 * This migration adds the exchange_rate column to the settings table
 * for currency conversion functionality.
 * 
 * The column is used to store the exchange rate between local currency
 * and other currencies (like USD).
 */

function up(db) {
  return new Promise((resolve, reject) => {
    try {
      logger.info('Starting migration: Add exchange_rate column to settings table');
      
      // Check if the column already exists
      const tableInfo = db.prepare("PRAGMA table_info(settings)").all();
      const columnExists = tableInfo.some(col => col.name === 'exchange_rate');
      
      if (columnExists) {
        logger.info('Column exchange_rate already exists in settings table, skipping migration');
        resolve();
        return;
      }
      
      // Add the exchange_rate column
      db.prepare(`
        ALTER TABLE settings 
        ADD COLUMN exchange_rate DECIMAL(10,4) DEFAULT 1.0000
      `).run();
      
      logger.info('Successfully added exchange_rate column to settings table');
      resolve();
      
    } catch (error) {
      logger.error('Migration failed: Add exchange_rate column to settings table', error);
      reject(error);
    }
  });
}

function down(db) {
  return new Promise((resolve, reject) => {
    try {
      logger.info('Rolling back migration: Remove exchange_rate column from settings table');
      
      // SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
      // This is a complex operation that should be done carefully
      
      // First, check if the column exists
      const tableInfo = db.prepare("PRAGMA table_info(settings)").all();
      const columnExists = tableInfo.some(col => col.name === 'exchange_rate');
      
      if (!columnExists) {
        logger.info('Column exchange_rate does not exist in settings table, nothing to rollback');
        resolve();
        return;
      }
      
      // For safety, we'll just log that this migration cannot be easily rolled back
      // In a production environment, you would need to recreate the table without the column
      logger.warn('Rollback not implemented for exchange_rate column removal. Manual intervention required.');
      logger.warn('To rollback: recreate settings table without exchange_rate column and restore data');
      
      resolve();
      
    } catch (error) {
      logger.error('Rollback failed: Remove exchange_rate column from settings table', error);
      reject(error);
    }
  });
}

module.exports = {
  version: '002',
  description: 'Add exchange_rate column to settings table',
  up,
  down,
  dependencies: []
}; 