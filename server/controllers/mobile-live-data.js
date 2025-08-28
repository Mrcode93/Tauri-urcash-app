// Mobile live data controller
const logger = require('../utils/logger');
const mobileLiveDataService = require('../services/mobileLiveDataService');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * Create a new user on the remote server
 * @route POST /api/mobile-live-data/users
 * @access Private
 */
const createUser = asyncHandler(async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    const result = await mobileLiveDataService.createUser({ username, password, role });

    res.status(201).json({
      success: true,
      message: 'User created successfully on remote server',
      data: result
    });
  } catch (error) {
    logger.error('Error in createUser controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create user on remote server'
    });
  }
});

/**
 * Get all users from the remote server
 * @route GET /api/mobile-live-data/users
 * @access Private
 */
const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const users = await mobileLiveDataService.getAllUsers();

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: users
    });
  } catch (error) {
    logger.error('Error in getAllUsers controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch users from remote server'
    });
  }
});

/**
 * Get a specific user by ID from the remote server
 * @route GET /api/mobile-live-data/users/:userId
 * @access Private
 */
const getUser = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const user = await mobileLiveDataService.getUser(userId);

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: user
    });
  } catch (error) {
    logger.error('Error in getUser controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user from remote server'
    });
  }
});

/**
 * Update a user on the remote server
 * @route PUT /api/mobile-live-data/users/:userId
 * @access Private
 */
const updateUser = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    const userData = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const result = await mobileLiveDataService.updateUser(userId, userData);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in updateUser controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update user on remote server'
    });
  }
});

/**
 * Delete a user from the remote server
 * @route DELETE /api/mobile-live-data/users/:userId
 * @access Private
 */
const deleteUser = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const result = await mobileLiveDataService.deleteUser(userId);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in deleteUser controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete user from remote server'
    });
  }
});

/**
 * Upload data to remote server
 * @route POST /api/mobile-live-data/upload
 * @access Private
 */
const uploadData = asyncHandler(async (req, res) => {
  try {
    const data = req.body;
    

    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Valid data object is required'
      });
    }

    const result = await mobileLiveDataService.uploadData(data);

    res.status(200).json({
      success: true,
      message: 'Data uploaded successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in uploadData controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload data to remote server'
    });
  }
});

/**
 * Sync local data with remote server
 * @route POST /api/mobile-live-data/sync/:dataType
 * @access Private
 */
const syncData = asyncHandler(async (req, res) => {
  try {
    const { dataType } = req.params;

    if (!dataType) {
      return res.status(400).json({
        success: false,
        message: 'Data type is required'
      });
    }

    const result = await mobileLiveDataService.syncData(dataType);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    logger.error('Error in syncData controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to sync data with remote server'
    });
  }
});

/**
 * Test connection to remote server
 * @route GET /api/mobile-live-data/test-connection
 * @access Private
 */
const testConnection = asyncHandler(async (req, res) => {
  try {
    // Disable caching for mobile live data endpoints
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const isConnected = await mobileLiveDataService.testConnection();

    res.status(200).json({
      success: true,
      message: isConnected ? 'Connection successful' : 'Connection failed',
      data: { connected: isConnected }
    });
  } catch (error) {
    logger.error('Error in testConnection controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to test connection to remote server',
      data: { connected: false }
    });
  }
});

/**
 * Test connection to remote server (public endpoint for testing)
 * @route GET /api/mobile-live-data/test-connection-public
 * @access Public
 */
const testConnectionPublic = asyncHandler(async (req, res) => {
  try {
    // Disable caching for mobile live data endpoints
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const isConnected = await mobileLiveDataService.testConnection();

    res.status(200).json({
      success: true,
      message: isConnected ? 'Connection successful' : 'Connection failed',
      data: { connected: isConnected }
    });
  } catch (error) {
    logger.error('Error in testConnectionPublic controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to test connection to remote server',
      data: { connected: false }
    });
  }
});

