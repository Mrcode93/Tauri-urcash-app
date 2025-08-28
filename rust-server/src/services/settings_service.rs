use anyhow::Result;
use serde::{Deserialize, Serialize};
use tracing::info;
use sqlx::Row;

use crate::database::Database;

#[derive(Debug, Serialize, Deserialize)]
pub struct SettingsResponse {
    // Company Information
    pub company_name: String,
    pub logo_url: Option<String>,
    pub mobile: String,
    pub email: String,
    pub address: String,
    pub website: String,
    pub tax_number: String,
    pub registration_number: String,
    pub description: String,
    
    // Currency and Localization
    pub currency: String,
    pub language: String,
    pub timezone: String,
    pub date_format: String,
    pub number_format: String,
    pub rtl_mode: bool,
    pub rtl_direction: bool,
    pub exchange_rate: f64,
    
    // UI and Theme Settings
    pub theme: String,
    pub primary_color: String,
    pub secondary_color: String,
    pub dashboard_layout: String,
    pub dashboard_tile_size: String,
    pub sidebar_collapsed: bool,
    pub enable_animations: bool,
    pub compact_mode: bool,
    pub sidebar_menu_items: Option<String>,
    
    // Business Rules
    pub allow_negative_stock: bool,
    pub require_customer_for_sales: bool,
    pub auto_generate_barcode: bool,
    pub default_payment_method: String,
    pub tax_rate: f64,
    pub enable_loyalty_program: bool,
    pub loyalty_points_rate: f64,
    pub minimum_order_amount: f64,
    
    // Security Settings
    pub session_timeout: i32,
    pub password_min_length: i32,
    pub require_strong_password: bool,
    pub enable_two_factor: bool,
    pub allow_multiple_sessions: bool,
    pub login_attempts: i32,
    pub lockout_duration: i32,
    
    // Notification Settings
    pub email_notifications_enabled: bool,
    pub email_low_stock_notifications: bool,
    pub email_new_order_notifications: bool,
    pub sms_notifications_enabled: bool,
    pub push_notifications_enabled: bool,
    
    // Bill/Receipt Settings
    pub bill_template: String,
    pub bill_show_logo: bool,
    pub bill_show_barcode: bool,
    pub bill_show_company_info: bool,
    pub bill_show_qr_code: bool,
    pub bill_footer_text: String,
    pub bill_paper_size: String,
    pub bill_orientation: String,
    pub bill_margin_top: i32,
    pub bill_margin_right: i32,
    pub bill_margin_bottom: i32,
    pub bill_margin_left: i32,
    pub bill_font_header: String,
    pub bill_font_body: String,
    pub bill_font_footer: String,
    pub bill_color_primary: String,
    pub bill_color_secondary: String,
    pub bill_color_text: String,
    pub bill_print_mode: String,
    
    // Email Settings
    pub email_provider: String,
    pub email_host: String,
    pub email_port: i32,
    pub email_username: String,
    pub email_password: String,
    pub email_encryption: String,
    pub email_from_name: String,
    pub email_from_email: String,
    
    // Hardware Integration
    pub pos_barcode_scanner_enabled: bool,
    pub accounting_integration_enabled: bool,
    pub analytics_integration_enabled: bool,
    
    // Backup Settings
    pub auto_backup_enabled: bool,
    pub backup_frequency: String,
    pub backup_retention_days: i32,
    pub last_backup_date: Option<String>,
    pub backup_time: String,
    
    // Device settings  
    pub device_mode: DeviceMode,
    
