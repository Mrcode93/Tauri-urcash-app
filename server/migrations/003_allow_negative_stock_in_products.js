const logger = require('../utils/logger');

/**
 * Migration: Allow negative stock in products (remove CHECK constraint on current_stock)
 * 
 * This migration removes the CHECK constraint on current_stock in the products table
 * to allow negative stock values. This enables sales to proceed even when stock
 * is insufficient, allowing the stock to go below zero.
 */

function up(db) {
  return new Promise((resolve, reject) => {
    try {
      logger.info('Starting migration: Allow negative stock in products table');
      
      // 1. Create new table without the CHECK constraint
      db.prepare(`
        CREATE TABLE IF NOT EXISTS products (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      scientific_name TEXT,
      description TEXT,
      supported BOOLEAN DEFAULT true,
      sku TEXT UNIQUE NOT NULL COLLATE NOCASE,
      barcode TEXT UNIQUE COLLATE NOCASE,
      purchase_price DECIMAL(10,2) NOT NULL CHECK(purchase_price >= 0),
      selling_price DECIMAL(10,2) NOT NULL CHECK(selling_price >= 0),
      wholesale_price DECIMAL(10,2) NOT NULL CHECK(wholesale_price >= 0),
      company_name TEXT,
      current_stock INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 0 CHECK(min_stock >= 0),
      max_stock INTEGER CHECK(max_stock >= min_stock),
      total_sold INTEGER NOT NULL DEFAULT 0 CHECK(total_sold >= 0),
      total_purchased INTEGER NOT NULL DEFAULT 0 CHECK(total_purchased >= 0),
      unit TEXT NOT NULL DEFAULT 'قطعة',
      units_per_box INTEGER NOT NULL DEFAULT 1 CHECK(units_per_box > 0),
      is_dolar BOOLEAN DEFAULT FALSE,
      expiry_date DATE,
      is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
      last_purchase_date DATE,
      last_purchase_price DECIMAL(10,2),
      average_cost DECIMAL(10,2) DEFAULT 0,
      reorder_point INTEGER DEFAULT 0,
      category_id INTEGER,
      stock_id INTEGER,
      location_in_stock TEXT,
      shelf_number TEXT,
      rack_number TEXT,
      bin_number TEXT,
      last_stock_check DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE SET NULL,
      CHECK(selling_price >= purchase_price)
        )
      `).run();

      // 2. Copy data from old table
      db.prepare(`
        INSERT INTO products (
          id, name, scientific_name, description, supported, sku, barcode, purchase_price, selling_price, wholesale_price, company_name, current_stock, min_stock, max_stock, total_sold, total_purchased, unit, units_per_box, is_dolar, expiry_date, is_active, last_purchase_date, last_purchase_price, average_cost, reorder_point, category_id, stock_id, location_in_stock, shelf_number, rack_number, bin_number, last_stock_check, created_at, updated_at
        )
        SELECT id, name, scientific_name, description, supported, sku, barcode, purchase_price, selling_price, wholesale_price, company_name, current_stock, min_stock, max_stock, total_sold, total_purchased, unit, units_per_box, is_dolar, expiry_date, is_active, last_purchase_date, last_purchase_price, average_cost, reorder_point, category_id, stock_id, location_in_stock, shelf_number, rack_number, bin_number, last_stock_check, created_at, updated_at
        FROM products
      `).run();

      // 3. Drop old table
      db.prepare('DROP TABLE products').run();

      // 4. Rename new table
      db.prepare('ALTER TABLE products RENAME TO products_old').run();
      
      logger.info('Successfully removed CHECK constraint on current_stock in products table');
      resolve();
      
    } catch (error) {
      logger.error('Migration failed: Allow negative stock in products table', error);
      reject(error);
    }
  });
}

function down(db) {
  return new Promise((resolve, reject) => {
    try {
      logger.info('Rolling back migration: Restore CHECK constraint on current_stock in products table');
      
      // Note: This rollback is complex and potentially dangerous
      // It would require recreating the table with the constraint
      // For safety, we'll just log that this migration cannot be easily rolled back
      logger.warn('Rollback not implemented for CHECK constraint restoration. Manual intervention required.');
      logger.warn('To rollback: recreate products table with CHECK(current_stock >= 0) constraint and restore data');
      
      resolve();
      
    } catch (error) {
      logger.error('Rollback failed: Restore CHECK constraint on current_stock in products table', error);
      reject(error);
    }
  });
}

module.exports = {
  version: '003',
  description: 'Allow negative stock in products table (remove CHECK constraint on current_stock)',
  up,
  down,
  dependencies: []
}; 