const express = require('express');
const router = express.Router();
const licenseControllers = require('../controllers/licenseControllers');

// GET routes without caching - always fresh responses
router.get('/status', licenseControllers.verifyLicenseAndKey);

router.get('/verify-offline-first', licenseControllers.verifyLicenseOfflineFirst);

router.get('/check-local', licenseControllers.checkLocalLicense);

// Diagnostic route for troubleshooting fingerprint issues
router.get('/diagnose', async (req, res) => {
  try {
    const licenseService = require('../services/licenseService');
    const diagnosis = await licenseService.diagnoseFingerprintIssues();
    
    res.json({
      success: true,
      data: diagnosis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Diagnosis failed',
      error: error.message
    });
  }
});

// Manual license verification route
router.get('/verify-manual', licenseControllers.manualLicenseVerification);

// Schedule status route
router.get('/schedule/status', licenseControllers.getScheduleStatus);

// Start/restart scheduler route
router.post('/schedule/start', licenseControllers.startScheduler);

// Stop scheduler route
router.post('/schedule/stop', licenseControllers.stopScheduler);

// POST routes without cache invalidation - controllers handle their own cache clearing
router.post('/first-activation', licenseControllers.firstActivationService);

router.post('/activation', licenseControllers.activationServiceWithCode);

// Cache management routes - simplified to just clear internal cache
router.get('/cache/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'Cache middleware removed - all responses are fresh',
      timestamp: new Date().toISOString()
    }
  });
});

router.post('/cache/clear', (req, res) => {
  // Clear internal license service cache only
  const licenseService = require('../services/licenseService');
  licenseService.clearLicenseCache();
  
  res.json({
    success: true,
    message: 'License cache cleared successfully'
  });
});

// License notification endpoints
router.get('/notifications', (req, res) => {
  // Return any pending notifications (for polling)
  const notifications = global.pendingNotifications || [];
  
  // Don't clear notifications immediately - let them persist for a while
  // Only clear after they've been fetched multiple times or after some time
  if (global.notificationFetchCount === undefined) {
    global.notificationFetchCount = 0;
  }
  global.notificationFetchCount++;
  
  // Clear notifications after 5 fetches (2.5 minutes with 30-second polling)
  if (global.notificationFetchCount >= 5) {
    global.pendingNotifications = [];
    global.notificationFetchCount = 0;
  }
  
  res.json({
    success: true,
    notifications: notifications,
    timestamp: new Date().toISOString()
  });
});

router.post('/notifications', (req, res) => {
  // Handle incoming notifications from the notification system
  const { level, message, data } = req.body;
  
  // Store notification for frontend polling
  if (!global.pendingNotifications) {
    global.pendingNotifications = [];
  }
  
  global.pendingNotifications.push({
    level,
    message,
    data,
    timestamp: new Date().toISOString()
  });
  
  // Keep only last 10 notifications
  if (global.pendingNotifications.length > 10) {
    global.pendingNotifications = global.pendingNotifications.slice(-10);
  }
  
  res.json({
    success: true,
    message: 'Notification received'
  });
});

// Manual trigger endpoint for testing
router.post('/notifications/test', (req, res) => {
  const testNotification = {
    level: 'warning_1_day',
    message: '🚨 ينتهي ترخيصك غداً! يرجى التجديد فوراً لتجنب انقطاع الخدمة.',
    data: {
      daysUntilExpiry: 1,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      licenseType: 'بريميوم',
      action: 'renew_urgently'
    },
    timestamp: new Date().toISOString()
  };
  
  // Store notification for frontend polling
  if (!global.pendingNotifications) {
    global.pendingNotifications = [];
  }
  
  global.pendingNotifications.push(testNotification);
  
  // Reset fetch count so notification persists
  global.notificationFetchCount = 0;
  
  res.json({
    success: true,
    message: 'Test notification sent',
    notification: testNotification
  });
});

module.exports = router;