    // Legacy compatibility
    pub currency_symbol: String, // alias for currency
    pub company_address: String, // alias for address
    pub company_phone: String,   // alias for mobile
    pub receipt_footer: String,  // alias for bill_footer_text
    pub items_per_page: i32,     // derived/default value
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceMode {
    pub mode: String,
    pub main_device_ip: String,
    pub port: u16,
    pub auto_connect: bool,
    pub connection_timeout: u32,
}

impl Default for SettingsResponse {
    fn default() -> Self {
        Self {
            // Company Information
            company_name: "شركتي".to_string(),
            logo_url: None,
            mobile: "".to_string(),
            email: "".to_string(),
            address: "".to_string(),
            website: "".to_string(),
            tax_number: "".to_string(),
            registration_number: "".to_string(),
            description: "".to_string(),
            
            // Currency and Localization
            currency: "IQD".to_string(),
            language: "ar".to_string(),
            timezone: "Asia/Baghdad".to_string(),
            date_format: "DD/MM/YYYY".to_string(),
            number_format: "ar-IQ".to_string(),
            rtl_mode: true,
            rtl_direction: true,
            exchange_rate: 1.0000,
            
            // UI and Theme Settings
            theme: "default".to_string(),
            primary_color: "#1f1f1f".to_string(),
            secondary_color: "#ededed".to_string(),
            dashboard_layout: "grid".to_string(),
            dashboard_tile_size: "medium".to_string(),
            sidebar_collapsed: false,
            enable_animations: true,
            compact_mode: false,
            sidebar_menu_items: None,
            
            // Business Rules
            allow_negative_stock: false,
            require_customer_for_sales: true,
            auto_generate_barcode: true,
            default_payment_method: "cash".to_string(),
            tax_rate: 0.00,
            enable_loyalty_program: false,
            loyalty_points_rate: 1.00,
            minimum_order_amount: 0.0,
            
            // Security Settings
            session_timeout: 30,
            password_min_length: 8,
            require_strong_password: true,
            enable_two_factor: false,
            allow_multiple_sessions: true,
            login_attempts: 5,
            lockout_duration: 15,
            
            // Notification Settings
            email_notifications_enabled: true,
            email_low_stock_notifications: true,
            email_new_order_notifications: true,
            sms_notifications_enabled: false,
            push_notifications_enabled: false,
            
            // Bill/Receipt Settings
            bill_template: "modern".to_string(),
            bill_show_logo: true,
            bill_show_barcode: true,
            bill_show_company_info: true,
            bill_show_qr_code: false,
            bill_footer_text: "شكراً لزيارتكم".to_string(),
            bill_paper_size: "A4".to_string(),
            bill_orientation: "portrait".to_string(),
            bill_margin_top: 10,
            bill_margin_right: 10,
            bill_margin_bottom: 10,
            bill_margin_left: 10,
            bill_font_header: "Arial".to_string(),
            bill_font_body: "Arial".to_string(),
            bill_font_footer: "Arial".to_string(),
            bill_color_primary: "#1f1f1f".to_string(),
            bill_color_secondary: "#ededed".to_string(),
            bill_color_text: "#333333".to_string(),
            bill_print_mode: "a4".to_string(),
            
            // Email Settings
            email_provider: "smtp".to_string(),
            email_host: "".to_string(),
            email_port: 587,
            email_username: "".to_string(),
            email_password: "".to_string(),
            email_encryption: "tls".to_string(),
            email_from_name: "".to_string(),
            email_from_email: "".to_string(),
            
            // Hardware Integration
            pos_barcode_scanner_enabled: true,
            accounting_integration_enabled: false,
            analytics_integration_enabled: false,
            
            // Backup Settings
            auto_backup_enabled: true,
            backup_frequency: "daily".to_string(),
            backup_retention_days: 30,
            last_backup_date: None,
            backup_time: "20:00".to_string(),
            
            // Device settings  
            device_mode: DeviceMode {
                mode: "main".to_string(),
                main_device_ip: "localhost".to_string(),
                port: 39000,
                auto_connect: false,
                connection_timeout: 10000,
            },
            
            // Legacy compatibility
            currency_symbol: "IQD".to_string(), // alias for currency
            company_address: "".to_string(), // alias for address
            company_phone: "".to_string(),   // alias for mobile
            receipt_footer: "شكراً لزيارتكم".to_string(),  // alias for bill_footer_text
            items_per_page: 50,     // derived/default value
        }
    }
}

#[derive(Clone)]
pub struct SettingsService;

impl SettingsService {
    pub fn new() -> Self {
        Self
    }

