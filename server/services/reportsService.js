const db = require('../database');
const logger = require('../utils/logger');

class ReportsService {
  async getDashboardSummary(startDate, endDate, period) {
    try {
      let firstDayOfMonth, lastDayOfMonth;
      
      // If specific dates are provided, use them
      if (startDate && endDate) {
        firstDayOfMonth = startDate;
        lastDayOfMonth = endDate;
      } else {
        // Otherwise, use current month or period
        const currentDate = new Date();
        
        if (period === 'week') {
          // Get current week (Monday to Sunday)
          const day = currentDate.getDay();
          const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
          const monday = new Date(currentDate.setDate(diff));
          const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
          
          firstDayOfMonth = monday.toISOString().split('T')[0];
          lastDayOfMonth = sunday.toISOString().split('T')[0];
        } else if (period === 'year') {
          // Get current year
          firstDayOfMonth = `${currentDate.getFullYear()}-01-01`;
          lastDayOfMonth = `${currentDate.getFullYear()}-12-31`;
        } else if (period === 'month') {
          // Get current month (1st to last day)
          firstDayOfMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
          const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          lastDayOfMonth = lastDay.toISOString().split('T')[0];
        } else {
          // Default to last 30 days
          const thirtyDaysAgo = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          firstDayOfMonth = thirtyDaysAgo.toISOString().split('T')[0];
          lastDayOfMonth = currentDate.toISOString().split('T')[0];
        }
      }
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      // Get yesterday's date (create a new Date object to avoid modifying currentDate)
      const yesterday = new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get today's invoices count and total
      const todayInvoicesResult = await db.query(`
        SELECT 
          COUNT(*) as count, 
          COALESCE(SUM(CASE WHEN status != 'returned' THEN total_amount ELSE 0 END), 0) as total,
          COUNT(CASE WHEN payment_status = 'paid' AND status != 'returned' THEN 1 END) as paid_count,
          COUNT(CASE WHEN payment_status = 'partial' AND status != 'returned' THEN 1 END) as partial_count,
          COUNT(CASE WHEN payment_status = 'unpaid' AND status != 'returned' THEN 1 END) as unpaid_count
        FROM sales 
        WHERE DATE(created_at) = ?
      `, [today]);

      // Get yesterday's sales total for comparison
      const yesterdaySalesResult = await db.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN status != 'returned' THEN total_amount ELSE 0 END), 0) as total,
          COUNT(CASE WHEN status != 'returned' THEN 1 END) as count
        FROM sales 
        WHERE DATE(created_at) = ?
      `, [yesterday]);

      // Consolidated sales and profit calculation - MAIN QUERY
      const salesAndProfitResult = await db.query(`
        SELECT 
          -- Sales totals by payment status
          COALESCE(SUM(
            CASE WHEN s.payment_status = 'paid' AND s.status != 'returned' THEN 
              (si.quantity - COALESCE(si.returned_quantity, 0)) * si.price
            ELSE 0 END
          ), 0) as paid_amount,
          
          COALESCE(SUM(
            CASE WHEN s.payment_status = 'partial' AND s.status != 'returned' THEN 
              (si.quantity - COALESCE(si.returned_quantity, 0)) * si.price
            ELSE 0 END
          ), 0) as partial_amount,
          
          COALESCE(SUM(
            CASE WHEN s.payment_status = 'unpaid' AND s.status != 'returned' THEN 
              (si.quantity - COALESCE(si.returned_quantity, 0)) * si.price
            ELSE 0 END
          ), 0) as unpaid_amount,
          
          -- Total sales (net of returns)
          COALESCE(SUM(
            CASE WHEN s.status != 'returned' THEN 
              (si.quantity - COALESCE(si.returned_quantity, 0)) * si.price
            ELSE 0 END
          ), 0) as total_sales,
          
          -- Cost of goods sold (net of returns)
          COALESCE(SUM(
            CASE WHEN s.status != 'returned' THEN 
              (si.quantity - COALESCE(si.returned_quantity, 0)) * p.purchase_price
            ELSE 0 END
          ), 0) as cost_of_goods,
          
          -- Gross profit (net of returns)
          COALESCE(SUM(
            CASE WHEN s.status != 'returned' THEN 
              (si.quantity - COALESCE(si.returned_quantity, 0)) * (si.price - p.purchase_price)
            ELSE 0 END
          ), 0) as gross_profit,
          
          -- Counts
          COUNT(DISTINCT CASE WHEN s.status != 'returned' THEN s.id END) as sales_count,
          COUNT(DISTINCT CASE WHEN s.status != 'returned' THEN s.customer_id END) as customers_count,
          
          -- Returns data
          COALESCE(SUM(
            CASE WHEN s.status = 'returned' THEN 
              (si.quantity - COALESCE(si.returned_quantity, 0)) * si.price
            ELSE 0 END
          ), 0) as returns_amount,
          
