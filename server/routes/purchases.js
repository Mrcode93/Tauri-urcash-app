const express = require('express');
const router = express.Router();
const purchasesController = require('../controllers/purchasesController');
const { protect } = require('../middleware/authMiddleware');
const { validatePurchase } = require('../middleware/validationMiddleware');
const { 
  handlePurchaseCashBoxTransaction, 
  handlePurchaseReturnCashBoxTransaction,
  requireOpenCashBox 
} = require('../middleware/cashBoxMiddleware');

// Apply authentication middleware to all routes
router.use(protect);

// Get all purchases
router.get('/', purchasesController.getAll);

// Get supplier purchases (more specific route)
router.get('/supplier/:supplierId', purchasesController.getSupplierPurchases);

// Get purchase by ID with details (less specific route)
router.get('/:id', purchasesController.getById);

// Get purchase by ID with returns information
router.get('/:id/with-returns', purchasesController.getByIdWithReturns);

// Create new purchase (requires open cash box for cash payments)
router.post('/', validatePurchase, requireOpenCashBox, handlePurchaseCashBoxTransaction, purchasesController.create);

// Update purchase
router.put('/:id', validatePurchase, purchasesController.update);

// Delete purchase
router.delete('/:id', purchasesController.delete);

// Process purchase return (requires open cash box for cash refunds)
router.post('/:id/return', requireOpenCashBox, handlePurchaseReturnCashBoxTransaction, purchasesController.processReturn);

// Get purchase returns
router.get('/:id/returns', purchasesController.getReturns);

module.exports = router; 