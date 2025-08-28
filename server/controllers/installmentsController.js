const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const { sendResponse } = require('../utils/response');
const installmentsService = require('../services/installmentsService');
const { InstallmentsErrorHandler } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const cacheService = require('../services/cacheService');

const installmentsController = {
  getAll: async (req, res) => {
    try {
      const startTime = Date.now();
      
      // Parse and validate query parameters
      const { page = 1, limit = 50, ...filters } = req.query;
      
      const installments = await installmentsService.getAll({
        filters,
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100) // Cap at 100 for performance
      });
      
      const responseTime = Date.now() - startTime;
      logger.info(`Installments getAll completed in ${responseTime}ms`);
      
      sendResponse(res, 200, installments, 'تم جلب الأقساط بنجاح');
    } catch (err) {
      logger.error('Error in getAll installments:', err);
      const errorResponse = InstallmentsErrorHandler.handleGetAll(err);
      res.status(500).json(errorResponse);
    }
  },

  getById: async (req, res) => {
    try {
      const startTime = Date.now();
      const installment = await installmentsService.getById(req.params.id);
      
      const responseTime = Date.now() - startTime;
      logger.info(`Installment getById completed in ${responseTime}ms`);
      
      sendResponse(res, 200, { installment }, 'تم جلب بيانات القسط بنجاح');
    } catch (err) {
      logger.error('Error in getById installment:', err);
      const errorResponse = InstallmentsErrorHandler.handleGetById(err);
      res.status(404).json(errorResponse);
    }
  },

  getBySaleId: async (req, res) => {
    try {
      const startTime = Date.now();
      const installments = await installmentsService.getBySaleId(req.params.saleId);
      
      const responseTime = Date.now() - startTime;
      logger.info(`Installments getBySaleId completed in ${responseTime}ms`);
      
      sendResponse(res, 200, { installments }, 'تم جلب أقساط الفاتورة بنجاح');
    } catch (err) {
      logger.error('Error in getBySaleId installments:', err);
      const errorResponse = InstallmentsErrorHandler.handleGetBySaleId(err);
      res.status(404).json(errorResponse);
    }
  },

  getByCustomerId: async (req, res) => {
    try {
      const startTime = Date.now();
      const installments = await installmentsService.getByCustomerId(req.params.customerId);
      
      const responseTime = Date.now() - startTime;
      logger.info(`Installments getByCustomerId completed in ${responseTime}ms`);
      
      sendResponse(res, 200, { installments }, 'تم جلب أقساط العميل بنجاح');
    } catch (err) {
      logger.error('Error in getByCustomerId installments:', err);
      const errorResponse = InstallmentsErrorHandler.handleGetByCustomerId(err);
      res.status(404).json(errorResponse);
    }
  },

  create: async (req, res) => {
    try {
      const startTime = Date.now();
      const { sale_id, customer_id, due_date, amount, payment_method, notes } = req.body;
      
      // Validate required fields
      if (!sale_id || !customer_id || !due_date || !amount || !payment_method) {
        return res.status(400).json(
          InstallmentsErrorHandler.handleValidationError('general', 'البيانات المطلوبة غير مكتملة')
        );
      }
      
      if (amount <= 0) {
        return res.status(400).json(
          InstallmentsErrorHandler.handleValidationError('amount', 'مبلغ القسط يجب أن يكون أكبر من صفر')
        );
      }

      const installment = await installmentsService.create({
        sale_id: parseInt(sale_id),
        customer_id: parseInt(customer_id),
        due_date,
        amount: parseFloat(amount),
        payment_method,
        notes: notes || ''
      });

      const responseTime = Date.now() - startTime;
      logger.info(`Installment create completed in ${responseTime}ms`);

      sendResponse(res, 201, { installment }, 'تم إنشاء القسط بنجاح');
    } catch (err) {
      logger.error('Error in create installment:', err);
      const errorResponse = InstallmentsErrorHandler.handleCreate(err);
      res.status(400).json(errorResponse);
    }
  },

  update: async (req, res) => {
    try {
      const startTime = Date.now();
      const { due_date, amount, payment_method, notes } = req.body;
      
      // Validate required fields
      if (!due_date || !amount || !payment_method) {
        return res.status(400).json(
          InstallmentsErrorHandler.handleValidationError('general', 'البيانات المطلوبة غير مكتملة')
        );
      }
      
      if (amount <= 0) {
        return res.status(400).json(
          InstallmentsErrorHandler.handleValidationError('amount', 'مبلغ القسط يجب أن يكون أكبر من صفر')
        );
      }

      const installment = await installmentsService.update(req.params.id, {
        due_date,
        amount: parseFloat(amount),
        payment_method,
        notes: notes || ''
      });

      const responseTime = Date.now() - startTime;
      logger.info(`Installment update completed in ${responseTime}ms`);

      sendResponse(res, 200, { installment }, 'تم تحديث القسط بنجاح');
    } catch (err) {
      logger.error('Error in update installment:', err);
      const errorResponse = InstallmentsErrorHandler.handleUpdate(err);
      res.status(400).json(errorResponse);
    }
  },

  delete: async (req, res) => {
    try {
      const startTime = Date.now();
      const installment = await installmentsService.delete(req.params.id);
      
      const responseTime = Date.now() - startTime;
      logger.info(`Installment delete completed in ${responseTime}ms`);
      
      sendResponse(res, 200, { installment }, 'تم حذف القسط بنجاح');
    } catch (err) {
      logger.error('Error in delete installment:', err);
      const errorResponse = InstallmentsErrorHandler.handleDelete(err);
      res.status(400).json(errorResponse);
    }
  },

  recordPayment: async (req, res) => {
    try {
      const startTime = Date.now();
      const { paid_amount, payment_method, notes, money_box_id } = req.body;
      
      // Validate required fields
      if (!paid_amount || paid_amount <= 0) {
        return res.status(400).json(
          InstallmentsErrorHandler.handleValidationError('paid_amount', 'مبلغ الدفع يجب أن يكون أكبر من صفر')
        );
      }
      
      if (!payment_method) {
        return res.status(400).json(
          InstallmentsErrorHandler.handleValidationError('payment_method', 'طريقة الدفع مطلوبة')
        );
      }

      const result = await installmentsService.recordPayment(req.params.id, {
        paid_amount: parseFloat(paid_amount),
        payment_method,
        notes: notes || '',
        money_box_id: money_box_id || null
      }, req.user.id);

      const responseTime = Date.now() - startTime;
      logger.info(`Installment payment recorded in ${responseTime}ms`);

      sendResponse(res, 200, result, 'تم تسجيل الدفع بنجاح');
    } catch (err) {
      logger.error('Error in recordPayment:', err);
      const errorResponse = InstallmentsErrorHandler.handleRecordPayment(err);
      res.status(400).json(errorResponse);
    }
  },

  createInstallmentPlan: async (req, res) => {
    try {
      const startTime = Date.now();
      const { customer_id, selectedProducts, installmentMonths, startingDueDate, paymentMethod, notes, totalAmount } = req.body;
      
      // Validate required fields
      if (!customer_id) {
        return res.status(400).json(
          InstallmentsErrorHandler.handleValidationError('customer_id', 'يرجى اختيار عميل')
        );
      }
      
      if (!selectedProducts || selectedProducts.length === 0) {
        return res.status(400).json(
          InstallmentsErrorHandler.handleValidationError('selectedProducts', 'يرجى إضافة منتجات للخطة')
        );
      }
      
      if (!installmentMonths || installmentMonths <= 0) {
        return res.status(400).json(
          InstallmentsErrorHandler.handleValidationError('installmentMonths', 'عدد الأشهر يجب أن يكون أكبر من صفر')
        );
      }
      
      if (!startingDueDate) {
        return res.status(400).json(
          InstallmentsErrorHandler.handleValidationError('startingDueDate', 'تاريخ أول قسط مطلوب')
        );
      }
      
      if (!totalAmount || totalAmount <= 0) {
        return res.status(400).json(
          InstallmentsErrorHandler.handleValidationError('totalAmount', 'المبلغ الإجمالي يجب أن يكون أكبر من صفر')
        );
      }

      const result = await installmentsService.createInstallmentPlan({
        customer_id: parseInt(customer_id),
        selectedProducts,
        installmentMonths: parseInt(installmentMonths),
        startingDueDate,
        paymentMethod,
        notes: notes || '',
        totalAmount: parseFloat(totalAmount)
      });

      const responseTime = Date.now() - startTime;
      logger.info(`Installment plan created in ${responseTime}ms`);

      sendResponse(res, 201, result, 'تم إنشاء خطة الأقساط بنجاح');
    } catch (err) {
      logger.error('Error in createInstallmentPlan:', err);
      const errorResponse = InstallmentsErrorHandler.handleCreatePlan(err);
      res.status(400).json(errorResponse);
    }
  },

  getGroupedBySale: async (req, res) => {
    try {
      const startTime = Date.now();
      const result = await installmentsService.getGroupedBySale(req.query);
      
      const responseTime = Date.now() - startTime;
      logger.info(`Installments grouped by sale completed in ${responseTime}ms`);
      
      sendResponse(res, 200, result, 'تم جلب الأقساط مجمعة بنجاح');
    } catch (err) {
      logger.error('Error in getGroupedBySale:', err);
      const errorResponse = InstallmentsErrorHandler.handleGetAll(err);
      res.status(500).json(errorResponse);
    }
  },

  getSummary: async (req, res) => {
    try {
      const startTime = Date.now();
      const summary = await installmentsService.getInstallmentsSummary(req.query);
      
      const responseTime = Date.now() - startTime;
      logger.info(`Installments summary completed in ${responseTime}ms`);
      
      sendResponse(res, 200, { summary }, 'تم جلب ملخص الأقساط بنجاح');
    } catch (err) {
      logger.error('Error in getSummary:', err);
      const errorResponse = InstallmentsErrorHandler.handleGetAll(err);
      res.status(500).json(errorResponse);
    }
  },

  // New method for getting installments statistics
  getStatistics: async (req, res) => {
    try {
      const startTime = Date.now();
      
      // Get cached statistics
      const stats = cacheService.get('installments:summary_stats');
      if (stats) {
        const responseTime = Date.now() - startTime;
        logger.info(`Installments statistics (cached) completed in ${responseTime}ms`);
        return sendResponse(res, 200, { stats }, 'تم جلب إحصائيات الأقساط بنجاح');
      }

      // If not cached, get fresh statistics
      const summary = await installmentsService.getInstallmentsSummary();
      
      const responseTime = Date.now() - startTime;
      logger.info(`Installments statistics (fresh) completed in ${responseTime}ms`);
      
      sendResponse(res, 200, { stats: summary }, 'تم جلب إحصائيات الأقساط بنجاح');
    } catch (err) {
      logger.error('Error in getStatistics:', err);
      const errorResponse = InstallmentsErrorHandler.handleGetAll(err);
      res.status(500).json(errorResponse);
    }
  },

  // New method for refreshing cache
  refreshCache: async (req, res) => {
    try {
      const startTime = Date.now();
      
      // Refresh installments cache
      await installmentsService.refreshCacheData();
      
      const responseTime = Date.now() - startTime;
      logger.info(`Installments cache refresh completed in ${responseTime}ms`);
      
      sendResponse(res, 200, { message: 'تم تحديث الكاش بنجاح' }, 'تم تحديث الكاش بنجاح');
    } catch (err) {
      logger.error('Error in refreshCache:', err);
      res.status(500).json({
        success: false,
        message: 'فشل في تحديث الكاش',
        error: err.message
      });
    }
  },

  // New method for getting overdue installments
  getOverdue: async (req, res) => {
    try {
      const startTime = Date.now();
      
      const overdueInstallments = await installmentsService.getAll({
        filters: {
          payment_status: 'unpaid',
          end_date: new Date().toISOString().split('T')[0]
        },
        page: 1,
        limit: 100
      });
      
      const responseTime = Date.now() - startTime;
      logger.info(`Overdue installments completed in ${responseTime}ms`);
      
      sendResponse(res, 200, overdueInstallments, 'تم جلب الأقساط المتأخرة بنجاح');
    } catch (err) {
      logger.error('Error in getOverdue:', err);
      const errorResponse = InstallmentsErrorHandler.handleGetAll(err);
      res.status(500).json(errorResponse);
    }
  },

  // New method for getting upcoming installments
  getUpcoming: async (req, res) => {
    try {
      const startTime = Date.now();
      
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const upcomingInstallments = await installmentsService.getAll({
        filters: {
          start_date: new Date().toISOString().split('T')[0],
          end_date: thirtyDaysFromNow.toISOString().split('T')[0]
        },
        page: 1,
        limit: 100
      });
      
      const responseTime = Date.now() - startTime;
      logger.info(`Upcoming installments completed in ${responseTime}ms`);
      
      sendResponse(res, 200, upcomingInstallments, 'تم جلب الأقساط القادمة بنجاح');
    } catch (err) {
      logger.error('Error in getUpcoming:', err);
      const errorResponse = InstallmentsErrorHandler.handleGetAll(err);
      res.status(500).json(errorResponse);
    }
  }
};

module.exports = installmentsController;