use sqlx::{sqlite::{SqlitePool, SqlitePoolOptions}, Row};
use std::path::PathBuf;
use tracing::{info, error, warn};
use anyhow::Result;
use bcrypt::{hash, verify, DEFAULT_COST};

#[derive(Clone)]
pub struct Database {
    pub pool: SqlitePool,
}

impl Database {
    pub async fn new() -> Result<Self> {
        // Use DATABASE_URL environment variable if set, otherwise use default path
        let database_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| {
                let db_path = Self::get_db_path().expect("Failed to get default database path");
                format!("sqlite:{}", db_path.display())
            });
        
        // Expand ~ in the database URL if present
        let database_url = if database_url.contains("~") {
            let home_dir = dirs::home_dir().ok_or_else(|| {
                anyhow::anyhow!("Could not determine home directory")
            })?;
            database_url.replace("~", &home_dir.to_string_lossy())
        } else {
            database_url
        };
        
        let db_path = if database_url.starts_with("sqlite:") {
            let path_str = database_url.strip_prefix("sqlite:").unwrap();
            if path_str == ":memory:" {
                // For in-memory database, we don't need a file path
                None
            } else {
                Some(std::path::PathBuf::from(path_str))
            }
        } else {
            Some(Self::get_db_path()?)
        };
        
        if let Some(ref path) = db_path {
            info!("Connecting to database at: {}", path.display());
            
            // Create database file if it doesn't exist
            if !path.exists() {
                info!("Database file does not exist, creating it...");
                // Create the parent directory if it doesn't exist
                if let Some(parent) = path.parent() {
                    std::fs::create_dir_all(parent)?;
                }
                // Create an empty SQLite database file by connecting with create_if_missing
                let _ = SqlitePoolOptions::new()
                    .max_connections(1)
                    .connect(&format!("{}?mode=rwc", database_url))
                    .await?;
                info!("Database file created successfully");
            }
        } else {
            info!("Using in-memory database");
        }
        
        info!("Connecting to database pool...");
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .acquire_timeout(std::time::Duration::from_secs(30))
            .connect(&database_url)
            .await?;
        info!("Database pool connected successfully");

        // Apply SQLite optimizations (matching Node.js database.js)
        sqlx::query("PRAGMA journal_mode = WAL").execute(&pool).await?;
        sqlx::query("PRAGMA synchronous = NORMAL").execute(&pool).await?;
        sqlx::query("PRAGMA cache_size = 10000").execute(&pool).await?;
        sqlx::query("PRAGMA temp_store = MEMORY").execute(&pool).await?;
        sqlx::query("PRAGMA mmap_size = 268435456").execute(&pool).await?;
        sqlx::query("PRAGMA foreign_keys = ON").execute(&pool).await?;

        let db = Database { pool };
        
        // Initialize database if needed
        info!("Checking if database needs initialization...");
        if db.needs_initialization().await? {
            info!("Database needs initialization, starting...");
            db.initialize_database().await?;
            info!("Database initialization completed successfully");
        } else {
            info!("Database already initialized");
        }

