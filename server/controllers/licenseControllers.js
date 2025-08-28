const licenseService = require('../services/licenseService');
const logger = require('../utils/logger');

// Simple app startup detection without caching
const isAppStartup = () => {
  // For now, always return false since we're not caching
  // This ensures fresh responses every time
  return false;
};

// first activation service
exports.firstActivationService = async (req, res) => {
    try {
        // Ensure res is properly defined
        if (!res || typeof res.json !== 'function') {
            logger.error('Invalid response object in firstActivationService');
            return;
        }

        // Extract location data and code from request body
        const locationData = req.body.location || null;
        const code = req.body.code || null;
        
        logger.info('🔍 Full request body:', JSON.stringify(req.body, null, 2));
        
        if (locationData) {
            logger.info('📍 Location data received from client');
            logger.info(`📍 Latitude: ${locationData.latitude}`);
            logger.info(`📍 Longitude: ${locationData.longitude}`);
            logger.info(`📍 Accuracy: ${locationData.accuracy || 'N/A'}`);
            logger.info(`📍 Source: ${locationData.source || 'N/A'}`);
            
            // Log the formatted location that will be sent to remote server
            const formattedLocation = `${locationData.latitude},${locationData.longitude}`;
            logger.info(`📍 Formatted location for remote server: ${formattedLocation}`);
        } else {
            logger.info('📍 No location data provided, using default location');
        }

        if (code) {
            logger.info('🔑 First activation code provided');
            logger.info(`🔑 Code: ${code.substring(0, 4)}...`);
        } else {
            logger.info('🔑 No first activation code provided');
        }

        logger.info('🔄 Starting first activation service...');
        const result = await licenseService.firstActivationService(locationData, code);
        
        if (result.success) {
            logger.info('✅ First activation completed successfully');
            logger.info(`📄 Device ID: ${result.fingerprint?.substring(0, 12)}...`);
            logger.info(`🏷️  License Type: ${result.licenseType}`);
            
            // Clear all license cache after successful activation
            licenseService.clearLicenseCache();
            logger.info('🧹 License cache cleared after first activation');
        } else {
            logger.warn('⚠️ First activation failed');
            logger.warn(`📄 Error: ${result.message}`);
        }
        
        res.json(result);
    } catch (err) {
        logger.error('Error in licenseControllers.firstActivationService:', err);
        if (res && typeof res.status === 'function' && typeof res.json === 'function') {
            res.status(500).json({ error: err.message });
        } else {
            logger.error('Cannot send error response - res object is invalid');
        }
    }
}

exports.verifyLicenseAndKey = async (req, res) => {
    try {
        // Ensure res is properly defined
        if (!res || typeof res.json !== 'function') {
            logger.error('Invalid response object in verifyLicenseAndKey');
            return;
        }

        const isStartup = isAppStartup();
        logger.info(`🔍 License verification requested - Startup: ${isStartup}`);
        
        const result = await licenseService.verifyLicenseAndKey();
        
        if (result.success) {
            logger.info('✅ License verification successful');
            logger.info(`📄 Status: ${result.message || 'License verified'}`);
            logger.info(`🆔 Device ID: ${result.device_id?.substring(0, 12)}...`);
            logger.info(`🏷️  Type: ${result.type || 'Standard'}`);
            if (result.offline) {
                logger.info('🌐 Running in offline mode');
            }
        } else {
            logger.warn('⚠️ License verification failed');
            logger.warn(`📄 Status: ${result.message}`);
            if (result.needsFirstActivation) {
                logger.warn('🔧 First activation required');
            }
        }
        
        res.json(result);
    } catch (err) {
        logger.error('Error in licenseControllers.verifyLicenseAndKey:', err);
        if (res && typeof res.status === 'function' && typeof res.json === 'function') {
            res.status(500).json({ error: err.message });
        } else {
            logger.error('Cannot send error response - res object is invalid');
        }
    }
}

// Offline-first license verification
exports.verifyLicenseOfflineFirst = async (req, res) => {
    try {
        // Ensure res is properly defined
        if (!res || typeof res.json !== 'function') {
            logger.error('Invalid response object in verifyLicenseOfflineFirst');
            return;
        }

        const isStartup = isAppStartup();
        logger.info(`🔍 Offline-first license verification - Startup: ${isStartup}`);
        
        const result = await licenseService.verifyLicenseOfflineFirst();
        
        if (result.success) {
            logger.info('✅ Offline-first license verification successful');
            logger.info(`📄 Source: ${result.source || 'unknown'}`);
            logger.info(`🆔 Device ID: ${result.device_id?.substring(0, 12)}...`);
            logger.info(`🏷️  Type: ${result.type || 'Standard'}`);
            if (result.offline) {
                logger.info('🌐 Running in offline mode');
            }
        } else {
            logger.warn('⚠️ Offline-first license verification failed');
            logger.warn(`📄 Status: ${result.message}`);
            if (result.needsFirstActivation) {
                logger.warn('🔧 First activation required');
            }
        }
        
        res.json(result);
    } catch (err) {
        logger.error('Error in licenseControllers.verifyLicenseOfflineFirst:', err);
        if (res && typeof res.status === 'function' && typeof res.json === 'function') {
            res.status(500).json({ error: err.message });
        } else {
            logger.error('Cannot send error response - res object is invalid');
        }
    }
}

