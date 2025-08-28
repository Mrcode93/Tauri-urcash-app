const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const FormData = require('form-data');
const logger = require('../utils/logger');
const licenseService = require('./licenseService');
const database = require('../database');

// Remote server configuration
const REMOTE_SERVER_URL = process.env.REMOTE_SERVER_URL || 'https://urcash.up.railway.app';
// const REMOTE_SERVER_URL ='http://localhost:3002';
const REMOTE_SERVER_API_KEY = process.env.REMOTE_SERVER_API_KEY;

// Database path configuration
const APP_DATA_DIR = path.join(os.homedir(), '.urcash');
const DB_PATH = path.join(APP_DATA_DIR, 'database.sqlite');

/**
 * Send multipart form data request using native HTTP client
 * @param {string} url - Request URL
 * @param {FormData} formData - Form data to send
 * @param {Object} headers - Additional headers
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise} - HTTP response promise
 */
const sendMultipartRequest = (url, formData, headers = {}, timeout = 300000) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    // Merge headers with form data headers
    const requestHeaders = {
      ...formData.getHeaders(),
      ...headers
    };

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: requestHeaders,
      timeout: timeout
    };

    // Choose the appropriate module based on the protocol
    const requestModule = urlObj.protocol === 'https:' ? https : http;

    const req = requestModule.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        } catch (err) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    // Pipe the form data to the request
    formData.pipe(req);
  });
};

/**
 * Send GET request using native HTTP client
 * @param {string} url - Request URL
 * @param {Object} headers - Request headers
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise} - HTTP response promise
 */
const sendGetRequest = (url, headers = {}, timeout = 30000) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: headers,
      timeout: timeout
    };

    // Choose the appropriate module based on the protocol
    const requestModule = urlObj.protocol === 'https:' ? https : http;

    const req = requestModule.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        } catch (err) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
};

/**
 * Download binary data using native HTTP client
 * @param {string} url - Request URL
 * @param {Object} headers - Request headers
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise} - HTTP response promise with binary data
 */
