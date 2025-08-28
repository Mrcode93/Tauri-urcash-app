const db = require('../database');
const logger = require('../utils/logger');
const BaseService = require('./baseService');
const cacheService = require('./cacheService');

class CustomersService extends BaseService {
  constructor() {
    super('customers');
  }

  // Load all customers into cache for fast lookups
  loadAllCustomersToCache() {
    try {
      const query = `
        SELECT 
          c.*,
          COALESCE(SUM(s.total_amount), 0) as total_sales,
          COALESCE(COUNT(s.id), 0) as sales_count,
          COALESCE(SUM(d.amount), 0) as total_debts,
          COALESCE(COUNT(d.id), 0) as debts_count
        FROM customers c
        LEFT JOIN sales s ON c.id = s.customer_id
        LEFT JOIN debts d ON c.id = d.customer_id
        WHERE c.is_active = 1
        GROUP BY c.id
        ORDER BY c.name ASC
      `;
      
      const customers = db.query(query);
      
      // Convert customer data
      const customersWithData = customers.map(customer => this._convertCustomerData(customer));
      
      // Store all customers in cache for 10 minutes
      cacheService.set('customers:all_customers', customersWithData, 600);
      
      // Create phone/email index for fast lookup
      const phoneIndex = {};
      const emailIndex = {};
      customersWithData.forEach(customer => {
        if (customer.phone) {
          phoneIndex[customer.phone] = customer;
        }
        if (customer.email) {
          emailIndex[customer.email] = customer;
        }
      });
      
      // Cache indexes for 10 minutes
      cacheService.set('customers:phone_index', phoneIndex, 600);
      cacheService.set('customers:email_index', emailIndex, 600);
      
      // Loaded customers into cache
      return customersWithData;
    } catch (err) {
      logger.error('Error loading all customers to cache:', err);
      throw new Error('Failed to load customers to cache');
    }
  }

  // Override create method to handle empty emails and boolean values
  create(data) {
    try {
      // Convert empty email strings to null to avoid UNIQUE constraint violations
      const processedData = { ...data };
      if (processedData.email === '' || processedData.email === null || processedData.email === undefined) {
        processedData.email = null;
      }

      // Convert boolean values to integers for SQLite compatibility
      if (typeof processedData.is_active === 'boolean') {
        processedData.is_active = processedData.is_active ? 1 : 0;
      }

      const fields = Object.keys(processedData);
      const placeholders = fields.map(() => '?').join(', ');
      const values = Object.values(processedData);

      const lastId = db.insert(
        `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`,
        values
      );

      // Invalidate all related caches
      cacheService.invalidatePattern('customers:list:*');
      cacheService.invalidatePattern('customers:customer:*');
      cacheService.del('customers:all_customers');
      cacheService.del('customers:phone_index');
      cacheService.del('customers:email_index');
      logger.debug('Cache invalidated for customer creation');

      return this.getById(lastId);
    } catch (err) {
      logger.error(`Error in ${this.constructor.name}.create:`, err);
      throw err;
    }
  }

  // Override update method to handle empty emails and boolean values
  update(id, data) {
    try {
      // Convert empty email strings to null to avoid UNIQUE constraint violations
      const processedData = { ...data };
      if (processedData.email === '' || processedData.email === null || processedData.email === undefined) {
        processedData.email = null;
      }

      // Convert boolean values to integers for SQLite compatibility
      if (typeof processedData.is_active === 'boolean') {
        processedData.is_active = processedData.is_active ? 1 : 0;
      }

      const fields = Object.keys(processedData);
      if (fields.length === 0) return null;

      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = [...Object.values(processedData), id];

      const changes = db.update(
        `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`,
        values
      );

      if (changes > 0) {
        // Invalidate all related caches
        cacheService.invalidatePattern('customers:list:*');
        cacheService.invalidatePattern('customers:customer:*');
        cacheService.del('customers:all_customers');
        cacheService.del('customers:phone_index');
        cacheService.del('customers:email_index');
        logger.debug('Cache invalidated for customer update');
      }

      return changes > 0 ? this.getById(id) : null;
    } catch (err) {
      logger.error(`Error in ${this.constructor.name}.update:`, err);
      throw err;
    }
  }

