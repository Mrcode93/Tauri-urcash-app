use axum::{
    routing::{get, post, put, delete},
    Router,
    extract::{State, Path, Query},
    response::IntoResponse,
    Json,
};
use serde_json::json;
use crate::AppState;
use crate::models::sale::*;
use tracing::{info, warn, error};

// Get all sales
async fn get_sales(
    State(state): State<AppState>,
    Query(query): Query<SaleQuery>,
) -> impl IntoResponse {
    match state.sale_service.get_all(&state.db, &query).await {
        Ok(sales) => {
            info!("Sales fetched successfully");
            Json(json!({
                "success": true,
                "message": "Sales fetched successfully",
                "data": sales
            }))
        },
        Err(err) => {
            error!("Failed to get sales: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to get sales"
            }))
        }
    }
}

// Get sale by ID
async fn get_sale_by_id(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.sale_service.get_by_id(&state.db, id).await {
        Ok(Some(sale)) => {
            info!("Sale fetched successfully");
            Json(json!({
                "success": true,
                "message": "Sale fetched successfully",
                "data": sale
            }))
        },
        Ok(None) => {
            warn!("Sale not found: {}", id);
            Json(json!({
                "success": false,
                "message": "Sale not found"
            }))
        },
        Err(err) => {
            error!("Failed to get sale: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to get sale"
            }))
        }
    }
}

// Get customer sales
async fn get_customer_sales(
    State(state): State<AppState>,
    Path(customer_id): Path<i64>,
) -> impl IntoResponse {
    match state.sale_service.get_by_customer(&state.db, customer_id).await {
        Ok(sales) => {
            info!("Customer sales fetched successfully");
            Json(json!({
                "success": true,
                "message": "Customer sales fetched successfully",
                "data": sales
            }))
        },
        Err(err) => {
            error!("Failed to get customer sales: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to get customer sales"
            }))
        }
    }
}

// Create new sale
async fn create_sale(
    State(state): State<AppState>,
    Json(sale_data): Json<CreateSaleRequest>,
) -> impl IntoResponse {
    // Validate required fields
    if sale_data.invoice_date.is_none() {
        return Json(json!({
            "success": false,
            "message": "Invoice date is required"
        }));
    }

    if sale_data.items.is_empty() {
        return Json(json!({
            "success": false,
            "message": "Items are required"
        }));
    }

    // For anonymous sales, customer_id should be 999
    if !sale_data.is_anonymous.unwrap_or(false) && sale_data.customer_id.is_none() {
        return Json(json!({
            "success": false,
            "message": "Customer ID is required for non-anonymous sales"
        }));
    }

    // Validate items
    for item in &sale_data.items {
        if item.quantity <= 0 || item.price <= 0.0 {
            return Json(json!({
                "success": false,
                "message": "Invalid item data"
            }));
        }
    }

    match state.sale_service.create(&state.db, sale_data).await {
        Ok(sale) => {
            info!("Sale created successfully");
            Json(json!({
                "success": true,
                "message": "Sale created successfully",
                "data": sale
            }))
        },
        Err(err) => {
            error!("Failed to create sale: {}", err);
            
            // Handle specific duplicate errors
            let error_message = if err.to_string().contains("duplicate") || 
                                 err.to_string().contains("already exists") {
                "تم إنشاء فاتورة مماثلة مسبقاً، يرجى التحقق من قائمة المبيعات"
            } else {
                "Failed to create sale"
            };
            
            Json(json!({
                "success": false,
                "message": error_message
            }))
        }
    }
}

// Update sale
async fn update_sale(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(sale_data): Json<UpdateSaleRequest>,
) -> impl IntoResponse {
    // Validate required fields
    if sale_data.customer_id.is_none() || sale_data.invoice_date.is_none() {
        return Json(json!({
            "success": false,
            "message": "Customer ID and invoice date are required"
        }));
    }

    // Validate items if provided
    if let Some(ref items) = sale_data.items {
        for item in items {
            if item.quantity <= 0 || item.price <= 0.0 {
                return Json(json!({
                    "success": false,
                    "message": "Invalid item data"
                }));
            }
        }
    }

    match state.sale_service.update(&state.db, id, sale_data).await {
        Ok(sale) => {
            info!("Sale updated successfully");
            Json(json!({
                "success": true,
                "message": "Sale updated successfully",
                "data": sale
            }))
        },
        Err(err) => {
            error!("Failed to update sale: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to update sale"
            }))
        }
    }
}

// Delete sale
async fn delete_sale(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.sale_service.delete(&state.db, id).await {
        Ok(deleted) => {
            if deleted {
                info!("Sale deleted successfully");
                Json(json!({
                    "success": true,
                    "message": "Sale deleted successfully",
                    "data": {}
                }))
            } else {
                warn!("Sale not found for deletion: {}", id);
                Json(json!({
                    "success": false,
                    "message": "Sale not found"
                }))
            }
        },
        Err(err) => {
            error!("Failed to delete sale: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to delete sale"
            }))
        }
    }
}

// Process sale return
async fn process_sale_return(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(return_data): Json<SaleReturnRequest>,
) -> impl IntoResponse {
    // Validate return data
    if return_data.items.is_empty() {
        return Json(json!({
            "success": false,
            "message": "Return items are required"
        }));
    }

    if return_data.reason.trim().is_empty() {
        return Json(json!({
            "success": false,
            "message": "Return reason is required"
        }));
    }

    if return_data.refund_method.trim().is_empty() {
        return Json(json!({
            "success": false,
            "message": "Refund method is required"
        }));
    }

    match state.sale_service.process_return(&state.db, id, return_data).await {
        Ok(result) => {
            info!("Sale return processed successfully");
            Json(json!({
                "success": true,
                "message": "Sale return processed successfully",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to process sale return: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to process sale return"
            }))
        }
    }
}

// Get product by barcode for POS
async fn get_product_by_barcode(
    State(state): State<AppState>,
    Path(barcode): Path<String>,
) -> impl IntoResponse {
    // If barcode is null or empty, return 400
    if barcode.trim().is_empty() {
        return Json(json!({
            "success": false,
            "message": "Barcode is required"
        }));
    }

    // Get settings to check allow_negative_stock
    let allow_negative_stock = false; // TODO: Get from settings service
    
    match state.sale_service.get_product_by_barcode(&state.db, &barcode, allow_negative_stock).await {
        Ok(Some(product)) => {
            info!("Product found by barcode: {}", barcode);
            Json(json!({
                "success": true,
                "message": "Product found",
                "data": product
            }))
        },
        Ok(None) => {
            warn!("Product not found or out of stock: {}", barcode);
            Json(json!({
                "success": false,
                "message": "Product not found or out of stock"
            }))
        },
        Err(err) => {
            error!("Failed to get product by barcode: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to get product by barcode"
            }))
        }
    }
}

pub fn sales_routes() -> Router<AppState> {
    Router::new()
        .route("/api/sales", get(get_sales))
        .route("/api/sales/:id", get(get_sale_by_id))
        .route("/api/sales/customer/:customer_id", get(get_customer_sales))
        .route("/api/sales", post(create_sale))
        .route("/api/sales/:id", put(update_sale))
        .route("/api/sales/:id", delete(delete_sale))
        .route("/api/sales/:id/return", post(process_sale_return))
        .route("/api/sales/pos/product/:barcode", get(get_product_by_barcode))
}