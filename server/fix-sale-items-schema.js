const { db } = require('./database');
const MigrationRunner = require('./migrations/migrationRunner');
const logger = require('./utils/logger');

/**
 * Script to fix the sale_items table schema
 * This script runs the migration to add the product_name column
 */

async function fixSaleItemsSchema() {
  try {
    
    
    // Check current table structure
    const tableInfo = db.prepare("PRAGMA table_info(sale_items)").all();
    
    tableInfo.forEach(col => {
      `);
    });
    
    // Check if product_name column exists
    const hasProductName = tableInfo.some(col => col.name === 'product_name');
    
    if (hasProductName) {
      
      return;
    }
    
    
    
    // Run the migration
    const migrationRunner = new MigrationRunner(db);
    await migrationRunner.runMigrations();
    
    // Verify the fix
    const newTableInfo = db.prepare("PRAGMA table_info(sale_items)").all();
    const hasProductNameAfter = newTableInfo.some(col => col.name === 'product_name');
    
    if (hasProductNameAfter) {
      
      
      newTableInfo.forEach(col => {
        `);
      });
    } else {
      
    }
    
  } catch (error) {
    console.error('Error fixing sale_items schema:', error);
    throw error;
  }
}

// Run the fix
fixSaleItemsSchema()
  .then(() => {
    
    process.exit(0);
  })
  .catch((error) => {
    console.error('Sale items schema fix failed:', error);
    process.exit(1);
  }); 