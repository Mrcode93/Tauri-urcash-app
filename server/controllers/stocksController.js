const { db, query, queryOne, insert, update } = require('../database/index.js');
const logger = require('../utils/logger');
const cacheService = require('../services/cacheService');

class StocksController {
  // Get all stocks
  async getAllStocks(req, res) {
    try {
      const cacheKey = 'stocks:all_stocks';
      let stocks = cacheService.get(cacheKey);
      
      if (!stocks) {
        const sqlQuery = `
          SELECT 
            s.*,
            COALESCE(
              (SELECT COUNT(DISTINCT p2.id)
               FROM products p2
               WHERE p2.is_active = 1
                 AND EXISTS (
                   SELECT 1 FROM stock_movements sm 
                   WHERE sm.product_id = p2.id 
                     AND (sm.to_stock_id = s.id OR sm.from_stock_id = s.id)
                 )
                 AND COALESCE(
                   (SELECT SUM(CASE WHEN to_stock_id = s.id THEN quantity ELSE 0 END) - SUM(CASE WHEN from_stock_id = s.id THEN quantity ELSE 0 END)
                    FROM stock_movements 
                    WHERE product_id = p2.id AND (to_stock_id = s.id OR from_stock_id = s.id)), 0
                 ) > 0
              ), 0
            ) as total_products,
            COALESCE(
              (SELECT SUM(CASE WHEN to_stock_id = s.id THEN quantity ELSE 0 END) - SUM(CASE WHEN from_stock_id = s.id THEN quantity ELSE 0 END)
               FROM stock_movements 
               WHERE to_stock_id = s.id OR from_stock_id = s.id), 0
            ) as total_stock_quantity,
            COALESCE(
              (SELECT SUM(CASE WHEN to_stock_id = s.id THEN quantity ELSE 0 END) - SUM(CASE WHEN from_stock_id = s.id THEN quantity ELSE 0 END)
               FROM stock_movements 
               WHERE to_stock_id = s.id OR from_stock_id = s.id), 0
            ) as current_capacity_used
          FROM stocks s
          WHERE s.is_active = 1
          ORDER BY s.is_main_stock DESC, s.name ASC
        `;
        
        stocks = query(sqlQuery);
        cacheService.set(cacheKey, stocks, 300); // Cache for 5 minutes
      }

      res.json({
        success: true,
        data: stocks,
        message: 'Stocks retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting all stocks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve stocks',
        error: error.message
      });
    }
  }

  // Get stock by ID
  async getStockById(req, res) {
    try {
      const { id } = req.params;
      const cacheKey = `stocks:stock:${id}`;
      let stock = cacheService.get(cacheKey);
      
      if (!stock) {
        const sqlQuery = `
          SELECT 
            s.*,
            COALESCE(
              (SELECT COUNT(DISTINCT p2.id)
               FROM products p2
               WHERE p2.is_active = 1
                 AND EXISTS (
                   SELECT 1 FROM stock_movements sm 
                   WHERE sm.product_id = p2.id 
                     AND (sm.to_stock_id = s.id OR sm.from_stock_id = s.id)
                 )
                 AND COALESCE(
                   (SELECT SUM(CASE WHEN to_stock_id = s.id THEN quantity ELSE 0 END) - SUM(CASE WHEN from_stock_id = s.id THEN quantity ELSE 0 END)
                    FROM stock_movements 
                    WHERE product_id = p2.id AND (to_stock_id = s.id OR from_stock_id = s.id)), 0
                 ) > 0
              ), 0
            ) as total_products,
            COALESCE(
              (SELECT SUM(CASE WHEN to_stock_id = s.id THEN quantity ELSE 0 END) - SUM(CASE WHEN from_stock_id = s.id THEN quantity ELSE 0 END)
               FROM stock_movements 
               WHERE to_stock_id = s.id OR from_stock_id = s.id), 0
            ) as total_stock_quantity,
            COALESCE(
              (SELECT SUM(CASE WHEN to_stock_id = s.id THEN quantity ELSE 0 END) - SUM(CASE WHEN from_stock_id = s.id THEN quantity ELSE 0 END)
               FROM stock_movements 
               WHERE to_stock_id = s.id OR from_stock_id = s.id), 0
            ) as current_capacity_used
          FROM stocks s
          WHERE s.id = ? AND s.is_active = 1
        `;
        
        stock = queryOne(sqlQuery, [id]);
        if (stock) {
          cacheService.set(cacheKey, stock, 300);
        }
      }

      if (!stock) {
        return res.status(404).json({
          success: false,
          message: 'Stock not found'
        });
      }

      res.json({
        success: true,
        data: stock,
        message: 'Stock retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting stock by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve stock',
        error: error.message
      });
    }
  }

