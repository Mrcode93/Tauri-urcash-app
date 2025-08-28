const asyncHandler = require('../middleware/asyncHandler');
const billsService = require('../services/billsService');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

// ==================== SALE BILLS CONTROLLERS ====================

const createSaleBill = asyncHandler(async (req, res) => {
  const { billData, items, moneyBoxId, transactionNotes } = req.body;
  
  if (!billData || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Bill data and items are required'
    });
  }

  const result = await billsService.createSaleBill(billData, items, moneyBoxId, transactionNotes);
  
  if (result.success) {
    // Invalidate related caches after successful bill creation
    try {
      cacheService.invalidateMultipleDataTypes(['sales', 'debts', 'customers', 'cash_box', 'inventory']);
      logger.info('Cache invalidated after sale bill creation');
    } catch (cacheError) {
      logger.error('Error invalidating cache after sale bill creation:', cacheError);
      // Don't fail the response if cache invalidation fails
    }
    
    res.status(201).json(result);
  } else {
    res.status(400).json(result);
  }
});

const getAllSaleBills = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, ...filters } = req.query;
  
  
  
  const result = await billsService.getAllSaleBills(filters, parseInt(page), parseInt(limit));
  
  
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

const getSaleBillById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await billsService.getSaleById(parseInt(id));
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(404).json(result);
  }
});

const getBillByNumber = asyncHandler(async (req, res) => {
  const { billNumber } = req.params;
  
  const result = await billsService.getSaleByInvoiceNumber(billNumber);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(404).json(result);
  }
});

const updateBillPaymentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const paymentData = req.body;
  
  const result = await billsService.updateSalePaymentStatus(parseInt(id), paymentData);
  
  if (result.success) {
    // Invalidate related caches after payment status update
    try {
      cacheService.invalidateMultipleDataTypes(['sales', 'debts', 'customers', 'cash_box']);
      logger.info('Cache invalidated after sale payment status update');
    } catch (cacheError) {
      logger.error('Error invalidating cache after sale payment status update:', cacheError);
      // Don't fail the response if cache invalidation fails
    }
    
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

const deleteBill = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await billsService.deleteSale(parseInt(id));
  
  if (result.success) {
    // Invalidate related caches after sale deletion
    try {
      cacheService.invalidateMultipleDataTypes(['sales', 'debts', 'customers', 'cash_box', 'inventory']);
      logger.info('Cache invalidated after sale deletion');
    } catch (cacheError) {
      logger.error('Error invalidating cache after sale deletion:', cacheError);
      // Don't fail the response if cache invalidation fails
    }
    
    res.json(result);
  } else {
    res.status(404).json(result);
  }
});

// ==================== PURCHASE BILLS CONTROLLERS ====================

const createPurchaseBill = asyncHandler(async (req, res) => {
  const { billData, items, moneyBoxId, transactionNotes } = req.body;
  
  if (!billData || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Purchase data and items are required'
    });
  }

  const result = await billsService.createPurchaseBill(billData, items, moneyBoxId, transactionNotes);
  
  if (result.success) {
    // Invalidate related caches after successful purchase bill creation
    try {
      cacheService.invalidateMultipleDataTypes(['purchases', 'suppliers', 'inventory', 'cash_box', 'supplier_payment_receipts']);
      logger.info('Cache invalidated after purchase bill creation');
    } catch (cacheError) {
      logger.error('Error invalidating cache after purchase bill creation:', cacheError);
      // Don't fail the response if cache invalidation fails
    }
    
    res.status(201).json(result);
  } else {
    res.status(400).json(result);
  }
});

const getAllPurchaseBills = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, ...filters } = req.query;
  
  
  
  // Add cache busting headers to force fresh data
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  const result = await billsService.getAllPurchaseBills(filters, parseInt(page), parseInt(limit));
  
  
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

const getPurchaseBillById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await billsService.getPurchaseById(parseInt(id));
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(404).json(result);
  }
});

const getPurchaseByNumber = asyncHandler(async (req, res) => {
  const { invoiceNumber } = req.params;
  
  const result = await billsService.getPurchaseByInvoiceNumber(invoiceNumber);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(404).json(result);
  }
});

const updatePurchasePaymentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const paymentData = req.body;
  
  const result = await billsService.updatePurchasePaymentStatus(parseInt(id), paymentData);
  
  if (result.success) {
    // Invalidate related caches after purchase payment status update
    try {
      cacheService.invalidateMultipleDataTypes(['purchases', 'suppliers', 'cash_box', 'supplier_payment_receipts']);
      logger.info('Cache invalidated after purchase payment status update');
    } catch (cacheError) {
      logger.error('Error invalidating cache after purchase payment status update:', cacheError);
      // Don't fail the response if cache invalidation fails
    }
    
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

const deletePurchase = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await billsService.deletePurchase(parseInt(id));
  
  if (result.success) {
    // Invalidate related caches after purchase deletion
    try {
      cacheService.invalidateMultipleDataTypes(['purchases', 'suppliers', 'inventory', 'cash_box', 'supplier_payment_receipts']);
      logger.info('Cache invalidated after purchase deletion');
    } catch (cacheError) {
      logger.error('Error invalidating cache after purchase deletion:', cacheError);
      // Don't fail the response if cache invalidation fails
    }
    
    res.json(result);
  } else {
    res.status(404).json(result);
  }
});

