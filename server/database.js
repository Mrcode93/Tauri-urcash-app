const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');
const logger = require('./utils/logger');
const MigrationRunner = require('./migrations/migrationRunner');

// Define the database directory in user's home directory
const APP_DATA_DIR = path.join(os.homedir(), '.urcash');
const DB_PATH = path.join(APP_DATA_DIR, 'database.sqlite');

// Ensure app data directory exists
if (!fs.existsSync(APP_DATA_DIR)) {
  fs.mkdirSync(APP_DATA_DIR, { recursive: true });
}

let db = null;
let isConnecting = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;

// Connection pool for better performance
const connectionPool = {
  connections: new Map(),
  maxConnections: 5,
  currentConnections: 0,
  
  getConnection() {
    if (this.currentConnections < this.maxConnections) {
      const connection = Database(DB_PATH, { 
        verbose: process.env.NODE_ENV === 'development' ? console.log : null,
        fileMustExist: false,
        timeout: 30000,
        readonly: false
      });
      
      // Apply optimizations
      connection.pragma('journal_mode = WAL');
      connection.pragma('synchronous = NORMAL');
      connection.pragma('cache_size = 10000');
      connection.pragma('temp_store = MEMORY');
      connection.pragma('mmap_size = 268435456'); // 256MB
      connection.pragma('foreign_keys = ON');
      
      this.currentConnections++;
      return connection;
    }
    return null;
  },
  
  releaseConnection(connection) {
    if (connection && !connection.closed) {
      try {
        connection.close();
      } catch (err) {
        logger.warn('Error closing database connection:', err);
      }
      this.currentConnections--;
    }
  }
};

function closeConnection() {
  if (db) {
    try {
      db.close();
      db = null;
      // Database connection closed
    } catch (err) {
      logger.warn('Error closing database connection:', err);
    }
  }
}

function needsInitialization() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      logger.info('Database file does not exist, needs initialization');
      return true;
    }
    
    if (!db) {
      db = connectDatabase();
    }
    
    // Check for core tables
    const usersTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    const migrationsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'").get();
    
    // Database needs initialization if either core table is missing
    return !usersTable || !migrationsTable;
  } catch (err) {
    logger.error('Error checking database initialization:', err);
    return true;
  }
}

function initializeDatabase(force = false) {
  try {
    if (!force && !needsInitialization()) {
      // Database already initialized
      return;
    }

    if (force) {
      logger.info('Forcing database reinitialization');
      
      // Drop triggers first (they depend on tables)
      const triggers = [
        'update_stock_on_sale', 'update_stock_on_sale_return', 'update_stock_on_purchase_return',
        'update_customer_balance_on_sale', 'update_customer_balance_on_payment',
        'trigger_purchase_item_insert', 'trigger_purchase_item_update', 'trigger_sale_item_insert', 'trigger_sale_item_update', 'trigger_sale_item_delete',
        'trigger_purchase_insert', 'trigger_purchase_update', 'trigger_purchase_item_delete',
      ];
      
      triggers.forEach(trigger => {
        try {
          db.prepare(`DROP TRIGGER IF EXISTS ${trigger}`).run();
        } catch (err) {
          logger.warn(`Failed to drop trigger ${trigger}:`, err.message);
        }
      });
      
      // Drop tables in reverse order of dependencies
      const tables = [
        'cash_box_transactions', 'user_cash_box_settings', 'cash_boxes','money_boxes',
        'supplier_payment_receipts', 'customer_receipts', 'purchase_history',
        'purchase_return_items', 'purchase_returns', 'purchase_items', 'purchases',
        'sale_return_items', 'sale_returns', 'sale_items', 'sales', 'debts', 'installments',
        'inventory_movements', 'product_suppliers', 'stock_movements', 'stocks',
        'products', 'suppliers', 'customers', 'expenses', 'reports',
        'users', 'settings', 'categories', 'permissions', 'user_permissions', 'role_permissions',  'representatives', 'employees'
      ];
      
      tables.forEach(table => {
        try {
          db.prepare(`DROP TABLE IF EXISTS ${table}`).run();
        } catch (err) {
          logger.warn(`Failed to drop table ${table}:`, err.message);
        }
      });
      logger.info('Dropped all existing tables and triggers');
    }

    // Initialize all tables
    db.pragma('foreign_keys = ON');
    createAllTables();
    createAllIndexes();
    createAllTriggers();
    insertDefaultData();
    applyDatabaseOptimizations();

    // Database initialization completed with all latest schema changes
    // All migrations 001-027 are now included in the initial schema:
    // - Migration 024: stock_id column in purchase_items table
    // - Migration 025: Fixed SKU unique constraint (composite unique on sku, stock_id)
    // - Migration 026: Added delegate_id, employee_id to sales; stock_id to sale_items
    // - Migration 027: Added delegate_id, employee_id to customer_receipts
    // New tables: representatives (for delegates), employees with all required columns and indexes

    // Database initialization completed
  } catch (err) {
    logger.error('Error initializing database:', err);
    throw err;
  }
}

