const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const inventoryController = require('../controllers/inventoryController');
const { protect } = require('../middleware/authMiddleware');
const { sendResponse } = require('../utils/response');
const { cacheMiddleware, cacheInvalidationMiddleware, inventoryCacheInvalidation } = require('../middleware/cacheMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');
const { uploadXLSX } = require('../middleware/uploadMiddleware');

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendResponse(res, 400, null, 'Validation error', errors.array());
  }
  next();
};

router.get('/', protect, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1 }),
  validate
], cacheMiddleware(120, 'inventory:products'), inventoryController.getAllProducts);

router.get('/expiring', protect, [
  query('days').optional().isInt({ min: 1 }).withMessage('Days must be a positive integer').default(30),
  validate
], cacheMiddleware(600, 'inventory:expiring'), inventoryController.getExpiringProducts);

router.get('/most-sold', protect, [
  query('limit').optional().isInt({ min: 1 }),
  query('period').optional().isIn(['week', 'month', 'year']),
  validate
], cacheMiddleware(900, 'inventory:mostSold'), inventoryController.getMostSoldProducts);

// Get low stock products
router.get('/low-stock', protect, [
  query('threshold').optional().isInt({ min: 1 }).withMessage('Threshold must be a positive integer').default(10),
  validate
], cacheMiddleware(300, 'inventory:lowStock'), inventoryController.getLowStockProducts);

// Export products to CSV
router.get('/export', protect, [
  query('search').optional().isString(),
  query('category').optional().isInt(),
  query('supplier').optional().isInt(),
  query('lowStock').optional().isBoolean(),
  query('expiring').optional().isBoolean(),
  validate
], inventoryController.exportToCSV);

// Import products from XLSX
router.post('/import', protect, uploadXLSX.single('file'), [
  validate
], inventoryCacheInvalidation, inventoryController.importProducts);

router.get('/barcode/:barcode', protect, [
  param('barcode').isString().notEmpty().withMessage('Barcode is required'),
  validate
], cacheMiddleware(300, 'inventory:barcode'), inventoryController.getProductByBarcode);

// Get products by stock
router.get('/by-stock/:stock_id', protect, [
  param('stock_id').isInt().withMessage('Valid stock ID is required'),
  validate
], inventoryController.getProductsByStock);

// Get products optimized for POS
router.get('/pos', protect, cacheMiddleware(120, 'inventory:pos'), inventoryController.getForPOS);

// Category routes - MUST come before /:id routes
router.get('/categories', protect, cacheMiddleware(300, 'inventory:categories'), inventoryController.getAllCategories);

router.post('/categories', protect, [
  body('name').isString().notEmpty().withMessage('Category name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Category name must be between 2 and 50 characters'),
  validate
], inventoryCacheInvalidation, inventoryController.addCategory);

router.put('/categories/:id', protect, [
  param('id').isInt().withMessage('Valid category ID is required'),
  body('name').isString().notEmpty().withMessage('Category name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Category name must be between 2 and 50 characters'),
  validate
], inventoryCacheInvalidation, inventoryController.editCategory);

router.delete('/categories/:id', protect, [
  param('id').isInt().withMessage('Valid category ID is required'),
  validate
], inventoryCacheInvalidation, inventoryController.deleteCategory);

router.get('/:id', protect, [
  param('id').isInt(),
  validate
], cacheMiddleware(300, 'inventory:product'), inventoryController.getProductById);

router.post('/', protect, [
  body('name').isString().notEmpty().withMessage('Name is required'),
  body('description').optional().isString(),
  body('sku').optional().isString(),
  body('barcode').optional().custom((value) => {
    if (value === null || value === undefined) return true;
    return typeof value === 'string';
  }),
  body('supported').optional().isBoolean(),
  body('purchase_price').isFloat({ gt: 0 }).withMessage('Valid purchase price is required'),
  body('selling_price').isFloat({ gt: 0 }).withMessage('Valid selling price is required'),
  body('wholesale_price').optional().isFloat({ min: 0 }).withMessage('Wholesale price must be 0 or greater'),
  body('company_name').optional().isString(),
  body('current_stock').optional().isInt({ min: 0 }).withMessage('Stock must be 0 or greater'),
  body('min_stock').optional().isInt({ min: 0 }).withMessage('Minimum stock must be 0 or greater'),
  body('unit').optional().isString(),
  body('units_per_box').optional().isInt({ min: 1 }).withMessage('Units per box must be 1 or greater'),
  body('expiry_date').optional().isISO8601().withMessage('Valid expiry date is required'),
  body('category_id').optional({ nullable: true }).custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    const num = parseInt(value);
    if (isNaN(num) || num < 1) throw new Error('Valid category ID is required');
    return true;
  }).withMessage('Valid category ID is required'),
  validate
], inventoryCacheInvalidation, inventoryController.createProduct);

