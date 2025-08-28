use axum::{
    routing::{get, post, delete},
    Router,
    extract::{State, Path, Query},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct LogQuery {
    pub hours: Option<u32>,
    pub level: Option<String>,
    pub operation: Option<String>,
    pub user_id: Option<i32>,
    pub limit: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct LogSearchQuery {
    pub query: String,
    pub hours: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct ExportLogsRequest {
    pub hours: Option<u32>,
    pub level: Option<String>,
    pub operation: Option<String>,
    pub user_id: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct ClearLogsQuery {
    pub days: Option<u32>,
}

// Get log files list
async fn get_log_files(State(state): State<AppState>) -> impl IntoResponse {
    match state.log_service.get_log_files().await {
        Ok(files) => Json(json!({
            "success": true,
            "data": files,
            "message": "Log files retrieved successfully"
        })),
        Err(err) => {
            tracing::error!("Failed to get log files: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to get log files"
            }))
        }
    }
}

// Get recent logs with filtering
async fn get_recent_logs(State(state): State<AppState>, Query(query): Query<LogQuery>) -> impl IntoResponse {
    match state.log_service.get_recent_logs(&query).await {
        Ok(logs) => Json(json!({
            "success": true,
            "data": logs.logs,
            "count": logs.logs.len(),
            "message": "Recent logs retrieved successfully"
        })),
        Err(err) => {
            tracing::error!("Failed to get recent logs: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to get recent logs"
            }))
        }
    }
}

// Get log statistics
async fn get_log_stats(State(state): State<AppState>, Query(query): Query<LogQuery>) -> impl IntoResponse {
    match state.log_service.get_log_stats(query.hours.unwrap_or(24)).await {
        Ok(stats) => Json(json!({
            "success": true,
            "data": stats,
            "message": "Log statistics retrieved successfully"
        })),
        Err(err) => {
            tracing::error!("Failed to get log statistics: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to get log statistics"
            }))
        }
    }
}

// Search logs
async fn search_logs(State(state): State<AppState>, Query(query): Query<LogSearchQuery>) -> impl IntoResponse {
    match state.log_service.search_logs(&query.query, query.hours.unwrap_or(24)).await {
        Ok(results) => Json(json!({
            "success": true,
            "data": results,
            "count": results.len(),
            "message": "Log search completed successfully"
        })),
        Err(err) => {
            tracing::error!("Failed to search logs: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to search logs"
            }))
        }
    }
}

// Get error logs
async fn get_error_logs(State(state): State<AppState>, Query(query): Query<LogQuery>) -> impl IntoResponse {
    match state.log_service.get_error_logs(query.hours.unwrap_or(24)).await {
        Ok(errors) => Json(json!({
            "success": true,
            "data": errors,
            "count": errors.len(),
            "message": "Error logs retrieved successfully"
        })),
        Err(err) => {
            tracing::error!("Failed to get error logs: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to get error logs"
            }))
        }
    }
}

// Get performance logs
async fn get_performance_logs(State(state): State<AppState>, Query(query): Query<LogQuery>) -> impl IntoResponse {
    match state.log_service.get_performance_logs(query.hours.unwrap_or(24)).await {
        Ok(performance) => Json(json!({
            "success": true,
            "data": performance,
            "count": performance.len(),
            "message": "Performance logs retrieved successfully"
        })),
        Err(err) => {
            tracing::error!("Failed to get performance logs: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to get performance logs"
            }))
        }
    }
}

// Get user logs
async fn get_user_logs(State(state): State<AppState>, Path(user_id): Path<i32>, Query(query): Query<LogQuery>) -> impl IntoResponse {
    match state.log_service.get_user_logs(user_id, query.hours.unwrap_or(24)).await {
        Ok(logs) => Json(json!({
            "success": true,
            "data": logs,
            "count": logs.len(),
            "message": "User logs retrieved successfully"
        })),
        Err(err) => {
            tracing::error!("Failed to get user logs: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to get user logs"
            }))
        }
    }
}

// Export logs
async fn export_logs(State(state): State<AppState>, Json(payload): Json<ExportLogsRequest>) -> impl IntoResponse {
    match state.log_service.export_logs(&payload).await {
        Ok(export_path) => Json(json!({
            "success": true,
            "data": { "export_path": export_path },
            "message": "Logs exported successfully"
        })),
        Err(err) => {
            tracing::error!("Failed to export logs: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to export logs"
            }))
        }
    }
}

// Clear old logs
async fn clear_old_logs(State(state): State<AppState>, Query(query): Query<ClearLogsQuery>) -> impl IntoResponse {
    match state.log_service.clear_old_logs(query.days.unwrap_or(30)).await {
        Ok(deleted_count) => Json(json!({
            "success": true,
            "data": { "deleted_count": deleted_count },
            "message": format!("Cleared {} old log files", deleted_count)
        })),
        Err(err) => {
            tracing::error!("Failed to clear old logs: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to clear old logs"
            }))
        }
    }
}

pub fn logs_routes() -> Router<AppState> {
    Router::new()
        .route("/api/logs/files", get(get_log_files))
        .route("/api/logs/recent", get(get_recent_logs))
        .route("/api/logs/stats", get(get_log_stats))
        .route("/api/logs/search", get(search_logs))
        .route("/api/logs/errors", get(get_error_logs))
        .route("/api/logs/performance", get(get_performance_logs))
        .route("/api/logs/user/:user_id", get(get_user_logs))
        .route("/api/logs/export", post(export_logs))
        .route("/api/logs/clear", delete(clear_old_logs))
}