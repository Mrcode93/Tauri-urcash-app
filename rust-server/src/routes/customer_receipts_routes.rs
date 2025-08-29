use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use tracing::{error, info};

use crate::{
    models::ApiResponse,
    AppState,
    services::customer_receipts_service::{
        CustomerReceiptQuery, CustomerReceiptsService, CreateCustomerReceiptRequest, UpdateCustomerReceiptRequest,
    },
};

// Get all customer receipts
async fn get_all_receipts(
    State(state): State<AppState>,
    Query(query): Query<CustomerReceiptQuery>,
) -> impl IntoResponse {
    match state.customer_receipts_service.get_all_receipts(&state.db, &query).await {
        Ok(receipts) => {
            info!("Customer receipts retrieved successfully");
            Json(json!({
                "success": true,
                "message": "تم جلب سندات القبض بنجاح",
                "data": receipts
            }))
        }
        Err(err) => {
            error!("Failed to retrieve customer receipts: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب سندات القبض"
            }))
        }
    }
}

// Get customer receipt by ID
async fn get_receipt_by_id(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.customer_receipts_service.get_receipt_by_id(&state.db, id).await {
        Ok(Some(receipt)) => {
            info!("Customer receipt retrieved successfully");
            Json(json!({
                "success": true,
                "message": "تم جلب سند القبض بنجاح",
                "data": receipt
            }))
        }
        Ok(None) => {
            Json(json!({
                "success": false,
                "message": "سند القبض غير موجود"
            }))
        }
        Err(err) => {
            error!("Failed to retrieve customer receipt: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب سند القبض"
            }))
        }
    }
}

// Create new customer receipt
async fn create_receipt(
    State(state): State<AppState>,
    Json(request): Json<CreateCustomerReceiptRequest>,
) -> impl IntoResponse {
    // Get current user ID from context (you'll need to implement this based on your auth system)
    let user_id = 1; // TODO: Get from auth context

    match state.customer_receipts_service.create_receipt(&state.db, request, user_id).await {
        Ok(receipt) => {
            info!("Customer receipt created successfully");
            Json(json!({
                "success": true,
                "message": "تم إنشاء سند القبض بنجاح",
                "data": receipt
            }))
        }
        Err(err) => {
            error!("Failed to create customer receipt: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء إنشاء سند القبض"
            }))
        }
    }
}

// Update customer receipt
async fn update_receipt(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(request): Json<UpdateCustomerReceiptRequest>,
) -> impl IntoResponse {
    match state.customer_receipts_service.update_receipt(&state.db, id, request).await {
        Ok(Some(receipt)) => {
            info!("Customer receipt updated successfully");
            Json(json!({
                "success": true,
                "message": "تم تحديث سند القبض بنجاح",
                "data": receipt
            }))
        }
        Ok(None) => {
            Json(json!({
                "success": false,
                "message": "سند القبض غير موجود"
            }))
        }
        Err(err) => {
            error!("Failed to update customer receipt: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء تحديث سند القبض"
            }))
        }
    }
}

// Delete customer receipt
async fn delete_receipt(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.customer_receipts_service.delete_receipt(&state.db, id).await {
        Ok(true) => {
            info!("Customer receipt deleted successfully");
            Json(json!({
                "success": true,
                "message": "تم حذف سند القبض بنجاح"
            }))
        }
        Ok(false) => {
            Json(json!({
                "success": false,
                "message": "سند القبض غير موجود"
            }))
        }
        Err(err) => {
            error!("Failed to delete customer receipt: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء حذف سند القبض"
            }))
        }
    }
}

// Get customer summary
async fn get_customer_summary(
    State(state): State<AppState>,
    Path(customer_id): Path<i64>,
) -> impl IntoResponse {
    match state.customer_receipts_service.get_customer_summary(&state.db, customer_id).await {
        Ok(summary) => {
            info!("Customer receipt summary retrieved successfully");
            Json(json!({
                "success": true,
                "message": "تم جلب ملخص سندات القبض للعميل بنجاح",
                "data": summary
            }))
        }
        Err(err) => {
            error!("Failed to retrieve customer receipt summary: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب ملخص سندات القبض للعميل"
            }))
        }
    }
}

// Get statistics
async fn get_statistics(
    State(state): State<AppState>,
    Query(query): Query<CustomerReceiptQuery>,
) -> impl IntoResponse {
    match state.customer_receipts_service.get_statistics(&state.db, &query).await {
        Ok(statistics) => {
            info!("Customer receipt statistics fetched successfully");
            Json(json!({
                "success": true,
                "message": "تم جلب إحصائيات سندات القبض بنجاح",
                "data": statistics
            }))
        }
        Err(err) => {
            error!("Failed to fetch customer receipt statistics: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب إحصائيات سندات القبض"
            }))
        }
    }
}

// Get customer bills
async fn get_customer_bills(
    State(state): State<AppState>,
    Path(customer_id): Path<i64>,
) -> impl IntoResponse {
    match state.customer_receipts_service.get_customer_bills(&state.db, customer_id).await {
        Ok(bills) => {
            info!("Customer bills retrieved successfully");
            Json(json!({
                "success": true,
                "message": "تم جلب فواتير العميل بنجاح",
                "data": bills
            }))
        }
        Err(err) => {
            error!("Failed to retrieve customer bills: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب فواتير العميل"
            }))
        }
    }
}

