const logger = require('../utils/logger');

/**
 * Migration: Add product_name column to sale_items table
 * 
 * This migration adds the product_name column to the sale_items table
 * to support manual items (مواد اخرى) that don't have a product_id.
 * 
 * The column allows storing custom item names for manual entries
 * while maintaining compatibility with existing product-based items.
 */

function up(db) {
  return new Promise((resolve, reject) => {
    try {
      logger.info('Starting migration: Add product_name column to sale_items table');
      
      // Check if the column already exists
      const tableInfo = db.prepare("PRAGMA table_info(sale_items)").all();
      const columnExists = tableInfo.some(col => col.name === 'product_name');
      
      if (columnExists) {
        logger.info('Column product_name already exists in sale_items table, skipping migration');
        resolve();
        return;
      }
      
      // Add the product_name column
      db.prepare(`
        ALTER TABLE sale_items 
        ADD COLUMN product_name TEXT
      `).run();
      
      // Update the foreign key constraint to allow NULL product_id for manual items
      // First, drop the existing constraint
      db.prepare(`
        CREATE TABLE sale_items_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id INTEGER NOT NULL,
          product_id INTEGER,
          product_name TEXT,
          quantity INTEGER NOT NULL CHECK(quantity > 0),
          price DECIMAL(10,2) NOT NULL CHECK(price >= 0),
          discount_percent DECIMAL(5,2) DEFAULT 0 CHECK(discount_percent >= 0 AND discount_percent <= 100),
          tax_percent DECIMAL(5,2) DEFAULT 0 CHECK(tax_percent >= 0 AND tax_percent <= 100),
          total DECIMAL(10,2) NOT NULL CHECK(total >= 0),
          line_total DECIMAL(10,2) NOT NULL CHECK(line_total >= 0),
          returned_quantity INTEGER DEFAULT 0 CHECK(returned_quantity >= 0),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
          CHECK(returned_quantity <= quantity),
          CHECK(product_id IS NOT NULL OR product_name IS NOT NULL)
        )
      `).run();
      
      // Copy data from old table to new table
      db.prepare(`
        INSERT INTO sale_items_new 
        SELECT id, sale_id, product_id, NULL as product_name, quantity, price, 
               discount_percent, tax_percent, total, line_total, returned_quantity,
               created_at, updated_at
        FROM sale_items
      `).run();
      
      // Drop old table and rename new table
      db.prepare('DROP TABLE sale_items').run();
      db.prepare('ALTER TABLE sale_items_new RENAME TO sale_items').run();
      
      // Recreate indexes for sale_items
      db.prepare('CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id)').run();
      
      logger.info('Successfully added product_name column to sale_items table and updated constraints');
      resolve();
      
    } catch (error) {
      logger.error('Migration failed: Add product_name column to sale_items table', error);
      reject(error);
    }
  });
}

function down(db) {
  return new Promise((resolve, reject) => {
    try {
      logger.info('Rolling back migration: Remove product_name column from sale_items table');
      
      // Check if the column exists
      const tableInfo = db.prepare("PRAGMA table_info(sale_items)").all();
      const columnExists = tableInfo.some(col => col.name === 'product_name');
      
      if (!columnExists) {
        logger.info('Column product_name does not exist in sale_items table, nothing to rollback');
        resolve();
        return;
      }
      
      // Check if there are any manual items with product_name
      const manualItemsCount = db.prepare(`
        SELECT COUNT(*) as count 
        FROM sale_items 
        WHERE product_name IS NOT NULL AND product_name != ''
      `).get();
      
      if (manualItemsCount.count > 0) {
        logger.warn(`Cannot rollback: Found ${manualItemsCount.count} manual items with product_name. Manual intervention required.`);
        logger.warn('To rollback: manually convert all manual items to use product_id or delete them first');
        resolve();
        return;
      }
      
      // Recreate table without product_name column
      db.prepare(`
        CREATE TABLE sale_items_old (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL CHECK(quantity > 0),
          price DECIMAL(10,2) NOT NULL CHECK(price >= 0),
          discount_percent DECIMAL(5,2) DEFAULT 0 CHECK(discount_percent >= 0 AND discount_percent <= 100),
          tax_percent DECIMAL(5,2) DEFAULT 0 CHECK(tax_percent >= 0 AND tax_percent <= 100),
          total DECIMAL(10,2) NOT NULL CHECK(total >= 0),
          line_total DECIMAL(10,2) NOT NULL CHECK(line_total >= 0),
          returned_quantity INTEGER DEFAULT 0 CHECK(returned_quantity >= 0),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
          CHECK(returned_quantity <= quantity)
        )
      `).run();
      
      // Copy data back (only items with product_id)
      db.prepare(`
        INSERT INTO sale_items_old 
        SELECT id, sale_id, product_id, quantity, price, 
               discount_percent, tax_percent, total, line_total, returned_quantity,
               created_at, updated_at
        FROM sale_items
        WHERE product_id IS NOT NULL
      `).run();
      
      // Drop new table and rename old table
      db.prepare('DROP TABLE sale_items').run();
      db.prepare('ALTER TABLE sale_items_old RENAME TO sale_items').run();
      
      // Recreate indexes
      db.prepare('CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id)').run();
      
      logger.info('Successfully removed product_name column from sale_items table');
      resolve();
      
    } catch (error) {
      logger.error('Rollback failed: Remove product_name column from sale_items table', error);
      reject(error);
    }
  });
}

module.exports = {
  version: '009',
  description: 'Add product_name column to sale_items table for manual items support',
  up,
  down,
  dependencies: []
}; 