const database = require('./database');
const logger = require('./utils/logger');

/**
 * Database Optimization Script
 * Adds missing indexes and optimizes database performance
 */
async function optimizeDatabase() {
  try {
    logger.info('Starting database optimization...');
    
    const db = database.reconnect();
    
    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = 10000');
    db.pragma('temp_store = MEMORY');
    db.pragma('mmap_size = 268435456'); // 256MB
    
    // Add missing performance indexes
    const performanceIndexes = [
      // Composite indexes for common query patterns
      'CREATE INDEX IF NOT EXISTS idx_sales_customer_date_status ON sales(customer_id, invoice_date, status)',
      'CREATE INDEX IF NOT EXISTS idx_sales_payment_status_date ON sales(payment_status, invoice_date)',
      'CREATE INDEX IF NOT EXISTS idx_products_active_stock_price ON products(is_active, current_stock, selling_price)',
      'CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category_id, is_active)',
      'CREATE INDEX IF NOT EXISTS idx_products_barcode_active ON products(barcode, is_active)',
      'CREATE INDEX IF NOT EXISTS idx_products_sku_active ON products(sku, is_active)',
      
      // Indexes for date range queries
      'CREATE INDEX IF NOT EXISTS idx_sales_invoice_date_range ON sales(invoice_date)',
      'CREATE INDEX IF NOT EXISTS idx_purchases_invoice_date_range ON purchases(invoice_date)',
      'CREATE INDEX IF NOT EXISTS idx_products_expiry_date ON products(expiry_date)',
      'CREATE INDEX IF NOT EXISTS idx_installments_due_date_range ON installments(due_date)',
      
      // Indexes for financial calculations
      'CREATE INDEX IF NOT EXISTS idx_sales_total_paid_status ON sales(total_amount, paid_amount, status)',
      'CREATE INDEX IF NOT EXISTS idx_purchases_total_paid_status ON purchases(total_amount, paid_amount, status)',
      'CREATE INDEX IF NOT EXISTS idx_customers_balance_active ON customers(current_balance, is_active)',
      'CREATE INDEX IF NOT EXISTS idx_suppliers_balance_active ON suppliers(current_balance, is_active)',
      
      // Indexes for search functionality
      'CREATE INDEX IF NOT EXISTS idx_products_name_search ON products(name COLLATE NOCASE)',
      'CREATE INDEX IF NOT EXISTS idx_customers_name_search ON customers(name COLLATE NOCASE)',
      'CREATE INDEX IF NOT EXISTS idx_suppliers_name_search ON suppliers(name COLLATE NOCASE)',
      'CREATE INDEX IF NOT EXISTS idx_products_company_search ON products(company_name COLLATE NOCASE)',
      
      // Indexes for reporting queries
      'CREATE INDEX IF NOT EXISTS idx_sales_reporting_composite ON sales(invoice_date, status, payment_status, total_amount)',
      'CREATE INDEX IF NOT EXISTS idx_purchases_reporting_composite ON purchases(invoice_date, status, payment_status, total_amount)',
      'CREATE INDEX IF NOT EXISTS idx_products_stock_reporting ON products(current_stock, min_stock, reorder_point, is_active)',
      
      // Indexes for cash box operations
      'CREATE INDEX IF NOT EXISTS idx_cash_transactions_type_date ON cash_box_transactions(transaction_type, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_cash_transactions_reference ON cash_box_transactions(reference_type, reference_id)',
      
      // Indexes for receipt operations
      'CREATE INDEX IF NOT EXISTS idx_customer_receipts_date_method ON customer_receipts(receipt_date, payment_method)',
      'CREATE INDEX IF NOT EXISTS idx_supplier_receipts_date_method ON supplier_payment_receipts(receipt_date, payment_method)',
      
      // Indexes for stock movements
      'CREATE INDEX IF NOT EXISTS idx_stock_movements_product_date ON stock_movements(product_id, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_stock_movements_type_date ON stock_movements(movement_type, created_at)',
      
      // Indexes for debt calculations
      'CREATE INDEX IF NOT EXISTS idx_debts_sale_status_amount ON debts(sale_id, status, amount)',
      'CREATE INDEX IF NOT EXISTS idx_installments_customer_status_amount ON installments(customer_id, payment_status, amount)',
      
      // Indexes for user operations
      'CREATE INDEX IF NOT EXISTS idx_users_username_active ON users(username, is_active)',
      'CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active)',
      
      // Indexes for settings and configuration
      'CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key)',
      'CREATE INDEX IF NOT EXISTS idx_licenses_device_active ON licenses(device_id, is_active)'
    ];
    
    // Creating performance indexes
    for (const indexSQL of performanceIndexes) {
      try {
        db.prepare(indexSQL).run();
        logger.debug(`Created index: ${indexSQL}`);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          logger.warn(`Failed to create index: ${error.message}`);
        }
      }
    }
    
    // Analyze tables for query optimization
    // Analyzing tables for optimization
    db.prepare('ANALYZE').run();
    
    // Create optimized views for common queries
    const optimizedViews = [
      // Optimized customer balance view
      `CREATE VIEW IF NOT EXISTS customer_balance_optimized AS
       SELECT 
         c.id,
         c.name,
         c.phone,
         c.email,
         c.current_balance,
         c.credit_limit,
         COUNT(s.id) as total_transactions,
         MAX(s.invoice_date) as last_transaction_date,
         SUM(CASE WHEN s.status = 'completed' THEN s.total_amount ELSE 0 END) as total_sales,
         SUM(CASE WHEN s.status = 'completed' THEN s.paid_amount ELSE 0 END) as total_paid
       FROM customers c
       LEFT JOIN sales s ON c.id = s.customer_id AND s.status != 'cancelled'
       WHERE c.is_active = 1
       GROUP BY c.id, c.name, c.phone, c.email, c.current_balance, c.credit_limit`,
      
      // Optimized product stock view
      `CREATE VIEW IF NOT EXISTS product_stock_optimized AS
       SELECT 
         p.id,
         p.name,
         p.sku,
         p.barcode,
         p.current_stock,
         p.min_stock,
         p.reorder_point,
         p.selling_price,
         c.name as category_name,
         s.name as stock_name,
         CASE 
           WHEN p.current_stock = 0 THEN 'out_of_stock'
           WHEN p.current_stock <= p.min_stock THEN 'low_stock'
           WHEN p.current_stock <= p.reorder_point THEN 'reorder_level'
           ELSE 'normal'
         END as stock_status
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN stocks s ON p.stock_id = s.id
       WHERE p.is_active = 1`,
      
      // Optimized sales summary view
      `CREATE VIEW IF NOT EXISTS sales_summary_optimized AS
       SELECT 
         DATE(invoice_date) as sale_date,
         COUNT(*) as total_sales,
         SUM(total_amount) as total_revenue,
         SUM(paid_amount) as total_paid,
         SUM(total_amount - paid_amount) as total_outstanding,
         COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_sales,
         COUNT(CASE WHEN payment_status = 'partial' THEN 1 END) as partial_sales,
         COUNT(CASE WHEN payment_status = 'unpaid' THEN 1 END) as unpaid_sales
       FROM sales
       WHERE status != 'cancelled'
       GROUP BY DATE(invoice_date)`,
      
      // Optimized inventory movement view
      `CREATE VIEW IF NOT EXISTS inventory_movement_optimized AS
       SELECT 
         p.id as product_id,
         p.name as product_name,
         p.sku,
         sm.movement_type,
         sm.quantity,
         sm.created_at,
         s.name as stock_name,
         u.username as created_by
       FROM stock_movements sm
       JOIN products p ON sm.product_id = p.id
       LEFT JOIN stocks s ON sm.to_stock_id = s.id
       LEFT JOIN users u ON sm.created_by = u.id
       WHERE p.is_active = 1
       ORDER BY sm.created_at DESC`
    ];
    
    // Creating optimized views
    for (const viewSQL of optimizedViews) {
      try {
        db.prepare(viewSQL).run();
        logger.debug(`Created view: ${viewSQL.split('AS')[0].split('VIEW IF NOT EXISTS')[1].trim()}`);
      } catch (error) {
        logger.warn(`Failed to create view: ${error.message}`);
      }
    }
    
    // Update database statistics
    // Updating database statistics
    db.pragma('optimize');
    
    // Database optimization completed
    
    // Log optimization results (debug level)
    const stats = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='index'").get();
    const tableStats = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'").get();
    const viewStats = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='view'").get();
    
  } catch (error) {
    logger.error('Error optimizing database:', error);
    throw error;
  }
}

// Run optimization if called directly
if (require.main === module) {
  optimizeDatabase()
    .then(() => {
      // Database optimization completed
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Database optimization failed:', error);
      process.exit(1);
    });
}

module.exports = { optimizeDatabase }; 