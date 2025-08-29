use axum::{
    routing::{get, post, put, delete},
    Router,
    extract::{State, Path, Query},
    response::IntoResponse,
    Json,
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use crate::{
    models::ApiResponse,
    models::{
        MoneyBox, MoneyBoxTransaction
    },
    services::money_boxes_service::{
        InternalCreateMoneyBoxRequest, InternalUpdateMoneyBoxRequest, InternalAddTransactionRequest,
        InternalTransferRequest, InternalTransactionQuery
    },
    AppState,
};



#[derive(Debug, Deserialize)]
pub struct CreateMoneyBoxRequest {
    pub name: String,
    pub amount: Option<f64>,
    pub notes: Option<String>,
    pub created_by: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMoneyBoxRequest {
    pub name: String,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MoneyBoxQuery {
    pub page: Option<i32>,
    pub limit: Option<i32>,
    pub search: Option<String>,
    pub is_active: Option<bool>,
}



#[derive(Debug, Deserialize)]
pub struct TransferRequest {
    pub fromBoxId: i32,
    pub toBoxId: i32,
    pub amount: f64,
    pub notes: Option<String>,
    pub created_by: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct TransactionQuery {
    pub limit: Option<i32>,
    pub offset: Option<i32>,
    pub startDate: Option<String>,
    pub endDate: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReconcileMoneyBoxRequest {
    pub expected_balance: f64,
    pub actual_balance: f64,
    pub adjustment_reason: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AddTransactionRequest {
    pub type_: String, // "deposit", "withdraw", "transfer_in", "transfer_out"
    pub amount: f64,
    pub notes: Option<String>,
    pub created_by: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct MoneyBoxSummary {
    pub id: i64,
    pub name: String,
    pub amount: f64,
    pub total_deposits: f64,
    pub total_withdrawals: f64,
    pub total_transactions: i64,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct AllMoneyBoxesSummary {
    pub total_boxes: i64,
    pub total_balance: f64,
    pub total_deposits: f64,
    pub total_withdrawals: f64,
    pub total_transactions: i64,
}

#[derive(Debug, Serialize)]
pub struct TransactionListResponse {
    pub transactions: Vec<MoneyBoxTransaction>,
    pub total: i32,
    pub limit: i32,
    pub offset: i32,
}

#[derive(Debug, Serialize)]
pub struct AddTransactionResponse {
    pub transaction_id: i32,
    pub new_balance: f64,
    pub transaction: MoneyBoxTransaction,
}

#[derive(Debug, Serialize)]
pub struct TransferResponse {
    pub from_box: MoneyBox,
    pub to_box: MoneyBox,
    pub message: String,
}

// Get all money boxes
async fn get_money_boxes(
    State(state): State<AppState>,
    Query(query): Query<MoneyBoxQuery>,
) -> Result<Json<ApiResponse<Vec<MoneyBox>>>, (StatusCode, Json<ApiResponse<String>>)> {
    match state.money_boxes_service.get_money_boxes(&state.db, &query).await {
        Ok(result) => {
            let money_boxes: Vec<MoneyBox> = serde_json::from_value(result).unwrap_or_default();
            Ok(Json(ApiResponse::success(money_boxes)))
        }
        Err(err) => {
            let error_message = format!("فشل في جلب صناديق المال: {}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(error_message)),
            ))
        }
    }
}

// Get all money boxes summary
async fn get_money_boxes_summary(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<AllMoneyBoxesSummary>>, (StatusCode, Json<ApiResponse<String>>)> {
    match state.money_boxes_service.get_all_money_boxes_summary(&state.db).await {
        Ok(result) => {
            let summary: AllMoneyBoxesSummary = serde_json::from_value(result).unwrap_or_default();
            Ok(Json(ApiResponse::success(summary)))
        }
        Err(err) => {
            let error_message = format!("فشل في جلب ملخص صناديق المال: {}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(error_message)),
            ))
        }
    }
}

// Get money box by name
async fn get_money_box_by_name(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> Result<Json<ApiResponse<MoneyBox>>, (StatusCode, Json<ApiResponse<String>>)> {
    match state.money_boxes_service.get_money_box_by_name(&state.db, &name).await {
        Ok(Some(money_box_value)) => {
            let money_box: MoneyBox = serde_json::from_value(money_box_value).unwrap_or_default();
            Ok(Json(ApiResponse::success(money_box)))
        }
        Ok(None) => {
            let error_message = "صندوق المال غير موجود".to_string();
            Err((
                StatusCode::NOT_FOUND,
                Json(ApiResponse::error(error_message)),
            ))
        }
        Err(err) => {
            let error_message = format!("فشل في جلب صندوق المال: {}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(error_message)),
            ))
        }
    }
}

// Get money box by ID
async fn get_money_box_by_id(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<MoneyBox>>, (StatusCode, Json<ApiResponse<String>>)> {
    match state.money_boxes_service.get_money_box_by_id(&state.db, id).await {
        Ok(Some(money_box_value)) => {
            let money_box: MoneyBox = serde_json::from_value(money_box_value).unwrap_or_default();
            Ok(Json(ApiResponse::success(money_box)))
        }
        Ok(None) => {
            let error_message = "صندوق المال غير موجود".to_string();
            Err((
                StatusCode::NOT_FOUND,
                Json(ApiResponse::error(error_message)),
            ))
        }
        Err(err) => {
            let error_message = format!("فشل في جلب صندوق المال: {}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(error_message)),
            ))
        }
    }
}

// Get money box summary
async fn get_money_box_summary(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<MoneyBoxSummary>>, (StatusCode, Json<ApiResponse<String>>)> {
    match state.money_boxes_service.get_money_box_summary(&state.db, id).await {
        Ok(result) => {
            let summary: MoneyBoxSummary = serde_json::from_value(result).unwrap_or_default();
            Ok(Json(ApiResponse::success(summary)))
        }
        Err(err) => {
            let error_message = format!("فشل في جلب ملخص صندوق المال: {}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::error(error_message)),
            ))
        }
    }
}

// Create money box
async fn create_money_box(
    State(state): State<AppState>,
    Json(payload): Json<CreateMoneyBoxRequest>,
) -> Result<Json<ApiResponse<MoneyBox>>, (StatusCode, Json<ApiResponse<String>>)> {
    // Validation
    if payload.name.trim().is_empty() {
        let error_message = "اسم صندوق المال مطلوب".to_string();
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiResponse::error(error_message)),
        ));
    }

    let internal_request = InternalCreateMoneyBoxRequest {
        name: payload.name,
        initial_balance: Some(payload.amount.unwrap_or(0.0)),
        notes: payload.notes,
        created_by: None, // TODO: Get from auth context
    };

    match state.money_boxes_service.create_money_box(&state.db, internal_request).await {

        Ok(result) => {
            let money_box: MoneyBox = serde_json::from_value(result).unwrap_or_default();
            Ok(Json(ApiResponse::success(money_box)))
        }
        Err(err) => {
            let error_message = format!("فشل في إنشاء صندوق المال: {}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(error_message)),
            ))
        }
    }
}

// Update money box
async fn update_money_box(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateMoneyBoxRequest>,
) -> Result<Json<ApiResponse<MoneyBox>>, (StatusCode, Json<ApiResponse<String>>)> {
    // Validation
    if payload.name.trim().is_empty() {
        let error_message = "اسم صندوق المال مطلوب".to_string();
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiResponse::error(error_message)),
        ));
    }

    let internal_request = InternalUpdateMoneyBoxRequest {
        name: payload.name,
        notes: payload.notes,
    };

    match state.money_boxes_service.update_money_box(&state.db, id, internal_request).await {
        Ok(result) => {
            let money_box: MoneyBox = serde_json::from_value(result).unwrap_or_default();
                    Ok(Json(ApiResponse::success(money_box)))
        }
        Err(err) => {
            let error_message = format!("فشل في تحديث صندوق المال: {}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(error_message)),
            ))
        }
    }
}

