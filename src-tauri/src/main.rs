// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod server;
mod config;

use std::sync::Mutex;
use std::time::Duration;
use tokio::time::interval;
use serde::{Deserialize, Serialize};
use tauri::{Manager, State, Emitter};
use std::process::Command;
use std::path::PathBuf;
use std::fs;
use std::env;
use reqwest;
use crate::config::ConfigManager;

// Global state for connectivity monitoring
struct ConnectivityState {
    is_online: Mutex<bool>,
    monitoring_active: Mutex<bool>,
}

// Global state for configuration management
struct ConfigState {
    config_manager: Mutex<ConfigManager>,
}

// App configuration structure
#[derive(Serialize, Deserialize, Clone)]
struct AppConfig {
    branch: String,
    ip: String,
    auto_connect: bool,
    port: u16,
    updated_at: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            branch: "main".to_string(),
            ip: get_local_ip_address(),
            auto_connect: false,
            port: 39000,
            updated_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}

// Get local IP address
fn get_local_ip_address() -> String {
    // This is a simplified version - you might want to use a proper network library
    "127.0.0.1".to_string()
}

// Get app config path
fn get_app_config_path() -> PathBuf {
    let home_dir = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home_dir.join(".urcash").join("appConfig.json")
}

// Ensure app config directory exists
fn ensure_app_config_dir() -> std::io::Result<()> {
    let config_path = get_app_config_path();
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)?;
    }
    Ok(())
}

// Read app configuration
fn read_app_config() -> AppConfig {
    let config_path = get_app_config_path();
    
    if let Ok(contents) = fs::read_to_string(&config_path) {
        if let Ok(config) = serde_json::from_str::<AppConfig>(&contents) {
            return config;
        }
    }
    
    // Return default config if file doesn't exist or is invalid
    AppConfig::default()
}

// Save app configuration
fn save_app_config(config: &AppConfig) -> Result<(), Box<dyn std::error::Error>> {
    ensure_app_config_dir()?;
    let config_path = get_app_config_path();
    let json = serde_json::to_string_pretty(config)?;
    fs::write(config_path, json)?;
    Ok(())
}

// Check internet connectivity
async fn check_internet_connectivity() -> bool {
    let endpoints = vec![
        "https://www.google.com",
        "https://www.cloudflare.com",
        "https://httpbin.org/get"
    ];

    let client = reqwest::Client::new();
    
    for endpoint in endpoints {
        if let Ok(response) = client
            .get(endpoint)
            .timeout(Duration::from_secs(5))
            .header("User-Agent", "Urcash-Connectivity-Check/1.0")
            .send()
            .await
        {
            if response.status().is_success() {
                return true;
            }
        }
    }
    
    false
}

// Start connectivity monitoring
async fn start_connectivity_monitoring(app: tauri::AppHandle, state: State<'_, ConnectivityState>) {
    let mut interval = interval(Duration::from_secs(30));
    
    // Check immediately
    let is_online = check_internet_connectivity().await;
    {
        let mut online_state = state.is_online.lock().unwrap();
        *online_state = is_online;
    }
    
    // Emit initial state
    app.emit("internet-connectivity-changed", serde_json::json!({
        "isOnline": is_online
    })).unwrap();
    
    // Start periodic monitoring
    {
        let mut monitoring = state.monitoring_active.lock().unwrap();
        *monitoring = true;
    }
    
    while {
        let monitoring = state.monitoring_active.lock().unwrap();
        *monitoring
    } {
        interval.tick().await;
        
        let is_online = check_internet_connectivity().await;
        let state_changed = {
            let mut online_state = state.is_online.lock().unwrap();
            let changed = *online_state != is_online;
            *online_state = is_online;
            changed
        };
        
        if state_changed {
            app.emit("internet-connectivity-changed", serde_json::json!({
                "isOnline": is_online
            })).unwrap();
        }
    }
}

// Tauri commands

#[tauri::command]
async fn get_app_config() -> Result<AppConfig, String> {
    Ok(read_app_config())
}

#[tauri::command]
async fn save_app_config_command(config: AppConfig) -> Result<(), String> {
    save_app_config(&config).map_err(|e| e.to_string())
}

#[tauri::command]
async fn check_connectivity() -> Result<bool, String> {
    Ok(check_internet_connectivity().await)
}

