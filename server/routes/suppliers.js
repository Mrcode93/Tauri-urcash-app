const express = require('express');
const router = express.Router();
const suppliersController = require('../controllers/suppliersController');
const { protect } = require('../middleware/authMiddleware');
const { validateSupplier } = require('../middleware/validationMiddleware');

// Apply authentication middleware to all routes
router.use(protect);

// Get all suppliers
router.get('/', suppliersController.getAll);

// Search suppliers
router.get('/search', suppliersController.search);

// Get supplier by ID
router.get('/:id', suppliersController.getById);

// Get supplier with products
router.get('/:id/products', suppliersController.getSupplierWithProducts);

// Create new supplier
router.post('/', validateSupplier, suppliersController.create);

// Update supplier
router.put('/:id', validateSupplier, suppliersController.update);

// Delete supplier
router.delete('/:id', suppliersController.delete);

module.exports = router; 