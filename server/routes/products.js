const express = require('express');
const router = express.Router();
const productsController = require('../controllers/productsController');
const { protect } = require('../middleware/authMiddleware');
const { validateProduct } = require('../middleware/validationMiddleware');
const { query, validationResult } = require('express-validator');
const { body, param } = require('express-validator');

// Apply authentication middleware to all routes
// Temporarily disabled for development - uncomment when authentication is properly set up
// router.use(protect);

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array(),
    });
  }
  next();
};

// Get all products
router.get('/', productsController.getAll);

// Get products optimized for POS
router.get('/pos', productsController.getForPOS);

// Search products
router.get('/search', productsController.search);

// Get low stock products
router.get('/low-stock', productsController.getLowStock);

// Get product by barcode
router.get('/barcode/:barcode', productsController.getByBarcode);

module.exports = router;