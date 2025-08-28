const db = require('../database');
const logger = require('../utils/logger');
const customerReceiptsService = require('../services/customerReceiptsService');
const cacheService = require('../services/cacheService');

// Simple in-memory cache for stats (5 minutes TTL)
const statsCache = {
  data: null,
  timestamp: null,
  ttl: 5 * 60 * 1000 // 5 minutes
};

const getCachedStats = () => {
  if (statsCache.data && statsCache.timestamp && (Date.now() - statsCache.timestamp) < statsCache.ttl) {
    return statsCache.data;
  }
  return null;
};

const setCachedStats = (data) => {
  statsCache.data = data;
  statsCache.timestamp = Date.now();
};

const clearStatsCache = () => {
  statsCache.data = null;
  statsCache.timestamp = null;
};

// Get all debts calculated from sales
const getAllDebts = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, status, customer_id } = req.query;
    
    // Generate cache key based on parameters
    const cacheKey = `debts:list:${JSON.stringify({ page, limit, search, status, customer_id })}`;
    
    // Try to get from cache first
    const cached = cacheService.get(cacheKey);
    if (cached) {
      // Cache hit for debts list
      return res.json(cached);
    }
    
    const offset = (page - 1) * limit;
    
    // Build WHERE conditions - only show sales with outstanding balances
    let whereConditions = ['(s.total_amount > COALESCE(s.paid_amount, 0) OR d.id IS NOT NULL)']; // Only show actual debts
    const queryParams = [];
    
    if (search) {
      whereConditions.push('(c.name LIKE ? OR s.invoice_no LIKE ?)');
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern);
    }
    
    if (status && status !== 'all') {
      if (status === 'pending') {
        whereConditions.push('d.status = ?');
        queryParams.push('unpaid');
      } else if (status === 'partial') {
        whereConditions.push('d.status = ?');
        queryParams.push('partial');
      } else if (status === 'paid') {
        whereConditions.push('d.status = ?');
        queryParams.push('paid');
      }
    }
    
    if (customer_id) {
      whereConditions.push('s.customer_id = ?');
      queryParams.push(customer_id);
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Optimized query with pagination
    const query = `
      SELECT 
        d.id as debt_id,
        d.sale_id,
        s.invoice_no,
        s.customer_id,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.address as customer_address,
        s.total_amount,
        COALESCE(s.paid_amount, 0) as paid_amount,
        d.amount as debt_amount,
        (s.total_amount - COALESCE(s.paid_amount, 0)) as remaining_amount,
        COALESCE(d.due_date, s.due_date) as due_date,
        d.status as debt_status,
        CASE 
          WHEN d.amount <= 0 THEN 'paid'
          WHEN COALESCE(s.paid_amount, 0) >= s.total_amount THEN 'paid'
          WHEN COALESCE(s.paid_amount, 0) > 0 THEN 'partial'
          ELSE 'pending'
        END as calculated_status,
        d.notes,
        s.created_at,
        s.updated_at
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN debts d ON s.id = d.sale_id
      WHERE ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const debts = db.query(query, [...queryParams, parseInt(limit), offset]);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN debts d ON s.id = d.sale_id
      WHERE ${whereClause}
    `;
    
    const countResult = db.queryOne(countQuery, queryParams);
    const total = countResult.total;
    
    const result = {
      success: true,
      message: 'Debts fetched successfully',
      data: debts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: (page * limit) < total
      }
    };
    
    // Cache the result for 3 minutes
    cacheService.set(cacheKey, result, 180);
    // Cache set for debts list
    
    // Clear related caches to ensure fresh data
    cacheService.del(`debts:stats:all`);
    cacheService.del(`debts:stats:${customer_id || 'all'}`);
    clearStatsCache();
    
    res.json(result);
  } catch (error) {
    logger.error('Error getting all debts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch debts',
      error: error.message
    });
  }
};

