const { validationResult } = require('express-validator');
const asyncHandler = require('../middleware/asyncHandler');
const suppliersService = require('../services/suppliersService');
const logger = require('../utils/logger');
const { sendResponse } = require('../utils/response');
const { SuppliersErrorHandler } = require('../utils/errorHandler');

class SuppliersController {
  getAll = asyncHandler(async (req, res) => {
    try {
      const suppliers = await suppliersService.getAll();
      sendResponse(res, 200, suppliers);
    } catch (error) {
      logger.error('Error getting all suppliers:', error);
      const errorResponse = SuppliersErrorHandler.handleGetError(error);
      return sendResponse(res, errorResponse.status, null, errorResponse.message);
    }
  });

  getById = asyncHandler(async (req, res) => {
    try {
      const supplier = await suppliersService.getById(req.params.id);
      if (!supplier) {
        const errorResponse = SuppliersErrorHandler.handleNotFound();
        return sendResponse(res, errorResponse.status, null, errorResponse.message);
      }
      sendResponse(res, 200, supplier);
    } catch (error) {
      logger.error('Error getting supplier by ID:', error);
      const errorResponse = SuppliersErrorHandler.handleGetError(error);
      return sendResponse(res, errorResponse.status, null, errorResponse.message);
    }
  });

  search = asyncHandler(async (req, res) => {
    try {
      const { query } = req.query;
      if (!query) {
        const errorResponse = SuppliersErrorHandler.createErrorResponse(400, 'يجب إدخال مطلوب البحث');
        return sendResponse(res, errorResponse.status, null, errorResponse.message);
      }
      const suppliers = await suppliersService.search(query);
      sendResponse(res, 200, suppliers);
    } catch (error) {
      logger.error('Error searching suppliers:', error);
      const errorResponse = SuppliersErrorHandler.handleSearchError(error);
      return sendResponse(res, errorResponse.status, null, errorResponse.message);
    }
  });

  getSupplierWithProducts = asyncHandler(async (req, res) => {
    try {
      const supplier = await suppliersService.getSupplierWithProducts(req.params.id);
      if (!supplier) {
        const errorResponse = SuppliersErrorHandler.handleNotFound();
        return sendResponse(res, errorResponse.status, null, errorResponse.message);
      }
      sendResponse(res, 200, supplier);
    } catch (error) {
      logger.error('Error getting supplier with products:', error);
      const errorResponse = SuppliersErrorHandler.handleGetError(error);
      return sendResponse(res, errorResponse.status, null, errorResponse.message);
    }
  });

  create = asyncHandler(async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const validationErrors = errors.array().map(error => ({
          field: error.path,
          message: error.msg
        }));
        return sendResponse(res, 400, null, 'خطأ في التحقق من البيانات', validationErrors);
      }

      const supplier = await suppliersService.create(req.body);
      logger.info('New supplier created:', supplier);
      sendResponse(res, 201, supplier, 'تم إنشاء المورد بنجاح');
    } catch (error) {
      logger.error('Error creating supplier:', error);
      const errorResponse = SuppliersErrorHandler.handleCreateError(error);
      return sendResponse(res, errorResponse.status, null, errorResponse.message);
    }
  });

  update = asyncHandler(async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const validationErrors = errors.array().map(error => ({
          field: error.path,
          message: error.msg
        }));
        return sendResponse(res, 400, null, 'خطأ في التحقق من البيانات', validationErrors);
      }

      const supplier = await suppliersService.update(req.params.id, req.body);
      if (!supplier) {
        const errorResponse = SuppliersErrorHandler.handleNotFound();
        return sendResponse(res, errorResponse.status, null, errorResponse.message);
      }

      logger.info('Supplier updated:', supplier);
      sendResponse(res, 200, supplier, 'تم تحديث بيانات المورد بنجاح');
    } catch (error) {
      logger.error('Error updating supplier:', error);
      const errorResponse = SuppliersErrorHandler.handleUpdateError(error);
      return sendResponse(res, errorResponse.status, null, errorResponse.message);
    }
  });

  delete = asyncHandler(async (req, res) => {
    try {
      const result = await suppliersService.delete(req.params.id);
      if (!result) {
        const errorResponse = SuppliersErrorHandler.handleNotFound();
        return sendResponse(res, errorResponse.status, null, errorResponse.message);
      }

      logger.info('Supplier deleted:', req.params.id);
      sendResponse(res, 200, { id: req.params.id }, 'تم حذف المورد بنجاح');
    } catch (error) {
      logger.error('Error deleting supplier:', error);
      const errorResponse = SuppliersErrorHandler.handleDeleteError(error);
      return sendResponse(res, errorResponse.status, null, errorResponse.message);
    }
  });
}

module.exports = new SuppliersController(); 