const express = require('express');
const router = express.Router();
const customersController = require('../controllers/customersController');
const { protect } = require('../middleware/authMiddleware');
const { validateCustomer } = require('../middleware/validationMiddleware');
const { premiumFeatures } = require('../middleware/premiumMiddleware');
const { cacheMiddleware, customersCacheInvalidation } = require('../middleware/cacheMiddleware');

// Apply authentication middleware to all routes
router.use(protect);

// Apply premium features middleware for customers
router.use(premiumFeatures.customers);

// Get all customers
router.get('/', cacheMiddleware(300, 'customers:list'), customersController.getAll);

// Search customers
router.get('/search', cacheMiddleware(300, 'customers:search'), customersController.search);

// Get customer by ID
router.get('/:id', cacheMiddleware(600, 'customers:customer'), customersController.getById);

// Get customer details (optimized endpoint)
router.get('/:id/details', cacheMiddleware(300, 'customers:details'), customersController.getCustomerDetails);

// Get customer with sales history
router.get('/:id/sales', cacheMiddleware(300, 'customers:sales'), customersController.getCustomerWithSales);

// Cache management
router.post('/cache/reload', customersController.reloadCache);

// Create new customer
router.post('/', validateCustomer, customersCacheInvalidation, customersController.create);

// Update customer
router.put('/:id', validateCustomer, customersCacheInvalidation, customersController.update);

// Delete customer
router.delete('/:id', customersCacheInvalidation, customersController.delete);

module.exports = router; 