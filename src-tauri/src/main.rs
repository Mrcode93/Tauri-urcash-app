// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::time::Duration;
use tauri::{Manager, AppHandle};
use tauri_plugin_shell::ShellExt;
use axum::{
    extract::Query,
    response::Json,
    routing::get,
    Router,
};
use serde::Deserialize;
use serde_json::{json, Value};
use tower_http::cors::CorsLayer;

#[derive(Deserialize)]
struct BasicQuery {
    page: Option<i32>,
    limit: Option<i32>,
}

// Mock handlers for the API endpoints the frontend expects
async fn health_handler() -> Json<Value> {
    Json(json!({
        "status": "ok",
        "message": "URCash Server is running!"
    }))
}

async fn backup_scheduler_status_handler() -> Json<Value> {
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

async fn cash_box_summary_handler() -> Json<Value> {
    Json(json!({
        "success": true,
        "data": {
            "totalCash": 0,
            "isOpen": false,
            "lastTransaction": null,
            "dailyStats": {
                "sales": 0,
                "purchases": 0,
                "expenses": 0
            }
        }
    }))
}

async fn cash_box_transactions_handler(Query(query): Query<BasicQuery>) -> Json<Value> {
    Json(json!({
        "success": true,
        "data": [],
        "pagination": {
            "page": query.page.unwrap_or(1),
            "limit": query.limit.unwrap_or(50),
            "total": 0,
            "totalPages": 0
        }
    }))
}

async fn create_router() -> Router {
    Router::new()
        .route("/", get(health_handler))
        .route("/health", get(health_handler))
        .route("/api/settings/backup/scheduler-status", get(backup_scheduler_status_handler))
        .route("/api/cash-box/my-summary", get(cash_box_summary_handler))
        .route("/api/cash-box/transactions/:id", get(cash_box_transactions_handler))
        .route("/api/cash-box/open", axum::routing::post(|| async { 
            Json(json!({"success": true, "message": "Cash box opened"}))
        }))
        // Add more mock endpoints as needed by the frontend
        .layer(
            CorsLayer::new()
                .allow_origin("tauri://localhost".parse::<axum::http::HeaderValue>().unwrap())
                .allow_origin("http://localhost:3000".parse::<axum::http::HeaderValue>().unwrap())
                .allow_origin("http://localhost:39000".parse::<axum::http::HeaderValue>().unwrap())
                .allow_methods([axum::http::Method::GET, axum::http::Method::POST, axum::http::Method::PUT, axum::http::Method::DELETE])
                .allow_headers([axum::http::header::CONTENT_TYPE, axum::http::header::AUTHORIZATION])
                .allow_credentials(true)
        )
}

async fn start_embedded_server() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let app = create_router().await;
    
    // Try to start the server on port 39000
    let listener = tokio::net::TcpListener::bind("127.0.0.1:39000").await?;
    println!("🚀 URCash Embedded Server running on http://127.0.0.1:39000");
    
    axum::serve(listener, app).await?;
    
    Ok(())
}

