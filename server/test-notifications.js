#!/usr/bin/env node

/**
 * Test License Notification System
 * 
 * This script tests the notification system by simulating different expiration scenarios
 */

const licenseService = require('./services/licenseService');

async function testNotifications() {
  try {
    console.log('🧪 === TESTING LICENSE NOTIFICATION SYSTEM ===');
    
    // Test different expiration scenarios
    const testScenarios = [
      {
        name: '10 Days Warning',
        expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        expectedLevel: 'warning_10_days'
      },
      {
        name: '5 Days Warning',
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        expectedLevel: 'warning_5_days'
      },
      {
        name: '1 Day Warning',
        expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        expectedLevel: 'warning_1_day'
      },
      {
        name: 'Expired License',
        expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        expectedLevel: 'expired'
      }
    ];
    
    for (const scenario of testScenarios) {
      console.log(`\n🔍 Testing: ${scenario.name}`);
      console.log(`📅 Expires at: ${scenario.expiresAt}`);
      
      // Create mock license data
      const mockLicenseData = {
        type: 'test',
        expires_at: scenario.expiresAt,
        license: {
          licenseData: {
            data: {
              expires_at: scenario.expiresAt,
              type: 'test'
            }
          }
        }
      };
      
      // Test notification system
      const result = await licenseService.licenseNotifications.checkExpirationAndNotify(mockLicenseData);
      
      console.log(`✅ Result: ${result.willExpire ? 'Will expire' : 'Never expires'}`);
      console.log(`📊 Days until expiry: ${result.daysUntilExpiry}`);
      console.log(`📢 Notifications sent: ${result.notifications.length}`);
      
      result.notifications.forEach(notification => {
        console.log(`   - ${notification.level}: ${notification.message}`);
      });
      
      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n✅ === NOTIFICATION SYSTEM TEST COMPLETED ===');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testNotifications().then(() => {
  console.log('✅ Test completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}); 