#[tauri::command]
fn show_toast_notification(
    app: tauri::AppHandle,
    title: String,
    message: String,
    notification_type: String,
) -> Result<(), String> {
    app.emit("show-toast-notification", serde_json::json!({
        "title": title,
        "message": message,
        "type": notification_type
    })).map_err(|e| e.to_string())
}

#[tauri::command]
async fn require_internet_connection(
    app: tauri::AppHandle,
    operation: String,
) -> Result<bool, String> {
    let is_connected = check_internet_connectivity().await;
    
    if !is_connected {
        show_toast_notification(
            app,
            "No Internet Connection".to_string(),
            format!("{} requires an internet connection. Please check your network and try again.", operation),
            "error".to_string(),
        )?;
        return Ok(false);
    }
    
    Ok(true)
}

#[tauri::command]
fn kill_process_by_port(port: u16) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("netstat")
            .args(&["-ano"])
            .output()
            .map_err(|e| e.to_string())?;
        
        let output_str = String::from_utf8_lossy(&output.stdout);
        for line in output_str.lines() {
            if line.contains(&format!(":{}", port)) {
                if let Some(pid) = line.split_whitespace().last() {
                    if let Ok(pid_num) = pid.parse::<u32>() {
                        let _ = Command::new("taskkill")
                            .args(&["/PID", &pid_num.to_string(), "/F"])
                            .output();
                    }
                }
            }
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        let output = Command::new("lsof")
            .args(&["-ti", &format!(":{}", port)])
            .output()
            .map_err(|e| e.to_string())?;
        
        let output_str = String::from_utf8_lossy(&output.stdout);
        for pid_str in output_str.lines() {
            if let Ok(pid) = pid_str.parse::<u32>() {
                let _ = Command::new("kill")
                    .args(&["-9", &pid.to_string()])
                    .output();
            }
        }
    }
    
    Ok(())
}

#[tauri::command]
fn get_local_ip_address_command() -> String {
    get_local_ip_address()
}

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn get_app_name() -> String {
    "أوركاش".to_string()
}

// Configuration management commands
#[tauri::command]
fn get_config_value(state: State<'_, ConfigState>, key: String) -> Result<Option<String>, String> {
    let config_manager = state.config_manager.lock().unwrap();
    Ok(config_manager.get(&key))
}

#[tauri::command]
fn set_config_value(state: State<'_, ConfigState>, key: String, value: String) -> Result<(), String> {
    let mut config_manager = state.config_manager.lock().unwrap();
    config_manager.set(&key, value).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_all_config(state: State<'_, ConfigState>) -> Result<std::collections::HashMap<String, String>, String> {
    let config_manager = state.config_manager.lock().unwrap();
    Ok(config_manager.get_all())
}

#[tauri::command]
fn update_api_key(state: State<'_, ConfigState>, new_api_key: String) -> Result<(), String> {
    let mut config_manager = state.config_manager.lock().unwrap();
    config_manager.update_api_key(new_api_key).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_google_geolocation_api_key(state: State<'_, ConfigState>) -> Result<String, String> {
    let config_manager = state.config_manager.lock().unwrap();
    Ok(config_manager.get("GOOGLE_GEOLOCATION_API_KEY").unwrap_or_default())
}

#[tauri::command]
async fn start_connectivity_monitoring_command(app: tauri::AppHandle, state: State<'_, ConnectivityState>) -> Result<(), String> {
    start_connectivity_monitoring(app, state).await;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Initialize connectivity state
            let connectivity_state = ConnectivityState {
                is_online: Mutex::new(true),
                monitoring_active: Mutex::new(false),
            };
            
            // Initialize configuration state
            let config_state = ConfigState {
                config_manager: Mutex::new(ConfigManager::new(&app.handle())),
            };
            
            // Manage both states
            app.manage(connectivity_state);
            app.manage(config_state);
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_config,
            save_app_config_command,
            check_connectivity,
            show_toast_notification,
            require_internet_connection,
            kill_process_by_port,
            get_local_ip_address_command,
            get_app_version,
            get_app_name,
            // Configuration management commands
            get_config_value,
            set_config_value,
            get_all_config,
            update_api_key,
            get_google_geolocation_api_key,
            // Connectivity monitoring
            start_connectivity_monitoring_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}