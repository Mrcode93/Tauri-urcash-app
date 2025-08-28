const { db, query, queryOne, insert, update, transaction } = require('../database');
const logger = require('../utils/logger');

class MoneyBoxesService {
  // Get all money boxes
  async getAllMoneyBoxes() {
    try {
      const moneyBoxes = query(`
        SELECT mb.*, u.name as created_by_name
        FROM money_boxes mb
        LEFT JOIN users u ON mb.created_by = u.id
        ORDER BY mb.created_at DESC
      `);
      
      return moneyBoxes;
    } catch (error) {
      logger.error('Error getting all money boxes:', error);
      throw error;
    }
  }

  // Get money box by ID
  async getMoneyBoxById(boxId) {
    try {
      const moneyBox = queryOne(`
        SELECT mb.*, u.name as created_by_name
        FROM money_boxes mb
        LEFT JOIN users u ON mb.created_by = u.id
        WHERE mb.id = ?
      `, [boxId]);
      
      return moneyBox;
    } catch (error) {
      logger.error('Error getting money box by ID:', error);
      throw error;
    }
  }

  // Create new money box
  async createMoneyBox(data) {
    try {
      const { name, amount = 0, notes = '', created_by } = data;
      
      const boxId = insert(`
        INSERT INTO money_boxes (name, amount, notes, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [name, amount, notes, created_by]);

      // If initial amount is provided, create initial transaction
      if (amount > 0) {
        await this.addTransaction(boxId, 'deposit', amount, 'إيداع ابتدائي', created_by);
      }

      return this.getMoneyBoxById(boxId);
    } catch (error) {
      logger.error('Error creating money box:', error);
      throw error;
    }
  }

  // Update money box
  async updateMoneyBox(boxId, data) {
    try {
      const { name, notes } = data;
      
      update(`
        UPDATE money_boxes 
        SET name = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [name, notes, boxId]);

      return this.getMoneyBoxById(boxId);
    } catch (error) {
      logger.error('Error updating money box:', error);
      throw error;
    }
  }

  // Delete money box
  async deleteMoneyBox(boxId) {
    try {
      // Check if box has any transactions
      const transactions = query('SELECT COUNT(*) as count FROM money_box_transactions WHERE box_id = ?', [boxId]);
      if (transactions[0].count > 0) {
        throw new Error('لا يمكن حذف صندوق المال لوجود معاملات');
      }

      db.prepare('DELETE FROM money_boxes WHERE id = ?').run(boxId);
      
      return { success: true, message: 'تم حذف صندوق المال بنجاح' };
    } catch (error) {
      logger.error('Error deleting money box:', error);
      throw error;
    }
  }

