const db = require('../database');
const logger = require('../utils/logger');
const BaseService = require('./baseService');
const { generateBarcode } = require('../utils/barcode');
const cacheService = require('./cacheService');
const customersService = require('./customersService');

class SalesService extends BaseService {
  constructor() {
    super('sales');
  }

  // Load all sales into cache for fast lookups
  loadAllSalesToCache() {
    try {
      const query = `
        SELECT 
          s.*,
          c.name as customer_name,
          u.name as created_by_name,
          u.username as created_by_username,
          COALESCE(SUM(si.quantity), 0) as total_items,
          COALESCE(SUM(si.total), 0) as total_amount
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN users u ON s.created_by = u.id
        LEFT JOIN sale_items si ON s.id = si.sale_id
        WHERE s.status != 'cancelled'
        GROUP BY s.id
        ORDER BY s.created_at DESC
        LIMIT 1000
      `;
      
      const sales = db.query(query);
      
      // Store all sales in cache for 5 minutes
      cacheService.set('sales:all_sales', sales, 300);
      
      // Create customer sales index for fast lookup
      const customerSalesIndex = {};
      sales.forEach(sale => {
        if (sale.customer_id) {
          if (!customerSalesIndex[sale.customer_id]) {
            customerSalesIndex[sale.customer_id] = [];
          }
          customerSalesIndex[sale.customer_id].push(sale);
        }
      });
      
      // Cache customer sales index for 5 minutes
      cacheService.set('sales:customer_sales_index', customerSalesIndex, 300);
      
      // Loaded sales into cache
      return sales;
    } catch (err) {
      logger.error('Error loading all sales to cache:', err);
      throw new Error('Failed to load sales to cache');
    }
  }

  // Validation helpers
  static validatePaymentMethod(method) {
    const validMethods = ['cash', 'card', 'bank_transfer'];
    if (!validMethods.includes(method)) {
      throw new Error(`Invalid payment method. Must be one of: ${validMethods.join(', ')}`);
    }
  }

