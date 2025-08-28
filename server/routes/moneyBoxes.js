const express = require('express');
const { body } = require('express-validator');
const moneyBoxesController = require('../controllers/moneyBoxesController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Money boxes CRUD operations
router.get('/', moneyBoxesController.getAllMoneyBoxes);
router.get('/summary', moneyBoxesController.getAllMoneyBoxesSummary);
router.get('/name/:name', moneyBoxesController.getMoneyBoxByName);
router.get('/:id', moneyBoxesController.getMoneyBoxById);
router.get('/:id/summary', moneyBoxesController.getMoneyBoxSummary);

// Create new money box
router.post('/', [
  body('name').isString().trim().notEmpty().withMessage('Money box name is required'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('notes').optional().isString().trim()
], moneyBoxesController.createMoneyBox);

// Update money box
router.put('/:id', [
  body('name').isString().trim().notEmpty().withMessage('Money box name is required'),
  body('notes').optional().isString().trim()
], moneyBoxesController.updateMoneyBox);

// Delete money box (admin only)
router.delete('/:id', requireAdmin, moneyBoxesController.deleteMoneyBox);

// Money box transactions
router.get('/:id/transactions', moneyBoxesController.getMoneyBoxTransactions);
router.get('/:id/transactions/date-range', [
  body('startDate').isISO8601().withMessage('Start date must be a valid date'),
  body('endDate').isISO8601().withMessage('End date must be a valid date'),
  body('limit').optional().isInt({ min: 1, max: 100 }),
  body('offset').optional().isInt({ min: 0 })
], moneyBoxesController.getTransactionsByDateRange);

// Add transaction to money box
router.post('/:id/transactions', [
  body('type').isIn(['deposit', 'withdraw', 'transfer_in', 'transfer_out']).withMessage('Invalid transaction type'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than zero'),
  body('notes').optional().isString().trim()
], moneyBoxesController.addTransaction);

// Transfer between money boxes
router.post('/transfer', [
  body('fromBoxId').isInt({ min: 1 }).withMessage('Source box ID is required'),
  body('toBoxId').isInt({ min: 1 }).withMessage('Destination box ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than zero'),
  body('notes').optional().isString().trim()
], moneyBoxesController.transferBetweenBoxes);

module.exports = router; 