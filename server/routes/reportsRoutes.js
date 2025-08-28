const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { protect } = require('../middleware/authMiddleware');

// Get dashboard summary
router.get('/dashboard', protect, reportsController.getDashboardSummary);

// Get profit and loss report
router.get('/profit-loss', protect, reportsController.getProfitLoss);

// Get returns report
router.get('/returns', protect, reportsController.getReturnsReport);

// Get stocks report
router.get('/stocks', protect, reportsController.getStocksReport);

// Get sales analysis report
router.get('/sales-analysis', protect, reportsController.getSalesAnalysis);

// Custom Reports Routes
router.get('/delegates', protect, reportsController.getDelegatesReport);
router.get('/customers', protect, reportsController.getCustomerReport);
router.get('/suppliers', protect, reportsController.getSupplierReport);
router.get('/sales', protect, reportsController.getSalesReport);
router.get('/product/:productId', protect, reportsController.getSpecificProductReport);
router.get('/company/:companyId', protect, reportsController.getCompanyReport);
router.get('/stock', protect, reportsController.getStockReport);
router.get('/debts', protect, reportsController.getDebtsReport);
router.get('/money-box', protect, reportsController.getMoneyBoxReport);
router.get('/expenses', protect, reportsController.getExpensesReport);
router.get('/customer-debts', protect, reportsController.getCustomerDebtsDetailedReport);

module.exports = router; 