const logger = require('../utils/logger');

function up(db) {
  return new Promise((resolve, reject) => {
    try {
      logger.info('Starting migration: Add bills menu item to existing databases');
      
      // Get current settings
      const settings = db.prepare('SELECT sidebar_menu_items FROM settings WHERE id = 1').get();
      
      if (!settings) {
        logger.info('No settings found, skipping migration');
        resolve();
        return;
      }
      
      let menuItems = [];
      try {
        menuItems = JSON.parse(settings.sidebar_menu_items || '[]');
      } catch (error) {
        logger.warn('Failed to parse existing menu items, starting fresh');
        menuItems = [];
      }
      
      // Check if bills menu item already exists
      const billsExists = menuItems.some(item => item.id === 'bills' || item.path === '/bills');
      
      if (billsExists) {
        logger.info('Bills menu item already exists, skipping migration');
        resolve();
        return;
      }
      
      // Find the position to insert bills (after inventory, before stocks)
      const inventoryIndex = menuItems.findIndex(item => item.id === 'inventory' || item.path === '/inventory');
      const insertIndex = inventoryIndex !== -1 ? inventoryIndex + 1 : menuItems.length;
      
      // Create bills menu item
      const billsMenuItem = {
        id: 'bills',
        name: 'الفواتير',
        path: '/bills',
        icon: 'ClipboardList',
        enabled: true,
        active: true
      };
      
      // Insert bills menu item at the correct position
      menuItems.splice(insertIndex, 0, billsMenuItem);
      
      // Remove about menu item if it exists (since we moved it to footer)
      const aboutIndex = menuItems.findIndex(item => item.id === 'about' || item.path === '/about');
      if (aboutIndex !== -1) {
        menuItems.splice(aboutIndex, 1);
        logger.info('Removed about menu item (moved to footer)');
      }
      
      // Update settings with new menu items
      db.prepare(`
        UPDATE settings 
        SET sidebar_menu_items = ?, 
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = 1
      `).run(JSON.stringify(menuItems));
      
      logger.info(`Migration completed successfully. Added bills menu item at position ${insertIndex}`);
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
      logger.info('Rolling back migration: Remove bills menu item');
      
      // Get current settings
      const settings = db.prepare('SELECT sidebar_menu_items FROM settings WHERE id = 1').get();
      
      if (!settings) {
        logger.info('No settings found, nothing to rollback');
        resolve();
        return;
      }
      
      let menuItems = [];
      try {
        menuItems = JSON.parse(settings.sidebar_menu_items || '[]');
      } catch (error) {
        logger.warn('Failed to parse existing menu items, nothing to rollback');
        resolve();
        return;
      }
      
      // Remove bills menu item
      const billsIndex = menuItems.findIndex(item => item.id === 'bills' || item.path === '/bills');
      
      if (billsIndex === -1) {
        logger.info('Bills menu item not found, nothing to remove');
        resolve();
        return;
      }
      
      menuItems.splice(billsIndex, 1);
      
      // Add back about menu item
      const aboutMenuItem = {
        id: 'about',
        name: 'من نحن',
        path: '/about',
        icon: 'Info',
        enabled: true,
        active: true
      };
      
      // Add about at the end
      menuItems.push(aboutMenuItem);
      
      // Update settings
      db.prepare(`
        UPDATE settings 
        SET sidebar_menu_items = ?, 
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = 1
      `).run(JSON.stringify(menuItems));
      
      logger.info('Rollback completed successfully. Removed bills menu item and restored about menu item');
      resolve();
      
    } catch (error) {
      logger.error('Rollback failed:', error);
      reject(error);
    }
  });
}

module.exports = {
  version: '008',
  description: 'Add bills menu item to existing databases and remove about from main menu',
  up,
  down,
  dependencies: []
}; 