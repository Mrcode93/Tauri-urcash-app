use axum::{
    routing::{get, post},
    Router,
    extract::{State, Path},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use crate::AppState;
use crate::models::{
    CreateBackupRequest, RestoreBackupRequest, get_database_message
};
use tracing::{info, warn, error};

// Create database backup
async fn create_backup(
    State(state): State<AppState>,
    Json(payload): Json<CreateBackupRequest>,
) -> impl IntoResponse {
    match state.database_service.create_backup(&state.db, payload.custom_directory).await {
        Ok(backup_info) => {
            info!("Database backup created successfully: {:?}", backup_info.backup_path);
            Json(json!({
                "success": true,
                "data": backup_info,
                "message": get_database_message("backup_created")
            }))
        },
        Err(err) => {
            error!("Failed to create database backup: {}", err);
            let (status_code, message) = state.database_service.handle_database_error(&err);
            Json(json!({
                "success": false,
                "message": message
            }))
        }
    }
}

// List available backups
async fn list_backups(State(state): State<AppState>) -> impl IntoResponse {
    match state.database_service.list_backups().await {
        Ok(backups) => {
            info!("Backups listed successfully: {} backups found", backups.len());
            Json(json!({
                "success": true,
                "data": backups,
                "message": get_database_message("backups_fetched")
            }))
        },
        Err(err) => {
            error!("Failed to list backups: {}", err);
            let (status_code, message) = state.database_service.handle_database_error(&err);
            Json(json!({
                "success": false,
                "message": message
            }))
        }
    }
}

// Restore from backup
async fn restore_from_backup(
    State(state): State<AppState>,
    Path(backup_id): Path<String>,
) -> impl IntoResponse {
    match state.database_service.restore_from_backup(&state.db, &backup_id).await {
        Ok(result) => {
            info!("Database restored successfully from backup: {}", result.backup_path);
            Json(json!({
                "success": true,
                "data": result,
                "message": get_database_message("backup_restored")
            }))
        },
        Err(err) => {
            error!("Failed to restore from backup: {}", err);
            let (status_code, message) = state.database_service.handle_database_error(&err);
            Json(json!({
                "success": false,
                "message": message
            }))
        }
    }
}

// Restore from custom backup
async fn restore_from_custom_backup(
    State(state): State<AppState>,
    Json(payload): Json<RestoreBackupRequest>,
) -> impl IntoResponse {
    if !payload.confirm {
        return Json(json!({
            "success": false,
            "message": "Confirmation required for custom backup restore"
        }));
    }

    match state.database_service.restore_from_custom_backup(&state.db, &payload.backup_file).await {
        Ok(result) => {
            info!("Database restored successfully from custom backup: {}", result.backup_path);
            Json(json!({
                "success": true,
                "data": result,
                "message": get_database_message("backup_restored")
            }))
        },
        Err(err) => {
            error!("Failed to restore from custom backup: {}", err);
            let (status_code, message) = state.database_service.handle_database_error(&err);
            Json(json!({
                "success": false,
                "message": message
            }))
        }
    }
}

// Reset database
async fn reset_database(State(state): State<AppState>) -> impl IntoResponse {
    // TODO: Add admin permission check and confirmation
    match state.database_service.reset_database(&state.db).await {
        Ok(result) => {
            info!("Database reset successfully");
            Json(json!({
                "success": true,
                "data": result,
                "message": get_database_message("database_reset")
            }))
        },
        Err(err) => {
            error!("Failed to reset database: {}", err);
            let (status_code, message) = state.database_service.handle_database_error(&err);
            Json(json!({
                "success": false,
                "message": message
            }))
        }
    }
}

// Fix menu items
async fn fix_menu_items(State(state): State<AppState>) -> impl IntoResponse {
    match state.database_service.fix_menu_items(&state.db).await {
        Ok(result) => {
            info!("Menu items fixed successfully");
            Json(json!({
                "success": true,
                "data": result,
                "message": get_database_message("menu_items_fixed")
            }))
        },
        Err(err) => {
            error!("Failed to fix menu items: {}", err);
            let (status_code, message) = state.database_service.handle_database_error(&err);
            Json(json!({
                "success": false,
                "message": message
            }))
        }
    }
}

pub fn database_routes() -> Router<AppState> {
    Router::new()
        .route("/api/database/backup", post(create_backup))
        .route("/api/database/backups", get(list_backups))
        .route("/api/database/restore/:backup_id", post(restore_from_backup))
        .route("/api/database/restore-custom", post(restore_from_custom_backup))
        .route("/api/database/reset", post(reset_database))
        .route("/api/database/fix-menu-items", post(fix_menu_items))
}