          COUNT(CASE WHEN s.status = 'returned' THEN 1 END) as returns_count
        FROM sales s
        JOIN sale_items si ON s.id = si.sale_id
        LEFT JOIN products p ON si.product_id = p.id AND si.product_id > 0
        WHERE DATE(s.created_at) BETWEEN ? AND ?
          AND s.status NOT IN ('cancelled')
          AND (si.quantity - COALESCE(si.returned_quantity, 0)) > 0
      `, [firstDayOfMonth, lastDayOfMonth]);

      // Get best selling products (excluding returned items)
      const bestSellingProductsResult = await db.query(`
        SELECT 
          p.id,
          p.name,
          p.sku as code,
          SUM(si.quantity - COALESCE(si.returned_quantity, 0)) as total_quantity,
          SUM((si.quantity - COALESCE(si.returned_quantity, 0)) * si.price) as total_revenue,
          p.current_stock as current_stock
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id AND si.product_id > 0
        JOIN sales s ON si.sale_id = s.id
        WHERE DATE(s.created_at) BETWEEN ? AND ?
          AND s.status != 'returned'
          AND (si.quantity - COALESCE(si.returned_quantity, 0)) > 0
        GROUP BY p.id, p.name, p.sku, p.current_stock
        ORDER BY total_quantity DESC
        LIMIT 5
      `, [firstDayOfMonth, lastDayOfMonth]);

      // Get expenses for the period
      const expensesResult = await db.query(`
        SELECT 
          COALESCE(SUM(amount), 0) as total,
          COUNT(*) as count
        FROM expenses 
        WHERE date BETWEEN ? AND ?
      `, [firstDayOfMonth, lastDayOfMonth]);

      // Get purchases for the period
      const purchasesResult = await db.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as total,
          COUNT(*) as count,
          COUNT(DISTINCT supplier_id) as suppliers_count
        FROM purchases 
        WHERE DATE(created_at) BETWEEN ? AND ?
      `, [firstDayOfMonth, lastDayOfMonth]);

      // Get debts statistics
      const debtsResult = await db.query(`
        SELECT 
          COUNT(*) as total_debts,
          COALESCE(SUM(total_amount - paid_amount), 0) as total_remaining,
          COUNT(DISTINCT customer_id) as customers_with_debt,
          COUNT(CASE WHEN due_date < DATE('now') THEN 1 END) as overdue_debts,
          COALESCE(SUM(CASE WHEN due_date < DATE('now') THEN (total_amount - paid_amount) ELSE 0 END), 0) as overdue_amount
        FROM sales 
        WHERE payment_status IN ('partial', 'unpaid')
      `);

      // Get supplier debts (unpaid purchases)
      const supplierDebtsResult = await db.query(`
        SELECT 
          COUNT(*) as total_debts,
          COALESCE(SUM(remaining_amount), 0) as total_remaining,
          COUNT(DISTINCT supplier_id) as suppliers_with_debt,
          COUNT(CASE WHEN due_date < DATE('now') THEN 1 END) as overdue_debts,
          COALESCE(SUM(CASE WHEN due_date < DATE('now') THEN remaining_amount ELSE 0 END), 0) as overdue_amount
        FROM purchases 
        WHERE payment_status IN ('partial', 'unpaid')
      `);

      // Get period cash flow (not just today)
      const periodCashFlowResult = await db.query(`
        SELECT 
          -- Cash sales (money in)
          COALESCE(SUM(CASE 
            WHEN s.status != 'returned' 
            THEN (si.quantity - COALESCE(si.returned_quantity, 0)) * si.price
            ELSE 0 
          END), 0) as cash_sales,
          
          -- Cash purchases (money out) for the period
          (SELECT COALESCE(SUM(total_amount), 0) FROM purchases 
            WHERE DATE(created_at) BETWEEN ? AND ? 
              AND status != 'cancelled' AND payment_method = 'cash') as cash_purchases,
          
          -- Cash expenses (all expenses are considered cash for now)
          (SELECT COALESCE(SUM(amount), 0) FROM expenses 
            WHERE date BETWEEN ? AND ?) as cash_expenses,
          
          -- Cash customer receipts
          (SELECT COALESCE(SUM(amount), 0) FROM customer_receipts 
            WHERE receipt_date BETWEEN ? AND ? AND payment_method = 'cash') as cash_receipts,
          
          -- Cash supplier payments
          (SELECT COALESCE(SUM(amount), 0) FROM supplier_payment_receipts 
            WHERE receipt_date BETWEEN ? AND ? AND payment_method = 'cash') as cash_supplier_payments
        FROM sales s
        LEFT JOIN sale_items si ON s.id = si.sale_id
        WHERE DATE(s.created_at) BETWEEN ? AND ?
      `, [
        firstDayOfMonth, lastDayOfMonth, // purchases
        firstDayOfMonth, lastDayOfMonth, // expenses
        firstDayOfMonth, lastDayOfMonth, // customer receipts
        firstDayOfMonth, lastDayOfMonth, // supplier payments
        firstDayOfMonth, lastDayOfMonth  // sales
      ]);

      let cashFlowData = {
        cash_sales: 0,
        cash_purchases: 0,
        cash_expenses: 0,
        cash_receipts: 0,
        cash_supplier_payments: 0
      };
      try {
        if (periodCashFlowResult && periodCashFlowResult.length > 0) {
          cashFlowData = periodCashFlowResult[0];
        }
      } catch (error) {
        logger.error('Error in period cash flow query:', error);
      }

      // Get top customers with debts
      const topCustomersWithDebtsResult = await db.query(`
        SELECT 
          c.id,
          c.name as customer_name,
          c.phone as customer_phone,
          COUNT(s.id) as debt_count,
          COALESCE(SUM(s.total_amount - s.paid_amount), 0) as total_debt,
          MAX(s.due_date) as latest_due_date,
          COUNT(CASE WHEN s.due_date < DATE('now') THEN 1 END) as overdue_count
        FROM customers c
        JOIN sales s ON c.id = s.customer_id
        WHERE s.payment_status IN ('partial', 'unpaid')
        GROUP BY c.id, c.name, c.phone
        ORDER BY total_debt DESC
        LIMIT 5
      `);

      // Get top suppliers with debts
      const topSuppliersWithDebtsResult = await db.query(`
        SELECT 
          s.id,
          s.name as supplier_name,
          s.phone as supplier_phone,
          COUNT(p.id) as debt_count,
          COALESCE(SUM(p.remaining_amount), 0) as total_debt,
          MAX(p.due_date) as latest_due_date,
          COUNT(CASE WHEN p.due_date < DATE('now') THEN 1 END) as overdue_count
        FROM suppliers s
        JOIN purchases p ON s.id = p.supplier_id
        WHERE p.payment_status IN ('partial', 'unpaid')
        GROUP BY s.id, s.name, s.phone
        ORDER BY total_debt DESC
        LIMIT 5
      `);

      // Get cash flow trend for the last 7 days
      const cashFlowTrendResult = await db.query(`
        SELECT 
          DATE(s.created_at) as date,
          -- Daily cash sales
          COALESCE(SUM(CASE 
            WHEN s.payment_method = 'cash' AND s.status != 'returned' 
            THEN (si.quantity - COALESCE(si.returned_quantity, 0)) * si.price
            ELSE 0 
          END), 0) as cash_sales,
          
          -- Daily cash purchases
          COALESCE(SUM(CASE 
            WHEN p.payment_method = 'cash' AND p.status != 'cancelled'
            THEN p.total_amount
            ELSE 0 
          END), 0) as cash_purchases,
          
          -- Daily cash expenses (all expenses are considered cash for now)
          COALESCE(SUM(e.amount), 0) as cash_expenses
        FROM sales s
        LEFT JOIN sale_items si ON s.id = si.sale_id
        LEFT JOIN purchases p ON DATE(p.created_at) = DATE(s.created_at)
        LEFT JOIN expenses e ON DATE(e.date) = DATE(s.created_at)
        WHERE s.created_at >= DATE('now', '-7 days')
        GROUP BY DATE(s.created_at)
        ORDER BY DATE(s.created_at)
      `);

      // Alternative cash flow trend if the above fails
      let cashFlowTrendData = [];
      try {
        if (cashFlowTrendResult && cashFlowTrendResult.length > 0) {
          cashFlowTrendData = cashFlowTrendResult;
        }
      } catch (error) {
        // If the main query fails, use simplified queries
        try {
          const salesTrend = await db.query(`
            SELECT 
              DATE(s.created_at) as date,
              COALESCE(SUM(CASE WHEN s.status != 'returned' 
              THEN (si.quantity - COALESCE(si.returned_quantity, 0)) * si.price
              ELSE 0 END), 0) as cash_sales
            FROM sales s
            LEFT JOIN sale_items si ON s.id = si.sale_id
            WHERE s.created_at >= DATE('now', '-7 days')
            GROUP BY DATE(s.created_at)
            ORDER BY DATE(s.created_at)
          `);

          const purchasesTrend = await db.query(`
            SELECT 
              DATE(created_at) as date,
              COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) as cash_purchases
            FROM purchases
            WHERE created_at >= DATE('now', '-7 days')
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at)
          `);

          const expensesTrend = await db.query(`
            SELECT 
              DATE(date) as date,
              COALESCE(SUM(amount), 0) as cash_expenses
            FROM expenses
            WHERE date >= DATE('now', '-7 days')
            GROUP BY DATE(date)
            ORDER BY DATE(date)
          `);

          // Merge the data by date
          const dateMap = new Map();
          
          salesTrend.forEach(row => {
            dateMap.set(row.date, {
              date: row.date,
              cash_sales: row.cash_sales,
              cash_purchases: 0,
              cash_expenses: 0
            });
          });

          purchasesTrend.forEach(row => {
            if (dateMap.has(row.date)) {
              dateMap.get(row.date).cash_purchases = row.cash_purchases;
            } else {
              dateMap.set(row.date, {
                date: row.date,
                cash_sales: 0,
                cash_purchases: row.cash_purchases,
                cash_expenses: 0
              });
            }
          });

          expensesTrend.forEach(row => {
            if (dateMap.has(row.date)) {
              dateMap.get(row.date).cash_expenses = row.cash_expenses;
            } else {
              dateMap.set(row.date, {
                date: row.date,
                cash_sales: 0,
                cash_purchases: 0,
                cash_expenses: row.cash_expenses
              });
            }
          });

          cashFlowTrendData = Array.from(dateMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
        } catch (innerError) {
          logger.error('Error in simplified cash flow trend query:', innerError);
        }
      }

      const customersResult = await db.query(`
        SELECT 
          COUNT(*) as count,
          COUNT(CASE WHEN created_at >= ? THEN 1 END) as new_customers
        FROM customers
      `, [firstDayOfMonth]);

      const suppliersResult = await db.query('SELECT COUNT(*) as count FROM suppliers');
      
      const productsResult = await db.query(`
        SELECT 
          COUNT(*) as count,
          COALESCE(SUM(current_stock), 0) as total_stock,
          COALESCE(SUM(current_stock * purchase_price), 0) as stock_value
        FROM products
      `);
      
      const lowStockResult = await db.query(`
        SELECT COUNT(*) as count 
        FROM products 
        WHERE current_stock < 10 AND current_stock > 0
      `);

      const outOfStockResult = await db.query(`
        SELECT COUNT(*) as count 
        FROM products 
        WHERE current_stock = 0
      `);

      // Calculate sales comparison
      const todaySales = todayInvoicesResult[0]?.total || 0;
      const yesterdaySales = yesterdaySalesResult[0]?.total || 0;
      const salesComparison = yesterdaySales === 0 ? 100 : ((todaySales - yesterdaySales) / yesterdaySales) * 100;

      // Get daily sales trend for the current month
      const salesTrendResult = await db.query(`
        SELECT 
          DATE(s.created_at) as date,
          COALESCE(SUM(CASE WHEN s.status != 'returned' THEN 
            (si.quantity - COALESCE(si.returned_quantity, 0)) * si.price
          ELSE 0 END), 0) as daily_sales
        FROM sales s
        JOIN sale_items si ON s.id = si.sale_id
        WHERE DATE(s.created_at) BETWEEN ? AND ?
          AND s.status NOT IN ('cancelled', 'returned')
        GROUP BY DATE(s.created_at)
        ORDER BY DATE(s.created_at)
      `, [firstDayOfMonth, lastDayOfMonth]);

      // Get daily purchases trend for the current month
      const purchasesTrendResult = await db.query(`
        SELECT 
          DATE(created_at) as date,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as daily_purchases
        FROM purchases
        WHERE DATE(created_at) BETWEEN ? AND ?
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      `, [firstDayOfMonth, lastDayOfMonth]);

      // Format trend data
      const salesTrendLabels = salesTrendResult.map(row => {
        const date = new Date(row.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      });
      const salesTrendData = salesTrendResult.map(row => row.daily_sales);
      const purchasesTrendLabels = purchasesTrendResult.map(row => {
        const date = new Date(row.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      });
      const purchasesTrendData = purchasesTrendResult.map(row => row.daily_purchases);

      // Extract data from the main consolidated query
      const salesData = salesAndProfitResult[0] || {};
      
      // Calculate net profit
      const netProfit = (salesData.gross_profit || 0) - (expensesResult[0]?.total || 0);
      
      // Calculate profit margin
      const profitMargin = salesData.total_sales > 0 ? 
        (netProfit / salesData.total_sales) * 100 : 0;

      // Build the report data
      const reportData = {
        report_type: 'monthly',
        period_start: firstDayOfMonth,
        period_end: lastDayOfMonth,
        
        // Sales statistics
        sales: {
          total: salesData.total_sales || 0,
          count: salesData.sales_count || 0,
          customers_count: salesData.customers_count || 0,
          paid_amount: salesData.paid_amount || 0,
          partial_amount: salesData.partial_amount || 0,
          unpaid_amount: salesData.unpaid_amount || 0,
          returns: {
            total_amount: salesData.returns_amount || 0,
            count: salesData.returns_count || 0,
            paid_amount: 0, // Will be calculated separately if needed
            partial_amount: 0,
            unpaid_amount: 0
          },
          profit: {
            revenue: salesData.total_sales || 0,
            cost: salesData.cost_of_goods || 0,
            gross_profit: salesData.gross_profit || 0
          }
        },

        // Today's sales
        today_stats: {
          invoices_count: todayInvoicesResult[0]?.count || 0,
          sales_total: todaySales,
          sales_comparison: salesComparison,
          paid_count: todayInvoicesResult[0]?.paid_count || 0,
          partial_count: todayInvoicesResult[0]?.partial_count || 0,
          unpaid_count: todayInvoicesResult[0]?.unpaid_count || 0
        },

        // Purchases statistics
        purchases: {
          total: purchasesResult[0]?.total || 0,
          count: purchasesResult[0]?.count || 0,
          suppliers_count: purchasesResult[0]?.suppliers_count || 0
        },

        // Expenses statistics
        expenses: {
          total: expensesResult[0]?.total || 0,
          count: expensesResult[0]?.count || 0
        },

        // Debts statistics
        debts: {
          total_debts: debtsResult[0]?.total_debts || 0,
          total_remaining: debtsResult[0]?.total_remaining || 0,
          customers_with_debt: debtsResult[0]?.customers_with_debt || 0,
          overdue_debts: debtsResult[0]?.overdue_debts || 0,
          overdue_amount: debtsResult[0]?.overdue_amount || 0
        },

        // Supplier debts
        supplier_debts: {
          total_debts: supplierDebtsResult[0]?.total_debts || 0,
          total_remaining: supplierDebtsResult[0]?.total_remaining || 0,
          suppliers_with_debt: supplierDebtsResult[0]?.suppliers_with_debt || 0,
          overdue_debts: supplierDebtsResult[0]?.overdue_debts || 0,
          overdue_amount: supplierDebtsResult[0]?.overdue_amount || 0
        },

        // Daily cash flow
        cash_flow: cashFlowData,

        // Top customers with debts
        top_customers_with_debts: topCustomersWithDebtsResult.map(customer => ({
          id: customer.id,
          name: customer.customer_name || 'عميل نقدي',
          phone: customer.customer_phone,
          debt_count: customer.debt_count,
          total_debt: customer.total_debt,
          latest_due_date: customer.latest_due_date,
          overdue_count: customer.overdue_count
        })),

        // Top suppliers with debts
        top_suppliers_with_debts: topSuppliersWithDebtsResult.map(supplier => ({
          id: supplier.id,
          name: supplier.supplier_name || 'مورد نقدي',
          phone: supplier.supplier_phone,
          debt_count: supplier.debt_count,
          total_debt: supplier.total_debt,
          latest_due_date: supplier.latest_due_date,
          overdue_count: supplier.overdue_count
        })),

        // Cash flow trend
        cash_flow_trend: {
          labels: cashFlowTrendData.map(row => {
            const date = new Date(row.date);
            return `${date.getDate()}/${date.getMonth() + 1}`;
          }),
          data: cashFlowTrendData.map(row => row.cash_sales + row.cash_purchases + row.cash_expenses),
          average: cashFlowTrendData.length > 0 ? 
            cashFlowTrendData.map(row => row.cash_sales + row.cash_purchases + row.cash_expenses).reduce((a, b) => a + b, 0) / cashFlowTrendData.length : 0
        },

        // Inventory statistics
        inventory: {
          total_products: productsResult[0]?.count || 0,
          total_stock: productsResult[0]?.total_stock || 0,
          stock_value: productsResult[0]?.stock_value || 0,
          low_stock_products: lowStockResult[0]?.count || 0,
          out_of_stock_products: outOfStockResult[0]?.count || 0
        },

        // Customer statistics
        customers: {
          total: customersResult[0]?.count || 0,
          new_customers: customersResult[0]?.new_customers || 0
        },

        // Supplier statistics
        suppliers: {
          total: suppliersResult[0]?.count || 0
        },

        // Best selling products
        best_selling_products: bestSellingProductsResult.map(product => ({
          id: product.id,
          name: product.name,
          code: product.code,
          total_quantity: product.total_quantity,
          total_revenue: product.total_revenue,
          current_stock: product.current_stock
        })),

        // Financial summary - FIXED CALCULATIONS
        financial_summary: {
          total_sales: salesData.total_sales || 0,
          net_profit: netProfit,
          cost_of_goods: salesData.cost_of_goods || 0,
          revenue: salesData.total_sales || 0,
          expenses: expensesResult[0]?.total || 0,
          profit_margin: profitMargin
        },

        // Trend data for charts
        sales_trend: {
          labels: salesTrendLabels,
          data: salesTrendData,
          average: salesTrendData.length > 0 ? salesTrendData.reduce((a, b) => a + b, 0) / salesTrendData.length : 0
        },

        purchases_trend: {
          labels: purchasesTrendLabels,
          data: purchasesTrendData,
          average: purchasesTrendData.length > 0 ? purchasesTrendData.reduce((a, b) => a + b, 0) / purchasesTrendData.length : 0
        }
      };

      // Debug: Log the data being returned
      
      
      
      
      
      

      // Check if a report already exists for this month
      const existingReport = await db.query(`
        SELECT * FROM reports 
        WHERE period_start = ? AND period_end = ?
      `, [firstDayOfMonth, lastDayOfMonth]);

      if (existingReport.length === 0) {
        // Insert new report
        await db.insert(`
          INSERT INTO reports (
            report_type, period_start, period_end, total_sales, total_purchases,
            total_expenses, net_profit, total_customers, total_suppliers,
            total_products, low_stock_products, out_of_stock_products,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
          reportData.report_type,
          reportData.period_start,
          reportData.period_end,
          reportData.sales.total,
          reportData.purchases.total,
          reportData.expenses.total,
          reportData.financial_summary.net_profit,
          reportData.customers.total,
          reportData.suppliers.total,
          reportData.inventory.total_products,
          reportData.inventory.low_stock_products,
          reportData.inventory.out_of_stock_products
        ]);
      } else {
        // Update existing report
        await db.update(`
          UPDATE reports 
          SET 
            total_sales = ?,
            total_purchases = ?,
            total_expenses = ?,
            net_profit = ?,
            total_customers = ?,
            total_suppliers = ?,
            total_products = ?,
            low_stock_products = ?,
            out_of_stock_products = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE period_start = ? AND period_end = ?
        `, [
          reportData.sales.total,
          reportData.purchases.total,
          reportData.expenses.total,
          reportData.financial_summary.net_profit,
          reportData.customers.total,
          reportData.suppliers.total,
          reportData.inventory.total_products,
          reportData.inventory.low_stock_products,
          reportData.inventory.out_of_stock_products,
          reportData.period_start,
          reportData.period_end
        ]);
      }

      return reportData;
    } catch (err) {
      logger.error('Error in getDashboardSummary:', err);
      throw err;
    }
  }

  async getProfitLoss(startDate, endDate) {
    try {
      const report = await db.query(`
        SELECT * FROM reports 
        WHERE period_start >= ? 
        AND period_end <= ?
        ORDER BY period_start DESC
      `, [startDate, endDate]);

      if (!report || report.length === 0) {
        return this.generatePeriodReport(startDate, endDate);
      }

      return report;
    } catch (err) {
      logger.error('Error in getProfitLoss:', err);
      throw err;
    }
  }

  async generateMonthlyReport(startDate, endDate) {
    try {
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const salesTotal = await db.query(`
        SELECT COALESCE(SUM(total_amount), 0) as total 
        FROM sales 
        WHERE created_at BETWEEN ? AND ?
      `, [startDateStr, endDateStr]);

      const purchasesTotal = await db.query(`
        SELECT COALESCE(SUM(total_amount), 0) as total 
        FROM purchases 
        WHERE created_at BETWEEN ? AND ?
      `, [startDateStr, endDateStr]);

      const expensesTotal = await db.query(`
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM expenses 
        WHERE date BETWEEN ? AND ?
      `, [startDateStr, endDateStr]);

      const totalCustomers = await db.query('SELECT COUNT(*) as count FROM customers');
      const totalSuppliers = await db.query('SELECT COUNT(*) as count FROM suppliers');
      const totalProducts = await db.query('SELECT COUNT(*) as count FROM products');
      
      const lowStockProducts = await db.query(`
        SELECT COUNT(*) as count 
        FROM products 
        WHERE current_stock < 10 AND current_stock > 0
      `);

      const outOfStockProducts = await db.query(`
        SELECT COUNT(*) as count 
        FROM products 
        WHERE current_stock = 0
      `);

      const netProfit = salesTotal.total - purchasesTotal.total - expensesTotal.total;

      const report = {
        report_type: 'monthly',
        period_start: startDateStr,
        period_end: endDateStr,
        total_sales: salesTotal.total,
        total_purchases: purchasesTotal.total,
        total_expenses: expensesTotal.total,
        net_profit: netProfit,
        total_customers: totalCustomers.count,
        total_suppliers: totalSuppliers.count,
        total_products: totalProducts.count,
        low_stock_products: lowStockProducts.count,
        out_of_stock_products: outOfStockProducts.count
      };

      const result = await db.query(`
        INSERT INTO reports (
          report_type, period_start, period_end, total_sales, total_purchases,
          total_expenses, net_profit, total_customers, total_suppliers,
          total_products, low_stock_products, out_of_stock_products
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        report.report_type,
        report.period_start,
        report.period.end,
        report.total_sales,
        report.total_purchases,
        report.total_expenses,
        report.net_profit,
        report.total_customers,
        report.total_suppliers,
        report.total_products,
        report.low_stock_products,
        report.out_of_stock_products
      ]);

      return { ...report, id: result.lastInsertRowid };
    } catch (err) {
      logger.error('Error in generateMonthlyReport:', err);
      throw err;
    }
  }

  async generatePeriodReport(startDate, endDate) {
    try {
      const startDateStr = new Date(startDate).toISOString().split('T')[0];
      const endDateStr = new Date(endDate).toISOString().split('T')[0];

      const salesTotal = await db.query(`
        SELECT COALESCE(SUM(total_amount), 0) as total 
        FROM sales 
        WHERE created_at BETWEEN ? AND ?
      `, [startDateStr, endDateStr]);

      const purchasesTotal = await db.query(`
        SELECT COALESCE(SUM(total_amount), 0) as total 
        FROM purchases 
        WHERE created_at BETWEEN ? AND ?
      `, [startDateStr, endDateStr]);

      const expensesTotal = await db.query(`
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM expenses 
        WHERE date BETWEEN ? AND ?
      `, [startDateStr, endDateStr]);

      const totalCustomers = await db.query('SELECT COUNT(*) as count FROM customers');
      const totalSuppliers = await db.query('SELECT COUNT(*) as count FROM suppliers');
      const totalProducts = await db.query('SELECT COUNT(*) as count FROM products');
      
      const lowStockProducts = await db.query(`
        SELECT COUNT(*) as count 
        FROM products 
        WHERE current_stock < 10 AND current_stock > 0
      `);

      const outOfStockProducts = await db.query(`
        SELECT COUNT(*) as count 
        FROM products 
        WHERE current_stock = 0
      `);

      const netProfit = (salesTotal[0]?.total || 0) - (purchasesTotal[0]?.total || 0) - (expensesTotal[0]?.total || 0);

      const report = {
        report_type: 'custom',
        period_start: startDateStr,
        period_end: endDateStr,
        total_sales: salesTotal[0]?.total || 0,
        total_purchases: purchasesTotal[0]?.total || 0,
        total_expenses: expensesTotal[0]?.total || 0,
        net_profit: netProfit,
        total_customers: totalCustomers[0]?.count || 0,
        total_suppliers: totalSuppliers[0]?.count || 0,
        total_products: totalProducts[0]?.count || 0,
        low_stock_products: lowStockProducts[0]?.count || 0,
        out_of_stock_products: outOfStockProducts[0]?.count || 0
      };

      const lastInsertId = await db.insert(`
        INSERT INTO reports (
          report_type, period_start, period_end, total_sales, total_purchases,
          total_expenses, net_profit, total_customers, total_suppliers,
          total_products, low_stock_products, out_of_stock_products
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        report.report_type,
        report.period_start,
        report.period_end,
        report.total_sales,
        report.total_purchases,
        report.total_expenses,
        report.net_profit,
        report.total_customers,
        report.total_suppliers,
        report.total_products,
        report.low_stock_products,
        report.out_of_stock_products
      ]);

      return { ...report, id: lastInsertId };
    } catch (err) {
      logger.error('Error in generatePeriodReport:', err);
      throw err;
    }
  }

  async getReturnsReport(startDate, endDate) {
    try {
      const startDateStr = startDate ? new Date(startDate).toISOString().split('T')[0] : null;
      const endDateStr = endDate ? new Date(endDate).toISOString().split('T')[0] : null;

      // Build the WHERE clause for date filtering
      let dateFilter = '';
      let params = [];
      
      if (startDateStr && endDateStr) {
        dateFilter = 'WHERE s.created_at BETWEEN ? AND ?';
        params = [startDateStr, endDateStr];
      } else if (startDateStr) {
        dateFilter = 'WHERE s.created_at >= ?';
        params = [startDateStr];
      } else if (endDateStr) {
        dateFilter = 'WHERE s.created_at <= ?';
        params = [endDateStr];
      }

      // Get returns summary
      const returnsSummary = await db.query(`
        SELECT 
          COUNT(*) as total_returns,
          COUNT(CASE WHEN s.status = 'returned' THEN 1 END) as full_returns,
          COUNT(CASE WHEN s.status = 'partially_returned' THEN 1 END) as partial_returns,
          COALESCE(SUM(s.total_amount), 0) as total_return_value,
          COUNT(DISTINCT s.customer_id) as customers_with_returns
        FROM sales s
        ${dateFilter ? `${dateFilter} AND (s.status = 'returned' OR s.status = 'partially_returned')` : 'WHERE (s.status = "returned" OR s.status = "partially_returned")'}
      `, params);

      // Get monthly returns breakdown
      const monthlyReturns = await db.query(`
        SELECT 
          strftime('%Y-%m', s.created_at) as month_key,
          strftime('%m %Y', s.created_at) as month_name,
          COUNT(*) as return_count,
          COUNT(CASE WHEN s.status = 'returned' THEN 1 END) as full_returns,
          COUNT(CASE WHEN s.status = 'partially_returned' THEN 1 END) as partial_returns,
          COALESCE(SUM(s.total_amount), 0) as return_value,
          COUNT(DISTINCT s.customer_id) as unique_customers
        FROM sales s
        ${dateFilter}
        AND (s.status = 'returned' OR s.status = 'partially_returned')
        GROUP BY strftime('%Y-%m', s.created_at), strftime('%m %Y', s.created_at)
        ORDER BY month_key DESC
      `, params);

      // Get returns by product
      const returnsByProduct = await db.query(`
        SELECT 
          p.id,
          p.name as product_name,
          p.sku as product_code,
          COUNT(DISTINCT s.id) as return_count,
          COALESCE(SUM(si.returned_quantity), 0) as total_returned_quantity,
          COALESCE(SUM(si.returned_quantity * si.price), 0) as total_returned_value
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id AND si.product_id > 0
        JOIN sales s ON si.sale_id = s.id
        ${dateFilter}
        AND (s.status = 'returned' OR s.status = 'partially_returned')
        AND si.returned_quantity > 0
        GROUP BY p.id, p.name, p.sku
        ORDER BY total_returned_value DESC
        LIMIT 10
      `, params);

      // Get returns by customer
      const returnsByCustomer = await db.query(`
        SELECT 
          c.id,
          c.name as customer_name,
          c.phone as customer_phone,
          COUNT(s.id) as return_count,
          COALESCE(SUM(s.total_amount), 0) as total_return_value,
          COUNT(CASE WHEN s.status = 'returned' THEN 1 END) as full_returns,
          COUNT(CASE WHEN s.status = 'partially_returned' THEN 1 END) as partial_returns
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        ${dateFilter}
        AND (s.status = 'returned' OR s.status = 'partially_returned')
        GROUP BY c.id, c.name, c.phone
        ORDER BY total_return_value DESC
        LIMIT 10
      `, params);

      // Get detailed returns list
      const detailedReturns = await db.query(`
        SELECT 
          s.id,
          s.invoice_no,
          s.invoice_date,
          s.total_amount,
          s.status,
          s.payment_status,
          c.name as customer_name,
          c.phone as customer_phone,
          u.name as created_by_name,
          COALESCE(SUM(si.returned_quantity), 0) as total_returned_items,
          COALESCE(SUM(si.returned_quantity * si.price), 0) as returned_value
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN users u ON s.created_by = u.id
        LEFT JOIN sale_items si ON s.id = si.sale_id
        ${dateFilter}
        AND (s.status = 'returned' OR s.status = 'partially_returned')
        GROUP BY s.id, s.invoice_no, s.invoice_date, s.total_amount, s.status, s.payment_status, c.name, c.phone, u.name
        ORDER BY s.invoice_date DESC
      `, params);

      return {
        summary: {
          total_returns: returnsSummary[0]?.total_returns || 0,
          full_returns: returnsSummary[0]?.full_returns || 0,
          partial_returns: returnsSummary[0]?.partial_returns || 0,
          total_return_value: returnsSummary[0]?.total_return_value || 0,
          customers_with_returns: returnsSummary[0]?.customers_with_returns || 0,
          average_return_value: returnsSummary[0]?.total_returns > 0 ? 
            returnsSummary[0].total_return_value / returnsSummary[0].total_returns : 0
        },
        monthly_breakdown: monthlyReturns.map(month => ({
          month_key: month.month_key,
          month_name: month.month_name,
          return_count: month.return_count,
          full_returns: month.full_returns,
          partial_returns: month.partial_returns,
          return_value: month.return_value,
          unique_customers: month.unique_customers,
          average_return_value: month.return_count > 0 ? month.return_value / month.return_count : 0
        })),
        top_products: returnsByProduct.map(product => ({
          id: product.id,
          name: product.product_name,
          code: product.product_code,
          return_count: product.return_count,
          total_returned_quantity: product.total_returned_quantity,
          total_returned_value: product.total_returned_value,
          average_return_value: product.return_count > 0 ? product.total_returned_value / product.return_count : 0
        })),
        top_customers: returnsByCustomer.map(customer => ({
          id: customer.id,
          name: customer.customer_name || 'عميل نقدي',
          phone: customer.customer_phone,
          return_count: customer.return_count,
          total_return_value: customer.total_return_value,
          full_returns: customer.full_returns,
          partial_returns: customer.partial_returns,
          average_return_value: customer.return_count > 0 ? customer.total_return_value / customer.return_count : 0
        })),
        detailed_returns: detailedReturns.map(return_item => ({
          id: return_item.id,
          invoice_no: return_item.invoice_no,
          invoice_date: return_item.invoice_date,
          total_amount: return_item.total_amount,
          status: return_item.status,
          payment_status: return_item.payment_status,
          customer_name: return_item.customer_name || 'عميل نقدي',
          customer_phone: return_item.customer_phone,
          created_by_name: return_item.created_by_name || 'غير محدد',
          total_returned_items: return_item.total_returned_items,
          returned_value: return_item.returned_value
        }))
      };
    } catch (err) {
      logger.error('Error in getReturnsReport:', err);
      throw err;
    }
  }

  // Comprehensive Stock Reports
  async getStocksReport(startDate, endDate, page = 1, limit = 50) {
    try {
      const dateFilter = startDate && endDate ? 
        `date(p.created_at) BETWEEN ? AND ?` : '';
      const params = startDate && endDate ? [startDate, endDate] : [];
      
      // Calculate offset for pagination
      const offset = (page - 1) * limit;

      // Get current date for calculations
      const currentDate = new Date().toISOString().split('T')[0];

      // Get total count for pagination
      const totalCountResult = await db.query(`
        SELECT COUNT(*) as total_count
        FROM products p
        ${dateFilter ? `WHERE ${dateFilter}` : ''}
      `, params);
      const totalCount = totalCountResult[0]?.total_count || 0;

      // 1. Stock Quantities Summary
      const stockQuantitiesSummary = await db.query(`
        SELECT 
          COUNT(*) as total_products,
          COALESCE(SUM(current_stock), 0) as total_quantity,
          COALESCE(SUM(current_stock * purchase_price), 0) as total_value,
          COUNT(CASE WHEN current_stock = 0 THEN 1 END) as out_of_stock_count,
          COUNT(CASE WHEN current_stock > 0 AND current_stock <= 10 THEN 1 END) as low_stock_count,
          COUNT(CASE WHEN current_stock > 10 THEN 1 END) as good_stock_count,
          COALESCE(AVG(current_stock), 0) as average_stock_per_product
        FROM products p
        ${dateFilter ? `WHERE ${dateFilter}` : ''}
      `, params);

      // 2. Enhanced Expiry Alerts with more details
      const expiryAlerts = await db.query(`
        SELECT 
          p.id,
          p.name as product_name,
          p.sku as product_sku,
          p.current_stock,
          p.expiry_date,
          p.purchase_price,
          p.selling_price,
          (p.current_stock * p.purchase_price) as stock_value,
          COALESCE(c.name, 'بدون تصنيف') as category_name,
          CASE 
            WHEN p.expiry_date IS NULL THEN 'no_expiry'
            WHEN DATE(p.expiry_date) <= DATE('now') THEN 'expired'
            WHEN DATE(p.expiry_date) <= DATE('now', '+7 days') THEN 'expiring_critical'
            WHEN DATE(p.expiry_date) <= DATE('now', '+30 days') THEN 'expiring_soon'
            WHEN DATE(p.expiry_date) <= DATE('now', '+90 days') THEN 'expiring_later'
            ELSE 'safe'
          END as expiry_status,
          CASE 
            WHEN p.expiry_date IS NULL THEN NULL
            WHEN DATE(p.expiry_date) <= DATE('now') THEN 0
            ELSE JULIANDAY(p.expiry_date) - JULIANDAY('now')
          END as days_until_expiry,
          CASE 
            WHEN p.expiry_date IS NULL THEN 'لا يوجد تاريخ صلاحية'
            WHEN DATE(p.expiry_date) <= DATE('now') THEN 'منتهي الصلاحية'
            WHEN DATE(p.expiry_date) <= DATE('now', '+7 days') THEN 'ينتهي خلال 7 أيام'
            WHEN DATE(p.expiry_date) <= DATE('now', '+30 days') THEN 'ينتهي خلال 30 يوم'
            WHEN DATE(p.expiry_date) <= DATE('now', '+90 days') THEN 'ينتهي خلال 90 يوم'
            ELSE 'آمن'
          END as expiry_status_text
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.current_stock > 0 
        AND p.expiry_date IS NOT NULL
        AND DATE(p.expiry_date) <= DATE('now', '+90 days')
        ORDER BY p.expiry_date ASC
      `);

      // 3. Enhanced Low Stock Alerts - Limited to prevent performance issues
      const lowStockAlerts = await db.query(`
        SELECT 
          p.id,
          p.name as product_name,
          p.sku as product_sku,
          p.current_stock,
          5 as min_stock_level,
          p.purchase_price,
          p.selling_price,
          (p.current_stock * p.purchase_price) as stock_value,
          COALESCE(c.name, 'بدون تصنيف') as category_name,
          CASE 
            WHEN p.current_stock = 0 THEN 'out_of_stock'
            WHEN p.current_stock <= 5 THEN 'below_minimum'
            WHEN p.current_stock <= 10 THEN 'low_stock'
            ELSE 'adequate'
          END as stock_status,
          CASE 
            WHEN p.current_stock = 0 THEN 'نفذ المخزون'
            WHEN p.current_stock <= 5 THEN 'أقل من الحد الأدنى'
            WHEN p.current_stock <= 10 THEN 'مخزون منخفض'
            ELSE 'مخزون كافي'
          END as stock_status_text,
          (p.current_stock * p.purchase_price) as current_value,
          (5 * p.purchase_price) as min_stock_value
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.current_stock <= 10
        ORDER BY p.current_stock ASC, p.name ASC
        LIMIT 100
      `);

      // Get total count of low stock products for summary
      const lowStockCount = await db.query(`
        SELECT COUNT(*) as total_count
        FROM products p
        WHERE p.current_stock <= 10
      `);

      // 4. Top Selling Products (by quantity)
      const topSellingProducts = await db.query(`
        SELECT 
          p.id,
          p.name as product_name,
          p.sku as product_sku,
          p.current_stock,
          p.purchase_price,
          p.selling_price,
          COALESCE(SUM(si.quantity), 0) as total_sold_quantity,
          COALESCE(SUM(si.quantity * si.price), 0) as total_sold_value,
          COALESCE(SUM(si.quantity * (si.price - p.purchase_price)), 0) as total_profit,
          COUNT(DISTINCT s.id) as sales_count,
          COALESCE(AVG(si.quantity), 0) as average_quantity_per_sale
        FROM products p
        LEFT JOIN sale_items si ON p.id = si.product_id
        LEFT JOIN sales s ON si.sale_id = s.id
        ${dateFilter ? `WHERE ${dateFilter.replace('p.created_at', 's.invoice_date')}` : ''}
        GROUP BY p.id, p.name, p.sku, p.current_stock, p.purchase_price, p.selling_price
        HAVING total_sold_quantity > 0
        ORDER BY total_sold_quantity DESC
        LIMIT 20
      `, params);

      // 5. Stock Movement Analysis
      const stockMovements = await db.query(`
        SELECT 
          p.id,
          p.name as product_name,
          p.sku as product_sku,
          p.current_stock,
          COALESCE(SUM(CASE WHEN sm.movement_type = 'purchase' THEN sm.quantity ELSE 0 END), 0) as total_purchased,
          COALESCE(SUM(CASE WHEN sm.movement_type = 'sale' THEN sm.quantity ELSE 0 END), 0) as total_sold,
          COALESCE(SUM(CASE WHEN sm.movement_type = 'return' THEN sm.quantity ELSE 0 END), 0) as total_returned,
          COALESCE(SUM(CASE WHEN sm.movement_type = 'adjustment' THEN sm.quantity ELSE 0 END), 0) as total_adjusted,
          COUNT(CASE WHEN sm.movement_type = 'purchase' THEN 1 END) as purchase_movements,
          COUNT(CASE WHEN sm.movement_type = 'sale' THEN 1 END) as sale_movements,
          COUNT(CASE WHEN sm.movement_type = 'return' THEN 1 END) as return_movements,
          COUNT(CASE WHEN sm.movement_type = 'adjustment' THEN 1 END) as adjustment_movements
        FROM products p
        LEFT JOIN stock_movements sm ON p.id = sm.product_id
        ${dateFilter ? `WHERE ${dateFilter.replace('p.created_at', 'sm.created_at')}` : ''}
        GROUP BY p.id, p.name, p.sku, p.current_stock
        ORDER BY total_sold DESC
        LIMIT 20
      `, params);

      // 6. Stock Value by Category (if categories exist)
      const stockValueByCategory = await db.query(`
        SELECT 
          COALESCE(c.name, 'بدون تصنيف') as category_name,
          COUNT(p.id) as products_count,
          COALESCE(SUM(p.current_stock), 0) as total_quantity,
          COALESCE(SUM(p.current_stock * p.purchase_price), 0) as total_value,
          COALESCE(AVG(p.current_stock), 0) as average_stock_per_product
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ${dateFilter ? `WHERE ${dateFilter}` : ''}
        GROUP BY c.id, c.name
        ORDER BY total_value DESC
      `, params);

      // 7. Enhanced Recent Stock Activities
      const recentStockActivities = await db.query(`
        SELECT 
          sm.id,
          sm.movement_type,
          sm.quantity,
          sm.created_at,
          p.name as product_name,
          p.sku as product_sku,
          COALESCE(c.name, 'بدون تصنيف') as category_name,
          sm.notes,
          sm.reference_type,
          sm.reference_number,
          CASE 
            WHEN sm.movement_type = 'purchase' THEN 'شراء'
            WHEN sm.movement_type = 'sale' THEN 'بيع'
            WHEN sm.movement_type = 'return' THEN 'إرجاع'
            WHEN sm.movement_type = 'adjustment' THEN 'تعديل'
            WHEN sm.movement_type = 'transfer' THEN 'نقل'
            ELSE sm.movement_type
          END as movement_type_text
        FROM stock_movements sm
        JOIN products p ON sm.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY sm.created_at DESC
        LIMIT 50
      `);

      // 8. Inventory Aging Analysis (with pagination)
      const inventoryAging = await db.query(`
        SELECT 
          p.id,
          p.name as product_name,
          p.sku as product_sku,
          p.current_stock,
          p.purchase_price,
          p.selling_price,
          (p.current_stock * p.purchase_price) as stock_value,
          COALESCE(c.name, 'بدون تصنيف') as category_name,
          CASE 
            WHEN p.current_stock = 0 THEN 'no_stock'
            WHEN p.current_stock <= 5 THEN 'very_low'
            WHEN p.current_stock <= 10 THEN 'low'
            WHEN p.current_stock <= 50 THEN 'medium'
            ELSE 'high'
          END as stock_level,
          CASE 
            WHEN p.current_stock = 0 THEN 'لا يوجد مخزون'
            WHEN p.current_stock <= 5 THEN 'مخزون منخفض جداً'
            WHEN p.current_stock <= 10 THEN 'مخزون منخفض'
            WHEN p.current_stock <= 50 THEN 'مخزون متوسط'
            ELSE 'مخزون عالي'
          END as stock_level_text
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.current_stock ASC, p.name ASC
        LIMIT ? OFFSET ?
      `, [limit, offset]);

      // 9. Stock Value Analysis
      const stockValueAnalysis = await db.query(`
        SELECT 
          COALESCE(c.name, 'بدون تصنيف') as category_name,
          COUNT(p.id) as products_count,
          COALESCE(SUM(p.current_stock), 0) as total_quantity,
          COALESCE(SUM(p.current_stock * p.purchase_price), 0) as total_purchase_value,
          COALESCE(SUM(p.current_stock * p.selling_price), 0) as total_selling_value,
          COALESCE(SUM(p.current_stock * (p.selling_price - p.purchase_price)), 0) as potential_profit,
          COALESCE(AVG(p.current_stock), 0) as average_stock_per_product,
          COALESCE(AVG(p.purchase_price), 0) as average_purchase_price,
          COALESCE(AVG(p.selling_price), 0) as average_selling_price
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ${dateFilter ? `WHERE ${dateFilter}` : ''}
        GROUP BY c.id, c.name
        ORDER BY total_purchase_value DESC
      `, params);

      // 10. Stock Movement Summary
      const stockMovementSummary = await db.query(`
        SELECT 
          sm.movement_type,
          COUNT(*) as movement_count,
          COALESCE(SUM(sm.quantity), 0) as total_quantity,
          CASE 
            WHEN sm.movement_type = 'purchase' THEN 'شراء'
            WHEN sm.movement_type = 'sale' THEN 'بيع'
            WHEN sm.movement_type = 'return' THEN 'إرجاع'
            WHEN sm.movement_type = 'adjustment' THEN 'تعديل'
            WHEN sm.movement_type = 'transfer' THEN 'نقل'
            ELSE sm.movement_type
          END as movement_type_text
        FROM stock_movements sm
        ${dateFilter ? `WHERE ${dateFilter.replace('p.created_at', 'sm.created_at')}` : ''}
        GROUP BY sm.movement_type
        ORDER BY movement_count DESC
      `, params);

      return {
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        },
        summary: {
          total_products: stockQuantitiesSummary[0]?.total_products || 0,
          total_quantity: stockQuantitiesSummary[0]?.total_quantity || 0,
          total_value: stockQuantitiesSummary[0]?.total_value || 0,
          out_of_stock_count: stockQuantitiesSummary[0]?.out_of_stock_count || 0,
          low_stock_count: stockQuantitiesSummary[0]?.low_stock_count || 0,
          good_stock_count: stockQuantitiesSummary[0]?.good_stock_count || 0,
          average_stock_per_product: stockQuantitiesSummary[0]?.average_stock_per_product || 0
        },
        expiry_alerts: expiryAlerts.map(item => ({
          id: item.id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          current_stock: item.current_stock,
          expiry_date: item.expiry_date,
          purchase_price: item.purchase_price,
          selling_price: item.selling_price,
          stock_value: item.stock_value,
          expiry_status: item.expiry_status,
          days_until_expiry: item.days_until_expiry
        })),
        low_stock_alerts: lowStockAlerts.map(item => ({
          id: item.id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          current_stock: item.current_stock,
          min_stock_level: item.min_stock_level,
          purchase_price: item.purchase_price,
          selling_price: item.selling_price,
          stock_value: item.stock_value,
          category_name: item.category_name,
          stock_status: item.stock_status,
          stock_status_text: item.stock_status_text,
          current_value: item.current_value,
          min_stock_value: item.min_stock_value
        })),
        top_selling_products: topSellingProducts.map(item => ({
          id: item.id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          current_stock: item.current_stock,
          purchase_price: item.purchase_price,
          selling_price: item.selling_price,
          total_sold_quantity: item.total_sold_quantity,
          total_sold_value: item.total_sold_value,
          total_profit: item.total_profit,
          sales_count: item.sales_count,
          average_quantity_per_sale: item.average_quantity_per_sale
        })),
        stock_movements: stockMovements.map(item => ({
          id: item.id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          current_stock: item.current_stock,
          total_purchased: item.total_purchased,
          total_sold: item.total_sold,
          total_returned: item.total_returned,
          total_adjusted: item.total_adjusted,
          purchase_movements: item.purchase_movements,
          sale_movements: item.sale_movements,
          return_movements: item.return_movements,
          adjustment_movements: item.adjustment_movements
        })),
        stock_value_by_category: stockValueByCategory.map(item => ({
          category_name: item.category_name,
          products_count: item.products_count,
          total_quantity: item.total_quantity,
          total_value: item.total_value,
          average_stock_per_product: item.average_stock_per_product
        })),
        recent_activities: recentStockActivities.map(item => ({
          id: item.id,
          movement_type: item.movement_type,
          quantity: item.quantity,
          created_at: item.created_at,
          product_name: item.product_name,
          product_sku: item.product_sku,
          category_name: item.category_name,
          notes: item.notes,
          reference_type: item.reference_type,
          reference_number: item.reference_number,
          movement_type_text: item.movement_type_text
        })),
        inventory_aging: inventoryAging.map(item => ({
          id: item.id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          current_stock: item.current_stock,
          purchase_price: item.purchase_price,
          selling_price: item.selling_price,
          stock_value: item.stock_value,
          category_name: item.category_name,
          stock_level: item.stock_level,
          stock_level_text: item.stock_level_text
        })),
        stock_value_analysis: stockValueAnalysis.map(item => ({
          category_name: item.category_name,
          products_count: item.products_count,
          total_quantity: item.total_quantity,
          total_purchase_value: item.total_purchase_value,
          total_selling_value: item.total_selling_value,
          potential_profit: item.potential_profit,
          average_stock_per_product: item.average_stock_per_product,
          average_purchase_price: item.average_purchase_price,
          average_selling_price: item.average_selling_price
        })),
        stock_movement_summary: stockMovementSummary.map(item => ({
          movement_type: item.movement_type,
          movement_count: item.movement_count,
          total_quantity: item.total_quantity,
          movement_type_text: item.movement_type_text
        }))
      };
    } catch (err) {
      logger.error('Error in getStocksReport:', err);
      throw err;
    }
  }

  // Comprehensive Sales Analysis Report
  async getSalesAnalysis(startDate, endDate) {
    try {
      const startDateStr = startDate ? new Date(startDate).toISOString().split('T')[0] : null;
      const endDateStr = endDate ? new Date(endDate).toISOString().split('T')[0] : null;

      // Build date filter
      let dateFilter = '';
      let params = [];
      
      if (startDateStr && endDateStr) {
        dateFilter = 'WHERE DATE(s.created_at) BETWEEN ? AND ?';
        params = [startDateStr, endDateStr];
      } else if (startDateStr) {
        dateFilter = 'WHERE DATE(s.created_at) >= ?';
        params = [startDateStr];
      } else if (endDateStr) {
        dateFilter = 'WHERE DATE(s.created_at) <= ?';
        params = [endDateStr];
      }

      // 1. Sales Summary
      const salesSummaryWhereClause = dateFilter ? 
        `${dateFilter} AND s.status NOT IN ('cancelled') AND (si.quantity - COALESCE(si.returned_quantity, 0)) > 0` :
        `WHERE s.status NOT IN ('cancelled') AND (si.quantity - COALESCE(si.returned_quantity, 0)) > 0`;

      const salesSummary = await db.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN s.status != 'returned' THEN (si.quantity - COALESCE(si.returned_quantity, 0)) * si.price ELSE 0 END), 0) as total_sales,
          COUNT(DISTINCT CASE WHEN s.status != 'returned' THEN s.id END) as total_orders,
          COALESCE(SUM(CASE WHEN s.status != 'returned' THEN (si.quantity - COALESCE(si.returned_quantity, 0)) * si.price ELSE 0 END), 0) / 
            NULLIF(COUNT(DISTINCT CASE WHEN s.status != 'returned' THEN s.id END), 0) as average_order_value,
          COUNT(DISTINCT CASE WHEN s.status != 'returned' THEN s.customer_id END) as total_customers,
          COUNT(DISTINCT CASE WHEN s.status != 'returned' AND s.customer_id NOT IN (
            SELECT DISTINCT customer_id FROM sales WHERE created_at < s.created_at AND status != 'returned'
          ) THEN s.customer_id END) as new_customers,
          COUNT(DISTINCT CASE WHEN s.status != 'returned' AND s.customer_id IN (
            SELECT DISTINCT customer_id FROM sales WHERE created_at < s.created_at AND status != 'returned'
          ) THEN s.customer_id END) as repeat_customers,
          COALESCE(SUM(CASE WHEN s.status != 'returned' THEN (si.quantity - COALESCE(si.returned_quantity, 0)) * (si.price - COALESCE(p.purchase_price, 0)) ELSE 0 END), 0) as total_profit
        FROM sales s
        LEFT JOIN sale_items si ON s.id = si.sale_id
        LEFT JOIN products p ON si.product_id = p.id AND si.product_id > 0
        ${salesSummaryWhereClause}
      `, params);

      // Calculate conversion rate and profit margin
      const summary = salesSummary[0] || {};
      const conversionRate = summary.total_customers > 0 ? 
        ((summary.repeat_customers / summary.total_customers) * 100) : 0;
      const profitMargin = summary.total_sales > 0 ? 
        ((summary.total_profit / summary.total_sales) * 100) : 0;

      // 2. Daily Sales Trends
      const dailySalesWhereClause = dateFilter ? 
        `${dateFilter} AND s.status NOT IN ('cancelled') AND (si.quantity - COALESCE(si.returned_quantity, 0)) > 0` :
        `WHERE s.status NOT IN ('cancelled') AND (si.quantity - COALESCE(si.returned_quantity, 0)) > 0`;

      const dailySales = await db.query(`
        SELECT 
          DATE(s.created_at) as date,
          COALESCE(SUM(CASE WHEN s.status != 'returned' THEN (si.quantity - COALESCE(si.returned_quantity, 0)) * si.price ELSE 0 END), 0) as sales,
          COUNT(DISTINCT CASE WHEN s.status != 'returned' THEN s.id END) as orders,
          COUNT(DISTINCT CASE WHEN s.status != 'returned' THEN s.customer_id END) as customers
        FROM sales s
        LEFT JOIN sale_items si ON s.id = si.sale_id
        ${dailySalesWhereClause}
        GROUP BY DATE(s.created_at)
        ORDER BY date ASC
      `, params);

      // 3. Monthly Sales Trends
      const monthlySalesWhereClause = dateFilter ? 
        `${dateFilter} AND s.status NOT IN ('cancelled') AND (si.quantity - COALESCE(si.returned_quantity, 0)) > 0` :
        `WHERE s.status NOT IN ('cancelled') AND (si.quantity - COALESCE(si.returned_quantity, 0)) > 0`;

      const monthlySales = await db.query(`
        SELECT 
          strftime('%Y-%m', s.created_at) as month,
          strftime('%m %Y', s.created_at) as month_name,
          COALESCE(SUM(CASE WHEN s.status != 'returned' THEN (si.quantity - COALESCE(si.returned_quantity, 0)) * si.price ELSE 0 END), 0) as sales,
          COUNT(DISTINCT CASE WHEN s.status != 'returned' THEN s.id END) as orders,
          COALESCE(SUM(CASE WHEN s.status != 'returned' THEN (si.quantity - COALESCE(si.returned_quantity, 0)) * (si.price - COALESCE(p.purchase_price, 0)) ELSE 0 END), 0) as profit
        FROM sales s
        LEFT JOIN sale_items si ON s.id = si.sale_id
        LEFT JOIN products p ON si.product_id = p.id AND si.product_id > 0
        ${monthlySalesWhereClause}
        GROUP BY strftime('%Y-%m', s.created_at)
        ORDER BY month ASC
      `, params);

      // 4. Top Selling Products
      const topProductsWhereClause = dateFilter ? 
        `${dateFilter} AND s.status NOT IN ('cancelled', 'returned') AND (si.quantity - COALESCE(si.returned_quantity, 0)) > 0` :
        `WHERE s.status NOT IN ('cancelled', 'returned') AND (si.quantity - COALESCE(si.returned_quantity, 0)) > 0`;

      const topProducts = await db.query(`
        SELECT 
          p.id,
          p.name,
          p.sku,
          COALESCE(SUM(si.quantity - COALESCE(si.returned_quantity, 0)), 0) as quantity_sold,
          COALESCE(SUM((si.quantity - COALESCE(si.returned_quantity, 0)) * si.price), 0) as revenue,
          COALESCE(SUM((si.quantity - COALESCE(si.returned_quantity, 0)) * (si.price - COALESCE(p.purchase_price, 0))), 0) as profit,
          CASE 
            WHEN COALESCE(SUM((si.quantity - COALESCE(si.returned_quantity, 0)) * si.price), 0) > 0 
            THEN (COALESCE(SUM((si.quantity - COALESCE(si.returned_quantity, 0)) * (si.price - COALESCE(p.purchase_price, 0))), 0) / 
                  COALESCE(SUM((si.quantity - COALESCE(si.returned_quantity, 0)) * si.price), 0)) * 100
            ELSE 0 
          END as profit_margin
        FROM products p
        LEFT JOIN sale_items si ON p.id = si.product_id
        LEFT JOIN sales s ON si.sale_id = s.id
        ${topProductsWhereClause}
        GROUP BY p.id, p.name, p.sku
        HAVING quantity_sold > 0
        ORDER BY quantity_sold DESC
        LIMIT 20
      `, params);

      // 5. Top Customers
      const topCustomersWhereClause = dateFilter ? 
        `${dateFilter} AND s.status NOT IN ('cancelled', 'returned') AND (si.quantity - COALESCE(si.returned_quantity, 0)) > 0` :
        `WHERE s.status NOT IN ('cancelled', 'returned') AND (si.quantity - COALESCE(si.returned_quantity, 0)) > 0`;

      const topCustomers = await db.query(`
        SELECT 
          c.id,
          c.name,
          c.phone,
          COUNT(DISTINCT s.id) as total_orders,
          COALESCE(SUM((si.quantity - COALESCE(si.returned_quantity, 0)) * si.price), 0) as total_spent,
          COALESCE(SUM((si.quantity - COALESCE(si.returned_quantity, 0)) * si.price), 0) / COUNT(DISTINCT s.id) as average_order,
          MAX(s.created_at) as last_order_date
        FROM customers c
        LEFT JOIN sales s ON c.id = s.customer_id
        LEFT JOIN sale_items si ON s.id = si.sale_id
        ${topCustomersWhereClause}
        GROUP BY c.id, c.name, c.phone
        HAVING total_orders > 0
        ORDER BY total_spent DESC
        LIMIT 20
      `, params);

      // 6. Sales by Category
      const salesByCategoryWhereClause = dateFilter ? 
        `${dateFilter} AND s.status NOT IN ('cancelled', 'returned') AND (si.quantity - COALESCE(si.returned_quantity, 0)) > 0` :
        `WHERE s.status NOT IN ('cancelled', 'returned') AND (si.quantity - COALESCE(si.returned_quantity, 0)) > 0`;

      const salesByCategory = await db.query(`
        SELECT 
          COALESCE(cat.name, 'بدون تصنيف') as category,
          COALESCE(SUM((si.quantity - COALESCE(si.returned_quantity, 0)) * si.price), 0) as sales,
          COUNT(DISTINCT s.id) as orders,
          COUNT(DISTINCT p.id) as products
        FROM products p
        LEFT JOIN categories cat ON p.category_id = cat.id
        LEFT JOIN sale_items si ON p.id = si.product_id
        LEFT JOIN sales s ON si.sale_id = s.id
        ${salesByCategoryWhereClause}
        GROUP BY cat.id, cat.name
        HAVING sales > 0
        ORDER BY sales DESC
      `, params);

      // 7. Payment Methods Analysis
      const paymentMethodsWhereClause = dateFilter ? 
        `${dateFilter} AND s.status NOT IN ('cancelled', 'returned') AND (si.quantity - COALESCE(si.returned_quantity, 0)) > 0` :
        `WHERE s.status NOT IN ('cancelled', 'returned') AND (si.quantity - COALESCE(si.returned_quantity, 0)) > 0`;

      const paymentMethods = await db.query(`
        SELECT 
          s.payment_method as method,
          COUNT(*) as count,
          COALESCE(SUM((si.quantity - COALESCE(si.returned_quantity, 0)) * si.price), 0) as amount
        FROM sales s
        LEFT JOIN sale_items si ON s.id = si.sale_id
        ${paymentMethodsWhereClause}
        GROUP BY s.payment_method
        ORDER BY amount DESC
      `, params);

      // Calculate payment method percentages
      const totalPaymentAmount = paymentMethods.reduce((sum, item) => sum + item.amount, 0);
      const paymentMethodsWithPercentage = paymentMethods.map(item => ({
        ...item,
        percentage: totalPaymentAmount > 0 ? ((item.amount / totalPaymentAmount) * 100) : 0
      }));

      // 8. Payment Status Analysis
      const paymentStatusWhereClause = dateFilter ? 
        `${dateFilter} AND s.status NOT IN ('cancelled', 'returned') AND (si.quantity - COALESCE(si.returned_quantity, 0)) > 0` :
        `WHERE s.status NOT IN ('cancelled', 'returned') AND (si.quantity - COALESCE(si.returned_quantity, 0)) > 0`;

      const paymentStatus = await db.query(`
        SELECT 
          s.payment_status as status,
          COUNT(*) as count,
          COALESCE(SUM((si.quantity - COALESCE(si.returned_quantity, 0)) * si.price), 0) as amount
        FROM sales s
        LEFT JOIN sale_items si ON s.id = si.sale_id
        ${paymentStatusWhereClause}
        GROUP BY s.payment_status
        ORDER BY amount DESC
      `, params);

      // Calculate payment status percentages
      const totalStatusAmount = paymentStatus.reduce((sum, item) => sum + item.amount, 0);
      const paymentStatusWithPercentage = paymentStatus.map(item => ({
        ...item,
        percentage: totalStatusAmount > 0 ? ((item.amount / totalStatusAmount) * 100) : 0
      }));

      // 9. Performance Metrics (Growth calculations)
      // Get previous period data for comparison
      const previousStartDate = startDateStr ? new Date(startDateStr) : new Date();
      const previousEndDate = endDateStr ? new Date(endDateStr) : new Date();
      const periodDays = Math.ceil((previousEndDate - previousStartDate) / (1000 * 60 * 60 * 24));
      
      previousStartDate.setDate(previousStartDate.getDate() - periodDays);
      previousEndDate.setDate(previousEndDate.getDate() - periodDays);

      const previousPeriodData = await db.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN s.status != 'returned' THEN (si.quantity - COALESCE(si.returned_quantity, 0)) * si.price ELSE 0 END), 0) as total_sales,
          COUNT(DISTINCT CASE WHEN s.status != 'returned' THEN s.customer_id END) as total_customers,
          COALESCE(SUM(CASE WHEN s.status != 'returned' THEN (si.quantity - COALESCE(si.returned_quantity, 0)) * si.price ELSE 0 END), 0) / 
            NULLIF(COUNT(DISTINCT CASE WHEN s.status != 'returned' THEN s.id END), 0) as average_order_value,
          COALESCE(SUM(CASE WHEN s.status != 'returned' THEN (si.quantity - COALESCE(si.returned_quantity, 0)) * (si.price - COALESCE(p.purchase_price, 0)) ELSE 0 END), 0) as total_profit
        FROM sales s
        LEFT JOIN sale_items si ON s.id = si.sale_id
        LEFT JOIN products p ON si.product_id = p.id AND si.product_id > 0
        WHERE DATE(s.created_at) BETWEEN ? AND ?
        AND s.status NOT IN ('cancelled')
        AND (si.quantity - COALESCE(si.returned_quantity, 0)) > 0
      `, [previousStartDate.toISOString().split('T')[0], previousEndDate.toISOString().split('T')[0]]);

      const previous = previousPeriodData[0] || {};
      
      // Calculate growth percentages
      const salesGrowth = previous.total_sales > 0 ? 
        (((summary.total_sales - previous.total_sales) / previous.total_sales) * 100) : 0;
      const customerGrowth = previous.total_customers > 0 ? 
        (((summary.total_customers - previous.total_customers) / previous.total_customers) * 100) : 0;
      const averageOrderGrowth = previous.average_order_value > 0 ? 
        (((summary.average_order_value - previous.average_order_value) / previous.average_order_value) * 100) : 0;
      const profitGrowth = previous.total_profit > 0 ? 
        (((summary.total_profit - previous.total_profit) / previous.total_profit) * 100) : 0;

      return {
        summary: {
          total_sales: summary.total_sales || 0,
          total_orders: summary.total_orders || 0,
          average_order_value: summary.average_order_value || 0,
          total_customers: summary.total_customers || 0,
          new_customers: summary.new_customers || 0,
          repeat_customers: summary.repeat_customers || 0,
          conversion_rate: conversionRate,
          total_profit: summary.total_profit || 0,
          profit_margin: profitMargin
        },
        trends: {
          daily_sales: dailySales.map(item => ({
            date: item.date,
            sales: item.sales,
            orders: item.orders,
            customers: item.customers
          })),
          monthly_sales: monthlySales.map(item => ({
            month: item.month_name,
            sales: item.sales,
            orders: item.orders,
            profit: item.profit
          }))
        },
        top_products: topProducts.map(item => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          quantity_sold: item.quantity_sold,
          revenue: item.revenue,
          profit: item.profit,
          profit_margin: item.profit_margin
        })),
        top_customers: topCustomers.map(item => ({
          id: item.id,
          name: item.name,
          phone: item.phone,
          total_orders: item.total_orders,
          total_spent: item.total_spent,
          average_order: item.average_order,
          last_order_date: item.last_order_date
        })),
        sales_by_category: salesByCategory.map(item => ({
          category: item.category,
          sales: item.sales,
          orders: item.orders,
          products: item.products
        })),
        payment_analysis: {
          payment_methods: paymentMethodsWithPercentage,
          payment_status: paymentStatusWithPercentage
        },
        performance_metrics: {
          sales_growth: salesGrowth,
          customer_growth: customerGrowth,
          average_order_growth: averageOrderGrowth,
          profit_growth: profitGrowth
        }
      };
    } catch (err) {
      logger.error('Error in getSalesAnalysis:', err);
      throw err;
    }
  }

  // Custom Reports Services
  async getDelegatesReport(startDate, endDate) {
    try {
      const dateFilter = startDate && endDate ? 'WHERE DATE(s.created_at) BETWEEN ? AND ?' : '';
      const params = startDate && endDate ? [startDate, endDate] : [];

      // Get delegate summary data
      const summaryQuery = `
        SELECT 
          d.id,
          d.name,
          d.phone,
          d.email,
          COUNT(DISTINCT s.id) as total_sales,
          SUM(si.quantity * si.price) as total_revenue,
          AVG(si.quantity * si.price) as avg_sale_value,
          COUNT(DISTINCT s.customer_id) as unique_customers,
          MAX(s.created_at) as last_sale_date
        FROM representatives d
        LEFT JOIN sales s ON d.id = s.delegate_id
        LEFT JOIN sale_items si ON s.id = si.sale_id
        ${dateFilter}
        GROUP BY d.id, d.name, d.phone, d.email
        ORDER BY total_revenue DESC
      `;

      const summaryData = await db.query(summaryQuery, params);

      // Get products sold by each delegate
      const productsDateFilter = startDate && endDate ? 'AND DATE(s.created_at) BETWEEN ? AND ?' : '';
      const productsQuery = `
        SELECT 
          d.id as delegate_id,
          p.id as product_id,
          p.name as product_name,
          p.sku as product_sku,
          p.barcode as product_barcode,
          SUM(si.quantity) as total_quantity_sold,
          SUM(si.quantity * si.price) as total_revenue,
          AVG(si.price) as avg_price,
          COUNT(DISTINCT s.id) as number_of_sales
        FROM representatives d
        LEFT JOIN sales s ON d.id = s.delegate_id
        LEFT JOIN sale_items si ON s.id = si.sale_id
        LEFT JOIN products p ON si.product_id = p.id
        WHERE p.id IS NOT NULL ${productsDateFilter}
        GROUP BY d.id, p.id, p.name, p.sku, p.barcode
        ORDER BY d.id, total_quantity_sold DESC
      `;

      const productsData = await db.query(productsQuery, params);

      // Get customer receipts for each delegate
      const receiptsDateFilter = startDate && endDate ? 'AND DATE(cr.receipt_date) BETWEEN ? AND ?' : '';
      const receiptsQuery = `
        SELECT 
          d.id as delegate_id,
          cr.id as receipt_id,
          cr.receipt_number,
          cr.receipt_date,
          cr.amount,
          cr.payment_method,
          cr.notes,
          c.name as customer_name,
          c.phone as customer_phone
        FROM representatives d
        LEFT JOIN customer_receipts cr ON d.id = cr.delegate_id
        LEFT JOIN customers c ON cr.customer_id = c.id
        WHERE cr.id IS NOT NULL ${receiptsDateFilter}
        ORDER BY d.id, cr.receipt_date DESC
      `;

      const receiptsData = await db.query(receiptsQuery, params);

      // Group receipts by delegate
      const receiptsByDelegate = {};
      receiptsData.forEach(receipt => {
        if (!receiptsByDelegate[receipt.delegate_id]) {
          receiptsByDelegate[receipt.delegate_id] = [];
        }
        receiptsByDelegate[receipt.delegate_id].push(receipt);
      });

      // Group products by delegate
      const productsByDelegate = {};
      productsData.forEach(product => {
        if (!productsByDelegate[product.delegate_id]) {
          productsByDelegate[product.delegate_id] = [];
        }
        productsByDelegate[product.delegate_id].push(product);
      });

      // Combine summary data with products and receipts data
      const result = summaryData.map(delegate => ({
        ...delegate,
        products: productsByDelegate[delegate.id] || [],
        customer_receipts: receiptsByDelegate[delegate.id] || []
      }));

      return result;
    } catch (error) {
      logger.error('Error in getDelegatesReport:', error);
      throw error;
    }
  }

  async getCustomerReport(startDate, endDate, paymentStatus = null) {
    try {
      let dateFilter = startDate && endDate ? 'WHERE DATE(s.created_at) BETWEEN ? AND ?' : '';
      let params = startDate && endDate ? [startDate, endDate] : [];

      if (paymentStatus) {
        const paymentFilter = dateFilter ? 'AND' : 'WHERE';
        dateFilter += ` ${paymentFilter} s.payment_status = ?`;
        params.push(paymentStatus);
      }

      const query = `
        SELECT 
          c.id,
          c.name,
          c.phone,
          c.email,
          c.address,
          COUNT(DISTINCT s.id) as total_invoices,
          SUM(si.quantity * si.price) as total_spent,
          AVG(si.quantity * si.price) as avg_invoice_value,
          SUM(CASE WHEN s.payment_status = 'paid' THEN si.quantity * si.price ELSE 0 END) as paid_amount,
          SUM(CASE WHEN s.payment_status = 'partial' THEN si.quantity * si.price ELSE 0 END) as partial_amount,
          SUM(CASE WHEN s.payment_status = 'unpaid' THEN si.quantity * si.price ELSE 0 END) as unpaid_amount,
          MAX(s.created_at) as last_purchase_date,
          s.payment_status
        FROM customers c
        LEFT JOIN sales s ON c.id = s.customer_id
        LEFT JOIN sale_items si ON s.id = si.sale_id
        ${dateFilter}
        GROUP BY c.id, c.name, c.phone, c.email, c.address, s.payment_status
        ORDER BY total_spent DESC
      `;

      return await db.query(query, params);
    } catch (error) {
      logger.error('Error in getCustomerReport:', error);
      throw error;
    }
  }

  async getSupplierReport(startDate, endDate) {
    try {
      const dateFilter = startDate && endDate ? 'WHERE DATE(p.created_at) BETWEEN ? AND ?' : '';
      const params = startDate && endDate ? [startDate, endDate] : [];

      const query = `
        SELECT 
          s.id,
          s.name,
          s.phone,
          s.email,
          s.address,
          COUNT(DISTINCT p.id) as total_purchases,
          SUM(pi.quantity * pi.price) as total_spent,
          AVG(pi.quantity * pi.price) as avg_purchase_value,
          SUM(CASE WHEN p.payment_status = 'paid' THEN pi.quantity * pi.price ELSE 0 END) as paid_amount,
          SUM(CASE WHEN p.payment_status = 'partial' THEN pi.quantity * pi.price ELSE 0 END) as partial_amount,
          SUM(CASE WHEN p.payment_status = 'unpaid' THEN pi.quantity * pi.price ELSE 0 END) as unpaid_amount,
          MAX(p.created_at) as last_purchase_date
        FROM suppliers s
        LEFT JOIN purchases p ON s.id = p.supplier_id
        LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
        ${dateFilter}
        GROUP BY s.id, s.name, s.phone, s.email, s.address
        ORDER BY total_spent DESC
      `;

      return await db.query(query, params);
    } catch (error) {
      logger.error('Error in getSupplierReport:', error);
      throw error;
    }
  }

  async getSalesReport(startDate, endDate, productId = null, customerId = null) {
    try {
      let dateFilter = startDate && endDate ? 'WHERE DATE(s.created_at) BETWEEN ? AND ?' : '';
      let params = startDate && endDate ? [startDate, endDate] : [];

      if (productId) {
        const productFilter = dateFilter ? 'AND' : 'WHERE';
        dateFilter += ` ${productFilter} si.product_id = ?`;
        params.push(productId);
      }

      if (customerId) {
        const customerFilter = dateFilter ? 'AND' : 'WHERE';
        dateFilter += ` ${customerFilter} s.customer_id = ?`;
        params.push(customerId);
      }

      const query = `
        SELECT 
          s.id,
          s.invoice_no,
          s.created_at,
          c.name as customer_name,
          d.name as delegate_name,
          p.name as product_name,
          p.sku as product_code,
          si.quantity,
          si.price,
          (si.quantity * si.price) as total_amount,
          s.payment_status,
          s.status
        FROM sales s
        JOIN sale_items si ON s.id = si.sale_id
        JOIN products p ON si.product_id = p.id
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN representatives d ON s.delegate_id = d.id
        ${dateFilter}
        ORDER BY s.created_at DESC
      `;

      return await db.query(query, params);
    } catch (error) {
      logger.error('Error in getSalesReport:', error);
      throw error;
    }
  }

  async getSpecificProductReport(productId, startDate, endDate) {
    try {
      const dateFilter = startDate && endDate ? 'AND DATE(s.created_at) BETWEEN ? AND ?' : '';
      const params = [productId];
      if (startDate && endDate) {
        params.push(startDate, endDate);
      }

      const query = `
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.description,
          c.name as category_name,
          COUNT(DISTINCT s.id) as total_sales,
          SUM(si.quantity) as total_quantity_sold,
          SUM(si.quantity * si.price) as total_revenue,
          AVG(si.price) as avg_sale_price,
          MIN(si.price) as min_sale_price,
          MAX(si.price) as max_sale_price,
          COUNT(DISTINCT s.customer_id) as unique_customers,
          MAX(s.created_at) as last_sale_date
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN sale_items si ON p.id = si.product_id
        LEFT JOIN sales s ON si.sale_id = s.id
        WHERE p.id = ? ${dateFilter}
        GROUP BY p.id, p.name, p.sku, p.description, c.name
      `;

      return await db.query(query, params);
    } catch (error) {
      logger.error('Error in getSpecificProductReport:', error);
      throw error;
    }
  }

  async getCompanyReport(companyId, startDate, endDate) {
    try {
      const dateFilter = startDate && endDate ? 'AND DATE(s.created_at) BETWEEN ? AND ?' : '';
      const params = [companyId];
      if (startDate && endDate) {
        params.push(startDate, endDate);
      }

      const query = `
        SELECT 
          c.id,
          c.name,
          c.phone,
          c.email,
          c.address,
          COUNT(DISTINCT s.id) as total_invoices,
          SUM(si.quantity * si.price) as total_spent,
          AVG(si.quantity * si.price) as avg_invoice_value,
          SUM(CASE WHEN s.payment_status = 'paid' THEN si.quantity * si.price ELSE 0 END) as paid_amount,
          SUM(CASE WHEN s.payment_status = 'partial' THEN si.quantity * si.price ELSE 0 END) as partial_amount,
          SUM(CASE WHEN s.payment_status = 'unpaid' THEN si.quantity * si.price ELSE 0 END) as unpaid_amount,
          MAX(s.created_at) as last_purchase_date
        FROM customers c
        LEFT JOIN sales s ON c.id = s.customer_id
        LEFT JOIN sale_items si ON s.id = si.sale_id
        WHERE c.id = ? ${dateFilter}
        GROUP BY c.id, c.name, c.phone, c.email, c.address
      `;

      return await db.query(query, params);
    } catch (error) {
      logger.error('Error in getCompanyReport:', error);
      throw error;
    }
  }

  async getStockReport(startDate, endDate, categoryId = null) {
    try {
      const dateFilter = startDate && endDate ? 'WHERE DATE(sm.created_at) BETWEEN ? AND ?' : '';
      const params = startDate && endDate ? [startDate, endDate] : [];

      if (categoryId) {
        const categoryFilter = dateFilter ? 'AND' : 'WHERE';
        dateFilter += ` ${categoryFilter} p.category_id = ?`;
        params.push(categoryId);
      }

      const query = `
        SELECT 
          p.id,
          p.name,
          p.sku,
          c.name as category_name,
          p.current_stock,
          5 as min_stock_level,
          p.purchase_price as cost_price,
          p.selling_price as sale_price,
          (p.current_stock * p.purchase_price) as stock_value,
          COUNT(sm.id) as movement_count,
          SUM(CASE WHEN sm.movement_type = 'purchase' THEN sm.quantity ELSE 0 END) as total_in,
          SUM(CASE WHEN sm.movement_type = 'sale' THEN sm.quantity ELSE 0 END) as total_out,
          MAX(sm.created_at) as last_movement_date
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN stock_movements sm ON p.id = sm.product_id
        ${dateFilter}
        GROUP BY p.id, p.name, p.sku, c.name, p.current_stock, p.purchase_price, p.selling_price
        ORDER BY stock_value DESC
      `;

      return await db.query(query, params);
    } catch (error) {
      logger.error('Error in getStockReport:', error);
      throw error;
    }
  }

  async getDebtsReport(startDate, endDate, debtType = 'all') {
    try {
      const dateFilter = startDate && endDate ? 'WHERE DATE(s.created_at) BETWEEN ? AND ?' : '';
      const params = startDate && endDate ? [startDate, endDate] : [];

      let debtFilter = '';
      if (debtType === 'customers') {
        debtFilter = dateFilter ? 'AND' : 'WHERE';
        debtFilter += ` s.payment_status IN ('unpaid', 'partial')`;
      } else if (debtType === 'suppliers') {
        debtFilter = dateFilter ? 'AND' : 'WHERE';
        debtFilter += ` p.payment_status IN ('unpaid', 'partial')`;
      }

      const customerDebtsQuery = `
        SELECT 
          'customer' as debt_type,
          c.id,
          c.name,
          c.phone,
          SUM(si.quantity * si.price) as total_debt,
          SUM(CASE WHEN s.payment_status = 'partial' THEN si.quantity * si.price ELSE 0 END) as partial_amount,
          SUM(CASE WHEN s.payment_status = 'unpaid' THEN si.quantity * si.price ELSE 0 END) as unpaid_amount,
          COUNT(DISTINCT s.id) as invoice_count,
          MAX(s.created_at) as last_invoice_date
        FROM customers c
        JOIN sales s ON c.id = s.customer_id
        JOIN sale_items si ON s.id = si.sale_id
        ${dateFilter} ${debtFilter}
        GROUP BY c.id, c.name, c.phone
        HAVING total_debt > 0
        ORDER BY total_debt DESC
      `;

      const supplierDebtsQuery = `
        SELECT 
          'supplier' as debt_type,
          s.id,
          s.name,
          s.phone,
          SUM(pi.quantity * pi.price) as total_debt,
          SUM(CASE WHEN p.payment_status = 'partial' THEN pi.quantity * pi.price ELSE 0 END) as partial_amount,
          SUM(CASE WHEN p.payment_status = 'unpaid' THEN pi.quantity * pi.price ELSE 0 END) as unpaid_amount,
          COUNT(DISTINCT p.id) as purchase_count,
          MAX(p.created_at) as last_purchase_date
        FROM suppliers s
        JOIN purchases p ON s.id = p.supplier_id
        JOIN purchase_items pi ON p.id = pi.purchase_id
        ${dateFilter} ${debtFilter}
        GROUP BY s.id, s.name, s.phone
        HAVING total_debt > 0
        ORDER BY total_debt DESC
      `;

      const customerDebts = await db.query(customerDebtsQuery, params);
      const supplierDebts = await db.query(supplierDebtsQuery, params);

      return {
        customer_debts: customerDebts,
        supplier_debts: supplierDebts
      };
    } catch (error) {
      logger.error('Error in getDebtsReport:', error);
      throw error;
    }
  }

  async getMoneyBoxReport(startDate, endDate, boxId = null) {
    try {
      const dateFilter = startDate && endDate ? 'WHERE DATE(mt.created_at) BETWEEN ? AND ?' : '';
      const params = startDate && endDate ? [startDate, endDate] : [];

      if (boxId) {
        const boxFilter = dateFilter ? 'AND' : 'WHERE';
        dateFilter += ` ${boxFilter} mt.box_id = ?`;
        params.push(boxId);
      }

      const query = `
        SELECT 
          mb.id,
          mb.name,
          mb.notes as description,
          mb.amount as initial_balance,
          SUM(CASE WHEN mt.type = 'deposit' THEN mt.amount ELSE 0 END) as total_deposits,
          SUM(CASE WHEN mt.type = 'withdraw' THEN mt.amount ELSE 0 END) as total_withdrawals,
          (mb.amount + SUM(CASE WHEN mt.type = 'deposit' THEN mt.amount ELSE 0 END) - SUM(CASE WHEN mt.type = 'withdraw' THEN mt.amount ELSE 0 END)) as current_balance,
          COUNT(mt.id) as transaction_count,
          MAX(mt.created_at) as last_transaction_date
        FROM money_boxes mb
        LEFT JOIN money_box_transactions mt ON mb.id = mt.box_id
        ${dateFilter}
        GROUP BY mb.id, mb.name, mb.notes, mb.amount
        ORDER BY current_balance DESC
      `;

      return await db.query(query, params);
    } catch (error) {
      logger.error('Error in getMoneyBoxReport:', error);
      throw error;
    }
  }

  async getExpensesReport(startDate, endDate, categoryId = null) {
    try {
      const dateFilter = startDate && endDate ? 'WHERE DATE(e.created_at) BETWEEN ? AND ?' : '';
      const params = startDate && endDate ? [startDate, endDate] : [];

      if (categoryId) {
        const categoryFilter = dateFilter ? 'AND' : 'WHERE';
        dateFilter += ` ${categoryFilter} e.category_id = ?`;
        params.push(categoryId);
      }

      const query = `
        SELECT 
          e.id,
          e.description,
          e.amount,
          e.date,
          e.category as category_name,
          e.created_at
        FROM expenses e
        ${dateFilter}
        ORDER BY e.date DESC
      `;

      return await db.query(query, params);
    } catch (error) {
      logger.error('Error in getExpensesReport:', error);
      throw error;
    }
  }

  async getCustomerDebtsDetailedReport(startDate, endDate, debtStatus = 'all') {
    try {
      const dateFilter = startDate && endDate ? 'WHERE DATE(s.created_at) BETWEEN ? AND ?' : '';
      const params = startDate && endDate ? [startDate, endDate] : [];

      let statusFilter = '';
      if (debtStatus === 'paid') {
        statusFilter = dateFilter ? 'AND' : 'WHERE';
        statusFilter += ` s.payment_status = 'paid'`;
      } else if (debtStatus === 'due') {
        statusFilter = dateFilter ? 'AND' : 'WHERE';
        statusFilter += ` s.payment_status = 'unpaid' AND s.invoice_date <= CURDATE()`;
      } else if (debtStatus === 'partial') {
        statusFilter = dateFilter ? 'AND' : 'WHERE';
        statusFilter += ` s.payment_status = 'partial'`;
      } else if (debtStatus === 'unpaid') {
        statusFilter = dateFilter ? 'AND' : 'WHERE';
        statusFilter += ` s.payment_status = 'unpaid'`;
      }

      const query = `
        SELECT 
          s.id,
          s.invoice_no,
          s.created_at,
          s.invoice_date as due_date,
          c.name as customer_name,
          c.phone as customer_phone,
          s.total_amount,
          s.paid_amount,
          (s.total_amount - s.paid_amount) as remaining_amount,
          s.payment_status,
          DATEDIFF(CURDATE(), s.invoice_date) as days_overdue
        FROM sales s
        JOIN customers c ON s.customer_id = c.id
        ${dateFilter} ${statusFilter}
        ORDER BY s.created_at DESC
      `;

      return await db.query(query, params);
    } catch (error) {
      logger.error('Error in getCustomerDebtsDetailedReport:', error);
      throw error;
    }
  }
}

module.exports = new ReportsService();