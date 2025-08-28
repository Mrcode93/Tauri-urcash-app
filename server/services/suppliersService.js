const db = require('../database');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');

class SuppliersService {
  // Load all suppliers into cache for fast lookups
  loadAllSuppliersToCache() {
    try {
      const query = `
        SELECT 
          s.*,
          COALESCE(COUNT(DISTINCT p.id), 0) as products_count,
          COALESCE(SUM(ps.supplier_price), 0) as total_supplier_value
        FROM suppliers s
        LEFT JOIN product_suppliers ps ON s.id = ps.supplier_id AND ps.is_active = 1
        LEFT JOIN products p ON ps.product_id = p.id AND p.is_active = 1
        WHERE s.is_active = 1
        GROUP BY s.id
        ORDER BY s.name ASC
      `;
      
      const suppliers = db.query(query);
      
      // Store all suppliers in cache for 10 minutes
      cacheService.set('suppliers:all_suppliers', suppliers, 600);
      
      // Create phone/email index for fast lookup
      const phoneIndex = {};
      const emailIndex = {};
      suppliers.forEach(supplier => {
        if (supplier.phone) {
          phoneIndex[supplier.phone] = supplier;
        }
        if (supplier.email) {
          emailIndex[supplier.email] = supplier;
        }
      });
      
      // Cache indexes for 10 minutes
      cacheService.set('suppliers:phone_index', phoneIndex, 600);
      cacheService.set('suppliers:email_index', emailIndex, 600);
      
      // Loaded suppliers into cache
      return suppliers;
    } catch (err) {
      logger.error('Error loading all suppliers to cache:', err);
      throw new Error('Failed to load suppliers to cache');
    }
  }

  getAll() {
    try {
      // Generate cache key for suppliers list
      const cacheKey = 'suppliers:list';
      
      // Try to get from cache first
      const cached = cacheService.get(cacheKey);
      if (cached) {
        // Cache hit for suppliers list
        return cached;
      }
      
      const suppliers = db.query(`
        SELECT * FROM suppliers
        ORDER BY created_at DESC
      `);
      
      // Cache the suppliers for 5 minutes
      cacheService.set(cacheKey, suppliers, 300);
      // Cache set for suppliers list
      
      return suppliers;
    } catch (err) {
      logger.error('Error getting all suppliers:', err);
      throw new Error('حدث خطأ أثناء جلب الموردين');
    }
  }

  getById(id) {
    try {
      // Generate cache key for supplier
      const cacheKey = `suppliers:supplier:${id}`;
      
      // Try to get from cache first
      const cached = cacheService.get(cacheKey);
      if (cached) {
        // Cache hit for supplier
        return cached;
      }
      
      const supplier = db.queryOne(`
        SELECT * FROM suppliers
        WHERE id = ?
      `, [id]);
      
      if (!supplier) {
        throw new Error('المورد غير موجود');
      }
      
      // Cache the supplier for 10 minutes
      cacheService.set(cacheKey, supplier, 600);
      // Cache set for supplier
      
      return supplier;
    } catch (err) {
      logger.error('Error getting supplier by ID:', err);
      if (err.message === 'المورد غير موجود') {
        throw err;
      }
      throw new Error('حدث خطأ أثناء جلب بيانات المورد');
    }
  }

  search(query) {
    try {
      if (!query || query.trim().length === 0) {
        throw new Error('يجب إدخال مطلوب البحث');
      }
      
      const searchPattern = `%${query}%`;
      const suppliers = db.query(`
        SELECT * FROM suppliers
        WHERE name LIKE ? OR contact_person LIKE ? OR email LIKE ? OR phone LIKE ?
        ORDER BY created_at DESC
      `, [searchPattern, searchPattern, searchPattern, searchPattern]);
      
      if (suppliers.length === 0) {
        throw new Error('لم يتم العثور على نتائج للبحث');
      }
      
      return suppliers;
    } catch (err) {
      logger.error('Error searching suppliers:', err);
      if (err.message.includes('يجب إدخال') || err.message.includes('لم يتم العثور')) {
        throw err;
      }
      throw new Error('حدث خطأ أثناء البحث عن الموردين');
    }
  }

  getSupplierWithProducts(id) {
    try {
      const supplier = db.queryOne(`
        SELECT s.*, 
          GROUP_CONCAT(
            json_object(
              'id', p.id,
              'name', p.name,
              'description', p.description,
              'price', p.selling_price,
              'stock_quantity', p.current_stock,
              'supplier_price', ps.supplier_price
            )
          ) as products
        FROM suppliers s
        LEFT JOIN product_suppliers ps ON s.id = ps.supplier_id AND ps.is_active = 1
        LEFT JOIN products p ON ps.product_id = p.id AND p.is_active = 1
        WHERE s.id = ?
        GROUP BY s.id
      `, [id]);

      if (!supplier) {
        throw new Error('المورد غير موجود');
      }

      supplier.products = supplier.products ? supplier.products.split(',').map(item => JSON.parse(item)) : [];
      if (supplier.products[0] && supplier.products[0].id === null) {
        supplier.products = [];
      }
      
      return supplier;
    } catch (err) {
      logger.error('Error getting supplier with products:', err);
      if (err.message === 'المورد غير موجود') {
        throw err;
      }
      throw new Error('حدث خطأ أثناء جلب بيانات المورد مع المنتجات');
    }
  }

