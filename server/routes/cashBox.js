const express = require('express');
const { body } = require('express-validator');
const cashBoxController = require('../controllers/cashBoxController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// User cash box routes
router.get('/my-cash-box', cashBoxController.getUserCashBox);
router.get('/my-settings', cashBoxController.getUserCashBoxSettings);
router.get('/my-summary', cashBoxController.getCashBoxSummary);
router.get('/my-history', cashBoxController.getUserCashBoxHistory);

// Cash box operations
router.post('/open', [
  body('openingAmount').optional().isFloat({ min: 0 }),
  body('notes').optional().isString().trim()
], cashBoxController.openCashBox);

router.post('/close', [
  body('closingAmount').isFloat({ min: 0 }),
  body('notes').optional().isString().trim()
], cashBoxController.closeCashBox);

router.post('/transaction', [
  body('cashBoxId').isInt({ min: 1 }),
  body('transactionType').isIn(['opening', 'closing', 'deposit', 'withdrawal', 'sale', 'purchase', 'expense', 'customer_receipt', 'supplier_payment', 'adjustment', 'sale_return', 'purchase_return']),
  body('amount').isFloat({ min: 0 }),
  body('referenceType').isIn(['sale', 'purchase', 'expense', 'customer_receipt', 'supplier_payment', 'manual', 'opening', 'closing', 'sale_return', 'purchase_return', 'debt', 'installment']),
  body('referenceId').optional().isInt({ min: 1 }),
  body('description').optional().isString().trim(),
  body('notes').optional().isString().trim()
], cashBoxController.addTransaction);

router.post('/manual-transaction', [
  body('cashBoxId').isInt({ min: 1 }),
  body('transactionType').isIn(['deposit', 'withdrawal', 'adjustment']),
  body('amount').isFloat({ min: 0 }),
  body('description').isString().trim().notEmpty(),
  body('notes').optional().isString().trim()
], cashBoxController.manualTransaction);

// Settings
router.put('/settings', [
  body('default_opening_amount').optional().isFloat({ min: 0 }),
  body('require_opening_amount').optional().isBoolean(),
  body('require_closing_count').optional().isBoolean(),
  body('allow_negative_balance').optional().isBoolean(),
  body('max_withdrawal_amount').optional().isFloat({ min: 0 }),
  body('require_approval_for_withdrawal').optional().isBoolean(),
  body('auto_close_at_end_of_day').optional().isBoolean(),
  body('auto_close_time').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
], cashBoxController.updateUserCashBoxSettings);

// Transactions
router.get('/transactions/:cashBoxId', [
  body('limit').optional().isInt({ min: 1, max: 100 }),
  body('offset').optional().isInt({ min: 0 })
], cashBoxController.getCashBoxTransactions);

// Reports
router.get('/report/:cashBoxId', [
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601()
], cashBoxController.getCashBoxReport);

// Money Box Integration routes
router.get('/with-money-box-summary', cashBoxController.getCashBoxWithMoneyBoxSummary);
router.post('/transfer-to-daily-money-box', [
  body('cashBoxId').isInt({ min: 1 }),
  body('amount').isFloat({ min: 0.01 }),
  body('notes').optional().isString().trim()
], cashBoxController.transferToDailyMoneyBox);
router.post('/transfer-from-daily-money-box', [
  body('cashBoxId').isInt({ min: 1 }),
  body('amount').isFloat({ min: 0.01 }),
  body('notes').optional().isString().trim()
], cashBoxController.transferFromDailyMoneyBox);
router.post('/transfer-to-money-box', [
  body('cashBoxId').isInt({ min: 1 }),
  body('amount').isFloat({ min: 0.01 }),
  body('targetType').isIn(['daily_money_box', 'custom_money_box']),
  body('targetMoneyBox').optional().isString().trim(),
  body('notes').optional().isString().trim()
], cashBoxController.transferToMoneyBox);
router.get('/comprehensive-report', cashBoxController.getComprehensiveCashBoxReport);

// Admin routes
router.get('/admin/open-cash-boxes', requireAdmin, cashBoxController.getAllOpenCashBoxes);
router.get('/admin/cash-box/:cashBoxId', requireAdmin, cashBoxController.getCashBoxById);
router.post('/admin/force-close/:cashBoxId', requireAdmin, [
  body('reason').optional().isString().trim(),
  body('money_box_id').optional().isString().trim()
], cashBoxController.forceCloseCashBox);
router.get('/admin/history', requireAdmin, cashBoxController.getAllUsersCashBoxHistory);

module.exports = router; 