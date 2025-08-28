const { getMessage, getErrorMessage, getReferenceMessage, inventoryMessages, salesMessages, purchaseMessages, customerMessages } = require('./arabicMessages');
const logger = require('./logger');

class InventoryErrorHandler {
  constructor() {
    this.messages = inventoryMessages;
  }

  // Handle validation errors
  handleValidationError(errors, req) {
    const arabicErrors = errors.map(error => {
      const field = error.param;
      const value = error.value;
      const type = error.type;

      switch (type) {
        case 'field':
          return getMessage(`fields.${field}.required`);
        case 'string':
          if (field === 'barcode' && value && value.length < 8) {
            return getMessage('fields.barcode.too_short');
          }
          return getMessage(`fields.${field}.invalid`);
        case 'number':
          if (field.includes('price') && value <= 0) {
            return getMessage('fields.price.negative');
          }
          if (field.includes('stock') && value < 0) {
            return getMessage('fields.stock.negative');
          }
          return getMessage(`fields.${field}.invalid`);
        case 'date':
          if (field === 'expiry_date') {
            return getMessage('fields.expiry_date.invalid');
          }
          return getMessage(`fields.${field}.invalid`);
        default:
          return getMessage('error.validation_error');
      }
    });

    return {
      statusCode: 400,
      message: getMessage('error.validation_error'),
      errors: arabicErrors
    };
  }

  // Handle database errors
  handleDatabaseError(error, operation = 'database') {
    logger.error(`Database error in ${operation}:`, error);

    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      if (error.message.includes('sku')) {
        return {
          statusCode: 400,
          message: getMessage('error.sku_already_exists')
        };
      }
      if (error.message.includes('barcode')) {
        return {
          statusCode: 400,
          message: getMessage('error.barcode_already_exists')
        };
      }
      return {
        statusCode: 400,
        message: getMessage('error.product_already_exists')
      };
    }

    if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return {
        statusCode: 400,
        message: getMessage('error.product_has_references')
      };
    }

    if (error.code === 'SQLITE_CONSTRAINT_NOTNULL') {
      return {
        statusCode: 400,
        message: getMessage('error.required_field')
      };
    }

    return {
      statusCode: 500,
      message: getMessage('error.database_error')
    };
  }

  // Handle business logic errors
  handleBusinessError(error, context = {}) {
    logger.error('Business logic error:', error);

    if (error.message.includes('Insufficient stock')) {
      const match = error.message.match(/Available: (\d+), Required: (\d+)/);
      if (match) {
        return {
          statusCode: 400,
          message: getErrorMessage('insufficient_stock', {
            available: match[1],
            required: match[2]
          })
        };
      }
      return {
        statusCode: 400,
        message: getMessage('error.insufficient_stock')
      };
    }

    if (error.message.includes('Product not found')) {
      return {
        statusCode: 404,
        message: getMessage('error.product_not_found')
      };
    }

    if (error.message.includes('Cannot delete product')) {
      const references = context.references || {};
      const referenceMessage = getReferenceMessage(references);
      
      return {
        statusCode: 400,
        message: `${getMessage('error.product_in_use')}. ${referenceMessage}`,
        references
      };
    }

    if (error.message.includes('SKU already exists')) {
      return {
        statusCode: 400,
        message: getMessage('error.sku_already_exists')
      };
    }

    if (error.message.includes('Barcode already exists')) {
      return {
        statusCode: 400,
        message: getMessage('error.barcode_already_exists')
      };
    }

    return {
      statusCode: 400,
      message: error.message || getMessage('error.operation_failed')
    };
  }

  // Handle file operation errors
  handleFileError(error, operation = 'file') {
    logger.error(`File operation error in ${operation}:`, error);

    if (error.code === 'ENOENT') {
      return {
        statusCode: 404,
        message: getMessage('error.file_not_found')
      };
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return {
        statusCode: 400,
        message: getMessage('error.file_too_large')
      };
    }

    if (error.message.includes('CSV')) {
      return {
        statusCode: 400,
        message: getMessage('error.csv_parse_error')
      };
    }

    return {
      statusCode: 500,
      message: getMessage('error.file_upload_error')
    };
  }

  // Handle network errors
  handleNetworkError(error) {
    logger.error('Network error:', error);

    if (error.code === 'ECONNREFUSED') {
      return {
        statusCode: 503,
        message: getMessage('error.service_unavailable')
      };
    }

    if (error.code === 'ETIMEDOUT') {
      return {
        statusCode: 408,
        message: getMessage('error.timeout_error')
      };
    }

    if (!error.response) {
      return {
        statusCode: 503,
        message: getMessage('error.network_error')
      };
    }

    return {
      statusCode: 500,
      message: getMessage('error.network_error')
    };
  }

  // Handle permission errors
  handlePermissionError(error) {
    logger.error('Permission error:', error);

    if (error.status === 401) {
      return {
        statusCode: 401,
        message: getMessage('error.unauthorized')
      };
    }

    if (error.status === 403) {
      return {
        statusCode: 403,
        message: getMessage('error.forbidden')
      };
    }

    return {
      statusCode: 403,
      message: getMessage('error.insufficient_permissions')
    };
  }

  // Main error handler
  handleError(error, context = {}) {
    // Sanitize context to avoid circular references
    const sanitizedContext = {};
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        if (value && typeof value === 'object') {
          if (value.constructor && (
            value.constructor.name === 'Socket' ||
            value.constructor.name === 'HTTPParser' ||
            value.constructor.name === 'IncomingMessage' ||
            value.constructor.name === 'ServerResponse'
          )) {
            sanitizedContext[key] = `[${value.constructor.name} Object]`;
          } else {
            sanitizedContext[key] = value;
          }
        } else {
          sanitizedContext[key] = value;
        }
      }
    }

    logger.error('Error occurred:', {
      message: error.message,
      stack: error.stack,
      context: sanitizedContext
    });

    // Handle specific error types
    if (error.name === 'ValidationError') {
      return this.handleValidationError(error.errors, context.req);
    }

    if (error.code && error.code.startsWith('SQLITE')) {
      return this.handleDatabaseError(error, context.operation);
    }

    if (error.message && (
      error.message.includes('stock') ||
      error.message.includes('Product') ||
      error.message.includes('SKU') ||
      error.message.includes('Barcode')
    )) {
      return this.handleBusinessError(error, context);
    }

    if (error.code && (
      error.code === 'ENOENT' ||
      error.code === 'LIMIT_FILE_SIZE' ||
      error.message.includes('CSV')
    )) {
      return this.handleFileError(error, context.operation);
    }

    if (error.code && (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      !error.response
    )) {
      return this.handleNetworkError(error);
    }

    if (error.status && (error.status === 401 || error.status === 403)) {
      return this.handlePermissionError(error);
    }

    // Default error
    return {
      statusCode: 500,
      message: getMessage('error.unknown_error')
    };
  }

  // Create success response
  createSuccessResponse(data, messageKey, params = {}) {
    return {
      statusCode: 200,
      message: getMessage(`success.${messageKey}`, params),
      data
    };
  }

  // Create warning response
  createWarningResponse(data, messageKey, params = {}) {
    return {
      statusCode: 200,
      message: getMessage(`warning.${messageKey}`, params),
      data,
      warning: true
    };
  }

  // Create info response
  createInfoResponse(data, messageKey, params = {}) {
    return {
      statusCode: 200,
      message: getMessage(`info.${messageKey}`, params),
      data,
      info: true
    };
  }

  // Create error response
  createErrorResponse(statusCode, message, errors = null) {
    return {
      statusCode,
      message,
      ...(errors && { errors })
    };
  }

  // Get message helper
  getMessage(messageKey, params = {}) {
    return getMessage(messageKey, params);
  }
}

