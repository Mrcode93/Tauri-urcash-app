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
use crate::models::{
    DebtQuery, UpdateDebtRequest, RepayDebtRequest, RepayDebtLegacyRequest
};
use tracing::{info, warn, error};

// Get all debts
async fn get_all_debts(
    State(state): State<AppState>,
    Query(query): Query<DebtQuery>,
) -> impl IntoResponse {
    match state.debt_service.get_all(&state.db, &query).await {
        Ok(result) => {
            info!("Debts fetched successfully: {} debts found", result.data.len());
            Json(json!({
                "success": true,
                "message": "تم استرجاع الديون بنجاح",
                "data": result.data,
                "pagination": result.pagination
            }))
        },
        Err(err) => {
            error!("Failed to fetch debts: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل استرجاع الديون"
            }))
        }
    }
}

// Get debt statistics
async fn get_debt_stats(
    State(state): State<AppState>,
    Query(query): Query<DebtQuery>,
) -> impl IntoResponse {
    match state.debt_service.get_statistics(&state.db, query.customer_id).await {
        Ok(stats) => {
            info!("Debt statistics fetched successfully");
            Json(json!({
                "success": true,
                "message": "تم استرجاع إحصائيات الديون بنجاح",
                "data": stats
            }))
        },
        Err(err) => {
            error!("Failed to fetch debt statistics: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل استرجاع إحصائيات الديون"
            }))
        }
    }
}

// Get customer with debts
async fn get_customer_with_debts(
    State(state): State<AppState>,
    Path(customer_id): Path<i64>,
) -> impl IntoResponse {
    match state.debt_service.get_customer_with_debts(&state.db, customer_id).await {
        Ok(Some(result)) => {
            info!("Customer with debts fetched successfully for customer ID: {}", customer_id);
            Json(json!({
                "success": true,
                "message": "تم استرجاع العميل مع ديونه بنجاح",
                "data": result
            }))
        },
        Ok(None) => Json(json!({
            "success": false,
            "message": "العميل غير موجود"
        })),
        Err(err) => {
            error!("Failed to fetch customer with debts: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل استرجاع العميل مع ديونه"
            }))
        }
    }
}

// Get debts by customer
async fn get_debts_by_customer(
    State(state): State<AppState>,
    Path(customer_id): Path<i64>,
) -> impl IntoResponse {
    match state.debt_service.get_by_customer(&state.db, customer_id).await {
        Ok(debts) => {
            info!("Customer debts fetched successfully for customer ID: {}", customer_id);
            Json(json!({
                "success": true,
                "message": "تم استرجاع ديون العميل بنجاح",
                "data": debts
            }))
        },
        Err(err) => {
            error!("Failed to fetch customer debts: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل استرجاع ديون العميل"
            }))
        }
    }
}

// Get debt by ID
async fn get_debt_by_id(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.debt_service.get_by_id(&state.db, id).await {
        Ok(Some(debt)) => {
            info!("Debt fetched successfully for ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم استرجاع الدين بنجاح",
                "data": debt
            }))
        },
        Ok(None) => Json(json!({
            "success": false,
            "message": "الدين غير موجود"
        })),
        Err(err) => {
            error!("Failed to fetch debt: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل استرجاع الدين"
            }))
        }
    }
}

// Update debt
async fn update_debt(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateDebtRequest>,
) -> impl IntoResponse {
    match state.debt_service.update(&state.db, id, payload).await {
        Ok(updated_debt) => {
            info!("Debt updated successfully for ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم تحديث الدين بنجاح",
                "data": updated_debt
            }))
        },
        Err(err) => {
            error!("Failed to update debt: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل تحديث الدين"
            }))
        }
    }
}

// Delete debt (mark as paid)
async fn delete_debt(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.debt_service.delete(&state.db, id).await {
        Ok(_) => {
            info!("Debt marked as paid successfully for ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم تسوية الدين بنجاح"
            }))
        },
        Err(err) => {
            error!("Failed to delete debt: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل تسوية الدين"
            }))
        }
    }
}

// Repay debt
async fn repay_debt(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<RepayDebtRequest>,
) -> impl IntoResponse {
    match state.debt_service.repay_debt(&state.db, id, payload).await {
        Ok(result) => {
            info!("Debt repaid successfully for ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم تسديد الدين بنجاح",
                "data": {
                    "debt": result.debt,
                    "receipt": result.receipt,
                    "applied_payments": result.applied_payments,
                    "excess_amount": result.excess_amount,
                    "total_paid": result.total_paid
                }
            }))
        },
        Err(err) => {
            error!("Failed to repay debt: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل تسديد الدين"
            }))
        }
    }
}

// Legacy repay debt
async fn repay_debt_legacy(
    State(state): State<AppState>,
    Json(payload): Json<RepayDebtLegacyRequest>,
) -> impl IntoResponse {
    match state.debt_service.repay_debt_legacy(&state.db, payload).await {
        Ok(result) => {
            info!("Legacy debt repayment completed");
            Json(json!({
                "success": true,
                "message": "تم تسديد الدين بنجاح (طريقة قديمة)",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to repay debt (legacy): {}", err);
            Json(json!({
                "success": false,
                "message": "فشل تسديد الدين (طريقة قديمة)"
            }))
        }
    }
}

pub fn debts_routes() -> Router<AppState> {
    Router::new()
        .route("/api/debts", get(get_all_debts))
        .route("/api/debts/stats", get(get_debt_stats))
        .route("/api/debts/customer/:customer_id/details", get(get_customer_with_debts))
        .route("/api/debts/customer/:customer_id", get(get_debts_by_customer))
        .route("/api/debts/:id", get(get_debt_by_id))
        .route("/api/debts/:id", put(update_debt))
        .route("/api/debts/:id", delete(delete_debt))
        .route("/api/debts/:id/repay", post(repay_debt))
        .route("/api/debts/repay-legacy", post(repay_debt_legacy))
}