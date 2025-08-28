const BaseService = require('./baseService');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { jwtSecret } = require('../config');
const logger = require('../utils/logger');
const { queryOne, query, insert, update } = require('../database');

class AuthService extends BaseService {
  constructor() {
    super('users');
  }

  register({ username, password, name, role }) {
    try {
      // Check if username already exists
      const existingUser = this.findByUsername(username);
      if (existingUser) {
        throw new Error('Username already registered');
      }

      // Hash password
      const hashedPassword = bcrypt.hashSync(password, 10);

      // Create user with no permissions by default
      const userId = insert(
        'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
        [username, hashedPassword, name, role || 'user']
      );

      const user = this.getById(userId);

      // Generate token
      const token = this.generateToken(user);

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return { ...userWithoutPassword, token };
    } catch (err) {
      logger.error('Registration error:', err);
      throw err;
    }
  }

  login({ username, password }) {
    try {
      const user = this.findByUsername(username);
      if (!user || !bcrypt.compareSync(password, user.password)) {
        throw new Error('Invalid username or password');
      }

      // Generate token
      const token = this.generateToken(user);

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return { ...userWithoutPassword, token };
    } catch (err) {
      logger.error('Login error:', err);
      throw err;
    }
  }

  findByUsername(username) {
    try {
      return queryOne('SELECT * FROM users WHERE username = ?', [username]);
    } catch (err) {
      logger.error('Find by username error:', err);
      throw err;
    }
  }

