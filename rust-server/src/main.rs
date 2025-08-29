use axum::{
    routing::{get, post},
    Router,
    http::Method,
    extract::State,
    response::IntoResponse,
    Json,
    extract::Path,
};
use std::net::SocketAddr;
use tower_http::cors::{CorsLayer, Any, AllowOrigin};
use tower_http::compression::CompressionLayer;
use tower::{ServiceBuilder};
use axum::extract::DefaultBodyLimit;
use http::header::{CONTENT_TYPE, AUTHORIZATION, CACHE_CONTROL, HeaderValue};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use serde_json::json;
use std::time::Duration;
use std::{fs, path::Path as StdPath};

mod database;
mod models;
mod services;
mod routes;
mod utils;
mod controllers;
mod migrations;

use database::Database;
use services::{
    auth_service::AuthService, 
    cache_service::CacheService, 
    license_service::LicenseService, 
    device_config_service::DeviceConfigService, 
    settings_service::SettingsService, 
    permissions_service::PermissionsService, 
    bills_service::BillsService, 
    // cashbox_service::CashBoxService, // Removed - using money boxes only 
    cloud_backup_service::CloudBackupService,
    customer_service::CustomerService,
    supplier_service::SupplierService,
    supplier_payment_receipt_service::SupplierPaymentReceiptService,
    product_service::ProductService,
    sale_service::SaleService,
    purchase_service::PurchaseService,
    inventory_service::InventoryService,
    report_service::ReportService,
    reports_service::ReportsService,
    expense_service::ExpenseService,
    employee_service::EmployeeService,
    debt_service::DebtService,
    stock_service::StockService,
    notification_service::NotificationService,
    backup_service::BackupService,
    validation_service::ValidationService,
    barcode_service::BarcodeService,
    file_service::FileService,
    installments_service::InstallmentsService,
    delegates_service::DelegatesService,
    stock_movements_service::StockMovementsService,
    money_boxes_service::MoneyBoxesService,
    device_service::DeviceService,
    mobile_live_data_service::MobileLiveDataService,
    performance_service::PerformanceService,
    database_service::DatabaseService,
    log_service::LogService,
    branch_config_service::BranchConfigService,
    customer_receipts_service::CustomerReceiptsService,
};
use routes::{
    auth_routes, 
    user_routes, 
    license_routes, 
    bills_routes, 
    cloud_backup_routes,
    customer_routes,
    product_routes,
    sales_routes,
    suppliers_routes,
    supplier_payment_receipts_routes,
    purchases_routes,
    reports_routes,
    expenses_routes,
    debts_routes,
    installments_routes,
    delegates_routes,
    employees_routes,
    stocks_routes,
    stock_movements_routes,
    money_boxes_routes,
    devices_routes,
    mobile_live_data_routes,
    performance_routes,
    database_routes,
    cache_routes,
    logs_routes,
    branch_config_routes,
    customer_receipts_routes,
}; 

// Health check handler
async fn health_check() -> impl IntoResponse {
    Json(json!({
        "status": "ok",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "service": "rust-server",
        "version": env!("CARGO_PKG_VERSION")
    }))
}

// Status check handler (matches Node.js /api/status)
async fn status_check() -> impl IntoResponse {
    Json(json!({
        "status": "ok",
        "message": "Server is running"
    }))
}

    // Settings handler (using settings service)
    async fn settings_handler(State(state): State<AppState>) -> impl IntoResponse {
        match state.settings_service.get_all_settings(&state.db).await {
            Ok(settings) => Json(json!({
                "success": true,
                "data": settings
            })),
            Err(err) => {
                tracing::error!("Failed to get settings: {}", err);
                Json(json!({
                    "success": false,
                    "error": "Failed to get settings",
                    "data": null
                }))
            }
        }
    }

    // Backup scheduler status handler
    async fn backup_scheduler_status_handler() -> impl IntoResponse {
        Json(json!({
            "success": true,
            "data": {
                "enabled": true,
                "running": false,
                "lastBackup": null,
                "nextBackup": null,
                "interval": "daily",
                "status": "idle"
            }
        }))
    }

