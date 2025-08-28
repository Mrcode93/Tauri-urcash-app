const { body } = require('express-validator');
const { validationResult } = require('express-validator');
const { getMessage } = require('../utils/arabicMessages');

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    console.log('Request body:', req.body);
    
    return res.status(400).json({
      success: false,
      message: getMessage('error.validation_error'),
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value,
        type: err.type
      }))
    });
  }
  next();
};

// Sale validation rules
const validateSale = [
  body('customer_id')
    .isInt()
    .withMessage('Customer ID must be a valid integer'),
  
  body('invoice_date')
    .isDate()
    .withMessage('Invoice date must be a valid date'),
  
  body('due_date')
    .optional()
    .isDate()
    .withMessage('Due date must be a valid date'),
  
  body('payment_method')
    .isIn(['cash', 'card', 'bank_transfer'])
    .withMessage('Payment method must be one of: cash, card, bank_transfer'),
  
  body('payment_status')
    .isIn(['paid', 'unpaid', 'partial', 'مدفوع', 'غير مدفوع', 'مدفوع جزئياً'])
    .withMessage('Payment status must be one of: paid, unpaid, partial, مدفوع, غير مدفوع, مدفوع جزئياً'),
  
  body('paid_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Paid amount must be a non-negative number')
    .custom((value, { req }) => {
      if ((req.body.payment_status === 'partial' || req.body.payment_status === 'مدفوع جزئياً') && (!value || value <= 0)) {
        throw new Error('Paid amount is required for partial payments');
      }
      if ((req.body.payment_status === 'paid' || req.body.payment_status === 'مدفوع') && (!value || value <= 0)) {
        throw new Error('Paid amount is required for paid status');
      }
      return true;
    }),
  
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string'),
  
  body('items')
    .isArray()
    .withMessage('Items must be an array')
    .notEmpty()
    .withMessage('Items array cannot be empty'),
  
  body('items.*.product_id')
    .isInt()
    .withMessage('Product ID must be a valid integer'),
  
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  
  body('items.*.unit_price')
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a non-negative number'),
  
  body('items.*.discount_percent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount percent must be between 0 and 100'),
  
  body('items.*.tax_percent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tax percent must be between 0 and 100'),
  
  body('total_amount')
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a non-negative number'),
  
  validateRequest
];

// Purchase validation rules with Arabic messages
const validatePurchase = [
  body('supplier_id')
    .isInt()
    .withMessage(getMessage('fields.supplier_id.required')),
  
  body('invoice_date')
    .isDate()
    .withMessage(getMessage('fields.invoice_date.invalid')),
  
  body('due_date')
    .optional()
    .isDate()
    .withMessage(getMessage('fields.due_date.invalid')),
  
  body('payment_method')
    .optional()
    .isIn(['cash', 'card', 'bank_transfer'])
    .withMessage(getMessage('invalid_payment_method')),
  
  body('payment_status')
    .optional()
    .isIn(['paid', 'unpaid', 'partial'])
    .withMessage(getMessage('invalid_payment_status')),
  
  body('paid_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage(getMessage('fields.paid_amount.max')),
  
  body('notes')
    .optional()
    .isString()
    .withMessage(getMessage('fields.notes.invalid')),
  
  body('moneyBoxId')
    .optional()
    .isString()
    .withMessage('Money box ID must be a string'),
  
  body('items')
    .isArray()
    .withMessage(getMessage('fields.items.required'))
    .notEmpty()
    .withMessage(getMessage('fields.items.required')),
  
  body('items.*.product_id')
    .isInt()
    .withMessage(getMessage('fields.product_id.invalid')),
  
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage(getMessage('fields.quantity.min')),
  
  body('items.*.price')
    .isFloat({ min: 0 })
    .withMessage(getMessage('fields.price.min')),
  
  body('items.*.discount_percent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage(getMessage('fields.discount_percent.range')),
  
  body('items.*.tax_percent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage(getMessage('fields.tax_percent.range')),
  
  validateRequest
];

// Expense validation rules
const validateExpense = [
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required'),
  
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .custom((value) => {
      const amount = parseFloat(value);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Amount must be a positive number');
      }
      return true;
    }),
  
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isIn(['rent', 'salaries', 'utilities', 'supplies', 'marketing', 'other'])
    .withMessage('Invalid expense category'),
  
  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .custom((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Date must be a valid date');
      }
      return true;
    }),
  
  body('moneyBoxId')
    .notEmpty()
    .withMessage('Money box selection is required'),
  
  validateRequest
];

// Customer validation rules with Arabic messages
const validateCustomer = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage(getMessage('fields.name.required'))
    .isLength({ min: 2, max: 100 })
    .withMessage(getMessage('fields.name.length'))
    .matches(/^[\u0600-\u06FF\s\w]+$/)
    .withMessage(getMessage('fields.name.invalid')),
  
  body('email')
    .optional()
    .trim()
    .custom((value) => {
      // If email is provided, validate it
      if (value && value.length > 0) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          throw new Error(getMessage('fields.email.invalid'));
        }
      }
      return true;
    }),
  
  body('phone')
    .trim()
    .notEmpty()
    .withMessage(getMessage('fields.phone.required'))
    .matches(/^07[3-9][0-9]{8}$/)
    .withMessage(getMessage('fields.phone.invalid')),
  
  body('address')
    .optional()
    .trim()
    .custom((value) => {
      // If address is provided, validate its length
      if (value && value.length > 0) {
        if (value.length < 5 || value.length > 200) {
          throw new Error(getMessage('fields.address.length'));
        }
      }
      return true;
    }),

  body('credit_limit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit limit must be a non-negative number'),

  body('customer_type')
    .optional()
    .isIn(['retail', 'wholesale', 'vip'])
    .withMessage('Customer type must be one of: retail, wholesale, vip'),

  body('tax_number')
    .optional()
    .trim()
    .custom((value) => {
      // If tax number is provided, validate its length
      if (value && value.length > 0) {
        if (value.length < 3 || value.length > 50) {
          throw new Error('Tax number must be between 3 and 50 characters');
        }
      }
      return true;
    }),

  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean value'),
  
  validateRequest
];