// Get debt statistics
const getDebtStats = async (req, res) => {
  try {
    const { customer_id } = req.query;
    
    // Try to get from cache first
    const cacheKey = `debts:stats:${customer_id || 'all'}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for debt stats: ${cacheKey}`);
      return res.json(cached);
    }
    
    // Check in-memory cache first
    const cachedStats = getCachedStats();
    if (cachedStats) {
      const result = {
        success: true,
        message: 'Debt statistics fetched successfully',
        data: cachedStats
      };
      
      // Cache the result for 2 minutes
      cacheService.set(cacheKey, result, 120);
      logger.debug(`Cache set for debt stats: ${cacheKey}`);
      
      return res.json(result);
    }
    
    let whereConditions = ['(s.total_amount > COALESCE(s.paid_amount, 0) OR d.id IS NOT NULL)'];
    const queryParams = [];
    
    if (customer_id) {
      whereConditions.push('s.customer_id = ?');
      queryParams.push(customer_id);
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Get debt statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_count,
        SUM(CASE 
          WHEN (s.total_amount - COALESCE(s.paid_amount, 0)) > 0 THEN 1 
          ELSE 0 
        END) as total_pending,
        SUM(CASE 
          WHEN COALESCE(s.paid_amount, 0) >= s.total_amount THEN 1 
          ELSE 0 
        END) as total_paid,
        SUM(CASE 
          WHEN COALESCE(s.paid_amount, 0) > 0 AND COALESCE(s.paid_amount, 0) < s.total_amount THEN 1 
          ELSE 0 
        END) as total_partial,
        SUM(s.total_amount - COALESCE(s.paid_amount, 0)) as total_outstanding_amount
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN debts d ON s.id = d.sale_id
      WHERE ${whereClause}
    `;
    
    const stats = db.queryOne(statsQuery, queryParams);
    
    const result = {
      success: true,
      message: 'Debt statistics fetched successfully',
      data: {
        total_pending: parseInt(stats.total_pending || 0),
        total_paid: parseInt(stats.total_paid || 0),
        total_partial: parseInt(stats.total_partial || 0),
        total_count: parseInt(stats.total_count || 0),
        total_outstanding_amount: parseFloat(stats.total_outstanding_amount || 0)
      }
    };
    
    // Cache the result for 2 minutes
    cacheService.set(cacheKey, result, 120);
    setCachedStats(result.data);
    logger.debug(`Cache set for debt stats: ${cacheKey}`);
    
    res.json(result);
  } catch (error) {
    logger.error('Error getting debt statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch debt statistics',
      error: error.message
    });
  }
};

// Get debts by customer
const getDebtsByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    
    // Generate cache key
    const cacheKey = `debts:customer:${customerId}`;
    
    // Try to get from cache first
    const cached = cacheService.get(cacheKey);
    if (cached) {
      // Cache hit for customer debts
      return res.json(cached);
    }
    
    const query = `
      SELECT 
        d.id as debt_id,
        d.sale_id,
        s.invoice_no,
        s.customer_id,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.address as customer_address,
        s.total_amount,
        COALESCE(s.paid_amount, 0) as paid_amount,
        d.amount as debt_amount,
        (s.total_amount - COALESCE(s.paid_amount, 0)) as remaining_amount,
        COALESCE(d.due_date, s.due_date) as due_date,
        d.status as debt_status,
        CASE 
          WHEN d.amount <= 0 THEN 'paid'
          WHEN COALESCE(s.paid_amount, 0) >= s.total_amount THEN 'paid'
          WHEN COALESCE(s.paid_amount, 0) > 0 THEN 'partial'
          ELSE 'pending'
        END as calculated_status,
        d.notes,
        s.created_at,
        s.updated_at
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN debts d ON s.id = d.sale_id
      WHERE s.customer_id = ? AND (s.total_amount > COALESCE(s.paid_amount, 0) OR d.id IS NOT NULL)
      ORDER BY s.created_at DESC
    `;
    
    const debts = db.query(query, [customerId]);
    
    const result = {
      success: true,
      message: 'Customer debts fetched successfully',
      data: debts
    };
    
    // Cache the result for 3 minutes
    cacheService.set(cacheKey, result, 180);
    // Cache set for customer debts
    
    res.json(result);
  } catch (error) {
    logger.error('Error getting debts by customer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer debts',
      error: error.message
    });
  }
};

// Helper function to get debt by ID (supports both debt ID and sale ID)
const getDebtById = async (id) => {
  try {
    // First try to find by debt ID
    let query = `
      SELECT 
        d.id as debt_id,
        d.sale_id,
        s.invoice_no,
        s.customer_id,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.address as customer_address,
        s.total_amount,
        COALESCE(s.paid_amount, 0) as paid_amount,
        d.amount as debt_amount,
        (s.total_amount - COALESCE(s.paid_amount, 0)) as remaining_amount,
        COALESCE(d.due_date, s.due_date) as due_date,
        d.status as debt_status,
        CASE 
          WHEN d.amount <= 0 THEN 'paid'
          WHEN COALESCE(s.paid_amount, 0) >= s.total_amount THEN 'paid'
          WHEN COALESCE(s.paid_amount, 0) > 0 THEN 'partial'
          ELSE 'pending'
        END as calculated_status,
        d.notes,
        s.created_at,
        s.updated_at
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN debts d ON s.id = d.sale_id
      WHERE d.id = ?
    `;
    
    let result = await db.queryOne(query, [id]);
    
    // If not found by debt ID, try by sale ID
    if (!result) {
      query = `
        SELECT 
          d.id as debt_id,
          d.sale_id,
          s.invoice_no,
          s.customer_id,
          c.name as customer_name,
          c.email as customer_email,
          c.phone as customer_phone,
          c.address as customer_address,
          s.total_amount,
          COALESCE(s.paid_amount, 0) as paid_amount,
          d.amount as debt_amount,
          (s.total_amount - COALESCE(s.paid_amount, 0)) as remaining_amount,
          COALESCE(d.due_date, s.due_date) as due_date,
          d.status as debt_status,
          CASE 
            WHEN d.amount <= 0 THEN 'paid'
            WHEN COALESCE(s.paid_amount, 0) >= s.total_amount THEN 'paid'
            WHEN COALESCE(s.paid_amount, 0) > 0 THEN 'partial'
            ELSE 'pending'
          END as calculated_status,
          d.notes,
          s.created_at,
          s.updated_at
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN debts d ON s.id = d.sale_id
        WHERE s.id = ?
      `;
      
      result = await db.queryOne(query, [id]);
    }
    
    return result;
  } catch (error) {
    logger.error('Error getting debt by ID:', error);
    return null;
  }
};

// Get customer with debts
const getCustomerWithDebts = async (req, res) => {
  try {
    const { customerId } = req.params;
    
    // Generate cache key
    const cacheKey = `debts:customer_details:${customerId}`;
    
    // Try to get from cache first
    const cached = cacheService.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for customer debt details: ${cacheKey}`);
      return res.json(cached);
    }
    
    // Get customer information
    const customerQuery = `
      SELECT 
        c.*,
        COUNT(s.id) as total_sales,
        COALESCE(SUM(s.total_amount), 0) as total_purchased,
        COALESCE(SUM(s.paid_amount), 0) as total_paid,
        COALESCE(SUM(s.total_amount - COALESCE(s.paid_amount, 0)), 0) as total_owed
      FROM customers c
      LEFT JOIN sales s ON c.id = s.customer_id AND s.status = 'completed'
      WHERE c.id = ?
      GROUP BY c.id
    `;
    
    const customer = db.queryOne(customerQuery, [customerId]);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    // Get customer's debts
    const debtsQuery = `
      SELECT 
        d.id as debt_id,
        d.sale_id,
        s.invoice_no,
        s.invoice_date,
        s.total_amount,
        COALESCE(s.paid_amount, 0) as paid_amount,
        d.amount as debt_amount,
        (s.total_amount - COALESCE(s.paid_amount, 0)) as remaining_amount,
        COALESCE(d.due_date, s.due_date) as due_date,
        d.status as debt_status,
        CASE 
          WHEN d.amount <= 0 THEN 'paid'
          WHEN COALESCE(s.paid_amount, 0) >= s.total_amount THEN 'paid'
          WHEN COALESCE(s.paid_amount, 0) > 0 THEN 'partial'
          ELSE 'pending'
        END as calculated_status,
        d.notes,
        s.created_at,
        s.updated_at
      FROM sales s
      LEFT JOIN debts d ON s.id = d.sale_id
      WHERE s.customer_id = ? AND (s.total_amount > COALESCE(s.paid_amount, 0) OR d.id IS NOT NULL)
      ORDER BY s.created_at DESC
    `;
    
    const debts = db.query(debtsQuery, [customerId]);
    
    const result = {
      success: true,
      message: 'Customer with debts fetched successfully',
      data: {
        customer,
        debts
      }
    };
    
    // Cache the result for 3 minutes
    cacheService.set(cacheKey, result, 180);
    logger.debug(`Cache set for customer debt details: ${cacheKey}`);
    
    res.json(result);
  } catch (error) {
    logger.error('Error getting customer with debts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer with debts',
      error: error.message
    });
  }
};