#[tauri::command]
async fn start_rust_server(app: AppHandle) -> Result<String, String> {
    println!("🔄 Starting external Rust server...");
    
    // Try multiple possible binary locations
    let mut binary_path = None;
    
    // First, try the resource directory (for bundled apps)
    if let Ok(resource_dir) = app.path().resource_dir() {
        let resource_binary = resource_dir.join("bin").join("rust-server");
        println!("🔍 Checking resource path: {:?}", resource_binary);
        if resource_binary.exists() {
            binary_path = Some(resource_binary);
        }
    }
    
    // If not found in resources, try the app directory
    if binary_path.is_none() {
        if let Ok(app_dir) = app.path().app_data_dir() {
            let app_binary = app_dir.join("bin").join("rust-server");
            println!("🔍 Checking app data path: {:?}", app_binary);
            if app_binary.exists() {
                binary_path = Some(app_binary);
            }
        }
    }
    
    // Try relative to the executable (for dev builds)
    if binary_path.is_none() {
        if let Ok(exe_dir) = std::env::current_exe() {
            let exe_binary = exe_dir.parent()
                .unwrap_or_else(|| std::path::Path::new("."))
                .join("bin")
                .join("rust-server");
            println!("🔍 Checking exe relative path: {:?}", exe_binary);
            if exe_binary.exists() {
                binary_path = Some(exe_binary);
            }
        }
    }
    
    let resource_path = binary_path.ok_or_else(|| {
        "Rust server binary not found in any expected location".to_string()
    })?;
    
    println!("📍 Server binary found at: {:?}", resource_path);
    
    // Make sure the binary is executable
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(metadata) = std::fs::metadata(&resource_path) {
            let mut perms = metadata.permissions();
            perms.set_mode(0o755); // rwxr-xr-x
            if let Err(e) = std::fs::set_permissions(&resource_path, perms) {
                println!("⚠️ Warning: Could not set executable permissions: {}", e);
            }
        }
    }
    
    // Use tauri-plugin-shell to start the process
    let shell = app.shell();
    
    match shell.command(&resource_path)
        .args(&[] as &[&str])  // No additional arguments
        .spawn()
    {
        Ok((mut rx, child)) => {
            println!("✅ External Rust server started with PID: {}", child.pid());
            
            // Spawn a task to handle the process output
            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        tauri_plugin_shell::process::CommandEvent::Stdout(line) => {
                            println!("Server stdout: {}", String::from_utf8_lossy(&line));
                        }
                        tauri_plugin_shell::process::CommandEvent::Stderr(line) => {
                            println!("Server stderr: {}", String::from_utf8_lossy(&line));
                        }
                        tauri_plugin_shell::process::CommandEvent::Error(error) => {
                            println!("Server error: {}", error);
                        }
                        tauri_plugin_shell::process::CommandEvent::Terminated(payload) => {
                            println!("Server terminated with code: {:?}", payload.code);
                            break;
                        }
                        _ => {}
                    }
                }
            });
            
            Ok("External Rust server started successfully".to_string())
        },
        Err(e) => {
            println!("❌ Failed to start external server: {}", e);
            Err(format!("Failed to start external server: {}", e))
        }
    }
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn toggle_devtools(window: tauri::Window) -> Result<String, String> {
    println!("🔧 Devtools toggle requested");
    // In Tauri 2.x with devtools enabled in config, right-click should show devtools
    // Or press Ctrl+Shift+I (Windows/Linux) or Cmd+Option+I (macOS)
    Ok("Devtools can be opened with right-click -> Inspect Element, or Ctrl+Shift+I (Cmd+Option+I on Mac)".to_string())
}

#[tauri::command]
async fn check_server_status() -> Result<String, String> {
    match tokio::net::TcpStream::connect("127.0.0.1:39000").await {
        Ok(_) => Ok("Server is running".to_string()),
        Err(_) => Err("Server is not running".to_string()),
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle().clone();
            
            // Start the external server when the app starts
            tauri::async_runtime::spawn(async move {
                println!("🚀 Starting URCash servers...");
                
                // First try to start the external rust server
                match start_rust_server(app_handle.clone()).await {
                    Ok(msg) => {
                        println!("✅ {}", msg);
                        // Give the external server more time to start and bind to port
                        tokio::time::sleep(Duration::from_secs(5)).await;
                        
                        // Test if the server is actually responding
                        let mut server_ready = false;
                        for i in 0..10 {
                            println!("🔍 Attempt {} - Checking if external server is ready...", i + 1);
                            if tokio::net::TcpStream::connect("127.0.0.1:39000").await.is_ok() {
                                println!("✅ External server is responding on port 39000");
                                server_ready = true;
                                break;
                            }
                            tokio::time::sleep(Duration::from_millis(500)).await;
                        }
                        
                        if !server_ready {
                            println!("⚠️ External server started but not responding on port 39000, starting embedded fallback");
                            if let Err(e) = start_embedded_server().await {
                                eprintln!("❌ Failed to start embedded server: {}", e);
                            }
                        }
                    },
                    Err(e) => {
                        println!("⚠️ External server failed to start: {}", e);
                        println!("🔄 Starting embedded server as fallback...");
                        if let Err(e) = start_embedded_server().await {
                            eprintln!("❌ Failed to start embedded server: {}", e);
                        }
                    }
                }
            });
            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            check_server_status,
            start_rust_server,
            toggle_devtools
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}