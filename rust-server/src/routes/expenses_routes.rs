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
    ExpenseQuery, CreateExpenseRequest, UpdateExpenseRequest, DateRangeQuery
};
use tracing::{info, warn, error};

// Get all expenses
async fn get_all_expenses(
    State(state): State<AppState>,
    Query(query): Query<ExpenseQuery>,
) -> impl IntoResponse {
    match state.expense_service.get_all(&state.db, &query).await {
        Ok(result) => {
            info!("Expenses fetched successfully: {} expenses found", result.expenses.len());
            Json(json!({
                "success": true,
                "message": "تم جلب المصروفات بنجاح",
                "data": {
                    "expenses": result.expenses
                },
                "pagination": result.pagination
            }))
        },
        Err(err) => {
            error!("Failed to fetch expenses: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب المصروفات"
            }))
        }
    }
}

// Get expense by ID
async fn get_expense_by_id(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.expense_service.get_by_id(&state.db, id).await {
        Ok(Some(expense)) => {
            info!("Expense fetched successfully for ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم جلب بيانات المصروف بنجاح",
                "data": {
                    "expense": expense
                }
            }))
        },
        Ok(None) => Json(json!({
            "success": false,
            "message": "المصروف غير موجود"
        })),
        Err(err) => {
            error!("Failed to fetch expense: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب بيانات المصروف"
            }))
        }
    }
}

// Get expenses by category
async fn get_expenses_by_category(
    State(state): State<AppState>,
    Path(category): Path<String>,
) -> impl IntoResponse {
    match state.expense_service.get_by_category(&state.db, &category).await {
        Ok(expenses) => {
            info!("Expenses by category fetched successfully for category: {}", category);
            Json(json!({
                "success": true,
                "message": "تم جلب المصروفات حسب الفئة بنجاح",
                "data": {
                    "expenses": expenses
                }
            }))
        },
        Err(err) => {
            error!("Failed to fetch expenses by category: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب المصروفات حسب الفئة"
            }))
        }
    }
}

// Get expenses by date range
async fn get_expenses_by_date_range(
    State(state): State<AppState>,
    Query(query): Query<DateRangeQuery>,
) -> impl IntoResponse {
    if query.start_date.is_none() || query.end_date.is_none() {
        return Json(json!({
            "success": false,
            "message": "تاريخ البداية والنهاية مطلوبان"
        }));
    }

    let start_date = query.start_date.unwrap().to_string();
    let end_date = query.end_date.unwrap().to_string();

    match state.expense_service.get_by_date_range(&state.db, &start_date, &end_date).await {
        Ok(expenses) => {
            info!("Expenses by date range fetched successfully from {} to {}", start_date, end_date);
            Json(json!({
                "success": true,
                "message": "تم جلب المصروفات حسب التاريخ بنجاح",
                "data": {
                    "expenses": expenses
                }
            }))
        },
        Err(err) => {
            error!("Failed to fetch expenses by date range: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب المصروفات حسب التاريخ"
            }))
        }
    }
}

// Create new expense
async fn create_expense(
    State(state): State<AppState>,
    Json(payload): Json<CreateExpenseRequest>,
) -> impl IntoResponse {
    // Validate required fields
    if payload.description.trim().is_empty() {
        return Json(json!({
            "success": false,
            "message": "وصف المصروف مطلوب"
        }));
    }
    
    if payload.amount <= 0.0 {
        return Json(json!({
            "success": false,
            "message": "المبلغ يجب أن يكون أكبر من صفر"
        }));
    }
    
    if payload.category.trim().is_empty() {
        return Json(json!({
            "success": false,
            "message": "فئة المصروف مطلوبة"
        }));
    }

    match state.expense_service.create(&state.db, payload).await {
        Ok(expense) => {
            info!("Expense created successfully");
            Json(json!({
                "success": true,
                "message": "تم إنشاء المصروف بنجاح",
                "data": {
                    "expense": expense
                }
            }))
        },
        Err(err) => {
            error!("Failed to create expense: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء إنشاء المصروف"
            }))
        }
    }
}

