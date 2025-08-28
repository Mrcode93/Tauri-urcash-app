const crypto = require('crypto');
const fs = require('fs');
const os = require('os');

// Use machine-specific key for encryption
const ENCRYPTION_KEY = crypto.createHash('sha256').update(os.hostname() + os.platform() + os.arch()).digest();
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt data using AES-256-CBC
 * @param {string} text - Text to encrypt
 * @returns {string} - Encrypted data with IV prepended
 */
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt data using AES-256-CBC
 * @param {string} encryptedData - Encrypted data with IV prepended
 * @returns {string} - Decrypted text
 */
function decrypt(encryptedData) {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Encrypt and save data to file
 * @param {string} filePath - Path to save the encrypted file
 * @param {string} data - Data to encrypt and save
 */
function encryptToFile(filePath, data) {
  const encryptedData = encrypt(data);
  fs.writeFileSync(filePath, encryptedData, 'utf8');
}

/**
 * Read and decrypt data from file
 * @param {string} filePath - Path to the encrypted file
 * @returns {string} - Decrypted data
 */
function decryptFromFile(filePath) {
  const encryptedData = fs.readFileSync(filePath, 'utf8');
  return decrypt(encryptedData);
}

/**
 * Check if file exists and is encrypted
 * @param {string} filePath - Path to check
 * @returns {boolean} - True if file exists
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

module.exports = {
  encrypt,
  decrypt,
  encryptToFile,
  decryptFromFile,
  fileExists
};