// Repay debt with receipt
const repayDebtWithReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { paid_amount, payment_method = 'cash', reference_number, notes, receipt_date, money_box_id } = req.body;
    const userId = req.user.id;

    logger.info(`Repaying debt ${id} with amount ${paid_amount}, method ${payment_method}`);

    // Get debt details
    const debt = await getDebtById(id);
    if (!debt) {
      logger.error(`Debt not found with ID: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Debt not found'
      });
    }

    logger.info(`Found debt: ${JSON.stringify(debt)}`);

    // Validate payment amount
    if (paid_amount <= 0) {
      logger.error(`Invalid payment amount: ${paid_amount}`);
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than 0'
      });
    }

    // Allow excess payments - they will be applied to other debts or customer balance
    // Only validate that payment amount is positive
    if (paid_amount <= 0) {
      logger.error(`Invalid payment amount: ${paid_amount}`);
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than 0'
      });
    }

    // Validate required fields
    if (!debt.customer_id) {
      logger.error(`Missing customer_id for debt ${id}`);
      return res.status(400).json({
        success: false,
        message: 'Debt is missing customer information'
      });
    }

    // Use database transaction to ensure consistency
    const result = await db.transaction(async () => {
      let remainingPaymentAmount = paid_amount;
      let appliedPayments = [];
      let excessAmount = 0; // Initialize to 0
      
      // Step 1: Pay the current debt first
      const currentDebtAmount = debt.remaining_amount;
      const amountForCurrentDebt = Math.min(remainingPaymentAmount, currentDebtAmount);
      
      if (amountForCurrentDebt > 0) {
        // Update the current debt
        const newPaidAmount = (debt.paid_amount || 0) + amountForCurrentDebt;
        const finalPaidAmount = Math.min(newPaidAmount, debt.total_amount);
        const finalRemainingAmount = debt.total_amount - finalPaidAmount;
        
        // Determine new payment status
        let newPaymentStatus = debt.payment_status;
        if (finalPaidAmount >= debt.total_amount) {
          newPaymentStatus = 'paid';
        } else if (finalPaidAmount > 0) {
          newPaymentStatus = 'partial';
        } else {
          newPaymentStatus = 'unpaid';
        }

        // Update the sale
        await db.update(`
          UPDATE sales 
          SET paid_amount = ?, 
              payment_status = ?,
              updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `, [finalPaidAmount, newPaymentStatus, debt.sale_id]);

        // Update or delete the debt record
        if (newPaymentStatus === 'paid' || finalRemainingAmount <= 0) {
          // Delete debt if fully paid
          await db.update('DELETE FROM debts WHERE sale_id = ?', [debt.sale_id]);
          logger.info(`Deleted debt record for fully paid sale ${debt.sale_id}`);
        } else {
          // Update debt amount and status
          await db.update(`
            UPDATE debts 
            SET amount = ?, 
                status = ?,
                updated_at = CURRENT_TIMESTAMP 
            WHERE sale_id = ?
          `, [
            finalRemainingAmount,
            newPaymentStatus === 'unpaid' ? 'unpaid' : 'partial',
            debt.sale_id
          ]);
          logger.info(`Updated debt record for sale ${debt.sale_id} with amount ${finalRemainingAmount}`);
        }
        
        appliedPayments.push({
          debt_id: debt.sale_id,
          amount: amountForCurrentDebt,
          invoice_no: debt.invoice_no
        });
        
        remainingPaymentAmount -= amountForCurrentDebt;
        logger.info(`Applied ${amountForCurrentDebt} to current debt. Remaining payment: ${remainingPaymentAmount}`);
      }
      
      // Step 2: Apply remaining payment to other debts
      if (remainingPaymentAmount > 0) {
        // Get other unpaid debts for the same customer
        const otherDebts = await db.query(`
          SELECT 
            s.id as sale_id,
            s.invoice_no,
            s.total_amount,
            s.paid_amount,
            (s.total_amount - COALESCE(s.paid_amount, 0)) as remaining_amount,
            s.payment_status
          FROM sales s
          LEFT JOIN debts d ON s.id = d.sale_id
          WHERE s.customer_id = ? 
            AND s.id != ? 
            AND s.payment_status != 'paid'
            AND (s.total_amount - COALESCE(s.paid_amount, 0)) > 0
          ORDER BY s.due_date ASC
        `, [debt.customer_id, debt.sale_id]);
        
        logger.info(`Found ${otherDebts.length} other debts for customer ${debt.customer_id}`);
        
        for (const otherDebt of otherDebts) {
          if (remainingPaymentAmount <= 0) break;
          
          const amountForThisDebt = Math.min(remainingPaymentAmount, otherDebt.remaining_amount);
          
          if (amountForThisDebt > 0) {
            const newPaidAmount = (otherDebt.paid_amount || 0) + amountForThisDebt;
            const finalPaidAmount = Math.min(newPaidAmount, otherDebt.total_amount);
            const finalRemainingAmount = otherDebt.total_amount - finalPaidAmount;
            
            // Determine new payment status
            let newPaymentStatus = otherDebt.payment_status;
            if (finalPaidAmount >= otherDebt.total_amount) {
              newPaymentStatus = 'paid';
            } else if (finalPaidAmount > 0) {
              newPaymentStatus = 'partial';
            } else {
              newPaymentStatus = 'unpaid';
            }
            
            // Update the sale
            await db.update(`
              UPDATE sales 
              SET paid_amount = ?, 
                  payment_status = ?,
                  updated_at = CURRENT_TIMESTAMP 
              WHERE id = ?
            `, [finalPaidAmount, newPaymentStatus, otherDebt.sale_id]);
            
            // Update or delete the debt record
            if (newPaymentStatus === 'paid' || finalRemainingAmount <= 0) {
              await db.update('DELETE FROM debts WHERE sale_id = ?', [otherDebt.sale_id]);
              logger.info(`Deleted debt record for fully paid sale ${otherDebt.sale_id}`);
            } else {
              await db.update(`
                UPDATE debts 
                SET amount = ?, 
                    status = ?,
                    updated_at = CURRENT_TIMESTAMP 
                WHERE sale_id = ?
              `, [
                finalRemainingAmount,
                newPaymentStatus === 'unpaid' ? 'unpaid' : 'partial',
                otherDebt.sale_id
              ]);
              logger.info(`Updated debt record for sale ${otherDebt.sale_id} with amount ${finalRemainingAmount}`);
            }
            
            appliedPayments.push({
              debt_id: otherDebt.sale_id,
              amount: amountForThisDebt,
              invoice_no: otherDebt.invoice_no
            });
            
            remainingPaymentAmount -= amountForThisDebt;
            logger.info(`Applied ${amountForThisDebt} to debt ${otherDebt.sale_id}. Remaining payment: ${remainingPaymentAmount}`);
          }
        }
      }
      
      // Step 3: Calculate excess amount (customer balance will be updated by customer receipts service)
      if (remainingPaymentAmount > 0) {
        logger.info(`=== EXCESS AMOUNT CALCULATION ===`);
        logger.info(`Original payment amount: ${paid_amount}`);
        logger.info(`Current debt remaining amount: ${debt.remaining_amount}`);
        logger.info(`Amount applied to current debt: ${paid_amount - remainingPaymentAmount}`);
        logger.info(`Remaining payment amount (excess): ${remainingPaymentAmount}`);
        logger.info(`Excess amount will be added to customer balance by customer receipts service`);
        
        excessAmount = remainingPaymentAmount;
        logger.info(`Excess amount calculated: ${excessAmount}`);
        logger.info(`=== END EXCESS AMOUNT CALCULATION ===`);
      } else {
        // No excess amount
        logger.info(`=== NO EXCESS AMOUNT ===`);
        logger.info(`Original payment amount: ${paid_amount}`);
        logger.info(`All payment applied to debts. No excess to add to customer balance.`);
        logger.info(`Excess amount: ${excessAmount}`);
        logger.info(`==============================`);
      }
      
      // Create customer receipt for the total amount paid
      const receiptData = {
        customer_id: debt.customer_id,
        sale_id: debt.sale_id,
        receipt_date: receipt_date || new Date().toISOString().split('T')[0],
        amount: paid_amount,
        payment_method: payment_method,
        reference_number: reference_number || null,
        notes: notes || `Payment for debts - Invoice: ${debt.invoice_no}`,
        money_box_id: money_box_id || null,
        skipSaleUpdate: true, // Flag to skip sale update in customer receipts service
        excess_amount: excessAmount > 0 ? excessAmount : null // Pass excess amount if any
      };

      logger.info(`Creating receipt with data: ${JSON.stringify(receiptData)}`);

      const receipt = await customerReceiptsService.create(receiptData, userId);

      logger.info(`Receipt created successfully: ${receipt.id}`);

      // Clear stats cache since debt amounts changed
      clearStatsCache();

      return {
        receipt,
        appliedPayments,
        excessAmount,
        updatedDebt: {
          ...debt,
          paid_amount: (debt.paid_amount || 0) + Math.min(paid_amount, debt.remaining_amount),
          remaining_amount: Math.max(0, debt.remaining_amount - paid_amount),
          payment_status: debt.remaining_amount <= paid_amount ? 'paid' : 'partial'
        }
      };
    });

    // Invalidate all related caches after debt repayment
    cacheService.invalidateFinancialData({
      dataTypes: ['debts', 'sales', 'customers', 'cash_box', 'customer_receipts']
    });

    res.json({
      success: true,
      message: 'Debt repaid successfully through customer receipt',
      data: {
        debt: result.updatedDebt,
        receipt: result.receipt,
        appliedPayments: result.appliedPayments,
        excessAmount: result.excessAmount,
        totalPaid: paid_amount
      }
    });
  } catch (error) {
    logger.error('Error repaying debt with receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to repay debt',
      error: error.message
    });
  }
};

module.exports = {
  getAllDebts,
  getDebtStats,
  getDebtsByCustomer,
  getDebtById,
  getCustomerWithDebts,
  repayDebtWithReceipt,
  clearStatsCache
}; 