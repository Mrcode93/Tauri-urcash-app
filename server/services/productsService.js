const db = require('../database');
const BaseService = require('./baseService');
const logger = require('../utils/logger');

class ProductsService extends BaseService {
  constructor() {
    super('products');
  }

  // Override the create method to automatically create purchase records
  create(data) {
    try {
      // Start a transaction
      return db.transaction(() => {
        // Create the product first
        const fields = Object.keys(data);
        const placeholders = fields.map(() => '?').join(', ');
        const values = Object.values(data);

        const productId = db.insert(
          `INSERT INTO products (${fields.join(', ')}) VALUES (${placeholders})`,
          values
        );

        // If the product has initial stock and a supplier, create a purchase record
        if (data.current_stock > 0 && data.supplier_id) {
          // Create product-supplier relationship first
          db.insert(
            `INSERT INTO product_suppliers (
              product_id, supplier_id, is_primary, supplier_price, 
              lead_time_days, minimum_order_quantity, is_active, 
              created_at, updated_at
            ) VALUES (?, ?, 1, ?, 7, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [productId, data.supplier_id, data.purchase_price]
          );

          // Create purchase record
          const purchaseData = {
            supplier_id: data.supplier_id,
            invoice_no: `INV-${Date.now()}-${productId}`,
            invoice_date: new Date().toISOString().split('T')[0],
            total_amount: data.purchase_price * data.current_stock,
            net_amount: data.purchase_price * data.current_stock,
            payment_method: 'cash',
            payment_status: 'paid',
            status: 'completed',
            notes: `شراء تلقائي للمخزون الأولي للمنتج ${data.name}`,
            created_by: 1 // Default admin user
          };

          const purchaseFields = Object.keys(purchaseData);
          const purchasePlaceholders = purchaseFields.map(() => '?').join(', ');
          const purchaseValues = Object.values(purchaseData);

          const purchaseId = db.insert(
            `INSERT INTO purchases (${purchaseFields.join(', ')}) VALUES (${purchasePlaceholders})`,
            purchaseValues
          );

          // Create purchase item record
          const purchaseItemData = {
            purchase_id: purchaseId,
            product_id: productId,
            quantity: data.current_stock,
            unit_price: data.purchase_price,
            subtotal: data.purchase_price * data.current_stock,
            notes: 'شراء مخزون أولي'
          };

          const itemFields = Object.keys(purchaseItemData);
          const itemPlaceholders = itemFields.map(() => '?').join(', ');
          const itemValues = Object.values(purchaseItemData);

          db.insert(
            `INSERT INTO purchase_items (${itemFields.join(', ')}) VALUES (${itemPlaceholders})`,
            itemValues
          );

          // Create product-supplier relationship if it doesn't exist
          const existingRelationship = db.queryOne(
            'SELECT id FROM product_suppliers WHERE product_id = ? AND supplier_id = ?',
            [productId, data.supplier_id]
          );

          if (!existingRelationship) {
            db.insert(
              `INSERT INTO product_suppliers (product_id, supplier_id, is_primary, supplier_price, lead_time_days, minimum_order_quantity, is_active) 
               VALUES (?, ?, 1, ?, 7, 1, 1)`,
              [productId, data.supplier_id, data.purchase_price]
            );
          }

          logger.info(`Auto-created purchase record for product ${data.name}:`, {
            productId,
            purchaseId,
            quantity: data.current_stock,
            supplierId: data.supplier_id
          });
        }

        return this.getById(productId);
      });
    } catch (err) {
      logger.error('Error creating product with auto-purchase:', err);
      throw err;
    }
  }

  getProductByBarcode(barcode) {
    try {
      const products = db.query(`
        SELECT p.*, pps.supplier_name 
        FROM products p
        LEFT JOIN product_primary_suppliers pps ON p.id = pps.product_id
        WHERE p.barcode = ? AND p.is_active = 1
      `, [barcode]);
      return products[0] || null;
    } catch (err) {
      logger.error('Get product by barcode error:', err);
      throw err;
    }
  }

  searchProducts(query) {
    try {
      const searchPattern = `%${query}%`;
      return db.query(`
        SELECT p.*, pps.supplier_name 
        FROM products p
        LEFT JOIN product_primary_suppliers pps ON p.id = pps.product_id
        WHERE (p.name LIKE ? OR p.description LIKE ?) 
        AND p.is_active = 1
        ORDER BY p.name ASC
      `, [searchPattern, searchPattern]);
    } catch (err) {
      logger.error('Search products error:', err);
      throw err;
    }
  }

  updateStock(productId, quantity) {
    try {
      const changes = db.update(`
        UPDATE products 
        SET current_stock = current_stock + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [quantity, productId]);
      return changes > 0;
    } catch (err) {
      logger.error('Update stock error:', err);
      throw err;
    }
  }

  getLowStock(threshold = 10) {
    try {
      return db.query(`
        SELECT p.*, pps.supplier_name 
        FROM products p
        LEFT JOIN product_primary_suppliers pps ON p.id = pps.product_id
        WHERE p.current_stock <= ? AND p.is_active = 1
        ORDER BY p.current_stock ASC
      `, [threshold]);
    } catch (err) {
      logger.error('Get low stock error:', err);
      throw err;
    }
  }

  // Optimized method for POS with pagination and field selection
  getForPOS({ page = 1, limit = 100, search, category, fields }) {
    try {
      const offset = (page - 1) * limit;
      
      // Select only essential fields for POS if specified
      const selectFields = fields ? 
        fields.split(',').map(f => 'p.' + f.trim()).join(', ') : 
        'p.id, p.name, p.sku, p.barcode, p.selling_price, p.current_stock, p.unit, p.min_stock, p.units_per_box';
      
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
      
      const products = db.query(query, values);
      
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
      
      const totalResult = db.queryOne(countQuery, countValues);
      const total = totalResult ? totalResult.total : 0;
      const hasMore = (page * limit) < total;
      
      return {
        products,
        total,
        hasMore,
        page,
        limit
      };
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

  delete(id) {
    try {
      // Check for associated purchase or sale items
      const purchaseItems = db.query('SELECT id FROM purchase_items WHERE product_id = ?', [id]);
      const saleItems = db.query('SELECT id FROM sale_items WHERE product_id = ?', [id]);

      if (purchaseItems.length > 0 || saleItems.length > 0) {
        throw new Error('Cannot delete product with associated purchase or sale records');
      }

      // Delete product
      const changes = db.update('DELETE FROM products WHERE id = ?', [id]);
      return changes > 0;
    } catch (err) {
      logger.error('Error deleting product:', err);
      throw new Error(err.message || 'Failed to delete product');
    }
  }
}

module.exports = new ProductsService();