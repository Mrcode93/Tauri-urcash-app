use axum::{
    routing::{get, post, put, delete},
    Router,
    extract::{State, Path, Query},
    response::IntoResponse,
    Json,
};
use serde_json::json;
use crate::AppState;
use crate::models::installment::{
    InstallmentQuery, CreateInstallmentRequest, UpdateInstallmentRequest, 
    InstallmentPaymentRequest, CreateInstallmentPlanRequest
};
use tracing::{info, warn, error};

// Get all installments
async fn get_all_installments(
    State(state): State<AppState>,
    Query(query): Query<InstallmentQuery>,
) -> impl IntoResponse {
    match state.installments_service.get_all(&state.db, &query).await {
        Ok(result) => {
            info!("Installments fetched successfully: {} installments found", result.items.len());
            Json(json!({
                "success": true,
                "message": "تم جلب الأقساط بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to fetch installments: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب الأقساط"
            }))
        }
    }
}

// Get installments grouped by sale
async fn get_grouped_by_sale(
    State(state): State<AppState>,
    Query(query): Query<InstallmentQuery>,
) -> impl IntoResponse {
    match state.installments_service.get_grouped_by_sale(&state.db, &query).await {
        Ok(result) => {
            info!("Installments grouped by sale fetched successfully");
            Json(json!({
                "success": true,
                "message": "تم جلب الأقساط مجمعة بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to fetch grouped installments: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب الأقساط مجمعة"
            }))
        }
    }
}

// Get installments summary
async fn get_summary(
    State(state): State<AppState>,
    Query(query): Query<InstallmentQuery>,
) -> impl IntoResponse {
    match state.installments_service.get_summary(&state.db, &query).await {
        Ok(summary) => {
            info!("Installments summary fetched successfully");
            Json(json!({
                "success": true,
                "message": "تم جلب ملخص الأقساط بنجاح",
                "data": {
                    "summary": summary
                }
            }))
        },
        Err(err) => {
            error!("Failed to fetch installments summary: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب ملخص الأقساط"
            }))
        }
    }
}

// Get overdue installments
async fn get_overdue(
    State(state): State<AppState>,
    Query(query): Query<InstallmentQuery>,
) -> impl IntoResponse {
    match state.installments_service.get_overdue(&state.db, &query).await {
        Ok(result) => {
            info!("Overdue installments fetched successfully: {} installments found", result.items.len());
            Json(json!({
                "success": true,
                "message": "تم جلب الأقساط المتأخرة بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to fetch overdue installments: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب الأقساط المتأخرة"
            }))
        }
    }
}

// Get upcoming installments
async fn get_upcoming(
    State(state): State<AppState>,
    Query(query): Query<InstallmentQuery>,
) -> impl IntoResponse {
    match state.installments_service.get_upcoming(&state.db, &query).await {
        Ok(result) => {
            info!("Upcoming installments fetched successfully: {} installments found", result.items.len());
            Json(json!({
                "success": true,
                "message": "تم جلب الأقساط القادمة بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to fetch upcoming installments: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب الأقساط القادمة"
            }))
        }
    }
}

// Get installments by sale ID
async fn get_by_sale_id(
    State(state): State<AppState>,
    Path(sale_id): Path<i64>,
) -> impl IntoResponse {
    match state.installments_service.get_by_sale_id(&state.db, sale_id).await {
        Ok(installments) => {
            info!("Installments by sale fetched successfully for sale ID: {}", sale_id);
            Json(json!({
                "success": true,
                "message": "تم جلب أقساط الفاتورة بنجاح",
                "data": {
                    "installments": installments
                }
            }))
        },
        Err(err) => {
            error!("Failed to fetch installments by sale: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب أقساط الفاتورة"
            }))
        }
    }
}

// Get installments by customer ID
async fn get_by_customer_id(
    State(state): State<AppState>,
    Path(customer_id): Path<i64>,
) -> impl IntoResponse {
    match state.installments_service.get_by_customer_id(&state.db, customer_id).await {
        Ok(installments) => {
            info!("Installments by customer fetched successfully for customer ID: {}", customer_id);
            Json(json!({
                "success": true,
                "message": "تم جلب أقساط العميل بنجاح",
                "data": {
                    "installments": installments
                }
            }))
        },
        Err(err) => {
            error!("Failed to fetch installments by customer: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب أقساط العميل"
            }))
        }
    }
}

