const db = require('../database');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');

// Helper function to safely format dates
function formatDate(dateValue) {
  if (!dateValue) return null;
  if (typeof dateValue === 'string') return dateValue;
  if (dateValue instanceof Date) return dateValue.toISOString().split('T')[0];
  return dateValue;
}

// Helper function to safely format datetime
function formatDateTime(dateValue) {
  if (!dateValue) return null;
  if (typeof dateValue === 'string') return dateValue;
  if (dateValue instanceof Date) return dateValue.toISOString();
  return dateValue;
}

/**
 * Helper function to check supplier credit limit
 * Returns warnings but doesn't block the transaction
 */
const checkSupplierCreditLimit = (supplierId, purchaseAmount) => {
  try {
    const supplier = db.queryOne(`
      SELECT id, name, credit_limit, current_balance 
      FROM suppliers 
      WHERE id = ?
    `, [supplierId]);

    if (!supplier) {
      throw new Error(`Supplier with ID ${supplierId} not found`);
    }

    const warnings = [];
    const newBalance = (supplier.current_balance || 0) + purchaseAmount;

    // Check if credit limit is set (not NULL)
    if (supplier.credit_limit !== null) {
      if (newBalance > supplier.credit_limit) {
        const excess = newBalance - supplier.credit_limit;
        warnings.push({
          type: 'CREDIT_LIMIT_EXCEEDED',
          message: `تم تجاوز الحد الائتماني للمورد ${supplier.name} بمقدار ${excess.toLocaleString('ar-IQ')} دينار`,
          data: {
            supplier_name: supplier.name,
            current_balance: supplier.current_balance,
            credit_limit: supplier.credit_limit,
            purchase_amount: purchaseAmount,
            new_balance: newBalance,
            excess_amount: excess
          }
        });
        
        logger.warn(`Credit limit exceeded for supplier ${supplier.name}:`, {
          supplierId,
          current_balance: supplier.current_balance,
          credit_limit: supplier.credit_limit,
          purchase_amount: purchaseAmount,
          new_balance: newBalance,
          excess: excess
        });
      }
    } else {
      // No credit limit set (unlimited credit)
      warnings.push({
        type: 'NO_CREDIT_LIMIT',
        message: `المورد ${supplier.name} ليس له حد ائتماني محدد (ائتمان غير محدود)`,
        data: {
          supplier_name: supplier.name,
          current_balance: supplier.current_balance,
          credit_limit: null,
          purchase_amount: purchaseAmount,
          new_balance: newBalance
        }
      });
    }

    return { warnings, supplier, newBalance };
  } catch (error) {
    logger.error('Error checking supplier credit limit:', error);
    throw error;
  }
};

/**
 * Helper function to update product inventory with audit logging
 * Note: This function should be called within an existing transaction
 */
const updateProductInventory = (productId, quantityChange, operation = 'add', referenceType = 'purchase', referenceId = null, referenceNumber = null, notes = null, userId = null) => {
  try {
    const operator = operation === 'add' ? '+' : '-';
    
    // First check if product exists
    const product = db.queryOne(
      'SELECT id, name, current_stock, min_stock FROM products WHERE id = ?',
      [productId]
    );

    if (!product) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    // Calculate new stock
    const currentStock = product.current_stock || 0;
    const newStock = operation === 'add' 
      ? currentStock + Math.abs(quantityChange)
      : currentStock - Math.abs(quantityChange);

    logger.info(`Inventory update: Product ${product.name} (ID: ${productId}) - Current: ${currentStock}, Operation: ${operation}, Change: ${quantityChange}, New: ${newStock}`);

    // Update the stock
    const updateResult = db.update(
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
    db.insert(
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
        notes || `حركة شراء - ${referenceNumber || referenceId}`,
        userId
      ]
    );

    // Log warnings
    if (newStock < 0) {
      logger.warn(`Warning: Product ${product.name} (ID: ${productId}) has negative stock: ${newStock}`);
    }
    
    if (product.min_stock && newStock <= product.min_stock) {
      logger.warn(`Warning: Product ${product.name} (ID: ${productId}) is below minimum stock level. Current: ${newStock}, Minimum: ${product.min_stock}`);
    }
    
    logger.info(`Inventory updated for product ${product.name} (ID: ${productId}): ${operation === 'add' ? 'added' : 'removed'} ${quantityChange} units, current stock: ${newStock}`);

    return updateResult;
  } catch (err) {
    logger.error(`Error updating inventory for product ${productId}:`, err);
    throw err;
  }
};

class PurchasesService {
  // Load all purchases into cache for fast lookups
  loadAllPurchasesToCache() {
    try {
      const query = `
        SELECT 
          p.*,
          s.name as supplier_name,
          s.contact_person as supplier_contact,
          s.phone as supplier_phone,
          s.email as supplier_email,
          COALESCE(SUM(pi.quantity), 0) as total_items,
          COALESCE(SUM(pi.total), 0) as total_amount
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
        WHERE p.status != 'cancelled'
        GROUP BY p.id
        ORDER BY p.created_at DESC
        LIMIT 1000
      `;
      
      const purchases = db.query(query);
      
      // Store all purchases in cache for 5 minutes
      cacheService.set('purchases:all_purchases', purchases, 300);
      
      // Create supplier purchases index for fast lookup
      const supplierPurchasesIndex = {};
      purchases.forEach(purchase => {
        if (purchase.supplier_id) {
          if (!supplierPurchasesIndex[purchase.supplier_id]) {
            supplierPurchasesIndex[purchase.supplier_id] = [];
          }
          supplierPurchasesIndex[purchase.supplier_id].push(purchase);
        }
      });
      
      // Cache supplier purchases index for 5 minutes
      cacheService.set('purchases:supplier_purchases_index', supplierPurchasesIndex, 300);
      
      // Loaded purchases into cache
      return purchases;
    } catch (err) {
      logger.error('Error loading all purchases to cache:', err);
      throw new Error('Failed to load purchases to cache');
    }
  }

