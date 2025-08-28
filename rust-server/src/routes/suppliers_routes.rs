use axum::{
    routing::{get, post, put, delete},
    Router,
    extract::{State, Path, Query},
    response::IntoResponse,
    Json,
};
use serde_json::json;
use crate::AppState;
use crate::models::supplier::*;
use tracing::{info, warn, error};

// Get all suppliers
async fn get_suppliers(
    State(state): State<AppState>,
    Query(query): Query<SupplierQuery>,
) -> impl IntoResponse {
    match state.supplier_service.get_all(&state.db, &query).await {
        Ok(suppliers) => {
            info!("Suppliers retrieved successfully");
            Json(json!({
                "success": true,
                "data": suppliers,
                "message": "Suppliers retrieved successfully"
            }))
        },
        Err(err) => {
            error!("Failed to get suppliers: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب الموردين",
                "error": err.to_string()
            }))
        }
    }
}

// Search suppliers
async fn search_suppliers(
    State(state): State<AppState>,
    Query(query): Query<SupplierQuery>,
) -> impl IntoResponse {
    if let Some(search_query) = &query.search {
        match state.supplier_service.search(&state.db, search_query).await {
            Ok(suppliers) => {
                info!("Suppliers search completed successfully");
                Json(json!({
                    "success": true,
                    "data": suppliers,
                    "message": "Suppliers search completed successfully"
                }))
            },
            Err(err) => {
                error!("Failed to search suppliers: {}", err);
                Json(json!({
                    "success": false,
                    "message": err.to_string()
                }))
            }
        }
    } else {
        Json(json!({
            "success": false,
            "message": "يجب إدخال مطلوب البحث"
        }))
    }
}

// Get supplier by ID
async fn get_supplier_by_id(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.supplier_service.get_by_id(&state.db, id).await {
        Ok(Some(supplier)) => {
            info!("Supplier retrieved successfully");
            Json(json!({
                "success": true,
                "data": supplier,
                "message": "Supplier retrieved successfully"
            }))
        },
        Ok(None) => {
            warn!("Supplier not found: {}", id);
            Json(json!({
                "success": false,
                "message": "المورد غير موجود"
            }))
        },
        Err(err) => {
            error!("Failed to get supplier: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب بيانات المورد",
                "error": err.to_string()
            }))
        }
    }
}

// Get supplier with products
async fn get_supplier_with_products(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.supplier_service.get_with_products(&state.db, id).await {
        Ok(Some(supplier)) => {
            info!("Supplier with products retrieved successfully");
            Json(json!({
                "success": true,
                "data": supplier,
                "message": "Supplier with products retrieved successfully"
            }))
        },
        Ok(None) => {
            warn!("Supplier not found: {}", id);
            Json(json!({
                "success": false,
                "message": "المورد غير موجود"
            }))
        },
        Err(err) => {
            error!("Failed to get supplier with products: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب بيانات المورد مع المنتجات",
                "error": err.to_string()
            }))
        }
    }
}

// Create new supplier
async fn create_supplier(
    State(state): State<AppState>,
    Json(supplier_data): Json<CreateSupplierRequest>,
) -> impl IntoResponse {
    // Validate required fields
    if supplier_data.name.trim().is_empty() {
        return Json(json!({
            "success": false,
            "message": "اسم المورد مطلوب"
        }));
    }

    if supplier_data.contact_person.trim().is_empty() {
        return Json(json!({
            "success": false,
            "message": "اسم المسؤول مطلوب"
        }));
    }

    match state.supplier_service.create(&state.db, supplier_data).await {
        Ok(supplier) => {
            info!("Supplier created successfully");
            Json(json!({
                "success": true,
                "data": supplier,
                "message": "تم إنشاء المورد بنجاح"
            }))
        },
        Err(err) => {
            error!("Failed to create supplier: {}", err);
            Json(json!({
                "success": false,
                "message": err.to_string()
            }))
        }
    }
}

// Update supplier
async fn update_supplier(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(supplier_data): Json<UpdateSupplierRequest>,
) -> impl IntoResponse {
    // Validate required fields if provided
    if let Some(ref name) = supplier_data.name {
        if name.trim().is_empty() {
            return Json(json!({
                "success": false,
                "message": "اسم المورد مطلوب"
            }));
        }
    }

    if let Some(ref contact_person) = supplier_data.contact_person {
        if contact_person.trim().is_empty() {
            return Json(json!({
                "success": false,
                "message": "اسم المسؤول مطلوب"
            }));
        }
    }

    match state.supplier_service.update(&state.db, id, supplier_data).await {
        Ok(supplier) => {
            info!("Supplier updated successfully");
            Json(json!({
                "success": true,
                "data": supplier,
                "message": "تم تحديث بيانات المورد بنجاح"
            }))
        },
        Err(err) => {
            error!("Failed to update supplier: {}", err);
            Json(json!({
                "success": false,
                "message": err.to_string()
            }))
        }
    }
}

// Delete supplier
async fn delete_supplier(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.supplier_service.delete(&state.db, id).await {
        Ok(deleted) => {
            if deleted {
                info!("Supplier deleted successfully");
                Json(json!({
                    "success": true,
                    "data": { "id": id },
                    "message": "تم حذف المورد بنجاح"
                }))
            } else {
                warn!("Supplier not found for deletion: {}", id);
                Json(json!({
                    "success": false,
                    "message": "المورد غير موجود"
                }))
            }
        },
        Err(err) => {
            error!("Failed to delete supplier: {}", err);
            Json(json!({
                "success": false,
                "message": err.to_string()
            }))
        }
    }
}

pub fn suppliers_routes() -> Router<AppState> {
    Router::new()
        .route("/api/suppliers", get(get_suppliers))
        .route("/api/suppliers/search", get(search_suppliers))
        .route("/api/suppliers", post(create_supplier))
        .route("/api/suppliers/:id", get(get_supplier_by_id))
        .route("/api/suppliers/:id/products", get(get_supplier_with_products))
        .route("/api/suppliers/:id", put(update_supplier))
        .route("/api/suppliers/:id", delete(delete_supplier))
}