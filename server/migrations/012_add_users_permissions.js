const logger = require('../utils/logger');

module.exports = {
  version: '012',
  description: 'Add users.permissions permission',
  up: async (db) => {
    try {
      // Check if the permission already exists
      const existingPermission = db.prepare('SELECT * FROM permissions WHERE permission_id = ?').get('users.permissions');
      
      if (!existingPermission) {
        // Insert the missing permission
        db.prepare(`
          INSERT INTO permissions (permission_id, name, description, category) 
          VALUES (?, ?, ?, ?)
        `).run('users.permissions', 'إدارة صلاحيات المستخدمين', 'إدارة صلاحيات المستخدمين', 'users');
        
        logger.info('Added users.permissions permission');
      }

      // Add role permissions for admin users
      const adminRolePermission = db.prepare('SELECT * FROM role_permissions WHERE role = ? AND permission_id = ?').get('admin', 'users.permissions');
      
      if (!adminRolePermission) {
        db.prepare(`
          INSERT INTO role_permissions (role, permission_id) 
          VALUES (?, ?)
        `).run('admin', 'users.permissions');
        
        logger.info('Added users.permissions to admin role');
      }

      // Grant the permission to existing admin users
      const adminUsers = db.prepare('SELECT id FROM users WHERE role = ?').all('admin');
      
      for (const adminUser of adminUsers) {
        const existingUserPermission = db.prepare('SELECT * FROM user_permissions WHERE user_id = ? AND permission_id = ?').get(adminUser.id, 'users.permissions');
        
        if (!existingUserPermission) {
          db.prepare(`
            INSERT INTO user_permissions 
            (user_id, permission_id, granted_by, is_active, granted_at) 
            VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
          `).run(adminUser.id, 'users.permissions', adminUser.id);
        }
      }
      
      logger.info(`Granted users.permissions to ${adminUsers.length} admin users`);
      
      return true;
    } catch (error) {
      logger.error('Migration 012 failed:', error);
      throw error;
    }
  },
  
  down: async (db) => {
    try {
      // Remove user permissions
      db.prepare('DELETE FROM user_permissions WHERE permission_id = ?').run('users.permissions');
      
      // Remove role permissions
      db.prepare('DELETE FROM role_permissions WHERE permission_id = ?').run('users.permissions');
      
      // Remove the permission
      db.prepare('DELETE FROM permissions WHERE permission_id = ?').run('users.permissions');
      
      logger.info('Removed users.permissions permission');
      return true;
    } catch (error) {
      logger.error('Migration 012 rollback failed:', error);
      throw error;
    }
  }
}; 