  // Override getById to convert data properly
  getById(id) {
    try {
      // Generate cache key for customer
      const cacheKey = `customers:customer:${id}`;
      
      // Try to get from cache first
      const cached = cacheService.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for customer: ${id}`);
        return cached;
      }
      
      const customer = db.queryOne(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
      const result = this._convertCustomerData(customer);
      
      if (result) {
        // Cache the customer for 10 minutes
        cacheService.set(cacheKey, result, 600);
        logger.debug(`Cache set for customer: ${id}`);
      }
      
      return result;
    } catch (err) {
      logger.error(`Error in ${this.constructor.name}.getById:`, err);
      throw err;
    }
  }

  // Helper method to convert customer data from database format
  _convertCustomerData(customer) {
    if (!customer) return customer;
    
    return {
      ...customer,
      is_active: Boolean(customer.is_active),
      credit_limit: Number(customer.credit_limit),
      current_balance: Number(customer.current_balance)
    };
  }

  // Helper method to convert array of customer data
  _convertCustomersData(customers) {
    return customers.map(customer => this._convertCustomerData(customer));
  }

  // Override delete method to handle cache invalidation
  delete(id) {
    try {
      const changes = db.update(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
      
      if (changes > 0) {
        // Invalidate all related caches
        cacheService.invalidatePattern('customers:list:*');
        cacheService.invalidatePattern('customers:customer:*');
        cacheService.del('customers:all_customers');
        cacheService.del('customers:phone_index');
        cacheService.del('customers:email_index');
        logger.debug('Cache invalidated for customer deletion');
      }
      
      return changes > 0;
    } catch (err) {
      logger.error(`Error in ${this.constructor.name}.delete:`, err);
      throw err;
    }
  }

  // Optimized getAll method with search and pagination
  async getAll({ filters = {}, page = 1, limit = 50 } = {}) {
    try {
      // Generate cache key based on parameters
      const cacheKey = `customers:list:${JSON.stringify({ filters, page, limit })}`;
      
      // Try to get from cache first
      const cached = cacheService.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for customers list: ${cacheKey}`);
        return cached;
      }
      
      // Try to use cached all customers for simple queries
      if (!filters.search && filters.exclude_anonymous) {
        const allCustomers = cacheService.get('customers:all_customers');
        if (allCustomers) {
          // Filter out anonymous customers
          const filteredCustomers = allCustomers.filter(customer => 
            customer.name.toLowerCase() !== 'anonymous'
          );
          
          // Apply pagination
          const offset = (page - 1) * limit;
          const paginatedCustomers = filteredCustomers.slice(offset, offset + limit);
          
          const result = {
            items: paginatedCustomers,
            total: filteredCustomers.length,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(filteredCustomers.length / limit),
            hasMore: (page * limit) < filteredCustomers.length
          };
          
          // Cache the result for 5 minutes
          cacheService.set(cacheKey, result, 300);
          logger.debug(`Cache set for customers list from all customers cache: ${cacheKey}`);
          
          return result;
        }
      }
      
      const offset = (page - 1) * limit;
      
      // Build WHERE conditions
      let whereConditions = ['1=1'];
      const values = [];

      // Add filters
      if (filters.search) {
        whereConditions.push('(name LIKE ? OR email LIKE ? OR phone LIKE ? OR address LIKE ?)');
        const searchPattern = `%${filters.search}%`;
        values.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }
      
      if (filters.exclude_anonymous) {
        whereConditions.push('LOWER(name) != ?');
        values.push('anonymous');
      }

      const whereClause = whereConditions.join(' AND ');

