const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const { sendResponse } = require('../utils/response');
const logger = require('../utils/logger');
const inventoryService = require('../services/inventoryService');
const { InventoryErrorHandler, CategoriesErrorHandler } = require('../utils/errorHandler');
const { queryOne, query, update } = require('../database');

// Create instances
const categoriesErrorHandler = new CategoriesErrorHandler();

const getAllProducts = asyncHandler(async (req, res) => {
  try {
    const startTime = logger.performance.start('INVENTORY_GET_ALL_PRODUCTS', { filters: req.query });
    
    // Debug logging
    logger.debug('getAllProducts controller called with query:', req.query);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('INVENTORY_GET_ALL_PRODUCTS_VALIDATION_ERROR', { 
        errors: errors.array(),
        userId: req.user?.id 
      });
      const errorResponse = InventoryErrorHandler.handleValidationError(errors.array(), req);
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
    }

    const { page = 1, limit = 10, ...filters } = req.query;
    
    // Debug logging
    logger.debug('Extracted parameters:', { page, limit, filters });
    
    const result = await inventoryService.getAllProducts({ page, limit, filters });
    
    logger.performance.end('INVENTORY_GET_ALL_PRODUCTS', startTime, { count: result.products?.length });
    logger.process.inventory.dataAccess(req.user?.id, 'products', 'read');
    
    const successResponse = InventoryErrorHandler.createSuccessResponse(result, 'products_fetched');
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (err) {
    logger.errorWithContext(err, { operation: 'getAllProducts', userId: req.user?.id });
    const errorResponse = InventoryErrorHandler.handleError(err, { 
      operation: 'getAllProducts',
      userId: req.user?.id,
      method: req.method,
      url: req.url
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
});

const getProductById = asyncHandler(async (req, res) => {
  try {
    const startTime = logger.performance.start('INVENTORY_GET_PRODUCT_BY_ID', { productId: req.params.id });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('INVENTORY_GET_PRODUCT_BY_ID_VALIDATION_ERROR', { 
        errors: errors.array(),
        userId: req.user?.id 
      });
      const errorResponse = InventoryErrorHandler.handleValidationError(errors.array(), req);
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
    }

    const product = await inventoryService.getProductById(req.params.id);
    
    logger.performance.end('INVENTORY_GET_PRODUCT_BY_ID', startTime, { found: !!product });
    logger.process.inventory.dataAccess(req.user?.id, 'product', 'read');
    
    if (!product) {
      logger.warn('INVENTORY_PRODUCT_NOT_FOUND', { productId: req.params.id, userId: req.user?.id });
      const errorResponse = InventoryErrorHandler.handleBusinessError(
        new Error('Product not found'),
        { productId: req.params.id }
      );
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
    
    const successResponse = InventoryErrorHandler.createSuccessResponse(product, 'product_fetched');
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (err) {
    logger.errorWithContext(err, { operation: 'getProductById', productId: req.params.id, userId: req.user?.id });
    const errorResponse = InventoryErrorHandler.handleError(err, { 
      operation: 'getProductById',
      productId: req.params.id,
      userId: req.user?.id,
      method: req.method,
      url: req.url
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
});

const getProductByBarcode = asyncHandler(async (req, res) => {
  try {
    const startTime = logger.performance.start('INVENTORY_GET_PRODUCT_BY_BARCODE', { barcode: req.params.barcode });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('INVENTORY_GET_PRODUCT_BY_BARCODE_VALIDATION_ERROR', { 
        errors: errors.array(),
        userId: req.user?.id 
      });
      const errorResponse = InventoryErrorHandler.handleValidationError(errors.array(), req);
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
    }

    // Get settings to check allow_negative_stock
    const settingsService = require('../services/settingsService');
    const settings = await settingsService.getSettings();
    const allowNegativeStock = settings.allow_negative_stock || false;
    
    // Add debugging logs
    logger.debug('INVENTORY_GET_PRODUCT_BY_BARCODE_SETTINGS', { 
      barcode: req.params.barcode,
      allowNegativeStock: allowNegativeStock,
      settingsId: settings.id
    });

    const product = await inventoryService.getProductByBarcode(req.params.barcode, allowNegativeStock);
    
    logger.performance.end('INVENTORY_GET_PRODUCT_BY_BARCODE', startTime, { found: !!product });
    logger.process.inventory.dataAccess(req.user?.id, 'product', 'read');
    
    if (!product) {
      logger.warn('INVENTORY_PRODUCT_NOT_FOUND_BY_BARCODE', { 
        barcode: req.params.barcode, 
        userId: req.user?.id,
        allowNegativeStock: allowNegativeStock
      });
      const errorResponse = InventoryErrorHandler.handleBusinessError(
        new Error('Product not found'),
        { barcode: req.params.barcode }
      );
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
    
    // Add debugging log for found product
    logger.debug('INVENTORY_PRODUCT_FOUND_BY_BARCODE', { 
      barcode: req.params.barcode,
      productId: product.id,
      productName: product.name,
      currentStock: product.current_stock,
      allowNegativeStock: allowNegativeStock
    });
    
    const successResponse = InventoryErrorHandler.createSuccessResponse(product, 'product_fetched');
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (err) {
    logger.errorWithContext(err, { operation: 'getProductByBarcode', barcode: req.params.barcode, userId: req.user?.id });
    const errorResponse = InventoryErrorHandler.handleError(err, { 
      operation: 'getProductByBarcode',
      barcode: req.params.barcode,
      userId: req.user?.id,
      method: req.method,
      url: req.url
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
});

const createProduct = asyncHandler(async (req, res) => {
  try {
    const startTime = logger.performance.start('INVENTORY_CREATE_PRODUCT', { 
      name: req.body.name,
      stock: req.body.current_stock
    });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('INVENTORY_CREATE_PRODUCT_VALIDATION_ERROR', { 
        errors: errors.array(),
        userId: req.user?.id 
      });
      const errorResponse = InventoryErrorHandler.handleValidationError(errors.array(), req);
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
    }
    
    const product = await inventoryService.createProduct(req.body);
    
    logger.performance.end('INVENTORY_CREATE_PRODUCT', startTime, { productId: product.id });
    logger.process.inventory.productCreate(
      product.id, 
      product.name, 
      product.current_stock, 
      req.user?.id
    );
    
    const successResponse = InventoryErrorHandler.createSuccessResponse(product, 'product_created');
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (err) {
    logger.errorWithContext(err, { operation: 'createProduct', userId: req.user?.id });
    const errorResponse = InventoryErrorHandler.handleError(err, { 
      operation: 'createProduct',
      userId: req.user?.id,
      method: req.method,
      url: req.url
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
});

const updateProduct = asyncHandler(async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorResponse = InventoryErrorHandler.handleValidationError(errors.array(), req);
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
    }

    const { id } = req.params;
    const product = await inventoryService.updateProduct(id, req.body);

    if (!product) {
      const errorResponse = InventoryErrorHandler.handleBusinessError(
        new Error('Product not found'),
        { productId: id }
      );
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
    
    const successResponse = InventoryErrorHandler.createSuccessResponse(product, 'product_updated');
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (err) {
    const errorResponse = InventoryErrorHandler.handleError(err, { 
      operation: 'updateProduct',
      productId: req.params.id,
      userId: req.user?.id,
      method: req.method,
      url: req.url
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
});

const deleteProduct = asyncHandler(async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorResponse = InventoryErrorHandler.handleValidationError(errors.array(), req);
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
    }

    const { id } = req.params;
    const { force = false } = req.query;

    // Get product references before deletion
    const references = await inventoryService.getProductReferences(id);
    
    if (force === 'true' || force === true) {
      // Force delete - delete all references first
      try {
        await inventoryService.deleteProductWithReferences(id);
        const successResponse = InventoryErrorHandler.createSuccessResponse(
          {}, 
          'product_deleted_force',
          { productName: references.product?.name }
        );
        sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
      } catch (err) {
        const errorResponse = InventoryErrorHandler.handleError(err, { 
          operation: 'deleteProduct',
          productId: req.params.id,
          userId: req.user?.id,
          method: req.method,
          url: req.url,
          references 
        });
        sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
      }
    } else {
      // Check if product can be safely deleted
      if (references.totalReferences > 0) {
        const errorResponse = InventoryErrorHandler.handleBusinessError(
          new Error('Cannot delete product'),
          { references }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.references);
      }

      // Safe delete
      const result = await inventoryService.deleteProduct(id);
      if (result === 0) {
        const errorResponse = InventoryErrorHandler.handleBusinessError(
          new Error('Product not found'),
          { productId: id }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
      }
      
      const successResponse = InventoryErrorHandler.createSuccessResponse(
        {}, 
        'product_deleted',
        { productName: references.product?.name }
      );
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    }
  } catch (err) {
    const errorResponse = InventoryErrorHandler.handleError(err, { 
      operation: 'deleteProduct',
      productId: req.params.id,
      userId: req.user?.id,
      method: req.method,
      url: req.url
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
});

const getProductReferences = asyncHandler(async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorResponse = InventoryErrorHandler.handleValidationError(errors.array(), req);
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
    }

    const { id } = req.params;
    const references = await inventoryService.getProductReferences(id);
    
    const successResponse = InventoryErrorHandler.createSuccessResponse(references, 'product_fetched');
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (err) {
    const errorResponse = InventoryErrorHandler.handleError(err, { 
      operation: 'getProductReferences',
      productId: req.params.id,
      userId: req.user?.id,
      method: req.method,
      url: req.url
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
});

const getProductMovements = asyncHandler(async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorResponse = InventoryErrorHandler.handleValidationError(errors.array(), req);
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
    }

    const { id } = req.params;
    const { startDate, endDate, movementType } = req.query;

    const movements = await inventoryService.getProductMovements(id, {
      startDate,
      endDate,
      movementType
});

    const successResponse = InventoryErrorHandler.createSuccessResponse(movements, 'product_fetched');
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (err) {
    const errorResponse = InventoryErrorHandler.handleError(err, { 
      operation: 'getProductMovements',
      productId: req.params.id,
      userId: req.user?.id,
      method: req.method,
      url: req.url
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
});

const adjustStock = asyncHandler(async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorResponse = InventoryErrorHandler.handleValidationError(errors.array(), req);
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
    }

    const { product_id, adjustment_type, quantity, notes } = req.body;
    const userId = req.user?.id;

    // Get current product
    const product = await inventoryService.getProductById(product_id);
    if (!product) {
      const errorResponse = InventoryErrorHandler.handleBusinessError(
        new Error('Product not found'),
        { productId: product_id }
      );
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }

    // Calculate new stock
    const currentStock = product.current_stock || 0;
    const quantityChange = adjustment_type === 'add' ? quantity : -quantity;
    const newStock = currentStock + quantityChange;

    // Validate stock adjustment
    if (newStock < 0) {
      const errorResponse = InventoryErrorHandler.handleBusinessError(
        new Error('Insufficient stock'),
        { 
          available: currentStock, 
          required: quantity,
          productName: product.name 
        }
      );
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }

    // Update product stock
    const { update: dbUpdate } = require('../database');
    const updateResult = dbUpdate(
      'UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStock, product_id]
    );

    if (updateResult === 0) {
      const errorResponse = InventoryErrorHandler.handleError(
        new Error('Failed to update product stock'),
        { operation: 'adjustStock' }
      );
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }

    // Log stock movement
    const { insert: dbInsert } = require('../database');
    dbInsert(
      `INSERT INTO inventory_movements (
        product_id, movement_type, quantity, previous_stock, new_stock,
        reference_type, reference_id, unit_cost, total_value, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product_id,
        'adjustment',
        quantityChange,
        currentStock,
        newStock,
        'adjustment',
        null,
        product.purchase_price || 0,
        (product.purchase_price || 0) * quantityChange,
        notes || `Manual stock adjustment - ${adjustment_type} ${quantity}`,
        userId
      ]
    );

    // Get updated product
    const updatedProduct = await inventoryService.getProductById(product_id);
    
    const successResponse = InventoryErrorHandler.createSuccessResponse(
      updatedProduct, 
      'stock_adjusted',
      { productName: product.name, quantity: quantityChange }
    );
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (err) {
    const errorResponse = InventoryErrorHandler.handleError(err, { 
      operation: 'adjustStock',
      productId: req.body.product_id,
      userId: req.user?.id,
      method: req.method,
      url: req.url
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
});

const adjustStockWithPurchase = asyncHandler(async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorResponse = InventoryErrorHandler.handleValidationError(errors.array(), req);
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
    }

    const { product_id, quantity, supplier_id, purchase_price, invoice_no, notes } = req.body;
    const userId = req.user?.id;

    // Get current product
    const product = await inventoryService.getProductById(product_id);
    if (!product) {
      const errorResponse = InventoryErrorHandler.handleBusinessError(
        new Error('Product not found'),
        { productId: product_id }
      );
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }

    // Calculate new stock
      const currentStock = product.current_stock || 0;
      const newStock = currentStock + quantity;
      
    // Update product stock
      const { update: dbUpdate } = require('../database');
      const updateResult = dbUpdate(
        'UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newStock, product_id]
      );

      if (updateResult === 0) {
      const errorResponse = InventoryErrorHandler.handleError(
        new Error('Failed to update product stock'),
        { operation: 'adjustStockWithPurchase' }
      );
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
      }

      // Log stock movement
    const { insert: dbInsert } = require('../database');
      dbInsert(
        `INSERT INTO inventory_movements (
          product_id, movement_type, quantity, previous_stock, new_stock,
          reference_type, reference_id, unit_cost, total_value, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product_id,
          'purchase',
          quantity,
          currentStock,
          newStock,
          'purchase',
        null,
          purchase_price,
        purchase_price * quantity,
        notes || `Purchase adjustment - Invoice: ${invoice_no}`,
          userId
        ]
      );

    // Get updated product
    const updatedProduct = await inventoryService.getProductById(product_id);
    
    const successResponse = InventoryErrorHandler.createSuccessResponse(
      updatedProduct, 
      'stock_adjusted',
      { productName: product.name, quantity }
    );
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (err) {
    const errorResponse = InventoryErrorHandler.handleError(err, { 
      operation: 'adjustStockWithPurchase',
      productId: req.body.product_id,
      userId: req.user?.id,
      method: req.method,
      url: req.url
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
});

const getExpiringProducts = asyncHandler(async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorResponse = InventoryErrorHandler.handleValidationError(errors.array(), req);
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
    }

    const { days = 30 } = req.query;
    const products = await inventoryService.getExpiringProducts(days);
    
    const successResponse = InventoryErrorHandler.createSuccessResponse(products, 'products_fetched');
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (err) {
    const errorResponse = InventoryErrorHandler.handleError(err, { 
      operation: 'getExpiringProducts',
      userId: req.user?.id,
      method: req.method,
      url: req.url
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
});

const getMostSoldProducts = asyncHandler(async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorResponse = InventoryErrorHandler.handleValidationError(errors.array(), req);
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
    }

    const { limit, period } = req.query;
    const products = await inventoryService.getMostSoldProducts({ limit, period });
    
    const successResponse = InventoryErrorHandler.createSuccessResponse(products, 'products_fetched');
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (err) {
    const errorResponse = InventoryErrorHandler.handleError(err, { 
      operation: 'getMostSoldProducts',
      req 
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
});

const exportToCSV = asyncHandler(async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorResponse = InventoryErrorHandler.handleValidationError(errors.array(), req);
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
    }

    const { search, category, supplier, lowStock, expiring } = req.query;
    const csvData = await inventoryService.exportToCSV({
      search,
      category,
      supplier,
      lowStock,
      expiring
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory_export.csv');
    res.send(csvData);
  } catch (err) {
    const errorResponse = InventoryErrorHandler.handleError(err, { 
      operation: 'exportToCSV',
      req 
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
});

const getForPOS = asyncHandler(async (req, res) => {
  try {
    const products = await inventoryService.getForPOS(req.query);
    
    const successResponse = InventoryErrorHandler.createSuccessResponse(products, 'products_fetched');
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (err) {
    const errorResponse = InventoryErrorHandler.handleError(err, { 
      operation: 'getForPOS',
      req 
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
});

const generateMonthlyInventoryReport = asyncHandler(async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorResponse = InventoryErrorHandler.handleValidationError(errors.array(), req);
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
    }
    
    const { year, month } = req.query;
    const report = await inventoryService.generateMonthlyInventoryReport(year, month);
    
    const successResponse = InventoryErrorHandler.createSuccessResponse(report, 'products_fetched');
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (err) {
    const errorResponse = InventoryErrorHandler.handleError(err, { 
      operation: 'generateMonthlyInventoryReport',
      req 
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
});

const generateYearlyInventoryReport = asyncHandler(async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorResponse = InventoryErrorHandler.handleValidationError(errors.array(), req);
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
    }
    
    const { year } = req.query;
    const report = await inventoryService.generateYearlyInventoryReport(year);
    
    const successResponse = InventoryErrorHandler.createSuccessResponse(report, 'products_fetched');
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (err) {
    const errorResponse = InventoryErrorHandler.handleError(err, { 
      operation: 'generateYearlyInventoryReport',
      req 
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
});

const generateCustomInventoryReport = asyncHandler(async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorResponse = InventoryErrorHandler.handleValidationError(errors.array(), req);
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
    }
    
    const { start_date, end_date, report_type } = req.query;
    const report = await inventoryService.generateInventoryReport(start_date, end_date, report_type);
    
    const successResponse = InventoryErrorHandler.createSuccessResponse(report, 'products_fetched');
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (err) {
    const errorResponse = InventoryErrorHandler.handleError(err, { 
      operation: 'generateCustomInventoryReport',
      req 
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
});

// made function for add , edit , delete , get all categories
const addCategory = asyncHandler(async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorResponse = categoriesErrorHandler.handleCategoryValidationError(errors.array(), req);
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
    }

    const { name } = req.body;
    
    // Validate category name
    if (!name || name.trim().length < 2) {
      const errorResponse = categoriesErrorHandler.handleCategoryBusinessError(
        new Error('Category name too short'),
        { categoryName: name }
      );
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }

    if (name.trim().length > 50) {
      const errorResponse = categoriesErrorHandler.handleCategoryBusinessError(
        new Error('Category name too long'),
        { categoryName: name }
      );
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }

    const category = await inventoryService.addCategory(name.trim());
    const successResponse = categoriesErrorHandler.createCategorySuccessResponse(category, 'category_created');
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (err) {
    const errorResponse = categoriesErrorHandler.handleCategoryError(err, { 
      operation: 'addCategory',
      req,
      categoryName: req.body?.name
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
});

const editCategory = asyncHandler(async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorResponse = categoriesErrorHandler.handleCategoryValidationError(errors.array(), req);
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
    }

    const { id } = req.params;
    const { name } = req.body;
    
    // Validate category name
    if (!name || name.trim().length < 2) {
      const errorResponse = categoriesErrorHandler.handleCategoryBusinessError(
        new Error('Category name too short'),
        { categoryName: name }
      );
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }

    if (name.trim().length > 50) {
      const errorResponse = categoriesErrorHandler.handleCategoryBusinessError(
        new Error('Category name too long'),
        { categoryName: name }
      );
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }

    const category = await inventoryService.editCategory(id, name.trim());
    
    if (!category || category.changes === 0) {
      const errorResponse = categoriesErrorHandler.handleCategoryBusinessError(
        new Error('Category not found'),
        { categoryId: id }
      );
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
    
    const successResponse = categoriesErrorHandler.createCategorySuccessResponse(
      { id, name: name.trim() }, 
      'category_updated'
    );
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (err) {
    const errorResponse = categoriesErrorHandler.handleCategoryError(err, { 
      operation: 'editCategory',
      req,
      categoryId: req.params.id,
      categoryName: req.body?.name
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
});

const deleteCategory = asyncHandler(async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorResponse = categoriesErrorHandler.handleCategoryValidationError(errors.array(), req);
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
    }

    const { id } = req.params;
    
    // Check if category has products before deletion
    const dbInstance = require('../database').reconnect();
    const productCount = dbInstance.prepare(`
      SELECT COUNT(*) as count FROM products WHERE category_id = ?
    `).get(id);
    
    if (productCount && productCount.count > 0) {
      const errorResponse = categoriesErrorHandler.handleCategoryBusinessError(
        new Error('Category in use'),
        { 
          categoryId: id,
          productCount: productCount.count 
        }
      );
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }

    const category = await inventoryService.deleteCategory(id);
    
    if (!category || category.changes === 0) {
      const errorResponse = categoriesErrorHandler.handleCategoryBusinessError(
        new Error('Category not found'),
        { categoryId: id }
      );
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
    
    const successResponse = categoriesErrorHandler.createCategorySuccessResponse(
      { id }, 
      'category_deleted'
    );
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (err) {
    const errorResponse = categoriesErrorHandler.handleCategoryError(err, { 
      operation: 'deleteCategory',
      req,
      categoryId: req.params.id
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
});

const getAllCategories = asyncHandler(async (req, res) => {
  try {
    const categories = await inventoryService.getAllCategories();
    const successResponse = categoriesErrorHandler.createCategorySuccessResponse(categories, 'categories_fetched');
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (err) {
    const errorResponse = categoriesErrorHandler.handleCategoryError(err, { 
      operation: 'getAllCategories',
      req 
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
});

const reloadCache = asyncHandler(async (req, res) => {
  try {
    const startTime = logger.performance.start('INVENTORY_RELOAD_CACHE');
    
    // Reload all products to cache
    const products = await inventoryService.loadAllProductsToCache();
    
    logger.performance.end('INVENTORY_RELOAD_CACHE', startTime, { 
      productsCount: products.length 
    });
    
    const successResponse = InventoryErrorHandler.createSuccessResponse(
      { 
        message: 'Cache reloaded successfully',
        productsCount: products.length,
        timestamp: new Date().toISOString()
      }, 
      'cache_reloaded'
    );
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (err) {
    logger.errorWithContext(err, { operation: 'reloadCache', userId: req.user?.id });
    const errorResponse = InventoryErrorHandler.handleError(err, { 
      operation: 'reloadCache',
      req 
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
});

const importProducts = asyncHandler(async (req, res) => {
  try {
    const startTime = logger.performance.start('INVENTORY_IMPORT_PRODUCTS', { 
      userId: req.user?.id,
      fileSize: req.file?.size 
    });
    
    if (!req.file) {
      logger.warn('INVENTORY_IMPORT_NO_FILE', { userId: req.user?.id });
      const errorResponse = InventoryErrorHandler.handleBusinessError(
        new Error('No file uploaded'),
        { operation: 'importProducts' }
      );
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }

    const result = await inventoryService.importProductsFromXLSX(req.file);
    
    logger.performance.end('INVENTORY_IMPORT_PRODUCTS', startTime, { 
      imported: result.imported,
      failed: result.failed,
      total: result.total
    });
    logger.process.inventory.dataAccess(req.user?.id, 'products', 'import');
    
    // Create detailed success message
    let message = `تم استيراد ${result.imported} منتج بنجاح`;
    if (result.imported > 0) {
      message += ` وتم إضافتها للمخزن الرئيسي`;
    }
    if (result.failed > 0) {
      message += `، فشل في استيراد ${result.failed} منتج`;
    }
    if (result.errors.length > 0) {
      message += ` (${result.errors.length} خطأ)`;
    }
    
    // Limit errors to prevent large responses
    const limitedErrors = result.errors.slice(0, 5); // Only send first 5 errors
    
    const successResponse = InventoryErrorHandler.createSuccessResponse(
      {
        message,
        imported: result.imported,
        failed: result.failed,
        total: result.total,
        errors: limitedErrors,
        errorCount: result.errors.length // Send total error count separately
      }, 
      'products_imported'
    );
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (err) {
    logger.errorWithContext(err, { operation: 'importProducts', userId: req.user?.id });
    const errorResponse = InventoryErrorHandler.handleError(err, { 
      operation: 'importProducts',
      req 
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
});

const getLowStockProducts = asyncHandler(async (req, res) => {
  try {
    const startTime = logger.performance.start('INVENTORY_GET_LOW_STOCK_PRODUCTS', { 
      threshold: req.query.threshold,
      userId: req.user?.id 
    });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('INVENTORY_GET_LOW_STOCK_PRODUCTS_VALIDATION_ERROR', { 
        errors: errors.array(),
        userId: req.user?.id 
      });
      const errorResponse = InventoryErrorHandler.handleValidationError(errors.array(), req);
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
    }

    const threshold = parseInt(req.query.threshold) || 10;
    const products = await inventoryService.getLowStockProducts(threshold);
    
    logger.performance.end('INVENTORY_GET_LOW_STOCK_PRODUCTS', startTime, { 
      count: products?.length,
      threshold 
    });
    logger.process.inventory.dataAccess(req.user?.id, 'products', 'read');
    
    const successResponse = InventoryErrorHandler.createSuccessResponse(products, 'low_stock_products_fetched');
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (err) {
    logger.errorWithContext(err, { operation: 'getLowStockProducts', userId: req.user?.id });
    const errorResponse = InventoryErrorHandler.handleError(err, { 
      operation: 'getLowStockProducts',
      userId: req.user?.id,
      method: req.method,
      url: req.url
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
});

// Get products by stock with proper filtering
const getProductsByStock = asyncHandler(async (req, res) => {
  try {
    const { stock_id } = req.params;
    const { page = 1, limit = 50, search, category_id } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];

    // Base condition: products that have stock movements to/from this stock
    whereConditions.push(`
      EXISTS (
        SELECT 1 FROM stock_movements sm 
        WHERE sm.product_id = p.id 
          AND (sm.to_stock_id = ? OR sm.from_stock_id = ?)
      )
    `);
    params.push(stock_id, stock_id);

    // Add search condition
    if (search) {
      whereConditions.push('(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Add category filter
    if (category_id) {
      whereConditions.push('p.category_id = ?');
      params.push(category_id);
    }

    // Add stock quantity condition
    whereConditions.push(`
      COALESCE(
        (SELECT SUM(CASE WHEN to_stock_id = ? THEN quantity ELSE 0 END) - 
                SUM(CASE WHEN from_stock_id = ? THEN quantity ELSE 0 END)
         FROM stock_movements 
         WHERE product_id = p.id AND (to_stock_id = ? OR from_stock_id = ?)), 0
      ) > 0
    `);
    params.push(stock_id, stock_id, stock_id, stock_id);

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Create parameters for main query (includes LIMIT and OFFSET)
    const mainQueryParams = [...params, stock_id, stock_id, stock_id, stock_id, limit, offset];

    const sqlQuery = `
      SELECT 
        p.*,
        c.name as category_name,
        s.name as stock_name,
        COALESCE(
          (SELECT SUM(CASE WHEN to_stock_id = ? THEN quantity ELSE 0 END) - 
                  SUM(CASE WHEN from_stock_id = ? THEN quantity ELSE 0 END)
           FROM stock_movements 
           WHERE product_id = p.id AND (to_stock_id = ? OR from_stock_id = ?)), 0
        ) as current_stock_in_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN stocks s ON p.stock_id = s.id
      ${whereClause}
      ORDER BY p.name ASC
      LIMIT ? OFFSET ?
    `;

    const products = query(sqlQuery, mainQueryParams);

    // Get total count - use the same whereClause but without LIMIT and OFFSET
    const countSqlQuery = `
      SELECT COUNT(*) as total
      FROM (
        SELECT 
          p.id
        FROM products p
        ${whereClause}
      ) as filtered_products
    `;

    const total = queryOne(countSqlQuery, params);

    res.json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.total,
        pages: Math.ceil(total.total / limit)
      },
      message: 'Products retrieved successfully'
    });
  } catch (error) {
    logger.error('Error getting products by stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve products',
      error: error.message
    });
  }
});

const getProductStockQuantities = asyncHandler(async (req, res) => {
  try {
    const startTime = logger.performance.start('INVENTORY_GET_PRODUCT_STOCK_QUANTITIES', { 
      productId: req.params.productId,
      userId: req.user?.id 
    });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('INVENTORY_GET_PRODUCT_STOCK_QUANTITIES_VALIDATION_ERROR', { 
        errors: errors.array(),
        userId: req.user?.id 
      });
      const errorResponse = InventoryErrorHandler.handleValidationError(errors.array(), req);
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
    }

    const productId = parseInt(req.params.productId);
    if (!productId) {
      const errorResponse = InventoryErrorHandler.handleBusinessError(
        new Error('Product ID is required'),
        { productId: req.params.productId }
      );
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }

    // Get all stocks
    const stocks = query('SELECT id, name FROM stocks WHERE is_active = 1');
    
    // Get product stock quantities - handle both single stock and multiple stocks
    const stockQuantities = stocks.map(stock => {
      // Check if product exists in this specific stock
      const productInStock = queryOne(
        'SELECT current_stock FROM products WHERE id = ? AND stock_id = ?',
        [productId, stock.id]
      );
      
      // Also check if there are any stock movements that might affect this stock
      const stockMovements = queryOne(
        `SELECT 
          COALESCE(SUM(CASE WHEN to_stock_id = ? THEN quantity ELSE 0 END), 0) as incoming,
          COALESCE(SUM(CASE WHEN from_stock_id = ? THEN quantity ELSE 0 END), 0) as outgoing
         FROM stock_movements 
         WHERE product_id = ?`,
        [stock.id, stock.id, productId]
      );
      
      const currentQuantity = productInStock ? productInStock.current_stock : 0;
      const netQuantity = currentQuantity + (stockMovements.incoming - stockMovements.outgoing);
      
      return {
        stock_id: stock.id,
        stock_name: stock.name,
        current_quantity: currentQuantity,
        available_quantity: Math.max(0, netQuantity) // Ensure non-negative
      };
    });
    
    // Check if product has stock but no stock_id (no stock)
    const productNoStock = queryOne(
      'SELECT current_stock FROM products WHERE id = ? AND stock_id IS NULL',
      [productId]
    );
    
    if (productNoStock && productNoStock.current_stock > 0) {
      stockQuantities.push({
        stock_id: null,
        stock_name: 'بدون مخزن',
        current_quantity: productNoStock.current_stock,
        available_quantity: productNoStock.current_stock
      });
    }
    
    logger.performance.end('INVENTORY_GET_PRODUCT_STOCK_QUANTITIES', startTime, { 
      productId,
      stockCount: stockQuantities.length
    });
    logger.process.inventory.dataAccess(req.user?.id, 'product_stock_quantities', 'read');
    
    const successResponse = InventoryErrorHandler.createSuccessResponse(stockQuantities, 'product_stock_quantities_fetched');
    sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
  } catch (err) {
    logger.errorWithContext(err, { operation: 'getProductStockQuantities', productId: req.params.productId, userId: req.user?.id });
    const errorResponse = InventoryErrorHandler.handleError(err, { 
      operation: 'getProductStockQuantities',
      productId: req.params.productId,
      userId: req.user?.id,
      method: req.method,
      url: req.url
    });
    sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
  }
});

module.exports = {
  getAllProducts,
  getProductById,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductReferences,
  getProductsByStock,
  getProductMovements,
  adjustStock,
  adjustStockWithPurchase,
  getExpiringProducts,
  getMostSoldProducts,
  getLowStockProducts,
  getProductStockQuantities,
  exportToCSV,
  importProducts,
  getForPOS,
  generateMonthlyInventoryReport,
  generateYearlyInventoryReport,
  generateCustomInventoryReport,
  addCategory,
  editCategory,
  deleteCategory,
  getAllCategories,
  reloadCache
};