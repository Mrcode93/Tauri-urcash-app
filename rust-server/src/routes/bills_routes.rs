use crate::{
    models::{
        ApiResponse, CreateSaleBillRequest, CreatePurchaseBillRequest,
        UpdateSalePaymentRequest, UpdatePurchasePaymentRequest, BillsQuery,
    },
};
use crate::AppState;
use sqlx::Row;
use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post, put, delete},
    Json, Router,
};
use serde_json::json;
use tracing::{info, error};

// ==================== SALE BILLS ROUTES ====================

pub async fn create_sale_bill(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<CreateSaleBillRequest>,
) -> impl IntoResponse {
    // Check authentication
    let auth_header = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    let _token = match auth_header {
        Some(token) => token,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "success": false,
                    "error": "No token provided"
                })),
            );
        }
    };

    match state.bills_service.create_sale_bill(&state.db, request).await {
        Ok(result) => {
            info!("Sale bill created successfully");
            (StatusCode::CREATED, Json(json!({
                "success": true,
                "message": "Sale bill created successfully"
            })))
        }
        Err(e) => {
            error!("Error creating sale bill: {}", e);
            (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "success": false,
                    "error": format!("Error creating sale bill: {}", e)
                })),
            )
        }
    }
}

pub async fn get_all_sale_bills(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<BillsQuery>,
) -> impl IntoResponse {
    // Check authentication
    let auth_header = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    let _token = match auth_header {
        Some(token) => token,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "success": false,
                    "error": "No token provided"
                })),
            );
        }
    };

    match state.bills_service.get_all_sale_bills(&state.db, query).await {
        Ok(result) => {
            info!("Sale bills retrieved successfully");
            (StatusCode::OK, Json(json!({
                "success": true,
                "message": "Sale bills retrieved successfully"
            })))
        }
        Err(e) => {
            error!("Error getting sale bills: {}", e);
            (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "success": false,
                    "error": format!("Error getting sale bills: {}", e)
                })),
            )
        }
    }
}

pub async fn get_sale_bill_by_id(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    headers: HeaderMap,
) -> impl IntoResponse {
    // Check authentication
    let auth_header = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    let _token = match auth_header {
        Some(token) => token,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "success": false,
                    "error": "No token provided"
                })),
            );
        }
    };

    match state.bills_service.get_sale_by_id(&state.db, id).await {
        Ok(sale) => {
            info!("Sale bill retrieved successfully for ID: {}", id);
            (StatusCode::OK, Json(json!({
                "success": true,
                "message": "Sale bill retrieved successfully",
                "data": {
                    "id": sale.id,
                    "invoice_no": sale.invoice_no,
                    "customer_id": sale.customer_id,
                    "total_amount": sale.total_amount
                }
            })))
        }
        Err(e) => {
            error!("Error getting sale bill by ID {}: {}", id, e);
            (
                StatusCode::NOT_FOUND,
                Json(json!({
                    "success": false,
                    "error": format!("Sale bill not found: {}", e)
                })),
            )
        }
    }
}

pub async fn get_bill_by_number(
    State(state): State<AppState>,
    Path(bill_number): Path<String>,
    headers: HeaderMap,
) -> impl IntoResponse {
    // Check authentication
    let auth_header = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    let _token = match auth_header {
        Some(token) => token,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "success": false,
                    "error": "No token provided"
                })),
            );
        }
    };

    match state.bills_service.get_sale_by_invoice_number(&state.db, &bill_number).await {
        Ok(sale) => {
            info!("Sale bill retrieved successfully for number: {}", bill_number);
            (StatusCode::OK, Json(json!({
                "success": true,
                "message": "Sale bill retrieved successfully",
                "data": {
                    "id": sale.id,
                    "invoice_no": sale.invoice_no,
                    "customer_id": sale.customer_id,
                    "total_amount": sale.total_amount
                }
            })))
        }
        Err(e) => {
            error!("Error getting sale bill by number {}: {}", bill_number, e);
            (
                StatusCode::NOT_FOUND,
                Json(json!({
                    "success": false,
                    "error": format!("Sale bill not found: {}", e)
                })),
            )
        }
    }
}

