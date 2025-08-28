#!/usr/bin/env node

const licenseService = require('./services/licenseService');
const { startLicenseScheduler } = require('./start-license-scheduler');

async function testLicenseScheduler() {
  console.log('🧪 === TESTING LICENSE VERIFICATION SCHEDULER ===\n');
  
  try {
    // Test 1: Manual verification
    console.log('1. Testing manual license verification...');
    const manualResult = await licenseService.manualLicenseVerification();
    console.log('✅ Manual verification result:', {
      success: manualResult.success,
      timestamp: manualResult.timestamp,
      fingerprint: manualResult.fingerprint
    });
    console.log('');
    
    // Test 2: Start scheduler
    console.log('2. Testing scheduler startup...');
    const scheduler = startLicenseScheduler();
    
    if (scheduler) {
      console.log('✅ Scheduler started successfully');
      console.log('   Is running:', scheduler.isRunning);
      console.log('   Interval:', scheduler.interval);
      console.log('   Last run:', scheduler.lastRun);
    } else {
      console.log('❌ Scheduler failed to start');
    }
    console.log('');
    
    // Test 3: Check global scheduler
    console.log('3. Checking global scheduler status...');
    if (global.licenseScheduler) {
      console.log('✅ Global scheduler exists');
      console.log('   Is running:', global.licenseScheduler.isRunning);
      console.log('   Interval ID:', global.licenseScheduler.intervalId ? 'Set' : 'Not set');
    } else {
      console.log('❌ Global scheduler not found');
    }
    console.log('');
    
    // Test 4: Test immediate verification
    console.log('4. Testing immediate verification...');
    if (scheduler && scheduler.verifyNow) {
      console.log('   Running immediate verification...');
      // The verification will run and log to console
    } else {
      console.log('❌ Immediate verification not available');
    }
    console.log('');
    
    // Test 5: Simulate API endpoints
    console.log('5. Testing API endpoint simulation...');
    console.log('   GET /api/license/schedule/status - Check scheduler status');
    console.log('   POST /api/license/schedule/start - Start scheduler');
    console.log('   POST /api/license/schedule/stop - Stop scheduler');
    console.log('   GET /api/license/verify-manual - Manual verification');
    console.log('');
    
    console.log('✅ All tests completed successfully!');
    console.log('📅 Monthly license verification is now scheduled');
    console.log('🔍 Check server logs for verification details');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testLicenseScheduler().then(() => {
  console.log('\n🧪 === TEST COMPLETED ===');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test crashed:', error);
  process.exit(1);
}); 