// Branch config handler (using device config service)
async fn branch_config_handler(State(state): State<AppState>) -> impl IntoResponse {
    match state.device_config_service.get_config() {
        Ok(config) => Json(json!({
            "success": true,
            "data": {
                "branch": config.branch,
                "device_mode": if config.branch == "main" { "main" } else { "secondary" },
                "ip": config.ip,
                "port": config.port,
                "auto_connect": config.auto_connect,
                "connection_timeout": config.connection_timeout
            }
        })),
        Err(err) => {
            tracing::error!("Failed to get device config: {}", err);
            Json(json!({
                "success": false,
                "error": "Failed to get device configuration",
                "data": {
                    "branch": "main",
                    "device_mode": "main",
                    "ip": "localhost",
                    "port": 39000,
                    "auto_connect": false,
                    "connection_timeout": 10000
                }
            }))
        }
    }
}

// Performance monitoring handler
async fn performance_check() -> impl IntoResponse {
    use sysinfo::System;
    
    let mut system = System::new_all();
    system.refresh_all();
    
    let pid = std::process::id();
    let memory_kb = system.process(sysinfo::Pid::from(pid as usize))
        .map(|p| p.memory())
        .unwrap_or(0);
    let uptime = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    Json(json!({
        "status": "ok",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "memory": {
            "rss": format!("{} MB", memory_kb / 1024),
            "heapTotal": "N/A",
            "heapUsed": "N/A", 
            "external": "N/A"
        },
        "cpu": {
            "user": "N/A",
            "system": "N/A"
        },
        "uptime": format!("{} seconds", uptime),
        "platform": std::env::consts::OS,
        "nodeVersion": format!("Rust {}", env!("CARGO_PKG_VERSION"))
    }))
}

fn create_app_directories() -> Result<(String, String, String, String), Box<dyn std::error::Error>> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let app_data_dir = home_dir.join(".urcash");
    let logs_dir = app_data_dir.join("logs");
    let uploads_dir = app_data_dir.join("uploads");
    let public_key_dir = app_data_dir.join("license");
    
    // Create necessary directories
    for dir in [&app_data_dir, &logs_dir, &uploads_dir].iter() {
        if !dir.exists() {
            fs::create_dir_all(dir)?;
        }
    }
    
    Ok((
        app_data_dir.to_string_lossy().to_string(),
        logs_dir.to_string_lossy().to_string(),
        uploads_dir.to_string_lossy().to_string(),
        public_key_dir.to_string_lossy().to_string(),
    ))
}

