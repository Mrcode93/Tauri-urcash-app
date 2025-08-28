const express = require('express');
const router = express.Router();
const debtsController = require('../controllers/debtsController');
const db = require('../database');
const logger = require('../utils/logger');
const cacheService = require('../services/cacheService');
const { protect } = require('../middleware/authMiddleware');
const { premiumFeatures } = require('../middleware/premiumMiddleware');
const { handleDebtReceiptCashBoxTransaction } = require('../middleware/cashBoxMiddleware');

// Apply authentication middleware to all routes
router.use(protect);

// Apply premium middleware for debts feature to all routes
router.use(premiumFeatures.debts);

// Get all debts
router.get('/', debtsController.getAllDebts);

// Get debt statistics
router.get('/stats', debtsController.getDebtStats);

// Get customer with all their debts
router.get('/customer/:customerId/details', debtsController.getCustomerWithDebts);

// Get debts by customer
router.get('/customer/:customerId', debtsController.getDebtsByCustomer);

// Get debt by ID
router.get('/:id', async (req, res) => {
  try {
    const debt = await debtsController.getDebtById(req.params.id);
    res.json({
      success: true,
      message: 'Debt fetched successfully',
      data: debt
    });
  } catch (error) {
    logger.error('Error fetching debt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch debt',
      error: error.message
    });
  }
});

// Update debt
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { paid_amount, due_date, status } = req.body;

    const updateQuery = `
      UPDATE sales 
      SET 
        paid_amount = ?,
        due_date = ?,
        payment_status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await db.update(updateQuery, [paid_amount, due_date, status, id]);

    // Clear stats cache since debt was updated
    if (debtsController.clearStatsCache) {
      debtsController.clearStatsCache();
    }

    // Invalidate all related caches
    cacheService.invalidatePattern('debts:list:*');
    cacheService.invalidatePattern('debts:debt:*');
    cacheService.del(`debts:debt:${id}`);
    
    // Invalidate customer caches since debt affects customer balance
    cacheService.invalidatePattern('customers:list:*');
    cacheService.invalidatePattern('customers:customer:*');
    cacheService.del('customers:all_customers');
    cacheService.del('customers:phone_index');
    cacheService.del('customers:email_index');
    
    logger.debug('Cache invalidated for debt update and customer data');

    // Get updated debt
    const updatedDebt = await debtsController.getDebtById(id);

    res.json({
      success: true,
      message: 'Debt updated successfully',
      data: updatedDebt
    });
  } catch (error) {
    logger.error('Error updating debt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update debt',
      error: error.message
    });
  }
});

// Delete debt
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      UPDATE sales 
      SET 
        payment_status = 'paid',
        paid_amount = total_amount,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await db.update(query, [id]);

    // Invalidate all related caches
    cacheService.invalidatePattern('debts:list:*');
    cacheService.invalidatePattern('debts:debt:*');
    cacheService.del(`debts:debt:${id}`);
    logger.debug('Cache invalidated for debt deletion');

    res.json({
      success: true,
      message: 'Debt marked as paid successfully'
    });
  } catch (error) {
    logger.error('Error deleting debt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete debt',
      error: error.message
    });
  }
});

// Mark debt as paid through CustomerReceipts system
router.post('/:id/repay', handleDebtReceiptCashBoxTransaction, debtsController.repayDebtWithReceipt);

// Legacy repay endpoint (fallback)
router.post('/:id/repay-legacy', async (req, res) => {
  try {
    const { id } = req.params;
    const { paid_amount } = req.body;

    const updateQuery = `
      UPDATE sales 
      SET 
        paid_amount = ?,
        payment_status = CASE 
          WHEN ? >= total_amount THEN 'paid'
          WHEN ? > 0 THEN 'partial'
          ELSE 'unpaid'
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await db.update(updateQuery, [paid_amount, paid_amount, paid_amount, id]);

    // Get updated debt
    const updatedDebt = await debtsController.getDebtById(id);

    res.json({
      success: true,
      message: 'Debt repaid successfully (legacy method)',
      data: updatedDebt
    });
  } catch (error) {
    logger.error('Error repaying debt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to repay debt',
      error: error.message
    });
  }
});

module.exports = router; 