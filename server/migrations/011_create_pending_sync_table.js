const Database = require('better-sqlite3');

module.exports = {
  version: '011',
  description: 'Create pending_sync table for mobile live data',
  
  up: function(db) {
    try {
      // Create pending_sync table for storing data locally when remote server is not available
      db.prepare(`
        CREATE TABLE IF NOT EXISTS pending_sync (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL,
          data TEXT NOT NULL,
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed')),
          error_message TEXT,
          retry_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          synced_at DATETIME
        )
      `).run();

      // Create indexes
      db.prepare('CREATE INDEX IF NOT EXISTS idx_pending_sync_userId ON pending_sync(userId)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_pending_sync_status ON pending_sync(status)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_pending_sync_created_at ON pending_sync(created_at)').run();

      
    } catch (error) {
      console.error('❌ Error creating pending_sync table:', error);
      throw error;
    }
  },

  down: function(db) {
    try {
      db.prepare('DROP TABLE IF EXISTS pending_sync').run();
      
    } catch (error) {
      console.error('❌ Error dropping pending_sync table:', error);
      throw error;
    }
  }
}; 