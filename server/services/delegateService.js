const { db, query, queryOne, insert, update, delete: deleteRecord } = require('../database/index.js');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');

class DelegateService {
  constructor() {
    this.tableName = 'representatives';
  }

  // ===== BASIC DELEGATE MANAGEMENT =====

  // Get all delegates with pagination and search
  async getAllDelegates(page = 1, limit = 50, search = '') {
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
        SELECT 
          id, name, customer_id, phone, email, address, commission_rate, commission_type, commission_amount, sales_target, is_active, created_at, updated_at
        FROM ${this.tableName}
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;

      const delegates = query(sql, [...params, limit, offset]);

      return {
        delegates,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting delegates:', error);
      throw error;
    }
  }

  // Get delegate by ID
  async getDelegateById(id) {
    try {
      const sql = `
        SELECT 
          id, name, customer_id, phone, email, address, commission_rate, commission_type, commission_amount, sales_target, is_active, created_at, updated_at
        FROM ${this.tableName}
        WHERE id = ?
      `;
      
      return queryOne(sql, [id]);
    } catch (error) {
      logger.error('Error getting delegate by ID:', error);
      throw error;
    }
  }

  // Create new delegate
  async createDelegate(data) {
    try {
      const { 
        name, phone, email, address, commission_rate, commission_type, commission_amount, sales_target
      } = data;

      // Validate required fields
      if (!name) {
        throw new Error('Name is required');
      }

      const sql = `
        INSERT INTO ${this.tableName} (
          name, customer_id, phone, email, address, commission_rate, commission_type, commission_amount, sales_target,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      const result = insert(sql, [
        name, null, phone || null, email || null, address || null,
        commission_rate || 0, commission_type || 'percentage', commission_amount || 0, sales_target || 0
      ]);

      return { id: result };
    } catch (error) {
      logger.error('Error creating delegate:', error);
      throw error;
    }
  }

  // Calculate commission for a sale
  async calculateCommission(delegateId, saleId, saleAmount) {
    try {
      // Get delegate commission settings
      const delegate = await this.getDelegateById(delegateId);
      if (!delegate) {
        throw new Error('Delegate not found');
      }

      let commissionAmount = 0;
      
      if (delegate.commission_type === 'percentage') {
        commissionAmount = (saleAmount * delegate.commission_rate) / 100;
      } else if (delegate.commission_type === 'fixed') {
        commissionAmount = delegate.commission_amount;
      }

      return {
        commissionAmount: Math.round(commissionAmount * 100) / 100, // Round to 2 decimal places
        commissionRate: delegate.commission_rate,
        commissionType: delegate.commission_type
      };
    } catch (error) {
      logger.error('Error calculating commission:', error);
      throw error;
    }
  }

  // Create commission record
  async createCommissionRecord(delegateId, saleId, commissionData) {
    try {
      const sql = `
        INSERT INTO delegate_commissions (
          delegate_id, sale_id, commission_amount, commission_rate, commission_type,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      const result = insert(sql, [
        delegateId,
        saleId,
        commissionData.commissionAmount,
        commissionData.commissionRate,
        commissionData.commissionType
      ]);

      return { id: result };
    } catch (error) {
      logger.error('Error creating commission record:', error);
      throw error;
    }
  }

  // Get delegate performance analytics
  async getDelegatePerformance(delegateId, startDate = null, endDate = null) {
    try {
      let whereClause = 'WHERE s.delegate_id = ?';
      const params = [delegateId];

      if (startDate) {
        whereClause += ' AND s.invoice_date >= ?';
        params.push(startDate);
      }
      if (endDate) {
        whereClause += ' AND s.invoice_date <= ?';
        params.push(endDate);
      }

      // Get sales performance
      const salesSql = `
        SELECT 
          COUNT(*) as total_sales,
          SUM(s.total_amount) as total_amount,
          AVG(s.total_amount) as avg_sale_amount,
          COUNT(CASE WHEN s.payment_status = 'paid' THEN 1 END) as paid_sales,
          COUNT(CASE WHEN s.payment_status = 'unpaid' THEN 1 END) as unpaid_sales,
          SUM(CASE WHEN s.payment_status = 'paid' THEN s.total_amount ELSE 0 END) as paid_amount,
          SUM(CASE WHEN s.payment_status = 'unpaid' THEN s.total_amount ELSE 0 END) as unpaid_amount
        FROM sales s
        ${whereClause}
      `;

      const salesPerformance = queryOne(salesSql, params);

      // Get commission performance
      const commissionSql = `
        SELECT 
          COUNT(*) as total_commissions,
          SUM(dc.commission_amount) as total_commission,
          AVG(dc.commission_amount) as avg_commission,
          COUNT(CASE WHEN dc.payment_status = 'paid' THEN 1 END) as paid_commissions,
          COUNT(CASE WHEN dc.payment_status = 'pending' THEN 1 END) as pending_commissions,
          SUM(CASE WHEN dc.payment_status = 'paid' THEN dc.commission_amount ELSE 0 END) as paid_commission_amount,
          SUM(CASE WHEN dc.payment_status = 'pending' THEN dc.commission_amount ELSE 0 END) as pending_commission_amount
        FROM delegate_commissions dc
        LEFT JOIN sales s ON dc.sale_id = s.id
        ${whereClause}
      `;

      const commissionPerformance = queryOne(commissionSql, params);

      // Get daily sales trend
      const trendSql = `
        SELECT 
          DATE(s.invoice_date) as date,
          COUNT(*) as sales_count,
          SUM(s.total_amount) as daily_amount,
          SUM(dc.commission_amount) as daily_commission
        FROM sales s
        LEFT JOIN delegate_commissions dc ON s.id = dc.sale_id
        ${whereClause}
        GROUP BY DATE(s.invoice_date)
        ORDER BY date DESC
        LIMIT 30
      `;

      const salesTrend = query(trendSql, params);

      // Get top customers
      const topCustomersSql = `
        SELECT 
          c.name as customer_name,
          COUNT(s.id) as sales_count,
          SUM(s.total_amount) as total_amount,
          SUM(dc.commission_amount) as total_commission
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN delegate_commissions dc ON s.id = dc.sale_id
        ${whereClause}
        GROUP BY c.id, c.name
        ORDER BY total_amount DESC
        LIMIT 10
      `;

      const topCustomers = query(topCustomersSql, params);

      return {
        sales: {
          total: salesPerformance.total_sales || 0,
          amount: salesPerformance.total_amount || 0,
          average: salesPerformance.avg_sale_amount || 0,
          paid: {
            count: salesPerformance.paid_sales || 0,
            amount: salesPerformance.paid_amount || 0
          },
          unpaid: {
            count: salesPerformance.unpaid_sales || 0,
            amount: salesPerformance.unpaid_amount || 0
          }
        },
        commission: {
          total: commissionPerformance.total_commission || 0,
          average: commissionPerformance.avg_commission || 0,
          paid: {
            count: commissionPerformance.paid_commissions || 0,
            amount: commissionPerformance.paid_commission_amount || 0
          },
          pending: {
            count: commissionPerformance.pending_commissions || 0,
            amount: commissionPerformance.pending_commission_amount || 0
          }
        },
        trend: salesTrend,
        topCustomers: topCustomers
      };
    } catch (error) {
      logger.error('Error getting delegate performance:', error);
      throw error;
    }
  }

  // Check target achievement
  async checkTargetAchievement(delegateId, period = 'monthly') {
    try {
      const delegate = await this.getDelegateById(delegateId);
      if (!delegate || !delegate.sales_target) {
        return { achieved: false, progress: 0, target: 0, current: 0 };
      }

      let dateFilter = '';
      const currentDate = new Date();
      
      if (period === 'monthly') {
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        dateFilter = `AND s.invoice_date >= '${startOfMonth.toISOString().split('T')[0]}'`;
      } else if (period === 'quarterly') {
        const quarter = Math.floor(currentDate.getMonth() / 3);
        const startOfQuarter = new Date(currentDate.getFullYear(), quarter * 3, 1);
        dateFilter = `AND s.invoice_date >= '${startOfQuarter.toISOString().split('T')[0]}'`;
      } else if (period === 'yearly') {
        const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
        dateFilter = `AND s.invoice_date >= '${startOfYear.toISOString().split('T')[0]}'`;
      }

      const sql = `
        SELECT SUM(s.total_amount) as current_amount
        FROM sales s
        WHERE s.delegate_id = ? ${dateFilter}
      `;

      const result = queryOne(sql, [delegateId]);
      const currentAmount = result.current_amount || 0;
      const target = delegate.sales_target;
      const progress = (currentAmount / target) * 100;
      const achieved = currentAmount >= target;

      return {
        achieved,
        progress: Math.round(progress * 100) / 100,
        target,
        current: currentAmount,
        remaining: Math.max(0, target - currentAmount)
      };
    } catch (error) {
      logger.error('Error checking target achievement:', error);
      throw error;
    }
  }

  // Create collection record
  async createCollection(data) {
    try {
      const {
        delegate_id,
        customer_id,
        sale_id,
        collection_amount,
        payment_method,
        collection_date,
        receipt_number,
        notes
      } = data;

      // Validate required fields
      if (!delegate_id || !customer_id || !collection_amount || !payment_method || !collection_date) {
        throw new Error('Missing required fields');
      }

      const sql = `
        INSERT INTO delegate_collections (
          delegate_id, customer_id, sale_id, collection_amount, payment_method,
          collection_date, receipt_number, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      const result = insert(sql, [
        delegate_id,
        customer_id,
        sale_id || null,
        collection_amount,
        payment_method,
        collection_date,
        receipt_number || null,
        notes || null
      ]);

      return { id: result };
    } catch (error) {
      logger.error('Error creating collection:', error);
      throw error;
    }
  }

  // Get collections by delegate
  async getDelegateCollections(delegateId, page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;
      
      const sql = `
        SELECT 
          dc.*,
          c.name as customer_name,
          r.name as delegate_name,
          s.invoice_no
        FROM delegate_collections dc
        LEFT JOIN customers c ON dc.customer_id = c.id
        LEFT JOIN representatives r ON dc.delegate_id = r.id
        LEFT JOIN sales s ON dc.sale_id = s.id
        WHERE dc.delegate_id = ?
        ORDER BY dc.collection_date DESC
        LIMIT ? OFFSET ?
      `;

      const collections = query(sql, [delegateId, limit, offset]);

      // Get total count
      const countSql = `SELECT COUNT(*) as total FROM delegate_collections WHERE delegate_id = ?`;
      const totalResult = queryOne(countSql, [delegateId]);
      const total = totalResult.total;

      return {
        collections,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting delegate collections:', error);
      throw error;
    }
  }

  // Get collection summary for delegate
  async getCollectionSummary(delegateId, startDate = null, endDate = null) {
    try {
      let whereClause = 'WHERE dc.delegate_id = ?';
      const params = [delegateId];

      if (startDate) {
        whereClause += ' AND dc.collection_date >= ?';
        params.push(startDate);
      }
      if (endDate) {
        whereClause += ' AND dc.collection_date <= ?';
        params.push(endDate);
      }

      const sql = `
        SELECT 
          COUNT(*) as total_collections,
          SUM(dc.collection_amount) as total_amount,
          AVG(dc.collection_amount) as avg_amount,
          COUNT(DISTINCT dc.customer_id) as unique_customers,
          COUNT(DISTINCT DATE(dc.collection_date)) as collection_days
        FROM delegate_collections dc
        ${whereClause}
      `;

      const summary = queryOne(sql, params);

      // Get collections by payment method
      const methodSql = `
        SELECT 
          dc.payment_method,
          COUNT(*) as count,
          SUM(dc.collection_amount) as total_amount
        FROM delegate_collections dc
        ${whereClause}
        GROUP BY dc.payment_method
        ORDER BY total_amount DESC
      `;

      const byMethod = query(methodSql, params);

      return {
        summary: {
          totalCollections: summary.total_collections || 0,
          totalAmount: summary.total_amount || 0,
          averageAmount: summary.avg_amount || 0,
          uniqueCustomers: summary.unique_customers || 0,
          collectionDays: summary.collection_days || 0
        },
        byMethod
      };
    } catch (error) {
      logger.error('Error getting collection summary:', error);
      throw error;
    }
  }

  // Assign customer to delegate
  async assignCustomerToDelegate(customerId, delegateId, notes = null) {
    try {
      // Check if assignment already exists
      const existingSql = `
        SELECT id FROM customer_delegate_assignments 
        WHERE customer_id = ? AND delegate_id = ?
      `;
      const existing = queryOne(existingSql, [customerId, delegateId]);
      
      if (existing) {
        // Update existing assignment
        const updateSql = `
          UPDATE customer_delegate_assignments 
          SET is_active = 1, notes = ?, updated_at = CURRENT_TIMESTAMP
          WHERE customer_id = ? AND delegate_id = ?
        `;
        update(updateSql, [notes, customerId, delegateId]);
        return { id: existing.id, updated: true };
      } else {
        // Create new assignment
        const insertSql = `
          INSERT INTO customer_delegate_assignments (
            customer_id, delegate_id, assigned_date, is_active, notes, created_at, updated_at
          ) VALUES (?, ?, CURRENT_DATE, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        const result = insert(insertSql, [customerId, delegateId, notes]);
        return { id: result, created: true };
      }
    } catch (error) {
      logger.error('Error assigning customer to delegate:', error);
      throw error;
    }
  }

  // Get customers assigned to delegate
  async getAssignedCustomers(delegateId) {
    try {
      const sql = `
        SELECT 
          cda.*,
          c.name as customer_name,
          c.phone as customer_phone,
          c.email as customer_email,
          r.name as delegate_name
        FROM customer_delegate_assignments cda
        LEFT JOIN customers c ON cda.customer_id = c.id
        LEFT JOIN representatives r ON cda.delegate_id = r.id
        WHERE cda.delegate_id = ? AND cda.is_active = 1
        ORDER BY cda.assigned_date DESC
      `;

      return query(sql, [delegateId]);
    } catch (error) {
      logger.error('Error getting assigned customers:', error);
      throw error;
    }
  }

  // Get delegate assigned to customer
  async getCustomerDelegate(customerId) {
    try {
      const sql = `
        SELECT 
          cda.*,
          r.name as delegate_name,
          r.phone as delegate_phone,
          r.email as delegate_email
        FROM customer_delegate_assignments cda
        LEFT JOIN representatives r ON cda.delegate_id = r.id
        WHERE cda.customer_id = ? AND cda.is_active = 1
        ORDER BY cda.assigned_date DESC
        LIMIT 1
      `;

      return queryOne(sql, [customerId]);
    } catch (error) {
      logger.error('Error getting customer delegate:', error);
      throw error;
    }
  }

  // Remove customer assignment
  async removeCustomerAssignment(customerId, delegateId) {
    try {
      const sql = `
        UPDATE customer_delegate_assignments 
        SET is_active = 0, updated_at = CURRENT_TIMESTAMP
        WHERE customer_id = ? AND delegate_id = ?
      `;
      
      const result = update(sql, [customerId, delegateId]);
      return { success: true, affectedRows: result.changes };
    } catch (error) {
      logger.error('Error removing customer assignment:', error);
      throw error;
    }
  }

  // Get commission report for delegate
  async getCommissionReport(delegateId, startDate = null, endDate = null) {
    try {
      let whereClause = 'WHERE dc.delegate_id = ?';
      const params = [delegateId];

      if (startDate) {
        whereClause += ' AND s.invoice_date >= ?';
        params.push(startDate);
      }
      if (endDate) {
        whereClause += ' AND s.invoice_date <= ?';
        params.push(endDate);
      }

      const sql = `
        SELECT 
          dc.*,
          s.invoice_no,
          s.invoice_date,
          s.total_amount as sale_amount,
          c.name as customer_name,
          r.name as delegate_name
        FROM delegate_commissions dc
        LEFT JOIN sales s ON dc.sale_id = s.id
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN representatives r ON dc.delegate_id = r.id
        ${whereClause}
        ORDER BY s.invoice_date DESC
      `;

      const commissions = query(sql, params);

      // Calculate totals
      const totalCommission = commissions.reduce((sum, commission) => sum + commission.commission_amount, 0);
      const totalSales = commissions.reduce((sum, commission) => sum + commission.sale_amount, 0);
      const paidCommissions = commissions.filter(c => c.payment_status === 'paid');
      const pendingCommissions = commissions.filter(c => c.payment_status === 'pending');

      return {
        commissions,
        summary: {
          totalCommission: Math.round(totalCommission * 100) / 100,
          totalSales: Math.round(totalSales * 100) / 100,
          totalSalesCount: commissions.length,
          paidCommission: Math.round(paidCommissions.reduce((sum, c) => sum + c.commission_amount, 0) * 100) / 100,
          pendingCommission: Math.round(pendingCommissions.reduce((sum, c) => sum + c.commission_amount, 0) * 100) / 100,
          paidCount: paidCommissions.length,
          pendingCount: pendingCommissions.length
        }
      };
    } catch (error) {
      logger.error('Error getting commission report:', error);
      throw error;
    }
  }

  // Get sales by delegate
  async getDelegateSales(delegateId, page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;
      
      const sql = `
        SELECT 
          s.*,
          c.name as customer_name,
          r.name as delegate_name,
          u.name as created_by_name,
          json_group_array(
            json_object(
              'id', si.id,
              'product_id', si.product_id,
              'product_name', CASE 
                WHEN si.product_name IS NOT NULL THEN si.product_name
                WHEN si.product_id IS NOT NULL THEN p.name 
                ELSE 'مواد اخرى'
              END,
              'quantity', si.quantity,
              'price', si.price,
              'total', si.total
            )
          ) as items
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN representatives r ON s.delegate_id = r.id
        LEFT JOIN users u ON s.created_by = u.id
        LEFT JOIN sale_items si ON s.id = si.sale_id
        LEFT JOIN products p ON si.product_id = p.id AND si.product_id IS NOT NULL
        WHERE s.delegate_id = ?
        GROUP BY s.id
        ORDER BY s.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const sales = query(sql, [delegateId, limit, offset]);

      // Get total count
      const countSql = `SELECT COUNT(*) as total FROM sales WHERE delegate_id = ?`;
      const totalResult = queryOne(countSql, [delegateId]);
      const total = totalResult.total;

      // Process sales data
      const processedSales = sales.map(sale => {
        try {
          sale.items = sale.items ? JSON.parse(sale.items) : [];
          if (!Array.isArray(sale.items)) {
            sale.items = [];
          }
        } catch (err) {
          logger.error('Failed to parse sale.items:', { saleId: sale.id, error: err.message });
          sale.items = [];
        }

        // Format dates
        if (sale.invoice_date) {
          sale.invoice_date = new Date(sale.invoice_date).toISOString().split('T')[0];
        }
        if (sale.created_at) {
          sale.created_at = new Date(sale.created_at).toISOString();
        }

        return sale;
      });

      return {
        sales: processedSales,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting delegate sales:', error);
      throw error;
    }
  }

  // Update delegate
  async updateDelegate(id, data) {
    try {
      const { 
        name, phone, email, address, commission_rate, commission_type, commission_amount, sales_target, is_active 
      } = data;

      // Validate required fields
      if (!name) {
        throw new Error('Name is required');
      }

      const sql = `
        UPDATE ${this.tableName} SET
          name = ?, phone = ?, email = ?, address = ?, commission_rate = ?, commission_type = ?, commission_amount = ?, sales_target = ?, is_active = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      update(sql, [
        name, phone || null, email || null, address || null,
        commission_rate || 0, commission_type || 'percentage', commission_amount || 0, sales_target || 0, is_active !== undefined ? is_active : 1,
        id
      ]);

      return { success: true };
    } catch (error) {
      logger.error('Error updating delegate:', error);
      throw error;
    }
  }

