const database = require('../database');
const logger = require('../utils/logger');
const { generateUniqueSKU } = require('../utils/skuGenerator');
const cacheService = require('./cacheService');

class InventoryService {
  // Helper function to sync product stock_id with stock movements
  syncProductStockId(productId) {
    try {
      const dbInstance = database.reconnect();
      
      // Get all stocks that have movements for this product and calculate their net quantities
      const stockQuantities = dbInstance.prepare(`
        SELECT 
          stock_id,
          SUM(CASE WHEN direction = 'in' THEN quantity ELSE -quantity END) as net_quantity
        FROM (
          SELECT to_stock_id as stock_id, quantity, 'in' as direction
          FROM stock_movements 
          WHERE product_id = ? AND to_stock_id IS NOT NULL
          UNION ALL
          SELECT from_stock_id as stock_id, quantity, 'out' as direction
          FROM stock_movements 
          WHERE product_id = ? AND from_stock_id IS NOT NULL
        ) movements
        GROUP BY stock_id
        HAVING net_quantity > 0
        ORDER BY net_quantity DESC
        LIMIT 1
      `).all(productId, productId);

      if (stockQuantities.length > 0) {
        // Update product with the stock that has the highest quantity
        dbInstance.prepare(`
          UPDATE products 
          SET stock_id = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).run(stockQuantities[0].stock_id, productId);
        
        return stockQuantities[0].stock_id;
      } else {
        // No stock has positive quantity, set stock_id to null
        dbInstance.prepare(`
          UPDATE products 
          SET stock_id = NULL, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).run(productId);
        
        return null;
      }
    } catch (error) {
      logger.error('Error syncing product stock_id:', error);
      return null;
    }
  }

  // Optimized product loading with better caching strategy
  loadAllProductsToCache() {
    try {
      const dbInstance = database.reconnect();
      
      // Simplified query - only load essential data
      const query = `
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.barcode,
          p.selling_price,
          p.current_stock,
          p.min_stock,
          p.reorder_point,
          p.is_active,
          c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = 1
        ORDER BY p.name ASC
      `;
      
      const products = dbInstance.prepare(query).all();
      
      // Cache all products with essential info only
      const productsWithStock = products.map(product => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        selling_price: product.selling_price,
        current_stock: product.current_stock,
        min_stock: product.min_stock,
        reorder_point: product.reorder_point,
        category_name: product.category_name
      }));
      
      // Store all products in cache for 10 minutes
      cacheService.set('inventory:all_products', productsWithStock, 600);
      
      // Create barcode index for fast lookup
      const barcodeIndex = {};
      productsWithStock.forEach(product => {
        if (product.barcode) {
          barcodeIndex[product.barcode] = product;
        }
      });
      
      // Cache barcode index for 10 minutes
      cacheService.set('inventory:barcode_index', barcodeIndex, 600);
      
