use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct CloudBackup {
    pub id: i64,
    pub user_id: i64,
    pub backup_name: String,
    pub description: Option<String>,
    pub file_path: String,
    pub file_size: i64,
    pub backup_type: String, // 'manual', 'auto', 'system'
    pub status: String, // 'pending', 'completed', 'failed', 'uploading'
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub uploaded_at: Option<DateTime<Utc>>,
    pub remote_backup_id: Option<String>,
    pub checksum: Option<String>,
    pub compression_ratio: Option<f64>,
    pub encryption_key: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCloudBackupRequest {
    pub user_id: Option<i64>,
    pub backup_name: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CloudBackupResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<CloudBackup>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupStats {
    pub total_backups: i64,
    pub total_size: i64,
    pub last_backup: Option<DateTime<Utc>>,
    pub successful_backups: i64,
    pub failed_backups: i64,
    pub average_size: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ServerHealth {
    pub status: String,
    pub timestamp: DateTime<Utc>,
    pub response_time: i64,
    pub server_version: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseInfo {
    pub license_key: String,
    pub user_id: i64,
    pub is_valid: bool,
    pub expiry_date: Option<DateTime<Utc>>,
    pub features: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DatabaseFileInfo {
    pub file_path: String,
    pub file_size: i64,
    pub last_modified: DateTime<Utc>,
    pub is_readable: bool,
    pub is_writable: bool,
    pub is_locked: bool,
    pub checksum: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileLockInfo {
    pub is_locked: bool,
    pub lock_type: Option<String>,
    pub lock_holder: Option<String>,
    pub lock_timestamp: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RestoreRequest {
    pub backup_id: String,
    pub user_id: Option<i64>,
    pub force: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: Option<String>,
    pub error: Option<String>,
}