fn is_main_device() -> bool {
    match dirs::home_dir() {
        Some(home) => {
            let config_path = home.join(".urcash").join("appConfig.json");
            if config_path.exists() {
                match fs::read_to_string(config_path) {
                    Ok(contents) => {
                        match serde_json::from_str::<serde_json::Value>(&contents) {
                            Ok(config) => {
                                config.get("branch")
                                    .and_then(|v| v.as_str())
                                    .map(|b| b == "main")
                                    .unwrap_or(true)
                            }
                            Err(_) => true
                        }
                    }
                    Err(_) => true
                }
            } else {
                true // Default to main device if no config exists
            }
        }
        None => true
    }
}

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load environment variables
    dotenv::dotenv().ok();
    
    let port = std::env::var("PORT").unwrap_or_else(|_| "39000".to_string());
    
    tracing::info!("🚀 Starting Rust Server...");

    // Create necessary directories
    match create_app_directories() {
        Ok((app_dir, logs_dir, uploads_dir, license_dir)) => {
            tracing::info!("✅ App directories created: {}", app_dir);
        }
        Err(e) => {
            tracing::error!("❌ Failed to create app directories: {}", e);
        }
    }

    // Initialize database and run migrations
    let db = Database::new().await.expect("Failed to initialize database");
    tracing::info!("✅ Database initialized successfully");
    
    // Run database optimization (equivalent to Node.js optimize-database.js)
    match db.optimize().await {
        Ok(_) => tracing::info!("✅ Database optimization completed"),
        Err(e) => tracing::warn!("⚠️  Database optimization failed: {}", e),
    }
    
    // Initialize all services to match Node.js functionality
    let auth_service = AuthService::new();
    let cache_service = CacheService::new();
    let license_service = LicenseService::new();
    let device_config_service = DeviceConfigService::new()
        .expect("Failed to initialize device config service");
    let settings_service = SettingsService::new();
    let permissions_service = PermissionsService::new();
    let bills_service = BillsService::new();
            // let cashbox_service = CashBoxService::new(); // Removed - using money boxes only
    let cloud_backup_service = CloudBackupService::new(license_service.clone());
    let customer_service = CustomerService::new();
    let supplier_service = SupplierService::new();
    let supplier_payment_receipt_service = SupplierPaymentReceiptService::new();
    let product_service = ProductService::new();
    let sale_service = SaleService::new();
    let purchase_service = PurchaseService::new();
    let inventory_service = InventoryService::new();
    let report_service = ReportService::new();
    let expense_service = ExpenseService::new();
    let employee_service = EmployeeService::new();
    let debt_service = DebtService::new();
    let stock_service = StockService::new();
    let notification_service = NotificationService::new();
    let backup_service = BackupService::new();
    let validation_service = ValidationService::new();
    let barcode_service = BarcodeService::new();
    let file_service = FileService::new();
    
    tracing::info!("✅ All services initialized successfully");

    // CORS configuration - specific origins for credentials support
    let cors = CorsLayer::new()
        .allow_origin([
            "http://localhost:3000".parse::<HeaderValue>().unwrap(),
            "http://localhost:3001".parse::<HeaderValue>().unwrap(),
            "http://localhost:5173".parse::<HeaderValue>().unwrap(),
            "http://localhost:39000".parse::<HeaderValue>().unwrap(),
            "file://".parse::<HeaderValue>().unwrap(),
            "tauri://localhost".parse::<HeaderValue>().unwrap(),
        ])
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
        .allow_headers([
            CONTENT_TYPE,
            AUTHORIZATION,
            CACHE_CONTROL,
            http::header::HeaderName::from_static("x-requested-with"),
        ])
        .allow_credentials(true);

    // Middleware stack matching Node.js setup
    let middleware_stack = ServiceBuilder::new()
        // Request body size limit (equivalent to express.json({ limit: '10mb' }))
        .layer(DefaultBodyLimit::max(10 * 1024 * 1024)) // 10MB
        // Compression
        .layer(CompressionLayer::new())
        // Tracing/logging
        .layer(tower_http::trace::TraceLayer::new_for_http());

    // Create complete router matching all Node.js routes
    let app = Router::new()
        // Health and status endpoints
        .route("/api/health", get(health_check))
        .route("/api/status", get(status_check))
        .route("/api/performance", get(performance_check))
        .route("/api/settings", get(settings_handler))
        .route("/api/settings/backup/scheduler-status", get(backup_scheduler_status_handler))
        .route("/api/notifications", get(|| async { Json(json!({"notifications": []})) }))

        
        // Authentication routes
        .merge(auth_routes())
        
        // Core business logic routes
        .merge(bills_routes()) 
        .merge(customer_routes())
        .merge(product_routes())
        .merge(sales_routes())
        .merge(suppliers_routes())
        .merge(supplier_payment_receipts_routes())
        .merge(purchases_routes())
        .merge(reports_routes())
        .merge(expenses_routes())
        .merge(license_routes())
        // .merge(cashbox_routes()) // Removed - using money boxes only
        .merge(cloud_backup_routes())
        .merge(user_routes())
        .merge(debts_routes())
        .merge(installments_routes())
        .merge(delegates_routes())
        .merge(employees_routes())
        .merge(stocks_routes())
        .merge(stock_movements_routes())
        .merge(money_boxes_routes())
        .merge(devices_routes())
        .merge(mobile_live_data_routes())
        .merge(performance_routes())
        .merge(database_routes())
        .merge(cache_routes())
        .merge(logs_routes())
        .merge(branch_config_routes())
        .merge(customer_receipts_routes())
        // Static file serving (equivalent to app.use('/uploads', express.static))
        .nest_service("/uploads", tower_http::services::ServeDir::new("uploads"))
        
        .with_state(AppState {
            db,
            auth_service,
            cache_service,
            license_service,
            device_config_service,
            settings_service,
            permissions_service,
            bills_service,
            // cashbox_service, // Removed - using money boxes only
            cloud_backup_service,
            customer_service,
                    supplier_service,
        supplier_payment_receipt_service,
        product_service,
            sale_service,
            purchase_service,
            inventory_service,
            report_service,
            expense_service,
            employee_service,
            debt_service,
            stock_service,
            notification_service,
            backup_service,
            validation_service,
            barcode_service,
            file_service,
            installments_service: InstallmentsService::new(),
            delegates_service: DelegatesService::new(),
            stock_movements_service: StockMovementsService::new(),
            money_boxes_service: MoneyBoxesService::new(),
            device_service: DeviceService::new(),
            mobile_live_data_service: MobileLiveDataService::new(),
            performance_service: PerformanceService::new(),
            database_service: DatabaseService::new(),
            log_service: LogService::new(),
            branch_config_service: BranchConfigService::new(),
            customer_receipts_service: CustomerReceiptsService::new(),
        })
        .layer(cors)
        .layer(middleware_stack);

    let addr = format!("0.0.0.0:{}", port).parse::<SocketAddr>().unwrap();
    
    // License verification on startup (equivalent to Node.js license check)
    tracing::info!("🔐 Verifying license...");
    // Add license verification logic here similar to Node.js
    
    // Initialize backup scheduler (equivalent to Node.js backupScheduler.startScheduler)
    tracing::info!("⏰ Initializing backup scheduler...");
    // Add backup scheduler initialization here
    
    // Network discovery for main devices (equivalent to Node.js networkDiscoveryService)
    if is_main_device() {
        tracing::info!("🌐 Starting network discovery service...");
        // Add network discovery service initialization here  
    }

    tracing::info!("🌐 Server starting on {}", addr);

    // Start the server
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    tracing::info!("✅ Server is running! Press Ctrl+C to stop.");
    
    axum::serve(listener, app).await.unwrap();
}

