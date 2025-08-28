use axum::{
    routing::{get, post, put, delete},
    Router,
    extract::{State, Path},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct RegisterDeviceRequest {
    pub name: Option<String>,
    pub ip_address: Option<String>,
    pub mac_address: Option<String>,
    pub device_type: Option<String>,
    pub permissions: Option<Vec<String>>,
    pub port: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct RequestAuthorizationRequest {
    pub name: Option<String>,
    pub ip_address: Option<String>,
    pub mac_address: Option<String>,
    pub device_type: Option<String>,
    pub additional_info: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct BlockDeviceRequest {
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDeviceStatusRequest {
    pub status: String,
}

#[derive(Debug, Deserialize)]
pub struct CheckAuthorizationRequest {
    pub ip_address: Option<String>,
    pub mac_address: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RejectAuthorizationRequest {
    pub reason: Option<String>,
}

// Get main device configuration
async fn get_main_device_config(State(state): State<AppState>) -> impl IntoResponse {
    match state.branch_config_service.get_main_device_config().await {
        Ok(config) => Json(json!({
            "success": true,
            "data": config,
            "timestamp": chrono::Utc::now().to_rfc3339()
        })),
        Err(err) => {
            tracing::error!("Failed to get main device config: {}", err);
            Json(json!({
                "success": false,
                "error": err.to_string()
            }))
        }
    }
}

// Get local IP address
async fn get_local_ip(State(state): State<AppState>) -> impl IntoResponse {
    match state.branch_config_service.get_local_ip_address().await {
        Ok(ip_address) => Json(json!({
            "success": true,
            "ip_address": ip_address,
            "timestamp": chrono::Utc::now().to_rfc3339()
        })),
        Err(err) => {
            tracing::error!("Failed to get local IP: {}", err);
            Json(json!({
                "success": false,
                "error": err.to_string()
            }))
        }
    }
}

// Get device statistics
async fn get_device_stats(State(state): State<AppState>) -> impl IntoResponse {
    match state.branch_config_service.get_device_stats().await {
        Ok(result) => Json(result),
        Err(err) => {
            tracing::error!("Failed to get device stats: {}", err);
            Json(json!({
                "success": false,
                "error": err.to_string()
            }))
        }
    }
}

// Get all devices
async fn get_all_devices(State(state): State<AppState>) -> impl IntoResponse {
    match state.branch_config_service.get_all_devices().await {
        Ok(result) => Json(result),
        Err(err) => {
            tracing::error!("Failed to get all devices: {}", err);
            Json(json!({
                "success": false,
                "error": err.to_string()
            }))
        }
    }
}

// Get connected devices only
async fn get_connected_devices(State(state): State<AppState>) -> impl IntoResponse {
    match state.branch_config_service.get_connected_devices().await {
        Ok(result) => Json(result),
        Err(err) => {
            tracing::error!("Failed to get connected devices: {}", err);
            Json(json!({
                "success": false,
                "error": err.to_string()
            }))
        }
    }
}

// Block a device
async fn block_device(State(state): State<AppState>, Path(device_id): Path<String>, Json(payload): Json<BlockDeviceRequest>) -> impl IntoResponse {
    match state.branch_config_service.block_device(&device_id, payload.reason).await {
        Ok(result) => Json(result),
        Err(err) => {
            tracing::error!("Failed to block device: {}", err);
            Json(json!({
                "success": false,
                "error": err.to_string()
            }))
        }
    }
}

// Unblock a device
async fn unblock_device(State(state): State<AppState>, Path(device_id): Path<String>) -> impl IntoResponse {
    match state.branch_config_service.unblock_device(&device_id).await {
        Ok(result) => Json(result),
        Err(err) => {
            tracing::error!("Failed to unblock device: {}", err);
            Json(json!({
                "success": false,
                "error": err.to_string()
            }))
        }
    }
}

// Disconnect a device
async fn disconnect_device(State(state): State<AppState>, Path(device_id): Path<String>) -> impl IntoResponse {
    match state.branch_config_service.disconnect_device(&device_id).await {
        Ok(result) => Json(result),
        Err(err) => {
            tracing::error!("Failed to disconnect device: {}", err);
            Json(json!({
                "success": false,
                "error": err.to_string()
            }))
        }
    }
}

// Remove a device
async fn remove_device(State(state): State<AppState>, Path(device_id): Path<String>) -> impl IntoResponse {
    match state.branch_config_service.remove_device(&device_id).await {
        Ok(result) => Json(result),
        Err(err) => {
            tracing::error!("Failed to remove device: {}", err);
            Json(json!({
                "success": false,
                "error": err.to_string()
            }))
        }
    }
}

// Update device status
async fn update_device_status(State(state): State<AppState>, Path(device_id): Path<String>, Json(payload): Json<UpdateDeviceStatusRequest>) -> impl IntoResponse {
    match state.branch_config_service.update_device_status(&device_id, &payload.status).await {
        Ok(result) => Json(result),
        Err(err) => {
            tracing::error!("Failed to update device status: {}", err);
            Json(json!({
                "success": false,
                "error": err.to_string()
            }))
        }
    }
}

// Check device status
async fn check_device_status(State(state): State<AppState>, Path(device_id): Path<String>) -> impl IntoResponse {
    match state.branch_config_service.check_device_status(&device_id).await {
        Ok(result) => Json(result),
        Err(err) => {
            tracing::error!("Failed to check device status: {}", err);
            Json(json!({
                "success": false,
                "error": err.to_string()
            }))
        }
    }
}

// Register a secondary device
async fn register_device(State(state): State<AppState>, Json(payload): Json<RegisterDeviceRequest>) -> impl IntoResponse {
    match state.branch_config_service.register_device(&payload).await {
        Ok(result) => {
            if result["success"].as_bool().unwrap_or(false) {
                Json(json!({
                    "success": true,
                    "device": result["device"],
                    "message": "Secondary device registered successfully"
                }))
            } else {
                Json(json!({
                    "success": false,
                    "error": result["error"]
                }))
            }
        }
        Err(err) => {
            tracing::error!("Failed to register device: {}", err);
            Json(json!({
                "success": false,
                "error": err.to_string()
            }))
        }
    }
}

// Request device authorization
async fn request_authorization(State(state): State<AppState>, Json(payload): Json<RequestAuthorizationRequest>) -> impl IntoResponse {
    match state.branch_config_service.request_device_authorization(&payload).await {
        Ok(result) => {
            if result["success"].as_bool().unwrap_or(false) {
                Json(json!({
                    "success": true,
                    "pending_id": result["pending_id"],
                    "message": result["message"],
                    "estimated_wait_time": result["estimated_wait_time"]
                }))
            } else {
                Json(json!({
                    "success": false,
                    "error": result["error"],
                    "pending_id": result["pending_id"]
                }))
            }
        }
        Err(err) => {
            tracing::error!("Failed to request authorization: {}", err);
            Json(json!({
                "success": false,
                "error": err.to_string()
            }))
        }
    }
}

// Get pending device authorization requests
async fn get_pending_authorizations(State(state): State<AppState>) -> impl IntoResponse {
    match state.branch_config_service.get_pending_device_requests().await {
        Ok(result) => Json(result),
        Err(err) => {
            tracing::error!("Failed to get pending authorizations: {}", err);
            Json(json!({
                "success": false,
                "error": err.to_string()
            }))
        }
    }
}

// Approve device authorization
async fn approve_authorization(State(state): State<AppState>, Path(pending_id): Path<String>) -> impl IntoResponse {
    match state.branch_config_service.approve_device_authorization(&pending_id).await {
        Ok(result) => {
            if result["success"].as_bool().unwrap_or(false) {
                Json(json!({
                    "success": true,
                    "device": result["device"],
                    "message": result["message"]
                }))
            } else {
                Json(json!({
                    "success": false,
                    "error": result["error"]
                }))
            }
        }
        Err(err) => {
            tracing::error!("Failed to approve authorization: {}", err);
            Json(json!({
                "success": false,
                "error": err.to_string()
            }))
        }
    }
}

// Reject device authorization
async fn reject_authorization(State(state): State<AppState>, Path(pending_id): Path<String>, Json(payload): Json<RejectAuthorizationRequest>) -> impl IntoResponse {
    match state.branch_config_service.reject_device_authorization(&pending_id, payload.reason).await {
        Ok(result) => {
            if result["success"].as_bool().unwrap_or(false) {
                Json(json!({
                    "success": true,
                    "message": result["message"],
                    "rejected_device": result["rejected_device"]
                }))
            } else {
                Json(json!({
                    "success": false,
                    "error": result["error"]
                }))
            }
        }
        Err(err) => {
            tracing::error!("Failed to reject authorization: {}", err);
            Json(json!({
                "success": false,
                "error": err.to_string()
            }))
        }
    }
}

// Check device authorization status
async fn check_authorization(State(state): State<AppState>, Json(payload): Json<CheckAuthorizationRequest>) -> impl IntoResponse {
    match state.branch_config_service.is_device_authorized(&payload).await {
        Ok(result) => Json(result),
        Err(err) => {
            tracing::error!("Failed to check authorization: {}", err);
            Json(json!({
                "success": false,
                "error": err.to_string()
            }))
        }
    }
}

// Get authorized devices list
async fn get_authorized_devices(State(state): State<AppState>) -> impl IntoResponse {
    match state.branch_config_service.get_authorized_devices().await {
        Ok(authorized_devices) => Json(json!({
            "success": true,
            "authorized_devices": authorized_devices,
            "count": authorized_devices.len()
        })),
        Err(err) => {
            tracing::error!("Failed to get authorized devices: {}", err);
            Json(json!({
                "success": false,
                "error": err.to_string()
            }))
        }
    }
}

pub fn branch_config_routes() -> Router<AppState> {
    Router::new()
        .route("/api/branch-config", get(get_main_device_config))
        .route("/api/branch-config/ip", get(get_local_ip))
        .route("/api/branch-config/stats", get(get_device_stats))
        .route("/api/branch-config/devices", get(get_all_devices))
        .route("/api/branch-config/devices/connected", get(get_connected_devices))
        .route("/api/branch-config/devices/:device_id/block", post(block_device))
        .route("/api/branch-config/devices/:device_id/unblock", post(unblock_device))
        .route("/api/branch-config/devices/:device_id/disconnect", post(disconnect_device))
        .route("/api/branch-config/devices/:device_id", delete(remove_device))
        .route("/api/branch-config/devices/:device_id/status", put(update_device_status).get(check_device_status))
        .route("/api/branch-config/register-device", post(register_device))
        .route("/api/branch-config/request-authorization", post(request_authorization))
        .route("/api/branch-config/pending-authorizations", get(get_pending_authorizations))
        .route("/api/branch-config/approve-authorization/:pending_id", post(approve_authorization))
        .route("/api/branch-config/reject-authorization/:pending_id", post(reject_authorization))
        .route("/api/branch-config/check-authorization", post(check_authorization))
        .route("/api/branch-config/authorized-devices", get(get_authorized_devices))
}