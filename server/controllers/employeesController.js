const asyncHandler = require('../middleware/asyncHandler');
const { sendResponse } = require('../utils/response');
const employeesService = require('../services/employeesService');
const logger = require('../utils/logger');

// Get all employees
const getAllEmployees = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    
    const result = await employeesService.getAllEmployees(
      parseInt(page), 
      parseInt(limit), 
      search
    );
    
    sendResponse(res, 200, result, 'Employees retrieved successfully');
  } catch (error) {
    logger.error('Error in getAllEmployees:', error);
    sendResponse(res, 500, null, 'Failed to retrieve employees', error.message);
  }
});

// Get employee by ID
const getEmployeeById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    const employee = await employeesService.getEmployeeById(parseInt(id));
    
    if (!employee) {
      return sendResponse(res, 404, null, 'Employee not found');
    }
    
    sendResponse(res, 200, employee, 'Employee retrieved successfully');
  } catch (error) {
    logger.error('Error in getEmployeeById:', error);
    sendResponse(res, 500, null, 'Failed to retrieve employee', error.message);
  }
});

// Create new employee
const createEmployee = asyncHandler(async (req, res) => {
  try {
    const { 
      name, phone, email, address, salary, commission_rate, 
      commission_type, commission_amount, commission_start_date, 
      commission_end_date 
    } = req.body;
    
    // Validate required fields
    if (!name) {
      return sendResponse(res, 400, null, 'Name is required');
    }
    
    const result = await employeesService.createEmployee({
      name,
      phone,
      email,
      address,
      salary: salary ? parseFloat(salary) : 0,
      commission_rate: commission_rate ? parseFloat(commission_rate) : 0,
      commission_type: commission_type || 'percentage',
      commission_amount: commission_amount ? parseFloat(commission_amount) : 0,
      commission_start_date,
      commission_end_date
    });
    
    sendResponse(res, 201, result, 'Employee created successfully');
  } catch (error) {
    logger.error('Error in createEmployee:', error);
    sendResponse(res, 500, null, 'Failed to create employee', error.message);
  }
});

// Update employee
const updateEmployee = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, phone, email, address, salary, commission_rate, 
      commission_type, commission_amount, commission_start_date, 
      commission_end_date 
    } = req.body;
    
    // Validate required fields
    if (!name) {
      return sendResponse(res, 400, null, 'Name is required');
    }
    
    const result = await employeesService.updateEmployee(parseInt(id), {
      name,
      phone,
      email,
      address,
      salary: salary ? parseFloat(salary) : 0,
      commission_rate: commission_rate ? parseFloat(commission_rate) : 0,
      commission_type: commission_type || 'percentage',
      commission_amount: commission_amount ? parseFloat(commission_amount) : 0,
      commission_start_date,
      commission_end_date
    });
    
    sendResponse(res, 200, result, 'Employee updated successfully');
  } catch (error) {
    logger.error('Error in updateEmployee:', error);
    sendResponse(res, 500, null, 'Failed to update employee', error.message);
  }
});

// Delete employee
const deleteEmployee = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await employeesService.deleteEmployee(parseInt(id));
    
    sendResponse(res, 200, result, 'Employee deleted successfully');
  } catch (error) {
    logger.error('Error in deleteEmployee:', error);
    sendResponse(res, 500, null, 'Failed to delete employee', error.message);
  }
});

// Get employees for dropdown
const getEmployeesForDropdown = asyncHandler(async (req, res) => {
  try {
    const employees = await employeesService.getEmployeesForDropdown();
    
    sendResponse(res, 200, employees, 'Employees retrieved successfully');
  } catch (error) {
    logger.error('Error in getEmployeesForDropdown:', error);
    sendResponse(res, 500, null, 'Failed to retrieve employees', error.message);
  }
});

// Get employees with commission
const getEmployeesWithCommission = asyncHandler(async (req, res) => {
  try {
    const employees = await employeesService.getEmployeesWithCommission();
    
    sendResponse(res, 200, employees, 'Employees with commission retrieved successfully');
  } catch (error) {
    logger.error('Error in getEmployeesWithCommission:', error);
    sendResponse(res, 500, null, 'Failed to retrieve employees with commission', error.message);
  }
});

// Calculate commission
const calculateCommission = asyncHandler(async (req, res) => {
  try {
    const { employeeId, salesAmount, period = 'month' } = req.body;
    
    if (!employeeId || !salesAmount) {
      return sendResponse(res, 400, null, 'Employee ID and sales amount are required');
    }
    
    const result = await employeesService.calculateCommission(
      parseInt(employeeId), 
      parseFloat(salesAmount), 
      period
    );
    
    sendResponse(res, 200, result, 'Commission calculated successfully');
  } catch (error) {
    logger.error('Error in calculateCommission:', error);
    sendResponse(res, 500, null, 'Failed to calculate commission', error.message);
  }
});

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeesForDropdown,
  getEmployeesWithCommission,
  calculateCommission
};
