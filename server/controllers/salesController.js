const { validationResult } = require('express-validator');
const asyncHandler = require('express-async-handler');
const salesService = require('../services/salesService');
const logger = require('../utils/logger');
const { sendResponse } = require('../utils/response');
const { SalesErrorHandler } = require('../utils/errorHandler');
const cacheService = require('../services/cacheService');

class SalesController {
  getAll = asyncHandler(async (req, res) => {
    try {
      const startTime = logger.performance.start('SALES_GET_ALL', { filters: req.query });
      
      const sales = await salesService.getAll(req.query);
      
      logger.performance.end('SALES_GET_ALL', startTime, { count: sales.length });
      logger.process.sales.dataAccess(req.user?.id, 'sales', 'read');
      
      const successResponse = SalesErrorHandler.createSalesSuccessResponse(sales, 'sales_fetched');
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    } catch (err) {
      logger.errorWithContext(err, { operation: 'getAll', userId: req.user?.id });
      const errorResponse = SalesErrorHandler.handleError(err, { 
        operation: 'getAll',
        req 
      });
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  });

  getById = asyncHandler(async (req, res) => {
    try {
      const startTime = logger.performance.start('SALES_GET_BY_ID', { saleId: req.params.id });
      
      const sale = await salesService.getById(req.params.id);
      
      logger.performance.end('SALES_GET_BY_ID', startTime, { found: !!sale });
      logger.process.sales.dataAccess(req.user?.id, 'sale', 'read');
      
      if (!sale) {
        logger.warn('SALES_NOT_FOUND', { saleId: req.params.id, userId: req.user?.id });
        const errorResponse = SalesErrorHandler.handleSalesBusinessError(
          new Error('Sale not found'),
          { saleId: req.params.id }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
      }
      
      const successResponse = SalesErrorHandler.createSalesSuccessResponse(sale, 'sale_fetched');
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    } catch (err) {
      logger.errorWithContext(err, { operation: 'getById', saleId: req.params.id, userId: req.user?.id });
      const errorResponse = SalesErrorHandler.handleError(err, { 
        operation: 'getById',
        req 
      });
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  });

  getCustomerSales = asyncHandler(async (req, res) => {
    try {
      const startTime = logger.performance.start('SALES_GET_CUSTOMER_SALES', { customerId: req.params.customerId });
      
      const sales = await salesService.getCustomerSales(req.params.customerId);
      
      logger.performance.end('SALES_GET_CUSTOMER_SALES', startTime, { count: sales.length });
      logger.process.sales.dataAccess(req.user?.id, 'customer_sales', 'read');
      
      const successResponse = SalesErrorHandler.createSalesSuccessResponse(sales, 'sales_fetched');
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    } catch (err) {
      logger.errorWithContext(err, { operation: 'getCustomerSales', customerId: req.params.customerId, userId: req.user?.id });
      const errorResponse = SalesErrorHandler.handleError(err, { 
        operation: 'getCustomerSales',
        req 
      });
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  });

  create = asyncHandler(async (req, res) => {
    try {
      const startTime = logger.performance.start('SALES_CREATE', { 
        customerId: req.body.customer_id,
        itemsCount: req.body.items?.length,
        totalAmount: req.body.total_amount,
        barcode: req.body.barcode
      });
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('SALES_CREATE_VALIDATION_ERROR', { 
          errors: errors.array(),
          userId: req.user?.id 
        });
        const errorResponse = SalesErrorHandler.handleSalesValidationError(errors.array(), req);
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
      }

      const {
        customer_id,
        invoice_date,
        due_date,
        payment_method,
        payment_status,
        paid_amount,
        notes,
        items,
        total_amount,
        is_anonymous = false,
        barcode
      } = req.body;

      // Validate required fields
      if (!invoice_date) {
        logger.warn('SALES_CREATE_MISSING_INVOICE_DATE', { userId: req.user?.id });
        const errorResponse = SalesErrorHandler.handleSalesBusinessError(
          new Error('Invoice date is required'),
          { field: 'invoice_date' }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
      }

      if (!items || items.length === 0) {
        logger.warn('SALES_CREATE_MISSING_ITEMS', { userId: req.user?.id });
        const errorResponse = SalesErrorHandler.handleSalesBusinessError(
          new Error('Items are required'),
          { field: 'items' }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
      }

      // For anonymous sales, customer_id should be 999
      if (!is_anonymous && (!customer_id || customer_id === null)) {
        logger.warn('SALES_CREATE_MISSING_CUSTOMER', { userId: req.user?.id });
        const errorResponse = SalesErrorHandler.handleSalesBusinessError(
          new Error('Customer ID is required for non-anonymous sales'),
          { field: 'customer_id' }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
      }

      // Validate items
      for (const item of items) {
        if (!item.product_id || !item.quantity || !item.price) {
          const errorResponse = SalesErrorHandler.handleSalesBusinessError(
            new Error('Invalid item data'),
            { item }
          );
          return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
        }
      }

      const sale = await salesService.create({
        customer_id: is_anonymous ? 999 : customer_id,
        invoice_date,
        due_date,
        payment_method,
        payment_status,
        paid_amount,
        notes,
        items,
        total_amount,
        net_amount: total_amount,
        discount_amount: 0,
        tax_amount: 0,
        status: 'completed',
        barcode,
        created_by: req.user?.id || 999
      });

      logger.performance.end('SALES_CREATE', startTime, { saleId: sale.id });
      logger.process.sales.create(sale.id, sale.customer_id, sale.total_amount, sale.items?.length, req.user?.id);
      logger.process.sales.dataAccess(req.user?.id, 'sale', 'create');

      // Invalidate customer caches since sale affects customer balance
      cacheService.invalidatePattern('customers:list:*');
      cacheService.invalidatePattern('customers:customer:*');
      cacheService.del('customers:all_customers');
      cacheService.del('customers:phone_index');
      cacheService.del('customers:email_index');
      logger.debug('Customer cache invalidated for new sale');

      const successResponse = SalesErrorHandler.createSalesSuccessResponse(sale, 'sale_created');
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    } catch (err) {
      logger.errorWithContext(err, { operation: 'create', userId: req.user?.id });
      
      // Handle specific duplicate errors
      if (err.message && (err.message.includes('duplicate') || 
                          err.message.includes('UNIQUE constraint failed') ||
                          err.message.includes('already exists'))) {
        const errorResponse = SalesErrorHandler.handleSalesBusinessError(
          new Error('تم إنشاء فاتورة مماثلة مسبقاً، يرجى التحقق من قائمة المبيعات'),
          { error: 'DUPLICATE_SALE' }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
      }
      
      const errorResponse = SalesErrorHandler.handleError(err, { 
        operation: 'create',
        userId: req.user?.id,
        method: req.method,
        url: req.url
      });
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  });

  delete = asyncHandler(async (req, res) => {
    try {
      const saleId = req.params.id;
      const startTime = logger.performance.start('SALES_DELETE', { saleId });
      
      const deleted = await salesService.delete(saleId);
      
      logger.performance.end('SALES_DELETE', startTime, { deleted: deleted });
      logger.process.sales.dataAccess(req.user?.id, 'sale', 'delete');
      
      if (deleted) {
        // Invalidate customer caches since sale deletion affects customer balance
        cacheService.invalidatePattern('customers:list:*');
        cacheService.invalidatePattern('customers:customer:*');
        cacheService.del('customers:all_customers');
        cacheService.del('customers:phone_index');
        cacheService.del('customers:email_index');
        logger.debug('Customer cache invalidated for sale deletion');
        
        const successResponse = SalesErrorHandler.createSalesSuccessResponse({}, 'sale_deleted');
        sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
      } else {
        const errorResponse = SalesErrorHandler.handleSalesBusinessError(
          new Error('Sale not found'),
          { saleId }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
      }
    } catch (err) {
      logger.errorWithContext(err, { operation: 'delete', saleId: req.params.id, userId: req.user?.id });
      const errorResponse = SalesErrorHandler.handleError(err, { 
        operation: 'delete',
        saleId: req.params.id,
        userId: req.user?.id,
        method: req.method,
        url: req.url
      });
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  });

  update = asyncHandler(async (req, res) => {
    try {
      const startTime = logger.performance.start('SALES_UPDATE', { saleId: req.params.id });
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('SALES_UPDATE_VALIDATION_ERROR', { 
          errors: errors.array(),
          userId: req.user?.id 
        });
        const errorResponse = SalesErrorHandler.handleSalesValidationError(errors.array(), req);
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
    }

      const {
        customer_id,
        invoice_date,
        due_date,
        payment_method,
        payment_status,
        paid_amount,
        notes,
        items,
        total_amount,
        discount_amount,
        tax_amount
      } = req.body;

      // Validate required fields
      if (!customer_id || !invoice_date) {
        logger.warn('SALES_UPDATE_MISSING_CUSTOMER_AND_INVOICE_DATE', { saleId: req.params.id, userId: req.user?.id });
        const errorResponse = SalesErrorHandler.handleSalesBusinessError(
          new Error('Customer ID and invoice date are required'),
          { fields: ['customer_id', 'invoice_date'] }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
      }

      // Validate items if provided
      if (items && items.length > 0) {
        for (const item of items) {
          if (!item.product_id || !item.quantity || !item.price) {
            const errorResponse = SalesErrorHandler.handleSalesBusinessError(
              new Error('Invalid item data'),
              { item }
            );
            return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
          }
        }
      }

      const updateData = {
        customer_id,
        invoice_date,
        due_date,
        payment_method,
        payment_status,
        paid_amount,
        notes,
        total_amount,
        discount_amount,
        tax_amount
      };

      // Add items if provided
      if (items && items.length > 0) {
        updateData.items = items;
      }

      const sale = await salesService.update(req.params.id, updateData);

      if (!sale) {
        const errorResponse = SalesErrorHandler.handleSalesBusinessError(
          new Error('Sale not found'),
          { saleId: req.params.id }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
      }

      // Return the updated sale with all its data
      const completeSale = await salesService.getById(req.params.id);
      
      logger.performance.end('SALES_UPDATE', startTime, { saleId: req.params.id });
      logger.process.sales.dataAccess(req.user?.id, 'sale', 'update');

      // Invalidate customer caches since sale update affects customer balance
      cacheService.invalidatePattern('customers:list:*');
      cacheService.invalidatePattern('customers:customer:*');
      cacheService.del('customers:all_customers');
      cacheService.del('customers:phone_index');
      cacheService.del('customers:email_index');
      logger.debug('Customer cache invalidated for sale update');

      const successResponse = SalesErrorHandler.createSalesSuccessResponse(completeSale, 'sale_updated');
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    } catch (err) {
      logger.errorWithContext(err, { operation: 'update', saleId: req.params.id, userId: req.user?.id });
      const errorResponse = SalesErrorHandler.handleError(err, { 
        operation: 'update',
        req 
      });
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  });

  processReturn = asyncHandler(async (req, res) => {
    try {
      const startTime = logger.performance.start('SALES_PROCESS_RETURN', { saleId: req.params.id });
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('SALES_PROCESS_RETURN_VALIDATION_ERROR', { 
          errors: errors.array(),
          userId: req.user?.id 
        });
        const errorResponse = SalesErrorHandler.handleSalesValidationError(errors.array(), req);
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
      }

    const { id } = req.params;
    const { items, reason, refund_method } = req.body;

    // Validate return data
    if (!items || !Array.isArray(items) || items.length === 0) {
        logger.warn('SALES_PROCESS_RETURN_MISSING_ITEMS', { saleId: id, userId: req.user?.id });
        const errorResponse = SalesErrorHandler.handleSalesBusinessError(
          new Error('Return items are required'),
          { field: 'items' }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }

    if (!reason) {
        logger.warn('SALES_PROCESS_RETURN_MISSING_REASON', { saleId: id, userId: req.user?.id });
        const errorResponse = SalesErrorHandler.handleSalesBusinessError(
          new Error('Return reason is required'),
          { field: 'reason' }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }

    if (!refund_method) {
        logger.warn('SALES_PROCESS_RETURN_MISSING_REFUND_METHOD', { saleId: id, userId: req.user?.id });
        const errorResponse = SalesErrorHandler.handleSalesBusinessError(
          new Error('Refund method is required'),
          { field: 'refund_method' }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }

      // Process the return
      const result = await salesService.processSaleReturn(id, items, reason);

      logger.performance.end('SALES_PROCESS_RETURN', startTime, { saleId: id });
      logger.process.sales.dataAccess(req.user?.id, 'sale', 'return');

      // Invalidate customer caches since sale return affects customer balance
      cacheService.invalidatePattern('customers:list:*');
      cacheService.invalidatePattern('customers:customer:*');
      cacheService.del('customers:all_customers');
      cacheService.del('customers:phone_index');
      cacheService.del('customers:email_index');
      logger.debug('Customer cache invalidated for sale return');

      const successResponse = SalesErrorHandler.createSalesSuccessResponse(result, 'sale_returned');
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    } catch (err) {
      logger.errorWithContext(err, { operation: 'processReturn', saleId: req.params.id, userId: req.user?.id });
      const errorResponse = SalesErrorHandler.handleError(err, { 
        operation: 'processReturn',
        req 
      });
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  });

  // Get product by barcode for POS
  getProductByBarcode = asyncHandler(async (req, res) => {
    try {
      const startTime = logger.performance.start('SALES_GET_PRODUCT_BY_BARCODE', { barcode: req.params.barcode });
      
      const { barcode } = req.params;
      
      // If barcode is null or empty, return 400
      if (!barcode) {
        logger.warn('SALES_GET_PRODUCT_BY_BARCODE_MISSING_BARCODE', { barcode, userId: req.user?.id });
        const errorResponse = SalesErrorHandler.handleSalesBusinessError(
          new Error('Barcode is required'),
          { field: 'barcode' }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
      }

      // Get settings to check allow_negative_stock
      const settingsService = require('../services/settingsService');
      const settings = await settingsService.getSettings();
      const allowNegativeStock = settings.allow_negative_stock || false;
      
      // Add debugging logs
      logger.debug('SALES_GET_PRODUCT_BY_BARCODE_SETTINGS', { 
        barcode: barcode,
        allowNegativeStock: allowNegativeStock,
        settingsId: settings.id
      });

      const product = await salesService.getProductByBarcode(barcode, allowNegativeStock);
      
      // If product is null (not found or error), return 404
      if (!product) {
        logger.warn('SALES_PRODUCT_NOT_FOUND_OR_OUT_OF_STOCK', { 
          barcode, 
          userId: req.user?.id,
          allowNegativeStock: allowNegativeStock
        });
        const errorResponse = SalesErrorHandler.handleSalesBusinessError(
          new Error('Product not found or out of stock'),
          { barcode }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
      }
      
      // Add debugging log for found product
      logger.debug('SALES_PRODUCT_FOUND_BY_BARCODE', { 
        barcode: barcode,
        productId: product.id,
        productName: product.name,
        currentStock: product.current_stock,
        allowNegativeStock: allowNegativeStock
      });

      logger.performance.end('SALES_GET_PRODUCT_BY_BARCODE', startTime, { barcode });
      logger.process.sales.dataAccess(req.user?.id, 'product', 'read');

      const successResponse = SalesErrorHandler.createSalesSuccessResponse(product, 'product_found');
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    } catch (err) {
      logger.errorWithContext(err, { operation: 'getProductByBarcode', barcode: req.params.barcode, userId: req.user?.id });
      const errorResponse = SalesErrorHandler.handleError(err, { 
        operation: 'getProductByBarcode',
        req 
      });
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  });
}

module.exports = new SalesController();