  generateToken(user) {
    return jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        name: user.name 
      }, 
      jwtSecret, 
      { expiresIn: '7d' }
    );
  }

  getUserById(id) {
    try {
      const user = queryOne('SELECT * FROM users WHERE id = ?', [id]);
      if (!user) {
        throw new Error('User not found');
      }
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (err) {
      logger.error('Get user by ID error:', err);
      throw err;
    }
  }

  // Admin management methods
  getUsers(role) {
    try {
      let sql = 'SELECT id, username, name, role, created_at FROM users';
      const params = [];

      if (role) {
        sql += ' WHERE role = ?';
        params.push(role);
      }

      sql += ' ORDER BY created_at DESC';
      
      return query(sql, params);
    } catch (err) {
      logger.error('Get users error:', err);
      throw err;
    }
  }

  createUser({ username, password, name, role, permissions = [] }) {
    try {
      // Check if username already exists
      const existingUser = this.findByUsername(username);
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Hash password
      const hashedPassword = bcrypt.hashSync(password, 10);

      // Create user
      const userId = insert(
        'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
        [username, hashedPassword, name, role]
      );

      // Only grant permissions if explicitly provided AND user is admin
      // Regular users (user/manager) will get no permissions by default
      if (permissions && permissions.length > 0 && role === 'admin') {
        for (const permissionId of permissions) {
          // Check if permission exists
          const permission = queryOne('SELECT * FROM permissions WHERE permission_id = ?', [permissionId]);
          if (permission) {
            insert(`
              INSERT INTO user_permissions 
              (user_id, permission_id, granted_by, is_active, granted_at) 
              VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
            `, [userId, permissionId, userId]); // Self-granted for now
          }
        }
      }

      const user = queryOne('SELECT * FROM users WHERE id = ?', [userId]);

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (err) {
      logger.error('Create user error:', err);
      throw err;
    }
  }

  updateUser(id, { username, password, name, role }) {
    try {
      const user = queryOne('SELECT * FROM users WHERE id = ?', [id]);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if new username is already taken by another user
      if (username && username !== user.username) {
        const existingUser = this.findByUsername(username);
        if (existingUser) {
          throw new Error('Username already exists');
        }
      }

      const updates = [];
      const values = [];
      if (username) { updates.push('username = ?'); values.push(username); }
      if (password) { updates.push('password = ?'); values.push(bcrypt.hashSync(password, 10)); }
      if (name) { updates.push('name = ?'); values.push(name); }
      if (role) { updates.push('role = ?'); values.push(role); }

      if (updates.length === 0) return user;

      values.push(id);
      update(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

      const updated = queryOne('SELECT * FROM users WHERE id = ?', [id]);
      const { password: _, ...userWithoutPassword } = updated;
      return userWithoutPassword;
    } catch (err) {
      logger.error('Update user error:', err);
      throw err;
    }
  }

  deleteUser(id) {
    try {
      const user = queryOne('SELECT * FROM users WHERE id = ?', [id]);
      if (!user) {
        throw new Error('User not found');
      }

      // Prevent deleting the last admin
      if (user.role === 'admin') {
        const adminCount = queryOne('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin']);
        if (adminCount.count <= 1) {
          throw new Error('Cannot delete the last admin user');
        }
      }

      update('DELETE FROM users WHERE id = ?', [id]);
      return true;
    } catch (err) {
      logger.error('Delete user error:', err);
      throw err;
    }
  }

  resetDatabase() {
    try {
      const tables = query(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        AND name NOT LIKE 'sqlite_%'
      `);

      tables.forEach(table => {
        update(`DELETE FROM ${table.name}`, []);
      });

      update('DELETE FROM sqlite_sequence', []);

      logger.info('Database reset completed');
      return true;
    } catch (err) {
      logger.error('Reset database error:', err);
      throw new Error('Failed to reset database');
    }
  }

  // Permission Management Methods
  getUserPermissions(userId) {
    try {
      // Getting user permissions
      
      // Get user info
      const user = this.getById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      // Found user with role

      let rolePermissions = [];
      
      // Only admin users get role-based permissions automatically
      if (user.role === 'admin') {
        // Querying role permissions
        rolePermissions = query(`
          SELECT rp.permission_id 
          FROM role_permissions rp 
          WHERE rp.role = ?
        `, [user.role]);
        // Admin role permissions
      } else {
        // User role - no automatic role permissions
      }

      // Querying custom permissions
      const customPermissions = query(`
        SELECT up.permission_id 
        FROM user_permissions up 
        WHERE up.user_id = ? AND up.is_active = 1 
        AND (up.expires_at IS NULL OR up.expires_at > datetime('now'))
      `, [userId]);
      // Custom permissions

      // Combine role and custom permissions
      const allPermissions = [
        ...rolePermissions.map(p => p.permission_id),
        ...customPermissions.map(p => p.permission_id)
      ];

      // Remove duplicates
      const result = [...new Set(allPermissions)];
      // Final permissions
      return result;
    } catch (err) {
      logger.error('Get user permissions error:', err);
      throw err;
    }
  }

  hasPermission(userId, permissionId) {
    try {
      const permissions = this.getUserPermissions(userId);
      return permissions.includes(permissionId);
    } catch (err) {
      logger.error('Check permission error:', err);
      return false;
    }
  }

  grantPermission(userId, permissionId, grantedBy, expiresAt = null) {
    try {
      // Check if permission exists
      const permission = queryOne('SELECT * FROM permissions WHERE permission_id = ?', [permissionId]);
      if (!permission) {
        throw new Error('Permission not found');
      }

      // Check if user exists
      const user = this.getById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Insert or update user permission
      insert(`
        INSERT OR REPLACE INTO user_permissions 
        (user_id, permission_id, granted_by, expires_at, is_active, granted_at) 
        VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      `, [userId, permissionId, grantedBy, expiresAt]);

      logger.info(`Permission ${permissionId} granted to user ${userId} by ${grantedBy}`);
      return true;
    } catch (err) {
      logger.error('Grant permission error:', err);
      throw err;
    }
  }

  revokePermission(userId, permissionId, revokedBy) {
    try {
      // Check if user exists
      const user = this.getById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Deactivate user permission
      update(`
        UPDATE user_permissions 
        SET is_active = 0 
        WHERE user_id = ? AND permission_id = ?
      `, [userId, permissionId]);

      logger.info(`Permission ${permissionId} revoked from user ${userId} by ${revokedBy}`);
      return true;
    } catch (err) {
      logger.error('Revoke permission error:', err);
      throw err;
    }
  }

  revokeRolePermission(userId, permissionId, revokedBy) {
    try {
      // Check if user exists
      const user = this.getById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if permission is a role permission
      const rolePermission = queryOne(`
        SELECT * FROM role_permissions 
        WHERE role = ? AND permission_id = ?
      `, [user.role, permissionId]);

      if (!rolePermission) {
        throw new Error('Permission is not a role permission');
      }

      // Create a user permission override to revoke the role permission
      insert(`
        INSERT OR REPLACE INTO user_permissions 
        (user_id, permission_id, granted_by, is_active, granted_at) 
        VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP)
      `, [userId, permissionId, revokedBy]);

      logger.info(`Role permission ${permissionId} revoked from user ${userId} by ${revokedBy}`);
      return true;
    } catch (err) {
      logger.error('Revoke role permission error:', err);
      throw err;
    }
  }

  getAllPermissions() {
    try {
      return query(`
        SELECT * FROM permissions 
        WHERE is_active = 1 
        ORDER BY category, name
      `);
    } catch (err) {
      logger.error('Get all permissions error:', err);
      throw err;
    }
  }

  getPermissionsGroupedByCategory() {
    try {
      const permissions = query(`
        SELECT * FROM permissions 
        WHERE is_active = 1 
        ORDER BY category, name
      `);
      const grouped = {};
      
      permissions.forEach(permission => {
        if (!grouped[permission.category]) {
          grouped[permission.category] = [];
        }
        grouped[permission.category].push(permission);
      });
      
      return grouped;
    } catch (err) {
      logger.error('Get permissions grouped by category error:', err);
      throw err;
    }
  }

  getPermissionsByCategory(category) {
    try {
      return query(`
        SELECT * FROM permissions 
        WHERE category = ? AND is_active = 1 
        ORDER BY name
      `, [category]);
    } catch (err) {
      logger.error('Get permissions by category error:', err);
      throw err;
    }
  }

  getUserPermissionsWithDetails(userId) {
    try {
      logger.debug(`getUserPermissionsWithDetails: Starting for user ${userId}`);
      
      const user = this.getById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      logger.debug(`getUserPermissionsWithDetails: Found user with role ${user.role}`);

      // Get role-based permissions with details
      logger.debug(`getUserPermissionsWithDetails: Querying role permissions for role ${user.role}`);
      const rolePermissions = query(`
        SELECT p.*, 'role' as source, rp.role
        FROM permissions p
        JOIN role_permissions rp ON p.permission_id = rp.permission_id
        WHERE rp.role = ?
      `, [user.role]);
      logger.debug(`getUserPermissionsWithDetails: Role permissions count: ${rolePermissions.length}`);

      // Get custom user permissions with details
      logger.debug(`getUserPermissionsWithDetails: Querying custom permissions for user ${userId}`);
      const customPermissions = query(`
        SELECT p.*, 'custom' as source, up.granted_at, up.expires_at, up.granted_by,
               g.name as granted_by_name
        FROM permissions p
        JOIN user_permissions up ON p.permission_id = up.permission_id
        LEFT JOIN users g ON up.granted_by = g.id
        WHERE up.user_id = ? AND up.is_active = 1
        AND (up.expires_at IS NULL OR up.expires_at > datetime('now'))
      `, [userId]);
      logger.debug(`getUserPermissionsWithDetails: Custom permissions count: ${customPermissions.length}`);

      const result = {
        role: user.role,
        rolePermissions,
        customPermissions,
        allPermissions: [...rolePermissions, ...customPermissions]
      };
      
      logger.debug(`getUserPermissionsWithDetails: Returning result with ${result.allPermissions.length} total permissions`);
      return result;
    } catch (err) {
      logger.error('Get user permissions with details error:', err);
      throw err;
    }
  }

  updateRolePermissions(role, permissionIds) {
    try {
      // Remove existing role permissions
      update('DELETE FROM role_permissions WHERE role = ?', [role]);

      // Add new role permissions
      for (const permissionId of permissionIds) {
        insert('INSERT INTO role_permissions (role, permission_id) VALUES (?, ?)', [role, permissionId]);
      }

      logger.info(`Role permissions updated for role: ${role}`);
      return true;
    } catch (err) {
      logger.error('Update role permissions error:', err);
      throw err;
    }
  }

  getRolePermissions(role) {
    try {
      return query(`
        SELECT p.* 
        FROM permissions p
        JOIN role_permissions rp ON p.permission_id = rp.permission_id
        WHERE rp.role = ? AND p.is_active = 1
        ORDER BY p.category, p.name
      `, [role]);
    } catch (err) {
      logger.error('Get role permissions error:', err);
      throw err;
    }
  }

  createPermission(permissionData) {
    try {
      const { permission_id, name, description, category } = permissionData;
      
      const permissionId = insert(`
        INSERT INTO permissions (permission_id, name, description, category) 
        VALUES (?, ?, ?, ?)
      `, [permission_id, name, description, category]);

      logger.info(`Permission created: ${permission_id}`);
      return this.getById(permissionId);
    } catch (err) {
      logger.error('Create permission error:', err);
      throw err;
    }
  }

  updatePermission(permissionId, permissionData) {
    try {
      const { name, description, category, is_active } = permissionData;
      
      const updates = [];
      const values = [];
      
      if (name) { updates.push('name = ?'); values.push(name); }
      if (description) { updates.push('description = ?'); values.push(description); }
      if (category) { updates.push('category = ?'); values.push(category); }
      if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active); }
      
      if (updates.length === 0) return this.getById(permissionId);
      
      values.push(permissionId);
      update(`UPDATE permissions SET ${updates.join(', ')}, updated_at = datetime('now') WHERE permission_id = ?`, values);
      
      logger.info(`Permission updated: ${permissionId}`);
      return this.getById(permissionId);
    } catch (err) {
      logger.error('Update permission error:', err);
      throw err;
    }
  }

  deletePermission(permissionId) {
    try {
      // Check if permission is used by any users or roles
      const userCount = queryOne('SELECT COUNT(*) as count FROM user_permissions WHERE permission_id = ?', [permissionId]);
      const roleCount = queryOne('SELECT COUNT(*) as count FROM role_permissions WHERE permission_id = ?', [permissionId]);
      
      if (userCount.count > 0 || roleCount.count > 0) {
        throw new Error('Cannot delete permission that is assigned to users or roles');
      }
      
      update('DELETE FROM permissions WHERE permission_id = ?', [permissionId]);
      
      logger.info(`Permission deleted: ${permissionId}`);
      return true;
    } catch (err) {
      logger.error('Delete permission error:', err);
      throw err;
    }
  }
}

module.exports = new AuthService();