/**
 * Get local license information for debugging
 * @route GET /api/mobile-live-data/license-info
 * @access Private
 */
const getLicenseInfo = asyncHandler(async (req, res) => {
  try {
    const licenseInfo = await mobileLiveDataService.getLicenseInfo();

    res.status(200).json({
      success: true,
      message: 'Local license information retrieved successfully',
      data: licenseInfo
    });
  } catch (error) {
    logger.error('Error in getLicenseInfo controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get local license information'
    });
  }
});

/**
 * Get user ID from license for mobile operations
 * @route GET /api/mobile-live-data/user-id
 * @access Private
 */
const getUserIdFromLicense = asyncHandler(async (req, res) => {
  try {
    const userId = await mobileLiveDataService.getUserIdFromLicense();
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Unable to retrieve user ID from license'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User ID retrieved successfully',
      data: { userId }
    });
  } catch (error) {
    logger.error('Error in getUserIdFromLicense controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get user ID from license'
    });
  }
});

/**
 * Get sync status for all data types
 * @route GET /api/mobile-live-data/sync-status
 * @access Private
 */
const getSyncStatus = asyncHandler(async (req, res) => {
  try {
    const dataTypes = ['sales', 'purchases', 'expenses', 'products', 'customers', 'suppliers', 'debts', 'installments'];
    const syncStatus = {};

    for (const dataType of dataTypes) {
      try {
        const localData = await mobileLiveDataService.getLocalData(dataType);
        syncStatus[dataType] = {
          hasData: localData.length > 0,
          recordCount: localData.length,
          lastSync: null // TODO: Implement last sync tracking
        };
      } catch (error) {
        logger.error(`Error getting sync status for ${dataType}:`, error);
        syncStatus[dataType] = {
          hasData: false,
          recordCount: 0,
          error: error.message
        };
      }
    }

    res.status(200).json({
      success: true,
      message: 'Sync status retrieved successfully',
      data: syncStatus
    });
  } catch (error) {
    logger.error('Error in getSyncStatus controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get sync status'
    });
  }
});

/**
 * Get local data for a specific data type
 * @route GET /api/mobile-live-data/local-data/:dataType
 * @access Private
 */
const getLocalData = asyncHandler(async (req, res) => {
  try {
    const { dataType } = req.params;

    if (!dataType) {
      return res.status(400).json({
        success: false,
        message: 'Data type is required'
      });
    }

    // Disable caching for mobile live data endpoints
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const localData = await mobileLiveDataService.getLocalData(dataType);

    res.status(200).json({
      success: true,
      message: 'Local data retrieved successfully',
      data: localData
    });
  } catch (error) {
    logger.error(`Error in getLocalData controller for ${req.params.dataType}:`, error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get local data'
    });
  }
});

/**
 * Get database tables information
 * @route GET /api/mobile-live-data/database-tables
 * @access Private
 */
const getDatabaseTables = asyncHandler(async (req, res) => {
  try {
    const tables = await mobileLiveDataService.getDatabaseTables();

    res.status(200).json({
      success: true,
      message: 'Database tables retrieved successfully',
      data: tables
    });
  } catch (error) {
    logger.error('Error in getDatabaseTables controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get database tables'
    });
  }
});

/**
 * Get detailed information about data availability for upload
 * @route GET /api/mobile-live-data/data-availability
 * @access Private
 */
const getDataAvailability = asyncHandler(async (req, res) => {
  try {
    // Disable caching for mobile live data endpoints
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const availabilityInfo = await mobileLiveDataService.getDataAvailabilityInfo();

    res.status(200).json({
      success: true,
      message: 'Data availability information retrieved successfully',
      data: availabilityInfo
    });
  } catch (error) {
    logger.error('Error in getDataAvailability controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get data availability information'
    });
  }
});

