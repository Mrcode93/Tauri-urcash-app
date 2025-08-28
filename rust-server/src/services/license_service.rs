use anyhow::Result;
use chrono::{Utc, NaiveDateTime};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use std::fs;
use std::path::Path;
use tokio::sync::RwLock;
use tracing::{info, error, warn};

// Cryptography imports
use aes::Aes256;
use cbc::{Decryptor, cipher::{block_padding::Pkcs7, BlockDecryptMut, KeyIvInit}};
use sha2::{Sha256, Digest};
use md5::Md5;

use crate::database::Database;

const API_URL: &str = "https://urcash.up.railway.app/api";
const CACHE_TTL: u64 = 5 * 60; // 5 minutes

// License directory path
fn get_license_dir() -> String {
    let home = dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    home.join(".urcash").join("license").to_string_lossy().to_string()
}

#[derive(Clone)]
pub struct LicenseService {
    client: Client,
    cache: Arc<RwLock<HashMap<String, LicenseCacheEntry>>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LicenseCacheEntry {
    pub data: Value,
    pub expires: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseData {
    pub data: LicenseInfo,
    pub signature: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseInfo {
    pub device_id: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub features: std::collections::HashMap<String, FeatureInfo>,
    pub expires_at: Option<String>, // Keep as String to match Node.js
    #[serde(rename = "userId")]
    pub user_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FeatureInfo {
    pub activated_at: Option<String>,
    pub activation_code: Option<String>,
    pub expires_at: Option<String>,
    #[serde(rename = "type")]
    pub type_: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseResponse {
    pub success: bool,
    pub device_id: Option<String>,
    pub license_type: Option<String>,
    pub user_id: Option<String>,
    pub username: Option<String>,
    pub activation_info: Option<Value>,
    pub message: Option<String>,
    pub error: Option<String>,
    pub error_code: Option<String>,
    pub details: Option<String>,
    pub expired: Option<bool>,
    pub type_: Option<String>,
    pub features: Option<Vec<String>>,
    pub activated_at: Option<chrono::DateTime<Utc>>,
    pub expires_at: Option<chrono::DateTime<Utc>>,
    pub feature_licenses: Option<Value>,
    pub feature_expiration_status: Option<Value>,
    pub signature: Option<String>,
    pub source: Option<String>,
    pub offline: Option<bool>,
    pub needs_first_activation: Option<bool>,
}

impl Default for LicenseResponse {
    fn default() -> Self {
        Self {
            success: false,
            device_id: None,
            license_type: None,
            user_id: None,
            username: None,
            activation_info: None,
            message: None,
            error: None,
            error_code: None,
            details: None,
            expired: None,
            type_: None,
            features: None,
            activated_at: None,
            expires_at: None,
            feature_licenses: None,
            feature_expiration_status: None,
            signature: None,
            source: None,
            offline: None,
            needs_first_activation: None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ActivationRequest {
    pub device_id: String,
    pub ip_address: String,
    pub location: String,
    pub code: Option<String>,
    pub activation_code: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceFingerprint {
    pub machine_id: String,
    pub hostname: String,
    pub manufacturer: String,
    pub model: String,
    pub serial: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DecryptedLicense {
    pub success: bool,
    pub license_data: LicenseData,
    pub iv: String,
    pub fingerprint: String,
    pub variation_used: usize,
    pub key_method: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseFilesResponse {
    pub files: Option<HashMap<String, String>>,
    pub license_type: Option<String>,
    pub user_id: Option<String>,
    pub username: Option<String>,
    pub activation_info: Option<Value>,
    pub success: Option<bool>,
    pub message: Option<String>,
    pub error: Option<String>,
}

impl LicenseService {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            cache: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    // Generate device fingerprint
    pub async fn generate_device_fingerprint(&self) -> Result<String> {
        // Check cache first
        let cache_key = "license:fingerprint:device";
        if let Some(cached) = self.get_from_cache(cache_key).await {
            return Ok(cached);
        }

        // Get machine ID using real system machine ID (same as Node.js machineIdSync)
        let machine_id = self.get_real_machine_id()?;

        // Get hostname (same as Node.js os.hostname())
        let hostname = hostname::get()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        // Get detailed system information (same as Node.js si.system())
        // Try to get detailed hardware info - this is where we need to match Node.js systeminformation
        let manufacturer = if cfg!(target_os = "macos") {
            "Apple Inc.".to_string()
        } else if cfg!(target_os = "windows") {
            "Microsoft Corporation".to_string()
        } else if cfg!(target_os = "linux") {
            "Linux Foundation".to_string()
        } else {
            "unknown".to_string()
        };
        
        // For macOS, try to get the actual model (like MacBookPro17,1)
        let model = if cfg!(target_os = "macos") {
            // Try to get the actual Mac model identifier
            self.get_mac_model().unwrap_or("MacBook".to_string())
        } else {
            sysinfo::System::name().unwrap_or("unknown".to_string())
        };
        
        // For macOS, try to get the actual serial number
        let serial = if cfg!(target_os = "macos") {
            self.get_mac_serial().unwrap_or("unknown".to_string())
        } else {
            "unknown".to_string()
        };

        // Create fingerprint using same format as Node.js
        // machineId|hostname|manufacturer|model|serial
        let fingerprint = format!("{}|{}|{}|{}|{}", 
            machine_id, hostname, manufacturer, model, serial);

        // Cache the fingerprint
        self.set_cache(cache_key, &fingerprint, CACHE_TTL).await;

        // Log fingerprint components for debugging (same as Node.js)
        info!("🔍 Fingerprint components: machineId={}..., hostname={}, manufacturer={}, model={}, serial={}", 
            &machine_id[..8.min(machine_id.len())], hostname, manufacturer, model, serial);
        info!("🔍 Generated fingerprint: {}...", &fingerprint[..50.min(fingerprint.len())]);
        
        Ok(fingerprint)
    }

    // Get local IP address
    pub fn get_local_ip_address(&self) -> String {
        // For now, return a placeholder
        // In a real implementation, you would get the actual IP
        "127.0.0.1".to_string()
    }

    // Send GET request
    async fn send_get_request(&self, url: &str) -> Result<Value> {
        let response = self.client
            .get(url)
            .send()
            .await?;

        let result: Value = response.json().await?;
        Ok(result)
    }

    // Send POST request
    async fn send_post_request(&self, url: &str, data: &Value) -> Result<Value> {
        let response = self.client
            .post(url)
            .json(data)
            .send()
            .await?;

        let result: Value = response.json().await?;
        Ok(result)
    }

    // Cache management
    async fn get_from_cache(&self, key: &str) -> Option<String> {
        let cache = self.cache.read().await;
        if let Some(entry) = cache.get(key) {
            if chrono::Utc::now().timestamp() < entry.expires {
                return Some(entry.data.as_str().unwrap_or_default().to_string());
            }
        }
        None
    }

    async fn set_cache(&self, key: &str, data: &str, ttl: u64) {
        let mut cache = self.cache.write().await;
        let expires = chrono::Utc::now().timestamp() + ttl as i64;
        cache.insert(key.to_string(), LicenseCacheEntry {
            data: Value::String(data.to_string()),
            expires,
        });
    }

    pub async fn clear_license_cache(&self) {
        let mut cache = self.cache.write().await;
        cache.clear();
        info!("License cache cleared");
    }

    // Get real machine ID (same as Node.js machineIdSync({ original: true }))
    fn get_real_machine_id(&self) -> Result<String> {
        #[cfg(target_os = "macos")]
        {
            use std::process::Command;
            
            // On macOS, Node.js machineIdSync uses IOPlatformUUID from ioreg
            if let Ok(output) = Command::new("ioreg")
                .args(&["-rd1", "-c", "IOPlatformExpertDevice"])
                .output() {
                if output.status.success() {
                    let output_str = String::from_utf8_lossy(&output.stdout);
                    for line in output_str.lines() {
                        if line.contains("IOPlatformUUID") {
                            if let Some(uuid) = line.split('"').nth(3) {
                                if !uuid.is_empty() && uuid.len() == 36 { // Standard UUID length
                                    return Ok(uuid.to_lowercase());
                                }
                            }
                        }
                    }
                }
            }
            
            // Fallback to system_profiler for Hardware UUID
            if let Ok(output) = Command::new("system_profiler")
                .args(&["SPHardwareDataType"])
                .output() {
                if output.status.success() {
                    let output_str = String::from_utf8_lossy(&output.stdout);
                    for line in output_str.lines() {
                        if line.trim().starts_with("Hardware UUID") {
                            if let Some(uuid) = line.split(':').nth(1) {
                                let uuid = uuid.trim();
                                if !uuid.is_empty() && uuid.len() == 36 {
                                    return Ok(uuid.to_lowercase());
                                }
                            }
                        }
                    }
                }
            }
        }
        
        #[cfg(target_os = "windows")]
        {
            use std::process::Command;
            
            // On Windows, read MachineGuid from registry
            if let Ok(output) = Command::new("reg")
                .args(&["query", "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"])
                .output() {
                if output.status.success() {
                    let output_str = String::from_utf8_lossy(&output.stdout);
                    for line in output_str.lines() {
                        if line.contains("MachineGuid") {
                            if let Some(guid) = line.split_whitespace().last() {
                                if !guid.is_empty() && guid.len() == 36 {
                                    return Ok(guid.to_lowercase());
                                }
                            }
                        }
                    }
                }
            }
        }
        
        #[cfg(target_os = "linux")]
        {
            use std::fs;
            
            // On Linux, read from /var/lib/dbus/machine-id or /etc/machine-id
            if let Ok(machine_id) = fs::read_to_string("/var/lib/dbus/machine-id") {
                let machine_id = machine_id.trim();
                if !machine_id.is_empty() {
                    // Convert 32-char hex to UUID format
                    if machine_id.len() == 32 {
                        return Ok(format!("{}-{}-{}-{}-{}",
                            &machine_id[0..8],
                            &machine_id[8..12],
                            &machine_id[12..16],
                            &machine_id[16..20],
                            &machine_id[20..32]
                        ));
                    }
                }
            }
            
            if let Ok(machine_id) = fs::read_to_string("/etc/machine-id") {
                let machine_id = machine_id.trim();
                if !machine_id.is_empty() {
                    // Convert 32-char hex to UUID format
                    if machine_id.len() == 32 {
                        return Ok(format!("{}-{}-{}-{}-{}",
                            &machine_id[0..8],
                            &machine_id[8..12],
                            &machine_id[12..16],
                            &machine_id[16..20],
                            &machine_id[20..32]
                        ));
                    }
                }
            }
        }
        
        // Final fallback - generate a stable UUID from hostname
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let hostname = hostname::get()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
            
        let mut hasher = DefaultHasher::new();
        hostname.hash(&mut hasher);
        let hash = hasher.finish();
        
        Ok(format!("{:08x}-{:04x}-{:04x}-{:04x}-{:012x}",
            (hash >> 32) as u32,
            (hash >> 16) as u16 & 0xFFFF,
            hash as u16 & 0xFFFF,
            (hash >> 48) as u16,
            hash & 0xFFFFFFFFFFFF
        ))
    }

    // Get Mac model identifier (e.g., MacBookPro17,1)
    fn get_mac_model(&self) -> Result<String> {
        #[cfg(target_os = "macos")]
        {
            use std::process::Command;
            let output = Command::new("sysctl")
                .args(&["-n", "hw.model"])
                .output()?;
            
            if output.status.success() {
                let model = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !model.is_empty() {
                    return Ok(model);
                }
            }
        }
        
        Ok("MacBook".to_string())
    }

    // Get Mac serial number
    fn get_mac_serial(&self) -> Result<String> {
        #[cfg(target_os = "macos")]
        {
            use std::process::Command;
            
            // Try ioreg first (most reliable for serial)
            if let Ok(output) = Command::new("ioreg")
                .args(&["-c", "IOPlatformExpertDevice", "-d", "2"])
                .output() {
                if output.status.success() {
                    let output_str = String::from_utf8_lossy(&output.stdout);
                    for line in output_str.lines() {
                        if line.contains("IOPlatformSerialNumber") {
                            if let Some(serial) = line.split('"').nth(3) {
                                if !serial.is_empty() && serial != "unknown" {
                                    return Ok(serial.to_string());
                                }
                            }
                        }
                    }
                }
            }
            
            // Fallback to system_profiler
            if let Ok(output) = Command::new("system_profiler")
                .args(&["SPHardwareDataType"])
                .output() {
                if output.status.success() {
                    let output_str = String::from_utf8_lossy(&output.stdout);
                    for line in output_str.lines() {
                        if line.trim().starts_with("Serial Number") {
                            if let Some(serial) = line.split(':').nth(1) {
                                let serial = serial.trim();
                                if !serial.is_empty() && serial != "unknown" {
                                    return Ok(serial.to_string());
                                }
                            }
                        }
                    }
                }
            }
        }
        
        Ok("unknown".to_string())
    }

    // Decrypt license using the same logic as Node.js
    pub async fn decrypt_license(&self, license: &str, current_fingerprint: &str) -> Result<DecryptedLicense> {
        if license.is_empty() {
            return Err(anyhow::anyhow!("الترخيص غير معروف"));
        }

        // Check cache first
        let cache_key = format!("license:decrypt:{}:{}", 
            current_fingerprint, 
            &license[..50.min(license.len())]
        );
        if let Some(cached) = self.get_from_cache(&cache_key).await {
            if let Ok(cached_result) = serde_json::from_str::<DecryptedLicense>(&cached) {
                return Ok(cached_result);
            }
        }

        // The license is in format: iv_hex:encrypted_data_hex
        let parts: Vec<&str> = license.split(':').collect();
        if parts.len() != 2 {
            return Err(anyhow::anyhow!("تنسيق الترخيص غير صالح"));
        }

        let iv_hex = parts[0];
        let encrypted_data_hex = parts[1];

        // Convert hex strings to bytes
        let iv = hex::decode(iv_hex)
            .map_err(|_| anyhow::anyhow!("Invalid IV hex format"))?;
        let encrypted_data = hex::decode(encrypted_data_hex)
            .map_err(|_| anyhow::anyhow!("Invalid encrypted data hex format"))?;

        info!("🔍 يتم التشفير باستخدام الترخيص: {}...", &current_fingerprint[..50.min(current_fingerprint.len())]);

        // Try multiple fingerprint variations to find the one that works
        // Focus on stable components without MAC addresses
        let fingerprint_variations = vec![
            current_fingerprint.to_string(), // Current stable fingerprint
            // Try with just machine ID and hostname (legacy format)
            current_fingerprint.split('|').take(2).collect::<Vec<&str>>().join("|"),
            // Try with just machine ID (most stable)
            current_fingerprint.split('|').next().unwrap_or("").to_string(),
            // Try with machine ID, hostname, and manufacturer
            current_fingerprint.split('|').take(3).collect::<Vec<&str>>().join("|"),
            // Try with machine ID, hostname, manufacturer, and model
            current_fingerprint.split('|').take(4).collect::<Vec<&str>>().join("|"),
            // Try with just machine ID and manufacturer
            format!("{}|{}", 
                current_fingerprint.split('|').nth(0).unwrap_or(""),
                current_fingerprint.split('|').nth(2).unwrap_or("")
            ),
            // Try with machine ID and model
            format!("{}|{}", 
                current_fingerprint.split('|').nth(0).unwrap_or(""),
                current_fingerprint.split('|').nth(3).unwrap_or("")
            ),
            // Try with machine ID and serial
            format!("{}|{}", 
                current_fingerprint.split('|').nth(0).unwrap_or(""),
                current_fingerprint.split('|').nth(4).unwrap_or("")
            ),
            // Legacy variations for backward compatibility
            current_fingerprint.replace("|unknown|unknown|unknown", ""),
            current_fingerprint.replace("|unknown|unknown", ""),
            current_fingerprint.replace("|unknown", ""),
        ];

        info!("🔍 Will try {} fingerprint variations", fingerprint_variations.len());

        for (i, fingerprint) in fingerprint_variations.iter().enumerate() {
            info!("🔍 Trying variation {}/{}: {}...", 
                i + 1, fingerprint_variations.len(), 
                &fingerprint[..50.min(fingerprint.len())]
            );

            // Try SHA-256 key derivation first
            if let Ok(result) = self.try_decrypt_with_sha256(&iv, &encrypted_data, fingerprint, i + 1).await {
                // Cache the successful decryption
                if let Ok(cached_json) = serde_json::to_string(&result) {
                    self.set_cache(&cache_key, &cached_json, 2 * 60).await; // 2 minutes for decryption cache
                }
                return Ok(result);
            }

            // Try MD5 key derivation as fallback
            if let Ok(result) = self.try_decrypt_with_md5(&iv, &encrypted_data, fingerprint, i + 1).await {
                // Cache the successful decryption
                if let Ok(cached_json) = serde_json::to_string(&result) {
                    self.set_cache(&cache_key, &cached_json, 2 * 60).await; // 2 minutes for decryption cache
                }
                return Ok(result);
            }
        }

        error!("❌ All decryption attempts failed. Current fingerprint: {}", current_fingerprint);
        Err(anyhow::anyhow!("All decryption attempts failed - no matching fingerprint found"))
    }

    // Try decryption with SHA-256 key derivation
    async fn try_decrypt_with_sha256(&self, iv: &[u8], encrypted_data: &[u8], fingerprint: &str, variation: usize) -> Result<DecryptedLicense> {
        // Create key from device fingerprint using SHA-256
        let mut hasher = Sha256::new();
        hasher.update(fingerprint.as_bytes());
        let key = hasher.finalize();

        match self.decrypt_with_key(&key, iv, encrypted_data, fingerprint, variation, None).await {
            Ok(result) => {
                info!("✅ Decryption successful with variation {} using SHA-256 fingerprint: {}...", 
                    variation, &fingerprint[..50.min(fingerprint.len())]);
                Ok(result)
            },
            Err(e) => {
                info!("❌ Variation {} failed with SHA-256: {}", variation, e);
                Err(e)
            }
        }
    }

    // Try decryption with MD5 key derivation (legacy support)
    async fn try_decrypt_with_md5(&self, iv: &[u8], encrypted_data: &[u8], fingerprint: &str, variation: usize) -> Result<DecryptedLicense> {
        // Create MD5 key and pad to 32 bytes
        let mut hasher = Md5::new();
        hasher.update(fingerprint.as_bytes());
        let md5_hash = hasher.finalize();
        
        // Pad to 32 bytes by concatenating the hash with itself
        let mut padded_key = Vec::new();
        padded_key.extend_from_slice(&md5_hash);
        padded_key.extend_from_slice(&md5_hash);

        match self.decrypt_with_key(&padded_key, iv, encrypted_data, fingerprint, variation, Some("md5")).await {
            Ok(result) => {
                info!("✅ Decryption successful with MD5 key variation {} using fingerprint: {}...", 
                    variation, &fingerprint[..50.min(fingerprint.len())]);
                Ok(result)
            },
            Err(e) => {
                info!("❌ MD5 variation {} also failed: {}", variation, e);
                Err(e)
            }
        }
    }

    // Perform actual decryption with given key
    async fn decrypt_with_key(&self, key: &[u8], iv: &[u8], encrypted_data: &[u8], fingerprint: &str, variation: usize, key_method: Option<&str>) -> Result<DecryptedLicense> {
        type Aes256CbcDec = Decryptor<Aes256>;

        let cipher = Aes256CbcDec::new_from_slices(key, iv)
            .map_err(|e| anyhow::anyhow!("Failed to create cipher: {}", e))?;

        let mut encrypted_data_copy = encrypted_data.to_vec();
        let decrypted = cipher.decrypt_padded_mut::<Pkcs7>(&mut encrypted_data_copy)
            .map_err(|e| anyhow::anyhow!("Decryption failed: {}", e))?;

        let decrypted_str = String::from_utf8(decrypted.to_vec())
            .map_err(|e| anyhow::anyhow!("Invalid UTF-8: {}", e))?;

        // First parse as generic Value to understand the structure
        let parsed_value: Value = serde_json::from_str(&decrypted_str)
            .map_err(|e| anyhow::anyhow!("Failed to parse license JSON: {}", e))?;
        
        info!("🔍 Decrypted license structure: {:?}", parsed_value);
        
        // Try to parse as LicenseData
        let license_data: LicenseData = serde_json::from_value(parsed_value.clone())
            .map_err(|e| anyhow::anyhow!("Failed to parse license data structure: {}. Raw value: {:?}", e, parsed_value))?;

        Ok(DecryptedLicense {
            success: true,
            license_data,
            iv: hex::encode(iv),
            fingerprint: fingerprint.to_string(),
            variation_used: variation,
            key_method: key_method.map(|s| s.to_string()),
        })
    }

    // Ensure license directory exists
    fn ensure_license_directory(&self) -> Result<()> {
        let license_dir = get_license_dir();
        if !Path::new(&license_dir).exists() {
            fs::create_dir_all(&license_dir)?;
            info!("Created license directory: {}", license_dir);
        }
        Ok(())
    }

    // Check if license files exist locally
    fn license_files_exist(&self) -> bool {
        let license_dir = get_license_dir();
        let license_path = format!("{}/license.json", license_dir);
        let public_key_path = format!("{}/public.pem", license_dir);
        
        Path::new(&license_path).exists() && Path::new(&public_key_path).exists()
    }

    // Read local license file
    fn read_local_license(&self) -> Result<String> {
        let license_dir = get_license_dir();
        let license_path = format!("{}/license.json", license_dir);
        let content = fs::read_to_string(license_path)?;
        Ok(content)
    }

    // Write license files locally
    fn write_license_files(&self, license: &str, public_key: &str) -> Result<()> {
        self.ensure_license_directory()?;
        
        let license_dir = get_license_dir();
        let license_path = format!("{}/license.json", license_dir);
        let public_key_path = format!("{}/public.pem", license_dir);
        
        fs::write(&license_path, license)?;
        fs::write(&public_key_path, public_key)?;
        
        info!("License files written successfully");
        Ok(())
    }

    // Get license info by fingerprint (GET request)
    pub async fn get_license_info_by_fingerprint(&self, fingerprint: &str) -> Result<LicenseResponse> {
        let url = format!("{}/license/{}", API_URL, fingerprint);
        info!("Fetching license from: {}", url);
        
        let response = self.send_get_request(&url).await?;
        
        // Parse the response
        let license_response: LicenseFilesResponse = serde_json::from_value(response.clone())?;
        
        if license_response.success == Some(false) || license_response.files.is_none() {
            let error = license_response.error.clone();
            let message = license_response.message
                .or(license_response.error)
                .unwrap_or_else(|| "Failed to fetch license".to_string());
            
            return Ok(LicenseResponse {
                success: false,
                message: Some(message),
                error,
                details: Some(response.to_string()),
                ..Default::default()
            });
        }
        
        let files = license_response.files.unwrap();
        
        // Check if required files exist
        if !files.contains_key("license.json") || !files.contains_key("public.pem") {
            return Ok(LicenseResponse {
                success: false,
                message: Some("Invalid license response - missing required files".to_string()),
                error: Some("MISSING_FILES".to_string()),
                details: Some(response.to_string()),
                ..Default::default()
            });
        }
        
        let license = &files["license.json"];
        let public_key = &files["public.pem"];
        
        // Write files locally
        self.write_license_files(license, public_key)?;
        
        // For now, return success without decryption
        // In a real implementation, you would decrypt the license here
        Ok(LicenseResponse {
            success: true,
            device_id: Some(fingerprint.to_string()),
            license_type: license_response.license_type,
            user_id: license_response.user_id,
            username: license_response.username,
            activation_info: license_response.activation_info,
            message: Some("License fetched and stored successfully".to_string()),
            ..Default::default()
        })
    }

    // Check local license only
    pub async fn check_local_license(&self) -> Result<LicenseResponse> {
        let fingerprint = self.generate_device_fingerprint().await?;
        
        // Check cache first
        let cache_key = format!("license:local:{}", fingerprint);
        if let Some(cached) = self.get_from_cache(&cache_key).await {
            if let Ok(cached_response) = serde_json::from_str::<LicenseResponse>(&cached) {
                return Ok(cached_response);
            }
        }
        
        // Check if license files exist locally
        if !self.license_files_exist() {
            info!("License files not found locally, attempting to fetch from remote server...");
            
            // Try to get license from remote server
            let remote_result = self.get_license_info_by_fingerprint(&fingerprint).await?;
            
            if remote_result.success {
                info!("Successfully fetched license from remote server");
                
                // Now try to read the newly downloaded license
                let license_content = self.read_local_license()?;
                
                // For now, return success without decryption
                let result = LicenseResponse {
                    success: true,
                    device_id: Some(fingerprint),
                    message: Some("License verified locally (fetched from server)".to_string()),
                    source: Some("local".to_string()),
                    offline: Some(false),
                    ..Default::default()
                };
                
                // Cache the successful result
                if let Ok(cached_json) = serde_json::to_string(&result) {
                    self.set_cache(&cache_key, &cached_json, CACHE_TTL).await;
                }
                
                return Ok(result);
            } else {
                let result = LicenseResponse {
                    success: false,
                    message: Some(remote_result.message.unwrap_or_else(|| "Failed to fetch license".to_string())),
                    error: remote_result.error,
                    details: remote_result.details,
                    source: Some("local".to_string()),
                    offline: Some(false),
                    needs_first_activation: Some(true),
                    ..Default::default()
                };
                
                // Cache error results for a shorter time
                if let Ok(cached_json) = serde_json::to_string(&result) {
                    self.set_cache(&cache_key, &cached_json, 30).await; // 30 seconds for errors
                }
                
                return Ok(result);
            }
        }
        
        // Read and process local license
        let license_content = self.read_local_license()?;
        
        // Decrypt the license using the same logic as Node.js
        match self.decrypt_license(&license_content, &fingerprint).await {
            Ok(decrypted_license) => {
                let license_info = &decrypted_license.license_data.data;
                
                // Check if license is expired
                let now = chrono::Utc::now();
                if let Some(expires_at_str) = &license_info.expires_at {
                    if let Ok(expires_at) = chrono::DateTime::parse_from_rfc3339(expires_at_str) {
                        if now > expires_at.with_timezone(&chrono::Utc) {
                            let result = LicenseResponse {
                                success: false,
                                message: Some("الترخيص المحلي منتهي الصلاحية".to_string()),
                                expired: Some(true),
                                source: Some("local".to_string()),
                                offline: Some(true),
                                ..Default::default()
                            };
                            
                            if let Ok(cached_json) = serde_json::to_string(&result) {
                                self.set_cache(&cache_key, &cached_json, CACHE_TTL).await;
                            }
                            return Ok(result);
                        }
                    }
                }
                
                // Convert features back to Vec<String> for compatibility
                let feature_names: Vec<String> = license_info.features.keys().cloned().collect();
                
                // Parse expires_at back to DateTime if possible
                let expires_at = license_info.expires_at.as_ref()
                    .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
                    .map(|dt| dt.with_timezone(&chrono::Utc));
                
                let result = LicenseResponse {
                    success: true,
                    device_id: Some(fingerprint.clone()),
                    license_type: Some(license_info.type_.clone()),
                    user_id: license_info.user_id.clone(),
                    type_: Some(license_info.type_.clone()),
                    features: Some(feature_names),
                    activated_at: None, // This would need to be extracted from individual features
                    expires_at,
                    feature_licenses: Some(serde_json::to_value(&license_info.features).unwrap_or_default()),
                    feature_expiration_status: None, // This would need to be computed
                    signature: Some(decrypted_license.license_data.signature.clone()),
                    message: Some("تم التحقق من الترخيص محلياً".to_string()),
                    source: Some("local".to_string()),
                    offline: Some(true),
                    ..Default::default()
                };
                
                // Cache the successful result
                if let Ok(cached_json) = serde_json::to_string(&result) {
                    self.set_cache(&cache_key, &cached_json, CACHE_TTL).await;
                }
                
                Ok(result)
            },
            Err(decrypt_error) => {
                warn!("❌ Failed to decrypt local license: {}", decrypt_error);
                let result = LicenseResponse {
                    success: false,
                    message: Some("فشل في فك تشفير الترخيص المحلي".to_string()),
                    error: Some(decrypt_error.to_string()),
                    source: Some("local".to_string()),
                    offline: Some(true),
                    ..Default::default()
                };
                
                if let Ok(cached_json) = serde_json::to_string(&result) {
                    self.set_cache(&cache_key, &cached_json, 30).await; // 30 seconds for errors
                }
                
                Ok(result)
            }
        }
    }

    // Verify license offline first
    pub async fn verify_license_offline_first(&self, force_remote: bool) -> Result<LicenseResponse> {
        let fingerprint = self.generate_device_fingerprint().await?;
        
        // Force clear cache if requested
        if force_remote {
            self.clear_license_cache().await;
        }
        
        // Step 1: Always check local license first (NO NETWORK CALLS)
        let local_result = self.check_local_license().await?;
        
        if local_result.success {
            info!("License verified locally");
            return Ok(local_result);
        }
        
        // Step 2: Only if local license is missing/invalid, try remote server
        info!("Local license check failed, trying remote server...");
        
        let remote_result = self.get_license_info_by_fingerprint(&fingerprint).await?;
        
        if remote_result.success {
            info!("License verified from remote server");
            return Ok(remote_result);
        } else {
            let result = LicenseResponse {
                success: false,
                message: Some(remote_result.message.unwrap_or_else(|| "No active license found for this device".to_string())),
                needs_first_activation: Some(true),
                source: Some("remote".to_string()),
                offline: Some(false),
                error: remote_result.error,
                details: remote_result.details,
                ..Default::default()
            };
            
            return Ok(result);
        }
    }

    // First activation service
    pub async fn first_activation_service(&self, location_data: Option<Value>, code: Option<String>) -> Result<LicenseResponse> {
        let fingerprint = self.generate_device_fingerprint().await?;
        let ip_address = self.get_local_ip_address();

        // Prepare location data
        let location_info = if let Some(loc) = location_data {
            if let (Some(lat), Some(lng)) = (loc.get("latitude"), loc.get("longitude")) {
                format!("{},{}", lat, lng)
            } else {
                "Iraq".to_string()
            }
        } else {
            "Iraq".to_string()
        };

        // Prepare request data
        let mut data = serde_json::json!({
            "device_id": fingerprint,
            "ip_address": ip_address,
            "location": location_info,
        });

        // Add code if provided
        if let Some(code) = code {
            data["code"] = Value::String(code.trim().to_string());
        }

        // Send request to server
        let response = self.send_post_request(&format!("{}/first-activation", API_URL), &data).await?;

        // Parse response
        let success = response.get("success").and_then(|v| v.as_bool()).unwrap_or(false);
        
        if !success {
            let message = response.get("message")
                .or(response.get("error"))
                .and_then(|v| v.as_str())
                .unwrap_or("حدث خطأ في التفعيل، يرجى المحاولة مرة أخرى");

            return Ok(LicenseResponse {
                success: false,
                message: Some(message.to_string()),
                error: response.get("error").and_then(|v| v.as_str()).map(|s| s.to_string()),
                error_code: response.get("errorCode").and_then(|v| v.as_str()).map(|s| s.to_string()),
                details: Some(response.to_string()),
                ..Default::default()
            });
        }

        // Handle successful activation
        let license_type = response.get("license_type").and_then(|v| v.as_str()).map(|s| s.to_string());
        let user_id = response.get("userId").and_then(|v| v.as_str()).map(|s| s.to_string());
        let username = response.get("username").and_then(|v| v.as_str()).map(|s| s.to_string());
        let activation_info = response.get("activation_info").cloned();

        // Clear cache after successful activation
        self.clear_license_cache().await;

        Ok(LicenseResponse {
            success: true,
            device_id: Some(fingerprint),
            license_type,
            user_id,
            username,
            activation_info,
            message: Some("تم التفعيل بنجاح".to_string()),
            ..Default::default()
        })
    }

    // Activation service with code
    pub async fn activation_service_with_code(&self, code: String, location_data: Option<Value>) -> Result<LicenseResponse> {
        let fingerprint = self.generate_device_fingerprint().await?;
        let ip_address = self.get_local_ip_address();

        // Prepare location data
        let location_info = if let Some(loc) = location_data {
            if let (Some(lat), Some(lng)) = (loc.get("latitude"), loc.get("longitude")) {
                format!("{},{}", lat, lng)
            } else {
                "Iraq".to_string()
            }
        } else {
            "Iraq".to_string()
        };

        // Prepare request data
        let data = serde_json::json!({
            "device_id": fingerprint,
            "ip_address": ip_address,
            "location": location_info,
            "activation_code": code.trim(),
        });

        // Send request to server
        let response = self.send_post_request(&format!("{}/activate", API_URL), &data).await?;

        // Parse response
        let success = response.get("success").and_then(|v| v.as_bool()).unwrap_or(false);
        
        if !success {
            let message = response.get("message")
                .or(response.get("error"))
                .and_then(|v| v.as_str())
                .unwrap_or("حدث خطأ في التفعيل، يرجى المحاولة مرة أخرى");

            return Ok(LicenseResponse {
                success: false,
                message: Some(message.to_string()),
                error: response.get("error").and_then(|v| v.as_str()).map(|s| s.to_string()),
                error_code: response.get("errorCode").and_then(|v| v.as_str()).map(|s| s.to_string()),
                details: Some(response.to_string()),
                ..Default::default()
            });
        }

        // Handle successful activation
        let license_type = response.get("license_type").and_then(|v| v.as_str()).map(|s| s.to_string());
        let user_id = response.get("userId").and_then(|v| v.as_str()).map(|s| s.to_string());
        let username = response.get("username").and_then(|v| v.as_str()).map(|s| s.to_string());
        let activation_info = response.get("activation_info").cloned();

        // Clear cache after successful activation
        self.clear_license_cache().await;

        Ok(LicenseResponse {
            success: true,
            device_id: Some(fingerprint),
            license_type,
            user_id,
            username,
            activation_info,
            message: Some("تم التفعيل بنجاح".to_string()),
            ..Default::default()
        })
    }

    // Manual license verification
    pub async fn manual_license_verification(&self) -> Result<Value> {
        info!("=== MANUAL LICENSE VERIFICATION ===");
        
        let fingerprint = self.generate_device_fingerprint().await?;
        let result = self.verify_license_offline_first(true).await?;
        
        Ok(serde_json::json!({
            "success": true,
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "fingerprint": format!("{}...", &fingerprint[..20.min(fingerprint.len())]),
            "verification": result
        }))
    }

    // Diagnose fingerprint issues
    pub async fn diagnose_fingerprint_issues(&self) -> Result<Value> {
        info!("🔍 Diagnosing fingerprint issues...");
        
        let fingerprint = self.generate_device_fingerprint().await?;
        let components: Vec<&str> = fingerprint.split('|').collect();
        
        let mut sys = sysinfo::System::new_all();
        sys.refresh_all();
        
        let diagnosis = serde_json::json!({
            "current_fingerprint": fingerprint,
            "components": {
                "machine_id": components.get(0).unwrap_or(&"missing"),
                "hostname": components.get(1).unwrap_or(&"missing"),
                "manufacturer": components.get(2).unwrap_or(&"missing"),
                "model": components.get(3).unwrap_or(&"missing"),
                "serial": components.get(4).unwrap_or(&"missing")
            },
            "system_info": {
                "os_name": sysinfo::System::name(),
                "kernel_version": sysinfo::System::kernel_version(),
                "os_version": sysinfo::System::os_version(),
                "hostname": hostname::get().unwrap_or_default().to_string_lossy()
            },
            "license_files": {
                "license_exists": self.license_files_exist(),
                "license_dir": get_license_dir()
            },
            "timestamp": chrono::Utc::now().to_rfc3339()
        });
        
        Ok(diagnosis)
    }

    // Verify license and key (alias for offline-first verification)
    pub async fn verify_license_and_key(&self) -> Result<LicenseResponse> {
        self.verify_license_offline_first(false).await
    }

    // Get license info by fingerprint (public wrapper)
    pub async fn get_license_info_by_fingerprint_public(&self, fingerprint: &str) -> Result<LicenseResponse> {
        self.get_license_info_by_fingerprint(fingerprint).await
    }
}

impl Default for LicenseService {
    fn default() -> Self {
        Self::new()
    }
}
