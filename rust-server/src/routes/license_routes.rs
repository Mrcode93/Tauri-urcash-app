use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tracing::{info, error, warn};
use chrono::{Utc, Duration};

use crate::{
    models::{ApiResponse},
    services::license_service::{LicenseService, LicenseResponse},
    AppState,
};

#[derive(Debug, Deserialize)]
pub struct FirstActivationRequest {
    pub location: Option<Value>,
    pub code: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ActivationCodeRequest {
    pub activation_code: String,
    pub location: Option<Value>,
}

#[derive(Debug, Deserialize)]
pub struct LicenseVerificationRequest {
    pub force_remote: Option<bool>,
}

// First activation service
pub async fn first_activation_handler(
    State(state): State<AppState>,
    Json(request): Json<FirstActivationRequest>,
) -> Result<Json<ApiResponse<LicenseResponse>>, (StatusCode, Json<ApiResponse<String>>)> {
    info!("🔍 First activation request received");
    
    match state.license_service.first_activation_service(request.location, request.code).await {
        Ok(result) => {
            if result.success {
                info!("✅ First activation successful");
                // Clear license cache after successful activation
                state.license_service.clear_license_cache().await;
                info!("🧹 License cache cleared after first activation");
            } else {
                warn!("⚠️ First activation failed: {}", result.message.as_deref().unwrap_or("Unknown error"));
            }
            
            Ok(Json(ApiResponse::success(result)))
        }
        Err(err) => {
            error!("❌ First activation error: {}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(format!("Internal server error: {}", err))),
            ))
        }
    }
}

// Verify license and key
pub async fn verify_license_handler(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<LicenseResponse>>, (StatusCode, Json<ApiResponse<String>>)> {
    info!("🔍 License verification requested");
    
    match state.license_service.verify_license_offline_first(false).await {
        Ok(result) => {
            if result.success {
                info!("✅ License verification successful");
                info!("📄 Status: {}", result.message.as_deref().unwrap_or("License verified"));
                if let Some(device_id) = &result.device_id {
                    info!("🆔 Device ID: {}...", &device_id[..12.min(device_id.len())]);
                }
                if let Some(license_type) = &result.license_type {
                    info!("🏷️ Type: {}", license_type);
                }
            } else {
                warn!("⚠️ License verification failed: {}", result.message.as_deref().unwrap_or("Unknown error"));
            }
            
            Ok(Json(ApiResponse::success(result)))
        }
        Err(err) => {
            error!("❌ License verification error: {}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(format!("Internal server error: {}", err))),
            ))
        }
    }
}

// Offline-first license verification
pub async fn verify_license_offline_first_handler(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<LicenseResponse>>, (StatusCode, Json<ApiResponse<String>>)> {
    let force_remote = false; // Default to false for GET requests
    info!("🔍 Offline-first license verification - Force remote: {}", force_remote);
    
    match state.license_service.verify_license_offline_first(force_remote).await {
        Ok(result) => {
            if result.success {
                info!("✅ Offline-first license verification successful");
                if let Some(device_id) = &result.device_id {
                    info!("🆔 Device ID: {}...", &device_id[..12.min(device_id.len())]);
                }
                if let Some(license_type) = &result.license_type {
                    info!("🏷️ Type: {}", license_type);
                }
            } else {
                warn!("⚠️ Offline-first license verification failed: {}", result.message.as_deref().unwrap_or("Unknown error"));
            }
            
            Ok(Json(ApiResponse::success(result)))
        }
        Err(err) => {
            error!("❌ Offline-first license verification error: {}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(format!("Internal server error: {}", err))),
            ))
        }
    }
}

// Check local license only
pub async fn check_local_license_handler(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<LicenseResponse>>, (StatusCode, Json<ApiResponse<String>>)> {
    info!("🔍 Local license check requested");
    
    match state.license_service.check_local_license().await {
        Ok(result) => {
            if result.success {
                info!("✅ Local license check successful");
            } else {
                warn!("⚠️ Local license check failed: {}", result.message.as_deref().unwrap_or("Unknown error"));
            }
            
            Ok(Json(ApiResponse::success(result)))
        }
        Err(err) => {
            error!("❌ Local license check error: {}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(format!("Internal server error: {}", err))),
            ))
        }
    }
}

// Activation service with code
pub async fn activation_with_code_handler(
    State(state): State<AppState>,
    Json(request): Json<ActivationCodeRequest>,
) -> Result<Json<ApiResponse<LicenseResponse>>, (StatusCode, Json<ApiResponse<String>>)> {
    info!("🔍 Activation with code request received");
    
    if request.activation_code.trim().is_empty() {
        warn!("⚠️ Activation code missing in request");
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiResponse::error("Activation code is required".to_string())),
        ));
    }
    
    match state.license_service.activation_service_with_code(request.activation_code, request.location).await {
        Ok(result) => {
            if result.success {
                info!("✅ Activation with code successful");
                // Clear license cache after successful activation
                state.license_service.clear_license_cache().await;
                info!("🧹 License cache cleared after activation");
            } else {
                warn!("⚠️ Activation with code failed: {}", result.message.as_deref().unwrap_or("Unknown error"));
            }
            
            Ok(Json(ApiResponse::success(result)))
        }
        Err(err) => {
            error!("❌ Activation with code error: {}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(format!("Internal server error: {}", err))),
            ))
        }
    }
}