  // Delete delegate
  async deleteDelegate(id) {
    try {
      // Check if delegate has any sales or collections
      const salesCount = queryOne('SELECT COUNT(*) as count FROM delegate_sales WHERE delegate_id = ?', [id]);
      const collectionsCount = queryOne('SELECT COUNT(*) as count FROM delegate_collections WHERE delegate_id = ?', [id]);

      if (salesCount.count > 0 || collectionsCount.count > 0) {
        throw new Error('Cannot delete delegate with existing sales or collections');
      }

      deleteRecord(this.tableName, id);
      return { success: true };
    } catch (error) {
      logger.error('Error deleting delegate:', error);
      throw error;
    }
  }

  // ===== DELEGATE SALES MANAGEMENT =====

  // Create delegate sale
  async createDelegateSale(data) {
    try {
      const { 
        delegate_id, customer_id, sale_id, total_amount, 
        commission_rate, commission_type, notes 
      } = data;

      // Validate required fields
      if (!delegate_id || !customer_id || !sale_id || !total_amount) {
        throw new Error('Delegate ID, customer ID, sale ID, and total amount are required');
      }

      // Calculate commission
      let commission_amount = 0;
      if (commission_type === 'percentage') {
        commission_amount = (total_amount * commission_rate) / 100;
      } else {
        commission_amount = commission_rate || 0;
      }

      const sql = `
        INSERT INTO delegate_sales (
          delegate_id, customer_id, sale_id, total_amount,
          commission_amount, commission_rate, commission_type,
          payment_status, paid_amount, remaining_amount, notes,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'unpaid', 0, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      const result = insert(sql, [
        delegate_id, customer_id, sale_id, total_amount,
        commission_amount, commission_rate || 0, commission_type || 'percentage',
        total_amount, notes
      ]);

      // Update delegate totals
      this.updateDelegateTotals(delegate_id);

      return { id: result.lastInsertRowid };
    } catch (error) {
      logger.error('Error creating delegate sale:', error);
      throw error;
    }
  }

  // Get delegate sales
  async getDelegateSales(delegateId, page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;
      
      const countSql = `SELECT COUNT(*) as total FROM delegate_sales WHERE delegate_id = ?`;
      const totalResult = queryOne(countSql, [delegateId]);
      const total = totalResult.total;

      const sql = `
        SELECT 
          ds.*,
          c.name as customer_name,
          c.phone as customer_phone,
          s.invoice_number,
          s.invoice_date
        FROM delegate_sales ds
        LEFT JOIN customers c ON ds.customer_id = c.id
        LEFT JOIN sales s ON ds.sale_id = s.id
        WHERE ds.delegate_id = ?
        ORDER BY ds.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const sales = query(sql, [delegateId, limit, offset]);

      return {
        sales,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting delegate sales:', error);
      throw error;
    }
  }

  // ===== DELEGATE COLLECTIONS MANAGEMENT =====

  // Create delegate collection
  async createDelegateCollection(data) {
    try {
      const { 
        delegate_id, customer_id, sale_id, collection_amount, 
        payment_method, collection_date, receipt_number, notes 
      } = data;

      // Validate required fields
      if (!delegate_id || !customer_id || !collection_amount || !collection_date) {
        throw new Error('Delegate ID, customer ID, collection amount, and collection date are required');
      }

      const sql = `
        INSERT INTO delegate_collections (
          delegate_id, customer_id, sale_id, collection_amount,
          payment_method, collection_date, receipt_number, notes,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      const result = insert(sql, [
        delegate_id, customer_id, sale_id, collection_amount,
        payment_method || 'cash', collection_date, receipt_number, notes
      ]);

      // Update delegate totals
      this.updateDelegateTotals(delegate_id);

      // Update sale payment status if sale_id is provided
      if (sale_id) {
        this.updateSalePaymentStatus(sale_id);
      }

      return { id: result.lastInsertRowid };
    } catch (error) {
      logger.error('Error creating delegate collection:', error);
      throw error;
    }
  }

  // Get delegate collections
  async getDelegateCollections(delegateId, page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;
      
      const countSql = `SELECT COUNT(*) as total FROM delegate_collections WHERE delegate_id = ?`;
      const totalResult = queryOne(countSql, [delegateId]);
      const total = totalResult.total;

      const sql = `
        SELECT 
          dc.*,
          c.name as customer_name,
          c.phone as customer_phone,
          s.invoice_number
        FROM delegate_collections dc
        LEFT JOIN customers c ON dc.customer_id = c.id
        LEFT JOIN sales s ON dc.sale_id = s.id
        WHERE dc.delegate_id = ?
        ORDER BY dc.collection_date DESC
        LIMIT ? OFFSET ?
      `;

      const collections = query(sql, [delegateId, limit, offset]);

      return {
        collections,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting delegate collections:', error);
      throw error;
    }
  }

  // ===== DELEGATE COMMISSION MANAGEMENT =====

  // Calculate delegate commission for a period
  async calculateDelegateCommission(delegateId, periodStart, periodEnd) {
    try {
      const sql = `
        SELECT 
          SUM(total_amount) as total_sales,
          SUM(commission_amount) as total_commission,
          COUNT(*) as total_orders
        FROM delegate_sales 
        WHERE delegate_id = ? 
        AND DATE(created_at) BETWEEN ? AND ?
      `;

      const result = queryOne(sql, [delegateId, periodStart, periodEnd]);
      
      return {
        delegate_id: delegateId,
        period_start: periodStart,
        period_end: periodEnd,
        total_sales: result.total_sales || 0,
        total_commission: result.total_commission || 0,
        total_orders: result.total_orders || 0
      };
    } catch (error) {
      logger.error('Error calculating delegate commission:', error);
      throw error;
    }
  }

  // Create commission payment
  async createCommissionPayment(data) {
    try {
      const { 
        delegate_id, period_start, period_end, payment_amount, 
        payment_date, payment_method, notes 
      } = data;

      // Calculate commission for the period
      const commissionData = await this.calculateDelegateCommission(delegate_id, period_start, period_end);

      const sql = `
        INSERT INTO delegate_commission_payments (
          delegate_id, period_start, period_end,
          total_sales, total_commission, commission_rate, commission_type,
          payment_amount, payment_date, payment_method, notes,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      const delegate = await this.getDelegateById(delegate_id);
      
      const result = insert(sql, [
        delegate_id, period_start, period_end,
        commissionData.total_sales, commissionData.total_commission,
        delegate.commission_rate, delegate.commission_type,
        payment_amount, payment_date, payment_method || 'cash', notes
      ]);

      return { id: result.lastInsertRowid };
    } catch (error) {
      logger.error('Error creating commission payment:', error);
      throw error;
    }
  }

  // ===== DELEGATE PERFORMANCE REPORTS =====

  // Generate performance report
  async generatePerformanceReport(delegateId, reportDate, periodType = 'monthly') {
    try {
      // Calculate period start and end dates
      const periodDates = this.calculatePeriodDates(reportDate, periodType);
      
      // Get sales data
      const salesData = await this.calculateDelegateCommission(
        delegateId, 
        periodDates.start, 
        periodDates.end
      );

      // Get collections data
      const collectionsSql = `
        SELECT 
          SUM(collection_amount) as total_collections,
          COUNT(*) as total_collections_count
        FROM delegate_collections 
        WHERE delegate_id = ? 
        AND DATE(collection_date) BETWEEN ? AND ?
      `;
      const collectionsData = queryOne(collectionsSql, [delegateId, periodDates.start, periodDates.end]);

      // Get unique customers count
      const customersSql = `
        SELECT COUNT(DISTINCT customer_id) as total_customers
        FROM delegate_sales 
        WHERE delegate_id = ? 
        AND DATE(created_at) BETWEEN ? AND ?
      `;
      const customersData = queryOne(customersSql, [delegateId, periodDates.start, periodDates.end]);

      // Get delegate info
      const delegate = await this.getDelegateById(delegateId);
      
      // Calculate metrics
      const totalSales = salesData.total_sales || 0;
      const totalCollections = collectionsData.total_collections || 0;
      const salesTarget = delegate.sales_target || 0;
      const targetAchievement = salesTarget > 0 ? (totalSales / salesTarget) * 100 : 0;
      const averageOrderValue = salesData.total_orders > 0 ? totalSales / salesData.total_orders : 0;
      const collectionRate = totalSales > 0 ? (totalCollections / totalSales) * 100 : 0;

      const sql = `
        INSERT INTO delegate_performance_reports (
          delegate_id, report_date, period_type,
          total_sales, total_orders, total_customers,
          total_collections, total_commission,
          sales_target, target_achievement_percentage,
          average_order_value, collection_rate,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      const result = insert(sql, [
        delegateId, reportDate, periodType,
        totalSales, salesData.total_orders, customersData.total_customers,
        totalCollections, salesData.total_commission,
        salesTarget, targetAchievement,
        averageOrderValue, collectionRate
      ]);

      return { id: result.lastInsertRowid };
    } catch (error) {
      logger.error('Error generating performance report:', error);
      throw error;
    }
  }

  // Get performance reports
  async getPerformanceReports(delegateId, page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;
      
      const countSql = `SELECT COUNT(*) as total FROM delegate_performance_reports WHERE delegate_id = ?`;
      const totalResult = queryOne(countSql, [delegateId]);
      const total = totalResult.total;

      const sql = `
        SELECT * FROM delegate_performance_reports 
        WHERE delegate_id = ?
        ORDER BY report_date DESC
        LIMIT ? OFFSET ?
      `;

      const reports = query(sql, [delegateId, limit, offset]);

      return {
        reports,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting performance reports:', error);
      throw error;
    }
  }

  // ===== HELPER METHODS =====

  // Update delegate totals
  async updateDelegateTotals(delegateId) {
    try {
      // Calculate total sales
      const salesSql = `SELECT SUM(total_amount) as total FROM delegate_sales WHERE delegate_id = ?`;
      const salesResult = queryOne(salesSql, [delegateId]);
      const totalSales = salesResult.total || 0;

      // Calculate total commission
      const commissionSql = `SELECT SUM(commission_amount) as total FROM delegate_sales WHERE delegate_id = ?`;
      const commissionResult = queryOne(commissionSql, [delegateId]);
      const totalCommission = commissionResult.total || 0;

      // Calculate total collections
      const collectionsSql = `SELECT SUM(collection_amount) as total FROM delegate_collections WHERE delegate_id = ?`;
      const collectionsResult = queryOne(collectionsSql, [delegateId]);
      const totalCollections = collectionsResult.total || 0;

      // Update delegate record
      const updateSql = `
        UPDATE ${this.tableName} SET
          total_sales = ?, total_commission = ?, total_collections = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      update(updateSql, [totalSales, totalCommission, totalCollections, delegateId]);
    } catch (error) {
      logger.error('Error updating delegate totals:', error);
      throw error;
    }
  }

  // Update sale payment status
  async updateSalePaymentStatus(saleId) {
    try {
      // Get total sale amount
      const saleSql = `SELECT total_amount FROM sales WHERE id = ?`;
      const saleResult = queryOne(saleSql, [saleId]);
      const totalAmount = saleResult.total_amount || 0;

      // Get total collections for this sale
      const collectionsSql = `SELECT SUM(collection_amount) as total FROM delegate_collections WHERE sale_id = ?`;
      const collectionsResult = queryOne(collectionsSql, [saleId]);
      const totalCollections = collectionsResult.total || 0;

      // Determine payment status
      let paymentStatus = 'unpaid';
      if (totalCollections >= totalAmount) {
        paymentStatus = 'paid';
      } else if (totalCollections > 0) {
        paymentStatus = 'partial';
      }

      // Update delegate sale payment status
      const updateSql = `
        UPDATE delegate_sales SET
          payment_status = ?, paid_amount = ?, remaining_amount = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE sale_id = ?
      `;
      update(updateSql, [paymentStatus, totalCollections, totalAmount - totalCollections, saleId]);
    } catch (error) {
      logger.error('Error updating sale payment status:', error);
      throw error;
    }
  }

  // Calculate period dates
  calculatePeriodDates(reportDate, periodType) {
    const date = new Date(reportDate);
    let start, end;

    switch (periodType) {
      case 'daily':
        start = end = reportDate;
        break;
      case 'weekly':
        const dayOfWeek = date.getDay();
        const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        start = new Date(date.setDate(diff)).toISOString().split('T')[0];
        end = new Date(date.setDate(diff + 6)).toISOString().split('T')[0];
        break;
      case 'monthly':
        start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
        end = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      case 'yearly':
        start = new Date(date.getFullYear(), 0, 1).toISOString().split('T')[0];
        end = new Date(date.getFullYear(), 11, 31).toISOString().split('T')[0];
        break;
      default:
        start = end = reportDate;
    }

    return { start, end };
  }

  // Get delegate dashboard data
  async getDelegateDashboard(delegateId) {
    try {
      const delegate = await this.getDelegateById(delegateId);
      
      // Get current month data
      const currentDate = new Date();
      const currentMonth = currentDate.toISOString().split('T')[0];
      const periodDates = this.calculatePeriodDates(currentMonth, 'monthly');
      
      const currentMonthData = await this.calculateDelegateCommission(
        delegateId, 
        periodDates.start, 
        periodDates.end
      );

      // Get collections for current month
      const collectionsSql = `
        SELECT SUM(collection_amount) as total_collections
        FROM delegate_collections 
        WHERE delegate_id = ? 
        AND DATE(collection_date) BETWEEN ? AND ?
      `;
      const collectionsData = queryOne(collectionsSql, [delegateId, periodDates.start, periodDates.end]);

      return {
        delegate,
        current_month: {
          total_sales: currentMonthData.total_sales || 0,
          total_commission: currentMonthData.total_commission || 0,
          total_orders: currentMonthData.total_orders || 0,
          total_collections: collectionsData.total_collections || 0
        },
        overall: {
          total_sales: delegate.total_sales || 0,
          total_commission: delegate.total_commission || 0,
          total_collections: delegate.total_collections || 0
        }
      };
    } catch (error) {
      logger.error('Error getting delegate dashboard:', error);
      throw error;
    }
  }
}

module.exports = new DelegateService();
