use anyhow::Result;
use dirs::home_dir;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tracing::{info, warn};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub branch: String,
    pub ip: String,
    pub port: u16,
    pub auto_connect: bool,
    pub connection_timeout: u32,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            branch: "main".to_string(),
            ip: "localhost".to_string(),
            port: 39000,
            auto_connect: false,
            connection_timeout: 10000,
        }
    }
}

#[derive(Clone)]
pub struct DeviceConfigService {
    app_data_dir: PathBuf,
    config_file: PathBuf,
}

impl DeviceConfigService {
    pub fn new() -> Result<Self> {
        let home = home_dir().ok_or_else(|| anyhow::anyhow!("Could not determine home directory"))?;
        let app_data_dir = home.join(".urcash");
        let config_file = app_data_dir.join("appConfig.json");

        // Ensure the .urcash directory exists
        if !app_data_dir.exists() {
            fs::create_dir_all(&app_data_dir)?;
            info!("Created .urcash directory at: {:?}", app_data_dir);
        }

        // Create subdirectories
        let subdirs = ["logs", "uploads", "license"];
        for subdir in &subdirs {
            let subdir_path = app_data_dir.join(subdir);
            if !subdir_path.exists() {
                fs::create_dir_all(&subdir_path)?;
                info!("Created subdirectory: {:?}", subdir_path);
            }
        }

        Ok(Self {
            app_data_dir,
            config_file,
        })
    }

    pub fn get_app_data_dir(&self) -> &PathBuf {
        &self.app_data_dir
    }

    pub fn get_config(&self) -> Result<AppConfig> {
        if self.config_file.exists() {
            let config_content = fs::read_to_string(&self.config_file)?;
            let config: AppConfig = serde_json::from_str(&config_content)
                .or_else(|_| {
                    // If JSON parsing fails, try with a more flexible approach for missing fields
                    let mut partial: serde_json::Value = serde_json::from_str(&config_content)?;
                    
                    // Add missing fields with defaults
                    if partial.get("connection_timeout").is_none() {
                        partial["connection_timeout"] = serde_json::Value::Number(10000.into());
                    }
                    
                    serde_json::from_value(partial)
                })?;
            Ok(config)
        } else {
            // Create default config
            let default_config = AppConfig::default();
            self.save_config(&default_config)?;
            Ok(default_config)
        }
    }

    pub fn save_config(&self, config: &AppConfig) -> Result<()> {
        let config_json = serde_json::to_string_pretty(config)?;
        fs::write(&self.config_file, config_json)?;
        info!("Saved device config to: {:?}", self.config_file);
        Ok(())
    }

    pub fn is_main_device(&self) -> bool {
        match self.get_config() {
            Ok(config) => config.branch == "main",
            Err(_) => {
                warn!("Failed to read device config, defaulting to main device");
                true
            }
        }
    }

    pub fn get_local_ip(&self) -> String {
        // Get local IP address
        use std::net::{IpAddr, Ipv4Addr};
        
        // Try to get actual network IP
        if let Ok(socket) = std::net::UdpSocket::bind("0.0.0.0:0") {
            if let Ok(()) = socket.connect("8.8.8.8:80") {
                if let Ok(addr) = socket.local_addr() {
                    return addr.ip().to_string();
                }
            }
        }
        
        // Fallback to localhost
        "127.0.0.1".to_string()
    }

    pub fn update_ip(&self, new_ip: String) -> Result<()> {
        let mut config = self.get_config()?;
        config.ip = new_ip;
        self.save_config(&config)
    }

    pub fn set_device_mode(&self, branch: String, ip: Option<String>) -> Result<()> {
        let mut config = self.get_config()?;
        config.branch = branch;
        if let Some(ip) = ip {
            config.ip = ip;
        }
        self.save_config(&config)
    }
}

impl Default for DeviceConfigService {
    fn default() -> Self {
        Self::new().expect("Failed to initialize DeviceConfigService")
    }
}