// Manual license verification
pub async fn manual_verification_handler(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<Value>>, (StatusCode, Json<ApiResponse<String>>)> {
    info!("🔍 Manual license verification requested");
    
    match state.license_service.manual_license_verification().await {
        Ok(result) => {
            info!("✅ Manual license verification completed");
            Ok(Json(ApiResponse::success(result)))
        }
        Err(err) => {
            error!("❌ Manual license verification error: {}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(format!("Internal server error: {}", err))),
            ))
        }
    }
}

// Clear license cache
pub async fn clear_cache_handler(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<String>>, (StatusCode, Json<ApiResponse<String>>)> {
    info!("🧹 Clearing license cache");
    
    state.license_service.clear_license_cache().await;
    
    Ok(Json(ApiResponse::success("License cache cleared successfully".to_string())))
}

// Diagnose fingerprint issues
pub async fn diagnose_handler(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<Value>>, (StatusCode, Json<ApiResponse<String>>)> {
    info!("🔍 License diagnosis requested");
    
    match state.license_service.diagnose_fingerprint_issues().await {
        Ok(diagnosis) => {
            info!("✅ License diagnosis completed");
            Ok(Json(ApiResponse::success(diagnosis)))
        }
        Err(err) => {
            error!("❌ License diagnosis error: {}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(format!("Diagnosis failed: {}", err))),
            ))
        }
    }
}

// License status (alias for verify)
pub async fn status_handler(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<LicenseResponse>>, (StatusCode, Json<ApiResponse<String>>)> {
    info!("🔍 License status requested");
    
    match state.license_service.verify_license_and_key().await {
        Ok(result) => {
            if result.success {
                info!("✅ License status check successful");
            } else {
                warn!("⚠️ License status check failed: {}", result.message.as_deref().unwrap_or("Unknown error"));
            }
            
            Ok(Json(ApiResponse::success(result)))
        }
        Err(err) => {
            error!("❌ License status error: {}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(format!("Internal server error: {}", err))),
            ))
        }
    }
}

// Cache stats handler
pub async fn cache_stats_handler() -> Result<Json<ApiResponse<Value>>, (StatusCode, Json<ApiResponse<String>>)> {
    let stats = serde_json::json!({
        "message": "Cache middleware removed - all responses are fresh",
        "timestamp": chrono::Utc::now().to_rfc3339()
    });
    
    Ok(Json(ApiResponse::success(stats)))
}

// Notifications handler (placeholder)
pub async fn notifications_handler() -> Result<Json<ApiResponse<Value>>, (StatusCode, Json<ApiResponse<String>>)> {
    // For now, return empty notifications
    let notifications = serde_json::json!({
        "notifications": [],
        "timestamp": chrono::Utc::now().to_rfc3339()
    });
    
    Ok(Json(ApiResponse::success(notifications)))
}

// Test notification handler
pub async fn test_notification_handler() -> Result<Json<ApiResponse<Value>>, (StatusCode, Json<ApiResponse<String>>)> {
    let test_notification = serde_json::json!({
        "level": "warning_1_day",
        "message": "🚨 ينتهي ترخيصك غداً! يرجى التجديد فوراً لتجنب انقطاع الخدمة.",
        "data": {
            "daysUntilExpiry": 1,
            "expiresAt": chrono::Utc::now().checked_add_signed(chrono::Duration::days(1)).unwrap().to_rfc3339(),
            "licenseType": "بريميوم",
            "action": "renew_urgently"
        },
        "timestamp": chrono::Utc::now().to_rfc3339()
    });
    
    let response = serde_json::json!({
        "message": "Test notification sent",
        "notification": test_notification
    });
    
    Ok(Json(ApiResponse::success(response)))
}

pub fn license_routes() -> axum::Router<AppState> {
    axum::Router::new()
        // Main license routes (match Node.js exactly)
        .route("/api/license/status", get(status_handler))  // GET /api/license/status
        .route("/api/license/verify", get(verify_license_handler))  // Custom route
        .route("/api/license/verify-offline-first", get(verify_license_offline_first_handler))  // GET /api/license/verify-offline-first  
        .route("/api/license/check-local", get(check_local_license_handler))  // GET /api/license/check-local
        .route("/api/license/diagnose", get(diagnose_handler))  // GET /api/license/diagnose
        .route("/api/license/verify-manual", get(manual_verification_handler))  // GET /api/license/verify-manual
        
        // POST routes
        .route("/api/license/first-activation", post(first_activation_handler))  // POST /api/license/first-activation
        .route("/api/license/activation", post(activation_with_code_handler))  // POST /api/license/activation
        
        // Cache management routes
        .route("/api/license/cache/stats", get(cache_stats_handler))  // GET /api/license/cache/stats
        .route("/api/license/cache/clear", post(clear_cache_handler))  // POST /api/license/cache/clear
        
        // Notification routes
        .route("/api/license/notifications", get(notifications_handler))  // GET /api/license/notifications
        .route("/api/license/notifications", post(notifications_handler))  // POST /api/license/notifications  
        .route("/api/license/notifications/test", post(test_notification_handler))  // POST /api/license/notifications/test
}
