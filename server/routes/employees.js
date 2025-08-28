const express = require('express');
const router = express.Router();
const employeesController = require('../controllers/employeesController');
const { protect } = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

// Apply authentication to all routes
router.use(protect);

// Get all employees
router.get('/', authorize(['admin', 'manager']), employeesController.getAllEmployees);

// Get employee by ID
router.get('/:id', authorize(['admin', 'manager']), employeesController.getEmployeeById);

// Create new employee
router.post('/', authorize(['admin']), employeesController.createEmployee);

// Update employee
router.put('/:id', authorize(['admin']), employeesController.updateEmployee);

// Delete employee
router.delete('/:id', authorize(['admin']), employeesController.deleteEmployee);

// Get employees for dropdown
router.get('/dropdown/list', authorize(['admin', 'manager']), employeesController.getEmployeesForDropdown);

// Get employees with commission
router.get('/commission/list', authorize(['admin', 'manager']), employeesController.getEmployeesWithCommission);


// Calculate commission
router.post('/commission/calculate', authorize(['admin', 'manager']), employeesController.calculateCommission);

module.exports = router;
