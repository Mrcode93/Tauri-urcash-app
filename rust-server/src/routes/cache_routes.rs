use axum::{
    routing::{get, post, delete},
    Router,
    extract::{State, Path},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct SetCacheRequest {
    pub key: String,
    pub value: serde_json::Value,
    pub ttl: Option<u64>, // Time to live in seconds
}

#[derive(Debug, Deserialize)]
pub struct InvalidateRequest {
    pub pattern: String,
}

// Get cache statistics
async fn get_cache_stats(State(state): State<AppState>) -> impl IntoResponse {
    match state.cache_service.get_statistics().await {
        Ok(stats) => Json(json!({
            "success": true,
            "data": stats
        })),
        Err(err) => {
            tracing::error!("Failed to get cache stats: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to get cache stats"
            }))
        }
    }
}

// Get all cache keys
async fn get_cache_keys(State(state): State<AppState>) -> impl IntoResponse {
    match state.cache_service.get_all_keys().await {
        Ok(keys) => Json(json!({
            "success": true,
            "data": keys
        })),
        Err(err) => {
            tracing::error!("Failed to get cache keys: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to get cache keys"
            }))
        }
    }
}

// Get cache memory usage
async fn get_cache_memory(State(state): State<AppState>) -> impl IntoResponse {
    match state.cache_service.get_memory_usage().await {
        Ok(memory) => Json(json!({
            "success": true,
            "data": memory
        })),
        Err(err) => {
            tracing::error!("Failed to get cache memory usage: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to get cache memory usage"
            }))
        }
    }
}

// Flush all cache
async fn flush_cache(State(state): State<AppState>) -> impl IntoResponse {
    match state.cache_service.flush_all().await {
        Ok(result) => Json(json!({
            "success": true,
            "data": result,
            "message": "Cache flushed successfully"
        })),
        Err(err) => {
            tracing::error!("Failed to flush cache: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to flush cache"
            }))
        }
    }
}

// Delete specific cache key
async fn delete_cache_key(State(state): State<AppState>, Path(key): Path<String>) -> impl IntoResponse {
    match state.cache_service.delete_key(&key).await {
        Ok(result) => Json(json!({
            "success": true,
            "data": result,
            "message": "Cache key deleted successfully"
        })),
        Err(err) => {
            tracing::error!("Failed to delete cache key: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to delete cache key"
            }))
        }
    }
}

// Invalidate cache by pattern
async fn invalidate_cache(State(state): State<AppState>, Json(payload): Json<InvalidateRequest>) -> impl IntoResponse {
    match state.cache_service.invalidate_by_pattern(&payload.pattern).await {
        Ok(result) => Json(json!({
            "success": true,
            "data": result,
            "message": "Cache invalidated successfully"
        })),
        Err(err) => {
            tracing::error!("Failed to invalidate cache: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to invalidate cache"
            }))
        }
    }
}

// Get specific cache key value
async fn get_cache_key_value(State(state): State<AppState>, Path(key): Path<String>) -> impl IntoResponse {
    match state.cache_service.get_key_value(&key).await {
        Ok(value) => Json(json!({
            "success": true,
            "data": value
        })),
        Err(err) => {
            tracing::error!("Failed to get cache key value: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to get cache key value"
            }))
        }
    }
}

// Set cache key manually
async fn set_cache_key(State(state): State<AppState>, Json(payload): Json<SetCacheRequest>) -> impl IntoResponse {
    match state.cache_service.set_key(&payload.key, payload.value, payload.ttl).await {
        Ok(result) => Json(json!({
            "success": true,
            "data": result,
            "message": "Cache key set successfully"
        })),
        Err(err) => {
            tracing::error!("Failed to set cache key: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to set cache key"
            }))
        }
    }
}

// Get cache health status
async fn get_cache_health(State(state): State<AppState>) -> impl IntoResponse {
    match state.cache_service.get_health_status().await {
        Ok(health) => Json(json!({
            "success": true,
            "data": health
        })),
        Err(err) => {
            tracing::error!("Failed to get cache health: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to get cache health"
            }))
        }
    }
}

pub fn cache_routes() -> Router<AppState> {
    Router::new()
        .route("/api/cache/stats", get(get_cache_stats))
        .route("/api/cache/keys", get(get_cache_keys))
        .route("/api/cache/memory", get(get_cache_memory))
        .route("/api/cache/flush", post(flush_cache))
        .route("/api/cache/invalidate", post(invalidate_cache))
        .route("/api/cache/set", post(set_cache_key))
        .route("/api/cache/health", get(get_cache_health))
        .route("/api/cache/key/:key", get(get_cache_key_value).delete(delete_cache_key))
}   