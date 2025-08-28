const { body, param } = require('express-validator');

const validateSale = [
  body('customer_id').custom((value, { req }) => {
    // Allow customer_id 999 for anonymous customers
    if (value === 999) {
      return true;
    }
    // For other values, ensure it's a positive integer
    if (!Number.isInteger(value) || value < 1) {
      throw new Error('Customer ID must be a valid positive number');
    }
    return true;
  }).withMessage('Customer ID must be a valid positive number'),
  body('invoice_date').custom((value) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid invoice date');
    }
    return true;
  }).withMessage('Invalid invoice date'),
  body('due_date').optional().custom((value) => {
    if (value) {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid due date');
      }
    }
    return true;
  }).withMessage('Invalid due date'),
  body('payment_method').optional().isIn(['cash', 'card', 'bank_transfer']).withMessage('Invalid payment method'),
  body('payment_status').optional().isIn(['paid', 'unpaid', 'partial']).withMessage('Invalid payment status'),
  body('paid_amount').optional().isFloat({ min: 0 }).withMessage('Paid amount must be a positive number'),
  body('discount_amount').optional().isFloat({ min: 0 }).withMessage('Discount amount must be a positive number'),
  body('tax_amount').optional().isFloat({ min: 0 }).withMessage('Tax amount must be a positive number'),
  body('net_amount').optional().isFloat({ min: 0 }).withMessage('Net amount must be a positive number'),
  body('status').optional().isIn(['completed', 'pending', 'cancelled']).withMessage('Invalid status'),
  body('is_anonymous').optional().isBoolean().withMessage('is_anonymous must be a boolean'),
  body('notes').optional().isString(),
  body('barcode').optional().isString().withMessage('Barcode must be a string'),
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.product_id').optional().custom((value, { req, path }) => {
    // Allow null/undefined for manual items (مواد اخرى)
    if (value === null || value === undefined) {
      return true;
    }
    // Allow negative numbers for manual items (مواد اخرى)
    if (value < 0) {
      return true;
    }
    // For real products, ensure it's a valid positive number
    if (!Number.isInteger(value) || value < 1) {
      throw new Error('Product ID must be a valid positive number');
    }
    return true;
  }).withMessage('Product ID must be a valid positive number'),
  body('items.*.name').optional().custom((value, { req, path }) => {
    // Get the product_id for this item
    const itemIndex = path.match(/items\[(\d+)\]/)?.[1];
    if (itemIndex !== undefined) {
      const productId = req.body.items[parseInt(itemIndex)]?.product_id;
      
      // For manual items (negative product_id), name is required
      if (productId < 0) {
        if (!value || typeof value !== 'string' || value.trim() === '') {
          throw new Error('Product name is required for manual items (مواد اخرى)');
        }
      }
    }
    return true;
  }).withMessage('Product name must be a string'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive number'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('items.*.discount_percent').optional().isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100'),
  body('items.*.tax_percent').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax must be between 0 and 100'),
  body('total_amount').optional().isFloat({ min: 0 }).withMessage('Total amount must be a positive number'),
];

const validateSaleId = [
  param('id').isInt().withMessage('Invalid sale ID'),
];

