use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri::Manager;
use std::env;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub google_geolocation_api_key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom_settings: Option<HashMap<String, serde_json::Value>>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            google_geolocation_api_key: "AIzaSyCmnGIu0zHpAjkRFxrKcfURbQ8snVmpk-k".to_string(),
            custom_settings: Some(HashMap::new()),
        }
    }
}

pub struct ConfigManager {
    settings: AppSettings,
    config_path: PathBuf,
}

impl ConfigManager {
    pub fn new(app: &AppHandle) -> Self {
        let config_path = app.path().app_data_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .join("config.json");
        
        let settings = Self::load_config(&config_path);
        
        Self {
            settings,
            config_path,
        }
    }
    
    fn load_config(config_path: &PathBuf) -> AppSettings {
        // Priority order for configuration:
        // 1. Environment variables (highest priority)
        // 2. Config file in app data directory
        // 3. Default values (lowest priority)
        
        let mut settings = AppSettings::default();
        
        // Load from environment variables (highest priority)
        if let Ok(api_key) = env::var("GOOGLE_GEOLOCATION_API_KEY") {
            settings.google_geolocation_api_key = api_key;
        }
        
        // Try to load from config file
        if config_path.exists() {
            match fs::read_to_string(config_path) {
                Ok(contents) => {
                    match serde_json::from_str::<AppSettings>(&contents) {
                        Ok(file_settings) => {
                            // Only use config file values if environment variable is not set
                            if env::var("GOOGLE_GEOLOCATION_API_KEY").is_err() {
                                settings.google_geolocation_api_key = file_settings.google_geolocation_api_key;
                            }
                            
                            // Merge custom settings
                            if let Some(custom) = file_settings.custom_settings {
                                if settings.custom_settings.is_none() {
                                    settings.custom_settings = Some(HashMap::new());
                                }
                                if let Some(ref mut current_custom) = settings.custom_settings {
                                    for (key, value) in custom {
                                        current_custom.insert(key, value);
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            eprintln!("Failed to parse config file: {}", e);
                        }
                    }
                }
                Err(e) => {
                    eprintln!("Failed to read config file: {}", e);
                }
            }
        }
        
        settings
    }
    
    pub fn save_config(&self) -> Result<(), Box<dyn std::error::Error>> {
        // Ensure the directory exists
        if let Some(parent) = self.config_path.parent() {
            fs::create_dir_all(parent)?;
        }
        
        let json = serde_json::to_string_pretty(&self.settings)?;
        fs::write(&self.config_path, json)?;
        Ok(())
    }
    
    pub fn get(&self, key: &str) -> Option<String> {
        match key {
            "GOOGLE_GEOLOCATION_API_KEY" => Some(self.settings.google_geolocation_api_key.clone()),
            _ => {
                // Check custom settings
                if let Some(ref custom) = self.settings.custom_settings {
                    if let Some(value) = custom.get(key) {
                        return Some(value.to_string());
                    }
                }
                None
            }
        }
    }
    
    pub fn set(&mut self, key: &str, value: String) -> Result<(), Box<dyn std::error::Error>> {
        match key {
            "GOOGLE_GEOLOCATION_API_KEY" => {
                self.settings.google_geolocation_api_key = value;
            }
            _ => {
                // Store in custom settings
                if self.settings.custom_settings.is_none() {
                    self.settings.custom_settings = Some(HashMap::new());
                }
                if let Some(ref mut custom) = self.settings.custom_settings {
                    custom.insert(key.to_string(), serde_json::Value::String(value));
                }
            }
        }
        
        self.save_config()?;
        Ok(())
    }
    
    pub fn update_api_key(&mut self, new_api_key: String) -> Result<(), Box<dyn std::error::Error>> {
        self.set("GOOGLE_GEOLOCATION_API_KEY", new_api_key)
    }
    
    pub fn get_all(&self) -> HashMap<String, String> {
        let mut all_settings = HashMap::new();
        
        // Add known settings
        all_settings.insert(
            "GOOGLE_GEOLOCATION_API_KEY".to_string(),
            self.settings.google_geolocation_api_key.clone(),
        );
        
        // Add custom settings
        if let Some(ref custom) = self.settings.custom_settings {
            for (key, value) in custom {
                all_settings.insert(key.clone(), value.to_string());
            }
        }
        
        all_settings
    }
    
    pub fn get_settings(&self) -> &AppSettings {
        &self.settings
    }
    
    pub fn get_settings_mut(&mut self) -> &mut AppSettings {
        &mut self.settings
    }
}