/**
 * Add a user to the current user's data on the remote server
 * @route POST /api/mobile-live-data/users/add-user
 * @access Private (Admin only)
 */
const addUserToCurrentUserData = asyncHandler(async (req, res) => {
  try {
    const { username, name, password, role } = req.body;

    // Get userId from license data
    const userId = await mobileLiveDataService.getUserIdFromLicense();
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Unable to retrieve user ID from license'
      });
    }

    if (!username || !name || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Username, name, password, and role are required'
      });
    }

    // Validate role
    const allowedRoles = ['admin', 'manager', 'user'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be one of: admin, manager, user'
      });
    }

    // Validate username length
    if (username.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters long'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    logger.info(`Adding user to current user data: ${username} (${name}) for userId: ${userId}`);

    const result = await mobileLiveDataService.addUserToCurrentUserData(userId, username, name, password, role);

    res.status(201).json({
      success: true,
      message: 'User added to current user data successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in addUserToCurrentUserData controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add user to current user data'
    });
  }
});

// Upload Schedule Controllers
/**
 * Create a new upload schedule
 * @route POST /api/mobile-live-data/schedules
 * @access Private (Admin only)
 */
const createUploadSchedule = asyncHandler(async (req, res) => {
  try {
    const { 
      scheduleName, 
      scheduleType, 
      scheduleTime, 
      scheduleDays, 
      dataTypes,
      isAutoSchedule,
      intervalMinutes
    } = req.body;
    
    // Get userId from license
    const userId = await mobileLiveDataService.getUserIdFromLicense();
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Unable to retrieve user ID from license'
      });
    }

    // Prepare schedule data based on type
    const scheduleData = {
      userId,
      scheduleName,
      scheduleType: isAutoSchedule ? 'interval' : scheduleType,
      scheduleTime: isAutoSchedule ? intervalMinutes.toString() : scheduleTime,
      scheduleDays: isAutoSchedule ? [] : scheduleDays,
      dataTypes,
      intervalMinutes: isAutoSchedule ? intervalMinutes : null
    };

    const result = await mobileLiveDataService.createUploadSchedule(scheduleData);

    res.status(201).json({
      success: true,
      message: 'Upload schedule created successfully',
      data: result.data
    });
  } catch (error) {
    logger.error('Error in createUploadSchedule controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create upload schedule'
    });
  }
});

/**
 * Get all upload schedules for the current user
 * @route GET /api/mobile-live-data/schedules
 * @access Private (Admin only)
 */
const getUploadSchedules = asyncHandler(async (req, res) => {
  try {
    // Get userId from license
    const userId = await mobileLiveDataService.getUserIdFromLicense();
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Unable to retrieve user ID from license'
      });
    }

    const schedules = await mobileLiveDataService.getUploadSchedules(userId);
    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    logger.error('Error in getUploadSchedules controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get upload schedules'
    });
  }
});

/**
 * Update an upload schedule
 * @route PUT /api/mobile-live-data/schedules/:scheduleId
 * @access Private (Admin only)
 */
const updateUploadSchedule = asyncHandler(async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { 
      scheduleName, 
      scheduleType, 
      scheduleTime, 
      scheduleDays, 
      dataTypes,
      isAutoSchedule,
      intervalMinutes
    } = req.body;

    // Prepare update data based on type
    const updateData = {
      scheduleName,
      scheduleType: isAutoSchedule ? 'interval' : scheduleType,
      scheduleTime: isAutoSchedule ? intervalMinutes.toString() : scheduleTime,
      scheduleDays: isAutoSchedule ? [] : scheduleDays,
      dataTypes,
      intervalMinutes: isAutoSchedule ? intervalMinutes : null
    };

    const result = await mobileLiveDataService.updateUploadSchedule(scheduleId, updateData);
    res.json({
      success: true,
      message: 'Upload schedule updated successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in updateUploadSchedule controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update upload schedule'
    });
  }
});

