const asyncHandler = require('express-async-handler');
const { sendResponse } = require('../utils/response');
const reportsService = require('../services/reportsService');
const logger = require('../utils/logger');

const reportsController = {
  getDashboardSummary: asyncHandler(async (req, res) => {
    try {
      const { start, end, period } = req.query;
      const report = await reportsService.getDashboardSummary(start, end, period);
      sendResponse(res, 200, {report}, 'Dashboard summary fetched successfully');
    } catch (err) {
      logger.error('Error in getDashboardSummary:', err);
      sendResponse(res, 500, null, 'Failed to fetch dashboard summary', err.message);
    }
  }),

  getProfitLoss: asyncHandler(async (req, res) => {
    try {
      const { start, end } = req.query;
      if (!start || !end) {
        return sendResponse(res, 400, null, 'Start date and end date are required');
      }

      const reports = await reportsService.getProfitLoss(start, end);
      sendResponse(res, 200, {reports}, 'Profit and loss report fetched successfully');
    } catch (err) {
      logger.error('Error in getProfitLoss:', err);
      sendResponse(res, 500, null, 'Failed to fetch profit and loss report', err.message);
    }
  }),

  getReturnsReport: asyncHandler(async (req, res) => {
    try {
      const { start, end } = req.query;
      const returnsReport = await reportsService.getReturnsReport(start, end);
      sendResponse(res, 200, {returnsReport}, 'Returns report fetched successfully');
    } catch (err) {
      logger.error('Error in getReturnsReport:', err);
      sendResponse(res, 500, null, 'Failed to fetch returns report', err.message);
    }
  }),

  getStocksReport: asyncHandler(async (req, res) => {
    try {
      const { start, end, page = 1, limit = 50 } = req.query;
      const stocksReport = await reportsService.getStocksReport(start, end, parseInt(page), parseInt(limit));
      sendResponse(res, 200, {stocksReport}, 'Stocks report fetched successfully');
    } catch (err) {
      logger.error('Error in getStocksReport:', err);
      sendResponse(res, 500, null, 'Failed to fetch stocks report', err.message);
    }
  }),

  getSalesAnalysis: asyncHandler(async (req, res) => {
    try {
      const { start, end } = req.query;
      const salesAnalysis = await reportsService.getSalesAnalysis(start, end);
      sendResponse(res, 200, {salesAnalysis}, 'Sales analysis report fetched successfully');
    } catch (err) {
      logger.error('Error in getSalesAnalysis:', err);
      sendResponse(res, 500, null, 'Failed to fetch sales analysis report', err.message);
    }
  }),

  // Custom Reports Controllers
  getDelegatesReport: asyncHandler(async (req, res) => {
    try {
      const { start, end } = req.query;
      const delegatesReport = await reportsService.getDelegatesReport(start, end);
      sendResponse(res, 200, {delegatesReport}, 'Delegates report fetched successfully');
    } catch (err) {
      logger.error('Error in getDelegatesReport:', err);
      sendResponse(res, 500, null, 'Failed to fetch delegates report', err.message);
    }
  }),

  getCustomerReport: asyncHandler(async (req, res) => {
    try {
      const { start, end, paymentStatus } = req.query;
      const customerReport = await reportsService.getCustomerReport(start, end, paymentStatus);
      sendResponse(res, 200, {customerReport}, 'Customer report fetched successfully');
    } catch (err) {
      logger.error('Error in getCustomerReport:', err);
      sendResponse(res, 500, null, 'Failed to fetch customer report', err.message);
    }
  }),

  getSupplierReport: asyncHandler(async (req, res) => {
    try {
      const { start, end } = req.query;
      const supplierReport = await reportsService.getSupplierReport(start, end);
      sendResponse(res, 200, {supplierReport}, 'Supplier report fetched successfully');
    } catch (err) {
      logger.error('Error in getSupplierReport:', err);
      sendResponse(res, 500, null, 'Failed to fetch supplier report', err.message);
    }
  }),

  getSalesReport: asyncHandler(async (req, res) => {
    try {
      const { start, end, productId, customerId } = req.query;
      const salesReport = await reportsService.getSalesReport(start, end, productId, customerId);
      sendResponse(res, 200, {salesReport}, 'Sales report fetched successfully');
    } catch (err) {
      logger.error('Error in getSalesReport:', err);
      sendResponse(res, 500, null, 'Failed to fetch sales report', err.message);
    }
  }),

  getSpecificProductReport: asyncHandler(async (req, res) => {
    try {
      const { productId, start, end } = req.query;
      if (!productId) {
        return sendResponse(res, 400, null, 'Product ID is required');
      }
      const productReport = await reportsService.getSpecificProductReport(productId, start, end);
      sendResponse(res, 200, {productReport}, 'Product report fetched successfully');
    } catch (err) {
      logger.error('Error in getSpecificProductReport:', err);
      sendResponse(res, 500, null, 'Failed to fetch product report', err.message);
    }
  }),

  getCompanyReport: asyncHandler(async (req, res) => {
    try {
      const { companyId, start, end } = req.query;
      if (!companyId) {
        return sendResponse(res, 400, null, 'Company ID is required');
      }
      const companyReport = await reportsService.getCompanyReport(companyId, start, end);
      sendResponse(res, 200, {companyReport}, 'Company report fetched successfully');
    } catch (err) {
      logger.error('Error in getCompanyReport:', err);
      sendResponse(res, 500, null, 'Failed to fetch company report', err.message);
    }
  }),

  getStockReport: asyncHandler(async (req, res) => {
    try {
      const { start, end, categoryId } = req.query;
      const stockReport = await reportsService.getStockReport(start, end, categoryId);
      sendResponse(res, 200, {stockReport}, 'Stock report fetched successfully');
    } catch (err) {
      logger.error('Error in getStockReport:', err);
      sendResponse(res, 500, null, 'Failed to fetch stock report', err.message);
    }
  }),

  getDebtsReport: asyncHandler(async (req, res) => {
    try {
      const { start, end, debtType } = req.query;
      const debtsReport = await reportsService.getDebtsReport(start, end, debtType);
      sendResponse(res, 200, {debtsReport}, 'Debts report fetched successfully');
    } catch (err) {
      logger.error('Error in getDebtsReport:', err);
      sendResponse(res, 500, null, 'Failed to fetch debts report', err.message);
    }
  }),

  getMoneyBoxReport: asyncHandler(async (req, res) => {
    try {
      const { start, end, boxId } = req.query;
      const moneyBoxReport = await reportsService.getMoneyBoxReport(start, end, boxId);
      sendResponse(res, 200, {moneyBoxReport}, 'Money box report fetched successfully');
    } catch (err) {
      logger.error('Error in getMoneyBoxReport:', err);
      sendResponse(res, 500, null, 'Failed to fetch money box report', err.message);
    }
  }),

  getExpensesReport: asyncHandler(async (req, res) => {
    try {
      const { start, end, categoryId } = req.query;
      const expensesReport = await reportsService.getExpensesReport(start, end, categoryId);
      sendResponse(res, 200, {expensesReport}, 'Expenses report fetched successfully');
    } catch (err) {
      logger.error('Error in getExpensesReport:', err);
      sendResponse(res, 500, null, 'Failed to fetch expenses report', err.message);
    }
  }),

  getCustomerDebtsDetailedReport: asyncHandler(async (req, res) => {
    try {
      const { start, end, debtStatus } = req.query;
      const customerDebtsReport = await reportsService.getCustomerDebtsDetailedReport(start, end, debtStatus);
      sendResponse(res, 200, {customerDebtsReport}, 'Customer debts detailed report fetched successfully');
    } catch (err) {
      logger.error('Error in getCustomerDebtsDetailedReport:', err);
      sendResponse(res, 500, null, 'Failed to fetch customer debts detailed report', err.message);
    }
  }),
};

module.exports = reportsController; 