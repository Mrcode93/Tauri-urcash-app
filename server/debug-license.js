const fs = require('fs');
const path = require('path');
const os = require('os');

// Use the same constants as the license service
const APP_DATA_DIR = path.join(os.homedir(), '.urcash');
const PUBLIC_KEY_DIR = path.join(APP_DATA_DIR, 'license');

console.log('🔍 Debug License Service');
console.log('=======================');
console.log(`📁 App Data Directory: ${APP_DATA_DIR}`);
console.log(`📁 License Directory: ${PUBLIC_KEY_DIR}`);
console.log('');

// Check if directories exist
console.log('📂 Directory Status:');
console.log(`   App Data Dir exists: ${fs.existsSync(APP_DATA_DIR)}`);
console.log(`   License Dir exists: ${fs.existsSync(PUBLIC_KEY_DIR)}`);
console.log('');

// Check if files exist
const publicKeyPath = path.join(PUBLIC_KEY_DIR, 'public.pem');
const licensePath = path.join(PUBLIC_KEY_DIR, 'license.json');

console.log('📄 File Status:');
console.log(`   public.pem exists: ${fs.existsSync(publicKeyPath)}`);
console.log(`   license.json exists: ${fs.existsSync(licensePath)}`);
console.log('');

// If files exist, check their content
if (fs.existsSync(publicKeyPath)) {
  const publicKeyContent = fs.readFileSync(publicKeyPath, 'utf8');
  console.log('🔑 Public Key Content:');
  console.log(`   Size: ${publicKeyContent.length} characters`);
  console.log(`   Empty: ${publicKeyContent.trim() === ''}`);
  console.log(`   Type: ${typeof publicKeyContent}`);
  console.log(`   Preview: ${publicKeyContent.substring(0, 100)}...`);
  console.log('');
}

if (fs.existsSync(licensePath)) {
  const licenseContent = fs.readFileSync(licensePath, 'utf8');
  console.log('📋 License Content:');
  console.log(`   Size: ${licenseContent.length} characters`);
  console.log(`   Empty: ${licenseContent.trim() === ''}`);
  console.log(`   Type: ${typeof licenseContent}`);
  console.log(`   Preview: ${licenseContent.substring(0, 100)}...`);
  console.log('');
}

// Test file writing
console.log('🧪 Testing File Writing:');
try {
  const testContent = '-----BEGIN PUBLIC KEY-----\nTEST KEY\n-----END PUBLIC KEY-----';
  fs.writeFileSync(path.join(PUBLIC_KEY_DIR, 'test.pem'), testContent);
  console.log('   ✅ Test file written successfully');
  
  const readBack = fs.readFileSync(path.join(PUBLIC_KEY_DIR, 'test.pem'), 'utf8');
  console.log(`   ✅ Test file read back: ${readBack === testContent ? 'MATCH' : 'MISMATCH'}`);
  
  // Clean up
  fs.unlinkSync(path.join(PUBLIC_KEY_DIR, 'test.pem'));
  console.log('   ✅ Test file cleaned up');
} catch (error) {
  console.error('   ❌ Test file writing failed:', error.message);
}
console.log('');

console.log('🔍 Debug Complete'); 