// Customer Receipt Validation
const validateCustomerReceipt = [
  body('customer_id').isInt().withMessage('Customer ID must be a valid number'),
  body('sale_id').optional().isInt().withMessage('Sale ID must be a valid number'),
  body('receipt_date').isDate().withMessage('Invalid receipt date'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('payment_method').isIn(['cash', 'card', 'bank_transfer', 'check']).withMessage('Invalid payment method'),
  body('reference_number').optional().isString().withMessage('Reference number must be a string'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
  body('receipt_number').optional().isString().withMessage('Receipt number must be a string'),
];

// Supplier Payment Receipt Validation
const validateSupplierPaymentReceipt = [
  body('supplier_id').isInt().withMessage('Supplier ID must be a valid number'),
  body('purchase_id').optional().isInt().withMessage('Purchase ID must be a valid number'),
  body('receipt_date').isDate().withMessage('Invalid receipt date'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('payment_method').isIn(['cash', 'card', 'bank_transfer', 'check']).withMessage('Invalid payment method'),
  body('reference_number').optional().isString().withMessage('Reference number must be a string'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
  body('receipt_number').optional().isString().withMessage('Receipt number must be a string'),
];

// Bills Validation
const validateBillData = [
  body('billData.customer_id').isInt({ min: 1 }).withMessage('Customer ID must be a valid positive number'),
  body('billData.invoice_date').isDate().withMessage('Invalid invoice date'),
  body('billData.due_date').optional().isDate().withMessage('Invalid due date'),
  body('billData.discount').isFloat({ min: 0 }).withMessage('Discount must be a positive number'),
  body('billData.discount_type').isIn(['fixed', 'percentage']).withMessage('Invalid discount type'),
  body('billData.tax_rate').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
  body('billData.paid_amount').optional().isFloat({ min: 0 }).withMessage('Paid amount must be a positive number'),
  body('billData.payment_method').isIn(['cash', 'card', 'bank_transfer', 'check']).withMessage('Invalid payment method'),
  body('billData.notes').optional().isString().withMessage('Notes must be a string'),
  body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
  body('items.*.product_id').isInt({ min: 1 }).withMessage('Product ID must be a valid positive number'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive number'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('items.*.discount').optional().isFloat({ min: 0 }).withMessage('Item discount must be a positive number'),
];

const validatePurchaseData = [
  body('billData.supplier_id').isInt({ min: 1 }).withMessage('Supplier ID must be a valid positive number'),
  body('billData.invoice_date').isDate().withMessage('Invalid invoice date'),
  body('billData.due_date').optional().isDate().withMessage('Invalid due date'),
  body('billData.discount_amount').optional().isFloat({ min: 0 }).withMessage('Discount amount must be a positive number'),
  body('billData.tax_amount').optional().isFloat({ min: 0 }).withMessage('Tax amount must be a positive number'),
  body('billData.paid_amount').optional().isFloat({ min: 0 }).withMessage('Paid amount must be a positive number'),
  body('billData.payment_method').optional().isIn(['cash', 'card', 'bank_transfer', 'check']).withMessage('Invalid payment method'),
  body('billData.payment_status').optional().isIn(['paid', 'unpaid', 'partial']).withMessage('Invalid payment status'),
  body('billData.notes').optional().isString().withMessage('Notes must be a string'),
  body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
  body('items.*.product_id').isInt({ min: 1 }).withMessage('Product ID must be a valid positive number'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive number'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('items.*.discount').optional().isFloat({ min: 0 }).withMessage('Item discount must be a positive number'),
  body('items.*.tax_percent').optional().isFloat({ min: 0, max: 100 }).withMessage('Item tax percent must be between 0 and 100'),
];

const validateReturnData = [
  body('returnData.original_bill_id').isInt({ min: 1 }).withMessage('Original bill ID must be a valid positive number'),
  body('returnData.customer_id').isInt({ min: 1 }).withMessage('Customer ID must be a valid positive number'),
  body('returnData.return_reason').isString({ min: 1 }).withMessage('Return reason is required'),
  body('returnData.discount').isFloat({ min: 0 }).withMessage('Discount must be a positive number'),
  body('returnData.discount_type').isIn(['fixed', 'percentage']).withMessage('Invalid discount type'),
  body('returnData.tax_rate').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
  body('returnData.refund_method').isIn(['cash', 'card', 'bank_transfer', 'check']).withMessage('Invalid refund method'),
  body('returnData.notes').optional().isString().withMessage('Notes must be a string'),
  body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
  body('items.*.product_id').isInt({ min: 1 }).withMessage('Product ID must be a valid positive number'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive number'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('items.*.discount').optional().isFloat({ min: 0 }).withMessage('Item discount must be a positive number'),
];

// Receipt ID Validation
const validateReceiptId = [
  param('id').isInt().withMessage('Invalid receipt ID'),
];

module.exports = {
  validateSale,
  validateSaleId,
  validateCustomerReceipt,
  validateSupplierPaymentReceipt,
  validateReceiptId,
  validateBillData,
  validatePurchaseData,
  validateReturnData,
}; 