      // Optimized query with pagination - now includes all fields
      const query = `
        SELECT 
          id,
          name,
          email,
          phone,
          address,
          credit_limit,
          current_balance,
          is_active,
          customer_type,
          tax_number,
          created_at,
          updated_at
        FROM customers
        WHERE ${whereClause}
        ORDER BY name ASC
        LIMIT ? OFFSET ?
      `;

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM customers
        WHERE ${whereClause}
      `;

      const [customers, totalResult] = await Promise.all([
        db.query(query, [...values, limit, offset]),
        db.queryOne(countQuery, values)
      ]);

      const total = totalResult ? totalResult.total : 0;
      const totalPages = Math.ceil(total / limit);

      const result = {
        items: this._convertCustomersData(customers),
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages
      };
      
      // Cache the result for 5 minutes
      cacheService.set(cacheKey, result, 300);
      logger.debug(`Cache set for customers list: ${cacheKey}`);
      
      return result;
    } catch (err) {
      logger.error('Error in CustomersService.getAll:', err);
      throw new Error('Failed to fetch customers');
    }
  }

  // Add any customer-specific methods here
  searchCustomers(query) {
    try {
      // Try to use cached all customers for search
      const allCustomers = cacheService.get('customers:all_customers');
      if (allCustomers) {
        const searchTerm = query.trim().toLowerCase();
        const filteredCustomers = allCustomers.filter(customer => 
          customer.name.toLowerCase() !== 'anonymous' &&
          (customer.name?.toLowerCase().includes(searchTerm) ||
           customer.email?.toLowerCase().includes(searchTerm) ||
           customer.phone?.toLowerCase().includes(searchTerm) ||
           customer.address?.toLowerCase().includes(searchTerm))
        );
        
        logger.debug(`Search completed using cached data: ${filteredCustomers.length} results`);
        return filteredCustomers;
      }
      
      // Fallback to database query
      const searchPattern = `%${query}%`;
      const customers = db.query(`
        SELECT * FROM customers 
        WHERE name LIKE ? 
        OR email LIKE ? 
        OR phone LIKE ?
        AND LOWER(name) != 'anonymous'
        ORDER BY name ASC
      `, [searchPattern, searchPattern, searchPattern]);
      
      return this._convertCustomersData(customers);
    } catch (err) {
      logger.error('Search customers error:', err);
      throw err;
    }
  }

  getCustomerWithSales(customerId) {
    try {
      const customer = this.getById(customerId);
      if (!customer) return null;

      const sales = db.query(`
        SELECT s.*, 
          GROUP_CONCAT(
            json_object(
              'product_id', si.product_id,
              'quantity', si.quantity,
              'price', si.price
            )
          ) as items
        FROM sales s
        LEFT JOIN sale_items si ON s.id = si.sale_id
        WHERE s.customer_id = ?
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `, [customerId]);

      return {
        ...customer,
        sales: sales.map(sale => ({
          ...sale,
          items: sale.items ? sale.items.split(',').map(item => JSON.parse(item)) : []
        }))
      };
    } catch (err) {
      logger.error('Get customer with sales error:', err);
      throw err;
    }
  }

  // New optimized methods for customer details
  getCustomerDebts(customerId) {
    try {
      return db.query(`
        SELECT 
          s.id as sale_id,
          s.invoice_no,
          s.customer_id,
          c.name as customer_name,
          s.total_amount,
          s.paid_amount,
          (s.total_amount - COALESCE(s.paid_amount, 0)) as remaining_amount,
          s.due_date,
          CASE 
            WHEN s.paid_amount >= s.total_amount THEN 'paid'
            WHEN s.paid_amount > 0 THEN 'partial'
            ELSE 'pending'
          END as status,
          s.created_at,
          s.updated_at
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        WHERE s.customer_id = ? AND s.total_amount > COALESCE(s.paid_amount, 0)
        ORDER BY s.due_date ASC
      `, [customerId]);
    } catch (err) {
      logger.error('Error getting customer debts:', err);
      return [];
    }
  }

  getCustomerInstallments(customerId) {
    try {
      return db.query(`
        SELECT 
          i.*,
          s.invoice_no
        FROM installments i
        LEFT JOIN sales s ON i.sale_id = s.id
        WHERE i.customer_id = ?
        ORDER BY i.due_date ASC
      `, [customerId]);
    } catch (err) {
      logger.error('Error getting customer installments:', err);
      return [];
    }
  }

  getCustomerBills(customerId) {
    try {
      return db.query(`
        SELECT 
          s.id,
          s.invoice_no,
          s.invoice_date,
          s.due_date,
          s.total_amount,
          s.paid_amount,
          (s.total_amount - s.paid_amount) as remaining_amount,
          s.payment_status,
          s.status,
          s.notes,
          c.name as customer_name,
          c.phone as customer_phone,
          u.name as created_by_name
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN users u ON s.created_by = u.id
        WHERE s.customer_id = ?
        ORDER BY s.invoice_date DESC
      `, [customerId]);
    } catch (err) {
      logger.error('Error getting customer bills:', err);
      return [];
    }
  }

  getCustomerReceipts(customerId) {
    try {
      return db.query(`
        SELECT 
          cr.id,
          cr.receipt_number,
          cr.customer_id,
          cr.sale_id,
          cr.receipt_date,
          cr.amount,
          cr.payment_method,
          cr.reference_number,
          cr.notes,
          cr.created_at,
          cr.updated_at,
          c.name as customer_name,
          c.phone as customer_phone,
          c.email as customer_email,
          s.invoice_no as sale_invoice_no,
          u.name as created_by_name
        FROM customer_receipts cr
        LEFT JOIN customers c ON cr.customer_id = c.id
        LEFT JOIN sales s ON cr.sale_id = s.id
        LEFT JOIN users u ON cr.created_by = u.id
        WHERE cr.customer_id = ?
        ORDER BY cr.created_at DESC
      `, [customerId]);
    } catch (err) {
      logger.error('Error getting customer receipts:', err);
      return [];
    }
  }

  getCustomerFinancialSummary(customerId) {
    try {
      // First get customer details
      const customer = this.getById(customerId);
      
      if (!customer) {
        return null;
      }

      // Get financial summary with detailed counts
      const summary = db.queryOne(`
        SELECT 
          -- Sales summary
          COUNT(s.id) as total_bills_count,
          COALESCE(SUM(s.total_amount), 0) as total_bills,
          COALESCE(SUM(s.paid_amount), 0) as total_paid,
          COALESCE(SUM(s.total_amount - s.paid_amount), 0) as total_debt,
          
