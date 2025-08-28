use axum::{
    routing::{get, post, delete, patch},
    Router,
    extract::{State, Path, Query},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct DeviceQuery {
    pub page: Option<i32>,
    pub limit: Option<i32>,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AddDeviceRequest {
    pub device_id: String,
    pub device_name: String,
    pub device_type: String,
    pub location: Option<String>,
    pub initial_cash: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDeviceStatusRequest {
    pub status: String, // "online", "offline", "maintenance"
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CashOperationRequest {
    pub amount: f64,
    pub notes: Option<String>,
    pub operator_id: Option<i32>,
}

// Get all devices
async fn get_devices(State(state): State<AppState>, Query(query): Query<DeviceQuery>) -> impl IntoResponse {
    match state.device_service.get_all(&state.db, &query).await {
        Ok(devices) => Json(json!({"success": true, "data": devices})),
        Err(err) => {
            tracing::error!("Failed to get devices: {}", err);
            Json(json!({"success": false, "message": "Failed to get devices"}))
        }
    }
}

// Get device statistics
async fn get_device_statistics(State(state): State<AppState>) -> impl IntoResponse {
    match state.device_service.get_statistics(&state.db).await {
        Ok(stats) => Json(json!({"success": true, "data": stats})),
        Err(err) => {
            tracing::error!("Failed to get device statistics: {}", err);
            Json(json!({"success": false, "message": "Failed to get device statistics"}))
        }
    }
}

// Search devices
async fn search_devices(State(state): State<AppState>, Query(query): Query<DeviceQuery>) -> impl IntoResponse {
    match state.device_service.search(&state.db, &query).await {
        Ok(devices) => Json(json!({"success": true, "data": devices})),
        Err(err) => {
            tracing::error!("Failed to search devices: {}", err);
            Json(json!({"success": false, "message": "Failed to search devices"}))
        }
    }
}

// Get device by ID
async fn get_device_by_id(State(state): State<AppState>, Path(device_id): Path<String>) -> impl IntoResponse {
    match state.device_service.get_by_id(&state.db, &device_id).await {
        Ok(Some(device)) => Json(json!({"success": true, "data": device})),
        Ok(None) => Json(json!({"success": false, "message": "Device not found"})),
        Err(err) => {
            tracing::error!("Failed to get device: {}", err);
            Json(json!({"success": false, "message": "Failed to get device"}))
        }
    }
}

// Add new device
async fn add_device(State(state): State<AppState>, Json(payload): Json<AddDeviceRequest>) -> impl IntoResponse {
    match state.device_service.add(&state.db, payload).await {
        Ok(device) => Json(json!({"success": true, "data": device, "message": "Device added successfully"})),
        Err(err) => {
            tracing::error!("Failed to add device: {}", err);
            Json(json!({"success": false, "message": "Failed to add device"}))
        }
    }
}

// Update device status
async fn update_device_status(State(state): State<AppState>, Path(device_id): Path<String>, Json(payload): Json<UpdateDeviceStatusRequest>) -> impl IntoResponse {
    match state.device_service.update_status(&state.db, &device_id, payload).await {
        Ok(device) => Json(json!({"success": true, "data": device, "message": "Device status updated successfully"})),
        Err(err) => {
            tracing::error!("Failed to update device status: {}", err);
            Json(json!({"success": false, "message": "Failed to update device status"}))
        }
    }
}

// Add cash to device
async fn add_cash(State(state): State<AppState>, Path(device_id): Path<String>, Json(payload): Json<CashOperationRequest>) -> impl IntoResponse {
    match state.device_service.add_cash(&state.db, &device_id, payload).await {
        Ok(result) => Json(json!({"success": true, "data": result, "message": "Cash added successfully"})),
        Err(err) => {
            tracing::error!("Failed to add cash: {}", err);
            Json(json!({"success": false, "message": "Failed to add cash"}))
        }
    }
}

// Withdraw cash from device
async fn withdraw_cash(State(state): State<AppState>, Path(device_id): Path<String>, Json(payload): Json<CashOperationRequest>) -> impl IntoResponse {
    match state.device_service.withdraw_cash(&state.db, &device_id, payload).await {
        Ok(result) => Json(json!({"success": true, "data": result, "message": "Cash withdrawn successfully"})),
        Err(err) => {
            tracing::error!("Failed to withdraw cash: {}", err);
            Json(json!({"success": false, "message": "Failed to withdraw cash"}))
        }
    }
}

// Get device cash summary
async fn get_device_cash_summary(State(state): State<AppState>, Path(device_id): Path<String>) -> impl IntoResponse {
    match state.device_service.get_cash_summary(&state.db, &device_id).await {
        Ok(summary) => Json(json!({"success": true, "data": summary})),
        Err(err) => {
            tracing::error!("Failed to get device cash summary: {}", err);
            Json(json!({"success": false, "message": "Failed to get device cash summary"}))
        }
    }
}

// Get device transactions
async fn get_device_transactions(State(state): State<AppState>, Path(device_id): Path<String>) -> impl IntoResponse {
    match state.device_service.get_transactions(&state.db, &device_id).await {
        Ok(transactions) => Json(json!({"success": true, "data": transactions})),
        Err(err) => {
            tracing::error!("Failed to get device transactions: {}", err);
            Json(json!({"success": false, "message": "Failed to get device transactions"}))
        }
    }
}

// Get overall cash summary
async fn get_overall_cash_summary(State(state): State<AppState>) -> impl IntoResponse {
    match state.device_service.get_overall_cash_summary(&state.db).await {
        Ok(summary) => Json(json!({"success": true, "data": summary})),
        Err(err) => {
            tracing::error!("Failed to get overall cash summary: {}", err);
            Json(json!({"success": false, "message": "Failed to get overall cash summary"}))
        }
    }
}

// Remove device
async fn remove_device(State(state): State<AppState>, Path(device_id): Path<String>) -> impl IntoResponse {
    match state.device_service.remove(&state.db, &device_id).await {
        Ok(_) => Json(json!({"success": true, "message": "Device removed successfully"})),
        Err(err) => {
            tracing::error!("Failed to remove device: {}", err);
            Json(json!({"success": false, "message": "Failed to remove device"}))
        }
    }
}

pub fn devices_routes() -> Router<AppState> {
    Router::new()
        .route("/api/devices", get(get_devices).post(add_device))
        .route("/api/devices/statistics", get(get_device_statistics))
        .route("/api/devices/search", get(search_devices))
        .route("/api/devices/cash/summary", get(get_overall_cash_summary))
        .route("/api/devices/:device_id", get(get_device_by_id).delete(remove_device))
        .route("/api/devices/:device_id/status", patch(update_device_status))
        .route("/api/devices/:device_id/cash/add", post(add_cash))
        .route("/api/devices/:device_id/cash/withdraw", post(withdraw_cash))
        .route("/api/devices/:device_id/cash/summary", get(get_device_cash_summary))
        .route("/api/devices/:device_id/transactions", get(get_device_transactions))
}