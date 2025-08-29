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
                "message": "Sale bills retrieved successfully",
                "data": result
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
                "message": "Purchase bills retrieved successfully",
                "data": result
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
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<serde_json::Value>,
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

    // Extract query parameters
    let page = query.get("page").and_then(|v| v.as_u64()).unwrap_or(1) as i64;
    let limit = query.get("limit").and_then(|v| v.as_u64()).unwrap_or(20) as i64;
    let offset = (page - 1) * limit;

    // Get sale returns
    let sale_returns_query = r#"
        SELECT 
            id, 'sale' as return_type, return_date, total_amount, status, reason,
            created_at, updated_at
        FROM sale_returns 
        WHERE status != 'cancelled'
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    "#;

    let sale_returns = sqlx::query(sale_returns_query)
        .bind(limit)
        .bind(offset)
        .fetch_all(&state.db.pool)
        .await;

    // Get purchase returns
    let purchase_returns_query = r#"
        SELECT 
            id, 'purchase' as return_type, return_date, total_amount, status, reason,
            created_at, updated_at
        FROM purchase_returns 
        WHERE status != 'cancelled'
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    "#;

    let purchase_returns = sqlx::query(purchase_returns_query)
        .bind(limit)
        .bind(offset)
        .fetch_all(&state.db.pool)
        .await;

    match (sale_returns, purchase_returns) {
        (Ok(sale_rows), Ok(purchase_rows)) => {
            let mut all_returns = Vec::new();

            // Process sale returns
            for row in sale_rows {
                let return_bill = json!({
                    "id": row.get::<i64, _>("id"),
                    "return_type": "sale",
                    "return_date": row.get::<String, _>("return_date"),
                    "total_amount": row.get::<f64, _>("total_amount"),
                    "status": row.get::<String, _>("status"),
                    "reason": row.get::<Option<String>, _>("reason"),
                    "created_at": row.get::<String, _>("created_at"),
                    "updated_at": row.get::<String, _>("updated_at")
                });
                all_returns.push(return_bill);
            }

            // Process purchase returns
            for row in purchase_rows {
                let return_bill = json!({
                    "id": row.get::<i64, _>("id"),
                    "return_type": "purchase",
                    "return_date": row.get::<String, _>("return_date"),
                    "total_amount": row.get::<f64, _>("total_amount"),
                    "status": row.get::<String, _>("status"),
                    "reason": row.get::<Option<String>, _>("reason"),
                    "created_at": row.get::<String, _>("created_at"),
                    "updated_at": row.get::<String, _>("updated_at")
                });
                all_returns.push(return_bill);
            }

            // Sort by created_at descending
            all_returns.sort_by(|a, b| {
                let a_date = a["created_at"].as_str().unwrap_or("");
                let b_date = b["created_at"].as_str().unwrap_or("");
                b_date.cmp(a_date)
            });

            // Get total count
            let total_sale_returns: i64 = sqlx::query("SELECT COUNT(*) as count FROM sale_returns WHERE status != 'cancelled'")
                .fetch_one(&state.db.pool)
                .await
                .map(|row| row.get("count"))
                .unwrap_or(0);

            let total_purchase_returns: i64 = sqlx::query("SELECT COUNT(*) as count FROM purchase_returns WHERE status != 'cancelled'")
                .fetch_one(&state.db.pool)
                .await
                .map(|row| row.get("count"))
                .unwrap_or(0);

            let total = total_sale_returns + total_purchase_returns;

            let response = json!({
                "data": all_returns,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "totalPages": (total + limit - 1) / limit
                }
            });

            info!("Return bills retrieved successfully");
            (
                StatusCode::OK,
                Json(json!({
                    "success": true,
                    "data": response
                }))
            )
        },
        (Err(err), _) | (_, Err(err)) => {
            error!("Failed to get return bills: {}", err);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": "Failed to get return bills"
                }))
            )
        }
    }
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
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<serde_json::Value>,
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

    // Extract date filters
    let date_from = query.get("date_from").and_then(|v| v.as_str());
    let date_to = query.get("date_to").and_then(|v| v.as_str());

    // Build date filter conditions
    let mut date_conditions = Vec::new();
    if let Some(from) = date_from {
        date_conditions.push(format!("invoice_date >= '{}'", from));
    }
    if let Some(to) = date_to {
        date_conditions.push(format!("invoice_date <= '{}'", to));
    }

    let where_clause = if date_conditions.is_empty() {
        "WHERE status != 'cancelled'".to_string()
    } else {
        format!("WHERE status != 'cancelled' AND {}", date_conditions.join(" AND "))
    };

    // Get sales statistics
    let stats_query = format!(
        r#"
        SELECT 
            COUNT(*) as total_bills,
            COALESCE(CAST(SUM(total_amount) AS REAL), 0.0) as total_amount,
            COALESCE(CAST(SUM(paid_amount) AS REAL), 0.0) as total_paid,
            COALESCE(CAST(SUM(total_amount - paid_amount) AS REAL), 0.0) as total_unpaid
        FROM sales 
        {}
        "#,
        where_clause
    );

    match sqlx::query(&stats_query)
        .fetch_one(&state.db.pool)
        .await
    {
        Ok(row) => {
            let statistics = json!({
                "total_bills": row.get::<i64, _>("total_bills"),
                "total_amount": row.get::<f64, _>("total_amount"),
                "total_paid": row.get::<f64, _>("total_paid"),
                "total_unpaid": row.get::<f64, _>("total_unpaid")
            });

            info!("Sales statistics retrieved successfully");
            (
                StatusCode::OK,
                Json(json!({
                    "success": true,
                    "data": statistics
                }))
            )
        },
        Err(err) => {
            error!("Failed to get sales statistics: {}", err);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": "Failed to get sales statistics"
                }))
            )
        }
    }
}