// Delete money box
async fn delete_money_box(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<String>>, (StatusCode, Json<ApiResponse<String>>)> {
    match state.money_boxes_service.delete_money_box(&state.db, id).await {
        Ok(result) => {
            let response: serde_json::Value = serde_json::from_value(result).unwrap_or_default();
            let message = response["message"].as_str().unwrap_or("تم حذف صندوق المال بنجاح");
            Ok(Json(ApiResponse::message(message.to_string())))
        }
        Err(err) => {
            let error_message = format!("فشل في حذف صندوق المال: {}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(error_message)),
            ))
        }
    }
}

// Get money box transactions
async fn get_money_box_transactions(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Query(query): Query<TransactionQuery>,
) -> Result<Json<ApiResponse<TransactionListResponse>>, (StatusCode, Json<ApiResponse<String>>)> {
    let internal_query = InternalTransactionQuery {
        limit: query.limit,
        offset: query.offset,
        start_date: None,
        end_date: None,
    };

    match state.money_boxes_service.get_money_box_transactions(&state.db, id, &internal_query).await {
        Ok(result) => {
            let response: serde_json::Value = serde_json::from_value(result).unwrap_or_default();
            let transactions: Vec<MoneyBoxTransaction> = serde_json::from_value(response["transactions"].clone()).unwrap_or_default();
            let total = response["total"].as_i64().unwrap_or(0);
            let limit = response["limit"].as_i64().unwrap_or(50);
            let offset = response["offset"].as_i64().unwrap_or(0);

            let list_response = TransactionListResponse {
                transactions,
                total: total as i32,
                limit: limit as i32,
                offset: offset as i32,
            };

            Ok(Json(ApiResponse::success(list_response)))
        }
        Err(err) => {
            let error_message = format!("فشل في جلب عمليات صندوق المال: {}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(error_message)),
            ))
        }
    }
}

