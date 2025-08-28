module.exports = {
  version: '021',
  description: 'Add composite indexes for better query performance',
  up: function(db) {
    const logger = require('../utils/logger');
    
    try {
      logger.info('Starting migration 021: Add composite indexes');
      
      // Composite indexes for common query patterns
      const compositeIndexes = [
        // Sales queries - customer + date range
        {
          name: 'idx_sales_customer_date',
          table: 'sales',
          columns: ['customer_id', 'invoice_date'],
          description: 'Optimize sales queries by customer and date'
        },
        
        // Sales queries - payment status + date
        {
          name: 'idx_sales_status_date',
          table: 'sales',
          columns: ['payment_status', 'invoice_date'],
          description: 'Optimize sales queries by payment status and date'
        },
        
        // Sales queries - status + created_by
        {
          name: 'idx_sales_status_created_by',
          table: 'sales',
          columns: ['status', 'created_by'],
          description: 'Optimize sales queries by status and creator'
        },
        
        // Purchases queries - supplier + date range
        {
          name: 'idx_purchases_supplier_date',
          table: 'purchases',
          columns: ['supplier_id', 'invoice_date'],
          description: 'Optimize purchase queries by supplier and date'
        },
        
        // Purchases queries - payment status + date
        {
          name: 'idx_purchases_status_date',
          table: 'purchases',
          columns: ['payment_status', 'invoice_date'],
          description: 'Optimize purchase queries by payment status and date'
        },
        
        // Purchases queries - status + created_by
        {
          name: 'idx_purchases_status_created_by',
          table: 'purchases',
          columns: ['status', 'created_by'],
          description: 'Optimize purchase queries by status and creator'
        },
        
        // Products queries - stock + active status
        {
          name: 'idx_products_stock_active',
          table: 'products',
          columns: ['stock_id', 'is_active'],
          description: 'Optimize product queries by stock location and active status'
        },
        
        // Products queries - category + active status
        {
          name: 'idx_products_category_active',
          table: 'products',
          columns: ['category_id', 'is_active'],
          description: 'Optimize product queries by category and active status'
        },
        
        // Products queries - stock level + active status
        {
          name: 'idx_products_stock_level_active',
          table: 'products',
          columns: ['current_stock', 'is_active'],
          description: 'Optimize low stock product queries'
        },
        
        // Customer receipts queries - customer + date
        {
          name: 'idx_customer_receipts_customer_date',
          table: 'customer_receipts',
          columns: ['customer_id', 'receipt_date'],
          description: 'Optimize customer receipt queries by customer and date'
        },
        
        // Customer receipts queries - sale + payment type
        {
          name: 'idx_customer_receipts_sale_type',
          table: 'customer_receipts',
          columns: ['sale_id', 'payment_type'],
          description: 'Optimize customer receipt queries by sale and payment type'
        },
        
        // Supplier payment receipts queries - supplier + date
        {
          name: 'idx_supplier_receipts_supplier_date',
          table: 'supplier_payment_receipts',
          columns: ['supplier_id', 'receipt_date'],
          description: 'Optimize supplier payment receipt queries by supplier and date'
        },
        
        // Installments queries - customer + payment status
        {
          name: 'idx_installments_customer_status',
          table: 'installments',
          columns: ['customer_id', 'payment_status'],
          description: 'Optimize installment queries by customer and payment status'
        },
        
        // Installments queries - due date + payment status
        {
          name: 'idx_installments_due_status',
          table: 'installments',
          columns: ['due_date', 'payment_status'],
          description: 'Optimize installment queries by due date and payment status'
        },
        
        // Cash box transactions queries - cash box + type + date
        {
          name: 'idx_cash_box_transactions_box_type_date',
          table: 'cash_box_transactions',
          columns: ['cash_box_id', 'transaction_type', 'created_at'],
          description: 'Optimize cash box transaction queries by box, type and date'
        },
        
        // Money box transactions queries - box + type + date
        {
          name: 'idx_money_box_transactions_box_type_date',
          table: 'money_box_transactions',
          columns: ['box_id', 'type', 'created_at'],
          description: 'Optimize money box transaction queries by box, type and date'
        },
        
        // Inventory movements queries - product + type + date
        {
          name: 'idx_inventory_movements_product_type_date',
          table: 'inventory_movements',
          columns: ['product_id', 'movement_type', 'created_at'],
          description: 'Optimize inventory movement queries by product, type and date'
        },
        
        // Stock movements queries - product + movement type + date
        {
          name: 'idx_stock_movements_product_type_date',
          table: 'stock_movements',
          columns: ['product_id', 'movement_type', 'movement_date'],
          description: 'Optimize stock movement queries by product, type and date'
        },
        
        // Sale items queries - sale + product
        {
          name: 'idx_sale_items_sale_product',
          table: 'sale_items',
          columns: ['sale_id', 'product_id'],
          description: 'Optimize sale item queries by sale and product'
        },
        
        // Purchase items queries - purchase + product
        {
          name: 'idx_purchase_items_purchase_product',
          table: 'purchase_items',
          columns: ['purchase_id', 'product_id'],
          description: 'Optimize purchase item queries by purchase and product'
        },
        
        // Customers queries - type + active status
        {
          name: 'idx_customers_type_active',
          table: 'customers',
          columns: ['customer_type', 'is_active'],
          description: 'Optimize customer queries by type and active status'
        },
        
        // Suppliers queries - active status + balance
        {
          name: 'idx_suppliers_active_balance',
          table: 'suppliers',
          columns: ['is_active', 'current_balance'],
          description: 'Optimize supplier queries by active status and balance'
        }
      ];
      
      // Create each composite index
      compositeIndexes.forEach(index => {
        try {
          const columns = index.columns.join(', ');
          const sql = `CREATE INDEX IF NOT EXISTS ${index.name} ON ${index.table}(${columns})`;
          
          db.prepare(sql).run();
          logger.info(`Created composite index: ${index.name} (${index.description})`);
        } catch (err) {
          logger.warn(`Failed to create index ${index.name}: ${err.message}`);
        }
      });
      
      logger.info('Migration 021 completed successfully');
    } catch (error) {
      logger.error('Migration 021 failed:', error);
      throw error;
    }
  },
  
  down: function(db) {
    const logger = require('../utils/logger');
    
    try {
      logger.info('Rolling back migration 021: Dropping composite indexes');
      
      const indexesToDrop = [
        'idx_sales_customer_date',
        'idx_sales_status_date',
        'idx_sales_status_created_by',
        'idx_purchases_supplier_date',
        'idx_purchases_status_date',
        'idx_purchases_status_created_by',
        'idx_products_stock_active',
        'idx_products_category_active',
        'idx_products_stock_level_active',
        'idx_customer_receipts_customer_date',
        'idx_customer_receipts_sale_type',
        'idx_supplier_receipts_supplier_date',
        'idx_installments_customer_status',
        'idx_installments_due_status',
        'idx_cash_box_transactions_box_type_date',
        'idx_money_box_transactions_box_type_date',
        'idx_inventory_movements_product_type_date',
        'idx_stock_movements_product_type_date',
        'idx_sale_items_sale_product',
        'idx_purchase_items_purchase_product',
        'idx_customers_type_active',
        'idx_suppliers_active_balance'
      ];
      
      indexesToDrop.forEach(indexName => {
        try {
          db.prepare(`DROP INDEX IF EXISTS ${indexName}`).run();
          logger.info(`Dropped index: ${indexName}`);
        } catch (err) {
          logger.warn(`Index ${indexName} doesn't exist or couldn't be dropped: ${err.message}`);
        }
      });
      
      logger.info('Migration 021 rollback completed');
    } catch (error) {
      logger.error('Migration 021 rollback failed:', error);
      throw error;
    }
  }
};
