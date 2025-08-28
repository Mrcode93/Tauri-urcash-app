const db = require('../database');

/**
 * Generates a unique barcode for a bill
 * Format: Numeric only for better scanner compatibility (12 digits)
 * Pattern: YYYYMMDDXXXX where XXXX is a sequential/random number
 * @returns {string} The generated barcode
 */
function generateBarcode() {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
    (date.getMonth() + 1).toString().padStart(2, '0') +
    date.getDate().toString().padStart(2, '0');
  
  // Generate a random 4-digit number for uniqueness
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  // Create a numeric-only barcode (12 digits total)
  const barcode = `${dateStr}${randomNum}`;

  // Check if barcode already exists
  const result = db.queryOne(
    'SELECT id FROM sales WHERE barcode = ?',
    [barcode]
  );

  // If barcode exists, generate a new one recursively
  if (result) {
    return generateBarcode();
  }

  return barcode;
}

/**
 * Generates a unique barcode for a receipt (customer or supplier payment)
 * Format: Numeric only for better scanner compatibility (12 digits)
 * Pattern: YYYYMMDDXXXX where XXXX is a sequential/random number
 * @param {string} receiptType - 'customer' or 'supplier'
 * @returns {string} The generated barcode
 */
function generateReceiptBarcode(receiptType = 'customer') {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
    (date.getMonth() + 1).toString().padStart(2, '0') +
    date.getDate().toString().padStart(2, '0');
  
  // Generate a random 4-digit number for uniqueness
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  // Create a numeric-only barcode (12 digits total)
  const barcode = `${dateStr}${randomNum}`;

  // Check if barcode already exists in the appropriate table
  let tableName = 'customer_receipts';
  if (receiptType === 'supplier') {
    tableName = 'supplier_payment_receipts';
  }

  const result = db.queryOne(
    `SELECT id FROM ${tableName} WHERE barcode = ?`,
    [barcode]
  );

  // If barcode exists, generate a new one recursively
  if (result) {
    return generateReceiptBarcode(receiptType);
  }

  return barcode;
}

module.exports = {
  generateBarcode,
  generateReceiptBarcode
}; 