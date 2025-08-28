const supplierPaymentReceiptsService = require('../services/supplierPaymentReceiptsService');
const asyncHandler = require('../middleware/asyncHandler');
const { SupplierPaymentReceiptsErrorHandler } = require('../utils/errorHandler');

const supplierPaymentReceiptsController = {
  // Get all supplier payment receipts with pagination and filters
  getAll: asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, ...filters } = req.query;
    
    try {
      const result = await supplierPaymentReceiptsService.getAll(
        filters, 
        parseInt(page), 
        parseInt(limit)
      );

      res.json({
        success: true,
        data: result.receipts,
        pagination: result.pagination
      });
    } catch (error) {
      const errorResponse = SupplierPaymentReceiptsErrorHandler.handleGetAll(error);
      res.status(500).json(errorResponse);
    }
  }),

  // Get receipt by ID
  getById: asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    try {
      const receipt = await supplierPaymentReceiptsService.getById(parseInt(id));
      
      res.json({
        success: true,
        data: receipt
      });
    } catch (error) {
      const errorResponse = SupplierPaymentReceiptsErrorHandler.handleGetById(error);
      res.status(404).json(errorResponse);
    }
  }),

  // Create new receipt
  create: asyncHandler(async (req, res) => {
    const receiptData = req.body;
    const userId = req.user.id;

    try {
      const receipt = await supplierPaymentReceiptsService.create(receiptData, userId);
      
      res.status(201).json({
        success: true,
        message: 'تم إنشاء إيصال الدفع بنجاح',
        data: receipt
      });
    } catch (error) {
      const errorResponse = SupplierPaymentReceiptsErrorHandler.handleCreate(error);
      res.status(400).json(errorResponse);
    }
  }),

  // Update receipt
  update: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const receiptData = req.body;
    const userId = req.user.id;

    try {
      const receipt = await supplierPaymentReceiptsService.update(parseInt(id), receiptData, userId);
      
      res.json({
        success: true,
        message: 'تم تحديث إيصال الدفع بنجاح',
        data: receipt
      });
    } catch (error) {
      const errorResponse = SupplierPaymentReceiptsErrorHandler.handleUpdate(error);
      res.status(400).json(errorResponse);
    }
  }),

  // Delete receipt
  delete: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      await supplierPaymentReceiptsService.delete(parseInt(id), userId);
      
      res.json({
        success: true,
        message: 'تم حذف إيصال الدفع بنجاح'
      });
    } catch (error) {
      const errorResponse = SupplierPaymentReceiptsErrorHandler.handleDelete(error);
      res.status(400).json(errorResponse);
    }
  }),

  // Get supplier receipt summary
  getSupplierSummary: asyncHandler(async (req, res) => {
    const { supplierId } = req.params;
    
    try {
      const summary = await supplierPaymentReceiptsService.getSupplierSummary(parseInt(supplierId));
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      const errorResponse = SupplierPaymentReceiptsErrorHandler.handleGetSupplierSummary(error);
      res.status(500).json(errorResponse);
    }
  }),

  // Get receipt statistics
  getStatistics: asyncHandler(async (req, res) => {
    const filters = req.query;
    
    try {
      const statistics = await supplierPaymentReceiptsService.getStatistics(filters);
      
      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      const errorResponse = SupplierPaymentReceiptsErrorHandler.handleGetStatistics(error);
      res.status(500).json(errorResponse);
    }
  }),

  // Get available purchases for a supplier
  getSupplierPurchases: asyncHandler(async (req, res) => {
    const { supplierId } = req.params;
    const { query } = require('../database');
    
    try {
      const purchases = query(`
        SELECT 
          id, invoice_no, invoice_date, total_amount, paid_amount, remaining_amount, payment_status
        FROM purchases 
        WHERE supplier_id = ? AND remaining_amount > 0
        ORDER BY invoice_date DESC
      `, [parseInt(supplierId)]);
      
      res.json({
        success: true,
        data: purchases
      });
    } catch (error) {
      const errorResponse = SupplierPaymentReceiptsErrorHandler.handleGetSupplierPurchases(error);
      res.status(500).json(errorResponse);
    }
  }),

  // Get receipt by receipt number
  getByReceiptNumber: asyncHandler(async (req, res) => {
    const { receiptNumber } = req.params;
    const { queryOne } = require('../database');
    
    try {
      const receipt = queryOne(`
        SELECT 
          spr.*,
          s.name as supplier_name,
          s.phone as supplier_phone,
          s.email as supplier_email,
          p.invoice_no as purchase_invoice_no,
          u.name as created_by_name
        FROM supplier_payment_receipts spr
        LEFT JOIN suppliers s ON spr.supplier_id = s.id
        LEFT JOIN purchases p ON spr.purchase_id = p.id
        LEFT JOIN users u ON spr.created_by = u.id
        WHERE spr.receipt_number = ?
      `, [receiptNumber]);
      
      if (!receipt) {
        return res.status(404).json({
          success: false,
          message: 'إيصال الدفع غير موجود'
        });
      }
      
      res.json({
        success: true,
        data: receipt
      });
    } catch (error) {
      const errorResponse = SupplierPaymentReceiptsErrorHandler.handleGetById(error);
      res.status(500).json(errorResponse);
    }
  }),

  // Bulk create receipts
  bulkCreate: asyncHandler(async (req, res) => {
    const { receipts } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(receipts) || receipts.length === 0) {
      return res.status(400).json(
        SupplierPaymentReceiptsErrorHandler.handleValidationError('receipts', 'مطلوب مصفوفة إيصالات غير فارغة')
      );
    }

    try {
      const createdReceipts = [];
      const errors = [];

      for (let i = 0; i < receipts.length; i++) {
        try {
          const receiptData = receipts[i];
          
          const receipt = await supplierPaymentReceiptsService.create(receiptData, userId);
          createdReceipts.push(receipt);
        } catch (error) {
          errors.push({
            index: i,
            errors: [error.message]
          });
        }
      }

      res.status(201).json({
        success: true,
        message: `تم إنشاء ${createdReceipts.length} إيصال بنجاح`,
        data: {
          created: createdReceipts,
          errors: errors
        }
      });
    } catch (error) {
      const errorResponse = SupplierPaymentReceiptsErrorHandler.handleCreate(error);
      res.status(400).json(errorResponse);
    }
  }),

  // Export receipts to CSV
  exportToCSV: asyncHandler(async (req, res) => {
    const { ...filters } = req.query;
    
    try {
      // Get all receipts without pagination for export
      const result = await supplierPaymentReceiptsService.getAll(filters, 1, 1000000);
      
      // Convert to CSV format
      const csvHeaders = [
        'رقم الإيصال',
        'اسم المورد',
        'هاتف المورد',
        'رقم فاتورة الشراء',
        'تاريخ الإيصال',
        'المبلغ',
        'طريقة الدفع',
        'رقم المرجع',
        'ملاحظات',
        'أنشئ بواسطة',
        'تاريخ الإنشاء'
      ];

      const csvRows = result.receipts.map(receipt => [
        receipt.receipt_number,
        receipt.supplier_name,
        receipt.supplier_phone,
        receipt.purchase_invoice_no,
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
      res.setHeader('Content-Disposition', 'attachment; filename="supplier_payment_receipts.csv"');
      res.send(csvContent);
    } catch (error) {
      const errorResponse = SupplierPaymentReceiptsErrorHandler.handleExportToCSV(error);
      res.status(500).json(errorResponse);
    }
  })
};

module.exports = supplierPaymentReceiptsController; 