// ==================== RETURN BILLS CONTROLLERS ====================

const createReturnBill = asyncHandler(async (req, res) => {
  const { returnData, items } = req.body;
  
  if (!returnData || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Return data and items are required'
    });
  }

  const result = await billsService.createReturnBill(returnData, items);
  
  if (result.success) {
    // Invalidate related caches after successful return bill creation
    try {
      const dataTypesToInvalidate = returnData.return_type === 'sale' 
        ? ['sales', 'sale_returns', 'customers', 'inventory', 'cash_box', 'statistics']
        : ['purchases', 'purchase_returns', 'suppliers', 'inventory', 'cash_box', 'statistics'];
      
      cacheService.invalidateMultipleDataTypes(dataTypesToInvalidate);
      logger.info(`Cache invalidated after ${returnData.return_type} return bill creation`);
    } catch (cacheError) {
      logger.error('Error invalidating cache after return bill creation:', cacheError);
      // Don't fail the response if cache invalidation fails
    }
    
    res.status(201).json(result);
  } else {
    res.status(400).json(result);
  }
});

const getAllReturnBills = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, ...filters } = req.query;
  
  logger.info(`Getting return bills - page: ${page}, limit: ${limit}, filters:`, filters);
  
  // Add cache busting headers to force fresh data
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  const result = await billsService.getAllReturnBills(filters, parseInt(page), parseInt(limit));
  
  logger.info(`Return bills result - success: ${result.success}, count: ${result.data?.length || 0}`);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

const getReturnBillById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type } = req.query; // 'sale' or 'purchase'
  
  if (!type || !['sale', 'purchase'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'Return type (sale or purchase) is required'
    });
  }
  
  const result = await billsService.getReturnById(parseInt(id), type);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(404).json(result);
  }
});

const getReturnByNumber = asyncHandler(async (req, res) => {
  const { returnNumber } = req.params;
  const { type } = req.query; // 'sale' or 'purchase'
  
  if (!type || !['sale', 'purchase'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'Return type (sale or purchase) is required'
    });
  }
  
  // This would need to be implemented in the service
  // For now, return a placeholder
  res.status(501).json({
    success: false,
    message: 'Get return by number not implemented yet'
  });
});

const getReturnsBySaleId = asyncHandler(async (req, res) => {
  const { saleId } = req.params;
  
  const result = await billsService.getReturnsBySaleId(parseInt(saleId));
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(404).json(result);
  }
});

const getReturnsByPurchaseId = asyncHandler(async (req, res) => {
  const { purchaseId } = req.params;
  
  const result = await billsService.getReturnsByPurchaseId(parseInt(purchaseId));
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(404).json(result);
  }
});

const deleteReturn = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type } = req.query; // 'sale' or 'purchase'
  
  if (!type || !['sale', 'purchase'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'Return type (sale or purchase) is required'
    });
  }
  
  const result = await billsService.deleteReturn(parseInt(id), type);
  
  if (result.success) {
    // Invalidate related caches after return deletion
    try {
      const dataTypesToInvalidate = type === 'sale' 
        ? ['sales', 'sale_returns', 'customers', 'inventory', 'cash_box', 'statistics']
        : ['purchases', 'purchase_returns', 'suppliers', 'inventory', 'cash_box', 'statistics'];
      
      cacheService.invalidateMultipleDataTypes(dataTypesToInvalidate);
      logger.info(`Cache invalidated after ${type} return deletion`);
    } catch (cacheError) {
      logger.error('Error invalidating cache after return deletion:', cacheError);
      // Don't fail the response if cache invalidation fails
    }
    
    res.json(result);
  } else {
    res.status(404).json(result);
  }
});

// ==================== STATISTICS CONTROLLERS ====================

