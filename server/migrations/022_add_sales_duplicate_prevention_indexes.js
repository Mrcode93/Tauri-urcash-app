/**
 * Migration: Add sales duplicate prevention indexes
 * This migration adds indexes to improve duplicate detection performance
 */

module.exports = {
  version: '022',
  description: 'Add sales duplicate prevention indexes',
  
  up: async (db) => {
    console.log('Adding sales duplicate prevention indexes...');
    
    // Create indexes for better duplicate detection performance
    await db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_sales_customer_created 
      ON sales(customer_id, created_at DESC)
    `).run();

    await db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_sales_barcode 
      ON sales(barcode) WHERE barcode IS NOT NULL
    `).run();

    await db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_sales_invoice_no 
      ON sales(invoice_no)
    `).run();

    // Add index for rapid duplicate detection
    await db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_sales_customer_amount_time 
      ON sales(customer_id, total_amount, created_at DESC)
    `).run();

    console.log('Sales duplicate prevention indexes added successfully');
  },

  down: async (db) => {
    console.log('Removing sales duplicate prevention indexes...');
    
    // Remove indexes in reverse order
    await db.prepare('DROP INDEX IF EXISTS idx_sales_customer_amount_time').run();
    await db.prepare('DROP INDEX IF EXISTS idx_sales_invoice_no').run();
    await db.prepare('DROP INDEX IF EXISTS idx_sales_barcode').run();
    await db.prepare('DROP INDEX IF EXISTS idx_sales_customer_created').run();

    console.log('Sales duplicate prevention indexes removed successfully');
  }
};
