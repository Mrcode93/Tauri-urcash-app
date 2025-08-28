const { sendResponse } = require('../utils/response');
const logger = require('../utils/logger');

class BaseController {
  constructor(service) {
    this.service = service;
  }

  // Generic create method
  create = async (req, res) => {
    try {
      const result = await this.service.create(req.body);
      sendResponse(res, 201, 'Created successfully', { data: result });
    } catch (err) {
      logger.error(`Error in ${this.constructor.name}.create:`, err);
      sendResponse(res, 400, err.message, null, err);
    }
  };

  // Generic get all method
  getAll = async (req, res) => {
    try {
      const { page = 1, limit = 10, ...filters } = req.query;
      const result = await this.service.getAll({ page, limit, filters });
      res.json(result);
    } catch (err) {
      logger.error(`Error in ${this.constructor.name}.getAll:`, err);
      sendResponse(res, 400, err.message, null, err);
    }
  };

  // Generic get by id method
  getById = async (req, res) => {
    try {
      const result = await this.service.getById(req.params.id);
      if (!result) {
        return sendResponse(res, 404, 'Not found');
      }
      sendResponse(res, 200, 'Fetched successfully', { data: result });
    } catch (err) {
      logger.error(`Error in ${this.constructor.name}.getById:`, err);
      sendResponse(res, 400, err.message, null, err);
    }
  };

  // Generic update method
  update = async (req, res) => {
    try {
      const result = await this.service.update(req.params.id, req.body);
      if (!result) {
        return sendResponse(res, 404, 'Not found');
      }
      sendResponse(res, 200, 'Updated successfully', { data: result });
    } catch (err) {
      logger.error(`Error in ${this.constructor.name}.update:`, err);
      sendResponse(res, 400, err.message, null, err);
    }
  };

  // Generic delete method
  delete = async (req, res) => {
    try {
      const result = await this.service.delete(req.params.id);
      if (!result) {
        return sendResponse(res, 404, 'Not found');
      }
      sendResponse(res, 200, 'Deleted successfully', { data: result });
    } catch (err) {
      logger.error(`Error in ${this.constructor.name}.delete:`, err);
      sendResponse(res, 400, err.message, null, err);
    }
  };
}

module.exports = BaseController; 