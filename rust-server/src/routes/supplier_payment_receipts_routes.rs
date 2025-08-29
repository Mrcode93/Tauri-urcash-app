use axum::{
    routing::{get, post, put, delete},
    Router,
    extract::{State, Path, Query},
    response::IntoResponse,
    Json,
};
use serde_json::json;
use crate::AppState;
use crate::models::supplier_payment_receipt::*;
use tracing::{info, warn, error};

// Get all supplier payment receipts
async fn get_all_receipts(
    State(state): State<AppState>,
    Query(query): Query<SupplierPaymentReceiptQuery>,
) -> impl IntoResponse {
    match state.supplier_payment_receipt_service.get_all(&state.db, &query).await {
        Ok(receipts) => {
            info!("Supplier payment receipts retrieved successfully");
            Json(json!({
                "success": true,
                "data": receipts,
                "message": "تم جلب إيصالات دفع الموردين بنجاح"
            }))
        },
        Err(err) => {
            error!("Failed to get supplier payment receipts: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب إيصالات دفع الموردين"
            }))
        }
    }
}

// Get receipt by ID
async fn get_receipt_by_id(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.supplier_payment_receipt_service.get_by_id(&state.db, id).await {
        Ok(Some(receipt)) => {
            info!("Supplier payment receipt fetched successfully for ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم جلب بيانات إيصال الدفع بنجاح",
                "data": receipt
            }))
        },
        Ok(None) => Json(json!({
            "success": false,
            "message": "إيصال الدفع غير موجود"
        })),
        Err(err) => {
            error!("Failed to fetch supplier payment receipt: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب بيانات إيصال الدفع"
            }))
        }
    }
}

// Create new receipt
async fn create_receipt(
    State(state): State<AppState>,
    Json(payload): Json<CreateSupplierPaymentReceiptRequest>,
) -> impl IntoResponse {
    // Validate required fields
    if payload.amount <= 0.0 {
        return Json(json!({
            "success": false,
            "message": "مبلغ الإيصال يجب أن يكون أكبر من صفر"
        }));
    }

    if payload.payment_method.trim().is_empty() {
        return Json(json!({
            "success": false,
            "message": "طريقة الدفع مطلوبة"
        }));
    }

    match state.supplier_payment_receipt_service.create(&state.db, payload).await {
        Ok(receipt) => {
            info!("Supplier payment receipt created successfully");
            Json(json!({
                "success": true,
                "message": "تم إنشاء إيصال الدفع بنجاح",
                "data": receipt
            }))
        },
        Err(err) => {
            error!("Failed to create supplier payment receipt: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء إنشاء إيصال الدفع"
            }))
        }
    }
}

// Update receipt
async fn update_receipt(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateSupplierPaymentReceiptRequest>,
) -> impl IntoResponse {
    match state.supplier_payment_receipt_service.update(&state.db, id, payload).await {
        Ok(receipt) => {
            info!("Supplier payment receipt updated successfully for ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم تحديث إيصال الدفع بنجاح",
                "data": receipt
            }))
        },
        Err(err) => {
            error!("Failed to update supplier payment receipt: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء تحديث إيصال الدفع"
            }))
        }
    }
}

// Delete receipt
async fn delete_receipt(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.supplier_payment_receipt_service.delete(&state.db, id).await {
        Ok(deleted) => {
            if deleted {
                info!("Supplier payment receipt deleted successfully for ID: {}", id);
                Json(json!({
                    "success": true,
                    "message": "تم حذف إيصال الدفع بنجاح"
                }))
            } else {
                warn!("Supplier payment receipt not found for deletion: {}", id);
                Json(json!({
                    "success": false,
                    "message": "إيصال الدفع غير موجود"
                }))
            }
        },
        Err(err) => {
            error!("Failed to delete supplier payment receipt: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء حذف إيصال الدفع"
            }))
        }
    }
}

// Get supplier summary
async fn get_supplier_summary(
    State(state): State<AppState>,
    Path(supplier_id): Path<i64>,
) -> impl IntoResponse {
    match state.supplier_payment_receipt_service.get_supplier_summary(&state.db, supplier_id).await {
        Ok(summary) => {
            info!("Supplier payment receipt summary fetched successfully for supplier ID: {}", supplier_id);
            Json(json!({
                "success": true,
                "message": "تم جلب ملخص إيصالات المورد بنجاح",
                "data": summary
            }))
        },
        Err(err) => {
            error!("Failed to fetch supplier payment receipt summary: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب ملخص إيصالات المورد"
            }))
        }
    }
}

// Get supplier purchases
async fn get_supplier_purchases(
    State(state): State<AppState>,
    Path(supplier_id): Path<i64>,
) -> impl IntoResponse {
    match state.supplier_payment_receipt_service.get_supplier_purchases(&state.db, supplier_id).await {
        Ok(purchases) => {
            info!("Supplier purchases fetched successfully for supplier ID: {}", supplier_id);
            Json(json!({
                "success": true,
                "message": "تم جلب فواتير الشراء للمورد بنجاح",
                "data": purchases
            }))
        },
        Err(err) => {
            error!("Failed to fetch supplier purchases: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب فواتير الشراء للمورد"
            }))
        }
    }
}

// Get statistics
async fn get_statistics(
    State(state): State<AppState>,
    Query(query): Query<SupplierPaymentReceiptQuery>,
) -> impl IntoResponse {
    match state.supplier_payment_receipt_service.get_statistics(&state.db, &query).await {
        Ok(statistics) => {
            info!("Supplier payment receipt statistics fetched successfully");
            Json(json!({
                "success": true,
                "message": "تم جلب الإحصائيات بنجاح",
                "data": statistics
            }))
        },
        Err(err) => {
            error!("Failed to fetch supplier payment receipt statistics: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب الإحصائيات"
            }))
        }
    }
}

pub fn supplier_payment_receipts_routes() -> Router<AppState> {
    Router::new()
        .route("/api/supplier-payment-receipts", get(get_all_receipts))
        .route("/api/supplier-payment-receipts", post(create_receipt))
        .route("/api/supplier-payment-receipts/statistics", get(get_statistics))
        .route("/api/supplier-payment-receipts/supplier/:supplier_id/summary", get(get_supplier_summary))
        .route("/api/supplier-payment-receipts/supplier/:supplier_id/purchases", get(get_supplier_purchases))
        .route("/api/supplier-payment-receipts/:id", get(get_receipt_by_id))
        .route("/api/supplier-payment-receipts/:id", put(update_receipt))
        .route("/api/supplier-payment-receipts/:id", delete(delete_receipt))
}
