use std::process::{Command, Stdio};
use tauri::AppHandle;
use tauri::Manager;
use tokio::time::{sleep, Duration};

pub async fn start_rust_server(app: AppHandle) -> Result<String, String> {
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
    
    // Start the server process
    let mut child = Command::new(&resource_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start server: {}", e))?;
    
    println!("✅ External Rust server started with PID: {}", child.id());
    
    // Spawn a task to handle the process output
    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();
    
    tauri::async_runtime::spawn(async move {
        use tokio::io::{AsyncBufReadExt, BufReader};
        
        let mut stdout_reader = BufReader::new(tokio::process::ChildStdout::from_std(stdout).unwrap());
        let mut stderr_reader = BufReader::new(tokio::process::ChildStderr::from_std(stderr).unwrap());
        
        let mut stdout_line = String::new();
        let mut stderr_line = String::new();
        
        loop {
            tokio::select! {
                result = stdout_reader.read_line(&mut stdout_line) => {
                    match result {
                        Ok(0) => break, // EOF
                        Ok(_) => {
                            println!("Server stdout: {}", stdout_line.trim());
                            stdout_line.clear();
                        }
                        Err(_) => break,
                    }
                }
                result = stderr_reader.read_line(&mut stderr_line) => {
                    match result {
                        Ok(0) => break, // EOF
                        Ok(_) => {
                            eprintln!("Server stderr: {}", stderr_line.trim());
                            stderr_line.clear();
                        }
                        Err(_) => break,
                    }
                }
            }
        }
    });
    
    // Wait for server to be ready
    for i in 0..10 {
        println!("🔍 Attempt {} - Checking if server is ready...", i + 1);
        if tokio::net::TcpStream::connect("127.0.0.1:39000").await.is_ok() {
            println!("✅ Server is responding on port 39000");
            return Ok("External Rust server started successfully".to_string());
        }
        sleep(Duration::from_millis(500)).await;
    }
    
    Err("Server started but not responding on port 39000".to_string())
}

pub async fn check_server_status() -> Result<String, String> {
    match tokio::net::TcpStream::connect("127.0.0.1:39000").await {
        Ok(_) => Ok("Server is running".to_string()),
        Err(_) => Err("Server is not running".to_string()),
    }
}