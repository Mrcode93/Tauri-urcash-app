#!/usr/bin/env node

const { db } = require('./database');
const logger = require('./utils/logger');

/**
 * Manual script to add stocks menu item to existing databases
 * This script can be run independently to update existing installations
 */

async function applyStocksMigration() {
  try {
    
    
    // Get current settings
    const settings = db.prepare('SELECT sidebar_menu_items FROM settings WHERE id = 1').get();
    
    if (!settings) {
      
      return;
    }
    
    let menuItems = [];
    try {
      if (settings.sidebar_menu_items) {
        menuItems = JSON.parse(settings.sidebar_menu_items);
      }
    } catch (error) {
      
      menuItems = [];
    }
    
    // Check if stocks menu item already exists
    const stocksExists = menuItems.some(item => item.id === 'stocks');
    
    if (stocksExists) {
      
      return;
    }
    
    // Find the position to insert stocks (after inventory, before customers)
    const inventoryIndex = menuItems.findIndex(item => item.id === 'inventory');
    const insertIndex = inventoryIndex !== -1 ? inventoryIndex + 1 : menuItems.length;
    
    // Create the stocks menu item
    const stocksMenuItem = {
      id: 'stocks',
      name: 'المخازن',
      path: '/stocks',
      icon: 'Warehouse',
      enabled: true,
      active: true
    };
    
    // Insert the stocks menu item
    menuItems.splice(insertIndex, 0, stocksMenuItem);
    
    // Update the settings
    db.prepare(`
      UPDATE settings 
      SET sidebar_menu_items = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = 1
    `).run(JSON.stringify(menuItems));
    
    
    
    menuItems.forEach((item, index) => {
      `);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    logger.error('Stocks migration failed:', error);
  }
}

// Run the migration
applyStocksMigration().then(() => {
  
  process.exit(0);
}).catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
}); 