// Check local license only (no network calls)
exports.checkLocalLicense = async (req, res) => {
    try {
        // Ensure res is properly defined
        if (!res || typeof res.json !== 'function') {
            logger.error('Invalid response object in checkLocalLicense');
            return;
        }

        const isStartup = isAppStartup();
       
        
        const { generateDeviceFingerprint } = licenseService;
        
        // Generate fingerprint since checkLocalLicense expects it
        const fingerprint = await generateDeviceFingerprint();
        const result = await licenseService.checkLocalLicense(fingerprint);
        
     
        
        res.json(result);
    } catch (err) {
        logger.error('Error in licenseControllers.checkLocalLicense:', err);
        if (res && typeof res.status === 'function' && typeof res.json === 'function') {
            res.status(500).json({ error: err.message });
        } else {
            logger.error('Cannot send error response - res object is invalid');
        }
    }
}

exports.activationServiceWithCode = async (req, res) => {
    try {
        // Ensure res is properly defined
        if (!res || typeof res.json !== 'function') {
            logger.error('Invalid response object in activationServiceWithCode');
            return;
        }

        const { activation_code } = req.body;
        if (!activation_code) {
            logger.warn('⚠️ Activation code missing in request');
            return res.status(400).json({ 
                success: false, 
                message: 'Activation code is required' 
            });
        }
        
        // Extract location data from request body
        const locationData = req.body.location || null;
        
        if (locationData) {
        
            // Log the formatted location that will be sent to remote server
            const formattedLocation = `${locationData.latitude},${locationData.longitude}`;
            logger.info(`📍 Formatted location for remote server: ${formattedLocation}`);
        } else {
            logger.info('📍 No location data provided, using default location');
        }
        
        logger.info('🔄 Starting activation with code...');
        logger.info(`🔑 Activation Code: ${activation_code.substring(0, 8)}...`);
        
        const result = await licenseService.activationServiceWithCode(activation_code, locationData);
        
        if (result.success) {
        
            
            // Clear all license cache after successful activation
            licenseService.clearLicenseCache();
            logger.info('🧹 License cache cleared after activation with code');
        } else {
            logger.warn('⚠️ Activation with code failed');
            logger.warn(`📄 Error: ${result.message}`);
        }
        
        res.json(result);
    } catch (err) {
        logger.error('Error in licenseControllers.activationServiceWithCode:', err);
        if (res && typeof res.status === 'function' && typeof res.json === 'function') {
            res.status(500).json({ error: err.message });
        } else {
            logger.error('Cannot send error response - res object is invalid');
        }
    }
}

// Manual license verification controller
const manualLicenseVerification = async (req, res) => {
  try {
    const licenseService = require('../services/licenseService');
    const result = await licenseService.manualLicenseVerification();
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Manual license verification controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Manual verification failed',
      error: error.message
    });
  }
};

// Get schedule status controller
const getScheduleStatus = async (req, res) => {
  try {
    const isScheduled = global.licenseScheduler ? true : false;
    const schedulerInfo = global.licenseScheduler || {};
    
    res.json({
      success: true,
      data: {
        scheduled: isScheduled,
        message: isScheduled ? 'Monthly license verification is scheduled' : 'Monthly license verification is not scheduled',
        scheduler: {
          isRunning: schedulerInfo.isRunning || false,
          lastRun: schedulerInfo.lastRun || null,
          interval: schedulerInfo.interval || null
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Get schedule status controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get schedule status',
      error: error.message
    });
  }
};

// Start scheduler controller
const startScheduler = async (req, res) => {
  try {
    const licenseService = require('../services/licenseService');
    
    // Clear any existing scheduler
    if (global.licenseScheduler && global.licenseScheduler.intervalId) {
      clearInterval(global.licenseScheduler.intervalId);
      console.log('🛑 Stopped existing license verification scheduler');
    }
    
    // Start new scheduler
    global.licenseScheduler = licenseService.scheduleLicenseVerification();
    
    res.json({
      success: true,
      message: 'Monthly license verification scheduler started successfully',
      data: {
        scheduled: true,
        interval: global.licenseScheduler.interval,
        isRunning: global.licenseScheduler.isRunning,
        lastRun: global.licenseScheduler.lastRun,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Start scheduler controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start scheduler',
      error: error.message
    });
  }
};

// Stop scheduler controller
const stopScheduler = async (req, res) => {
  try {
    if (global.licenseScheduler && global.licenseScheduler.intervalId) {
      clearInterval(global.licenseScheduler.intervalId);
      global.licenseScheduler = null;
      
      console.log('🛑 License verification scheduler stopped');
      
      res.json({
        success: true,
        message: 'Monthly license verification scheduler stopped successfully',
        data: {
          scheduled: false,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.json({
        success: true,
        message: 'No active scheduler found',
        data: {
          scheduled: false,
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    console.error('❌ Stop scheduler controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop scheduler',
      error: error.message
    });
  }
};

module.exports = {
  firstActivationService: exports.firstActivationService,
  verifyLicenseAndKey: exports.verifyLicenseAndKey,
  verifyLicenseOfflineFirst: exports.verifyLicenseOfflineFirst,
  checkLocalLicense: exports.checkLocalLicense,
  activationServiceWithCode: exports.activationServiceWithCode,
  manualLicenseVerification,
  getScheduleStatus,
  startScheduler,
  stopScheduler
};