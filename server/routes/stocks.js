const express = require('express');
const router = express.Router();
const stocksController = require('../controllers/stocksController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Apply authentication to all routes
// Temporarily disabled for development - uncomment when authentication is properly set up
// router.use(authenticateToken);

// Stock management routes
router.get('/', stocksController.getAllStocks);
router.get('/:id', stocksController.getStockById);
router.post('/', stocksController.createStock);
router.put('/:id', stocksController.updateStock);
router.delete('/:id', stocksController.deleteStock);

// Stock-specific routes
router.get('/:id/products', stocksController.getStockProducts);
router.get('/:id/movements', stocksController.getStockMovements);
router.get('/:id/stats', stocksController.getStockStats);
router.post('/:id/products', stocksController.addProductToStock);

module.exports = router; 