// Get customer debts
async fn get_customer_debts(
    State(state): State<AppState>,
    Path(customer_id): Path<i64>,
) -> impl IntoResponse {
    match state.customer_receipts_service.get_customer_debts(&state.db, customer_id).await {
        Ok(debts) => {
            info!("Customer debts retrieved successfully");
            Json(json!({
                "success": true,
                "message": "تم جلب ديون العميل بنجاح",
                "data": debts
            }))
        }
        Err(err) => {
            error!("Failed to retrieve customer debts: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب ديون العميل"
            }))
        }
    }
}

// Get customer sales
async fn get_customer_sales(
    State(state): State<AppState>,
    Path(customer_id): Path<i64>,
) -> impl IntoResponse {
    match state.customer_receipts_service.get_customer_sales(&state.db, customer_id).await {
        Ok(sales) => {
            info!("Customer sales retrieved successfully");
            Json(json!({
                "success": true,
                "message": "تم جلب فواتير العميل بنجاح",
                "data": sales
            }))
        }
        Err(err) => {
            error!("Failed to retrieve customer sales: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب فواتير العميل"
            }))
        }
    }
}

// Get customer financial summary
async fn get_customer_financial_summary(
    State(state): State<AppState>,
    Path(customer_id): Path<i64>,
) -> impl IntoResponse {
    match state.customer_receipts_service.get_customer_financial_summary(&state.db, customer_id).await {
        Ok(summary) => {
            info!("Customer financial summary retrieved successfully");
            Json(json!({
                "success": true,
                "message": "تم جلب الملخص المالي للعميل بنجاح",
                "data": summary
            }))
        }
        Err(err) => {
            error!("Failed to retrieve customer financial summary: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب الملخص المالي للعميل"
            }))
        }
    }
}

// Export customer receipts to CSV
async fn export_receipts(
    State(state): State<AppState>,
    Query(query): Query<CustomerReceiptQuery>,
) -> impl IntoResponse {
    match state.customer_receipts_service.export_to_csv(&state.db, &query).await {
        Ok(csv_content) => {
            info!("Customer receipts exported successfully");
            (
                StatusCode::OK,
                [("Content-Type", "text/csv; charset=utf-8"), ("Content-Disposition", "attachment; filename=\"customer_receipts.csv\"")],
                csv_content
            )
        }
        Err(err) => {
            error!("Failed to export customer receipts: {}", err);
            (
                StatusCode::BAD_REQUEST,
                [("Content-Type", "application/json"), ("Content-Disposition", "inline")],
                serde_json::to_string(&json!({
                    "success": false,
                    "message": "حدث خطأ أثناء تصدير البيانات"
                })).unwrap()
            )
        }
    }
}

// Export customer receipts to PDF
async fn export_receipts_pdf(
    State(state): State<AppState>,
    Query(query): Query<CustomerReceiptQuery>,
) -> impl IntoResponse {
    match state.customer_receipts_service.export_to_pdf(&state.db, &query).await {
        Ok(pdf_content) => {
            info!("Customer receipts PDF exported successfully");
            (
                StatusCode::OK,
                [("Content-Type", "application/pdf"), ("Content-Disposition", "attachment; filename=\"customer_receipts.pdf\"")],
                pdf_content
            )
        }
        Err(err) => {
            error!("Failed to export customer receipts PDF: {}", err);
            (
                StatusCode::BAD_REQUEST,
                [("Content-Type", "application/json"), ("Content-Disposition", "inline")],
                serde_json::to_string(&json!({
                    "success": false,
                    "message": "حدث خطأ أثناء تصدير البيانات"
                })).unwrap().into_bytes()
            )
        }
    }
}

pub fn customer_receipts_routes() -> axum::Router<AppState> {
    axum::Router::new()
        .route("/api/customer-receipts", axum::routing::get(get_all_receipts))
        .route("/api/customer-receipts", axum::routing::post(create_receipt))
        .route("/api/customer-receipts/statistics", axum::routing::get(get_statistics))
        .route("/api/customer-receipts/export", axum::routing::get(export_receipts))
        .route("/api/customer-receipts/export-pdf", axum::routing::get(export_receipts_pdf))
        .route("/api/customer-receipts/customer/:customer_id/summary", axum::routing::get(get_customer_summary))
        .route("/api/customer-receipts/customer/:customer_id/sales", axum::routing::get(get_customer_sales))
        .route("/api/customer-receipts/customer/:customer_id/bills", axum::routing::get(get_customer_bills))
        .route("/api/customer-receipts/customer/:customer_id/debts", axum::routing::get(get_customer_debts))
        .route("/api/customer-receipts/customer/:customer_id/financial-summary", axum::routing::get(get_customer_financial_summary))
        .route("/api/customer-receipts/:id", axum::routing::get(get_receipt_by_id))
        .route("/api/customer-receipts/:id", axum::routing::put(update_receipt))
        .route("/api/customer-receipts/:id", axum::routing::delete(delete_receipt))
}
