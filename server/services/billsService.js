const { transaction, insert, update, query, queryOne } = require('../database');
const logger = require('../utils/logger');
const { generateBarcode } = require('../utils/barcode');
const { generateSKU } = require('../utils/skuGenerator');
const cacheService = require('./cacheService');
const cashBoxService = require('./cashBoxService');
const customerReceiptsService = require('./customerReceiptsService');
const supplierPaymentReceiptsService = require('./supplierPaymentReceiptsService');
const moneyBoxesService = require('./moneyBoxesService');

class BillsService {
  constructor() {
    // Use the database helper methods instead of direct connection
    this.cashBoxService = cashBoxService;
    this.customerReceiptsService = customerReceiptsService;
    this.supplierPaymentReceiptsService = supplierPaymentReceiptsService;
    this.moneyBoxesService = moneyBoxesService;
  }

  // ==================== SALE BILLS (using existing sales table) ====================

  async createSaleBill(billData, items, moneyBoxId = null, transactionNotes = '') {
    const result = transaction(async () => {
      try {
        // Generate unique invoice number
        const invoiceNo = this.generateSaleInvoiceNumber();
        
        // Calculate totals
        const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        const discountAmount = billData.discount_amount || 0;
        const taxAmount = billData.tax_amount || 0;
        const netAmount = totalAmount - discountAmount + taxAmount;

        // Determine payment status based on paid amount
        let paymentStatus = 'unpaid';
        if (billData.paid_amount && billData.paid_amount > 0) {
          if (billData.paid_amount >= netAmount) {
            paymentStatus = 'paid';
          } else {
            paymentStatus = 'partial';
          }
        }

        // Set default due_date to 1 month from invoice_date if not provided
        let dueDate = billData.due_date;
        if (!dueDate && billData.invoice_date) {
          const invoiceDate = new Date(billData.invoice_date);
          const defaultDueDate = new Date(invoiceDate);
          defaultDueDate.setMonth(defaultDueDate.getMonth() + 1);
          dueDate = defaultDueDate.toISOString().split('T')[0];
        } else if (dueDate && billData.invoice_date) {
          // Validate due_date - must be >= invoice_date
          const invoiceDate = new Date(billData.invoice_date);
          const dueDateObj = new Date(dueDate);
          if (dueDateObj < invoiceDate) {
            // If due_date is before invoice_date, set it to 1 month from invoice_date
            const defaultDueDate = new Date(invoiceDate);
            defaultDueDate.setMonth(defaultDueDate.getMonth() + 1);
            dueDate = defaultDueDate.toISOString().split('T')[0];
          }
        }

        // Insert sale record
        const saleId = insert(`
          INSERT INTO sales (
            customer_id, delegate_id, employee_id, invoice_no, invoice_date, due_date, total_amount, 
            discount_amount, tax_amount, paid_amount, payment_method, 
            payment_status, bill_type, status, notes, barcode, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          billData.customer_id,
          billData.delegate_id || null,
          billData.employee_id || null,
          invoiceNo,
          billData.invoice_date,
          dueDate,
          totalAmount,
          discountAmount,
          taxAmount,
          billData.paid_amount || 0,
          billData.payment_method || 'cash',
          paymentStatus,
          billData.bill_type || 'retail',
          'completed',
          billData.notes,
          billData.barcode || generateBarcode(),
          billData.created_by
        ]);

        // Insert sale items
        items.forEach(item => {
          const lineTotal = (item.quantity * item.price) * (1 - (item.discount_percent || 0) / 100);
          
          insert(`
            INSERT INTO sale_items (
              sale_id, product_id, stock_id, quantity, price, discount_percent, 
              tax_percent, total, line_total
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            saleId,
            item.product_id,
            item.stock_id || null,
            item.quantity,
            item.price,
            item.discount_percent || 0,
            item.tax_percent || 0,
            item.quantity * item.price,
            lineTotal
          ]);

          // Update stock-specific inventory (reduce stock for sales)
          if (item.stock_id) {
            this.updateStockInventory(
              item.product_id,
              item.stock_id,
              item.quantity,
              'subtract',
              'sale',
              saleId,
              invoiceNo,
              `تم بيع المنتج ${item.product_id} من المخزن ${item.stock_id}`,
              billData.created_by
            );
          } else {
            // Fallback to general inventory update if no stock specified
            this.updateProductInventory(
              item.product_id,
              item.quantity,
              'subtract',
              'sale',
              saleId,
              invoiceNo,
              `تم بيع المنتج ${item.product_id} من المخزن ${item.stock_id}`,
              billData.created_by
            );
          }
        });

        // Update customer balance if payment made
        if (billData.paid_amount && billData.paid_amount > 0) {
          update(`
            UPDATE customers 
            SET current_balance = current_balance + ? 
            WHERE id = ?
          `, [billData.paid_amount, billData.customer_id]);
        }

        // Handle money box transaction if payment made and money box selected
        if (billData.paid_amount && billData.paid_amount > 0 && moneyBoxId) {
          try {
            logger.info(`Adding money box transaction: moneyBoxId=${moneyBoxId}, amount=${billData.paid_amount}, invoiceNo=${invoiceNo}`);
            const notes = transactionNotes || `دفع فاتورة بيع رقم: ${invoiceNo}`;
            const result = await this.moneyBoxesService.addTransaction(
              moneyBoxId, 
              'sale', 
              billData.paid_amount, // Positive amount (service handles the addition)
              notes,
              billData.created_by
            );
            logger.info(`Money box transaction successful:`, result);
          } catch (error) {
            logger.error('Error adding money box transaction:', error);
            // Don't throw error here to avoid rolling back the entire sale
          }
        } else {
          logger.info(`Skipping money box transaction: paid_amount=${billData.paid_amount}, moneyBoxId=${moneyBoxId}`);
        }

        // Get the created sale with items
        const sale = this.getSaleById(saleId);
        
        // Invalidate caches after sale creation
        cacheService.invalidatePattern('stocks:*');
        cacheService.invalidatePattern('inventory:*');
        cacheService.invalidatePattern('products:*');
        cacheService.invalidatePattern('stock_products:*');
        cacheService.invalidatePattern('stock_movements:*');
        
        logger.info(`تم إنشاء فاتورة البيع بنجاح: ${invoiceNo}`);
        return {
          success: true,
          message: 'تم إنشاء فاتورة البيع بنجاح',
          data: sale
        };

      } catch (error) {
        logger.error('خطأ في إنشاء فاتورة البيع:', error);
        throw error;
      }
    });

    return result;
  }

  async getAllSaleBills(filters = {}, page = 1, limit = 20) {
    try {
      let whereClause = 'WHERE s.status != \'cancelled\'';
      const params = [];

      if (filters.customer_id) {
        whereClause += ' AND s.customer_id = ?';
        params.push(filters.customer_id);
      }

      if (filters.payment_status) {
        whereClause += ' AND s.payment_status = ?';
        params.push(filters.payment_status);
      }

      if (filters.bill_type) {
        whereClause += ' AND s.bill_type = ?';
        params.push(filters.bill_type);
      }

      if (filters.date_from) {
        whereClause += ' AND s.invoice_date >= ?';
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        whereClause += ' AND s.invoice_date <= ?';
        params.push(filters.date_to);
      }

      if (filters.search) {
        whereClause += ' AND (s.invoice_no LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // Get total count
      const countResult = queryOne(`
        SELECT COUNT(*) as total
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        ${whereClause}
      `, params);

      const total = countResult.total;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;

      // Get sales with customer info and return summary
      const sales = query(`
        SELECT 
          s.*,
          c.name as customer_name,
          c.phone as customer_phone,
          c.email as customer_email,
          d.name as delegate_name,
          d.phone as delegate_phone,
          e.name as employee_name,
          e.phone as employee_phone,
          COALESCE(return_summary.total_returned_amount, 0) as total_returned_amount,
          COALESCE(return_summary.return_count, 0) as return_count,
          COALESCE(return_summary.last_return_date, NULL) as last_return_date
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN representatives d ON s.delegate_id = d.id
        LEFT JOIN employees e ON s.employee_id = e.id
        LEFT JOIN (
          SELECT 
            sr.sale_id,
            SUM(sr.total_amount) as total_returned_amount,
            COUNT(*) as return_count,
            MAX(sr.return_date) as last_return_date
          FROM sale_returns sr
          WHERE sr.status != 'cancelled'
          GROUP BY sr.sale_id
        ) return_summary ON s.id = return_summary.sale_id
        ${whereClause}
        ORDER BY s.created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      // Add return details for each sale
      for (let sale of sales) {
        if (sale.return_count > 0) {
          const returns = await this.getReturnsBySaleId(sale.id);
          sale.returns = returns.data || [];
        } else {
          sale.returns = [];
        }
      }

      return {
        success: true,
        data: sales,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      };

    } catch (error) {
      logger.error('خطأ في إحضار فواتير البيع:', error);
      throw error;
    }
  }

  async getSaleById(id) {
    try {
      const sale = queryOne(`
        SELECT 
          s.*,
          c.name as customer_name,
          c.phone as customer_phone,
          c.email as customer_email,
          COALESCE(return_summary.total_returned_amount, 0) as total_returned_amount,
          COALESCE(return_summary.return_count, 0) as return_count,
          COALESCE(return_summary.last_return_date, NULL) as last_return_date
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN (
          SELECT 
            sr.sale_id,
            SUM(sr.total_amount) as total_returned_amount,
            COUNT(*) as return_count,
            MAX(sr.return_date) as last_return_date
          FROM sale_returns sr
          WHERE sr.status != 'cancelled'
          GROUP BY sr.sale_id
        ) return_summary ON s.id = return_summary.sale_id
        WHERE s.id = ?
      `, [id]);

      if (!sale) {
        return { success: false, message: 'لم يتم إيجاد فاتورة البيع' };
      }

      // Get sale items
      const items = query(`
        SELECT 
          si.*,
          p.name as product_name,
          p.sku as product_sku,
          p.barcode as product_barcode
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ?
      `, [id]);

      sale.items = items;

      // Get returns for this sale
      const returns = await this.getReturnsBySaleId(id);
      sale.returns = returns.data || [];

      return {
        success: true,
        data: sale
      };

    } catch (error) {
      logger.error('خطأ في إحضار فاتورة البيع:', error);
      throw error;
    }
  }

  async getSaleByInvoiceNumber(invoiceNo) {
    try {
      const sale = this.db.prepare(`
        SELECT 
          s.*,
          c.name as customer_name,
          c.phone as customer_phone,
          c.email as customer_email
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        WHERE s.invoice_no = ?
      `).get(invoiceNo);

      if (!sale) {
        return { success: false, message: 'لم يتم إيجاد فاتورة البيع' };
      }

      // Get sale items
      const items = this.db.prepare(`
        SELECT 
          si.*,
          p.name as product_name,
          p.sku as product_sku,
          p.barcode as product_barcode
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ?
      `).all(sale.id);

      sale.items = items;

      return {
        success: true,
        data: sale
      };

    } catch (error) {
      logger.error('خطأ في إحضار فاتورة البيع:', error);
      throw error;
    }
  }

  async updateSalePaymentStatus(id, paymentData) {
    try {
      const sale = db.queryOne('SELECT * FROM sales WHERE id = ?', [id]);
      if (!sale) {
        return { success: false, message: 'لم يتم إيجاد فاتورة البيع' };
      }

      const newPaidAmount = paymentData.paid_amount;
      const newPaymentStatus = newPaidAmount >= sale.net_amount ? 'paid' : 
                              newPaidAmount > 0 ? 'partial' : 'unpaid';

      db.update(`
        UPDATE sales 
        SET paid_amount = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [newPaidAmount, newPaymentStatus, id]);

      // Update customer balance
      const balanceChange = newPaidAmount - sale.paid_amount;
      if (balanceChange !== 0) {
        db.update(`
          UPDATE customers 
          SET current_balance = current_balance + ? 
          WHERE id = ?
        `, [balanceChange, sale.customer_id]);

        // Create cash box transaction for additional payment
        if (balanceChange > 0) {
          const updatedSale = { ...sale, paid_amount: newPaidAmount };
          await this.createSaleCashBoxTransaction(updatedSale, paymentData.user_id || sale.created_by);
        }
      }

      return {
        success: true,
        message: 'Payment status updated successfully'
      };

    } catch (error) {
      logger.error('خطأ في تحديث حالة الدفع لفاتورة البيع:', error);
      throw error;
    }
  }

  async deleteSale(id, force = false) {
    try {
      const sale = db.queryOne('SELECT * FROM sales WHERE id = ?', [id]);
      if (!sale) {
          return { success: false, message: 'لم يتم إيجاد فاتورة البيع' };
      }

      if (force) {
        // Force delete - remove from database completely
        // First get sale items to restore stock
        const items = query(
          `SELECT product_id, quantity 
           FROM sale_items 
           WHERE sale_id = ?`,
          [id]
        );

        // Restore stock for each item
        for (const item of items) {
          if (item.product_id) {
            this.updateProductInventory(
              item.product_id,
              item.quantity,
              'add', // Add back to inventory since sale is being deleted
              'adjustment',
              id,
              sale.invoice_no,
              `Sale force deleted - items restored to stock`,
              null
            );
          }
        }

        // Delete sale items first
        update('DELETE FROM sale_items WHERE sale_id = ?', [id]);
        
        // Delete the sale
        const changes = update('DELETE FROM sales WHERE id = ?', [id]);
        
        if (changes === 0) {
          throw new Error('لم يتم إيجاد فاتورة البيع');
        }

        return {
          success: true,
          message: 'تم حذف فاتورة البيع بنجاح'
        };
      } else {
        // Soft delete by updating status
        update(`
          UPDATE sales 
          SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [id]);

        return {
          success: true,
          message: 'تم حذف فاتورة البيع بنجاح'
        };
      }

    } catch (error) {
      logger.error('خطأ في حذف فاتورة البيع:', error);
      throw error;
    }
  }

  // ==================== PURCHASE BILLS (using existing purchases table) ====================

  async createPurchaseBill(billData, items, moneyBoxId = null, transactionNotes = '') {
    const result = transaction(async () => {
      try {
        // Validate items have stock_id
        if (!items || !Array.isArray(items) || items.length === 0) {
          throw new Error('يجب أن يكون لديك على الأقل عنصر واحد');
        }

        // Validate each item has required fields including stock_id
        for (const item of items) {
          if (!item.product_id) {
            throw new Error('يجب أن يكون لديك ID المنتج لكل عنصر');
          }
          if (!item.quantity || item.quantity <= 0) {
            throw new Error('يجب أن يكون لديك كمية معتمدة لكل عنصر');
          }
          if (!item.price || item.price < 0) {
            throw new Error('يجب أن يكون لديك سعر معتمد لكل عنصر');
          }
          if (!item.stock_id) {
            throw new Error('يجب أن يكون لديك اختيار مخزن لكل عنصر');
          }
        }

        // Generate unique invoice number
        const invoiceNo = this.generatePurchaseInvoiceNumber();
        
        // Calculate totals
        const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        const discountAmount = billData.discount_amount || 0;
        const taxAmount = billData.tax_amount || 0;
        const netAmount = totalAmount - discountAmount + taxAmount;

        // Set default due_date to 1 month from invoice_date if not provided
        let dueDate = billData.due_date;
        if (!dueDate && billData.invoice_date) {
          const invoiceDate = new Date(billData.invoice_date);
          const defaultDueDate = new Date(invoiceDate);
          defaultDueDate.setMonth(defaultDueDate.getMonth() + 1);
          dueDate = defaultDueDate.toISOString().split('T')[0];
        } else if (dueDate && billData.invoice_date) {
          // Validate due_date - must be >= invoice_date
          const invoiceDate = new Date(billData.invoice_date);
          const dueDateObj = new Date(dueDate);
          if (dueDateObj < invoiceDate) {
            // If due_date is before invoice_date, set it to 1 month from invoice_date
            const defaultDueDate = new Date(invoiceDate);
            defaultDueDate.setMonth(defaultDueDate.getMonth() + 1);
            dueDate = defaultDueDate.toISOString().split('T')[0];
          }
        }

        // Insert purchase record
        const purchaseId = insert(`
          INSERT INTO purchases (
            supplier_id, invoice_no, invoice_date, due_date, total_amount, 
            discount_amount, tax_amount, net_amount, paid_amount, payment_method, 
            payment_status, status, notes, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          billData.supplier_id,
          invoiceNo,
          billData.invoice_date,
          dueDate,
          totalAmount,
          discountAmount,
          taxAmount,
          netAmount,
          billData.paid_amount || 0,
          billData.payment_method || 'cash',
          billData.payment_status || 'unpaid',
          'completed',
          billData.notes,
          billData.created_by
        ]);

        // Insert purchase items
        items.forEach(item => {
          const itemTotal = (item.quantity * item.price) * (1 - (item.discount_percent || 0) / 100) * (1 + (item.tax_percent || 0) / 100);
          
          insert(`
            INSERT INTO purchase_items (
              purchase_id, product_id, stock_id, quantity, price, discount_percent, 
              tax_percent, total, expiry_date, batch_number, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            purchaseId,
            item.product_id,
            item.stock_id,
            item.quantity,
            item.price,
            item.discount_percent || 0,
            item.tax_percent || 0,
            itemTotal,
            item.expiry_date,
            item.batch_number,
            item.notes
          ]);

          // Log stock movement for the specific stock
          if (item.stock_id) {
            insert(`
              INSERT INTO stock_movements (
                movement_type, to_stock_id, product_id, quantity,
                unit_cost, total_value, reference_type, reference_id,
                reference_number, notes, created_by
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              'purchase',
              item.stock_id,
              item.product_id,
              item.quantity,
              item.price,
              itemTotal,
              'purchase',
              purchaseId,
              invoiceNo,
              `تم إضافة المنتج إلى المخزن بواسطة فاتورة الشراء رقم ${invoiceNo}`,
              billData.created_by
            ]);

            // Note: Product stock is automatically updated by database trigger
            // No need to manually call updateProductInventory as it would double-count
          }
        });

        // Update supplier balance if payment made
        if (billData.paid_amount && billData.paid_amount > 0) {
          update(`
            UPDATE suppliers 
            SET current_balance = current_balance + ? 
            WHERE id = ?
          `, [billData.paid_amount, billData.supplier_id]);
        }

        // Handle money box transaction if payment made and money box selected
        if (billData.paid_amount && billData.paid_amount > 0 && moneyBoxId) {
          try {
            logger.info(`Adding money box transaction: moneyBoxId=${moneyBoxId}, amount=${billData.paid_amount}, invoiceNo=${invoiceNo}`);
            const notes = transactionNotes || `دفع فاتورة شراء رقم: ${invoiceNo}`;
            const result = await this.moneyBoxesService.addTransaction(
              moneyBoxId, 
              'supplier_payment', 
              billData.paid_amount, // Positive amount (service handles the deduction)
              notes,
              billData.created_by
            );
            logger.info(`Money box transaction successful:`, result);
          } catch (error) {
            logger.error('Error adding money box transaction:', error);
            // Don't throw error here to avoid rolling back the entire purchase
          }
        } else {
          logger.info(`Skipping money box transaction: paid_amount=${billData.paid_amount}, moneyBoxId=${moneyBoxId}`);
        }

        // Get the created purchase with items
        const purchase = this.getPurchaseById(purchaseId);
        
        // Invalidate caches after purchase creation
        cacheService.invalidatePattern('stocks:*');
        cacheService.invalidatePattern('inventory:*');
        cacheService.invalidatePattern('products:*');
        cacheService.invalidatePattern('stock_products:*');
        cacheService.invalidatePattern('stock_movements:*');
        
        logger.info(`تم إنشاء فاتورة الشراء بنجاح: ${invoiceNo}`);
        return {
          success: true,
          message: 'تم إنشاء فاتورة الشراء بنجاح',
          data: purchase
        };

      } catch (error) {
          logger.error('خطأ في إنشاء فاتورة الشراء:', error);
        throw error;
      }
    });

    return result;
  }

  async getAllPurchaseBills(filters = {}, page = 1, limit = 20) {
    try {
      let whereClause = 'WHERE p.status != \'cancelled\'';
      const params = [];

      if (filters.supplier_id) {
        whereClause += ' AND p.supplier_id = ?';
        params.push(filters.supplier_id);
      }

      if (filters.payment_status) {
        whereClause += ' AND p.payment_status = ?';
        params.push(filters.payment_status);
      }

      if (filters.date_from) {
        whereClause += ' AND p.invoice_date >= ?';
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        whereClause += ' AND p.invoice_date <= ?';
        params.push(filters.date_to);
      }

      if (filters.search) {
        whereClause += ' AND (p.invoice_no LIKE ? OR s.name LIKE ? OR s.phone LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        ${whereClause}
      `;
      
      const countResult = queryOne(countQuery, params);

      const total = countResult.total;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;

      // Get purchases with supplier info and return summary
      const dataQuery = `
        SELECT 
          p.*,
          s.name as supplier_name,
          s.phone as supplier_phone,
          s.email as supplier_email,
          COALESCE(return_summary.total_returned_amount, 0) as total_returned_amount,
          COALESCE(return_summary.return_count, 0) as return_count,
          COALESCE(return_summary.last_return_date, NULL) as last_return_date
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN (
          SELECT 
            pr.purchase_id,
            SUM(pr.total_amount) as total_returned_amount,
            COUNT(*) as return_count,
            MAX(pr.return_date) as last_return_date
          FROM purchase_returns pr
          WHERE pr.status != 'cancelled'
          GROUP BY pr.purchase_id
        ) return_summary ON p.id = return_summary.purchase_id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const purchases = query(dataQuery, [...params, limit, offset]);

      // Add return details for each purchase
      for (let purchase of purchases) {
        if (purchase.return_count > 0) {
          const returns = await this.getReturnsByPurchaseId(purchase.id);
          purchase.returns = returns.data || [];
        } else {
          purchase.returns = [];
        }
      }

      const result = {
        success: true,
        data: purchases,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      };
      
      return result;

    } catch (error) {
      console.error('خطأ في إحضار فواتير الشراء:', error);
      logger.error('خطأ في إحضار فواتير الشراء:', error);
      throw error;
    }
  }

  async getPurchaseById(id) {
    try {
      const purchase = queryOne(`
        SELECT 
          p.*,
          s.name as supplier_name,
          s.phone as supplier_phone,
          s.email as supplier_email,
          COALESCE(return_summary.total_returned_amount, 0) as total_returned_amount,
          COALESCE(return_summary.return_count, 0) as return_count,
          COALESCE(return_summary.last_return_date, NULL) as last_return_date
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN (
          SELECT 
            pr.purchase_id,
            SUM(pr.total_amount) as total_returned_amount,
            COUNT(*) as return_count,
            MAX(pr.return_date) as last_return_date
          FROM purchase_returns pr
          WHERE pr.status != 'cancelled'
          GROUP BY pr.purchase_id
        ) return_summary ON p.id = return_summary.purchase_id
        WHERE p.id = ?
      `, [id]);

      if (!purchase) {
        return { success: false, message: 'لم يتم إيجاد فاتورة الشراء' };
      }

      // Get purchase items
      const items = query(`
        SELECT 
          pi.*,
          p.name as product_name,
          p.sku as product_sku,
          p.barcode as product_barcode
        FROM purchase_items pi
        LEFT JOIN products p ON pi.product_id = p.id
        WHERE pi.purchase_id = ?
      `, [id]);

      purchase.items = items;

      // Get returns for this purchase
      const returns = await this.getReturnsByPurchaseId(id);
      purchase.returns = returns.data || [];

      return {
        success: true,
        data: purchase
      };

    } catch (error) {
      logger.error('خطأ في إحضار فاتورة الشراء:', error);
      throw error;
    }
  }

  async getPurchaseByInvoiceNumber(invoiceNo) {
    try {
      const purchase = this.db.prepare(`
        SELECT 
          p.*,
          s.name as supplier_name,
          s.phone as supplier_phone,
          s.email as supplier_email
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.invoice_no = ?
      `).get(invoiceNo);

      if (!purchase) {
        return { success: false, message: 'لم يتم إيجاد فاتورة الشراء' };
      }

      // Get purchase items
      const items = this.db.prepare(`
        SELECT 
          pi.*,
          p.name as product_name,
          p.sku as product_sku,
          p.barcode as product_barcode
        FROM purchase_items pi
        LEFT JOIN products p ON pi.product_id = p.id
        WHERE pi.purchase_id = ?
      `).all(purchase.id);

      purchase.items = items;

      return {
        success: true,
        data: purchase
      };

    } catch (error) {
      logger.error('خطأ في إحضار فاتورة الشراء:', error);
      throw error;
    }
  }

  async updatePurchasePaymentStatus(id, paymentData) {
    try {
      const purchase = queryOne('SELECT * FROM purchases WHERE id = ?', [id]);
      if (!purchase) {
        return { success: false, message: 'لم يتم إيجاد فاتورة الشراء' };
      }

      const newPaidAmount = paymentData.paid_amount;
      const newPaymentStatus = newPaidAmount >= purchase.net_amount ? 'paid' : 
                              newPaidAmount > 0 ? 'partial' : 'unpaid';

      db.update(`
        UPDATE purchases 
        SET paid_amount = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [newPaidAmount, newPaymentStatus, id]);

      // Update supplier balance
      const balanceChange = newPaidAmount - purchase.paid_amount;
      if (balanceChange !== 0) {
                db.update(`
          UPDATE suppliers 
          SET current_balance = current_balance + ?
          WHERE id = ?
        `, [balanceChange, purchase.supplier_id]);

        // Create cash box transaction for additional payment
        if (balanceChange > 0) {
          const updatedPurchase = { ...purchase, paid_amount: newPaidAmount };
          await this.createPurchaseCashBoxTransaction(updatedPurchase, paymentData.user_id || purchase.created_by);
        }
      }

      return {
        success: true,
        message: 'Payment status updated successfully'
      };

    } catch (error) {
      logger.error('خطأ في تحديث حالة الدفع لفاتورة الشراء:', error);
      throw error;
    }
  }

  async deletePurchase(id, force = false) {
    try {
      const purchase = queryOne('SELECT * FROM purchases WHERE id = ?', [id]);
      if (!purchase) {
        return { success: false, message: 'لم يتم إيجاد فاتورة الشراء' };
      }

      if (force) {
        // Force delete - remove from database completely
        // First get purchase items to restore stock
        const items = query(
          `SELECT product_id, stock_id, quantity 
           FROM purchase_items 
           WHERE purchase_id = ?`,
          [id]
        );

        // Restore stock for each item
        for (const item of items) {
          if (item.product_id) {
            this.updateProductInventory(
              item.product_id,
              item.quantity,
              'subtract', // Remove from inventory since purchase is being deleted
              'adjustment',
              id,
              purchase.invoice_no,
              `Purchase force deleted - items removed from stock`,
              null
            );
          }
        }

        // Delete purchase items first
        update('DELETE FROM purchase_items WHERE purchase_id = ?', [id]);
        
        // Delete the purchase
        const changes = update('DELETE FROM purchases WHERE id = ?', [id]);
        
        if (changes === 0) {
          throw new Error('لم يتم إيجاد فاتورة الشراء');
        }

        return {
          success: true,
          message: 'تم حذف فاتورة الشراء بنجاح'
        };
      } else {
        // Soft delete by updating status
        update(`
          UPDATE purchases 
          SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [id]);

        return {
          success: true,
          message: 'تم حذف فاتورة الشراء بنجاح'
        };
      }

    } catch (error) {
      logger.error('خطأ في حذف فاتورة الشراء:', error);
      throw error;
    }
  }

  // ==================== RETURN BILLS (using existing return tables) ====================

  async createReturnBill(returnData, items) {
    const result = transaction(() => {
      try {
        let returnId;

        if (returnData.return_type === 'sale') {
          // Create sale return
          const returnNumber = this.generateSaleReturnNumber();
          
          returnId = insert(`
            INSERT INTO sale_returns (
              sale_id, return_date, reason, total_amount, 
              status, created_by
            ) VALUES (?, ?, ?, ?, ?, ?)
          `, [
            returnData.sale_id,
            returnData.return_date,
            returnData.reason || 'Return',
            returnData.total_amount,
            'completed',
            returnData.created_by
          ]);

          // Insert sale return items and update inventory
          items.forEach(item => {
            insert(`
              INSERT INTO sale_return_items (
                return_id, sale_item_id, quantity, 
                price, total
              ) VALUES (?, ?, ?, ?, ?)
            `, [
              returnId,
              item.sale_item_id,
              item.quantity,
              item.price,
              item.quantity * item.price
            ]);

            // Get the original sale item to get product_id
            const saleItem = queryOne(`
              SELECT si.*, p.name as product_name, p.current_stock, p.purchase_price
              FROM sale_items si 
              LEFT JOIN products p ON si.product_id = p.id 
              WHERE si.id = ?
            `, [item.sale_item_id]);

            if (saleItem && saleItem.product_id) {
              // Add inventory movement for returned product
              this.updateProductInventory(
                saleItem.product_id,
                item.quantity,
                'add', // Add back to inventory
                'return',
                returnId,
                returnNumber,
                `إرجاع من فاتورة مبيعات - ${returnData.reason || 'Return'}`,
                returnData.created_by
              );
            }
          });

        } else if (returnData.return_type === 'purchase') {
          // Create purchase return
          const returnNumber = this.generatePurchaseReturnNumber();
          
          returnId = insert(`
            INSERT INTO purchase_returns (
              purchase_id, return_date, reason, total_amount, 
              status, created_by
            ) VALUES (?, ?, ?, ?, ?, ?)
          `, [
            returnData.purchase_id,
            returnData.return_date,
            returnData.reason || 'Return',
            returnData.total_amount,
            'completed',
            returnData.created_by
          ]);

          // Insert purchase return items and update inventory
          items.forEach(item => {
            insert(`
              INSERT INTO purchase_return_items (
                return_id, purchase_item_id, quantity, 
                price, total
              ) VALUES (?, ?, ?, ?, ?)
            `, [
              returnId,
              item.purchase_item_id,
              item.quantity,
              item.price,
              item.quantity * item.price
            ]);

            // Get the original purchase item to get product_id
            const purchaseItem = queryOne(`
              SELECT pi.*, p.name as product_name 
              FROM purchase_items pi 
              LEFT JOIN products p ON pi.product_id = p.id 
              WHERE pi.id = ?
            `, [item.purchase_item_id]);

            if (purchaseItem) {
              // Remove inventory movement for returned product (returned to supplier)
              this.updateProductInventory(
                purchaseItem.product_id,
                item.quantity,
                'subtract', // Remove from inventory (returned to supplier)
                'return',
                returnId,
                returnNumber,
                `إرجاع إلى المورد - ${returnData.reason || 'Return'}`,
                returnData.created_by
              );
            }
          });
        }

        // Invalidate inventory caches since products were updated
        cacheService.invalidatePattern('inventory:*');
        cacheService.invalidatePattern('products:*');
        cacheService.del('inventory:all_products');
        cacheService.del('inventory:low_stock_products');
        cacheService.del('inventory:out_of_stock_products');
        
        logger.info(`تم إنشاء فاتورة الإرجاع بنجاح: ${returnId}`);
        // Cache invalidated for return bill creation and inventory updates
        
        return {
          success: true,
          message: 'تم إنشاء فاتورة الإرجاع بنجاح',
          data: { id: returnId, return_number: returnId, return_type: returnData.return_type }
        };

      } catch (error) {
        logger.error('خطأ في إنشاء فاتورة الإرجاع:', error);
        throw error;
      }
    });

    return result;
  }

  async getAllReturnBills(filters = {}, page = 1, limit = 20) {
    try {
      
      
      let whereClause = 'WHERE 1=1';
      const params = [];

      if (filters.return_type) {
        whereClause += ' AND return_type = ?';
        params.push(filters.return_type);
      }

      if (filters.date_from) {
        whereClause += ' AND return_date >= ?';
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        whereClause += ' AND return_date <= ?';
        params.push(filters.date_to);
      }

      if (filters.search) {
        whereClause += ' AND (return_number LIKE ? OR notes LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }

      
      

      // Get sale returns with enhanced sales relationship
      const saleReturnsQuery = `
        SELECT 
          sr.*,
          'sale' as return_type,
          s.invoice_no as original_invoice_no,
          s.invoice_date as original_sale_date,
          s.total_amount as original_sale_amount,
          s.payment_status as original_payment_status,
          c.name as customer_name,
          c.phone as customer_phone,
          c.email as customer_email,
          u.name as created_by_name
        FROM sale_returns sr
        LEFT JOIN sales s ON sr.sale_id = s.id
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN users u ON sr.created_by = u.id
        WHERE sr.status != 'cancelled'
      `;
      
      
      const saleReturns = query(saleReturnsQuery, []);
      

      // Get purchase returns with enhanced purchase relationship
      const purchaseReturnsQuery = `
        SELECT 
          pr.*,
          'purchase' as return_type,
          p.invoice_no as original_invoice_no,
          p.invoice_date as original_purchase_date,
          p.total_amount as original_purchase_amount,
          p.payment_status as original_payment_status,
          s.name as supplier_name,
          s.phone as supplier_phone,
          s.email as supplier_email,
          u.name as created_by_name
        FROM purchase_returns pr
        LEFT JOIN purchases p ON pr.purchase_id = p.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN users u ON pr.created_by = u.id
        WHERE pr.status != 'cancelled'
      `;
      
      
      const purchaseReturns = query(purchaseReturnsQuery, []);
      

      // Combine and sort
      const allReturns = [...saleReturns, ...purchaseReturns]
        .sort((a, b) => new Date(b.return_date) - new Date(a.return_date));

      // Get items for each return
      for (let returnBill of allReturns) {
        if (returnBill.return_type === 'sale') {
          const items = query(`
            SELECT 
              sri.*,
              si.product_id,
              si.quantity as original_quantity,
              si.price as original_price,
              p.name as product_name,
              p.sku as product_sku,
              p.barcode as product_barcode,
              p.unit as product_unit
            FROM sale_return_items sri
            LEFT JOIN sale_items si ON sri.sale_item_id = si.id
            LEFT JOIN products p ON si.product_id = p.id
            WHERE sri.return_id = ?
          `, [returnBill.id]);
          returnBill.items = items;
        } else if (returnBill.return_type === 'purchase') {
          const items = query(`
            SELECT 
              pri.*,
              pi.product_id,
              pi.quantity as original_quantity,
              pi.price as original_price,
              p.name as product_name,
              p.sku as product_sku,
              p.barcode as product_barcode,
              p.unit as product_unit
            FROM purchase_return_items pri
            LEFT JOIN purchase_items pi ON pri.purchase_item_id = pi.id
            LEFT JOIN products p ON pi.product_id = p.id
            WHERE pri.return_id = ?
          `, [returnBill.id]);
          returnBill.items = items;
        }
      }

      const total = allReturns.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const paginatedReturns = allReturns.slice(offset, offset + limit);

      const result = {
        success: true,
        data: paginatedReturns,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      };
      
      

      return result;

    } catch (error) {
      console.error('خطأ في إحضار فواتير الإرجاع:', error);
      logger.error('خطأ في إحضار فواتير الإرجاع:', error);
      throw error;
    }
  }

  async getReturnsBySaleId(saleId) {
    try {
      const returns = query(`
        SELECT 
          sr.*,
          'sale' as return_type,
          s.invoice_no as original_invoice_no,
          s.invoice_date as original_sale_date,
          s.total_amount as original_sale_amount,
          c.name as customer_name,
          c.phone as customer_phone,
          c.email as customer_email,
          u.name as created_by_name
        FROM sale_returns sr
        LEFT JOIN sales s ON sr.sale_id = s.id
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN users u ON sr.created_by = u.id
        WHERE sr.sale_id = ? AND sr.status != 'cancelled'
        ORDER BY sr.created_at DESC
      `, [saleId]);

      // Get items for each return
      for (let returnBill of returns) {
        const items = query(`
          SELECT 
            sri.*,
            si.product_id,
            si.quantity as original_quantity,
            si.price as original_price,
            p.name as product_name,
            p.sku as product_sku,
            p.barcode as product_barcode,
            p.unit as product_unit
          FROM sale_return_items sri
          LEFT JOIN sale_items si ON sri.sale_item_id = si.id
          LEFT JOIN products p ON si.product_id = p.id
          WHERE sri.return_id = ?
        `, [returnBill.id]);
        returnBill.items = items;
      }

      return {
        success: true,
        data: returns
      };
    } catch (error) {
      logger.error('Error fetching returns by sale ID:', error);
      throw error;
    }
  }

  async getReturnsByPurchaseId(purchaseId) {
    try {
      const returns = query(`
        SELECT 
          pr.*,
          'purchase' as return_type,
          p.invoice_no as original_invoice_no,
          p.invoice_date as original_purchase_date,
          p.total_amount as original_purchase_amount,
          s.name as supplier_name,
          s.phone as supplier_phone,
          s.email as supplier_email,
          u.name as created_by_name
        FROM purchase_returns pr
        LEFT JOIN purchases p ON pr.purchase_id = p.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN users u ON pr.created_by = u.id
        WHERE pr.purchase_id = ? AND pr.status != 'cancelled'
        ORDER BY pr.created_at DESC
      `, [purchaseId]);

      // Get items for each return
      for (let returnBill of returns) {
        const items = query(`
          SELECT 
            pri.*,
            pi.product_id,
            pi.quantity as original_quantity,
            pi.price as original_price,
            p.name as product_name,
            p.sku as product_sku,
            p.barcode as product_barcode,
            p.unit as product_unit
          FROM purchase_return_items pri
          LEFT JOIN purchase_items pi ON pri.purchase_item_id = pi.id
          LEFT JOIN products p ON pi.product_id = p.id
          WHERE pri.return_id = ?
        `, [returnBill.id]);
        returnBill.items = items;
      }

      return {
        success: true,
        data: returns
      };
    } catch (error) {
      logger.error('خطأ في إحضار فاتورة الإرجاع:', error);
      throw error;
    }
  }

  async getReturnById(id, returnType) {
    try {
      let returnData;

      if (returnType === 'sale') {
        returnData = queryOne(`
          SELECT 
            sr.*,
            'sale' as return_type,
            s.invoice_no as original_invoice_no,
            s.invoice_date as original_sale_date,
            s.total_amount as original_sale_amount,
            s.payment_status as original_payment_status,
            c.name as customer_name,
            c.phone as customer_phone,
            c.email as customer_email,
            u.name as created_by_name
          FROM sale_returns sr
          LEFT JOIN sales s ON sr.sale_id = s.id
          LEFT JOIN customers c ON s.customer_id = c.id
          LEFT JOIN users u ON sr.created_by = u.id
          WHERE sr.id = ?
        `, [id]);

        if (returnData) {
          const items = query(`
            SELECT 
              sri.*,
              si.product_id,
              si.quantity as original_quantity,
              si.price as original_price,
              p.name as product_name,
              p.sku as product_sku,
              p.barcode as product_barcode,
              p.unit as product_unit
            FROM sale_return_items sri
            LEFT JOIN sale_items si ON sri.sale_item_id = si.id
            LEFT JOIN products p ON si.product_id = p.id
            WHERE sri.return_id = ?
          `, [id]);
          returnData.items = items;
        }

      } else if (returnType === 'purchase') {
        returnData = queryOne(`
          SELECT 
            pr.*,
            'purchase' as return_type,
            p.invoice_no as original_invoice_no,
            p.invoice_date as original_purchase_date,
            p.total_amount as original_purchase_amount,
            p.payment_status as original_payment_status,
            s.name as supplier_name,
            s.phone as supplier_phone,
            s.email as supplier_email,
            u.name as created_by_name
          FROM purchase_returns pr
          LEFT JOIN purchases p ON pr.purchase_id = p.id
          LEFT JOIN suppliers s ON p.supplier_id = s.id
          LEFT JOIN users u ON pr.created_by = u.id
          WHERE pr.id = ?
        `, [id]);

        if (returnData) {
          const items = query(`
            SELECT 
              pri.*,
              pi.product_id,
              pi.quantity as original_quantity,
              pi.price as original_price,
              p.name as product_name,
              p.sku as product_sku,
              p.barcode as product_barcode,
              p.unit as product_unit
            FROM purchase_return_items pri
            LEFT JOIN purchase_items pi ON pri.purchase_item_id = pi.id
            LEFT JOIN products p ON pi.product_id = p.id
            WHERE pri.return_id = ?
          `, [id]);
          returnData.items = items;
        }
      }

      if (!returnData) {
        return { success: false, message: 'Return not found' };
      }

      return {
        success: true,
        data: returnData
      };

    } catch (error) {
      logger.error('Error fetching return by ID:', error);
      throw error;
    }
  }

  async deleteReturn(id, returnType) {
    try {
      let tableName;
      if (returnType === 'sale') {
        tableName = 'sale_returns';
      } else if (returnType === 'purchase') {
        tableName = 'purchase_returns';
      } else {
        return { success: false, message: 'Invalid return type' };
      }

      const returnData = queryOne(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
      if (!returnData) {
        return { success: false, message: 'Return not found' };
      }

      // Soft delete by updating status
      update(`
        UPDATE ${tableName} 
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [id]);

      return {
        success: true,
        message: 'Return deleted successfully'
      };

    } catch (error) {
      logger.error('Error deleting return:', error);
      throw error;
    }
  }

  // ==================== STATISTICS ====================

  async getBillsStatistics(filters = {}) {
    try {
      let whereClause = 'WHERE s.status != \'cancelled\'';
      const params = [];

      if (filters.date_from) {
        whereClause += ' AND s.invoice_date >= ?';
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        whereClause += ' AND s.invoice_date <= ?';
        params.push(filters.date_to);
      }

      const stats = queryOne(`
        SELECT 
          COUNT(*) as total_bills,
          SUM(s.net_amount) as total_amount,
          SUM(s.paid_amount) as total_paid,
          SUM(s.net_amount - s.paid_amount) as total_unpaid,
          COALESCE(return_stats.total_returned_amount, 0) as total_returned_amount,
          COALESCE(return_stats.return_count, 0) as return_count
        FROM sales s
        LEFT JOIN (
          SELECT 
            sr.sale_id,
            SUM(sr.total_amount) as total_returned_amount,
            COUNT(*) as return_count
          FROM sale_returns sr
          WHERE sr.status != 'cancelled'
          GROUP BY sr.sale_id
        ) return_stats ON s.id = return_stats.sale_id
        ${whereClause}
      `, params);

      return {
        success: true,
        data: {
          total_bills: stats.total_bills || 0,
          total_amount: parseFloat(stats.total_amount) || 0,
          total_paid: parseFloat(stats.total_paid) || 0,
          total_unpaid: parseFloat(stats.total_unpaid) || 0,
          total_returned_amount: parseFloat(stats.total_returned_amount) || 0,
          return_count: stats.return_count || 0
        }
      };

    } catch (error) {
      logger.error('خطأ في إحضار إحصائيات الفواتير:', error);
      throw error;
    }
  }

  async getPurchasesStatistics(filters = {}) {
    try {
      let whereClause = 'WHERE p.status != \'cancelled\'';
      const params = [];

      if (filters.date_from) {
        whereClause += ' AND p.invoice_date >= ?';
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        whereClause += ' AND p.invoice_date <= ?';
        params.push(filters.date_to);
      }

      const stats = queryOne(`
        SELECT 
          COUNT(*) as total_purchases,
          SUM(p.net_amount) as total_amount,
          SUM(p.paid_amount) as total_paid,
          SUM(p.net_amount - p.paid_amount) as total_unpaid,
          COALESCE(return_stats.total_returned_amount, 0) as total_returned_amount,
          COALESCE(return_stats.return_count, 0) as return_count
        FROM purchases p
        LEFT JOIN (
          SELECT 
            pr.purchase_id,
            SUM(pr.total_amount) as total_returned_amount,
            COUNT(*) as return_count
          FROM purchase_returns pr
          WHERE pr.status != 'cancelled'
          GROUP BY pr.purchase_id
        ) return_stats ON p.id = return_stats.purchase_id
        ${whereClause}
      `, params);

      return {
        success: true,
        data: {
          total_purchases: stats.total_purchases || 0,
          total_amount: parseFloat(stats.total_amount) || 0,
          total_paid: parseFloat(stats.total_paid) || 0,
          total_unpaid: parseFloat(stats.total_unpaid) || 0,
          total_returned_amount: parseFloat(stats.total_returned_amount) || 0,
          return_count: stats.return_count || 0
        }
      };

    } catch (error) {
      logger.error('خطأ في إحضار إحصائيات الشراء:', error);
      throw error;
    }
  }

  async getReturnsStatistics(filters = {}) {
    try {
      let additionalWhereClause = '';
      const params = [];

      if (filters.date_from) {
        additionalWhereClause += ' AND return_date >= ?';
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        additionalWhereClause += ' AND return_date <= ?';
        params.push(filters.date_to);
      }

      // Sale returns stats
      const saleStats = queryOne(`
        SELECT 
          COUNT(*) as total_returns,
          SUM(total_amount) as total_amount
        FROM sale_returns
        WHERE status != \'cancelled\'${additionalWhereClause}
      `, params);

      // Purchase returns stats
      const purchaseStats = queryOne(`
        SELECT 
          COUNT(*) as total_returns,
          SUM(total_amount) as total_amount
        FROM purchase_returns
        WHERE status != \'cancelled\'${additionalWhereClause}
      `, params);

      const totalReturns = (saleStats.total_returns || 0) + (purchaseStats.total_returns || 0);
      const totalAmount = parseFloat(saleStats.total_amount || 0) + parseFloat(purchaseStats.total_amount || 0);
      // For returns, the total_amount represents the refunded amount
      const totalRefunded = totalAmount;

      return {
        success: true,
        data: {
          total_returns: totalReturns,
          total_amount: totalAmount,
          total_refunded: totalRefunded
        }
      };

    } catch (error) {
      logger.error('خطأ في إحضار إحصائيات الإرجاع:', error);
      throw error;
    }
  }

  // ==================== UTILITY METHODS ====================

  generateSaleInvoiceNumber() {
    const prefix = 'SALE';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${date}${random}`;
  }

  generatePurchaseInvoiceNumber() {
    const prefix = 'PUR';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${date}${random}`;
  }

  generateSaleReturnNumber() {
    const prefix = 'SRET';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${date}${random}`;
  }

  generatePurchaseReturnNumber() {
    const prefix = 'PRET';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${date}${random}`;
  }

  // ==================== CASH BOX INTEGRATION METHODS ====================

  async createSaleCashBoxTransaction(sale, userId) {
    try {
      // Get user's cash box
      const cashBox = await this.cashBoxService.getUserCashBox(userId);
      if (!cashBox) {
        logger.warn(`No open cash box found for user ${userId}, skipping cash box transaction`);
        return;
      }

      // Create customer receipt (سند قبض) for sale
      if (sale.paid_amount && sale.paid_amount > 0) {
        const receiptData = {
          customer_id: sale.customer_id,
          sale_id: sale.id,
          receipt_date: sale.invoice_date,
          amount: sale.paid_amount,
          payment_method: sale.payment_method || 'cash',
          reference_number: sale.invoice_no,
          notes: `إيصال قبض للفاتورة ${sale.invoice_no}`
        };

        const receipt = await this.customerReceiptsService.create(receiptData, userId);

        // Add transaction to cash box
        await this.cashBoxService.addCustomerReceiptTransaction(
          cashBox.id,
          userId,
          sale.paid_amount,
          receipt.id,
          `إيصال قبض للفاتورة ${sale.invoice_no}`
        );

        logger.info(`Created customer receipt and cash box transaction for sale ${sale.invoice_no}`);
      }
    } catch (error) {
      logger.error('خطأ في إنشاء عملية النقدية لفاتورة البيع:', error);
      // Don't throw error to avoid breaking the main transaction
    }
  }

  async createPurchaseCashBoxTransaction(purchase, userId) {
    try {
      // Get user's cash box
      const cashBox = await this.cashBoxService.getUserCashBox(userId);
      if (!cashBox) {
        logger.warn(`لم يتم إيجاد صندوق النقدية المفتوح للمستخدم ${userId}, تخطي عملية النقدية`);
        return;
      }

      // Create supplier payment receipt (سند صرف) for purchase
      if (purchase.paid_amount && purchase.paid_amount > 0) {
        const receiptData = {
          supplier_id: purchase.supplier_id,
          purchase_id: purchase.id,
          receipt_date: purchase.invoice_date,
          amount: purchase.paid_amount,
          payment_method: purchase.payment_method || 'cash',
          reference_number: purchase.invoice_no,
          notes: `سند صرف للفاتورة ${purchase.invoice_no}`
        };

        const receipt = await this.supplierPaymentReceiptsService.create(receiptData, userId);

        // Add transaction to cash box (negative amount for payment)
        await this.cashBoxService.addSupplierReceiptTransaction(
          cashBox.id,
          userId,
          purchase.paid_amount,
          receipt.id,
          `سند صرف للفاتورة ${purchase.invoice_no}`
        );

        logger.info(`تم إنشاء سند صرف للفاتورة ${purchase.invoice_no}`);
      }
    } catch (error) {
      logger.error('خطأ في إنشاء عملية النقدية لفاتورة الشراء:', error);
      // Don't throw error to avoid breaking the main transaction
    }
  }

  async createReturnCashBoxTransaction(returnBill, userId) {
    try {
      // Get user's cash box
      const cashBox = await this.cashBoxService.getUserCashBox(userId);
      if (!cashBox) {
        logger.warn(`لم يتم إيجاد صندوق النقدية المفتوح للمستخدم ${userId}, تخطي عملية النقدية`);
        return;
      }

      // Determine return type and create appropriate receipt
      if (returnBill.sale_id) {
        // Sale return - create customer receipt (سند صرف)
        const receiptData = {
          customer_id: returnBill.customer_id,
          sale_id: returnBill.sale_id,
          receipt_date: returnBill.return_date,
          amount: returnBill.total_amount,
          payment_method: returnBill.payment_method || 'cash',
          reference_number: returnBill.return_no,
          notes: `سند صرف للمرتجع ${returnBill.return_no}`
        };

        const receipt = await this.customerReceiptsService.create(receiptData, userId);

        // Add transaction to cash box (negative amount for refund)
        await this.cashBoxService.addReturnTransaction(
          cashBox.id,
          userId,
          returnBill.total_amount,
          returnBill.id,
          'sale',
          `سند صرف للمرتجع ${returnBill.return_no}`
        );

        logger.info(`تم إنشاء سند صرف للمرتجع ${returnBill.return_no}`);
      } else if (returnBill.purchase_id) {
        // Purchase return - create supplier payment receipt (سند قبض)
        const receiptData = {
          supplier_id: returnBill.supplier_id,
          purchase_id: returnBill.purchase_id,
          receipt_date: returnBill.return_date,
          amount: returnBill.total_amount,
          payment_method: returnBill.payment_method || 'cash',
          reference_number: returnBill.return_no,
          notes: `سند قبض للمرتجع ${returnBill.return_no}`
        };

        const receipt = await this.supplierPaymentReceiptsService.create(receiptData, userId);

        // Add transaction to cash box (positive amount for refund received)
        await this.cashBoxService.addReturnTransaction(
          cashBox.id,
          userId,
          returnBill.total_amount,
          returnBill.id,
          'purchase',
          `سند قبض للمرتجع ${returnBill.return_no}`
        );

        logger.info(`تم إنشاء سند قبض للمرتجع ${returnBill.return_no}`);
      }
    } catch (error) {
      logger.error('خطأ في إنشاء عملية النقدية لفاتورة الإرجاع:', error);
      // Don't throw error to avoid breaking the main transaction
    }
  }

  // ==================== POST-PROCESS PAYMENT VOUCHER METHODS ====================

  // Create payment voucher for sale after process is complete
  async createSalePaymentVoucher(saleId, userId) {
    try {
      const sale = await this.getSaleById(saleId);
      if (!sale || !sale.success) {
        throw new Error('لم يتم إيجاد فاتورة البيع');
      }

      const saleData = sale.data;
      if (saleData.paid_amount && saleData.paid_amount > 0) {
        await this.createSaleCashBoxTransaction(saleData, userId);
        logger.info(`تم إنشاء سند صرف للفاتورة ${saleData.invoice_no} بعد الانتهاء من العملية`);
        return { success: true, message: 'تم إنشاء سند صرف للفاتورة بنجاح' };
      } else {
        logger.info(`لم يتم إنشاء سند صرف للفاتورة ${saleData.invoice_no} (لم يتم إدخال الدفع)`);
        return { success: true, message: 'لم يتم إنشاء سند صرف للفاتورة' };
      }
    } catch (error) {
      logger.error('خطأ في إنشاء سند صرف لفاتورة البيع:', error);
      throw error;
    }
  }

  // Create payment voucher for purchase after process is complete
  async createPurchasePaymentVoucher(purchaseId, userId) {
    try {
      const purchase = await this.getPurchaseById(purchaseId);
      if (!purchase || !purchase.success) {
        throw new Error('لم يتم إيجاد فاتورة الشراء');
      }

      const purchaseData = purchase.data;
      if (purchaseData.paid_amount && purchaseData.paid_amount > 0) {
        await this.createPurchaseCashBoxTransaction(purchaseData, userId);
          logger.info(`تم إنشاء سند صرف للفاتورة ${purchaseData.invoice_no} بعد الانتهاء من العملية`);
        return { success: true, message: 'تم إنشاء سند صرف للفاتورة بنجاح' };
      } else {
        logger.info(`لم يتم إنشاء سند صرف للفاتورة ${purchaseData.invoice_no} (لم يتم إدخال الدفع)`);
        return { success: true, message: 'لم يتم إنشاء سند صرف للفاتورة' };
      }
    } catch (error) {
      logger.error('خطأ في إنشاء سند صرف لفاتورة الشراء:', error);
      throw error;
    }
  }

  // Create payment voucher for return after process is complete
  async createReturnPaymentVoucher(returnId, returnType, userId) {
    try {
      const returnBill = await this.getReturnById(returnId, returnType);
      if (!returnBill || !returnBill.success) {
        throw new Error('لم يتم إيجاد فاتورة الإرجاع');
      }

      const returnData = returnBill.data;
      await this.createReturnCashBoxTransaction(returnData, userId);
      logger.info(`تم إنشاء سند صرف للمرتجع ${returnData.return_no} بعد الانتهاء من العملية`);
      return { success: true, message: 'تم إنشاء سند صرف للمرتجع بنجاح' };
    } catch (error) {
      logger.error('خطأ في إنشاء سند صرف لفاتورة الإرجاع:', error);
      throw error;
    }
  }

  // Batch create payment vouchers for multiple bills
  async createBatchPaymentVouchers(bills, userId) {
    try {
      const results = [];
      
      for (const bill of bills) {
        try {
          let result;
          if (bill.type === 'sale') {
            result = await this.createSalePaymentVoucher(bill.id, userId);
          } else if (bill.type === 'purchase') {
            result = await this.createPurchasePaymentVoucher(bill.id, userId);
          } else if (bill.type === 'return') {
            result = await this.createReturnPaymentVoucher(bill.id, bill.returnType, userId);
          }
          results.push({ billId: bill.id, type: bill.type, ...result });
        } catch (error) {
          results.push({ 
            billId: bill.id, 
            type: bill.type, 
            success: false, 
            error: error.message 
          });
        }
      }

      return {
        success: true,
        message: 'تم إنشاء سند صرف للفواتير بنجاح',
        results
      };
    } catch (error) {
      logger.error('خطأ في إنشاء سند صرف للفواتير:', error);
      throw error;
    }
  }

  // Helper method to update stock-specific inventory with audit logging
  updateStockInventory(productId, stockId, quantityChange, operation = 'add', referenceType = 'purchase', referenceId = null, referenceNumber = null, notes = null, userId = null) {
    try {
      const operator = operation === 'add' ? '+' : '-';
      
      // First check if product and stock exist
      const product = queryOne(
        'SELECT id, name, purchase_price FROM products WHERE id = ?',
        [productId]
      );

      if (!product) {
        throw new Error(`لم يتم إيجاد المنتج ب ID ${productId}`);
      }

      const stock = queryOne(
        'SELECT id, name, code FROM stocks WHERE id = ?',
        [stockId]
      );

      if (!stock) {
        throw new Error(`لم يتم إيجاد المخزن ب ID ${stockId}`);
      }

      // Calculate current stock quantity for this specific stock
      const currentStockInStock = queryOne(`
        SELECT COALESCE(
          (SELECT SUM(CASE WHEN to_stock_id = ? THEN quantity ELSE 0 END) - 
                  SUM(CASE WHEN from_stock_id = ? THEN quantity ELSE 0 END)
           FROM stock_movements 
           WHERE product_id = ? AND (to_stock_id = ? OR from_stock_id = ?)), 0
        ) as current_stock_in_stock
      `, [stockId, stockId, productId, stockId, stockId]);

      const currentQuantity = currentStockInStock.current_stock_in_stock || 0;
      const newQuantity = operation === 'add' 
        ? currentQuantity + Math.abs(quantityChange)
        : currentQuantity - Math.abs(quantityChange);

      // Check if we have enough stock for subtract operations
      if (operation === 'subtract' && newQuantity < 0) {
        throw new Error(`عدم كفاية المخزن في ${stock.name} (${stock.code}). المتوفر: ${currentQuantity}, المطلوب: ${quantityChange}`);
      }

      logger.info(`تحديث مخزن: المنتج ${product.name} في المخزن ${stock.name} (${stock.code}) - الحالي: ${currentQuantity}, العملية: ${operation}, التغيير: ${quantityChange}, الجديد: ${newQuantity}`);

      // Record stock movement
      const movementType = operation === 'subtract' ? 'sale' : 'purchase';
      const fromStockId = operation === 'subtract' ? stockId : null;
      const toStockId = operation === 'add' ? stockId : null;

      insert(`
        INSERT INTO stock_movements (
          product_id, from_stock_id, to_stock_id, movement_type, quantity,
          reference_type, reference_id, reference_number, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        productId,
        fromStockId,
        toStockId,
        movementType,
        Math.abs(quantityChange), // Always use positive quantity for database constraint
        referenceType,
        referenceId,
        referenceNumber,
        notes || `حركة ${referenceType === 'purchase' ? 'شراء' : referenceType === 'sale' ? 'بيع' : referenceType} - ${referenceNumber || referenceId}`,
        userId
      ]);

      logger.info(`تم تسجيل حركة المخزن للمنتج ${product.name} في المخزن ${stock.name}: ${operation} ${quantityChange} وحدات`);
      
      return {
        success: true,
        productId,
        stockId,
        previousStock: currentQuantity,
        newStock: newQuantity,
        quantityChange,
        operation
      };
    } catch (error) {
      logger.error('خطأ في تحديث مخزن المنتج:', error);
      throw error;
    }
  }

  // Helper method to update product inventory with audit logging
  updateProductInventory(productId, quantityChange, operation = 'add', referenceType = 'purchase', referenceId = null, referenceNumber = null, notes = null, userId = null) {
    try {
      const operator = operation === 'add' ? '+' : '-';
      
      // First check if product exists
      const product = queryOne(
        'SELECT id, name, current_stock, min_stock FROM products WHERE id = ?',
        [productId]
      );

      if (!product) {
        throw new Error(`لم يتم إيجاد المنتج ب ID ${productId}`);
      }

      // Calculate new stock
      const currentStock = product.current_stock || 0;
      const newStock = operation === 'add' 
        ? currentStock + Math.abs(quantityChange)
        : currentStock - Math.abs(quantityChange);

      logger.info(`تحديث مخزن: المنتج ${product.name} (ID: ${productId}) - الحالي: ${currentStock}, العملية: ${operation}, التغيير: ${quantityChange}, الجديد: ${newStock}`);

      // Update the stock
      const updateResult = update(
        `UPDATE products 
         SET current_stock = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [newStock, productId]
      );

      if (updateResult === 0) {
        throw new Error(`Failed to update stock for product ${productId}`);
      }

      // Log stock movement for audit
      insert(
        `INSERT INTO inventory_movements (
          product_id, movement_type, quantity, previous_stock, new_stock,
          reference_type, reference_id, unit_cost, total_value, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productId,
          referenceType, // Using referenceType as movement_type for consistency
          operation === 'subtract' ? -Math.abs(quantityChange) : Math.abs(quantityChange), // Negative for subtract operations
          currentStock,
          newStock,
          referenceType,
          referenceId,
          product.purchase_price || 0,
          (product.purchase_price || 0) * Math.abs(quantityChange),
          notes || `حركة ${referenceType === 'purchase' ? 'شراء' : referenceType === 'sale' ? 'بيع' : referenceType} - ${referenceNumber || referenceId}`,
          userId
        ]
      );

      logger.info(`تم تسجيل حركة المخزن للمنتج ${product.name}: ${operation} ${quantityChange} وحدات`);
      
      return {
        success: true,
        productId,
        previousStock: currentStock,
        newStock,
        quantityChange,
        operation
      };
    } catch (error) {
      logger.error('خطأ في تحديث مخزن المنتج:', error);
      throw error;
    }
  }
}

module.exports = new BillsService(); 