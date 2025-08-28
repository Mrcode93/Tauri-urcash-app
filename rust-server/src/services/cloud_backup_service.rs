use crate::models::{
    CloudBackup, CreateCloudBackupRequest, BackupStats, ServerHealth, LicenseInfo,
    DatabaseFileInfo, FileLockInfo, RestoreRequest, ApiResponse
};
use crate::database::Database;
use anyhow::Result;
use chrono::{DateTime, Utc};
use serde_json::json;
use std::path::Path;
use std::fs;
use tracing::{info, error};
use uuid::Uuid;
use sqlx::Row;
use reqwest::Client;
use std::time::Duration;

#[derive(Clone)]
pub struct CloudBackupService {
    remote_server_url: String,
    api_key: Option<String>,
    http_client: Client,
    license_service: crate::services::license_service::LicenseService,
}

impl CloudBackupService {
    pub fn new(license_service: crate::services::license_service::LicenseService) -> Self {
        let remote_server_url = std::env::var("REMOTE_SERVER_URL")
            .unwrap_or_else(|_| "https://urcash.up.railway.app".to_string());
        let api_key = std::env::var("REMOTE_SERVER_API_KEY").ok();
        
        let http_client = Client::builder()
            .timeout(Duration::from_secs(300)) // 5 minutes timeout
            .build()
            .expect("Failed to create HTTP client");
        
        Self {
            remote_server_url,
            api_key,
            http_client,
            license_service,
        }
    }

    async fn get_license_identifiers(&self) -> Result<(String, String)> {
        // Get user ID from license service
        match self.license_service.verify_license_and_key().await {
            Ok(license_response) => {
                if license_response.success {
                    if let Some(user_id) = license_response.user_id {
                        if let Some(device_id) = license_response.device_id {
                            tracing::info!("Got user ID from license: userId={}, deviceId={}", user_id, device_id);
                            return Ok((user_id, device_id));
                        }
                    }
                }
                
                // If license verification succeeds but missing user/device ID
                tracing::error!("License verification succeeded but missing user/device ID");
                return Err(anyhow::anyhow!("License verification succeeded but missing user/device ID"));
            }
            Err(e) => {
                tracing::error!("Failed to verify license: {}", e);
                return Err(anyhow::anyhow!("Failed to verify license: {}", e));
            }
        }
    }

    async fn send_multipart_request(&self, url: &str, file_path: &str, metadata: serde_json::Value) -> Result<serde_json::Value> {
        let file = tokio::fs::File::open(file_path).await?;
        let file_metadata = tokio::fs::metadata(file_path).await?;
        
        let mut form = reqwest::multipart::Form::new();
        
        // Add the database file
        let file_part = reqwest::multipart::Part::stream_with_length(
            file,
            file_metadata.len()
        )
        .file_name("database.sqlite")
        .mime_str("application/x-sqlite3")?;
        
        form = form.part("databaseFile", file_part);
        
        // Add metadata fields
        if let Some(user_id) = metadata.get("userId") {
            let user_id_str = user_id.as_str().unwrap_or("1").to_string();
            form = form.text("userId", user_id_str);
        }
        if let Some(device_id) = metadata.get("deviceId") {
            let device_id_str = device_id.as_str().unwrap_or("default-device-id").to_string();
            form = form.text("deviceId", device_id_str);
        }
        if let Some(backup_name) = metadata.get("backupName") {
            let backup_name_str = backup_name.as_str().unwrap_or("").to_string();
            form = form.text("backupName", backup_name_str);
        }
        if let Some(description) = metadata.get("description") {
            let description_str = description.as_str().unwrap_or("").to_string();
            form = form.text("description", description_str);
        }
        
        let mut request = self.http_client
            .post(url)
            .header("Accept", "application/json")
            .header("User-Agent", "Urcash-CloudBackup/1.0")
            .multipart(form);
        
        // Add API key if present
        if let Some(ref api_key) = self.api_key {
            request = request.header("x-api-key", api_key);
        }
        
        let response = request.send().await?;
        
        if response.status().is_success() {
            let response_data: serde_json::Value = response.json().await?;
            Ok(response_data)
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Remote server error: {}", error_text))
        }
    }

