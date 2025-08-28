const express = require('express');
const router = express.Router();
const expensesController = require('../controllers/expensesController');
const { protect } = require('../middleware/authMiddleware');
const { validateExpense } = require('../middleware/validationMiddleware');
const { handleExpenseCashBoxTransaction, handleExpenseUpdateCashBoxTransaction } = require('../middleware/cashBoxMiddleware');

// Apply authentication middleware to all routes
router.use('/', protect);

// Get all expenses
router.get('/', expensesController.getAll);

// Get expenses by category (more specific route)
router.get('/category/:category', expensesController.getByCategory);

// Get expenses by date range (more specific route)
router.get('/date-range', expensesController.getByDateRange);

// Get expense by ID (less specific route)
router.get('/:id', expensesController.getById);

// Create new expense
router.post('/', validateExpense, handleExpenseCashBoxTransaction, expensesController.create);

// Update expense
router.put('/:id', validateExpense, handleExpenseUpdateCashBoxTransaction, expensesController.update);

// Delete expense
router.delete('/:id', expensesController.delete);

module.exports = router; 