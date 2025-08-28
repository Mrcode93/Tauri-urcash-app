const asyncHandler = require('../middleware/asyncHandler');
const { sendResponse } = require('../utils/response');
const delegateService = require('../services/delegateService');
const logger = require('../utils/logger');

// ===== BASIC DELEGATE MANAGEMENT =====

// Get all delegates
const getAllDelegates = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search = '' } = req.query;
  
  const result = await delegateService.getAllDelegates(
    parseInt(page), 
    parseInt(limit), 
    search
  );
  
  sendResponse(res, 200, result, 'Delegates retrieved successfully');
});

// Get delegate by ID
const getDelegateById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const delegate = await delegateService.getDelegateById(parseInt(id));
  if (!delegate) {
    return sendResponse(res, 404, 'Delegate not found');
  }
  
  sendResponse(res, 200, delegate, 'Delegate retrieved successfully');
});

// Create new delegate
const createDelegate = asyncHandler(async (req, res) => {
  const delegateData = req.body;
  
  const result = await delegateService.createDelegate(delegateData);
  
  sendResponse(res, 201, result, 'Delegate created successfully');
});

// Update delegate
const updateDelegate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  
  await delegateService.updateDelegate(parseInt(id), updateData);
  
  sendResponse(res, 200, null, 'Delegate updated successfully');
});

// Delete delegate
const deleteDelegate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  await delegateService.deleteDelegate(parseInt(id));
  
  sendResponse(res, 200, null, 'Delegate deleted successfully');
});

// ===== DELEGATE SALES MANAGEMENT =====

// Create delegate sale
const createDelegateSale = asyncHandler(async (req, res) => {
  const saleData = req.body;
  
  const result = await delegateService.createDelegateSale(saleData);
  
  sendResponse(res, 201, result, 'Delegate sale created successfully');
});

// Get delegate sales
const getDelegateSales = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 50 } = req.query;
  
  const result = await delegateService.getDelegateSales(
    parseInt(id), 
    parseInt(page), 
    parseInt(limit)
  );
  
  sendResponse(res, 200, result, 'Delegate sales retrieved successfully');
});

// ===== DELEGATE COLLECTIONS MANAGEMENT =====

// Create delegate collection
const createDelegateCollection = asyncHandler(async (req, res) => {
  const collectionData = req.body;
  
  const result = await delegateService.createDelegateCollection(collectionData);
  
  sendResponse(res, 201, result, 'Delegate collection created successfully');
});

// Get delegate collections
const getDelegateCollections = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 50 } = req.query;
  
  const result = await delegateService.getDelegateCollections(
    parseInt(id), 
    parseInt(page), 
    parseInt(limit)
  );
  
  sendResponse(res, 200, result, 'Delegate collections retrieved successfully');
});

// Get commission report for delegate
const getCommissionReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { start_date, end_date } = req.query;
  
  const result = await delegateService.getCommissionReport(
    parseInt(id),
    start_date,
    end_date
  );
  
  sendResponse(res, 200, result, 'Commission report retrieved successfully');
});

// Get delegate performance analytics
const getDelegatePerformance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { start_date, end_date } = req.query;
  
  const result = await delegateService.getDelegatePerformance(
    parseInt(id),
    start_date,
    end_date
  );
  
  sendResponse(res, 200, result, 'Delegate performance retrieved successfully');
});

// Check target achievement
const checkTargetAchievement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { period = 'monthly' } = req.query;
  
  const result = await delegateService.checkTargetAchievement(
    parseInt(id),
    period
  );
  
  sendResponse(res, 200, result, 'Target achievement checked successfully');
});

// Create collection
const createCollection = asyncHandler(async (req, res) => {
  const collectionData = req.body;
  
  const result = await delegateService.createCollection(collectionData);
  
  sendResponse(res, 201, result, 'Collection created successfully');
});

// Get collection summary
const getCollectionSummary = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { start_date, end_date } = req.query;
  
  const result = await delegateService.getCollectionSummary(
    parseInt(id),
    start_date,
    end_date
  );
  
  sendResponse(res, 200, result, 'Collection summary retrieved successfully');
});

