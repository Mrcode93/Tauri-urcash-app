const { db, transaction, query, queryOne, insert, update } = require('../database');
const logger = require('../utils/logger');
const { generateReceiptNumber } = require('../utils/skuGenerator');
const { generateReceiptBarcode } = require('../utils/barcode');
const moneyBoxesService = require('./moneyBoxesService');
const cashBoxService = require('./cashBoxService');
const cacheService = require('./cacheService');

class CustomerReceiptsService {
  constructor() {
    this.tableName = 'customer_receipts';
  }

  // Get all customer receipts with pagination and filters
  getAll(filters = {}, page = 1, limit = 10) {
    try {
      let whereConditions = ['1=1'];
      const params = [];

      // Apply filters with optimized conditions
      if (filters.customer_id) {
        whereConditions.push('cr.customer_id = ?');
        params.push(filters.customer_id);
      }

      if (filters.sale_id) {
        whereConditions.push('cr.sale_id = ?');
        params.push(filters.sale_id);
      }

      if (filters.payment_method) {
        whereConditions.push('cr.payment_method = ?');
        params.push(filters.payment_method);
      }

      if (filters.date_from) {
        whereConditions.push('cr.receipt_date >= ?');
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        whereConditions.push('cr.receipt_date <= ?');
        params.push(filters.date_to);
      }

      if (filters.reference_number) {
        whereConditions.push('cr.reference_number LIKE ?');
        params.push(`%${filters.reference_number}%`);
      }

      const whereClause = whereConditions.join(' AND ');

      // Optimized count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM ${this.tableName} cr
        WHERE ${whereClause}
      `;
      
      const totalResult = queryOne(countQuery, params);
      const total = totalResult ? totalResult.total : 0;

      // Calculate pagination
      const offset = (page - 1) * limit;
      const totalPages = Math.ceil(total / limit);

      // Optimized main query with proper table aliases and indexing
      const sqlQuery = `
        SELECT 
          cr.id,
          cr.receipt_number,
          cr.customer_id,
          cr.sale_id,
          cr.receipt_date,
          cr.amount,
          cr.payment_method,
          cr.reference_number,
          cr.notes,
          cr.money_box_id,
          cr.delegate_id,
          cr.employee_id,
          cr.created_at,
          cr.updated_at,
          c.name as customer_name,
          c.phone as customer_phone,
          c.email as customer_email,
          s.invoice_no as sale_invoice_no,
          u.name as created_by_name,
          d.name as delegate_name,
          d.phone as delegate_phone,
          e.name as employee_name,
          e.phone as employee_phone
        FROM ${this.tableName} cr
        LEFT JOIN customers c ON cr.customer_id = c.id
        LEFT JOIN sales s ON cr.sale_id = s.id
        LEFT JOIN users u ON cr.created_by = u.id
        LEFT JOIN representatives d ON cr.delegate_id = d.id
        LEFT JOIN employees e ON cr.employee_id = e.id
        WHERE ${whereClause}
        ORDER BY cr.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const receipts = query(sqlQuery, [...params, limit, offset]);

      return {
        receipts,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages
        }
      };
    } catch (error) {
      logger.error('Error getting customer receipts:', error);
      throw error;
    }
  }

  // Get receipt by ID
  getById(id) {
    try {
      const sqlQuery = `
        SELECT 
          cr.*,
          c.name as customer_name,
          c.phone as customer_phone,
          c.email as customer_email,
          c.address as customer_address,
          s.invoice_no as sale_invoice_no,
          s.total_amount as sale_total_amount,
          s.paid_amount as sale_paid_amount,
          (s.total_amount - s.paid_amount) as sale_remaining_amount,
          u.name as created_by_name,
          d.name as delegate_name,
          d.phone as delegate_phone,
          e.name as employee_name,
          e.phone as employee_phone
        FROM ${this.tableName} cr
        LEFT JOIN customers c ON cr.customer_id = c.id
        LEFT JOIN sales s ON cr.sale_id = s.id
        LEFT JOIN users u ON cr.created_by = u.id
        LEFT JOIN representatives d ON cr.delegate_id = d.id
        LEFT JOIN employees e ON cr.employee_id = e.id
        WHERE cr.id = ?
      `;

      const receipt = queryOne(sqlQuery, [id]);
      if (!receipt) {
        throw new Error('Receipt not found');
      }

      return receipt;
    } catch (error) {
      logger.error('Error getting customer receipt by ID:', error);
      throw error;
    }
  }

  // Create new receipt
  async create(receiptData, userId) {
    try {
      const receipt = transaction(() => {
        // Validate required fields
        if (!receiptData.customer_id) {
          throw new Error('Customer not found');
        }
        
        if (!receiptData.amount || receiptData.amount <= 0) {
          throw new Error('Invalid amount');
        }

        // Check if customer exists
        const customer = queryOne('SELECT id FROM customers WHERE id = ?', [receiptData.customer_id]);
        if (!customer) {
          throw new Error('Customer not found');
        }

        // Check if sale exists if provided
        if (receiptData.sale_id) {
          const sale = queryOne('SELECT id FROM sales WHERE id = ?', [receiptData.sale_id]);
          if (!sale) {
            throw new Error('Sale not found');
          }
        }

        // Generate receipt number if not provided
        if (!receiptData.receipt_number) {
          receiptData.receipt_number = generateReceiptNumber('CR');
        }

        // Generate barcode if not provided
        if (!receiptData.barcode) {
          receiptData.barcode = generateReceiptBarcode('customer');
        }

        // Validate receipt number uniqueness
        const existingReceipt = queryOne(
          'SELECT id FROM customer_receipts WHERE receipt_number = ?',
          [receiptData.receipt_number]
        );

        if (existingReceipt) {
          throw new Error('Receipt number already exists');
        }

        // Insert receipt
        const receiptId = insert(
          `INSERT INTO customer_receipts (
            receipt_number, barcode, customer_id, sale_id, receipt_date,
            amount, payment_method, reference_number, notes, created_by, money_box_id,
            delegate_id, employee_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            receiptData.receipt_number,
            receiptData.barcode,
            receiptData.customer_id,
            receiptData.sale_id || null,
            receiptData.receipt_date,
            receiptData.amount,
            receiptData.payment_method || 'cash',
            receiptData.reference_number || null,
            receiptData.notes || null,
            userId,
            receiptData.money_box_id || null,
            receiptData.delegate_id || null,
            receiptData.employee_id || null
          ]
        );

        // Update sale paid amount if sale_id is provided
        if (receiptData.sale_id && !receiptData.skipSaleUpdate) {
          const sale = queryOne('SELECT paid_amount, total_amount FROM sales WHERE id = ?', [receiptData.sale_id]);
          if (sale) {
            const newPaidAmount = sale.paid_amount + receiptData.amount;
            const newRemainingAmount = Math.max(0, sale.total_amount - newPaidAmount);
            
            update(`
              UPDATE sales 
              SET paid_amount = ?, payment_status = ?
              WHERE id = ?
            `, [
              newPaidAmount,
              newRemainingAmount === 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'unpaid',
              receiptData.sale_id
            ]);
          }
        }

        // Update customer current_balance
        const customerBalance = queryOne('SELECT current_balance FROM customers WHERE id = ?', [receiptData.customer_id]);
        if (customerBalance) {
          let amountToAddToBalance = 0; // Default to 0
          
          // If sale_id is provided and NOT skipSaleUpdate, check if there's excess amount after paying the sale
          if (receiptData.sale_id && !receiptData.skipSaleUpdate) {
            const sale = queryOne('SELECT paid_amount, total_amount FROM sales WHERE id = ?', [receiptData.sale_id]);
            if (sale) {
              const newPaidAmount = sale.paid_amount + receiptData.amount;
              const excessAmount = Math.max(0, newPaidAmount - sale.total_amount);
              amountToAddToBalance = excessAmount;
            }
          } else if (!receiptData.sale_id) {
            // For new receipts (no sale_id), add full amount to customer balance
            amountToAddToBalance = receiptData.amount;
          } else if (receiptData.sale_id && receiptData.skipSaleUpdate && receiptData.excess_amount !== null && receiptData.excess_amount !== undefined) {
            // For installment/debt payments with excess amount, add only the excess to customer balance
            amountToAddToBalance = receiptData.excess_amount;
            logger.info(`=== EXCESS AMOUNT DEBUG ===`);
            logger.info(`Receipt type: Installment/Debt payment with excess`);
            logger.info(`Excess amount: ${receiptData.excess_amount}`);
            logger.info(`Amount to add to balance: ${amountToAddToBalance}`);
            logger.info(`==============================`);
          }
          // For installment/debt payments without excess, amountToAddToBalance remains 0
          
          // Add amount to customer balance (only for new receipts or excess amounts from sale payments)
          logger.info(`=== CUSTOMER BALANCE UPDATE DEBUG ===`);
          logger.info(`Amount to add to balance: ${amountToAddToBalance}`);
          logger.info(`Current customer balance: ${customerBalance.current_balance || 0}`);
          logger.info(`Will update balance: ${amountToAddToBalance > 0}`);
          logger.info(`==============================`);
          
          if (amountToAddToBalance > 0) {
            const newBalance = (customerBalance.current_balance || 0) + amountToAddToBalance;
            logger.info(`New balance will be: ${newBalance}`);
            update(`
              UPDATE customers 
              SET current_balance = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `, [newBalance, receiptData.customer_id]);
            
            // Invalidate customer cache to reflect the updated balance
            try {
              cacheService.invalidatePattern('customers:*');
              cacheService.del(`customers:${receiptData.customer_id}`);
              cacheService.del('customers:all');
            } catch (error) {
              logger.error('Error invalidating customer cache:', error);
              // Don't throw error here, just log it
            }
          }
        }

        return { receiptId, receiptNumber: receiptData.receipt_number };
      });

      // Add money box transaction based on selection (outside transaction block)
      logger.info(`=== CUSTOMER RECEIPT DEBUG ===`);
      logger.info(`Full receiptData: ${JSON.stringify(receiptData)}`);
      logger.info(`money_box_id: ${receiptData.money_box_id}`);
      logger.info(`money_box_id type: ${typeof receiptData.money_box_id}`);
      logger.info(`money_box_id truthy check: ${!!receiptData.money_box_id}`);
      logger.info(`money_box_id !== 'cash_box': ${receiptData.money_box_id !== 'cash_box'}`);
      logger.info(`amount: ${receiptData.amount}`);
      logger.info(`==============================`);
      const receiptResult = receipt; // Store the transaction result
      if (receiptData.money_box_id && receiptData.money_box_id !== 'cash_box') {
        // Add to specific money box only
        logger.info(`✅ Adding to SPECIFIC money box: ${receiptData.money_box_id}`);
        try {
          await moneyBoxesService.addTransaction(
            receiptData.money_box_id,
            'customer_receipt',
            receiptData.amount,
            `إيصال قبض من العميل - ${receiptData.receipt_number}`,
            userId,
            null
          );
        } catch (error) {
          logger.error('Error adding money box transaction for customer receipt:', error);
          // Don't throw error here, just log it
        }
      } else {
        // Add to main cash box only (when cash_box is selected or no selection)
        logger.info(`✅ Adding to MAIN cash box (money_box_id: ${receiptData.money_box_id})`);
        try {
          // Get user's open cash box
          const userCashBox = await cashBoxService.getUserCashBox(userId);
          if (userCashBox) {
            await cashBoxService.addCustomerReceiptTransaction(
              userCashBox.id,
              userId,
              receiptData.amount,
              receiptResult.receiptId,
              `إيصال قبض من العميل - ${receiptData.receipt_number}`
            );
          }
        } catch (error) {
          logger.error('Error adding cash box transaction for customer receipt:', error);
          // Don't throw error here, just log it
        }
      }

      // Invalidate customer receipts cache
      try {
        cacheService.invalidatePattern('customer_receipts:*');
        cacheService.del('customer_receipts:all');
      } catch (error) {
        logger.error('Error invalidating customer receipts cache:', error);
        // Don't throw error here, just log it
      }

      return this.getById(receiptResult.receiptId);
    } catch (error) {
      logger.error('Error creating customer receipt:', error);
      if (error.message.includes('not found') || error.message.includes('already exists') || error.message.includes('Invalid amount')) {
        throw error;
      }
      throw new Error('حدث خطأ أثناء إنشاء إيصال الدفع');
    }
  }

  // Update receipt
  update(id, receiptData, userId) {
    try {
      return transaction(() => {
        // Get current receipt
        const currentReceipt = this.getById(id);
        if (!currentReceipt) {
          throw new Error('Receipt not found');
        }

        // Validate required fields
        if (receiptData.customer_id) {
          const customer = queryOne('SELECT id FROM customers WHERE id = ?', [receiptData.customer_id]);
          if (!customer) {
            throw new Error('Customer not found');
          }
        }

        if (receiptData.sale_id) {
          const sale = queryOne('SELECT id FROM sales WHERE id = ?', [receiptData.sale_id]);
          if (!sale) {
            throw new Error('Sale not found');
          }
        }

        if (receiptData.amount !== undefined && receiptData.amount <= 0) {
          throw new Error('Invalid amount');
        }

        // Check if receipt number is being changed and if it's unique
        if (receiptData.receipt_number && receiptData.receipt_number !== currentReceipt.receipt_number) {
          const existingReceipt = queryOne(
            'SELECT id FROM customer_receipts WHERE receipt_number = ? AND id != ?',
            [receiptData.receipt_number, id]
          );

          if (existingReceipt) {
            throw new Error('Receipt number already exists');
          }
        }

        // Update receipt
        const updateQuery = `
          UPDATE customer_receipts 
          SET receipt_number = ?, customer_id = ?, sale_id = ?, receipt_date = ?,
              amount = ?, payment_method = ?, reference_number = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;

        update(updateQuery, [
          receiptData.receipt_number || currentReceipt.receipt_number,
          receiptData.customer_id || currentReceipt.customer_id,
          receiptData.sale_id || currentReceipt.sale_id,
          receiptData.receipt_date || currentReceipt.receipt_date,
          receiptData.amount || currentReceipt.amount,
          receiptData.payment_method || currentReceipt.payment_method,
          receiptData.reference_number || currentReceipt.reference_number,
          receiptData.notes || currentReceipt.notes,
          id
        ]);

        // Handle sale amount updates if amount or sale_id changed
        if (receiptData.amount !== undefined || receiptData.sale_id !== undefined) {
          // Revert previous sale updates
          if (currentReceipt.sale_id) {
            const oldSale = queryOne('SELECT paid_amount, total_amount FROM sales WHERE id = ?', [currentReceipt.sale_id]);
            if (oldSale) {
              const newPaidAmount = Math.max(0, oldSale.paid_amount - currentReceipt.amount);
              const newRemainingAmount = oldSale.total_amount - newPaidAmount;
              
              update(`
                UPDATE sales 
                SET paid_amount = ?, payment_status = ?
                WHERE id = ?
              `, [
                newPaidAmount,
                newPaidAmount === 0 ? 'unpaid' : newRemainingAmount === 0 ? 'paid' : 'partial',
                currentReceipt.sale_id
              ]);
            }
          }

          // Apply new sale updates
          const newSaleId = receiptData.sale_id || currentReceipt.sale_id;
          const newAmount = receiptData.amount || currentReceipt.amount;
          
          if (newSaleId) {
            const newSale = queryOne('SELECT paid_amount, total_amount FROM sales WHERE id = ?', [newSaleId]);
            if (newSale) {
              const newPaidAmount = newSale.paid_amount + newAmount;
              const newRemainingAmount = Math.max(0, newSale.total_amount - newPaidAmount);
              
              update(`
                UPDATE sales 
                SET paid_amount = ?, payment_status = ?
                WHERE id = ?
              `, [
                newPaidAmount,
                newRemainingAmount === 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'unpaid',
                newSaleId
              ]);
            }
          }
        }

        return this.getById(id);
      });
      
      // Invalidate caches after update
      try {
        cacheService.invalidatePattern('customer_receipts:*');
        cacheService.del('customer_receipts:all');
        cacheService.invalidatePattern('customers:*');
      } catch (error) {
        logger.error('Error invalidating cache after update:', error);
        // Don't throw error here, just log it
      }
    } catch (error) {
      logger.error('Error updating customer receipt:', error);
      if (error.message.includes('not found') || error.message.includes('already exists') || error.message.includes('Invalid amount')) {
        throw error;
      }
      throw new Error('حدث خطأ أثناء تحديث إيصال الدفع');
    }
  }

  // Delete receipt
  delete(id, userId) {
    try {
      return transaction(() => {
        const receipt = this.getById(id);
        if (!receipt) {
          throw new Error('Receipt not found');
        }

        // Revert sale updates
        if (receipt.sale_id) {
          const sale = queryOne('SELECT paid_amount, total_amount FROM sales WHERE id = ?', [receipt.sale_id]);
          if (sale) {
            const newPaidAmount = Math.max(0, sale.paid_amount - receipt.amount);
            const newRemainingAmount = sale.total_amount - newPaidAmount;
            
            update(`
              UPDATE sales 
              SET paid_amount = ?, payment_status = ?
              WHERE id = ?
            `, [
              newPaidAmount,
              newPaidAmount === 0 ? 'unpaid' : newRemainingAmount === 0 ? 'paid' : 'partial',
              receipt.sale_id
            ]);
          }
        }

        // Delete receipt
        const result = update('DELETE FROM customer_receipts WHERE id = ?', [id]);
        
        if (result.changes === 0) {
          throw new Error('Receipt not found');
        }

        return { message: 'Receipt deleted successfully' };
      });
      
      // Invalidate caches after delete
      try {
        cacheService.invalidatePattern('customer_receipts:*');
        cacheService.del('customer_receipts:all');
        cacheService.invalidatePattern('customers:*');
      } catch (error) {
        logger.error('Error invalidating cache after delete:', error);
        // Don't throw error here, just log it
      }
    } catch (error) {
      logger.error('Error deleting customer receipt:', error);
      if (error.message.includes('not found')) {
        throw error;
      }
      throw new Error('حدث خطأ أثناء حذف إيصال الدفع');
    }
  }

  // Get customer receipt summary
  getCustomerSummary(customerId) {
    try {
      const sqlQuery = `
        SELECT 
          COUNT(*) as total_receipts,
          SUM(amount) as total_amount,
          MIN(receipt_date) as first_receipt_date,
          MAX(receipt_date) as last_receipt_date
        FROM customer_receipts 
        WHERE customer_id = ?
      `;

      return queryOne(sqlQuery, [customerId]);
    } catch (error) {
      logger.error('Error getting customer receipt summary:', error);
      throw error;
    }
  }

  // Get receipt statistics with optimized queries
  getStatistics(filters = {}) {
    try {
      let whereConditions = ['1=1'];
      const params = [];

      // Apply filters
      if (filters.customer_id) {
        whereConditions.push('cr.customer_id = ?');
        params.push(filters.customer_id);
      }

      if (filters.payment_method) {
        whereConditions.push('cr.payment_method = ?');
        params.push(filters.payment_method);
      }

      if (filters.date_from) {
        whereConditions.push('cr.receipt_date >= ?');
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        whereConditions.push('cr.receipt_date <= ?');
        params.push(filters.date_to);
      }

      const whereClause = whereConditions.join(' AND ');

      // Optimized statistics query using single query with aggregations
      const statsQuery = `
        SELECT 
          COUNT(*) as total_receipts,
          COALESCE(SUM(cr.amount), 0) as total_amount,
          COALESCE(AVG(cr.amount), 0) as average_amount,
          COALESCE(MIN(cr.amount), 0) as min_amount,
          COALESCE(MAX(cr.amount), 0) as max_amount,
          COUNT(DISTINCT cr.customer_id) as unique_customers
        FROM ${this.tableName} cr
        WHERE ${whereClause}
      `;

      const stats = queryOne(statsQuery, params);

      return {
        total_receipts: stats.total_receipts || 0,
        total_amount: stats.total_amount || 0,
        average_amount: Math.round((stats.average_amount || 0) * 100) / 100,
        min_amount: stats.min_amount || 0,
        max_amount: stats.max_amount || 0,
        unique_customers: stats.unique_customers || 0
      };
    } catch (error) {
      logger.error('Error getting customer receipt statistics:', error);
      throw error;
    }
  }

  // Get customer debts (unpaid and partially paid sales)
  getCustomerDebts(customerId) {
    try {
      const sqlQuery = `
        SELECT 
          s.id,
          s.invoice_no,
          s.invoice_date,
          s.due_date,
          s.total_amount,
          s.paid_amount,
          (s.total_amount - s.paid_amount) as remaining_amount,
          s.payment_status,
          s.notes,
          c.name as customer_name,
          c.phone as customer_phone
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        WHERE s.customer_id = ? AND (s.payment_status = 'unpaid' OR s.payment_status = 'partial')
        ORDER BY s.due_date ASC, s.invoice_date DESC
      `;

      return query(sqlQuery, [customerId]);
    } catch (error) {
      logger.error('Error getting customer debts:', error);
      throw error;
    }
  }

  // Get customer bills (all sales)
  getCustomerBills(customerId) {
    try {
      const sqlQuery = `
        SELECT 
          s.id,
          s.invoice_no,
          s.invoice_date,
          s.due_date,
          s.total_amount,
          s.paid_amount,
          (s.total_amount - s.paid_amount) as remaining_amount,
          s.payment_status,
          s.status,
          s.notes,
          c.name as customer_name,
          c.phone as customer_phone,
          u.name as created_by_name
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN users u ON s.created_by = u.id
        WHERE s.customer_id = ?
        ORDER BY s.invoice_date DESC
      `;

      return query(sqlQuery, [customerId]);
    } catch (error) {
      logger.error('Error getting customer bills:', error);
      throw error;
    }
  }

  // Get customer financial summary with optimized queries
  getCustomerFinancialSummary(customerId) {
    try {
      // First get customer details
      const customerQuery = `
        SELECT 
          id, name, phone, email
        FROM customers 
        WHERE id = ?
      `;
      
      const customer = queryOne(customerQuery, [customerId]);
      
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Get financial summary with detailed counts
      const summaryQuery = `
        SELECT 
          -- Sales summary
          COUNT(s.id) as total_bills_count,
          COALESCE(SUM(s.total_amount), 0) as total_bills,
          COALESCE(SUM(s.paid_amount), 0) as total_paid,
          COALESCE(SUM(s.total_amount - s.paid_amount), 0) as total_debt,
          
          -- Payment status counts
          COUNT(CASE WHEN s.payment_status = 'paid' THEN 1 END) as paid_bills_count,
          COUNT(CASE WHEN s.payment_status = 'unpaid' OR s.payment_status = 'partial' THEN 1 END) as unpaid_bills_count
        FROM customers c
        LEFT JOIN sales s ON c.id = s.customer_id
        WHERE c.id = ?
        GROUP BY c.id
      `;

      const summary = queryOne(summaryQuery, [customerId]);

      if (!summary) {
        return {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          total_bills: 0,
          total_paid: 0,
          total_debt: 0,
          total_bills_count: 0,
          unpaid_bills_count: 0,
          paid_bills_count: 0
        };
      }

      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        total_bills: summary.total_bills || 0,
        total_paid: summary.total_paid || 0,
        total_debt: summary.total_debt || 0,
        total_bills_count: summary.total_bills_count || 0,
        unpaid_bills_count: summary.unpaid_bills_count || 0,
        paid_bills_count: summary.paid_bills_count || 0
      };
    } catch (error) {
      logger.error('Error getting customer financial summary:', error);
      throw error;
    }
  }
}

module.exports = new CustomerReceiptsService(); 