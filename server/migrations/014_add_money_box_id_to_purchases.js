const db = require('../database');

const version = '014';
const description = 'Add money_box_id column to purchases table';

async function up(db) {
  try {
    // Add money_box_id column to purchases table
    db.prepare(`
      ALTER TABLE purchases 
      ADD COLUMN money_box_id TEXT
    `).run();
    
    console.log('✅ Added money_box_id column to purchases table');
    return true;
  } catch (error) {
    console.error('❌ Error adding money_box_id column:', error.message);
    return false;
  }
}

async function down(db) {
  try {
    // Note: SQLite doesn't support DROP COLUMN directly
    // This would require recreating the table, which is complex
    console.log('⚠️  Cannot drop money_box_id column in SQLite without recreating table');
    return false;
  } catch (error) {
    console.error('❌ Error dropping money_box_id column:', error.message);
    return false;
  }
}

module.exports = { version, description, up, down };
