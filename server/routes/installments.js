const express = require('express');
const router = express.Router();
const installmentsController = require('../controllers/installmentsController');
const { protect } = require('../middleware/authMiddleware');
const { premiumFeatures } = require('../middleware/premiumMiddleware');
const { handleInstallmentReceiptCashBoxTransaction } = require('../middleware/cashBoxMiddleware');

// Apply authentication middleware to all routes
router.use(protect);

// Apply premium middleware for installments feature to all routes
router.use(premiumFeatures.installments);

// Get all installments
router.get('/', installmentsController.getAll);

// Get installments grouped by sale
router.get('/grouped', installmentsController.getGroupedBySale);

// Get installments summary
router.get('/summary', installmentsController.getSummary);

// Get overdue installments
router.get('/overdue', installmentsController.getOverdue);

// Get upcoming installments
router.get('/upcoming', installmentsController.getUpcoming);

// Get installments by sale ID
router.get('/sale/:saleId', installmentsController.getBySaleId);

// Get installments by customer ID
router.get('/customer/:customerId', installmentsController.getByCustomerId);

// Get installment by ID
router.get('/:id', installmentsController.getById);

// Create new installment
router.post('/', installmentsController.create);

// Update installment
router.put('/:id', installmentsController.update);

// Delete installment
router.delete('/:id', installmentsController.delete);

// Record payment for an installment
router.post('/:id/payment', handleInstallmentReceiptCashBoxTransaction, installmentsController.recordPayment);

// Create installment plan
router.post('/plan', installmentsController.createInstallmentPlan);

module.exports = router;