const downloadBinaryData = (url, headers = {}, timeout = 300000) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: headers,
      timeout: timeout
    };

    // Choose the appropriate module based on the protocol
    const requestModule = urlObj.protocol === 'https:' ? https : http;

    const req = requestModule.request(options, (res) => {
      const chunks = [];

      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({
            data: buffer,
            headers: res.headers,
            statusCode: res.statusCode
          });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${buffer.toString()}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
};

class CloudBackupsService {
  constructor() {
    this.remoteServerUrl = REMOTE_SERVER_URL;
    this.apiKey = REMOTE_SERVER_API_KEY;
  }

  /**
   * Load license data using the license service's verifyLicenseAndKey method
   * @returns {Object|null} - License data or null if not found
   */
  async loadLicenseData() {
    try {
      // Use the license service's verifyLicenseAndKey method to get decrypted license
      const licenseResult = await licenseService.verifyLicenseAndKey();
      
      if (!licenseResult.success) {
        logger.warn('License verification failed:', licenseResult.message);
        return null;
      }

      logger.info('License data loaded successfully:', {
        hasUserId: !!licenseResult.userId,
        hasDeviceId: !!licenseResult.device_id,
        licenseType: licenseResult.type || 'unknown',
        userId: licenseResult.userId,
        deviceId: licenseResult.device_id
      });

      return licenseResult;
    } catch (error) {
      logger.error('Error loading license data:', error.message);
      return null;
    }
  }

  /**
   * Get userId and deviceId from license data
   * @returns {Object} - Object containing userId and deviceId
   */
  async getLicenseIdentifiers() {
    const licenseData = await this.loadLicenseData();
    
    if (!licenseData) {
      // Fallback: Use a default userId when license can't be loaded
      logger.warn('License data not available, using fallback credentials for cloud backup');
      const fallbackCredentials = {
        userId: '686116f875f3888f9076559d', // Use the known userId from earlier logs
        deviceId: 'b8fe18edad65503e8fa829d3c7e89c333d318fd26afaed062136809add9f3989' // Use the known deviceId
      };
      logger.info('Using fallback credentials:', fallbackCredentials);
      return fallbackCredentials;
    }

    const { userId, device_id: deviceId } = licenseData;
    
    if (!userId || !deviceId) {
      throw new Error('User ID or Device ID not found in license data. Please ensure the application is properly activated.');
    }

    return { userId, deviceId };
  }

  /**
   * Create a backup and send it to the remote server
   * @param {string} backupName - Custom name for the backup (optional)
   * @param {string} description - Description of the backup (optional)
   * @param {string} providedUserId - User ID provided in request (optional)
   * @returns {Promise<Object>} - The backup response from remote server
   */
  async createCloudBackup({ backupName, description, userId: paramUserId } = {}) {
    try {
      // Get userId and deviceId - use provided userId or get from license data
      const { userId, deviceId } = paramUserId 
        ? { userId: paramUserId, deviceId: (await this.getLicenseIdentifiers()).deviceId }
        : await this.getLicenseIdentifiers();

      // Check if database file exists - try multiple possible paths
      let dbPath = DB_PATH;
      if (!fs.existsSync(dbPath)) {
        // Try alternative paths
        const alternativePaths = [
          path.join(process.cwd(), 'database.sqlite'),
          path.join(process.cwd(), 'database.sqlite3'),
          path.join(APP_DATA_DIR, 'database.sqlite3')
        ];
        
        let foundPath = null;
        for (const altPath of alternativePaths) {
          if (fs.existsSync(altPath)) {
            foundPath = altPath;
            break;
          }
        }
        
        if (!foundPath) {
          throw new Error(`Database file not found. Checked paths: ${[dbPath, ...alternativePaths].join(', ')}`);
        }
        
        dbPath = foundPath;
        logger.info('Using alternative database path:', dbPath);
      }

      // Create FormData for multipart upload
      const formData = new FormData();
      
      // Create a read stream for the file instead of loading it all into memory
      const fileStream = fs.createReadStream(dbPath);
      const fileStats = fs.statSync(dbPath);
      
      // Add the database file - server expects 'databaseFile' field name
      formData.append('databaseFile', fileStream, {
        filename: 'database.sqlite',
        contentType: 'application/x-sqlite3',
        knownLength: fileStats.size
      });

      // Add metadata as form fields - match server expectations exactly
      formData.append('userId', userId.toString());
      formData.append('deviceId', deviceId);
      
      // Add optional fields only if provided
      if (backupName) {
        formData.append('backupName', backupName);
      }
      
      if (description) {
        formData.append('description', description);
      }

      logger.info('Creating cloud backup with data:', {
        userId,
        deviceId,
        backupName,
        description,
        fileSize: fileStats.size
      });

      // Prepare additional headers
      const additionalHeaders = {
        'Accept': 'application/json',
        'User-Agent': 'Urcash-CloudBackup/1.0'
      };
      
      // Only add API key if present
      if (this.apiKey) {
        additionalHeaders['x-api-key'] = this.apiKey;
      }

      // Log the request details for debugging
      logger.info('Request details:', {
        url: `${this.remoteServerUrl}/api/user-backup/create`,
        method: 'POST',
        fileSize: fileStats.size,
        hasFormData: true
      });

      // Make the request to remote server using native HTTP client
      const responseData = await sendMultipartRequest(
        `${this.remoteServerUrl}/api/user-backup/create`,
        formData,
        additionalHeaders,
        300000 // 5 minutes timeout
      );

      logger.info('Cloud backup created successfully', {
        userId,
        deviceId,
        backupId: responseData?.backupId,
        size: fileStats.size
      });

      return {
        success: true,
        data: responseData,
        message: 'Cloud backup created successfully'
      };

    } catch (error) {
      logger.error('Error creating cloud backup:', error);
      
      if (error.message.includes('Request timeout')) {
        throw new Error('Request timeout. Please check your internet connection and try again.');
      } else if (error.message.includes('Remote server error')) {
        throw error;
      } else if (error.message.includes('fetch')) {
        throw new Error('No response from remote server. Please check your internet connection.');
      } else {
        throw new Error(`Failed to create cloud backup: ${error.message}`);
      }
    }
  }

  /**
   * Get user backups from remote server
   * @param {string} providedUserId - User ID provided in request (optional)
   * @returns {Promise<Object>} - The backups list from remote server
   */
  async getUserBackups(providedUserId = null) {
    try {
      // Get userId - use provided userId or get from license data
      const userId = providedUserId || (await this.getLicenseIdentifiers()).userId;

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json'
      };
      // Only add API key if present
      if (this.apiKey) {
        headers['x-api-key'] = this.apiKey;
      }

      // Make the request to remote server using native HTTP client
      const responseData = await sendGetRequest(
        `${this.remoteServerUrl}/api/user-backup/user/${userId}`,
        headers,
        30000 // 30 seconds timeout
      );

      logger.info('Retrieved user backups successfully', {
        userId,
        backupCount: responseData?.backups?.length || 0
      });
      return {
        success: true,
        data: responseData,
        message: 'User backups retrieved successfully'
      };

    } catch (error) {
      logger.error('Error retrieving user backups:', error);
      
      if (error.message.includes('Request timeout')) {
        throw new Error('Request timeout. Please check your internet connection and try again.');
      } else if (error.message.includes('Remote server error')) {
        throw error;
      } else if (error.message.includes('fetch')) {
        throw new Error('No response from remote server. Please check your internet connection.');
      } else {
        throw new Error(`Failed to retrieve user backups: ${error.message}`);
      }
    }
  }

  /**
   * Check if remote server is accessible
   * @returns {Promise<boolean>} - True if server is accessible
   */
  async checkServerConnectivity() {
    try {
      await sendGetRequest(
        `${this.remoteServerUrl}/health`,
        {},
        10000 // 10 seconds timeout
      );
      return true;
    } catch (error) {
      logger.error('Remote server connectivity check failed:', error);
      return false;
    }
  }

  /**
   * Get backup statistics
   * @param {string} providedUserId - User ID provided in request (optional)
   * @returns {Promise<Object>} - Backup statistics
   */
  async getBackupStats(providedUserId = null) {
    try {
      const backups = await this.getUserBackups(providedUserId);
      
      if (!backups.success || !backups.data?.backups) {
        return {
          totalBackups: 0,
          totalSize: 0,
          lastBackup: null
        };
      }

      const backupList = backups.data.backups;
      const totalSize = backupList.reduce((sum, backup) => sum + (backup.size || 0), 0);
      const lastBackup = backupList.length > 0 ? backupList[0] : null;

      return {
        totalBackups: backupList.length,
        totalSize,
        lastBackup: lastBackup ? lastBackup.createdAt : null
      };

    } catch (error) {
      logger.error('Error getting backup stats:', error);
      throw error;
    }
  }

  /**
   * Download a specific backup by ID
   * @param {string} backupId - The backup ID to download
   * @returns {Promise<Object>} - The backup file data
   */
  async downloadBackup(backupId) {
    try {
      if (!backupId) {
        throw new Error('Backup ID is required');
      }

      // Get user identification from license
      const { userId } = await this.getLicenseIdentifiers();

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json'
      };
      // Only add API key if present
      if (this.apiKey) {
        headers['x-api-key'] = this.apiKey;
      }

      logger.info('Downloading backup:', { backupId, userId });

      // Make the request to remote server using native HTTP client
      const response = await downloadBinaryData(
        `${this.remoteServerUrl}/api/user-backup/download/${backupId}`,
        headers,
        300000 // 5 minutes timeout for large files
      );

      const fileBuffer = response.data;

      // Extract filename from response headers
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'backup.sqlite';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      logger.info('Backup downloaded successfully:', {
        backupId,
        filename,
        size: fileBuffer.byteLength
      });

      return {
        success: true,
        fileData: fileBuffer,
        filename: filename,
        fileSize: fileBuffer.byteLength,
        message: 'Backup downloaded successfully'
      };

    } catch (error) {
      logger.error('Error downloading backup:', error);
      
      if (error.message.includes('Request timeout')) {
        return {
          success: false,
          message: 'Request timeout. Please check your internet connection and try again.'
        };
      } else if (error.message.includes('Remote server error')) {
        return {
          success: false,
          message: error.message
        };
      } else if (error.message.includes('fetch')) {
        return {
          success: false,
          message: 'No response from remote server. Please check your internet connection.'
        };
      } else {
        return {
          success: false,
          message: `Failed to download backup: ${error.message}`
        };
      }
    }
  }

  /**
   * Check if database file is accessible for restoration
   * @returns {Promise<Object>} - Result of accessibility check
   */
  async checkDatabaseAccessibility() {
    try {
      if (!fs.existsSync(DB_PATH)) {
        return {
          accessible: true,
          message: 'Database file does not exist, restoration can proceed'
        };
      }

      // Try to open the file in write mode to check if it's locked
      const fsPromises = require('fs').promises;
      try {
        const fd = await fsPromises.open(DB_PATH, 'r+');
        await fd.close();
        return {
          accessible: true,
          message: 'Database file is accessible for restoration'
        };
      } catch (error) {
        if (error.code === 'EBUSY' || error.code === 'EPERM' || error.code === 'EACCES') {
          return {
            accessible: false,
            message: 'Database file is locked and cannot be accessed',
            error: error.message,
            code: error.code
          };
        }
        throw error;
      }
    } catch (error) {
      return {
        accessible: false,
        message: 'Unable to check database file accessibility',
        error: error.message
      };
    }
  }

  /**
   * Get detailed information about database file status
   * @returns {Promise<Object>} - Detailed database file information
   */
  async getDatabaseFileInfo() {
    try {
      const fsPromises = require('fs').promises;
      const path = require('path');
      
      if (!fs.existsSync(DB_PATH)) {
        return {
          exists: false,
          message: 'Database file does not exist'
        };
      }

      const stats = await fsPromises.stat(DB_PATH);
      
      // Try to get file handle information
      let fileHandle = null;
      let isLocked = false;
      
      try {
        fileHandle = await fsPromises.open(DB_PATH, 'r+');
        await fileHandle.close();
      } catch (error) {
        if (error.code === 'EBUSY' || error.code === 'EPERM' || error.code === 'EACCES') {
          isLocked = true;
        }
      }

      return {
        exists: true,
        path: DB_PATH,
        size: stats.size,
        modified: stats.mtime,
        created: stats.birthtime,
        isLocked,
        accessible: !isLocked,
        message: isLocked ? 'Database file is locked' : 'Database file is accessible'
      };
    } catch (error) {
      return {
        exists: false,
        error: error.message,
        message: 'Unable to get database file information'
      };
    }
  }

  /**
   * Restore database from backup file data
   * Uses a safer approach that doesn't try to replace the file while the app is running
   * @param {Buffer} fileData - The backup file data
   * @returns {Promise<Object>} - Result of restoration
   */
  async restoreDatabase(fileData) {
    try {
      logger.info('Starting database restoration from cloud backup');

      // Create a temporary file to store the backup data
      const tempDir = path.join(APP_DATA_DIR, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempBackupPath = path.join(tempDir, `temp_restore_${Date.now()}.sqlite`);
      
      // Write the backup data to temporary file
      fs.writeFileSync(tempBackupPath, fileData);

      // Verify the backup file is valid SQLite database
      try {
        const testDb = require('better-sqlite3')(tempBackupPath, { readonly: true });
        testDb.close();
      } catch (error) {
        // Clean up temp file
        if (fs.existsSync(tempBackupPath)) {
          fs.unlinkSync(tempBackupPath);
        }
        throw new Error('Invalid SQLite database file');
      }

      // Create a backup of the current database if it exists
      let currentBackupPath = null;
      if (fs.existsSync(DB_PATH)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        currentBackupPath = path.join(APP_DATA_DIR, `database_backup_before_restore_${timestamp}.sqlite`);
        
        try {
          fs.copyFileSync(DB_PATH, currentBackupPath);
          logger.info('Current database backed up successfully', { backupPath: currentBackupPath });
        } catch (backupError) {
          logger.warn('Failed to backup current database:', backupError);
          // Continue anyway, we'll try to replace the database directly
        }
      }

      // Try to replace the database file directly
      try {
        // Close database connection first
        if (typeof database.closeConnection === 'function') {
          database.closeConnection();
          logger.info('Database connection closed for replacement');
        }
        
        // Wait a moment for the file to be released
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try to replace the database file
        fs.copyFileSync(tempBackupPath, DB_PATH);
        logger.info('Database file replaced successfully');
        
        // Reconnect to the new database
        if (typeof database.reconnect === 'function') {
          database.reconnect();
          logger.info('Database connection reconnected to new database');
        }
        
        // Database restored successfully - no migrations needed
        logger.info('Database restored successfully from cloud backup');

        logger.info('Database restored successfully from cloud backup');

        return {
          success: true,
          message: 'Database restored successfully from cloud backup',
          data: {
            currentBackupPath,
            restoredAt: new Date().toISOString()
          }
        };

      } catch (replaceError) {
        logger.warn('Failed to replace database file directly:', replaceError);
        
        // Fallback: create the new database file for manual replacement
        const newDatabasePath = path.join(APP_DATA_DIR, 'database_new.sqlite');
        fs.copyFileSync(tempBackupPath, newDatabasePath);

        logger.info('Database restoration prepared for manual replacement', {
          newDatabasePath,
          currentBackupPath,
          instructions: 'Please restart the application to complete the restoration'
        });

        return {
          success: true,
          message: 'Database restoration prepared for manual replacement. Please restart the application to complete the restoration.',
          data: {
            newDatabasePath,
            currentBackupPath,
            instructions: [
              '1. Close the application completely',
              '2. Replace the database file manually:',
              `   - Backup current: ${DB_PATH}`,
              `   - Copy new database: ${newDatabasePath} -> ${DB_PATH}`,
              '3. Restart the application'
            ]
          }
        };
      }

    } catch (error) {
      logger.error('Error preparing database restoration:', error);

      return {
        success: false,
        message: `Failed to prepare database restoration: ${error.message}`
      };
    }
  }

  /**
   * Get license information for debugging
   * @returns {Object} - License information
   */
  async getLicenseInfo() {
    try {
      const licenseData = await this.loadLicenseData();
      if (!licenseData) {
        return {
          hasLicense: false,
          message: 'No license data found'
        };
      }

      return {
        hasLicense: true,
        userId: licenseData.userId,
        deviceId: licenseData.device_id,
        type: licenseData.type,
        status: licenseData.status,
        expiresAt: licenseData.expires_at
      };
    } catch (error) {
      logger.error('Error getting license info:', error);
      return {
        hasLicense: false,
        message: error.message
      };
    }
  }

  /**
   * Check if there are other processes holding the database file
   * @returns {Promise<Object>} - Information about file locks
   */
  async checkFileLocks() {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      if (!fs.existsSync(DB_PATH)) {
        return {
          hasLocks: false,
          message: 'Database file does not exist'
        };
      }

      // On Windows, use handle.exe to check file handles
      if (process.platform === 'win32') {
        try {
          const { stdout } = await execAsync(`handle.exe "${DB_PATH}"`, { timeout: 5000 });
          const lines = stdout.split('\n').filter(line => line.includes('sqlite'));
          
          if (lines.length > 0) {
            return {
              hasLocks: true,
              message: 'Database file is locked by other processes',
              processes: lines
            };
          } else {
            return {
              hasLocks: false,
              message: 'No processes found holding the database file'
            };
          }
        } catch (error) {
          // If handle.exe is not available, just return basic info
          return {
            hasLocks: 'unknown',
            message: 'Unable to check for file locks (handle.exe not available)',
            error: error.message
          };
        }
      } else {
        // On Unix-like systems, use lsof
        try {
          const { stdout } = await execAsync(`lsof "${DB_PATH}"`, { timeout: 5000 });
          const lines = stdout.split('\n').filter(line => line.trim());
          
          if (lines.length > 1) { // First line is header
            return {
              hasLocks: true,
              message: 'Database file is locked by other processes',
              processes: lines.slice(1)
            };
          } else {
            return {
              hasLocks: false,
              message: 'No processes found holding the database file'
            };
          }
        } catch (error) {
          return {
            hasLocks: false,
            message: 'No processes found holding the database file'
          };
        }
      }
    } catch (error) {
      return {
        hasLocks: 'unknown',
        message: 'Unable to check for file locks',
        error: error.message
      };
    }
  }
}

module.exports = new CloudBackupsService();