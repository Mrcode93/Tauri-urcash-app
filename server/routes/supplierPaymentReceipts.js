const express = require('express');
const router = express.Router();
const supplierPaymentReceiptsController = require('../controllers/supplierPaymentReceiptsController');
const { protect } = require('../middleware/authMiddleware');
const { validateSupplierPaymentReceipt, validateReceiptId } = require('../middleware/validation');
const { validateRequest } = require('../middleware/validationMiddleware');
const { handleSupplierPaymentCashBoxTransaction } = require('../middleware/cashBoxMiddleware');

// Apply authentication to all routes
router.use(protect);

// Get all supplier payment receipts with pagination and filters
router.get('/', supplierPaymentReceiptsController.getAll);

// Get receipt statistics
router.get('/statistics', supplierPaymentReceiptsController.getStatistics);

// Get supplier receipt summary
router.get('/supplier/:supplierId/summary', supplierPaymentReceiptsController.getSupplierSummary);

// Get available purchases for a supplier
router.get('/supplier/:supplierId/purchases', supplierPaymentReceiptsController.getSupplierPurchases);

// Get receipt by receipt number
router.get('/number/:receiptNumber', supplierPaymentReceiptsController.getByReceiptNumber);

// Export receipts to CSV
router.get('/export', supplierPaymentReceiptsController.exportToCSV);

// Get receipt by ID
router.get('/:id', validateReceiptId, validateRequest, supplierPaymentReceiptsController.getById);

// Create new receipt
router.post('/', validateSupplierPaymentReceipt, validateRequest, handleSupplierPaymentCashBoxTransaction, supplierPaymentReceiptsController.create);

// Bulk create receipts
router.post('/bulk', supplierPaymentReceiptsController.bulkCreate);

// Update receipt
router.put('/:id', validateReceiptId, validateSupplierPaymentReceipt, validateRequest, supplierPaymentReceiptsController.update);

// Delete receipt
router.delete('/:id', validateReceiptId, validateRequest, supplierPaymentReceiptsController.delete);

module.exports = router; 