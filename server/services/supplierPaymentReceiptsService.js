const { db, transaction, query, queryOne, insert, update } = require('../database');
const logger = require('../utils/logger');
const { generateReceiptNumber } = require('../utils/skuGenerator');
const { generateReceiptBarcode } = require('../utils/barcode');
const moneyBoxesService = require('./moneyBoxesService');
const cashBoxService = require('./cashBoxService');
const cacheService = require('./cacheService');

class SupplierPaymentReceiptsService {
  constructor() {
    this.tableName = 'supplier_payment_receipts';
  }

  // Get all supplier payment receipts with pagination and filters
  getAll(filters = {}, page = 1, limit = 10) {
    try {
      let whereClause = 'WHERE 1=1';
      const params = [];

      // Apply filters
      if (filters.supplier_id) {
        whereClause += ' AND spr.supplier_id = ?';
        params.push(filters.supplier_id);
      }

      if (filters.purchase_id) {
        whereClause += ' AND spr.purchase_id = ?';
        params.push(filters.purchase_id);
      }

      if (filters.payment_method) {
        whereClause += ' AND spr.payment_method = ?';
        params.push(filters.payment_method);
      }

      if (filters.date_from) {
        whereClause += ' AND spr.receipt_date >= ?';
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        whereClause += ' AND spr.receipt_date <= ?';
        params.push(filters.date_to);
      }

      if (filters.reference_number) {
        whereClause += ' AND spr.reference_number LIKE ?';
        params.push(`%${filters.reference_number}%`);
      }

      // Count total records
      const countQuery = `
        SELECT COUNT(*) as total
        FROM ${this.tableName} spr
        ${whereClause}
      `;
      const totalResult = queryOne(countQuery, params);
      const total = totalResult.total;

      // Calculate pagination
      const offset = (page - 1) * limit;
      const paginationParams = [...params, limit, offset];

      // Get paginated results
      const sqlQuery = `
        SELECT 
          spr.*,
          s.name as supplier_name,
          s.phone as supplier_phone,
          s.email as supplier_email,
          p.invoice_no as purchase_invoice_no,
          u.name as created_by_name
        FROM ${this.tableName} spr
        LEFT JOIN suppliers s ON spr.supplier_id = s.id
        LEFT JOIN purchases p ON spr.purchase_id = p.id
        LEFT JOIN users u ON spr.created_by = u.id
        ${whereClause}
        ORDER BY spr.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const receipts = query(sqlQuery, paginationParams);

      return {
        receipts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting supplier payment receipts:', error);
      throw new Error('حدث خطأ أثناء جلب إيصالات دفع الموردين');
    }
  }

  // Get receipt by ID
  getById(id) {
    try {
      const sqlQuery = `
        SELECT 
          spr.*,
          s.name as supplier_name,
          s.phone as supplier_phone,
          s.email as supplier_email,
          s.address as supplier_address,
          p.invoice_no as purchase_invoice_no,
          p.total_amount as purchase_total_amount,
          p.paid_amount as purchase_paid_amount,
          p.remaining_amount as purchase_remaining_amount,
          u.name as created_by_name
        FROM ${this.tableName} spr
        LEFT JOIN suppliers s ON spr.supplier_id = s.id
        LEFT JOIN purchases p ON spr.purchase_id = p.id
        LEFT JOIN users u ON spr.created_by = u.id
        WHERE spr.id = ?
      `;

      const receipt = queryOne(sqlQuery, [id]);
      if (!receipt) {
        throw new Error('Receipt not found');
      }

      return receipt;
    } catch (error) {
      logger.error('Error getting supplier payment receipt by ID:', error);
      if (error.message.includes('not found')) {
        throw new Error('إيصال الدفع غير موجود');
      }
      throw new Error('حدث خطأ أثناء جلب بيانات إيصال الدفع');
    }
  }

  // Create new receipt
  async create(receiptData, userId) {
    try {
      logger.info(`Processing money box transaction: money_box_id=${receiptData.money_box_id}, amount=${receiptData.amount}`);
      
      // Handle money box transaction FIRST to validate balance
      if (receiptData.money_box_id && receiptData.money_box_id !== 'cash_box') {
        // Add transaction to specific money box
        logger.info(`Adding transaction to money box: ${receiptData.money_box_id}`);
        logger.info(`Transaction type: supplier_payment`);
        logger.info(`Amount: ${receiptData.amount}`);
        logger.info(`Notes: دفع للمورد - ${receiptData.receipt_number || 'TEMP'}`);
        const result = await moneyBoxesService.addTransaction(
          receiptData.money_box_id,
          'supplier_payment',
          receiptData.amount,
          `دفع للمورد - ${receiptData.receipt_number || 'TEMP'}`,
          userId
        );
        logger.info(`Money box transaction successful:`, result);
      } else {
        // Add transaction to main cash box
        logger.info(`Adding transaction to main cash box`);
        const result = await cashBoxService.addTransaction(
          receiptData.amount,
          'supplier_payment',
          `دفع للمورد - ${receiptData.receipt_number || 'TEMP'}`,
          userId
        );
        logger.info(`Cash box transaction successful:`, result);
      }

      // Now create the receipt in database transaction
      const receipt = transaction(() => {
        // Validate required fields
        if (!receiptData.supplier_id) {
          throw new Error('المورد مطلوب');
        }
        
        if (!receiptData.amount || receiptData.amount <= 0) {
          throw new Error('المبلغ غير صحيح');
        }

        // Check if supplier exists
        const supplier = queryOne('SELECT id FROM suppliers WHERE id = ?', [receiptData.supplier_id]);
        if (!supplier) {
          throw new Error('المورد غير موجود');
        }

        // Check if purchase exists if provided
        if (receiptData.purchase_id) {
          const purchase = queryOne('SELECT id FROM purchases WHERE id = ?', [receiptData.purchase_id]);
          if (!purchase) {
            throw new Error('فاتورة الشراء غير موجودة');
          }
        }

        // Generate receipt number if not provided
        if (!receiptData.receipt_number) {
          receiptData.receipt_number = generateReceiptNumber('SPR');
        }

        // Generate barcode if not provided
        if (!receiptData.barcode) {
          receiptData.barcode = generateReceiptBarcode('supplier');
        }

        // Validate receipt number uniqueness
        const existingReceipt = queryOne(
          'SELECT id FROM supplier_payment_receipts WHERE receipt_number = ?',
          [receiptData.receipt_number]
        );

        if (existingReceipt) {
          throw new Error('Receipt number already exists');
        }

        // Insert receipt
        const receiptId = insert(
          `INSERT INTO supplier_payment_receipts (
            receipt_number, barcode, supplier_id, purchase_id, receipt_date,
            amount, payment_method, reference_number, notes, money_box_id, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            receiptData.receipt_number,
            receiptData.barcode,
            receiptData.supplier_id,
            receiptData.purchase_id || null,
            receiptData.receipt_date,
            receiptData.amount,
            receiptData.payment_method || 'cash',
            receiptData.reference_number || null,
            receiptData.notes || null,
            receiptData.money_box_id || null,
            userId
          ]
        );

        // Update purchase paid amount if purchase_id is provided
        if (receiptData.purchase_id) {
          const purchase = queryOne('SELECT paid_amount, remaining_amount, total_amount FROM purchases WHERE id = ?', [receiptData.purchase_id]);
          if (purchase) {
            const newPaidAmount = purchase.paid_amount + receiptData.amount;
            
            // Validate that new paid amount doesn't exceed total amount
            if (newPaidAmount > purchase.total_amount) {
              throw new Error(`المبلغ يتجاوز إجمالي فاتورة الشراء. إجمالي الفاتورة: ${purchase.total_amount.toLocaleString()}, المدفوع: ${purchase.paid_amount.toLocaleString()}, المتبقي: ${(purchase.total_amount - purchase.paid_amount).toLocaleString()}`);
            }
            
            const newRemainingAmount = Math.max(0, purchase.remaining_amount - receiptData.amount);
            
            update(`
              UPDATE purchases 
              SET paid_amount = ?, payment_status = ?
              WHERE id = ?
            `, [
              newPaidAmount,
              newRemainingAmount === 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'unpaid',
              receiptData.purchase_id
            ]);
          }
        }

        return this.getById(receiptId);
      });
      
      // Invalidate caches
      try {
        cacheService.invalidatePattern('supplier_payment_receipts:*');
        cacheService.del('supplier_payment_receipts:all');
      } catch (error) {
        logger.error('Error invalidating cache:', error);
        // Don't throw error here, just log it
      }

      return receipt;
    } catch (error) {
      logger.error('Error creating supplier payment receipt:', error);
      if (error.message.includes('already exists') || error.message.includes('not found') || error.message.includes('غير صحيح') || error.message.includes('مطلوب')) {
        throw error;
      }
      throw new Error('حدث خطأ أثناء إنشاء إيصال الدفع');
    }
  }

  // Update receipt
  update(id, receiptData, userId) {
    try {
      return transaction(() => {
        // Get current receipt
        const currentReceipt = this.getById(id);
        if (!currentReceipt) {
          throw new Error('Receipt not found');
        }

        // Validate required fields if provided
        if (receiptData.supplier_id) {
          const supplier = queryOne('SELECT id FROM suppliers WHERE id = ?', [receiptData.supplier_id]);
          if (!supplier) {
            throw new Error('المورد غير موجود');
          }
        }

        if (receiptData.purchase_id) {
          const purchase = queryOne('SELECT id FROM purchases WHERE id = ?', [receiptData.purchase_id]);
          if (!purchase) {
            throw new Error('فاتورة الشراء غير موجودة');
          }
        }

        if (receiptData.amount !== undefined && receiptData.amount <= 0) {
          throw new Error('المبلغ غير صحيح');
        }

        // Check if receipt number is being changed and if it's unique
        if (receiptData.receipt_number && receiptData.receipt_number !== currentReceipt.receipt_number) {
          const existingReceipt = queryOne(
            'SELECT id FROM supplier_payment_receipts WHERE receipt_number = ? AND id != ?',
            [receiptData.receipt_number, id]
          );

          if (existingReceipt) {
            throw new Error('Receipt number already exists');
          }
        }

        // Update receipt
        const updateQuery = `
          UPDATE supplier_payment_receipts 
          SET receipt_number = ?, supplier_id = ?, purchase_id = ?, receipt_date = ?,
              amount = ?, payment_method = ?, reference_number = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;

        update(updateQuery, [
          receiptData.receipt_number || currentReceipt.receipt_number,
          receiptData.supplier_id || currentReceipt.supplier_id,
          receiptData.purchase_id || currentReceipt.purchase_id,
          receiptData.receipt_date || currentReceipt.receipt_date,
          receiptData.amount || currentReceipt.amount,
          receiptData.payment_method || currentReceipt.payment_method,
          receiptData.reference_number || currentReceipt.reference_number,
          receiptData.notes || currentReceipt.notes,
          id
        ]);

        // Handle purchase amount updates if amount or purchase_id changed
        if (receiptData.amount !== undefined || receiptData.purchase_id !== undefined) {
          // Revert previous purchase updates
          if (currentReceipt.purchase_id) {
            const oldPurchase = queryOne('SELECT paid_amount, remaining_amount FROM purchases WHERE id = ?', [currentReceipt.purchase_id]);
            if (oldPurchase) {
              const newPaidAmount = Math.max(0, oldPurchase.paid_amount - currentReceipt.amount);
              const newRemainingAmount = oldPurchase.remaining_amount + currentReceipt.amount;
              
              update(`
                UPDATE purchases 
                SET paid_amount = ?, payment_status = ?
                WHERE id = ?
              `, [
                newPaidAmount,
                newPaidAmount === 0 ? 'unpaid' : newRemainingAmount === 0 ? 'paid' : 'partial',
                currentReceipt.purchase_id
              ]);
            }
          }

          // Apply new purchase updates
          const newPurchaseId = receiptData.purchase_id || currentReceipt.purchase_id;
          const newAmount = receiptData.amount || currentReceipt.amount;
          
          if (newPurchaseId) {
            const newPurchase = queryOne('SELECT paid_amount, remaining_amount, total_amount FROM purchases WHERE id = ?', [newPurchaseId]);
            if (newPurchase) {
              const newPaidAmount = newPurchase.paid_amount + newAmount;
              
              // Validate that new paid amount doesn't exceed total amount
              if (newPaidAmount > newPurchase.total_amount) {
                throw new Error(`المبلغ يتجاوز إجمالي فاتورة الشراء. إجمالي الفاتورة: ${newPurchase.total_amount.toLocaleString()}, المدفوع: ${newPurchase.paid_amount.toLocaleString()}, المتبقي: ${(newPurchase.total_amount - newPurchase.paid_amount).toLocaleString()}`);
              }
              
              const newRemainingAmount = Math.max(0, newPurchase.remaining_amount - newAmount);
              
              update(`
                UPDATE purchases 
                SET paid_amount = ?, payment_status = ?
                WHERE id = ?
              `, [
                newPaidAmount,
                newRemainingAmount === 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'unpaid',
                newPurchaseId
              ]);
            }
          }
        }

        return this.getById(id);
      });
    } catch (error) {
      logger.error('Error updating supplier payment receipt:', error);
      if (error.message.includes('not found') || error.message.includes('already exists') || error.message.includes('غير موجود') || error.message.includes('غير صحيح')) {
        throw error;
      }
      throw new Error('حدث خطأ أثناء تحديث إيصال الدفع');
    }
  }

  // Delete receipt
  delete(id, userId) {
    try {
      return transaction(() => {
        const receipt = this.getById(id);
        if (!receipt) {
          throw new Error('Receipt not found');
        }

        // Revert purchase updates
        if (receipt.purchase_id) {
          const purchase = queryOne('SELECT paid_amount, remaining_amount FROM purchases WHERE id = ?', [receipt.purchase_id]);
          if (purchase) {
            const newPaidAmount = Math.max(0, purchase.paid_amount - receipt.amount);
            const newRemainingAmount = purchase.remaining_amount + receipt.amount;
            
            update(`
              UPDATE purchases 
              SET paid_amount = ?, payment_status = ?
              WHERE id = ?
            `, [
              newPaidAmount,
              newPaidAmount === 0 ? 'unpaid' : newRemainingAmount === 0 ? 'paid' : 'partial',
              receipt.purchase_id
            ]);
          }
        }

        // Delete receipt
        const result = update('DELETE FROM supplier_payment_receipts WHERE id = ?', [id]);
        
        if (result.changes === 0) {
          throw new Error('Receipt not found');
        }

        return { message: 'تم حذف الإيصال بنجاح' };
      });
    } catch (error) {
      logger.error('Error deleting supplier payment receipt:', error);
      if (error.message.includes('not found')) {
        throw new Error('إيصال الدفع غير موجود');
      }
      throw new Error('حدث خطأ أثناء حذف إيصال الدفع');
    }
  }

  // Get supplier receipt summary
  getSupplierSummary(supplierId) {
    try {
      const sqlQuery = `
        SELECT 
          COUNT(*) as total_receipts,
          SUM(amount) as total_amount,
          MIN(receipt_date) as first_receipt_date,
          MAX(receipt_date) as last_receipt_date
        FROM supplier_payment_receipts 
        WHERE supplier_id = ?
      `;

      return queryOne(sqlQuery, [supplierId]);
    } catch (error) {
      logger.error('Error getting supplier receipt summary:', error);
      throw new Error('حدث خطأ أثناء جلب ملخص إيصالات المورد');
    }
  }

  // Get receipt statistics
  getStatistics(filters = {}) {
    try {
      let whereClause = 'WHERE 1=1';
      const params = [];

      if (filters.date_from) {
        whereClause += ' AND receipt_date >= ?';
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        whereClause += ' AND receipt_date <= ?';
        params.push(filters.date_to);
      }

      const sqlQuery = `
        SELECT 
          COUNT(*) as total_receipts,
          SUM(amount) as total_amount,
          AVG(amount) as average_amount,
          MIN(amount) as min_amount,
          MAX(amount) as max_amount,
          COUNT(DISTINCT supplier_id) as unique_suppliers
        FROM supplier_payment_receipts 
        ${whereClause}
      `;

      return queryOne(sqlQuery, params);
    } catch (error) {
      logger.error('Error getting receipt statistics:', error);
      throw new Error('حدث خطأ أثناء جلب الإحصائيات');
    }
  }
}

module.exports = new SupplierPaymentReceiptsService(); 