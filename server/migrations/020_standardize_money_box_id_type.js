module.exports = {
  version: '020',
  description: 'Standardize money_box_id fields to INTEGER type',
  up: function(db) {
    const logger = require('../utils/logger');
    
    try {
      logger.info('Starting migration 020: Standardize money_box_id type');
      
      // Temporarily disable foreign key constraints
      db.pragma('foreign_keys = OFF');
      logger.info('Disabled foreign key constraints for migration');
      
      // Drop triggers that reference the tables we'll be modifying
      const triggersToDrop = [
        'trigger_purchase_item_insert',
        'trigger_purchase_item_update',
        'trigger_purchase_item_delete',
        'trigger_purchase_insert',
        'trigger_purchase_update'
      ];
      
      logger.info('Dropping triggers that reference tables to be modified...');
      triggersToDrop.forEach(trigger => {
        try {
          db.prepare(`DROP TRIGGER IF EXISTS ${trigger}`).run();
          logger.info(`Dropped trigger: ${trigger}`);
        } catch (err) {
          logger.warn(`Failed to drop trigger ${trigger}: ${err.message}`);
        }
      });
      
      // Helper function to check if table exists
      const tableExists = (tableName) => {
        try {
          const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`).get();
          return !!result;
        } catch (err) {
          return false;
        }
      };
      
      // Helper function to check column type
      const getColumnType = (tableName, columnName) => {
        try {
          const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
          const column = tableInfo.find(col => col.name === columnName);
          return column ? column.type : null;
        } catch (err) {
          return null;
        }
      };
      
      // Check and convert purchases table if it exists
      if (tableExists('purchases')) {
        const moneyBoxColumn = getColumnType('purchases', 'money_box_id');
        
        if (moneyBoxColumn === 'TEXT') {
          logger.info('Converting purchases.money_box_id from TEXT to INTEGER');
          
          // Create temporary table with correct schema
          db.prepare(`
            CREATE TABLE purchases_temp (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              supplier_id INTEGER NOT NULL,
              invoice_no TEXT UNIQUE NOT NULL,
              invoice_date DATE NOT NULL,
              due_date DATE,
              total_amount DECIMAL(12,2) NOT NULL CHECK(total_amount >= 0),
              discount_amount DECIMAL(12,2) DEFAULT 0 CHECK(discount_amount >= 0),
              tax_amount DECIMAL(12,2) DEFAULT 0 CHECK(tax_amount >= 0),
              net_amount DECIMAL(12,2) NOT NULL CHECK(net_amount >= 0),
              paid_amount DECIMAL(12,2) DEFAULT 0 CHECK(paid_amount >= 0),
              remaining_amount DECIMAL(12,2) GENERATED ALWAYS AS (net_amount - paid_amount) STORED,
              payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'bank_transfer', 'check')) DEFAULT 'cash',
              payment_status TEXT CHECK(payment_status IN ('paid', 'unpaid', 'partial')) DEFAULT 'unpaid',
              status TEXT CHECK(status IN ('completed', 'pending', 'cancelled', 'returned', 'partially_returned')) DEFAULT 'completed',
              notes TEXT,
              created_by INTEGER,
              money_box_id INTEGER,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
              FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
              CHECK(paid_amount <= total_amount),
              CHECK(due_date IS NULL OR due_date >= invoice_date)
            )
          `).run();
          
          // Copy data, converting TEXT to INTEGER where possible
          db.prepare(`
            INSERT INTO purchases_temp 
            SELECT 
              id, supplier_id, invoice_no, invoice_date, due_date, total_amount, 
              discount_amount, tax_amount, net_amount, paid_amount, 
              payment_method, payment_status, status, notes, created_by,
              CASE 
                WHEN money_box_id IS NULL OR money_box_id = '' THEN NULL
                WHEN money_box_id = 'cash_box' THEN NULL
                ELSE CAST(money_box_id AS INTEGER)
              END as money_box_id,
              created_at, updated_at
            FROM purchases
          `).run();
          
          // Drop old table and rename new one
          db.prepare('DROP TABLE purchases').run();
          db.prepare('ALTER TABLE purchases_temp RENAME TO purchases').run();
          
          logger.info('Successfully converted purchases.money_box_id to INTEGER');
        } else {
          logger.info('purchases.money_box_id is already INTEGER or doesn\'t exist');
        }
      } else {
        logger.info('purchases table does not exist, skipping');
      }
      
      // Check customer_receipts table
      if (tableExists('customer_receipts')) {
        const customerReceiptsMoneyBox = getColumnType('customer_receipts', 'money_box_id');
        
        if (customerReceiptsMoneyBox === 'TEXT') {
          logger.info('Converting customer_receipts.money_box_id from TEXT to INTEGER');
          
          // Create temporary table
          db.prepare(`
            CREATE TABLE customer_receipts_temp (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              receipt_number TEXT UNIQUE NOT NULL,
              barcode TEXT UNIQUE,
              customer_id INTEGER NOT NULL,
              sale_id INTEGER,
              receipt_date DATE NOT NULL,
              amount DECIMAL(10,2) NOT NULL CHECK(amount > 0),
              payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'bank_transfer', 'check')) DEFAULT 'cash',
              payment_type TEXT DEFAULT 'sale',
              reference_id INTEGER,
              reference_type TEXT DEFAULT 'sale',
              reference_number TEXT,
              money_box_id INTEGER,
              notes TEXT,
              created_by INTEGER,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
              FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
              FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
          `).run();
          
          // Copy data
          db.prepare(`
            INSERT INTO customer_receipts_temp 
            SELECT 
              id, receipt_number, barcode, customer_id, sale_id, receipt_date, 
              amount, payment_method, payment_type, reference_id, reference_type, 
              reference_number,
              CASE 
                WHEN money_box_id IS NULL OR money_box_id = '' THEN NULL
                WHEN money_box_id = 'cash_box' THEN NULL
                ELSE CAST(money_box_id AS INTEGER)
              END as money_box_id,
              notes, created_by, created_at, updated_at
            FROM customer_receipts
          `).run();
          
          // Drop old table and rename new one
          db.prepare('DROP TABLE customer_receipts').run();
          db.prepare('ALTER TABLE customer_receipts_temp RENAME TO customer_receipts').run();
          
          logger.info('Successfully converted customer_receipts.money_box_id to INTEGER');
        } else {
          logger.info('customer_receipts.money_box_id is already INTEGER or doesn\'t exist');
        }
      } else {
        logger.info('customer_receipts table does not exist, skipping');
      }
      
      // Check supplier_payment_receipts table
      if (tableExists('supplier_payment_receipts')) {
        const supplierReceiptsMoneyBox = getColumnType('supplier_payment_receipts', 'money_box_id');
        
        if (supplierReceiptsMoneyBox === 'TEXT') {
          logger.info('Converting supplier_payment_receipts.money_box_id from TEXT to INTEGER');
          
          // Create temporary table without foreign key constraint to purchases (since it might not exist)
          db.prepare(`
            CREATE TABLE supplier_payment_receipts_temp (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              receipt_number TEXT UNIQUE NOT NULL,
              barcode TEXT UNIQUE,
              supplier_id INTEGER NOT NULL,
              purchase_id INTEGER,
              receipt_date DATE NOT NULL,
              amount DECIMAL(10,2) NOT NULL CHECK(amount > 0),
              payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'bank_transfer', 'check')) DEFAULT 'cash',
              reference_number TEXT,
              money_box_id INTEGER,
              notes TEXT,
              created_by INTEGER,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
              FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
          `).run();
          
          // Copy data
          db.prepare(`
            INSERT INTO supplier_payment_receipts_temp 
            SELECT 
              id, receipt_number, barcode, supplier_id, purchase_id, receipt_date, 
              amount, payment_method, reference_number,
              CASE 
                WHEN money_box_id IS NULL OR money_box_id = '' THEN NULL
                WHEN money_box_id = 'cash_box' THEN NULL
                ELSE CAST(money_box_id AS INTEGER)
              END as money_box_id,
              notes, created_by, created_at, updated_at
            FROM supplier_payment_receipts
          `).run();
          
          // Drop old table and rename new one
          db.prepare('DROP TABLE supplier_payment_receipts').run();
          db.prepare('ALTER TABLE supplier_payment_receipts_temp RENAME TO supplier_payment_receipts').run();
          
          logger.info('Successfully converted supplier_payment_receipts.money_box_id to INTEGER');
        } else {
          logger.info('supplier_payment_receipts.money_box_id is already INTEGER or doesn\'t exist');
        }
      } else {
        logger.info('supplier_payment_receipts table does not exist, skipping');
      }
      
      // Check expenses table
      if (tableExists('expenses')) {
        const expensesMoneyBox = getColumnType('expenses', 'money_box_id');
        
        if (expensesMoneyBox === 'TEXT') {
          logger.info('Converting expenses.money_box_id from TEXT to INTEGER');
          
          // Create temporary table
          db.prepare(`
            CREATE TABLE expenses_temp (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              description TEXT NOT NULL,
              amount DECIMAL(10,2) NOT NULL CHECK(amount > 0),
              category TEXT NOT NULL,
              date DATE NOT NULL,
              money_box_id INTEGER,
              created_by INTEGER,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
          `).run();
          
          // Copy data
          db.prepare(`
            INSERT INTO expenses_temp 
            SELECT 
              id, description, amount, category, date,
              CASE 
                WHEN money_box_id IS NULL OR money_box_id = '' THEN NULL
                WHEN money_box_id = 'cash_box' THEN NULL
                ELSE CAST(money_box_id AS INTEGER)
              END as money_box_id,
              created_by, created_at, updated_at
            FROM expenses
          `).run();
          
          // Drop old table and rename new one
          db.prepare('DROP TABLE expenses').run();
          db.prepare('ALTER TABLE expenses_temp RENAME TO expenses').run();
          
          logger.info('Successfully converted expenses.money_box_id to INTEGER');
        } else {
          logger.info('expenses.money_box_id is already INTEGER or doesn\'t exist');
        }
      } else {
        logger.info('expenses table does not exist, skipping');
      }
      
      // Re-enable foreign key constraints
      db.pragma('foreign_keys = ON');
      logger.info('Re-enabled foreign key constraints');
      
      // Recreate the triggers that were dropped (only for tables that exist)
      logger.info('Recreating triggers...');
      
      // Trigger for purchase item insert (only if purchase_items table exists)
      if (tableExists('purchase_items')) {
        db.prepare(`
          CREATE TRIGGER IF NOT EXISTS trigger_purchase_item_insert
          AFTER INSERT ON purchase_items
          BEGIN
            UPDATE products 
            SET current_stock = current_stock + NEW.quantity,
                total_purchased = total_purchased + NEW.quantity,
                last_purchase_date = CURRENT_DATE,
                last_purchase_price = NEW.price,
                average_cost = (
                  (average_cost * (total_purchased - NEW.quantity) + NEW.price * NEW.quantity) / 
                  total_purchased
                )
            WHERE id = NEW.product_id;
            
            INSERT INTO inventory_movements (
              product_id, movement_type, quantity, previous_stock, new_stock,
              reference_type, reference_id, unit_cost, total_value, notes
            ) VALUES (
              NEW.product_id, 'purchase', NEW.quantity,
              (SELECT current_stock - NEW.quantity FROM products WHERE id = NEW.product_id),
              (SELECT current_stock FROM products WHERE id = NEW.product_id),
              'purchase', NEW.purchase_id, NEW.price, NEW.total,
              ''
            );
          END
        `).run();
        logger.info('Recreated trigger_purchase_item_insert');
      }
      
      // Trigger for purchase item update (only if purchase_items table exists)
      if (tableExists('purchase_items')) {
        db.prepare(`
          CREATE TRIGGER IF NOT EXISTS trigger_purchase_item_update
          AFTER UPDATE ON purchase_items
          BEGIN
            UPDATE products 
            SET current_stock = current_stock - OLD.quantity + NEW.quantity,
                total_purchased = total_purchased - OLD.quantity + NEW.quantity,
                average_cost = (
                  (average_cost * (total_purchased + OLD.quantity - NEW.quantity) + NEW.price * NEW.quantity - OLD.price * OLD.quantity) / 
                  total_purchased
                )
            WHERE id = NEW.product_id;
          END
        `).run();
        logger.info('Recreated trigger_purchase_item_update');
      }
      
      // Trigger for purchase item delete (only if purchase_items table exists)
      if (tableExists('purchase_items')) {
        db.prepare(`
          CREATE TRIGGER IF NOT EXISTS trigger_purchase_item_delete
          AFTER DELETE ON purchase_items
          BEGIN
            UPDATE products 
            SET current_stock = current_stock - OLD.quantity,
                total_purchased = total_purchased - OLD.quantity
            WHERE id = OLD.product_id;
            
            INSERT INTO inventory_movements (
              product_id, movement_type, quantity, previous_stock, new_stock,
              reference_type, reference_id, unit_cost, total_value, notes
            ) VALUES (
              OLD.product_id, 'purchase', -OLD.quantity,
              (SELECT current_stock + OLD.quantity FROM products WHERE id = OLD.product_id),
              (SELECT current_stock FROM products WHERE id = OLD.product_id),
              'purchase', OLD.purchase_id, OLD.price, OLD.total,
              'Purchase item removed via trigger'
            );
          END
        `).run();
        logger.info('Recreated trigger_purchase_item_delete');
      }
      
      // Trigger for purchase insert (only if purchases table exists)
      if (tableExists('purchases')) {
        db.prepare(`
          CREATE TRIGGER IF NOT EXISTS trigger_purchase_insert
          AFTER INSERT ON purchases
          BEGIN
            INSERT INTO purchase_history (
              purchase_id, action_type, new_data, changes_summary
            ) VALUES (
              NEW.id, 'created', json_object(
                'supplier_id', NEW.supplier_id,
                'invoice_no', NEW.invoice_no,
                'total_amount', NEW.total_amount,
                'net_amount', NEW.net_amount
              ), 'Purchase created'
            );
          END
        `).run();
        logger.info('Recreated trigger_purchase_insert');
      }
      
      // Trigger for purchase update (only if purchases table exists)
      if (tableExists('purchases')) {
        db.prepare(`
          CREATE TRIGGER IF NOT EXISTS trigger_purchase_update
          AFTER UPDATE ON purchases
          BEGIN
            INSERT INTO purchase_history (
              purchase_id, action_type, previous_data, new_data, changes_summary
            ) VALUES (
              NEW.id, 'updated', 
              json_object(
                'supplier_id', OLD.supplier_id,
                'invoice_no', OLD.invoice_no,
                'total_amount', OLD.total_amount,
                'net_amount', OLD.net_amount
              ),
              json_object(
                'supplier_id', NEW.supplier_id,
                'invoice_no', NEW.invoice_no,
                'total_amount', NEW.total_amount,
                'net_amount', NEW.net_amount
              ),
              'Purchase updated'
            );
          END
        `).run();
        logger.info('Recreated trigger_purchase_update');
      }
      
      logger.info('All triggers recreated successfully');
      logger.info('Migration 020 completed successfully');
    } catch (error) {
      logger.error('Migration 020 failed:', error);
      // Re-enable foreign key constraints even if migration fails
      try {
        db.pragma('foreign_keys = ON');
        logger.info('Re-enabled foreign key constraints after error');
      } catch (err) {
        logger.warn('Failed to re-enable foreign key constraints:', err.message);
      }
      throw error;
    }
  },
  
  down: function(db) {
    const logger = require('../utils/logger');
    logger.warn('Migration 020 down: Type conversion cannot be safely reversed');
  }
};