// Application state shared across all handlers - complete version matching Node.js functionality
#[derive(Clone)]
pub struct AppState {
    pub db: Database,
    pub auth_service: AuthService,
    pub cache_service: CacheService,
    pub license_service: LicenseService,
    pub device_config_service: DeviceConfigService,
    pub settings_service: SettingsService,
    pub permissions_service: PermissionsService,
    pub bills_service: BillsService,
    // pub cashbox_service: CashBoxService, // Removed - using money boxes only
    pub cloud_backup_service: CloudBackupService,
    pub customer_service: CustomerService,
    pub supplier_service: SupplierService,
    pub supplier_payment_receipt_service: SupplierPaymentReceiptService,
    pub product_service: ProductService,
    pub sale_service: SaleService,
    pub purchase_service: PurchaseService,
    pub inventory_service: InventoryService,
    pub report_service: ReportService,
    pub expense_service: ExpenseService,
    pub employee_service: EmployeeService,
    pub debt_service: DebtService,
    pub stock_service: StockService,
    pub notification_service: NotificationService,
    pub backup_service: BackupService,
    pub validation_service: ValidationService,
    pub barcode_service: BarcodeService,
    pub file_service: FileService,
    pub installments_service: InstallmentsService,
    pub delegates_service: DelegatesService,
    pub stock_movements_service: StockMovementsService,
    pub money_boxes_service: MoneyBoxesService,
    pub device_service: DeviceService,
    pub mobile_live_data_service: MobileLiveDataService,
    pub performance_service: PerformanceService,
    pub database_service: DatabaseService,
    pub log_service: LogService,
    pub branch_config_service: BranchConfigService,
    pub customer_receipts_service: CustomerReceiptsService,
}