pub async fn get_purchases_statistics(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<serde_json::Value>,
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

    // Extract date filters
    let date_from = query.get("date_from").and_then(|v| v.as_str());
    let date_to = query.get("date_to").and_then(|v| v.as_str());

    // Build date filter conditions
    let mut date_conditions = Vec::new();
    if let Some(from) = date_from {
        date_conditions.push(format!("invoice_date >= '{}'", from));
    }
    if let Some(to) = date_to {
        date_conditions.push(format!("invoice_date <= '{}'", to));
    }

    let where_clause = if date_conditions.is_empty() {
        "WHERE status != 'cancelled'".to_string()
    } else {
        format!("WHERE status != 'cancelled' AND {}", date_conditions.join(" AND "))
    };

    // Get purchases statistics
    let stats_query = format!(
        r#"
        SELECT 
            COUNT(*) as total_purchases,
            COALESCE(CAST(SUM(total_amount) AS REAL), 0.0) as total_amount,
            COALESCE(CAST(SUM(paid_amount) AS REAL), 0.0) as total_paid,
            COALESCE(CAST(SUM(total_amount - paid_amount) AS REAL), 0.0) as total_unpaid
        FROM purchases 
        {}
        "#,
        where_clause
    );

    match sqlx::query(&stats_query)
        .fetch_one(&state.db.pool)
        .await
    {
        Ok(row) => {
            let statistics = json!({
                "total_purchases": row.get::<i64, _>("total_purchases"),
                "total_amount": row.get::<f64, _>("total_amount"),
                "total_paid": row.get::<f64, _>("total_paid"),
                "total_unpaid": row.get::<f64, _>("total_unpaid")
            });

            info!("Purchases statistics retrieved successfully");
            (
                StatusCode::OK,
                Json(json!({
                    "success": true,
                    "data": statistics
                }))
            )
        },
        Err(err) => {
            error!("Failed to get purchases statistics: {}", err);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": "Failed to get purchases statistics"
                }))
            )
        }
    }
}

pub async fn get_returns_statistics(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<serde_json::Value>,
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

    // Extract date filters
    let date_from = query.get("date_from").and_then(|v| v.as_str());
    let date_to = query.get("date_to").and_then(|v| v.as_str());

    // Build date filter conditions
    let mut date_conditions = Vec::new();
    if let Some(from) = date_from {
        date_conditions.push(format!("return_date >= '{}'", from));
    }
    if let Some(to) = date_to {
        date_conditions.push(format!("return_date <= '{}'", to));
    }

    let where_clause = if date_conditions.is_empty() {
        "WHERE status != 'cancelled'".to_string()
    } else {
        format!("WHERE status != 'cancelled' AND {}", date_conditions.join(" AND "))
    };

    // Get returns statistics (combining sale_returns and purchase_returns)
    let sale_returns_query = format!(
        r#"
        SELECT 
            COUNT(*) as return_count,
            COALESCE(CAST(SUM(total_amount) AS REAL), 0.0) as total_returned_amount
        FROM sale_returns 
        {}
        "#,
        where_clause
    );

    let purchase_returns_query = format!(
        r#"
        SELECT 
            COUNT(*) as return_count,
            COALESCE(CAST(SUM(total_amount) AS REAL), 0.0) as total_returned_amount
        FROM purchase_returns 
        {}
        "#,
        where_clause
    );

    // Execute both queries
    let sale_returns_result = sqlx::query(&sale_returns_query)
        .fetch_one(&state.db.pool)
        .await;

    let purchase_returns_result = sqlx::query(&purchase_returns_query)
        .fetch_one(&state.db.pool)
        .await;

    match (sale_returns_result, purchase_returns_result) {
        (Ok(sale_row), Ok(purchase_row)) => {
            let total_returns = sale_row.get::<i64, _>("return_count") + purchase_row.get::<i64, _>("return_count");
            let total_returned_amount = sale_row.get::<f64, _>("total_returned_amount") + purchase_row.get::<f64, _>("total_returned_amount");

            let statistics = json!({
                "total_returns": total_returns,
                "total_returned_amount": total_returned_amount,
                "return_count": total_returns
            });

            info!("Returns statistics retrieved successfully");
            (
                StatusCode::OK,
                Json(json!({
                    "success": true,
                    "data": statistics
                }))
            )
        },
        (Err(err), _) | (_, Err(err)) => {
            error!("Failed to get returns statistics: {}", err);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": "Failed to get returns statistics"
                }))
            )
        }
    }
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
