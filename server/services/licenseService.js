const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const http = require('http');
const { machineIdSync } = require('node-machine-id');
const si = require('systeminformation');
const { URL } = require('url');

// const API_URL = 'http://localhost:3002/api';
const API_URL = 'https://urcash.up.railway.app/api';

// Use app data directory for logs and uploads
const APP_DATA_DIR = path.join(os.homedir(), '.urcash');
const PUBLIC_KEY_DIR= path.join(APP_DATA_DIR, 'license');

// Internal cache for license operations
const licenseCache = new Map();
const CACHE_TTL = {
  local: 5 * 60 * 1000, // 5 minutes for local license checks
  fingerprint: 10 * 60 * 1000, // 10 minutes for fingerprint generation
  decryption: 2 * 60 * 1000 // 2 minutes for decryption results
};

// Cache management functions
const getCacheKey = (operation, identifier) => `license:${operation}:${identifier}`;

const getFromCache = (key) => {
  const cached = licenseCache.get(key);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }
  licenseCache.delete(key);
  return null;
};

const setCache = (key, data, ttl = CACHE_TTL.local) => {
  licenseCache.set(key, {
    data,
    expires: Date.now() + ttl
  });
};

const clearLicenseCache = () => {
  licenseCache.clear();
  console.log('🧹 تم حذف الكاش الداخلي للترخيص');
};

// Force clear all license caches
const forceClearLicenseCache = () => {
  licenseCache.clear();
  console.log('🧹 تم حذف الكاش الداخلي للترخيص');
};

// Clear cache every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of licenseCache.entries()) {
    if (now > value.expires) {
      licenseCache.delete(key);
    }
  }
}, 10 * 60 * 1000);

const sendPostRequest = (url, data) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const payload = JSON.stringify(data);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    // Choose the appropriate module based on the protocol
    const requestModule = urlObj.protocol === 'https:' ? https : http;

    const req = requestModule.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          console.log('🔍 تم تحليل الرد بنجاح:', typeof parsed);
          console.log('🔍 مفاتيح الرد:', Object.keys(parsed || {}));
          
          resolve(parsed);
        } catch (err) {
          console.error('❌ خطأ في تحليل JSON الرد:', err.message);
          console.error('❌ الرد الأولي:', body.substring(0, 200) + '...');
          resolve(body); // fallback
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(payload);
    req.end();
  });
};

const sendGetRequest = (url) => {
  return new Promise((resolve, reject) => {
    console.log('🔍 sendGetRequest - Making request to:', url);
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    

    // Choose the appropriate module based on the protocol
    const requestModule = urlObj.protocol === 'https:' ? https : http;

    const req = requestModule.request(options, (res) => {
      
      let body = '';

      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed);
        } catch (err) {
          resolve(body); // fallback
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });
    req.end();
  });
};

// ! ========================[ generate device fingerprint ]==================================================
async function generateDeviceFingerprint() {
  // Check cache first
  const cacheKey = getCacheKey('fingerprint', 'device');
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  const machineId = machineIdSync({ original: true });
  const hostname = os.hostname();
  
  // Get more detailed system information for better fingerprinting
  let systemInfo = {};
  try {
    systemInfo = await si.system();
  } catch (error) {
    console.warn('⚠️ Could not get detailed system info:', error.message);
  }

  // Create a stable fingerprint using only hardware identifiers that don't change
  // Use '|' as separator to avoid conflicts with machine ID which contains hyphens
  const fingerprintComponents = [
    machineId,                    // Machine ID - very stable
    hostname,                     // Hostname - usually stable
    systemInfo.manufacturer || 'unknown',  // Hardware manufacturer
    systemInfo.model || 'unknown',         // Hardware model
    systemInfo.serial || 'unknown'         // Hardware serial number
  ];
  
  const fingerprint = fingerprintComponents.join('|');
  
  // Cache the fingerprint
  setCache(cacheKey, fingerprint, CACHE_TTL.fingerprint);
  
  // Log fingerprint components for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 مكونات الترخيص:', {
      machineId: machineId.substring(0, 8) + '...',
      hostname,
      manufacturer: systemInfo.manufacturer || 'unknown',
      model: systemInfo.model || 'unknown',
      serial: systemInfo.serial || 'unknown'
    });
    console.log('🔍 تم إنشاء الترخيص:', fingerprint.substring(0, 50) + '...');
  }
  
  return fingerprint;
}

// ! ========================[ get ipadress of the machine ]==================================================
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (
        iface.family === 'IPv4' &&
        !iface.internal
      ) {
        return iface.address;
      }
    }
  }
  return 'IP not found';
}

