use axum::{
    routing::{get, post, put, delete},
    Router,
    extract::{State, Path, Query},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub password: String,
    pub role: Option<String>,
    pub permissions: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub username: Option<String>,
    pub password: Option<String>,
    pub role: Option<String>,
    pub permissions: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UploadDataRequest {
    pub data_type: String,
    pub data: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct SyncDataRequest {
    pub data_type: String,
    pub last_sync: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateScheduleRequest {
    pub name: String,
    pub data_types: Vec<String>,
    pub schedule_type: String, // "daily", "weekly", "monthly"
    pub schedule_time: String,
    pub is_active: bool,
}

#[derive(Debug, Deserialize)]
pub struct AutoUploadSettings {
    pub enabled: bool,
    pub data_types: Vec<String>,
    pub upload_interval: i32, // minutes
    pub max_retries: i32,
}

// Public test connection
async fn test_connection_public() -> impl IntoResponse {
    Json(json!({
        "success": true,
        "message": "Connection successful",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

// Create user (admin only)
async fn create_user(State(state): State<AppState>, Json(payload): Json<CreateUserRequest>) -> impl IntoResponse {
    match state.mobile_live_data_service.create_user(&state.db, payload).await {
        Ok(user) => Json(json!({"success": true, "data": user, "message": "User created successfully"})),
        Err(err) => {
            tracing::error!("Failed to create user: {}", err);
            Json(json!({"success": false, "message": "Failed to create user"}))
        }
    }
}

// Get all users (admin only)
async fn get_users(State(state): State<AppState>) -> impl IntoResponse {
    match state.mobile_live_data_service.get_users(&state.db).await {
        Ok(users) => Json(json!({"success": true, "data": users})),
        Err(err) => {
            tracing::error!("Failed to get users: {}", err);
            Json(json!({"success": false, "message": "Failed to get users"}))
        }
    }
}

// Upload data (admin only)
async fn upload_data(State(state): State<AppState>, Json(payload): Json<UploadDataRequest>) -> impl IntoResponse {
    match state.mobile_live_data_service.upload_data(&state.db, payload).await {
        Ok(result) => Json(json!({"success": true, "data": result, "message": "Data uploaded successfully"})),
        Err(err) => {
            tracing::error!("Failed to upload data: {}", err);
            Json(json!({"success": false, "message": "Failed to upload data"}))
        }
    }
}

// Sync data (admin only)
async fn sync_data(State(state): State<AppState>, Path(data_type): Path<String>, Json(payload): Json<SyncDataRequest>) -> impl IntoResponse {
    match state.mobile_live_data_service.sync_data(&state.db, &data_type, payload).await {
        Ok(result) => Json(json!({"success": true, "data": result, "message": "Data synced successfully"})),
        Err(err) => {
            tracing::error!("Failed to sync data: {}", err);
            Json(json!({"success": false, "message": "Failed to sync data"}))
        }
    }
}

// Test connection (admin only)
async fn test_connection(State(state): State<AppState>) -> impl IntoResponse {
    match state.mobile_live_data_service.test_connection(&state.db).await {
        Ok(result) => Json(json!({"success": true, "data": result})),
        Err(err) => {
            tracing::error!("Connection test failed: {}", err);
            Json(json!({"success": false, "message": "Connection test failed"}))
        }
    }
}

// Get sync status (admin only)
async fn get_sync_status(State(state): State<AppState>) -> impl IntoResponse {
    match state.mobile_live_data_service.get_sync_status(&state.db).await {
        Ok(status) => Json(json!({"success": true, "data": status})),
        Err(err) => {
            tracing::error!("Failed to get sync status: {}", err);
            Json(json!({"success": false, "message": "Failed to get sync status"}))
        }
    }
}

// Get license info (admin only)
async fn get_license_info(State(state): State<AppState>) -> impl IntoResponse {
    match state.mobile_live_data_service.get_license_info(&state.db).await {
        Ok(info) => Json(json!({"success": true, "data": info})),
        Err(err) => {
            tracing::error!("Failed to get license info: {}", err);
            Json(json!({"success": false, "message": "Failed to get license info"}))
        }
    }
}

// Create upload schedule (admin only)
async fn create_schedule(State(state): State<AppState>, Json(payload): Json<CreateScheduleRequest>) -> impl IntoResponse {
    match state.mobile_live_data_service.create_schedule(&state.db, payload).await {
        Ok(schedule) => Json(json!({"success": true, "data": schedule, "message": "Schedule created successfully"})),
        Err(err) => {
            tracing::error!("Failed to create schedule: {}", err);
            Json(json!({"success": false, "message": "Failed to create schedule"}))
        }
    }
}

// Get upload schedules (admin only)
async fn get_schedules(State(state): State<AppState>) -> impl IntoResponse {
    match state.mobile_live_data_service.get_schedules(&state.db).await {
        Ok(schedules) => Json(json!({"success": true, "data": schedules})),
        Err(err) => {
            tracing::error!("Failed to get schedules: {}", err);
            Json(json!({"success": false, "message": "Failed to get schedules"}))
        }
    }
}

// Execute scheduled uploads (admin only)
async fn execute_scheduled_uploads(State(state): State<AppState>) -> impl IntoResponse {
    match state.mobile_live_data_service.execute_scheduled_uploads(&state.db).await {
        Ok(result) => Json(json!({"success": true, "data": result, "message": "Scheduled uploads executed successfully"})),
        Err(err) => {
            tracing::error!("Failed to execute scheduled uploads: {}", err);
            Json(json!({"success": false, "message": "Failed to execute scheduled uploads"}))
        }
    }
}

// Get auto upload settings (admin only)
async fn get_auto_upload_settings(State(state): State<AppState>) -> impl IntoResponse {
    match state.mobile_live_data_service.get_auto_upload_settings(&state.db).await {
        Ok(settings) => Json(json!({"success": true, "data": settings})),
        Err(err) => {
            tracing::error!("Failed to get auto upload settings: {}", err);
            Json(json!({"success": false, "message": "Failed to get auto upload settings"}))
        }
    }
}

// Save auto upload settings (admin only)
async fn save_auto_upload_settings(State(state): State<AppState>, Json(payload): Json<AutoUploadSettings>) -> impl IntoResponse {
    match state.mobile_live_data_service.save_auto_upload_settings(&state.db, payload).await {
        Ok(settings) => Json(json!({"success": true, "data": settings, "message": "Auto upload settings saved successfully"})),
        Err(err) => {
            tracing::error!("Failed to save auto upload settings: {}", err);
            Json(json!({"success": false, "message": "Failed to save auto upload settings"}))
        }
    }
}

pub fn mobile_live_data_routes() -> Router<AppState> {
    Router::new()
        .route("/api/mobile-live-data/test-connection-public", get(test_connection_public))
        .route("/api/mobile-live-data/users", post(create_user).get(get_users))
        .route("/api/mobile-live-data/upload", post(upload_data))
        .route("/api/mobile-live-data/sync/:data_type", post(sync_data))
        .route("/api/mobile-live-data/test-connection", get(test_connection))
        .route("/api/mobile-live-data/sync-status", get(get_sync_status))
        .route("/api/mobile-live-data/license-info", get(get_license_info))
        .route("/api/mobile-live-data/schedules", post(create_schedule).get(get_schedules))
        .route("/api/mobile-live-data/schedules/execute", post(execute_scheduled_uploads))
        .route("/api/mobile-live-data/auto-upload-settings", get(get_auto_upload_settings).post(save_auto_upload_settings))
}