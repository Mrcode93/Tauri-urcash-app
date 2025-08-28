use crate::models::{
    CashBox, CashBoxTransaction, UserCashBoxSettings, CashBoxSummary, CashBoxWithMoneyBoxSummary,
    CashBoxReport, CashBoxReportSummary, ComprehensiveCashBoxReport, ComprehensiveReportSummary,
    OpenCashBoxRequest, CloseCashBoxRequest, AddTransactionRequest, ManualTransactionRequest,
    UpdateCashBoxSettingsRequest, ForceCloseCashBoxRequest, TransferToMoneyBoxRequest,
    CashBoxTransactionsQuery, CashBoxHistoryQuery, CashBoxReportQuery,
    ApiResponse, PaginatedResponse
};
use crate::services::CashBoxService;
use crate::AppState;
use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::Json,
    routing::{get, post, put, delete},
    Router,
};
use serde_json::json;
use sqlx::Row;
use tracing::{info, error};

// ==================== CASH BOX OPERATIONS ====================

pub async fn get_user_cash_box(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> (StatusCode, Json<serde_json::Value>) {
    // Extract user ID from token (simplified for now)
    let user_id = 1; // TODO: Extract from JWT token
    
    match state.cashbox_service.get_user_cash_box(&state.db, user_id).await {
        Ok(cash_box) => {
            info!("User cash box retrieved successfully for user: {}", user_id);
            (StatusCode::OK, Json(json!({
                "success": true,
                "data": cash_box
            })))
        }
        Err(e) => {
            error!("Error getting user cash box for user {}: {}", user_id, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": format!("Error getting user cash box: {}", e)
                })),
            )
        }
    }
}

pub async fn get_user_cash_box_settings(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> (StatusCode, Json<serde_json::Value>) {
    let user_id = 1; // TODO: Extract from JWT token
    
    match state.cashbox_service.get_user_cash_box_settings(&state.db, user_id).await {
        Ok(settings) => {
            info!("User cash box settings retrieved successfully for user: {}", user_id);
            (StatusCode::OK, Json(json!({
                "success": true,
                "data": settings
            })))
        }
        Err(e) => {
            error!("Error getting user cash box settings for user {}: {}", user_id, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": format!("Error getting user cash box settings: {}", e)
                })),
            )
        }
    }
}

pub async fn open_cash_box(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<OpenCashBoxRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    let user_id = 1; // TODO: Extract from JWT token
    
    match state.cashbox_service.open_cash_box(
        &state.db,
        user_id,
        request.opening_amount.unwrap_or(0.0),
        request.notes,
    ).await {
        Ok(cash_box) => {
            info!("Cash box opened successfully for user: {}", user_id);
            (StatusCode::OK, Json(json!({
                "success": true,
                "message": "تم فتح الصندوق بنجاح",
                "data": cash_box
            })))
        }
        Err(e) => {
            error!("Error opening cash box for user {}: {}", user_id, e);
            (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "success": false,
                    "error": format!("Error opening cash box: {}", e)
                })),
            )
        }
    }
}

pub async fn close_cash_box(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<CloseCashBoxRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    let user_id = 1; // TODO: Extract from JWT token
    
    match state.cashbox_service.close_cash_box(
        &state.db,
        user_id,
        request.closing_amount,
        request.notes,
    ).await {
        Ok(cash_box) => {
            info!("Cash box closed successfully for user: {}", user_id);
            (StatusCode::OK, Json(json!({
                "success": true,
                "message": "تم إغلاق الصندوق بنجاح",
                "data": cash_box
            })))
        }
        Err(e) => {
            error!("Error closing cash box for user {}: {}", user_id, e);
            (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "success": false,
                    "error": format!("Error closing cash box: {}", e)
                })),
            )
        }
    }
}

pub async fn add_transaction(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<AddTransactionRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    let user_id = 1; // TODO: Extract from JWT token
    
    match state.cashbox_service.add_transaction(
        &state.db,
        request.cash_box_id,
        user_id,
        request.transaction_type,
        request.amount,
        request.reference_type,
        request.reference_id,
        request.description,
        request.notes,
    ).await {
        Ok(result) => {
            info!("Transaction added successfully to cash box: {}", request.cash_box_id);
            (StatusCode::OK, Json(json!({
                "success": true,
                "message": "تم إضافة المعاملة بنجاح",
                "data": result.data
            })))
        }
        Err(e) => {
            error!("Error adding transaction to cash box {}: {}", request.cash_box_id, e);
            (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "success": false,
                    "error": format!("Error adding transaction: {}", e)
                })),
            )
        }
    }
}