// Product validation rules
const validateProduct = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required'),
  
  body('description')
    .optional()
    .trim(),
  
  body('scientific_name')
    .optional()
    .trim(),
  
  body('barcode')
    .optional()
    .trim(),
  
  body('purchase_price')
    .custom((value) => {
      if (value === undefined || value === null) throw new Error('Purchase price is required');
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) throw new Error('Purchase price must be a positive number');
      return true;
    })
    .withMessage('Purchase price must be a positive number'),
  
  body('selling_price')
    .custom((value) => {
      if (value === undefined || value === null) throw new Error('Selling price is required');
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) throw new Error('Selling price must be a positive number');
      return true;
    })
    .withMessage('Selling price must be a positive number'),
  
  body('wholesale_price')
    .custom((value) => {
      if (value === undefined || value === null) throw new Error('Wholesale price is required');
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) throw new Error('Wholesale price must be a positive number');
      return true;
    })
    .withMessage('Wholesale price must be a positive number'),
  
  body('current_stock')
    .optional()
    .custom((value) => {
      if (value === undefined || value === null) return true;
      const num = parseInt(value);
      if (isNaN(num) || num < 0) throw new Error('Current stock must be a non-negative integer');
      return true;
    })
    .withMessage('Current stock must be a non-negative integer'),
  
  body('min_stock')
    .optional()
    .custom((value) => {
      if (value === undefined || value === null) return true;
      const num = parseInt(value);
      if (isNaN(num) || num < 0) throw new Error('Minimum stock must be a non-negative integer');
      return true;
    })
    .withMessage('Minimum stock must be a non-negative integer'),
  
  body('unit')
    .optional()
    .trim(),
  
  body('expiry_date')
    .optional()
    .custom((value) => {
      if (value === undefined || value === null || value === '') return true;
      const date = new Date(value);
      if (isNaN(date.getTime())) throw new Error('Invalid expiry date format');
      return true;
    })
    .withMessage('Invalid expiry date format'),
  
  body('units_per_box')
    .optional()
    .custom((value) => {
      if (value === undefined || value === null) return true;
      const num = parseInt(value);
      if (isNaN(num) || num < 1) throw new Error('Units per box must be at least 1');
      return true;
    })
    .withMessage('Units per box must be at least 1'),
  
  body('category_id')
    .optional({ nullable: true })
    .custom((value) => {
      
      // Temporarily allow any value to debug
      return true;
    })
    .withMessage('Invalid category ID'),
  
  body('stock_id')
    .optional({ nullable: true })
    .custom((value) => {
      
      if (value === undefined || value === null || value === '') return true;
      const num = parseInt(value);
      if (isNaN(num) || num < 1) throw new Error('Invalid stock ID');
      return true;
    })
    .withMessage('Invalid stock ID'),
  
  body('is_dolar')
    .optional()
    .custom((value) => {
      
      if (value === undefined || value === null) return true;
      if (typeof value === 'boolean') return true;
      if (typeof value === 'number' && (value === 0 || value === 1)) return true;
      if (typeof value === 'string' && (value === 'true' || value === 'false' || value === '0' || value === '1')) return true;
      throw new Error('is_dolar must be a boolean value');
    })
    .withMessage('is_dolar must be a boolean'),
  
  body('supported')
    .optional()
    .custom((value) => {
      
      if (value === undefined || value === null) return true;
      if (typeof value === 'boolean') return true;
      if (typeof value === 'number' && (value === 0 || value === 1)) return true;
      if (typeof value === 'string' && (value === 'true' || value === 'false' || value === '0' || value === '1')) return true;
      throw new Error('supported must be a boolean value');
    })
    .withMessage('supported must be a boolean'),
  
  body('supplier_id')
    .optional({ nullable: true })
    .custom((value) => {
      
      if (value === undefined || value === null || value === '') return true;
      const num = parseInt(value);
      if (isNaN(num) || num < 1) throw new Error('Invalid supplier ID');
      return true;
    })
    .withMessage('Invalid supplier ID'),
  
  validateRequest
];

