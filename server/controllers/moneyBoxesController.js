const moneyBoxesService = require('../services/moneyBoxesService');
const asyncHandler = require('../middleware/asyncHandler');
const logger = require('../utils/logger');

const moneyBoxesController = {
  // Get all money boxes
  getAllMoneyBoxes: asyncHandler(async (req, res) => {
    const moneyBoxes = await moneyBoxesService.getAllMoneyBoxes();
    
    res.json({
      success: true,
      data: moneyBoxes
    });
  }),

  // Get money box by ID
  getMoneyBoxById: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const moneyBox = await moneyBoxesService.getMoneyBoxById(id);
    
    if (!moneyBox) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على صندوق المال'
      });
    }
    
    res.json({
      success: true,
      data: moneyBox
    });
  }),

  // Create new money box
  createMoneyBox: asyncHandler(async (req, res) => {
    const { name, amount = 0, notes = '' } = req.body;
    const created_by = req.user.id;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'اسم صندوق المال مطلوب'
      });
    }

    const moneyBox = await moneyBoxesService.createMoneyBox({
      name: name.trim(),
      amount: parseFloat(amount) || 0,
      notes: notes.trim(),
      created_by
    });
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء صندوق المال بنجاح',
      data: moneyBox
    });
  }),

  // Update money box
  updateMoneyBox: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, notes = '' } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'اسم صندوق المال مطلوب'
      });
    }

    const moneyBox = await moneyBoxesService.updateMoneyBox(id, {
      name: name.trim(),
      notes: notes.trim()
    });
    
    res.json({
      success: true,
      message: 'تم تحديث صندوق المال بنجاح',
      data: moneyBox
    });
  }),

  // Delete money box
  deleteMoneyBox: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await moneyBoxesService.deleteMoneyBox(id);
    
    res.json({
      success: true,
      message: 'تم حذف صندوق المال بنجاح',
      data: result
    });
  }),

  // Add transaction to money box
  addTransaction: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { type, amount, notes = '' } = req.body;
    const created_by = req.user.id;

    if (!type || !amount) {
      return res.status(400).json({
        success: false,
        message: 'نوع المعاملة والمبلغ مطلوبان'
      });
    }

    if (!['deposit', 'withdraw', 'transfer_in', 'transfer_out'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'نوع المعاملة غير صالح'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'يجب أن يكون المبلغ أكبر من صفر'
      });
    }

    // Use the notes provided by frontend (which includes automatic naming for deposits)
    let finalNotes = notes.trim();
    // Only provide default notes if completely empty and not a deposit (since deposits get auto-named in frontend)
    if (!finalNotes && type !== 'deposit') {
      if (type === 'withdraw') {
        finalNotes = 'سحب نقدي';
      }
    }

    const result = await moneyBoxesService.addTransaction(id, type, amount, finalNotes, created_by);
    
    res.json({
      success: true,
      message: 'تم إضافة المعاملة بنجاح',
      data: result
    });
  }),

  // Transfer between money boxes
  transferBetweenBoxes: asyncHandler(async (req, res) => {
    const { fromBoxId, toBoxId, amount, notes = '' } = req.body;
    const created_by = req.user.id;

    if (!fromBoxId || !toBoxId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'الصندوق المصدر، الصندوق الوجهة، والمبلغ مطلوبة'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'يجب أن يكون المبلغ أكبر من صفر'
      });
    }

    const result = await moneyBoxesService.transferBetweenBoxes(fromBoxId, toBoxId, amount, notes, created_by);
    
    res.json({
      success: true,
      message: 'تم التحويل بنجاح',
      data: result
    });
  }),

  // Get money box transactions
  getMoneyBoxTransactions: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const result = await moneyBoxesService.getMoneyBoxTransactions(id, parseInt(limit), parseInt(offset));
    
    res.json({
      success: true,
      data: result
    });
  }),

  // Get money box summary
  getMoneyBoxSummary: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const summary = await moneyBoxesService.getMoneyBoxSummary(id);
    
    res.json({
      success: true,
      data: summary
    });
  }),

  // Get all money boxes summary
  getAllMoneyBoxesSummary: asyncHandler(async (req, res) => {
    const summary = await moneyBoxesService.getAllMoneyBoxesSummary();
    
    res.json({
      success: true,
      data: summary
    });
  }),

  // Get transactions by date range
  getTransactionsByDateRange: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { startDate, endDate, limit = 50, offset = 0 } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'تاريخ البداية والنهاية مطلوبان'
      });
    }

    const result = await moneyBoxesService.getTransactionsByDateRange(
      id, 
      startDate, 
      endDate, 
      parseInt(limit), 
      parseInt(offset)
    );
    
    res.json({
      success: true,
      data: result
    });
  }),

  // Get money box by name (for integration with cash boxes)
  getMoneyBoxByName: asyncHandler(async (req, res) => {
    const { name } = req.params;
    
    try {
      const moneyBox = await moneyBoxesService.getMoneyBoxByName(name);
      
      if (!moneyBox) {
        return res.status(404).json({
          success: false,
          message: 'لم يتم العثور على صندوق المال'
        });
      }
      
      res.json({
        success: true,
        data: moneyBox
      });
    } catch (error) {
      logger.error('Error getting money box by name:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ داخلي في الخادم'
      });
    }
  })
};

module.exports = moneyBoxesController; 