const { db } = require('../database/index.js');
const logger = require('../utils/logger');

async function up() {
  try {
    logger.info('Running migration: Add sales enhancements');

    // Add delegate_id and employee_id to sales table if they don't exist
    const salesColumns = db.prepare("PRAGMA table_info(sales)").all();
    const hasDelegateId = salesColumns.some(col => col.name === 'delegate_id');
    const hasEmployeeId = salesColumns.some(col => col.name === 'employee_id');

    if (!hasDelegateId) {
      logger.info('Adding delegate_id column to sales table');
      db.prepare(`
        ALTER TABLE sales 
        ADD COLUMN delegate_id INTEGER 
        REFERENCES representatives(id) ON DELETE SET NULL
      `).run();
    }

    if (!hasEmployeeId) {
      logger.info('Adding employee_id column to sales table');
      db.prepare(`
        ALTER TABLE sales 
        ADD COLUMN employee_id INTEGER 
        REFERENCES employees(id) ON DELETE SET NULL
      `).run();
    }

    // Add stock_id to sale_items table if it doesn't exist
    const saleItemsColumns = db.prepare("PRAGMA table_info(sale_items)").all();
    const hasStockId = saleItemsColumns.some(col => col.name === 'stock_id');

    if (!hasStockId) {
      logger.info('Adding stock_id column to sale_items table');
      db.prepare(`
        ALTER TABLE sale_items 
        ADD COLUMN stock_id INTEGER 
        REFERENCES stocks(id) ON DELETE SET NULL
      `).run();
    }

    logger.info('Migration completed successfully: Add sales enhancements');
  } catch (error) {
    logger.error('Migration failed: Add sales enhancements', error);
    throw error;
  }
}

async function down() {
  try {
    logger.info('Rolling back migration: Add sales enhancements');

    // Note: SQLite doesn't support DROP COLUMN in older versions
    // This is a simplified rollback - in production, you might need to recreate the table
    logger.warn('Rollback not implemented for this migration - SQLite limitations');
    
    logger.info('Rollback completed: Add sales enhancements');
  } catch (error) {
    logger.error('Rollback failed: Add sales enhancements', error);
    throw error;
  }
}

module.exports = { up, down };
