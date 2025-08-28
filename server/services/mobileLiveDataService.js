const logger = require('../utils/logger');
const { queryOne, query, insert, update } = require('../database');
const licenseService = require('./licenseService');
const schedulerService = require('./schedulerService');

// Remote server configuration
const REMOTE_SERVER_URL = process.env.REMOTE_SERVER_URL || 'https://urcash.up.railway.app/api';
// const REMOTE_SERVER_URL = 'http://192.168.1.106:3002/api';
class MobileLiveDataService {
  constructor() {
    this.remoteServerUrl = REMOTE_SERVER_URL;
    this.initialized = false;
  }

  /**
   * Initialize the service and ensure required tables exist
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      logger.info('Initializing MobileLiveDataService...');
      
      // Ensure all required tables exist
      await this.ensurePendingSyncTable();
      await this.ensureUploadSchedulesTable();
      await this.ensureAutoUploadSettingsTable();
      
      this.initialized = true;
      logger.info('MobileLiveDataService initialized successfully');
    } catch (error) {
      logger.error('Error initializing MobileLiveDataService:', error);
      throw error;
    }
  }

  /**
   * Get userId from local decrypted license data
   * @returns {Promise<string|null>} User ID from local license or null if not found
   */
  async getUserIdFromLicense() {
    try {
      // Generate device fingerprint
      const fingerprint = await licenseService.generateDeviceFingerprint();
      
      // Check local license only (no remote server calls)
      const licenseResult = await licenseService.checkLocalLicense(fingerprint);
      
      if (licenseResult.success && licenseResult.userId) {
        logger.info(`Retrieved userId from local license: ${licenseResult.userId}`);
        return licenseResult.userId;
      } else {
        logger.warn('No userId found in local license data');
        return null;
      }
    } catch (error) {
      logger.error('Error getting userId from local license:', error);
      return null;
    }
  }

