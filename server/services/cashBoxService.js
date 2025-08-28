const { db, query, queryOne, insert, update, transaction } = require('../database');
const logger = require('../utils/logger');
const moneyBoxesService = require('./moneyBoxesService');

class CashBoxService {
  // Get user's current cash box
  async getUserCashBox(userId) {
    try {
      const cashBox = queryOne(`
        SELECT cb.*, u.name as user_name, u.username
        FROM cash_boxes cb
        JOIN users u ON cb.user_id = u.id
        WHERE cb.user_id = ? AND cb.status = 'open'
        ORDER BY cb.opened_at DESC
        LIMIT 1
      `, [userId]);
      
      return cashBox;
    } catch (error) {
      logger.error('Error getting user cash box:', error);
      throw error;
    }
  }

  // Get user's cash box settings
  async getUserCashBoxSettings(userId) {
    try {
      let settings = queryOne('SELECT * FROM user_cash_box_settings WHERE user_id = ?', [userId]);
      
      if (!settings) {
        // Create default settings
        insert(`
          INSERT INTO user_cash_box_settings (user_id, default_opening_amount, require_opening_amount, require_closing_count, allow_negative_balance, max_withdrawal_amount, require_approval_for_withdrawal, auto_close_at_end_of_day, auto_close_time)
          VALUES (?, 0, 1, 1, 0, 0, 0, 0, '23:59:59')
        `, [userId]);
        
        settings = queryOne('SELECT * FROM user_cash_box_settings WHERE user_id = ?', [userId]);
      }
      
      return settings;
    } catch (error) {
      logger.error('Error getting user cash box settings:', error);
      throw error;
    }
  }

  // Open cash box
  async openCashBox(userId, openingAmount = 0, notes = '') {
    try {
      // Check if user already has an open cash box
      const existingCashBox = await this.getUserCashBox(userId);
      if (existingCashBox) {
        throw new Error('User already has an open cash box');
      }

      // Get user info
      const user = queryOne('SELECT * FROM users WHERE id = ?', [userId]);
      if (!user) {
        throw new Error('User not found');
      }

      // Create new cash box
      const cashBoxId = insert(`
        INSERT INTO cash_boxes (user_id, name, initial_amount, current_amount, status, opened_at, opened_by, notes)
        VALUES (?, ?, ?, ?, 'open', CURRENT_TIMESTAMP, ?, ?)
      `, [userId, `${user.name} - صندوق`, openingAmount, openingAmount, userId, notes]);

      // Record opening transaction
      if (openingAmount > 0) {
        insert(`
          INSERT INTO cash_box_transactions (cash_box_id, user_id, transaction_type, amount, balance_before, balance_after, reference_type, description, notes)
          VALUES (?, ?, 'opening', ?, 0, ?, 'opening', 'فتح الصندوق', ?)
        `, [cashBoxId, userId, openingAmount, openingAmount, notes]);
      }

      return this.getCashBoxById(cashBoxId);
    } catch (error) {
      logger.error('Error opening cash box:', error);
      throw error;
    }
  }

  // Close cash box
  async closeCashBox(userId, closingAmount, notes = '') {
    try {
      const cashBox = await this.getUserCashBox(userId);
      if (!cashBox) {
        throw new Error('No open cash box found');
      }

      // Update cash box status
      update(`
        UPDATE cash_boxes 
        SET status = 'closed', closed_at = CURRENT_TIMESTAMP, closed_by = ?, notes = ?
        WHERE id = ?
      `, [userId, notes, cashBox.id]);

      // Record closing transaction only if there's a difference
      const difference = closingAmount - cashBox.current_amount;
      if (difference !== 0) {
        insert(`
          INSERT INTO cash_box_transactions (cash_box_id, user_id, transaction_type, amount, balance_before, balance_after, reference_type, description, notes)
          VALUES (?, ?, 'closing', ?, ?, ?, 'closing', 'إغلاق الصندوق', ?)
        `, [cashBox.id, userId, difference, cashBox.current_amount, closingAmount, notes]);
      }

      return this.getCashBoxById(cashBox.id);
    } catch (error) {
      logger.error('Error closing cash box:', error);
      throw error;
    }
  }

