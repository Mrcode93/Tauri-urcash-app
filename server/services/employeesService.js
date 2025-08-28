const { db, query, queryOne, insert, update, delete: deleteRecord } = require('../database/index.js');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');

class EmployeesService {
  constructor() {
    this.tableName = 'employees';
  }

  // Get all employees with pagination and search
  async getAllEmployees(page = 1, limit = 50, search = '') {
    try {
      const offset = (page - 1) * limit;
      let whereClause = 'WHERE 1=1';
      const params = [];

      if (search) {
        whereClause += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ? OR address LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const countSql = `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause}`;
      const totalResult = queryOne(countSql, params);
      const total = totalResult.total;

      const sql = `
        SELECT * FROM ${this.tableName} 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;

      const employees = query(sql, [...params, limit, offset]);

      return {
        employees,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting employees:', error);
      throw error;
    }
  }

  // Get employee by ID
  async getEmployeeById(id) {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
      return queryOne(sql, [id]);
    } catch (error) {
      logger.error('Error getting employee by ID:', error);
      throw error;
    }
  }

  // Create new employee
  async createEmployee(data) {
    try {
      const { 
        name, phone, email, address, salary, commission_rate, 
        commission_type, commission_amount, commission_start_date, 
        commission_end_date 
      } = data;

      // Validate required fields
      if (!name) {
        throw new Error('Name is required');
      }

      // Validate commission rate
      if (commission_rate && (commission_rate < 0 || commission_rate > 100)) {
        throw new Error('Commission rate must be between 0 and 100');
      }

      // Validate commission amount
      if (commission_amount && commission_amount < 0) {
        throw new Error('Commission amount cannot be negative');
      }

      // Validate salary
      if (salary && salary < 0) {
        throw new Error('Salary cannot be negative');
      }

      const sql = `
        INSERT INTO ${this.tableName} (
          name, phone, email, address, salary, commission_rate, 
          commission_type, commission_amount, commission_start_date, 
          commission_end_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      const result = insert(sql, [
        name, phone, email, address, salary, commission_rate,
        commission_type, commission_amount, commission_start_date,
        commission_end_date
      ]);

      // Invalidate cache
      cacheService.invalidateDataType('employees');

      return { id: result.lastInsertRowid };
    } catch (error) {
      logger.error('Error creating employee:', error);
      throw error;
    }
  }

  // Update employee
  async updateEmployee(id, data) {
    try {
      const { 
        name, phone, email, address, salary, commission_rate, 
        commission_type, commission_amount, commission_start_date, 
        commission_end_date 
      } = data;

      // Check if employee exists
      const existing = queryOne(`SELECT id FROM ${this.tableName} WHERE id = ?`, [id]);
      if (!existing) {
        throw new Error('Employee not found');
      }

      // Validate commission rate
      if (commission_rate && (commission_rate < 0 || commission_rate > 100)) {
        throw new Error('Commission rate must be between 0 and 100');
      }

      // Validate commission amount
      if (commission_amount && commission_amount < 0) {
        throw new Error('Commission amount cannot be negative');
      }

      // Validate salary
      if (salary && salary < 0) {
        throw new Error('Salary cannot be negative');
      }

      const sql = `
        UPDATE ${this.tableName} 
        SET name = ?, phone = ?, email = ?, address = ?, salary = ?, 
            commission_rate = ?, commission_type = ?, commission_amount = ?, 
            commission_start_date = ?, commission_end_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      update(sql, [
        name, phone, email, address, salary, commission_rate,
        commission_type, commission_amount, commission_start_date,
        commission_end_date, id
      ]);

      // Invalidate cache
      cacheService.invalidateDataType('employees');

      return { success: true };
    } catch (error) {
      logger.error('Error updating employee:', error);
      throw error;
    }
  }

  // Delete employee
  async deleteEmployee(id) {
    try {
      // Check if employee exists
      const existing = queryOne(`SELECT id FROM ${this.tableName} WHERE id = ?`, [id]);
      if (!existing) {
        throw new Error('Employee not found');
      }

      const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
      deleteRecord(sql, [id]);

      // Invalidate cache
      cacheService.invalidateDataType('employees');

      return { success: true };
    } catch (error) {
      logger.error('Error deleting employee:', error);
      throw error;
    }
  }

  // Get employees for dropdown
  async getEmployeesForDropdown() {
    try {
      const sql = `
        SELECT id, name, phone 
        FROM ${this.tableName} 
        ORDER BY name
      `;
      
      return query(sql);
    } catch (error) {
      logger.error('Error getting employees for dropdown:', error);
      throw error;
    }
  }

  // Get employees with commission information
  async getEmployeesWithCommission() {
    try {
      const sql = `
        SELECT 
          id, name, phone, email, salary, commission_rate, 
          commission_type, commission_amount, commission_start_date, 
          commission_end_date
        FROM ${this.tableName} 
        WHERE commission_rate > 0 OR commission_amount > 0
        ORDER BY name
      `;
      
      return query(sql);
    } catch (error) {
      logger.error('Error getting employees with commission:', error);
      throw error;
    }
  }

  // Calculate commission for an employee
  async calculateCommission(employeeId, salesAmount, period = 'month') {
    try {
      const employee = await this.getEmployeeById(employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      let commission = 0;

      if (employee.commission_type === 'percentage' && employee.commission_rate) {
        commission = (salesAmount * employee.commission_rate) / 100;
      } else if (employee.commission_type === 'fixed' && employee.commission_amount) {
        commission = employee.commission_amount;
      }

      return {
        employeeId,
        employeeName: employee.name,
        salesAmount,
        commissionRate: employee.commission_rate,
        commissionType: employee.commission_type,
        commissionAmount: employee.commission_amount,
        calculatedCommission: commission
      };
    } catch (error) {
      logger.error('Error calculating commission:', error);
      throw error;
    }
  }
}

module.exports = new EmployeesService();