class SalesErrorHandler extends InventoryErrorHandler {
  constructor() {
    super();
    this.messages = salesMessages;
  }

  // Handle sales-specific business errors
  handleSalesBusinessError(error, context = {}) {
    const errorMessage = error.message;
    
    // Handle specific sales business errors
    if (errorMessage.includes('not found') || errorMessage.includes('Sale not found')) {
      return this.createErrorResponse(404, this.messages.sale_not_found);
    }
    
    if (errorMessage.includes('Insufficient stock')) {
      return this.createErrorResponse(400, this.messages.insufficient_stock);
    }
    
    if (errorMessage.includes('Invalid payment method')) {
      return this.createErrorResponse(400, this.messages.invalid_payment_method);
    }
    
    if (errorMessage.includes('Invalid payment status')) {
      return this.createErrorResponse(400, this.messages.invalid_payment_status);
    }
    
    if (errorMessage.includes('Invalid sale status')) {
      return this.createErrorResponse(400, this.messages.invalid_sale_status);
    }
    
    if (errorMessage.includes('Invalid sale item')) {
      return this.createErrorResponse(400, this.messages.invalid_sale_item);
    }
    
    if (errorMessage.includes('Customer ID is required')) {
      return this.createErrorResponse(400, this.messages.customer_required);
    }
    
    if (errorMessage.includes('items are required') || errorMessage.includes('items.length === 0')) {
      return this.createErrorResponse(400, this.messages.items_required);
    }
    
    if (errorMessage.includes('Return items are required')) {
      return this.createErrorResponse(400, this.messages.return_items_required);
    }
    
    if (errorMessage.includes('Return reason is required')) {
      return this.createErrorResponse(400, this.messages.return_reason_required);
    }
    
    if (errorMessage.includes('Refund method is required')) {
      return this.createErrorResponse(400, this.messages.refund_method_required);
    }
    
    if (errorMessage.includes('Return quantity exceeds')) {
      return this.createErrorResponse(400, this.messages.invalid_return_quantity);
    }
    
    if (errorMessage.includes('already returned')) {
      return this.createErrorResponse(400, this.messages.sale_already_returned);
    }
    
    if (errorMessage.includes('cannot be returned')) {
      return this.createErrorResponse(400, this.messages.sale_cannot_be_returned);
    }
    
    // Default business error handling
    return this.handleBusinessError(error, context);
  }

  // Handle sales validation errors
  handleSalesValidationError(errors, req) {
    const fieldMessages = this.messages.fields;
    const validationErrors = errors.map(error => ({
      field: error.path || error.param,
      message: fieldMessages[error.path || error.param] 
        ? `${fieldMessages[error.path || error.param]}: ${error.msg}`
        : error.msg
    }));

    return this.createErrorResponse(400, 'خطأ في التحقق من البيانات', validationErrors);
  }

  // Create sales success responses
  createSalesSuccessResponse(data, messageKey, params = {}) {
    const message = this.getMessage(messageKey, params);
    return {
      statusCode: 200,
      data,
      message
    };
  }
}

class PurchasesErrorHandler extends InventoryErrorHandler {
  constructor() {
    super();
    this.messages = purchaseMessages;
  }

  // Handle purchase-specific business logic errors
  handlePurchaseBusinessError(error, context = {}) {
    logger.error('Purchase business logic error:', error);

    if (error.message.includes('Insufficient stock')) {
      const match = error.message.match(/Available: (\d+), Required: (\d+)/);
      if (match) {
        return {
          statusCode: 400,
          message: getErrorMessage('insufficient_stock', {
            available: match[1],
            required: match[2]
          })
        };
      }
      return {
        statusCode: 400,
        message: getMessage('error.insufficient_stock')
      };
    }

    if (error.message.includes('Purchase not found')) {
      return {
        statusCode: 404,
        message: getMessage('purchase_not_found')
      };
    }

    if (error.message.includes('Supplier not found')) {
      return {
        statusCode: 404,
        message: getMessage('supplier_not_found')
      };
    }

    if (error.message.includes('Product not found')) {
      return {
        statusCode: 404,
        message: getMessage('product_not_found')
      };
    }

    if (error.message.includes('Credit limit exceeded')) {
      const match = error.message.match(/Limit: ([\d.]+), Amount: ([\d.]+)/);
      if (match) {
        return {
          statusCode: 400,
          message: getErrorMessage('supplier_credit_limit_exceeded', {
            limit: match[1],
            amount: match[2]
          })
        };
      }
      return {
        statusCode: 400,
        message: getMessage('supplier_credit_limit_exceeded')
      };
    }

    if (error.message.includes('Purchase already returned')) {
      return {
        statusCode: 400,
        message: getMessage('purchase_already_returned')
      };
    }

    if (error.message.includes('Return quantity exceeds')) {
      return {
        statusCode: 400,
        message: getMessage('return_quantity_exceeds')
      };
    }

    if (error.message.includes('Cannot delete purchase')) {
      return {
        statusCode: 400,
        message: getMessage('purchase_in_use')
      };
    }

    if (error.message.includes('Purchase has returns')) {
      return {
        statusCode: 400,
        message: getMessage('purchase_has_returns')
      };
    }

    if (error.message.includes('Purchase has payments')) {
      return {
        statusCode: 400,
        message: getMessage('purchase_has_payments')
      };
    }

    if (error.message.includes('Invalid payment method')) {
      return {
        statusCode: 400,
        message: getMessage('invalid_payment_method')
      };
    }

    if (error.message.includes('Invalid payment status')) {
      return {
        statusCode: 400,
        message: getMessage('invalid_payment_status')
      };
    }

    if (error.message.includes('Invalid purchase status')) {
      return {
        statusCode: 400,
        message: getMessage('invalid_purchase_status')
      };
    }

    if (error.message.includes('Invalid return data')) {
      return {
        statusCode: 400,
        message: getMessage('invalid_return_data')
      };
    }

    return {
      statusCode: 400,
      message: error.message || getMessage('purchase_operation_failed')
    };
  }