pub async fn get_cash_box_transactions(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(cash_box_id): Path<i64>,
    Query(query): Query<CashBoxTransactionsQuery>,
) -> (StatusCode, Json<serde_json::Value>) {
    let limit = query.limit.unwrap_or(50);
    let offset = query.offset.unwrap_or(0);
    
    match state.cashbox_service.get_cash_box_transactions(&state.db, cash_box_id, limit, offset).await {
        Ok(transactions) => {
            info!("Cash box transactions retrieved successfully for cash box: {}", cash_box_id);
            (StatusCode::OK, Json(json!({
                "success": true,
                "data": transactions
            })))
        }
        Err(e) => {
            error!("Error getting cash box transactions for cash box {}: {}", cash_box_id, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": format!("Error getting cash box transactions: {}", e)
                })),
            )
        }
    }
}

pub async fn get_user_cash_box_history(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<CashBoxHistoryQuery>,
) -> (StatusCode, Json<serde_json::Value>) {
    let user_id = 1; // TODO: Extract from JWT token
    let limit = query.limit.unwrap_or(20);
    let offset = query.offset.unwrap_or(0);
    
    match state.cashbox_service.get_user_cash_box_history(&state.db, user_id, limit, offset).await {
        Ok(history) => {
            info!("User cash box history retrieved successfully for user: {}", user_id);
            (StatusCode::OK, Json(json!({
                "success": true,
                "data": history
            })))
        }
        Err(e) => {
            error!("Error getting user cash box history for user {}: {}", user_id, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": format!("Error getting user cash box history: {}", e)
                })),
            )
        }
    }
}

pub async fn update_user_cash_box_settings(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(settings): Json<UpdateCashBoxSettingsRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    let user_id = 1; // TODO: Extract from JWT token
    
    match state.cashbox_service.update_user_cash_box_settings(&state.db, user_id, settings).await {
        Ok(updated_settings) => {
            info!("User cash box settings updated successfully for user: {}", user_id);
            (StatusCode::OK, Json(json!({
                "success": true,
                "message": "تم تحديث إعدادات الصندوق بنجاح",
                "data": updated_settings
            })))
        }
        Err(e) => {
            error!("Error updating user cash box settings for user {}: {}", user_id, e);
            (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "success": false,
                    "error": format!("Error updating cash box settings: {}", e)
                })),
            )
        }
    }
}

pub async fn get_cash_box_summary(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> (StatusCode, Json<serde_json::Value>) {
    let user_id = 1; // TODO: Extract from JWT token
    
    match state.cashbox_service.get_cash_box_summary(&state.db, user_id).await {
        Ok(summary) => {
            info!("Cash box summary retrieved successfully for user: {}", user_id);
            (StatusCode::OK, Json(json!({
                "success": true,
                "data": summary
            })))
        }
        Err(e) => {
            error!("Error getting cash box summary for user {}: {}", user_id, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": format!("Error getting cash box summary: {}", e)
                })),
            )
        }
    }
}

// ==================== ADMIN OPERATIONS ====================

pub async fn get_all_open_cash_boxes(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> (StatusCode, Json<serde_json::Value>) {
    match state.cashbox_service.get_all_open_cash_boxes(&state.db).await {
        Ok(cash_boxes) => {
            info!("All open cash boxes retrieved successfully");
            (StatusCode::OK, Json(json!({
                "success": true,
                "data": cash_boxes
            })))
        }
        Err(e) => {
            error!("Error getting all open cash boxes: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": format!("Error getting all open cash boxes: {}", e)
                })),
            )
        }
    }
}

pub async fn force_close_cash_box(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(cash_box_id): Path<i64>,
    Json(request): Json<ForceCloseCashBoxRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    let admin_user_id = 1; // TODO: Extract from JWT token
    
    match state.cashbox_service.force_close_cash_box(
        &state.db,
        cash_box_id,
        admin_user_id,
        request.reason,
        request.money_box_id,
    ).await {
        Ok(cash_box) => {
            info!("Cash box force closed successfully: {}", cash_box_id);
            (StatusCode::OK, Json(json!({
                "success": true,
                "message": "تم إغلاق الصندوق إجبارياً بنجاح",
                "data": cash_box
            })))
        }
        Err(e) => {
            error!("Error force closing cash box {}: {}", cash_box_id, e);
            (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "success": false,
                    "error": format!("Error force closing cash box: {}", e)
                })),
            )
        }
    }
}

