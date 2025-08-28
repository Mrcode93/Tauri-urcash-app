const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'database.sqlite');

// Connect to database
const db = new sqlite3.Database(dbPath);

// Function to grant permission
function grantPermission(userId, permissionId, grantedBy = 1) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT OR REPLACE INTO user_permissions 
      (user_id, permission_id, granted_by, is_active, granted_at) 
      VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
    `;
    
    db.run(query, [userId, permissionId, grantedBy], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

// Function to check if user exists
function checkUser(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id, username, name, role FROM users WHERE id = ?', [userId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Function to check if permission exists
function checkPermission(permissionId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT permission_id, name FROM permissions WHERE permission_id = ?', [permissionId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Main execution
async function main() {
  const userId = process.argv[2] || 2; // Default to user ID 2 (amer)
  const permissionId = process.argv[3] || 'users.permissions';
  
  try {
    
    const user = await checkUser(userId);
    if (!user) {
      console.error('❌ User not found with ID:', userId);
      process.exit(1);
    }
     - Role: ${user.role}`);
    
    
    const permission = await checkPermission(permissionId);
    if (!permission) {
      console.error('❌ Permission not found:', permissionId);
      process.exit(1);
    }
    
    
    
    await grantPermission(userId, permissionId);
    
    
    
    `);
    `);
    `);
    
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run the script
main(); 