  // Handle purchase validation errors
  handlePurchaseValidationError(errors, req) {
    const arabicErrors = errors.map(error => {
      const field = error.param;
      const value = error.value;
      const type = error.type;

      switch (type) {
        case 'field':
          return getMessage(`fields.${field}.required`);
        case 'string':
          if (field === 'invoice_no' && value && value.length < 3) {
            return getMessage('fields.invoice_no.too_short');
          }
          return getMessage(`fields.${field}.invalid`);
        case 'number':
          if (field.includes('quantity') && value <= 0) {
            return getMessage('fields.quantity.min');
          }
          if (field.includes('price') && value <= 0) {
            return getMessage('fields.price.min');
          }
          if (field.includes('discount_percent') && (value < 0 || value > 100)) {
            return getMessage('fields.discount_percent.range');
          }
          if (field.includes('tax_percent') && (value < 0 || value > 100)) {
            return getMessage('fields.tax_percent.range');
          }
          return getMessage(`fields.${field}.invalid`);
        case 'date':
          if (field === 'invoice_date' || field === 'due_date') {
            return getMessage(`fields.${field}.invalid`);
          }
          return getMessage(`fields.${field}.invalid`);
        case 'array':
          if (field === 'items' && (!value || value.length === 0)) {
            return getMessage('fields.items.required');
          }
          return getMessage(`fields.${field}.invalid`);
        default:
          return getMessage('error.validation_error');
      }
    });

    return {
      statusCode: 400,
      message: getMessage('error.validation_error'),
      errors: arabicErrors
    };
  }

  // Handle purchase return errors
  handlePurchaseReturnError(error, context = {}) {
    logger.error('Purchase return error:', error);

    if (error.message.includes('Return items required')) {
      return {
        statusCode: 400,
        message: getMessage('return_items_required')
      };
    }

    if (error.message.includes('Return reason required')) {
      return {
        statusCode: 400,
        message: getMessage('return_reason_required')
      };
    }

    if (error.message.includes('Refund method required')) {
      return {
        statusCode: 400,
        message: getMessage('refund_method_required')
      };
    }

    if (error.message.includes('Return quantity exceeds')) {
      return {
        statusCode: 400,
        message: getMessage('return_quantity_exceeds')
      };
    }

    return this.handlePurchaseBusinessError(error, context);
  }

  // Create purchase success response
  createPurchaseSuccessResponse(data, messageKey, params = {}) {
    const message = getMessage(messageKey, params);
    return {
      statusCode: 200,
      data,
      message
    };
  }

  // Handle purchase errors with context
  handlePurchaseError(error, context = {}) {
    logger.error('Purchase error:', error);

    // Handle validation errors
    if (error.type === 'validation') {
      return this.handlePurchaseValidationError(error.errors, context.req);
    }

    // Handle business logic errors
    if (error.type === 'business') {
      return this.handlePurchaseBusinessError(error, context);
    }

    // Handle return-specific errors
    if (error.type === 'return') {
      return this.handlePurchaseReturnError(error, context);
    }

    // Handle database errors
    if (error.code && error.code.startsWith('SQLITE_')) {
      return this.handleDatabaseError(error, 'purchase');
    }

    // Handle file errors
    if (error.code && (error.code === 'ENOENT' || error.code === 'LIMIT_FILE_SIZE')) {
      return this.handleFileError(error, 'purchase');
    }

    // Handle network errors
    if (error.code && (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT')) {
      return this.handleNetworkError(error);
    }

    // Handle permission errors
    if (error.statusCode === 401 || error.statusCode === 403) {
      return this.handlePermissionError(error);
    }

    // Default error handling
    return {
      statusCode: 500,
      message: getMessage('purchase_unknown_error')
    };
  }
}

class CustomersErrorHandler extends InventoryErrorHandler {
  constructor() {
    super();
    this.messages = customerMessages;
  }

  // Handle customer-specific business logic errors
  handleCustomerBusinessError(error, context = {}) {
    logger.error('Customer business logic error:', error);

    if (error.message.includes('Customer not found')) {
      return {
        statusCode: 404,
        message: getMessage('customer_not_found')
      };
    }

    if (error.message.includes('Customer already exists')) {
      return {
        statusCode: 400,
        message: getMessage('customer_already_exists')
      };
    }

    if (error.message.includes('Customer has sales')) {
      return {
        statusCode: 400,
        message: getMessage('customer_has_sales')
      };
    }

    if (error.message.includes('Customer has debts')) {
      return {
        statusCode: 400,
        message: getMessage('customer_has_debts')
      };
    }

    if (error.message.includes('Customer has installments')) {
      return {
        statusCode: 400,
        message: getMessage('customer_has_installments')
      };
    }

    if (error.message.includes('Customer has receipts')) {
      return {
        statusCode: 400,
        message: getMessage('customer_has_receipts')
      };
    }

    if (error.message.includes('Invalid customer ID')) {
      return {
        statusCode: 400,
        message: getMessage('invalid_customer_id')
      };
    }

    if (error.message.includes('Search query required')) {
      return {
        statusCode: 400,
        message: getMessage('customer_search_query_required')
      };
    }

    if (error.message.includes('No search results')) {
      return {
        statusCode: 404,
        message: getMessage('customer_search_no_results')
      };
    }

    return {
      statusCode: 400,
      message: error.message || getMessage('customer_operation_failed')
    };
  }

  // Handle customer validation errors
  handleCustomerValidationError(errors, req) {
    const arabicErrors = errors.map(error => {
      const field = error.param;
      const value = error.value;
      const type = error.type;

      switch (type) {
        case 'field':
          return getMessage(`fields.${field}.required`);
        case 'string':
          if (field === 'name') {
            if (value && (value.length < 2 || value.length > 100)) {
              return getMessage('fields.name.length');
            }
            return getMessage('fields.name.invalid');
          }
          if (field === 'email' && value) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              return getMessage('fields.email.invalid');
            }
            return getMessage('fields.email.duplicate');
          }
          if (field === 'phone') {
            if (!/^07[3-9][0-9]{8}$/.test(value)) {
              return getMessage('fields.phone.invalid');
            }
            return getMessage('fields.phone.duplicate');
          }
          if (field === 'address' && value) {
            if (value.length < 5 || value.length > 200) {
              return getMessage('fields.address.length');
            }
            return getMessage('fields.address.invalid');
          }
          return getMessage(`fields.${field}.invalid`);
        case 'number':
          return getMessage(`fields.${field}.invalid`);
        default:
          return getMessage('error.validation_error');
      }
    });