  getAll() {
    try {
      // Generate cache key for purchases list
      const cacheKey = 'purchases:list';
      
      // Try to get from cache first
      const cached = cacheService.get(cacheKey);
      if (cached) {
        logger.debug('Cache hit for purchases list');
        return cached;
      }
      
      // First get all purchases without items, including return information
      const purchases = db.query(`
        SELECT 
          p.*,
          s.name as supplier_name,
          s.contact_person as supplier_contact,
          s.phone as supplier_phone,
          s.email as supplier_email,
          s.address as supplier_address,
          COALESCE(SUM(pr.total_amount), 0) as total_returned_amount,
          COUNT(pr.id) as return_count,
          MAX(pr.return_date) as last_return_date
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN purchase_returns pr ON p.id = pr.purchase_id
        GROUP BY p.id, p.supplier_id, p.invoice_no, p.invoice_date, p.due_date, p.total_amount, 
                 p.discount_amount, p.tax_amount, p.net_amount, p.paid_amount, p.remaining_amount,
                 p.payment_method, p.payment_status, p.status, p.notes, p.created_by, p.created_at, 
                 p.updated_at, p.money_box_id, s.name, s.contact_person, s.phone, s.email, s.address
        ORDER BY p.created_at DESC
      `);

      // Then fetch items for each purchase
      return purchases.map(purchase => {
        try {
          // Get purchase items
          const items = db.query(`
            SELECT pi.*, p.name as product_name, p.sku as product_sku
            FROM purchase_items pi
            LEFT JOIN products p ON pi.product_id = p.id
            WHERE pi.purchase_id = ?
          `, [purchase.id]);

          // Process items
          purchase.items = items.map(item => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.product_name,
            product_sku: item.product_sku,
            quantity: item.quantity,
            price: item.price,
            discount_percent: item.discount_percent,
            tax_percent: item.tax_percent,
            total: item.total
          }));

          // Calculate remaining amount
          purchase.remaining_amount = purchase.net_amount - (purchase.paid_amount || 0);
          
          // Format dates safely
          purchase.invoice_date = formatDate(purchase.invoice_date);
          purchase.due_date = formatDate(purchase.due_date);
          purchase.created_at = formatDateTime(purchase.created_at);
          purchase.updated_at = formatDateTime(purchase.updated_at);

          return purchase;
        } catch (err) {
          logger.error('Error processing purchase items:', err);
          return {
            ...purchase,
            items: []
          };
        }
      });
      
      // Cache the purchases for 3 minutes
      cacheService.set(cacheKey, purchases, 180);
      logger.debug('Cache set for purchases list');
      
