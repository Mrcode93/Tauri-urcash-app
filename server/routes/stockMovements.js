const express = require('express');
const router = express.Router();
const stockMovementsController = require('../controllers/stockMovementsController');
const { protect } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');
const { body, param } = require('express-validator');
const { inventoryCacheInvalidation } = require('../middleware/cacheMiddleware');



// Apply authentication to all routes
router.use(protect);

// Stock movements routes
router.get('/', stockMovementsController.getAllMovements);
router.post('/', [
  body('product_id').isInt().withMessage('Product ID is required'),
  body('movement_type').isIn(['purchase', 'sale', 'adjustment', 'return', 'initial', 'transfer']).withMessage('Invalid movement type'),
  body('quantity').isFloat({ gt: 0 }).withMessage('Quantity must be greater than 0'),
  body('notes').optional().isString(),
  validateRequest
], inventoryCacheInvalidation, stockMovementsController.createMovement);
router.get('/stats', stockMovementsController.getMovementStats);

// Specific movement routes
router.get('/:id', [
  param('id').isInt().withMessage('Movement ID is required'),
  validateRequest
], stockMovementsController.getMovementById);
router.post('/:id/reverse', [
  param('id').isInt().withMessage('Movement ID is required'),
  validateRequest
], inventoryCacheInvalidation, stockMovementsController.reverseMovement);

module.exports = router; 