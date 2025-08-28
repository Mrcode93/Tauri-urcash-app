module.exports = {
  version: '016',
  description: 'Add money_box_id column to customer_receipts table',
  
  up: async (db) => {
    // Add money_box_id column to customer_receipts table
    db.prepare(`
      ALTER TABLE customer_receipts 
      ADD COLUMN money_box_id TEXT DEFAULT NULL
    `).run();
    
    // Add index for better performance
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_customer_receipts_money_box_id 
      ON customer_receipts(money_box_id)
    `).run();
  },
  
  down: async (db) => {
    // Remove the index first
    db.prepare(`
      DROP INDEX IF EXISTS idx_customer_receipts_money_box_id
    `).run();
    
    // Note: SQLite doesn't support DROP COLUMN in older versions
    // This would require recreating the table without the column
    console.log('Warning: DROP COLUMN not supported in SQLite. Manual table recreation required.');
  }
};
