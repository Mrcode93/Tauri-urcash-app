use axum::{
    routing::{get, post, put, delete},
    Router,
    extract::{State, Path, Query, Multipart},
    response::IntoResponse,
    Json,
};

use serde_json::json;

use crate::AppState;
use crate::models::{
    ProductQuery, CreateProductRequest, UpdateProductRequest
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProductStockRequest {
    pub quantity: i64,
}
use tracing::{info, warn, error};

// Get all products
async fn get_all_products(
    State(state): State<AppState>,
    Query(query): Query<ProductQuery>,
) -> impl IntoResponse {
    match state.product_service.get_all(&state.db, &query).await {
        Ok(result) => {
            info!("Products fetched successfully: {} products found", result.items.len());
            
            // Check if simple format is requested
            if query.format.as_deref() == Some("simple") {
                Json(json!({
                    "success": true,
                    "data": result.items,
                    "message": "Products retrieved successfully"
                }))
            } else {
                Json(json!({
                    "success": true,
                    "message": "تم جلب المنتجات بنجاح",
                    "data": {
                        "products": result.items,
                        "pagination": {
                            "currentPage": result.page,
                            "totalPages": result.total_pages,
                            "totalItems": result.total,
                            "itemsPerPage": result.limit,
                            "hasNextPage": result.page < result.total_pages,
                            "hasPrevPage": result.page > 1
                        }
                    }
                }))
            }
        },
        Err(err) => {
            error!("Failed to fetch products: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب المنتجات"
            }))
        }
    }
}

// Get product by ID
async fn get_product_by_id(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.product_service.get_by_id(&state.db, id).await {
        Ok(Some(product)) => {
            info!("Product fetched successfully for ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم جلب بيانات المنتج بنجاح",
                "data": product
            }))
        },
        Ok(None) => Json(json!({
            "success": false,
            "message": "المنتج غير موجود"
        })),
        Err(err) => {
            error!("Failed to fetch product: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب بيانات المنتج"
            }))
        }
    }
}

// Create new product
async fn create_product(
    State(state): State<AppState>,
    Json(payload): Json<CreateProductRequest>,
) -> impl IntoResponse {
    // Validate required fields
    if payload.purchase_price < 0.0 {
        return Json(json!({
            "success": false,
            "message": "سعر الشراء يجب أن يكون أكبر من أو يساوي صفر"
        }));
    }

    if payload.selling_price < 0.0 {
        return Json(json!({
            "success": false,
            "message": "سعر البيع يجب أن يكون أكبر من أو يساوي صفر"
        }));
    }

    if payload.selling_price < payload.purchase_price {
        return Json(json!({
            "success": false,
            "message": "سعر البيع يجب أن يكون أكبر من أو يساوي سعر الشراء"
        }));
    }

    match state.product_service.create(&state.db, payload).await {
        Ok(product) => {
            info!("Product created successfully");
            Json(json!({
                "success": true,
                "message": "تم إنشاء المنتج بنجاح",
                "data": product
            }))
        },
        Err(err) => {
            error!("Failed to create product: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء إنشاء المنتج"
            }))
        }
    }
}

// Update product
async fn update_product(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateProductRequest>,
) -> impl IntoResponse {
    match state.product_service.update(&state.db, id, payload).await {
        Ok(product) => {
            info!("Product updated successfully for ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم تحديث المنتج بنجاح",
                "data": product
            }))
        },
        Err(err) => {
            error!("Failed to update product: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء تحديث المنتج"
            }))
        }
    }
}

// Delete product
async fn delete_product(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.product_service.delete(&state.db, id).await {
        Ok(result) => {
            info!("Product deleted successfully for ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم حذف المنتج بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to delete product: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء حذف المنتج"
            }))
        }
    }
}

// Search products
async fn search_products(
    State(state): State<AppState>,
    Query(query): Query<ProductQuery>,
) -> impl IntoResponse {
    let search_query = query.search.as_deref().unwrap_or("");
    
    if search_query.is_empty() {
        return Json(json!({
            "success": false,
            "message": "استعلام البحث مطلوب"
        }));
    }

    match state.product_service.search_products(&state.db, search_query).await {
        Ok(products) => {
            info!("Product search completed for query: {}", search_query);
            Json(json!({
                "success": true,
                "message": "تم العثور على المنتجات",
                "data": products
            }))
        },
        Err(err) => {
            error!("Failed to search products: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء البحث في المنتجات"
            }))
        }
    }
}

// Get low stock products
async fn get_low_stock_products(
    State(state): State<AppState>,
    Query(query): Query<ProductQuery>,
) -> impl IntoResponse {
    let threshold = query.search.as_deref()
        .and_then(|s| s.parse::<i64>().ok())
        .unwrap_or(10);

    match state.product_service.get_low_stock(&state.db, threshold).await {
        Ok(products) => {
            info!("Low stock products fetched with threshold: {}", threshold);
            Json(json!({
                "success": true,
                "message": "تم جلب المنتجات منخفضة المخزون بنجاح",
                "data": products
            }))
        },
        Err(err) => {
            error!("Failed to fetch low stock products: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب المنتجات منخفضة المخزون"
            }))
        }
    }
}

// Get product by barcode
async fn get_product_by_barcode(
    State(state): State<AppState>,
    Path(barcode): Path<String>,
) -> impl IntoResponse {
    match state.product_service.get_by_barcode(&state.db, &barcode).await {
        Ok(Some(product)) => {
            info!("Product found by barcode: {}", barcode);
            Json(json!({
                "success": true,
                "message": "تم العثور على المنتج بنجاح",
                "data": product
            }))
        },
        Ok(None) => Json(json!({
            "success": false,
            "message": "المنتج غير موجود"
        })),
        Err(err) => {
            error!("Failed to fetch product by barcode: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب المنتج"
            }))
        }
    }
}