          -- Payment status counts
          COUNT(CASE WHEN s.payment_status = 'paid' THEN 1 END) as paid_bills_count,
          COUNT(CASE WHEN s.payment_status = 'unpaid' OR s.payment_status = 'partial' THEN 1 END) as unpaid_bills_count
        FROM customers c
        LEFT JOIN sales s ON c.id = s.customer_id
        WHERE c.id = ?
        GROUP BY c.id
      `, [customerId]);

      if (!summary) {
        return {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          total_bills: 0,
          total_paid: 0,
          total_debt: 0,
          total_bills_count: 0,
          unpaid_bills_count: 0,
          paid_bills_count: 0
        };
      }

      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        total_bills: summary.total_bills || 0,
        total_paid: summary.total_paid || 0,
        total_debt: summary.total_debt || 0,
        total_bills_count: summary.total_bills_count || 0,
        unpaid_bills_count: summary.unpaid_bills_count || 0,
        paid_bills_count: summary.paid_bills_count || 0
      };
    } catch (err) {
      logger.error('Error getting customer financial summary:', err);
      return null;
    }
  }

  // Update customer balance (add or subtract amount)
  async updateBalance(customerId, amount, operation = 'add') {
    try {
      logger.info(`updateBalance called: customerId=${customerId}, amount=${amount}, operation=${operation}`);
      
      if (!customerId || customerId === 999) {
        logger.warn(`Invalid customer ID: ${customerId}`);
        throw new Error('Invalid customer ID');
      }

      const operationSql = operation === 'subtract' ? '-' : '+';
      const absAmount = Math.abs(amount);
      
      logger.info(`Executing SQL: UPDATE customers SET current_balance = current_balance ${operationSql} ${absAmount} WHERE id = ${customerId}`);
      
      const changes = db.update(`
        UPDATE customers 
        SET current_balance = current_balance ${operationSql} ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [absAmount, customerId]);

      logger.info(`Database update result: ${changes} rows affected`);

      if (changes > 0) {
        // Invalidate customer caches
        cacheService.del(`customers:customer:${customerId}`);
        cacheService.del('customers:all_customers');
        cacheService.del('customers:phone_index');
        cacheService.del('customers:email_index');
        
        logger.info(`Updated customer ${customerId} balance: ${operation} ${amount}`);
        const updatedCustomer = this.getById(customerId);
        logger.info(`Retrieved updated customer:`, updatedCustomer);
        return updatedCustomer;
      } else {
        logger.warn(`No rows affected for customer ${customerId}. Customer might not exist.`);
        return null;
      }
    } catch (err) {
      logger.error('Error updating customer balance:', err);
      throw err;
    }
  }
}

// Initialize cache on service load
const customersService = new CustomersService();

// Load all customers to cache on startup
setTimeout(() => {
  try {
    customersService.loadAllCustomersToCache();
    // Customers cache initialized
  } catch (err) {
    logger.error('Failed to initialize customers cache on startup:', err);
  }
}, 3000); // Wait 3 seconds for database to be ready

module.exports = customersService; 