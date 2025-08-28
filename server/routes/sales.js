const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { protect } = require('../middleware/authMiddleware');
const { validateSale } = require('../middleware/validation');
const { param } = require('express-validator');
const authorize = require('../middleware/authorize');
const { handleSaleCashBoxTransaction, handleSaleReturnCashBoxTransaction } = require('../middleware/cashBoxMiddleware');
const { cacheMiddleware, salesCacheInvalidation } = require('../middleware/cacheMiddleware');
const cacheService = require('../services/cacheService');

// Apply authentication middleware to all routes
router.use('/', protect);

// Get all sales
router.get('/', cacheMiddleware(300, 'sales:list'), salesController.getAll);

// Get single sale
router.get('/:id', cacheMiddleware(600, 'sales:sale'), salesController.getById);

// Get customer sales
router.get('/customer/:customerId', cacheMiddleware(300, 'sales:customer'), salesController.getCustomerSales);

// Create new sale
router.post('/', validateSale, handleSaleCashBoxTransaction, salesCacheInvalidation, salesController.create);

// Update sale
router.put('/:id', authorize(['admin']), validateSale, salesCacheInvalidation, salesController.update);

// Delete sale
router.delete('/:id', authorize(['admin']), salesCacheInvalidation, salesController.delete);

// Process sale return
router.post('/:id/return', handleSaleReturnCashBoxTransaction, salesCacheInvalidation, salesController.processReturn);

// Get product by barcode for POS
router.get('/pos/product/:barcode', salesController.getProductByBarcode);

module.exports = router; 