pub async fn update_bill_payment_status(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    headers: HeaderMap,
    Json(request): Json<UpdateSalePaymentRequest>,
) -> impl IntoResponse {
    // Check authentication
    let auth_header = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    let _token = match auth_header {
        Some(token) => token,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "success": false,
                    "error": "No token provided"
                })),
            );
        }
    };

    match state.bills_service.update_sale_payment_status(&state.db, id, request).await {
        Ok(result) => {
            info!("Sale bill payment status updated successfully for ID: {}", id);
            (StatusCode::OK, Json(json!({
                "success": true,
                "message": "Payment status updated successfully"
            })))
        }
        Err(e) => {
            error!("Error updating sale bill payment status for ID {}: {}", id, e);
            (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "success": false,
                    "error": format!("Error updating payment status: {}", e)
                })),
            )
        }
    }
}

pub async fn delete_bill(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    headers: HeaderMap,
) -> impl IntoResponse {
    // Check authentication
    let auth_header = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    let _token = match auth_header {
        Some(token) => token,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "success": false,
                    "error": "No token provided"
                })),
            );
        }
    };

    match state.bills_service.delete_sale(&state.db, id).await {
        Ok(result) => {
            info!("Sale bill deleted successfully for ID: {}", id);
            (StatusCode::OK, Json(json!({
                "success": true,
                "message": "Sale bill deleted successfully"
            })))
        }
        Err(e) => {
            error!("Error deleting sale bill for ID {}: {}", id, e);
            (
                StatusCode::NOT_FOUND,
                Json(json!({
                    "success": false,
                    "error": format!("Error deleting sale bill: {}", e)
                })),
            )
        }
    }
}

// ==================== PURCHASE BILLS ROUTES ====================

pub async fn create_purchase_bill(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<CreatePurchaseBillRequest>,
) -> impl IntoResponse {
    // Check authentication
    let auth_header = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    let _token = match auth_header {
        Some(token) => token,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "success": false,
                    "error": "No token provided"
                })),
            );
        }
    };

    match state.bills_service.create_purchase_bill(&state.db, request).await {
        Ok(result) => {
            info!("Purchase bill created successfully");
            (StatusCode::CREATED, Json(json!({
                "success": true,
                "message": "Purchase bill created successfully"
            })))
        }
        Err(e) => {
            error!("Error creating purchase bill: {}", e);
            (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "success": false,
                    "error": format!("Error creating purchase bill: {}", e)
                })),
            )
        }
    }
}

pub async fn get_all_purchase_bills(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<BillsQuery>,
) -> impl IntoResponse {
    // Check authentication
    let auth_header = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    let _token = match auth_header {
        Some(token) => token,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "success": false,
                    "error": "No token provided"
                })),
            );
        }
    };

    match state.bills_service.get_all_purchase_bills(&state.db, query).await {
        Ok(result) => {
            info!("Purchase bills retrieved successfully");
            (StatusCode::OK, Json(json!({
                "success": true,
                "message": "Purchase bills retrieved successfully"
            })))
        }
        Err(e) => {
            error!("Error getting purchase bills: {}", e);
            (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "success": false,
                    "error": format!("Error getting purchase bills: {}", e)
                })),
            )
        }
    }
}

pub async fn get_purchase_bill_by_id(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    headers: HeaderMap,
) -> impl IntoResponse {
    // Check authentication
    let auth_header = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    let _token = match auth_header {
        Some(token) => token,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "success": false,
                    "error": "No token provided"
                })),
            );
        }
    };

    match state.bills_service.get_purchase_by_id(&state.db, id).await {
        Ok(purchase) => {
            info!("Purchase bill retrieved successfully for ID: {}", id);
            (StatusCode::OK, Json(json!({
                "success": true,
                "message": "Purchase bill retrieved successfully",
                "data": {
                    "id": purchase.id,
                    "invoice_no": purchase.invoice_no,
                    "supplier_id": purchase.supplier_id,
                    "total_amount": purchase.total_amount
                }
            })))
        }
        Err(e) => {
            error!("Error getting purchase bill by ID {}: {}", id, e);
            (
                StatusCode::NOT_FOUND,
                Json(json!({
                    "success": false,
                    "error": format!("Purchase bill not found: {}", e)
                })),
            )
        }
    }
}

pub async fn get_purchase_by_number(
    State(state): State<AppState>,
    Path(invoice_number): Path<String>,
    headers: HeaderMap,
) -> impl IntoResponse {
    // Check authentication
    let auth_header = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    let _token = match auth_header {
        Some(token) => token,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "success": false,
                    "error": "No token provided"
                })),
            );
        }
    };

    match state.bills_service.get_purchase_by_invoice_number(&state.db, &invoice_number).await {
        Ok(purchase) => {
            info!("Purchase bill retrieved successfully for number: {}", invoice_number);
            (StatusCode::OK, Json(json!({
                "success": true,
                "message": "Purchase bill retrieved successfully",
                "data": {
                    "id": purchase.id,
                    "invoice_no": purchase.invoice_no,
                    "supplier_id": purchase.supplier_id,
                    "total_amount": purchase.total_amount
                }
            })))
        }
        Err(e) => {
            error!("Error getting purchase bill by number {}: {}", invoice_number, e);
            (
                StatusCode::NOT_FOUND,
                Json(json!({
                    "success": false,
                    "error": format!("Purchase bill not found: {}", e)
                })),
            )
        }
    }
}