// ===================[ decrypt license with fingerprint variations ]==================================================
const decryptLicense = async (license, currentFingerprint) => {
  try {
    if (!license) {
      throw new Error('الترخيص غير معروف');
    }
    
    // Check cache first
    const cacheKey = getCacheKey('decrypt', `${currentFingerprint}:${license.substring(0, 50)}`);
    const cached = getFromCache(cacheKey);
    if (cached) {
      return cached;
    }
    
    // The license is in format: iv_hex:encrypted_data_hex
    const parts = license.split(':');
    if (parts.length !== 2) {
      throw new Error('تنسيق الترخيص غير صالح');
    }
    
    const ivHex = parts[0];
    const encryptedDataHex = parts[1];
    
    // Convert hex strings to buffers
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedData = Buffer.from(encryptedDataHex, 'hex');
  
    // Log current fingerprint for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 يتم التشفير باستخدام الترخيص:', currentFingerprint.substring(0, 50) + '...');
    }
    
    // Try multiple fingerprint variations to find the one that works
    // Focus on stable components without MAC addresses
    const fingerprintVariations = [
      currentFingerprint, // Current stable fingerprint
      // Try with just machine ID and hostname (legacy format)
      currentFingerprint.split('|').slice(0, 2).join('|'),
      // Try with just machine ID (most stable)
      currentFingerprint.split('|')[0],
      // Try with machine ID, hostname, and manufacturer
      currentFingerprint.split('|').slice(0, 3).join('|'),
      // Try with machine ID, hostname, manufacturer, and model
      currentFingerprint.split('|').slice(0, 4).join('|'),
      // Try with just machine ID and manufacturer
      `${currentFingerprint.split('|')[0]}|${currentFingerprint.split('|')[2]}`,
      // Try with machine ID and model
      `${currentFingerprint.split('|')[0]}|${currentFingerprint.split('|')[3]}`,
      // Try with machine ID and serial
      `${currentFingerprint.split('|')[0]}|${currentFingerprint.split('|')[4]}`,
      // Legacy variations for backward compatibility (without MAC)
      currentFingerprint.replace('|unknown|unknown|unknown', ''),
      currentFingerprint.replace('|unknown|unknown', ''),
      currentFingerprint.replace('|unknown', '')
    ];
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Will try', fingerprintVariations.length, 'fingerprint variations');
    }
    
    for (let i = 0; i < fingerprintVariations.length; i++) {
      const fingerprint = fingerprintVariations[i];
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Trying variation ${i + 1}/${fingerprintVariations.length}:`, fingerprint.substring(0, 50) + '...');
      }
      
      // Create key from device fingerprint using SHA-256
      const key = crypto.createHash('sha256').update(fingerprint).digest();
      
      try {
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedDataHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        // Parse the JSON data
        const licenseData = JSON.parse(decrypted);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Decryption successful with variation', i + 1, 'using fingerprint:', fingerprint.substring(0, 50) + '...');
        }
        
        const result = {
          success: true,
          licenseData: licenseData,
          iv: ivHex,
          fingerprint: fingerprint,
          variationUsed: i + 1
        };
        
        // Cache the successful decryption
        setCache(cacheKey, result, CACHE_TTL.decryption);
        
        return result;
      } catch (decryptError) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`❌ Variation ${i + 1} failed:`, decryptError.message);
        }
        
        // Try alternative key derivation for this variation
        try {
          const md5Key = crypto.createHash('md5').update(fingerprint).digest();
          const paddedKey = Buffer.concat([md5Key, md5Key]); // Pad to 32 bytes
          
          const decipher = crypto.createDecipheriv('aes-256-cbc', paddedKey, iv);
          let decrypted = decipher.update(encryptedDataHex, 'hex', 'utf8');
          decrypted += decipher.final('utf8');
          
          const licenseData = JSON.parse(decrypted);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Decryption successful with MD5 key variation', i + 1, 'using fingerprint:', fingerprint.substring(0, 50) + '...');
          }
          
          const result = {
            success: true,
            licenseData: licenseData,
            iv: ivHex,
            fingerprint: fingerprint,
            variationUsed: i + 1,
            keyMethod: 'md5'
          };
          
          // Cache the successful decryption
          setCache(cacheKey, result, CACHE_TTL.decryption);
          
          return result;
        } catch (altError) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`❌ MD5 variation ${i + 1} also failed:`, altError.message);
          }
        }
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('❌ All decryption attempts failed. Current fingerprint:', currentFingerprint);
      console.log('❌ Tried variations:', fingerprintVariations.map((f, i) => `${i + 1}: ${f.substring(0, 30)}...`));
    }
    
    throw new Error('All decryption attempts failed - no matching fingerprint found');
    
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Decryption error:', error.message);
    }
    throw error;
  }
}

// ! ========================[ FIRST ACTIVATION SERVICE ]==================================================
const firstActivationService = async (locationData = null, code = null) => {
  try {
  const fingerprint = await generateDeviceFingerprint();
  const ipAddress = await getLocalIpAddress();
  
  // Prepare location data
  let locationInfo = "Iraq"; // Default fallback
  
  if (locationData && locationData.latitude && locationData.longitude) {
    // Format location as a string for the remote server
    locationInfo = `${locationData.latitude},${locationData.longitude}`;
    
    // Log the location data for debugging
    
  }
  
  //! =====[send data to the server]
  const data = {
    device_id: fingerprint,
    ip_address: ipAddress,
    location: locationInfo,
  }

  // Add code if provided
  if (code && code.trim()) {
    data.code = code.trim();
  }
    
  // send data to the server by https
  const response = await sendPostRequest(`${API_URL}/first-activation`, data);
    
    // Check if activation was successful
    if (!response || response.success === false || response.error) {
      console.error('❌ First activation failed - Invalid response:', JSON.stringify(response, null, 2));
      
      return {
        success: false,
        message: response?.message || response?.error || 'حدث خطأ في التفعيل، يرجى المحاولة مرة أخرى',
        details: response || 'No response received from activation server',
        errorCode: response?.errorCode || 'INVALID_RESPONSE'
      }
    }

    // If activation was successful but license files are not in response, fetch them
    if (!response.files || !response.files['license.json'] || !response.files['public.pem']) {
      console.log('✅ تم التفعيل بنجاح، ولكن ملفات الترخيص غير موجودة في الرد. يتم جلب ملفات الترخيص...');
      
      try {
        // Fetch license files using device fingerprint
        const licenseResponse = await getLicenseInfoByFingerprint(fingerprint);
        
        if (licenseResponse.success) {
          console.log('✅ تم جلب ملفات الترخيص بنجاح بعد التفعيل الأول');
          
          // Clear cache to ensure fresh license check
          clearLicenseCache();
          
          return {
            success: true,
            message: 'تم التفعيل بنجاح',
            activated: true,
            device_id: fingerprint,
            licenseType: licenseResponse.licenseType,
            userId: licenseResponse.userId,
            username: licenseResponse.username,
            activationInfo: licenseResponse.activationInfo
          };
        } else {
          console.error('❌ Failed to fetch license files after first activation:', licenseResponse.message);
          return {
            success: false,
            message: 'تم التفعيل بنجاح ولكن فشل في جلب ملفات الترخيص',
            details: licenseResponse.message,
            errorCode: 'LICENSE_FETCH_FAILED'
          };
        }
      } catch (fetchError) {
        console.error('❌ Error fetching license files after first activation:', fetchError.message);
        return {
          success: false,
          message: 'تم التفعيل بنجاح ولكن فشل في جلب ملفات الترخيص',
          details: fetchError.message,
          errorCode: 'LICENSE_FETCH_ERROR'
        };
      }
    }

    // If license files are in the response, proceed with the original logic
    const license = response.files['license.json'];
    const publicKey = response.files['public.pem'];
    
    // Debug logging to understand the response structure
    console.log('🔍 First Activation - Response files keys:', Object.keys(response.files || {}));
    console.log('🔍 First Activation - Response files object:', JSON.stringify(response.files, null, 2));
    console.log('🔍 First Activation - License exists:', !!license);
    console.log('🔍 First Activation - Public key exists:', !!publicKey);
    console.log('🔍 First Activation - Public key type:', typeof publicKey);
    console.log('🔍 First Activation - Public key length:', publicKey ? publicKey.length : 'N/A');
    console.log('🔍 First Activation - Public key preview:', publicKey ? publicKey.substring(0, 100) + '...' : 'N/A');
    
    // Ensure the license directory exists with better error handling
    try {
      if (!fs.existsSync(PUBLIC_KEY_DIR)) {
        console.log('📁 Creating license directory:', PUBLIC_KEY_DIR);
        fs.mkdirSync(PUBLIC_KEY_DIR, { recursive: true });
        console.log('✅ License directory created successfully');
      } else {
        console.log('📁 License directory already exists:', PUBLIC_KEY_DIR);
      }
    } catch (dirError) {
      console.error('❌ Failed to create license directory:', dirError.message);
      throw new Error(`Failed to create license directory: ${dirError.message}`);
    }
    
    // Validate public key before writing
    if (!publicKey || typeof publicKey !== 'string' || publicKey.trim() === '') {
      console.error('❌ First Activation - Invalid public key received:', publicKey);
      throw new Error('Invalid or empty public key received from server');
    }
    
    // Store the public key and license in the app data directory with error handling
    try {
      const publicKeyPath = path.join(PUBLIC_KEY_DIR, 'public.pem');
      const licensePath = path.join(PUBLIC_KEY_DIR, 'license.json');
      
      console.log('💾 Writing public key to:', publicKeyPath);
      fs.writeFileSync(publicKeyPath, publicKey);
      console.log('✅ Public key written successfully');
      
      console.log('💾 Writing license to:', licensePath);
      fs.writeFileSync(licensePath, license);
      console.log('✅ License written successfully');
    } catch (writeError) {
      console.error('❌ Failed to write license files:', writeError.message);
      throw new Error(`Failed to write license files: ${writeError.message}`);
    }

    
    const decryptedLicense = await decryptLicense(license, fingerprint);
    
    // Clear cache after successful activation
    clearLicenseCache();
    
    
    
    return {
      success: true,
      activated: true,
      message: 'تم التفعيل بنجاح',
      license: decryptedLicense,
      fingerprint: fingerprint,
      licenseType: response.license_type,
      userId: response.userId,
      username: response.username,
      activationInfo: response.activation_info
    };
  } catch (error) {
    // Log the actual error for debugging
    console.error('❌ First activation error:', error);
    
    // Return detailed error information
    return {
      success: false,
      message: error.message || 'حدث خطأ في التفعيل الأول، يرجى المحاولة مرة أخرى',
      details: error.toString(),
      errorCode: error.code || 'UNKNOWN_ERROR',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
};

// ! ========================[ ACTIVATION SERVICE WITH CODE ]==================================================
const activationServiceWithCode = async (code, locationData = null) => {
  try {
    const fingerprint = await generateDeviceFingerprint();
    const ipAddress = await getLocalIpAddress();

    // Prepare location data
    let locationInfo = "Iraq"; // Default fallback
    
    if (locationData && locationData.latitude && locationData.longitude) {
      // Format location as a string for the remote server
      locationInfo = `${locationData.latitude},${locationData.longitude}`;
      
      // Log the location data for debugging
      
    }

    const data = {
      device_id: fingerprint,
      ip_address: ipAddress,
      location: locationInfo,
      activation_code: code,
    }

    const response = await sendPostRequest(`${API_URL}/activate`, data);
    
    // Check if activation was successful
    if (!response || response.success === false) {
      console.error('❌ Activation with code failed - Invalid response:', JSON.stringify(response, null, 2));
      
      return {
        success: false,
        message: response?.message || response?.error || 'حدث خطأ في التفعيل، يرجى المحاولة مرة أخرى',
        details: response || 'No response received from activation server',
        errorCode: response?.errorCode || 'INVALID_RESPONSE'
      }
    }

    // If activation was successful but license files are not in response, fetch them
    if (!response.files || !response.files['license.json'] || !response.files['public.pem']) {
      console.log('✅ Activation successful, but license files not in response. Fetching license files...');
      
      try {
        // Fetch license files using device fingerprint
        const licenseResponse = await getLicenseInfoByFingerprint(fingerprint);
        
        if (licenseResponse.success) {
          console.log('✅ Successfully fetched license files after activation');
          
          // Clear cache to ensure fresh license check
          clearLicenseCache();
          
          return {
            success: true,
            message: 'تم التفعيل بنجاح',
            activated: true,
            device_id: fingerprint,
            licenseType: licenseResponse.licenseType,
            userId: licenseResponse.userId,
            username: licenseResponse.username,
            activationInfo: licenseResponse.activationInfo
          };
        } else {
          console.error('❌ Failed to fetch license files after activation:', licenseResponse.message);
          return {
            success: false,
            message: 'تم التفعيل بنجاح ولكن فشل في جلب ملفات الترخيص',
            details: licenseResponse.message,
            errorCode: 'LICENSE_FETCH_FAILED'
          };
        }
      } catch (fetchError) {
        console.error('❌ Error fetching license files after activation:', fetchError.message);
        return {
          success: false,
          message: 'تم التفعيل بنجاح ولكن فشل في جلب ملفات الترخيص',
          details: fetchError.message,
          errorCode: 'LICENSE_FETCH_ERROR'
        };
      }
    }

    // If license files are in the response, proceed with the original logic
    const license = response.files['license.json'];
    const publicKey = response.files['public.pem'];
    
    // Debug logging to understand the response structure
    console.log('🔍 Activation with Code - Response files keys:', Object.keys(response.files || {}));
    console.log('🔍 Activation with Code - Response files object:', JSON.stringify(response.files, null, 2));
    console.log('🔍 Activation with Code - License exists:', !!license);
    console.log('🔍 Activation with Code - Public key exists:', !!publicKey);
    console.log('🔍 Activation with Code - Public key type:', typeof publicKey);
    console.log('🔍 Activation with Code - Public key length:', publicKey ? publicKey.length : 'N/A');
    console.log('🔍 Activation with Code - Public key preview:', publicKey ? publicKey.substring(0, 100) + '...' : 'N/A');
    
    // Ensure the license directory exists with better error handling
    try {
      if (!fs.existsSync(PUBLIC_KEY_DIR)) {
        console.log('📁 Creating license directory:', PUBLIC_KEY_DIR);
        fs.mkdirSync(PUBLIC_KEY_DIR, { recursive: true });
        console.log('✅ License directory created successfully');
      } else {
        console.log('📁 License directory already exists:', PUBLIC_KEY_DIR);
      }
    } catch (dirError) {
      console.error('❌ Failed to create license directory:', dirError.message);
      throw new Error(`Failed to create license directory: ${dirError.message}`);
    }
    
    // Validate public key before writing
    if (!publicKey || typeof publicKey !== 'string' || publicKey.trim() === '') {
      console.error('❌ Activation with Code - Invalid public key received:', publicKey);
      throw new Error('Invalid or empty public key received from server');
    }
    
    // Store the public key and license in the app data directory with error handling
    try {
      const publicKeyPath = path.join(PUBLIC_KEY_DIR, 'public.pem');
      const licensePath = path.join(PUBLIC_KEY_DIR, 'license.json');
      
      console.log('💾 Writing public key to:', publicKeyPath);
      fs.writeFileSync(publicKeyPath, publicKey);
      console.log('✅ Public key written successfully');
      
      console.log('💾 Writing license to:', licensePath);
      fs.writeFileSync(licensePath, license);
      console.log('✅ License written successfully');
    } catch (writeError) {
      console.error('❌ Failed to write license files:', writeError.message);
      throw new Error(`Failed to write license files: ${writeError.message}`);
    }

    const decryptedLicense = await decryptLicense(license, fingerprint);

    // Clear cache after successful activation
    clearLicenseCache();

    

    return {
      success: true,
      activated: true,
      message: 'تم التفعيل بنجاح',
      license: decryptedLicense,
      fingerprint: fingerprint,
      licenseType: response.license_type,
      userId: response.userId,
      username: response.username,
      activationInfo: response.activation_info
    };

  } catch (error) {
    // Log the actual error for debugging
    console.error('❌ Activation with code error:', error);
    
    // Return detailed error information
    return {
      success: false,
      message: error.message || 'حدث خطأ في التفعيل، يرجى المحاولة مرة أخرى',
      details: error.toString(),
      errorCode: error.code || 'UNKNOWN_ERROR',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
}

// ! ========================[ OFFLINE-FIRST LICENSE VERIFICATION ]==================================================
const verifyLicenseOfflineFirst = async (forceClear = false) => {
  try {
    // Force clear cache if requested
    if (forceClear) {
      forceClearLicenseCache();
    }
    
    const fingerprint = await generateDeviceFingerprint();
    
    if (process.env.NODE_ENV === 'development') {
      
       
    }

    // Step 1: Always check local license first (NO NETWORK CALLS)
    const localResult = await checkLocalLicense(fingerprint);
    
    if (localResult.success) {
      if (process.env.NODE_ENV === 'development') {
        
      }
      const result = {
        ...localResult,
        source: 'local',
        offline: true
      };
      
      return result;
    }

    // Step 2: Only if local license is missing/invalid, try remote server by fingerprint
    if (process.env.NODE_ENV === 'development') {
      
    }

    try {
      const remoteResult = await getLicenseInfoByFingerprint(fingerprint);
      
      if (remoteResult.success) {
        if (process.env.NODE_ENV === 'development') {
          
        }
        const result = {
          ...remoteResult,
          source: 'remote',
          offline: false
        };
        
        return result;
      } else {
        const result = {
          success: false,
          message: remoteResult.message || 'لا يوجد ترخيص مفعل لهذا الجهاز',
          needsFirstActivation: true,
          source: 'remote',
          offline: false,
          details: remoteResult.details,
          errorCode: remoteResult.errorCode
        };
        
        return result;
      }
    } catch (networkError) {
      if (process.env.NODE_ENV === 'development') {
        
      }
      
      const result = {
        success: false,
        message: 'لا يمكن التحقق من الترخيص. لا يوجد ترخيص محلي ولا يمكن الاتصال بالخادم',
        needsFirstActivation: true,
        offline: true,
        localError: localResult.message,
        networkError: networkError.message
      };
      
      return result;
    }

      } catch (error) {
      console.error('Error in verifyLicenseOfflineFirst:', error);
      const errorResult = {
        success: false,
        message: error.message || 'فشل في التحقق من الترخيص',
        needsFirstActivation: true
      };
      
      return errorResult;
    }
  };

// ! ========================[ CHECK LOCAL LICENSE ONLY ]==================================================
const checkLocalLicense = async (fingerprint) => {
  try {
    // Check cache first
    const cacheKey = getCacheKey('local', fingerprint);
    const cached = getFromCache(cacheKey);
    if (cached) {
      // Using cached local license result
      return cached;
    }

    // Check if the license directory exists
    if (!fs.existsSync(PUBLIC_KEY_DIR)) {
      console.log('📁 License directory not found locally, attempting to fetch from remote server...');
      
      // Try to get license from remote server
      try {
        const remoteResult = await getLicenseInfoByFingerprint(fingerprint);
        
        if (remoteResult.success) {
          console.log('✅ Successfully fetched license from remote server');
          
          // Now try to read the newly downloaded license
          const licensePath = path.join(PUBLIC_KEY_DIR, 'license.json');
          const license = fs.readFileSync(licensePath, 'utf8');
          const decryptedLicense = await decryptLicense(license, fingerprint);
          
          // Extract the actual license data from the nested structure
          const licenseInfo = decryptedLicense.licenseData.data;

          // Check if license is expired
          const now = new Date();
          
          // Only check expiration if expires_at is not null
          if (licenseInfo.expires_at) {
            const expiresAt = new Date(licenseInfo.expires_at);
            
            if (now > expiresAt) {
              const result = {
                success: false,
                message: 'الترخيص المحلي منتهي الصلاحية',
                expired: true
              };
              setCache(cacheKey, result, CACHE_TTL.local);
              return result;
            }
          }

          const result = {
            success: true,
            device_id: fingerprint,
            type: licenseInfo.type,
            features: licenseInfo.features,
            activated_at: licenseInfo.activated_at,
            expires_at: licenseInfo.expires_at,
            userId: licenseInfo.userId,
            feature_licenses: licenseInfo.feature_licenses,
            feature_expiration_status: licenseInfo.feature_expiration_status,
            signature: decryptedLicense.licenseData.signature,
            message: 'تم التحقق من الترخيص محلياً (تم جلب الترخيص من الخادم)'
          };

          // Cache the successful result
          setCache(cacheKey, result, CACHE_TTL.local);
          return result;
        } else {
          console.log('❌ Failed to fetch license from remote server:', remoteResult.message);
          const result = {
            success: false,
            message: remoteResult.message || 'مجلد الترخيص غير موجود محلياً ولا يمكن جلب الترخيص من الخادم',
            details: remoteResult.details,
            errorCode: remoteResult.errorCode
          };
          setCache(cacheKey, result, CACHE_TTL.local);
          return result;
        }
      } catch (remoteError) {
        console.error('❌ Error fetching license from remote server:', remoteError.message);
        const result = {
          success: false,
          message: 'مجلد الترخيص غير موجود محلياً ولا يمكن الاتصال بالخادم'
        };
        setCache(cacheKey, result, CACHE_TTL.local);
        return result;
      }
    }

    const licensePath = path.join(PUBLIC_KEY_DIR, 'license.json');
    const publicKeyPath = path.join(PUBLIC_KEY_DIR, 'public.pem');

    // Check if license files exist
    if (!fs.existsSync(licensePath) || !fs.existsSync(publicKeyPath)) {
      console.log('📄 License files not found locally, attempting to fetch from remote server...');
      
      // Try to get license from remote server
      try {
        const remoteResult = await getLicenseInfoByFingerprint(fingerprint);
        
        if (remoteResult.success) {
          console.log('✅ Successfully fetched license from remote server');
          
          // Now try to read the newly downloaded license
          const license = fs.readFileSync(licensePath, 'utf8');
          const decryptedLicense = await decryptLicense(license, fingerprint);
          
          // Extract the actual license data from the nested structure
          const licenseInfo = decryptedLicense.licenseData.data;

          // Check if license is expired
          const now = new Date();
          
          // Only check expiration if expires_at is not null
          if (licenseInfo.expires_at) {
            const expiresAt = new Date(licenseInfo.expires_at);
            
            if (now > expiresAt) {
              const result = {
                success: false,
                message: 'الترخيص المحلي منتهي الصلاحية',
                expired: true
              };
              setCache(cacheKey, result, CACHE_TTL.local);
              return result;
            }
          }

          const result = {
            success: true,
            device_id: fingerprint,
            type: licenseInfo.type,
            features: licenseInfo.features,
            activated_at: licenseInfo.activated_at,
            expires_at: licenseInfo.expires_at,
            userId: licenseInfo.userId,
            feature_licenses: licenseInfo.feature_licenses,
            feature_expiration_status: licenseInfo.feature_expiration_status,
            signature: decryptedLicense.licenseData.signature,
            message: 'تم التحقق من الترخيص محلياً (تم جلب الترخيص من الخادم)'
          };

          // Cache the successful result
          setCache(cacheKey, result, CACHE_TTL.local);
          return result;
        } else {
          console.log('❌ Failed to fetch license from remote server:', remoteResult.message);
          const result = {
            success: false,
            message: remoteResult.message || 'ملفات الترخيص غير موجودة محلياً ولا يمكن جلب الترخيص من الخادم',
            details: remoteResult.details,
            errorCode: remoteResult.errorCode
          };
          setCache(cacheKey, result, CACHE_TTL.local);
          return result;
        }
      } catch (remoteError) {
        console.error('❌ Error fetching license from remote server:', remoteError.message);
        const result = {
          success: false,
          message: 'ملفات الترخيص غير موجودة محلياً ولا يمكن الاتصال بالخادم'
        };
        setCache(cacheKey, result, CACHE_TTL.local);
        return result;
      }
    }

    // Try to read and decrypt local license
    const license = fs.readFileSync(licensePath, 'utf8');
    const decryptedLicense = await decryptLicense(license, fingerprint);
    
    // Extract the actual license data from the nested structure
    const licenseInfo = decryptedLicense.licenseData.data;

    // Check if license is expired
    const now = new Date();
    
    // Only check expiration if expires_at is not null
    if (licenseInfo.expires_at) {
      const expiresAt = new Date(licenseInfo.expires_at);
      
      if (now > expiresAt) {
        const result = {
          success: false,
          message: 'الترخيص المحلي منتهي الصلاحية',
          expired: true
        };
        setCache(cacheKey, result, CACHE_TTL.local);
        return result;
      }
    }

    const result = {
      success: true,
      device_id: fingerprint,
      type: licenseInfo.type,
      features: licenseInfo.features,
      activated_at: licenseInfo.activated_at,
      expires_at: licenseInfo.expires_at,
      userId: licenseInfo.userId,
      feature_licenses: licenseInfo.feature_licenses,
      feature_expiration_status: licenseInfo.feature_expiration_status,
      signature: decryptedLicense.licenseData.signature,
      message: 'تم التحقق من الترخيص محلياً'
    };

    // Cache the successful result
    setCache(cacheKey, result, CACHE_TTL.local);

    return result;

  } catch (error) {
    console.error('❌ Error in checkLocalLicense:', error.message);
    
    // Try to get license from remote server as fallback
    try {
      console.log('🔄 Attempting to fetch license from remote server as fallback...');
      const remoteResult = await getLicenseInfoByFingerprint(fingerprint);
      
      if (remoteResult.success) {
        console.log('✅ Successfully fetched license from remote server as fallback');
        
        // Now try to read the newly downloaded license
        const licensePath = path.join(PUBLIC_KEY_DIR, 'license.json');
        const license = fs.readFileSync(licensePath, 'utf8');
        const decryptedLicense = await decryptLicense(license, fingerprint);
        
        // Extract the actual license data from the nested structure
        const licenseInfo = decryptedLicense.licenseData.data;

        const result = {
          success: true,
          device_id: fingerprint,
          type: licenseInfo.type,
          features: licenseInfo.features,
          activated_at: licenseInfo.activated_at,
          expires_at: licenseInfo.expires_at,
          userId: licenseInfo.userId,
          feature_licenses: licenseInfo.feature_licenses,
          feature_expiration_status: licenseInfo.feature_expiration_status,
          signature: decryptedLicense.licenseData.signature,
          message: 'تم التحقق من الترخيص محلياً (تم جلب الترخيص من الخادم كبديل)'
        };

        // Cache the successful result
        const cacheKey = getCacheKey('local', fingerprint);
        setCache(cacheKey, result, CACHE_TTL.local);
        return result;
      }
    } catch (remoteError) {
      console.error('❌ Failed to fetch license from remote server as fallback:', remoteError.message);
    }
    
    const result = {
      success: false,
      message: `خطأ في قراءة الترخيص المحلي: ${error.message}`
    };
    
    // Cache error results for a shorter time
    const cacheKey = getCacheKey('local', fingerprint);
    setCache(cacheKey, result, 30 * 1000); // 30 seconds for errors
    
    return result;
  }
};

// ! ========================[ VERIFY LICENSE AND KEY - LEGACY FUNCTION ]==================================================
const verifyLicenseAndKey = async () => {
  // This function now uses the new offline-first approach
  return await verifyLicenseOfflineFirst();
}

// ! ========================[ GET LICENSE INFO BY FINGERPRINT ]==================================================
const getLicenseInfoByFingerprint = async (fingerprint) => {
  try {
    console.log('🔍 getLicenseInfoByFingerprint - Starting with fingerprint:', fingerprint);
    console.log('🔍 getLicenseInfoByFingerprint - API URL:', `${API_URL}/license/${fingerprint}`);
    
    // get license info by fingerprint from the server using GET request
    const response = await sendGetRequest(`${API_URL}/license/${fingerprint}`);
    
    console.log('🔍 getLicenseInfoByFingerprint - Raw response received:', JSON.stringify(response, null, 2));
    
    if (!response || !response.files || !response.files['license.json']) {
      const result = {
       success: false,
       message: response?.message || response?.error || 'حدث خطأ في التفعيل، يرجى المحاولة مرة أخرى',
       details: response || 'No response received from server',
       errorCode: response?.errorCode || 'LICENSE_NOT_FOUND'
      };
      
      return result;
   }

   // Additional check for public.pem
   if (!response.files || !response.files.hasOwnProperty('public.pem') || !response.files['public.pem']) {
     console.error('❌ Get license by fingerprint failed - Missing public.pem in response');
     console.error('❌ Available files in response:', Object.keys(response.files || {}));
     console.error('❌ Public.pem value:', response.files?.['public.pem']);
     const result = {
       success: false,
       message: 'Invalid license response from server - missing public key',
       details: 'Server response missing public.pem file',
       errorCode: 'MISSING_PUBLIC_KEY'
     };
     
     return result;
   }

   const license = response.files['license.json'];
   const publicKey = response.files['public.pem'];
   
   // Debug logging to understand the response structure
   console.log('🔍 Get License by Fingerprint - Response files keys:', Object.keys(response.files || {}));
   console.log('🔍 Get License by Fingerprint - Response files object:', JSON.stringify(response.files, null, 2));
   console.log('🔍 Get License by Fingerprint - License exists:', !!license);
   console.log('🔍 Get License by Fingerprint - Public key exists:', !!publicKey);
   console.log('🔍 Get License by Fingerprint - Public key type:', typeof publicKey);
   console.log('🔍 Get License by Fingerprint - Public key length:', publicKey ? publicKey.length : 'N/A');
   console.log('🔍 Get License by Fingerprint - Public key preview:', publicKey ? publicKey.substring(0, 100) + '...' : 'N/A');
   
   // Ensure the license directory exists with better error handling
   try {
     if (!fs.existsSync(PUBLIC_KEY_DIR)) {
       console.log('📁 Creating license directory:', PUBLIC_KEY_DIR);
       fs.mkdirSync(PUBLIC_KEY_DIR, { recursive: true });
       console.log('✅ License directory created successfully');
     } else {
       console.log('📁 License directory already exists:', PUBLIC_KEY_DIR);
     }
   } catch (dirError) {
     console.error('❌ Failed to create license directory:', dirError.message);
     throw new Error(`Failed to create license directory: ${dirError.message}`);
   }
   
   // Validate public key before writing
   if (!publicKey || typeof publicKey !== 'string' || publicKey.trim() === '') {
     console.error('❌ Get License by Fingerprint - Invalid public key received:', publicKey);
     throw new Error('Invalid or empty public key received from server');
   }
   
   // Store the public key and license in the app data directory with error handling
   try {
     const publicKeyPath = path.join(PUBLIC_KEY_DIR, 'public.pem');
     const licensePath = path.join(PUBLIC_KEY_DIR, 'license.json');
     
     console.log('💾 Writing public key to:', publicKeyPath);
     fs.writeFileSync(publicKeyPath, publicKey);
     console.log('✅ Public key written successfully');
     
     console.log('💾 Writing license to:', licensePath);
     fs.writeFileSync(licensePath, license);
     console.log('✅ License written successfully');
   } catch (writeError) {
     console.error('❌ Failed to write license files:', writeError.message);
     throw new Error(`Failed to write license files: ${writeError.message}`);
   }

   const decryptedLicense = await decryptLicense(license, fingerprint);

   const result = {
     success: true,
     message: 'تم التفعيل بنجاح',
     license: decryptedLicense,
     fingerprint: fingerprint,
     licenseType: response.license_type,
     userId: response.userId,
     username: response.username,
     activationInfo: response.activation_info
   };
   
   return result;
    
  } catch (error) {
    console.error('❌ Error in getLicenseInfoByFingerprint:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error stack:', error.stack);
    
    // Check if it's a network error
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      const result = {
        success: false,
        message: 'لا يمكن الاتصال بخادم التفعيل. تحقق من اتصال الإنترنت',
        networkError: true
      };
      
      return result;
    }
    
    const result = {
      success: false,
      message: error.message || 'Failed to get license info by fingerprint',
    };
    
    return result;
  }
}

// ! ========================[ DIAGNOSE FINGERPRINT ISSUES ]==================================================
const diagnoseFingerprintIssues = async () => {
  try {
    console.log('🔍 === FINGERPRINT DIAGNOSIS ===');
    
    // Get current fingerprint
    const currentFingerprint = await generateDeviceFingerprint();
    console.log('🔍 Current fingerprint:', currentFingerprint);
    
    // Get system information
    const systemInfo = await si.system();
    console.log('🔍 System info:', {
      manufacturer: systemInfo.manufacturer,
      model: systemInfo.model,
      serial: systemInfo.serial,
      hostname: os.hostname()
    });
    
    // Get machine ID
    const machineId = machineIdSync({ original: true });
    console.log('🔍 Machine ID:', machineId);
    
    // Check if license files exist
    const licensePath = path.join(PUBLIC_KEY_DIR, 'license.json');
    const publicKeyPath = path.join(PUBLIC_KEY_DIR, 'public.pem');
    
    console.log('🔍 License files:');
    console.log('  License exists:', fs.existsSync(licensePath));
    console.log('  Public key exists:', fs.existsSync(publicKeyPath));
    
    if (fs.existsSync(licensePath)) {
      const license = fs.readFileSync(licensePath, 'utf8');
      console.log('  License preview:', license.substring(0, 100) + '...');
    }
    
    // Show fingerprint components breakdown
    const components = currentFingerprint.split('|');
    console.log('🔍 Fingerprint components:');
    console.log('  1. Machine ID:', components[0]);
    console.log('  2. Hostname:', components[1]);
    console.log('  3. Manufacturer:', components[2]);
    console.log('  4. Model:', components[3]);
    console.log('  5. Serial:', components[4]);
    
    return {
      success: true,
      currentFingerprint,
      systemInfo,
      machineId,
      licenseExists: fs.existsSync(licensePath),
      publicKeyExists: fs.existsSync(publicKeyPath),
      fingerprintComponents: {
        machineId: components[0],
        hostname: components[1],
        manufacturer: components[2],
        model: components[3],
        serial: components[4]
      }
    };
    
  } catch (error) {
    console.error('❌ Fingerprint diagnosis failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// ! ========================[ LICENSE EXPIRATION NOTIFICATION SYSTEM ]==================================================
const licenseNotifications = {
  // Track which notifications have been sent to avoid duplicates
  sentNotifications: new Set(),
  
  // Notification levels
  LEVELS: {
    WARNING_10_DAYS: 'warning_10_days',
    WARNING_5_DAYS: 'warning_5_days', 
    WARNING_1_DAY: 'warning_1_day',
    EXPIRED: 'expired'
  },
  
  // Get notification key for tracking
  getNotificationKey: (level, expiresAt) => {
    const date = new Date(expiresAt).toDateString();
    return `${level}_${date}`;
  },
  
  // Check if notification was already sent
  wasNotificationSent: (level, expiresAt) => {
    const key = licenseNotifications.getNotificationKey(level, expiresAt);
    return licenseNotifications.sentNotifications.has(key);
  },
  
  // Mark notification as sent
  markNotificationSent: (level, expiresAt) => {
    const key = licenseNotifications.getNotificationKey(level, expiresAt);
    licenseNotifications.sentNotifications.add(key);
  },
  
  // Clear old notifications (older than 30 days)
  clearOldNotifications: () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    for (const notification of licenseNotifications.sentNotifications) {
      const parts = notification.split('_');
      if (parts.length >= 3) {
        const dateStr = parts.slice(2).join('_');
        const notificationDate = new Date(dateStr);
        if (notificationDate < thirtyDaysAgo) {
          licenseNotifications.sentNotifications.delete(notification);
        }
      }
    }
  },
  
  // Send notification to UI via HTTP
  sendNotificationToUI: async (level, message, data) => {
    try {
      // Send HTTP notification to backend endpoint
      const http = require('http');
      const notificationData = JSON.stringify({
        level,
        message,
        data,
        timestamp: new Date().toISOString()
      });
      
      const options = {
        hostname: 'localhost',
        port: 39000, // Backend port
        path: '/api/license/notifications',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(notificationData)
        }
      };
      
      const req = http.request(options, (res) => {
        console.log(`📢 License notification sent via HTTP: ${level} (Status: ${res.statusCode})`);
      });
      
      req.on('error', (err) => {
        console.log(`📢 HTTP notification failed: ${err.message}`);
      });
      
      req.write(notificationData);
      req.end();
      
      // Also log to console for debugging
      console.log(`📢 LICENSE NOTIFICATION [${level.toUpperCase()}]: ${message}`);
      console.log(`📊 Notification data:`, data);
      
      return true;
      
    } catch (error) {
      console.error('❌ Failed to send license notification:', error.message);
      return false;
    }
  },
  
  // Check license expiration and send notifications
  checkExpirationAndNotify: async (licenseData) => {
    try {
      // Clear old notifications
      licenseNotifications.clearOldNotifications();
      
      // Extract expiration date
      let expiresAt = licenseData.expires_at;
      
      // If not found in top level, try to extract from nested license data
      if (!expiresAt && licenseData.license && licenseData.license.licenseData) {
        const nestedData = licenseData.license.licenseData.data;
        expiresAt = nestedData.expires_at;
      }
      
      // If no expiration date, license never expires
      if (!expiresAt) {
        return {
          willExpire: false,
          daysUntilExpiry: null,
          notifications: []
        };
      }
      
      const expiresDate = new Date(expiresAt);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiresDate - now) / (1000 * 60 * 60 * 24));
      
      const notifications = [];
      
      // Check if license has expired
      if (daysUntilExpiry <= 0) {
        if (!licenseNotifications.wasNotificationSent(licenseNotifications.LEVELS.EXPIRED, expiresAt)) {
          const message = '❌ انتهت صلاحية ترخيصك! يرجى التجديد فوراً للاستمرار في استخدام التطبيق.';
          const data = {
            daysUntilExpiry: 0,
            expiresAt: expiresAt,
            licenseType: licenseData.type || 'غير محدد',
            action: 'renew_immediately'
          };
          
          await licenseNotifications.sendNotificationToUI(licenseNotifications.LEVELS.EXPIRED, message, data);
          licenseNotifications.markNotificationSent(licenseNotifications.LEVELS.EXPIRED, expiresAt);
          notifications.push({ level: 'expired', message, data });
        }
      }
      // Check 1 day warning
      else if (daysUntilExpiry === 1) {
        if (!licenseNotifications.wasNotificationSent(licenseNotifications.LEVELS.WARNING_1_DAY, expiresAt)) {
          const message = '🚨 ينتهي ترخيصك غداً! يرجى التجديد فوراً لتجنب انقطاع الخدمة.';
          const data = {
            daysUntilExpiry: 1,
            expiresAt: expiresAt,
            licenseType: licenseData.type || 'غير محدد',
            action: 'renew_urgently'
          };
          
          await licenseNotifications.sendNotificationToUI(licenseNotifications.LEVELS.WARNING_1_DAY, message, data);
          licenseNotifications.markNotificationSent(licenseNotifications.LEVELS.WARNING_1_DAY, expiresAt);
          notifications.push({ level: 'warning_1_day', message, data });
        }
      }
      // Check 5 days warning
      else if (daysUntilExpiry <= 5) {
        if (!licenseNotifications.wasNotificationSent(licenseNotifications.LEVELS.WARNING_5_DAYS, expiresAt)) {
          const message = `⚠️ ينتهي ترخيصك خلال ${daysUntilExpiry} أيام. يرجى التجديد قريباً لتجنب انقطاع الخدمة.`;
          const data = {
            daysUntilExpiry: daysUntilExpiry,
            expiresAt: expiresAt,
            licenseType: licenseData.type || 'غير محدد',
            action: 'renew_soon'
          };
          
          await licenseNotifications.sendNotificationToUI(licenseNotifications.LEVELS.WARNING_5_DAYS, message, data);
          licenseNotifications.markNotificationSent(licenseNotifications.LEVELS.WARNING_5_DAYS, expiresAt);
          notifications.push({ level: 'warning_5_days', message, data });
        }
      }
      // Check 10 days warning
      else if (daysUntilExpiry <= 10) {
        if (!licenseNotifications.wasNotificationSent(licenseNotifications.LEVELS.WARNING_10_DAYS, expiresAt)) {
          const message = `📅 ينتهي ترخيصك خلال ${daysUntilExpiry} أيام. فكر في التجديد لضمان استمرارية الخدمة.`;
          const data = {
            daysUntilExpiry: daysUntilExpiry,
            expiresAt: expiresAt,
            licenseType: licenseData.type || 'غير محدد',
            action: 'consider_renewal'
          };
          
          await licenseNotifications.sendNotificationToUI(licenseNotifications.LEVELS.WARNING_10_DAYS, message, data);
          licenseNotifications.markNotificationSent(licenseNotifications.LEVELS.WARNING_10_DAYS, expiresAt);
          notifications.push({ level: 'warning_10_days', message, data });
        }
      }
      
      return {
        willExpire: true,
        daysUntilExpiry: daysUntilExpiry,
        notifications: notifications
      };
      
    } catch (error) {
      console.error('❌ Error checking license expiration:', error.message);
      return {
        willExpire: false,
        daysUntilExpiry: null,
        notifications: [],
        error: error.message
      };
    }
  }
};

// ! ========================[ SCHEDULED LICENSE VERIFICATION ]==================================================
const scheduleLicenseVerification = () => {
  // Prevent multiple schedulers from running
  if (global.licenseScheduler && global.licenseScheduler.isRunning) {
    console.log('⚠️ License verification scheduler already running, skipping...');
    return global.licenseScheduler;
  }
  
  // Additional safety check - if there's any existing interval, clear it
  if (global.licenseScheduler && global.licenseScheduler.intervalId) {
    console.log('🛑 Clearing existing scheduler interval...');
    clearInterval(global.licenseScheduler.intervalId);
    global.licenseScheduler = null;
  }
  
  console.log('📅 Setting up monthly license verification schedule...');
  
  // Use shorter interval for development/testing to prevent infinite loops
  const isDevelopment = process.env.NODE_ENV === 'development';
  const MONTHLY_INTERVAL = isDevelopment ? 5 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000; // 5 min in dev, 30 days in prod
  
  if (isDevelopment) {
    console.log('🔧 Development mode: Using 5-minute interval for testing');
  } else {
    console.log('🚀 Production mode: Using 30-day interval for app protection');
  }
  
  // Add retry counter to prevent infinite loops
  let verificationCount = 0;
  const MAX_VERIFICATIONS = isDevelopment ? 20 : 1000; // More verifications allowed in production
  
  const verifyLicenseMonthly = async () => {
    try {
      // Check retry limit
      verificationCount++;
      if (verificationCount > MAX_VERIFICATIONS) {
        console.log(`⚠️ Maximum verification count (${MAX_VERIFICATIONS}) reached, stopping scheduler`);
        // Stop the scheduler instead of restarting to prevent infinite loops
        if (global.licenseScheduler && global.licenseScheduler.intervalId) {
          clearInterval(global.licenseScheduler.intervalId);
          global.licenseScheduler.isRunning = false;
        }
        console.log('🛑 Scheduler stopped due to maximum verification count');
        return;
      }
      
      console.log(`🔍 === LICENSE VERIFICATION #${verificationCount} ===`);
      console.log('📅 Verification time:', new Date().toISOString());
      
      // Get current fingerprint
      const fingerprint = await generateDeviceFingerprint();
      console.log('🔍 Current fingerprint:', fingerprint.substring(0, 50) + '...');
      
      // Verify license using offline-first approach
      const verificationResult = await verifyLicenseOfflineFirst(true); // Force clear cache
      
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
        const notificationResult = await licenseNotifications.checkExpirationAndNotify(verificationResult);
        
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
            const freshLicense = await getLicenseInfoByFingerprint(fingerprint);
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
      
      console.log('🔍 === LICENSE VERIFICATION COMPLETED ===\n');
      
    } catch (error) {
      console.error('❌ License verification failed:', error.message);
      console.error('Stack:', error.stack);
      // Don't stop the scheduler on errors - continue trying
    }
  };
  
  // Run verification immediately on startup (only once)
  console.log('🚀 Running initial license verification...');
  verifyLicenseMonthly();
  
  // Schedule monthly verification and store the interval ID
  const intervalId = setInterval(verifyLicenseMonthly, MONTHLY_INTERVAL);
  console.log(`📅 License verification scheduled (every ${isDevelopment ? '5 minutes' : '30 days'})`);
  
  const scheduler = {
    verifyNow: verifyLicenseMonthly,
    interval: MONTHLY_INTERVAL,
    intervalId: intervalId,
    isRunning: true,
    lastRun: new Date().toISOString(),
    isDevelopment: isDevelopment,
    verificationCount: verificationCount,
    maxVerifications: MAX_VERIFICATIONS
  };
  
  // Store in global to prevent multiple instances
  global.licenseScheduler = scheduler;
  
  return scheduler;
};

