#!/usr/bin/env node

const licenseService = require('./services/licenseService');

/**
 * Auto-start license verification scheduler
 * This script should be called when the server starts to ensure
 * monthly license verification is always running
 */
function startLicenseScheduler() {
  console.log('🚀 === STARTING LICENSE VERIFICATION SCHEDULER ===');
  
  try {
    // Check if scheduler is already running
    if (global.licenseScheduler && global.licenseScheduler.isRunning) {
      console.log('⚠️ License scheduler already running, skipping...');
      return global.licenseScheduler;
    }
    
    // Clear any existing scheduler that might be in a bad state
    if (global.licenseScheduler && global.licenseScheduler.intervalId) {
      console.log('🛑 Clearing existing scheduler...');
      clearInterval(global.licenseScheduler.intervalId);
      global.licenseScheduler = null;
    }
    
    // Start the scheduler
    const scheduler = licenseService.scheduleLicenseVerification();
    
    if (scheduler) {
      console.log('✅ License verification scheduler started successfully');
      console.log('📅 Next verification will run in 30 days');
      console.log('🔍 Scheduler info:', {
        isRunning: scheduler.isRunning,
        interval: scheduler.interval,
        lastRun: scheduler.lastRun
      });
    } else {
      console.log('❌ Failed to start license verification scheduler');
    }
    
    return scheduler;
    
  } catch (error) {
    console.error('❌ Failed to start license verification scheduler:', error.message);
    console.error('Stack:', error.stack);
    return null;
  }
}

// Export for use in other modules
module.exports = {
  startLicenseScheduler
};

// If this script is run directly, start the scheduler
if (require.main === module) {
  startLicenseScheduler();
} 