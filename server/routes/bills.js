const express = require('express');
const router = express.Router();
const billsController = require('../controllers/billsController');
const { protect } = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');
const { validateBillData, validatePurchaseData, validateReturnData } = require('../middleware/validation');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');

// Apply authentication to all routes
router.use(protect);

// Sale Bills Routes
router.post('/sale', 
  authorize(['admin', 'manager', 'user']), 
  validateBillData, 
  billsController.createSaleBill
);

router.get('/sale', 
  authorize(['admin', 'manager', 'user']), 
  billsController.getAllSaleBills
);

router.get('/sale/:id', 
  authorize(['admin', 'manager', 'user']), 
  billsController.getSaleBillById
);

router.get('/sale/number/:billNumber', 
  authorize(['admin', 'manager', 'user']), 
  billsController.getBillByNumber
);

router.put('/sale/:id/payment', 
  authorize(['admin', 'manager']), 
  billsController.updateBillPaymentStatus
);

router.delete('/sale/:id', 
  authorize(['admin']), 
  billsController.deleteBill
);

// Purchase Bills Routes
router.post('/purchase', 
  authorize(['admin', 'manager']), 
  validatePurchaseData, 
  billsController.createPurchaseBill
);

router.get('/purchase', 
  authorize(['admin', 'manager', 'user']), 
  billsController.getAllPurchaseBills
);

router.get('/purchase/:id', 
  authorize(['admin', 'manager', 'user']), 
  billsController.getPurchaseBillById
);

router.get('/purchase/number/:invoiceNumber', 
  authorize(['admin', 'manager', 'user']), 
  billsController.getPurchaseByNumber
);

router.put('/purchase/:id/payment', 
  authorize(['admin', 'manager']), 
  billsController.updatePurchasePaymentStatus
);

router.delete('/purchase/:id', 
  authorize(['admin']), 
  billsController.deletePurchase
);

// Return Bills Routes
router.post('/return', 
  authorize(['admin', 'manager']), 
  validateReturnData, 
  billsController.createReturnBill
);

router.get('/return', 
  authorize(['admin', 'manager', 'user']), 
  billsController.getAllReturnBills
);

router.get('/return/:id', 
  authorize(['admin', 'manager', 'user']), 
  billsController.getReturnBillById
);

router.get('/return/number/:returnNumber', 
  authorize(['admin', 'manager', 'user']), 
  billsController.getReturnByNumber
);

router.delete('/return/:id', 
  authorize(['admin']), 
  billsController.deleteReturn
);

// Get returns by sale ID
router.get('/return/sale/:saleId', 
  authorize(['admin', 'manager', 'user']), 
  billsController.getReturnsBySaleId
);

// Get returns by purchase ID
router.get('/return/purchase/:purchaseId', 
  authorize(['admin', 'manager', 'user']), 
  billsController.getReturnsByPurchaseId
);

// Payment Voucher Routes
router.post('/sale/:saleId/payment-voucher', 
  authorize(['admin', 'manager']), 
  billsController.createSalePaymentVoucher
);

router.post('/purchase/:purchaseId/payment-voucher', 
  authorize(['admin', 'manager']), 
  billsController.createPurchasePaymentVoucher
);

router.post('/return/:returnType/:returnId/payment-voucher', 
  authorize(['admin', 'manager']), 
  billsController.createReturnPaymentVoucher
);

router.post('/batch-payment-vouchers', 
  authorize(['admin', 'manager']), 
  billsController.createBatchPaymentVouchers
);

// Statistics Routes
router.get('/statistics/sale', 
  authorize(['admin', 'manager']), 
  cacheMiddleware(300, 'bills:statistics:sale'), // Cache for 5 minutes
  billsController.getBillsStatistics
);

router.get('/statistics/purchase', 
  authorize(['admin', 'manager']), 
  cacheMiddleware(300, 'bills:statistics:purchase'), // Cache for 5 minutes
  billsController.getPurchasesStatistics
);

router.get('/statistics/return', 
  authorize(['admin', 'manager']), 
  cacheMiddleware(300, 'bills:statistics:return'), // Cache for 5 minutes
  billsController.getReturnsStatistics
);

// Debug route to check database tables
router.get('/debug/tables', 
  authorize(['admin']), 
  billsController.debugTables
);

module.exports = router; 