use axum::{
    routing::{get, post, put, delete},
    Router,
    extract::{State, Path, Query},
    response::IntoResponse,
    Json,
};
use serde_json::json;
use crate::AppState;
use crate::models::{
    CreatePurchaseRequest, UpdatePurchaseRequest, PurchaseReturnRequest
};
use tracing::{info, warn, error};

// Get all purchases
async fn get_all_purchases(
    State(state): State<AppState>,
) -> impl IntoResponse {
    match state.purchase_service.get_all(&state.db).await {
        Ok(purchases) => {
            info!("Purchases fetched successfully: {} purchases found", purchases.len());
            Json(json!({
                "success": true,
                "message": "تم جلب المشتريات بنجاح",
                "data": {
                    "purchases": purchases
                }
            }))
        },
        Err(err) => {
            error!("Failed to fetch purchases: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب المشتريات"
            }))
        }
    }
}

// Get purchase by ID
async fn get_purchase_by_id(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.purchase_service.get_by_id(&state.db, id).await {
        Ok(Some(purchase)) => {
            info!("Purchase fetched successfully for ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم جلب بيانات المشتريات بنجاح",
                "data": {
                    "purchase": purchase
                }
            }))
        },
        Ok(None) => Json(json!({
            "success": false,
            "message": "المشتريات غير موجودة"
        })),
        Err(err) => {
            error!("Failed to fetch purchase: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب بيانات المشتريات"
            }))
        }
    }
}

// Get purchase by ID with returns
async fn get_purchase_by_id_with_returns(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.purchase_service.get_purchase_with_returns(&state.db, id).await {
        Ok(Some(purchase)) => {
            info!("Purchase with returns fetched successfully for ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم جلب بيانات المشتريات مع الإرجاعات بنجاح",
                "data": {
                    "purchase": purchase
                }
            }))
        },
        Ok(None) => Json(json!({
            "success": false,
            "message": "المشتريات غير موجودة"
        })),
        Err(err) => {
            error!("Failed to fetch purchase with returns: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب بيانات المشتريات مع الإرجاعات"
            }))
        }
    }
}

// Get supplier purchases
async fn get_supplier_purchases(
    State(state): State<AppState>,
    Path(supplier_id): Path<i64>,
) -> impl IntoResponse {
    match state.purchase_service.get_by_supplier(&state.db, supplier_id).await {
        Ok(purchases) => {
            info!("Supplier purchases fetched successfully for supplier ID: {}", supplier_id);
            Json(json!({
                "success": true,
                "message": "تم جلب مشتريات المورد بنجاح",
                "data": {
                    "purchases": purchases
                }
            }))
        },
        Err(err) => {
            error!("Failed to fetch supplier purchases: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب مشتريات المورد"
            }))
        }
    }
}

// Create new purchase
async fn create_purchase(
    State(state): State<AppState>,
    Json(payload): Json<CreatePurchaseRequest>,
) -> impl IntoResponse {
    // Validate required fields
    if payload.items.is_empty() {
        return Json(json!({
            "success": false,
            "message": "يجب إضافة منتج واحد على الأقل"
        }));
    }

    for item in &payload.items {
        if item.quantity <= 0 {
            return Json(json!({
                "success": false,
                "message": "الكمية يجب أن تكون أكبر من صفر"
            }));
        }
        if item.price < 0.0 {
            return Json(json!({
                "success": false,
                "message": "السعر يجب أن يكون أكبر من أو يساوي صفر"
            }));
        }
    }

    match state.purchase_service.create(&state.db, payload, Some(1)).await {
        Ok(purchase) => {
            info!("Purchase created successfully");
            Json(json!({
                "success": true,
                "message": "تم إنشاء المشتريات بنجاح",
                "data": {
                    "purchase": purchase
                }
            }))
        },
        Err(err) => {
            error!("Failed to create purchase: {}", err);
            
            // Handle specific duplicate errors
            let error_message = if err.to_string().contains("duplicate") || 
                                 err.to_string().contains("UNIQUE constraint failed") ||
                                 err.to_string().contains("already exists") {
                "تم إنشاء فاتورة مشتريات مماثلة مسبقاً، يرجى التحقق من قائمة المشتريات"
            } else {
                "حدث خطأ أثناء إنشاء المشتريات"
            };
            
            Json(json!({
                "success": false,
                "message": error_message
            }))
        }
    }
}

// Update purchase
async fn update_purchase(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<UpdatePurchaseRequest>,
) -> impl IntoResponse {
    match state.purchase_service.update(&state.db, id, payload, Some(1)).await {
        Ok(Some(purchase)) => {
            info!("Purchase updated successfully for ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم تحديث المشتريات بنجاح",
                "data": {
                    "purchase": purchase
                }
            }))
        },
        Ok(None) => Json(json!({
            "success": false,
            "message": "المشتريات غير موجودة"
        })),
        Err(err) => {
            error!("Failed to update purchase: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء تحديث المشتريات"
            }))
        }
    }
}

// Delete purchase
async fn delete_purchase(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Query(query): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    let force = query.get("force").map(|s| s == "true").unwrap_or(false);
    
    match state.purchase_service.delete(&state.db, id, Some(1), force).await {
        Ok(_) => {
            info!("Purchase deleted successfully for ID: {}", id);
            Json(json!({
                "success": true,
                "message": if force { "تم حذف المشتريات نهائياً بنجاح" } else { "تم حذف المشتريات بنجاح" }
            }))
        },
        Err(err) => {
            error!("Failed to delete purchase: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء حذف المشتريات"
            }))
        }
    }
}

// Process purchase return
async fn process_purchase_return(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<PurchaseReturnRequest>,
) -> impl IntoResponse {
    // Validate return data
    if payload.items.is_empty() {
        return Json(json!({
            "success": false,
            "message": "يجب تحديد المنتجات المراد إرجاعها"
        }));
    }

    if payload.reason.trim().is_empty() {
        return Json(json!({
            "success": false,
            "message": "يجب تحديد سبب الإرجاع"
        }));
    }

    if payload.refund_method.trim().is_empty() {
        return Json(json!({
            "success": false,
            "message": "يجب تحديد طريقة الاسترداد"
        }));
    }

    match state.purchase_service.process_purchase_return(&state.db, id, payload.items, payload.reason, Some(1)).await {
        Ok(result) => {
            info!("Purchase return processed successfully for purchase ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم معالجة إرجاع المشتريات بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to process purchase return: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء معالجة إرجاع المشتريات"
            }))
        }
    }
}

// Get purchase returns
async fn get_purchase_returns(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.purchase_service.get_purchase_returns(&state.db, id).await {
        Ok(returns) => {
            info!("Purchase returns fetched successfully for purchase ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم جلب إرجاعات المشتريات بنجاح",
                "data": {
                    "returns": returns
                }
            }))
        },
        Err(err) => {
            error!("Failed to fetch purchase returns: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب إرجاعات المشتريات"
            }))
        }
    }
}

pub fn purchases_routes() -> Router<AppState> {
    Router::new()
        .route("/api/purchases", get(get_all_purchases))
        .route("/api/purchases", post(create_purchase))
        .route("/api/purchases/supplier/:supplier_id", get(get_supplier_purchases))
        .route("/api/purchases/:id", get(get_purchase_by_id))
        .route("/api/purchases/:id/with-returns", get(get_purchase_by_id_with_returns))
        .route("/api/purchases/:id", put(update_purchase))
        .route("/api/purchases/:id", delete(delete_purchase))
        .route("/api/purchases/:id/return", post(process_purchase_return))
        .route("/api/purchases/:id/returns", get(get_purchase_returns))
}