router.put('/:id', protect, [
  param('id').isInt().withMessage('Valid ID is required'),
  body('name').optional().isString().notEmpty(),
  body('description').optional().isString(),
  body('sku').optional().isString(),
  body('supported').optional().isBoolean(),
  body('purchase_price').optional().isFloat({ gt: 0 }),
  body('selling_price').optional().isFloat({ gt: 0 }),
  body('wholesale_price').optional().isFloat({ min: 0 }),
  body('company_name').optional().isString(),
  body('current_stock').optional().isInt({ min: 0 }),
  body('min_stock').optional().isInt({ min: 0 }),
  body('unit').optional().isString(),
  body('units_per_box').optional().isInt({ min: 1 }),
  body('expiry_date').optional().isISO8601(),
  body('category_id').optional().custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    const num = parseInt(value);
    if (isNaN(num) || num < 1) throw new Error('Invalid category ID');
    return true;
  }),
  body('stock_id').optional().custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    const num = parseInt(value);
    if (isNaN(num) || num < 1) throw new Error('Invalid stock ID');
    return true;
  }),
  body('supported').optional().custom((value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'boolean') return true;
    if (typeof value === 'number' && (value === 0 || value === 1)) return true;
    if (typeof value === 'string' && (value === 'true' || value === 'false' || value === '0' || value === '1')) return true;
    throw new Error('supported must be a boolean value');
  }),
  body('is_dolar').optional().custom((value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'boolean') return true;
    if (typeof value === 'number' && (value === 0 || value === 1)) return true;
    if (typeof value === 'string' && (value === 'true' || value === 'false' || value === '0' || value === '1')) return true;
    throw new Error('is_dolar must be a boolean value');
  }),
  validate
], inventoryCacheInvalidation, inventoryController.updateProduct);

router.get('/:id/references', protect, [
  param('id').isInt(),
  validate
], inventoryController.getProductReferences);

router.delete('/:id', protect, [
  param('id').isInt(),
  validate
], inventoryController.deleteProduct);

router.get('/:id/movements', protect, [
  param('id').isInt(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('movementType').optional().isIn(['purchase', 'sale', 'adjustment', 'return', 'initial', 'transfer']),
  validate
], inventoryController.getProductMovements);

router.get('/:productId/stock-quantities', protect, [
  param('productId').isInt().withMessage('Product ID is required'),
  validate
], inventoryController.getProductStockQuantities);

// Adjust stock
router.post('/adjust-stock', protect, [
  body('product_id').isInt().withMessage('Product ID is required'),
  body('adjustment_type').isIn(['add', 'subtract']).withMessage('Adjustment type must be add or subtract'),
  body('quantity').isFloat({ gt: 0 }).withMessage('Quantity must be greater than 0'),
  body('notes').optional().isString(),
  validateRequest
], inventoryCacheInvalidation, inventoryController.adjustStock);

// Adjust stock with purchase integration
router.post('/adjust-stock-with-purchase', protect, [
  body('product_id').isInt().withMessage('Product ID is required'),
  body('quantity').isFloat({ gt: 0 }).withMessage('Quantity must be greater than 0'),
  body('supplier_id').isInt().withMessage('Supplier ID is required'),
  body('purchase_price').isFloat({ gt: 0 }).withMessage('Purchase price must be greater than 0'),
  body('invoice_no').optional().isString(),
  body('notes').optional().isString(),
  validateRequest
], inventoryCacheInvalidation, inventoryController.adjustStockWithPurchase);

// Cache management
router.post('/cache/reload', protect, inventoryController.reloadCache);

// Inventory Reports
router.get('/reports/monthly', protect, [
  query('year').isInt({ min: 1900, max: 2100 }).withMessage('Valid year is required'),
  query('month').isInt({ min: 1, max: 12 }).withMessage('Valid month (1-12) is required'),
  validate
], inventoryController.generateMonthlyInventoryReport);

router.get('/reports/yearly', protect, [
  query('year').isInt({ min: 1900, max: 2100 }).withMessage('Valid year is required'),
  validate
], inventoryController.generateYearlyInventoryReport);

router.get('/reports/custom', protect, [
  query('start_date').isISO8601().withMessage('Valid start date is required'),
  query('end_date').isISO8601().withMessage('Valid end date is required'),
  query('report_type').optional().isString(),
  validate
], inventoryController.generateCustomInventoryReport);

module.exports = router;