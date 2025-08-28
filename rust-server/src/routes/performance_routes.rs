use axum::{
    routing::{get, post},
    Router,
    extract::{State},
    response::IntoResponse,
    Json,
};
use serde_json::json;
use crate::AppState;

// Get performance overview
async fn get_performance_overview(State(state): State<AppState>) -> impl IntoResponse {
    match state.performance_service.get_overview(&state.db).await {
        Ok(overview) => Json(json!({"success": true, "data": overview})),
        Err(err) => {
            tracing::error!("Failed to get performance overview: {}", err);
            Json(json!({"success": false, "message": "Failed to get performance overview"}))
        }
    }
}

// Get database statistics
async fn get_database_stats(State(state): State<AppState>) -> impl IntoResponse {
    match state.performance_service.get_database_stats(&state.db).await {
        Ok(stats) => Json(json!({"success": true, "data": stats})),
        Err(err) => {
            tracing::error!("Failed to get database stats: {}", err);
            Json(json!({"success": false, "message": "Failed to get database stats"}))
        }
    }
}

// Get recent slow queries
async fn get_slow_queries(State(state): State<AppState>) -> impl IntoResponse {
    match state.performance_service.get_slow_queries(&state.db).await {
        Ok(queries) => Json(json!({"success": true, "data": queries})),
        Err(err) => {
            tracing::error!("Failed to get slow queries: {}", err);
            Json(json!({"success": false, "message": "Failed to get slow queries"}))
        }
    }
}

// Get top queries by execution time
async fn get_top_queries(State(state): State<AppState>) -> impl IntoResponse {
    match state.performance_service.get_top_queries(&state.db).await {
        Ok(queries) => Json(json!({"success": true, "data": queries})),
        Err(err) => {
            tracing::error!("Failed to get top queries: {}", err);
            Json(json!({"success": false, "message": "Failed to get top queries"}))
        }
    }
}

// Get optimization suggestions
async fn get_suggestions(State(state): State<AppState>) -> impl IntoResponse {
    match state.performance_service.get_suggestions(&state.db).await {
        Ok(suggestions) => Json(json!({"success": true, "data": suggestions})),
        Err(err) => {
            tracing::error!("Failed to get optimization suggestions: {}", err);
            Json(json!({"success": false, "message": "Failed to get optimization suggestions"}))
        }
    }
}

// Get complete performance report
async fn get_full_report(State(state): State<AppState>) -> impl IntoResponse {
    match state.performance_service.get_full_report(&state.db).await {
        Ok(report) => Json(json!({"success": true, "data": report})),
        Err(err) => {
            tracing::error!("Failed to get full performance report: {}", err);
            Json(json!({"success": false, "message": "Failed to get full performance report"}))
        }
    }
}

// Reset performance metrics
async fn reset_metrics(State(state): State<AppState>) -> impl IntoResponse {
    match state.performance_service.reset_metrics(&state.db).await {
        Ok(result) => Json(json!({"success": true, "data": result, "message": "Performance metrics reset successfully"})),
        Err(err) => {
            tracing::error!("Failed to reset performance metrics: {}", err);
            Json(json!({"success": false, "message": "Failed to reset performance metrics"}))
        }
    }
}

// Health check endpoint
async fn health_check(State(state): State<AppState>) -> impl IntoResponse {
    match state.performance_service.health_check(&state.db).await {
        Ok(health) => Json(json!({"success": true, "data": health})),
        Err(err) => {
            tracing::error!("Health check failed: {}", err);
            Json(json!({"success": false, "message": "Health check failed"}))
        }
    }
}

pub fn performance_routes() -> Router<AppState> {
    Router::new()
        .route("/api/performance/overview", get(get_performance_overview))
        .route("/api/performance/database-stats", get(get_database_stats))
        .route("/api/performance/slow-queries", get(get_slow_queries))
        .route("/api/performance/top-queries", get(get_top_queries))
        .route("/api/performance/suggestions", get(get_suggestions))
        .route("/api/performance/full-report", get(get_full_report))
        .route("/api/performance/reset", post(reset_metrics))
        .route("/api/performance/health", get(health_check))
}