    pub async fn get_all_settings(&self, db: &Database) -> Result<SettingsResponse> {
        // Get settings from the single row (id=1) approach like Node.js
        let settings_row = sqlx::query(
            "SELECT * FROM settings WHERE id = 1"
        )
        .fetch_optional(&db.pool)
        .await?;

        if let Some(settings) = settings_row {
            Ok(SettingsResponse {
                // Company Information
                company_name: settings.get::<Option<String>, _>("company_name").unwrap_or_else(|| "شركتي".to_string()),
                logo_url: settings.get::<Option<String>, _>("logo_url"),
                mobile: settings.get::<Option<String>, _>("mobile").unwrap_or_else(|| String::new()),
                email: settings.get::<Option<String>, _>("email").unwrap_or_else(|| String::new()),
                address: settings.get::<Option<String>, _>("address").unwrap_or_else(|| String::new()),
                website: settings.get::<Option<String>, _>("website").unwrap_or_else(|| String::new()),
                tax_number: settings.get::<Option<String>, _>("tax_number").unwrap_or_else(|| String::new()),
                registration_number: settings.get::<Option<String>, _>("registration_number").unwrap_or_else(|| String::new()),
                description: settings.get::<Option<String>, _>("description").unwrap_or_else(|| String::new()),
                
                // Currency and Localization
                currency: settings.get::<Option<String>, _>("currency").unwrap_or_else(|| "IQD".to_string()),
                language: settings.get::<Option<String>, _>("language").unwrap_or_else(|| "ar".to_string()),
                timezone: settings.get::<Option<String>, _>("timezone").unwrap_or_else(|| "Asia/Baghdad".to_string()),
                date_format: settings.get::<Option<String>, _>("date_format").unwrap_or_else(|| "DD/MM/YYYY".to_string()),
                number_format: settings.get::<Option<String>, _>("number_format").unwrap_or_else(|| "ar-IQ".to_string()),
                rtl_mode: settings.get::<Option<i32>, _>("rtl_mode").unwrap_or(1) == 1,
                rtl_direction: settings.get::<Option<i32>, _>("rtl_direction").unwrap_or(1) == 1,
                exchange_rate: settings.get::<Option<i32>, _>("exchange_rate").unwrap_or(1) as f64,
                
                // UI and Theme Settings
                theme: settings.get::<Option<String>, _>("theme").unwrap_or_else(|| "default".to_string()),
                primary_color: settings.get::<Option<String>, _>("primary_color").unwrap_or_else(|| "#1f1f1f".to_string()),
                secondary_color: settings.get::<Option<String>, _>("secondary_color").unwrap_or_else(|| "#ededed".to_string()),
                dashboard_layout: settings.get::<Option<String>, _>("dashboard_layout").unwrap_or_else(|| "grid".to_string()),
                dashboard_tile_size: settings.get::<Option<String>, _>("dashboard_tile_size").unwrap_or_else(|| "medium".to_string()),
                sidebar_collapsed: settings.get::<Option<i32>, _>("sidebar_collapsed").unwrap_or(0) == 1,
                enable_animations: settings.get::<Option<i32>, _>("enable_animations").unwrap_or(1) == 1,
                compact_mode: settings.get::<Option<i32>, _>("compact_mode").unwrap_or(0) == 1,
                sidebar_menu_items: settings.get::<Option<String>, _>("sidebar_menu_items"),
                
                // Business Rules
                allow_negative_stock: settings.get::<Option<i32>, _>("allow_negative_stock").unwrap_or(0) == 1,
                require_customer_for_sales: settings.get::<Option<i32>, _>("require_customer_for_sales").unwrap_or(1) == 1,
                auto_generate_barcode: settings.get::<Option<i32>, _>("auto_generate_barcode").unwrap_or(1) == 1,
                default_payment_method: settings.get::<Option<String>, _>("default_payment_method").unwrap_or_else(|| "cash".to_string()),
                tax_rate: settings.get::<Option<i32>, _>("tax_rate").unwrap_or(0) as f64,
                enable_loyalty_program: settings.get::<Option<i32>, _>("enable_loyalty_program").unwrap_or(0) == 1,
                loyalty_points_rate: settings.get::<Option<i32>, _>("loyalty_points_rate").unwrap_or(1) as f64,
                minimum_order_amount: settings.get::<Option<i32>, _>("minimum_order_amount").unwrap_or(0) as f64,
                
                // Security Settings
                session_timeout: settings.get::<Option<i32>, _>("session_timeout").unwrap_or(30) as i32,
                password_min_length: settings.get::<Option<i32>, _>("password_min_length").unwrap_or(8) as i32,
                require_strong_password: settings.get::<Option<i32>, _>("require_strong_password").unwrap_or(1) == 1,
                enable_two_factor: settings.get::<Option<i32>, _>("enable_two_factor").unwrap_or(0) == 1,
                allow_multiple_sessions: settings.get::<Option<i32>, _>("allow_multiple_sessions").unwrap_or(1) == 1,
                login_attempts: settings.get::<Option<i32>, _>("login_attempts").unwrap_or(5) as i32,
                lockout_duration: settings.get::<Option<i32>, _>("lockout_duration").unwrap_or(15) as i32,
                
                // Notification Settings
                email_notifications_enabled: settings.get::<Option<i32>, _>("email_notifications_enabled").unwrap_or(1) == 1,
                email_low_stock_notifications: settings.get::<Option<i32>, _>("email_low_stock_notifications").unwrap_or(1) == 1,
                email_new_order_notifications: settings.get::<Option<i32>, _>("email_new_order_notifications").unwrap_or(1) == 1,
                sms_notifications_enabled: settings.get::<Option<i32>, _>("sms_notifications_enabled").unwrap_or(0) == 1,
                push_notifications_enabled: settings.get::<Option<i32>, _>("push_notifications_enabled").unwrap_or(0) == 1,
                
                // Bill/Receipt Settings
                bill_template: settings.get::<Option<String>, _>("bill_template").unwrap_or_else(|| "modern".to_string()),
                bill_show_logo: settings.get::<Option<i32>, _>("bill_show_logo").unwrap_or(1) == 1,
                bill_show_barcode: settings.get::<Option<i32>, _>("bill_show_barcode").unwrap_or(1) == 1,
                bill_show_company_info: settings.get::<Option<i32>, _>("bill_show_company_info").unwrap_or(1) == 1,
                bill_show_qr_code: settings.get::<Option<i32>, _>("bill_show_qr_code").unwrap_or(0) == 1,
                bill_footer_text: settings.get::<Option<String>, _>("bill_footer_text").unwrap_or_else(|| "شكراً لزيارتكم".to_string()),
                bill_paper_size: settings.get::<Option<String>, _>("bill_paper_size").unwrap_or_else(|| "A4".to_string()),
                bill_orientation: settings.get::<Option<String>, _>("bill_orientation").unwrap_or_else(|| "portrait".to_string()),
                bill_margin_top: settings.get::<Option<i32>, _>("bill_margin_top").unwrap_or(10) as i32,
                bill_margin_right: settings.get::<Option<i32>, _>("bill_margin_right").unwrap_or(10) as i32,
                bill_margin_bottom: settings.get::<Option<i32>, _>("bill_margin_bottom").unwrap_or(10) as i32,
                bill_margin_left: settings.get::<Option<i32>, _>("bill_margin_left").unwrap_or(10) as i32,
                bill_font_header: settings.get::<Option<String>, _>("bill_font_header").unwrap_or_else(|| "Arial".to_string()),
                bill_font_body: settings.get::<Option<String>, _>("bill_font_body").unwrap_or_else(|| "Arial".to_string()),
                bill_font_footer: settings.get::<Option<String>, _>("bill_font_footer").unwrap_or_else(|| "Arial".to_string()),
                bill_color_primary: settings.get::<Option<String>, _>("bill_color_primary").unwrap_or_else(|| "#1f1f1f".to_string()),
                bill_color_secondary: settings.get::<Option<String>, _>("bill_color_secondary").unwrap_or_else(|| "#ededed".to_string()),
                bill_color_text: settings.get::<Option<String>, _>("bill_color_text").unwrap_or_else(|| "#333333".to_string()),
                bill_print_mode: settings.get::<Option<String>, _>("bill_print_mode").unwrap_or_else(|| "a4".to_string()),
                
                // Email Settings
                email_provider: settings.get::<Option<String>, _>("email_provider").unwrap_or_else(|| "smtp".to_string()),
                email_host: settings.get::<Option<String>, _>("email_host").unwrap_or_else(|| String::new()),
                email_port: settings.get::<Option<i32>, _>("email_port").unwrap_or(587) as i32,
                email_username: settings.get::<Option<String>, _>("email_username").unwrap_or_else(|| String::new()),
                email_password: settings.get::<Option<String>, _>("email_password").unwrap_or_else(|| String::new()),
                email_encryption: settings.get::<Option<String>, _>("email_encryption").unwrap_or_else(|| "tls".to_string()),
                email_from_name: settings.get::<Option<String>, _>("email_from_name").unwrap_or_else(|| String::new()),
                email_from_email: settings.get::<Option<String>, _>("email_from_email").unwrap_or_else(|| String::new()),
                
                // Hardware Integration
                pos_barcode_scanner_enabled: settings.get::<Option<i32>, _>("pos_barcode_scanner_enabled").unwrap_or(1) == 1,
                accounting_integration_enabled: settings.get::<Option<i32>, _>("accounting_integration_enabled").unwrap_or(0) == 1,
                analytics_integration_enabled: settings.get::<Option<i32>, _>("analytics_integration_enabled").unwrap_or(0) == 1,
                
                // Backup Settings
                auto_backup_enabled: settings.get::<Option<i32>, _>("auto_backup_enabled").unwrap_or(1) == 1,
                backup_frequency: settings.get::<Option<String>, _>("backup_frequency").unwrap_or_else(|| "daily".to_string()),
                backup_retention_days: settings.get::<Option<i32>, _>("backup_retention_days").unwrap_or(30) as i32,
                last_backup_date: settings.get::<Option<String>, _>("last_backup_date").map(|d| d.to_string()),
                backup_time: settings.get::<Option<String>, _>("backup_time").unwrap_or_else(|| "20:00".to_string()),
                
                // Device settings  
                device_mode: DeviceMode {
                    mode: "main".to_string(),
                    main_device_ip: "localhost".to_string(),
                    port: 39000,
                    auto_connect: false,
                    connection_timeout: 10000,
                },
                
                // Legacy compatibility (aliases) - need to clone since we used these fields above
                currency_symbol: settings.get::<Option<String>, _>("currency").unwrap_or_else(|| "IQD".to_string()),
                company_address: settings.get::<Option<String>, _>("address").unwrap_or_else(|| String::new()),
                company_phone: settings.get::<Option<String>, _>("mobile").unwrap_or_else(|| String::new()),
                receipt_footer: settings.get::<Option<String>, _>("bill_footer_text").unwrap_or_else(|| "شكراً لزيارتكم".to_string()),
                items_per_page: 50, // Default value
            })
        } else {
            // Return default settings if none exist
            Ok(SettingsResponse::default())
        }
    }



    pub async fn insert_default_settings(&self, db: &Database) -> Result<()> {
        // Check if settings row already exists
        let exists = sqlx::query("SELECT id FROM settings WHERE id = 1")
            .fetch_optional(&db.pool)
            .await?;

        if exists.is_none() {
            // Insert default settings using the database's insert_default_settings method
            // This avoids duplication since the database already handles this in its initialization
            info!("Settings table is empty, default settings will be created by database initialization");
        }

        Ok(())
    }
}

impl Default for SettingsService {
    fn default() -> Self {
        Self::new()
    }
}