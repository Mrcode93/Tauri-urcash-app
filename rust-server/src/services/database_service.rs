use anyhow::Result;
use crate::database::Database;
use crate::models::{
    BackupInfo, CreateBackupResponse, RestoreBackupResponse, DatabaseResetResponse,
    FixMenuItemsResponse, get_database_message
};
use std::fs;
use std::path::{Path, PathBuf};
use chrono::{Utc, DateTime};
use tracing::{info, warn, error};
use dirs;
use sqlx::Row;

const MAX_BACKUPS: usize = 5;

#[derive(Clone)]
pub struct DatabaseService;

impl DatabaseService {
    pub fn new() -> Self {
        Self
    }

    // Get backup directory path
    fn get_backup_dir(&self) -> Result<PathBuf> {
        let home_dir = dirs::home_dir()
            .ok_or_else(|| anyhow::anyhow!("Could not find home directory"))?;
        let backup_dir = home_dir.join(".urcash").join("backups");
        
        // Ensure backup directory exists
        if !backup_dir.exists() {
            fs::create_dir_all(&backup_dir)?;
        }
        
        Ok(backup_dir)
    }

    // Get database path
    fn get_database_path(&self) -> Result<PathBuf> {
        let home_dir = dirs::home_dir()
            .ok_or_else(|| anyhow::anyhow!("Could not find home directory"))?;
        Ok(home_dir.join(".urcash").join("database.sqlite"))
    }

    // Validate SQLite database file
    async fn validate_sqlite_database(&self, file_path: &Path) -> Result<bool> {
        // Check if file exists
        if !file_path.exists() {
            error!("File does not exist: {:?}", file_path);
            return Ok(false);
        }

        // Check file size (SQLite files should be at least 512 bytes)
        let metadata = fs::metadata(file_path)?;
        if metadata.len() < 512 {
            error!("File is too small to be a valid SQLite database: {:?}, Size: {}", file_path, metadata.len());
            return Ok(false);
        }

        // Try to open the database and run a simple query
        let db_url = format!("sqlite:{}", file_path.display());
        let pool = sqlx::SqlitePool::connect(&db_url).await?;
        
        // Test basic SQLite functionality
        let result = sqlx::query("SELECT sqlite_version()")
            .fetch_one(&pool)
            .await?;
        let version: String = result.get(0);
        info!("SQLite version in backup: {}", version);
        
        // Test if we can read the sqlite_master table
        let tables = sqlx::query("SELECT name FROM sqlite_master WHERE type='table'")
            .fetch_all(&pool)
            .await?;
        info!("Number of tables found: {}", tables.len());
        
        // Check for essential tables
        let essential_tables = vec!["products", "customers", "sales", "purchases", "suppliers"];
        let table_names: Vec<String> = tables.iter()
            .map(|row| row.get::<String, _>("name"))
            .collect();
        
        let missing_tables: Vec<&str> = essential_tables.iter()
            .filter(|table| !table_names.contains(&table.to_string()))
            .copied()
            .collect();
        
        if !missing_tables.is_empty() {
            warn!("Missing essential tables: {:?}", missing_tables);
        }
        
        pool.close().await;
        Ok(true)
    }

    // Get existing backups
    async fn get_existing_backups(&self) -> Result<Vec<BackupInfo>> {
        let backup_dir = self.get_backup_dir()?;
        let mut backups = Vec::new();
        
        if !backup_dir.exists() {
            return Ok(backups);
        }
        
        for entry in fs::read_dir(backup_dir)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.extension().and_then(|s| s.to_str()) == Some("db") {
                let metadata = fs::metadata(&path)?;
                let created_at = DateTime::from_timestamp(
                    metadata.created()?.duration_since(std::time::UNIX_EPOCH)?.as_secs() as i64,
                    0
                ).unwrap_or_else(|| Utc::now());
                
                backups.push(BackupInfo {
                    id: path.file_name().unwrap().to_string_lossy().to_string(),
                    name: path.file_name().unwrap().to_string_lossy().to_string(),
                    size: metadata.len(),
                    created_at,
                    path: path.to_string_lossy().to_string(),
                });
            }
        }
        
