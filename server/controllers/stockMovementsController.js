const { db, query, queryOne, insert, update } = require('../database/index.js');
const logger = require('../utils/logger');
const cacheService = require('../services/cacheService');

class StockMovementsController {
  // Get all stock movements
  async getAllMovements(req, res) {
    try {
      const { page = 1, limit = 50, movement_type, from_stock_id, to_stock_id, product_id } = req.query;
      const offset = (page - 1) * limit;

      let whereConditions = [];
      let params = [];

      if (movement_type) {
        whereConditions.push('sm.movement_type = ?');
        params.push(movement_type);
      }

      if (from_stock_id) {
        whereConditions.push('sm.from_stock_id = ?');
        params.push(from_stock_id);
      }

      if (to_stock_id) {
        whereConditions.push('sm.to_stock_id = ?');
        params.push(to_stock_id);
      }

      if (product_id) {
        whereConditions.push('sm.product_id = ?');
        params.push(product_id);
      }

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

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
      logger.error('Error getting all stock movements:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve stock movements',
        error: error.message
      });
    }
  }

  // Create stock movement
  async createMovement(req, res) {
    try {
      const {
        movement_type, from_stock_id, to_stock_id, product_id,
        quantity, unit_cost, total_value, reference_type,
        reference_id, reference_number, notes
      } = req.body;

      // Validate required fields
      if (!movement_type || !product_id || !quantity) {
        return res.status(400).json({
          success: false,
          message: 'Movement type, product ID, and quantity are required'
        });
      }

      if (quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be greater than 0'
        });
      }

      // Validate that at least one stock is specified
      if (!from_stock_id && !to_stock_id) {
        return res.status(400).json({
          success: false,
          message: 'Either from_stock_id or to_stock_id must be specified'
        });
      }

      // Check if product exists
      const product = queryOne('SELECT id, name, current_stock FROM products WHERE id = ?', [product_id]);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Check if stocks exist
      if (from_stock_id) {
        const fromStock = queryOne('SELECT id, name FROM stocks WHERE id = ? AND is_active = 1', [from_stock_id]);
        if (!fromStock) {
          return res.status(404).json({
            success: false,
            message: 'From stock not found'
          });
        }
      }

      if (to_stock_id) {
        const toStock = queryOne('SELECT id, name FROM stocks WHERE id = ? AND is_active = 1', [to_stock_id]);
        if (!toStock) {
          return res.status(404).json({
            success: false,
            message: 'To stock not found'
          });
        }
      }

      // For transfers, validate stock availability
      if (movement_type === 'transfer') {
        if (from_stock_id) {
          // Check if product exists in the source stock using stock movements
          const stockQuantity = queryOne(`
            SELECT COALESCE(
              (SELECT SUM(CASE WHEN to_stock_id = ? THEN quantity ELSE 0 END) - 
                      SUM(CASE WHEN from_stock_id = ? THEN quantity ELSE 0 END)
               FROM stock_movements 
               WHERE product_id = ? AND (to_stock_id = ? OR from_stock_id = ?)), 0
            ) as current_stock_in_stock
          `, [from_stock_id, from_stock_id, product_id, from_stock_id, from_stock_id]);
          
          if (!stockQuantity || stockQuantity.current_stock_in_stock <= 0) {
            return res.status(400).json({
              success: false,
              message: 'Product does not exist in the source stock'
            });
          }
          
          if (stockQuantity.current_stock_in_stock < quantity) {
            return res.status(400).json({
              success: false,
              message: `Insufficient stock for transfer. Available: ${stockQuantity.current_stock_in_stock}, Requested: ${quantity}`
            });
          }
        } else if (from_stock_id === null) {
          // Product is in "no stock" - validate against product's current stock
          if (product.current_stock < quantity) {
            return res.status(400).json({
              success: false,
              message: `Insufficient stock for transfer. Available: ${product.current_stock}, Requested: ${quantity}`
            });
          }
        }
      }

      // Start transaction
      const result = db.transaction(() => {
        // Insert movement record
        const insertSqlQuery = `
          INSERT INTO stock_movements (
            movement_type, from_stock_id, to_stock_id, product_id,
            quantity, unit_cost, total_value, reference_type,
            reference_id, reference_number, movement_date, notes, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, CURRENT_TIMESTAMP)
        `;

        const movementResult = insert(insertSqlQuery, [
          movement_type, from_stock_id, to_stock_id, product_id,
          quantity, unit_cost, total_value, reference_type,
          reference_id, reference_number, notes, req.user?.id || 1
        ]);

        // Update product stock based on movement type
        if (movement_type === 'transfer') {
          if (from_stock_id && to_stock_id) {
            // For transfers between different stocks, we need to handle this differently
            // Since we can't have the same product in multiple stocks with the same SKU,
            // we'll update the stock_id to the destination stock
            update(
              'UPDATE products SET stock_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND stock_id = ?', 
              [to_stock_id, product_id, from_stock_id]
            );
          } else if (from_stock_id) {
            // Decrease stock in source location
            update(
              'UPDATE products SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND stock_id = ?', 
              [quantity, product_id, from_stock_id]
            );
          } else if (from_stock_id === null && to_stock_id) {
            // Transfer from "no stock" to a specific stock
            // Decrease the product's current stock and set the stock_id
            update(
              'UPDATE products SET current_stock = current_stock - ?, stock_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
              [quantity, to_stock_id, product_id]
            );
          } else if (to_stock_id) {
            // Increase stock in destination location
            update(
              'UPDATE products SET current_stock = current_stock + ?, stock_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
              [quantity, to_stock_id, product_id]
            );
          }
        } else if (movement_type === 'adjustment') {
          // For adjustments, update the target stock
          const targetStockId = to_stock_id || from_stock_id;
          if (targetStockId) {
            const existingProduct = queryOne(
              'SELECT id, current_stock FROM products WHERE id = ? AND stock_id = ?', 
              [product_id, targetStockId]
            );
            
            if (existingProduct) {
              update(
                'UPDATE products SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND stock_id = ?', 
                [quantity, product_id, targetStockId]
              );
            } else {
              // Update the product's stock_id to the target stock and set the quantity
              update(
                'UPDATE products SET current_stock = ?, stock_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                [quantity, targetStockId, product_id]
              );
            }
          }
        } else if (movement_type === 'purchase') {
          // For purchases, increase stock in destination
          if (to_stock_id) {
            const existingProduct = queryOne(
              'SELECT id, current_stock FROM products WHERE id = ? AND stock_id = ?', 
              [product_id, to_stock_id]
            );
            
            if (existingProduct) {
              update(
                'UPDATE products SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND stock_id = ?', 
                [quantity, product_id, to_stock_id]
              );
            } else {
              // Update the product's stock_id to the destination stock and set the quantity
              update(
                'UPDATE products SET current_stock = ?, stock_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                [quantity, to_stock_id, product_id]
              );
            }
          }
        } else if (movement_type === 'sale') {
          // For sales, decrease stock in source
          if (from_stock_id) {
            update(
              'UPDATE products SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND stock_id = ?', 
              [quantity, product_id, from_stock_id]
            );
          }
        }

        return { lastInsertRowid: movementResult };
      })();

      // Sync product stock_id with stock movements
      const inventoryService = require('../services/inventoryService');
      inventoryService.syncProductStockId(product_id);

      // Invalidate cache
      cacheService.invalidateDataType('stocks');
      cacheService.invalidateDataType('inventory');
      
      // Invalidate specific stock products cache for affected stocks
      if (from_stock_id) {
        cacheService.del(`stocks:stock_products:${from_stock_id}`);
      }
      if (to_stock_id) {
        cacheService.del(`stocks:stock_products:${to_stock_id}`);
      }

      // Get updated stock data for UI refresh
      const updatedStocks = [];
      if (from_stock_id) {
        const fromStock = queryOne(`
          SELECT 
            s.*,
            COALESCE(SUM(CASE WHEN sm.to_stock_id = s.id THEN sm.quantity ELSE 0 END) - 
                    SUM(CASE WHEN sm.from_stock_id = s.id THEN sm.quantity ELSE 0 END), 0) as total_stock_quantity,
            COUNT(DISTINCT CASE WHEN sm.to_stock_id = s.id OR sm.from_stock_id = s.id THEN sm.product_id END) as total_products
          FROM stocks s
          LEFT JOIN stock_movements sm ON (sm.to_stock_id = s.id OR sm.from_stock_id = s.id)
          WHERE s.id = ?
          GROUP BY s.id
        `, [from_stock_id]);
        if (fromStock) updatedStocks.push(fromStock);
      }
      
      if (to_stock_id) {
        const toStock = queryOne(`
          SELECT 
            s.*,
            COALESCE(SUM(CASE WHEN sm.to_stock_id = s.id THEN sm.quantity ELSE 0 END) - 
                    SUM(CASE WHEN sm.from_stock_id = s.id THEN sm.quantity ELSE 0 END), 0) as total_stock_quantity,
            COUNT(DISTINCT CASE WHEN sm.to_stock_id = s.id OR sm.from_stock_id = s.id THEN sm.product_id END) as total_products
          FROM stocks s
          LEFT JOIN stock_movements sm ON (sm.to_stock_id = s.id OR sm.from_stock_id = s.id)
          WHERE s.id = ?
          GROUP BY s.id
        `, [to_stock_id]);
        if (toStock) updatedStocks.push(toStock);
      }

      // Get updated product data
      const updatedProduct = queryOne(`
        SELECT 
          p.*,
          COALESCE(
            (SELECT SUM(CASE WHEN to_stock_id = ? THEN quantity ELSE 0 END) - 
                    SUM(CASE WHEN from_stock_id = ? THEN quantity ELSE 0 END)
             FROM stock_movements 
             WHERE product_id = p.id AND (to_stock_id = ? OR from_stock_id = ?)), 0
          ) as current_stock_in_stock
        FROM products p
        WHERE p.id = ?
      `, [to_stock_id, to_stock_id, to_stock_id, to_stock_id, product_id]);

      res.status(201).json({
        success: true,
        data: { 
          id: result.lastInsertRowid,
          updatedStocks,
          updatedProduct
        },
        message: 'Stock movement created successfully'
      });
    } catch (error) {
      logger.error('Error creating stock movement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create stock movement',
        error: error.message
      });
    }
  }

  // Get movement by ID
  async getMovementById(req, res) {
    try {
      const { id } = req.params;
      const cacheKey = `stock_movements:movement:${id}`;
      let movement = cacheService.get(cacheKey);
      
      if (!movement) {
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
          WHERE sm.id = ?
        `;
        
        movement = queryOne(sqlQuery, [id]);
        if (movement) {
          cacheService.set(cacheKey, movement, 300);
        }
      }

      if (!movement) {
        return res.status(404).json({
          success: false,
          message: 'Stock movement not found'
        });
      }

      res.json({
        success: true,
        data: movement,
        message: 'Stock movement retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting stock movement by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve stock movement',
        error: error.message
      });
    }
  }

  // Get movement statistics
  async getMovementStats(req, res) {
    try {
      const { period = '30', movement_type } = req.query;
      const days = parseInt(period);

      let whereConditions = [`sm.movement_date >= datetime('now', '-${days} days')`];
      let params = [];

      if (movement_type) {
        whereConditions.push('sm.movement_type = ?');
        params.push(movement_type);
      }

      const whereClause = 'WHERE ' + whereConditions.join(' AND ');

      const sqlQuery = `
        SELECT 
          sm.movement_type,
          COUNT(*) as total_movements,
          SUM(sm.quantity) as total_quantity,
          SUM(sm.total_value) as total_value,
          COUNT(DISTINCT sm.product_id) as unique_products,
          COUNT(DISTINCT sm.from_stock_id) as unique_from_stocks,
          COUNT(DISTINCT sm.to_stock_id) as unique_to_stocks
        FROM stock_movements sm
        ${whereClause}
        GROUP BY sm.movement_type
        ORDER BY total_movements DESC
      `;

      const stats = query(sqlQuery, params);

      res.json({
        success: true,
        data: {
          period_days: days,
          movement_type: movement_type || 'all',
          stats: stats,
          summary: {
            total_movements: stats.reduce((sum, stat) => sum + stat.total_movements, 0),
            total_quantity: stats.reduce((sum, stat) => sum + (stat.total_quantity || 0), 0),
            total_value: stats.reduce((sum, stat) => sum + (stat.total_value || 0), 0)
          }
        },
        message: 'Stock movement statistics retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting stock movement stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve stock movement statistics',
        error: error.message
      });
    }
  }

  // Reverse a movement (create opposite movement)
  async reverseMovement(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      // Get the original movement
      const originalMovement = queryOne('SELECT * FROM stock_movements WHERE id = ?', [id]);
      if (!originalMovement) {
        return res.status(404).json({
          success: false,
          message: 'Stock movement not found'
        });
      }

      // Create reverse movement
      const reverseData = {
        movement_type: originalMovement.movement_type,
        from_stock_id: originalMovement.to_stock_id,
        to_stock_id: originalMovement.from_stock_id,
        product_id: originalMovement.product_id,
        quantity: originalMovement.quantity,
        unit_cost: originalMovement.unit_cost,
        total_value: originalMovement.total_value,
        reference_type: 'adjustment',
        reference_id: originalMovement.id,
        reference_number: `REVERSE-${originalMovement.id}`,
        notes: notes || `إلغاء حركة ${originalMovement.id}`
      };

      // Use the create movement logic
      const result = db.transaction(() => {
        const insertSqlQuery = `
          INSERT INTO stock_movements (
            movement_type, from_stock_id, to_stock_id, product_id,
            quantity, unit_cost, total_value, reference_type,
            reference_id, reference_number, movement_date, notes, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, CURRENT_TIMESTAMP)
        `;

        const movementId = insert(insertSqlQuery, [
          reverseData.movement_type, reverseData.from_stock_id, reverseData.to_stock_id, reverseData.product_id,
          reverseData.quantity, reverseData.unit_cost, reverseData.total_value, reverseData.reference_type,
          reverseData.reference_id, reverseData.reference_number, reverseData.notes, req.user?.id || 1
        ]);

        return { lastInsertRowid: movementId };
      })();

      // Invalidate cache
      cacheService.invalidateDataType('stocks');
      cacheService.invalidateDataType('inventory');

      res.status(201).json({
        success: true,
        data: { id: result.lastInsertRowid },
        message: 'Stock movement reversed successfully'
      });
    } catch (error) {
      logger.error('Error reversing stock movement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reverse stock movement',
        error: error.message
      });
    }
  }
}

module.exports = new StockMovementsController(); 