    return {
      statusCode: 400,
      message: getMessage('error.validation_error'),
      errors: arabicErrors
    };
  }

  // Create customer success response
  createCustomerSuccessResponse(data, messageKey, params = {}) {
    const message = getMessage(messageKey, params);
    return {
      statusCode: 200,
      data,
      message
    };
  }

  // Handle customer errors with context
  handleCustomerError(error, context = {}) {
    logger.error('Customer error:', error);

    // Handle validation errors
    if (error.type === 'validation') {
      return this.handleCustomerValidationError(error.errors, context.req);
    }

    // Handle business logic errors
    if (error.type === 'business') {
      return this.handleCustomerBusinessError(error, context);
    }

    // Handle database errors
    if (error.code && error.code.startsWith('SQLITE_')) {
      return this.handleDatabaseError(error, 'customer');
    }

    // Handle file errors
    if (error.code && (error.code === 'ENOENT' || error.code === 'LIMIT_FILE_SIZE')) {
      return this.handleFileError(error, 'customer');
    }

    // Handle network errors
    if (error.code && (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT')) {
      return this.handleNetworkError(error);
    }

    // Handle permission errors
    if (error.statusCode === 401 || error.statusCode === 403) {
      return this.handlePermissionError(error);
    }

    // Default error handling
    return {
      statusCode: 500,
      message: getMessage('customer_unknown_error')
    };
  }
}

class SuppliersErrorHandler extends InventoryErrorHandler {
  constructor() {
    super();
    this.messages = {
      ...inventoryMessages, // Inherit base messages
      create: 'تم إنشاء المورد بنجاح',
      update: 'تم تحديث بيانات المورد بنجاح',
      delete: 'تم حذف المورد بنجاح',
      not_found: 'المورد غير موجود',
      already_exists: 'المورد موجود مسبقاً',
      has_sales: 'المورد لديه عمليات إيرادات',
      has_debts: 'المورد لديه ديون',
      has_installments: 'المورد لديه دفعات',
      has_receipts: 'المورد لديه إيصالات',
      invalid_id: 'معرف المورد غير صالح',
      search_query_required: 'يجب إدخال مطلوب البحث',
      search_no_results: 'لم يتم العثور على نتائج للبحث',
      operation_failed: 'فشلت عملية المورد'
    };
  }

  handleCreateError(error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      if (error.message.includes('name')) {
        return this.createErrorResponse(400, this.messages.already_exists);
      }
      if (error.message.includes('email')) {
        return this.createErrorResponse(400, this.messages.already_exists);
      }
      if (error.message.includes('phone')) {
        return this.createErrorResponse(400, this.messages.already_exists);
      }
    }
    return this.createErrorResponse(500, this.messages.operation_failed);
  }

  handleUpdateError(error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      if (error.message.includes('name')) {
        return this.createErrorResponse(400, this.messages.already_exists);
      }
      if (error.message.includes('email')) {
        return this.createErrorResponse(400, this.messages.already_exists);
      }
      if (error.message.includes('phone')) {
        return this.createErrorResponse(400, this.messages.already_exists);
      }
    }
    return this.createErrorResponse(500, this.messages.operation_failed);
  }

  handleDeleteError(error) {
    if (error.message.includes('FOREIGN KEY constraint failed')) {
      return this.createErrorResponse(400, this.messages.delete);
    }
    return this.createErrorResponse(500, this.messages.operation_failed);
  }

  handleGetError(error) {
    return this.createErrorResponse(500, this.messages.operation_failed);
  }

  handleSearchError(error) {
    return this.createErrorResponse(500, this.messages.operation_failed);
  }

  handleNotFound() {
    return this.createErrorResponse(404, this.messages.not_found);
  }
}

class CustomerReceiptsErrorHandler extends InventoryErrorHandler {
  constructor() {
    super();
    this.messages = {
      create: 'تم إنشاء إيصال الدفع بنجاح',
      update: 'تم تحديث إيصال الدفع بنجاح',
      delete: 'تم حذف إيصال الدفع بنجاح',
      get: 'تم جلب بيانات إيصال الدفع بنجاح',
      notFound: 'إيصال الدفع غير موجود',
      validation: 'خطأ في التحقق من بيانات إيصال الدفع',
      database: 'حدث خطأ في قاعدة البيانات',
      business: 'حدث خطأ في العملية'
    };
  }

  handleCreateError(error) {
    if (error.message.includes('Receipt number already exists')) {
      return {
        status: 400,
        message: 'رقم الإيصال موجود مسبقاً'
      };
    }
    if (error.message.includes('Customer not found')) {
      return {
        status: 400,
        message: 'العميل غير موجود'
      };
    }
    if (error.message.includes('Sale not found')) {
      return {
        status: 400,
        message: 'فاتورة البيع غير موجودة'
      };
    }
    if (error.message.includes('Invalid amount')) {
      return {
        status: 400,
        message: 'المبلغ غير صالح'
      };
    }
    return {
      status: 500,
      message: 'حدث خطأ أثناء إنشاء إيصال الدفع'
    };
  }

  handleUpdateError(error) {
    if (error.message.includes('Receipt not found')) {
      return {
        status: 404,
        message: 'إيصال الدفع غير موجود'
      };
    }
    if (error.message.includes('Receipt number already exists')) {
      return {
        status: 400,
        message: 'رقم الإيصال موجود مسبقاً'
      };
    }
    if (error.message.includes('Customer not found')) {
      return {
        status: 400,
        message: 'العميل غير موجود'
      };
    }
    if (error.message.includes('Sale not found')) {
      return {
        status: 400,
        message: 'فاتورة البيع غير موجودة'
      };
    }
    return {
      status: 500,
      message: 'حدث خطأ أثناء تحديث إيصال الدفع'
    };
  }

  handleDeleteError(error) {
    if (error.message.includes('Receipt not found')) {
      return {
        status: 404,
        message: 'إيصال الدفع غير موجود'
      };
    }
    return {
      status: 500,
      message: 'حدث خطأ أثناء حذف إيصال الدفع'
    };
  }

  handleGetError(error) {
    if (error.message.includes('Receipt not found')) {
      return {
        status: 404,
        message: 'إيصال الدفع غير موجود'
      };
    }
    return {
      status: 500,
      message: 'حدث خطأ أثناء جلب بيانات إيصال الدفع'
    };
  }

