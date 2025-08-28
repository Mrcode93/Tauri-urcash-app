use axum::{
    routing::{get, post, put, delete},
    Router,
    extract::{State, Path, Json, Query},
    response::IntoResponse,
    http::StatusCode,
};
use crate::database::Database;
use crate::models::{
    delegate::*,
    ApiResponse,
    PaginationInfo,
    PaginatedResponse
};
use crate::services::delegates_service::DelegatesService;
use tracing::{info, error};
use serde_json::json;

// Get all delegates
async fn get_all_delegates(
    State(state): State<AppState>,
    Query(query): Query<DelegateQuery>,
) -> impl IntoResponse {
    match state.delegates_service.get_all(&state.db, &query).await {
        Ok(result) => {
            info!("Delegates fetched successfully: {} delegates found", result.delegates.len());
            Json(json!({
                "success": true,
                "message": "تم استرجاع المندوبين بنجاح",
                "data": result.delegates,
                "pagination": result.pagination
            }))
        },
        Err(err) => {
            error!("Failed to fetch delegates: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل استرجاع المندوبين"
            }))
        }
    }
}

// Get delegate by ID
async fn get_delegate_by_id(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.delegates_service.get_by_id(&state.db, id).await {
        Ok(Some(delegate)) => {
            info!("Delegate fetched successfully for ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم استرجاع المندوب بنجاح",
                "data": delegate
            }))
        },
        Ok(None) => Json(json!({
            "success": false,
            "message": "المندوب غير موجود"
        })),
        Err(err) => {
            error!("Failed to fetch delegate: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل استرجاع المندوب"
            }))
        }
    }
}

// Create new delegate
async fn create_delegate(
    State(state): State<AppState>,
    Json(payload): Json<CreateDelegateRequest>,
) -> impl IntoResponse {
    match state.delegates_service.create_delegate(&state.db, payload).await {
        Ok(result) => {
            info!("Delegate created successfully");
            Json(json!({
                "success": true,
                "message": "تم إنشاء المندوب بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to create delegate: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل إنشاء المندوب"
            }))
        }
    }
}

// Update delegate
async fn update_delegate(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateDelegateRequest>,
) -> impl IntoResponse {
    match state.delegates_service.update_delegate(&state.db, id, payload).await {
        Ok(result) => {
            info!("Delegate updated successfully for ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم تحديث المندوب بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to update delegate: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل تحديث المندوب"
            }))
        }
    }
}

// Delete delegate
async fn delete_delegate(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.delegates_service.delete_delegate(&state.db, id).await {
        Ok(_) => {
            info!("Delegate deleted successfully for ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم حذف المندوب بنجاح"
            }))
        },
        Err(err) => {
            error!("Failed to delete delegate: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل حذف المندوب"
            }))
        }
    }
}

// Create delegate sale
async fn create_delegate_sale(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<CreateDelegateSaleRequest>,
) -> impl IntoResponse {
    match state.delegates_service.create_sale(&state.db, id, payload).await {
        Ok(result) => {
            info!("Delegate sale created successfully for delegate ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم إنشاء مبيعات المندوب بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to create delegate sale: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل إنشاء مبيعات المندوب"
            }))
        }
    }
}

// Get delegate sales
async fn get_delegate_sales(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Query(query): Query<DelegateSalesQuery>,
) -> impl IntoResponse {
    match state.delegates_service.get_delegate_sales(&state.db, id, &query).await {
        Ok(result) => {
            info!("Delegate sales fetched successfully for delegate ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم استرجاع مبيعات المندوب بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to fetch delegate sales: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل استرجاع مبيعات المندوب"
            }))
        }
    }
}

// Create delegate collection
async fn create_delegate_collection(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<CreateDelegateCollectionRequest>,
) -> impl IntoResponse {
    match state.delegates_service.create_collection(&state.db, id, payload).await {
        Ok(result) => {
            info!("Delegate collection created successfully for delegate ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم إنشاء تحصيل المندوب بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to create delegate collection: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل إنشاء تحصيل المندوب"
            }))
        }
    }
}

// Get delegate collections
async fn get_delegate_collections(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Query(query): Query<DelegateSalesQuery>,
) -> impl IntoResponse {
    match state.delegates_service.get_delegate_collections(&state.db, id, &query).await {
        Ok(result) => {
            info!("Delegate collections fetched successfully for delegate ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم استرجاع تحصيلات المندوب بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to fetch delegate collections: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل استرجاع تحصيلات المندوب"
            }))
        }
    }
}

// Get commission report
async fn get_commission_report(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.delegates_service.get_commission_report(&state.db, id).await {
        Ok(result) => {
            info!("Commission report fetched successfully for delegate ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم استرجاع تقرير العمولة بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to fetch commission report: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل استرجاع تقرير العمولة"
            }))
        }
    }
}

// Get delegate performance
async fn get_delegate_performance(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.delegates_service.get_performance(&state.db, id).await {
        Ok(result) => {
            info!("Delegate performance fetched successfully for delegate ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم استرجاع أداء المندوب بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to fetch delegate performance: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل استرجاع أداء المندوب"
            }))
        }
    }
}

// Check target achievement
async fn check_target_achievement(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.delegates_service.check_target_achievement(&state.db, id).await {
        Ok(result) => {
            info!("Target achievement checked successfully for delegate ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم فحص تحقيق الهدف بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to check target achievement: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل فحص تحقيق الهدف"
            }))
        }
    }
}

