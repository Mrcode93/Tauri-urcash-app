const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const { sendResponse } = require('../utils/response');
const customersService = require('../services/customersService');
const logger = require('../utils/logger');
const { CustomersErrorHandler } = require('../utils/errorHandler');

class CustomersController {
  getAll = asyncHandler(async (req, res) => {
    try {
      const { page = 1, limit = 50, search, exclude_anonymous = true } = req.query;
      
      const filters = {};
      if (search) filters.search = search;
      if (exclude_anonymous) filters.exclude_anonymous = true;
      
      const result = await customersService.getAll({
        filters,
        page: parseInt(page),
        limit: parseInt(limit)
      });
      
      const successResponse = CustomersErrorHandler.createCustomerSuccessResponse(
        result, 
        'customers_fetched'
      );
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    } catch (err) {
      const errorResponse = CustomersErrorHandler.handleCustomerError(err, { 
        operation: 'getAll',
        req 
      });
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  });

  getById = asyncHandler(async (req, res) => {
    try {
      const customer = await customersService.getById(req.params.id);
      if (!customer) {
        const errorResponse = CustomersErrorHandler.handleCustomerError(
          new Error('Customer not found'), 
          { operation: 'getById', req }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
      }
      
      const successResponse = CustomersErrorHandler.createCustomerSuccessResponse(
        customer, 
        'customer_fetched'
      );
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    } catch (err) {
      const errorResponse = CustomersErrorHandler.handleCustomerError(err, { 
        operation: 'getById',
        req 
      });
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  });

  // New optimized endpoint for customer details
  getCustomerDetails = asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const customerId = parseInt(id);
      
      if (!customerId || isNaN(customerId)) {
        const errorResponse = CustomersErrorHandler.handleCustomerError(
          new Error('Invalid customer ID'), 
          { operation: 'getCustomerDetails', req }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
      }

      // Get all customer data in parallel for better performance
      const [
        customer,
        debts,
        installments,
        bills,
        receipts,
        financialSummary
      ] = await Promise.all([
        customersService.getById(customerId),
        customersService.getCustomerDebts(customerId),
        customersService.getCustomerInstallments(customerId),
        customersService.getCustomerBills(customerId),
        customersService.getCustomerReceipts(customerId),
        customersService.getCustomerFinancialSummary(customerId)
      ]);

      if (!customer) {
        const errorResponse = CustomersErrorHandler.handleCustomerError(
          new Error('Customer not found'), 
          { operation: 'getCustomerDetails', req }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
      }

      const customerDetails = {
        customer,
        debts: debts || [],
        installments: installments || [],
        bills: bills || [],
        receipts: receipts || [],
        financialSummary: financialSummary || null
      };

      logger.info('Customer details fetched successfully', { customerId });
      const successResponse = CustomersErrorHandler.createCustomerSuccessResponse(
        customerDetails, 
        'customer_details_fetched'
      );
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    } catch (err) {
      const errorResponse = CustomersErrorHandler.handleCustomerError(err, { 
        operation: 'getCustomerDetails',
        req 
      });
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  });

  create = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorResponse = CustomersErrorHandler.handleCustomerValidationError(errors.array(), req);
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
    }

    try {
      const customer = await customersService.create(req.body);
      const successResponse = CustomersErrorHandler.createCustomerSuccessResponse(
        customer, 
        'customer_created'
      );
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    } catch (err) {
      const errorResponse = CustomersErrorHandler.handleCustomerError(err, { 
        operation: 'create',
        req 
      });
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  });

  update = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorResponse = CustomersErrorHandler.handleCustomerValidationError(errors.array(), req);
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
    }

    try {
      const customer = await customersService.update(req.params.id, req.body);
      if (!customer) {
        const errorResponse = CustomersErrorHandler.handleCustomerError(
          new Error('Customer not found'), 
          { operation: 'update', req }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
      }
      
      const successResponse = CustomersErrorHandler.createCustomerSuccessResponse(
        customer, 
        'customer_updated'
      );
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    } catch (err) {
      const errorResponse = CustomersErrorHandler.handleCustomerError(err, { 
        operation: 'update',
        req 
      });
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  });

  delete = asyncHandler(async (req, res) => {
    try {
      const result = await customersService.delete(req.params.id);
      if (!result) {
        const errorResponse = CustomersErrorHandler.handleCustomerError(
          new Error('Customer not found'), 
          { operation: 'delete', req }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
      }
      
      const successResponse = CustomersErrorHandler.createCustomerSuccessResponse(
        null, 
        'customer_deleted'
      );
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    } catch (err) {
      const errorResponse = CustomersErrorHandler.handleCustomerError(err, { 
        operation: 'delete',
        req 
      });
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  });

  // Search customers
  search = asyncHandler(async (req, res) => {
    try {
      const { query } = req.query;
      if (!query) {
        const errorResponse = CustomersErrorHandler.handleCustomerError(
          new Error('Search query required'), 
          { operation: 'search', req }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
      }

      const customers = await customersService.searchCustomers(query);
      logger.info('Customer search completed', { query });
      
      const successResponse = CustomersErrorHandler.createCustomerSuccessResponse(
        { data: customers }, 
        'customer_search_completed'
      );
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    } catch (err) {
      const errorResponse = CustomersErrorHandler.handleCustomerError(err, { 
        operation: 'search',
        req 
      });
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  });

  // Get customer with their sales history
  getCustomerWithSales = asyncHandler(async (req, res) => {
    try {
      const customer = await customersService.getCustomerWithSales(req.params.id);
      if (!customer) {
        const errorResponse = CustomersErrorHandler.handleCustomerError(
          new Error('Customer not found'), 
          { operation: 'getCustomerWithSales', req }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
      }
      
      logger.info('Customer with sales fetched successfully', { customerId: req.params.id });
      const successResponse = CustomersErrorHandler.createCustomerSuccessResponse(
        { data: customer }, 
        'customer_sales_fetched'
      );
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    } catch (err) {
      const errorResponse = CustomersErrorHandler.handleCustomerError(err, { 
        operation: 'getCustomerWithSales',
        req 
      });
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  });

  // Reload customers cache
  reloadCache = asyncHandler(async (req, res) => {
    try {
      const startTime = logger.performance.start('CUSTOMERS_RELOAD_CACHE');
      
      // Reload all customers to cache
      const customers = await customersService.loadAllCustomersToCache();
      
      logger.performance.end('CUSTOMERS_RELOAD_CACHE', startTime, { 
        customersCount: customers.length 
      });
      
      const successResponse = CustomersErrorHandler.createCustomerSuccessResponse(
        { 
          message: 'Cache reloaded successfully',
          customersCount: customers.length,
          timestamp: new Date().toISOString()
        }, 
        'cache_reloaded'
      );
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    } catch (err) {
      const errorResponse = CustomersErrorHandler.handleCustomerError(err, { 
        operation: 'reloadCache',
        req 
      });
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  });
}

module.exports = new CustomersController(); 