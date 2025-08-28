const { db } = require('../database/index.js');
const logger = require('../utils/logger');

/**
 * Migration: Fix SKU unique constraint to allow same product in multiple stocks
 * 
 * The current schema has a UNIQUE constraint on SKU, but we need to allow
 * the same product (with the same SKU) to exist in multiple stocks.
 * We'll change this to a composite unique constraint on (sku, stock_id).
 */

async function up() {
  try {
    logger.info('Starting migration: Fix SKU unique constraint');

    // Drop the existing unique constraint on SKU
    db.prepare('DROP INDEX IF EXISTS sqlite_autoindex_products_1').run();
    db.prepare('DROP INDEX IF EXISTS idx_products_sku').run();

    // Create a composite unique constraint on (sku, stock_id)
    // This allows the same SKU to exist in different stocks
    db.prepare(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_stock 
      ON products(sku, stock_id) 
      WHERE stock_id IS NOT NULL
    `).run();

    // Create a separate unique constraint for products without stock_id
    db.prepare(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_no_stock 
      ON products(sku) 
      WHERE stock_id IS NULL
    `).run();

    // Create a regular index on SKU for performance
    db.prepare('CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)').run();

    logger.info('✅ Migration completed: Fixed SKU unique constraint');
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    throw error;
  }
}

async function down() {
  try {
    logger.info('Rolling back migration: Fix SKU unique constraint');

    // Drop the new composite constraints
    db.prepare('DROP INDEX IF EXISTS idx_products_sku_stock').run();
    db.prepare('DROP INDEX IF EXISTS idx_products_sku_no_stock').run();
    db.prepare('DROP INDEX IF EXISTS idx_products_sku').run();

    // Recreate the original unique constraint on SKU
    db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(sku)').run();

    logger.info('✅ Rollback completed: Restored original SKU unique constraint');
  } catch (error) {
    logger.error('❌ Rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down };
