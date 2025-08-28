import { format } from 'date-fns';

/**
 * Generates a unique barcode for a sale
 * Format: YYYYMMDD-XXXXX where XXXXX is a random number
 */
export const generateSaleBarcode = (): string => {
  const date = format(new Date(), 'yyyyMMdd');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `${date}-${random}`;
};

/**
 * Validates if a string is a valid barcode format
 */
export const isValidBarcode = (barcode: string | null): boolean => {
  if (!barcode) return false;
  // Check if barcode matches format YYYYMMDD-XXXXX
  const barcodeRegex = /^\d{8}-\d{5}$/;
  return barcodeRegex.test(barcode);
};

/**
 * Formats a barcode for display
 */
export const formatBarcode = (barcode: string | null): string => {
  if (!barcode) return '';
  return barcode.replace(/(\d{8})-(\d{5})/, '$1 $2');
}; 