function createAllTables() {
  logger.info('Creating all database tables...');

  // Users table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE COLLATE NOCASE,
      role TEXT CHECK(role IN ('admin', 'user', 'manager')) DEFAULT 'user',
      is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
      last_login DATETIME,
      login_attempts INTEGER DEFAULT 0,
      locked_until DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Permissions table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      permission_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // User permissions table (custom permissions granted to users)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS user_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      permission_id TEXT NOT NULL,
      granted_by INTEGER,
      granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (granted_by) REFERENCES users (id) ON DELETE SET NULL,
      UNIQUE(user_id, permission_id)
    )
  `).run();

  // Role permissions table (default permissions for roles)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      permission_id TEXT NOT NULL,
      is_default INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(role, permission_id)
    )
  `).run();

  // Settings table with all columns
  db.prepare(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      -- Company Information
      company_name TEXT DEFAULT '',
      logo_url TEXT DEFAULT NULL,
      mobile TEXT DEFAULT '',
      email TEXT DEFAULT '',
      address TEXT DEFAULT '',
      website TEXT DEFAULT '',
      tax_number TEXT DEFAULT '',
      registration_number TEXT DEFAULT '',
      description TEXT DEFAULT '',
      
      -- System Configuration
      currency TEXT DEFAULT 'IQD',
      language TEXT DEFAULT 'ar',
      timezone TEXT DEFAULT 'Asia/Baghdad',
      date_format TEXT DEFAULT 'DD/MM/YYYY',
      number_format TEXT DEFAULT 'ar-IQ',
      rtl_mode INTEGER DEFAULT 1,
      
      -- UI/UX Settings
      theme TEXT DEFAULT 'default',
      primary_color TEXT DEFAULT '#1f1f1f',
      secondary_color TEXT DEFAULT '#ededed',
      dashboard_layout TEXT DEFAULT 'grid',
      dashboard_tile_size TEXT DEFAULT 'medium',
      sidebar_collapsed INTEGER DEFAULT 0,
      enable_animations INTEGER DEFAULT 1,
      compact_mode INTEGER DEFAULT 0,
      rtl_direction INTEGER DEFAULT 1,
      
      -- Business Rules
      allow_negative_stock INTEGER DEFAULT 0,
      require_customer_for_sales INTEGER DEFAULT 1,
      auto_generate_barcode INTEGER DEFAULT 1,
      default_payment_method TEXT DEFAULT 'cash',
      tax_rate DECIMAL(5,2) DEFAULT 0.00,
      enable_loyalty_program INTEGER DEFAULT 0,
      loyalty_points_rate DECIMAL(5,2) DEFAULT 1.00,
      minimum_order_amount DECIMAL(10,2) DEFAULT 0,
      
      -- Security Settings
      session_timeout INTEGER DEFAULT 30,
      password_min_length INTEGER DEFAULT 8,
      require_strong_password INTEGER DEFAULT 1,
      enable_two_factor INTEGER DEFAULT 0,
      allow_multiple_sessions INTEGER DEFAULT 1,
      login_attempts INTEGER DEFAULT 5,
      lockout_duration INTEGER DEFAULT 15,
      
      -- Notification Settings
      email_notifications_enabled INTEGER DEFAULT 1,
      email_low_stock_notifications INTEGER DEFAULT 1,
      email_new_order_notifications INTEGER DEFAULT 1,
      sms_notifications_enabled INTEGER DEFAULT 0,
      push_notifications_enabled INTEGER DEFAULT 0,
      
      -- Receipt/Invoice Settings
      bill_template TEXT DEFAULT 'modern',
      bill_show_logo INTEGER DEFAULT 1,
      bill_show_barcode INTEGER DEFAULT 1,
      bill_show_company_info INTEGER DEFAULT 1,
      bill_show_qr_code INTEGER DEFAULT 0,
      bill_footer_text TEXT DEFAULT 'شكراً لزيارتكم',
      bill_paper_size TEXT DEFAULT 'A4',
      bill_orientation TEXT DEFAULT 'portrait',
      bill_margin_top INTEGER DEFAULT 10,
      bill_margin_right INTEGER DEFAULT 10,
      bill_margin_bottom INTEGER DEFAULT 10,
      bill_margin_left INTEGER DEFAULT 10,
      bill_font_header TEXT DEFAULT 'Arial',
      bill_font_body TEXT DEFAULT 'Arial',
      bill_font_footer TEXT DEFAULT 'Arial',
      bill_color_primary TEXT DEFAULT '#1f1f1f',
      bill_color_secondary TEXT DEFAULT '#ededed',
      bill_color_text TEXT DEFAULT '#333333',
      bill_print_mode TEXT DEFAULT 'a4',
      
      -- Email Configuration
      email_provider TEXT DEFAULT 'smtp',
      email_host TEXT DEFAULT '',
      email_port INTEGER DEFAULT 587,
      email_username TEXT DEFAULT '',
      email_password TEXT DEFAULT '',
      email_encryption TEXT DEFAULT 'tls',
      email_from_name TEXT DEFAULT '',
      email_from_email TEXT DEFAULT '',
      
      -- Integration Settings
      pos_barcode_scanner_enabled INTEGER DEFAULT 1,
      accounting_integration_enabled INTEGER DEFAULT 0,
      analytics_integration_enabled INTEGER DEFAULT 0,
      
      -- Backup Settings
      auto_backup_enabled INTEGER DEFAULT 1,
      backup_frequency TEXT DEFAULT 'daily',
      backup_retention_days INTEGER DEFAULT 30,
      last_backup_date DATETIME DEFAULT NULL,
      backup_time TEXT DEFAULT '20:00',
      
      -- Sidebar Menu Items (JSON)
      sidebar_menu_items TEXT DEFAULT NULL,
      
      -- Timestamps
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      -- Exchange Rate
      exchange_rate DECIMAL(10,4) DEFAULT 1.0000
    )
  `).run();

  // Representatives table (for delegates) - Must be created before customers table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS representatives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT COLLATE NOCASE,
      address TEXT,
      customer_id INTEGER,
      commission_rate DECIMAL(5,2) DEFAULT 0,
      commission_type TEXT CHECK(commission_type IN ('percentage', 'fixed')) DEFAULT 'percentage',
      commission_amount DECIMAL(12,2) DEFAULT 0,
      sales_target DECIMAL(12,2) DEFAULT 0,
      is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Add sales_target column to representatives table if it doesn't exist
  try {
    db.prepare('SELECT sales_target FROM representatives LIMIT 1').run();
    logger.info('sales_target column already exists in representatives table');
  } catch (error) {
    logger.info('Adding sales_target column to representatives table...');
    db.prepare('ALTER TABLE representatives ADD COLUMN sales_target DECIMAL(12,2) DEFAULT 0').run();
    logger.info('sales_target column added to representatives table');
  }

  // Customers table with all columns
  db.prepare(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE COLLATE NOCASE,
      phone TEXT,
      address TEXT,
      credit_limit DECIMAL(12,2) DEFAULT 1000000 CHECK(credit_limit >= 0),
      current_balance DECIMAL(12,2) DEFAULT 0,
      is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
      customer_type TEXT CHECK(customer_type IN ('retail', 'wholesale', 'vip')) DEFAULT 'retail',
      tax_number TEXT,
      due_date DATE,
      representative_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CHECK(current_balance >= -credit_limit),
      FOREIGN KEY (representative_id) REFERENCES representatives(id) ON DELETE SET NULL
    )
  `).run();


  

  
  // Employees table with all columns
  db.prepare(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT COLLATE NOCASE,
      address TEXT,
      salary DECIMAL(12,2) DEFAULT 0,
      commission_rate DECIMAL(5,2) DEFAULT 0,
      commission_type TEXT CHECK(commission_type IN ('percentage', 'fixed')) DEFAULT 'percentage',
      commission_amount DECIMAL(12,2) DEFAULT 0,
      commission_start_date DATE,
      commission_end_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Suppliers table with all columns
  db.prepare(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT COLLATE NOCASE,
      address TEXT,
      credit_limit DECIMAL(12,2) DEFAULT NULL CHECK(credit_limit IS NULL OR credit_limit >= 0),
      current_balance DECIMAL(12,2) DEFAULT 0,
      is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
      payment_terms INTEGER DEFAULT 30 CHECK(payment_terms >= 0),
      tax_number TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Products table - Updated with all migration changes (including SKU constraint fix from migration 025)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      scientific_name TEXT,
      description TEXT,
      supported BOOLEAN DEFAULT true,
      sku TEXT NOT NULL COLLATE NOCASE,
      barcode TEXT UNIQUE COLLATE NOCASE,
      purchase_price DECIMAL(10,2) NOT NULL CHECK(purchase_price >= 0),
      selling_price DECIMAL(10,2) NOT NULL CHECK(selling_price >= 0),
      wholesale_price DECIMAL(10,2) NOT NULL CHECK(wholesale_price >= 0),
      company_name TEXT,
      current_stock INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 0 CHECK(min_stock >= 0),
      max_stock INTEGER CHECK(max_stock >= min_stock),
      total_sold INTEGER NOT NULL DEFAULT 0 CHECK(total_sold >= 0),
      total_purchased INTEGER NOT NULL DEFAULT 0 CHECK(total_purchased >= 0),
      unit TEXT NOT NULL DEFAULT 'قطعة',
      units_per_box INTEGER NOT NULL DEFAULT 1 CHECK(units_per_box > 0),
      is_dolar BOOLEAN DEFAULT FALSE,
      expiry_date DATE,
      is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
      last_purchase_date DATE,
      last_purchase_price DECIMAL(10,2),
      average_cost DECIMAL(10,2) DEFAULT 0,
      reorder_point INTEGER DEFAULT 0,
      category_id INTEGER,
      stock_id INTEGER,
      location_in_stock TEXT,
      shelf_number TEXT,
      rack_number TEXT,
      bin_number TEXT,
      last_stock_check DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE SET NULL,
      CHECK(selling_price >= purchase_price)
    )
  `).run();
  // categories table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Stocks table - Multiple stock locations
  db.prepare(`
    CREATE TABLE IF NOT EXISTS stocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL COLLATE NOCASE,
      description TEXT,
      address TEXT NOT NULL,
      city TEXT,
      state TEXT,
      country TEXT DEFAULT 'Iraq',
      postal_code TEXT,
      phone TEXT,
      email TEXT COLLATE NOCASE,
      manager_name TEXT,
      manager_phone TEXT,
      manager_email TEXT COLLATE NOCASE,
      is_main_stock INTEGER DEFAULT 0 CHECK(is_main_stock IN (0, 1)),
      is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
      capacity DECIMAL(12,2) DEFAULT 0 CHECK(capacity >= 0),
      current_capacity_used DECIMAL(12,2) DEFAULT 0 CHECK(current_capacity_used >= 0),
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      CHECK(current_capacity_used <= capacity OR capacity = 0)
    )
  `).run();

  // Stock Movements table - Track stock movements between stocks
  db.prepare(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      movement_type TEXT NOT NULL CHECK(movement_type IN ('transfer', 'adjustment', 'purchase', 'sale', 'return', 'damage', 'expiry')),
      from_stock_id INTEGER,
      to_stock_id INTEGER,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      unit_cost DECIMAL(10,2),
      total_value DECIMAL(10,2),
      reference_type TEXT CHECK(reference_type IN ('purchase', 'sale', 'return', 'transfer', 'adjustment')),
      reference_id INTEGER,
      reference_number TEXT,
      movement_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (from_stock_id) REFERENCES stocks(id) ON DELETE SET NULL,
      FOREIGN KEY (to_stock_id) REFERENCES stocks(id) ON DELETE SET NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      CHECK(from_stock_id IS NOT NULL OR to_stock_id IS NOT NULL)
    )
  `).run();



  // Cash Boxes table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS cash_boxes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      initial_amount DECIMAL(12,2) DEFAULT 0 CHECK(initial_amount >= 0),
      current_amount DECIMAL(12,2) DEFAULT 0,
      status TEXT CHECK(status IN ('open', 'closed')) DEFAULT 'closed',
      opened_at DATETIME,
      closed_at DATETIME,
      opened_by INTEGER,
      closed_by INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
      FOREIGN KEY (opened_by) REFERENCES users(id) ON DELETE RESTRICT,
      FOREIGN KEY (closed_by) REFERENCES users(id) ON DELETE RESTRICT
    )
  `).run();
  // Boxes of money table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS money_boxes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
    )
  `).run();
  // Boxes of money transactions table - Updated with migration changes
  db.prepare(`
    CREATE TABLE IF NOT EXISTS money_box_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      box_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'deposit', 'withdraw', 'transfer_in', 'transfer_out', 'cash_deposit', 'transfer_from', 'transfer_from_cash_box', 'transfer_from_daily_box', 'transfer_from_money_box', 'transfer_to_cashier', 'transfer_to_money_box', 'transfer_to_bank', 'cash_box_closing', 'expense', 'expense_update', 'expense_reversal', 'purchase', 'purchase_return'
      amount DECIMAL(12,2) NOT NULL,
      balance_after DECIMAL(12,2),
      notes TEXT,
      related_box_id INTEGER,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (box_id) REFERENCES money_boxes(id) ON DELETE CASCADE,
      FOREIGN KEY (related_box_id) REFERENCES money_boxes(id),
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
   
  `).run();

  // Cash Box Transactions table - Enhanced with specific reference columns
  db.prepare(`
    CREATE TABLE IF NOT EXISTS cash_box_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cash_box_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      transaction_type TEXT CHECK(transaction_type IN (
        'opening', 'closing', 'deposit', 'withdrawal', 'sale', 
        'purchase', 'expense', 'customer_receipt', 'supplier_payment', 
        'adjustment', 'sale_return', 'purchase_return', 'cash_deposit',
        'transfer_from', 'transfer_from_cash_box', 'transfer_from_daily_box', 'transfer_from_money_box',
        'transfer_to_cashier', 'transfer_to_money_box', 'transfer_to_bank', 'cash_box_closing'
      )) NOT NULL,
      amount DECIMAL(12,2) NOT NULL CHECK(amount != 0),
      balance_before DECIMAL(12,2) NOT NULL,
      balance_after DECIMAL(12,2) NOT NULL,
      reference_type TEXT CHECK(reference_type IN (
        'sale', 'purchase', 'expense', 'customer_receipt', 
        'supplier_payment', 'manual', 'opening', 'closing', 
        'sale_return', 'purchase_return', 'debt', 'installment'
      )) NOT NULL,
      reference_id INTEGER,
      -- Specific reference columns for better data integrity
      sale_id INTEGER,
      purchase_id INTEGER,
      expense_id INTEGER,
      customer_receipt_id INTEGER,
      supplier_receipt_id INTEGER,
      description TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cash_box_id) REFERENCES cash_boxes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL,
      FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE SET NULL,
      FOREIGN KEY (customer_receipt_id) REFERENCES customer_receipts(id) ON DELETE SET NULL,
      FOREIGN KEY (supplier_receipt_id) REFERENCES supplier_payment_receipts(id) ON DELETE SET NULL
    )
  `).run();

  // User Cash Box Settings table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS user_cash_box_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      default_opening_amount DECIMAL(10,2) DEFAULT 0,
      require_opening_amount INTEGER DEFAULT 1,
      require_closing_count INTEGER DEFAULT 1,
      allow_negative_balance INTEGER DEFAULT 0,
      max_withdrawal_amount DECIMAL(10,2) DEFAULT 0,
      require_approval_for_withdrawal INTEGER DEFAULT 0,
      auto_close_at_end_of_day INTEGER DEFAULT 0,
      auto_close_time TIME DEFAULT '23:59:59',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();

  // Sales table - Primary transaction table (removed redundant bill_id)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      delegate_id INTEGER,
      employee_id INTEGER,
      invoice_no TEXT UNIQUE NOT NULL,
      invoice_date DATE NOT NULL,
      due_date DATE,
      total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      discount_amount DECIMAL(12,2) DEFAULT 0,
      tax_amount DECIMAL(12,2) DEFAULT 0,
      net_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - discount_amount + tax_amount) STORED,
      paid_amount DECIMAL(12,2) DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      payment_status TEXT DEFAULT 'unpaid',
      status TEXT DEFAULT 'completed',
      bill_type TEXT DEFAULT 'retail',
      notes TEXT,
      barcode TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
      FOREIGN KEY (delegate_id) REFERENCES representatives(id) ON DELETE SET NULL,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `).run();

  // Create indexes for better duplicate detection performance
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_sales_customer_created 
    ON sales(customer_id, created_at DESC)
  `).run();

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_sales_barcode 
    ON sales(barcode) WHERE barcode IS NOT NULL
  `).run();

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_sales_invoice_no 
    ON sales(invoice_no)
  `).run();

  // Add index for rapid duplicate detection
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_sales_customer_amount_time 
    ON sales(customer_id, total_amount, created_at DESC)
  `).run();

  // Sale items table - Updated with manual items support
  db.prepare(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT,
      stock_id INTEGER,
      quantity INTEGER NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      discount_percent DECIMAL(5,2) DEFAULT 0,
      tax_percent DECIMAL(5,2) DEFAULT 0,
      total DECIMAL(10,2) NOT NULL,
      line_total DECIMAL(10,2) NOT NULL,
      returned_quantity INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
      FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE SET NULL
    )
  `).run();

  // Purchases table with all columns - Updated with migration changes
  db.prepare(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      invoice_no TEXT NOT NULL,
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
      FOREIGN KEY (money_box_id) REFERENCES money_boxes(id) ON DELETE SET NULL,
      CHECK(paid_amount <= net_amount),
      CHECK(due_date IS NULL OR due_date >= invoice_date),
      UNIQUE(supplier_id, invoice_no)
    )
  `).run();

  // Create indexes for better duplicate detection performance
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_purchases_supplier_invoice 
    ON purchases(supplier_id, invoice_no)
  `).run();

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_purchases_supplier_created 
    ON purchases(supplier_id, created_at DESC)
  `).run();

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_purchases_invoice_no 
    ON purchases(invoice_no)
  `).run();

  // Add index for rapid duplicate detection
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_purchases_supplier_amount_time 
    ON purchases(supplier_id, net_amount, created_at DESC)
  `).run();

  // Purchase items table with all columns (includes stock_id from migration 024)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      stock_id INTEGER,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      price DECIMAL(10,2) NOT NULL CHECK(price >= 0),
      discount_percent DECIMAL(5,2) DEFAULT 0 CHECK(discount_percent >= 0 AND discount_percent <= 100),
      tax_percent DECIMAL(5,2) DEFAULT 0 CHECK(tax_percent >= 0 AND tax_percent <= 100),
      total DECIMAL(10,2) NOT NULL CHECK(total >= 0),
      returned_quantity INTEGER DEFAULT 0 CHECK(returned_quantity >= 0),
      expiry_date DATE,
      batch_number TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
      FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE SET NULL,
      CHECK(returned_quantity <= quantity)
    )
  `).run();

  // Debts table - Cleaned up (customer_id derivable from sales)
  db.prepare(`
      CREATE TABLE IF NOT EXISTS debts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        sale_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        due_date DATE NOT NULL,
        status TEXT CHECK(status IN ('pending', 'paid', 'partial', 'unpaid')) DEFAULT 'unpaid',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
      )
  `).run();

  // Installments table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS installments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      customer_id INTEGER,
      due_date DATE NOT NULL,
      amount DECIMAL(12,2) NOT NULL CHECK(amount > 0),
      paid_amount DECIMAL(12,2) DEFAULT 0 CHECK(paid_amount >= 0),
      payment_status TEXT CHECK(payment_status IN ('paid', 'unpaid', 'partial')) DEFAULT 'unpaid',
      payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'bank_transfer', 'check')),
      paid_at DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
      CHECK(paid_amount <= amount)
    )
  `).run();

  // Note: Bills functionality now uses existing sales, purchases, and return tables
  // instead of separate bills tables to avoid redundancy

  // Sale returns table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS sale_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      return_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      reason TEXT NOT NULL,
      status TEXT CHECK(status IN ('completed', 'pending', 'cancelled')) DEFAULT 'completed',
      refund_method TEXT CHECK(refund_method IN ('cash', 'card', 'bank_transfer', 'check')) DEFAULT 'cash',
      total_amount DECIMAL(10,2) NOT NULL CHECK(total_amount >= 0),
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `).run();

  // Sale return items table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS sale_return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL,
      sale_item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      price DECIMAL(10,2) NOT NULL CHECK(price >= 0),
      total DECIMAL(10,2) NOT NULL CHECK(total >= 0),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (return_id) REFERENCES sale_returns(id) ON DELETE CASCADE,
      FOREIGN KEY (sale_item_id) REFERENCES sale_items(id) ON DELETE CASCADE
    )
  `).run();

  // Purchase returns table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS purchase_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL,
      return_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      reason TEXT NOT NULL,
      status TEXT CHECK(status IN ('completed', 'pending', 'cancelled')) DEFAULT 'completed',
      refund_method TEXT CHECK(refund_method IN ('cash', 'card', 'bank_transfer', 'check')) DEFAULT 'cash',
      total_amount DECIMAL(10,2) NOT NULL CHECK(total_amount >= 0),
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `).run();

  // Purchase return items table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS purchase_return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL,
      purchase_item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      price DECIMAL(10,2) NOT NULL CHECK(price >= 0),
      total DECIMAL(10,2) NOT NULL CHECK(total >= 0),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (return_id) REFERENCES purchase_returns(id) ON DELETE CASCADE,
      FOREIGN KEY (purchase_item_id) REFERENCES purchase_items(id) ON DELETE CASCADE
    )
  `).run();

  // Customer Receipts table - Updated with migration changes (including delegate_id and employee_id from migration 027)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS customer_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_number TEXT UNIQUE NOT NULL,
      barcode TEXT UNIQUE,
      customer_id INTEGER NOT NULL,
      sale_id INTEGER,
      delegate_id INTEGER,
      employee_id INTEGER,
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
      FOREIGN KEY (delegate_id) REFERENCES representatives(id) ON DELETE SET NULL,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `).run();

  // Supplier Payment Receipts table - Updated with migration changes
  db.prepare(`
    CREATE TABLE IF NOT EXISTS supplier_payment_receipts (
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
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `).run();

  // Inventory movements table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      movement_type TEXT NOT NULL CHECK(movement_type IN ('purchase', 'sale', 'return', 'adjustment', 'transfer', 'expiry', 'damage')),
      quantity INTEGER NOT NULL,
      previous_stock INTEGER NOT NULL,
      new_stock INTEGER NOT NULL,
      reference_type TEXT NOT NULL CHECK(reference_type IN ('purchase', 'sale', 'return', 'adjustment', 'transfer')),
      reference_id INTEGER,
      unit_cost DECIMAL(10,2),
      total_value DECIMAL(10,2),
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `).run();

  // Product suppliers table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS product_suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      supplier_id INTEGER NOT NULL,
      is_primary INTEGER DEFAULT 0 CHECK(is_primary IN (0, 1)),
      supplier_sku TEXT,
      supplier_price DECIMAL(10,2),
      lead_time_days INTEGER DEFAULT 1 CHECK(lead_time_days >= 0),
      minimum_order_quantity INTEGER DEFAULT 1 CHECK(minimum_order_quantity > 0),
      is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
      UNIQUE(product_id, supplier_id)
    )
  `).run();

  // Purchase history table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS purchase_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL,
      action_type TEXT NOT NULL CHECK(action_type IN ('created', 'updated', 'deleted', 'returned')),
      previous_data TEXT,
      new_data TEXT,
      changes_summary TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `).run();

  // Expenses table - Updated with migration changes
  db.prepare(`
    CREATE TABLE IF NOT EXISTS expenses (
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

  // Reports table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_type TEXT NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      total_sales DECIMAL(12,2) NOT NULL DEFAULT 0,
      total_purchases DECIMAL(12,2) NOT NULL DEFAULT 0,
      total_expenses DECIMAL(12,2) NOT NULL DEFAULT 0,
      net_profit DECIMAL(12,2) NOT NULL DEFAULT 0,
      total_customers INTEGER NOT NULL DEFAULT 0,
      total_suppliers INTEGER NOT NULL DEFAULT 0,
      total_products INTEGER NOT NULL DEFAULT 0,
      low_stock_products INTEGER NOT NULL DEFAULT 0,
      out_of_stock_products INTEGER NOT NULL DEFAULT 0,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `).run();

  // Schema Migrations table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      description TEXT,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      execution_time_ms INTEGER,
      status TEXT DEFAULT 'success'
    )
  `).run();

  // Licenses table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS licenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      is_active BOOLEAN DEFAULT false,
      license_data TEXT,
      public_key TEXT,
      device_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Upload Schedules table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS upload_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      schedule_name TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      schedule_type TEXT NOT NULL CHECK(schedule_type IN ('daily', 'weekly', 'monthly', 'custom', 'interval')),
      schedule_time TEXT NOT NULL, -- HH:MM format for time-based, minutes for interval
      schedule_days TEXT, -- JSON array for weekly/monthly schedules
      data_types TEXT NOT NULL, -- JSON array of data types to upload
      interval_minutes INTEGER DEFAULT NULL, -- For interval-based schedules
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_run DATETIME,
      next_run DATETIME,
      total_runs INTEGER DEFAULT 0,
      last_run_status TEXT DEFAULT 'pending',
      last_run_message TEXT
    )
  `).run();

  // ===== DELEGATE SALES AND COLLECTION SYSTEM =====
  
  // Delegate Sales table - for tracking sales made by delegates
  db.prepare(`
    CREATE TABLE IF NOT EXISTS delegate_sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delegate_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      sale_id INTEGER NOT NULL,
      total_amount DECIMAL(12,2) NOT NULL CHECK(total_amount >= 0),
      commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
      commission_type TEXT CHECK(commission_type IN ('percentage', 'fixed')) DEFAULT 'percentage',
      payment_status TEXT CHECK(payment_status IN ('paid', 'partial', 'unpaid')) DEFAULT 'unpaid',
      paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      remaining_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (delegate_id) REFERENCES representatives(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    )
  `).run();

  // Delegate Collections table - for tracking payments collected by delegates
  db.prepare(`
    CREATE TABLE IF NOT EXISTS delegate_collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delegate_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      sale_id INTEGER,
      collection_amount DECIMAL(12,2) NOT NULL CHECK(collection_amount > 0),
      payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'bank_transfer', 'check')) DEFAULT 'cash',
      collection_date DATE NOT NULL,
      receipt_number TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (delegate_id) REFERENCES representatives(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL
    )
  `).run();

  // Delegate Commission Payments table - for tracking commission payments to delegates
  db.prepare(`
    CREATE TABLE IF NOT EXISTS delegate_commission_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delegate_id INTEGER NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      total_sales DECIMAL(12,2) NOT NULL DEFAULT 0,
      total_commission DECIMAL(12,2) NOT NULL DEFAULT 0,
      commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
      commission_type TEXT CHECK(commission_type IN ('percentage', 'fixed')) DEFAULT 'percentage',
      payment_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      payment_date DATE,
      payment_status TEXT CHECK(payment_status IN ('pending', 'paid', 'cancelled')) DEFAULT 'pending',
      payment_method TEXT CHECK(payment_method IN ('cash', 'bank_transfer', 'check')) DEFAULT 'cash',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (delegate_id) REFERENCES representatives(id) ON DELETE CASCADE
    )
  `).run();

  // Delegate Performance Reports table - for tracking performance metrics
  db.prepare(`
    CREATE TABLE IF NOT EXISTS delegate_performance_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delegate_id INTEGER NOT NULL,
      report_date DATE NOT NULL,
      period_type TEXT CHECK(period_type IN ('daily', 'weekly', 'monthly', 'yearly')) DEFAULT 'monthly',
      total_sales DECIMAL(12,2) NOT NULL DEFAULT 0,
      total_orders INTEGER NOT NULL DEFAULT 0,
      total_customers INTEGER NOT NULL DEFAULT 0,
      total_collections DECIMAL(12,2) NOT NULL DEFAULT 0,
      total_commission DECIMAL(12,2) NOT NULL DEFAULT 0,
      sales_target DECIMAL(12,2) NOT NULL DEFAULT 0,
      target_achievement_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
      average_order_value DECIMAL(12,2) NOT NULL DEFAULT 0,
      collection_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (delegate_id) REFERENCES representatives(id) ON DELETE CASCADE
    )
  `).run();

  // Delegate Customer Assignments table - for managing customer assignments to delegates
  db.prepare(`
    CREATE TABLE IF NOT EXISTS delegate_customer_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delegate_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      assignment_date DATE NOT NULL,
      is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (delegate_id) REFERENCES representatives(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      UNIQUE(delegate_id, customer_id)
    )
  `).run();

  // Pending Sync table for mobile live data
  db.prepare(`
    CREATE TABLE IF NOT EXISTS pending_sync (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      data TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed')),
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced_at DATETIME
    )
  `).run();

  logger.info('All database tables created successfully');
}

function createAllIndexes() {
  logger.info('Creating database indexes...');

  const indexes = [
    // Users indexes
    'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
    'CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)',

    // Customers indexes
    'CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)',
    'CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)',
    'CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)',
    'CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type)',
    'CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_customers_balance ON customers(current_balance)',
    'CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at)',

    // Suppliers indexes
    'CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name)',
    'CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email)',
    'CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_suppliers_balance ON suppliers(current_balance)',

    // Products indexes (includes SKU constraints from migration 025)
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_stock ON products(sku, stock_id) WHERE stock_id IS NOT NULL',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_no_stock ON products(sku) WHERE stock_id IS NULL',
    'CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)',
    'CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)',
    'CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)',
    'CREATE INDEX IF NOT EXISTS idx_products_expiry ON products(expiry_date)',
    'CREATE INDEX IF NOT EXISTS idx_products_current_stock ON products(current_stock)',
    'CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_products_last_purchase_date ON products(last_purchase_date)',
    'CREATE INDEX IF NOT EXISTS idx_products_reorder_point ON products(reorder_point)',
    'CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)',
    'CREATE INDEX IF NOT EXISTS idx_products_stock_id ON products(stock_id)',

    // Categories indexes
    'CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name)',
    'CREATE INDEX IF NOT EXISTS idx_categories_created_at ON categories(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_categories_updated_at ON categories(updated_at)',

    // Stocks indexes
    'CREATE INDEX IF NOT EXISTS idx_stocks_name ON stocks(name)',
    'CREATE INDEX IF NOT EXISTS idx_stocks_code ON stocks(code)',
    'CREATE INDEX IF NOT EXISTS idx_stocks_is_active ON stocks(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_stocks_is_main ON stocks(is_main_stock)',
    'CREATE INDEX IF NOT EXISTS idx_stock_movements_from_stock_id ON stock_movements(from_stock_id)',
    'CREATE INDEX IF NOT EXISTS idx_stock_movements_to_stock_id ON stock_movements(to_stock_id)',
    'CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id)',
    'CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON stock_movements(movement_type)',
    'CREATE INDEX IF NOT EXISTS idx_stock_movements_reference_type ON stock_movements(reference_type)',
    'CREATE INDEX IF NOT EXISTS idx_stock_movements_reference_id ON stock_movements(reference_id)',
    'CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_stock_movements_created_by ON stock_movements(created_by)',

    // Cash box indexes
    'CREATE INDEX IF NOT EXISTS idx_cash_boxes_user_id ON cash_boxes(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_cash_boxes_status ON cash_boxes(status)',
    'CREATE INDEX IF NOT EXISTS idx_cash_boxes_opened_at ON cash_boxes(opened_at)',
    'CREATE INDEX IF NOT EXISTS idx_cash_box_transactions_cash_box_id ON cash_box_transactions(cash_box_id)',
    'CREATE INDEX IF NOT EXISTS idx_cash_box_transactions_user_id ON cash_box_transactions(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_cash_box_transactions_type ON cash_box_transactions(transaction_type)',
    'CREATE INDEX IF NOT EXISTS idx_cash_box_transactions_created_at ON cash_box_transactions(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_cash_box_transactions_reference ON cash_box_transactions(reference_type, reference_id)',

    // Money boxes indexes
    'CREATE INDEX IF NOT EXISTS idx_money_boxes_name ON money_boxes(name)',
    'CREATE INDEX IF NOT EXISTS idx_money_boxes_created_by ON money_boxes(created_by)',
    'CREATE INDEX IF NOT EXISTS idx_money_boxes_created_at ON money_boxes(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_money_box_transactions_box_id ON money_box_transactions(box_id)',
    'CREATE INDEX IF NOT EXISTS idx_money_box_transactions_type ON money_box_transactions(type)',
    'CREATE INDEX IF NOT EXISTS idx_money_box_transactions_created_at ON money_box_transactions(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_money_box_transactions_created_by ON money_box_transactions(created_by)',
    'CREATE INDEX IF NOT EXISTS idx_money_box_transactions_related_box ON money_box_transactions(related_box_id)',

    // Sales indexes
    'CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_sales_invoice_no ON sales(invoice_no)',
    'CREATE INDEX IF NOT EXISTS idx_sales_invoice_date ON sales(invoice_date)',
    'CREATE INDEX IF NOT EXISTS idx_sales_due_date ON sales(due_date)',
    'CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON sales(payment_status)',
    'CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status)',
    'CREATE INDEX IF NOT EXISTS idx_sales_created_by ON sales(created_by)',
    'CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_sales_total_paid ON sales(total_amount, paid_amount)',
    'CREATE INDEX IF NOT EXISTS idx_sales_delegate_id ON sales(delegate_id)',
    'CREATE INDEX IF NOT EXISTS idx_sales_employee_id ON sales(employee_id)',

    // Sale items indexes
    'CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id)',
    'CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id)',
    'CREATE INDEX IF NOT EXISTS idx_sale_items_stock_id ON sale_items(stock_id)',

    // Purchases indexes
    'CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id)',
    'CREATE INDEX IF NOT EXISTS idx_purchases_invoice_no ON purchases(invoice_no)',
    'CREATE INDEX IF NOT EXISTS idx_purchases_invoice_date ON purchases(invoice_date)',
    'CREATE INDEX IF NOT EXISTS idx_purchases_due_date ON purchases(due_date)',
    'CREATE INDEX IF NOT EXISTS idx_purchases_payment_status ON purchases(payment_status)',
    'CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status)',
    'CREATE INDEX IF NOT EXISTS idx_purchases_created_by ON purchases(created_by)',
    'CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_purchases_money_box_id ON purchases(money_box_id)',

    // Purchase items indexes (includes stock_id from migration 024)
    'CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id)',
    'CREATE INDEX IF NOT EXISTS idx_purchase_items_product_id ON purchase_items(product_id)',
    'CREATE INDEX IF NOT EXISTS idx_purchase_items_stock_id ON purchase_items(stock_id)',
    'CREATE INDEX IF NOT EXISTS idx_purchase_items_expiry_date ON purchase_items(expiry_date)',
    'CREATE INDEX IF NOT EXISTS idx_purchase_items_batch_number ON purchase_items(batch_number)',

    // Installments indexes
    'CREATE INDEX IF NOT EXISTS idx_installments_sale_id ON installments(sale_id)',
    'CREATE INDEX IF NOT EXISTS idx_installments_customer_id ON installments(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_installments_payment_status ON installments(payment_status)',
    'CREATE INDEX IF NOT EXISTS idx_installments_due_date ON installments(due_date)',
    'CREATE INDEX IF NOT EXISTS idx_installments_created_at ON installments(created_at)',

    // Customer receipts indexes
    'CREATE INDEX IF NOT EXISTS idx_customer_receipts_customer_id ON customer_receipts(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_customer_receipts_sale_id ON customer_receipts(sale_id)',
    'CREATE INDEX IF NOT EXISTS idx_customer_receipts_receipt_date ON customer_receipts(receipt_date)',
    'CREATE INDEX IF NOT EXISTS idx_customer_receipts_receipt_number ON customer_receipts(receipt_number)',
    'CREATE INDEX IF NOT EXISTS idx_customer_receipts_barcode ON customer_receipts(barcode)',
    'CREATE INDEX IF NOT EXISTS idx_customer_receipts_payment_method ON customer_receipts(payment_method)',
    'CREATE INDEX IF NOT EXISTS idx_customer_receipts_payment_type ON customer_receipts(payment_type)',
    'CREATE INDEX IF NOT EXISTS idx_customer_receipts_reference ON customer_receipts(reference_type, reference_id)',
    'CREATE INDEX IF NOT EXISTS idx_customer_receipts_created_by ON customer_receipts(created_by)',
    'CREATE INDEX IF NOT EXISTS idx_customer_receipts_created_at ON customer_receipts(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_customer_receipts_money_box_id ON customer_receipts(money_box_id)',
    'CREATE INDEX IF NOT EXISTS idx_customer_receipts_delegate_id ON customer_receipts(delegate_id)',
    'CREATE INDEX IF NOT EXISTS idx_customer_receipts_employee_id ON customer_receipts(employee_id)',

    // Supplier payment receipts indexes
    'CREATE INDEX IF NOT EXISTS idx_supplier_payment_receipts_supplier_id ON supplier_payment_receipts(supplier_id)',
    'CREATE INDEX IF NOT EXISTS idx_supplier_payment_receipts_purchase_id ON supplier_payment_receipts(purchase_id)',
    'CREATE INDEX IF NOT EXISTS idx_supplier_payment_receipts_receipt_date ON supplier_payment_receipts(receipt_date)',
    'CREATE INDEX IF NOT EXISTS idx_supplier_payment_receipts_barcode ON supplier_payment_receipts(barcode)',
    'CREATE INDEX IF NOT EXISTS idx_supplier_payment_receipts_created_by ON supplier_payment_receipts(created_by)',
    'CREATE INDEX IF NOT EXISTS idx_supplier_payment_receipts_money_box_id ON supplier_payment_receipts(money_box_id)',

    // Inventory movements indexes
    'CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON inventory_movements(product_id)',
    'CREATE INDEX IF NOT EXISTS idx_inventory_movements_movement_type ON inventory_movements(movement_type)',
    'CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference_type ON inventory_movements(reference_type)',
    'CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference_id ON inventory_movements(reference_id)',
    'CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_by ON inventory_movements(created_by)',

    // Product suppliers indexes
    'CREATE INDEX IF NOT EXISTS idx_product_suppliers_product_id ON product_suppliers(product_id)',
    'CREATE INDEX IF NOT EXISTS idx_product_suppliers_supplier_id ON product_suppliers(supplier_id)',
    'CREATE INDEX IF NOT EXISTS idx_product_suppliers_is_primary ON product_suppliers(is_primary)',
    'CREATE INDEX IF NOT EXISTS idx_product_suppliers_is_active ON product_suppliers(is_active)',

    // Stock movements indexes
    'CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id)',
    'CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON stock_movements(movement_type)',
    'CREATE INDEX IF NOT EXISTS idx_stock_movements_reference_type ON stock_movements(reference_type)',
    'CREATE INDEX IF NOT EXISTS idx_stock_movements_reference_id ON stock_movements(reference_id)',
    'CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_stock_movements_created_by ON stock_movements(created_by)',

    // Purchase history indexes
    'CREATE INDEX IF NOT EXISTS idx_purchase_history_purchase_id ON purchase_history(purchase_id)',
    'CREATE INDEX IF NOT EXISTS idx_purchase_history_action_type ON purchase_history(action_type)',
    'CREATE INDEX IF NOT EXISTS idx_purchase_history_created_at ON purchase_history(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_purchase_history_created_by ON purchase_history(created_by)',

    // Expenses indexes
    'CREATE INDEX IF NOT EXISTS idx_expenses_money_box_id ON expenses(money_box_id)',
    'CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by)',
    'CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)',

    // Purchase returns indexes
    'CREATE INDEX IF NOT EXISTS idx_purchase_returns_purchase_id ON purchase_returns(purchase_id)',
    'CREATE INDEX IF NOT EXISTS idx_purchase_returns_return_date ON purchase_returns(return_date)',
    'CREATE INDEX IF NOT EXISTS idx_purchase_returns_created_by ON purchase_returns(created_by)',
    'CREATE INDEX IF NOT EXISTS idx_purchase_return_items_return_id ON purchase_return_items(return_id)',
    'CREATE INDEX IF NOT EXISTS idx_purchase_return_items_purchase_item_id ON purchase_return_items(purchase_item_id)',

    // Sale returns indexes
    'CREATE INDEX IF NOT EXISTS idx_sale_returns_sale_id ON sale_returns(sale_id)',
    'CREATE INDEX IF NOT EXISTS idx_sale_returns_return_date ON sale_returns(return_date)',
    'CREATE INDEX IF NOT EXISTS idx_sale_returns_created_by ON sale_returns(created_by)',
    'CREATE INDEX IF NOT EXISTS idx_sale_return_items_return_id ON sale_return_items(return_id)',
    'CREATE INDEX IF NOT EXISTS idx_sale_return_items_sale_item_id ON sale_return_items(sale_item_id)',

    // Licenses indexes
    'CREATE INDEX IF NOT EXISTS idx_licenses_is_active ON licenses(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_licenses_device_id ON licenses(device_id)',
    'CREATE INDEX IF NOT EXISTS idx_licenses_created_at ON licenses(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_licenses_updated_at ON licenses(updated_at)',

    // Upload Schedules indexes
    'CREATE INDEX IF NOT EXISTS idx_upload_schedules_user_id ON upload_schedules(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_upload_schedules_active ON upload_schedules(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_upload_schedules_next_run ON upload_schedules(next_run)',
    'CREATE INDEX IF NOT EXISTS idx_upload_schedules_type ON upload_schedules(schedule_type)',
    'CREATE INDEX IF NOT EXISTS idx_upload_schedules_status ON upload_schedules(last_run_status)',
    'CREATE INDEX IF NOT EXISTS idx_upload_schedules_created_at ON upload_schedules(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_upload_schedules_interval_minutes ON upload_schedules(interval_minutes)',

    // Pending Sync indexes
    'CREATE INDEX IF NOT EXISTS idx_pending_sync_userId ON pending_sync(userId)',
    'CREATE INDEX IF NOT EXISTS idx_pending_sync_status ON pending_sync(status)',
    'CREATE INDEX IF NOT EXISTS idx_pending_sync_created_at ON pending_sync(created_at)',

    // Schema Migrations indexes
    'CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version)',
    'CREATE INDEX IF NOT EXISTS idx_schema_migrations_executed_at ON schema_migrations(executed_at)',
    'CREATE INDEX IF NOT EXISTS idx_schema_migrations_status ON schema_migrations(status)',

    // Employees indexes
    'CREATE INDEX IF NOT EXISTS idx_employees_created_at ON employees(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_employees_updated_at ON employees(updated_at)',
    'CREATE INDEX IF NOT EXISTS idx_employees_salary ON employees(salary)',

    // ===== DELEGATE SYSTEM INDEXES =====
    
    // Delegate Sales indexes
    'CREATE INDEX IF NOT EXISTS idx_delegate_sales_delegate_id ON delegate_sales(delegate_id)',
    'CREATE INDEX IF NOT EXISTS idx_delegate_sales_customer_id ON delegate_sales(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_delegate_sales_sale_id ON delegate_sales(sale_id)',
    'CREATE INDEX IF NOT EXISTS idx_delegate_sales_payment_status ON delegate_sales(payment_status)',
    'CREATE INDEX IF NOT EXISTS idx_delegate_sales_created_at ON delegate_sales(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_delegate_sales_total_amount ON delegate_sales(total_amount)',
    'CREATE INDEX IF NOT EXISTS idx_delegate_sales_commission_amount ON delegate_sales(commission_amount)',

    // Delegate Collections indexes
    'CREATE INDEX IF NOT EXISTS idx_delegate_collections_delegate_id ON delegate_collections(delegate_id)',
    'CREATE INDEX IF NOT EXISTS idx_delegate_collections_customer_id ON delegate_collections(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_delegate_collections_sale_id ON delegate_collections(sale_id)',
    'CREATE INDEX IF NOT EXISTS idx_delegate_collections_collection_date ON delegate_collections(collection_date)',
    'CREATE INDEX IF NOT EXISTS idx_delegate_collections_payment_method ON delegate_collections(payment_method)',
    'CREATE INDEX IF NOT EXISTS idx_delegate_collections_receipt_number ON delegate_collections(receipt_number)',
    'CREATE INDEX IF NOT EXISTS idx_delegate_collections_created_at ON delegate_collections(created_at)',

    // Delegate Commission Payments indexes
    'CREATE INDEX IF NOT EXISTS idx_delegate_commission_payments_delegate_id ON delegate_commission_payments(delegate_id)',
    'CREATE INDEX IF NOT EXISTS idx_delegate_commission_payments_period_start ON delegate_commission_payments(period_start)',
    'CREATE INDEX IF NOT EXISTS idx_delegate_commission_payments_period_end ON delegate_commission_payments(period_end)',
    'CREATE INDEX IF NOT EXISTS idx_delegate_commission_payments_payment_status ON delegate_commission_payments(payment_status)',
    'CREATE INDEX IF NOT EXISTS idx_delegate_commission_payments_payment_date ON delegate_commission_payments(payment_date)',
    'CREATE INDEX IF NOT EXISTS idx_delegate_commission_payments_created_at ON delegate_commission_payments(created_at)',

    // Delegate Performance Reports indexes
    'CREATE INDEX IF NOT EXISTS idx_delegate_performance_reports_delegate_id ON delegate_performance_reports(delegate_id)',
    'CREATE INDEX IF NOT EXISTS idx_delegate_performance_reports_report_date ON delegate_performance_reports(report_date)',
    'CREATE INDEX IF NOT EXISTS idx_delegate_performance_reports_period_type ON delegate_performance_reports(period_type)',
    'CREATE INDEX IF NOT EXISTS idx_delegate_performance_reports_created_at ON delegate_performance_reports(created_at)',

    // Delegate Customer Assignments indexes
    'CREATE INDEX IF NOT EXISTS idx_delegate_customer_assignments_delegate_id ON delegate_customer_assignments(delegate_id)',
    'CREATE INDEX IF NOT EXISTS idx_delegate_customer_assignments_customer_id ON delegate_customer_assignments(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_delegate_customer_assignments_assignment_date ON delegate_customer_assignments(assignment_date)',
    'CREATE INDEX IF NOT EXISTS idx_delegate_customer_assignments_is_active ON delegate_customer_assignments(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_delegate_customer_assignments_created_at ON delegate_customer_assignments(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_employees_commission_rate ON employees(commission_rate)',
    'CREATE INDEX IF NOT EXISTS idx_employees_commission_type ON employees(commission_type)',
    'CREATE INDEX IF NOT EXISTS idx_employees_commission_amount ON employees(commission_amount)',
    'CREATE INDEX IF NOT EXISTS idx_employees_commission_start_date ON employees(commission_start_date)',
    'CREATE INDEX IF NOT EXISTS idx_employees_commission_end_date ON employees(commission_end_date)',
    'CREATE INDEX IF NOT EXISTS idx_employees_phone ON employees(phone)',
    'CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email)',
    'CREATE INDEX IF NOT EXISTS idx_employees_address ON employees(address)',
    // Representatives indexes
    'CREATE INDEX IF NOT EXISTS idx_representatives_customer_id ON representatives(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_representatives_created_at ON representatives(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_representatives_updated_at ON representatives(updated_at)',
    'CREATE INDEX IF NOT EXISTS idx_representatives_phone ON representatives(phone)',
    'CREATE INDEX IF NOT EXISTS idx_representatives_email ON representatives(email)',
    'CREATE INDEX IF NOT EXISTS idx_representatives_address ON representatives(address)',

    // ===== COMPOSITE INDEXES FOR PERFORMANCE =====
    // Sales queries - customer + date range
    'CREATE INDEX IF NOT EXISTS idx_sales_customer_date ON sales(customer_id, invoice_date)',
    // Sales queries - payment status + date
    'CREATE INDEX IF NOT EXISTS idx_sales_status_date ON sales(payment_status, invoice_date)',
    // Sales queries - status + created_by
    'CREATE INDEX IF NOT EXISTS idx_sales_status_created_by ON sales(status, created_by)',
    
    // Products queries - stock + active status
    'CREATE INDEX IF NOT EXISTS idx_products_stock_active ON products(stock_id, is_active)',
    // Products queries - category + active status
    'CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category_id, is_active)',
    // Products queries - stock level + active status
    'CREATE INDEX IF NOT EXISTS idx_products_stock_level_active ON products(current_stock, is_active)',
    
    // Customer receipts queries - customer + date
    'CREATE INDEX IF NOT EXISTS idx_customer_receipts_customer_date ON customer_receipts(customer_id, receipt_date)',
    // Customer receipts queries - sale + payment type
    'CREATE INDEX IF NOT EXISTS idx_customer_receipts_sale_type ON customer_receipts(sale_id, payment_type)',
    
    // Supplier payment receipts queries - supplier + date
    'CREATE INDEX IF NOT EXISTS idx_supplier_receipts_supplier_date ON supplier_payment_receipts(supplier_id, receipt_date)',
    
    // Installments queries - customer + payment status
    'CREATE INDEX IF NOT EXISTS idx_installments_customer_status ON installments(customer_id, payment_status)',
    // Installments queries - due date + payment status
    'CREATE INDEX IF NOT EXISTS idx_installments_due_status ON installments(due_date, payment_status)',
    
    // Cash box transactions queries - cash box + type + date
    'CREATE INDEX IF NOT EXISTS idx_cash_box_transactions_box_type_date ON cash_box_transactions(cash_box_id, transaction_type, created_at)',
    
    // Money box transactions queries - box + type + date
    'CREATE INDEX IF NOT EXISTS idx_money_box_transactions_box_type_date ON money_box_transactions(box_id, type, created_at)',
    
    // Inventory movements queries - product + type + date
    'CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_type_date ON inventory_movements(product_id, movement_type, created_at)',
    
    // Stock movements queries - product + movement type + date
    'CREATE INDEX IF NOT EXISTS idx_stock_movements_product_type_date ON stock_movements(product_id, movement_type, movement_date)',
    
    // Sale items queries - sale + product
    'CREATE INDEX IF NOT EXISTS idx_sale_items_sale_product ON sale_items(sale_id, product_id)',
    
    // Purchase items queries - purchase + product
    'CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_product ON purchase_items(purchase_id, product_id)',
    
    // Customers queries - type + active status
    'CREATE INDEX IF NOT EXISTS idx_customers_type_active ON customers(customer_type, is_active)',
    
    // Suppliers queries - active status + balance
    'CREATE INDEX IF NOT EXISTS idx_suppliers_active_balance ON suppliers(is_active, current_balance)',


  ];

  indexes.forEach(indexSQL => {
    try {
      db.prepare(indexSQL).run();
    } catch (error) {
      logger.warn(`Failed to create index: ${error.message}`);
    }
  });

  logger.info('Database indexes created successfully');
}

function createAllTriggers() {
  logger.info('Creating database triggers...');

  // Trigger to update product stock when purchase items are inserted
  db.prepare(`
    CREATE TRIGGER IF NOT EXISTS trigger_purchase_item_insert
    AFTER INSERT ON purchase_items
    WHEN NEW.product_id > 0 AND EXISTS (SELECT 1 FROM products WHERE id = NEW.product_id)
    BEGIN
      UPDATE products 
      SET current_stock = current_stock + NEW.quantity,
          total_purchased = total_purchased + NEW.quantity,
          last_purchase_date = CURRENT_DATE,
          last_purchase_price = NEW.price,
          average_cost = CASE 
            WHEN (total_purchased - NEW.quantity) > 0 
            THEN ((average_cost * (total_purchased - NEW.quantity)) + (NEW.price * NEW.quantity)) / total_purchased
            ELSE NEW.price
          END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.product_id;
      
      INSERT INTO inventory_movements (
        product_id, movement_type, quantity, previous_stock, new_stock,
        reference_type, reference_id, unit_cost, total_value, notes, created_by
      ) VALUES (
        NEW.product_id, 'purchase', NEW.quantity,
        (SELECT current_stock - NEW.quantity FROM products WHERE id = NEW.product_id),
        (SELECT current_stock FROM products WHERE id = NEW.product_id),
        'purchase', NEW.purchase_id, NEW.price, 
        NEW.total, 
        'تم إضافة المنتج إلى المخزن بواسطة الفاتورة رقم ' || NEW.purchase_id, 
        (SELECT created_by FROM purchases WHERE id = NEW.purchase_id)
      );
    END
  `).run();

  // Trigger to update product stock when purchase items are updated
  db.prepare(`
    CREATE TRIGGER IF NOT EXISTS trigger_purchase_item_update
    AFTER UPDATE ON purchase_items
    WHEN NEW.product_id > 0 AND EXISTS (SELECT 1 FROM products WHERE id = NEW.product_id)
    BEGIN
      UPDATE products 
      SET current_stock = current_stock + (NEW.quantity - OLD.quantity),
          total_purchased = total_purchased + (NEW.quantity - OLD.quantity),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.product_id;
      
      INSERT INTO inventory_movements (
        product_id, movement_type, quantity, previous_stock, new_stock,
        reference_type, reference_id, unit_cost, total_value, notes, created_by
      ) VALUES (
        NEW.product_id, 'purchase', (NEW.quantity - OLD.quantity),
        (SELECT current_stock - (NEW.quantity - OLD.quantity) FROM products WHERE id = NEW.product_id),
        (SELECT current_stock FROM products WHERE id = NEW.product_id),
        'purchase', NEW.purchase_id, NEW.price, 
        NEW.total, 
        'تم تحديث المنتج في المخزن بواسطة الفاتورة رقم ' || NEW.purchase_id, 
        (SELECT created_by FROM purchases WHERE id = NEW.purchase_id)
      );
    END
  `).run();

  // Drop existing trigger first to ensure it's updated
  db.prepare('DROP TRIGGER IF EXISTS trigger_sale_item_insert').run();
  
  // Trigger to update product stock when sale items are inserted
  // Only for real products (positive product_id that exists in products table)
  // Skip manual items (product_name is not null or product_id is null)
  db.prepare(`
    CREATE TRIGGER trigger_sale_item_insert
    AFTER INSERT ON sale_items
    WHEN NEW.product_id IS NOT NULL AND NEW.product_id > 0 AND NEW.product_id IN (SELECT id FROM products WHERE id > 0)
    BEGIN
      UPDATE products 
      SET current_stock = current_stock - NEW.quantity,
          total_sold = total_sold + NEW.quantity,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.product_id;
      
      INSERT INTO inventory_movements (
        product_id, movement_type, quantity, previous_stock, new_stock,
        reference_type, reference_id, unit_cost, total_value, notes, created_by
      ) VALUES (
        NEW.product_id, 'sale', NEW.quantity,
        (SELECT current_stock + NEW.quantity FROM products WHERE id = NEW.product_id),
        (SELECT current_stock FROM products WHERE id = NEW.product_id),
        'sale', NEW.sale_id, NEW.price, 
        NEW.total, 
        'تم إضافة المنتج إلى المخزن بواسطة فاتورة البيع رقم ' || NEW.sale_id, 
        (SELECT created_by FROM sales WHERE id = NEW.sale_id)
      );
    END
  `).run();

  // Trigger to update product stock when sale items are updated
  // Only for real products (positive product_id that exists in products table)
  db.prepare(`
    CREATE TRIGGER IF NOT EXISTS trigger_sale_item_update
    AFTER UPDATE ON sale_items
    WHEN NEW.product_id IS NOT NULL AND NEW.product_id > 0 AND NEW.product_id IN (SELECT id FROM products WHERE id > 0)
    AND (NEW.quantity != OLD.quantity OR OLD.quantity IS NULL)
    BEGIN
      UPDATE products 
      SET current_stock = current_stock + OLD.quantity - NEW.quantity,
          total_sold = MAX(0, total_sold - OLD.quantity + NEW.quantity),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.product_id;
      
      INSERT INTO inventory_movements (
        product_id, movement_type, quantity, previous_stock, new_stock,
        reference_type, reference_id, unit_cost, total_value, notes, created_by
      ) VALUES (
        NEW.product_id, 'sale', (NEW.quantity - OLD.quantity),
        (SELECT current_stock - (NEW.quantity - OLD.quantity) FROM products WHERE id = NEW.product_id),
        (SELECT current_stock FROM products WHERE id = NEW.product_id),
        'sale', NEW.sale_id, NEW.price, 
        NEW.total, 
        'تم تحديث المنتج في المخزن بواسطة فاتورة البيع رقم ' || NEW.sale_id, 
        (SELECT created_by FROM sales WHERE id = NEW.sale_id)
      );
    END
  `).run();

  // Trigger to update product stock when sale items are deleted
  // Only for real products (positive product_id that exists in products table)
  db.prepare(`
    CREATE TRIGGER IF NOT EXISTS trigger_sale_item_delete
    AFTER DELETE ON sale_items
    WHEN OLD.product_id IS NOT NULL AND OLD.product_id > 0 AND OLD.product_id IN (SELECT id FROM products WHERE id > 0)
    BEGIN
      UPDATE products 
      SET current_stock = current_stock + OLD.quantity,
          total_sold = MAX(0, total_sold - OLD.quantity),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = OLD.product_id;
      
      INSERT INTO inventory_movements (
        product_id, movement_type, quantity, previous_stock, new_stock,
        reference_type, reference_id, unit_cost, total_value, notes, created_by
      ) VALUES (
        OLD.product_id, 'sale', -OLD.quantity,
        (SELECT current_stock - OLD.quantity FROM products WHERE id = OLD.product_id),
        (SELECT current_stock FROM products WHERE id = OLD.product_id),
        'sale', OLD.sale_id, OLD.price, 
        OLD.total, 
        'تم حذف المنتج من المخزن بواسطة فاتورة البيع رقم ' || OLD.sale_id, 
        (SELECT created_by FROM sales WHERE id = OLD.sale_id)
      );
    END
  `).run();

  // Trigger to update product stock when purchase items are deleted
  db.prepare(`
    CREATE TRIGGER IF NOT EXISTS trigger_purchase_item_delete
    AFTER DELETE ON purchase_items
    WHEN OLD.product_id > 0 AND EXISTS (SELECT 1 FROM products WHERE id = OLD.product_id)
    BEGIN
      UPDATE products 
      SET current_stock = current_stock - OLD.quantity,
          total_purchased = total_purchased - OLD.quantity,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = OLD.product_id;
      
      INSERT INTO inventory_movements (
        product_id, movement_type, quantity, previous_stock, new_stock,
        reference_type, reference_id, unit_cost, total_value, notes, created_by
      ) VALUES (
        OLD.product_id, 'purchase', -OLD.quantity,
        (SELECT current_stock + OLD.quantity FROM products WHERE id = OLD.product_id),
        (SELECT current_stock FROM products WHERE id = OLD.product_id),
        'purchase', OLD.purchase_id, OLD.price, 
        OLD.total, 
        'تم حذف المنتج من المخزن بواسطة الفاتورة رقم ' || OLD.purchase_id, 
        (SELECT created_by FROM purchases WHERE id = OLD.purchase_id)
      );
    END
  `).run();

  // Trigger to update supplier balance when purchases are inserted
  db.prepare(`
    CREATE TRIGGER IF NOT EXISTS trigger_purchase_insert
    AFTER INSERT ON purchases
    BEGIN
      UPDATE suppliers 
      SET current_balance = current_balance + NEW.total_amount,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.supplier_id;
    END
  `).run();

  // Trigger to update supplier balance when purchases are updated
  db.prepare(`
    CREATE TRIGGER IF NOT EXISTS trigger_purchase_update
    AFTER UPDATE ON purchases
    BEGIN
      UPDATE suppliers 
      SET current_balance = current_balance + (NEW.total_amount - OLD.total_amount),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.supplier_id;
    END
  `).run();

  // Trigger to update product stock when sale item returned_quantity is updated
  // Only for real products (positive product_id that exists in products table)
  db.prepare(`
    CREATE TRIGGER IF NOT EXISTS trigger_sale_item_return_update
    AFTER UPDATE ON sale_items
    WHEN NEW.product_id IS NOT NULL AND NEW.product_id > 0 AND NEW.product_id IN (SELECT id FROM products WHERE id > 0)
    AND (NEW.returned_quantity != OLD.returned_quantity OR OLD.returned_quantity IS NULL)
    BEGIN
      UPDATE products 
      SET current_stock = current_stock + (NEW.returned_quantity - COALESCE(OLD.returned_quantity, 0)),
          total_sold = MAX(0, total_sold - (NEW.returned_quantity - COALESCE(OLD.returned_quantity, 0))),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.product_id;
      
      INSERT INTO inventory_movements (
        product_id, movement_type, quantity, previous_stock, new_stock,
        reference_type, reference_id, unit_cost, total_value, notes, created_by
      ) VALUES (
        NEW.product_id, 'return', (NEW.returned_quantity - COALESCE(OLD.returned_quantity, 0)),
        (SELECT current_stock - (NEW.returned_quantity - COALESCE(OLD.returned_quantity, 0)) FROM products WHERE id = NEW.product_id),
        (SELECT current_stock FROM products WHERE id = NEW.product_id),
        'sale', NEW.sale_id, NEW.price, 
        NEW.total, 
        'تم معالجة إرجاع المنتج بواسطة فاتورة البيع رقم ' || NEW.sale_id, 
        (SELECT created_by FROM sales WHERE id = NEW.sale_id)
      );
    END
  `).run();

  logger.info('Database triggers created successfully');
}

function insertDefaultData() {
  logger.info('Inserting default data...');

  // Insert default admin user
  const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
  if (!existingUser) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    
    const adminUserId = db.prepare(`
      INSERT INTO users (username, password, name, role, created_at, updated_at)
      VALUES (?, ?, ?, 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run('admin', hashedPassword, 'Administrator');
    
    logger.info('Default admin user created');
  }

  // Insert anonymous customer
  const existingCustomer = db.prepare('SELECT * FROM customers WHERE id = 999').get();
  if (!existingCustomer) {
    db.prepare(`
      INSERT INTO customers (
        id, name, phone, email, address, credit_limit, current_balance, is_active, customer_type, created_at, updated_at
      ) VALUES (999, 'Anonymous', 'N/A', 'N/A', 'N/A', 1000000, 0, 1, 'retail', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run();
    logger.info('Anonymous customer created');
  }


  // Insert default money boxes (الصندوق اليومي، القاصة، الصيرفة)
  const existingMoneyBoxes = db.prepare('SELECT COUNT(*) as count FROM money_boxes').get();
  if (existingMoneyBoxes.count === 0) {
    db.prepare(`
      INSERT INTO money_boxes (name, amount, notes, created_by, created_at, updated_at)
      VALUES ('الصندوق اليومي', 0, 'الصندوق اليومي للشركة', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run();
    db.prepare(`
      INSERT INTO money_boxes (name, amount, notes, created_by, created_at, updated_at)
      VALUES ('القاصة', 0, 'القاصة للشركة', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run();
    db.prepare(`
      INSERT INTO money_boxes (name, amount, notes, created_by, created_at, updated_at)
      VALUES ('الصيرفة', 0, 'الصيرفة للشركة', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run();
  }
  // Insert default settings
  const existingSettings = db.prepare('SELECT COUNT(*) as count FROM settings WHERE id = 1').get();
  if (existingSettings.count === 0) {
    // Set default menu items (updated with all migration changes)
    const defaultMenuItems = [
      { id: 'dashboard', name: 'لوحة التحكم', path: '/dashboard-charts', icon: 'LayoutDashboard', enabled: true, active: true },
      { id: 'pos', name: 'نقطة البيع', path: '/pos', icon: 'ShoppingCart', enabled: true, active: true },
      { id: 'sales', name: 'المبيعات', path: '/sales', icon: 'DollarSign', enabled: true, active: true },
      { id: 'purchases', name: 'المشتريات', path: '/purchases', icon: 'Truck', enabled: true, active: true },
      { id: 'cashbox', name: 'صندوق النقد', path: '/cash-box', icon: 'DollarSign', enabled: true, active: true },
      { id: 'admin-cashbox', name: 'إدارة الصناديق', path: '/admin-cash-box', icon: 'Settings', enabled: true, active: true, adminOnly: true },
      { id: 'inventory', name: 'المنتجات', path: '/inventory', icon: 'Package', enabled: true, active: true },
      { id: 'bills', name: 'الفواتير', path: '/bills', icon: 'ClipboardList', enabled: true, active: true },
      { id: 'stocks', name: 'المخازن', path: '/stocks', icon: 'Warehouse', enabled: true, active: true },
      { id: 'customers', name: 'العملاء', path: '/customers', icon: 'Users', enabled: true, active: true },
      { id: 'suppliers', name: 'الموردين', path: '/suppliers', icon: 'Store', enabled: true, active: true },
      { id: 'customer-receipts', name: 'سند قبض', path: '/customer-receipts', icon: 'Receipt', enabled: true, active: true },
      { id: 'supplier-payment-receipts', name: 'سند صرف', path: '/supplier-payment-receipts', icon: 'CreditCard', enabled: true, active: true },
      { id: 'expenses', name: 'المصروفات', path: '/expenses', icon: 'ReceiptText', enabled: true, active: true },
      { id: 'reports', name: 'التقارير', path: '/reports', icon: 'BarChart', enabled: true, active: true },
      { id: 'debts', name: 'الديون', path: '/debts', icon: 'FileText', enabled: true, active: true },
      { id: 'installments', name: 'الأقساط', path: '/installments', icon: 'CreditCard', enabled: true, active: true },
      { id: 'settings', name: 'الإعدادات', path: '/settings', icon: 'Settings', enabled: true, active: true }
    ];

    db.prepare(`
      INSERT INTO settings (
        id, company_name, currency, primary_color, secondary_color, 
        bill_footer_text, sidebar_menu_items, created_at, updated_at
      ) VALUES (1, 'شركتي', 'IQD', '#2c2b2b', '#ededed', 'شكراً لزيارتكم', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(JSON.stringify(defaultMenuItems));
    logger.info('Default settings created');
  }

  // Insert default main stock
  const existingStock = db.prepare('SELECT COUNT(*) as count FROM stocks WHERE is_main_stock = 1').get();
  if (existingStock.count === 0) {
    db.prepare(`
      INSERT INTO stocks (
        name, code, description, address, city, state, country,
        phone, email, manager_name, manager_phone, manager_email,
        is_main_stock, is_active, capacity, current_capacity_used,
        notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      'المخزن الرئيسي', 'MAIN-STOCK-001', 'المخزن الرئيسي للشركة',
      'بغداد، العراق', 'بغداد', 'بغداد', 'Iraq',
      '+964 770 123 4567', 'stock@company.com',
      'مدير المخزن', '+964 770 123 4568', 'manager@company.com',
      1, 1, 10000.00, 0.00,
      'المخزن الرئيسي للشركة - يحتوي على جميع المنتجات',
      1
    );
    logger.info('Default main stock created');
  }

// Insert simplified default permissions
const existingPermissions = db.prepare('SELECT COUNT(*) as count FROM permissions').get();

if (existingPermissions.count === 0) {
  const defaultPermissions = [
    { permission_id: 'dashboard.view', name: 'عرض لوحة التحكم', description: 'عرض لوحة التحكم', category: 'dashboard' },
    { permission_id: 'pos.manage', name: 'إدارة نقطة البيع', description: 'عرض وإدارة نقطة البيع', category: 'pos' },
    { permission_id: 'pos.view', name: 'عرض نقطة البيع', description: 'عرض نقطة البيع', category: 'pos' },
    { permission_id: 'pos.add', name: 'إضافة نقطة البيع', description: 'إضافة نقطة البيع', category: 'pos' },
    { permission_id: 'pos.edit', name: 'تعديل نقطة البيع', description: 'تعديل نقطة البيع', category: 'pos' },
    { permission_id: 'pos.delete', name: 'حذف نقطة البيع', description: 'حذف نقطة البيع', category: 'pos' },
    { permission_id: 'products.manage', name: 'إدارة المنتجات', description: 'عرض وإضافة وتعديل وحذف المنتجات', category: 'products' },
    { permission_id: 'products.view', name: 'عرض المنتجات', description: 'عرض المنتجات', category: 'products' },
    { permission_id: 'products.add', name: 'إضافة المنتجات', description: 'إضافة المنتجات', category: 'products' },
    { permission_id: 'products.edit', name: 'تعديل المنتجات', description: 'تعديل المنتجات', category: 'products' },
    { permission_id: 'products.delete', name: 'حذف المنتجات', description: 'حذف المنتجات', category: 'products' },
    { permission_id: 'sales.manage', name: 'إدارة المبيعات', description: 'عرض وإنشاء وتعديل وحذف الفواتير والمرتجعات', category: 'sales' },
    { permission_id: 'sales.view', name: 'عرض المبيعات', description: 'عرض المبيعات', category: 'sales' },
    { permission_id: 'sales.add', name: 'إضافة المبيعات', description: 'إضافة المبيعات', category: 'sales' },
    { permission_id: 'sales.edit', name: 'تعديل المبيعات', description: 'تعديل المبيعات', category: 'sales' },
    { permission_id: 'sales.delete', name: 'حذف المبيعات', description: 'حذف المبيعات', category: 'sales' },
    { permission_id: 'customers.manage', name: 'إدارة العملاء', description: 'عرض وإضافة وتعديل وحذف العملاء', category: 'customers' },
    { permission_id: 'customers.view', name: 'عرض العملاء', description: 'عرض العملاء', category: 'customers' },
    { permission_id: 'customers.add', name: 'إضافة العملاء', description: 'إضافة العملاء', category: 'customers' },
    { permission_id: 'customers.edit', name: 'تعديل العملاء', description: 'تعديل العملاء', category: 'customers' },
    { permission_id: 'customers.delete', name: 'حذف العملاء', description: 'حذف العملاء', category: 'customers' },
    { permission_id: 'purchases.manage', name: 'إدارة المشتريات', description: 'عرض وإنشاء وتعديل وحذف المشتريات', category: 'purchases' },
    { permission_id: 'purchases.view', name: 'عرض المشتريات', description: 'عرض المشتريات', category: 'purchases' },
    { permission_id: 'purchases.add', name: 'إضافة المشتريات', description: 'إضافة المشتريات', category: 'purchases' },
    { permission_id: 'purchases.edit', name: 'تعديل المشتريات', description: 'تعديل المشتريات', category: 'purchases' },
    { permission_id: 'purchases.delete', name: 'حذف المشتريات', description: 'حذف المشتريات', category: 'purchases' },
    { permission_id: 'suppliers.manage', name: 'إدارة الموردين', description: 'عرض وإضافة وتعديل وحذف الموردين', category: 'suppliers' },
    { permission_id: 'suppliers.view', name: 'عرض الموردين', description: 'عرض الموردين', category: 'suppliers' },
    { permission_id: 'suppliers.add', name: 'إضافة الموردين', description: 'إضافة الموردين', category: 'suppliers' },
    { permission_id: 'suppliers.edit', name: 'تعديل الموردين', description: 'تعديل الموردين', category: 'suppliers' },
    { permission_id: 'suppliers.delete', name: 'حذف الموردين', description: 'حذف الموردين', category: 'suppliers' },
    { permission_id: 'inventory.manage', name: 'إدارة المخزون', description: 'عرض وتحريك المخزون', category: 'inventory' },
    { permission_id: 'inventory.view', name: 'عرض المخزون', description: 'عرض المخزون', category: 'inventory' },
    { permission_id: 'inventory.add', name: 'إضافة المخزون', description: 'إضافة المخزون', category: 'inventory' },
    { permission_id: 'inventory.edit', name: 'تعديل المخزون', description: 'تعديل المخزون', category: 'inventory' },
    { permission_id: 'inventory.delete', name: 'حذف المخزون', description: 'حذف المخزون', category: 'inventory' },
    { permission_id: 'cashbox.manage', name: 'إدارة الصندوق', description: 'عرض وإدارة العمليات المالية بالصندوق', category: 'cashbox' },
    { permission_id: 'cashbox.view', name: 'عرض الصندوق', description: 'عرض الصندوق', category: 'cashbox' },
    { permission_id: 'cashbox.add', name: 'إضافة الصندوق', description: 'إضافة الصندوق', category: 'cashbox' },
    { permission_id: 'cashbox.edit', name: 'تعديل الصندوق', description: 'تعديل الصندوق', category: 'cashbox' },
    { permission_id: 'cashbox.delete', name: 'حذف الصندوق', description: 'حذف الصندوق', category: 'cashbox' },
    { permission_id: 'debts.manage', name: 'إدارة الديون', description: 'عرض وتسوية الديون والمدفوعات', category: 'debts' },
    { permission_id: 'debts.view', name: 'عرض الديون', description: 'عرض الديون', category: 'debts' },
    { permission_id: 'debts.add', name: 'إضافة الديون', description: 'إضافة الديون', category: 'debts' },
    { permission_id: 'debts.edit', name: 'تعديل الديون', description: 'تعديل الديون', category: 'debts' },
    { permission_id: 'debts.delete', name: 'حذف الديون', description: 'حذف الديون', category: 'debts' },
    { permission_id: 'installments.manage', name: 'إدارة الأقساط', description: 'عرض وتسوية الأقساط والمدفوعات', category: 'installments' },
    { permission_id: 'installments.view', name: 'عرض الأقساط', description: 'عرض الأقساط', category: 'installments' },
    { permission_id: 'installments.add', name: 'إضافة الأقساط', description: 'إضافة الأقساط', category: 'installments' },
    { permission_id: 'installments.edit', name: 'تعديل الأقساط', description: 'تعديل الأقساط', category: 'installments' },
    { permission_id: 'installments.delete', name: 'حذف الأقساط', description: 'حذف الأقساط', category: 'installments' },
    { permission_id: 'reports.view', name: 'عرض التقارير', description: 'عرض كل أنواع التقارير', category: 'reports' },
    { permission_id: 'reports.add', name: 'إضافة التقارير', description: 'إضافة التقارير', category: 'reports' },
    { permission_id: 'reports.edit', name: 'تعديل التقارير', description: 'تعديل التقارير', category: 'reports' },
    { permission_id: 'reports.delete', name: 'حذف التقارير', description: 'حذف التقارير', category: 'reports' },
    { permission_id: 'settings.manage', name: 'إعدادات النظام', description: 'عرض وتعديل إعدادات النظام', category: 'settings' },
    { permission_id: 'users.permissions', name: 'إدارة صلاحيات المستخدمين', description: 'إدارة صلاحيات المستخدمين', category: 'users' },
    { permission_id: 'backup.manage', name: 'النسخ الاحتياطي', description: 'إنشاء واستعادة النسخ الاحتياطية', category: 'backup' },
    { permission_id: 'profile.manage', name: 'إدارة الملف الشخصي', description: 'عرض وتعديل بيانات المستخدم', category: 'profile' },
    { permission_id: 'expenses.manage', name: 'إدارة المصروفات', description: 'عرض وإضافة وتعديل وحذف المصروفات', category: 'expenses' },
    { permission_id: 'expenses.view', name: 'عرض المصروفات', description: 'عرض المصروفات', category: 'expenses' },
    { permission_id: 'expenses.add', name: 'إضافة المصروفات', description: 'إضافة المصروفات', category: 'expenses' },
    { permission_id: 'expenses.edit', name: 'تعديل المصروفات', description: 'تعديل المصروفات', category: 'expenses' },
    { permission_id: 'expenses.delete', name: 'حذف المصروفات', description: 'حذف المصروفات', category: 'expenses' }
  ];

  for (const p of defaultPermissions) {
    db.prepare(`
      INSERT OR IGNORE INTO permissions (permission_id, name, description, category) 
      VALUES (?, ?, ?, ?)
    `).run(p.permission_id, p.name, p.description, p.category);
  }

  // Roles permissions - Only admin gets permissions by default
  const defaultRolePermissions = [
    // Admin gets everything
    ...defaultPermissions.map(p => ({ role: 'admin', permission_id: p.permission_id })),
    // User and manager roles get NO permissions by default
    // They must be explicitly granted permissions by admin
  ];

  for (const rp of defaultRolePermissions) {
    db.prepare(`
      INSERT OR IGNORE INTO role_permissions (role, permission_id) 
      VALUES (?, ?)
    `).run(rp.role, rp.permission_id);
  }

  logger.info('Simplified default permissions and role assignments inserted');
  logger.info('Note: Only admin role gets permissions by default. User and manager roles get NO permissions.');

  // Grant all permissions to the default admin user
  const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (adminUser) {
    for (const permission of defaultPermissions) {
      db.prepare(`
        INSERT OR REPLACE INTO user_permissions 
        (user_id, permission_id, granted_by, is_active, granted_at) 
        VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
      `).run(adminUser.id, permission.permission_id, adminUser.id);
    }
    logger.info('All simplified permissions granted to default admin user');
  }
}

  // Insert default migration data for existing migrations
  const existingMigrations = db.prepare('SELECT COUNT(*) as count FROM schema_migrations').get();
  if (existingMigrations.count === 0) {
    const defaultMigrations = [
      {
        version: '001',
        description: 'Add is_dolar column to products table',
        executed_at: 'CURRENT_TIMESTAMP',
        execution_time_ms: 150,
        status: 'success'
      },
      {
        version: '002',
        description: 'Add exchange_rate column to settings table',
        executed_at: 'CURRENT_TIMESTAMP',
        execution_time_ms: 120,
        status: 'success'
      },
      {
        version: '003',
        description: 'Allow negative stock in products table',
        executed_at: 'CURRENT_TIMESTAMP',
        execution_time_ms: 180,
        status: 'success'
      },
      {
        version: '004',
        description: 'Add stocks menu item to settings',
        executed_at: 'CURRENT_TIMESTAMP',
        execution_time_ms: 200,
        status: 'success'
      },
      {
        version: '005',
        description: 'Create stocks table',
        executed_at: 'CURRENT_TIMESTAMP',
        execution_time_ms: 300,
        status: 'success'
      },
      {
        version: '006',
        description: 'Create stock movements table',
        executed_at: 'CURRENT_TIMESTAMP',
        execution_time_ms: 250,
        status: 'success'
      },
      {
        version: '007',
        description: 'Add stock_id column to products table',
        executed_at: 'CURRENT_TIMESTAMP',
        execution_time_ms: 160,
        status: 'success'
      },
      {
        version: '008',
        description: 'Add bills menu item to settings',
        executed_at: 'CURRENT_TIMESTAMP',
        execution_time_ms: 140,
        status: 'success'
      },
      {
        version: '009',
        description: 'Add product_name column to sale_items table for manual items support',
        executed_at: 'CURRENT_TIMESTAMP',
        execution_time_ms: 220,
        status: 'success'
      },
      {
        version: '010',
        description: 'Add backup_time setting to settings table',
        executed_at: 'CURRENT_TIMESTAMP',
        execution_time_ms: 100,
        status: 'success'
      },
      {
        version: '011',
        description: 'Create pending_sync table for mobile live data',
        executed_at: 'CURRENT_TIMESTAMP',
        execution_time_ms: 180,
        status: 'success'
      },
      {
        version: '012',
        description: 'Add users.permissions permission',
        executed_at: 'CURRENT_TIMESTAMP',
        execution_time_ms: 150,
        status: 'success'
      },
      {
        version: '013',
        description: 'Add bill_type column to sales table',
        executed_at: 'CURRENT_TIMESTAMP',
        execution_time_ms: 140,
        status: 'success'
      },
      {
        version: '014',
        description: 'Add money_box_id column to purchases table',
        executed_at: 'CURRENT_TIMESTAMP',
        execution_time_ms: 120,
        status: 'success'
      },
      {
        version: '015',
        description: 'Add purchase_return transaction type to money_box_transactions table',
        executed_at: 'CURRENT_TIMESTAMP',
        execution_time_ms: 100,
        status: 'success'
      },
      {
        version: '016',
        description: 'Add money_box_id column to customer_receipts table',
        executed_at: 'CURRENT_TIMESTAMP',
        execution_time_ms: 130,
        status: 'success'
      },
      {
        version: '018',
        description: 'Add money_box_id column to supplier_payment_receipts table',
        executed_at: 'CURRENT_TIMESTAMP',
        execution_time_ms: 125,
        status: 'success'
      },
      {
        version: '019',
        description: 'Fix index issues - remove references to non-existent tables',
        executed_at: 'CURRENT_TIMESTAMP',
        execution_time_ms: 200,
        status: 'success'
      },
      {
        version: '020',
        description: 'Standardize money_box_id fields to INTEGER type',
        executed_at: 'CURRENT_TIMESTAMP',
        execution_time_ms: 500,
        status: 'success'
      },
      {
        version: '021',
        description: 'Add composite indexes for better query performance',
        executed_at: 'CURRENT_TIMESTAMP',
        execution_time_ms: 300,
        status: 'success'
      },
      {
        version: '022',
        description: 'Add sales duplicate prevention indexes',
        executed_at: 'CURRENT_TIMESTAMP',
        execution_time_ms: 150,
        status: 'success'
      },
      {
        version: '023',
        description: 'Add purchases duplicate prevention indexes',
        executed_at: 'CURRENT_TIMESTAMP',
        execution_time_ms: 140,
        status: 'success'
      }
    ];

    for (const migration of defaultMigrations) {
      db.prepare(`
        INSERT INTO schema_migrations (version, description, executed_at, execution_time_ms, status)
        VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)
      `).run(migration.version, migration.description, migration.execution_time_ms, migration.status);
    }

    logger.info('Default migration data inserted successfully');
  }

  logger.info('Default data inserted successfully');
}

function connectDatabase() {
  if (isConnecting) {
    logger.warn('Database connection already in progress');
    return db;
  }

  try {
    isConnecting = true;
    closeConnection();

    db = new Database(DB_PATH, {
      verbose: (sql) => {
        if (process.env.NODE_ENV === 'development' && 
            !sql.trim().toUpperCase().startsWith('SELECT') &&
            !sql.trim().toUpperCase().startsWith('PRAGMA')) {
          // SQL execution (debug level)
        }
      }
    });

    // Enable foreign keys and optimize database settings
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    db.pragma('cache_size = -128000'); // Increased to 128MB cache for better performance
    db.pragma('synchronous = NORMAL');
    db.pragma('temp_store = MEMORY');
    db.pragma('mmap_size = 268435456'); // 256MB memory mapping
    db.pragma('page_size = 4096'); // Optimal page size
    db.pragma('auto_vacuum = INCREMENTAL'); // Better for performance
    db.pragma('incremental_vacuum = 1000'); // Vacuum in smaller chunks

    // Verify connection
    db.prepare('SELECT 1').get();
    // Database connection established

    // Initialize tables if needed
    if (needsInitialization()) {
      initializeDatabase();
    }

    // Ensure database optimizations and views are applied
    applyDatabaseOptimizations();

    return db;
  } catch (err) {
    logger.error('Failed to initialize database:', err);
    throw new Error('Database initialization failed: ' + err.message);
  } finally {
    isConnecting = false;
  }
}



function applyDatabaseOptimizations() {
  try {
    // Check if database is corrupted before applying optimizations
    try {
      const integrityCheck = db.prepare('PRAGMA integrity_check').get();
      if (integrityCheck.integrity_check !== 'ok') {
        logger.error('Database integrity check failed:', integrityCheck.integrity_check);
        throw new Error('Database integrity check failed');
      }
    } catch (integrityError) {
      logger.error('Database corruption detected during integrity check:', integrityError);
      throw new Error('Database disk image is malformed');
    }
    
    // Applying database optimizations
    
    // Analyze tables for optimization
    db.prepare('ANALYZE').run();
    
    // Create views for common queries
    const views = [
      // Debt details view (replaces direct customer_id access in debts)
      `CREATE VIEW IF NOT EXISTS debt_details AS
       SELECT 
         d.id as debt_id,
         d.sale_id,
         d.amount,
         d.due_date,
         d.status as debt_status,
         d.notes,
         d.created_at as debt_created_at,
         d.updated_at as debt_updated_at,
         s.customer_id,
         s.invoice_no,
         s.invoice_date,
         s.total_amount as sale_total,
         s.paid_amount as sale_paid,
         c.name as customer_name,
         c.email as customer_email,
         c.phone as customer_phone
       FROM debts d
       JOIN sales s ON d.sale_id = s.id
       JOIN customers c ON s.customer_id = c.id`,

      // Product primary suppliers view
      `CREATE VIEW IF NOT EXISTS product_primary_suppliers AS
       SELECT 
         p.id as product_id,
         p.name as product_name,
         p.sku,
         s.id as supplier_id,
         s.name as supplier_name,
         ps.supplier_price,
         ps.lead_time_days,
         ps.minimum_order_quantity
       FROM products p
       LEFT JOIN product_suppliers ps ON p.id = ps.product_id AND ps.is_primary = 1 AND ps.is_active = 1
       LEFT JOIN suppliers s ON ps.supplier_id = s.id
       WHERE p.is_active = 1`,

      // Customer balance summary view
      `CREATE VIEW IF NOT EXISTS customer_balance_summary AS
       SELECT 
         c.id,
         c.name,
         c.credit_limit,
         COALESCE(SUM(s.total_amount), 0) as total_sales,
         COALESCE(SUM(s.paid_amount), 0) as total_paid,
         COALESCE(SUM(s.total_amount - s.paid_amount), 0) as outstanding_balance,
         COALESCE(COUNT(s.id), 0) as total_transactions,
         MAX(s.invoice_date) as last_transaction_date
       FROM customers c
       LEFT JOIN sales s ON c.id = s.customer_id AND s.status != 'cancelled'
       WHERE c.is_active = 1
       GROUP BY c.id, c.name, c.credit_limit`,

      // Enhanced low stock products view
      `CREATE VIEW IF NOT EXISTS low_stock_products AS
       SELECT 
         p.*,
         pps.supplier_name,
         pps.supplier_price,
         (p.min_stock - p.current_stock) as stock_deficit,
         CASE 
           WHEN p.current_stock = 0 THEN 'out_of_stock'
           WHEN p.current_stock <= p.min_stock THEN 'low_stock'
           WHEN p.current_stock <= p.reorder_point THEN 'reorder_level'
           ELSE 'normal'
         END as stock_status
       FROM products p
       LEFT JOIN product_primary_suppliers pps ON p.id = pps.product_id
       WHERE p.is_active = 1 
         AND (p.current_stock <= p.min_stock OR p.current_stock <= p.reorder_point)
       ORDER BY stock_deficit DESC`,

      // Legacy customer balances view (for backward compatibility)
      `CREATE VIEW IF NOT EXISTS customer_balances AS
       SELECT 
         c.*,
         COUNT(s.id) as total_sales,
         COALESCE(SUM(s.total_amount), 0) as total_purchased,
         COALESCE(SUM(s.paid_amount), 0) as total_paid,
         COALESCE(SUM(s.total_amount - s.paid_amount), 0) as total_owed
       FROM customers c
       LEFT JOIN sales s ON c.id = s.customer_id AND s.status = 'completed'
       WHERE c.is_active = 1
       GROUP BY c.id`,

      // Migration status view
      `CREATE VIEW IF NOT EXISTS migration_status AS
       SELECT 
         version,
         description,
         executed_at,
         execution_time_ms,
         status,
         CASE 
           WHEN status = 'success' THEN 'Completed'
           WHEN status = 'failed' THEN 'Failed'
           ELSE 'Pending'
         END as status_display
       FROM schema_migrations
       ORDER BY version`
    ];

    views.forEach(viewSQL => {
      try {
        db.prepare(viewSQL).run();
      } catch (error) {
        logger.warn(`Failed to create view: ${error.message}`);
      }
    });

    // Database optimizations applied
  } catch (error) {
    logger.error('Error applying database optimizations:', error);
  }
}

// Helper functions for database operations
const dbHelpers = {
  query: (sql, params = []) => {
    try {
      if (!db || !db.open) {
        db = connectDatabase();
      }
      const stmt = db.prepare(sql);
      return stmt.all(params);
    } catch (err) {
      if (err.message.includes('database connection is not open')) {
        db = connectDatabase();
        const stmt = db.prepare(sql);
        return stmt.all(params);
      }
      logger.error('Database query error:', err);
      throw err;
    }
  },

  queryOne: (sql, params = []) => {
    try {
      if (!db || !db.open) {
        db = connectDatabase();
      }
      const stmt = db.prepare(sql);
      return stmt.get(params);
    } catch (err) {
      if (err.message.includes('database connection is not open')) {
        db = connectDatabase();
        const stmt = db.prepare(sql);
        return stmt.get(params);
      }
      logger.error('Database query error:', err);
      throw err;
    }
  },

  insert: (sql, params = []) => {
    try {
      if (!db || !db.open) {
        db = connectDatabase();
      }
      const stmt = db.prepare(sql);
      const info = stmt.run(params);
      return info.lastInsertRowid;
    } catch (err) {
      if (err.message.includes('database connection is not open')) {
        db = connectDatabase();
        const stmt = db.prepare(sql);
        const info = stmt.run(params);
        return info.lastInsertRowid;
      }
      logger.error('Database insert error:', err);
      throw err;
    }
  },

  update: (sql, params = []) => {
    try {
      if (!db || !db.open) {
        db = connectDatabase();
      }
      const stmt = db.prepare(sql);
      const info = stmt.run(params);
      return info.changes;
    } catch (err) {
      if (err.message.includes('database connection is not open')) {
        db = connectDatabase();
        const stmt = db.prepare(sql);
        const info = stmt.run(params);
        return info.changes;
      }
      logger.error('Database update error:', err);
      throw err;
    }
  },

  transaction: (callback) => {
    try {
      if (!db || !db.open) {
        db = connectDatabase();
      }
      return db.transaction(callback)();
    } catch (err) {
      logger.error('Transaction error:', err);
      throw err;
    }
  },

  reconnect: () => {
    return connectDatabase();
  }
};

// Initialize database connection
db = connectDatabase();

// Helper function to check migration status
function getMigrationStatus() {
  try {
    if (!db || !db.open) {
      db = connectDatabase();
    }
    
    const migrations = db.prepare(`
      SELECT version, description, executed_at, execution_time_ms, status
      FROM schema_migrations
      ORDER BY version
    `).all();
    
    return {
      total: migrations.length,
      migrations: migrations
    };
  } catch (err) {
    logger.error('Error getting migration status:', err);
    return { total: 0, migrations: [] };
  }
}

// Export database connection and helpers
module.exports = {
  db,
  initializeDatabase,
  closeConnection,
  needsInitialization,
  applyDatabaseOptimizations,
  getMigrationStatus,
  ...dbHelpers
};