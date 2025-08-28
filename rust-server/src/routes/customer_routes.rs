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
    Customer, CreateCustomerRequest, UpdateCustomerRequest, CustomerQuery, CustomerFilters,
    CustomerListResponse, CustomerWithSales, CustomerDetails, ApiResponse
};
use tracing::{info, warn, error};

// Get all customers
async fn get_all_customers(
    State(state): State<AppState>,
    Query(query): Query<CustomerQuery>,
) -> impl IntoResponse {
    let filters = CustomerFilters {
        search: query.search,
        exclude_anonymous: query.exclude_anonymous,
    };

    match state.customer_service.get_all(&state.db, Some(filters), query.page, query.limit).await {
        Ok(result) => Json(json!({
            "success": true,
            "data": result,
            "message": "تم استرجاع العملاء بنجاح"
        })),
        Err(err) => {
            error!("فشل استرجاع العملاء: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل استرجاع العملاء"
            }))
        }
    }
}

// Search customers
async fn search_customers(
    State(state): State<AppState>,
    Query(query): Query<CustomerQuery>,
) -> impl IntoResponse {
    if query.search.is_none() {
        return Json(json!({
            "success": false,
            "message": "يجب أن يكون لديك سؤال للبحث"
        }));
    }

    match state.customer_service.search_customers(&state.db, &query.search.unwrap()).await {
        Ok(customers) => {
            info!("تم البحث عن العملاء: {} نتائج", customers.len());
            Json(json!({
                "success": true,
                "data": { "data": customers },
                "message": "تم البحث عن العملاء بنجاح"
            }))
        },
        Err(err) => {
            error!("فشل البحث عن العملاء: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل البحث عن العملاء"
            }))
        }
    }
}

// Get customer by ID
async fn get_customer_by_id(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.customer_service.get_by_id(&state.db, id).await {
        Ok(Some(customer)) => Json(json!({
            "success": true,
            "data": customer,
            "message": "تم استرجاع العملاء بنجاح"
        })),
        Ok(None) => Json(json!({
            "success": false,
            "message": "العميل غير موجود"
        })),
        Err(err) => {
            error!("فشل استرجاع العميل: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل استرجاع العملاء"
            }))
        }
    }
}

// Get customer details (optimized endpoint)
async fn get_customer_details(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    if id == 0 {
        return Json(json!({
            "success": false,
            "message": "رمز العميل غير صالح"
        }));
    }

    match state.customer_service.get_customer_details(&state.db, id).await {
        Ok(Some(customer_details)) => {
            info!("تم استرجاع تفاصيل العميل: {}", id);
            Json(json!({
                "success": true,
                "data": customer_details,
                "message": "تم استرجاع تفاصيل العميل بنجاح"
            }))
        },
        Ok(None) => Json(json!({
            "success": false,
            "message": "العميل غير موجود"
        })),
        Err(err) => {
            error!("Failed to get customer details: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to get customer details"
            }))
        }
    }
}

// Get customer with sales history
async fn get_customer_with_sales(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.customer_service.get_customer_with_sales(&state.db, id).await {
        Ok(Some(customer)) => {
            info!("Customer with sales fetched successfully for customer ID: {}", id);
            Json(json!({
                "success": true,
                "data": { "data": customer },
                "message": "customer_sales_fetched"
            }))
        },
        Ok(None) => Json(json!({
            "success": false,
            "message": "Customer not found"
        })),
        Err(err) => {
            error!("Failed to get customer with sales: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to get customer with sales"
            }))
        }
    }
}

// Create new customer
async fn create_customer(
    State(state): State<AppState>,
    Json(payload): Json<CreateCustomerRequest>,
) -> impl IntoResponse {
    match state.customer_service.create(&state.db, payload).await {
        Ok(customer) => Json(json!({
            "success": true,
            "data": customer,
            "message": "customer_created"
        })),
        Err(err) => {
            error!("Failed to create customer: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to create customer"
            }))
        }
    }
}

// Update customer
async fn update_customer(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateCustomerRequest>,
) -> impl IntoResponse {
    match state.customer_service.update(&state.db, id, payload).await {
        Ok(Some(customer)) => Json(json!({
            "success": true,
            "data": customer,
            "message": "customer_updated"
        })),
        Ok(None) => Json(json!({
            "success": false,
            "message": "Customer not found"
        })),
        Err(err) => {
            error!("Failed to update customer: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to update customer"
            }))
        }
    }
}

// Delete customer
async fn delete_customer(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.customer_service.delete(&state.db, id).await {
        Ok(true) => Json(json!({
            "success": true,
            "data": null,
            "message": "customer_deleted"
        })),
        Ok(false) => Json(json!({
            "success": false,
            "message": "Customer not found"
        })),
        Err(err) => {
            error!("Failed to delete customer: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to delete customer"
            }))
        }
    }
}

// Reload customers cache
async fn reload_cache(
    State(state): State<AppState>,
) -> impl IntoResponse {
    match state.customer_service.load_all_customers_to_cache(&state.db).await {
        Ok(customers) => {
            info!("Cache reloaded successfully with {} customers", customers.len());
            Json(json!({
                "success": true,
                "data": {
                    "message": "Cache reloaded successfully",
                    "customersCount": customers.len(),
                    "timestamp": chrono::Utc::now().to_rfc3339()
                },
                "message": "cache_reloaded"
            }))
        },
        Err(err) => {
            error!("Failed to reload cache: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to reload cache"
            }))
        }
    }
}

// Export customer routes
pub fn customer_routes() -> Router<AppState> {
    Router::new()
        .route("/api/customers", get(get_all_customers).post(create_customer))
        .route("/api/customers/search", get(search_customers))
        .route("/api/customers/cache/reload", post(reload_cache))
        .route("/api/customers/:id", get(get_customer_by_id).put(update_customer).delete(delete_customer))
        .route("/api/customers/:id/details", get(get_customer_details))
        .route("/api/customers/:id/sales", get(get_customer_with_sales))
}
