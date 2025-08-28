const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const { sendResponse } = require('../utils/response');
const expensesService = require('../services/expensesService');
const { ExpensesErrorHandler } = require('../utils/errorHandler');
const logger = require('../utils/logger');

const expensesController = {
  getAll: async (req, res) => {
    try {
      const expenses = await expensesService.getAll();
      sendResponse(res, 200, { expenses }, 'تم جلب المصروفات بنجاح');
    } catch (err) {
      logger.error('Error in getAll expenses:', err);
      const errorResponse = ExpensesErrorHandler.handleGetAll(err);
      res.status(500).json(errorResponse);
    }
  },

  getById: async (req, res) => {
    try {
      const expense = await expensesService.getById(req.params.id);
      sendResponse(res, 200, { expense }, 'تم جلب بيانات المصروف بنجاح');
    } catch (err) {
      logger.error('Error in getById expense:', err);
      const errorResponse = ExpensesErrorHandler.handleGetById(err);
      res.status(404).json(errorResponse);
    }
  },

  getByCategory: async (req, res) => {
    try {
      const expenses = await expensesService.getByCategory(req.params.category);
      sendResponse(res, 200, { expenses }, 'تم جلب المصروفات حسب الفئة بنجاح');
    } catch (err) {
      logger.error('Error in getByCategory expenses:', err);
      const errorResponse = ExpensesErrorHandler.handleGetByCategory(err);
      res.status(500).json(errorResponse);
    }
  },

  getByDateRange: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json(
          ExpensesErrorHandler.handleValidationError('date', 'تاريخ البداية والنهاية مطلوبان')
        );
      }
      const expenses = await expensesService.getByDateRange(startDate, endDate);
      sendResponse(res, 200, { expenses }, 'تم جلب المصروفات حسب التاريخ بنجاح');
    } catch (err) {
      logger.error('Error in getByDateRange expenses:', err);
      const errorResponse = ExpensesErrorHandler.handleGetByDateRange(err);
      res.status(500).json(errorResponse);
    }
  },

  create: async (req, res) => {
    try {
      const { description, amount, category, date, moneyBoxId } = req.body;
      
      // Validate required fields
      if (!description || !description.trim()) {
        return res.status(400).json(
          ExpensesErrorHandler.handleValidationError('description', 'وصف المصروف مطلوب')
        );
      }
      
      if (!amount || amount <= 0) {
        return res.status(400).json(
          ExpensesErrorHandler.handleValidationError('amount', 'المبلغ يجب أن يكون أكبر من صفر')
        );
      }
      
      if (!category || !category.trim()) {
        return res.status(400).json(
          ExpensesErrorHandler.handleValidationError('category', 'فئة المصروف مطلوبة')
        );
      }
      
      if (!date) {
        return res.status(400).json(
          ExpensesErrorHandler.handleValidationError('date', 'تاريخ المصروف مطلوب')
        );
      }

      if (!moneyBoxId) {
        return res.status(400).json(
          ExpensesErrorHandler.handleValidationError('moneyBoxId', 'يجب اختيار صندوق المال')
        );
      }

      const expense = await expensesService.create({
        description: description.trim(),
        amount: parseFloat(amount),
        category: category.trim(),
        date,
        moneyBoxId
      });

      sendResponse(res, 201, { expense }, 'تم إنشاء المصروف بنجاح');
    } catch (err) {
      logger.error('Error in create expense:', err);
      const errorResponse = ExpensesErrorHandler.handleCreate(err);
      res.status(400).json(errorResponse);
    }
  },

  update: async (req, res) => {
    try {
      const { description, amount, category, date, moneyBoxId } = req.body;
      
      // Validate required fields
      if (!description || !description.trim()) {
        return res.status(400).json(
          ExpensesErrorHandler.handleValidationError('description', 'وصف المصروف مطلوب')
        );
      }
      
      if (!amount || amount <= 0) {
        return res.status(400).json(
          ExpensesErrorHandler.handleValidationError('amount', 'المبلغ يجب أن يكون أكبر من صفر')
        );
      }
      
      if (!category || !category.trim()) {
        return res.status(400).json(
          ExpensesErrorHandler.handleValidationError('category', 'فئة المصروف مطلوبة')
        );
      }
      
      if (!date) {
        return res.status(400).json(
          ExpensesErrorHandler.handleValidationError('date', 'تاريخ المصروف مطلوب')
        );
      }

      if (!moneyBoxId) {
        return res.status(400).json(
          ExpensesErrorHandler.handleValidationError('moneyBoxId', 'يجب اختيار صندوق المال')
        );
      }

      const expense = await expensesService.update(req.params.id, {
        description: description.trim(),
        amount: parseFloat(amount),
        category: category.trim(),
        date,
        moneyBoxId
      });

      sendResponse(res, 200, { expense }, 'تم تحديث المصروف بنجاح');
    } catch (err) {
      logger.error('Error in update expense:', err);
      const errorResponse = ExpensesErrorHandler.handleUpdate(err);
      res.status(400).json(errorResponse);
    }
  },

  delete: async (req, res) => {
    try {
      const expense = await expensesService.delete(req.params.id);
      sendResponse(res, 200, { expense }, 'تم حذف المصروف بنجاح');
    } catch (err) {
      logger.error('Error in delete expense:', err);
      const errorResponse = ExpensesErrorHandler.handleDelete(err);
      res.status(400).json(errorResponse);
    }
  },

  getTotalByCategory: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json(
          ExpensesErrorHandler.handleValidationError('date', 'تاريخ البداية والنهاية مطلوبان')
        );
      }

      const totals = await expensesService.getTotalByCategory(startDate, endDate);
      sendResponse(res, 200, { totals }, 'تم جلب إجمالي المصروفات حسب الفئة بنجاح');
    } catch (err) {
      logger.error('Error in getTotalByCategory:', err);
      const errorResponse = ExpensesErrorHandler.handleGetByCategory(err);
      res.status(500).json(errorResponse);
    }
  },

  getTotalByDateRange: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json(
          ExpensesErrorHandler.handleValidationError('date', 'تاريخ البداية والنهاية مطلوبان')
        );
      }

      const total = await expensesService.getTotalByDateRange(startDate, endDate);
      sendResponse(res, 200, { total }, 'تم جلب إجمالي المصروفات حسب التاريخ بنجاح');
    } catch (err) {
      logger.error('Error in getTotalByDateRange:', err);
      const errorResponse = ExpensesErrorHandler.handleGetByDateRange(err);
      res.status(500).json(errorResponse);
    }
  }
};

module.exports = expensesController; 