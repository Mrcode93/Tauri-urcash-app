/**
 * Migration: Add purchases duplicate prevention indexes
 * This migration adds indexes to improve duplicate detection performance
 */

module.exports = {
  version: '023',
  description: 'Add purchases duplicate prevention indexes',
  
  up: async (db) => {
    console.log('Adding purchases duplicate prevention indexes...');
    
    // Create indexes for better duplicate detection performance
    await db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_purchases_supplier_invoice 
      ON purchases(supplier_id, invoice_no)
    `).run();

    await db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_purchases_supplier_created 
      ON purchases(supplier_id, created_at DESC)
    `).run();

    await db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_purchases_invoice_no 
      ON purchases(invoice_no)
    `).run();

    // Add index for rapid duplicate detection
    await db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_purchases_supplier_amount_time 
      ON purchases(supplier_id, net_amount, created_at DESC)
    `).run();

    console.log('Purchases duplicate prevention indexes added successfully');
  },

  down: async (db) => {
    console.log('Removing purchases duplicate prevention indexes...');
    
    // Remove indexes in reverse order
    await db.prepare('DROP INDEX IF EXISTS idx_purchases_supplier_amount_time').run();
    await db.prepare('DROP INDEX IF EXISTS idx_purchases_invoice_no').run();
    await db.prepare('DROP INDEX IF EXISTS idx_purchases_supplier_created').run();
    await db.prepare('DROP INDEX IF EXISTS idx_purchases_supplier_invoice').run();

    console.log('Purchases duplicate prevention indexes removed successfully');
  }
};