        Ok(db)
    }

    fn get_db_path() -> Result<PathBuf> {
        let home_dir = dirs::home_dir().ok_or_else(|| {
            anyhow::anyhow!("Could not determine home directory")
        })?;
        
        let app_data_dir = home_dir.join(".urcash");
        info!("Home directory: {}", home_dir.display());
        info!("App data directory: {}", app_data_dir.display());
        std::fs::create_dir_all(&app_data_dir)?;
        
        let db_path = app_data_dir.join("database.sqlite");
        info!("Database path: {}", db_path.display());
        Ok(db_path)
    }

    async fn needs_initialization(&self) -> Result<bool> {
        // Check if users table exists (matching Node.js logic)
        let result = sqlx::query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
        )
        .fetch_optional(&self.pool)
        .await?;

        if result.is_none() {
            info!("Users table does not exist, database needs initialization");
            return Ok(true);
        }

        // Check if cash_boxes table exists and has correct schema
        let cash_boxes_result = sqlx::query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='cash_boxes'"
        )
        .fetch_optional(&self.pool)
        .await?;

        if cash_boxes_result.is_none() {
            info!("Cash_boxes table does not exist, database needs initialization");
            return Ok(true);
        }

        // Check if cash_boxes table has correct column types
        let column_info = sqlx::query(
            "PRAGMA table_info(cash_boxes)"
        )
        .fetch_all(&self.pool)
        .await?;

        let mut has_correct_schema = false;
        for row in column_info {
            let column_name: String = row.get("name");
            let column_type: String = row.get("type");
            
            if column_name == "initial_amount" && column_type == "REAL" {
                has_correct_schema = true;
                break;
            }
        }

        if !has_correct_schema {
            info!("Cash_boxes table has incorrect schema (expected REAL for initial_amount), database needs reinitialization");
            return Ok(true);
        }

        info!("Database schema is correct, no initialization needed");
        Ok(false)
    }

    async fn drop_all_tables(&self) -> Result<()> {
        info!("Dropping all existing tables...");
        
        // Disable foreign key constraints temporarily
        sqlx::query("PRAGMA foreign_keys = OFF")
            .execute(&self.pool)
            .await?;
        
        // Get all table names
        let tables = sqlx::query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )
        .fetch_all(&self.pool)
        .await?;

        // Drop each table
        for row in tables {
            let table_name: String = row.get("name");
            info!("Dropping table: {}", table_name);
            sqlx::query(&format!("DROP TABLE IF EXISTS {}", table_name))
                .execute(&self.pool)
                .await?;
        }

        // Re-enable foreign key constraints
        sqlx::query("PRAGMA foreign_keys = ON")
            .execute(&self.pool)
            .await?;

        info!("All tables dropped successfully");
        Ok(())
    }

    async fn initialize_database(&self) -> Result<()> {
        info!("Initializing database with all tables...");
        
        // Create all tables (matching Node.js database.js structure)
        info!("Creating users table...");
        self.create_users_table().await?;
        info!("Creating permissions table...");
        self.create_permissions_table().await?;
        info!("Creating user_permissions table...");
        self.create_user_permissions_table().await?;
        info!("Creating role_permissions table...");
        self.create_role_permissions_table().await?;
        info!("Creating settings table...");
        self.create_settings_table().await?;
        info!("Creating representatives table...");
        self.create_representatives_table().await?;
        info!("Creating customers table...");
        self.create_customers_table().await?;
        info!("Creating employees table...");
        self.create_employees_table().await?;
        info!("Creating suppliers table...");
        self.create_suppliers_table().await?;
        info!("Creating supplier payment receipts table...");
        self.create_supplier_payment_receipts_table().await?;
        info!("Creating categories table...");
        self.create_categories_table().await?;
        info!("Creating stocks table...");
        self.create_stocks_table().await?;
        info!("Creating products table...");
        self.create_products_table().await?;
        info!("Creating stock_movements table...");
        self.create_stock_movements_table().await?;
        info!("Creating cash_boxes table...");
        self.create_cash_boxes_table().await?;
        info!("Creating money_boxes table...");
        self.create_money_boxes_table().await?;
        info!("Creating money_box_transactions table...");
        self.create_money_box_transactions_table().await?;
        info!("Creating cash_box_transactions table...");
        self.create_cash_box_transactions_table().await?;
        info!("Creating user_cash_box_settings table...");
        self.create_user_cash_box_settings_table().await?;
        info!("Creating cloud_backups table...");
        self.create_cloud_backups_table().await?;
        info!("Creating sales table...");
        self.create_sales_table().await?;
        info!("Creating sale_items table...");
        self.create_sale_items_table().await?;
        info!("Creating purchases table...");
        self.create_purchases_table().await?;
        info!("Creating purchase_items table...");
        self.create_purchase_items_table().await?;
        info!("Creating debts table...");
        self.create_debts_table().await?;
        info!("Creating installments table...");
        self.create_installments_table().await?;
        info!("Creating sale_returns table...");
        self.create_sale_returns_table().await?;
        info!("Creating sale_return_items table...");
        self.create_sale_return_items_table().await?;
        self.create_purchase_returns_table().await?;
        self.create_purchase_return_items_table().await?;
        self.create_customer_receipts_table().await?;
        self.create_supplier_payment_receipts_table().await?;
        self.create_inventory_movements_table().await?;

        self.create_product_suppliers_table().await?;
        self.create_purchase_history_table().await?;
        self.create_expenses_table().await?;
        self.create_reports_table().await?;
        self.create_schema_migrations_table().await?;
        self.create_licenses_table().await?;
        self.create_upload_schedules_table().await?;
        self.create_delegate_sales_table().await?;
        self.create_delegate_collections_table().await?;

        
        // Create indexes for better performance
        self.create_indexes().await?;
        
        // Create triggers
        self.create_triggers().await?;
        
        // Insert default data
        self.insert_default_data().await?;
        
        info!("Database initialization completed successfully");
        Ok(())
    }

    async fn create_users_table(&self) -> Result<()> {
        sqlx::query(
            r#"
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
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn create_permissions_table(&self) -> Result<()> {
        sqlx::query(
            r#"
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
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn create_user_permissions_table(&self) -> Result<()> {
        sqlx::query(
            r#"
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
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn create_role_permissions_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS role_permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT NOT NULL,
                permission_id TEXT NOT NULL,
                is_default INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(role, permission_id)
            )
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn create_settings_table(&self) -> Result<()> {
        sqlx::query(
            r#"
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
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn create_representatives_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS representatives (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT,
                email TEXT COLLATE NOCASE,
                address TEXT,
                customer_id INTEGER,
                commission_rate REAL DEFAULT 0,
                commission_type TEXT CHECK(commission_type IN ('percentage', 'fixed')) DEFAULT 'percentage',
                commission_amount REAL DEFAULT 0,
                sales_target REAL DEFAULT 0,
                is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn create_customers_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE COLLATE NOCASE,
                phone TEXT,
                address TEXT,
                credit_limit REAL DEFAULT 1000000 CHECK(credit_limit >= 0),
                current_balance REAL DEFAULT 0,
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
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn create_employees_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT,
                email TEXT COLLATE NOCASE,
                address TEXT,
                salary REAL DEFAULT 0,
                commission_rate REAL DEFAULT 0,
                commission_type TEXT CHECK(commission_type IN ('percentage', 'fixed')) DEFAULT 'percentage',
                commission_amount REAL DEFAULT 0,
                commission_start_date DATE,
                commission_end_date DATE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn create_suppliers_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS suppliers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                contact_person TEXT NOT NULL,
                phone TEXT,
                email TEXT COLLATE NOCASE,
                address TEXT,
                tax_number TEXT,
                notes TEXT,
                is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn create_supplier_payment_receipts_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS supplier_payment_receipts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                receipt_number TEXT NOT NULL UNIQUE,
                supplier_id INTEGER NOT NULL,
                purchase_id INTEGER,
                receipt_date DATE NOT NULL,
                amount REAL NOT NULL CHECK(amount > 0),
                payment_method TEXT NOT NULL,
                reference_number TEXT,
                notes TEXT,
                money_box_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
                FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL
            )
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn create_categories_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn create_stocks_table(&self) -> Result<()> {
        sqlx::query(
            r#"
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
                capacity INTEGER DEFAULT 0 CHECK(capacity >= 0),
                current_capacity_used INTEGER DEFAULT 0 CHECK(current_capacity_used >= 0),
                notes TEXT,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
                CHECK(current_capacity_used <= capacity OR capacity = 0)
            )
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn create_products_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                scientific_name TEXT,
                description TEXT,
                supported BOOLEAN DEFAULT true,
                sku TEXT NOT NULL COLLATE NOCASE,
                barcode TEXT UNIQUE COLLATE NOCASE,
                purchase_price REAL NOT NULL CHECK(purchase_price >= 0),
                selling_price REAL NOT NULL CHECK(selling_price >= 0),
                wholesale_price REAL NOT NULL CHECK(wholesale_price >= 0),
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
                last_purchase_price REAL,
                average_cost REAL DEFAULT 0,
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
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // Continue with other table creation methods...
    // For brevity, I'll create the essential ones first

    async fn create_sales_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER,
                delegate_id INTEGER,
                invoice_no TEXT UNIQUE NOT NULL,
                invoice_date DATE NOT NULL,
                due_date DATE,
                total_amount REAL NOT NULL DEFAULT 0,
                discount_amount REAL DEFAULT 0,
                tax_amount REAL DEFAULT 0,
                net_amount REAL DEFAULT 0,
                paid_amount REAL DEFAULT 0,
                remaining_amount REAL DEFAULT 0,
                payment_method TEXT DEFAULT 'cash',
                payment_status TEXT DEFAULT 'unpaid',
                status TEXT DEFAULT 'completed',
                notes TEXT,
                barcode TEXT,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
                FOREIGN KEY (delegate_id) REFERENCES representatives(id) ON DELETE SET NULL,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn create_sale_items_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS sale_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sale_id INTEGER NOT NULL,
                product_id INTEGER,
                product_name TEXT,
                quantity INTEGER NOT NULL,
                returned_quantity INTEGER DEFAULT 0,
                price REAL NOT NULL,
                discount_percent REAL DEFAULT 0,
                tax_percent REAL DEFAULT 0,
                total REAL NOT NULL,
                line_total REAL NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
            )
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // Stock Movements table
    async fn create_stock_movements_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS stock_movements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                movement_type TEXT NOT NULL CHECK(movement_type IN ('transfer', 'adjustment', 'purchase', 'sale', 'return', 'damage', 'expiry')),
                from_stock_id INTEGER,
                to_stock_id INTEGER,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL CHECK(quantity > 0),
                unit_cost REAL,
                total_value REAL,
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
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // Cash Boxes table
    async fn create_cash_boxes_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS cash_boxes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                initial_amount REAL DEFAULT 0 CHECK(initial_amount >= 0),
                current_amount REAL DEFAULT 0,
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
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // Money Boxes table
    async fn create_money_boxes_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS money_boxes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                amount REAL NOT NULL,
                notes TEXT,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
            )
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // Money Box Transactions table
    async fn create_money_box_transactions_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS money_box_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                box_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                amount REAL NOT NULL,
                balance_after REAL,
                notes TEXT,
                related_box_id INTEGER,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (box_id) REFERENCES money_boxes(id) ON DELETE CASCADE,
                FOREIGN KEY (related_box_id) REFERENCES money_boxes(id),
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // Cash Box Transactions table
    async fn create_cash_box_transactions_table(&self) -> Result<()> {
        sqlx::query(
            r#"
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
                amount REAL NOT NULL CHECK(amount != 0),
                balance_before REAL NOT NULL,
                balance_after REAL NOT NULL,
                reference_type TEXT CHECK(reference_type IN (
                    'sale', 'purchase', 'expense', 'customer_receipt', 
                    'supplier_payment', 'manual', 'opening', 'closing', 
                    'sale_return', 'purchase_return', 'debt', 'installment'
                )) NOT NULL,
                reference_id INTEGER,
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
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // User Cash Box Settings table
    async fn create_user_cash_box_settings_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS user_cash_box_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE NOT NULL,
                default_opening_amount REAL DEFAULT 0,
                require_opening_amount INTEGER DEFAULT 1,
                require_closing_count INTEGER DEFAULT 1,
                allow_negative_balance INTEGER DEFAULT 0,
                max_withdrawal_amount REAL DEFAULT 0,
                require_approval_for_withdrawal INTEGER DEFAULT 0,
                auto_close_at_end_of_day INTEGER DEFAULT 0,
                auto_close_time TIME DEFAULT '23:59:59',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // Cloud Backups table
    async fn create_cloud_backups_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS cloud_backups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                backup_name TEXT NOT NULL,
                description TEXT,
                file_path TEXT NOT NULL,
                file_size INTEGER NOT NULL DEFAULT 0,
                backup_type TEXT NOT NULL DEFAULT 'manual' CHECK(backup_type IN ('manual', 'auto', 'system')),
                status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'uploading')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                uploaded_at DATETIME,
                remote_backup_id TEXT,
                checksum TEXT,
                compression_ratio REAL,
                encryption_key TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // Purchases table
    async fn create_purchases_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS purchases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                supplier_id INTEGER NOT NULL,
                invoice_no TEXT NOT NULL,
                invoice_date DATE NOT NULL,
                due_date DATE,
                total_amount REAL NOT NULL CHECK(total_amount >= 0),
                discount_amount REAL DEFAULT 0 CHECK(discount_amount >= 0),
                tax_amount REAL DEFAULT 0 CHECK(tax_amount >= 0),
                net_amount REAL NOT NULL CHECK(net_amount >= 0),
                paid_amount REAL DEFAULT 0 CHECK(paid_amount >= 0),
                remaining_amount REAL GENERATED ALWAYS AS (net_amount - paid_amount) STORED,
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
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // Purchase Items table
    async fn create_purchase_items_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS purchase_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                purchase_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                stock_id INTEGER,
                quantity INTEGER NOT NULL CHECK(quantity > 0),
                price REAL NOT NULL CHECK(price >= 0),
                discount_percent REAL DEFAULT 0 CHECK(discount_percent >= 0 AND discount_percent <= 100),
                tax_percent REAL DEFAULT 0 CHECK(tax_percent >= 0 AND tax_percent <= 100),
                total REAL NOT NULL CHECK(total >= 0),
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
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // Debts table
    async fn create_debts_table(&self) -> Result<()> {
        sqlx::query(
            r#"
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
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // Installments table
    async fn create_installments_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS installments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sale_id INTEGER NOT NULL,
                customer_id INTEGER,
                due_date DATE NOT NULL,
                amount REAL NOT NULL CHECK(amount > 0),
                paid_amount REAL DEFAULT 0 CHECK(paid_amount >= 0),
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
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // Sale Returns table
    async fn create_sale_returns_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS sale_returns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sale_id INTEGER NOT NULL,
                return_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                reason TEXT NOT NULL,
                status TEXT DEFAULT 'completed',
                refund_method TEXT DEFAULT 'cash',
                total_amount REAL NOT NULL DEFAULT 0,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // Sale Return Items table
    async fn create_sale_return_items_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS sale_return_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                return_id INTEGER NOT NULL,
                sale_item_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL CHECK(quantity > 0),
                price REAL NOT NULL,
                total REAL NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (return_id) REFERENCES sale_returns(id) ON DELETE CASCADE,
                FOREIGN KEY (sale_item_id) REFERENCES sale_items(id) ON DELETE CASCADE
            )
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // Purchase Returns table
    async fn create_purchase_returns_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS purchase_returns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                purchase_id INTEGER NOT NULL,
                return_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                reason TEXT NOT NULL,
                status TEXT CHECK(status IN ('completed', 'pending', 'cancelled')) DEFAULT 'completed',
                refund_method TEXT CHECK(refund_method IN ('cash', 'card', 'bank_transfer', 'check')) DEFAULT 'cash',
                total_amount REAL NOT NULL CHECK(total_amount >= 0),
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // Purchase Return Items table
    async fn create_purchase_return_items_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS purchase_return_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                return_id INTEGER NOT NULL,
                purchase_item_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL CHECK(quantity > 0),
                price REAL NOT NULL CHECK(price >= 0),
                total REAL NOT NULL CHECK(total >= 0),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (return_id) REFERENCES purchase_returns(id) ON DELETE CASCADE,
                FOREIGN KEY (purchase_item_id) REFERENCES purchase_items(id) ON DELETE CASCADE
            )
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // Customer Receipts table
    async fn create_customer_receipts_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS customer_receipts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                sale_id INTEGER,
                receipt_no TEXT UNIQUE NOT NULL,
                receipt_date DATE NOT NULL,
                amount REAL NOT NULL CHECK(amount > 0),
                payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'bank_transfer', 'check')) DEFAULT 'cash',
                reference_no TEXT,
                notes TEXT,
                created_by INTEGER,
                money_box_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
                FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (money_box_id) REFERENCES money_boxes(id) ON DELETE SET NULL
            )
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }



    // Inventory Movements table
    async fn create_inventory_movements_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS inventory_movements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                movement_type TEXT NOT NULL CHECK(movement_type IN ('in', 'out', 'adjustment', 'transfer')),
                quantity INTEGER NOT NULL,
                unit_cost DECIMAL(10,2),
                total_value DECIMAL(10,2),
                reference_type TEXT,
                reference_id INTEGER,
                notes TEXT,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // Product Suppliers table
    async fn create_product_suppliers_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS product_suppliers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                supplier_id INTEGER NOT NULL,
                supplier_product_code TEXT,
                supplier_price DECIMAL(10,2),
                lead_time INTEGER,
                is_preferred INTEGER DEFAULT 0 CHECK(is_preferred IN (0, 1)),
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
                UNIQUE(product_id, supplier_id)
            )
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // Purchase History table
    async fn create_purchase_history_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS purchase_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                supplier_id INTEGER NOT NULL,
                purchase_date DATE NOT NULL,
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(10,2) NOT NULL,
                total_price DECIMAL(10,2) NOT NULL,
                purchase_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
                FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL
            )
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // Expenses table
    async fn create_expenses_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                description TEXT NOT NULL,
                amount REAL NOT NULL CHECK(amount > 0),
                category TEXT NOT NULL,
                date DATE NOT NULL,
                money_box_id INTEGER,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // Reports table
    async fn create_reports_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                report_type TEXT NOT NULL,
                period_start DATE NOT NULL,
                period_end DATE NOT NULL,
                total_sales REAL DEFAULT 0,
                total_purchases REAL DEFAULT 0,
                total_expenses REAL DEFAULT 0,
                net_profit REAL DEFAULT 0,
                total_customers INTEGER DEFAULT 0,
                total_suppliers INTEGER DEFAULT 0,
                total_products INTEGER DEFAULT 0,
                low_stock_products INTEGER DEFAULT 0,
                out_of_stock_products INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // Schema Migrations table
    async fn create_schema_migrations_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                version TEXT UNIQUE NOT NULL,
                description TEXT,
                executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                execution_time_ms INTEGER,
                status TEXT DEFAULT 'success'
            )
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }
    async fn create_licenses_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS licenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                license_key TEXT UNIQUE NOT NULL,
                company_name TEXT NOT NULL,
                contact_email TEXT NOT NULL,
                contact_phone TEXT,
                max_users INTEGER NOT NULL DEFAULT 1,
                max_devices INTEGER NOT NULL DEFAULT 1,
                is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
                expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_check DATETIME,
                check_count INTEGER DEFAULT 0,
                features TEXT, -- JSON string of enabled features
                notes TEXT
            )
            "#
        )
        .execute(&self.pool)
        .await?;

        info!("Licenses table created successfully");
        Ok(())
    }
    async fn create_upload_schedules_table(&self) -> Result<()> { Ok(()) }


    async fn create_indexes(&self) -> Result<()> {
        info!("Creating database indexes...");
        
        let indexes = vec![
            "CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)",
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
            "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
            "CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)",
            "CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)",
            "CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)",
            "CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)",
            "CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type)",
            "CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active)",
            "CREATE INDEX IF NOT EXISTS idx_customers_balance ON customers(current_balance)",
            "CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at)",
            "CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)",
            "CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)",
            "CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)",
            "CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active)",
            "CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id)",
            "CREATE INDEX IF NOT EXISTS idx_sales_invoice_no ON sales(invoice_no)",
            "CREATE INDEX IF NOT EXISTS idx_sales_invoice_date ON sales(invoice_date)",
            "CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON sales(payment_status)",
            "CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status)",
            "CREATE INDEX IF NOT EXISTS idx_sales_created_by ON sales(created_by)",
            "CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at)",
        ];

        for index_sql in indexes {
            sqlx::query(index_sql).execute(&self.pool).await?;
        }

        info!("Database indexes created successfully");
        Ok(())
    }

    async fn create_triggers(&self) -> Result<()> {
        info!("Creating database triggers...");
        
        // Basic triggers for stock management
        let triggers = vec![
            // Trigger to update product stock when sale items are inserted
            r#"
            CREATE TRIGGER IF NOT EXISTS trigger_sale_item_insert
            AFTER INSERT ON sale_items
            WHEN NEW.product_id IS NOT NULL AND NEW.product_id > 0 AND NEW.product_id IN (SELECT id FROM products WHERE id > 0)
            BEGIN
                UPDATE products 
                SET current_stock = current_stock - NEW.quantity,
                    total_sold = total_sold + NEW.quantity,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = NEW.product_id;
            END
            "#,
        ];

        for trigger_sql in triggers {
            sqlx::query(trigger_sql).execute(&self.pool).await?;
        }

        info!("Database triggers created successfully");
        Ok(())
    }

    async fn insert_default_data(&self) -> Result<()> {
        info!("Inserting default data...");

        // Insert default admin user
        let existing_user = sqlx::query("SELECT * FROM users WHERE username = ?")
            .bind("admin")
            .fetch_optional(&self.pool)
            .await?;

        if existing_user.is_none() {
            let hashed_password = hash("admin123", DEFAULT_COST)?;
            
            sqlx::query(
                "INSERT INTO users (username, password, name, role, created_at, updated_at) VALUES (?, ?, ?, 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            )
            .bind("admin")
            .bind(hashed_password)
            .bind("Administrator")
            .execute(&self.pool)
            .await?;
            
            info!("✅ Default admin user created (username: admin, password: admin123)");
        } else {
            info!("ℹ️ Admin user already exists");
        }

        // Insert anonymous customer
        let existing_customer = sqlx::query("SELECT * FROM customers WHERE id = 999")
            .fetch_optional(&self.pool)
            .await?;

        if existing_customer.is_none() {
            sqlx::query(
                r#"
                INSERT INTO customers (
                    id, name, phone, email, address, credit_limit, current_balance, is_active, customer_type, created_at, updated_at
                ) VALUES (999, 'Anonymous', 'N/A', 'N/A', 'N/A', 1000000, 0, 1, 'retail', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                "#
            )
            .execute(&self.pool)
            .await?;
            
            info!("Anonymous customer created");
        }

        // Insert default money boxes
        let existing_money_boxes = sqlx::query("SELECT COUNT(*) as count FROM money_boxes")
            .fetch_one(&self.pool)
            .await?;

        if existing_money_boxes.get::<i64, _>("count") == 0 {
            let money_boxes = vec![
                ("الصندوق اليومي", "الصندوق اليومي للشركة"),
                ("القاصة", "القاصة للشركة"),
                ("الصيرفة", "الصيرفة للشركة"),
            ];

            for (name, notes) in money_boxes {
                sqlx::query(
                    "INSERT INTO money_boxes (name, amount, notes, created_by, created_at, updated_at) VALUES (?, 0, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
                )
                .bind(name)
                .bind(notes)
                .execute(&self.pool)
                .await?;
            }
            
            info!("Default money boxes created");
        }

        // Insert default settings
        let existing_settings = sqlx::query("SELECT COUNT(*) as count FROM settings WHERE id = 1")
            .fetch_one(&self.pool)
            .await?;

        if existing_settings.get::<i64, _>("count") == 0 {
            let default_menu_items = serde_json::json!([
                { "id": "dashboard", "name": "لوحة التحكم", "path": "/dashboard-charts", "icon": "LayoutDashboard", "enabled": true, "active": true },
                { "id": "pos", "name": "نقطة البيع", "path": "/pos", "icon": "ShoppingCart", "enabled": true, "active": true },
                { "id": "sales", "name": "المبيعات", "path": "/sales", "icon": "DollarSign", "enabled": true, "active": true },
                { "id": "purchases", "name": "المشتريات", "path": "/purchases", "icon": "Truck", "enabled": true, "active": true },
                { "id": "admin-cash-box", "name": "إدارة الصناديق", "path": "/admin-cash-box", "icon": "Settings", "enabled": true, "active": true, "adminOnly": true },
                { "id": "inventory", "name": "المنتجات", "path": "/inventory", "icon": "Package", "enabled": true, "active": true },
                { "id": "bills", "name": "الفواتير", "path": "/bills", "icon": "ClipboardList", "enabled": true, "active": true },
                { "id": "stocks", "name": "المخازن", "path": "/stocks", "icon": "Warehouse", "enabled": true, "active": true },
                { "id": "customers", "name": "العملاء", "path": "/customers", "icon": "Users", "enabled": true, "active": true },
                { "id": "suppliers", "name": "الموردين", "path": "/suppliers", "icon": "Store", "enabled": true, "active": true },
                { "id": "customer-receipts", "name": "سند قبض", "path": "/customer-receipts", "icon": "Receipt", "enabled": true, "active": true },
                { "id": "supplier-payment-receipts", "name": "سند صرف", "path": "/supplier-payment-receipts", "icon": "CreditCard", "enabled": true, "active": true },
                { "id": "expenses", "name": "المصروفات", "path": "/expenses", "icon": "ReceiptText", "enabled": true, "active": true },
                { "id": "reports", "name": "التقارير", "path": "/reports", "icon": "BarChart", "enabled": true, "active": true },
                { "id": "debts", "name": "الديون", "path": "/debts", "icon": "FileText", "enabled": true, "active": true },
                { "id": "installments", "name": "الأقساط", "path": "/installments", "icon": "CreditCard", "enabled": true, "active": true },
                { "id": "settings", "name": "الإعدادات", "path": "/settings", "icon": "Settings", "enabled": true, "active": true }
            ]);

            sqlx::query(
                r#"
                INSERT INTO settings (
                    id, company_name, currency, primary_color, secondary_color, 
                    bill_footer_text, sidebar_menu_items, created_at, updated_at
                ) VALUES (1, 'شركتي', 'IQD', '#2c2b2b', '#ededed', 'شكراً لزيارتكم', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                "#
            )
            .bind(default_menu_items.to_string())
            .execute(&self.pool)
            .await?;
            
            info!("Default settings created");
        }

        // Insert simplified default permissions
        let existing_permissions = sqlx::query("SELECT COUNT(*) as count FROM permissions")
            .fetch_one(&self.pool)
            .await?;

        if existing_permissions.get::<i64, _>("count") == 0 {
            let default_permissions = vec![
                ("dashboard.view", "عرض لوحة التحكم", "عرض لوحة التحكم", "dashboard"),
                ("pos.manage", "إدارة نقطة البيع", "عرض وإدارة نقطة البيع", "pos"),
                ("pos.view", "عرض نقطة البيع", "عرض نقطة البيع", "pos"),
                ("pos.add", "إضافة نقطة البيع", "إضافة نقطة البيع", "pos"),
                ("pos.edit", "تعديل نقطة البيع", "تعديل نقطة البيع", "pos"),
                ("pos.delete", "حذف نقطة البيع", "حذف نقطة البيع", "pos"),
                ("products.manage", "إدارة المنتجات", "عرض وإضافة وتعديل وحذف المنتجات", "products"),
                ("products.view", "عرض المنتجات", "عرض المنتجات", "products"),
                ("products.add", "إضافة المنتجات", "إضافة المنتجات", "products"),
                ("products.edit", "تعديل المنتجات", "تعديل المنتجات", "products"),
                ("products.delete", "حذف المنتجات", "حذف المنتجات", "products"),
                ("sales.manage", "إدارة المبيعات", "عرض وإنشاء وتعديل وحذف الفواتير والمرتجعات", "sales"),
                ("sales.view", "عرض المبيعات", "عرض المبيعات", "sales"),
                ("sales.add", "إضافة المبيعات", "إضافة المبيعات", "sales"),
                ("sales.edit", "تعديل المبيعات", "تعديل المبيعات", "sales"),
                ("sales.delete", "حذف المبيعات", "حذف المبيعات", "sales"),
                ("customers.manage", "إدارة العملاء", "عرض وإضافة وتعديل وحذف العملاء", "customers"),
                ("customers.view", "عرض العملاء", "عرض العملاء", "customers"),
                ("customers.add", "إضافة العملاء", "إضافة العملاء", "customers"),
                ("customers.edit", "تعديل العملاء", "تعديل العملاء", "customers"),
                ("customers.delete", "حذف العملاء", "حذف العملاء", "customers"),
                ("purchases.manage", "إدارة المشتريات", "عرض وإنشاء وتعديل وحذف المشتريات", "purchases"),
                ("purchases.view", "عرض المشتريات", "عرض المشتريات", "purchases"),
                ("purchases.add", "إضافة المشتريات", "إضافة المشتريات", "purchases"),
                ("purchases.edit", "تعديل المشتريات", "تعديل المشتريات", "purchases"),
                ("purchases.delete", "حذف المشتريات", "حذف المشتريات", "purchases"),
                ("suppliers.manage", "إدارة الموردين", "عرض وإضافة وتعديل وحذف الموردين", "suppliers"),
                ("suppliers.view", "عرض الموردين", "عرض الموردين", "suppliers"),
                ("suppliers.add", "إضافة الموردين", "إضافة الموردين", "suppliers"),
                ("suppliers.edit", "تعديل الموردين", "تعديل الموردين", "suppliers"),
                ("suppliers.delete", "حذف الموردين", "حذف الموردين", "suppliers"),
                ("inventory.manage", "إدارة المخزون", "عرض وتحريك المخزون", "inventory"),
                ("inventory.view", "عرض المخزون", "عرض المخزون", "inventory"),
                ("inventory.add", "إضافة المخزون", "إضافة المخزون", "inventory"),
                ("inventory.edit", "تعديل المخزون", "تعديل المخزون", "inventory"),
                ("inventory.delete", "حذف المخزون", "حذف المخزون", "inventory"),
                ("cashbox.manage", "إدارة الصندوق", "عرض وإدارة العمليات المالية بالصندوق", "cashbox"),
                ("cashbox.view", "عرض الصندوق", "عرض الصندوق", "cashbox"),
                ("cashbox.add", "إضافة الصندوق", "إضافة الصندوق", "cashbox"),
                ("cashbox.edit", "تعديل الصندوق", "تعديل الصندوق", "cashbox"),
                ("cashbox.delete", "حذف الصندوق", "حذف الصندوق", "cashbox"),
                ("debts.manage", "إدارة الديون", "عرض وتسوية الديون والمدفوعات", "debts"),
                ("debts.view", "عرض الديون", "عرض الديون", "debts"),
                ("debts.add", "إضافة الديون", "إضافة الديون", "debts"),
                ("debts.edit", "تعديل الديون", "تعديل الديون", "debts"),
                ("debts.delete", "حذف الديون", "حذف الديون", "debts"),
                ("installments.manage", "إدارة الأقساط", "عرض وتسوية الأقساط والمدفوعات", "installments"),
                ("installments.view", "عرض الأقساط", "عرض الأقساط", "installments"),
                ("installments.add", "إضافة الأقساط", "إضافة الأقساط", "installments"),
                ("installments.edit", "تعديل الأقساط", "تعديل الأقساط", "installments"),
                ("installments.delete", "حذف الأقساط", "حذف الأقساط", "installments"),
                ("reports.view", "عرض التقارير", "عرض كل أنواع التقارير", "reports"),
                ("reports.add", "إضافة التقارير", "إضافة التقارير", "reports"),
                ("reports.edit", "تعديل التقارير", "تعديل التقارير", "reports"),
                ("reports.delete", "حذف التقارير", "حذف التقارير", "reports"),
                ("settings.manage", "إعدادات النظام", "عرض وتعديل إعدادات النظام", "settings"),
                ("users.permissions", "إدارة صلاحيات المستخدمين", "إدارة صلاحيات المستخدمين", "users"),
                ("backup.manage", "النسخ الاحتياطي", "إنشاء واستعادة النسخ الاحتياطية", "backup"),
                ("profile.manage", "إدارة الملف الشخصي", "عرض وتعديل بيانات المستخدم", "profile"),
                ("expenses.manage", "إدارة المصروفات", "عرض وإضافة وتعديل وحذف المصروفات", "expenses"),
                ("expenses.view", "عرض المصروفات", "عرض المصروفات", "expenses"),
                ("expenses.add", "إضافة المصروفات", "إضافة المصروفات", "expenses"),
                ("expenses.edit", "تعديل المصروفات", "تعديل المصروفات", "expenses"),
                ("expenses.delete", "حذف المصروفات", "حذف المصروفات", "expenses")
            ];

            for (permission_id, name, description, category) in &default_permissions {
                sqlx::query(
                    "INSERT OR IGNORE INTO permissions (permission_id, name, description, category) VALUES (?, ?, ?, ?)"
                )
                .bind(permission_id)
                .bind(name)
                .bind(description)
                .bind(category)
                .execute(&self.pool)
                .await?;
            }

            // Roles permissions - Only admin gets permissions by default
            for (permission_id, _, _, _) in &default_permissions {
                sqlx::query(
                    "INSERT OR IGNORE INTO role_permissions (role, permission_id) VALUES ('admin', ?)"
                )
                .bind(permission_id)
                .execute(&self.pool)
                .await?;
            }

            // Grant all permissions to the default admin user
            let admin_user = sqlx::query("SELECT id FROM users WHERE username = ?")
                .bind("admin")
                .fetch_optional(&self.pool)
                .await?;

            if let Some(admin_user) = admin_user {
                let admin_id: i64 = admin_user.get("id");
                let mut permission_count = 0;
                for (permission_id, _, _, _) in &default_permissions {
                    sqlx::query(
                        "INSERT OR REPLACE INTO user_permissions (user_id, permission_id, granted_by, is_active, granted_at) VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)"
                    )
                    .bind(admin_id)
                    .bind(permission_id)
                    .bind(admin_id)
                    .execute(&self.pool)
                    .await?;
                    permission_count += 1;
                }
                info!("✅ Admin user (ID: {}) granted {} permissions successfully", admin_id, permission_count);
            } else {
                warn!("⚠️ Admin user not found - permissions not granted to admin user");
            }

            info!("Simplified default permissions and role assignments inserted");
            info!("Note: Only admin role gets permissions by default. User and manager roles get NO permissions.");
        }

        // Insert default main stock
        let existing_stock = sqlx::query("SELECT COUNT(*) as count FROM stocks WHERE is_main_stock = 1")
            .fetch_one(&self.pool)
            .await?;

        if existing_stock.get::<i64, _>("count") == 0 {
            sqlx::query(
                r#"
                INSERT INTO stocks (
                    name, code, description, address, city, state, country,
                    phone, email, manager_name, manager_phone, manager_email,
                    is_main_stock, is_active, capacity, current_capacity_used,
                    notes, created_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                "#
            )
            .bind("المخزن الرئيسي")
            .bind("MAIN-STOCK-001")
            .bind("المخزن الرئيسي للشركة")
            .bind("بغداد، العراق")
            .bind("بغداد")
            .bind("بغداد")
            .bind("Iraq")
            .bind("+964 770 123 4567")
            .bind("stock@company.com")
            .bind("مدير المخزن")
            .bind("+964 770 123 4568")
            .bind("manager@company.com")
            .bind(1)
            .bind(1)
            .bind(10000.00)
            .bind(0.00)
            .bind("المخزن الرئيسي للشركة - يحتوي على جميع المنتجات")
            .bind(1)
            .execute(&self.pool)
            .await?;
            
            info!("Default main stock created");
        }

        // Insert default migration data for existing migrations
        let existing_migrations = sqlx::query("SELECT COUNT(*) as count FROM schema_migrations")
            .fetch_one(&self.pool)
            .await?;

        if existing_migrations.get::<i64, _>("count") == 0 {
            let default_migrations = vec![
                ("001", "Add is_dolar column to products table", 150, "success"),
                ("002", "Add exchange_rate column to settings table", 120, "success"),
                ("003", "Allow negative stock in products table", 180, "success"),
                ("004", "Add stocks menu item to settings", 200, "success"),
                ("005", "Create stocks table", 300, "success"),
                ("006", "Create stock movements table", 250, "success"),
                ("007", "Add stock_id column to products table", 160, "success"),
                ("008", "Add bills menu item to settings", 140, "success"),
                ("009", "Add product_name column to sale_items table for manual items support", 220, "success"),
                ("010", "Add backup_time setting to settings table", 100, "success"),
                ("011", "Create pending_sync table for mobile live data", 180, "success"),
                ("012", "Add users.permissions permission", 150, "success"),
                ("013", "Add bill_type column to sales table", 140, "success"),
                ("014", "Add money_box_id column to purchases table", 120, "success"),
                ("015", "Add purchase_return transaction type to money_box_transactions table", 100, "success"),
                ("016", "Add money_box_id column to customer_receipts table", 130, "success"),
                ("018", "Add money_box_id column to supplier_payment_receipts table", 125, "success"),
                ("019", "Fix index issues - remove references to non-existent tables", 200, "success"),
                ("020", "Standardize money_box_id fields to INTEGER type", 500, "success"),
                ("021", "Add composite indexes for better query performance", 300, "success"),
                ("022", "Add sales duplicate prevention indexes", 150, "success"),
                ("023", "Add purchases duplicate prevention indexes", 140, "success")
            ];

            for (version, description, execution_time_ms, status) in default_migrations {
                sqlx::query(
                    "INSERT INTO schema_migrations (version, description, executed_at, execution_time_ms, status) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)"
                )
                .bind(version)
                .bind(description)
                .bind(execution_time_ms)
                .bind(status)
                .execute(&self.pool)
                .await?;
            }

            info!("Default migration data inserted successfully");
        }

        info!("Default data inserted successfully");
        Ok(())
    }

    pub fn get_pool(&self) -> &SqlitePool {
        &self.pool
    }

    pub async fn close(&self) -> Result<()> {
        self.pool.close().await;
        Ok(())
    }

    // Helper method to check if database is healthy
    pub async fn health_check(&self) -> Result<bool> {
        match sqlx::query("SELECT 1").fetch_one(&self.pool).await {
            Ok(_) => Ok(true),
            Err(e) => {
                error!("Database health check failed: {}", e);
                Ok(false)
            }
        }
    }

    // Database optimization (equivalent to Node.js optimize-database.js)
    pub async fn optimize(&self) -> Result<()> {
        info!("Starting database optimization...");
        
        // Run VACUUM to rebuild the database file
        sqlx::query("VACUUM").execute(&self.pool).await?;
        info!("✅ Database VACUUM completed");
        
        // Run ANALYZE to update query planner statistics
        sqlx::query("ANALYZE").execute(&self.pool).await?;
        info!("✅ Database ANALYZE completed");
        
        // Reindex all indexes
        sqlx::query("REINDEX").execute(&self.pool).await?;
        info!("✅ Database REINDEX completed");
        
        info!("Database optimization completed successfully");
        Ok(())
    }

    // Delegate sales table
    async fn create_delegate_sales_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS delegate_sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                delegate_id INTEGER NOT NULL,
                customer_id INTEGER NOT NULL,
                sale_id INTEGER NOT NULL,
                total_amount REAL NOT NULL,
                commission_rate REAL DEFAULT 0,
                commission_type TEXT CHECK(commission_type IN ('percentage', 'fixed')) DEFAULT 'percentage',
                commission_amount REAL DEFAULT 0,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (delegate_id) REFERENCES representatives(id) ON DELETE CASCADE,
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
                FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
            )
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // Delegate collections table
    async fn create_delegate_collections_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS delegate_collections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                delegate_id INTEGER NOT NULL,
                customer_id INTEGER NOT NULL,
                sale_id INTEGER,
                collection_amount REAL NOT NULL,
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
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // Delegate commissions table
    async fn create_delegate_commissions_table(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS delegate_commissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                delegate_id INTEGER NOT NULL,
                period_start DATE NOT NULL,
                period_end DATE NOT NULL,
                total_sales REAL DEFAULT 0,
                total_commission REAL DEFAULT 0,
                payment_amount REAL DEFAULT 0,
                payment_date DATE,
                payment_method TEXT CHECK(payment_method IN ('cash', 'bank_transfer', 'check')),
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (delegate_id) REFERENCES representatives(id) ON DELETE CASCADE
            )
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }
}

// Database transaction wrapper
pub struct Transaction<'a> {
    tx: sqlx::Transaction<'a, sqlx::Sqlite>,
}

impl<'a> Transaction<'a> {
    pub async fn new(pool: &'a SqlitePool) -> Result<Self> {
        let tx = pool.begin().await?;
        Ok(Transaction { tx })
    }

    pub async fn commit(self) -> Result<()> {
        self.tx.commit().await?;
        Ok(())
    }

    pub async fn rollback(self) -> Result<()> {
        self.tx.rollback().await?;
        Ok(())
    }

    pub fn get_transaction(&mut self) -> &mut sqlx::Transaction<'a, sqlx::Sqlite> {
        &mut self.tx
    }
}