// ! ========================[ MANUAL LICENSE VERIFICATION ]==================================================
const manualLicenseVerification = async () => {
  try {
    console.log('🔍 === MANUAL LICENSE VERIFICATION ===');
    
    const fingerprint = await generateDeviceFingerprint();
    const result = await verifyLicenseOfflineFirst(true);
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      fingerprint: fingerprint.substring(0, 20) + '...',
      verification: result
    };
    
  } catch (error) {
    console.error('❌ Manual license verification failed:', error.message);
    return {
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
};

// ! ========================[ STOP LICENSE SCHEDULER ]==================================================
const stopLicenseScheduler = () => {
  try {
    if (global.licenseScheduler && global.licenseScheduler.intervalId) {
      clearInterval(global.licenseScheduler.intervalId);
      global.licenseScheduler.isRunning = false;
      global.licenseScheduler = null;
      console.log('🛑 License verification scheduler stopped successfully');
      return true;
    } else {
      console.log('ℹ️ No active license scheduler found');
      return false;
    }
  } catch (error) {
    console.error('❌ Error stopping license scheduler:', error.message);
    return false;
  }
};

module.exports = {
  firstActivationService,
  verifyLicenseAndKey,
  verifyLicenseOfflineFirst,
  checkLocalLicense,
  activationServiceWithCode,
  getLicenseInfoByFingerprint,
  generateDeviceFingerprint,
  clearLicenseCache,
  diagnoseFingerprintIssues,
  scheduleLicenseVerification,
  manualLicenseVerification,
  stopLicenseScheduler,
  licenseNotifications
};