// Supplier validation rules with Arabic messages
const validateSupplier = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage(getMessage('fields.name.required'))
    .isLength({ min: 2, max: 100 })
    .withMessage(getMessage('fields.name.length'))
    .matches(/^[\u0600-\u06FF\s\w]+$/)
    .withMessage(getMessage('fields.name.invalid')),
  
  body('contact_person')
    .trim()
    .notEmpty()
    .withMessage('اسم المسؤول مطلوب')
    .isLength({ min: 2, max: 100 })
    .withMessage('يجب أن يكون اسم المسؤول بين 2 و 100 حرف')
    .matches(/^[\u0600-\u06FF\s\w]+$/)
    .withMessage('اسم المسؤول غير صالح'),
  
  body('phone')
    .optional()
    .trim()
    .custom((value) => {
      // If phone is provided, validate it
      if (value && value.length > 0) {
        if (!/^07[3-9][0-9]{8}$/.test(value)) {
          throw new Error('رقم الهاتف غير صالح (يجب أن يبدأ بـ 07 ويتكون من 11 رقم)');
        }
      }
      return true;
    }),
  
  body('email')
    .optional()
    .trim()
    .custom((value) => {
      // If email is provided, validate it
      if (value && value.length > 0) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          throw new Error(getMessage('fields.email.invalid'));
        }
      }
      return true;
    }),
  
  body('address')
    .optional()
    .trim()
    .custom((value) => {
      // If address is provided, validate its length
      if (value && value.length > 0) {
        if (value.length < 5 || value.length > 200) {
          throw new Error(getMessage('fields.address.length'));
        }
      }
      return true;
    }),
  
  validateRequest
];

// Customer receipt validation rules with Arabic messages
const validateCustomerReceipt = [
  body('customer_id')
    .isInt({ min: 1 })
    .withMessage('معرف العميل مطلوب ويجب أن يكون رقم صحيح')
    .custom(async (value) => {
      const { queryOne } = require('../database');
      const customer = queryOne('SELECT id FROM customers WHERE id = ?', [value]);
      if (!customer) {
        throw new Error('العميل غير موجود');
      }
      return true;
    }),
  
  body('sale_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('معرف فاتورة البيع يجب أن يكون رقم صحيح')
    .custom(async (value) => {
      if (value) {
        const { queryOne } = require('../database');
        const sale = queryOne('SELECT id FROM sales WHERE id = ?', [value]);
        if (!sale) {
          throw new Error('فاتورة البيع غير موجودة');
        }
      }
      return true;
    }),
  
  body('receipt_date')
    .isDate()
    .withMessage('تاريخ الإيصال يجب أن يكون تاريخ صحيح'),
  
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('المبلغ يجب أن يكون رقم موجب أكبر من صفر'),
  
  body('payment_method')
    .isIn(['cash', 'card', 'bank_transfer', 'check'])
    .withMessage('طريقة الدفع يجب أن تكون: نقدي، بطاقة، تحويل بنكي، أو شيك'),
  
  body('reference_number')
    .optional()
    .isString()
    .withMessage('رقم المرجع يجب أن يكون نص'),
  
  body('notes')
    .optional()
    .isString()
    .withMessage('الملاحظات يجب أن تكون نص'),
  
  validateRequest
];

// Receipt ID validation
const validateReceiptId = [
  body('id')
    .isInt({ min: 1 })
    .withMessage('معرف الإيصال يجب أن يكون رقم صحيح'),
  
  validateRequest
];

module.exports = {
  validateRequest,
  validateSale,
  validatePurchase,
  validateExpense,
  validateCustomer,
  validateProduct,
  validateSupplier,
  validateCustomerReceipt,
  validateReceiptId
};