// Get installment by ID
async fn get_installment_by_id(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.installments_service.get_by_id(&state.db, id).await {
        Ok(Some(installment)) => {
            info!("Installment fetched successfully for ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم جلب بيانات القسط بنجاح",
                "data": {
                    "installment": installment
                }
            }))
        },
        Ok(None) => Json(json!({
            "success": false,
            "message": "القسط غير موجود"
        })),
        Err(err) => {
            error!("Failed to fetch installment: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب بيانات القسط"
            }))
        }
    }
}

// Create new installment
async fn create_installment(
    State(state): State<AppState>,
    Json(payload): Json<CreateInstallmentRequest>,
) -> impl IntoResponse {
    // Validate required fields
    if payload.amount <= 0.0 {
        return Json(json!({
            "success": false,
            "message": "مبلغ القسط يجب أن يكون أكبر من صفر"
        }));
    }

    match state.installments_service.create(&state.db, payload).await {
        Ok(installment) => {
            info!("Installment created successfully");
            Json(json!({
                "success": true,
                "message": "تم إنشاء القسط بنجاح",
                "data": {
                    "installment": installment
                }
            }))
        },
        Err(err) => {
            error!("Failed to create installment: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء إنشاء القسط"
            }))
        }
    }
}

// Update installment
async fn update_installment(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateInstallmentRequest>,
) -> impl IntoResponse {
    // Validate required fields
    if payload.amount <= 0.0 {
        return Json(json!({
            "success": false,
            "message": "مبلغ القسط يجب أن يكون أكبر من صفر"
        }));
    }

    match state.installments_service.update(&state.db, id, payload).await {
        Ok(installment) => {
            info!("Installment updated successfully for ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم تحديث القسط بنجاح",
                "data": {
                    "installment": installment
                }
            }))
        },
        Err(err) => {
            error!("Failed to update installment: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء تحديث القسط"
            }))
        }
    }
}

// Delete installment
async fn delete_installment(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.installments_service.delete(&state.db, id).await {
        Ok(result) => {
            info!("Installment deleted successfully for ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم حذف القسط بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to delete installment: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء حذف القسط"
            }))
        }
    }
}

// Record payment for an installment
async fn record_payment(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<InstallmentPaymentRequest>,
) -> impl IntoResponse {
    // Validate required fields
    if payload.paid_amount <= 0.0 {
        return Json(json!({
            "success": false,
            "message": "مبلغ الدفع يجب أن يكون أكبر من صفر"
        }));
    }

    if payload.payment_method.trim().is_empty() {
        return Json(json!({
            "success": false,
            "message": "طريقة الدفع مطلوبة"
        }));
    }

    match state.installments_service.record_payment(&state.db, id, payload).await {
        Ok(result) => {
            info!("Installment payment recorded successfully for ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم تسجيل الدفع بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to record installment payment: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء تسجيل الدفع"
            }))
        }
    }
}

// Create installment plan
async fn create_installment_plan(
    State(state): State<AppState>,
    Json(payload): Json<CreateInstallmentPlanRequest>,
) -> impl IntoResponse {
    // Validate required fields
    if payload.installment_months <= 0 {
        return Json(json!({
            "success": false,
            "message": "عدد الأشهر يجب أن يكون أكبر من صفر"
        }));
    }

    if payload.total_amount <= 0.0 {
        return Json(json!({
            "success": false,
            "message": "المبلغ الإجمالي يجب أن يكون أكبر من صفر"
        }));
    }

    if payload.selected_products.is_empty() {
        return Json(json!({
            "success": false,
            "message": "يرجى إضافة منتجات للخطة"
        }));
    }

    match state.installments_service.create_installment_plan(&state.db, payload).await {
        Ok(result) => {
            info!("Installment plan created successfully");
            Json(json!({
                "success": true,
                "message": "تم إنشاء خطة الأقساط بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to create installment plan: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء إنشاء خطة الأقساط"
            }))
        }
    }
}

pub fn installments_routes() -> Router<AppState> {
    Router::new()
        .route("/api/installments", get(get_all_installments))
        .route("/api/installments", post(create_installment))
        .route("/api/installments/grouped", get(get_grouped_by_sale))
        .route("/api/installments/summary", get(get_summary))
        .route("/api/installments/overdue", get(get_overdue))
        .route("/api/installments/upcoming", get(get_upcoming))
        .route("/api/installments/sale/:sale_id", get(get_by_sale_id))
        .route("/api/installments/customer/:customer_id", get(get_by_customer_id))
        .route("/api/installments/:id", get(get_installment_by_id))
        .route("/api/installments/:id", put(update_installment))
        .route("/api/installments/:id", delete(delete_installment))
        .route("/api/installments/:id/payment", post(record_payment))
        .route("/api/installments/plan", post(create_installment_plan))
}