        // Sort by creation time, newest first
        backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        Ok(backups)
    }

    // Create database backup
    pub async fn create_backup(&self, db: &Database, custom_directory: Option<String>) -> Result<CreateBackupResponse> {
        let timestamp = Utc::now().format("%Y-%m-%dT%H-%M-%S-%3fZ").to_string();
        
        // Use custom directory if provided, otherwise use default
        let backup_dir = if let Some(ref custom_dir) = custom_directory {
            let path = PathBuf::from(custom_dir);
            if !path.exists() {
                fs::create_dir_all(&path)?;
            }
            path
        } else {
            self.get_backup_dir()?
        };
        
        let backup_path = backup_dir.join(format!("backup-{}.db", timestamp));
        
        info!("Creating database backup: {:?}", backup_path);

        // Test database connection before backup
        let test_result = sqlx::query("SELECT 1 as test")
            .fetch_one(&db.pool)
            .await;
        
        if test_result.is_err() {
            error!("Database connection test failed");
            return Err(anyhow::anyhow!("Database connection is not functioning properly"));
        }

        // Create backup by copying the database file
        let db_path = self.get_database_path()?;
        fs::copy(&db_path, &backup_path)?;

        // Get updated backup count after creation (only from default directory for cleanup)
        let updated_backups = if custom_directory.is_none() {
            self.get_existing_backups().await?
        } else {
            Vec::new()
        };

        // Clean up old backups if we have more than MAX_BACKUPS (only in default directory)
        if custom_directory.is_none() && updated_backups.len() > MAX_BACKUPS {
            let backups_to_delete = &updated_backups[MAX_BACKUPS..];
            for backup in backups_to_delete {
                match fs::remove_file(&backup.path) {
                    Ok(_) => info!("Deleted old backup: {}", backup.name),
                    Err(e) => warn!("Failed to delete old backup {}: {}", backup.name, e),
                }
            }
        }
        
        // Get the final count after cleanup (only from default directory)
        let final_backups = if custom_directory.is_none() {
            self.get_existing_backups().await?
        } else {
            Vec::new()
        };
        
        info!("Database backup created successfully: {:?}, total backups: {}, max backups: {}", 
              backup_path, final_backups.len(), MAX_BACKUPS);
        
        Ok(CreateBackupResponse {
            backup_path: backup_path.to_string_lossy().to_string(),
            timestamp,
            total_backups: final_backups.len(),
            max_backups: MAX_BACKUPS,
            custom_directory: custom_directory.is_some(),
        })
    }

    // List available backups
    pub async fn list_backups(&self) -> Result<Vec<BackupInfo>> {
        self.get_existing_backups().await
    }

    // Restore from backup
    pub async fn restore_from_backup(&self, db: &Database, backup_id: &str) -> Result<RestoreBackupResponse> {
        let backup_dir = self.get_backup_dir()?;
        let backup_path = backup_dir.join(backup_id);

        info!("Attempting to restore from backup: {:?}", backup_path);

        // Check if backup exists
        if !backup_path.exists() {
            error!("Backup file not found: {:?}", backup_path);
            return Err(anyhow::anyhow!("Backup file not found"));
        }

        // Validate the backup file before attempting restoration
        info!("Validating backup file...");
        if !self.validate_sqlite_database(&backup_path).await? {
            error!("Backup file is not a valid SQLite database: {:?}", backup_path);
            return Err(anyhow::anyhow!("Backup file is corrupted or not a valid SQLite database"));
        }
        info!("Backup file validation successful");

        // Close current database connection
        db.pool.close().await;
        info!("Database connection closed successfully");

        // Wait a bit to ensure the file is released
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

        // Delete current database file
        let db_path = self.get_database_path()?;
        if db_path.exists() {
            fs::remove_file(&db_path)?;
            info!("Current database file deleted successfully");
        }

        // Copy backup to database location
        fs::copy(&backup_path, &db_path)?;
        info!("Backup file copied to database location");

        // Note: Database reconnection will be handled by the calling code
        info!("Database restored successfully from backup");

        Ok(RestoreBackupResponse {
            backup_path: backup_path.to_string_lossy().to_string(),
        })
    }

    // Restore from custom backup
    pub async fn restore_from_custom_backup(&self, db: &Database, backup_file: &str) -> Result<RestoreBackupResponse> {
        let backup_path = PathBuf::from(backup_file);

        info!("Attempting to restore from custom backup: {:?}", backup_path);

        // Check if backup exists
        if !backup_path.exists() {
            error!("Custom backup file not found: {:?}", backup_path);
            return Err(anyhow::anyhow!("Backup file not found"));
        }

        // Validate the backup file before attempting restoration
        info!("Validating backup file...");
        if !self.validate_sqlite_database(&backup_path).await? {
            error!("Backup file is not a valid SQLite database: {:?}", backup_path);
            return Err(anyhow::anyhow!("Backup file is corrupted or not a valid SQLite database"));
        }
        info!("Backup file validation successful");

        // Close current database connection
        db.pool.close().await;
        info!("Database connection closed successfully");

        // Wait a bit to ensure the file is released
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

        // Delete current database file
        let db_path = self.get_database_path()?;
        if db_path.exists() {
            fs::remove_file(&db_path)?;
            info!("Current database file deleted successfully");
        }

        // Copy backup to database location
        fs::copy(&backup_path, &db_path)?;
        info!("Custom backup file copied to database location");

        // Note: Database reconnection will be handled by the calling code
        info!("Database restored successfully from custom backup");

        Ok(RestoreBackupResponse {
            backup_path: backup_path.to_string_lossy().to_string(),
        })
    }

    // Reset database
    pub async fn reset_database(&self, db: &Database) -> Result<DatabaseResetResponse> {
        info!("Starting database reset");

        // Close current database connection
        db.pool.close().await;
        info!("Database connection closed successfully for reset");

        // Delete the database file if it exists
        let db_path = self.get_database_path()?;
        if db_path.exists() {
            fs::remove_file(&db_path)?;
            info!("Database file deleted for reset");
        }

        // Note: Database reinitialization will be handled by the calling code
        info!("Database reset successfully");

        Ok(DatabaseResetResponse {
            message: get_database_message("database_reset").to_string(),
        })
    }

    // Fix menu items (placeholder implementation)
    pub async fn fix_menu_items(&self, _db: &Database) -> Result<FixMenuItemsResponse> {
        info!("Menu items fixed successfully via API");
        
        Ok(FixMenuItemsResponse {
            message: get_database_message("menu_items_fixed").to_string(),
        })
    }

    // Helper method to handle database errors (matching Node.js error handling)
    pub fn handle_database_error(&self, error: &anyhow::Error) -> (u16, String) {
        let error_message = error.to_string();
        
        if error_message.contains("EBUSY") || error_message.contains("resource busy or locked") {
            return (409, get_database_message("database_busy").to_string());
        }
        
        if error_message.contains("ENOENT") || error_message.contains("no such file or directory") {
            return (404, get_database_message("backup_not_found").to_string());
        }
        
        if error_message.contains("EACCES") || error_message.contains("permission denied") {
            return (403, get_database_message("file_access_error").to_string());
        }
        
        if error_message.contains("connection") {
            return (500, get_database_message("connection_failed").to_string());
        }
        
        // Default database error handling
        (500, get_database_message("backup_failed").to_string())
    }
}