const Database = require('better-sqlite3');
const path = require('path');
const logger = require('./utils/logger');

async function updateUserPermissions() {
  try {
    logger.info('Starting user permissions update...');
    
    // Connect to database
    const dbPath = path.join(__dirname, 'database.sqlite');
    const db = new Database(dbPath);
    
    // Get all users
    const users = db.prepare('SELECT id, username, role FROM users').all();
    logger.info(`Found ${users.length} users to update`);
    
    for (const user of users) {
      logger.info(`Updating permissions for user: ${user.username} (role: ${user.role})`);
      
      // Only admin users get role permissions automatically
      if (user.role === 'admin') {
        // Get role permissions for admin role
        const rolePermissions = db.prepare(`
          SELECT permission_id FROM role_permissions WHERE role = ?
        `).all(user.role);
        
        logger.info(`Found ${rolePermissions.length} role permissions for admin role`);
        
        // Grant each role permission to the admin user
        for (const rolePermission of rolePermissions) {
          // Check if user already has this permission
          const existingPermission = db.prepare(`
            SELECT * FROM user_permissions 
            WHERE user_id = ? AND permission_id = ?
          `).get(user.id, rolePermission.permission_id);
          
          if (!existingPermission) {
            // Grant the permission
            db.prepare(`
              INSERT INTO user_permissions 
              (user_id, permission_id, granted_by, is_active, granted_at) 
              VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
            `).run(user.id, rolePermission.permission_id, user.id);
            
            logger.info(`Granted permission ${rolePermission.permission_id} to admin user ${user.username}`);
          } else {
            logger.info(`Admin user ${user.username} already has permission ${rolePermission.permission_id}`);
          }
        }
      } else {
        logger.info(`User ${user.username} has role ${user.role} - no automatic role permissions assigned`);
      }
    }
    
    logger.info('User permissions update completed successfully');
    
  } catch (error) {
    logger.error('Error updating user permissions:', error);
  } finally {
    if (db) {
      db.close();
    }
  }
}

// Run the update
updateUserPermissions(); 