// Update expense
async fn update_expense(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateExpenseRequest>,
) -> impl IntoResponse {
    // Validate required fields
    if payload.description.trim().is_empty() {
        return Json(json!({
            "success": false,
            "message": "وصف المصروف مطلوب"
        }));
    }
    
    if payload.amount <= 0.0 {
        return Json(json!({
            "success": false,
            "message": "المبلغ يجب أن يكون أكبر من صفر"
        }));
    }
    
    if payload.category.trim().is_empty() {
        return Json(json!({
            "success": false,
            "message": "فئة المصروف مطلوبة"
        }));
    }

    match state.expense_service.update(&state.db, id, payload).await {
        Ok(expense) => {
            info!("Expense updated successfully for ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم تحديث المصروف بنجاح",
                "data": {
                    "expense": expense
                }
            }))
        },
        Err(err) => {
            error!("Failed to update expense: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء تحديث المصروف"
            }))
        }
    }
}

// Delete expense
async fn delete_expense(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> impl IntoResponse {
    match state.expense_service.delete(&state.db, id).await {
        Ok(expense) => {
            info!("Expense deleted successfully for ID: {}", id);
            Json(json!({
                "success": true,
                "message": "تم حذف المصروف بنجاح",
                "data": {
                    "expense": expense
                }
            }))
        },
        Err(err) => {
            error!("Failed to delete expense: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء حذف المصروف"
            }))
        }
    }
}

// Get total by category
async fn get_total_by_category(
    State(state): State<AppState>,
    Query(query): Query<DateRangeQuery>,
) -> impl IntoResponse {
    if query.start_date.is_none() || query.end_date.is_none() {
        return Json(json!({
            "success": false,
            "message": "تاريخ البداية والنهاية مطلوبان"
        }));
    }

    let start_date = query.start_date.unwrap().to_string();
    let end_date = query.end_date.unwrap().to_string();

    match state.expense_service.get_total_by_category(&state.db, &start_date, &end_date).await {
        Ok(totals) => {
            info!("Expense totals by category fetched successfully from {} to {}", start_date, end_date);
            Json(json!({
                "success": true,
                "message": "تم جلب إجمالي المصروفات حسب الفئة بنجاح",
                "data": {
                    "totals": totals
                }
            }))
        },
        Err(err) => {
            error!("Failed to fetch expense totals by category: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب إجمالي المصروفات حسب الفئة"
            }))
        }
    }
}

// Get total by date range
async fn get_total_by_date_range(
    State(state): State<AppState>,
    Query(query): Query<DateRangeQuery>,
) -> impl IntoResponse {
    if query.start_date.is_none() || query.end_date.is_none() {
        return Json(json!({
            "success": false,
            "message": "تاريخ البداية والنهاية مطلوبان"
        }));
    }

    let start_date = query.start_date.unwrap().to_string();
    let end_date = query.end_date.unwrap().to_string();

    match state.expense_service.get_total_by_date_range(&state.db, &start_date, &end_date).await {
        Ok(total) => {
            info!("Expense total by date range fetched successfully from {} to {}", start_date, end_date);
            Json(json!({
                "success": true,
                "message": "تم جلب إجمالي المصروفات حسب التاريخ بنجاح",
                "data": {
                    "total": total
                }
            }))
        },
        Err(err) => {
            error!("Failed to fetch expense total by date range: {}", err);
            Json(json!({
                "success": false,
                "message": "حدث خطأ أثناء جلب إجمالي المصروفات حسب التاريخ"
            }))
        }
    }
}

pub fn expenses_routes() -> Router<AppState> {
    Router::new()
        .route("/api/expenses", get(get_all_expenses))
        .route("/api/expenses", post(create_expense))
        .route("/api/expenses/category/:category", get(get_expenses_by_category))
        .route("/api/expenses/date-range", get(get_expenses_by_date_range))
        .route("/api/expenses/:id", get(get_expense_by_id))
        .route("/api/expenses/:id", put(update_expense))
        .route("/api/expenses/:id", delete(delete_expense))
        .route("/api/expenses/total-by-category", get(get_total_by_category))
        .route("/api/expenses/total-by-date-range", get(get_total_by_date_range))
}