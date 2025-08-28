use crate::models::{
    CreateCloudBackupRequest, RestoreRequest, ApiResponse
};
use crate::services::CloudBackupService;
use crate::AppState;
use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::Json,
    routing::{get, post},
    Router,
};
use serde_json::json;
use tracing::{info, error};

// ==================== CLOUD BACKUP OPERATIONS ====================

pub async fn create_cloud_backup(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<CreateCloudBackupRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    let user_id = 1; // TODO: Extract from JWT token
    
    match state.cloud_backup_service.create_cloud_backup(&state.db, request).await {
        Ok(response) => {
            info!("Cloud backup created successfully for user: {}", user_id);
            (StatusCode::OK, Json(json!({
                "success": response.success,
                "data": response.data,
                "message": response.message
            })))
        }
        Err(e) => {
            error!("Error creating cloud backup for user {}: {}", user_id, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": format!("Error creating cloud backup: {}", e)
                })),
            )
        }
    }
}

pub async fn get_user_backups(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> (StatusCode, Json<serde_json::Value>) {
    let user_id = 1; // TODO: Extract from JWT token
    
    match state.cloud_backup_service.get_user_backups(&state.db, Some(user_id)).await {
        Ok(response) => {
            info!("User backups retrieved successfully for user: {}", user_id);
            (StatusCode::OK, Json(json!({
                "success": response.success,
                "data": response.data,
                "message": response.message
            })))
        }
        Err(e) => {
            error!("Error getting user backups for user {}: {}", user_id, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": format!("Error getting user backups: {}", e)
                })),
            )
        }
    }
}

pub async fn get_user_backups_with_id(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(user_id): Path<i64>,
) -> (StatusCode, Json<serde_json::Value>) {
    match state.cloud_backup_service.get_user_backups(&state.db, Some(user_id)).await {
        Ok(response) => {
            info!("User backups retrieved successfully for user: {}", user_id);
            (StatusCode::OK, Json(json!({
                "success": response.success,
                "data": response.data,
                "message": response.message
            })))
        }
        Err(e) => {
            error!("Error getting user backups for user {}: {}", user_id, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": format!("Error getting user backups: {}", e)
                })),
            )
        }
    }
}

pub async fn get_backup_stats(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> (StatusCode, Json<serde_json::Value>) {
    let user_id = 1; // TODO: Extract from JWT token
    
    match state.cloud_backup_service.get_backup_stats(&state.db, Some(user_id)).await {
        Ok(response) => {
            info!("Backup stats retrieved successfully for user: {}", user_id);
            (StatusCode::OK, Json(json!({
                "success": response.success,
                "data": response.data,
                "message": response.message
            })))
        }
        Err(e) => {
            error!("Error getting backup stats for user {}: {}", user_id, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": format!("Error getting backup stats: {}", e)
                })),
            )
        }
    }
}

pub async fn get_backup_stats_with_id(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(user_id): Path<i64>,
) -> (StatusCode, Json<serde_json::Value>) {
    match state.cloud_backup_service.get_backup_stats(&state.db, Some(user_id)).await {
        Ok(response) => {
            info!("Backup stats retrieved successfully for user: {}", user_id);
            (StatusCode::OK, Json(json!({
                "success": response.success,
                "data": response.data,
                "message": response.message
            })))
        }
        Err(e) => {
            error!("Error getting backup stats for user {}: {}", user_id, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": format!("Error getting backup stats: {}", e)
                })),
            )
        }
    }
}

pub async fn check_server_health(
    State(state): State<AppState>,
) -> (StatusCode, Json<serde_json::Value>) {
    match state.cloud_backup_service.check_server_health().await {
        Ok(response) => {
            info!("Server health check completed successfully");
            (StatusCode::OK, Json(json!({
                "success": response.success,
                "data": response.data,
                "message": response.message
            })))
        }
        Err(e) => {
            error!("Error checking server health: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": format!("Error checking server health: {}", e)
                })),
            )
        }
    }
}

pub async fn get_license_info(
    State(state): State<AppState>,
) -> (StatusCode, Json<serde_json::Value>) {
    match state.cloud_backup_service.get_license_info(&state.db).await {
        Ok(response) => {
            info!("License info retrieved successfully");
            (StatusCode::OK, Json(json!({
                "success": response.success,
                "data": response.data,
                "message": response.message
            })))
        }
        Err(e) => {
            error!("Error getting license info: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": format!("Error getting license info: {}", e)
                })),
            )
        }
    }
}

