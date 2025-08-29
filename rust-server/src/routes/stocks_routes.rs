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
use crate::models::stock::*;
use tracing::{info, warn, error};

#[derive(Debug, Serialize, Deserialize)]
pub struct AddProductToStockRequestFrontend {
    #[serde(deserialize_with = "deserialize_string_to_i64")]
    pub product_id: i64,
    pub quantity: i64,
    pub location_in_stock: Option<String>,
}

fn deserialize_string_to_i64<'de, D>(deserializer: D) -> Result<i64, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::de::Error;
    let s = String::deserialize(deserializer)?;
    s.parse::<i64>().map_err(D::Error::custom)
}

// Get all stocks
async fn get_stocks(
    State(state): State<AppState>,
    Query(query): Query<StockQuery>,
) -> impl IntoResponse {
    match state.stock_service.get_all(&state.db, &query).await {
        Ok(stocks) => {
            info!("Stocks retrieved successfully");
            Json(json!({
                "success": true,
                "data": stocks,
                "message": "Stocks retrieved successfully"
            }))
        },
        Err(err) => {
            error!("Failed to get stocks: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to retrieve stocks",
                "error": err.to_string()
            }))
        }
    }
}

// Get stock by ID
async fn get_stock_by_id(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.stock_service.get_by_id(&state.db, id).await {
        Ok(Some(stock)) => {
            info!("Stock retrieved successfully");
            Json(json!({
                "success": true,
                "data": stock,
                "message": "Stock retrieved successfully"
            }))
        },
        Ok(None) => {
            warn!("Stock not found: {}", id);
            Json(json!({
                "success": false,
                "message": "Stock not found"
            }))
        },
        Err(err) => {
            error!("Failed to get stock: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to retrieve stock",
                "error": err.to_string()
            }))
        }
    }
}

// Create new stock
async fn create_stock(
    State(state): State<AppState>,
    Json(stock_data): Json<CreateStockRequest>,
) -> impl IntoResponse {
    // Validate required fields
    if stock_data.name.trim().is_empty() {
        return Json(json!({
            "success": false,
            "message": "Name is required"
        }));
    }

    if stock_data.code.trim().is_empty() {
        return Json(json!({
            "success": false,
            "message": "Code is required"
        }));
    }

    if stock_data.address.trim().is_empty() {
        return Json(json!({
            "success": false,
            "message": "Address is required"
        }));
    }

    match state.stock_service.create(&state.db, stock_data).await {
        Ok(stock) => {
            info!("Stock created successfully");
            Json(json!({
                "success": true,
                "data": { "id": stock.id },
                "message": "Stock created successfully"
            }))
        },
        Err(err) => {
            error!("Failed to create stock: {}", err);
            Json(json!({
                "success": false,
                "message": err.to_string()
            }))
        }
    }
}

// Update stock
async fn update_stock(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(stock_data): Json<UpdateStockRequest>,
) -> impl IntoResponse {
    match state.stock_service.update(&state.db, id, stock_data).await {
        Ok(_) => {
            info!("Stock updated successfully");
            Json(json!({
                "success": true,
                "message": "Stock updated successfully"
            }))
        },
        Err(err) => {
            error!("Failed to update stock: {}", err);
            Json(json!({
                "success": false,
                "message": err.to_string()
            }))
        }
    }
}

// Delete stock
async fn delete_stock(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.stock_service.delete(&state.db, id).await {
        Ok(deleted) => {
            if deleted {
                info!("Stock deleted successfully");
                Json(json!({
                    "success": true,
                    "message": "Stock deleted successfully"
                }))
            } else {
                warn!("Stock not found for deletion: {}", id);
                Json(json!({
                    "success": false,
                    "message": "Stock not found"
                }))
            }
        },
        Err(err) => {
            error!("Failed to delete stock: {}", err);
            Json(json!({
                "success": false,
                "message": err.to_string()
            }))
        }
    }
}

// Get products in a specific stock
async fn get_stock_products(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.stock_service.get_products(&state.db, id).await {
        Ok(products) => {
            info!("Stock products retrieved successfully");
            Json(json!({
                "success": true,
                "data": products,
                "message": "Stock products retrieved successfully"
            }))
        },
        Err(err) => {
            error!("Failed to get stock products: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to retrieve stock products",
                "error": err.to_string()
            }))
        }
    }
}

// Get stock movements
async fn get_stock_movements(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Query(query): Query<StockMovementQuery>,
) -> impl IntoResponse {
    match state.stock_service.get_movements(&state.db, id, &query).await {
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
                "message": "Failed to retrieve stock movements",
                "error": err.to_string()
            }))
        }
    }
}

// Get stock statistics
async fn get_stock_stats(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.stock_service.get_statistics(&state.db, id).await {
        Ok(Some(stats)) => {
            info!("Stock statistics retrieved successfully");
            Json(json!({
                "success": true,
                "data": stats,
                "message": "Stock statistics retrieved successfully"
            }))
        },
        Ok(None) => {
            warn!("Stock not found for statistics: {}", id);
            Json(json!({
                "success": false,
                "message": "Stock not found"
            }))
        },
        Err(err) => {
            error!("Failed to get stock statistics: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to retrieve stock statistics",
                "error": err.to_string()
            }))
        }
    }
}

// Add product to stock
async fn add_product_to_stock(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(frontend_request): Json<AddProductToStockRequestFrontend>,
) -> impl IntoResponse {
    // Validate required fields
    if frontend_request.quantity <= 0 {
        return Json(json!({
            "success": false,
            "message": "الكمية يجب أن تكون أكبر من صفر"
        }));
    }

    // Convert frontend request to backend request
    let request = AddProductToStockRequest {
        product_id: frontend_request.product_id,
        quantity: frontend_request.quantity,
        location_in_stock: frontend_request.location_in_stock,
    };

    match state.stock_service.add_product(&state.db, id, request).await {
        Ok(_) => {
            info!("Product added to stock successfully");
            Json(json!({
                "success": true,
                "message": "تم إضافة المنتج إلى المخزن بنجاح"
            }))
        },
        Err(err) => {
            error!("Failed to add product to stock: {}", err);
            Json(json!({
                "success": false,
                "message": format!("فشل في إضافة المنتج إلى المخزن: {}", err)
            }))
        }
    }
}

pub fn stocks_routes() -> Router<AppState> {
    Router::new()
        .route("/api/stocks", get(get_stocks))
        .route("/api/stocks", post(create_stock))
        .route("/api/stocks/:id", get(get_stock_by_id))
        .route("/api/stocks/:id", put(update_stock))
        .route("/api/stocks/:id", delete(delete_stock))
        .route("/api/stocks/:id/products", get(get_stock_products))
        .route("/api/stocks/:id/movements", get(get_stock_movements))
        .route("/api/stocks/:id/stats", get(get_stock_stats))
        .route("/api/stocks/:id/products", post(add_product_to_stock))
}