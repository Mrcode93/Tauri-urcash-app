const logger = require('../utils/logger');

function up(db) {
  return new Promise((resolve, reject) => {
    try {
      logger.info('Starting migration: Add stocks menu item to settings');
      
      // Get current settings
      const settings = db.prepare('SELECT sidebar_menu_items FROM settings WHERE id = 1').get();
      
      if (!settings) {
        logger.info('No settings found, skipping migration');
        resolve();
        return;
      }
      
      let menuItems = [];
      try {
        if (settings.sidebar_menu_items) {
          menuItems = JSON.parse(settings.sidebar_menu_items);
        }
      } catch (error) {
        logger.warn('Failed to parse existing menu items, starting fresh');
        menuItems = [];
      }
      
      // Check if stocks menu item already exists
      const stocksExists = menuItems.some(item => item.id === 'stocks');
      
      if (stocksExists) {
        logger.info('Stocks menu item already exists, skipping migration');
        resolve();
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
      
      logger.info('Successfully added stocks menu item to settings');
      resolve();
      
    } catch (error) {
      logger.error('Migration failed:', error);
      reject(error);
    }
  });
}

function down(db) {
  return new Promise((resolve, reject) => {
    try {
      logger.info('Rolling back migration: Remove stocks menu item from settings');
      
      // Get current settings
      const settings = db.prepare('SELECT sidebar_menu_items FROM settings WHERE id = 1').get();
      
      if (!settings || !settings.sidebar_menu_items) {
        logger.info('No settings or menu items found, nothing to rollback');
        resolve();
        return;
      }
      
      let menuItems = [];
      try {
        menuItems = JSON.parse(settings.sidebar_menu_items);
      } catch (error) {
        logger.warn('Failed to parse menu items during rollback');
        resolve();
        return;
      }
      
      // Remove stocks menu item
      const filteredMenuItems = menuItems.filter(item => item.id !== 'stocks');
      
      // Update the settings
      db.prepare(`
        UPDATE settings 
        SET sidebar_menu_items = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = 1
      `).run(JSON.stringify(filteredMenuItems));
      
      logger.info('Successfully removed stocks menu item from settings');
      resolve();
      
    } catch (error) {
      logger.error('Rollback failed:', error);
      reject(error);
    }
  });
}

module.exports = {
  version: '004',
  description: 'Add stocks menu item to settings sidebar_menu_items',
  up,
  down,
  dependencies: []
}; 