      // Loaded products into cache
      return productsWithStock;
    } catch (err) {
      logger.error('Error loading all products to cache:', err);
      throw new Error('Failed to load products to cache');
    }
  }

  getAllProducts({ page = 1, limit = 10, filters = {} }) {
    try {
      // Generate cache key based on parameters
      const cacheKey = `inventory:products:${JSON.stringify({ page, limit, filters })}`;
      
      // Debug logging
      logger.debug('getAllProducts called with:', { page, limit, filters });
      
      // Try to get from cache first
      const cached = cacheService.get(cacheKey);
      if (cached && !filters.name) { // Don't cache search results
        logger.debug(`Cache hit for products list: ${cacheKey}`);
        return cached;
      }
      
      // Ensure database connection is open
      const dbInstance = database.reconnect();
      const offset = (page - 1) * limit;
      
      // Optimized query with better indexing
      let query = `
        SELECT 
          p.*,
          c.name as category_name,
          s.name as stock_name,
          s.id as stock_id
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN stocks s ON p.stock_id = s.id
      `;
      const whereConditions = [];
      const queryParams = [];
      
      // Enhanced search functionality with better indexing
      if (filters.name) {
        // Use indexed search on name and barcode
        whereConditions.push(`(
          p.name LIKE ? OR 
          p.barcode LIKE ? OR 
          p.sku LIKE ?
        )`);
        const searchTerm = `%${filters.name}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }
      
      if (filters.category) {
        whereConditions.push('p.category_id = ?');
        queryParams.push(filters.category);
      }
      if (filters.minPrice) {
        whereConditions.push('p.selling_price >= ?');
        queryParams.push(filters.minPrice);
      }
      if (filters.maxPrice) {
        whereConditions.push('p.selling_price <= ?');
        queryParams.push(filters.maxPrice);
      }
      if (filters.lowStock !== undefined && filters.lowStock !== null) {
        whereConditions.push('p.current_stock <= ?');
        queryParams.push(filters.lowStock);
      }
      if (filters.barcode) {
        whereConditions.push('p.barcode = ?');
        queryParams.push(filters.barcode);
      }
      if (filters.expiring !== undefined && filters.expiring !== null) {
        if (filters.expiring === -1) {
          // Expired products
          whereConditions.push('p.expiry_date IS NOT NULL AND p.expiry_date < date("now")');
        } else {
          // Expiring within X days
          whereConditions.push('p.expiry_date IS NOT NULL AND p.expiry_date BETWEEN date("now") AND date("now", "+" || ? || " days")');
          queryParams.push(filters.expiring);
        }
      }
      if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }
      query += `
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `;
      queryParams.push(limit, offset);

      // Optimized count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM products p
        ${whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''}
      `;

      // Execute queries
      const products = dbInstance.prepare(query).all(queryParams);
      const totalResult = dbInstance.prepare(countQuery).get(queryParams.slice(0, -2));
      const total = totalResult ? totalResult.total : 0;

      // Calculate pagination info
      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      const result = {
        products,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage,
          hasPrevPage
        }
      };

      // Cache the result (except for search results)
      if (!filters.name) {
        cacheService.set(cacheKey, result, 300); // 5 minutes cache
      }

      return result;
    } catch (err) {
      logger.error('Error in getAllProducts:', err);
      throw new Error('Failed to fetch products');
    }
  }

  getProductById(id) {
    try {
      // Generate cache key
      const cacheKey = `inventory:product:${id}`;
      
      // Try to get from cache first
      const cached = cacheService.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for product: ${id}`);
        return cached;
      }
      
      const dbInstance = database.reconnect();
      const product = dbInstance.prepare(`
        SELECT 
          p.*,
          COALESCE(SUM(si.quantity), 0) as total_sold,
          COALESCE(SUM(pi.quantity), 0) as total_purchased
        FROM products p
        LEFT JOIN sale_items si ON p.id = si.product_id
        LEFT JOIN purchase_items pi ON p.id = pi.product_id
        WHERE p.id = ?
        GROUP BY p.id
      `).get(id);
      
      if (product) {
        // Cache the product for 5 minutes
        cacheService.set(cacheKey, product, 300);
        logger.debug(`Cache set for product: ${id}`);
      }
      
      return product || null;
    } catch (err) {
      logger.error('Error getting product by ID:', err);
      throw new Error('Failed to fetch product');
    }
  }

  getProductByBarcode(barcode, allowNegativeStock = false) {
    try {
      // Add debugging log
      logger.debug('INVENTORY_SERVICE_GET_PRODUCT_BY_BARCODE', { 
        barcode: barcode,
        allowNegativeStock: allowNegativeStock
      });
      
      // First try to get from barcode index cache
      const barcodeIndex = cacheService.get('inventory:barcode_index');
      if (barcodeIndex && barcodeIndex[barcode]) {
        const cachedProduct = barcodeIndex[barcode];
        // Check if we should return the cached product based on stock and allowNegativeStock setting
        if (allowNegativeStock || cachedProduct.current_stock > 0) {
          logger.debug(`Cache hit for product barcode from index: ${barcode}`);
          return cachedProduct;
        } else {
          logger.debug(`Cache hit but product out of stock and negative stock not allowed: ${barcode}, stock: ${cachedProduct.current_stock}`);
        }
      }
      
      // If not in index, try individual cache
      const cacheKey = `inventory:barcode:${barcode}`;
      const cached = cacheService.get(cacheKey);
      if (cached) {
        // Check if we should return the cached product based on stock and allowNegativeStock setting
        if (allowNegativeStock || cached.current_stock > 0) {
          logger.debug(`Cache hit for product barcode: ${barcode}`);
          return cached;
        } else {
          logger.debug(`Cache hit but product out of stock and negative stock not allowed: ${barcode}, stock: ${cached.current_stock}`);
        }
      }
      
      // If not in cache, load all products to cache and try again
      logger.debug(`Barcode ${barcode} not found in cache, loading all products...`);
      this.loadAllProductsToCache();
      
      // Try again with updated cache
      const updatedBarcodeIndex = cacheService.get('inventory:barcode_index');
      if (updatedBarcodeIndex && updatedBarcodeIndex[barcode]) {
        const cachedProduct = updatedBarcodeIndex[barcode];
        // Check if we should return the cached product based on stock and allowNegativeStock setting
        if (allowNegativeStock || cachedProduct.current_stock > 0) {
          logger.debug(`Found product barcode after cache reload: ${barcode}`);
          return cachedProduct;
        } else {
          logger.debug(`Found product after cache reload but out of stock and negative stock not allowed: ${barcode}, stock: ${cachedProduct.current_stock}`);
        }
      }
      
      // If still not found, query database directly
      const dbInstance = database.reconnect();
      
      // Build the query conditionally based on allowNegativeStock setting
      const stockCondition = allowNegativeStock ? '' : 'AND p.current_stock > 0';
      
      logger.debug('INVENTORY_SERVICE_DATABASE_QUERY', { 
        barcode: barcode,
        stockCondition: stockCondition,
        allowNegativeStock: allowNegativeStock
      });
      
      const product = dbInstance.prepare(`
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
      
      logger.debug('INVENTORY_SERVICE_DATABASE_RESULT', { 
        barcode: barcode,
        found: !!result,
        productId: result?.id,
        productName: result?.name,
        currentStock: result?.current_stock,
        allowNegativeStock: allowNegativeStock
      });
      
      if (result) {
        // Cache the product for 5 minutes
        cacheService.set(cacheKey, result, 300);
        logger.debug(`Cache set for product barcode: ${barcode}`);
      }
      
      return result;
    } catch (err) {
      logger.error('Error getting product by barcode:', err);
      throw new Error('Failed to fetch product');
    }
  }

  getProductMovements(productId, filters = {}) {
    try {
      // Generate cache key for product movements
      const cacheKey = `inventory:movements:${productId}:${JSON.stringify(filters)}`;
      
      // Try to get from cache first
      const cached = cacheService.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for product movements: ${productId}`);
        return cached;
      }
      
      // Ensure database connection is open
      const dbInstance = database.reconnect();
      
      let whereConditions = ['im.product_id = ?'];
      let queryParams = [productId];
      
      if (filters.startDate) {
        whereConditions.push('im.created_at >= ?');
        queryParams.push(filters.startDate);
      }
      
      if (filters.endDate) {
        whereConditions.push('im.created_at <= ?');
        queryParams.push(filters.endDate);
      }
      
      if (filters.movementType && filters.movementType !== 'all') {
        whereConditions.push('im.movement_type = ?');
        queryParams.push(filters.movementType);
      }
      
      const query = `
        SELECT 
          im.id,
          im.movement_type,
          im.quantity,
          im.previous_stock,
          im.new_stock,
          im.reference_type,
          im.reference_id,
          NULL as reference_number,
          im.notes,
          im.created_at as movement_date,
          CASE 
            WHEN im.reference_type = 'sale' THEN (
              SELECT c.name 
              FROM sales s 
              LEFT JOIN customers c ON s.customer_id = c.id 
              WHERE s.id = im.reference_id
            )
            WHEN im.reference_type = 'purchase' THEN (
              SELECT s.name 
              FROM purchases p 
              LEFT JOIN suppliers s ON p.supplier_id = s.id 
              WHERE p.id = im.reference_id
            )
            ELSE NULL
          END as reference_name
        FROM inventory_movements im
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY im.created_at DESC
        LIMIT 1000
      `;
      
      const movements = dbInstance.prepare(query).all(queryParams);
      
      // Cache the movements for 3 minutes
      cacheService.set(cacheKey, movements, 180);
      logger.debug(`Cache set for product movements: ${productId}`);
      
      return movements;
    } catch (err) {
      logger.error('Error getting product movements:', err);
      throw new Error('Failed to fetch product movements');
    }
  }

  getExpiringProducts(days) {
    try {
      // Generate cache key for expiring products
      const cacheKey = `inventory:expiring:${days}`;
      
      // Try to get from cache first
      const cached = cacheService.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for expiring products: ${days} days`);
        return cached;
      }
      
      // Ensure database connection is open
      const dbInstance = database.reconnect();
      const query = `
         SELECT 
           p.*,
           pps.supplier_name
         FROM products p
         LEFT JOIN product_primary_suppliers pps ON p.id = pps.product_id
         WHERE p.expiry_date IS NOT NULL
         AND p.expiry_date <= date('now', '+' || ? || ' days')
         AND p.expiry_date >= date('now')
         AND p.is_active = 1
         ORDER BY p.expiry_date ASC
       `;
      
      const expiringProducts = dbInstance.prepare(query).all(days);
      
      // Cache the expiring products for 10 minutes
      cacheService.set(cacheKey, expiringProducts, 600);
      logger.debug(`Cache set for expiring products: ${days} days`);
      
      return expiringProducts;
    } catch (err) {
      logger.error('Error getting expiring products:', err);
      throw new Error('Failed to fetch expiring products');
    }
  }

  getLowStockProducts(threshold = 10) {
    try {
      // Generate cache key for low stock products
      const cacheKey = `inventory:lowStock:${threshold}`;
      
      // Try to get from cache first
      const cached = cacheService.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for low stock products: threshold ${threshold}`);
        return cached;
      }
      
      // Ensure database connection is open
      const dbInstance = database.reconnect();
      const query = `
        SELECT 
          p.*,
          COALESCE(SUM(si.quantity), 0) as total_sold,
          COALESCE(SUM(pi.quantity), 0) as total_purchased,
          c.name as category_name,
          s.name as stock_name,
          s.id as stock_id
        FROM products p
        LEFT JOIN sale_items si ON p.id = si.product_id
        LEFT JOIN purchase_items pi ON p.id = pi.product_id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN stocks s ON p.stock_id = s.id
        WHERE p.current_stock <= ?
        AND p.current_stock > 0
        AND p.is_active = 1
        GROUP BY p.id
        ORDER BY p.current_stock ASC, p.name ASC
      `;
      
      const lowStockProducts = dbInstance.prepare(query).all(threshold);
      
      // Cache the low stock products for 5 minutes
      cacheService.set(cacheKey, lowStockProducts, 300);
      logger.debug(`Cache set for low stock products: threshold ${threshold}`);
      
      return lowStockProducts;
    } catch (err) {
      logger.error('Error getting low stock products:', err);
      throw new Error('Failed to fetch low stock products');
    }
  }

  async createProduct(data) {
    try {
      // Ensure database connection is open
      const dbInstance = database.reconnect();
      const {
        name,
        description,
        scientific_name,
        barcode,
        purchase_price,
        selling_price,
        wholesale_price,
        current_stock,
        company_name,
        min_stock,
        unit,
        expiry_date,
        units_per_box,
        supported,
        is_dolar,
        category_id,
        stock_id,
        location_in_stock,
        shelf_number,
        rack_number,
        bin_number
      } = data;

      // Generate unique SKU
      const sku = await generateUniqueSKU(name);

      // Check if barcode already exists
      if (barcode) {
        const existingBarcode = dbInstance.prepare('SELECT id FROM products WHERE barcode = ?').get(barcode);
        if (existingBarcode) {
          throw new Error('Barcode already exists');
        }
      }

      // Start transaction for product creation and stock movement
      const productId = dbInstance.transaction(() => {
        const result = dbInstance.prepare(`
           INSERT INTO products (
             name,
             scientific_name,
             description,
             supported,
             sku,
             barcode,
             purchase_price,
             selling_price,
             wholesale_price,
             company_name,
             current_stock,
             min_stock,
             max_stock,
             total_sold,
             total_purchased,
             unit,
             units_per_box,
             is_dolar,
             expiry_date,
             is_active,
             last_purchase_date,
             last_purchase_price,
             average_cost,
             reorder_point,
             category_id,
             stock_id,
             location_in_stock,
             shelf_number,
             rack_number,
             bin_number,
             last_stock_check,
             created_at,
             updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         `).run(
           name,
           scientific_name || '',
           description || '',
           supported !== undefined ? (supported ? 1 : 0) : 1, // supported - convert boolean to integer
           sku,
           barcode || null,
           purchase_price,
           selling_price,
           wholesale_price || 0,
           company_name || '',
           current_stock || 0,
           min_stock || 0,
           null, // max_stock
           0, // total_sold
           0, // total_purchased
           unit || 'قطعة',
           units_per_box || 1,
           is_dolar !== undefined ? (is_dolar ? 1 : 0) : 0, // is_dolar - convert boolean to integer
           expiry_date || null,
           1, // is_active
           null, // last_purchase_date
           null, // last_purchase_price
           0, // average_cost
           0, // reorder_point
           category_id || null,
           stock_id || null,
           location_in_stock || null,
           shelf_number || null,
         rack_number || null,
         bin_number || null,
         null, // last_stock_check
         new Date().toISOString(), // created_at
         new Date().toISOString()  // updated_at
       );

       if (!result.lastInsertRowid) {
         throw new Error('Failed to create product');
       }

       const productId = result.lastInsertRowid;

       // Create stock movement if initial stock is provided
       if (current_stock > 0 && stock_id) {
         dbInstance.prepare(`
           INSERT INTO stock_movements (
             movement_type, to_stock_id, product_id, quantity, unit_cost, total_value,
             reference_type, reference_number, movement_date, notes, created_by, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, CURRENT_TIMESTAMP)
         `).run(
           'adjustment',
           stock_id,
           productId,
           current_stock,
           purchase_price,
           purchase_price * current_stock,
           'product_creation',
           `PROD-${productId}`,
           `مخزون أولي للمنتج ${name}`,
           1 // Default admin user
         );
       }

       return productId;
     })();

      // If the product has initial stock and a supplier, create a purchase record
      logger.info('Checking auto-purchase conditions:', { current_stock, shouldCreate: current_stock > 0 && data.supplier_id });
      if (current_stock > 0 && data.supplier_id) {
        // First create product-supplier relationship
        try {
          dbInstance.prepare(`
            INSERT INTO product_suppliers (
              product_id, supplier_id, is_primary, supplier_price, 
              lead_time_days, minimum_order_quantity, is_active, 
              created_at, updated_at
            ) VALUES (?, ?, 1, ?, 7, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).run(productId, data.supplier_id, purchase_price);
          
          logger.info('Created product-supplier relationship:', { productId, supplier_id: data.supplier_id });
        } catch (error) {
          logger.warn('Product-supplier relationship may already exist:', error.message);
        }

        try {
          logger.info('Starting auto-purchase creation for product:', { productId, name, supplier_id: data.supplier_id, current_stock });
          
          const purchaseAmount = purchase_price * current_stock;
          
          // Check supplier's current credit limit and update if needed
          const supplier = dbInstance.prepare('SELECT credit_limit, current_balance FROM suppliers WHERE id = ?').get(data.supplier_id);
          if (supplier) {
            const newBalance = supplier.current_balance + purchaseAmount;
            if (newBalance > supplier.credit_limit) {
              // Update credit limit to accommodate this purchase
              const newCreditLimit = Math.max(supplier.credit_limit, newBalance + 1000000); // Add 1M buffer
              dbInstance.prepare('UPDATE suppliers SET credit_limit = ? WHERE id = ?').run(newCreditLimit, data.supplier_id);
              logger.info(`Updated supplier ${data.supplier_id} credit limit from ${supplier.credit_limit} to ${newCreditLimit}`);
            }
          }
          
          // Temporarily disable the trigger by dropping and recreating it
          // This is a workaround for the trigger that's causing constraint violations
          try {
            dbInstance.prepare('DROP TRIGGER IF EXISTS update_supplier_balance_on_purchase').run();
            logger.info('Temporarily disabled supplier balance trigger');
          } catch (e) {
            logger.warn('Could not drop trigger:', e.message);
          }
          
          // Create purchase record
          const purchaseData = {
            supplier_id: data.supplier_id,
            invoice_no: `INV-${Date.now()}-${productId}`,
            invoice_date: new Date().toISOString().split('T')[0],
            total_amount: purchase_price * current_stock,
            net_amount: purchase_price * current_stock,
            paid_amount: purchase_price * current_stock, // Set as fully paid
            payment_method: 'cash',
            payment_status: 'paid',
            status: 'completed',
            notes: `شراء تلقائي للمخزون الأولي للمنتج ${name}`,
            created_by: 1 // Default admin user
          };

          const purchaseResult = dbInstance.prepare(`
            INSERT INTO purchases (
              supplier_id, invoice_no, invoice_date, total_amount, net_amount, paid_amount,
              payment_method, payment_status, status, notes, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).run(
            purchaseData.supplier_id,
            purchaseData.invoice_no,
            purchaseData.invoice_date,
            purchaseData.total_amount,
            purchaseData.net_amount,
            purchaseData.paid_amount,
            purchaseData.payment_method,
            purchaseData.payment_status,
            purchaseData.status,
            purchaseData.notes,
            purchaseData.created_by
          );

          const purchaseId = purchaseResult.lastInsertRowid;

          // Create purchase item record
          dbInstance.prepare(`
            INSERT INTO purchase_items (
              purchase_id, product_id, quantity, price, total, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).run(
            purchaseId,
            productId,
            current_stock,
            purchase_price,
            purchase_price * current_stock,
            'Initial inventory purchase'
          );

          // Product-supplier relationship already created above

          // Recreate the trigger with a fixed version that doesn't reference remaining_amount
          try {
            dbInstance.prepare(`
              CREATE TRIGGER IF NOT EXISTS update_supplier_balance_on_purchase
              AFTER INSERT ON purchases
              BEGIN
                UPDATE suppliers 
                SET current_balance = current_balance + (NEW.total_amount - NEW.paid_amount),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = NEW.supplier_id;
              END
            `).run();
            logger.info('Recreated supplier balance trigger with fix');
          } catch (e) {
            logger.warn('Could not recreate trigger:', e.message);
          }

          logger.info(`Auto-created purchase record for product ${name}:`, {
            productId,
            purchaseId,
            quantity: current_stock,
            supplierId: data.supplier_id,
            totalAmount: purchaseData.total_amount,
            paidAmount: purchaseData.paid_amount
          });
        } catch (purchaseError) {
          logger.error('Error creating auto-purchase:', purchaseError);
          // Don't fail the product creation if purchase creation fails
        }
      } else if (current_stock > 0 && !data.supplier_id) {
        // Product has stock but no supplier - add to inventory without purchase process
        logger.info('Product has stock but no supplier - adding to inventory without purchase process:', { 
          productId, 
          name, 
          current_stock 
        });
        
        // Create inventory movement record for the initial stock
        try {
          const movementResult = dbInstance.prepare(`
            INSERT INTO inventory_movements (
              product_id, movement_type, quantity, previous_stock, new_stock,
              reference_type, reference_id, unit_cost, total_value, notes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            productId,
            'adjustment',
            current_stock,
            0,
            current_stock,
            'adjustment',
            null,
            purchase_price,
            purchase_price * current_stock,
            `إضافة مخزون أولي بدون عملية شراء - ${name}`,
            1 // Default admin user
          );
          
          logger.info('Created initial inventory movement without purchase:', { 
            productId, 
            quantity: current_stock,
            movementId: movementResult.lastInsertRowid 
          });
          
          // Verify the movement was created
          const createdMovement = dbInstance.prepare(`
            SELECT * FROM inventory_movements WHERE id = ?
          `).get(movementResult.lastInsertRowid);
          
          if (createdMovement) {
            logger.info('Inventory movement verified and created successfully:', {
              movementId: createdMovement.id,
              productId: createdMovement.product_id,
              movementType: createdMovement.movement_type,
              quantity: createdMovement.quantity,
              referenceType: createdMovement.reference_type
            });
          } else {
            logger.warn('Inventory movement was not found after creation');
          }
        } catch (movementError) {
          logger.error('Error creating inventory movement:', movementError);
          logger.error('Movement creation details:', {
            productId,
            movement_type: 'adjustment',
            quantity: current_stock,
            reference_type: 'adjustment',
            error: movementError.message,
            code: movementError.code
          });
          // Don't fail the product creation if movement creation fails
        }
      }

      // Invalidate all related caches
      cacheService.invalidatePattern('inventory:products:*');
      cacheService.invalidatePattern('inventory:product:*');
      cacheService.invalidatePattern('inventory:pos:*');
      cacheService.invalidatePattern('inventory:mostSold:*');
      cacheService.invalidatePattern('inventory:barcode:*');
      cacheService.del('inventory:all_products');
      cacheService.del('inventory:barcode_index');
      logger.debug('Cache invalidated for product creation');
      
      return this.getProductById(productId);
    } catch (err) {
      logger.error('Error creating product:', err);
      throw err;
    }
  }

  updateProduct(id, data) {
    try {
      // Ensure database connection is open
      const dbInstance = database.reconnect();
      const {
        name,
        description,
        scientific_name,
        sku,
        supported,
        barcode,
        purchase_price,
        selling_price,
        wholesale_price,
        company_name,
        current_stock,
        min_stock,
        unit,
        expiry_date,
        units_per_box,
        category_id,
        stock_id,
        location_in_stock,
        shelf_number,
        rack_number,
        bin_number
      } = data;

      // Check if product exists
      const existing = dbInstance.prepare('SELECT * FROM products WHERE id = ?').get(id);
      if (!existing) {
        throw new Error('Product not found');
      }

      // Check if SKU is being changed and already exists
      if (sku !== existing.sku) {
        const existingSku = dbInstance.prepare('SELECT id FROM products WHERE sku = ? AND id != ?').get(sku, id);
        if (existingSku) {
          throw new Error('SKU already exists');
        }
      }

      // Check if barcode is being changed and already exists
      if (barcode !== existing.barcode) {
        const existingBarcode = dbInstance.prepare('SELECT id FROM products WHERE barcode = ? AND id != ?').get(barcode, id);
        if (existingBarcode) {
          throw new Error('Barcode already exists');
        }
      }

      // Update the product
      dbInstance.prepare(`
         UPDATE products SET
           name = ?,
           description = ?,
           scientific_name = ?,
           sku = ?,
           supported = ?,
           barcode = ?,
           purchase_price = ?,
           selling_price = ?,
           wholesale_price = ?,
           company_name = ?,
           current_stock = ?,
           min_stock = ?,
           unit = ?,
           expiry_date = ?,
           units_per_box = ?,
           category_id = ?,
           stock_id = ?,
           location_in_stock = ?,
           shelf_number = ?,
           rack_number = ?,
           bin_number = ?,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
       `).run(
         name ?? existing.name,
         description ?? existing.description,
         scientific_name ?? existing.scientific_name,
         sku ?? existing.sku,
         (supported !== undefined ? (supported ? 1 : 0) : (existing.supported ? 1 : 0)),
         barcode ?? existing.barcode,
         purchase_price ?? existing.purchase_price,
         selling_price ?? existing.selling_price,
         wholesale_price ?? existing.wholesale_price,
         company_name ?? existing.company_name,
         current_stock ?? existing.current_stock,
         min_stock ?? existing.min_stock,
         unit ?? existing.unit,
         expiry_date ?? existing.expiry_date,
         units_per_box ?? existing.units_per_box,
         category_id ?? existing.category_id,
         stock_id ?? existing.stock_id,
         location_in_stock ?? existing.location_in_stock,
         shelf_number ?? existing.shelf_number,
         rack_number ?? existing.rack_number,
         bin_number ?? existing.bin_number,
         id
       );

      // Invalidate all related caches
      cacheService.invalidatePattern('inventory:products:*');
      cacheService.invalidatePattern('inventory:product:*');
      cacheService.invalidatePattern('inventory:pos:*');
      cacheService.invalidatePattern('inventory:mostSold:*');
      cacheService.invalidatePattern('inventory:barcode:*');
      cacheService.del('inventory:all_products');
      cacheService.del('inventory:barcode_index');
      logger.debug('Cache invalidated for product update');
      
      return this.getProductById(id);
    } catch (err) {
      logger.error('Error updating product:', err);
      throw err;
    }
  }

  generateMonthlyInventoryReport(year, month) {
    try {
      const dbInstance = database.reconnect();
      
      // Calculate start and end dates for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // Get inventory snapshot at the beginning of the month
      // For now, we'll use current inventory as beginning inventory since we don't have historical snapshots
      const beginningInventory = dbInstance.prepare(`
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.barcode,
          p.supported,
          p.unit,
          p.purchase_price,
          p.selling_price,
          p.wholesale_price,
          p.company_name,
          p.category_id,
          COALESCE(p.current_stock, 0) as stock_quantity,
          (COALESCE(p.current_stock, 0) * p.purchase_price) as stock_value
        FROM products p
        WHERE p.created_at < ?
        ORDER BY p.name
      `).all(startDateStr);
      
      // Get inventory movements during the month
      let movements = [];
      try {
        movements = dbInstance.prepare(`
          SELECT 
            im.product_id,
            im.movement_type,
            im.quantity,
            im.previous_stock,
            im.new_stock,
            im.created_at,
            p.name as product_name,
            p.sku,
            p.barcode,
            p.supported,
            p.unit,
            p.purchase_price,
            p.selling_price,
            p.wholesale_price,
            p.company_name,
            p.category_id
          FROM inventory_movements im
          JOIN products p ON im.product_id = p.id
          WHERE im.created_at BETWEEN ? AND ?
          ORDER BY im.created_at
        `).all(startDateStr, endDateStr);
      } catch (movementError) {
        logger.warn('inventory_movements table not found, using empty movements array');
        movements = [];
      }

      // Get sales data from sales table
      let salesMovements = [];
      try {
        salesMovements = dbInstance.prepare(`
          SELECT 
            si.product_id,
            'sale' as movement_type,
            si.quantity,
            0 as previous_stock,
            0 as new_stock,
            s.invoice_date as created_at,
            p.name as product_name,
            p.sku,
            p.barcode,
            p.supported,
            p.unit,
            p.purchase_price,
            p.selling_price,
            p.wholesale_price,
            p.company_name,
            p.category_id
          FROM sale_items si
          JOIN sales s ON si.sale_id = s.id
          JOIN products p ON si.product_id = p.id
          WHERE s.invoice_date BETWEEN ? AND ?
            AND s.status = 'completed'
          ORDER BY s.invoice_date
        `).all(startDateStr, endDateStr);
        
        // Add sales movements to the main movements array
        movements = [...movements, ...salesMovements];
      } catch (salesError) {
        logger.warn('sales table not found for sales data');
      }
      
      // Get ending inventory
      const endingInventory = dbInstance.prepare(`
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.barcode,
          p.unit,
          p.purchase_price,
          p.selling_price,
          p.wholesale_price,
          p.company_name,
          p.category_id,
          COALESCE(p.current_stock, 0) as stock_quantity,
          (COALESCE(p.current_stock, 0) * p.purchase_price) as stock_value
        FROM products p
        ORDER BY p.name
      `).all();
      
      // Calculate summary statistics
      const summary = {
        total_products: endingInventory.length,
        total_stock_value: endingInventory.reduce((sum, item) => sum + item.stock_value, 0),
        low_stock_products: endingInventory.filter(item => item.stock_quantity <= 10 && item.stock_quantity > 0).length,
        out_of_stock_products: endingInventory.filter(item => item.stock_quantity === 0).length,
        total_movements: movements.length,
        purchases_count: movements.filter(m => m.movement_type === 'purchase').length,
        sales_count: movements.filter(m => m.movement_type === 'sale').length,
        adjustments_count: movements.filter(m => m.movement_type === 'adjustment').length,
        returns_count: movements.filter(m => m.movement_type === 'return').length
      };
      
      // English month names mapping
      const englishMonthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      return {
        period: {
          type: 'monthly',
          year,
          month,
          start_date: startDateStr,
          end_date: endDateStr,
          month_name: `${englishMonthNames[month - 1]} ${year}`
        },
        beginning_inventory: beginningInventory,
        movements,
        ending_inventory: endingInventory,
        current_inventory: endingInventory,
        summary
      };
    } catch (err) {
      logger.error('Error generating monthly inventory report:', err);
      throw new Error('Failed to generate monthly inventory report');
    }
  }

  generateYearlyInventoryReport(year) {
    try {
      const dbInstance = database.reconnect();
      
      // English month names mapping
      const englishMonthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      // Calculate start and end dates for the year
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // Get monthly breakdown
      const monthlyBreakdown = [];
      for (let month = 1; month <= 12; month++) {
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0, 23, 59, 59);
        const monthStartStr = monthStart.toISOString().split('T')[0];
        const monthEndStr = monthEnd.toISOString().split('T')[0];
        
        // Get inventory movements for this month (if stock_movements table exists)
        let monthMovements = [];
        try {
          monthMovements = dbInstance.prepare(`
            SELECT 
              sm.movement_type,
              COUNT(*) as count,
              SUM(sm.quantity) as total_quantity
            FROM stock_movements sm
            WHERE sm.created_at BETWEEN ? AND ?
            GROUP BY sm.movement_type
          `).all(monthStartStr, monthEndStr);
        } catch (movementError) {
          logger.warn('stock_movements table not found for monthly breakdown');
          monthMovements = [];
        }

        // Get sales data for this month
        try {
          const monthSales = dbInstance.prepare(`
            SELECT 
              'sale' as movement_type,
              COUNT(*) as count,
              SUM(si.quantity) as total_quantity
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            WHERE s.invoice_date BETWEEN ? AND ?
              AND s.status = 'completed'
          `).get(monthStartStr, monthEndStr);
          
          if (monthSales && monthSales.count > 0) {
            monthMovements.push(monthSales);
          }
        } catch (salesError) {
          logger.warn('sales table not found for monthly sales data');
        }
        
        // Get ending inventory for this month (products that existed at the end of this month)
        // For now, we'll use current inventory since we don't have historical snapshots
        // In a real system, you would calculate this based on movements up to that month
        const monthEndingInventory = dbInstance.prepare(`
          SELECT 
            COUNT(*) as total_products,
            SUM(COALESCE(p.current_stock, 0)) as total_stock,
            SUM(COALESCE(p.current_stock, 0) * p.purchase_price) as total_value,
            COUNT(CASE WHEN p.current_stock <= 10 AND p.current_stock > 0 THEN 1 END) as low_stock,
            COUNT(CASE WHEN p.current_stock = 0 THEN 1 END) as out_of_stock
          FROM products p
          WHERE p.created_at <= ?
        `).get(monthEndStr);
        
        monthlyBreakdown.push({
          month,
          month_name: englishMonthNames[month - 1],
          movements: monthMovements,
          inventory: monthEndingInventory
        });
      }
      
      // Get yearly summary
      let yearlyMovements = [];
      try {
        yearlyMovements = dbInstance.prepare(`
          SELECT 
            im.movement_type,
            COUNT(*) as count,
            SUM(im.quantity) as total_quantity
          FROM inventory_movements im
          WHERE im.created_at BETWEEN ? AND ?
          GROUP BY im.movement_type
        `).all(startDateStr, endDateStr);
      } catch (movementError) {
        logger.warn('inventory_movements table not found for yearly summary');
        yearlyMovements = [];
      }

      // Get yearly sales data
      try {
        const yearlySales = dbInstance.prepare(`
          SELECT 
            'sale' as movement_type,
            COUNT(*) as count,
            SUM(si.quantity) as total_quantity
          FROM sale_items si
          JOIN sales s ON si.sale_id = s.id
          WHERE s.invoice_date BETWEEN ? AND ?
            AND s.status = 'completed'
        `).get(startDateStr, endDateStr);
        
        if (yearlySales && yearlySales.count > 0) {
          yearlyMovements.push(yearlySales);
        }
      } catch (salesError) {
        logger.warn('sales table not found for yearly sales data');
      }
      
      const yearlyEndingInventory = dbInstance.prepare(`
        SELECT 
          COUNT(*) as total_products,
          SUM(COALESCE(p.current_stock, 0)) as total_stock,
          SUM(COALESCE(p.current_stock, 0) * p.purchase_price) as total_value,
          COUNT(CASE WHEN p.current_stock <= 10 AND p.current_stock > 0 THEN 1 END) as low_stock,
          COUNT(CASE WHEN p.current_stock = 0 THEN 1 END) as out_of_stock
        FROM products p
        WHERE p.created_at <= ?
      `).get(endDateStr);
      
              // Get current inventory for the report
        const currentInventory = dbInstance.prepare(`
          SELECT 
            p.id,
            p.name,
            p.sku,
            p.barcode,
            p.supported,
            p.unit,
            p.purchase_price,
            p.selling_price,
            p.wholesale_price,
            p.company_name,
              p.category_id,
            COALESCE(p.current_stock, 0) as stock_quantity,
            (COALESCE(p.current_stock, 0) * p.purchase_price) as stock_value
          FROM products p
          ORDER BY p.name
        `).all();

        // Get top products by movement (including sales)
        let topProductsByMovement = [];
        try {
          // First get inventory movements
          const stockMovements = dbInstance.prepare(`
            SELECT 
              p.id,
              p.name,
              p.sku,
              p.barcode,
              p.supported,
              COUNT(im.id) as movement_count,
              SUM(CASE WHEN im.movement_type = 'purchase' THEN im.quantity ELSE 0 END) as total_purchased,
              0 as total_sold,
              SUM(CASE WHEN im.movement_type = 'adjustment' THEN im.quantity ELSE 0 END) as total_adjusted,
              p.current_stock,
              p.company_name,
              p.category_id
            FROM products p
            LEFT JOIN inventory_movements im ON p.id = im.product_id 
              AND im.created_at BETWEEN ? AND ?
            GROUP BY p.id, p.name, p.sku, p.barcode, p.current_stock
          `).all(startDateStr, endDateStr);

          // Then get sales data
          const salesData = dbInstance.prepare(`
            SELECT 
              p.id,
              p.supported,
              SUM(si.quantity) as total_sold,
              p.company_name,
              p.category_id
            FROM products p
            LEFT JOIN sale_items si ON p.id = si.product_id
            LEFT JOIN sales s ON si.sale_id = s.id
            WHERE s.invoice_date BETWEEN ? AND ?
              AND s.status = 'completed'
            GROUP BY p.id
          `).all(startDateStr, endDateStr);

          // Combine the data
          const salesMap = new Map();
          salesData.forEach(sale => {
            salesMap.set(sale.id, sale.total_sold);
          });

          topProductsByMovement = stockMovements.map(product => ({
            ...product,
            total_sold: salesMap.get(product.id) || 0,
            movement_count: product.movement_count + (salesMap.get(product.id) ? 1 : 0)
          })).sort((a, b) => b.movement_count - a.movement_count).slice(0, 20);

        } catch (movementError) {
          logger.warn('Error getting top products data:', movementError);
          topProductsByMovement = [];
        }
      
              // Create summary for yearly report
        const summary = {
          total_products: yearlyEndingInventory?.total_products || 0,
          total_stock_value: yearlyEndingInventory?.total_value || 0,
          low_stock_products: yearlyEndingInventory?.low_stock || 0,
          out_of_stock_products: yearlyEndingInventory?.out_of_stock || 0,
          total_movements: yearlyMovements.reduce((sum, m) => sum + (m.count || 0), 0),
          purchases_count: yearlyMovements.find(m => m.movement_type === 'purchase')?.count || 0,
          sales_count: yearlyMovements.find(m => m.movement_type === 'sale')?.count || 0,
          adjustments_count: yearlyMovements.find(m => m.movement_type === 'adjustment')?.count || 0,
          returns_count: yearlyMovements.find(m => m.movement_type === 'return')?.count || 0
        };

        return {
          period: {
            type: 'yearly',
            year,
            start_date: startDateStr,
            end_date: endDateStr
          },
          monthly_breakdown: monthlyBreakdown,
          yearly_summary: {
            movements: yearlyMovements,
            inventory: yearlyEndingInventory
          },
          top_products: topProductsByMovement,
          current_inventory: currentInventory,
          summary
        };
    } catch (err) {
      logger.error('Error generating yearly inventory report:', err);
      throw new Error('Failed to generate yearly inventory report');
    }
  }

  generateInventoryReport(startDate, endDate, reportType = 'custom') {
    try {
      const dbInstance = database.reconnect();
      
      const startDateStr = new Date(startDate).toISOString().split('T')[0];
      const endDateStr = new Date(endDate).toISOString().split('T')[0];
      
      // Get inventory movements in the period
      let movements = [];
      try {
        movements = dbInstance.prepare(`
          SELECT 
            im.product_id,
            im.movement_type,
            im.quantity,
            im.previous_stock,
            im.new_stock,
            im.created_at,
            p.name as product_name,
            p.sku,
            p.barcode,
            p.supported,
            p.unit,
            p.purchase_price,
            p.selling_price,
            p.wholesale_price,
            p.company_name,
            p.category_id
          FROM inventory_movements im
          JOIN products p ON im.product_id = p.id
          WHERE im.created_at BETWEEN ? AND ?
          ORDER BY im.created_at
        `).all(startDateStr, endDateStr);
      } catch (movementError) {
        logger.warn('inventory_movements table not found, using empty movements array');
        movements = [];
      }

      // Get sales data from sales table
      let salesMovements = [];
      try {
        salesMovements = dbInstance.prepare(`
          SELECT 
            si.product_id,
            'sale' as movement_type,
            si.quantity,
            0 as previous_stock,
            0 as new_stock,
            s.invoice_date as created_at,
            p.name as product_name,
            p.sku,
            p.barcode,
            p.supported,
            p.unit,
            p.purchase_price,
            p.selling_price,
            p.wholesale_price,
            p.company_name,
            p.category_id
          FROM sale_items si
          JOIN sales s ON si.sale_id = s.id
          JOIN products p ON si.product_id = p.id
          WHERE s.invoice_date BETWEEN ? AND ?
            AND s.status = 'completed'
          ORDER BY s.invoice_date
        `).all(startDateStr, endDateStr);
        
        // Add sales movements to the main movements array
        movements = [...movements, ...salesMovements];
      } catch (salesError) {
        logger.warn('sales table not found for sales data');
      }
      
      // Get current inventory
      const currentInventory = dbInstance.prepare(`
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.barcode,
          p.supported,
          p.unit,
          p.purchase_price,
          p.selling_price,
          p.wholesale_price,
          p.company_name,
          p.category_id,
          COALESCE(p.current_stock, 0) as stock_quantity,
          (COALESCE(p.current_stock, 0) * p.purchase_price) as stock_value
        FROM products p
        ORDER BY p.name
      `).all();
      
      // Calculate summary
      const summary = {
        total_products: currentInventory.length,
        total_stock_value: currentInventory.reduce((sum, item) => sum + item.stock_value, 0),
        low_stock_products: currentInventory.filter(item => item.stock_quantity <= 10 && item.stock_quantity > 0).length,
        out_of_stock_products: currentInventory.filter(item => item.stock_quantity === 0).length,
        total_movements: movements.length,
        purchases_count: movements.filter(m => m.movement_type === 'purchase').length,
        sales_count: movements.filter(m => m.movement_type === 'sale').length,
        adjustments_count: movements.filter(m => m.movement_type === 'adjustment').length,
        returns_count: movements.filter(m => m.movement_type === 'return').length
      };
      
      return {
        period: {
          type: reportType,
          start_date: startDateStr,
          end_date: endDateStr
        },
        movements,
        current_inventory: currentInventory,
        summary
      };
    } catch (err) {
      logger.error('Error generating inventory report:', err);
      throw new Error('Failed to generate inventory report');
    }
  }

  // Optimized method for POS with pagination and field selection
  getForPOS({ page = 1, limit = 100, search, category, fields }) {
    try {
      // Generate cache key for POS products
      const cacheKey = `inventory:pos:${JSON.stringify({ page, limit, search, category, fields })}`;
      
      // Try to get from cache first
      const cached = cacheService.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for POS products`);
        return cached;
      }
      
      const dbInstance = database.reconnect();
      const offset = (page - 1) * limit;
      
      // Select only essential fields for POS if specified
      const selectFields = fields ? 
        fields.split(',').map(f => 'p.' + f.trim()).join(', ') : 
        'p.id, p.name, p.sku, p.barcode, p.selling_price, p.wholesale_price, p.current_stock, p.unit, p.min_stock, p.supported, p.units_per_box, p.category_id, p.is_dolar';
      
      let query = `
        SELECT ${selectFields}
        FROM products p
        WHERE 1=1
      `;
      const values = [];
      
      // Add search filter
      if (search) {
        query += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)`;
        const searchPattern = `%${search}%`;
        values.push(searchPattern, searchPattern, searchPattern);
      }
      
      // Add category filter
      if (category && category !== 'all') {
        query += ` AND p.category_id = ?`;
        values.push(category);
      }
      
      // Add ordering and pagination
      query += ` ORDER BY p.name ASC LIMIT ? OFFSET ?`;
      values.push(limit, offset);
      
      const products = dbInstance.prepare(query).all(values);
      
      // Get total count for pagination
      let countQuery = `SELECT COUNT(*) as total FROM products p WHERE 1=1`;
      const countValues = [];
      
      if (search) {
        countQuery += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)`;
        const searchPattern = `%${search}%`;
        countValues.push(searchPattern, searchPattern, searchPattern);
      }
      
      if (category && category !== 'all') {
        countQuery += ` AND p.category_id = ?`;
        countValues.push(category);
      }
      
      const totalResult = dbInstance.prepare(countQuery).get(countValues);
      const total = totalResult ? totalResult.total : 0;
      const hasMore = (page * limit) < total;
      
      const result = {
        products,
        total,
        hasMore,
        page,
        limit
      };
      
      // Cache the POS products for 2 minutes
      cacheService.set(cacheKey, result, 120);
      logger.debug(`Cache set for POS products`);
      
      return result;
    } catch (err) {
      logger.error('Get products for POS error:', err);
      logger.error('Error details:', { 
        message: err.message, 
        code: err.code,
        sql: err.sql 
      });
      throw new Error(`Failed to fetch products: ${err.message}`);
    }
  }

  // Get product references for deletion check
  getProductReferences(id) {
    try {
      const dbInstance = database.reconnect();
      
      // Get the product first
      const product = dbInstance.prepare(`
        SELECT id, name, sku FROM products WHERE id = ?
      `).get(id);
      
      if (!product) {
        throw new Error('Product not found');
      }
      
      const references = {};
      let totalReferences = 0;
      
      // Check sales references
      try {
        const salesCount = dbInstance.prepare(`
          SELECT COUNT(*) as count FROM sale_items WHERE product_id = ?
        `).get(id);
        if (salesCount && salesCount.count > 0) {
          references.sales = salesCount.count;
          totalReferences += salesCount.count;
        }
      } catch (err) {
        // Sales table might not exist
        logger.warn('sales table not found for reference check');
      }
      
      // Check purchase references
      try {
        const purchaseCount = dbInstance.prepare(`
          SELECT COUNT(*) as count FROM purchase_items WHERE product_id = ?
        `).get(id);
        if (purchaseCount && purchaseCount.count > 0) {
          references.purchases = purchaseCount.count;
          totalReferences += purchaseCount.count;
        }
      } catch (err) {
        // Purchase table might not exist
        logger.warn('purchase_items table not found for reference check');
      }
      
      // Check inventory movements references
      try {
        const movementCount = dbInstance.prepare(`
          SELECT COUNT(*) as count FROM inventory_movements WHERE product_id = ?
        `).get(id);
        if (movementCount && movementCount.count > 0) {
          references.movements = movementCount.count;
          totalReferences += movementCount.count;
        }
      } catch (err) {
        // Inventory movements table might not exist
        logger.warn('inventory_movements table not found for reference check');
      }
      
      // Check debt references (if debts table exists)
      try {
        const debtCount = dbInstance.prepare(`
          SELECT COUNT(*) as count FROM debts WHERE product_id = ?
        `).get(id);
        if (debtCount && debtCount.count > 0) {
          references.debts = debtCount.count;
          totalReferences += debtCount.count;
        }
      } catch (err) {
        // Debts table might not exist
        logger.warn('debts table not found for reference check');
      }
      
      return {
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku
        },
        references,
        totalReferences,
        canDelete: totalReferences === 0
      };
    } catch (err) {
      logger.error('Error getting product references:', err);
      throw new Error('Failed to get product references');
    }
  }

  // Delete product with references (force delete)
  deleteProductWithReferences(id) {
    try {
      const dbInstance = database.reconnect();
      
      // Get product info first
      const product = dbInstance.prepare('SELECT id, name FROM products WHERE id = ?').get(id);
      if (!product) {
        throw new Error('Product not found');
      }

      // Delete all references first
      try {
        // Delete from sale_items
        dbInstance.prepare('DELETE FROM sale_items WHERE product_id = ?').run(id);
      } catch (err) {
        logger.warn('sale_items table not found or error deleting:', err.message);
      }

      try {
        // Delete from purchase_items
        dbInstance.prepare('DELETE FROM purchase_items WHERE product_id = ?').run(id);
      } catch (err) {
        logger.warn('purchase_items table not found or error deleting:', err.message);
      }

      try {
        // Delete from inventory_movements
        dbInstance.prepare('DELETE FROM inventory_movements WHERE product_id = ?').run(id);
      } catch (err) {
        logger.warn('inventory_movements table not found or error deleting:', err.message);
      }

      try {
        // Delete from debts
        dbInstance.prepare('DELETE FROM debts WHERE product_id = ?').run(id);
      } catch (err) {
        logger.warn('debts table not found or error deleting:', err.message);
      }

      try {
        // Delete from product_suppliers
        dbInstance.prepare('DELETE FROM product_suppliers WHERE product_id = ?').run(id);
      } catch (err) {
        logger.warn('product_suppliers table not found or error deleting:', err.message);
      }

      // Finally delete the product
      const result = dbInstance.prepare('DELETE FROM products WHERE id = ?').run(id);
      
      if (result.changes === 0) {
        throw new Error('Failed to delete product');
      }

      logger.info(`Force deleted product ${product.name} (ID: ${id}) with all references`);
      return { changes: result.changes, productName: product.name };
    } catch (err) {
      logger.error('Error deleting product with references:', err);
      throw err;
    }
  }

  // Delete product (safe delete - only if no references)
  deleteProduct(id) {
    try {
      const dbInstance = database.reconnect();
      
      // Get product info first
      const product = dbInstance.prepare('SELECT id, name FROM products WHERE id = ?').get(id);
      if (!product) {
        throw new Error('Product not found');
      }

      // Check for references using the same database connection
      const references = {};
      let totalReferences = 0;
      
      // Check sales references
      try {
        const salesCount = dbInstance.prepare('SELECT COUNT(*) as count FROM sale_items WHERE product_id = ?').get(id);
        if (salesCount && salesCount.count > 0) {
          references.sales = salesCount.count;
          totalReferences += salesCount.count;
        }
      } catch (err) {
        logger.warn('sale_items table not found for reference check');
      }
      
      // Check purchase references
      try {
        const purchaseCount = dbInstance.prepare('SELECT COUNT(*) as count FROM purchase_items WHERE product_id = ?').get(id);
        if (purchaseCount && purchaseCount.count > 0) {
          references.purchases = purchaseCount.count;
          totalReferences += purchaseCount.count;
        }
      } catch (err) {
        logger.warn('purchase_items table not found for reference check');
      }
      
      // Check inventory movements references
      try {
        const movementCount = dbInstance.prepare('SELECT COUNT(*) as count FROM inventory_movements WHERE product_id = ?').get(id);
        if (movementCount && movementCount.count > 0) {
          references.movements = movementCount.count;
          totalReferences += movementCount.count;
        }
      } catch (err) {
        logger.warn('inventory_movements table not found for reference check');
      }
      
      // Check debt references
      try {
        const debtCount = dbInstance.prepare('SELECT COUNT(*) as count FROM debts WHERE product_id = ?').get(id);
        if (debtCount && debtCount.count > 0) {
          references.debts = debtCount.count;
          totalReferences += debtCount.count;
        }
      } catch (err) {
        logger.warn('debts table not found for reference check');
      }

      if (totalReferences > 0) {
        throw new Error(`Cannot delete product: ${totalReferences} references found`);
      }

      // Delete the product
      const result = dbInstance.prepare('DELETE FROM products WHERE id = ?').run(id);
      
      if (result.changes === 0) {
        throw new Error('Failed to delete product');
      }

      logger.info(`Safely deleted product ${product.name} (ID: ${id})`);
      
      // Invalidate all related caches
      cacheService.invalidatePattern('inventory:products:*');
      cacheService.invalidatePattern('inventory:product:*');
      cacheService.invalidatePattern('inventory:pos:*');
      cacheService.invalidatePattern('inventory:mostSold:*');
      cacheService.invalidatePattern('inventory:barcode:*');
      cacheService.del('inventory:all_products');
      cacheService.del('inventory:barcode_index');
      logger.debug('Cache invalidated for product deletion');
      
      return { changes: result.changes, productName: product.name };
    } catch (err) {
      logger.error('Error deleting product:', err);
      throw err;
    }
  }

  // Get most sold products for dashboard
  getMostSoldProducts({ limit = 5, period = 'month' }) {
    try {
      // Generate cache key for most sold products
      const cacheKey = `inventory:mostSold:${limit}:${period}`;
      
      // Try to get from cache first
      const cached = cacheService.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for most sold products: ${period}`);
        return cached;
      }
      
      const dbInstance = database.reconnect();
      
      // Build date filter based on period
      let dateFilter = '';
      const now = new Date();
      
      switch (period) {
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter = `AND s.created_at >= '${weekAgo.toISOString()}'`;
          break;
        case 'month':
          const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
          dateFilter = `AND s.created_at >= '${monthAgo.toISOString()}'`;
          break;
        case 'year':
          const yearAgo = new Date(now.getFullYear(), 0, 1);
          dateFilter = `AND s.created_at >= '${yearAgo.toISOString()}'`;
          break;
        case 'all':
        default:
          dateFilter = '';
          break;
      }
      
      // First, let's check if we have any sales data
      const salesCount = dbInstance.prepare('SELECT COUNT(*) as count FROM sales').get();
      logger.info(`Total sales records: ${salesCount.count}`);
      
      // If no sales data, return empty array
      if (salesCount.count === 0) {
        logger.info('No sales data found, returning empty array');
        return [];
      }
      
      const query = `
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.barcode,
          p.selling_price,
          p.wholesale_price,
          p.company_name,
          p.category_id,
          p.current_stock,
          p.unit,
          COALESCE(SUM(si.quantity), 0) as total_sold,
          COALESCE(COUNT(DISTINCT s.id), 0) as sales_count,
          COALESCE(SUM(si.quantity * si.price), 0) as total_revenue
        FROM products p
        LEFT JOIN sale_items si ON p.id = si.product_id
        LEFT JOIN sales s ON si.sale_id = s.id
        WHERE p.is_active = 1
        ${dateFilter}
        GROUP BY p.id
        HAVING total_sold > 0
        ORDER BY total_sold DESC
        LIMIT ?
      `;
      
      logger.info(`Executing query with limit: ${limit}, period: ${period}, dateFilter: ${dateFilter}`);
      const products = dbInstance.prepare(query).all(limit);
      logger.info(`Found ${products.length} products with sales data`);
      
      const result = products.map(product => ({
        ...product,
        stock: product.current_stock,
        average_price: product.total_sold > 0 ? product.total_revenue / product.total_sold : 0
      }));
      
      // Cache the most sold products for 15 minutes
      cacheService.set(cacheKey, result, 900);
      logger.debug(`Cache set for most sold products: ${period}`);
      
      return result;
    } catch (err) {
      logger.error('Error getting most sold products:', err);
      throw new Error('Failed to fetch most sold products');
    }
  }

  // add category
  addCategory(name) {
    try {
      const dbInstance = database.reconnect();
      
      // Validate category name
      if (!name || name.trim().length < 2) {
        throw new Error('Category name too short');
      }
      
      if (name.trim().length > 50) {
        throw new Error('Category name too long');
      }
      
      // Check if category already exists
      const existingCategory = dbInstance.prepare('SELECT id FROM categories WHERE name = ?').get(name.trim());
      if (existingCategory) {
        throw new Error('Category already exists');
      }
      
      const category = dbInstance.prepare('INSERT INTO categories (name) VALUES (?)').run(name.trim());
      
      // Invalidate categories cache
      cacheService.del('inventory:categories');
      logger.debug('Cache invalidated for categories after adding new category');
      
      return category;
    } catch (err) {
      logger.error('Error adding category:', err);
      throw err;
    }
  }

  // edit category
  editCategory(id, name) {
    try {
      const dbInstance = database.reconnect();
      
      // Validate category name
      if (!name || name.trim().length < 2) {
        throw new Error('Category name too short');
      }
      
      if (name.trim().length > 50) {
        throw new Error('Category name too long');
      }
      
      // Check if category exists
      const existingCategory = dbInstance.prepare('SELECT id FROM categories WHERE id = ?').get(id);
      if (!existingCategory) {
        throw new Error('Category not found');
      }
      
      // Check if new name already exists (excluding current category)
      const duplicateCategory = dbInstance.prepare('SELECT id FROM categories WHERE name = ? AND id != ?').get(name.trim(), id);
      if (duplicateCategory) {
        throw new Error('Category already exists');
      }
      
      const category = dbInstance.prepare('UPDATE categories SET name = ? WHERE id = ?').run(name.trim(), id);
      
      // Invalidate categories cache
      cacheService.del('inventory:categories');
      logger.debug('Cache invalidated for categories after editing category');
      
      return category;
    } catch (err) {
      logger.error('Error editing category:', err);
      throw err;
    }
  }

  // delete category  
  deleteCategory(id) {
    try {
      const dbInstance = database.reconnect();
      
      // Check if category exists
      const existingCategory = dbInstance.prepare('SELECT id, name FROM categories WHERE id = ?').get(id);
      if (!existingCategory) {
        throw new Error('Category not found');
      }
      
      // Check if category has products
      const productCount = dbInstance.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(id);
      if (productCount && productCount.count > 0) {
        throw new Error('Category in use');
      }
      
      const category = dbInstance.prepare('DELETE FROM categories WHERE id = ?').run(id);
      
      // Invalidate categories cache
      cacheService.del('inventory:categories');
      logger.debug('Cache invalidated for categories after deleting category');
      
      return category;
    } catch (err) {
      logger.error('Error deleting category:', err);
      throw err;
    }
  }

  // get all categories
  getAllCategories() {
    try {
      // Generate cache key for categories
      const cacheKey = 'inventory:categories';
      
      // Try to get from cache first
      const cached = cacheService.get(cacheKey);
      if (cached) {
        logger.debug('Cache hit for categories');
        return cached;
      }
      
      const dbInstance = database.reconnect();
      const categories = dbInstance.prepare('SELECT * FROM categories ORDER BY name ASC').all();
      
      // Cache the categories for 30 minutes
      cacheService.set(cacheKey, categories, 1800);
      logger.debug('Cache set for categories');
      
      return categories;
    } catch (err) {
      logger.error('Error getting all categories:', err);
      throw new Error('Failed to get all categories');
    }
  }

  // Import products from XLSX file
  async importProductsFromXLSX(file) {
    const XLSX = require('xlsx');
    const fs = require('fs');
    
    try {
      logger.info('Starting XLSX import process', { 
        filename: file.originalname, 
        size: file.size 
      });

      // Read the XLSX file
      const workbook = XLSX.readFile(file.path, {
        type: 'buffer',
        cellText: false,
        cellNF: false,
        cellHTML: false,
        raw: true,
        dateNF: 'yyyy-mm-dd'
      });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with better options
      const data = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        raw: true,
        dateNF: 'yyyy-mm-dd',
        defval: null
      });
      
      if (data.length < 2) {
        throw new Error('File is empty or has no data rows');
      }

      // Get headers (first row) with better null handling
      const headers = data[0].map(header => {
        if (header === undefined || header === null) return '';
        return String(header).toLowerCase().trim();
      });
      
      logger.info('Detected headers:', headers);
      
      // Validate required headers - check for multiple possible column names
      const productNameHeaders = ['product_name', 'name', 'product name', 'product', 'اسم المنتج', 'المنتج'];
      const hasProductNameHeader = productNameHeaders.some(header => headers.includes(header));
      
      if (!hasProductNameHeader) {
        logger.error('Available headers:', headers);
        logger.error('Expected product name headers:', productNameHeaders);
        throw new Error(`Missing required product name header. Available headers: ${headers.join(', ')}. Expected one of: ${productNameHeaders.join(', ')}`);
      }

      // Get column indices - support multiple possible column names
      const productNameIndex = headers.findIndex(h => productNameHeaders.includes(h));
      const companyIndex = headers.findIndex(h => ['company', 'company_name', 'شركة', 'اسم الشركة'].includes(h));
      const priceIndex = headers.findIndex(h => ['price', 'dollar_price', 'dinar_price', 'سعر', 'السعر'].includes(h));
      const expirationIndex = headers.findIndex(h => ['expiration', 'expiry', 'expiry_date', 'expirstion', 'تاريخ الانتهاء', 'تاريخ الصلاحية'].includes(h));

      // Log which headers were found for debugging
      logger.info('Header mapping:', {
        productName: headers[productNameIndex],
        company: companyIndex >= 0 ? headers[companyIndex] : 'Not found',
        price: priceIndex >= 0 ? headers[priceIndex] : 'Not found',
        expiration: expirationIndex >= 0 ? headers[expirationIndex] : 'Not found'
      });
      
      // Log all headers for debugging
      logger.info('All detected headers:', headers);
      logger.info('First few rows of data:', data.slice(0, 3));
      
      // Log exact header matches for debugging
      logger.info('Header matching details:', {
        productNameHeaders,
        foundProductName: headers.find(h => productNameHeaders.includes(h)),
        foundCompany: headers.find(h => ['company', 'company_name', 'شركة', 'اسم الشركة'].includes(h)),
        foundPrice: headers.find(h => ['price', 'dollar_price', 'dinar_price', 'سعر', 'السعر'].includes(h)),
        foundExpiration: headers.find(h => ['expiration', 'expiry', 'expiry_date', 'expirstion', 'تاريخ الانتهاء', 'تاريخ الصلاحية'].includes(h))
      });
      
      // Log header detection results
      logger.info('Header detection results:', {
        productNameIndex,
        companyIndex,
        priceIndex,
        expirationIndex,
        productNameHeader: headers[productNameIndex],
        companyHeader: companyIndex >= 0 ? headers[companyIndex] : 'Not found',
        priceHeader: priceIndex >= 0 ? headers[priceIndex] : 'Not found',
        expirationHeader: expirationIndex >= 0 ? headers[expirationIndex] : 'Not found'
      });

      const dbInstance = database.reconnect();
      const errors = [];
      let imported = 0;
      let failed = 0;
      let total = 0;

      // Process data rows in batches for better performance
      const batchSize = 1000;
      const batches = [];
      
      for (let i = 1; i < data.length; i += batchSize) {
        batches.push(data.slice(i, i + batchSize));
      }

      logger.info(`Processing ${batches.length} batches of ${batchSize} rows each`);
      logger.info(`Total data rows to process: ${data.length - 1}`); // -1 for header

      // Get the default main stock ID once before processing
      const defaultStock = dbInstance.prepare(
        'SELECT id, name FROM stocks WHERE is_main_stock = 1 AND is_active = 1 LIMIT 1'
      ).get();
      
      const defaultStockId = defaultStock ? defaultStock.id : null;
      
      // Log default stock assignment for debugging
      logger.info(`Default stock for import: ${defaultStock ? defaultStock.name : 'No default stock found'} (ID: ${defaultStockId})`);
      
      // Check if we have a default stock
      if (!defaultStockId) {
        logger.error('No default main stock found. Cannot proceed with import.');
        throw new Error('No default main stock found. Please create a main stock first.');
      }
      
      // Limit errors to prevent memory issues
      const maxErrors = 2000; // Increased from 500 to 2000
      let errorCount = 0;

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        logger.debug(`Processing batch ${batchIndex + 1}/${batches.length}`);
        
        // Log progress every 10 batches for large imports
        if (batchIndex % 10 === 0) {
          logger.info(`Processing batch ${batchIndex + 1}/${batches.length} (${Math.round((batchIndex / batches.length) * 100)}% complete)`);
        }
        
        for (let rowIndex = 0; rowIndex < batch.length; rowIndex++) {
          const row = batch[rowIndex];
          const actualRowIndex = (batchIndex * batchSize) + rowIndex + 1; // +1 for header row
          total++;
          
          // Log every 1000th record to track progress
          if (total % 1000 === 0) {
            logger.info(`=== PROGRESS CHECK: Processed ${total} records, imported: ${imported}, failed: ${failed} ===`);
          }
          
          // Stop collecting errors if we've reached the limit
          if (errorCount >= maxErrors) {
            logger.warn(`Stopped collecting errors after ${maxErrors} errors, but continuing to process records`);
            // Don't break - continue processing but stop collecting errors
          }
          
          try {
            // Skip empty rows - check if all values are empty/null/undefined
            if (!row || row.length === 0 || row.every(cell => 
              cell === undefined || cell === null || String(cell).trim() === '')) {
              logger.debug(`Row ${actualRowIndex}: Skipping empty row`);
              continue;
            }

            // Safely extract product name
            let productName = '';
            try {
              const rawName = row[productNameIndex];
              if (rawName !== undefined && rawName !== null) {
                productName = String(rawName).trim();
              }
            } catch (nameError) {
              if (errorCount < maxErrors) {
                errors.push(`Row ${actualRowIndex}: Cannot process product name - ${nameError.message}`);
                errorCount++;
              }
              failed++;
              continue;
            }
            
            // Skip if no product name
            if (!productName || productName.length < 2) {
              logger.debug(`Row ${actualRowIndex}: Skipping empty product name`);
              continue;
            }

            // Log progress for debugging
            if (total % 1000 === 0) {
              logger.info(`Processing row ${actualRowIndex}, total processed: ${total}, imported: ${imported}, failed: ${failed}`);
            }

            // Safely extract company name
            let company = '';
            try {
              if (companyIndex >= 0) {
                const rawCompany = row[companyIndex];
                if (rawCompany !== undefined && rawCompany !== null) {
                  company = String(rawCompany).trim();
                }
              }
            } catch (companyError) {
              company = ''; // Default to empty if extraction fails
              logger.debug(`Row ${actualRowIndex}: Could not extract company name: ${companyError.message}`);
            }
            
            // Find the best price column
            let price = 0;
            try {
              if (priceIndex >= 0 && row[priceIndex] !== undefined && row[priceIndex] !== null) {
                const rawPrice = row[priceIndex];
                let priceStr = '';
                
                if (typeof rawPrice === 'number') {
                  price = rawPrice;
                } else {
                  priceStr = String(rawPrice).trim();
                  // Remove any currency symbols or commas
                  priceStr = priceStr.replace(/[^\d.-]/g, '');
                  const parsedPrice = parseFloat(priceStr);
                  if (!isNaN(parsedPrice) && parsedPrice > 0) {
                    price = parsedPrice;
                  }
                }
              }
              
              // If no price found, try other price columns
              if (price === 0) {
                const dollarPriceIndex = headers.indexOf('dollar_price');
                const dinarPriceIndex = headers.indexOf('dinar_price');
                
                if (dollarPriceIndex >= 0 && row[dollarPriceIndex] !== undefined && row[dollarPriceIndex] !== null) {
                  const rawDollarPrice = row[dollarPriceIndex];
                  if (typeof rawDollarPrice === 'number') {
                    price = rawDollarPrice;
                  } else {
                    const dollarPriceStr = String(rawDollarPrice).trim().replace(/[^\d.-]/g, '');
                    const dollarPrice = parseFloat(dollarPriceStr);
                    if (!isNaN(dollarPrice) && dollarPrice > 0) {
                      price = dollarPrice;
                    }
                  }
                } else if (dinarPriceIndex >= 0 && row[dinarPriceIndex] !== undefined && row[dinarPriceIndex] !== null) {
                  const rawDinarPrice = row[dinarPriceIndex];
                  if (typeof rawDinarPrice === 'number') {
                    price = rawDinarPrice;
                  } else {
                    const dinarPriceStr = String(rawDinarPrice).trim().replace(/[^\d.-]/g, '');
                    const dinarPrice = parseFloat(dinarPriceStr);
                    if (!isNaN(dinarPrice) && dinarPrice > 0) {
                      price = dinarPrice;
                    }
                  }
                }
              }
            } catch (priceError) {
              if (errorCount < maxErrors) {
                errors.push(`Row ${actualRowIndex}: Error parsing price value - ${priceError.message}`);
                errorCount++;
              }
              failed++;
              continue;
            }

            // Validate price
            if (price <= 0) {
              if (errorCount < maxErrors) {
                errors.push(`Row ${actualRowIndex}: Invalid or missing price value`);
                errorCount++;
              }
              failed++;
              continue;
            }

            // Parse expiration date if provided
            let expiryDate = null;
            try {
              if (expirationIndex >= 0 && row[expirationIndex] !== undefined && row[expirationIndex] !== null) {
                const rawExpiration = row[expirationIndex];
                const expirationStr = String(rawExpiration).trim();
                
                if (expirationStr && expirationStr !== '') {
                  // Handle DD/MM/YYYY format
                  let parsedDate;
                  if (expirationStr.includes('/')) {
                    const parts = expirationStr.split('/');
                    if (parts.length === 3) {
                      // Assume DD/MM/YYYY format
                      const day = parseInt(parts[0]);
                      const month = parseInt(parts[1]);
                      const year = parseInt(parts[2]);
                      
                      // Add century if year is 2 digits
                      const fullYear = year < 100 ? 2000 + year : year;
                      parsedDate = new Date(fullYear, month - 1, day);
                    } else {
                      parsedDate = new Date(expirationStr);
                    }
                  } else {
                    parsedDate = new Date(expirationStr);
                  }
                  
                  if (!isNaN(parsedDate.getTime())) {
                    expiryDate = parsedDate.toISOString().split('T')[0];
                  } else {
                    if (errorCount < maxErrors) {
                      errors.push(`Row ${actualRowIndex}: Invalid expiration date format: ${expirationStr}`);
                      errorCount++;
                    }
                    failed++;
                    continue;
                  }
                }
              }
            } catch (dateError) {
              if (errorCount < maxErrors) {
                errors.push(`Row ${actualRowIndex}: Invalid expiration date format - ${dateError.message}`);
                errorCount++;
              }
              failed++;
              continue;
            }

            // Check if product already exists (by name)
            const existingProduct = dbInstance.prepare(
              'SELECT id FROM products WHERE name = ?'
            ).get(productName);

            if (existingProduct) {
              errors.push(`Row ${actualRowIndex}: Product "${productName}" already exists`);
              failed++;
              continue;
            }

            // Generate SKU
            const sku = this.generateSKU(productName);

            // Check if SKU already exists and regenerate if needed
            let finalSku = sku;
            let skuAttempts = 0;
            while (skuAttempts < 5) {
              const existingSku = dbInstance.prepare('SELECT id FROM products WHERE sku = ?').get(finalSku);
              if (!existingSku) {
                break;
              }
              // Regenerate SKU with different random suffix
              const timestamp = Date.now().toString().slice(-6);
              const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
              const namePrefix = productName.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
              finalSku = `${namePrefix}${timestamp}${randomSuffix}`;
              skuAttempts++;
            }

            if (skuAttempts >= 5) {
              errors.push(`Row ${actualRowIndex}: Could not generate unique SKU for "${productName}"`);
              failed++;
              continue;
            }

            // Validate all data before inserting
            if (!productName || typeof productName !== 'string') {
              errors.push(`Row ${actualRowIndex}: Invalid product name`);
              failed++;
              continue;
            }

            if (typeof price !== 'number' || price <= 0) {
              errors.push(`Row ${actualRowIndex}: Invalid price value`);
              failed++;
              continue;
            }

            // Ensure all values are properly typed for SQLite
            const insertData = {
              name: String(productName || ''),
              description: '',
              sku: String(finalSku || ''),
              company_name: String(company || ''),
              purchase_price: Number(price || 0),
              selling_price: Number((price || 0) * 1.2),
              wholesale_price: Number((price || 0) * 1.1),
              current_stock: 0,
              min_stock: 0,
              unit: 'قطعة',
              units_per_box: 1,
              expiry_date: expiryDate || null,
              supported: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            // Additional validation to ensure all values are SQLite-compatible
            const validatedData = {
              name: insertData.name || '',
              description: insertData.description || '',
              sku: insertData.sku || '',
              company_name: insertData.company_name || '',
              purchase_price: isNaN(insertData.purchase_price) ? 0 : insertData.purchase_price,
              selling_price: isNaN(insertData.selling_price) ? 0 : insertData.selling_price,
              wholesale_price: isNaN(insertData.wholesale_price) ? 0 : insertData.wholesale_price,
              current_stock: 0,
              min_stock: 0,
              unit: 'قطعة',
              units_per_box: 1,
              expiry_date: insertData.expiry_date,
              supported: 1, // SQLite boolean as integer
              is_dolar: 0, // Default to 0 (false) for imports
              created_at: insertData.created_at,
              updated_at: insertData.updated_at
            };

            // Debug logging to identify problematic values
            const insertValues = [
              validatedData.name,
              validatedData.description,
              validatedData.supported,
              validatedData.sku,
              validatedData.company_name,
              validatedData.purchase_price,
              validatedData.selling_price,
              validatedData.wholesale_price,
              validatedData.current_stock,
              validatedData.min_stock,
              validatedData.unit,
              validatedData.units_per_box,
              validatedData.is_dolar,
              validatedData.expiry_date,
              defaultStockId, // Add stock_id
              validatedData.created_at,
              validatedData.updated_at
            ];

            // Log detailed information for first few problematic rows
            if (actualRowIndex <= 10) {
              logger.debug(`Row ${actualRowIndex} data check:`, {
                rawRow: row,
                productName,
                company,
                price,
                expiryDate,
                validatedData,
                defaultStockId,
                insertValues: insertValues.map((val, idx) => ({ 
                  index: idx, 
                  value: val, 
                  type: typeof val,
                  isUndefined: val === undefined,
                  isNull: val === null
                }))
              });
            }

            // Check for any undefined or problematic values
            const problematicValues = insertValues.map((value, index) => {
              if (value === undefined) {
                return { index, value, type: typeof value, field: [
                  'name', 'description', 'supported', 'sku', 'company_name',
                  'purchase_price', 'selling_price', 'wholesale_price',
                  'current_stock', 'min_stock', 'unit', 'units_per_box',
                  'is_dolar', 'expiry_date', 'stock_id', 'created_at', 'updated_at'
                ][index] };
              }
              return null;
            }).filter(Boolean);

            if (problematicValues.length > 0) {
              logger.error(`Undefined values for row ${actualRowIndex}:`, problematicValues);
              if (errorCount < maxErrors) {
                errors.push(`Row ${actualRowIndex}: Undefined values detected: ${problematicValues.map(p => p.field).join(', ')}`);
                errorCount++;
              }
              failed++;
              continue;
            }

            // Additional comprehensive type checking - made less strict
            const validateSQLiteValue = (value, name) => {
              if (value === undefined) {
                return false;
              }
              // Allow null values for optional fields
              if (value === null && ['description', 'company_name', 'expiry_date', 'stock_id'].includes(name)) {
                return true;
              }
              if (typeof value === 'number' && isNaN(value)) {
                return false;
              }
              if (typeof value === 'string' && value.length > 2000) {
                return false; // Increased limit
              }
              return true;
            };

            const validationErrors = [];
            insertValues.forEach((value, index) => {
              const fieldNames = [
                'name', 'description', 'supported', 'sku', 'company_name',
                'purchase_price', 'selling_price', 'wholesale_price',
                'current_stock', 'min_stock', 'unit', 'units_per_box',
                'is_dolar', 'expiry_date', 'stock_id', 'created_at', 'updated_at'
              ];
              
              if (!validateSQLiteValue(value, fieldNames[index])) {
                validationErrors.push(`${fieldNames[index]}: ${value} (${typeof value})`);
              }
            });

            if (validationErrors.length > 0) {
              logger.error(`Validation errors for row ${actualRowIndex}:`, validationErrors);
              logger.error(`Raw data for row ${actualRowIndex}:`, {
                productName,
                company,
                price,
                expiryDate,
                sku: finalSku
              });
              logger.error(`Validated data for row ${actualRowIndex}:`, validatedData);
              
              // Create more detailed error message with specific field info
              const firstError = validationErrors[0];
              const detailedError = `Row ${actualRowIndex}: Invalid ${firstError}`;
              if (errorCount < maxErrors) {
                errors.push(detailedError);
                errorCount++;
              }
              failed++;
              continue;
            }

            // Log stock assignment for debugging
            if (actualRowIndex <= 5) {
              logger.info(`Row ${actualRowIndex}: Assigning product "${productName}" to stock ID: ${defaultStockId} (${defaultStock ? defaultStock.name : 'No default stock found'})`);
            }
            
            // Insert product with proper null handling
            const insertStmt = dbInstance.prepare(`
              INSERT INTO products (
                name, description, supported, sku, company_name, 
                purchase_price, selling_price, wholesale_price,
                current_stock, min_stock, unit, units_per_box,
                is_dolar, expiry_date, stock_id, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            try {
              const result = insertStmt.run(...insertValues);
              
              if (result.changes > 0) {
                imported++;
                if (imported % 1000 === 0) {
                  logger.info(`Imported ${imported} products so far...`);
                }
              } else {
                failed++;
                if (errorCount < maxErrors) {
                  errors.push(`Row ${actualRowIndex}: Failed to insert product "${productName}"`);
                  errorCount++;
                }
              }
            } catch (insertError) {
              // Fallback: try with minimal required fields only
              try {
                const fallbackStmt = dbInstance.prepare(`
                  INSERT INTO products (
                    name, supported, sku, purchase_price, selling_price, wholesale_price,
                    current_stock, min_stock, unit, units_per_box, is_dolar, stock_id, created_at, updated_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                
                const fallbackValues = [
                  validatedData.name,
                  validatedData.supported,
                  validatedData.sku,
                  validatedData.purchase_price,
                  validatedData.selling_price,
                  validatedData.wholesale_price,
                  validatedData.current_stock,
                  validatedData.min_stock,
                  validatedData.unit,
                  validatedData.units_per_box,
                  validatedData.is_dolar,
                  defaultStockId, // Add stock_id
                  validatedData.created_at,
                  validatedData.updated_at
                ];
                
                const fallbackResult = fallbackStmt.run(...fallbackValues);
                
                if (fallbackResult.changes > 0) {
                  imported++;
                  if (imported % 1000 === 0) {
                    logger.info(`Imported ${imported} products so far...`);
                  }
                } else {
                  failed++;
                  if (errorCount < maxErrors) {
                    errors.push(`Row ${actualRowIndex}: Failed to insert product "${productName}" (fallback also failed)`);
                    errorCount++;
                  }
                }
              } catch (fallbackError) {
                failed++;
                if (errorCount < maxErrors) {
                  errors.push(`Row ${actualRowIndex}: SQLite binding error - ${fallbackError.message}`);
                  errorCount++;
                }
                logger.error(`SQLite binding error for row ${actualRowIndex}:`, fallbackError);
              }
            }

          } catch (rowError) {
            failed++;
            if (errorCount < maxErrors) {
              errors.push(`Row ${actualRowIndex}: ${rowError.message}`);
              errorCount++;
            }
            logger.error(`Error processing row ${actualRowIndex}:`, rowError);
          }
        }
        
        // Continue processing all batches even if error limit is reached
        // Only stop collecting errors, not the entire import process
        if (errorCount >= maxErrors) {
          logger.warn(`Error limit reached (${maxErrors}), continuing to process remaining records but not collecting more errors`);
        }
        
        // Log batch completion
        logger.info(`=== BATCH ${batchIndex + 1}/${batches.length} COMPLETED: Processed ${batch.length} rows, Total so far: ${total}, Imported: ${imported}, Failed: ${failed} ===`);
      }

      // Clean up uploaded file
      try {
        fs.unlinkSync(file.path);
      } catch (cleanupError) {
        logger.warn('Failed to cleanup uploaded file:', cleanupError);
      }

      // Invalidate cache
      cacheService.del('inventory:products');
      cacheService.del('inventory:*');

      logger.info('XLSX import completed', { 
        imported, 
        failed, 
        total, 
        errorsCount: errors.length,
        defaultStockAssigned: defaultStock ? {
          stockId: defaultStock.id,
          stockName: defaultStock.name
        } : null
      });

      // Log summary of processing
      const skippedRows = data.length - 1 - total; // -1 for header row
      logger.info('Import summary:', {
        totalRows: data.length - 1, // Exclude header
        processedRows: total,
        skippedRows,
        imported,
        failed,
        errorCount: errors.length
      });

      return {
        imported,
        failed,
        total,
        errors: errors.slice(0, 100) // Limit errors to first 100
      };

    } catch (err) {
      logger.error('Error importing products from XLSX:', err);
      
      // Clean up uploaded file on error
      try {
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (cleanupError) {
        logger.warn('Failed to cleanup uploaded file on error:', cleanupError);
      }
      
      throw err;
    }
  }

  // Generate SKU for product
  generateSKU(productName) {
    const timestamp = Date.now().toString().slice(-6);
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const namePrefix = productName.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
    return `${namePrefix}${timestamp}${randomSuffix}`;
  }
}

// Initialize cache on service load
const inventoryService = new InventoryService();

// Load all products to cache on startup
setTimeout(() => {
  try {
    inventoryService.loadAllProductsToCache();
    // Inventory cache initialized
  } catch (err) {
    logger.error('Failed to initialize inventory cache on startup:', err);
  }
}, 2000); // Wait 2 seconds for database to be ready

module.exports = inventoryService;