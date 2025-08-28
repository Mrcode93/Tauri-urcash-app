module.exports = {
  version: '019',
  description: 'Fix index issues - remove references to non-existent tables',
  up: function(db) {
    const logger = require('../utils/logger');
    
    try {
      logger.info('Starting migration 019: Fix index issues');
      
      // Drop indexes for non-existent tables
      const indexesToDrop = [
        'idx_bills_customer_id',
        'idx_bills_invoice_date', 
        'idx_bills_payment_status',
        'idx_bills_bill_number',
        'idx_bills_barcode',
        'idx_bill_items_bill_id',
        'idx_bill_items_product_id',
        'idx_bill_returns_original_bill_id',
        'idx_bill_returns_customer_id',
        'idx_bill_returns_return_date',
        'idx_bill_return_items_return_id',
        'idx_bill_return_items_product_id'
      ];
      
      indexesToDrop.forEach(indexName => {
        try {
          db.prepare(`DROP INDEX IF EXISTS ${indexName}`).run();
          logger.info(`Dropped index: ${indexName}`);
        } catch (err) {
          logger.warn(`Index ${indexName} doesn't exist or couldn't be dropped: ${err.message}`);
        }
      });
      
      logger.info('Migration 019 completed successfully');
    } catch (error) {
      logger.error('Migration 019 failed:', error);
      throw error;
    }
  },
  
  down: function(db) {
    const logger = require('../utils/logger');
    logger.info('Migration 019 down: Indexes were dropped, no rollback needed');
  }
};
