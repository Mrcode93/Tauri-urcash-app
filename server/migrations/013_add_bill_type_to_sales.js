const db = require('../database');

const version = '013';
const description = 'Add bill_type column to sales table';

async function up(db) {
  try {
    // Add bill_type column to sales table
    db.prepare(`
      ALTER TABLE sales 
      ADD COLUMN bill_type TEXT 
      CHECK(bill_type IN ('retail', 'wholesale')) 
      DEFAULT 'retail'
    `).run();

    console.log('✅ Added bill_type column to sales table');
    return true;
  } catch (error) {
    console.error('❌ Error adding bill_type column:', error.message);
    return false;
  }
}

async function down(db) {
  try {
    // Note: SQLite doesn't support DROP COLUMN directly
    // This would require recreating the table, which is complex
    console.log('⚠️  Cannot drop bill_type column in SQLite without recreating table');
    return false;
  } catch (error) {
    console.error('❌ Error dropping bill_type column:', error.message);
    return false;
  }
}

module.exports = { version, description, up, down }; 