      return purchases;
    } catch (err) {
      logger.error('Error getting all purchases:', err);
      throw new Error('Failed to fetch purchases');
    }
  }

  getById(id) {
    try {
      // Generate cache key for purchase
      const cacheKey = `purchases:purchase:${id}`;
      
      // Try to get from cache first
      const cached = cacheService.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for purchase: ${id}`);
        return cached;
      }
      
      const purchase = db.queryOne(`
        SELECT p.*, 
               s.name as supplier_name,
               s.contact_person as supplier_contact,
               s.phone as supplier_phone,
               s.email as supplier_email,
               s.address as supplier_address,
               COALESCE(SUM(pr.total_amount), 0) as total_returned_amount,
               COUNT(pr.id) as return_count,
               MAX(pr.return_date) as last_return_date
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN purchase_returns pr ON p.id = pr.purchase_id
        WHERE p.id = ?
        GROUP BY p.id, p.supplier_id, p.invoice_no, p.invoice_date, p.due_date, p.total_amount, 
                 p.discount_amount, p.tax_amount, p.net_amount, p.paid_amount, p.remaining_amount,
                 p.payment_method, p.payment_status, p.status, p.notes, p.created_by, p.created_at, 
                 p.updated_at, p.money_box_id, s.name, s.contact_person, s.phone, s.email, s.address
      `, [id]);

      if (!purchase) {
        return null;
      }

      // Get purchase items
      const items = db.query(`
        SELECT pi.*, p.name as product_name, p.sku as product_sku
        FROM purchase_items pi
        LEFT JOIN products p ON pi.product_id = p.id
        WHERE pi.purchase_id = ?
      `, [id]);

      // Process items without JSON parsing
      purchase.items = items.map(item => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        quantity: item.quantity,
        price: item.price,
        discount_percent: item.discount_percent,
        tax_percent: item.tax_percent,
        total: item.total,
        returned_quantity: item.returned_quantity || 0
      }));

      // Calculate remaining amount
      purchase.remaining_amount = purchase.net_amount - (purchase.paid_amount || 0);
      
      // Format dates safely
      purchase.invoice_date = formatDate(purchase.invoice_date);
      purchase.due_date = formatDate(purchase.due_date);
      purchase.created_at = formatDateTime(purchase.created_at);
      purchase.updated_at = formatDateTime(purchase.updated_at);

      // Cache the purchase for 5 minutes
      cacheService.set(cacheKey, purchase, 300);
      logger.debug(`Cache set for purchase: ${id}`);

      return purchase;
    } catch (error) {
      logger.error('Error getting purchase by ID:', error);
      throw error;
    }
  }

  getBySupplier(supplierId) {
    try {
      // First get purchases without items
      const purchases = db.query(`
        SELECT p.*, 
          s.name as supplier_name,
          s.contact_person as supplier_contact,
          s.phone as supplier_phone,
          s.email as supplier_email,
          s.address as supplier_address
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.supplier_id = ?
        ORDER BY p.created_at DESC
      `, [supplierId]);

      // Then fetch items for each purchase
      return purchases.map(purchase => {
        try {
          // Get purchase items
          const items = db.query(`
            SELECT pi.*, p.name as product_name, p.sku as product_sku
            FROM purchase_items pi
            LEFT JOIN products p ON pi.product_id = p.id
            WHERE pi.purchase_id = ?
          `, [purchase.id]);

          // Process items
          purchase.items = items.map(item => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.product_name,
            product_sku: item.product_sku,
            quantity: item.quantity,
            price: item.price,
            discount_percent: item.discount_percent,
            tax_percent: item.tax_percent,
            total: item.total
          }));

          // Calculate remaining amount
          purchase.remaining_amount = purchase.net_amount - (purchase.paid_amount || 0);
          
          // Format dates safely
          purchase.invoice_date = formatDate(purchase.invoice_date);
          purchase.due_date = formatDate(purchase.due_date);
          purchase.created_at = formatDateTime(purchase.created_at);
          purchase.updated_at = formatDateTime(purchase.updated_at);

          return purchase;
        } catch (err) {
          logger.error('Error processing purchase items:', err);
          return {
            ...purchase,
            items: []
          };
        }
      });
    } catch (err) {
      logger.error('Error getting purchases by supplier:', err);
      throw new Error('Failed to fetch purchases by supplier');
    }
  }

  getByDateRange(startDate, endDate) {
    try {
      // First get purchases without items
      const purchases = db.query(`
        SELECT p.*, 
          s.name as supplier_name,
          s.contact_person as supplier_contact,
          s.phone as supplier_phone,
          s.email as supplier_email,
          s.address as supplier_address
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.created_at BETWEEN ? AND ?
        ORDER BY p.created_at DESC
      `, [startDate, endDate]);

      // Then fetch items for each purchase
      return purchases.map(purchase => {
        try {
          // Get purchase items
          const items = db.query(`
            SELECT pi.*, p.name as product_name, p.sku as product_sku
            FROM purchase_items pi
            LEFT JOIN products p ON pi.product_id = p.id
            WHERE pi.purchase_id = ?
          `, [purchase.id]);

          // Process items
          purchase.items = items.map(item => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.product_name,
            product_sku: item.product_sku,
            quantity: item.quantity,
            price: item.price,
            discount_percent: item.discount_percent,
            tax_percent: item.tax_percent,
            total: item.total
          }));

          // Calculate remaining amount
          purchase.remaining_amount = purchase.net_amount - (purchase.paid_amount || 0);
          
          // Format dates safely
          purchase.invoice_date = formatDate(purchase.invoice_date);
          purchase.due_date = formatDate(purchase.due_date);
          purchase.created_at = formatDateTime(purchase.created_at);
          purchase.updated_at = formatDateTime(purchase.updated_at);

          return purchase;
        } catch (err) {
          logger.error('Error processing purchase items:', err);
          return {
            ...purchase,
            items: []
          };
        }
      });
    } catch (err) {
      logger.error('Error getting purchases by date range:', err);
      throw new Error('Failed to fetch purchases by date range');
    }
  }

  create(purchase, userId = null) {
    try {
      // Validate required fields
      if (!purchase.supplier_id) {
        throw new Error('Supplier ID is required');
      }

      if (!purchase.invoice_date) {
        throw new Error('Invoice date is required');
      }

      if (!purchase.due_date) {
        throw new Error('Due date is required');
      }

      // Validate items
      if (!purchase.items || !Array.isArray(purchase.items) || purchase.items.length === 0) {
        throw new Error('At least one item is required');
      }

      // Validate each item
      for (const item of purchase.items) {
        if (!item.product_id) {
          throw new Error('Product ID is required for each item');
        }
        if (!item.quantity || item.quantity <= 0) {
          throw new Error('Valid quantity is required for each item');
        }
        if (!item.price || item.price < 0) {
          throw new Error('Valid price is required for each item');
        }
        if (!item.stock_id) {
          throw new Error('Stock selection is required for each item');
        }
      }

      // Check for duplicate purchases (same supplier + invoice_no)
      if (purchase.invoice_no && purchase.invoice_no.trim()) {
        const existingPurchase = db.queryOne(
          'SELECT id, invoice_no FROM purchases WHERE supplier_id = ? AND invoice_no = ?',
          [purchase.supplier_id, purchase.invoice_no.trim()]
        );
        
        if (existingPurchase) {
          logger.warn('Duplicate purchase attempt detected:', {
            supplierId: purchase.supplier_id,
            invoiceNo: purchase.invoice_no,
            existingPurchaseId: existingPurchase.id
          });
          throw new Error(`Purchase with invoice number ${purchase.invoice_no} already exists for this supplier`);
        }
      }

      // Check for rapid duplicate submissions (same supplier, similar amount, within 5 seconds)
      const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
      const recentPurchases = db.query(
        `SELECT id, invoice_no, net_amount, created_at 
         FROM purchases 
         WHERE supplier_id = ? 
         AND created_at > ? 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [purchase.supplier_id, fiveSecondsAgo]
      );

      if (recentPurchases.length > 0) {
        const recentPurchase = recentPurchases[0];
        const timeDiff = Date.now() - new Date(recentPurchase.created_at).getTime();
        
        // If the recent purchase was created within 2 seconds, log a warning
        if (timeDiff < 2000) {
          logger.warn('Potential duplicate purchase detected:', {
            supplierId: purchase.supplier_id,
            recentPurchaseId: recentPurchase.id,
            recentInvoiceNo: recentPurchase.invoice_no,
            timeDifference: timeDiff
          });
        }
      }

      return db.transaction(() => {
        // Generate invoice number if not provided
        const timestamp = Date.now();
        const randomSuffix = Math.floor(Math.random() * 10000);
        const invoiceNo = purchase.invoice_no && purchase.invoice_no.trim() 
          ? purchase.invoice_no.trim()
          : `PUR-${timestamp}-${randomSuffix}`;

        // Double-check for duplicates within transaction
        const duplicateCheck = db.queryOne(
          'SELECT id FROM purchases WHERE supplier_id = ? AND invoice_no = ?',
          [purchase.supplier_id, invoiceNo]
        );
        
        if (duplicateCheck) {
          throw new Error(`Purchase with invoice number ${invoiceNo} already exists for this supplier`);
        }

        // Calculate totals
        const totals = purchase.items.reduce((acc, item) => {
          const subtotal = item.quantity * item.price;
          const discount = subtotal * ((item.discount_percent || 0) / 100);
          const afterDiscount = subtotal - discount;
          const tax = afterDiscount * ((item.tax_percent || 0) / 100);
          
          return {
            total: acc.total + subtotal,
            discount: acc.discount + discount,
            tax: acc.tax + tax,
            net: acc.net + afterDiscount + tax
          };
        }, { total: 0, discount: 0, tax: 0, net: 0 });

        // Check credit limit
        const { warnings, supplier, newBalance } = checkSupplierCreditLimit(purchase.supplier_id, totals.net);
        purchase.warnings = warnings;
        purchase.new_balance = newBalance;

        // Insert purchase
        const purchaseId = db.insert(
          `INSERT INTO purchases (
            supplier_id, invoice_no, invoice_date, due_date,
            total_amount, discount_amount, tax_amount, net_amount,
            paid_amount, payment_method, payment_status, status,
            notes, created_by, money_box_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            purchase.supplier_id,
            invoiceNo,
            purchase.invoice_date,
            purchase.due_date,
            totals.total,
            totals.discount,
            totals.tax,
            totals.net,
            purchase.paid_amount || 0,
            purchase.payment_method || 'cash',
            purchase.payment_status || 'unpaid',
            purchase.status || 'completed',
            purchase.notes || '',
            userId,
            purchase.moneyBoxId || null
          ]
        );

        // Insert purchase items and update inventory
        for (const item of purchase.items) {
          db.insert(
            `INSERT INTO purchase_items (
              purchase_id, product_id, stock_id, quantity, price,
              discount_percent, tax_percent, total,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [
              purchaseId,
              item.product_id,
              item.stock_id,
              item.quantity,
              item.price,
              item.discount_percent || 0,
              item.tax_percent || 0,
              (item.quantity * item.price) * (1 - (item.discount_percent || 0) / 100) * (1 + (item.tax_percent || 0) / 100)
            ]
          );

          // Note: Inventory is automatically updated by database trigger
          // Also log stock movement for the specific stock
          if (item.stock_id) {
            db.insert(
              `INSERT INTO stock_movements (
                movement_type, to_stock_id, product_id, quantity,
                unit_cost, total_value, reference_type, reference_id,
                reference_number, notes, created_by
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                'purchase',
                item.stock_id,
                item.product_id,
                item.quantity,
                item.price,
                (item.quantity * item.price) * (1 - (item.discount_percent || 0) / 100) * (1 + (item.tax_percent || 0) / 100),
                'purchase',
                purchaseId,
                invoiceNo,
                `Purchase item added to stock`,
                userId
              ]
            );
          }
        }

        // Log purchase history
        db.insert(
          `INSERT INTO purchase_history (
            purchase_id, action_type, new_data, changes_summary, created_by
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            purchaseId,
            'created',
            JSON.stringify(purchase),
            `Purchase created with ${purchase.items.length} items, total amount: ${totals.net}`,
            userId
          ]
        );

        // Get the created purchase
        const createdPurchase = this.getById(purchaseId);
        
        // Include warnings in the response
        if (purchase.warnings && purchase.warnings.length > 0) {
          createdPurchase.warnings = purchase.warnings;
          createdPurchase.credit_status = {
            exceeded: purchase.warnings.some(w => w.type === 'CREDIT_LIMIT_EXCEEDED'),
            unlimited: purchase.warnings.some(w => w.type === 'NO_CREDIT_LIMIT'),
            new_balance: purchase.new_balance
          };
        }

        // Invalidate all related caches
        cacheService.invalidatePattern('purchases:list:*');
        cacheService.invalidatePattern('purchases:purchase:*');
        cacheService.del('purchases:all_purchases');
        cacheService.del('purchases:supplier_purchases_index');
        
        // Invalidate inventory caches since products were updated by database triggers
        cacheService.invalidatePattern('inventory:*');
        cacheService.invalidatePattern('products:*');
        cacheService.del('inventory:all_products');
        cacheService.del('inventory:low_stock_products');
        cacheService.del('inventory:out_of_stock_products');
        
        logger.debug('Cache invalidated for purchase creation');
        
        logger.info(`Purchase ${purchaseId} created successfully with ${purchase.items.length} items, invoice: ${invoiceNo}`);
        return createdPurchase;
      });
    } catch (err) {
      logger.error('Error creating purchase:', err);
      throw err;
    }
  }

  update(id, {
    supplier_id,
    invoice_no,
    invoice_date,
    due_date,
    items,
    payment_method,
    payment_status,
    status,
    notes = '',
    moneyBoxId
  }, userId = null) {
    try {
      // Validate that purchase exists
      const existingPurchase = this.getById(id);
      if (!existingPurchase) {
        throw new Error('Purchase not found');
      }

      // Check if purchase can be updated (not returned or cancelled)
      if (existingPurchase.status === 'returned' || existingPurchase.status === 'cancelled') {
        throw new Error(`Cannot update purchase with status: ${existingPurchase.status}`);
      }

      // Check for duplicate invoice number if invoice_no is being changed
      if (invoice_no && invoice_no.trim() && invoice_no.trim() !== existingPurchase.invoice_no) {
        const duplicateCheck = db.queryOne(
          'SELECT id, invoice_no FROM purchases WHERE supplier_id = ? AND invoice_no = ? AND id != ?',
          [supplier_id || existingPurchase.supplier_id, invoice_no.trim(), id]
        );
        
        if (duplicateCheck) {
          logger.warn('Duplicate invoice number detected during update:', {
            purchaseId: id,
            newInvoiceNo: invoice_no,
            existingPurchaseId: duplicateCheck.id
          });
          throw new Error(`Purchase with invoice number ${invoice_no} already exists for this supplier`);
        }
      }

      // Validate that all products exist
      const productIds = items.map(item => item.product_id);
      const existingProducts = db.query(
        `SELECT id FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`,
        productIds
      );
      
      if (existingProducts.length !== productIds.length) {
        throw new Error('One or more products do not exist');
      }

      return db.transaction(() => {
        // Get existing purchase items
        const existingItems = db.query(
          `SELECT product_id, quantity 
           FROM purchase_items 
           WHERE purchase_id = ?`,
          [id]
        );

        // Note: Inventory will be automatically updated by database triggers when items are deleted and inserted
        // No need for manual inventory updates here

        // Delete existing purchase items
        db.update('DELETE FROM purchase_items WHERE purchase_id = ?', [id]);

        // Calculate new totals
        let total_amount = 0;
        let discount_amount = 0;
        let tax_amount = 0;

        items.forEach(item => {
          if (!item.quantity || item.quantity <= 0) {
            throw new Error(`Invalid quantity for product ${item.product_id}`);
          }
          if (!item.price || item.price < 0) {
            throw new Error(`Invalid price for product ${item.product_id}`);
          }

          const itemTotal = item.quantity * item.price;
          const itemDiscount = (itemTotal * (item.discount_percent || 0)) / 100;
          const itemTax = ((itemTotal - itemDiscount) * (item.tax_percent || 0)) / 100;

          total_amount += itemTotal;
          discount_amount += itemDiscount;
          tax_amount += itemTax;
        });

        const net_amount = total_amount - discount_amount + tax_amount;

        // Generate invoice number if not provided or empty
        const finalInvoiceNo = invoice_no && invoice_no.trim() 
          ? invoice_no.trim()
          : existingPurchase.invoice_no;

        // Update purchase
        const changes = db.update(
          `UPDATE purchases 
           SET supplier_id = ?,
               invoice_no = ?,
               total_amount = ?,
               discount_amount = ?,
               tax_amount = ?,
               net_amount = ?,
               payment_method = ?,
               payment_status = ?,
               invoice_date = ?,
               due_date = ?,
               notes = ?,
               status = ?,
               money_box_id = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            supplier_id || existingPurchase.supplier_id,
            finalInvoiceNo,
            total_amount,
            discount_amount,
            tax_amount,
            net_amount,
            payment_method || existingPurchase.payment_method,
            payment_status || existingPurchase.payment_status,
            invoice_date || existingPurchase.invoice_date,
            due_date || existingPurchase.due_date,
            notes || existingPurchase.notes,
            status || existingPurchase.status,
            moneyBoxId || existingPurchase.money_box_id,
            id
          ]
        );

        if (changes === 0) {
          throw new Error('Purchase not found or no changes made');
        }

        // Insert new purchase items
        for (const item of items) {
          const itemTotal = item.quantity * item.price;
          const itemDiscount = (itemTotal * (item.discount_percent || 0)) / 100;
          const itemTax = ((itemTotal - itemDiscount) * (item.tax_percent || 0)) / 100;
          const itemNetTotal = itemTotal - itemDiscount + itemTax;

          // Insert purchase item
          db.insert(
            `INSERT INTO purchase_items (
              purchase_id,
              product_id,
              stock_id,
              quantity,
              price,
              discount_percent,
              tax_percent,
              total
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              item.product_id,
              item.stock_id,
              item.quantity,
              item.price,
              item.discount_percent || 0,
              item.tax_percent || 0,
              itemNetTotal
            ]
          );

          // Note: Inventory will be automatically updated by database trigger when new items are inserted
          // Also log stock movement for the specific stock
          if (item.stock_id) {
            db.insert(
              `INSERT INTO stock_movements (
                movement_type, to_stock_id, product_id, quantity,
                unit_cost, total_value, reference_type, reference_id,
                reference_number, notes, created_by
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                'purchase',
                item.stock_id,
                item.product_id,
                item.quantity,
                item.price,
                itemNetTotal,
                'purchase',
                id,
                finalInvoiceNo,
                `Purchase item updated and added to stock`,
                userId
              ]
            );
          }
        }

        // Log purchase history
        db.insert(
          `INSERT INTO purchase_history (
            purchase_id, action_type, previous_data, new_data, changes_summary, created_by
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            id,
            'updated',
            JSON.stringify(existingPurchase),
            JSON.stringify({ supplier_id, invoice_date, due_date, items, payment_method, payment_status, status, notes }),
            `Purchase updated with ${items.length} items, new total amount: ${net_amount}`,
            userId
          ]
        );

        // Invalidate all related caches
        cacheService.invalidatePattern('purchases:list:*');
        cacheService.invalidatePattern('purchases:purchase:*');
        cacheService.del('purchases:all_purchases');
        cacheService.del('purchases:supplier_purchases_index');
        
        // Invalidate inventory caches since products were updated by database triggers
        cacheService.invalidatePattern('inventory:*');
        cacheService.invalidatePattern('products:*');
        cacheService.del('inventory:all_products');
        cacheService.del('inventory:low_stock_products');
        cacheService.del('inventory:out_of_stock_products');
        
        logger.debug('Cache invalidated for purchase update');
        
        logger.info(`Purchase ${id} updated successfully with ${items.length} items`);
        return this.getById(id);
      });
    } catch (err) {
      logger.error('Error updating purchase:', err);
      throw new Error(`Failed to update purchase: ${err.message}`);
    }
  }

  delete(id, userId = null, force = false) {
    try {
      return db.transaction(() => {
        // Get existing purchase data for audit log
        const existingPurchase = this.getById(id);
        if (!existingPurchase) {
          throw new Error('Purchase not found');
        }

        // Check if purchase can be deleted (not returned or partially returned)
        if (!force && (existingPurchase.status === 'returned' || existingPurchase.status === 'partially_returned')) {
          throw new Error(`Cannot delete purchase with status: ${existingPurchase.status}. Please process returns first or use force deletion.`);
        }

        // Check if purchase has any returns
        const returnsCount = db.queryOne(
          'SELECT COUNT(*) as count FROM purchase_returns WHERE purchase_id = ?',
          [id]
        );

        if (!force && returnsCount && returnsCount.count > 0) {
          throw new Error(`Cannot delete purchase with ${returnsCount.count} return(s). Please process all returns first or use force deletion.`);
        }

        // Check if purchase has any payments
        if (!force && existingPurchase.paid_amount > 0) {
          throw new Error(`Cannot delete purchase with paid amount of ${existingPurchase.paid_amount}. Please process refunds first or use force deletion.`);
        }

        // Get purchase items to restore product stock
        const items = db.query(
          `SELECT product_id, stock_id, quantity 
           FROM purchase_items 
           WHERE purchase_id = ?`,
          [id]
        );

        // Note: Inventory is automatically updated by database trigger when purchase_items are deleted
        // Also log stock movements for reversal
        for (const item of items) {
          if (item.stock_id) {
            db.insert(
              `INSERT INTO stock_movements (
                movement_type, from_stock_id, product_id, quantity,
                unit_cost, total_value, reference_type, reference_id,
                reference_number, notes, created_by
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                'adjustment', // Use 'adjustment' instead of 'purchase_reversal' to comply with CHECK constraint
                item.stock_id,
                item.product_id,
                item.quantity,
                0, // Unit cost not available in deletion context
                0, // Total value not available in deletion context
                'purchase',
                id,
                existingPurchase.invoice_no,
                `Purchase deleted - items removed from stock`,
                userId
              ]
            );
          }
        }

        // Delete purchase items first (foreign key constraint)
        db.update('DELETE FROM purchase_items WHERE purchase_id = ?', [id]);

        // Log purchase history before deletion
        db.insert(
          `INSERT INTO purchase_history (
            purchase_id, action_type, previous_data, changes_summary, created_by
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            id,
            'deleted',
            JSON.stringify(existingPurchase),
            `Purchase deleted, restored inventory for ${items.length} items`,
            userId
          ]
        );

        // Delete purchase
        const changes = db.update('DELETE FROM purchases WHERE id = ?', [id]);
        
        if (changes === 0) {
          throw new Error('Purchase not found');
        }

        // Verify inventory was updated correctly
        for (const item of items) {
          const updatedProduct = db.queryOne(
            'SELECT id, name, current_stock FROM products WHERE id = ?',
            [item.product_id]
          );
          if (updatedProduct) {
            logger.info(`Final inventory check - Product ${updatedProduct.name} (ID: ${item.product_id}): ${updatedProduct.current_stock} units`);
          }
        }

        // Invalidate all related caches
        cacheService.invalidatePattern('purchases:list:*');
        cacheService.invalidatePattern('purchases:purchase:*');
        cacheService.del('purchases:all_purchases');
        cacheService.del('purchases:supplier_purchases_index');
        
        // Invalidate inventory caches since products were removed by database triggers
        cacheService.invalidatePattern('inventory:*');
        cacheService.invalidatePattern('products:*');
        cacheService.del('inventory:all_products');
        cacheService.del('inventory:low_stock_products');
        cacheService.del('inventory:out_of_stock_products');
        
        logger.debug('Cache invalidated for purchase deletion');
        
        logger.info(`Purchase ${id} deleted successfully, restored inventory for ${items.length} items`);
        return true;
      });
    } catch (err) {
      logger.error('Error deleting purchase:', err);
      throw new Error(`Failed to delete purchase: ${err.message}`);
    }
  }

  getTotalBySupplier(startDate, endDate) {
    try {
      return db.query(`
        SELECT 
          s.id as supplier_id,
          s.name as supplier_name,
          COUNT(p.id) as total_purchases,
          SUM(p.total_amount) as total_amount,
          SUM(p.paid_amount) as total_paid,
          SUM(p.net_amount - p.paid_amount) as total_remaining
        FROM suppliers s
        LEFT JOIN purchases p ON s.id = p.supplier_id
        WHERE p.created_at BETWEEN ? AND ?
        GROUP BY s.id
        ORDER BY total_amount DESC
      `, [startDate, endDate]);
    } catch (err) {
      logger.error('Error getting totals by supplier:', err);
      throw new Error('Failed to fetch totals by supplier');
    }
  }

  getTotalByDateRange(startDate, endDate) {
    try {
      return db.queryOne(`
        SELECT 
          COUNT(id) as total_purchases,
          SUM(total_amount) as total_amount,
          SUM(paid_amount) as total_paid,
          SUM(net_amount - paid_amount) as total_remaining
        FROM purchases
        WHERE created_at BETWEEN ? AND ?
      `, [startDate, endDate]);
    } catch (err) {
      logger.error('Error getting totals by date range:', err);
      throw new Error('Failed to fetch totals by date range');
    }
  }

  // Process purchase return
  processPurchaseReturn(purchaseId, returnItems, reason, userId = null) {
    try {
      return db.transaction(() => {
        const purchase = this.getById(purchaseId);
        if (!purchase) throw new Error('Purchase not found');
        if (!['completed'].includes(purchase.status)) {
          throw new Error('Only completed purchases can be returned');
        }

        // Validate return items
        const purchaseItems = this.getPurchaseItems(purchaseId);
        const itemMap = new Map(purchaseItems.map(item => [item.id, item]));

        // Calculate total return amount
        let totalReturnAmount = 0;
        for (const returnItem of returnItems) {
          const originalItem = itemMap.get(returnItem.purchase_item_id);
          if (!originalItem) {
            throw new Error(`Invalid purchase item id: ${returnItem.purchase_item_id}`);
          }
          
          // Get current returned quantity
          const currentReturnedQuantity = originalItem.returned_quantity || 0;
          const remainingQuantity = originalItem.quantity - currentReturnedQuantity;
          
          if (returnItem.quantity > remainingQuantity) {
            throw new Error(`Return quantity exceeds remaining quantity for item ${returnItem.purchase_item_id}`);
          }
          
          totalReturnAmount += returnItem.quantity * originalItem.price;
        }

        // Create return record
        const returnId = db.insert(
          `INSERT INTO purchase_returns (
            purchase_id,
            return_date,
            reason,
            status,
            refund_method,
            total_amount,
            created_by
          ) VALUES (?, CURRENT_TIMESTAMP, ?, 'completed', ?, ?, ?)`,
          [
            purchaseId,
            reason,
            returnItems[0]?.refund_method || 'cash',
            totalReturnAmount,
            userId
          ]
        );

        // Process each return item
        for (const item of returnItems) {
          const originalItem = itemMap.get(item.purchase_item_id);
          
          // Insert return item record
          db.insert(
            `INSERT INTO purchase_return_items (
              return_id,
              purchase_item_id,
              quantity,
              price,
              total
            ) VALUES (?, ?, ?, ?, ?)`,
            [
              returnId,
              item.purchase_item_id,
              item.quantity,
              originalItem.price,
              item.quantity * originalItem.price
            ]
          );

          // Update purchase item with returned quantity
          const newReturnedQuantity = (originalItem.returned_quantity || 0) + item.quantity;
          db.update(
            `UPDATE purchase_items 
             SET returned_quantity = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [newReturnedQuantity, item.purchase_item_id]
          );

          // Remove inventory movement for returned product (returned to supplier)
          updateProductInventory(
            originalItem.product_id,
            item.quantity,
            'subtract', // Remove from inventory (returned to supplier)
            'return',
            returnId,
            purchase.invoice_no,
            `إرجاع إلى المورد - ${reason}`,
            userId
          );
        }

        // Get updated purchase items to check if all items are returned
        const updatedPurchaseItems = this.getPurchaseItems(purchaseId);
        const allItemsReturned = updatedPurchaseItems.every(item => 
          (item.returned_quantity || 0) >= item.quantity
        );

        // Calculate total returned amount including this return
        const totalReturnedAmount = updatedPurchaseItems.reduce((sum, item) => {
          return sum + ((item.returned_quantity || 0) * item.price);
        }, 0);

        // Check if total returned amount equals or exceeds the purchase net amount
        const isFullyReturnedMonetarily = totalReturnedAmount >= purchase.net_amount;

        // Determine new status based on both item quantity and monetary amount
        let newStatus = 'partially_returned';
        if (allItemsReturned && isFullyReturnedMonetarily) {
          newStatus = 'returned';
        } else if (isFullyReturnedMonetarily) {
          newStatus = 'returned'; // Even if not all items returned, if monetary amount is fully returned
        } else if (allItemsReturned) {
          newStatus = 'returned'; // All items returned
        }
        
        // Update purchase status
        db.update(
          `UPDATE purchases 
           SET status = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [newStatus, purchaseId]
        );

        // Invalidate all related caches
        cacheService.invalidatePattern('purchases:list:*');
        cacheService.invalidatePattern('purchases:purchase:*');
        cacheService.del('purchases:all_purchases');
        cacheService.del('purchases:supplier_purchases_index');
        
        // Invalidate inventory caches since products were returned to supplier
        cacheService.invalidatePattern('inventory:*');
        cacheService.invalidatePattern('products:*');
        cacheService.del('inventory:all_products');
        cacheService.del('inventory:low_stock_products');
        cacheService.del('inventory:out_of_stock_products');
        
        logger.info(`Purchase return ${returnId} created successfully for purchase ${purchaseId}`);
        logger.debug('Cache invalidated for purchase return and inventory updates');
        
        return {
          returnId,
          totalAmount: totalReturnAmount,
          newPurchaseStatus: newStatus
        };
      });
    } catch (err) {
      logger.error('Error processing purchase return:', err);
      throw err;
    }
  }

  // Get purchase items
  getPurchaseItems(purchaseId) {
    try {
      return db.query(`
        SELECT pi.*, p.name as product_name, p.sku as product_sku
        FROM purchase_items pi
        LEFT JOIN products p ON pi.product_id = p.id
        WHERE pi.purchase_id = ?
      `, [purchaseId]);
    } catch (error) {
      logger.error('Error getting purchase items:', error);
      throw error;
    }
  }

  // Get purchase returns
  getPurchaseReturns(purchaseId) {
    try {
      const returns = db.query(`
        SELECT pr.*, u.name as created_by_name
        FROM purchase_returns pr
        LEFT JOIN users u ON pr.created_by = u.id
        WHERE pr.purchase_id = ?
        ORDER BY pr.return_date DESC
      `, [purchaseId]);

      // Get return items for each return
      for (const returnRecord of returns) {
        const returnItems = db.query(`
          SELECT pri.*, pi.product_id, p.name as product_name, p.sku as product_sku
          FROM purchase_return_items pri
          LEFT JOIN purchase_items pi ON pri.purchase_item_id = pi.id
          LEFT JOIN products p ON pi.product_id = p.id
          WHERE pri.return_id = ?
        `, [returnRecord.id]);
        
        returnRecord.items = returnItems;
      }

      return returns;
    } catch (error) {
      logger.error('Error getting purchase returns:', error);
      throw error;
    }
  }

  // Get detailed purchase with returns information
  getPurchaseWithReturns(purchaseId) {
    try {
      const purchase = this.getById(purchaseId);
      if (!purchase) {
        return null;
      }

      // Get detailed returns information
      const returns = this.getPurchaseReturns(purchaseId);
      
      // Calculate return statistics
      const returnStats = {
        total_returns: returns.length,
        total_returned_amount: returns.reduce((sum, ret) => sum + (ret.total_amount || 0), 0),
        total_returned_items: returns.reduce((sum, ret) => sum + (ret.items?.length || 0), 0),
        last_return_date: returns.length > 0 ? returns[0].return_date : null,
        returns: returns
      };

      return {
        ...purchase,
        return_stats: returnStats
      };
    } catch (error) {
      logger.error('Error getting purchase with returns:', error);
      throw error;
    }
  }
}

// Initialize cache on service load
const purchasesService = new PurchasesService();

// Load all purchases to cache on startup
setTimeout(() => {
  try {
    purchasesService.loadAllPurchasesToCache();
    // Purchases cache initialized
  } catch (err) {
    logger.error('Failed to initialize purchases cache on startup:', err);
  }
}, 4500); // Wait 4.5 seconds for database to be ready

module.exports = purchasesService; 