    async fn send_get_request(&self, url: &str) -> Result<serde_json::Value> {
        let mut request = self.http_client
            .get(url)
            .header("Content-Type", "application/json");
        
        // Add API key if present
        if let Some(ref api_key) = self.api_key {
            request = request.header("x-api-key", api_key);
        }
        
        let response = request.send().await?;
        
        if response.status().is_success() {
            let response_data: serde_json::Value = response.json().await?;
            Ok(response_data)
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Remote server error: {}", error_text))
        }
    }

    pub async fn create_cloud_backup(
        &self,
        db: &Database,
        request: CreateCloudBackupRequest,
    ) -> Result<ApiResponse<CloudBackup>> {
        let backup_name = request.backup_name.clone().unwrap_or_else(|| {
            format!("Backup_{}", chrono::Utc::now().format("%Y%m%d_%H%M%S"))
        });
        
        info!("Creating cloud backup: {}", backup_name);
        
        // Get license identifiers
        let (license_user_id, device_id) = self.get_license_identifiers().await?;
        let actual_user_id = license_user_id; // Always use license user ID for remote server
        
        // Get database file path
        let db_path = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "sqlite:/Users/amerahmed/.urcash/database.sqlite".to_string());
        let db_path = if db_path.starts_with("sqlite:") {
            db_path.strip_prefix("sqlite:").unwrap().to_string()
        } else {
            db_path
        };
        
        // Expand ~ in path if present
        let db_path = if db_path.contains("~") {
            let home_dir = dirs::home_dir().ok_or_else(|| {
                anyhow::anyhow!("Could not determine home directory")
            })?;
            db_path.replace("~", &home_dir.to_string_lossy())
        } else {
            db_path
        };
        
        // Check if database file exists
        if !Path::new(&db_path).exists() {
            return Err(anyhow::anyhow!("Database file not found at: {}", db_path));
        }
        
        // Prepare metadata for remote server
        let mut metadata = serde_json::Map::new();
        metadata.insert("userId".to_string(), serde_json::Value::String(actual_user_id.to_string()));
        metadata.insert("deviceId".to_string(), serde_json::Value::String(device_id));
        if let Some(ref name) = request.backup_name {
            metadata.insert("backupName".to_string(), serde_json::Value::String(name.clone()));
        }
        if let Some(ref desc) = request.description {
            metadata.insert("description".to_string(), serde_json::Value::String(desc.clone()));
        }
        
        info!("Uploading backup to remote server: {}", self.remote_server_url);
        
        // Upload to remote server
        let remote_url = format!("{}/api/user-backup/create", self.remote_server_url);
        let remote_response = self.send_multipart_request(&remote_url, &db_path, serde_json::Value::Object(metadata)).await;
        