  handleSearchError(error) {
    if (error.message.includes('Customer not found')) {
      return {
        status: 404,
        message: 'العميل غير موجود'
      };
    }
    return {
      status: 500,
      message: 'حدث خطأ أثناء البحث عن إيصالات الدفع'
    };
  }

  handleNotFound() {
    return {
      status: 404,
      message: 'إيصال الدفع غير موجود'
    };
  }
}

class CashBoxErrorHandler {
  static handleGetAllOpenCashBoxes(error) {
    logger.error('Error getting all open cash boxes:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء جلب الصناديق المفتوحة',
      errors: []
    };
  }

  static handleGetCashBoxDetails(error) {
    logger.error('Error getting cash box details:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء جلب تفاصيل الصندوق',
      errors: []
    };
  }

  static handleGetCashBoxTransactions(error) {
    logger.error('Error getting cash box transactions:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء جلب معاملات الصندوق',
      errors: []
    };
  }

  static handleForceCloseCashBox(error) {
    logger.error('Error force closing cash box:', error);
    
    if (error.message.includes('not found')) {
      return {
        success: false,
        message: 'الصندوق غير موجود',
        errors: []
      };
    }
    
    if (error.message.includes('already closed')) {
      return {
        success: false,
        message: 'الصندوق مغلق بالفعل',
        errors: []
      };
    }
    
    return {
      success: false,
      message: 'حدث خطأ أثناء إغلاق الصندوق إجبارياً',
      errors: []
    };
  }

  static handleGetAllUsersCashBoxHistory(error) {
    logger.error('Error getting all users cash box history:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء جلب تاريخ صناديق المستخدمين',
      errors: []
    };
  }

  static handleValidationError(field, message) {
    return {
      success: false,
      message: 'خطأ في التحقق من البيانات',
      errors: [{
        field: field,
        message: message
      }]
    };
  }
}

class SupplierPaymentReceiptsErrorHandler {
  static handleGetAll(error) {
    logger.error('Error getting supplier payment receipts:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء جلب إيصالات دفع الموردين',
      errors: []
    };
  }

  static handleGetById(error) {
    logger.error('Error getting supplier payment receipt by ID:', error);
    
    if (error.message.includes('not found')) {
      return {
        success: false,
        message: 'إيصال الدفع غير موجود',
        errors: []
      };
    }
    
    return {
      success: false,
      message: 'حدث خطأ أثناء جلب بيانات إيصال الدفع',
      errors: []
    };
  }

  static handleCreate(error) {
    logger.error('Error creating supplier payment receipt:', error);
    
    if (error.message.includes('already exists')) {
      return {
        success: false,
        message: 'رقم الإيصال موجود بالفعل',
        errors: []
      };
    }
    
    if (error.message.includes('not found')) {
      return {
        success: false,
        message: 'المورد أو فاتورة الشراء غير موجودة',
        errors: []
      };
    }
    
    return {
      success: false,
      message: 'حدث خطأ أثناء إنشاء إيصال الدفع',
      errors: []
    };
  }

  static handleUpdate(error) {
    logger.error('Error updating supplier payment receipt:', error);
    
    if (error.message.includes('not found')) {
      return {
        success: false,
        message: 'إيصال الدفع غير موجود',
        errors: []
      };
    }
    
    if (error.message.includes('already exists')) {
      return {
        success: false,
        message: 'رقم الإيصال موجود بالفعل',
        errors: []
      };
    }
    
    return {
      success: false,
      message: 'حدث خطأ أثناء تحديث إيصال الدفع',
      errors: []
    };
  }

  static handleDelete(error) {
    logger.error('Error deleting supplier payment receipt:', error);
    
    if (error.message.includes('not found')) {
      return {
        success: false,
        message: 'إيصال الدفع غير موجود',
        errors: []
      };
    }
    
    return {
      success: false,
      message: 'حدث خطأ أثناء حذف إيصال الدفع',
      errors: []
    };
  }

  static handleGetStatistics(error) {
    logger.error('Error getting supplier payment receipt statistics:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء جلب الإحصائيات',
      errors: []
    };
  }

  static handleGetSupplierPurchases(error) {
    logger.error('Error getting supplier purchases:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء جلب فواتير الشراء للمورد',
      errors: []
    };
  }

  static handleGetSupplierSummary(error) {
    logger.error('Error getting supplier receipt summary:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء جلب ملخص إيصالات المورد',
      errors: []
    };
  }

  static handleExportToCSV(error) {
    logger.error('Error exporting supplier payment receipts to CSV:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تصدير البيانات',
      errors: []
    };
  }

  static handleValidationError(field, message) {
    return {
      success: false,
      message: 'خطأ في التحقق من البيانات',
      errors: [{
        field: field,
        message: message
      }]
    };
  }
}

class ExpensesErrorHandler {
  static handleGetAll(error) {
    console.error('Expenses Get All Error:', error);
    
    if (error.message.includes('Failed to fetch expenses')) {
      return {
        success: false,
        message: 'حدث خطأ أثناء جلب المصروفات',
        errors: [
          {
            field: 'general',
            message: 'فشل في تحميل قائمة المصروفات'
          }
        ]
      };
    }
    
    return {
      success: false,
      message: 'حدث خطأ غير متوقع أثناء جلب المصروفات',
      errors: [
        {
          field: 'general',
          message: 'خطأ في النظام'
        }
      ]
    };
  }

  static handleGetById(error) {
    console.error('Expenses Get By ID Error:', error);
    
    if (error.message.includes('Failed to fetch expense')) {
      return {
        success: false,
        message: 'حدث خطأ أثناء جلب بيانات المصروف',
        errors: [
          {
            field: 'id',
            message: 'المصروف غير موجود'
          }
        ]
      };
    }
    
    return {
      success: false,
      message: 'حدث خطأ أثناء جلب بيانات المصروف',
      errors: [
        {
          field: 'general',
          message: 'خطأ في النظام'
        }
      ]
    };
  }

  static handleCreate(error) {
    console.error('Expenses Create Error:', error);
    
    // Handle validation errors
    if (error.message.includes('Missing required fields')) {
      return {
        success: false,
        message: 'البيانات المطلوبة غير مكتملة',
        errors: [
          {
            field: 'general',
            message: 'يرجى ملء جميع الحقول المطلوبة'
          }
        ]
      };
    }
    
    if (error.message.includes('Failed to create expense')) {
      return {
        success: false,
        message: 'حدث خطأ أثناء إنشاء المصروف',
        errors: [
          {
            field: 'general',
            message: 'فشل في حفظ المصروف'
          }
        ]
      };
    }
    
    return {
      success: false,
      message: 'حدث خطأ أثناء إنشاء المصروف',
      errors: [
        {
          field: 'general',
          message: 'خطأ في النظام'
        }
      ]
    };
  }

