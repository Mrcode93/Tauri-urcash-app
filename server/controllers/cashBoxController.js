const cashBoxService = require('../services/cashBoxService');
const asyncHandler= require('../middleware/asyncHandler');
const logger = require('../utils/logger');
const { CashBoxErrorHandler } = require('../utils/errorHandler');

const cashBoxController = {
  // Get user's current cash box
  getUserCashBox: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const cashBox = await cashBoxService.getUserCashBox(userId);
    
    res.json({
      success: true,
      data: cashBox
    });
  }),

  // Get user's cash box settings
  getUserCashBoxSettings: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const settings = await cashBoxService.getUserCashBoxSettings(userId);
    
    res.json({
      success: true,
      data: settings
    });
  }),

  // Open cash box
  openCashBox: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { openingAmount = 0, notes = '' } = req.body;

    const cashBox = await cashBoxService.openCashBox(userId, openingAmount, notes);
    
    res.json({
      success: true,
      message: 'تم فتح الصندوق بنجاح',
      data: cashBox
    });
  }),

  // Close cash box
  closeCashBox: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { closingAmount, notes = '' } = req.body;

    if (!closingAmount && closingAmount !== 0) {
      return res.status(400).json(
        CashBoxErrorHandler.handleValidationError('closingAmount', 'مبلغ الإغلاق مطلوب')
      );
    }

    const cashBox = await cashBoxService.closeCashBox(userId, closingAmount, notes);
    
    res.json({
      success: true,
      message: 'تم إغلاق الصندوق بنجاح',
      data: cashBox
    });
  }),

  // Add transaction to cash box
  addTransaction: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { 
      cashBoxId, 
      transactionType, 
      amount, 
      referenceType, 
      referenceId, 
      description, 
      notes 
    } = req.body;

    if (!cashBoxId || !transactionType || !amount || !referenceType) {
      return res.status(400).json(
        CashBoxErrorHandler.handleValidationError('required_fields', 'جميع الحقول المطلوبة يجب أن تكون موجودة')
      );
    }

    const result = await cashBoxService.addTransaction(
      cashBoxId, 
      userId, 
      transactionType, 
      amount, 
      referenceType, 
      referenceId, 
      description, 
      notes
    );
    
    res.json({
      success: true,
      message: 'تم إضافة المعاملة بنجاح',
      data: result
    });
  }),

  // Get cash box transactions
  getCashBoxTransactions: asyncHandler(async (req, res) => {
    const { cashBoxId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const transactions = await cashBoxService.getCashBoxTransactions(
      parseInt(cashBoxId), 
      parseInt(limit), 
      parseInt(offset)
    );
    
    res.json({
      success: true,
      data: transactions
    });
  }),

  // Get user's cash box history
  getUserCashBoxHistory: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const history = await cashBoxService.getUserCashBoxHistory(
      userId, 
      parseInt(limit), 
      parseInt(offset)
    );
    
    res.json({
      success: true,
      data: history
    });
  }),

  // Update user cash box settings
  updateUserCashBoxSettings: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const settings = req.body;

    const updatedSettings = await cashBoxService.updateUserCashBoxSettings(userId, settings);
    
    res.json({
      success: true,
      message: 'تم تحديث إعدادات الصندوق بنجاح',
      data: updatedSettings
    });
  }),

  // Get cash box summary for dashboard
  getCashBoxSummary: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const summary = await cashBoxService.getCashBoxSummary(userId);
    
    res.json({
      success: true,
      data: summary
    });
  }),

  // Admin: Get all open cash boxes
  getAllOpenCashBoxes: asyncHandler(async (req, res) => {
    try {
      const cashBoxes = await cashBoxService.getAllOpenCashBoxes();
      
      res.json({
        success: true,
        data: cashBoxes
      });
    } catch (error) {
      const errorResponse = CashBoxErrorHandler.handleGetAllOpenCashBoxes(error);
      res.status(500).json(errorResponse);
    }
  }),

  // Admin: Force close cash box
  forceCloseCashBox: asyncHandler(async (req, res) => {
    const adminUserId = req.user.id;
    const { cashBoxId } = req.params;
    const { reason = '', money_box_id } = req.body;

    try {
      const cashBox = await cashBoxService.forceCloseCashBox(
        parseInt(cashBoxId), 
        adminUserId, 
        reason,
        money_box_id
      );
      
      res.json({
        success: true,
        message: 'تم إغلاق الصندوق إجبارياً بنجاح',
        data: cashBox
      });
    } catch (error) {
      const errorResponse = CashBoxErrorHandler.handleForceCloseCashBox(error);
      res.status(400).json(errorResponse);
    }
  }),

  // Get cash box by ID (admin function)
  getCashBoxById: asyncHandler(async (req, res) => {
    const { cashBoxId } = req.params;
    
    try {
      const cashBox = await cashBoxService.getCashBoxById(parseInt(cashBoxId));
      
      if (!cashBox) {
        return res.status(404).json({
          success: false,
          message: 'الصندوق غير موجود'
        });
      }
      
      res.json({
        success: true,
        data: cashBox
      });
    } catch (error) {
      const errorResponse = CashBoxErrorHandler.handleGetCashBoxDetails(error);
      res.status(500).json(errorResponse);
    }
  }),

  // Manual deposit/withdrawal
  manualTransaction: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { 
      cashBoxId, 
      transactionType, 
      amount, 
      description, 
      notes 
    } = req.body;

    if (!cashBoxId || !transactionType || !amount || !description) {
      return res.status(400).json(
        CashBoxErrorHandler.handleValidationError('required_fields', 'جميع الحقول المطلوبة يجب أن تكون موجودة')
      );
    }

    if (!['deposit', 'withdrawal', 'adjustment'].includes(transactionType)) {
      return res.status(400).json(
        CashBoxErrorHandler.handleValidationError('transactionType', 'نوع المعاملة غير صحيح')
      );
    }

    try {
      const result = await cashBoxService.addTransaction(
        cashBoxId, 
        userId, 
        transactionType, 
        amount, 
        'manual', 
        null, 
        description, 
        notes
      );
      
      res.json({
        success: true,
        message: 'تم إضافة المعاملة بنجاح',
        data: result
      });
    } catch (error) {
      const errorResponse = CashBoxErrorHandler.handleGetCashBoxTransactions(error);
      res.status(400).json(errorResponse);
    }
  }),

  // Get cash box report
  getCashBoxReport: asyncHandler(async (req, res) => {
    const { cashBoxId } = req.params;
    const { startDate, endDate } = req.query;

    try {
      // Get cash box details
      const cashBox = await cashBoxService.getCashBoxById(parseInt(cashBoxId));
      if (!cashBox) {
        return res.status(404).json({
          success: false,
          message: 'الصندوق غير موجود'
        });
      }

      // Get transactions for the period
      let transactions = await cashBoxService.getCashBoxTransactions(parseInt(cashBoxId), 1000, 0);
      
      if (startDate && endDate) {
        transactions = transactions.filter(t => {
          const transactionDate = new Date(t.created_at);
          const start = new Date(startDate);
          const end = new Date(endDate);
          return transactionDate >= start && transactionDate <= end;
        });
      }

      // Calculate summary
      const summary = {
        totalDeposits: transactions.filter(t => ['deposit', 'sale', 'customer_receipt', 'purchase_return'].includes(t.transaction_type))
          .reduce((sum, t) => sum + t.amount, 0),
        totalWithdrawals: transactions.filter(t => ['withdrawal', 'purchase', 'expense', 'supplier_payment', 'sale_return'].includes(t.transaction_type))
          .reduce((sum, t) => sum + t.amount, 0),
        totalTransactions: transactions.length,
        openingBalance: cashBox.initial_amount,
        currentBalance: cashBox.current_amount,
        netChange: cashBox.current_amount - cashBox.initial_amount
      };

      res.json({
        success: true,
        data: {
          cashBox,
          transactions,
          summary
        }
      });
    } catch (error) {
      const errorResponse = CashBoxErrorHandler.handleGetCashBoxDetails(error);
      res.status(500).json(errorResponse);
    }
  }),

  // Admin: Get all users' cash box history
  getAllUsersCashBoxHistory: asyncHandler(async (req, res) => {
    const { limit = 50, offset = 0 } = req.query;
    
    try {
      const history = await cashBoxService.getAllUsersCashBoxHistory(
        parseInt(limit),
        parseInt(offset)
      );
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      const errorResponse = CashBoxErrorHandler.handleGetAllUsersCashBoxHistory(error);
      res.status(500).json(errorResponse);
    }
  }),

  // Money Box Integration Endpoints

  // Get cash box with money box integration summary
  getCashBoxWithMoneyBoxSummary: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    try {
      const result = await cashBoxService.getCashBoxWithMoneyBoxSummary(userId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error getting cash box with money box summary:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء جلب ملخص الصندوق مع صناديق المال'
      });
    }
  }),

  // Transfer to daily money box
  transferToDailyMoneyBox: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { cashBoxId, amount, notes = '' } = req.body;

    if (!cashBoxId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'معرف الصندوق والمبلغ مطلوبان'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'المبلغ يجب أن يكون أكبر من صفر'
      });
    }

    try {
      const result = await cashBoxService.transferToDailyMoneyBox(cashBoxId, userId, amount, notes);
      res.json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      logger.error('Error transferring to daily money box:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء التحويل إلى الصندوق اليومي'
      });
    }
  }),

  // Transfer from daily money box
  transferFromDailyMoneyBox: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { cashBoxId, amount, notes = '' } = req.body;

    if (!cashBoxId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'معرف الصندوق والمبلغ مطلوبان'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'المبلغ يجب أن يكون أكبر من صفر'
      });
    }

    try {
      const result = await cashBoxService.transferFromDailyMoneyBox(cashBoxId, userId, amount, notes);
      res.json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      logger.error('Error transferring from daily money box:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء التحويل من الصندوق اليومي'
      });
    }
  }),

  // Transfer to money box (general)
  transferToMoneyBox: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { cashBoxId, amount, targetType, targetMoneyBox, notes = '' } = req.body;

    if (!cashBoxId || !amount || !targetType) {
      return res.status(400).json({
        success: false,
        message: 'معرف الصندوق والمبلغ ونوع الوجهة مطلوبة'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'المبلغ يجب أن يكون أكبر من صفر'
      });
    }

    if (targetType === 'custom_money_box' && !targetMoneyBox) {
      return res.status(400).json({
        success: false,
        message: 'صندوق المال المخصص مطلوب'
      });
    }

    try {
      let result;
      if (targetType === 'daily_money_box') {
        result = await cashBoxService.transferToDailyMoneyBox(cashBoxId, userId, amount, notes);
      } else if (targetType === 'custom_money_box') {
        result = await cashBoxService.transferToCustomMoneyBox(cashBoxId, userId, amount, targetMoneyBox, notes);
      } else {
        return res.status(400).json({
          success: false,
          message: 'نوع الوجهة غير صالح'
        });
      }

      res.json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      logger.error('Error transferring to money box:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء التحويل إلى صندوق المال'
      });
    }
  }),

  // Get comprehensive cash box report with money boxes
  getComprehensiveCashBoxReport: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    try {
      const result = await cashBoxService.getComprehensiveCashBoxReport(userId, startDate, endDate);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error getting comprehensive cash box report:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء جلب التقرير الشامل للصندوق'
      });
    }
  })
};

module.exports = cashBoxController; 