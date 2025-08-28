#!/usr/bin/env node

/**
 * Monthly License Verification Script
 * 
 * This script can be run manually or via cron to check license status
 * without causing infinite loops in the main server.
 * 
 * Usage:
 * - Manual: node check-license-monthly.js
 * - Cron: Add to crontab: 0 0 1 * * cd /path/to/server && node check-license-monthly.js
 */

const licenseService = require('./services/licenseService');
const logger = require('./utils/logger');

async function checkLicenseMonthly() {
  try {
    console.log('🔍 === MONTHLY LICENSE VERIFICATION SCRIPT ===');
    console.log('📅 Verification time:', new Date().toISOString());
    
    // Get current fingerprint
    const fingerprint = await licenseService.generateDeviceFingerprint();
    console.log('🔍 Current fingerprint:', fingerprint.substring(0, 50) + '...');
    
    // Verify license using offline-first approach
    const verificationResult = await licenseService.verifyLicenseOfflineFirst(true);
    
    if (verificationResult.success) {
      console.log('✅ License verification: SUCCESS');
      console.log('   License type:', verificationResult.type);
      
      // Extract proper activated_at and expires_at from license data
      let activatedAt = verificationResult.activated_at;
      let expiresAt = verificationResult.expires_at;
      
      // If not found in top level, try to extract from nested license data
      if (!activatedAt && verificationResult.license && verificationResult.license.licenseData) {
        const licenseData = verificationResult.license.licenseData.data;
        activatedAt = licenseData.activated_at;
        expiresAt = licenseData.expires_at;
      }
      
      console.log('   Activated at:', activatedAt || 'Not specified');
      console.log('   Expires at:', expiresAt || 'Never');
      
      // Check license expiration and send notifications to UI
      const notificationResult = await licenseService.licenseNotifications.checkExpirationAndNotify(verificationResult);
      
      if (notificationResult.willExpire) {
        console.log(`   Days until expiry: ${notificationResult.daysUntilExpiry}`);
        
        if (notificationResult.notifications.length > 0) {
          console.log(`   📢 Sent ${notificationResult.notifications.length} notification(s) to UI`);
          notificationResult.notifications.forEach(notification => {
            console.log(`      - ${notification.level}: ${notification.message}`);
          });
        }
      } else {
        console.log('   ✅ License never expires');
      }
      
      // Log verification details
      console.log('   Source:', verificationResult.source);
      console.log('   Offline:', verificationResult.offline);
      
    } else {
      console.log('❌ License verification: FAILED');
      console.log('   Error:', verificationResult.message);
      console.log('   Source:', verificationResult.source);
      console.log('   Offline:', verificationResult.offline);
      
      // If verification failed, try to fetch fresh license from server
      if (!verificationResult.offline) {
        console.log('🔄 Attempting to fetch fresh license from server...');
        try {
          const freshLicense = await licenseService.getLicenseInfoByFingerprint(fingerprint);
          if (freshLicense.success) {
            console.log('✅ Successfully fetched fresh license from server');
          } else {
            console.log('❌ Failed to fetch fresh license:', freshLicense.message);
          }
        } catch (fetchError) {
          console.log('❌ Error fetching fresh license:', fetchError.message);
        }
      }
    }
    
    console.log('🔍 === MONTHLY LICENSE VERIFICATION COMPLETED ===\n');
    
  } catch (error) {
    console.error('❌ Monthly license verification failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the verification
checkLicenseMonthly().then(() => {
  console.log('✅ Script completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
}); 