  static handleUpdate(error) {
    console.error('Expenses Update Error:', error);
    
    if (error.message.includes('Missing required fields')) {
      return {
        success: false,
        message: 'البيانات المطلوبة غير مكتملة',
        errors: [
          {
            field: 'general',
            message: 'يرجى ملء جميع الحقول المطلوبة'
          }
        ]
      };
    }
    
    if (error.message.includes('Failed to update expense')) {
      return {
        success: false,
        message: 'حدث خطأ أثناء تحديث المصروف',
        errors: [
          {
            field: 'general',
            message: 'فشل في تحديث المصروف'
          }
        ]
      };
    }
    
    return {
      success: false,
      message: 'حدث خطأ أثناء تحديث المصروف',
      errors: [
        {
          field: 'general',
          message: 'خطأ في النظام'
        }
      ]
    };
  }

  static handleDelete(error) {
    console.error('Expenses Delete Error:', error);
    
    if (error.message.includes('Failed to delete expense')) {
      return {
        success: false,
        message: 'حدث خطأ أثناء حذف المصروف',
        errors: [
          {
            field: 'general',
            message: 'فشل في حذف المصروف'
          }
        ]
      };
    }
    
    return {
      success: false,
      message: 'حدث خطأ أثناء حذف المصروف',
      errors: [
        {
          field: 'general',
          message: 'خطأ في النظام'
        }
      ]
    };
  }

  static handleGetByCategory(error) {
    console.error('Expenses Get By Category Error:', error);
    
    if (error.message.includes('Failed to fetch expenses by category')) {
      return {
        success: false,
        message: 'حدث خطأ أثناء جلب المصروفات حسب الفئة',
        errors: [
          {
            field: 'category',
            message: 'فشل في جلب المصروفات للفئة المحددة'
          }
        ]
      };
    }
    
    return {
      success: false,
      message: 'حدث خطأ أثناء جلب المصروفات حسب الفئة',
      errors: [
        {
          field: 'general',
          message: 'خطأ في النظام'
        }
      ]
    };
  }

  static handleGetByDateRange(error) {
    console.error('Expenses Get By Date Range Error:', error);
    
    if (error.message.includes('Failed to fetch expenses by date range')) {
      return {
        success: false,
        message: 'حدث خطأ أثناء جلب المصروفات حسب التاريخ',
        errors: [
          {
            field: 'date',
            message: 'فشل في جلب المصروفات للفترة المحددة'
          }
        ]
      };
    }
    
    return {
      success: false,
      message: 'حدث خطأ أثناء جلب المصروفات حسب التاريخ',
      errors: [
        {
          field: 'general',
          message: 'خطأ في النظام'
        }
      ]
    };
  }

  static handleValidationError(field, message) {
    return {
      success: false,
      message: 'بيانات غير صحيحة',
      errors: [
        {
          field: field,
          message: message
        }
      ]
    };
  }
}

class InstallmentsErrorHandler {
  static handleGetAll(error) {
    console.error('Installments Get All Error:', error);
    
    if (error.message.includes('Failed to fetch installments')) {
      return {
        success: false,
        message: 'حدث خطأ أثناء جلب الأقساط',
        errors: [
          {
            field: 'general',
            message: 'فشل في تحميل قائمة الأقساط'
          }
        ]
      };
    }
    
    return {
      success: false,
      message: 'حدث خطأ غير متوقع أثناء جلب الأقساط',
      errors: [
        {
          field: 'general',
          message: 'خطأ في النظام'
        }
      ]
    };
  }

  static handleGetById(error) {
    console.error('Installments Get By ID Error:', error);
    
    if (error.message.includes('Failed to fetch installment') || error.message.includes('not found')) {
      return {
        success: false,
        message: 'حدث خطأ أثناء جلب بيانات القسط',
        errors: [
          {
            field: 'id',
            message: 'القسط غير موجود'
          }
        ]
      };
    }
    
    return {
      success: false,
      message: 'حدث خطأ أثناء جلب بيانات القسط',
      errors: [
        {
          field: 'general',
          message: 'خطأ في النظام'
        }
      ]
    };
  }

  static handleCreate(error) {
    console.error('Installments Create Error:', error);
    
    // Handle validation errors
    if (error.message.includes('Missing required fields')) {
      return {
        success: false,
        message: 'البيانات المطلوبة غير مكتملة',
        errors: [
          {
            field: 'general',
            message: 'يرجى ملء جميع الحقول المطلوبة'
          }
        ]
      };
    }
    
    if (error.message.includes('Invalid sale_id') || error.message.includes('Sale not found')) {
      return {
        success: false,
        message: 'رقم الفاتورة غير صحيح',
        errors: [
          {
            field: 'sale_id',
            message: 'الفاتورة غير موجودة'
          }
        ]
      };
    }
    
    if (error.message.includes('Invalid customer_id') || error.message.includes('Customer not found')) {
      return {
        success: false,
        message: 'رقم العميل غير صحيح',
        errors: [
          {
            field: 'customer_id',
            message: 'العميل غير موجود'
          }
        ]
      };
    }
    
    if (error.message.includes('Failed to create installment')) {
      return {
        success: false,
        message: 'حدث خطأ أثناء إنشاء القسط',
        errors: [
          {
            field: 'general',
            message: 'فشل في حفظ القسط'
          }
        ]
      };
    }
    
    return {
      success: false,
      message: 'حدث خطأ أثناء إنشاء القسط',
      errors: [
        {
          field: 'general',
          message: 'خطأ في النظام'
        }
      ]
    };
  }

  static handleUpdate(error) {
    console.error('Installments Update Error:', error);
    
    if (error.message.includes('Missing required fields')) {
      return {
        success: false,
        message: 'البيانات المطلوبة غير مكتملة',
        errors: [
          {
            field: 'general',
            message: 'يرجى ملء جميع الحقول المطلوبة'
          }
        ]
      };
    }
    
    if (error.message.includes('Installment not found')) {
      return {
        success: false,
        message: 'القسط غير موجود',
        errors: [
          {
            field: 'id',
            message: 'القسط المراد تحديثه غير موجود'
          }
        ]
      };
    }
    
    if (error.message.includes('Failed to update installment')) {
      return {
        success: false,
        message: 'حدث خطأ أثناء تحديث القسط',
        errors: [
          {
            field: 'general',
            message: 'فشل في تحديث القسط'
          }
        ]
      };
    }
    
    return {
      success: false,
      message: 'حدث خطأ أثناء تحديث القسط',
      errors: [
        {
          field: 'general',
          message: 'خطأ في النظام'
        }
      ]
    };
  }