  // Add transaction to cash box - Enhanced with specific FK columns
  async addTransaction(cashBoxId, userId, transactionType, amount, referenceType, referenceId = null, description = '', notes = '', specificRefs = {}) {
    try {
      // Validate amount is not zero
      if (amount === 0) {
        throw new Error('Transaction amount cannot be zero');
      }

      const cashBox = queryOne('SELECT * FROM cash_boxes WHERE id = ?', [cashBoxId]);
      if (!cashBox) {
        throw new Error('Cash box not found');
      }

      if (cashBox.status !== 'open') {
        throw new Error('Cash box is not open');
      }

      const balanceBefore = cashBox.current_amount;
      let balanceAfter = balanceBefore;

      // Calculate new balance based on transaction type
      switch (transactionType) {
        case 'deposit':
        case 'sale':
        case 'customer_receipt':
        case 'purchase_return':
        case 'cash_deposit':
        case 'transfer_from':
        case 'transfer_from_cash_box':
        case 'transfer_from_daily_box':
        case 'transfer_from_money_box':
        case 'expense_reversal':
          balanceAfter += amount;
          break;
        case 'withdrawal':
        case 'purchase':
        case 'expense':
        case 'expense_update':
        case 'supplier_payment':
        case 'sale_return':
        case 'transfer_to_cashier':
        case 'transfer_to_money_box':
        case 'transfer_to_bank':
        case 'cash_box_closing':
          balanceAfter -= amount;
          break;
        case 'adjustment':
          balanceAfter = amount; // Direct adjustment
          break;
        default:
          throw new Error('Invalid transaction type');
      }

      // Check for negative balance if not allowed
      const settings = await this.getUserCashBoxSettings(cashBox.user_id);
      if (balanceAfter < 0 && !settings.allow_negative_balance) {
        throw new Error('Transaction would result in negative balance');
      }

      // Update cash box balance
      update('UPDATE cash_boxes SET current_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [balanceAfter, cashBoxId]);

      // Record transaction with specific FK columns for better data integrity
      const {
        sale_id = null,
        purchase_id = null,
        expense_id = null,
        customer_receipt_id = null,
        supplier_receipt_id = null
      } = specificRefs;

      const transactionId = insert(`
        INSERT INTO cash_box_transactions (
          cash_box_id, user_id, transaction_type, amount, balance_before, balance_after, 
          reference_type, reference_id, sale_id, purchase_id, expense_id, 
          customer_receipt_id, supplier_receipt_id, description, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        cashBoxId, userId, transactionType, amount, balanceBefore, balanceAfter, 
        referenceType, referenceId, sale_id, purchase_id, expense_id, 
        customer_receipt_id, supplier_receipt_id, description, notes
      ]);

      return {
        success: true,
        balanceBefore,
        balanceAfter,
        transactionId
      };
    } catch (error) {
      logger.error('Error adding transaction:', error);
      throw error;
    }
  }

  // Helper method to create cash box transaction for sales
  async addSaleTransaction(cashBoxId, userId, amount, saleId, description = '') {
    return this.addTransaction(
      cashBoxId, userId, 'sale', amount, 'sale', saleId, description, '',
      { sale_id: saleId }
    );
  }

  // Helper method to create cash box transaction for purchases
  async addPurchaseTransaction(cashBoxId, userId, amount, purchaseId, description = '') {
    return this.addTransaction(
      cashBoxId, userId, 'purchase', amount, 'purchase', purchaseId, description, '',
      { purchase_id: purchaseId }
    );
  }

  // Helper method to create cash box transaction for customer receipts
  async addCustomerReceiptTransaction(cashBoxId, userId, amount, receiptId, description = '') {
    return this.addTransaction(
      cashBoxId, userId, 'customer_receipt', amount, 'customer_receipt', receiptId, description, '',
      { customer_receipt_id: receiptId }
    );
  }

  // Helper method to create cash box transaction for supplier receipts
  async addSupplierReceiptTransaction(cashBoxId, userId, amount, receiptId, description = '') {
    return this.addTransaction(
      cashBoxId, userId, 'supplier_payment', amount, 'supplier_payment', receiptId, description, '',
      { supplier_receipt_id: receiptId }
    );
  }

  // Helper method to create cash box transaction for expenses
  async addExpenseTransaction(cashBoxId, userId, amount, expenseId, description = '') {
    return this.addTransaction(
      cashBoxId, userId, 'expense', amount, 'expense', expenseId, description, '',
      { expense_id: expenseId }
    );
  }

  // Helper method to create cash box transaction for returns (refunds)
  async addReturnTransaction(cashBoxId, userId, amount, returnId, returnType, description = '') {
    const transactionType = returnType === 'sale' ? 'sale_return' : 'purchase_return';
    const referenceType = returnType === 'sale' ? 'sale_return' : 'purchase_return';
    
    return this.addTransaction(
      cashBoxId, userId, transactionType, -Math.abs(amount), referenceType, returnId, description, '',
      { return_id: returnId, return_type: returnType }
    );
  }

  // Get cash box by ID
  async getCashBoxById(cashBoxId) {
    try {
      const cashBox = queryOne(`
        SELECT cb.*, u.name as user_name, u.username,
               opener.name as opened_by_name,
               closer.name as closed_by_name
        FROM cash_boxes cb
        JOIN users u ON cb.user_id = u.id
        LEFT JOIN users opener ON cb.opened_by = opener.id
        LEFT JOIN users closer ON cb.closed_by = closer.id
        WHERE cb.id = ?
      `, [cashBoxId]);
      
      return cashBox;
    } catch (error) {
      logger.error('Error getting cash box by ID:', error);
      throw error;
    }
  }

  // Get cash box transactions
  async getCashBoxTransactions(cashBoxId, limit = 50, offset = 0) {
    try {
      const transactions = query(`
        SELECT cbt.*, u.name as user_name
        FROM cash_box_transactions cbt
        JOIN users u ON cbt.user_id = u.id
        WHERE cbt.cash_box_id = ?
        ORDER BY cbt.created_at DESC
        LIMIT ? OFFSET ?
      `, [cashBoxId, limit, offset]);
      
      return transactions;
    } catch (error) {
      logger.error('Error getting cash box transactions:', error);
      throw error;
    }
  }

  // Get user's cash box history
  async getUserCashBoxHistory(userId, limit = 20, offset = 0) {
    try {
      const cashBoxes = query(`
        SELECT cb.*, u.name as user_name,
               opener.name as opened_by_name,
               closer.name as closed_by_name
        FROM cash_boxes cb
        JOIN users u ON cb.user_id = u.id
        LEFT JOIN users opener ON cb.opened_by = opener.id
        LEFT JOIN users closer ON cb.closed_by = closer.id
        WHERE cb.user_id = ?
        ORDER BY cb.created_at DESC
        LIMIT ? OFFSET ?
      `, [userId, limit, offset]);
      
      return cashBoxes;
    } catch (error) {
      logger.error('Error getting user cash box history:', error);
      throw error;
    }
  }

  // Update user cash box settings
  async updateUserCashBoxSettings(userId, settings) {
    try {
      // Convert booleans to integers for SQLite
      const toInt = v => v === true ? 1 : 0;
      const updateFields = {
        default_opening_amount: settings.default_opening_amount ?? 0,
        require_opening_amount: toInt(settings.require_opening_amount),
        require_closing_count: toInt(settings.require_closing_count),
        allow_negative_balance: toInt(settings.allow_negative_balance),
        max_withdrawal_amount: settings.max_withdrawal_amount ?? 0,
        require_approval_for_withdrawal: toInt(settings.require_approval_for_withdrawal),
        auto_close_at_end_of_day: toInt(settings.auto_close_at_end_of_day),
        auto_close_time: settings.auto_close_time ?? '23:59:59',
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };
      update(`
        UPDATE user_cash_box_settings
        SET default_opening_amount = ?,
            require_opening_amount = ?,
            require_closing_count = ?,
            allow_negative_balance = ?,
            max_withdrawal_amount = ?,
            require_approval_for_withdrawal = ?,
            auto_close_at_end_of_day = ?,
            auto_close_time = ?,
            updated_at = ?
        WHERE user_id = ?
      `, [
        updateFields.default_opening_amount,
        updateFields.require_opening_amount,
        updateFields.require_closing_count,
        updateFields.allow_negative_balance,
        updateFields.max_withdrawal_amount,
        updateFields.require_approval_for_withdrawal,
        updateFields.auto_close_at_end_of_day,
        updateFields.auto_close_time,
        updateFields.updated_at,
        userId
      ]);
      return this.getUserCashBoxSettings(userId);
    } catch (error) {
      logger.error('Error updating user cash box settings:', error);
      throw error;
    }
  }

  // Get cash box summary for dashboard
  async getCashBoxSummary(userId) {
    try {
      const cashBox = await this.getUserCashBox(userId);
      if (!cashBox) {
        return {
          hasOpenCashBox: false,
          currentAmount: 0,
          todayTransactions: 0,
          todayAmount: 0
        };
      }

      // Get today's transactions
      const todayTransactions = queryOne(`
        SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
        FROM cash_box_transactions
        WHERE cash_box_id = ? AND DATE(created_at) = DATE('now')
      `, [cashBox.id]);

      return {
        hasOpenCashBox: true,
        cashBoxId: cashBox.id,
        currentAmount: cashBox.current_amount,
        openedAt: cashBox.opened_at,
        todayTransactions: todayTransactions.count,
        todayAmount: todayTransactions.total
      };
    } catch (error) {
      logger.error('Error getting cash box summary:', error);
      throw error;
    }
  }

  // Admin: Get all open cash boxes
  async getAllOpenCashBoxes() {
    try {
      const cashBoxes = query(`
        SELECT 
          cb.*,
          u.name as user_name,
          u.username,
          u.email
        FROM cash_boxes cb
        JOIN users u ON cb.user_id = u.id
        WHERE cb.status = 'open'
        ORDER BY cb.opened_at ASC
      `);
      
      return cashBoxes;
    } catch (error) {
      logger.error('Error getting all open cash boxes:', error);
      throw new Error('حدث خطأ أثناء جلب الصناديق المفتوحة');
    }
  }

  // Admin: Force close cash box
  async forceCloseCashBox(cashBoxId, adminUserId, reason = '', moneyBoxId = null) {
    try {
      const cashBox = queryOne('SELECT * FROM cash_boxes WHERE id = ?', [cashBoxId]);
      
      if (!cashBox) {
        throw new Error('Cash box not found');
      }
      
      if (cashBox.status === 'closed') {
        throw new Error('Cash box is already closed');
      }

      // Update cash box status
      update(`
        UPDATE cash_boxes 
        SET status = 'closed', closed_at = CURRENT_TIMESTAMP, closed_by = ?, notes = ?
        WHERE id = ?
      `, [adminUserId, reason, cashBoxId]);

      // Record closing transaction - use the actual amount instead of 0
      if (cashBox.current_amount > 0) {
        insert(`
          INSERT INTO cash_box_transactions (cash_box_id, user_id, transaction_type, amount, balance_before, balance_after, reference_type, description, notes)
          VALUES (?, ?, 'closing', ?, ?, 0, 'closing', 'إغلاق إجباري بواسطة المدير', ?)
        `, [cashBoxId, adminUserId, cashBox.current_amount, cashBox.current_amount, reason]);
      }

      // If money box is specified and cash box has money, transfer it
      if (moneyBoxId && cashBox.current_amount > 0) {
        try {
          logger.info(`Attempting to transfer ${cashBox.current_amount} from cash box ${cashBoxId} to money box ${moneyBoxId}`);
          
          // Add transaction to the specified money box
          await moneyBoxesService.addTransaction(
            parseInt(moneyBoxId),
            'deposit',
            cashBox.current_amount,
            `تحويل من صندوق نقدي مغلق - ${cashBox.name}`,
            adminUserId
          );
          
          logger.info(`Successfully transferred ${cashBox.current_amount} from closed cash box ${cashBoxId} to money box ${moneyBoxId}`);
        } catch (transferError) {
          logger.error('Error transferring money from closed cash box:', transferError);
          // Don't fail the entire operation if transfer fails
        }
      } else {
        logger.info(`No transfer needed: moneyBoxId=${moneyBoxId}, cashBoxAmount=${cashBox.current_amount}`);
      }

      return this.getCashBoxById(cashBoxId);
    } catch (error) {
      logger.error('Error force closing cash box:', error);
      if (error.message.includes('not found')) {
        throw new Error('الصندوق غير موجود');
      }
      if (error.message.includes('already closed')) {
        throw new Error('الصندوق مغلق بالفعل');
      }
      throw new Error('حدث خطأ أثناء إغلاق الصندوق إجبارياً');
    }
  }

  // Admin: Get all users cash box history
  async getAllUsersCashBoxHistory(limit = 50, offset = 0) {
    try {
      const history = query(`
        SELECT 
          cb.*,
          u.name as user_name,
          u.username,
          u.email,
          opened_by_user.name as opened_by_name,
          closed_by_user.name as closed_by_name
        FROM cash_boxes cb
        JOIN users u ON cb.user_id = u.id
        LEFT JOIN users opened_by_user ON cb.opened_by = opened_by_user.id
        LEFT JOIN users closed_by_user ON cb.closed_by = closed_by_user.id
        ORDER BY cb.opened_at DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);
      
      return history;
    } catch (error) {
      logger.error('Error getting all users cash box history:', error);
      throw new Error('حدث خطأ أثناء جلب تاريخ صناديق المستخدمين');
    }
  }

  // Money Box Integration Methods

  // Get daily money box (الصندوق اليومي)
  async getDailyMoneyBox() {
    try {
      const dailyBox = await moneyBoxesService.getMoneyBoxByName('الصندوق اليومي');
      return dailyBox;
    } catch (error) {
      logger.error('Error getting daily money box:', error);
      throw error;
    }
  }

  // Transfer from cash box to daily money box
  async transferToDailyMoneyBox(cashBoxId, userId, amount, notes = '') {
    try {
      const dailyBox = await this.getDailyMoneyBox();
      if (!dailyBox) {
        throw new Error('Daily money box not found');
      }

      // First, add transaction to cash box (withdrawal)
      await this.addTransaction(
        cashBoxId, 
        userId, 
        'withdrawal', 
        amount, 
        'manual', 
        null, 
        'تحويل إلى الصندوق اليومي', 
        notes
      );

      // Then, add transaction to daily money box (deposit)
      await moneyBoxesService.addTransaction(
        dailyBox.id, 
        'transfer_from_cash_box', 
        amount, 
        `تحويل من صندوق نقدي: ${notes}`, 
        userId
      );

      return {
        success: true,
        message: 'تم التحويل إلى الصندوق اليومي بنجاح',
        cashBoxTransaction: { amount, type: 'withdrawal' },
        moneyBoxTransaction: { amount, type: 'deposit' }
      };
    } catch (error) {
      logger.error('Error transferring to daily money box:', error);
      throw error;
    }
  }

  // Transfer from daily money box to cash box
  async transferFromDailyMoneyBox(cashBoxId, userId, amount, notes = '') {
    try {
      const dailyBox = await this.getDailyMoneyBox();
      if (!dailyBox) {
        throw new Error('Daily money box not found');
      }

      // First, add transaction to daily money box (withdrawal)
      await moneyBoxesService.addTransaction(
        dailyBox.id, 
        'transfer_to_cashier', 
        amount, 
        `تحويل إلى القاصة: ${notes}`, 
        userId
      );

      // Then, add transaction to cash box (deposit)
      await this.addTransaction(
        cashBoxId, 
        userId, 
        'deposit', 
        amount, 
        'manual', 
        null, 
        'تحويل من الصندوق اليومي', 
        notes
      );

      return {
        success: true,
        message: 'تم التحويل من الصندوق اليومي بنجاح',
        cashBoxTransaction: { amount, type: 'deposit' },
        moneyBoxTransaction: { amount, type: 'withdrawal' }
      };
    } catch (error) {
      logger.error('Error transferring from daily money box:', error);
      throw error;
    }
  }

  // Transfer to custom money box
  async transferToCustomMoneyBox(cashBoxId, userId, amount, moneyBoxName, notes = '') {
    try {
      const moneyBox = await moneyBoxesService.getMoneyBoxByName(moneyBoxName);
      if (!moneyBox) {
        throw new Error(`Money box "${moneyBoxName}" not found`);
      }

      // First, add transaction to cash box (withdrawal)
      const cashBoxTransaction = await this.addTransaction(
        cashBoxId, 
        userId, 
        'withdrawal', 
        amount, 
        'manual', 
        null, 
        `تحويل إلى ${moneyBoxName}`, 
        notes
      );

      // Then, add transaction to money box (deposit)
      await moneyBoxesService.addTransaction(
        moneyBox.id, 
        'transfer_from_cash_box', 
        amount, 
        `تحويل من صندوق نقدي: ${notes}`, 
        userId
      );

      return {
        success: true,
        message: `تم التحويل إلى ${moneyBoxName} بنجاح`,
        cashBoxTransaction: cashBoxTransaction,
        moneyBoxTransaction: { amount, type: 'deposit' }
      };
    } catch (error) {
      logger.error('Error transferring to custom money box:', error);
      throw error;
    }
  }

  // Get cash box with money box integration summary
  async getCashBoxWithMoneyBoxSummary(userId) {
    try {
      const cashBox = await this.getUserCashBox(userId);
      const dailyMoneyBox = await this.getDailyMoneyBox();
      const cashBoxSummary = await this.getCashBoxSummary(userId);

      return {
        cashBox,
        dailyMoneyBox,
        cashBoxSummary,
        integration: {
          canTransferToDaily: cashBox && cashBox.current_amount > 0,
          canTransferFromDaily: dailyMoneyBox && dailyMoneyBox.amount > 0,
          dailyBoxBalance: dailyMoneyBox ? dailyMoneyBox.amount : 0
        }
      };
    } catch (error) {
      logger.error('Error getting cash box with money box summary:', error);
      throw error;
    }
  }

  // Get comprehensive cash box report with money boxes
  async getComprehensiveCashBoxReport(userId, startDate = null, endDate = null) {
    try {
      const cashBox = await this.getUserCashBox(userId);
      const dailyMoneyBox = await this.getDailyMoneyBox();
      const cashBoxTransactions = await this.getCashBoxTransactions(cashBox?.id, 100, 0);
      
      // Get money box transactions for the same period
      let moneyBoxTransactions = [];
      if (dailyMoneyBox && startDate && endDate) {
        const moneyBoxResult = await moneyBoxesService.getTransactionsByDateRange(
          dailyMoneyBox.id, 
          startDate, 
          endDate, 
          100, 
          0
        );
        moneyBoxTransactions = moneyBoxResult.transactions;
      }

      return {
        cashBox,
        dailyMoneyBox,
        cashBoxTransactions: cashBoxTransactions.transactions || [],
        moneyBoxTransactions,
        summary: {
          cashBoxBalance: cashBox ? cashBox.current_amount : 0,
          dailyMoneyBoxBalance: dailyMoneyBox ? dailyMoneyBox.amount : 0,
          totalBalance: (cashBox ? cashBox.current_amount : 0) + (dailyMoneyBox ? dailyMoneyBox.amount : 0)
        }
      };
    } catch (error) {
      logger.error('Error getting comprehensive cash box report:', error);
      throw error;
    }
  }
}

module.exports = new CashBoxService(); 