  // Create new stock
  async createStock(req, res) {
    try {
      const {
        name, code, description, address, city, state, country,
        postal_code, phone, email, manager_name, manager_phone,
        manager_email, is_main_stock, capacity, notes
      } = req.body;

      // Validate required fields
      if (!name || !code || !address) {
        return res.status(400).json({
          success: false,
          message: 'Name, code, and address are required'
        });
      }

      // Check if code already exists
      const existingStock = queryOne('SELECT id FROM stocks WHERE code = ?', [code]);
      if (existingStock) {
        return res.status(400).json({
          success: false,
          message: 'Stock code already exists'
        });
      }

      // If this is a main stock, unset other main stocks
      if (is_main_stock) {
        update('UPDATE stocks SET is_main_stock = 0 WHERE is_main_stock = 1');
      }

      const insertSqlQuery = `
        INSERT INTO stocks (
          name, code, description, address, city, state, country,
          postal_code, phone, email, manager_name, manager_phone,
          manager_email, is_main_stock, is_active, capacity,
          current_capacity_used, notes, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      const result = insert(insertSqlQuery, [
        name, code, description, address, city, state, country,
        postal_code, phone, email, manager_name, manager_phone,
        manager_email, is_main_stock ? 1 : 0, 1, capacity || 0,
        0, notes, req.user?.id || 1
      ]);

      // Invalidate cache
      cacheService.invalidateDataType('stocks');
      cacheService.del('stocks:all_stocks');

      res.status(201).json({
        success: true,
        data: { id: result.lastInsertRowid },
        message: 'Stock created successfully'
      });
    } catch (error) {
      logger.error('Error creating stock:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create stock',
        error: error.message
      });
    }
  }

  // Update stock
  async updateStock(req, res) {
    try {
      const { id } = req.params;
      const {
        name, code, description, address, city, state, country,
        postal_code, phone, email, manager_name, manager_phone,
        manager_email, is_main_stock, capacity, notes, is_active
      } = req.body;

      // Check if stock exists
      const existingStock = queryOne('SELECT id FROM stocks WHERE id = ?', [id]);
      if (!existingStock) {
        return res.status(404).json({
          success: false,
          message: 'Stock not found'
        });
      }

      // Check if code already exists for other stocks
      if (code) {
        const duplicateCode = queryOne('SELECT id FROM stocks WHERE code = ? AND id != ?', [code, id]);
        if (duplicateCode) {
          return res.status(400).json({
            success: false,
            message: 'Stock code already exists'
          });
        }
      }

      // If this is a main stock, unset other main stocks
      if (is_main_stock) {
        update('UPDATE stocks SET is_main_stock = 0 WHERE is_main_stock = 1 AND id != ?', [id]);
      }

      const updateSqlQuery = `
        UPDATE stocks SET
          name = COALESCE(?, name),
          code = COALESCE(?, code),
          description = COALESCE(?, description),
          address = COALESCE(?, address),
          city = COALESCE(?, city),
          state = COALESCE(?, state),
          country = COALESCE(?, country),
          postal_code = COALESCE(?, postal_code),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          manager_name = COALESCE(?, manager_name),
          manager_phone = COALESCE(?, manager_phone),
          manager_email = COALESCE(?, manager_email),
          is_main_stock = COALESCE(?, is_main_stock),
          is_active = COALESCE(?, is_active),
          capacity = COALESCE(?, capacity),
          notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      update(updateSqlQuery, [
        name, code, description, address, city, state, country,
        postal_code, phone, email, manager_name, manager_phone,
        manager_email, is_main_stock ? 1 : 0, is_active !== undefined ? (is_active ? 1 : 0) : undefined,
        capacity, notes, id
      ]);

      // Invalidate cache
      cacheService.invalidateDataType('stocks');
      cacheService.del('stocks:all_stocks');
      cacheService.del(`stocks:stock:${id}`);
      cacheService.del(`stocks:stock_products:${id}`);

      res.json({
        success: true,
        message: 'Stock updated successfully'
      });
    } catch (error) {
      logger.error('Error updating stock:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update stock',
        error: error.message
      });
    }
  }

  // Delete stock
  async deleteStock(req, res) {
    try {
      const { id } = req.params;

      // Check if stock exists
      const existingStock = queryOne('SELECT id, is_main_stock FROM stocks WHERE id = ?', [id]);
      if (!existingStock) {
        return res.status(404).json({
          success: false,
          message: 'Stock not found'
        });
      }

      // Check if it's the main stock
      if (existingStock.is_main_stock) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the main stock'
        });
      }

      // Check if stock has products
      const productsCount = queryOne('SELECT COUNT(*) as count FROM products WHERE stock_id = ?', [id]);
      if (productsCount.count > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete stock that has products assigned to it'
        });
      }

      // Soft delete by setting is_active = 0
      update('UPDATE stocks SET is_active = 0 WHERE id = ?', [id]);

      // Invalidate cache
      cacheService.invalidateDataType('stocks');
      cacheService.del('stocks:all_stocks');
      cacheService.del(`stocks:stock:${id}`);
      cacheService.del(`stocks:stock_products:${id}`);

      res.json({
        success: true,
        message: 'Stock deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting stock:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete stock',
        error: error.message
      });
    }
  }

  // Get products in a specific stock
  async getStockProducts(req, res) {
    try {
      const { id } = req.params;
      const cacheKey = `stocks:stock_products:${id}`;
      let products = cacheService.get(cacheKey);
      
      if (!products) {
        const sqlQuery = `
          SELECT 
            p.*,
            c.name as category_name,
            s.name as stock_name,
            COALESCE(
              (SELECT SUM(CASE WHEN to_stock_id = ? THEN quantity ELSE 0 END) - SUM(CASE WHEN from_stock_id = ? THEN quantity ELSE 0 END)
               FROM stock_movements 
               WHERE product_id = p.id AND (to_stock_id = ? OR from_stock_id = ?)), 0
            ) as current_stock_in_stock
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          LEFT JOIN stocks s ON p.stock_id = s.id
          WHERE p.is_active = 1
            AND EXISTS (
              SELECT 1 FROM stock_movements sm 
              WHERE sm.product_id = p.id 
                AND (sm.to_stock_id = ? OR sm.from_stock_id = ?)
            )
            AND COALESCE(
              (SELECT SUM(CASE WHEN to_stock_id = ? THEN quantity ELSE 0 END) - SUM(CASE WHEN from_stock_id = ? THEN quantity ELSE 0 END)
               FROM stock_movements 
               WHERE product_id = p.id AND (to_stock_id = ? OR from_stock_id = ?)), 0
            ) > 0
          ORDER BY p.name ASC
        `;
        
        products = query(sqlQuery, [id, id, id, id, id, id, id, id, id, id]);
        cacheService.set(cacheKey, products, 300);
      }

      res.json({
        success: true,
        data: products,
        message: 'Stock products retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting stock products:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve stock products',
        error: error.message
      });
    }
  }

  // Get stock movements
  async getStockMovements(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50, movement_type } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE (from_stock_id = ? OR to_stock_id = ?)';
      let params = [id, id];

      if (movement_type) {
        whereClause += ' AND movement_type = ?';
        params.push(movement_type);
      }

      const sqlQuery = `
        SELECT 
          sm.*,
          p.name as product_name,
          p.sku as product_sku,
          fs.name as from_stock_name,
          ts.name as to_stock_name,
          u.name as created_by_name
        FROM stock_movements sm
        LEFT JOIN products p ON sm.product_id = p.id
        LEFT JOIN stocks fs ON sm.from_stock_id = fs.id
        LEFT JOIN stocks ts ON sm.to_stock_id = ts.id
        LEFT JOIN users u ON sm.created_by = u.id
        ${whereClause}
        ORDER BY sm.movement_date DESC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);

      const movements = query(sqlQuery, params);

      // Get total count
      const countSqlQuery = `
        SELECT COUNT(*) as total
        FROM stock_movements sm
        ${whereClause}
      `;
      const total = queryOne(countSqlQuery, params.slice(0, -2));

      res.json({
        success: true,
        data: movements,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total.total,
          pages: Math.ceil(total.total / limit)
        },
        message: 'Stock movements retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting stock movements:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve stock movements',
        error: error.message
      });
    }
  }

  // Get stock statistics
  async getStockStats(req, res) {
    try {
      const { id } = req.params;
      const cacheKey = `stocks:stats:${id}`;
      let stats = cacheService.get(cacheKey);
      
      if (!stats) {
        const sqlQuery = `
          SELECT 
            s.id,
            s.name,
            s.capacity,
            s.current_capacity_used,
            COUNT(p.id) as total_products,
            SUM(p.current_stock) as total_stock_quantity,
            COUNT(CASE WHEN p.current_stock <= p.min_stock THEN 1 END) as low_stock_products,
            COUNT(CASE WHEN p.current_stock = 0 THEN 1 END) as out_of_stock_products,
            COUNT(CASE WHEN p.current_stock > p.min_stock THEN 1 END) as normal_stock_products
          FROM stocks s
          LEFT JOIN products p ON s.id = p.stock_id AND p.is_active = 1
          WHERE s.id = ? AND s.is_active = 1
          GROUP BY s.id
        `;
        
        stats = queryOne(sqlQuery, [id]);
        if (stats) {
          cacheService.set(cacheKey, stats, 300);
        }
      }

      if (!stats) {
        return res.status(404).json({
          success: false,
          message: 'Stock not found'
        });
      }

      res.json({
        success: true,
        data: stats,
        message: 'Stock statistics retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting stock stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve stock statistics',
        error: error.message
      });
    }
  }

  // Add product to stock
  async addProductToStock(req, res) {
    try {
      const { id } = req.params;
      const { product_id, quantity, location_in_stock } = req.body;

      // Validate required fields
      if (!product_id || !quantity) {
        return res.status(400).json({
          success: false,
          message: 'Product ID and quantity are required'
        });
      }

      // Check if stock exists
      const stock = queryOne('SELECT id, capacity, current_capacity_used FROM stocks WHERE id = ? AND is_active = 1', [id]);
      if (!stock) {
        return res.status(404).json({
          success: false,
          message: 'Stock not found'
        });
      }

      // Check if product exists
      const product = queryOne('SELECT id, name, current_stock FROM products WHERE id = ? AND is_active = 1', [product_id]);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Check capacity if stock has capacity limit
      if (stock.capacity > 0) {
        const newCapacityUsed = stock.current_capacity_used + quantity;
        if (newCapacityUsed > stock.capacity) {
          return res.status(400).json({
            success: false,
            message: 'Adding this quantity would exceed stock capacity'
          });
        }
      }

      // Update product stock
      const newStockQuantity = product.current_stock + quantity;
      update('UPDATE products SET current_stock = ?, stock_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
        [newStockQuantity, id, product_id]);

      // Update stock capacity used
      if (stock.capacity > 0) {
        update('UPDATE stocks SET current_capacity_used = current_capacity_used + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
          [quantity, id]);
      }

      // Create stock movement record
      const movementData = {
        movement_type: 'adjustment',
        to_stock_id: id,
        product_id: product_id,
        quantity: quantity,
        reference_type: 'stock_addition',
        reference_number: `ADD-${Date.now()}`,
        notes: `تم إضافة المنتج إلى المخزن${location_in_stock ? ` في الموقع: ${location_in_stock}` : ''}`,
        created_by: req.user?.id || 1
      };

      const movementFields = Object.keys(movementData);
      const movementPlaceholders = movementFields.map(() => '?').join(', ');
      const movementValues = Object.values(movementData);

      insert(`
        INSERT INTO stock_movements (
          ${movementFields.join(', ')}, movement_date, created_at
        ) VALUES (${movementPlaceholders}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, movementValues);

      // Invalidate cache
      cacheService.invalidateDataType('stocks');
      cacheService.del(`stocks:stock_products:${id}`);

      res.status(201).json({
        success: true,
        message: 'Product added to stock successfully'
      });
    } catch (error) {
      logger.error('Error adding product to stock:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add product to stock',
        error: error.message
      });
    }
  }
}

module.exports = new StocksController(); 