// Assign customer to delegate
async fn assign_customer(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<AssignCustomerRequest>,
) -> impl IntoResponse {
    match state.delegates_service.assign_customer(&state.db, id, payload).await {
        Ok(result) => {
            info!("Customer assigned successfully to delegate ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم تعيين العميل للمندوب بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to assign customer: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل تعيين العميل للمندوب"
            }))
        }
    }
}

// Get assigned customers
async fn get_assigned_customers(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.delegates_service.get_assigned_customers(&state.db, id).await {
        Ok(result) => {
            info!("Assigned customers fetched successfully for delegate ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم استرجاع العملاء المعينين بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to fetch assigned customers: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل استرجاع العملاء المعينين"
            }))
        }
    }
}

// Remove customer assignment
async fn remove_customer_assignment(
    State(state): State<AppState>,
    Path((id, customer_id)): Path<(i64, i64)>,
) -> impl IntoResponse {
    match state.delegates_service.remove_customer_assignment(&state.db, id, customer_id).await {
        Ok(_) => {
            info!("Customer assignment removed successfully for delegate ID: {} and customer ID: {}", id, customer_id);
            Json(json!({
                "success": true,
                "message": "تم إزالة تعيين العميل بنجاح"
            }))
        },
        Err(err) => {
            error!("Failed to remove customer assignment: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل إزالة تعيين العميل"
            }))
        }
    }
}

// Calculate delegate commission
async fn calculate_delegate_commission(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Query(query): Query<CommissionQuery>,
) -> impl IntoResponse {
    match state.delegates_service.calculate_commission(&state.db, id, &query).await {
        Ok(result) => {
            info!("Commission calculated successfully for delegate ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم حساب العمولة بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to calculate commission: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل حساب العمولة"
            }))
        }
    }
}

// Create commission payment
async fn create_commission_payment(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<PayCommissionRequest>,
) -> impl IntoResponse {
    match state.delegates_service.pay_commission(&state.db, id, payload).await {
        Ok(result) => {
            info!("Commission payment created successfully for delegate ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم إنشاء دفع العمولة بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to create commission payment: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل إنشاء دفع العمولة"
            }))
        }
    }
}

// Get delegate dashboard
async fn get_delegate_dashboard(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.delegates_service.get_dashboard(&state.db, id).await {
        Ok(result) => {
            info!("Delegate dashboard fetched successfully for delegate ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم استرجاع لوحة تحكم المندوب بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to fetch delegate dashboard: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل استرجاع لوحة تحكم المندوب"
            }))
        }
    }
}

// Get customers dropdown
async fn get_customers_dropdown(
    State(state): State<AppState>,
) -> impl IntoResponse {
    match state.delegates_service.get_customers_dropdown(&state.db).await {
        Ok(result) => {
            info!("Customers dropdown fetched successfully");
            Json(json!({
                "success": true,
                "message": "تم استرجاع قائمة العملاء بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to fetch customers dropdown: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل استرجاع قائمة العملاء"
            }))
        }
    }
}

// Get delegates by customer ID
async fn get_delegates_by_customer_id(
    State(state): State<AppState>,
    Path(customer_id): Path<i64>,
) -> impl IntoResponse {
    match state.delegates_service.get_by_customer(&state.db, customer_id).await {
        Ok(result) => {
            info!("Delegates fetched successfully for customer ID: {}", customer_id);
            Json(json!({
                "success": true,
                "message": "تم استرجاع المندوبين بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to fetch delegates by customer: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل استرجاع المندوبين"
            }))
        }
    }
}

// Get analytics summary
async fn get_analytics_summary(
    State(state): State<AppState>,
) -> impl IntoResponse {
    match state.delegates_service.get_analytics_summary(&state.db).await {
        Ok(result) => {
            info!("Analytics summary fetched successfully");
            Json(json!({
                "success": true,
                "message": "تم استرجاع ملخص التحليلات بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to fetch analytics summary: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل استرجاع ملخص التحليلات"
            }))
        }
    }
}

pub fn delegates_routes() -> Router<AppState> {
    Router::new()
        .route("/api/delegates", get(get_all_delegates))
        .route("/api/delegates", post(create_delegate))
        .route("/api/delegates/:id", get(get_delegate_by_id))
        .route("/api/delegates/:id", put(update_delegate))
        .route("/api/delegates/:id", delete(delete_delegate))
        .route("/api/delegates/:id/sales", post(create_delegate_sale))
        .route("/api/delegates/:id/sales", get(get_delegate_sales))
        .route("/api/delegates/:id/collections", post(create_delegate_collection))
        .route("/api/delegates/:id/collections", get(get_delegate_collections))
        .route("/api/delegates/:id/commission-report", get(get_commission_report))
        .route("/api/delegates/:id/performance", get(get_delegate_performance))
        .route("/api/delegates/:id/target-achievement", get(check_target_achievement))
        .route("/api/delegates/:id/customers", post(assign_customer))
        .route("/api/delegates/:id/customers", get(get_assigned_customers))
        .route("/api/delegates/:id/customers/:customer_id", delete(remove_customer_assignment))
        .route("/api/delegates/:id/commission", get(calculate_delegate_commission))
        .route("/api/delegates/:id/commission-payments", post(create_commission_payment))
        .route("/api/delegates/:id/dashboard", get(get_delegate_dashboard))
        .route("/api/delegates/customers/dropdown", get(get_customers_dropdown))
        .route("/api/delegates/customer/:customer_id", get(get_delegates_by_customer_id))
        .route("/api/delegates/analytics/summary", get(get_analytics_summary))
}