pub async fn update_purchase_payment_status(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    headers: HeaderMap,
    Json(request): Json<UpdatePurchasePaymentRequest>,
) -> impl IntoResponse {
    // Check authentication
    let auth_header = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    let _token = match auth_header {
        Some(token) => token,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "success": false,
                    "error": "No token provided"
                })),
            );
        }
    };

    match state.bills_service.update_purchase_payment_status(&state.db, id, request).await {
        Ok(result) => {
            info!("Purchase bill payment status updated successfully for ID: {}", id);
            (StatusCode::OK, Json(json!({
                "success": true,
                "message": "Payment status updated successfully"
            })))
        }
        Err(e) => {
            error!("Error updating purchase bill payment status for ID {}: {}", id, e);
            (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "success": false,
                    "error": format!("Error updating payment status: {}", e)
                })),
            )
        }
    }
}

pub async fn delete_purchase(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    headers: HeaderMap,
) -> impl IntoResponse {
    // Check authentication
    let auth_header = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    let _token = match auth_header {
        Some(token) => token,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "success": false,
                    "error": "No token provided"
                })),
            );
        }
    };

    match state.bills_service.delete_purchase(&state.db, id).await {
        Ok(result) => {
            info!("Purchase bill deleted successfully for ID: {}", id);
            (StatusCode::OK, Json(json!({
                "success": true,
                "message": "Purchase bill deleted successfully"
            })))
        }
        Err(e) => {
            error!("Error deleting purchase bill for ID {}: {}", id, e);
            (
                StatusCode::NOT_FOUND,
                Json(json!({
                    "success": false,
                    "error": format!("Error deleting purchase bill: {}", e)
                })),
            )
        }
    }
}

// ==================== PLACEHOLDER ROUTES FOR RETURNS AND PAYMENT VOUCHERS ====================

pub async fn create_return_bill(
    State(_state): State<AppState>,
    headers: HeaderMap,
    Json(_request): Json<serde_json::Value>,
) -> impl IntoResponse {
    // Check authentication
    let auth_header = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    let _token = match auth_header {
        Some(token) => token,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "success": false,
                    "error": "No token provided"
                })),
            );
        }
    };

    // TODO: Implement return bill creation
    (
        StatusCode::NOT_IMPLEMENTED,
        Json(json!({
            "success": false,
            "error": "Return bill creation not implemented yet"
        })),
    )
}

pub async fn get_all_return_bills(
    State(_state): State<AppState>,
    headers: HeaderMap,
    Query(_query): Query<serde_json::Value>,
) -> impl IntoResponse {
    // Check authentication
    let auth_header = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    let _token = match auth_header {
        Some(token) => token,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "success": false,
                    "error": "No token provided"
                })),
            );
        }
    };

    // TODO: Implement return bills retrieval
    (
        StatusCode::NOT_IMPLEMENTED,
        Json(json!({
            "success": false,
            "error": "Return bills retrieval not implemented yet"
        })),
    )
}

pub async fn create_payment_voucher(
    State(_state): State<AppState>,
    headers: HeaderMap,
    Json(_request): Json<serde_json::Value>,
) -> impl IntoResponse {
    // Check authentication
    let auth_header = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    let _token = match auth_header {
        Some(token) => token,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "success": false,
                    "error": "No token provided"
                })),
            );
        }
    };

    // TODO: Implement payment voucher creation
    (
        StatusCode::NOT_IMPLEMENTED,
        Json(json!({
            "success": false,
            "error": "Payment voucher creation not implemented yet"
        })),
    )
}

pub async fn get_bills_statistics(
    State(_state): State<AppState>,
    headers: HeaderMap,
    Query(_query): Query<serde_json::Value>,
) -> impl IntoResponse {
    // Check authentication
    let auth_header = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    let _token = match auth_header {
        Some(token) => token,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "success": false,
                    "error": "No token provided"
                })),
            );
        }
    };

    // TODO: Implement bills statistics
    (
        StatusCode::NOT_IMPLEMENTED,
        Json(json!({
            "success": false,
            "error": "Bills statistics not implemented yet"
        })),
    )
}

