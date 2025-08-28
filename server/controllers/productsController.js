const BaseController = require('./baseController');
const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const productsService = require('../services/productsService');
const logger = require('../utils/logger');
const { sendResponse } = require('../utils/response');

class ProductsController extends BaseController {
  constructor() {
    super(productsService);
  }

  getAll = asyncHandler(async (req, res) => {
    try {
      const { page = 1, limit = 1000, ...filters } = req.query;
      const result = await this.service.getAll({ page, limit, filters });
      
      // Return products in the format expected by the frontend
      if (req.query.format === 'simple') {
        // For stocks page, return simple format
        const products = result.items || result;
        res.json({
          success: true,
          data: products,
          message: 'Products retrieved successfully'
        });
      } else {
        sendResponse(res, 200, result);
      }
    } catch (err) {
      logger.error('Error getting all products:', err);
      sendResponse(res, 500, null, 'Failed to fetch products');
    }
  });

  getById = asyncHandler(async (req, res) => {
    try {
      const product = await this.service.getById(req.params.id);
      if (!product) {
        return sendResponse(res, 404, null, 'Product not found');
      }
      sendResponse(res, 200, product);
    } catch (err) {
      logger.error('Error getting product by ID:', err);
      sendResponse(res, 500, null, 'Failed to fetch product');
    }
  });

  create = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, 400, null, 'Validation error', errors.array());
    }

    try {
      const product = await this.service.create(req.body);
      logger.info('New product created:', product);
      sendResponse(res, 201, product, 'Product created successfully');
    } catch (err) {
      logger.error('Error creating product:', err);
      sendResponse(res, 500, null, 'Failed to create product');
    }
  });

  update = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, 400, null, 'Validation error', errors.array());
    }

    try {
      const product = await this.service.update(req.params.id, req.body);
      if (!product) {
        return sendResponse(res, 404, null, 'Product not found');
      }
      logger.info('Product updated:', product);
      sendResponse(res, 200, product, 'Product updated successfully');
    } catch (err) {
      logger.error('Error updating product:', err);
      sendResponse(res, 500, null, 'Failed to update product');
    }
  });

  delete = asyncHandler(async (req, res) => {
    try {
      const product = await this.service.delete(req.params.id);
      if (!product) {
        return sendResponse(res, 404, null, 'Product not found');
      }
      logger.info('Product deleted:', product);
      sendResponse(res, 200, product, 'Product deleted successfully');
    } catch (err) {
      logger.error('Error deleting product:', err);
      sendResponse(res, 500, null, 'Failed to delete product');
    }
  });

  search = asyncHandler(async (req, res) => {
    try {
      const { query } = req.query;
      if (!query) {
        return sendResponse(res, 400, null, 'Search query is required');
      }

      const products = await this.service.searchProducts(query);
      logger.info('Product search completed:', { query });
      sendResponse(res, 200, products, 'Products found');
    } catch (err) {
      logger.error('Error searching products:', err);
      sendResponse(res, 500, null, 'Failed to search products');
    }
  });

  getLowStock = asyncHandler(async (req, res) => {
    try {
      const { threshold = 10 } = req.query;
      const products = await this.service.getLowStock(parseInt(threshold));
      logger.info('Low stock products fetched:', { threshold });
      sendResponse(res, 200, products, 'Low stock products fetched successfully');
    } catch (err) {
      logger.error('Error getting low stock products:', err);
      sendResponse(res, 500, null, 'Failed to fetch low stock products');
    }
  });

  getByBarcode = asyncHandler(async (req, res) => {
    try {
      const { barcode } = req.params;
      const product = await this.service.getProductByBarcode(barcode);
      if (!product) {
        return sendResponse(res, 404, null, 'Product not found');
      }
      logger.info('Product found by barcode:', { barcode });
      sendResponse(res, 200, product, 'Product found successfully');
    } catch (err) {
      logger.error('Error getting product by barcode:', err);
      sendResponse(res, 500, null, 'Failed to fetch product');
    }
  });

  getForPOS = asyncHandler(async (req, res) => {
    try {
      const { page = 1, limit = 100, search, category, fields } = req.query;
      const result = await this.service.getForPOS({ 
        page: parseInt(page), 
        limit: parseInt(limit), 
        search, 
        category,
        fields 
      });
      sendResponse(res, 200, result);
    } catch (err) {
      logger.error('Error getting products for POS:', err);
      sendResponse(res, 500, null, 'Failed to fetch products for POS');
    }
  });

  updateStock = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, 400, null, 'Validation error', errors.array());
    }

    try {
      const { quantity } = req.body;
      const result = await this.service.updateStock(req.params.id, quantity);
      logger.info('Product stock updated:', { productId: req.params.id, quantity });
      sendResponse(res, 200, result, 'Stock updated successfully');
    } catch (err) {
      logger.error('Error updating product stock:', err);
      sendResponse(res, 500, null, 'Failed to update product stock');
    }
  });
}

module.exports = new ProductsController(); 