  static handleDelete(error) {
    console.error('Installments Delete Error:', error);
    
    if (error.message.includes('Installment not found')) {
      return {
        success: false,
        message: 'القسط غير موجود',
        errors: [
          {
            field: 'id',
            message: 'القسط المراد حذفه غير موجود'
          }
        ]
      };
    }
    
    if (error.message.includes('Failed to delete installment')) {
      return {
        success: false,
        message: 'حدث خطأ أثناء حذف القسط',
        errors: [
          {
            field: 'general',
            message: 'فشل في حذف القسط'
          }
        ]
      };
    }
    
    return {
      success: false,
      message: 'حدث خطأ أثناء حذف القسط',
      errors: [
        {
          field: 'general',
          message: 'خطأ في النظام'
        }
      ]
    };
  }

  static handleRecordPayment(error) {
    console.error('Installments Record Payment Error:', error);
    
    if (error.message.includes('Installment not found')) {
      return {
        success: false,
        message: 'القسط غير موجود',
        errors: [
          {
            field: 'id',
            message: 'القسط المراد دفعه غير موجود'
          }
        ]
      };
    }
    
    if (error.message.includes('Invalid payment amount')) {
      return {
        success: false,
        message: 'مبلغ الدفع غير صحيح',
        errors: [
          {
            field: 'paid_amount',
            message: 'مبلغ الدفع يجب أن يكون أكبر من صفر وأقل من أو يساوي المبلغ المتبقي'
          }
        ]
      };
    }
    
    if (error.message.includes('Payment exceeds remaining amount')) {
      return {
        success: false,
        message: 'مبلغ الدفع يتجاوز المبلغ المتبقي',
        errors: [
          {
            field: 'paid_amount',
            message: 'لا يمكن دفع مبلغ أكبر من المبلغ المتبقي'
          }
        ]
      };
    }
    
    if (error.message.includes('Failed to record payment')) {
      return {
        success: false,
        message: 'حدث خطأ أثناء تسجيل الدفع',
        errors: [
          {
            field: 'general',
            message: 'فشل في تسجيل الدفع'
          }
        ]
      };
    }
    
    return {
      success: false,
      message: 'حدث خطأ أثناء تسجيل الدفع',
      errors: [
        {
          field: 'general',
          message: 'خطأ في النظام'
        }
      ]
    };
  }

  static handleCreatePlan(error) {
    console.error('Installments Create Plan Error:', error);
    
    if (error.message.includes('Customer not found')) {
      return {
        success: false,
        message: 'العميل غير موجود',
        errors: [
          {
            field: 'customer_id',
            message: 'يرجى اختيار عميل صحيح'
          }
        ]
      };
    }
    
    if (error.message.includes('No products selected')) {
      return {
        success: false,
        message: 'لم يتم اختيار منتجات',
        errors: [
          {
            field: 'selectedProducts',
            message: 'يرجى إضافة منتجات للخطة'
          }
        ]
      };
    }
    
    if (error.message.includes('Insufficient stock')) {
      return {
        success: false,
        message: 'المخزون غير كافي',
        errors: [
          {
            field: 'stock',
            message: 'أحد المنتجات لا يحتوي على مخزون كافي'
          }
        ]
      };
    }
    
    if (error.message.includes('Failed to create installment plan')) {
      return {
        success: false,
        message: 'حدث خطأ أثناء إنشاء خطة الأقساط',
        errors: [
          {
            field: 'general',
            message: 'فشل في إنشاء خطة الأقساط'
          }
        ]
      };
    }
    
    return {
      success: false,
      message: 'حدث خطأ أثناء إنشاء خطة الأقساط',
      errors: [
        {
          field: 'general',
          message: 'خطأ في النظام'
        }
      ]
    };
  }

  static handleGetBySaleId(error) {
    console.error('Installments Get By Sale ID Error:', error);
    
    if (error.message.includes('Sale not found')) {
      return {
        success: false,
        message: 'الفاتورة غير موجودة',
        errors: [
          {
            field: 'sale_id',
            message: 'الفاتورة المحددة غير موجودة'
          }
        ]
      };
    }
    
    return {
      success: false,
      message: 'حدث خطأ أثناء جلب أقساط الفاتورة',
      errors: [
        {
          field: 'general',
          message: 'خطأ في النظام'
        }
      ]
    };
  }

  static handleGetByCustomerId(error) {
    console.error('Installments Get By Customer ID Error:', error);
    
    if (error.message.includes('Customer not found')) {
      return {
        success: false,
        message: 'العميل غير موجود',
        errors: [
          {
            field: 'customer_id',
            message: 'العميل المحدد غير موجود'
          }
        ]
      };
    }
    
    return {
      success: false,
      message: 'حدث خطأ أثناء جلب أقساط العميل',
      errors: [
        {
          field: 'general',
          message: 'خطأ في النظام'
        }
      ]
    };
  }

  static handleValidationError(field, message) {
    return {
      success: false,
      message: 'بيانات غير صحيحة',
      errors: [
        {
          field: field,
          message: message
        }
      ]
    };
  }
}

class CategoriesErrorHandler extends InventoryErrorHandler {
  constructor() {
    super();
    this.messages = {
      ...inventoryMessages,
      // Category-specific messages
      success: {
        ...inventoryMessages.success,
        category_created: 'تم إضافة الفئة بنجاح',
        category_updated: 'تم تحديث الفئة بنجاح',
        category_deleted: 'تم حذف الفئة بنجاح',
        categories_fetched: 'تم جلب قائمة الفئات بنجاح',
        category_fetched: 'تم جلب الفئة بنجاح'
      },
      error: {
        ...inventoryMessages.error,
        category_not_found: 'الفئة غير موجودة',
        category_already_exists: 'الفئة موجودة مسبقاً',
        category_in_use: 'لا يمكن حذف الفئة لأنها مستخدمة في منتجات',
        category_has_products: 'لا يمكن حذف الفئة لأنها تحتوي على منتجات',
        category_name_required: 'اسم الفئة مطلوب',
        category_name_too_short: 'اسم الفئة قصير جداً',
        category_name_too_long: 'اسم الفئة طويل جداً',
        category_name_invalid: 'اسم الفئة غير صحيح',
        category_fetch_failed: 'فشل في جلب قائمة الفئات',
        category_create_failed: 'فشل في إنشاء الفئة',
        category_update_failed: 'فشل في تحديث الفئة',
        category_delete_failed: 'فشل في حذف الفئة'
      }
    };
  }