pub async fn get_cash_box_by_id(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(cash_box_id): Path<i64>,
) -> (StatusCode, Json<serde_json::Value>) {
    match state.cashbox_service.get_cash_box_by_id(&state.db, cash_box_id).await {
        Ok(cash_box) => {
            info!("Cash box retrieved successfully: {}", cash_box_id);
            (StatusCode::OK, Json(json!({
                "success": true,
                "data": cash_box
            })))
        }
        Err(e) => {
            error!("Error getting cash box {}: {}", cash_box_id, e);
            (
                StatusCode::NOT_FOUND,
                Json(json!({
                    "success": false,
                    "error": format!("Cash box not found: {}", e)
                })),
            )
        }
    }
}

pub async fn manual_transaction(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<ManualTransactionRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    let user_id = 1; // TODO: Extract from JWT token
    
    // Validate transaction type
    if !["deposit", "withdrawal", "adjustment"].contains(&request.transaction_type.as_str()) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "success": false,
                "error": "نوع المعاملة غير صحيح"
            })),
        );
    }
    
    match state.cashbox_service.add_transaction(
        &state.db,
        request.cash_box_id,
        user_id,
        request.transaction_type,
        request.amount,
        "manual".to_string(),
        None,
        Some(request.description),
        request.notes,
    ).await {
        Ok(result) => {
            info!("Manual transaction added successfully to cash box: {}", request.cash_box_id);
            (StatusCode::OK, Json(json!({
                "success": true,
                "message": "تم إضافة المعاملة بنجاح",
                "data": result.data
            })))
        }
        Err(e) => {
            error!("Error adding manual transaction to cash box {}: {}", request.cash_box_id, e);
            (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "success": false,
                    "error": format!("Error adding manual transaction: {}", e)
                })),
            )
        }
    }
}

pub async fn get_cash_box_report(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(cash_box_id): Path<i64>,
    Query(query): Query<CashBoxReportQuery>,
) -> (StatusCode, Json<serde_json::Value>) {
    match state.cashbox_service.get_cash_box_by_id(&state.db, cash_box_id).await {
        Ok(cash_box) => {
            // Get transactions
            let transactions = match state.cashbox_service.get_cash_box_transactions(&state.db, cash_box_id, 1000, 0).await {
                Ok(transactions) => transactions,
                Err(e) => {
                    error!("Error getting transactions for cash box {}: {}", cash_box_id, e);
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(json!({
                            "success": false,
                            "error": format!("Error getting cash box transactions: {}", e)
                        })),
                    );
                }
            };
            
            // Calculate summary
            let total_deposits: f64 = transactions.iter()
                .filter(|t| ["deposit", "sale", "customer_receipt", "purchase_return"].contains(&t.transaction_type.as_str()))
                .map(|t| t.amount)
                .sum();
            
            let total_withdrawals: f64 = transactions.iter()
                .filter(|t| ["withdrawal", "purchase", "expense", "supplier_payment", "sale_return"].contains(&t.transaction_type.as_str()))
                .map(|t| t.amount)
                .sum();
            
            let summary = CashBoxReportSummary {
                total_deposits,
                total_withdrawals,
                total_transactions: transactions.len() as i64,
                opening_balance: cash_box.initial_amount,
                current_balance: cash_box.current_amount,
                net_change: cash_box.current_amount - cash_box.initial_amount,
            };
            
            let report = CashBoxReport {
                cash_box,
                transactions,
                summary,
            };
            
            info!("Cash box report generated successfully: {}", cash_box_id);
            (StatusCode::OK, Json(json!({
                "success": true,
                "data": report
            })))
        }
        Err(e) => {
            error!("Error getting cash box {}: {}", cash_box_id, e);
            (
                StatusCode::NOT_FOUND,
                Json(json!({
                    "success": false,
                    "error": format!("Cash box not found: {}", e)
                })),
            )
        }
    }
}