  create({ name, contact_person, phone, email, address }) {
    try {
      // Validate required fields
      if (!name || name.trim().length === 0) {
        throw new Error('اسم المورد مطلوب');
      }
      
      if (!contact_person || contact_person.trim().length === 0) {
        throw new Error('اسم المسؤول مطلوب');
      }

      const lastId = db.insert(`
        INSERT INTO suppliers (name, contact_person, phone, email, address)
        VALUES (?, ?, ?, ?, ?)
      `, [name, contact_person, phone, email, address]);
      
      // Invalidate all related caches
      cacheService.invalidatePattern('suppliers:list:*');
      cacheService.invalidatePattern('suppliers:supplier:*');
      cacheService.del('suppliers:all_suppliers');
      cacheService.del('suppliers:phone_index');
      cacheService.del('suppliers:email_index');
      // Cache invalidated for supplier creation
      
      return this.getById(lastId);
    } catch (err) {
      logger.error('Error creating supplier:', err);
      if (err.message.includes('مطلوب')) {
        throw err;
      }
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        if (err.message.includes('name')) {
          throw new Error('اسم المورد موجود مسبقاً');
        }
        if (err.message.includes('email')) {
          throw new Error('البريد الإلكتروني موجود مسبقاً');
        }
        if (err.message.includes('phone')) {
          throw new Error('رقم الهاتف موجود مسبقاً');
        }
      }
      throw new Error('حدث خطأ أثناء إنشاء المورد');
    }
  }

  update(id, { name, contact_person, phone, email, address }) {
    try {
      // Check if supplier exists
      const existingSupplier = this.getById(id);
      if (!existingSupplier) {
        throw new Error('المورد غير موجود');
      }

      // Validate required fields
      if (!name || name.trim().length === 0) {
        throw new Error('اسم المورد مطلوب');
      }
      
      if (!contact_person || contact_person.trim().length === 0) {
        throw new Error('اسم المسؤول مطلوب');
      }

      const changes = db.update(`
        UPDATE suppliers
        SET name = ?,
            contact_person = ?,
            phone = ?,
            email = ?,
            address = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [name, contact_person, phone, email, address, id]);
      
      if (changes === 0) {
        throw new Error('المورد غير موجود');
      }
      
      // Invalidate all related caches
      cacheService.invalidatePattern('suppliers:list:*');
      cacheService.invalidatePattern('suppliers:supplier:*');
      cacheService.del('suppliers:all_suppliers');
      cacheService.del('suppliers:phone_index');
      cacheService.del('suppliers:email_index');
      // Cache invalidated for supplier update
      
      return this.getById(id);
    } catch (err) {
      logger.error('Error updating supplier:', err);
      if (err.message.includes('مطلوب') || err.message.includes('غير موجود')) {
        throw err;
      }
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        if (err.message.includes('name')) {
          throw new Error('اسم المورد موجود مسبقاً');
        }
        if (err.message.includes('email')) {
          throw new Error('البريد الإلكتروني موجود مسبقاً');
        }
        if (err.message.includes('phone')) {
          throw new Error('رقم الهاتف موجود مسبقاً');
        }
      }
      throw new Error('حدث خطأ أثناء تحديث بيانات المورد');
    }
  }

  delete(id) {
    try {
      // Check if supplier exists
      const existingSupplier = this.getById(id);
      if (!existingSupplier) {
        throw new Error('المورد غير موجود');
      }

      return db.transaction(() => {
        // Check if supplier has related records
        const hasProducts = db.queryOne('SELECT COUNT(*) as count FROM product_suppliers WHERE supplier_id = ?', [id]);
        if (hasProducts.count > 0) {
          throw new Error('لا يمكن حذف المورد لوجود منتجات مرتبطة به');
        }

        const hasPurchases = db.queryOne('SELECT COUNT(*) as count FROM purchases WHERE supplier_id = ?', [id]);
        if (hasPurchases.count > 0) {
          throw new Error('لا يمكن حذف المورد لوجود فواتير شراء مرتبطة به');
        }

        // Delete supplier
        const changes = db.update('DELETE FROM suppliers WHERE id = ?', [id]);
        if (changes === 0) {
          throw new Error('المورد غير موجود');
        }
        
        // Invalidate all related caches
        cacheService.invalidatePattern('suppliers:list:*');
        cacheService.invalidatePattern('suppliers:supplier:*');
        cacheService.del('suppliers:all_suppliers');
        cacheService.del('suppliers:phone_index');
        cacheService.del('suppliers:email_index');
        // Cache invalidated for supplier deletion
        
        return true;
      });
    } catch (err) {
      logger.error('Error deleting supplier:', err);
      if (err.message.includes('لا يمكن حذف') || err.message.includes('غير موجود')) {
        throw err;
      }
      throw new Error('حدث خطأ أثناء حذف المورد');
    }
  }
}

// Initialize cache on service load
const suppliersService = new SuppliersService();

// Load all suppliers to cache on startup
setTimeout(() => {
  try {
    suppliersService.loadAllSuppliersToCache();
    // Suppliers cache initialized
  } catch (err) {
    logger.error('Failed to initialize suppliers cache on startup:', err);
  }
}, 3500); // Wait 3.5 seconds for database to be ready

module.exports = suppliersService;