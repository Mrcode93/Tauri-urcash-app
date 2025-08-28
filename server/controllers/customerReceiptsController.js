const customerReceiptsService = require('../services/customerReceiptsService');
const asyncHandler = require('../middleware/asyncHandler');
const logger = require('../utils/logger');
const { sendResponse } = require('../utils/response');
const { CustomerReceiptsErrorHandler } = require('../utils/errorHandler');

const customerReceiptsController = {
  // Get all customer receipts with pagination and filters
  getAll: asyncHandler(async (req, res) => {
    try {
      const { page = 1, limit = 10, ...filters } = req.query;
      
      const result = await customerReceiptsService.getAll(
        filters, 
        parseInt(page), 
        parseInt(limit)
      );

      sendResponse(res, 200, result.receipts, 'تم جلب إيصالات الدفع بنجاح', null, result.pagination);
    } catch (error) {
      logger.error('Error getting customer receipts:', error);
      const errorResponse = CustomerReceiptsErrorHandler.handleGetError(error);
      return sendResponse(res, errorResponse.status, null, errorResponse.message);
    }
  }),

  // Get receipt by ID
  getById: asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const receipt = await customerReceiptsService.getById(parseInt(id));
      
      if (!receipt) {
        const errorResponse = CustomerReceiptsErrorHandler.handleNotFound();
        return sendResponse(res, errorResponse.status, null, errorResponse.message);
      }
      
      sendResponse(res, 200, receipt, 'تم جلب بيانات إيصال الدفع بنجاح');
    } catch (error) {
      logger.error('Error getting customer receipt by ID:', error);
      const errorResponse = CustomerReceiptsErrorHandler.handleGetError(error);
      return sendResponse(res, errorResponse.status, null, errorResponse.message);
    }
  }),

  // Create new receipt
  create: asyncHandler(async (req, res) => {
    try {
      const receiptData = req.body;
      const userId = req.user.id;

      const receipt = await customerReceiptsService.create(receiptData, userId);
      
      logger.info('New customer receipt created:', receipt);
      sendResponse(res, 201, receipt, 'تم إنشاء إيصال الدفع بنجاح');
    } catch (error) {
      logger.error('Error creating customer receipt:', error);
      const errorResponse = CustomerReceiptsErrorHandler.handleCreateError(error);
      return sendResponse(res, errorResponse.status, null, errorResponse.message);
    }
  }),

  // Update receipt
  update: asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const receiptData = req.body;
      const userId = req.user.id;

      const receipt = await customerReceiptsService.update(parseInt(id), receiptData, userId);
      
      if (!receipt) {
        const errorResponse = CustomerReceiptsErrorHandler.handleNotFound();
        return sendResponse(res, errorResponse.status, null, errorResponse.message);
      }

      logger.info('Customer receipt updated:', receipt);
      sendResponse(res, 200, receipt, 'تم تحديث إيصال الدفع بنجاح');
    } catch (error) {
      logger.error('Error updating customer receipt:', error);
      const errorResponse = CustomerReceiptsErrorHandler.handleUpdateError(error);
      return sendResponse(res, errorResponse.status, null, errorResponse.message);
    }
  }),

  // Delete receipt
  delete: asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await customerReceiptsService.delete(parseInt(id), userId);
      
      if (!result) {
        const errorResponse = CustomerReceiptsErrorHandler.handleNotFound();
        return sendResponse(res, errorResponse.status, null, errorResponse.message);
      }

      logger.info('Customer receipt deleted:', req.params.id);
      sendResponse(res, 200, { id: req.params.id }, 'تم حذف إيصال الدفع بنجاح');
    } catch (error) {
      logger.error('Error deleting customer receipt:', error);
      const errorResponse = CustomerReceiptsErrorHandler.handleDeleteError(error);
      return sendResponse(res, errorResponse.status, null, errorResponse.message);
    }
  }),

  // Get customer receipt summary
  getCustomerSummary: asyncHandler(async (req, res) => {
    try {
      const { customerId } = req.params;
      const summary = await customerReceiptsService.getCustomerSummary(parseInt(customerId));
      
      sendResponse(res, 200, summary, 'تم جلب ملخص إيصالات العميل بنجاح');
    } catch (error) {
      logger.error('Error getting customer receipt summary:', error);
      const errorResponse = CustomerReceiptsErrorHandler.handleSearchError(error);
      return sendResponse(res, errorResponse.status, null, errorResponse.message);
    }
  }),

  // Get receipt statistics
  getStatistics: asyncHandler(async (req, res) => {
    try {
      const filters = req.query;
      const statistics = await customerReceiptsService.getStatistics(filters);
      
      sendResponse(res, 200, statistics, 'تم جلب إحصائيات إيصالات الدفع بنجاح');
    } catch (error) {
      logger.error('Error getting customer receipt statistics:', error);
      const errorResponse = CustomerReceiptsErrorHandler.handleGetError(error);
      return sendResponse(res, errorResponse.status, null, errorResponse.message);
    }
  }),

  // Get available sales for a customer
  getCustomerSales: asyncHandler(async (req, res) => {
    try {
      const { customerId } = req.params;
      const { query } = require('../database');
      
      const sales = query(`
        SELECT 
          id, invoice_no, invoice_date, total_amount, paid_amount, (total_amount - paid_amount) as remaining_amount, payment_status
        FROM sales 
        WHERE customer_id = ? AND (total_amount - paid_amount) > 0
        ORDER BY invoice_date DESC
      `, [parseInt(customerId)]);
      
      sendResponse(res, 200, sales, 'تم جلب فواتير العميل بنجاح');
    } catch (error) {
      logger.error('Error getting customer sales:', error);
      const errorResponse = CustomerReceiptsErrorHandler.handleSearchError(error);
      return sendResponse(res, errorResponse.status, null, errorResponse.message);
    }
  }),

  // Get customer debts (unpaid sales)
  getCustomerDebts: asyncHandler(async (req, res) => {
    try {
      const { customerId } = req.params;
      const debts = await customerReceiptsService.getCustomerDebts(parseInt(customerId));
      
      sendResponse(res, 200, debts, 'تم جلب ديون العميل بنجاح');
    } catch (error) {
      logger.error('Error getting customer debts:', error);
      const errorResponse = CustomerReceiptsErrorHandler.handleSearchError(error);
      return sendResponse(res, errorResponse.status, null, errorResponse.message);
    }
  }),

  // Get customer bills (all sales)
  getCustomerBills: asyncHandler(async (req, res) => {
    try {
      const { customerId } = req.params;
      const bills = await customerReceiptsService.getCustomerBills(parseInt(customerId));
      
      sendResponse(res, 200, bills, 'تم جلب فواتير العميل بنجاح');
    } catch (error) {
      logger.error('Error getting customer bills:', error);
      const errorResponse = CustomerReceiptsErrorHandler.handleSearchError(error);
      return sendResponse(res, errorResponse.status, null, errorResponse.message);
    }
  }),

  // Get customer financial summary
  getCustomerFinancialSummary: asyncHandler(async (req, res) => {
    try {
      const { customerId } = req.params;
      const summary = await customerReceiptsService.getCustomerFinancialSummary(parseInt(customerId));
      
      sendResponse(res, 200, summary, 'تم جلب الملخص المالي للعميل بنجاح');
    } catch (error) {
      logger.error('Error getting customer financial summary:', error);
      const errorResponse = CustomerReceiptsErrorHandler.handleSearchError(error);
      return sendResponse(res, errorResponse.status, null, errorResponse.message);
    }
  }),

  // Get receipt by receipt number
  getByReceiptNumber: asyncHandler(async (req, res) => {
    try {
      const { receiptNumber } = req.params;
      const { queryOne } = require('../database');
      
      const receipt = queryOne(`
        SELECT 
          cr.*,
          c.name as customer_name,
          c.phone as customer_phone,
          c.email as customer_email,
          s.invoice_no as sale_invoice_no,
          u.name as created_by_name
        FROM customer_receipts cr
        LEFT JOIN customers c ON cr.customer_id = c.id
        LEFT JOIN sales s ON cr.sale_id = s.id
        LEFT JOIN users u ON cr.created_by = u.id
        WHERE cr.receipt_number = ?
      `, [receiptNumber]);
      
      if (!receipt) {
        const errorResponse = CustomerReceiptsErrorHandler.handleNotFound();
        return sendResponse(res, errorResponse.status, null, errorResponse.message);
      }
      
      sendResponse(res, 200, receipt, 'تم جلب بيانات إيصال الدفع بنجاح');
    } catch (error) {
      logger.error('Error getting receipt by number:', error);
      const errorResponse = CustomerReceiptsErrorHandler.handleGetError(error);
      return sendResponse(res, errorResponse.status, null, errorResponse.message);
    }
  }),

  // Bulk create receipts
  bulkCreate: asyncHandler(async (req, res) => {
    try {
      const { receipts } = req.body;
      const userId = req.user.id;

      if (!Array.isArray(receipts) || receipts.length === 0) {
        return sendResponse(res, 400, null, 'يجب إرسال مصفوفة من الإيصالات ولا يمكن أن تكون فارغة');
      }

      const createdReceipts = [];
      const errors = [];

      for (let i = 0; i < receipts.length; i++) {
        try {
          const receiptData = receipts[i];
          
          const receipt = await customerReceiptsService.create(receiptData, userId);
          createdReceipts.push(receipt);
        } catch (error) {
          errors.push({
            index: i,
            errors: [error.message]
          });
        }
      }

      sendResponse(res, 201, {
        created: createdReceipts,
        errors: errors
      }, `تم إنشاء ${createdReceipts.length} إيصال بنجاح`);
    } catch (error) {
      logger.error('Error bulk creating receipts:', error);
      const errorResponse = CustomerReceiptsErrorHandler.handleCreateError(error);
      return sendResponse(res, errorResponse.status, null, errorResponse.message);
    }
  }),

  // Export receipts to CSV
  exportToCSV: asyncHandler(async (req, res) => {
    try {
      const { ...filters } = req.query;
      
      // Get all receipts without pagination for export
      const result = await customerReceiptsService.getAll(filters, 1, 1000000);
      
      // Convert to CSV format
      const csvHeaders = [
        'Receipt Number',
        'Customer Name',
        'Customer Phone',
        'Sale Invoice No',
        'Receipt Date',
        'Amount',
        'Payment Method',
        'Reference Number',
        'Notes',
        'Created By',
        'Created At'
      ];

      const csvRows = result.receipts.map(receipt => [
        receipt.receipt_number,
        receipt.customer_name,
        receipt.customer_phone,
        receipt.sale_invoice_no,
        receipt.receipt_date,
        receipt.amount,
        receipt.payment_method,
        receipt.reference_number,
        receipt.notes,
        receipt.created_by_name,
        receipt.created_at
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field || ''}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="customer_receipts.csv"');
      res.send(csvContent);
    } catch (error) {
      logger.error('Error exporting receipts to CSV:', error);
      const errorResponse = CustomerReceiptsErrorHandler.handleGetError(error);
      return sendResponse(res, errorResponse.status, null, errorResponse.message);
    }
  })
};

module.exports = customerReceiptsController; 