// Assign customer to delegate
const assignCustomerToDelegate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { customer_id, notes } = req.body;
  
  const result = await delegateService.assignCustomerToDelegate(
    parseInt(customer_id),
    parseInt(id),
    notes
  );
  
  sendResponse(res, 201, result, 'Customer assigned to delegate successfully');
});

// Get assigned customers
const getAssignedCustomers = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await delegateService.getAssignedCustomers(parseInt(id));
  
  sendResponse(res, 200, result, 'Assigned customers retrieved successfully');
});

// Remove customer assignment
const removeCustomerAssignment = asyncHandler(async (req, res) => {
  const { id, customerId } = req.params;
  
  const result = await delegateService.removeCustomerAssignment(
    parseInt(customerId),
    parseInt(id)
  );
  
  sendResponse(res, 200, result, 'Customer assignment removed successfully');
});

// ===== DELEGATE COMMISSION MANAGEMENT =====

// Calculate delegate commission
const calculateDelegateCommission = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { period_start, period_end } = req.query;
  
  if (!period_start || !period_end) {
    return sendResponse(res, 400, 'Period start and end dates are required');
  }
  
  const result = await delegateService.calculateDelegateCommission(
    parseInt(id), 
    period_start, 
    period_end
  );
  
  sendResponse(res, 200, 'Commission calculated successfully', result);
});

// Create commission payment
const createCommissionPayment = asyncHandler(async (req, res) => {
  const paymentData = req.body;
  
  const result = await delegateService.createCommissionPayment(paymentData);
  
  sendResponse(res, 201, 'Commission payment created successfully', result);
});

// ===== DELEGATE PERFORMANCE REPORTS =====

// Generate performance report
const generatePerformanceReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { report_date, period_type = 'monthly' } = req.body;
  
  if (!report_date) {
    return sendResponse(res, 400, 'Report date is required');
  }
  
  const result = await delegateService.generatePerformanceReport(
    parseInt(id), 
    report_date, 
    period_type
  );
  
  sendResponse(res, 201, 'Performance report generated successfully', result);
});

// Get performance reports
const getPerformanceReports = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 50 } = req.query;
  
  const result = await delegateService.getPerformanceReports(
    parseInt(id), 
    parseInt(page), 
    parseInt(limit)
  );
  
  sendResponse(res, 200, 'Performance reports retrieved successfully', result);
});

// ===== DELEGATE DASHBOARD =====

// Get delegate dashboard
const getDelegateDashboard = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await delegateService.getDelegateDashboard(parseInt(id));
  
  sendResponse(res, 200, 'Delegate dashboard retrieved successfully', result);
});

// ===== CUSTOMER ASSIGNMENTS =====

// Get customers for dropdown
const getCustomersForDropdown = asyncHandler(async (req, res) => {
  const { query } = require('../database/index.js');
  
  const sql = `
    SELECT id, name, phone 
    FROM customers 
    WHERE is_active = 1 
    ORDER BY name
  `;
  
  const customers = query(sql);
  
  sendResponse(res, 200, 'Customers retrieved successfully', customers);
});

// Get delegates by customer ID
const getDelegatesByCustomerId = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  
  const { query } = require('../database/index.js');
  
  const sql = `
    SELECT 
      r.*,
      c.name as customer_name,
      c.phone as customer_phone
    FROM representatives r
    LEFT JOIN customers c ON r.customer_id = c.id
    WHERE r.customer_id = ? AND r.is_active = 1
    ORDER BY r.name
  `;
  
  const delegates = query(sql, [parseInt(customerId)]);
  
  sendResponse(res, 200, 'Delegates retrieved successfully', delegates);
});

// ===== BULK OPERATIONS =====

// Bulk generate performance reports for all delegates
const bulkGeneratePerformanceReports = asyncHandler(async (req, res) => {
  const { report_date, period_type = 'monthly' } = req.body;
  
  if (!report_date) {
    return sendResponse(res, 400, 'Report date is required');
  }
  
  const { query } = require('../database/index.js');
  
  // Get all active delegates
  const delegates = query('SELECT id FROM representatives WHERE is_active = 1');
  
  const results = [];
  for (const delegate of delegates) {
    try {
      const result = await delegateService.generatePerformanceReport(
        delegate.id, 
        report_date, 
        period_type
      );
      results.push({ delegate_id: delegate.id, success: true, report_id: result.id });
    } catch (error) {
      logger.error(`Error generating report for delegate ${delegate.id}:`, error);
      results.push({ delegate_id: delegate.id, success: false, error: error.message });
    }
  }
  
  sendResponse(res, 200, 'Bulk performance reports generated', results);
});

