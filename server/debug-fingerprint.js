#!/usr/bin/env node

const licenseService = require('./services/licenseService');

async function debugFingerprint() {
  console.log('🔍 === FINGERPRINT DEBUG SCRIPT ===\n');
  
  try {
    // Test fingerprint generation
    console.log('1. Testing fingerprint generation...');
    const fingerprint = await licenseService.generateDeviceFingerprint();
    console.log('✅ Generated fingerprint:', fingerprint);
    console.log('   Length:', fingerprint.length);
    console.log('   Components:', fingerprint.split('-').length);
    console.log('');
    
    // Run full diagnosis
    console.log('2. Running full diagnosis...');
    const diagnosis = await licenseService.diagnoseFingerprintIssues();
    
    if (diagnosis.success) {
      console.log('✅ Diagnosis completed successfully');
      console.log('   System:', diagnosis.systemInfo.manufacturer, diagnosis.systemInfo.model);
      console.log('   License files exist:', diagnosis.licenseExists);
      console.log('   Public key exists:', diagnosis.publicKeyExists);
      console.log('   Fingerprint components:');
      console.log('     Machine ID:', diagnosis.fingerprintComponents.machineId);
      console.log('     Hostname:', diagnosis.fingerprintComponents.hostname);
      console.log('     Manufacturer:', diagnosis.fingerprintComponents.manufacturer);
      console.log('     Model:', diagnosis.fingerprintComponents.model);
      console.log('     Serial:', diagnosis.fingerprintComponents.serial);
    } else {
      console.log('❌ Diagnosis failed:', diagnosis.error);
    }
    console.log('');
    
    // Test license verification
    console.log('3. Testing license verification...');
    try {
      const verification = await licenseService.verifyLicenseOfflineFirst(true); // Force clear cache
      console.log('✅ License verification result:', {
        success: verification.success,
        message: verification.message,
        source: verification.source,
        offline: verification.offline
      });
    } catch (error) {
      console.log('❌ License verification failed:', error.message);
    }
    console.log('');
    
    // Test local license check
    console.log('4. Testing local license check...');
    try {
      const localCheck = await licenseService.checkLocalLicense(fingerprint);
      console.log('✅ Local license check result:', {
        success: localCheck.success,
        message: localCheck.message
      });
    } catch (error) {
      console.log('❌ Local license check failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Debug script failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the debug script
debugFingerprint().then(() => {
  console.log('\n🔍 === DEBUG SCRIPT COMPLETED ===');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Debug script crashed:', error);
  process.exit(1);
}); 