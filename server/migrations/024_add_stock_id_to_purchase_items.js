const db = require('../database');

module.exports = {
  up: () => {
    console.log('Adding stock_id to purchase_items table...');
    
    // Add stock_id column to purchase_items table (without foreign key constraint in ALTER TABLE)
    db.prepare(`
      ALTER TABLE purchase_items 
      ADD COLUMN stock_id INTEGER
    `).run();
    
    // Update existing purchase items to use the main stock (assuming stock with is_main_stock = 1)
    const mainStock = db.queryOne('SELECT id FROM stocks WHERE is_main_stock = 1 LIMIT 1');
    if (mainStock) {
      db.prepare(`
        UPDATE purchase_items 
        SET stock_id = ? 
        WHERE stock_id IS NULL
      `).run([mainStock.id]);
    }
    
    console.log('Successfully added stock_id to purchase_items table');
  },
  
  down: () => {
    console.log('Removing stock_id from purchase_items table...');
    
    // Create a new table without stock_id column
    db.prepare(`
      CREATE TABLE purchase_items_backup AS 
      SELECT id, purchase_id, product_id, quantity, price, discount_percent, tax_percent, 
             total, returned_quantity, expiry_date, batch_number, notes, created_at, updated_at
      FROM purchase_items
    `).run();
    
    // Drop the old table
    db.prepare('DROP TABLE purchase_items').run();
    
    // Rename backup table
    db.prepare('ALTER TABLE purchase_items_backup RENAME TO purchase_items').run();
    
    console.log('Successfully removed stock_id from purchase_items table');
  }
};
