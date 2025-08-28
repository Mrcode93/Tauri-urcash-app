const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');
const { validateRequest } = require('../middleware/validationMiddleware');
const { body, query, param } = require('express-validator');
const { validate } = require('../middleware/validationMiddleware');
const delegateController = require('../controllers/delegateController');

// ===== BASIC DELEGATE MANAGEMENT ROUTES =====

// Get all delegates
router.get('/', protect, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString()
], validateRequest, delegateController.getAllDelegates);

// Get delegate by ID
router.get('/:id', protect, [
  param('id').isInt({ min: 1 })
], validateRequest, delegateController.getDelegateById);

// Create new delegate
router.post('/', protect, authorize(['admin', 'manager']), [
  body('name').notEmpty().withMessage('Name is required'),
  body('phone').optional().isString(),
  body('email').optional().custom((value) => {
    if (value && value.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        throw new Error('Email must be valid when provided');
      }
    }
    return true;
  }),
  body('address').optional().isString(),
  body('commission_rate').optional().isFloat({ min: 0, max: 100 }).withMessage('Commission rate must be between 0 and 100'),
  body('commission_type').optional().isIn(['percentage', 'fixed']).withMessage('Commission type must be percentage or fixed'),
  body('commission_amount').optional().isFloat({ min: 0 }).withMessage('Commission amount must be positive'),
  body('sales_target').optional().isFloat({ min: 0 }).withMessage('Sales target must be positive')
], validateRequest, delegateController.createDelegate);

// Update delegate
router.put('/:id', protect, authorize(['admin', 'manager']), [
  param('id').isInt({ min: 1 }),
  body('name').notEmpty().withMessage('Name is required'),
  body('phone').optional().isString(),
  body('email').optional().custom((value) => {
    if (value && value.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        throw new Error('Email must be valid when provided');
      }
    }
    return true;
  }),
  body('address').optional().isString(),
  body('commission_rate').optional().isFloat({ min: 0, max: 100 }).withMessage('Commission rate must be between 0 and 100'),
  body('commission_type').optional().isIn(['percentage', 'fixed']).withMessage('Commission type must be percentage or fixed'),
  body('commission_amount').optional().isFloat({ min: 0 }).withMessage('Commission amount must be positive'),
  body('sales_target').optional().isFloat({ min: 0 }).withMessage('Sales target must be positive'),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean')
], validateRequest, delegateController.updateDelegate);

// Delete delegate
router.delete('/:id', protect, authorize(['admin']), [
  param('id').isInt({ min: 1 })
], validateRequest, delegateController.deleteDelegate);

// ===== DELEGATE SALES ROUTES =====

// Create delegate sale
router.post('/:id/sales', protect, authorize(['admin', 'manager']), [
  param('id').isInt({ min: 1 }),
  body('customer_id').isInt({ min: 1 }).withMessage('Valid customer ID is required'),
  body('sale_id').isInt({ min: 1 }).withMessage('Valid sale ID is required'),
  body('total_amount').isFloat({ min: 0 }).withMessage('Total amount must be positive'),
  body('commission_rate').optional().isFloat({ min: 0 }).withMessage('Commission rate must be positive'),
  body('commission_type').optional().isIn(['percentage', 'fixed']).withMessage('Commission type must be percentage or fixed'),
  body('notes').optional().isString()
], validateRequest, delegateController.createDelegateSale);

