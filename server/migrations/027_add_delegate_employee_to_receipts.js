const { db } = require('../database');
const logger = require('../utils/logger');

async function up() {
  try {
    logger.info('Starting migration: Add delegate_id and employee_id to customer_receipts table');

    // Add delegate_id column to customer_receipts table
    db.prepare(`
      ALTER TABLE customer_receipts 
      ADD COLUMN delegate_id INTEGER
    `).run();

    // Add employee_id column to customer_receipts table
    db.prepare(`
      ALTER TABLE customer_receipts 
      ADD COLUMN employee_id INTEGER
    `).run();

    // Add foreign key constraints
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_customer_receipts_delegate_id 
      ON customer_receipts(delegate_id)
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_customer_receipts_employee_id 
      ON customer_receipts(employee_id)
    `).run();

    logger.info('Migration completed successfully: Added delegate_id and employee_id to customer_receipts table');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

async function down() {
  try {
    logger.info('Rolling back migration: Remove delegate_id and employee_id from customer_receipts table');

    // Remove foreign key constraints first
    db.prepare(`DROP INDEX IF EXISTS idx_customer_receipts_delegate_id`).run();
    db.prepare(`DROP INDEX IF EXISTS idx_customer_receipts_employee_id`).run();

    // Note: SQLite doesn't support DROP COLUMN in older versions
    // We'll need to recreate the table without these columns if rollback is needed
    logger.warn('Rollback not fully supported for SQLite. Manual table recreation may be required.');

    logger.info('Migration rollback completed');
  } catch (error) {
    logger.error('Migration rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down };
