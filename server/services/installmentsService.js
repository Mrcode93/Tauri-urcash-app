const db = require('../database');
const logger = require('../utils/logger');
const BaseService = require('./baseService');
const cacheService = require('./cacheService');

class InstallmentsService extends BaseService {
  constructor() {
    super('installments');
  }

  /**
   * Get all installments with simple caching
   */
  async getAll({ filters = {}, page = 1, limit = 50 } = {}) {
    try {
      const offset = (page - 1) * limit;
      
      // Build WHERE conditions
      let whereConditions = ['1=1'];
      const values = [];

      // Add filters
      if (filters.customer_id) {
        whereConditions.push('i.customer_id = ?');
        values.push(filters.customer_id);
      }
      if (filters.sale_id) {
        whereConditions.push('i.sale_id = ?');
        values.push(filters.sale_id);
      }
      if (filters.payment_status) {
        whereConditions.push('i.payment_status = ?');
        values.push(filters.payment_status);
      }
      if (filters.start_date) {
        whereConditions.push('i.due_date >= ?');
        values.push(filters.start_date);
      }
      if (filters.end_date) {
        whereConditions.push('i.due_date <= ?');
        values.push(filters.end_date);
      }
      if (filters.search) {
        whereConditions.push('(c.name LIKE ? OR s.invoice_no LIKE ? OR i.notes LIKE ?)');
        const searchPattern = `%${filters.search}%`;
        values.push(searchPattern, searchPattern, searchPattern);
      }

      const whereClause = whereConditions.join(' AND ');

      // Simple query without complex indexing
      const query = `
        SELECT 
          i.id,
          i.sale_id,
          i.customer_id,
          i.due_date,
          i.amount,
          i.paid_amount,
          i.payment_status,
          i.payment_method,
          i.paid_at,
          i.notes,
          i.created_at,
          i.updated_at,
          s.invoice_no,
          c.name as customer_name,
          c.phone as customer_phone
        FROM installments i
        LEFT JOIN sales s ON i.sale_id = s.id
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE ${whereClause}
        ORDER BY i.due_date ASC, i.created_at DESC
        LIMIT ? OFFSET ?
      `;

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM installments i
        LEFT JOIN sales s ON i.sale_id = s.id
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE ${whereClause}
      `;

      const [installments, countResult] = await Promise.all([
        db.query(query, [...values, limit, offset]),
        db.queryOne(countQuery, values)
      ]);

      const total = countResult ? countResult.total : 0;

      const result = {
        items: installments,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };

      return result;
    } catch (err) {
      logger.error('Error in InstallmentsService.getAll:', err);
      throw new Error('Failed to fetch installments');
    }
  }

  /**
   * Get installments grouped by sale
   */
  async getGroupedBySale({ filters = {} } = {}) {
    try {
      // Build WHERE conditions
      let whereConditions = ['1=1'];
      const values = [];

      if (filters.customer_id) {
        whereConditions.push('i.customer_id = ?');
        values.push(filters.customer_id);
      }
      if (filters.payment_status) {
        whereConditions.push('i.payment_status = ?');
        values.push(filters.payment_status);
      }

      const whereClause = whereConditions.join(' AND ');

      const query = `
        SELECT 
          i.*,
          c.name as customer_name,
          c.phone as customer_phone,
          s.invoice_no,
          s.total_amount as sale_total,
          s.paid_amount as sale_paid_amount
        FROM installments i
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN sales s ON i.sale_id = s.id
        WHERE ${whereClause}
        ORDER BY s.created_at DESC, i.due_date ASC
      `;

      const installments = await db.query(query, values);
      const grouped = this.groupInstallmentsBySale(installments);
      const result = { installments: grouped };

      return result;
    } catch (err) {
      logger.error('Error in InstallmentsService.getGroupedBySale:', err);
      throw new Error('Failed to fetch grouped installments');
    }
  }

  /**
   * Group installments by sale
   */
  groupInstallmentsBySale(installments) {
    const grouped = {};
    
    installments.forEach(installment => {
      const saleId = installment.sale_id;
      if (!grouped[saleId]) {
        grouped[saleId] = {
          sale_id: saleId,
          invoice_no: installment.invoice_no,
          customer_name: installment.customer_name,
          customer_phone: installment.customer_phone,
          sale_total: installment.sale_total,
          sale_paid_amount: installment.sale_paid_amount,
          installments: [],
          total_installments: 0,
          total_amount: 0,
          total_paid: 0,
          total_remaining: 0
        };
      }
      
      grouped[saleId].installments.push(installment);
      grouped[saleId].total_installments++;
      grouped[saleId].total_amount += parseFloat(installment.amount) || 0;
      grouped[saleId].total_paid += parseFloat(installment.paid_amount) || 0;
    });
    
    // Calculate remaining amounts
    Object.values(grouped).forEach(group => {
      group.total_remaining = group.total_amount - group.total_paid;
    });
    
    return Object.values(grouped);
  }

  /**
   * Get installments summary
   */
  async getInstallmentsSummary({ customer_id, payment_status } = {}) {
    try {
      let whereConditions = ['1=1'];
      const values = [];

      if (customer_id) {
        whereConditions.push('i.customer_id = ?');
        values.push(customer_id);
      }
      if (payment_status) {
        whereConditions.push('i.payment_status = ?');
        values.push(payment_status);
      }

      const whereClause = whereConditions.join(' AND ');

      const query = `
        SELECT 
          COUNT(*) as total_installments,
          SUM(i.amount) as total_amount,
          SUM(COALESCE(i.paid_amount, 0)) as total_paid,
          SUM(i.amount - COALESCE(i.paid_amount, 0)) as total_remaining,
          COUNT(CASE WHEN i.payment_status = 'unpaid' THEN 1 END) as unpaid_count,
          COUNT(CASE WHEN i.payment_status = 'partial' THEN 1 END) as partial_count,
          COUNT(CASE WHEN i.payment_status = 'paid' THEN 1 END) as paid_count,
          COUNT(CASE WHEN i.due_date < DATE('now') AND i.payment_status != 'paid' THEN 1 END) as overdue_count
        FROM installments i
        WHERE ${whereClause}
      `;

      const result = await db.queryOne(query, values);
      return result;
    } catch (err) {
      logger.error('Error in InstallmentsService.getInstallmentsSummary:', err);
      throw new Error('Failed to fetch installments summary');
    }
  }

  /**
   * Get installments by sale ID
   */
  async getBySaleId(saleId) {
    try {
      const installments = await db.query(`
        SELECT 
          i.*,
          c.name as customer_name,
          c.phone as customer_phone
        FROM installments i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE i.sale_id = ?
        ORDER BY i.due_date ASC
      `, [saleId]);

      return installments;
    } catch (err) {
      logger.error('Error in InstallmentsService.getBySaleId:', err);
      throw new Error('Failed to fetch sale installments');
    }
  }

  /**
   * Get installments by customer ID
   */
  async getByCustomerId(customerId) {
    try {
      const installments = await db.query(`
        SELECT 
          i.*,
          s.invoice_no
        FROM installments i
        LEFT JOIN sales s ON i.sale_id = s.id
        WHERE i.customer_id = ?
        ORDER BY i.due_date ASC
      `, [customerId]);

      return installments;
    } catch (err) {
      logger.error('Error in InstallmentsService.getByCustomerId:', err);
      throw new Error('Failed to fetch customer installments');
    }
  }

  /**
   * Get installment by ID
   */
  async getById(id) {
    try {
      const installment = await db.queryOne(`
        SELECT 
          i.*,
          c.name as customer_name,
          c.phone as customer_phone,
          s.invoice_no
        FROM installments i
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN sales s ON i.sale_id = s.id
        WHERE i.id = ?
      `, [id]);

      if (!installment) {
        throw new Error('القسط غير موجود');
      }

      return installment;
    } catch (err) {
      logger.error('Error in InstallmentsService.getById:', err);
      throw err;
    }
  }

  /**
   * Create new installment
   */
  async create(installmentData) {
    try {
      const { sale_id, customer_id, due_date, amount, payment_method, notes } = installmentData;

      // Validate required fields
      if (!sale_id || !customer_id || !due_date || !amount || !payment_method) {
        throw new Error('البيانات المطلوبة غير مكتملة');
      }

      if (amount <= 0) {
        throw new Error('مبلغ القسط يجب أن يكون أكبر من صفر');
      }

      // Check if sale exists
      const sale = await db.queryOne('SELECT id FROM sales WHERE id = ?', [sale_id]);
      if (!sale) {
        throw new Error('الفاتورة غير موجودة');
      }

      // Check if customer exists
      const customer = await db.queryOne('SELECT id FROM customers WHERE id = ?', [customer_id]);
      if (!customer) {
        throw new Error('العميل غير موجود');
      }

      const lastId = await db.insert(`
        INSERT INTO installments (sale_id, customer_id, due_date, amount, payment_method, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [sale_id, customer_id, due_date, amount, payment_method, notes || '']);

      if (!lastId) {
        throw new Error('فشل في إنشاء القسط');
      }

      // Invalidate caches
      this.invalidateCaches();

      return await this.getById(lastId);
    } catch (err) {
      logger.error('Error in InstallmentsService.create:', err);
      throw err;
    }
  }