pub async fn get_purchases_statistics(
    State(_state): State<AppState>,
    headers: HeaderMap,
    Query(_query): Query<serde_json::Value>,
) -> impl IntoResponse {
    // Check authentication
    let auth_header = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    let _token = match auth_header {
        Some(token) => token,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "success": false,
                    "error": "No token provided"
                })),
            );
        }
    };

    // TODO: Implement purchases statistics
    (
        StatusCode::NOT_IMPLEMENTED,
        Json(json!({
            "success": false,
            "error": "Purchases statistics not implemented yet"
        })),
    )
}

pub async fn get_returns_statistics(
    State(_state): State<AppState>,
    headers: HeaderMap,
    Query(_query): Query<serde_json::Value>,
) -> impl IntoResponse {
    // Check authentication
    let auth_header = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    let _token = match auth_header {
        Some(token) => token,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "success": false,
                    "error": "No token provided"
                })),
            );
        }
    };

    // TODO: Implement returns statistics
    (
        StatusCode::NOT_IMPLEMENTED,
        Json(json!({
            "success": false,
            "error": "Returns statistics not implemented yet"
        })),
    )
}

pub async fn debug_tables(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    // Check authentication
    let auth_header = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    let _token = match auth_header {
        Some(token) => token,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "success": false,
                    "error": "No token provided"
                })),
            );
        }
    };

    // Check if tables exist and get counts
    let tables_info = match sqlx::query(
        r#"
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name IN ('sales', 'purchases', 'sale_returns', 'purchase_returns')
        ORDER BY name
        "#
    )
    .fetch_all(&state.db.pool)
    .await {
        Ok(rows) => {
            let mut table_names = Vec::new();
            for row in rows {
                table_names.push(row.get::<String, _>("name"));
            }
            table_names
        }
        Err(e) => {
            error!("Error checking tables: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": format!("Error checking tables: {}", e)
                })),
            );
        }
    };

    // Get counts for each table
    let mut counts = std::collections::HashMap::new();
    for table_name in &tables_info {
        let count_result = sqlx::query(&format!("SELECT COUNT(*) as count FROM {}", table_name))
            .fetch_one(&state.db.pool)
            .await;
        
        if let Ok(row) = count_result {
            let count: i64 = row.get("count");
            counts.insert(table_name.clone(), count);
        }
    }

    let debug_info = json!({
        "tables": tables_info,
        "counts": counts,
        "message": "Debug information retrieved successfully"
    });

    info!("Debug tables information retrieved");
    (StatusCode::OK, Json(json!({
        "success": true,
        "data": debug_info
    })))
}

pub fn bills_routes() -> Router<AppState> {
    Router::new()
        // Sale Bills Routes
        .route("/api/bills/sale", post(create_sale_bill))
        .route("/api/bills/sale", get(get_all_sale_bills))
        .route("/api/bills/sale/:id", get(get_sale_bill_by_id))
        .route("/api/bills/sale/number/:bill_number", get(get_bill_by_number))
        .route("/api/bills/sale/:id/payment", put(update_bill_payment_status))
        .route("/api/bills/sale/:id", delete(delete_bill))
        
        // Purchase Bills Routes
        .route("/api/bills/purchase", post(create_purchase_bill))
        .route("/api/bills/purchase", get(get_all_purchase_bills))
        .route("/api/bills/purchase/:id", get(get_purchase_bill_by_id))
        .route("/api/bills/purchase/number/:invoice_number", get(get_purchase_by_number))
        .route("/api/bills/purchase/:id/payment", put(update_purchase_payment_status))
        .route("/api/bills/purchase/:id", delete(delete_purchase))
        
        // Return Bills Routes (Placeholders)
        .route("/api/bills/return", post(create_return_bill))
        .route("/api/bills/return", get(get_all_return_bills))
        
        // Payment Voucher Routes (Placeholders)
        .route("/api/bills/sale/:sale_id/payment-voucher", post(create_payment_voucher))
        .route("/api/bills/purchase/:purchase_id/payment-voucher", post(create_payment_voucher))
        
        // Statistics Routes (Placeholders)
        .route("/api/bills/statistics/sale", get(get_bills_statistics))
        .route("/api/bills/statistics/purchase", get(get_purchases_statistics))
        .route("/api/bills/statistics/return", get(get_returns_statistics))
        
        // Debug route
        .route("/api/bills/debug/tables", get(debug_tables))
}