pub async fn download_user_backup(
    State(state): State<AppState>,
    Path(backup_id): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    match state.cloud_backup_service.download_user_backup(&state.db, &backup_id).await {
        Ok(response) => {
            info!("User backup download info retrieved for backup: {}", backup_id);
            (StatusCode::OK, Json(json!({
                "success": response.success,
                "data": response.data,
                "message": response.message
            })))
        }
        Err(e) => {
            error!("Error downloading user backup {}: {}", backup_id, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": format!("Error downloading user backup: {}", e)
                })),
            )
        }
    }
}

pub async fn restore_from_cloud_backup(
    State(state): State<AppState>,
    Path(backup_id): Path<String>,
    Json(request): Json<RestoreRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    match state.cloud_backup_service.restore_from_cloud_backup(&state.db, &backup_id, request).await {
        Ok(response) => {
            info!("Cloud backup restoration initiated for backup: {}", backup_id);
            (StatusCode::OK, Json(json!({
                "success": response.success,
                "data": response.data,
                "message": response.message
            })))
        }
        Err(e) => {
            error!("Error restoring from cloud backup {}: {}", backup_id, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": format!("Error restoring from cloud backup: {}", e)
                })),
            )
        }
    }
}

pub async fn check_database_accessibility(
    State(state): State<AppState>,
) -> (StatusCode, Json<serde_json::Value>) {
    match state.cloud_backup_service.check_database_accessibility().await {
        Ok(response) => {
            info!("Database accessibility check completed");
            (StatusCode::OK, Json(json!({
                "success": response.success,
                "data": response.data,
                "message": response.message
            })))
        }
        Err(e) => {
            error!("Error checking database accessibility: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": format!("Error checking database accessibility: {}", e)
                })),
            )
        }
    }
}

pub async fn get_database_file_info(
    State(state): State<AppState>,
) -> (StatusCode, Json<serde_json::Value>) {
    match state.cloud_backup_service.get_database_file_info().await {
        Ok(response) => {
            info!("Database file info retrieved successfully");
            (StatusCode::OK, Json(json!({
                "success": response.success,
                "data": response.data,
                "message": response.message
            })))
        }
        Err(e) => {
            error!("Error getting database file info: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": format!("Error getting database file info: {}", e)
                })),
            )
        }
    }
}

pub async fn check_file_locks(
    State(state): State<AppState>,
) -> (StatusCode, Json<serde_json::Value>) {
    match state.cloud_backup_service.check_file_locks().await {
        Ok(response) => {
            info!("File locks check completed");
            (StatusCode::OK, Json(json!({
                "success": response.success,
                "data": response.data,
                "message": response.message
            })))
        }
        Err(e) => {
            error!("Error checking file locks: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": format!("Error checking file locks: {}", e)
                })),
            )
        }
    }
}

// ==================== ROUTES DEFINITION ====================

pub fn cloud_backup_routes() -> Router<AppState> {
    Router::new()
        // Create a cloud backup and send it to remote server
        .route("/api/cloud-backup/create", post(create_cloud_backup))
        
        // Get user backups from remote server
        .route("/api/cloud-backup/user/:user_id", get(get_user_backups_with_id))
        .route("/api/cloud-backup/user", get(get_user_backups))
        
        // Get backup statistics for the current user
        .route("/api/cloud-backup/stats/:user_id", get(get_backup_stats_with_id))
        .route("/api/cloud-backup/stats", get(get_backup_stats))
        
        // Check remote server connectivity
        .route("/api/cloud-backup/health", get(check_server_health))
        
        // Get license information for debugging
        .route("/api/cloud-backup/license-info", get(get_license_info))
        
        // Download a specific backup by ID
        .route("/api/cloud-backup/download/:backup_id", get(download_user_backup))
        
        // Restore database from a cloud backup
        .route("/api/cloud-backup/restore/:backup_id", post(restore_from_cloud_backup))
        
        // Check database accessibility for restoration
        .route("/api/cloud-backup/check-accessibility", get(check_database_accessibility))
        
        // Get detailed database file information for diagnostics
        .route("/api/cloud-backup/file-info", get(get_database_file_info))
        
        // Check for file locks on the database
        .route("/api/cloud-backup/check-locks", get(check_file_locks))
}
