const { queryOne } = require('../database');
const logger = require('./logger');

/**
 * Generates a unique SKU based on product name and category
 * Format: CAT-XXX-YYY where:
 * CAT: First 3 letters of category (or 'GEN' if no category)
 * XXX: First 3 letters of product name
 * YYY: Random 3-digit number
 */
async function generateUniqueSKU(productName) {
  try {
    // Get first 3 letters of product name
    const prefix = productName.substring(0, 3).toUpperCase();
    
    // Generate a random 3-digit number
    const randomNum = Math.floor(Math.random() * 900) + 100;
    
    // Combine to form SKU
    const sku = `${prefix}-${randomNum}`;
    
    // Check if SKU already exists
    const existingSku = queryOne('SELECT id FROM products WHERE sku = ?', [sku]);
    
    if (existingSku) {
      // If SKU exists, try again with a different random number
      return generateUniqueSKU(productName);
    }
    
    return sku;
  } catch (err) {
    logger.error('Error generating SKU:', err);
    throw new Error('Failed to generate SKU');
  }
}

/**
 * Generates a unique receipt number
 * Format: PREFIX-YYYYMMDD-XXXX where:
 * PREFIX: The provided prefix (e.g., 'CR' for customer receipts)
 * YYYYMMDD: Current date
 * XXXX: Sequential number for the day
 */
function generateReceiptNumber(prefix = 'RCP') {
  try {
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
                   (today.getMonth() + 1).toString().padStart(2, '0') +
                   today.getDate().toString().padStart(2, '0');
    
    // Determine which table to check based on prefix
    let tableName = 'customer_receipts';
    if (prefix === 'SPR') {
      tableName = 'supplier_payment_receipts';
    }
    
    // Get the last receipt number for today from the appropriate table
    const lastReceipt = queryOne(`
      SELECT receipt_number 
      FROM ${tableName} 
      WHERE receipt_number LIKE ? 
      ORDER BY receipt_number DESC 
      LIMIT 1
    `, [`${prefix}-${dateStr}-%`]);
    
    let sequence = 1;
    if (lastReceipt) {
      // Extract the sequence number from the last receipt
      const parts = lastReceipt.receipt_number.split('-');
      const lastSequence = parseInt(parts[parts.length - 1]);
      sequence = lastSequence + 1;
    }
    
    return `${prefix}-${dateStr}-${sequence.toString().padStart(4, '0')}`;
  } catch (err) {
    logger.error('Error generating receipt number:', err);
    // Fallback to timestamp-based number
    const timestamp = Date.now();
    return `${prefix}-${timestamp}`;
  }
}

module.exports = {
  generateUniqueSKU,
  generateReceiptNumber
}; 