  // Add transaction to money box
  async addTransaction(boxId, type, amount, notes = '', created_by, relatedBoxId = null) {
    try {
      const moneyBox = await this.getMoneyBoxById(boxId);
      if (!moneyBox) {
        throw new Error('لم يتم العثور على صندوق المال');
      }

      let newBalance = moneyBox.amount;
      
      logger.info(`MoneyBoxesService.addTransaction - type: ${type}, amount: ${amount}, boxId: ${boxId}`);
      switch (type) {
        case 'deposit':
        case 'transfer_in':
        case 'cash_deposit':
        case 'transfer_from':
        case 'transfer_from_cash_box':
        case 'transfer_from_daily_box':
        case 'transfer_from_money_box':
        case 'expense_reversal':
        case 'customer_receipt':
        case 'sale':
          newBalance += amount;
          break;
        case 'withdraw':
        case 'withdrawal':
        case 'transfer_out':
        case 'transfer_to_cashier':
        case 'transfer_to_money_box':
        case 'transfer_to_bank':
        case 'cash_box_closing':
        case 'expense':
        case 'expense_update':
        case 'purchase':
        case 'supplier_payment':
          if (newBalance < amount) {
            const error = new Error('الرصيد غير كافٍ');
            error.availableBalance = moneyBox.amount;
            error.requiredAmount = amount;
            error.moneyBoxName = moneyBox.name;
            throw error;
          }
          newBalance -= amount;
          break;
        case 'purchase_return':
          newBalance += amount;
          break;
        default:
          throw new Error('نوع المعاملة غير صالح');
      }

      // Update money box balance
      update(`
        UPDATE money_boxes 
        SET amount = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [newBalance, boxId]);

      // Record transaction
      const transactionId = insert(`
        INSERT INTO money_box_transactions (box_id, type, amount, balance_after, notes, related_box_id, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [boxId, type, amount, newBalance, notes, relatedBoxId, created_by]);

      return {
        transactionId,
        newBalance,
        transaction: {
          id: transactionId,
          box_id: boxId,
          type,
          amount,
          balance_after: newBalance,
          notes,
          related_box_id: relatedBoxId,
          created_by,
          created_at: new Date()
        }
      };
    } catch (error) {
      logger.error('Error adding transaction to money box:', error);
      throw error;
    }
  }

  // Transfer between money boxes
  async transferBetweenBoxes(fromBoxId, toBoxId, amount, notes = '', created_by) {
    try {
      if (fromBoxId === toBoxId) {
        throw new Error('لا يمكن التحويل إلى نفس الصندوق');
      }

      const fromBox = await this.getMoneyBoxById(fromBoxId);
      const toBox = await this.getMoneyBoxById(toBoxId);

      if (!fromBox || !toBox) {
        throw new Error('لم يتم العثور على صندوق المال المصدر أو الوجهة');
      }

      if (fromBox.amount < amount) {
        throw new Error('الرصيد غير كافٍ في الصندوق المصدر');
      }

      // Use transaction to ensure data consistency
      return transaction(async () => {
        // Withdraw from source box
        await this.addTransaction(fromBoxId, 'transfer_to_money_box', amount, `تحويل إلى ${toBox.name}: ${notes}`, created_by, toBoxId);
        
        // Deposit to destination box
        await this.addTransaction(toBoxId, 'transfer_from_money_box', amount, `تحويل من ${fromBox.name}: ${notes}`, created_by, fromBoxId);

        return {
          success: true,
          message: 'تم التحويل بنجاح',
          fromBox: await this.getMoneyBoxById(fromBoxId),
          toBox: await this.getMoneyBoxById(toBoxId)
        };
      });
    } catch (error) {
      logger.error('Error transferring between money boxes:', error);
      throw error;
    }
  }

  // Get money box transactions
  async getMoneyBoxTransactions(boxId, limit = 50, offset = 0) {
    try {
      const transactions = query(`
        SELECT mbt.*, u.name as created_by_name, mb.name as box_name
        FROM money_box_transactions mbt
        LEFT JOIN users u ON mbt.created_by = u.id
        LEFT JOIN money_boxes mb ON mbt.box_id = mb.id
        WHERE mbt.box_id = ?
        ORDER BY mbt.created_at DESC
        LIMIT ? OFFSET ?
      `, [boxId, limit, offset]);

      const total = queryOne('SELECT COUNT(*) as count FROM money_box_transactions WHERE box_id = ?', [boxId]);
      
      return {
        transactions,
        total: total.count,
        limit,
        offset
      };
    } catch (error) {
      logger.error('Error getting money box transactions:', error);
      throw error;
    }
  }

  // Get money box summary
  async getMoneyBoxSummary(boxId) {
    try {
      const moneyBox = await this.getMoneyBoxById(boxId);
      if (!moneyBox) {
        throw new Error('Money box not found');
      }

      // Get transaction statistics
      const stats = queryOne(`
        SELECT 
          COUNT(*) as total_transactions,
          SUM(CASE WHEN type IN ('deposit', 'transfer_in') THEN amount ELSE 0 END) as total_deposits,
          SUM(CASE WHEN type IN ('withdraw', 'transfer_out') THEN amount ELSE 0 END) as total_withdrawals,
          MAX(created_at) as last_transaction_date
        FROM money_box_transactions 
        WHERE box_id = ?
      `, [boxId]);

      return {
        moneyBox,
        statistics: {
          total_transactions: stats.total_transactions || 0,
          total_deposits: stats.total_deposits || 0,
          total_withdrawals: stats.total_withdrawals || 0,
          current_balance: moneyBox.amount,
          last_transaction_date: stats.last_transaction_date
        }
      };
    } catch (error) {
      logger.error('Error getting money box summary:', error);
      throw error;
    }
  }

  // Get all money boxes summary
  async getAllMoneyBoxesSummary() {
    try {
      const moneyBoxes = await this.getAllMoneyBoxes();
      const summary = [];

      for (const box of moneyBoxes) {
        const boxSummary = await this.getMoneyBoxSummary(box.id);
        summary.push(boxSummary);
      }

      const totalBalance = summary.reduce((sum, item) => sum + item.statistics.current_balance, 0);

      return {
        moneyBoxes: summary,
        totalBalance,
        totalBoxes: moneyBoxes.length
      };
    } catch (error) {
      logger.error('Error getting all money boxes summary:', error);
      throw error;
    }
  }

  // Get transactions by date range
  async getTransactionsByDateRange(boxId, startDate, endDate, limit = 50, offset = 0) {
    try {
      const transactions = query(`
        SELECT mbt.*, u.name as created_by_name, mb.name as box_name
        FROM money_box_transactions mbt
        LEFT JOIN users u ON mbt.created_by = u.id
        LEFT JOIN money_boxes mb ON mbt.box_id = mb.id
        WHERE mbt.box_id = ? AND DATE(mbt.created_at) BETWEEN ? AND ?
        ORDER BY mbt.created_at DESC
        LIMIT ? OFFSET ?
      `, [boxId, startDate, endDate, limit, offset]);

      const total = queryOne(`
        SELECT COUNT(*) as count 
        FROM money_box_transactions 
        WHERE box_id = ? AND DATE(created_at) BETWEEN ? AND ?
      `, [boxId, startDate, endDate]);

      return {
        transactions,
        total: total.count,
        limit,
        offset,
        dateRange: { startDate, endDate }
      };
    } catch (error) {
      logger.error('Error getting transactions by date range:', error);
      throw error;
    }
  }

  // Get money box by name
  async getMoneyBoxByName(name) {
    try {
      const moneyBox = queryOne(`
        SELECT mb.*, u.name as created_by_name
        FROM money_boxes mb
        LEFT JOIN users u ON mb.created_by = u.id
        WHERE mb.name = ?
      `, [name]);
      
      return moneyBox;
    } catch (error) {
      logger.error('Error getting money box by name:', error);
      throw error;
    }
  }
}

module.exports = new MoneyBoxesService(); 