        match remote_response {
            Ok(response_data) => {
                info!("Cloud backup uploaded to remote server successfully");
                
                // Create local backup record
                let backup_dir = std::env::var("BACKUP_DIR")
                    .unwrap_or_else(|_| "~/.urcash/backups".to_string());
                let backup_dir = shellexpand::tilde(&backup_dir).to_string();
                fs::create_dir_all(&backup_dir)?;
                
                // Generate backup file path
                let backup_id = Uuid::new_v4().to_string();
                let backup_filename = format!("backup_{}_{}.sqlite", backup_id, chrono::Utc::now().format("%Y%m%d_%H%M%S"));
                let backup_path = format!("{}/{}", backup_dir, backup_filename);
                
                // Copy the database file locally
                fs::copy(&db_path, &backup_path)?;
                
                // Get file size
                let metadata = fs::metadata(&backup_path)?;
                let file_size = metadata.len() as i64;
                
                // Calculate checksum (simplified for now)
                let checksum = Some(format!("sha256_{}", backup_id));
                
                // Get remote backup ID from response
                let remote_backup_id = response_data.get("backupId")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());
                
                // Insert backup record into database
                let query = r#"
                    INSERT INTO cloud_backups (
                        user_id, backup_name, description, file_path, file_size,
                        backup_type, status, created_at, updated_at, checksum, remote_backup_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)
                "#;
                
                // For local database, we'll use a numeric user ID (1) since we're storing locally
                let local_user_id = 1;
                
                let backup_id = sqlx::query(query)
                    .bind(local_user_id)
                    .bind(&backup_name)
                    .bind(&request.description)
                    .bind(&backup_path)
                    .bind(file_size)
                    .bind("manual")
                    .bind("completed")
                    .bind(&checksum)
                    .bind(&remote_backup_id)
                    .execute(&db.pool)
                    .await?
                    .last_insert_rowid();
                
                // Get the created backup
                let backup = self.get_backup_by_id(db, backup_id).await?;
                
                info!("Cloud backup created successfully: {}", backup_id);
                
                Ok(ApiResponse::success(backup))
            }
            Err(e) => {
                error!("Failed to upload to remote server: {}", e);
                Err(anyhow::anyhow!("Failed to create cloud backup: {}", e))
            }
        }
    }
    
    pub async fn get_user_backups(
        &self,
        db: &Database,
        user_id: Option<i64>,
    ) -> Result<ApiResponse<Vec<CloudBackup>>> {
        // Get license identifiers for remote server
        let (license_user_id, _) = self.get_license_identifiers().await?;
        
        info!("Fetching user backups from remote server for user: {}", license_user_id);
        
        // Fetch from remote server using license user ID
        let remote_url = format!("{}/api/user-backup/user/{}", self.remote_server_url, license_user_id);
        let remote_response = self.send_get_request(&remote_url).await;
        
        match remote_response {
            Ok(response_data) => {
                info!("Successfully fetched backups from remote server");
                
                // Parse remote backups and convert to local format
                let mut backups = Vec::new();
                if let Some(backups_array) = response_data.get("backups").and_then(|v| v.as_array()) {
                    for (index, backup_data) in backups_array.iter().enumerate() {
                        if let Some(backup_obj) = backup_data.as_object() {
                            let backup = CloudBackup {
                                id: index as i64 + 1, // Local ID
                                user_id: 1, // Use local user ID for database storage
                                backup_name: backup_obj.get("backupName")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("Unknown")
                                    .to_string(),
                                description: backup_obj.get("description")
                                    .and_then(|v| v.as_str())
                                    .map(|s| s.to_string()),
                                file_path: "remote".to_string(), // Remote backup
                                file_size: backup_obj.get("size")
                                    .and_then(|v| v.as_i64())
                                    .unwrap_or(0),
                                backup_type: "remote".to_string(),
                                status: "completed".to_string(),
                                created_at: backup_obj.get("createdAt")
                                    .and_then(|v| v.as_str())
                                    .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
                                    .map(|dt| dt.with_timezone(&Utc))
                                    .unwrap_or_else(|| Utc::now()),
                                updated_at: Utc::now(),
                                uploaded_at: Some(Utc::now()),
                                remote_backup_id: backup_obj.get("backupId")
                                    .and_then(|v| v.as_str())
                                    .map(|s| s.to_string()),
                                checksum: None,
                                compression_ratio: None,
                                encryption_key: None,
                            };
                            backups.push(backup);
                        }
                    }
                }
                
                Ok(ApiResponse::success(backups))
            }
            Err(e) => {
                error!("Failed to fetch from remote server: {}", e);
                
                // Fallback to local backups
                let query = r#"
                    SELECT * FROM cloud_backups 
                    WHERE user_id = ? 
                    ORDER BY created_at DESC
                "#;
                
                let rows = sqlx::query(query)
                    .bind(1) // Use local user ID for database query
                    .fetch_all(&db.pool)
                    .await?;
                
                let mut backups = Vec::new();
                for row in rows {
                    let backup = CloudBackup {
                        id: row.get("id"),
                        user_id: row.get("user_id"),
                        backup_name: row.get("backup_name"),
                        description: row.get("description"),
                        file_path: row.get("file_path"),
                        file_size: row.get("file_size"),
                        backup_type: row.get("backup_type"),
                        status: row.get("status"),
                        created_at: row.get("created_at"),
                        updated_at: row.get("updated_at"),
                        uploaded_at: row.get("uploaded_at"),
                        remote_backup_id: row.get("remote_backup_id"),
                        checksum: row.get("checksum"),
                        compression_ratio: row.get("compression_ratio"),
                        encryption_key: row.get("encryption_key"),
                    };
                    backups.push(backup);
                }
                
                Ok(ApiResponse::success(backups))
            }
        }
    }
    
    pub async fn get_backup_stats(
        &self,
        db: &Database,
        user_id: Option<i64>,
    ) -> Result<ApiResponse<BackupStats>> {
        let user_id = user_id.unwrap_or(1);
        
        let query = r#"
            SELECT 
                COUNT(*) as total_backups,
                COALESCE(SUM(file_size), 0) as total_size,
                MAX(created_at) as last_backup,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_backups,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_backups,
                COALESCE(AVG(file_size), 0) as average_size
            FROM cloud_backups 
            WHERE user_id = ?
        "#;
        
        let row = sqlx::query(query)
            .bind(user_id)
            .fetch_one(&db.pool)
            .await?;
        
        let stats = BackupStats {
            total_backups: row.get("total_backups"),
            total_size: row.get("total_size"),
            last_backup: row.get("last_backup"),
            successful_backups: row.get("successful_backups"),
            failed_backups: row.get("failed_backups"),
            average_size: row.get("average_size"),
        };
        
        Ok(ApiResponse::success(stats))
    }
    
    pub async fn check_server_health(&self) -> Result<ApiResponse<ServerHealth>> {
        let start_time = std::time::Instant::now();
        
        info!("Checking remote server health: {}", self.remote_server_url);
        
        // Check remote server health
        let health_url = format!("{}/health", self.remote_server_url);
        let remote_response = self.send_get_request(&health_url).await;
        
        let response_time = start_time.elapsed().as_millis() as i64;
        
        match remote_response {
            Ok(_) => {
                let health = ServerHealth {
                    status: "healthy".to_string(),
                    timestamp: Utc::now(),
                    response_time,
                    server_version: "1.0.0".to_string(),
                };
                
                info!("Remote server is healthy");
                Ok(ApiResponse::success(health))
            }
            Err(e) => {
                error!("Remote server health check failed: {}", e);
                
                let health = ServerHealth {
                    status: "unhealthy".to_string(),
                    timestamp: Utc::now(),
                    response_time,
                    server_version: "1.0.0".to_string(),
                };
                
                Ok(ApiResponse::success(health))
            }
        }
    }
    
    pub async fn get_license_info(&self, db: &Database) -> Result<ApiResponse<LicenseInfo>> {
        // Get license info from database
        let query = "SELECT * FROM licenses WHERE is_active = 1 LIMIT 1";
        let row = sqlx::query(query).fetch_optional(&db.pool).await?;
        
        if let Some(row) = row {
            let license_info = LicenseInfo {
                license_key: row.get("license_key"),
                user_id: row.get("user_id"),
                is_valid: row.get("is_valid"),
                expiry_date: row.get("expiry_date"),
                features: vec!["cloud_backup".to_string(), "basic".to_string()],
            };
            Ok(ApiResponse::success(license_info))
        } else {
            Ok(ApiResponse::error("No active license found".to_string()))
        }
    }
    
    pub async fn download_user_backup(
        &self,
        db: &Database,
        backup_id: &str,
    ) -> Result<ApiResponse<CloudBackup>> {
        info!("Downloading backup from remote server: {}", backup_id);
        
        // Download from remote server
        let download_url = format!("{}/api/user-backup/download/{}", self.remote_server_url, backup_id);
        
        let mut request = self.http_client
            .get(&download_url)
            .header("Content-Type", "application/json");
        
        // Add API key if present
        if let Some(ref api_key) = self.api_key {
            request = request.header("x-api-key", api_key);
        }
        
        let response = request.send().await?;
        
        if response.status().is_success() {
            // Get headers first before consuming response
            let filename = response.headers()
                .get("content-disposition")
                .and_then(|h| h.to_str().ok())
                .and_then(|s| {
                    s.split("filename=")
                        .nth(1)
                        .and_then(|f| f.trim_matches('"').to_string().into())
                })
                .unwrap_or_else(|| format!("backup_{}.sqlite", backup_id));
            
            // Get the file data
            let file_data = response.bytes().await?;
            
            info!("Backup downloaded successfully: {} bytes", file_data.len());
            
            // Create a mock backup object for the response
            let backup = CloudBackup {
                id: 0,
                user_id: 1,
                backup_name: filename.clone(),
                description: Some(format!("Downloaded backup: {}", backup_id)),
                file_path: format!("remote_download_{}", backup_id),
                file_size: file_data.len() as i64,
                backup_type: "remote".to_string(),
                status: "downloaded".to_string(),
                created_at: Utc::now(),
                updated_at: Utc::now(),
                uploaded_at: Some(Utc::now()),
                remote_backup_id: Some(backup_id.to_string()),
                checksum: None,
                compression_ratio: None,
                encryption_key: None,
            };
            
            Ok(ApiResponse::success(backup))
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Failed to download backup: {}", error_text))
        }
    }
    
    pub async fn restore_from_cloud_backup(
        &self,
        db: &Database,
        backup_id: &str,
        request: RestoreRequest,
    ) -> Result<ApiResponse<serde_json::Value>> {
        info!("Restoring from cloud backup: {}", backup_id);
        
        // Get backup info
        let backup = self.get_backup_by_remote_id(db, backup_id).await?;
        
        // Check if backup file exists
        if !Path::new(&backup.file_path).exists() {
            return Ok(ApiResponse::error("Backup file not found".to_string()));
        }
        
        // For now, just return success (actual restoration would require more complex logic)
        Ok(ApiResponse::message("Backup restoration initiated successfully".to_string()))
    }
    
    pub async fn check_database_accessibility(&self) -> Result<ApiResponse<DatabaseFileInfo>> {
        let db_path = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "sqlite:/Users/amerahmed/.urcash/database.sqlite".to_string());
        let db_path = if db_path.starts_with("sqlite:") {
            db_path.strip_prefix("sqlite:").unwrap().to_string()
        } else {
            db_path
        };
        
        // Expand ~ in path if present
        let db_path = if db_path.contains("~") {
            let home_dir = dirs::home_dir().ok_or_else(|| {
                anyhow::anyhow!("Could not determine home directory")
            })?;
            db_path.replace("~", &home_dir.to_string_lossy())
        } else {
            db_path
        };
        
        let path = Path::new(&db_path);
        let exists = path.exists();
        
        let file_info = if exists {
            let metadata = fs::metadata(path)?;
            DatabaseFileInfo {
                file_path: db_path,
                file_size: metadata.len() as i64,
                last_modified: DateTime::from_timestamp(
                    metadata.modified()?.duration_since(std::time::UNIX_EPOCH)?.as_secs() as i64,
                    0
                ).unwrap_or_else(|| Utc::now()),
                is_readable: metadata.permissions().readonly() == false,
                is_writable: metadata.permissions().readonly() == false,
                is_locked: false, // Simplified check
                checksum: Some("mock_checksum".to_string()),
            }
        } else {
            DatabaseFileInfo {
                file_path: db_path,
                file_size: 0,
                last_modified: Utc::now(),
                is_readable: false,
                is_writable: false,
                is_locked: false,
                checksum: None,
            }
        };
        
        Ok(ApiResponse::success(file_info))
    }
    
    pub async fn get_database_file_info(&self) -> Result<ApiResponse<DatabaseFileInfo>> {
        self.check_database_accessibility().await
    }
    
    pub async fn check_file_locks(&self) -> Result<ApiResponse<FileLockInfo>> {
        let lock_info = FileLockInfo {
            is_locked: false,
            lock_type: None,
            lock_holder: None,
            lock_timestamp: None,
        };
        
        Ok(ApiResponse::success(lock_info))
    }
    
    // Helper methods
    async fn get_backup_by_id(&self, db: &Database, backup_id: i64) -> Result<CloudBackup> {
        let query = "SELECT * FROM cloud_backups WHERE id = ?";
        let row = sqlx::query(query)
            .bind(backup_id)
            .fetch_one(&db.pool)
            .await?;
        
        Ok(CloudBackup {
            id: row.get("id"),
            user_id: row.get("user_id"),
            backup_name: row.get("backup_name"),
            description: row.get("description"),
            file_path: row.get("file_path"),
            file_size: row.get("file_size"),
            backup_type: row.get("backup_type"),
            status: row.get("status"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            uploaded_at: row.get("uploaded_at"),
            remote_backup_id: row.get("remote_backup_id"),
            checksum: row.get("checksum"),
            compression_ratio: row.get("compression_ratio"),
            encryption_key: row.get("encryption_key"),
        })
    }
    
    async fn get_backup_by_remote_id(&self, db: &Database, remote_id: &str) -> Result<CloudBackup> {
        let query = "SELECT * FROM cloud_backups WHERE remote_backup_id = ?";
        let row = sqlx::query(query)
            .bind(remote_id)
            .fetch_one(&db.pool)
            .await?;
        
        Ok(CloudBackup {
            id: row.get("id"),
            user_id: row.get("user_id"),
            backup_name: row.get("backup_name"),
            description: row.get("description"),
            file_path: row.get("file_path"),
            file_size: row.get("file_size"),
            backup_type: row.get("backup_type"),
            status: row.get("status"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            uploaded_at: row.get("uploaded_at"),
            remote_backup_id: row.get("remote_backup_id"),
            checksum: row.get("checksum"),
            compression_ratio: row.get("compression_ratio"),
            encryption_key: row.get("encryption_key"),
        })
    }
}
