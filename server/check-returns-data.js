const { query } = require('./database');
const logger = require('./utils/logger');

async function checkReturnsData() {
  try {
    console.log('🔍 Checking returns data...\n');

    // Check sale_returns table
    console.log('📋 SALE RETURNS:');
    const saleReturns = query(`
      SELECT 
        sr.*,
        s.invoice_no as original_invoice_no,
        c.name as customer_name
      FROM sale_returns sr
      LEFT JOIN sales s ON sr.sale_id = s.id
      LEFT JOIN customers c ON s.customer_id = c.id
      ORDER BY sr.created_at DESC
    `, []);

    console.log(`Found ${saleReturns.length} sale returns:`);
    if (saleReturns.length > 0) {
      saleReturns.forEach((return_, index) => {
        console.log(`  ${index + 1}. ID: ${return_.id}, Date: ${return_.return_date}, Amount: ${return_.total_amount}, Customer: ${return_.customer_name || 'N/A'}`);
      });
    } else {
      console.log('  No sale returns found');
    }

    console.log('\n📋 PURCHASE RETURNS:');
    const purchaseReturns = query(`
      SELECT 
        pr.*,
        p.invoice_no as original_invoice_no,
        s.name as supplier_name
      FROM purchase_returns pr
      LEFT JOIN purchases p ON pr.purchase_id = p.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      ORDER BY pr.created_at DESC
    `, []);

    console.log(`Found ${purchaseReturns.length} purchase returns:`);
    if (purchaseReturns.length > 0) {
      purchaseReturns.forEach((return_, index) => {
        console.log(`  ${index + 1}. ID: ${return_.id}, Date: ${return_.return_date}, Amount: ${return_.total_amount}, Supplier: ${return_.supplier_name || 'N/A'}`);
      });
    } else {
      console.log('  No purchase returns found');
    }

    // Check return items
    console.log('\n📦 SALE RETURN ITEMS:');
    const saleReturnItems = query(`
      SELECT 
        sri.*,
        sr.return_date,
        p.name as product_name
      FROM sale_return_items sri
      LEFT JOIN sale_returns sr ON sri.return_id = sr.id
      LEFT JOIN sale_items si ON sri.sale_item_id = si.id
      LEFT JOIN products p ON si.product_id = p.id
      ORDER BY sri.created_at DESC
    `, []);

    console.log(`Found ${saleReturnItems.length} sale return items:`);
    if (saleReturnItems.length > 0) {
      saleReturnItems.forEach((item, index) => {
        console.log(`  ${index + 1}. Return ID: ${item.return_id}, Product: ${item.product_name || 'N/A'}, Qty: ${item.quantity}, Price: ${item.price}`);
      });
    } else {
      console.log('  No sale return items found');
    }

    console.log('\n📦 PURCHASE RETURN ITEMS:');
    const purchaseReturnItems = query(`
      SELECT 
        pri.*,
        pr.return_date,
        p.name as product_name
      FROM purchase_return_items pri
      LEFT JOIN purchase_returns pr ON pri.return_id = pr.id
      LEFT JOIN purchase_items pi ON pri.purchase_item_id = pi.id
      LEFT JOIN products p ON pi.product_id = p.id
      ORDER BY pri.created_at DESC
    `, []);

    console.log(`Found ${purchaseReturnItems.length} purchase return items:`);
    if (purchaseReturnItems.length > 0) {
      purchaseReturnItems.forEach((item, index) => {
        console.log(`  ${index + 1}. Return ID: ${item.return_id}, Product: ${item.product_name || 'N/A'}, Qty: ${item.quantity}, Price: ${item.price}`);
      });
    } else {
      console.log('  No purchase return items found');
    }

    // Test the getAllReturnBills function
    console.log('\n🔧 Testing getAllReturnBills function:');
    const billsService = require('./services/billsService');
    
    const result = await billsService.getAllReturnBills({}, 1, 20);
    console.log(`Function result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Total returns: ${result.data.length}`);
    console.log(`Pagination: ${result.pagination.total} total, ${result.pagination.totalPages} pages`);

    if (result.data.length > 0) {
      console.log('Sample return data:');
      console.log(JSON.stringify(result.data[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Error checking returns data:', error);
    logger.error('Error checking returns data:', error);
  }
}

// Run the check
checkReturnsData().then(() => {
  console.log('\n✅ Check completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Check failed:', error);
  process.exit(1);
}); 