/**
 * Delete an upload schedule
 * @route DELETE /api/mobile-live-data/schedules/:scheduleId
 * @access Private (Admin only)
 */
const deleteUploadSchedule = asyncHandler(async (req, res) => {
  try {
    const { scheduleId } = req.params;

    const result = await mobileLiveDataService.deleteUploadSchedule(scheduleId);
    res.json({
      success: true,
      message: 'Upload schedule deleted successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in deleteUploadSchedule controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete upload schedule'
    });
  }
});

/**
 * Execute scheduled uploads (for cron job or manual trigger)
 * @route POST /api/mobile-live-data/schedules/execute
 * @access Private (Admin only)
 */
const executeScheduledUploads = asyncHandler(async (req, res) => {
  try {
    const schedulesToRun = await mobileLiveDataService.getSchedulesToRun();
    const results = [];

    for (const schedule of schedulesToRun) {
      try {
        const result = await mobileLiveDataService.executeScheduledUpload(schedule);
        results.push({
          scheduleId: schedule.id,
          scheduleName: schedule.schedule_name,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          scheduleId: schedule.id,
          scheduleName: schedule.schedule_name,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Executed ${schedulesToRun.length} scheduled uploads`,
      data: results
    });
  } catch (error) {
    logger.error('Error in executeScheduledUploads controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to execute scheduled uploads'
    });
  }
});

/**
 * Get auto upload settings
 * @route GET /api/mobile-live-data/auto-upload-settings
 * @access Private (Admin only)
 */
const getAutoUploadSettings = asyncHandler(async (req, res) => {
  try {
    const settings = await mobileLiveDataService.getAutoUploadSettings();
    res.json({
      success: true,
      message: 'Auto upload settings retrieved successfully',
      data: settings
    });
  } catch (error) {
    logger.error('Error in getAutoUploadSettings controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get auto upload settings'
    });
  }
});

/**
 * Save auto upload settings
 * @route POST /api/mobile-live-data/auto-upload-settings
 * @access Private (Admin only)
 */
const saveAutoUploadSettings = asyncHandler(async (req, res) => {
  try {
    const { enabled, interval, dataTypes } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Enabled field must be a boolean'
      });
    }

    if (!interval || interval < 1 || interval > 10080) {
      return res.status(400).json({
        success: false,
        message: 'Interval must be between 1 and 10080 minutes'
      });
    }

    if (!Array.isArray(dataTypes)) {
      return res.status(400).json({
        success: false,
        message: 'Data types must be an array'
      });
    }

    const settings = await mobileLiveDataService.saveAutoUploadSettings({ enabled, interval, dataTypes });
    res.json({
      success: true,
      message: 'Auto upload settings saved successfully',
      data: settings
    });
  } catch (error) {
    logger.error('Error in saveAutoUploadSettings controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to save auto upload settings'
    });
  }
});

/**
 * Upload data to remote server
 * @route POST /api/mobile-live-data/remote-upload
 * @access Private
 */
const uploadDataToRemote = asyncHandler(async (req, res) => {
  try {
    const data = req.body;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Valid data object is required'
      });
    }

    const result = await mobileLiveDataService.uploadDataToRemote(data);

    res.status(200).json({
      success: true,
      message: 'Data uploaded to remote server successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in uploadDataToRemote controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload data to remote server'
    });
  }
});

module.exports = {
  createUser,
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  uploadData,
  syncData,
  testConnection,
  testConnectionPublic,
  getSyncStatus,
  getLicenseInfo,
  getUserIdFromLicense,
  getLocalData,
  getDatabaseTables,
  getDataAvailability,
  addUserToCurrentUserData,
  createUploadSchedule,
  getUploadSchedules,
  updateUploadSchedule,
  deleteUploadSchedule,
  executeScheduledUploads,
  getAutoUploadSettings,
  saveAutoUploadSettings,
  uploadDataToRemote
};