pub async fn get_all_users_cash_box_history(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<CashBoxHistoryQuery>,
) -> (StatusCode, Json<serde_json::Value>) {
    let limit = query.limit.unwrap_or(50);
    let offset = query.offset.unwrap_or(0);
    
    match state.cashbox_service.get_all_users_cash_box_history(&state.db, limit, offset).await {
        Ok(history) => {
            info!("All users cash box history retrieved successfully");
            (StatusCode::OK, Json(json!({
                "success": true,
                "data": history
            })))
        }
        Err(e) => {
            error!("Error getting all users cash box history: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": format!("Error getting all users cash box history: {}", e)
                })),
            )
        }
    }
}

// ==================== MONEY BOX INTEGRATION ====================

pub async fn get_cash_box_with_money_box_summary(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> (StatusCode, Json<serde_json::Value>) {
    let user_id = 1; // TODO: Extract from JWT token
    
    match state.cashbox_service.get_cash_box_with_money_box_summary(&state.db, user_id).await {
        Ok(summary) => {
            info!("Cash box with money box summary retrieved successfully for user: {}", user_id);
            (StatusCode::OK, Json(json!({
                "success": true,
                "data": summary
            })))
        }
        Err(e) => {
            error!("Error getting cash box with money box summary for user {}: {}", user_id, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": format!("Error getting cash box with money box summary: {}", e)
                })),
            )
        }
    }
}

pub async fn transfer_to_money_box(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<TransferToMoneyBoxRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    let user_id = 1; // TODO: Extract from JWT token
    
    // TODO: Implement money box transfer logic
    // This would require implementing the money box service first
    
    (
        StatusCode::NOT_IMPLEMENTED,
        Json(json!({
            "success": false,
            "error": "Money box transfer not implemented yet"
        })),
    )
}

pub async fn get_comprehensive_cash_box_report(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<CashBoxReportQuery>,
) -> (StatusCode, Json<serde_json::Value>) {
    let user_id = 1; // TODO: Extract from JWT token
    
    // TODO: Implement comprehensive report logic
    // This would require implementing the money box service first
    
    (
        StatusCode::NOT_IMPLEMENTED,
        Json(json!({
            "success": false,
            "error": "Comprehensive cash box report not implemented yet"
        })),
    )
}



// ==================== ROUTES DEFINITION ====================

pub fn cashbox_routes() -> Router<AppState> {
    Router::new()
        // User cash box operations
        .route("/api/cashbox/user", get(get_user_cash_box))
        .route("/api/cashbox/user/settings", get(get_user_cash_box_settings))
        .route("/api/cashbox/user/settings", put(update_user_cash_box_settings))
        .route("/api/cashbox/open", post(open_cash_box))
        .route("/api/cashbox/close", post(close_cash_box))
        .route("/api/cashbox/transaction", post(add_transaction))
        .route("/api/cashbox/manual-transaction", post(manual_transaction))
        .route("/api/cashbox/summary", get(get_cash_box_summary))
        .route("/api/cashbox/history", get(get_user_cash_box_history))
        
        // Cash box specific operations
        .route("/api/cashbox/:cash_box_id", get(get_cash_box_by_id))
        .route("/api/cashbox/:cash_box_id/transactions", get(get_cash_box_transactions))
        .route("/api/cashbox/:cash_box_id/report", get(get_cash_box_report))
        
        // Admin operations
        .route("/api/cashbox/admin/open", get(get_all_open_cash_boxes))
        .route("/api/cashbox/admin/:cash_box_id/force-close", post(force_close_cash_box))
        .route("/api/cashbox/admin/history", get(get_all_users_cash_box_history))
        
        // Money box integration
        .route("/api/cashbox/money-box-summary", get(get_cash_box_with_money_box_summary))
        .route("/api/cashbox/transfer-to-money-box", post(transfer_to_money_box))
        .route("/api/cashbox/comprehensive-report", get(get_comprehensive_cash_box_report))
        
        // Frontend-compatible routes
        .route("/api/cash-box/my-cash-box", get(get_user_cash_box))
        .route("/api/cash-box/my-settings", get(get_user_cash_box_settings))
        .route("/api/cash-box/my-summary", get(get_cash_box_summary))
        .route("/api/cash-box/my-history", get(get_user_cash_box_history))
        .route("/api/cash-box/open", post(open_cash_box))
        .route("/api/cash-box/close", post(close_cash_box))
        .route("/api/cash-box/transactions/:cash_box_id", get(get_cash_box_transactions))
        .route("/api/cash-box/money-boxes-summary", get(get_cash_box_with_money_box_summary))

}