// Get delegate sales
router.get('/:id/sales', protect, [
  param('id').isInt({ min: 1 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], validateRequest, delegateController.getDelegateSales);

// ===== DELEGATE COLLECTIONS ROUTES =====

// Create delegate collection
router.post('/:id/collections', protect, authorize(['admin', 'manager']), [
  param('id').isInt({ min: 1 }),
  body('customer_id').isInt({ min: 1 }).withMessage('Valid customer ID is required'),
  body('sale_id').optional().isInt({ min: 1 }).withMessage('Valid sale ID is required'),
  body('collection_amount').isFloat({ min: 0.01 }).withMessage('Collection amount must be positive'),
  body('payment_method').optional().isIn(['cash', 'card', 'bank_transfer', 'check']).withMessage('Valid payment method is required'),
  body('collection_date').isDate().withMessage('Valid collection date is required'),
  body('receipt_number').optional().isString(),
  body('notes').optional().isString()
], validateRequest, delegateController.createDelegateCollection);

// Get delegate collections
router.get('/:id/collections', protect, [
  param('id').isInt({ min: 1 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], validateRequest, delegateController.getDelegateCollections);

// Get commission report for delegate
router.get('/:id/commission-report', protect, [
  param('id').isInt({ min: 1 }),
  query('start_date').optional().isDate().withMessage('Valid start date is required'),
  query('end_date').optional().isDate().withMessage('Valid end date is required')
], validateRequest, delegateController.getCommissionReport);

// Get delegate performance analytics
router.get('/:id/performance', protect, [
  param('id').isInt({ min: 1 }),
  query('start_date').optional().isDate().withMessage('Valid start date is required'),
  query('end_date').optional().isDate().withMessage('Valid end date is required')
], validateRequest, delegateController.getDelegatePerformance);

// Check target achievement
router.get('/:id/target-achievement', protect, [
  param('id').isInt({ min: 1 }),
  query('period').optional().isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).withMessage('Valid period is required')
], validateRequest, delegateController.checkTargetAchievement);

// Create collection
router.post('/:id/collections', protect, authorize(['admin', 'manager']), [
  param('id').isInt({ min: 1 }),
  body('customer_id').isInt({ min: 1 }).withMessage('Valid customer ID is required'),
  body('sale_id').optional().isInt({ min: 1 }).withMessage('Valid sale ID is required'),
  body('collection_amount').isFloat({ min: 0.01 }).withMessage('Collection amount must be positive'),
  body('payment_method').isIn(['cash', 'card', 'bank_transfer', 'check']).withMessage('Valid payment method is required'),
  body('collection_date').isDate().withMessage('Valid collection date is required'),
  body('receipt_number').optional().isString(),
  body('notes').optional().isString()
], validateRequest, delegateController.createCollection);

// Get collection summary
router.get('/:id/collection-summary', protect, [
  param('id').isInt({ min: 1 }),
  query('start_date').optional().isDate().withMessage('Valid start date is required'),
  query('end_date').optional().isDate().withMessage('Valid end date is required')
], validateRequest, delegateController.getCollectionSummary);

// ===== CUSTOMER ASSIGNMENT ROUTES =====

// Assign customer to delegate
router.post('/:id/customers', protect, authorize(['admin', 'manager']), [
  param('id').isInt({ min: 1 }),
  body('customer_id').isInt({ min: 1 }).withMessage('Valid customer ID is required'),
  body('notes').optional().isString()
], validateRequest, delegateController.assignCustomerToDelegate);

// Get assigned customers
router.get('/:id/customers', protect, [
  param('id').isInt({ min: 1 })
], validateRequest, delegateController.getAssignedCustomers);

// Remove customer assignment
router.delete('/:id/customers/:customerId', protect, authorize(['admin', 'manager']), [
  param('id').isInt({ min: 1 }),
  param('customerId').isInt({ min: 1 })
], validateRequest, delegateController.removeCustomerAssignment);

// ===== DELEGATE COMMISSION ROUTES =====

// Calculate delegate commission
router.get('/:id/commission', protect, [
  param('id').isInt({ min: 1 }),
  query('period_start').isDate().withMessage('Valid period start date is required'),
  query('period_end').isDate().withMessage('Valid period end date is required')
], validateRequest, delegateController.calculateDelegateCommission);

// Create commission payment
router.post('/:id/commission-payments', protect, authorize(['admin', 'manager']), [
  param('id').isInt({ min: 1 }),
  body('period_start').isDate().withMessage('Valid period start date is required'),
  body('period_end').isDate().withMessage('Valid period end date is required'),
  body('payment_amount').isFloat({ min: 0 }).withMessage('Payment amount must be positive'),
  body('payment_date').isDate().withMessage('Valid payment date is required'),
  body('payment_method').optional().isIn(['cash', 'bank_transfer', 'check']).withMessage('Valid payment method is required'),
  body('notes').optional().isString()
], validateRequest, delegateController.createCommissionPayment);

// ===== DELEGATE PERFORMANCE REPORTS ROUTES =====

// Generate performance report
router.post('/:id/performance-reports', protect, authorize(['admin', 'manager']), [
  param('id').isInt({ min: 1 }),
  body('report_date').isDate().withMessage('Valid report date is required'),
  body('period_type').optional().isIn(['daily', 'weekly', 'monthly', 'yearly']).withMessage('Valid period type is required')
], validateRequest, delegateController.generatePerformanceReport);

// Get performance reports
router.get('/:id/performance-reports', protect, [
  param('id').isInt({ min: 1 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], validateRequest, delegateController.getPerformanceReports);

// ===== DELEGATE DASHBOARD ROUTES =====

// Get delegate dashboard
router.get('/:id/dashboard', protect, [
  param('id').isInt({ min: 1 })
], validateRequest, delegateController.getDelegateDashboard);

// ===== CUSTOMER ASSIGNMENT ROUTES =====

// Get customers for dropdown
router.get('/customers/dropdown', protect, delegateController.getCustomersForDropdown);

// Get delegates by customer ID
router.get('/customer/:customerId', protect, [
  param('customerId').isInt({ min: 1 })
], validateRequest, delegateController.getDelegatesByCustomerId);

// ===== BULK OPERATIONS ROUTES =====

// Bulk generate performance reports
router.post('/bulk/performance-reports', protect, authorize(['admin', 'manager']), [
  body('report_date').isDate().withMessage('Valid report date is required'),
  body('period_type').optional().isIn(['daily', 'weekly', 'monthly', 'yearly']).withMessage('Valid period type is required')
], validateRequest, delegateController.bulkGeneratePerformanceReports);

// ===== ANALYTICS ROUTES =====

// Get delegate analytics
router.get('/analytics/summary', protect, authorize(['admin', 'manager']), [
  query('period_start').isDate().withMessage('Valid period start date is required'),
  query('period_end').isDate().withMessage('Valid period end date is required')
], validateRequest, delegateController.getDelegateAnalytics);

module.exports = router;