// Get transactions by date range
async fn get_transactions_by_date_range(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Query(query): Query<TransactionQuery>,
) -> Result<Json<ApiResponse<TransactionListResponse>>, (StatusCode, Json<ApiResponse<String>>)> {
    if query.startDate.is_none() || query.endDate.is_none() {
        let error_message = "تاريخ البداية والنهاية مطلوبان".to_string();
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiResponse::error(error_message)),
        ));
    }

    let internal_query = InternalTransactionQuery {
        limit: query.limit,
        offset: query.offset,
        start_date: query.startDate,
        end_date: query.endDate,
    };

    match state.money_boxes_service.get_transactions_by_date_range(&state.db, id, &internal_query).await {
        Ok(result) => {
            let response: serde_json::Value = serde_json::from_value(result).unwrap_or_default();
            let transactions: Vec<MoneyBoxTransaction> = serde_json::from_value(response["transactions"].clone()).unwrap_or_default();
            let total = response["total"].as_i64().unwrap_or(0);
            let limit = response["limit"].as_i64().unwrap_or(50);
            let offset = response["offset"].as_i64().unwrap_or(0);

            let list_response = TransactionListResponse {
                transactions,
                total: total as i32,
                limit: limit as i32,
                offset: offset as i32,
            };

            Ok(Json(ApiResponse::success(list_response)))
        }
        Err(err) => {
            let error_message = format!("فشل في جلب عمليات صندوق المال: {}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(error_message)),
            ))
        }
    }
}

// Add transaction
async fn add_transaction(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<AddTransactionRequest>,
) -> Result<Json<ApiResponse<AddTransactionResponse>>, (StatusCode, Json<ApiResponse<String>>)> {
    // Validation
    if payload.amount <= 0.0 {
        let error_message = "المبلغ يجب أن يكون أكبر من صفر".to_string();
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiResponse::error(error_message)),
        ));
    }

    let internal_request = InternalAddTransactionRequest {
        transaction_type: payload.type_,
        amount: payload.amount,
        notes: payload.notes,
        reference_id: None,
        created_by: None, // TODO: Get from auth context
    };

    match state.money_boxes_service.add_transaction(&state.db, id, internal_request).await {
        Ok(result) => {
            let response: serde_json::Value = serde_json::from_value(result).unwrap_or_default();
            let transaction_id = response["transactionId"].as_i64().unwrap_or(0) as i32;
            let new_balance = response["newBalance"].as_f64().unwrap_or(0.0);
            let transaction: MoneyBoxTransaction = serde_json::from_value(response["transaction"].clone()).unwrap_or_default();

            let add_response = AddTransactionResponse {
                transaction_id,
                new_balance,
                transaction,
            };

            Ok(Json(ApiResponse::success(add_response)))
        }
        Err(err) => {
            let error_message = format!("فشل في إضافة العملية: {}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(error_message)),
            ))
        }
    }
}

// Transfer between money boxes
async fn transfer_between_money_boxes(
    State(state): State<AppState>,
    Json(payload): Json<TransferRequest>,
) -> Result<Json<ApiResponse<TransferResponse>>, (StatusCode, Json<ApiResponse<String>>)> {
    // Validation
    if payload.fromBoxId == payload.toBoxId {
        let error_message = "لا يمكن التحويل لنفس الصندوق".to_string();
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiResponse::error(error_message)),
        ));
    }

    if payload.amount <= 0.0 {
        let error_message = "المبلغ يجب أن يكون أكبر من صفر".to_string();
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiResponse::error(error_message)),
        ));
    }

    let internal_request = InternalTransferRequest {
        from_box_id: payload.fromBoxId,
        to_box_id: payload.toBoxId,
        amount: payload.amount,
        notes: payload.notes,
        created_by: None, // TODO: Get from auth context
    };

    match state.money_boxes_service.transfer_between_money_boxes(&state.db, internal_request).await {
        Ok(result) => {
            let response: serde_json::Value = serde_json::from_value(result).unwrap_or_default();
            let from_box: MoneyBox = serde_json::from_value(response["fromBox"].clone()).unwrap_or_default();
            let to_box: MoneyBox = serde_json::from_value(response["toBox"].clone()).unwrap_or_default();
            let message = response["message"].as_str().unwrap_or("تم التحويل بنجاح");

            let transfer_response = TransferResponse {
                from_box,
                to_box,
                message: message.to_string(),
            };

            Ok(Json(ApiResponse::success(transfer_response)))
        }
        Err(err) => {
            let error_message = format!("فشل في التحويل بين الصناديق: {}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(error_message)),
            ))
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