  /**
   * Update installment
   */
  async update(id, updateData) {
    try {
      const { due_date, amount, payment_method, notes } = updateData;

      // Validate required fields
      if (!due_date || !amount || !payment_method) {
        throw new Error('البيانات المطلوبة غير مكتملة');
      }

      if (amount <= 0) {
        throw new Error('مبلغ القسط يجب أن يكون أكبر من صفر');
      }

      // Check if installment exists
      const existing = await db.queryOne('SELECT id FROM installments WHERE id = ?', [id]);
      if (!existing) {
        throw new Error('القسط غير موجود');
      }

      const affectedRows = await db.update(`
        UPDATE installments 
        SET due_date = ?, amount = ?, payment_method = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [due_date, amount, payment_method, notes || '', id]);

      if (affectedRows === 0) {
        throw new Error('فشل في تحديث القسط');
      }

      // Invalidate caches
      this.invalidateCaches();

      return await this.getById(id);
    } catch (err) {
      logger.error('Error in InstallmentsService.update:', err);
      throw err;
    }
  }

  /**
   * Delete installment
   */
  async delete(id) {
    try {
      // Check if installment exists
      const existing = await db.queryOne('SELECT id FROM installments WHERE id = ?', [id]);
      if (!existing) {
        throw new Error('القسط غير موجود');
      }

      const affectedRows = await db.delete('DELETE FROM installments WHERE id = ?', [id]);

      if (affectedRows === 0) {
        throw new Error('فشل في حذف القسط');
      }

      // Invalidate caches
      this.invalidateCaches();

      return { id, deleted: true };
    } catch (err) {
      logger.error('Error in InstallmentsService.delete:', err);
      throw err;
    }
  }

  /**
   * Record payment for an installment
   */
  async recordPayment(id, paymentData, userId) {
    try {
      const { paid_amount, payment_method, notes, money_box_id } = paymentData;

      // Validate required fields
      if (!paid_amount || paid_amount <= 0) {
        throw new Error('مبلغ الدفع يجب أن يكون أكبر من صفر');
      }

      if (!payment_method) {
        throw new Error('طريقة الدفع مطلوبة');
      }

      // Get current installment
      const installment = await this.getById(id);
      if (!installment) {
        throw new Error('القسط غير موجود');
      }

      const newPaidAmount = parseFloat(installment.paid_amount || 0) + parseFloat(paid_amount);
      const totalAmount = parseFloat(installment.amount);
      
      // Determine new payment status
      let newPaymentStatus = 'partial';
      if (newPaidAmount >= totalAmount) {
        newPaymentStatus = 'paid';
      } else if (newPaidAmount === 0) {
        newPaymentStatus = 'unpaid';
      }

      // Use database transaction to ensure consistency
      const result = await db.transaction(async () => {
        // Update installment
        const affectedRows = await db.update(`
          UPDATE installments 
          SET paid_amount = ?, payment_status = ?, paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [newPaidAmount, newPaymentStatus, id]);

        if (affectedRows === 0) {
          throw new Error('فشل في تسجيل الدفع');
        }

        // Create customer receipt for the payment
        const customerReceiptsService = require('./customerReceiptsService');
        
        // Calculate excess amount if payment exceeds installment amount
        const excessAmount = Math.max(0, newPaidAmount - totalAmount);
        
        const receiptData = {
          customer_id: installment.customer_id,
          sale_id: installment.sale_id,
          receipt_date: new Date().toISOString().split('T')[0],
          amount: paid_amount,
          payment_method: payment_method,
          reference_number: null,
          notes: notes || `سداد قسط - قسط رقم ${id}`,
          money_box_id: money_box_id || null,
          skipSaleUpdate: true, // Flag to skip sale update in customer receipts service
          excess_amount: excessAmount > 0 ? excessAmount : null // Pass excess amount if any
        };

        const receipt = await customerReceiptsService.create(receiptData, userId);

        return {
          installment: await this.getById(id),
          receipt,
          payment: {
            paid_amount,
            payment_method,
            notes,
            recorded_at: new Date()
          }
        };
      });

