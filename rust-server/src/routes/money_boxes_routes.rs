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

#[derive(Debug, Deserialize)]
pub struct CreateMoneyBoxRequest {
    pub name: String,
    pub description: Option<String>,
    pub initial_balance: Option<f64>,
    pub currency: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMoneyBoxRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub currency: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct MoneyBoxQuery {
    pub page: Option<i32>,
    pub limit: Option<i32>,
    pub search: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct AddTransactionRequest {
    pub transaction_type: String, // "deposit", "withdrawal"
    pub amount: f64,
    pub description: Option<String>,
    pub reference_id: Option<i32>,
    pub reference_type: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TransferRequest {
    pub from_money_box_id: i32,
    pub to_money_box_id: i32,
    pub amount: f64,
    pub description: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TransactionQuery {
    pub page: Option<i32>,
    pub limit: Option<i32>,
    pub transaction_type: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReconcileMoneyBoxRequest {
    pub expected_balance: f64,
    pub actual_balance: f64,
    pub adjustment_reason: Option<String>,
    pub notes: Option<String>,
}

// Get all money boxes
async fn get_money_boxes(
    State(state): State<AppState>,
    Query(query): Query<MoneyBoxQuery>,
) -> impl IntoResponse {
    match state.money_boxes_service.get_money_boxes(&state.db, &query).await {
        Ok(money_boxes) => Json(json!({
            "success": true,
            "data": money_boxes
        })),
        Err(err) => {
            tracing::error!("Failed to get money boxes: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to get money boxes"
            }))
        }
    }
}

// Get all money boxes summary
async fn get_money_boxes_summary(
    State(state): State<AppState>,
) -> impl IntoResponse {
    match state.money_boxes_service.get_all_summary(&state.db).await {
        Ok(summary) => Json(json!({
            "success": true,
            "data": summary
        })),
        Err(err) => {
            tracing::error!("Failed to get money boxes summary: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to get money boxes summary"
            }))
        }
    }
}

// Get money box by name
async fn get_money_box_by_name(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> impl IntoResponse {
    match state.money_boxes_service.get_by_name(&state.db, &name).await {
        Ok(Some(money_box)) => Json(json!({
            "success": true,
            "data": money_box
        })),
        Ok(None) => Json(json!({
            "success": false,
            "message": "Money box not found"
        })),
        Err(err) => {
            tracing::error!("Failed to get money box by name: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to get money box"
            }))
        }
    }
}

// Get money box by ID
async fn get_money_box_by_id(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    match state.money_boxes_service.get_by_id(&state.db, id).await {
        Ok(Some(money_box)) => Json(json!({
            "success": true,
            "data": money_box
        })),
        Ok(None) => Json(json!({
            "success": false,
            "message": "Money box not found"
        })),
        Err(err) => {
            tracing::error!("Failed to get money box: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to get money box"
            }))
        }
    }
}

// Get money box summary
async fn get_money_box_summary(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    match state.money_boxes_service.get_summary(&state.db, id).await {
        Ok(summary) => Json(json!({
            "success": true,
            "data": summary
        })),
        Err(err) => {
            tracing::error!("Failed to get money box summary: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to get money box summary"
            }))
        }
    }
}

// Create money box
async fn create_money_box(
    State(state): State<AppState>,
    Json(payload): Json<CreateMoneyBoxRequest>,
) -> impl IntoResponse {
    match state.money_boxes_service.create(&state.db, payload).await {
        Ok(money_box) => Json(json!({
            "success": true,
            "data": money_box,
            "message": "Money box created successfully"
        })),
        Err(err) => {
            tracing::error!("Failed to create money box: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to create money box"
            }))
        }
    }
}

// Update money box
async fn update_money_box(
    State(state): State<AppState>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateMoneyBoxRequest>,
) -> impl IntoResponse {
    match state.money_boxes_service.update(&state.db, id, payload).await {
        Ok(money_box) => Json(json!({
            "success": true,
            "data": money_box,
            "message": "Money box updated successfully"
        })),
        Err(err) => {
            tracing::error!("Failed to update money box: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to update money box"
            }))
        }
    }
}

// Delete money box (admin only)
async fn delete_money_box(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    // TODO: Add admin permission check
    match state.money_boxes_service.delete(&state.db, id).await {
        Ok(_) => Json(json!({
            "success": true,
            "message": "Money box deleted successfully"
        })),
        Err(err) => {
            tracing::error!("Failed to delete money box: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to delete money box"
            }))
        }
    }
}

// Get money box transactions
async fn get_money_box_transactions(
    State(state): State<AppState>,
    Path(id): Path<i32>,
    Query(query): Query<TransactionQuery>,
) -> impl IntoResponse {
    match state.money_boxes_service.get_transactions(&state.db, id, &query).await {
        Ok(transactions) => Json(json!({
            "success": true,
            "data": transactions
        })),
        Err(err) => {
            tracing::error!("Failed to get money box transactions: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to get money box transactions"
            }))
        }
    }
}

// Get transactions by date range
async fn get_transactions_by_date_range(
    State(state): State<AppState>,
    Path(id): Path<i32>,
    Query(query): Query<TransactionQuery>,
) -> impl IntoResponse {
    match state.money_boxes_service.get_transactions_by_date_range(&state.db, id, &query).await {
        Ok(transactions) => Json(json!({
            "success": true,
            "data": transactions
        })),
        Err(err) => {
            tracing::error!("Failed to get transactions by date range: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to get transactions by date range"
            }))
        }
    }
}

// Add transaction to money box
async fn add_transaction(
    State(state): State<AppState>,
    Path(id): Path<i32>,
    Json(payload): Json<AddTransactionRequest>,
) -> impl IntoResponse {
    match state.money_boxes_service.add_transaction(&state.db, id, payload).await {
        Ok(transaction) => Json(json!({
            "success": true,
            "data": transaction,
            "message": "Transaction added successfully"
        })),
        Err(err) => {
            tracing::error!("Failed to add transaction: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to add transaction"
            }))
        }
    }
}

// Transfer between money boxes
async fn transfer_between_money_boxes(
    State(state): State<AppState>,
    Json(payload): Json<TransferRequest>,
) -> impl IntoResponse {
    match state.money_boxes_service.transfer(&state.db, payload).await {
        Ok(result) => Json(json!({
            "success": true,
            "data": result,
            "message": "Transfer completed successfully"
        })),
        Err(err) => {
            tracing::error!("Failed to transfer between money boxes: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to complete transfer"
            }))
        }
    }
}

// Export money box routes
pub fn money_boxes_routes() -> Router<AppState> {
    Router::new()
        .route("/api/money-boxes", get(get_money_boxes).post(create_money_box))
        .route("/api/money-boxes/summary", get(get_money_boxes_summary))
        .route("/api/money-boxes/name/:name", get(get_money_box_by_name))
        .route("/api/money-boxes/transfer", post(transfer_between_money_boxes))
        .route("/api/money-boxes/:id", get(get_money_box_by_id).put(update_money_box).delete(delete_money_box))
        .route("/api/money-boxes/:id/summary", get(get_money_box_summary))
        .route("/api/money-boxes/:id/transactions", get(get_money_box_transactions).post(add_transaction))
        .route("/api/money-boxes/:id/transactions/date-range", get(get_transactions_by_date_range))
}