// ===== ANALYTICS =====

// Get delegate analytics summary
const getDelegateAnalytics = asyncHandler(async (req, res) => {
  const { period_start, period_end } = req.query;
  
  if (!period_start || !period_end) {
    return sendResponse(res, 400, 'Period start and end dates are required');
  }
  
  const { query } = require('../database/index.js');
  
  // Get overall statistics
  const overallStats = query(`
    SELECT 
      COUNT(DISTINCT ds.delegate_id) as total_delegates,
      COUNT(ds.id) as total_sales,
      SUM(ds.total_amount) as total_sales_amount,
      SUM(ds.commission_amount) as total_commission,
      COUNT(dc.id) as total_collections,
      SUM(dc.collection_amount) as total_collections_amount
    FROM delegate_sales ds
    LEFT JOIN delegate_collections dc ON ds.delegate_id = dc.delegate_id 
      AND DATE(dc.collection_date) BETWEEN ? AND ?
    WHERE DATE(ds.created_at) BETWEEN ? AND ?
  `, [period_start, period_end, period_start, period_end]);
  
  // Get top performing delegates
  const topDelegates = query(`
    SELECT 
      r.id,
      r.name,
      COUNT(ds.id) as total_sales,
      SUM(ds.total_amount) as total_sales_amount,
      SUM(ds.commission_amount) as total_commission,
      SUM(dc.collection_amount) as total_collections
    FROM representatives r
    LEFT JOIN delegate_sales ds ON r.id = ds.delegate_id 
      AND DATE(ds.created_at) BETWEEN ? AND ?
    LEFT JOIN delegate_collections dc ON r.id = dc.delegate_id 
      AND DATE(dc.collection_date) BETWEEN ? AND ?
    WHERE r.is_active = 1
    GROUP BY r.id, r.name
    ORDER BY total_sales_amount DESC
    LIMIT 10
  `, [period_start, period_end, period_start, period_end]);
  
  // Get sales trend
  const salesTrend = query(`
    SELECT 
      DATE(ds.created_at) as date,
      COUNT(ds.id) as sales_count,
      SUM(ds.total_amount) as sales_amount
    FROM delegate_sales ds
    WHERE DATE(ds.created_at) BETWEEN ? AND ?
    GROUP BY DATE(ds.created_at)
    ORDER BY date
  `, [period_start, period_end]);
  
  const analytics = {
    overall: overallStats[0] || {
      total_delegates: 0,
      total_sales: 0,
      total_sales_amount: 0,
      total_commission: 0,
      total_collections: 0,
      total_collections_amount: 0
    },
    top_delegates: topDelegates,
    sales_trend: salesTrend
  };
  
  sendResponse(res, 200, 'Delegate analytics retrieved successfully', analytics);
});

module.exports = {
  // Basic delegate management
  getAllDelegates,
  getDelegateById,
  createDelegate,
  updateDelegate,
  deleteDelegate,
  
  // Delegate sales
  createDelegateSale,
  getDelegateSales,
  
  // Delegate collections
  createDelegateCollection,
  getDelegateCollections,
  
  // Commission management
  getCommissionReport,
  calculateDelegateCommission,
  createCommissionPayment,
  
  // Performance analytics
  getDelegatePerformance,
  checkTargetAchievement,
  
  // Collections
  createCollection,
  getCollectionSummary,
  
  // Customer assignments
  assignCustomerToDelegate,
  getAssignedCustomers,
  removeCustomerAssignment,
  
  // Performance reports
  generatePerformanceReport,
  getPerformanceReports,
  
  // Dashboard
  getDelegateDashboard,
  
  // Customer assignments
  getCustomersForDropdown,
  getDelegatesByCustomerId,
  
  // Bulk operations
  bulkGeneratePerformanceReports,
  
  // Analytics
  getDelegateAnalytics
};