      // Invalidate caches
      this.invalidateCaches();

      return result;
    } catch (err) {
      logger.error('Error in InstallmentsService.recordPayment:', err);
      throw err;
    }
  }

  /**
   * Create installment plan
   */
  async createInstallmentPlan(planData) {
    try {
      const { customer_id, selectedProducts, installmentMonths, startingDueDate, paymentMethod, notes, totalAmount } = planData;

      // Validate required fields
      if (!customer_id || !selectedProducts || !installmentMonths || !startingDueDate || !paymentMethod || !totalAmount) {
        throw new Error('البيانات المطلوبة غير مكتملة');
      }

      if (installmentMonths <= 0) {
        throw new Error('عدد الأشهر يجب أن يكون أكبر من صفر');
      }

      if (totalAmount <= 0) {
        throw new Error('المبلغ الإجمالي يجب أن يكون أكبر من صفر');
      }

      // Check if customer exists
      const customer = await db.queryOne('SELECT id FROM customers WHERE id = ?', [customer_id]);
      if (!customer) {
        throw new Error('العميل غير موجود');
      }

      // Create a dummy sale record for the installment plan
      const dummySaleId = await db.insert(`
        INSERT INTO sales (
          customer_id, 
          invoice_no, 
          invoice_date, 
          total_amount, 
          discount_amount, 
          tax_amount, 
          paid_amount, 
          payment_method, 
          payment_status, 
          notes, 
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        customer_id,
        `INST-${Date.now()}`, // Generate unique invoice number
        new Date().toISOString().split('T')[0],
        totalAmount,
        0,
        0,
        0,
        paymentMethod,
        'unpaid',
        `Installment Plan: ${notes || ''}`,
      ]);

      // Calculate installment amount
      const installmentAmount = totalAmount / installmentMonths;

      // Create installments
      const installments = [];
      const startDate = new Date(startingDueDate);

      for (let i = 0; i < installmentMonths; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        const lastId = await db.insert(`
          INSERT INTO installments (sale_id, customer_id, due_date, amount, payment_method, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [dummySaleId, customer_id, dueDate.toISOString().split('T')[0], installmentAmount, paymentMethod, notes || '']);

        installments.push({
          id: lastId,
          sale_id: dummySaleId,
          customer_id,
          due_date: dueDate.toISOString().split('T')[0],
          amount: installmentAmount,
          payment_method: paymentMethod,
          notes: notes || '',
          payment_status: 'unpaid',
          paid_amount: 0
        });
      }

      // Invalidate caches
      this.invalidateCaches();

      return {
        plan: {
          sale_id: dummySaleId,
          customer_id,
          total_amount: totalAmount,
          installment_months: installmentMonths,
          installment_amount: installmentAmount,
          starting_due_date: startingDueDate,
          payment_method: paymentMethod,
          notes: notes || ''
        },
        installments
      };
    } catch (err) {
      logger.error('Error in InstallmentsService.createInstallmentPlan:', err);
      throw err;
    }
  }

  /**
   * Simple cache invalidation
   */
  invalidateCaches() {
    try {
      // Invalidate installments caches
      cacheService.invalidatePattern('installments:*');
      
      // Invalidate customer caches since installment affects customer balance
      cacheService.invalidatePattern('customers:*');
      
      // Invalidate sales caches
      cacheService.invalidatePattern('sales:*');
      
      // Invalidate cash box caches
      cacheService.invalidatePattern('cash_box:*');
      cacheService.invalidatePattern('money_box:*');
      
      // Invalidate customer receipts caches
      cacheService.invalidatePattern('customer_receipts:*');
    } catch (error) {
      logger.error('Error invalidating installments caches:', error);
    }
  }
}

module.exports = new InstallmentsService();