  /**
   * Create a new user on the remote server using userId from license
   * @param {Object} userData - User data containing username and password
   * @returns {Promise<Object>} Response from remote server
   */
  async createUser(userData) {
    try {
      const { username, password, role } = userData;
      
      if (!username || !password) {
        throw new Error('Username and password are required');
      }

      // Get userId from decrypted license data
      const userId = await this.getUserIdFromLicense();
      
      if (!userId) {
        throw new Error('Unable to retrieve userId from license data');
      }

      logger.info(`Creating user on remote server: ${username} with userId: ${userId}`);
      logger.info(`Remote server URL: ${this.remoteServerUrl}/update-user/${userId}`);

      const requestBody = { 
        username, 
        password,
        role,
        userId
      };
      logger.info(`Request body: ${JSON.stringify(requestBody)}`);

      const response = await fetch(`${this.remoteServerUrl}/update-user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to create user: ${response.status} ${response.statusText} - ${errorData.message || ''}`);
      }

      const data = await response.json();
      logger.info(`User created successfully on remote server: ${username} with userId: ${userId}`);
      return data;
    } catch (error) {
      logger.error('Error creating user on remote server:', error);
      throw error;
    }
  }

  /**
   * Get manager users from the remote server using userId from license
   * @returns {Promise<Array>} Array of users
   */
  async getAllUsers() {
    try {
      // Get userId from decrypted license data
      const userId = await this.getUserIdFromLicense();
      
      if (!userId) {
        throw new Error('Unable to retrieve userId from license data');
      }

      logger.info(`Fetching manager users from remote server for userId: ${userId}`);

      const response = await fetch(`${this.remoteServerUrl}/api/users/get-manager-user/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to fetch users: ${response.status} ${response.statusText} - ${errorData.message || ''}`);
      }

      const data = await response.json();
      logger.info(`Successfully fetched manager users from remote server for userId: ${userId}`);
      
      // Handle different response structures
      if (Array.isArray(data.data)) {
        return data.data;
      } else if (data.data && !Array.isArray(data.data)) {
        // If data.data is a single object with users array, return it as is
        // The object represents the main user with sub-users
        return [data.data];
      } else {
        return [];
      }
    } catch (error) {
      logger.error('Error fetching manager users from remote server:', error);
      throw error;
    }
  }

  /**
   * Get a specific user by ID from the remote server
   * @param {string|number} userId - User ID
   * @returns {Promise<Object>} User data
   */
  async getUser(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      logger.info(`Fetching user from remote server: ${userId}`);

      const response = await fetch(`${this.remoteServerUrl}/users/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to fetch user: ${response.status} ${response.statusText} - ${errorData.message || ''}`);
      }

      const data = await response.json();
      logger.info(`Successfully fetched user from remote server: ${userId}`);
      return data.data;
    } catch (error) {
      logger.error(`Error fetching user ${userId} from remote server:`, error);
      throw error;
    }
  }

  /**
   * Update a user on the remote server
   * @param {string|number} userId - User ID
   * @param {Object} userData - Updated user data
   * @returns {Promise<Object>} Updated user data
   */
  async updateUser(userId, userData) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      logger.info(`Updating user on remote server: ${userId}`);

      const response = await fetch(`${this.remoteServerUrl}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to update user: ${response.status} ${response.statusText} - ${errorData.message || ''}`);
      }

      const data = await response.json();
      logger.info(`Successfully updated user on remote server: ${userId}`);
      return data.data;
    } catch (error) {
      logger.error(`Error updating user ${userId} on remote server:`, error);
      throw error;
    }
  }

  /**
   * Delete a user from the remote server
   * @param {string|number} userId - User ID
   * @returns {Promise<Object>} Response from remote server
   */
  async deleteUser(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      logger.info(`Deleting user from remote server: ${userId}`);

      const response = await fetch(`${this.remoteServerUrl}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to delete user: ${response.status} ${response.statusText} - ${errorData.message || ''}`);
      }

      const data = await response.json();
      logger.info(`Successfully deleted user from remote server: ${userId}`);
      return data;
    } catch (error) {
      logger.error(`Error deleting user ${userId} from remote server:`, error);
      throw error;
    }
  }

  /**
   * Upload data to remote server with userId and nested data structure
   * @param {Object} data - Data object with userId and nested data arrays
   * @returns {Promise<Object>} Response from remote server
   */
  async uploadData(data) {
    try {
      if (!data || typeof data !== 'object') {
        throw new Error('Valid data object is required');
      }

      // Get userId from license if not provided
      if (!data.userId) {
        const userId = await this.getUserIdFromLicense();
        if (!userId) {
          throw new Error('Unable to retrieve userId from license data');
        }
        data.userId = userId;
      }

      // Log data structure for debugging
      const dataTypes = Object.keys(data.data || {});
      const recordCounts = {};
      let totalRecords = 0;
      
      for (const dataType of dataTypes) {
        const records = data.data[dataType];
        if (Array.isArray(records)) {
          recordCounts[dataType] = records.length;
          totalRecords += records.length;
        }
      }
      
      logger.info(`Uploading data to remote server for userId: ${data.userId}`);
      logger.info(`Data types: ${dataTypes.join(', ')}`);
      logger.info(`Record counts: ${JSON.stringify(recordCounts)}`);
      logger.info(`Total records: ${totalRecords}`);

      // Log memory usage before upload
      const memoryUsage = process.memoryUsage();
      logger.info(`Memory usage before upload: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB heap, ${Math.round(memoryUsage.rss / 1024 / 1024)}MB RSS`);

      const response = await fetch(`${this.remoteServerUrl}/data/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        // Increase timeout for large uploads
        signal: AbortSignal.timeout(totalRecords > 1000 ? 300000 : 60000) // 5 minutes for large uploads, 1 minute for small
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to upload data: ${response.status} ${response.statusText} - ${errorData.message || ''}`);
      }

      const responseData = await response.json();
      logger.info(`Successfully uploaded ${totalRecords} records to remote server`);
      return responseData;
    } catch (error) {
      logger.error('Error uploading data to remote server:', error);
      throw error;
    }
  }

  /**
   * Upload data to remote server using the correct endpoint
   * @param {Object} data - Data object with userId and nested data arrays
   * @returns {Promise<Object>} Response from remote server
   */
  async uploadDataToRemote(data) {
    try {
      if (!data || typeof data !== 'object') {
        throw new Error('Valid data object is required');
      }

      // Get userId from license if not provided
      if (!data.userId) {
        const userId = await this.getUserIdFromLicense();
        if (!userId) {
          throw new Error('Unable to retrieve userId from license data');
        }
        data.userId = userId;
      }

      // Log data structure for debugging
      const dataTypes = Object.keys(data.data || {});
      const recordCounts = {};
      let totalRecords = 0;
      
      for (const dataType of dataTypes) {
        const records = data.data[dataType];
        if (Array.isArray(records)) {
          recordCounts[dataType] = records.length;
          totalRecords += records.length;
        }
      }
      
      logger.info(`Uploading data to remote server for userId: ${data.userId}`);
      logger.info(`Data types: ${dataTypes.join(', ')}`);
      logger.info(`Record counts: ${JSON.stringify(recordCounts)}`);
      logger.info(`Total records: ${totalRecords}`);

      // Log memory usage before upload
      const memoryUsage = process.memoryUsage();
      logger.info(`Memory usage before upload: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB heap, ${Math.round(memoryUsage.rss / 1024 / 1024)}MB RSS`);

      // Try to upload to remote server endpoint
      let response;
      try {
        response = await fetch(`${this.remoteServerUrl}/mobile-data/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
          // Increase timeout for large uploads
          signal: AbortSignal.timeout(totalRecords > 1000 ? 300000 : 60000) // 5 minutes for large uploads, 1 minute for small
        });
      } catch (fetchError) {
        logger.warn(`Remote server endpoint not available, falling back to local storage: ${fetchError.message}`);
        
        // Fallback: Store data locally for later sync
        const fallbackResult = await this.storeDataLocally(data);
        return {
          success: true,
          message: `Data stored locally for later sync (${totalRecords} records)`,
          count: totalRecords,
          fallback: true,
          localStorage: fallbackResult
        };
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // If endpoint doesn't exist, fall back to local storage
        if (response.status === 404) {
          logger.warn('Remote server endpoint not found, falling back to local storage');
          const fallbackResult = await this.storeDataLocally(data);
          return {
            success: true,
            message: `Data stored locally for later sync (${totalRecords} records)`,
            count: totalRecords,
            fallback: true,
            localStorage: fallbackResult
          };
        }
        
        throw new Error(`Failed to upload data: ${response.status} ${response.statusText} - ${errorData.message || ''}`);
      }

      const responseData = await response.json();
      logger.info(`Successfully uploaded ${totalRecords} records to remote server`);
      return responseData;
    } catch (error) {
      logger.error('Error uploading data to remote server:', error);
      throw error;
    }
  }

  /**
   * Sync local data with remote server
   * @param {string} dataType - Type of data to sync (sales, purchases, inventory, etc.)
   * @returns {Promise<Object>} Sync result
   */
  async syncData(dataType) {
    try {
      // Ensure service is initialized
      await this.initialize();
      
      if (!dataType) {
        throw new Error('Data type is required');
      }

      logger.info(`Starting data sync for: ${dataType}`);

      // Get local data based on type
      const localData = await this.getLocalData(dataType);
      
      if (!localData || localData.length === 0) {
        logger.info(`No local data found for: ${dataType}`);
        return { success: true, message: 'No data to sync', count: 0 };
      }

      // Create data structure with userId and nested data
      const uploadData = {
        data: {
          [dataType]: localData
        }
      };

      // Upload to remote server using the correct endpoint
      const uploadResult = await this.uploadDataToRemote(uploadData);

      logger.info(`Successfully synced ${localData.length} records for: ${dataType}`);
      return {
        success: true,
        message: `Synced ${localData.length} records`,
        count: localData.length,
        result: uploadResult
      };
    } catch (error) {
      logger.error(`Error syncing data for ${dataType}:`, error);
      throw error;
    }
  }

  /**
   * Sync all data types with remote server
   * @returns {Promise<Object>} Sync result for all data types
   */
  async syncAllData() {
    try {
      // Ensure service is initialized
      await this.initialize();
      
      logger.info('Starting sync for all data types');

      const dataTypes = ['sales', 'purchases', 'expenses', 'products', 'suppliers', 'customers', 'debts', 'installments'];
      const syncResults = {};
      let totalRecords = 0;

      for (const dataType of dataTypes) {
        try {
          const localData = await this.getLocalData(dataType);
          
          if (localData && localData.length > 0) {
            syncResults[dataType] = {
              count: localData.length,
              success: true
            };
            totalRecords += localData.length;
          } else {
            syncResults[dataType] = {
              count: 0,
              success: true,
              message: 'No data to sync'
            };
          }
        } catch (error) {
          logger.error(`Error getting local data for ${dataType}:`, error);
          syncResults[dataType] = {
            count: 0,
            success: false,
            error: error.message
          };
        }
      }

      // Create complete data structure
      const allData = {};
      for (const dataType of dataTypes) {
        if (syncResults[dataType].success && syncResults[dataType].count > 0) {
          allData[dataType] = await this.getLocalData(dataType);
        }
      }

      // Upload all data at once using the correct endpoint
      const uploadResult = await this.uploadDataToRemote({
        data: allData
      });

      logger.info(`Successfully synced ${totalRecords} total records across all data types`);
      return {
        success: true,
        message: `Synced ${totalRecords} total records`,
        totalRecords,
        syncResults,
        result: uploadResult
      };
    } catch (error) {
      logger.error('Error syncing all data:', error);
      throw error;
    }
  }

  /**
   * Ensure pending_sync table exists
   * @returns {Promise<void>}
   */
  async ensurePendingSyncTable() {
    try {
      const tableExists = await query("SELECT name FROM sqlite_master WHERE type='table' AND name='pending_sync'");
      
      if (tableExists.length === 0) {
        logger.info('Creating pending_sync table');
        
        const createTableSQL = `
          CREATE TABLE pending_sync (
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
        `;
        
        await query(createTableSQL);
        
        // Create indexes
        await query("CREATE INDEX idx_pending_sync_userId ON pending_sync(userId)");
        await query("CREATE INDEX idx_pending_sync_status ON pending_sync(status)");
        await query("CREATE INDEX idx_pending_sync_created_at ON pending_sync(created_at)");
        
        logger.info('pending_sync table created successfully');
      } else {
        logger.info('pending_sync table already exists');
      }
    } catch (error) {
      logger.error('Error ensuring pending_sync table exists:', error);
      throw error;
    }
  }

  /**
   * Store data locally for later sync when remote server is not available
   * @param {Object} data - Data object with userId and nested data arrays
   * @returns {Promise<Object>} Local storage result
   */
  async storeDataLocally(data) {
    try {
      if (!data || typeof data !== 'object') {
        throw new Error('Valid data object is required');
      }

      // Get userId from license if not provided
      if (!data.userId) {
        const userId = await this.getUserIdFromLicense();
        if (!userId) {
          throw new Error('Unable to retrieve userId from license data');
        }
        data.userId = userId;
      }

      // Ensure pending_sync table exists
      await this.ensurePendingSyncTable();

      // Create a pending sync record in the database
      const now = new Date().toISOString();
      const syncData = {
        userId: data.userId,
        data: JSON.stringify(data.data),
        status: 'pending',
        created_at: now,
        updated_at: now
      };

      // Insert into pending_sync table using SQLite
      const { insert } = require('../database');
      const syncId = await insert(
        'INSERT INTO pending_sync (userId, data, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [syncData.userId, syncData.data, syncData.status, syncData.created_at, syncData.updated_at]
      );

      logger.info(`Data stored locally for later sync. Sync ID: ${syncId}`);
      
      return {
        syncId: syncId,
        userId: data.userId,
        dataTypes: Object.keys(data.data || {}),
        recordCount: Object.values(data.data || {}).reduce((total, records) => total + (Array.isArray(records) ? records.length : 0), 0),
        status: 'pending'
      };
    } catch (error) {
      logger.error('Error storing data locally:', error);
      throw error;
    }
  }

  /**
   * Get local data from database based on type
   * @param {string} dataType - Type of data to retrieve
   * @returns {Promise<Array>} Local data
   */
  async getLocalData(dataType) {
    try {
      let sqlQuery = '';
      let params = [];

      switch (dataType.toLowerCase()) {
        case 'sales':
          sqlQuery = 'SELECT * FROM sales ORDER BY created_at DESC';
          break;
        case 'purchases':
          sqlQuery = 'SELECT * FROM purchases ORDER BY created_at DESC';
          break;
        case 'expenses':
          sqlQuery = 'SELECT * FROM expenses ORDER BY created_at DESC';
          break;
        case 'products':
          sqlQuery = 'SELECT * FROM products ORDER BY updated_at DESC';
          break;
        case 'customers':
          sqlQuery = 'SELECT * FROM customers ORDER BY created_at DESC';
          break;
        case 'suppliers':
          sqlQuery = 'SELECT * FROM suppliers ORDER BY created_at DESC';
          break;
        case 'debts':
          sqlQuery = 'SELECT * FROM debts ORDER BY created_at DESC';
          break;
        case 'installments':
          sqlQuery = 'SELECT * FROM installments ORDER BY created_at DESC';
          break;
        default:
          throw new Error(`Unsupported data type: ${dataType}`);
      }

      logger.info(`Fetching ${dataType} data with query: ${sqlQuery}`);
      
      // First check if table exists
      try {
        const tableCheck = await query("SELECT name FROM sqlite_master WHERE type='table' AND name=?", [dataType]);
        if (tableCheck.length === 0) {
          logger.warn(`Table '${dataType}' does not exist in database`);
          return [];
        }
        logger.info(`Table '${dataType}' exists`);
      } catch (error) {
        logger.error(`Error checking if table '${dataType}' exists:`, error);
        return [];
      }
      
      const data = await query(sqlQuery, params);
      logger.info(`Retrieved ${data.length} records for ${dataType}`);
      
      // Log memory usage for large datasets
      if (data.length > 1000) {
        const memoryUsage = process.memoryUsage();
        logger.info(`Large dataset detected: ${data.length} records for ${dataType}`);
        logger.info(`Memory usage: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB heap, ${Math.round(memoryUsage.rss / 1024 / 1024)}MB RSS`);
      }
      
      // Log sample data for debugging
      if (data.length > 0) {
        const sampleRecord = data[0];
        const sampleKeys = Object.keys(sampleRecord).slice(0, 5); // Show first 5 keys
        logger.info(`Sample ${dataType} record keys: ${sampleKeys.join(', ')}`);
      }
      
      return data || [];
    } catch (error) {
      logger.error(`Error getting local data for ${dataType}:`, error);
      // Return empty array instead of throwing to avoid breaking the upload process
      return [];
    }
  }

  /**
   * Get license information for the current device
   * @returns {Promise<Object>} License information
   */
  async getLicenseInfo() {
    try {
      // Cache the fingerprint to avoid repeated expensive operations
      if (!this._cachedFingerprint) {
        this._cachedFingerprint = await licenseService.generateDeviceFingerprint();
        // Cache for 1 hour
        setTimeout(() => {
          this._cachedFingerprint = null;
        }, 60 * 60 * 1000);
      }
      
      const fingerprint = this._cachedFingerprint;
      const licenseResult = await licenseService.checkLocalLicense(fingerprint);
      
      return {
        success: licenseResult.success,
        fingerprint,
        licenseData: licenseResult.success ? {
          userId: licenseResult.userId,
          type: licenseResult.type,
          features: licenseResult.features,
          activated_at: licenseResult.activated_at,
          expires_at: licenseResult.expires_at
        } : null,
        message: licenseResult.message,
        source: 'local' // Indicate this is from local storage
      };
    } catch (error) {
      logger.error('Error getting local license info:', error);
      return {
        success: false,
        message: error.message,
        source: 'local'
      };
    }
  }

  /**
   * Test connection to remote server
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      logger.info('Testing connection to remote server');
      
      // Test basic health endpoint first
      logger.info(`Testing URL: ${this.remoteServerUrl.replace('/api', '')}/health`);

      const healthResponse = await fetch(`${this.remoteServerUrl.replace('/api', '')}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (healthResponse.ok) {
        logger.info(`Remote server health check: SUCCESS - Status: ${healthResponse.status}`);
        return true;
      }

      // If health check fails, try the license endpoint
      logger.info(`Health check failed, trying license endpoint: ${this.remoteServerUrl.replace('/api', '')}/license/status`);

      const licenseResponse = await fetch(`${this.remoteServerUrl.replace('/api', '')}/license/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      const isConnected = licenseResponse.ok;
      logger.info(`Remote server connection test: ${isConnected ? 'SUCCESS' : 'FAILED'} - Status: ${licenseResponse.status}`);
      
      if (!isConnected) {
        const errorText = await licenseResponse.text();
        logger.error(`Response error: ${errorText}`);
      }
      
      return isConnected;
    } catch (error) {
      logger.error('Error testing remote server connection:', error);
      return false;
    }
  }

  /**
   * Get list of all tables in the database
   * @returns {Promise<Array>} Array of table names
   */
  async getDatabaseTables() {
    try {
      const tables = await query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
      logger.info(`Found ${tables.length} tables in database: ${tables.map(t => t.name).join(', ')}`);
      return tables.map(t => t.name);
    } catch (error) {
      logger.error('Error getting database tables:', error);
      return [];
    }
  }

  /**
   * Get detailed information about data availability for upload
   * @returns {Promise<Object>} Detailed data availability information
   */
  async getDataAvailabilityInfo() {
    try {
      const dataTypes = ['sales', 'purchases', 'expenses', 'products', 'suppliers', 'customers', 'debts', 'installments'];
      const availabilityInfo = {};
      
      for (const dataType of dataTypes) {
        try {
          // Check if table exists
          const tableExists = await query("SELECT name FROM sqlite_master WHERE type='table' AND name=?", [dataType]);
          
          if (tableExists.length === 0) {
            availabilityInfo[dataType] = {
              exists: false,
              count: 0,
              status: 'table_missing'
            };
            continue;
          }
          
          // Get record count
          const countResult = await query(`SELECT COUNT(*) as count FROM ${dataType}`);
          const count = countResult[0].count;
          
          availabilityInfo[dataType] = {
            exists: true,
            count: count,
            status: count > 0 ? 'has_data' : 'empty'
          };
          
        } catch (error) {
          logger.error(`Error checking ${dataType} availability:`, error);
          availabilityInfo[dataType] = {
            exists: false,
            count: 0,
            status: 'error',
            error: error.message
          };
        }
      }
      
      logger.info('Data availability info:', availabilityInfo);
      return availabilityInfo;
    } catch (error) {
      logger.error('Error getting data availability info:', error);
      return {};
    }
  }

  /**
   * Add a user to the current user's data on the remote server
   * @param {string|number} userId - User ID from license
   * @param {string} username - Username for the new user
   * @param {string} name - Full name for the new user
   * @param {string} password - Password for the new user
   * @param {string} role - Role for the new user
   * @returns {Promise<Object>} Response from remote server
   */
  async addUserToCurrentUserData(userId, username, name, password, role) {
    try {
      if (!userId || !username || !name || !password || !role) {
        throw new Error('User ID, username, name, password, and role are required');
      }

      logger.info(`Adding user to UsersDataViews on remote server: ${username} (${name}) for userId: ${userId}`);

      const requestBody = {
        username,
        name,
        password,
        role
      };

      logger.info(`Request body: ${JSON.stringify({ ...requestBody, password: '[HIDDEN]' })}`);

    const response = await fetch(`${this.remoteServerUrl}/add-user/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to add user to UsersDataViews: ${response.status} ${response.statusText} - ${errorData.message || ''}`);
    }

    const data = await response.json();
      logger.info(`Successfully added user to UsersDataViews: ${username} for userId: ${userId}`);
    return data;
  } catch (error) {
      logger.error('Error adding user to UsersDataViews:', error);
      throw error;
    }
  }

  /**
   * Ensure upload_schedules table exists
   * @returns {Promise<void>}
   */
  async ensureUploadSchedulesTable() {
    try {
      // Check if table exists
      const tableExists = await query("SELECT name FROM sqlite_master WHERE type='table' AND name='upload_schedules'");
      
      if (tableExists.length === 0) {
        logger.info('Creating upload_schedules table...');
        
        // Create table
        await query(`
          CREATE TABLE IF NOT EXISTS upload_schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            schedule_name TEXT NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            schedule_type TEXT NOT NULL CHECK(schedule_type IN ('daily', 'weekly', 'monthly', 'custom')),
            schedule_time TEXT NOT NULL,
            schedule_days TEXT,
            data_types TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_run DATETIME,
            next_run DATETIME,
            total_runs INTEGER DEFAULT 0,
            last_run_status TEXT DEFAULT 'pending',
            last_run_message TEXT
          )
        `);

        // Create indexes
        await query(`
          CREATE INDEX IF NOT EXISTS idx_upload_schedules_user_id 
          ON upload_schedules(user_id)
        `);

        await query(`
          CREATE INDEX IF NOT EXISTS idx_upload_schedules_active 
          ON upload_schedules(is_active)
        `);

        await query(`
          CREATE INDEX IF NOT EXISTS idx_upload_schedules_next_run 
          ON upload_schedules(next_run)
        `);

        logger.info('Upload schedules table created successfully');
      }
    } catch (error) {
      logger.error('Error ensuring upload_schedules table exists:', error);
      throw error;
    }
  }

  /**
   * Create a new upload schedule
   * @param {Object} scheduleData - Schedule data
   * @returns {Promise<Object>} Created schedule
   */
  async createUploadSchedule(scheduleData) {
    try {
      // Ensure table exists first
      await this.ensureUploadSchedulesTable();

      const { userId, scheduleName, scheduleType, scheduleTime, scheduleDays, dataTypes, intervalMinutes } = scheduleData;
      
      if (!userId || !scheduleName || !scheduleType || !dataTypes) {
        throw new Error('User ID, schedule name, type, and data types are required');
      }

      // Validate schedule type
      const validTypes = ['daily', 'weekly', 'monthly', 'custom', 'interval'];
      if (!validTypes.includes(scheduleType)) {
        throw new Error('Invalid schedule type');
      }

      let scheduleTimeValue, intervalMinutesValue, nextRun;

      if (scheduleType === 'interval') {
        // For interval schedules
        if (!intervalMinutes || intervalMinutes < 1 || intervalMinutes > 10080) {
          throw new Error('Interval must be between 1 and 10080 minutes');
        }
        scheduleTimeValue = intervalMinutes.toString();
        intervalMinutesValue = intervalMinutes;
        // Next run is current time + interval
        const now = new Date();
        nextRun = new Date(now.getTime() + (intervalMinutes * 60 * 1000));
      } else {
        // For time-based schedules
        if (!scheduleTime) {
          throw new Error('Schedule time is required for non-interval schedules');
        }
        
        // Validate time format (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(scheduleTime)) {
          throw new Error('Invalid time format. Use HH:MM format');
        }
        
        scheduleTimeValue = scheduleTime;
        intervalMinutesValue = null;
        nextRun = this.calculateNextRun(scheduleType, scheduleTime, scheduleDays);
      }

      const schedule = {
        user_id: userId,
        schedule_name: scheduleName,
        schedule_type: scheduleType,
        schedule_time: scheduleTimeValue,
        schedule_days: scheduleDays ? JSON.stringify(scheduleDays) : null,
        data_types: JSON.stringify(dataTypes),
        interval_minutes: intervalMinutesValue,
        next_run: nextRun.toISOString(),
        is_active: 1
      };

      // Build INSERT SQL statement
      const columns = Object.keys(schedule).join(', ');
      const placeholders = Object.keys(schedule).map(() => '?').join(', ');
      const values = Object.values(schedule);
      
      const insertSql = `INSERT INTO upload_schedules (${columns}) VALUES (${placeholders})`;
      const result = await insert(insertSql, values);
      
      logger.info(`Created upload schedule: ${scheduleName} for user: ${userId}`);
      
      // Immediately check if this new schedule should run
      try {
        await schedulerService.checkSchedulesImmediately(this);
      } catch (error) {
        logger.warn('Failed to immediately check schedules after creation:', error);
      }
      
      return {
        success: true,
        data: { id: result, ...schedule }
      };
    } catch (error) {
      logger.error('Error creating upload schedule:', error);
      throw error;
    }
  }

  /**
   * Get all upload schedules for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of schedules
   */
  async getUploadSchedules(userId) {
    try {
      // Ensure table exists first
      await this.ensureUploadSchedulesTable();

      const schedules = await query(
        'SELECT * FROM upload_schedules WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );

      // Parse JSON fields
      return schedules.map(schedule => ({
        ...schedule,
        schedule_days: schedule.schedule_days ? JSON.parse(schedule.schedule_days) : null,
        data_types: JSON.parse(schedule.data_types),
        interval_minutes: schedule.interval_minutes ? parseInt(schedule.interval_minutes) : null
      }));
    } catch (error) {
      logger.error('Error getting upload schedules:', error);
      throw error;
    }
  }

  /**
   * Update an upload schedule
   * @param {number} scheduleId - Schedule ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated schedule
   */
  async updateUploadSchedule(scheduleId, updateData) {
    try {
      // Ensure table exists first
      await this.ensureUploadSchedulesTable();

      const { scheduleName, scheduleType, scheduleTime, scheduleDays, dataTypes, isActive, intervalMinutes } = updateData;
      
      const updateFields = {};
      if (scheduleName) updateFields.schedule_name = scheduleName;
      if (scheduleType) updateFields.schedule_type = scheduleType;
      if (scheduleDays !== undefined) updateFields.schedule_days = JSON.stringify(scheduleDays);
      if (dataTypes) updateFields.data_types = JSON.stringify(dataTypes);
      if (isActive !== undefined) updateFields.is_active = isActive ? 1 : 0;
      
      // Handle schedule time and interval based on schedule type
      if (scheduleType === 'interval') {
        if (intervalMinutes !== undefined) {
          if (intervalMinutes < 1 || intervalMinutes > 10080) {
            throw new Error('Interval must be between 1 and 10080 minutes');
          }
          updateFields.schedule_time = intervalMinutes.toString();
          updateFields.interval_minutes = intervalMinutes;
        }
      } else {
        if (scheduleTime) {
          // Validate time format (HH:MM)
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(scheduleTime)) {
            throw new Error('Invalid time format. Use HH:MM format');
          }
          updateFields.schedule_time = scheduleTime;
          updateFields.interval_minutes = null;
        }
      }
      
      updateFields.updated_at = new Date().toISOString();
      
      // Recalculate next run if schedule changed
      if (scheduleType || scheduleTime || scheduleDays || intervalMinutes !== undefined) {
        if (scheduleType === 'interval' || updateData.scheduleType === 'interval') {
          // For interval schedules, next run is current time + interval
          const now = new Date();
          const interval = intervalMinutes || updateData.intervalMinutes;
          updateFields.next_run = new Date(now.getTime() + (interval * 60 * 1000)).toISOString();
        } else {
          updateFields.next_run = this.calculateNextRun(
            scheduleType || updateData.scheduleType,
            scheduleTime || updateData.scheduleTime,
            scheduleDays || updateData.scheduleDays
          ).toISOString();
        }
      }

      // Build UPDATE SQL statement
      const setClause = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(updateFields), scheduleId];
      
      const updateSql = `UPDATE upload_schedules SET ${setClause} WHERE id = ?`;
      await update(updateSql, values);
      
      logger.info(`Updated upload schedule: ${scheduleId}`);
      
      // Immediately check if this updated schedule should run
      try {
        await schedulerService.checkSchedulesImmediately(this);
      } catch (error) {
        logger.warn('Failed to immediately check schedules after update:', error);
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Error updating upload schedule:', error);
      throw error;
    }
  }

  /**
   * Delete an upload schedule
   * @param {number} scheduleId - Schedule ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteUploadSchedule(scheduleId) {
    try {
      // Ensure table exists first
      await this.ensureUploadSchedulesTable();

      // Use the update helper function for DELETE operations
      await update('DELETE FROM upload_schedules WHERE id = ?', [scheduleId]);
      
      logger.info(`Deleted upload schedule: ${scheduleId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error deleting upload schedule:', error);
      throw error;
    }
  }

  /**
   * Get schedules that need to run
   * @returns {Promise<Array>} Array of schedules to run
   */
  async getSchedulesToRun() {
    try {
      // Ensure table exists first
      await this.ensureUploadSchedulesTable();

      const now = new Date();
      const schedules = await query(
        'SELECT * FROM upload_schedules WHERE is_active = 1 AND next_run <= ?',
        [now.toISOString()]
      );

      return schedules.map(schedule => ({
        ...schedule,
        schedule_days: schedule.schedule_days ? JSON.parse(schedule.schedule_days) : null,
        data_types: JSON.parse(schedule.data_types),
        interval_minutes: schedule.interval_minutes ? parseInt(schedule.interval_minutes) : null
      }));
    } catch (error) {
      logger.error('Error getting schedules to run:', error);
      throw error;
    }
  }

  /**
   * Execute a scheduled upload
   * @param {Object} schedule - Schedule to execute
   * @returns {Promise<Object>} Execution result
   */
  async executeScheduledUpload(schedule) {
    try {
      logger.info(`Executing scheduled upload: ${schedule.schedule_name} (ID: ${schedule.id})`);

      // Collect data for specified types
      const allData = {};
      let totalRecords = 0;

      for (const dataType of schedule.data_types) {
        try {
          const localData = await this.getLocalData(dataType);
          if (localData && localData.length > 0) {
            allData[dataType] = localData;
            totalRecords += localData.length;
            logger.info(`Collected ${localData.length} records for ${dataType}`);
          }
        } catch (error) {
          logger.error(`Error collecting data for ${dataType}:`, error);
        }
      }

      if (totalRecords === 0) {
        logger.info('No data to upload for scheduled task');
        await this.updateScheduleRunStatus(schedule.id, 'completed', 'No data to upload');
        return { success: true, message: 'No data to upload', count: 0 };
      }

      // Upload data
      const uploadResult = await this.uploadData({
        data: allData
      });

      // Update schedule run status
      await this.updateScheduleRunStatus(schedule.id, 'completed', `Uploaded ${totalRecords} records`);

      logger.info(`Scheduled upload completed: ${totalRecords} records uploaded`);
      return {
        success: true,
        message: `Uploaded ${totalRecords} records`,
        count: totalRecords,
        result: uploadResult
      };
    } catch (error) {
      logger.error('Error executing scheduled upload:', error);
      await this.updateScheduleRunStatus(schedule.id, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Update schedule run status
   * @param {number} scheduleId - Schedule ID
   * @param {string} status - Run status
   * @param {string} message - Status message
   * @returns {Promise<void>}
   */
  async updateScheduleRunStatus(scheduleId, status, message) {
    try {
      const now = new Date();
      const currentSchedule = await this.getScheduleById(scheduleId);
      
      let nextRun;
      if (currentSchedule.schedule_type === 'interval') {
        // For interval schedules, next run is current time + interval
        const intervalMinutes = currentSchedule.interval_minutes || parseInt(currentSchedule.schedule_time);
        nextRun = new Date(now.getTime() + (intervalMinutes * 60 * 1000));
      } else {
        // For time-based schedules, use the existing calculation
        nextRun = this.calculateNextRun(
          currentSchedule.schedule_type,
          currentSchedule.schedule_time,
          currentSchedule.schedule_days
        );
      }

      const updateFields = {
        last_run: now.toISOString(),
        next_run: nextRun.toISOString(),
        last_run_status: status,
        last_run_message: message,
        total_runs: currentSchedule.total_runs + 1
      };
      
      // Build UPDATE SQL statement
      const setClause = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(updateFields), scheduleId];
      
      const updateSql = `UPDATE upload_schedules SET ${setClause} WHERE id = ?`;
      await update(updateSql, values);
    } catch (error) {
      logger.error('Error updating schedule run status:', error);
    }
  }

  /**
   * Get schedule by ID
   * @param {number} scheduleId - Schedule ID
   * @returns {Promise<Object>} Schedule data
   */
  async getScheduleById(scheduleId) {
    try {
      // Ensure table exists first
      await this.ensureUploadSchedulesTable();

      const schedules = await query('SELECT * FROM upload_schedules WHERE id = ?', [scheduleId]);
      if (schedules.length === 0) {
        throw new Error('Schedule not found');
      }
      
      const schedule = schedules[0];
      return {
        ...schedule,
        schedule_days: schedule.schedule_days ? JSON.parse(schedule.schedule_days) : null,
        data_types: JSON.parse(schedule.data_types),
        interval_minutes: schedule.interval_minutes ? parseInt(schedule.interval_minutes) : null
      };
    } catch (error) {
      logger.error('Error getting schedule by ID:', error);
      throw error;
    }
  }

  /**
   * Calculate next run time for a schedule
   * @param {string} scheduleType - Schedule type
   * @param {string} scheduleTime - Schedule time (HH:MM)
   * @param {Array} scheduleDays - Schedule days (for weekly/monthly)
   * @returns {string} Next run time as ISO string
   */
  calculateNextRun(scheduleType, scheduleTime, scheduleDays = null) {
    const now = new Date();
    
    // Handle interval schedules differently
    if (scheduleType === 'interval') {
      const intervalMinutes = parseInt(scheduleTime);
      const nextRun = new Date(now.getTime() + (intervalMinutes * 60 * 1000));
      return nextRun.toISOString();
    }
    
    // For time-based schedules, parse the time
    const [hours, minutes] = scheduleTime.split(':').map(Number);
    
    let nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);

    switch (scheduleType) {
      case 'daily':
        // If time has passed today, schedule for tomorrow
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;

      case 'weekly':
        if (scheduleDays && scheduleDays.length > 0) {
          // Find next occurrence of any of the specified days
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const currentDay = now.getDay();
          
          let daysToAdd = 1;
          let found = false;
          
          while (daysToAdd <= 7) {
            const checkDay = (currentDay + daysToAdd) % 7;
            if (scheduleDays.includes(dayNames[checkDay])) {
              nextRun.setDate(nextRun.getDate() + daysToAdd);
              found = true;
              break;
            }
            daysToAdd++;
          }
          
          if (!found) {
            // If no days found, schedule for next week
            nextRun.setDate(nextRun.getDate() + 7);
          }
        } else {
          // Default to same day next week
          nextRun.setDate(nextRun.getDate() + 7);
        }
        break;

      case 'monthly':
        if (scheduleDays && scheduleDays.length > 0) {
          // For monthly, scheduleDays should contain day numbers (1-31)
          const currentDay = now.getDate();
          let nextDay = Math.min(...scheduleDays.filter(day => day >= currentDay));
          
          if (!nextDay) {
            // If no days found this month, schedule for next month
            nextRun.setMonth(nextRun.getMonth() + 1);
            nextDay = Math.min(...scheduleDays);
          }
          
          nextRun.setDate(nextDay);
        } else {
          // Default to same day next month
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
        break;

      case 'custom':
        // For custom schedules, just add 24 hours
        nextRun.setDate(nextRun.getDate() + 1);
        break;

      default:
        // Default to daily
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
    }

    return nextRun.toISOString();
  }

  /**
   * Get auto upload settings
   * @returns {Promise<Object>}
   */
  async getAutoUploadSettings() {
    try {
      // Check if auto_upload_settings table exists
      const tableExists = await query("SELECT name FROM sqlite_master WHERE type='table' AND name='auto_upload_settings'");
      
      if (tableExists.length === 0) {
        // Return default settings if table doesn't exist
        return {
          enabled: false,
          interval: 60,
          dataTypes: []
        };
      }

      const settings = await query("SELECT * FROM auto_upload_settings WHERE id = 1");
      
      if (settings.length === 0) {
        // Return default settings if no record exists
        return {
          enabled: false,
          interval: 60,
          dataTypes: []
        };
      }

      const setting = settings[0];
      return {
        enabled: setting.enabled === 1,
        interval: setting.interval,
        dataTypes: JSON.parse(setting.data_types || '[]')
      };
    } catch (error) {
      logger.error('Error getting auto upload settings:', error);
      // Return default settings on error
      return {
        enabled: false,
        interval: 60,
        dataTypes: []
      };
    }
  }

  /**
   * Save auto upload settings
   * @param {Object} settings - The settings to save
   * @returns {Promise<Object>}
   */
  async saveAutoUploadSettings(settings) {
    try {
      // Ensure auto_upload_settings table exists
      await this.ensureAutoUploadSettingsTable();

      const { enabled, interval, dataTypes } = settings;

      // Check if settings already exist
      const existingSettings = await query("SELECT id FROM auto_upload_settings WHERE id = 1");
      
      if (existingSettings.length > 0) {
        // Update existing settings
        const updateSql = `
          UPDATE auto_upload_settings 
          SET enabled = ?, interval = ?, data_types = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = 1
        `;
        await update(updateSql, [enabled ? 1 : 0, interval, JSON.stringify(dataTypes)]);
      } else {
        // Insert new settings
        const insertSql = `
          INSERT INTO auto_upload_settings (id, enabled, interval, data_types, created_at, updated_at)
          VALUES (1, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        await update(insertSql, [enabled ? 1 : 0, interval, JSON.stringify(dataTypes)]);
      }

      logger.info('Auto upload settings saved successfully');
      return { enabled, interval, dataTypes };
    } catch (error) {
      logger.error('Error saving auto upload settings:', error);
      throw error;
    }
  }

  /**
   * Ensure auto_upload_settings table exists
   * @returns {Promise<void>}
   */
  async ensureAutoUploadSettingsTable() {
    try {
      const tableExists = await query("SELECT name FROM sqlite_master WHERE type='table' AND name='auto_upload_settings'");
      
      if (tableExists.length === 0) {
        logger.info('Creating auto_upload_settings table...');
        
        // Create table
        await update(`
          CREATE TABLE IF NOT EXISTS auto_upload_settings (
            id INTEGER PRIMARY KEY DEFAULT 1,
            enabled BOOLEAN DEFAULT 0,
            interval INTEGER DEFAULT 60,
            data_types TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        logger.info('Auto upload settings table created successfully');
      }
    } catch (error) {
      logger.error('Error ensuring auto upload settings table:', error);
    throw error;
  }
  }
   
}

module.exports = new MobileLiveDataService(); 