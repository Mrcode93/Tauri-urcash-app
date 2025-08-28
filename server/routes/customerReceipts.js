const express = require('express');
const router = express.Router();
const customerReceiptsController = require('../controllers/customerReceiptsController');
const { protect } = require('../middleware/authMiddleware');
const { validateCustomerReceipt, validateReceiptId } = require('../middleware/validation');
const { validateRequest } = require('../middleware/validationMiddleware');
const { handleCustomerReceiptCashBoxTransaction } = require('../middleware/cashBoxMiddleware');

// Apply authentication to all routes
router.use(protect);

// Get all customer receipts with pagination and filters
router.get('/', customerReceiptsController.getAll);

// Get receipt statistics
router.get('/statistics', customerReceiptsController.getStatistics);

// Get customer receipt summary
router.get('/customer/:customerId/summary', customerReceiptsController.getCustomerSummary);

// Get available sales for a customer
router.get('/customer/:customerId/sales', customerReceiptsController.getCustomerSales);

// Get customer debts (unpaid sales)
router.get('/customer/:customerId/debts', customerReceiptsController.getCustomerDebts);

// Get customer bills (all sales)
router.get('/customer/:customerId/bills', customerReceiptsController.getCustomerBills);

// Get customer financial summary
router.get('/customer/:customerId/financial-summary', customerReceiptsController.getCustomerFinancialSummary);

// Get receipt by receipt number
router.get('/number/:receiptNumber', customerReceiptsController.getByReceiptNumber);

// Export receipts to CSV
router.get('/export', customerReceiptsController.exportToCSV);

// Get receipt by ID
router.get('/:id', validateReceiptId, validateRequest, customerReceiptsController.getById);

// Create new receipt
router.post('/', validateCustomerReceipt, validateRequest, handleCustomerReceiptCashBoxTransaction, customerReceiptsController.create);

// Bulk create receipts
router.post('/bulk', customerReceiptsController.bulkCreate);

// Update receipt
router.put('/:id', validateReceiptId, validateCustomerReceipt, validateRequest, customerReceiptsController.update);

// Delete receipt
router.delete('/:id', validateReceiptId, validateRequest, customerReceiptsController.delete);

module.exports = router; 