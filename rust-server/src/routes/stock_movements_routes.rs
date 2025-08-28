use axum::{
    routing::{get, post},
    Router,
    extract::{State, Path, Query},
    response::IntoResponse,
    Json,
};
use serde_json::json;
use crate::AppState;
use crate::models::stock_movement::*;
use tracing::{info, warn, error};

// Get all stock movements
async fn get_stock_movements(
    State(state): State<AppState>,
    Query(query): Query<StockMovementQuery>,
) -> impl IntoResponse {
    match state.stock_movements_service.get_all(&state.db, &query).await {
        Ok(movements) => {
            info!("Stock movements retrieved successfully");
            Json(json!({
                "success": true,
                "data": movements.items,
                "pagination": {
                    "page": movements.page,
                    "limit": movements.limit,
                    "total": movements.total,
                    "pages": movements.total_pages
                },
                "message": "Stock movements retrieved successfully"
            }))
        },
        Err(err) => {
            error!("Failed to get stock movements: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب حركات المخزون",
                "error": err.to_string()
            }))
        }
    }
}

// Create stock movement
async fn create_stock_movement(
    State(state): State<AppState>,
    Json(movement_data): Json<CreateStockMovementRequest>,
) -> impl IntoResponse {
    // Validate required fields
    if movement_data.movement_type.trim().is_empty() {
        return Json(json!({
            "success": false,
            "message": "نوع الحركة مطلوب"
        }));
    }

    if movement_data.product_id <= 0 {
        return Json(json!({
            "success": false,
            "message": "معرف المنتج مطلوب"
        }));
    }

    if movement_data.quantity <= 0 {
        return Json(json!({
            "success": false,
            "message": "الكمية يجب أن تكون أكبر من صفر"
        }));
    }

    // Validate movement type
    let valid_types = vec!["purchase", "sale", "adjustment", "return", "initial", "transfer"];
    if !valid_types.contains(&movement_data.movement_type.as_str()) {
        return Json(json!({
            "success": false,
            "message": "نوع الحركة غير صحيح"
        }));
    }

    match state.stock_movements_service.create(&state.db, movement_data).await {
        Ok(result) => {
            info!("Stock movement created successfully");
            Json(json!({
                "success": true,
                "data": {
                    "id": result.id,
                    "updatedStocks": result.updated_stocks,
                    "updatedProduct": result.updated_product
                },
                "message": "تم إنشاء حركة المخزون بنجاح"
            }))
        },
        Err(err) => {
            error!("Failed to create stock movement: {}", err);
            Json(json!({
                "success": false,
                "message": err.to_string()
            }))
        }
    }
}

// Get movement statistics
async fn get_movement_stats(
    State(state): State<AppState>,
    Query(query): Query<StockMovementsSummaryQuery>,
) -> impl IntoResponse {
    match state.stock_movements_service.get_statistics(&state.db, &query).await {
        Ok(stats) => {
            info!("Stock movement statistics retrieved successfully");
            Json(json!({
                "success": true,
                "data": {
                    "period_days": stats.period_days,
                    "movement_type": stats.movement_type,
                    "stats": stats.stats,
                    "summary": stats.summary
                },
                "message": "تم جلب إحصائيات حركات المخزون بنجاح"
            }))
        },
        Err(err) => {
            error!("Failed to get movement stats: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب إحصائيات حركات المخزون",
                "error": err.to_string()
            }))
        }
    }
}

// Get movement by ID
async fn get_stock_movement_by_id(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.stock_movements_service.get_by_id(&state.db, id).await {
        Ok(Some(movement)) => {
            info!("Stock movement retrieved successfully");
            Json(json!({
                "success": true,
                "data": movement,
                "message": "تم جلب حركة المخزون بنجاح"
            }))
        },
        Ok(None) => {
            warn!("Stock movement not found: {}", id);
            Json(json!({
                "success": false,
                "message": "حركة المخزون غير موجودة"
            }))
        },
        Err(err) => {
            error!("Failed to get stock movement: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب حركة المخزون",
                "error": err.to_string()
            }))
        }
    }
}

// Reverse stock movement
async fn reverse_stock_movement(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(reverse_data): Json<ReverseStockMovementRequest>,
) -> impl IntoResponse {
    match state.stock_movements_service.reverse(&state.db, id, reverse_data).await {
        Ok(movement_id) => {
            info!("Stock movement reversed successfully");
            Json(json!({
                "success": true,
                "data": { "id": movement_id },
                "message": "تم إلغاء حركة المخزون بنجاح"
            }))
        },
        Err(err) => {
            error!("Failed to reverse stock movement: {}", err);
            Json(json!({
                "success": false,
                "message": err.to_string()
            }))
        }
    }
}

pub fn stock_movements_routes() -> Router<AppState> {
    Router::new()
        .route("/api/stock-movements", get(get_stock_movements).post(create_stock_movement))
        .route("/api/stock-movements/stats", get(get_movement_stats))
        .route("/api/stock-movements/:id", get(get_stock_movement_by_id))
        .route("/api/stock-movements/:id/reverse", post(reverse_stock_movement))
}