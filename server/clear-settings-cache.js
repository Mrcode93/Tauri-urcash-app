const { query, queryOne, update } = require('./database');
const logger = require('./utils/logger');

async function clearSettingsCache() {
  try {
    logger.info('Clearing settings cache and updating menu items...');
    
    // Get current settings
    const settings = queryOne('SELECT * FROM settings WHERE id = 1');
    
    if (!settings) {
      logger.error('No settings found');
      return;
    }
    
    // Parse current menu items
    let menuItems = [];
    try {
      if (settings.sidebar_menu_items) {
        menuItems = JSON.parse(settings.sidebar_menu_items);
      }
    } catch (error) {
      logger.warn('Failed to parse existing menu items, starting fresh');
      menuItems = [];
    }
    
    // Update inventory menu item name from "المخزون" to "المنتجات"
    const updatedMenuItems = menuItems.map(item => {
      if (item.id === 'inventory' && item.name === 'المخزون') {
        return { ...item, name: 'المنتجات' };
      }
      return item;
    });
    
    // Update settings in database
    const updateResult = update(`
      UPDATE settings 
      SET sidebar_menu_items = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = 1
    `, [JSON.stringify(updatedMenuItems)]);
    
    logger.info('Settings cache cleared and menu items updated successfully');
    logger.info('Updated menu items:', JSON.stringify(updatedMenuItems, null, 2));
    
  } catch (error) {
    logger.error('Error clearing settings cache:', error);
  }
}

// Run the function
clearSettingsCache().then(() => {
  logger.info('Settings cache clear operation completed');
  process.exit(0);
}).catch(error => {
  logger.error('Failed to clear settings cache:', error);
  process.exit(1);
}); 