// Get products optimized for POS
async fn get_products_for_pos(
    State(state): State<AppState>,
    Query(query): Query<ProductQuery>,
) -> impl IntoResponse {
    match state.product_service.get_for_pos(&state.db, &query).await {
        Ok(result) => {
            info!("Products for POS fetched successfully");
            Json(json!({
                "success": true,
                "message": "تم جلب المنتجات للبيع بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to fetch products for POS: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب المنتجات للبيع"
            }))
        }
    }
}

// Update product stock
async fn update_product_stock(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateProductStockRequest>,
) -> impl IntoResponse {
    match state.product_service.update_stock(&state.db, id, payload.quantity).await {
        Ok(success) => {
            if success {
                info!("Product stock updated successfully for ID: {}", id);
                Json(json!({
                    "success": true,
                    "message": "تم تحديث المخزون بنجاح",
                    "data": {
                        "product_id": id,
                        "quantity": payload.quantity
                    }
                }))
            } else {
                Json(json!({
                    "success": false,
                    "message": "فشل في تحديث المخزون"
                }))
            }
        },
        Err(err) => {
            error!("Failed to update product stock: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء تحديث المخزون"
            }))
        }
    }
}

// Get expiring products
async fn get_expiring_products(
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    let days: i64 = params.get("days")
        .and_then(|d| d.parse().ok())
        .unwrap_or(30);

    match state.product_service.get_expiring_products(&state.db, days).await {
        Ok(products) => {
            info!("Expiring products fetched successfully: {} products found", products.len());
            Json(json!({
                "success": true,
                "message": "تم جلب المنتجات القاربة على الانتهاء بنجاح",
                "data": products
            }))
        },
        Err(err) => {
            error!("Failed to fetch expiring products: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب المنتجات القاربة على الانتهاء"
            }))
        }
    }
}

// Import products from Excel/CSV file
async fn import_products(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    let mut file_content: Option<Vec<u8>> = None;
    let mut filename: Option<String> = None;

    // Parse multipart form data
    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        if let Some(field_name) = field.name() {
            if field_name == "file" {
                filename = field.file_name().map(|s| s.to_string());
                if let Ok(data) = field.bytes().await {
                    file_content = Some(data.to_vec());
                }
            }
        }
    }

    let (file_content, filename) = match (file_content, filename) {
        (Some(content), Some(name)) => (content, name),
        _ => {
            return Json(json!({
                "success": false,
                "message": "لم يتم رفع أي ملف أو الملف غير صالح"
            }));
        }
    };

    // Validate file extension
    let valid_extensions = [".xlsx", ".xls", ".csv"];
    let is_valid_file = valid_extensions.iter().any(|ext| {
        filename.to_lowercase().ends_with(ext)
    });

    if !is_valid_file {
        return Json(json!({
            "success": false,
            "message": "نوع الملف غير مدعوم. يرجى رفع ملف Excel (.xlsx/.xls) أو CSV."
        }));
    }

    // Process the file using the service layer
    match state.product_service.import_products(&state.db, &file_content, &filename).await {
        Ok(result) => {
            info!("Products imported successfully: {} imported, {} failed", result.imported, result.failed);
            let mut message = format!("تم استيراد {} منتج بنجاح", result.imported);
            if result.imported > 0 {
                message += " وتم إضافتها للمخزن الرئيسي";
            }
            if result.failed > 0 {
                message += &format!("، فشل في استيراد {} منتج", result.failed);
            }
            if result.errors.len() > 0 {
                message += &format!(" ({} خطأ)", result.errors.len());
            }

            Json(json!({
                "success": true,
                "message": message,
                "data": {
                    "imported": result.imported,
                    "failed": result.failed,
                    "total": result.total,
                    "errors": result.errors,
                    "error_count": result.error_count
                }
            }))
        },
        Err(err) => {
            error!("Failed to import products: {}", err);
            Json(json!({
                "success": false,
                "message": format!("حدث خطأ أثناء استيراد المنتجات: {}", err)
            }))
        }
    }
}

// Get product movements
async fn get_product_movements(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Query(query): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    let start_date = query.get("startDate").cloned();
    let end_date = query.get("endDate").cloned();
    let movement_type = query.get("movementType").cloned();

    match state.stock_movements_service.get_product_movements(&state.db, id, start_date, end_date, movement_type).await {
        Ok(movements) => {
            info!("Product movements retrieved successfully for product ID: {}", id);
            Json(json!({
                "success": true,
                "data": movements,
                "message": "تم استرجاع حركات المنتج بنجاح"
            }))
        },
        Err(err) => {
            error!("Failed to get product movements: {}", err);
            Json(json!({
                "success": false,
                "message": format!("فشل في استرجاع حركات المنتج: {}", err)
            }))
        }
    }
}

pub fn product_routes() -> Router<AppState> {
    Router::new()
        .route("/api/products", get(get_all_products))
        .route("/api/products", post(create_product))
        .route("/api/products/import", post(import_products))
        .route("/api/products/search", get(search_products))
        .route("/api/products/low-stock", get(get_low_stock_products))
        .route("/api/products/expiring", get(get_expiring_products))
        .route("/api/products/pos", get(get_products_for_pos))
        .route("/api/products/barcode/:barcode", get(get_product_by_barcode))
        .route("/api/products/:id", get(get_product_by_id))
        .route("/api/products/:id", put(update_product))
        .route("/api/products/:id", delete(delete_product))
        .route("/api/products/:id/stock", put(update_product_stock))
        .route("/api/products/:id/movements", get(get_product_movements))
}
