const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

module.exports = {
  version: '010',
  description: 'Add backup_time setting to settings table',
  
  up: function(db) {
    // Add backup_time column to settings table
    try {
      db.prepare(`
        ALTER TABLE settings 
        ADD COLUMN backup_time TEXT DEFAULT '20:00'
      `).run();
      
      
    } catch (error) {
      // Column might already exist, check if it's a "duplicate column" error
      if (!error.message.includes('duplicate column name')) {
        throw error;
      }
      
    }
  },

  down: function(db) {
    // SQLite doesn't support DROP COLUMN directly, so we'll recreate the table
    // This is a simplified version - in production you'd want to preserve data
    
  }
}; 