  static validatePaymentStatus(status) {
    const validStatuses = ['paid', 'unpaid', 'partial'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid payment status. Must be one of: ${validStatuses.join(', ')}`);
    }
  }

  static validateSaleStatus(status) {
    const validStatuses = ['completed', 'pending', 'cancelled', 'returned', 'partially_returned'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid sale status. Must be one of: ${validStatuses.join(', ')}`);
    }
  }

  static validateSaleItem(item) {
    // Check if this is a manual item (negative product_id or has name)
    const isManualItem = !item.product_id || item.product_id < 0 || (item.name && item.name.trim() !== '');
    
    if (isManualItem) {
      // For manual items, provide a default name if not provided
      if (!item.name || typeof item.name !== 'string' || item.name.trim() === '') {
        item.name = 'مواد اخرى'; // Default name for manual items
        logger.info('Added default name for manual item:', { 
          product_id: item.product_id, 
          defaultName: item.name
        });
      }
      
      logger.info('Processing manual item (مواد اخرى):', { 
        product_id: item.product_id, 
        name: item.name,
        price: item.price,
        quantity: item.quantity 
      });
    } else {
      // For real products, we need a valid product_id
      if (!item.product_id || typeof item.product_id !== 'number' || item.product_id <= 0) {
        throw new Error('Real products must have a valid positive product_id');
      }
    }
    
    if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
      throw new Error('Invalid quantity in sale item');
    }
    if (!item.price || typeof item.price !== 'number' || item.price <= 0) {
      throw new Error('Invalid price in sale item');
    }
    if (item.discount_percent && (typeof item.discount_percent !== 'number' || item.discount_percent < 0 || item.discount_percent > 100)) {
      throw new Error('Invalid discount_percent in sale item');
    }
    if (item.tax_percent && (typeof item.tax_percent !== 'number' || item.tax_percent < 0 || item.tax_percent > 100)) {
      throw new Error('Invalid tax_percent in sale item');
    }
  }

  // Helper method to check if item is a manual item (مواد اخرى)
  static isManualItem(item) {
    // An item is manual if:
    // 1. product_id is null/undefined
    // 2. product_id is negative (special case for manual items)
    // 3. product_id is 0 (special case for manual items)
    return !item.product_id || item.product_id <= 0;
  }

  // Calculate sale totals
  static calculateSaleTotals(items, discountAmount = 0, taxAmount = 0) {
    const subtotal = items.reduce((total, item) => {
      const itemTotal = item.quantity * item.price;
      const itemDiscount = (itemTotal * (item.discount_percent || 0)) / 100;
      return total + (itemTotal - itemDiscount);
    }, 0);

    const totalDiscount = discountAmount + (subtotal * discountAmount) / 100;
    const totalTax = taxAmount + (subtotal * taxAmount) / 100;
    const netAmount = subtotal - totalDiscount + totalTax;

    return {
      subtotal,
      totalDiscount,
      totalTax,
      netAmount
    };
  }

  // Get all sales with related data
  async getAll({ filters = {}, page = 1, limit = 50 } = {}) {
    try {
      // Generate cache key based on parameters
      const cacheKey = `sales:list:${JSON.stringify({ filters, page, limit })}`;
      
      // Try to get from cache first
      const cached = cacheService.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for sales list: ${cacheKey}`);
        return cached;
      }
      
      const offset = (page - 1) * limit;
      let query = `
        SELECT 
          s.*,
          c.name as customer_name,
          r.name as delegate_name,
          u.name as created_by_name,
          u.username as created_by_username,
          json_group_array(
            json_object(
              'id', si.id,
              'product_id', si.product_id,
              'product_name', CASE 
                WHEN si.product_name IS NOT NULL THEN si.product_name
                WHEN si.product_id IS NOT NULL THEN p.name 
                ELSE 'مواد اخرى'
              END,
              'sku', CASE 
                WHEN si.product_name IS NOT NULL THEN 'MANUAL'
                WHEN si.product_id IS NOT NULL THEN p.sku 
                ELSE 'MANUAL'
              END,
              'unit', CASE 
                WHEN si.product_name IS NOT NULL THEN 'قطعة'
                WHEN si.product_id IS NOT NULL THEN p.unit 
                ELSE 'قطعة'
              END,
              'quantity', si.quantity,
              'returned_quantity', si.returned_quantity,
              'price', si.price,
              'discount_percent', si.discount_percent,
              'tax_percent', si.tax_percent,
              'total', si.total,
              'line_total', si.line_total
            )
          ) as items
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN representatives r ON s.delegate_id = r.id
        LEFT JOIN users u ON s.created_by = u.id
        LEFT JOIN sale_items si ON s.id = si.sale_id
        LEFT JOIN products p ON si.product_id = p.id AND si.product_id IS NOT NULL
        GROUP BY s.id
        ORDER BY s.created_at DESC`;

      const values = [];
      const conditions = [];

      // Add filters
      if (filters.customer_id) {
        conditions.push('s.customer_id = ?');
        values.push(filters.customer_id);
      }
      if (filters.delegate_id) {
        conditions.push('s.delegate_id = ?');
        values.push(filters.delegate_id);
      }
      if (filters.payment_status) {
        conditions.push('s.payment_status = ?');
        values.push(filters.payment_status);
      }
      if (filters.status) {
        conditions.push('s.status = ?');
        values.push(filters.status);
      }
      if (filters.start_date) {
        conditions.push('s.invoice_date >= ?');
        values.push(filters.start_date);
      }
      if (filters.end_date) {
        conditions.push('s.invoice_date <= ?');
        values.push(filters.end_date);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' LIMIT ? OFFSET ?';
      values.push(limit, offset);

      const sales = await db.query(query, values);

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM sales s
        ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}
      `;
      const countResult = await db.queryOne(countQuery, values.slice(0, -2));
      const total = countResult ? countResult.total : 0;

      // Process the results
      const processedSales = sales.map(sale => {
        try {
          // Parse items JSON, handle empty or invalid JSON
          sale.items = sale.items ? JSON.parse(sale.items) : [];
          if (!Array.isArray(sale.items)) {
            sale.items = [];
          }
        } catch (err) {
          logger.error('Failed to parse sale.items:', { 
            saleId: sale.id, 
            items: sale.items, 
            error: err.message 
          });
          sale.items = [];
        }

        // Format dates
        if (sale.invoice_date) {
          sale.invoice_date = new Date(sale.invoice_date).toISOString().split('T')[0];
        }
        if (sale.due_date) {
          sale.due_date = new Date(sale.due_date).toISOString().split('T')[0];
        }
        if (sale.created_at) {
          sale.created_at = new Date(sale.created_at).toISOString();
        }
        if (sale.updated_at) {
          sale.updated_at = new Date(sale.updated_at).toISOString();
        }

        return sale;
      });

      const result = {
        items: processedSales,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
      
      // Cache the result for 3 minutes
      cacheService.set(cacheKey, result, 180);
      logger.debug(`Cache set for sales list: ${cacheKey}`);
      
      return result;
    } catch (err) {
      logger.error('Error in SalesService.getAll:', err);
      throw new Error('Failed to fetch sales');
    }
  }

  // Get sale by ID with related data
  async getById(id) {
    try {
      // Generate cache key for sale
      const cacheKey = `sales:sale:${id}`;
      
      // Try to get from cache first
      const cached = cacheService.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for sale: ${id}`);
        return cached;
      }
      
            const sale = await db.queryOne(`
        SELECT 
          s.*,
          c.name as customer_name,
          u.name as created_by_name,
          u.username as created_by_username,
          json_group_array(
            json_object(
              'id', si.id,
              'product_id', si.product_id,
              'product_name', CASE 
                WHEN si.product_name IS NOT NULL THEN si.product_name
                WHEN si.product_id IS NOT NULL THEN p.name 
                ELSE 'مواد اخرى'
              END,
              'sku', CASE 
                WHEN si.product_name IS NOT NULL THEN 'MANUAL'
                WHEN si.product_id IS NOT NULL THEN p.sku 
                ELSE 'MANUAL'
              END,
              'unit', CASE 
                WHEN si.product_name IS NOT NULL THEN 'قطعة'
                WHEN si.product_id IS NOT NULL THEN p.unit 
                ELSE 'قطعة'
              END,
              'quantity', si.quantity,
              'returned_quantity', si.returned_quantity,
              'price', si.price,
              'discount_percent', si.discount_percent,
              'tax_percent', si.tax_percent,
              'total', si.total,
              'line_total', si.line_total
            )
          ) as items
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN users u ON s.created_by = u.id
        LEFT JOIN sale_items si ON s.id = si.sale_id
        LEFT JOIN products p ON si.product_id = p.id AND si.product_id IS NOT NULL
        WHERE s.id = ?
        GROUP BY s.id
      `, [id]);

    if (!sale) return null;

    // Parse items JSON
    try {
      logger.debug('Raw sale.items before parsing:', sale.items);
      sale.items = sale.items ? JSON.parse(sale.items) : [];
      logger.debug('Parsed sale.items:', sale.items);
    } catch (err) {
      logger.error('Failed to parse sale.items:', { items: sale.items, error: err });
      sale.items = [];
    }

    // If items array is empty, try to get items separately
    if (!sale.items || sale.items.length === 0) {
      logger.debug('Items array is empty, fetching items separately for sale:', id);
      const items = await this.getSaleItems(id);
      sale.items = items;
      logger.debug('Fetched items separately:', items);
      
      // Also check if there are any sale_items in the database
      const itemCount = await db.queryOne('SELECT COUNT(*) as count FROM sale_items WHERE sale_id = ?', [id]);
      logger.debug('Sale items count in database:', itemCount);
    }

    // Cache the sale for 5 minutes
    cacheService.set(cacheKey, sale, 300);
    logger.debug(`Cache set for sale: ${id}`);

    return sale;
    } catch (err) {
      logger.error('Error in SalesService.getById:', err);
      throw new Error('Failed to fetch sale');
    }
  }

  // Create new sale
  async create(saleData) {
    try {
      logger.info('Creating new sale:', { customerId: saleData.customer_id, itemsCount: saleData.items?.length });

      // Validate sale data - allow customer_id 999 for anonymous sales
      if (!saleData.customer_id && saleData.customer_id !== 999) {
        throw new Error('Customer ID is required');
      }
      if (!saleData.items || saleData.items.length === 0) {
        throw new Error('Sale must have at least one item');
      }

      // Validate each sale item
      saleData.items.forEach(item => {
        SalesService.validateSaleItem(item);
      });

      // Validate payment method and status
      if (saleData.payment_method) {
        SalesService.validatePaymentMethod(saleData.payment_method);
      }
      if (saleData.payment_status) {
        SalesService.validatePaymentStatus(saleData.payment_status);
      }
      if (saleData.status) {
        SalesService.validateSaleStatus(saleData.status);
      }

      // Check for duplicate sales (same barcode or similar data within 5 seconds)
      if (saleData.barcode) {
        const existingSale = await db.queryOne(
          'SELECT id, invoice_no, created_at FROM sales WHERE barcode = ?',
          [saleData.barcode]
        );
        
        if (existingSale) {
          logger.warn('Duplicate sale attempt detected:', {
            barcode: saleData.barcode,
            existingSaleId: existingSale.id,
            existingInvoiceNo: existingSale.invoice_no
          });
          throw new Error(`Sale with barcode ${saleData.barcode} already exists (Invoice: ${existingSale.invoice_no})`);
        }
      }

      // Check for rapid duplicate submissions (same customer, similar amount, within 5 seconds)
      const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
      const recentSales = await db.query(
        `SELECT id, invoice_no, total_amount, created_at 
         FROM sales 
         WHERE customer_id = ? 
         AND created_at > ? 
         AND ABS(total_amount - ?) < 0.01
         ORDER BY created_at DESC 
         LIMIT 1`,
        [saleData.customer_id, fiveSecondsAgo, saleData.total_amount || 0]
      );

      if (recentSales.length > 0) {
        const recentSale = recentSales[0];
        logger.warn('Potential duplicate sale detected:', {
          customerId: saleData.customer_id,
          totalAmount: saleData.total_amount,
          recentSaleId: recentSale.id,
          recentInvoiceNo: recentSale.invoice_no,
          timeDifference: Date.now() - new Date(recentSale.created_at).getTime()
        });
        
        // If the recent sale was created within 2 seconds, it's likely a duplicate
        const timeDiff = Date.now() - new Date(recentSale.created_at).getTime();
        if (timeDiff < 2000) {
          throw new Error(`Potential duplicate sale detected. Recent sale: ${recentSale.invoice_no} (created ${Math.round(timeDiff/1000)}s ago)`);
        }
      }

      // Calculate totals
      const { subtotal, netAmount, totalDiscount, totalTax } = SalesService.calculateSaleTotals(
        saleData.items,
        saleData.discount_amount || 0,
        saleData.tax_amount || 0
      );

      // Generate invoice number with additional uniqueness
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 10000);
      const invoiceNo = saleData.invoice_no || `INV-${timestamp}-${randomSuffix}`;

      // Use database transaction
      const result = await db.transaction(async () => {
        // Double-check for duplicates within transaction
        if (saleData.barcode) {
          const duplicateCheck = await db.queryOne(
            'SELECT id FROM sales WHERE barcode = ?',
            [saleData.barcode]
          );
          
          if (duplicateCheck) {
            throw new Error(`Sale with barcode ${saleData.barcode} already exists`);
          }
        }

        // Create sale record
        const saleId = await db.insert(`
          INSERT INTO sales (
            customer_id, delegate_id, invoice_no, invoice_date, due_date,
            total_amount, discount_amount, tax_amount,
            paid_amount, payment_method, payment_status, status,
            notes, barcode, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
          saleData.customer_id,
          saleData.delegate_id || null,
          invoiceNo,
          saleData.invoice_date || new Date().toISOString().split('T')[0],
          saleData.due_date || null,
          netAmount,
          totalDiscount,
          totalTax,
          saleData.paid_amount || 0,
          saleData.payment_method || 'cash',
          saleData.payment_status || 'unpaid',
          saleData.status || 'completed',
          saleData.notes || null,
          saleData.barcode || null,
          saleData.created_by || null
        ]);

        // Create sale items
        const saleItems = [];
        for (const item of saleData.items) {
          // Calculate total if not provided
          const itemTotal = item.total || (item.quantity * item.price);
          const lineTotal = item.line_total || itemTotal;
          
          logger.debug('Processing sale item:', {
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price,
            total: itemTotal,
            line_total: lineTotal
          });
          
          // Additional safety check for manual items (مواد اخرى)
          if (SalesService.isManualItem(item)) {
            logger.info('Processing manual item (مواد اخرى) - skipping inventory movements:', {
              product_id: item.product_id,
              name: item.name,
              quantity: item.quantity,
              price: item.price
            });
          }
          
          // Insert sale item with new schema support
          let itemId;
          try {
            if (SalesService.isManualItem(item)) {
              // For manual items, use product_name and NULL product_id
              itemId = await db.insert(`
                INSERT INTO sale_items (
                  sale_id, product_id, product_name, quantity, price,
                  discount_percent, tax_percent, total, line_total,
                  created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              `, [
                saleId,
                null, // product_id is NULL for manual items
                item.name,
                item.quantity,
                item.price,
                item.discount_percent || 0,
                item.tax_percent || 0,
                itemTotal,
                lineTotal
              ]);
            } else {
              // For real products, use product_id and NULL product_name
              itemId = await db.insert(`
                INSERT INTO sale_items (
                  sale_id, product_id, product_name, quantity, price,
                  discount_percent, tax_percent, total, line_total,
                  created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              `, [
                saleId,
                item.product_id,
                null, // product_name is NULL for real products
                item.quantity,
                item.price,
                item.discount_percent || 0,
                item.tax_percent || 0,
                itemTotal,
                lineTotal
              ]);
            }
          } catch (insertError) {
            logger.error('Error inserting sale item:', {
              item: item,
              error: insertError.message,
              isManualItem: SalesService.isManualItem(item),
              stack: insertError.stack
            });
            throw insertError;
          }

          saleItems.push({
            id: itemId,
            sale_id: saleId,
            product_id: SalesService.isManualItem(item) ? null : item.product_id,
            product_name: SalesService.isManualItem(item) ? item.name : null,
            quantity: item.quantity,
            price: item.price,
            discount_percent: item.discount_percent || 0,
            tax_percent: item.tax_percent || 0,
            total: itemTotal,
            line_total: lineTotal
          });
        }

        // Create debt record if payment is not fully paid
        if (saleData.payment_status !== 'paid' && (saleData.paid_amount || 0) < netAmount) {
          const debtAmount = netAmount - (saleData.paid_amount || 0);
          await db.insert(`
            INSERT INTO debts (
              customer_id, sale_id, amount, due_date, status, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [
            saleData.customer_id,
            saleId,
            debtAmount,
            saleData.due_date || null,
            debtAmount > 0 ? 'unpaid' : 'paid',
            saleData.notes || null
          ]);
        }

        // Calculate and create commission record if delegate is assigned
        if (saleData.delegate_id) {
          try {
            const delegateService = require('./delegateService');
            const commissionData = await delegateService.calculateCommission(
              saleData.delegate_id, 
              saleId, 
              netAmount
            );
            
            if (commissionData.commissionAmount > 0) {
              await delegateService.createCommissionRecord(
                saleData.delegate_id, 
                saleId, 
                commissionData
              );
              
              logger.info('Commission calculated and recorded:', {
                delegateId: saleData.delegate_id,
                saleId: saleId,
                commissionAmount: commissionData.commissionAmount,
                commissionType: commissionData.commissionType
              });
            }
          } catch (commissionError) {
            logger.error('Error calculating commission:', commissionError);
            // Don't fail the sale creation if commission calculation fails
          }
        }

        return {
          id: saleId,
          invoice_no: invoiceNo,
          customer_id: saleData.customer_id,
          total_amount: netAmount,
          paid_amount: saleData.paid_amount || 0,
          payment_status: saleData.payment_status || 'unpaid',
          status: saleData.status || 'completed',
          items: saleItems
        };
      });

      // Invalidate all related caches after sale creation
      cacheService.invalidateMultipleDataTypes(['sales', 'debts', 'customers', 'cash_box', 'inventory']);

      logger.info('Sale created successfully:', { saleId: result.id, invoiceNo: result.invoice_no, barcode: saleData.barcode });
      return result;
    } catch (error) {
      logger.error('Error creating sale:', error);
      throw error;
    }
  }

  // Update sale
  async update(id, saleData) {
    const {
      customer_id,
      invoice_date,
      due_date,
      items,
      paid_amount,
      discount_amount,
      tax_amount,
      payment_method,
      payment_status,
      status,
      notes,
      barcode
    } = saleData;

    try {
      // Validate payment method and status if provided
      if (payment_method) this.constructor.validatePaymentMethod(payment_method);
      if (payment_status) this.constructor.validatePaymentStatus(payment_status);
      if (status) this.constructor.validateSaleStatus(status);

      // Validate items if provided
      if (items) items.forEach(this.constructor.validateSaleItem);

      return await db.transaction(async () => {
        // Get existing sale
        const existingSale = await this.getById(id);
        if (!existingSale) {
          throw new Error('Sale not found');
        }

        // Note: Inventory restoration is handled automatically by database triggers when sale items are deleted

        // Delete existing sale items
        await db.update('DELETE FROM sale_items WHERE sale_id = ?', [id]);

        // Calculate new totals if items are provided
        let totals = {};
        if (items) {
          totals = this.constructor.calculateSaleTotals(
            items,
            paid_amount || existingSale.paid_amount,
            discount_amount || existingSale.discount_amount,
            tax_amount || existingSale.tax_amount
          );
        }

        // Update sale
        const updateFields = [];
        const updateValues = [];

        if (customer_id) {
          updateFields.push('customer_id = ?');
          updateValues.push(customer_id);
        }
        if (invoice_date) {
          updateFields.push('invoice_date = ?');
          updateValues.push(invoice_date);
        }
        if (due_date) {
          updateFields.push('due_date = ?');
          updateValues.push(due_date);
        }
        if (payment_method) {
          updateFields.push('payment_method = ?');
          updateValues.push(payment_method);
        }
        if (payment_status) {
          updateFields.push('payment_status = ?');
          updateValues.push(payment_status);
        }
        if (status) {
          updateFields.push('status = ?');
          updateValues.push(status);
        }
        if (notes !== undefined) {
          updateFields.push('notes = ?');
          updateValues.push(notes);
        }
        if (barcode !== undefined) {
          updateFields.push('barcode = ?');
          updateValues.push(barcode);
        }
        if (items) {
          updateFields.push('total_amount = ?');
          updateValues.push(totals.subtotal);
          updateFields.push('discount_amount = ?');
          updateValues.push(totals.totalDiscount);
          updateFields.push('tax_amount = ?');
          updateValues.push(totals.totalTax);
          // net_amount is a generated column, so we don't update it directly
        }

        if (updateFields.length > 0) {
          updateValues.push(id);
          await db.update(
            `UPDATE sales SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            updateValues
          );
        }

        // Insert new sale items if provided
        if (items) {
          for (const item of items) {
            // Calculate item totals
            const itemTotal = item.quantity * item.price;
            const itemDiscount = (itemTotal * (item.discount_percent || 0)) / 100;
            const itemTax = (itemTotal * (item.tax_percent || 0)) / 100;
            const lineTotal = itemTotal - itemDiscount + itemTax;

            await db.insert(
              `INSERT INTO sale_items (
                sale_id,
                product_id,
                quantity,
                price,
                discount_percent,
                tax_percent,
                total,
                line_total
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                id,
                item.product_id,
                item.quantity,
                item.price,
                item.discount_percent || 0,
                item.tax_percent || 0,
                itemTotal,
                lineTotal
              ]
            );

            // Note: Inventory updates are handled automatically by database triggers
            // No manual inventory update needed here
          }
        }

        // NEW: Update debt record based on payment status changes
        const updatedSale = await this.getById(id);
        if (updatedSale) {
          const existingDebt = await db.queryOne('SELECT * FROM debts WHERE sale_id = ?', [id]);
          const remainingAmount = updatedSale.total_amount - (updatedSale.paid_amount || 0);
          
          if (existingDebt) {
            // Update existing debt
            if (updatedSale.payment_status === 'paid' || remainingAmount <= 0) {
              // Delete debt if fully paid
              await db.update('DELETE FROM debts WHERE sale_id = ?', [id]);
              logger.info(`Deleted debt record for fully paid sale ${id}`);
            } else {
              // Update debt amount and status
              await db.update(`
                UPDATE debts 
                SET amount = ?, 
                    status = ?, 
                    updated_at = CURRENT_TIMESTAMP 
                WHERE sale_id = ?
              `, [
                remainingAmount,
                updatedSale.payment_status === 'unpaid' ? 'unpaid' : 'partial',
                id
              ]);
              logger.info(`Updated debt record for sale ${id} with amount ${remainingAmount}`);
            }
          } else if ((updatedSale.payment_status === 'unpaid' || updatedSale.payment_status === 'partial') && remainingAmount > 0) {
            // Create new debt if it doesn't exist
            await db.insert(`
              INSERT INTO debts (
                sale_id,
                customer_id,
                amount,
                status,
                due_date,
                notes,
                created_at,
                updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
              id,
              updatedSale.customer_id,
              remainingAmount,
              updatedSale.payment_status === 'unpaid' ? 'unpaid' : 'partial',
              updatedSale.due_date,
              `Debt for sale invoice: ${updatedSale.invoice_no}`
            ]);
            logger.info(`Created debt record for updated sale ${id} with amount ${remainingAmount}`);
          }
        }

        // Invalidate all related caches
        cacheService.invalidateMultipleDataTypes(['sales', 'debts', 'customers', 'cash_box', 'inventory']);
        
        return updatedSale;
      });
    } catch (error) {
      logger.error('Error updating sale:', error);
      throw error;
    }
  }

  // Delete sale
  async delete(id) {
    try {
      return await db.transaction(async () => {
        // Note: Inventory restoration is handled automatically by database triggers when sale items are deleted

        // Delete related records
        await db.update('DELETE FROM debts WHERE sale_id = ?', [id]);
        await db.update('DELETE FROM sale_items WHERE sale_id = ?', [id]);
        
        // Delete sale
        const changes = await db.update('DELETE FROM sales WHERE id = ?', [id]);
        
        if (changes > 0) {
          // Invalidate all related caches
          cacheService.invalidateMultipleDataTypes(['sales', 'debts', 'customers', 'cash_box', 'inventory']);
        }
        
        return changes > 0;
      });
    } catch (err) {
      logger.error('Error in SalesService.delete:', err);
      throw new Error('Failed to delete sale');
    }
  }

  // Helper method to format sale data
  static formatSale(sale) {
    if (!sale) return null;

    // Format dates
    sale.invoice_date = sale.invoice_date ? new Date(sale.invoice_date).toISOString().split('T')[0] : null;
    sale.due_date = sale.due_date ? new Date(sale.due_date).toISOString().split('T')[0] : null;
    sale.created_at = sale.created_at ? new Date(sale.created_at).toISOString() : null;
    sale.updated_at = sale.updated_at ? new Date(sale.updated_at).toISOString() : null;

    // Parse items JSON
    try {
      sale.items = sale.items ? JSON.parse(sale.items) : [];
    } catch (err) {
      logger.error('Error parsing items JSON:', { items: sale.items, error: err });
      sale.items = [];
    }

    return sale;
  }

  // Add this new method to get sale items
  async getSaleItems(saleId) {
    try {
      const items = await db.query(`
        SELECT 
          si.*,
          CASE 
            WHEN si.product_name IS NOT NULL THEN si.product_name
            WHEN si.product_id IS NOT NULL THEN p.name 
            ELSE 'مواد اخرى'
          END as display_name,
          CASE 
            WHEN si.product_name IS NOT NULL THEN 'MANUAL'
            WHEN si.product_id IS NOT NULL THEN p.sku 
            ELSE 'MANUAL'
          END as sku,
          CASE 
            WHEN si.product_name IS NOT NULL THEN 'قطعة'
            WHEN si.product_id IS NOT NULL THEN p.unit 
            ELSE 'قطعة'
          END as unit
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id AND si.product_id IS NOT NULL
        WHERE si.sale_id = ?
      `, [saleId]);
      return items;
    } catch (err) {
      logger.error('Error fetching sale items:', err);
      throw new Error('Failed to fetch sale items');
    }
  }

  // Add method to get return history
  async getSaleReturns(saleId) {
    try {
      const returns = await db.query(`
        SELECT 
          sr.*,
          JSON_GROUP_ARRAY(
            JSON_OBJECT(
              'id', sri.id,
              'sale_item_id', sri.sale_item_id,
              'quantity', sri.quantity,
              'price', sri.price,
              'total', sri.total,
              'product_name', CASE 
                WHEN si.product_id < 0 THEN 'مواد اخرى'
                ELSE p.name 
              END,
              'product_sku', CASE 
                WHEN si.product_id < 0 THEN 'MANUAL'
                ELSE p.sku 
              END
            )
          ) as items
        FROM sale_returns sr
        LEFT JOIN sale_return_items sri ON sr.id = sri.return_id
        LEFT JOIN sale_items si ON sri.sale_item_id = si.id
        LEFT JOIN products p ON si.product_id = p.id AND si.product_id > 0
        WHERE sr.sale_id = ?
        GROUP BY sr.id
        ORDER BY sr.return_date DESC
      `, [saleId]);

      return returns.map(r => ({
        ...r,
        items: JSON.parse(r.items)
      }));
    } catch (err) {
      logger.error('Error fetching sale returns:', err);
      throw new Error('Failed to fetch sale returns');
    }
  }

  // Add after existing validation methods
  async validateStatusChange(saleId, newStatus) {
    const sale = await this.getById(saleId);
    if (!sale) throw new Error('Sale not found');

    const validTransitions = {
      'pending': ['completed', 'cancelled'],
      'completed': ['returned', 'partially_returned'],
      'cancelled': [],
      'returned': [],
      'partially_returned': ['returned']
    };

    if (!validTransitions[sale.status]?.includes(newStatus)) {
      throw new Error(`Cannot change status from ${sale.status} to ${newStatus}`);
    }
  }

  // Add new method for handling returns
  async processSaleReturn(saleId, returnItems, reason) {
    try {
      return await db.transaction(async () => {
        const sale = await this.getById(saleId);
        if (!sale) throw new Error('Sale not found');
        if (!['completed'].includes(sale.status)) {
          throw new Error('Only completed sales can be returned');
        }

        // Validate return items
        const saleItems = await this.getSaleItems(saleId);
        const itemMap = new Map(saleItems.map(item => [item.id, item]));

        // Calculate total return amount
        let totalReturnAmount = 0;
        for (const returnItem of returnItems) {
          const originalItem = itemMap.get(returnItem.sale_item_id);
          if (!originalItem) {
            throw new Error(`Invalid sale item id: ${returnItem.sale_item_id}`);
          }
          
          // Get current returned quantity
          const currentReturnedQuantity = originalItem.returned_quantity || 0;
          const remainingQuantity = originalItem.quantity - currentReturnedQuantity;
          
          if (returnItem.quantity > remainingQuantity) {
            throw new Error(`Return quantity exceeds remaining quantity for item ${returnItem.sale_item_id}`);
          }
          
          totalReturnAmount += returnItem.quantity * originalItem.price;
        }

        // Create return record
        try {
          const returnId = await db.insert(
          `INSERT INTO sale_returns (
            sale_id,
            return_date,
            reason,
            status,
              refund_method,
              total_amount,
            created_by
            ) VALUES (?, CURRENT_TIMESTAMP, ?, 'completed', ?, ?, ?)`,
            [
              saleId,
              reason,
              returnItems[0]?.refund_method || 'cash',
              totalReturnAmount,
              sale.created_by || 1
            ]
          );

          if (!returnId) {
            throw new Error('Failed to create return record - no ID returned');
          }

        // Process each return item
        for (const item of returnItems) {
          const originalItem = itemMap.get(item.sale_item_id);
          
          // Insert return item record
          await db.insert(
            `INSERT INTO sale_return_items (
              return_id,
              sale_item_id,
              quantity,
              price,
              total
            ) VALUES (?, ?, ?, ?, ?)`,
            [
                returnId,
              item.sale_item_id,
              item.quantity,
              originalItem.price,
              item.quantity * originalItem.price
            ]
          );

            // Update sale item with returned quantity and recalculate totals
            const newReturnedQuantity = (originalItem.returned_quantity || 0) + item.quantity;
            const remainingQuantity = originalItem.quantity - newReturnedQuantity;
            const newTotal = remainingQuantity * originalItem.price;
            const discountAmount = (newTotal * (originalItem.discount_percent || 0)) / 100;
            const taxAmount = (newTotal * (originalItem.tax_percent || 0)) / 100;
            const newLineTotal = newTotal - discountAmount + taxAmount;

            await db.update(
              `UPDATE sale_items 
               SET returned_quantity = ?,
                   total = ?,
                   line_total = ?,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`,
              [newReturnedQuantity, newTotal, newLineTotal, item.sale_item_id]
            );

            // Note: Inventory updates for returns are handled automatically by database triggers
            // when sale_items are updated with returned_quantity
          }

          // Get updated sale items to check if all items are returned
          const updatedSaleItems = await this.getSaleItems(saleId);
          const allItemsReturned = updatedSaleItems.every(item => 
            (item.returned_quantity || 0) >= item.quantity
          );

          const newStatus = allItemsReturned ? 'returned' : 'partially_returned';
          
          // Calculate new sale amounts
          const newTotalAmount = sale.total_amount - totalReturnAmount;
          const newPaidAmount = Math.min(sale.paid_amount, newTotalAmount);
          const newRemainingAmount = newTotalAmount - newPaidAmount;
          
          // Determine new payment status
          let newPaymentStatus = sale.payment_status;
          if (newTotalAmount <= 0) {
            newPaymentStatus = 'paid';
          } else if (newPaidAmount > 0 && newPaidAmount < newTotalAmount) {
            newPaymentStatus = 'partial';
          } else if (newPaidAmount === 0) {
            newPaymentStatus = 'unpaid';
          }

          // Update sale with new amounts and status
          await db.update(
            `UPDATE sales 
             SET total_amount = ?,
                 paid_amount = ?,
                 payment_status = ?,
                 status = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
              newTotalAmount,
              newPaidAmount,
              newPaymentStatus,
              newStatus,
              saleId
            ]
          );

          // NEW: Update debt record based on return
          const existingDebt = await db.queryOne('SELECT * FROM debts WHERE sale_id = ?', [saleId]);
          
          if (existingDebt) {
            if (newPaymentStatus === 'paid' || newTotalAmount <= 0) {
              // Delete debt if fully paid or returned completely
              await db.update('DELETE FROM debts WHERE sale_id = ?', [saleId]);
              logger.info(`Deleted debt record for returned sale ${saleId} - fully paid/returned`);
            } else if (newRemainingAmount > 0) {
              // Update debt amount and status
              await db.update(`
                UPDATE debts 
                SET amount = ?, 
                    status = ?, 
                    updated_at = CURRENT_TIMESTAMP 
                WHERE sale_id = ?
              `, [
                newRemainingAmount,
                newPaymentStatus === 'unpaid' ? 'unpaid' : 'partial',
                saleId
              ]);
              logger.info(`Updated debt record for returned sale ${saleId} with amount ${newRemainingAmount}`);
            }
          } else if ((newPaymentStatus === 'unpaid' || newPaymentStatus === 'partial') && newRemainingAmount > 0) {
            // Create new debt if it doesn't exist and there's remaining amount
            await db.insert(`
              INSERT INTO debts (
                sale_id,
                customer_id,
                amount,
                status,
                due_date,
                notes,
                created_at,
                updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
              saleId,
              sale.customer_id,
              newRemainingAmount,
              newPaymentStatus === 'unpaid' ? 'unpaid' : 'partial',
              sale.due_date,
              `Debt updated due to return - Invoice: ${sale.invoice_no}`
            ]);
            logger.info(`Created debt record for returned sale ${saleId} with amount ${newRemainingAmount}`);
          }

          // Get updated sale data with items
          const updatedSale = await db.queryOne(`
            SELECT 
              s.*,
              c.name as customer_name,
              json_group_array(
                json_object(
                  'id', si.id,
                  'product_id', si.product_id,
                  'product_name', CASE 
                    WHEN si.product_id < 0 THEN 'مواد اخرى'
                    ELSE p.name 
                  END,
                  'sku', CASE 
                    WHEN si.product_id < 0 THEN 'MANUAL'
                    ELSE p.sku 
                  END,
                  'unit', CASE 
                    WHEN si.product_id < 0 THEN 'قطعة'
                    ELSE p.unit 
                  END,
                  'quantity', si.quantity,
                  'returned_quantity', si.returned_quantity,
                  'price', si.price,
                  'discount_percent', si.discount_percent,
                  'tax_percent', si.tax_percent,
                  'total', si.total,
                  'line_total', si.line_total
                )
              ) as items
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN sale_items si ON s.id = si.sale_id
            LEFT JOIN products p ON si.product_id = p.id AND si.product_id > 0
            WHERE s.id = ?
            GROUP BY s.id
          `, [saleId]);

          // Parse items JSON
          try {
            updatedSale.items = updatedSale.items ? JSON.parse(updatedSale.items) : [];
          } catch (err) {
            logger.error('Failed to parse sale.items:', { items: updatedSale.items, error: err });
            updatedSale.items = [];
          }

        return {
            returnId,
          saleId,
          status: newStatus,
            returnItems,
            totalAmount: totalReturnAmount,
            newSaleAmounts: {
              total: newTotalAmount,
              paid: newPaidAmount,
              remaining: newRemainingAmount,
              paymentStatus: newPaymentStatus
            },
            sale: updatedSale
          };
        } catch (insertError) {
          logger.error('Error creating return record:', {
            error: insertError,
            saleId,
            returnItems,
            reason,
            totalReturnAmount
          });
          throw new Error(`Failed to create return record: ${insertError.message}`);
        }
      });
    } catch (err) {
      logger.error('Error processing sale return:', err);
      throw new Error(`Failed to process return: ${err.message}`);
    }
  }

  // Get product by barcode for POS
  async getProductByBarcode(barcode, allowNegativeStock = false) {
    try {
      // Add debugging log
      logger.debug('SALES_SERVICE_GET_PRODUCT_BY_BARCODE', { 
        barcode: barcode,
        allowNegativeStock: allowNegativeStock
      });
      
      // If barcode is null or empty, return null
      if (!barcode) {
        return null;
      }

      // Build the query conditionally based on allowNegativeStock setting
      const stockCondition = allowNegativeStock ? '' : 'AND p.current_stock > 0';
      
      logger.debug('SALES_SERVICE_DATABASE_QUERY', { 
        barcode: barcode,
        stockCondition: stockCondition,
        allowNegativeStock: allowNegativeStock
      });
      
      const product = db.prepare(`
        SELECT 
          p.*,
          COALESCE(SUM(si.quantity), 0) as total_sold,
          COALESCE(SUM(pi.quantity), 0) as total_purchased,
          p.current_stock
        FROM products p
        LEFT JOIN sale_items si ON p.id = si.product_id
        LEFT JOIN purchase_items pi ON p.id = pi.product_id
        WHERE p.barcode = ? ${stockCondition}
        GROUP BY p.id
      `).get(barcode);
      
      const result = product ? { ...product, stock: product.current_stock } : null;
      
      logger.debug('SALES_SERVICE_DATABASE_RESULT', { 
        barcode: barcode,
        found: !!result,
        productId: result?.id,
        productName: result?.name,
        currentStock: result?.current_stock,
        allowNegativeStock: allowNegativeStock
      });
      
      if (!product) {
        return null;
      }
      
      return { ...product, stock: product.current_stock };
    } catch (err) {
      logger.error('Error getting product by barcode:', err);
      return null;
    }
  }
}

// Initialize cache on service load
const salesService = new SalesService();

// Load all sales to cache on startup
setTimeout(() => {
  try {
    salesService.loadAllSalesToCache();
    // Sales cache initialized
  } catch (err) {
    logger.error('Failed to initialize sales cache on startup:', err);
  }
}, 4000); // Wait 4 seconds for database to be ready

module.exports = salesService;