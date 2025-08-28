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
    EmployeeQuery, CreateEmployeeRequest, UpdateEmployeeRequest, CalculateCommissionRequest
};
use tracing::{info, warn, error};

// Get all employees
async fn get_all_employees(
    State(state): State<AppState>,
    Query(query): Query<EmployeeQuery>,
) -> impl IntoResponse {
    match state.employee_service.get_all(&state.db, &query).await {
        Ok(result) => {
            info!("Employees fetched successfully: {} employees found", result.employees.len());
            Json(json!({
                "success": true,
                "message": "تم استرجاع الموظفين بنجاح",
                "data": result.employees,
                "pagination": result.pagination
            }))
        },
        Err(err) => {
            error!("Failed to fetch employees: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل استرجاع الموظفين"
            }))
        }
    }
}

// Get employee by ID
async fn get_employee_by_id(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.employee_service.get_by_id(&state.db, id).await {
        Ok(Some(employee)) => {
            info!("Employee fetched successfully for ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم استرجاع الموظف بنجاح",
                "data": employee
            }))
        },
        Ok(None) => Json(json!({
            "success": false,
            "message": "الموظف غير موجود"
        })),
        Err(err) => {
            error!("Failed to fetch employee: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل استرجاع الموظف"
            }))
        }
    }
}

// Create new employee
async fn create_employee(
    State(state): State<AppState>,
    Json(payload): Json<CreateEmployeeRequest>,
) -> impl IntoResponse {
    match state.employee_service.create(&state.db, payload).await {
        Ok(result) => {
            info!("Employee created successfully");
            Json(json!({
                "success": true,
                "message": "تم إنشاء الموظف بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to create employee: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل إنشاء الموظف"
            }))
        }
    }
}

// Update employee
async fn update_employee(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateEmployeeRequest>,
) -> impl IntoResponse {
    match state.employee_service.update(&state.db, id, payload).await {
        Ok(result) => {
            info!("Employee updated successfully for ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم تحديث الموظف بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to update employee: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل تحديث الموظف"
            }))
        }
    }
}

// Delete employee
async fn delete_employee(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.employee_service.delete(&state.db, id).await {
        Ok(_) => {
            info!("Employee deleted successfully for ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم حذف الموظف بنجاح"
            }))
        },
        Err(err) => {
            error!("Failed to delete employee: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل حذف الموظف"
            }))
        }
    }
}

// Get employees for dropdown
async fn get_employees_dropdown(
    State(state): State<AppState>,
) -> impl IntoResponse {
    match state.employee_service.get_dropdown_list(&state.db).await {
        Ok(result) => {
            info!("Employees dropdown fetched successfully");
            Json(json!({
                "success": true,
                "message": "تم استرجاع قائمة الموظفين بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to fetch employees dropdown: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل استرجاع قائمة الموظفين"
            }))
        }
    }
}

// Get employees with commission
async fn get_employees_commission_list(
    State(state): State<AppState>,
) -> impl IntoResponse {
    match state.employee_service.get_commission_list(&state.db).await {
        Ok(result) => {
            info!("Employees with commission fetched successfully");
            Json(json!({
                "success": true,
                "message": "تم استرجاع الموظفين مع العمولة بنجاح",
                "data": result
            }))
        },
        Err(err) => {
            error!("Failed to fetch employees with commission: {}", err);
            Json(json!({
                "success": false,
                "message": "فشل استرجاع الموظفين مع العمولة"
            }))
        }
    }
}

// Calculate commission
async fn calculate_commission(
    State(state): State<AppState>,
    Json(payload): Json<CalculateCommissionRequest>,
) -> impl IntoResponse {
    match state.employee_service.calculate_commission(&state.db, payload).await {
        Ok(result) => {
            info!("Commission calculated successfully");
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

pub fn employees_routes() -> Router<AppState> {
    Router::new()
        .route("/api/employees", get(get_all_employees))
        .route("/api/employees", post(create_employee))
        .route("/api/employees/:id", get(get_employee_by_id))
        .route("/api/employees/:id", put(update_employee))
        .route("/api/employees/:id", delete(delete_employee))
        .route("/api/employees/dropdown/list", get(get_employees_dropdown))
        .route("/api/employees/commission/list", get(get_employees_commission_list))
        .route("/api/employees/commission/calculate", post(calculate_commission))
}