  // Handle category-specific business errors
  handleCategoryBusinessError(error, context = {}) {
    logger.error('Category business error:', error);

    if (error.message.includes('Category not found')) {
      return {
        statusCode: 404,
        message: getMessage('error.category_not_found'),
        categoryId: context.categoryId
      };
    }

    if (error.message.includes('Category already exists') || error.message.includes('UNIQUE constraint failed')) {
      return {
        statusCode: 400,
        message: getMessage('error.category_already_exists'),
        categoryName: context.categoryName
      };
    }

    if (error.message.includes('Category in use') || error.message.includes('FOREIGN KEY constraint failed')) {
      return {
        statusCode: 400,
        message: getMessage('error.category_in_use'),
        categoryName: context.categoryName,
        productCount: context.productCount
      };
    }

    if (error.message.includes('Category name required')) {
      return {
        statusCode: 400,
        message: getMessage('error.category_name_required')
      };
    }

    if (error.message.includes('Category name too short')) {
      return {
        statusCode: 400,
        message: getMessage('error.category_name_too_short')
      };
    }

    if (error.message.includes('Category name too long')) {
      return {
        statusCode: 400,
        message: getMessage('error.category_name_too_long')
      };
    }

    if (error.message.includes('Failed to create category')) {
      return {
        statusCode: 500,
        message: getMessage('error.category_create_failed')
      };
    }

    if (error.message.includes('Failed to update category')) {
      return {
        statusCode: 500,
        message: getMessage('error.category_update_failed')
      };
    }

    if (error.message.includes('Failed to delete category')) {
      return {
        statusCode: 500,
        message: getMessage('error.category_delete_failed')
      };
    }

    if (error.message.includes('Failed to get all categories')) {
      return {
        statusCode: 500,
        message: getMessage('error.category_fetch_failed')
      };
    }

    // Default category business error
    return {
      statusCode: 400,
      message: getMessage('error.operation_failed')
    };
  }

  // Handle category validation errors
  handleCategoryValidationError(errors, req) {
    const arabicErrors = errors.map(error => {
      const field = error.param;
      const value = error.value;
      const type = error.type;

      switch (type) {
        case 'field':
          if (field === 'name') {
            return getMessage('fields.category_name.required');
          }
          return getMessage(`fields.${field}.required`);
        case 'string':
          if (field === 'name') {
            if (value && value.length < 2) {
              return getMessage('fields.category_name.too_short');
            }
            if (value && value.length > 50) {
              return getMessage('fields.category_name.too_long');
            }
            return getMessage('fields.category_name.invalid');
          }
          return getMessage(`fields.${field}.invalid`);
        default:
          return getMessage('error.validation_error');
      }
    });

    return {
      statusCode: 400,
      message: getMessage('error.validation_error'),
      errors: arabicErrors
    };
  }

  // Handle category database errors
  handleCategoryDatabaseError(error, operation = 'category') {
    logger.error(`Category database error in ${operation}:`, error);

    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      if (error.message.includes('name')) {
        return {
          statusCode: 400,
          message: getMessage('error.category_already_exists')
        };
      }
      return {
        statusCode: 400,
        message: getMessage('error.category_already_exists')
      };
    }

    if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return {
        statusCode: 400,
        message: getMessage('error.category_in_use')
      };
    }

    if (error.code === 'SQLITE_CONSTRAINT_NOTNULL') {
      return {
        statusCode: 400,
        message: getMessage('error.category_name_required')
      };
    }

    return {
      statusCode: 500,
      message: getMessage('error.database_error')
    };
  }

  // Main category error handler
  handleCategoryError(error, context = {}) {
    logger.error('Category error occurred:', {
      message: error.message,
      stack: error.stack,
      context
    });

    // Handle specific error types
    if (error.name === 'ValidationError') {
      return this.handleCategoryValidationError(error.errors, context.req);
    }

    if (error.code && error.code.startsWith('SQLITE')) {
      return this.handleCategoryDatabaseError(error, context.operation);
    }

    if (error.message && (
      error.message.includes('Category') ||
      error.message.includes('category') ||
      error.message.includes('Failed to') ||
      error.message.includes('UNIQUE constraint') ||
      error.message.includes('FOREIGN KEY constraint')
    )) {
      return this.handleCategoryBusinessError(error, context);
    }

    // Default error handling
    return {
      statusCode: 500,
      message: getMessage('error.unknown_error')
    };
  }

  // Create category success response
  createCategorySuccessResponse(data, messageKey, params = {}) {
    return {
      statusCode: 200,
      message: getMessage(`success.${messageKey}`, params),
      data
    };
  }

  // Create category error response
  createCategoryErrorResponse(statusCode, message, errors = null) {
    return {
      statusCode,
      message,
      ...(errors && { errors })
    };
  }

  // Static methods for backward compatibility
  static handleGetAll(error) {
    const handler = new CategoriesErrorHandler();
    return handler.handleCategoryError(error, { operation: 'getAll' });
  }

  static handleAdd(error) {
    const handler = new CategoriesErrorHandler();
    return handler.handleCategoryError(error, { operation: 'add' });
  }

  static handleEdit(error) {
    const handler = new CategoriesErrorHandler();
    return handler.handleCategoryError(error, { operation: 'edit' });
  }

  static handleDelete(error) {
    const handler = new CategoriesErrorHandler();
    return handler.handleCategoryError(error, { operation: 'delete' });
  }

  static createSuccessResponse(data, messageKey, params = {}) {
    const handler = new CategoriesErrorHandler();
    return handler.createCategorySuccessResponse(data, messageKey, params);
  }
}


// Create instances
const inventoryErrorHandler = new InventoryErrorHandler();
const salesErrorHandler = new SalesErrorHandler();
const purchasesErrorHandler = new PurchasesErrorHandler();
const customersErrorHandler = new CustomersErrorHandler();
const suppliersErrorHandler = new SuppliersErrorHandler();
const customerReceiptsErrorHandler = new CustomerReceiptsErrorHandler();

module.exports = {
  InventoryErrorHandler: inventoryErrorHandler,
  SalesErrorHandler: salesErrorHandler,
  PurchasesErrorHandler: purchasesErrorHandler,
  CustomersErrorHandler: customersErrorHandler,
  SuppliersErrorHandler: suppliersErrorHandler,
  CustomerReceiptsErrorHandler: customerReceiptsErrorHandler,
  CashBoxErrorHandler,
  getMessage,
  getErrorMessage,
  getReferenceMessage,
  SupplierPaymentReceiptsErrorHandler,
  ExpensesErrorHandler,
  InstallmentsErrorHandler,
  CategoriesErrorHandler
}; 