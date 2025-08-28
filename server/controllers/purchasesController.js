const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const { sendResponse } = require('../utils/response');
const purchasesService = require('../services/purchasesService');
const logger = require('../utils/logger');
const { PurchasesErrorHandler } = require('../utils/errorHandler');

class PurchasesController {
  getAll = asyncHandler(async (req, res) => {
    try {
      const purchases = await purchasesService.getAll();
      const successResponse = PurchasesErrorHandler.createPurchaseSuccessResponse(
        { purchases }, 
        'purchases_fetched'
      );
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    } catch (err) {
      const errorResponse = PurchasesErrorHandler.handlePurchaseError(err, { 
        operation: 'getAll',
        req 
      });
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  });

  getById = asyncHandler(async (req, res) => {
    try {
      const purchase = await purchasesService.getById(req.params.id);
      if (!purchase) {
        const errorResponse = PurchasesErrorHandler.handlePurchaseError(
          new Error('Purchase not found'), 
          { operation: 'getById', req }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
      }
      
      const successResponse = PurchasesErrorHandler.createPurchaseSuccessResponse(
        { purchase }, 
        'purchase_fetched'
      );
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    } catch (err) {
      const errorResponse = PurchasesErrorHandler.handlePurchaseError(err, { 
        operation: 'getById',
        req 
      });
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  });

  getByIdWithReturns = asyncHandler(async (req, res) => {
    try {
      const purchase = await purchasesService.getPurchaseWithReturns(req.params.id);
      if (!purchase) {
        const errorResponse = PurchasesErrorHandler.handlePurchaseError(
          new Error('Purchase not found'), 
          { operation: 'getByIdWithReturns', req }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
      }
      
      const successResponse = PurchasesErrorHandler.createPurchaseSuccessResponse(
        { purchase }, 
        'purchase_with_returns_fetched'
      );
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    } catch (err) {
      const errorResponse = PurchasesErrorHandler.handlePurchaseError(err, { 
        operation: 'getByIdWithReturns',
        req 
      });
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  });

  getSupplierPurchases = asyncHandler(async (req, res) => {
    try {
      const purchases = await purchasesService.getBySupplier(req.params.supplierId);
      const successResponse = PurchasesErrorHandler.createPurchaseSuccessResponse(
        { purchases }, 
        'supplier_purchases_fetched'
      );
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    } catch (err) {
      const errorResponse = PurchasesErrorHandler.handlePurchaseError(err, { 
        operation: 'getSupplierPurchases',
        req 
      });
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  });

  create = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorResponse = PurchasesErrorHandler.handlePurchaseValidationError(errors.array(), req);
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
    }

    try {
      const purchase = await purchasesService.create(req.body, req.user?.id);
      logger.info('New purchase created:', purchase);
      
      const successResponse = PurchasesErrorHandler.createPurchaseSuccessResponse(
        { purchase }, 
        'purchase_created'
      );
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    } catch (err) {
      logger.errorWithContext(err, { operation: 'create', userId: req.user?.id });
      
      // Handle specific duplicate errors
      if (err.message && (err.message.includes('duplicate') || 
                          err.message.includes('UNIQUE constraint failed') ||
                          err.message.includes('already exists'))) {
        const errorResponse = PurchasesErrorHandler.handlePurchaseError(
          new Error('تم إنشاء فاتورة مشتريات مماثلة مسبقاً، يرجى التحقق من قائمة المشتريات'),
          { operation: 'create', req }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
      }
      
      const errorResponse = PurchasesErrorHandler.handlePurchaseError(err, { 
        operation: 'create',
        req 
      });
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  });

  update = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorResponse = PurchasesErrorHandler.handlePurchaseValidationError(errors.array(), req);
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message, errorResponse.errors);
    }

    try {
      const purchase = await purchasesService.update(req.params.id, req.body, req.user?.id);
      if (!purchase) {
        const errorResponse = PurchasesErrorHandler.handlePurchaseError(
          new Error('Purchase not found'), 
          { operation: 'update', req }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
      }
      
      logger.info('Purchase updated:', purchase);
      const successResponse = PurchasesErrorHandler.createPurchaseSuccessResponse(
        { purchase }, 
        'purchase_updated'
      );
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    } catch (err) {
      const errorResponse = PurchasesErrorHandler.handlePurchaseError(err, { 
        operation: 'update',
        req 
      });
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  });

  delete = asyncHandler(async (req, res) => {
    try {
      const force = req.query.force === 'true' || req.body.force === true;
      const purchase = await purchasesService.delete(req.params.id, req.user?.id, force);
      if (!purchase) {
        const errorResponse = PurchasesErrorHandler.handlePurchaseError(
          new Error('Purchase not found'), 
          { operation: 'delete', req }
        );
        return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
      }
      
      logger.info('Purchase deleted:', purchase);
      const successResponse = PurchasesErrorHandler.createPurchaseSuccessResponse(
        null, 
        force ? 'purchase_force_deleted' : 'purchase_deleted'
      );
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    } catch (err) {
      const errorResponse = PurchasesErrorHandler.handlePurchaseError(err, { 
        operation: 'delete',
        req 
      });
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  });

  processReturn = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { items, reason, refund_method } = req.body;

    // Validate return data
    if (!items || !Array.isArray(items) || items.length === 0) {
      const errorResponse = PurchasesErrorHandler.handlePurchaseReturnError(
        new Error('Return items required'), 
        { operation: 'processReturn', req }
      );
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }

    if (!reason) {
      const errorResponse = PurchasesErrorHandler.handlePurchaseReturnError(
        new Error('Return reason required'), 
        { operation: 'processReturn', req }
      );
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }

    if (!refund_method) {
      const errorResponse = PurchasesErrorHandler.handlePurchaseReturnError(
        new Error('Refund method required'), 
        { operation: 'processReturn', req }
      );
      return sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }

    try {
      const result = await purchasesService.processPurchaseReturn(id, items, reason, req.user?.id);

      const successResponse = PurchasesErrorHandler.createPurchaseSuccessResponse(
        result, 
        'purchase_returned'
      );
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    } catch (error) {
      const errorResponse = PurchasesErrorHandler.handlePurchaseReturnError(error, { 
        operation: 'processReturn',
        req 
      });
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  });

  getReturns = asyncHandler(async (req, res) => {
    try {
      const returns = await purchasesService.getPurchaseReturns(req.params.id);
      const successResponse = PurchasesErrorHandler.createPurchaseSuccessResponse(
        { returns }, 
        'purchase_returns_fetched'
      );
      sendResponse(res, successResponse.statusCode, successResponse.data, successResponse.message);
    } catch (err) {
      const errorResponse = PurchasesErrorHandler.handlePurchaseError(err, { 
        operation: 'getReturns',
        req 
      });
      sendResponse(res, errorResponse.statusCode, null, errorResponse.message);
    }
  });
}

module.exports = new PurchasesController();