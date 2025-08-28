const { db } = require('../database/index.js');
const logger = require('../utils/logger');

const migration = {
  version: '028',
  description: 'Add sales_target column to representatives table',
  
  up: async () => {
    logger.info('Starting migration: Add sales_target column to representatives table');
    
    try {
      // Check if the column already exists
      const columnExists = db.prepare(`
        SELECT COUNT(*) as count 
        FROM pragma_table_info('representatives') 
        WHERE name = 'sales_target'
      `).get();
      
      if (columnExists.count === 0) {
        // Add the sales_target column
        db.prepare(`
          ALTER TABLE representatives 
          ADD COLUMN sales_target DECIMAL(12,2) DEFAULT 0
        `).run();
        
        logger.info('Successfully added sales_target column to representatives table');
      } else {
        logger.info('sales_target column already exists in representatives table, skipping migration');
      }
      
      return true;
    } catch (error) {
      logger.error('Error in migration 028 (up):', error);
      throw error;
    }
  },
  
  down: async () => {
    logger.info('Rolling back migration: Remove sales_target column from representatives table');
    
    try {
      // SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
      // This is a complex operation that would require backing up data
      // For now, we'll just log that this migration cannot be easily rolled back
      logger.warn('Rollback not implemented for sales_target column removal - would require table recreation');
      
      return true;
    } catch (error) {
      logger.error('Error in migration 028 (down):', error);
      throw error;
    }
  }
};

module.exports = migration;