const getBillsStatistics = asyncHandler(async (req, res) => {
  const filters = req.query;
  
  const result = await billsService.getBillsStatistics(filters);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

const getPurchasesStatistics = asyncHandler(async (req, res) => {
  const filters = req.query;
  
  const result = await billsService.getPurchasesStatistics(filters);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

const getReturnsStatistics = asyncHandler(async (req, res) => {
  const filters = req.query;
  
  const result = await billsService.getReturnsStatistics(filters);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

// ==================== PAYMENT VOUCHER CONTROLLERS ====================

const createSalePaymentVoucher = asyncHandler(async (req, res) => {
  const { saleId } = req.params;
  const userId = req.user.id;
  
  const result = await billsService.createSalePaymentVoucher(parseInt(saleId), userId);
  
  if (result.success) {
    // Invalidate related caches after payment voucher creation
    try {
      cacheService.invalidateMultipleDataTypes(['sales', 'cash_box', 'customer_receipts']);
      logger.info('Cache invalidated after sale payment voucher creation');
    } catch (cacheError) {
      logger.error('Error invalidating cache after sale payment voucher creation:', cacheError);
    }
    
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

const createPurchasePaymentVoucher = asyncHandler(async (req, res) => {
  const { purchaseId } = req.params;
  const userId = req.user.id;
  
  const result = await billsService.createPurchasePaymentVoucher(parseInt(purchaseId), userId);
  
  if (result.success) {
    // Invalidate related caches after payment voucher creation
    try {
      cacheService.invalidateMultipleDataTypes(['purchases', 'cash_box', 'supplier_payment_receipts']);
      logger.info('Cache invalidated after purchase payment voucher creation');
    } catch (cacheError) {
      logger.error('Error invalidating cache after purchase payment voucher creation:', cacheError);
    }
    
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

const createReturnPaymentVoucher = asyncHandler(async (req, res) => {
  const { returnId, returnType } = req.params;
  const userId = req.user.id;
  
  const result = await billsService.createReturnPaymentVoucher(parseInt(returnId), returnType, userId);
  
  if (result.success) {
    // Invalidate related caches after payment voucher creation
    try {
      cacheService.invalidateMultipleDataTypes(['returns', 'cash_box', 'customer_receipts', 'supplier_payment_receipts']);
      logger.info('Cache invalidated after return payment voucher creation');
    } catch (cacheError) {
      logger.error('Error invalidating cache after return payment voucher creation:', cacheError);
    }
    
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

const createBatchPaymentVouchers = asyncHandler(async (req, res) => {
  const { bills } = req.body;
  const userId = req.user.id;
  
  if (!bills || !Array.isArray(bills) || bills.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Bills array is required'
    });
  }
  
  const result = await billsService.createBatchPaymentVouchers(bills, userId);
  
  if (result.success) {
    // Invalidate related caches after batch payment voucher creation
    try {
      cacheService.invalidateMultipleDataTypes(['sales', 'purchases', 'returns', 'cash_box', 'customer_receipts', 'supplier_payment_receipts']);
      logger.info('Cache invalidated after batch payment voucher creation');
    } catch (cacheError) {
      logger.error('Error invalidating cache after batch payment voucher creation:', cacheError);
    }
    
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

// Debug endpoint to check database tables
const debugTables = asyncHandler(async (req, res) => {
  try {
    const db = require('../database');
    
    // Check if tables exist
    const tables = db.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('sales', 'purchases', 'sale_returns', 'purchase_returns')
      ORDER BY name
    `).all();
    
    // Count records in each table
    const salesCount = db.db.prepare('SELECT COUNT(*) as count FROM sales').get();
    const purchasesCount = db.db.prepare('SELECT COUNT(*) as count FROM purchases').get();
    const saleReturnsCount = db.db.prepare('SELECT COUNT(*) as count FROM sale_returns').get();
    const purchaseReturnsCount = db.db.prepare('SELECT COUNT(*) as count FROM purchase_returns').get();
    
    // Get sample data from each table
    const sampleSales = db.db.prepare('SELECT * FROM sales LIMIT 2').all();
    const samplePurchases = db.db.prepare('SELECT * FROM purchases LIMIT 2').all();
    const sampleSaleReturns = db.db.prepare('SELECT * FROM sale_returns LIMIT 2').all();
    const samplePurchaseReturns = db.db.prepare('SELECT * FROM purchase_returns LIMIT 2').all();
    
    res.json({
      success: true,
      data: {
        tables: tables,
        counts: {
          sales: salesCount.count,
          purchases: purchasesCount.count,
          saleReturns: saleReturnsCount.count,
          purchaseReturns: purchaseReturnsCount.count
        },
        samples: {
          sales: sampleSales,
          purchases: samplePurchases,
          saleReturns: sampleSaleReturns,
          purchaseReturns: samplePurchaseReturns
        }
      }
    });
  } catch (error) {
    console.error('Debug tables error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = {
  // Sale bills
  createSaleBill,
  getAllSaleBills,
  getSaleBillById,
  getBillByNumber,
  updateBillPaymentStatus,
  deleteBill,
  
  // Purchase bills
  createPurchaseBill,
  getAllPurchaseBills,
  getPurchaseBillById,
  getPurchaseByNumber,
  updatePurchasePaymentStatus,
  deletePurchase,
  
  // Return bills
  createReturnBill,
  getAllReturnBills,
  getReturnBillById,
  getReturnByNumber,
  getReturnsBySaleId,
  getReturnsByPurchaseId,
  deleteReturn,
  
  // Payment vouchers
  createSalePaymentVoucher,
  createPurchasePaymentVoucher,
  createReturnPaymentVoucher,
  createBatchPaymentVouchers,
  
  // Statistics
  getBillsStatistics,
  getPurchasesStatistics,
  getReturnsStatistics,
  
  // Debug
  debugTables
}; 