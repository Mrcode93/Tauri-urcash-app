use axum::{
    routing::get,
    Router,
    extract::{State, Query},
    response::IntoResponse,
    Json,
};
use serde_json::json;
use crate::AppState;
use crate::models::report::ReportQuery;
use tracing::{info, warn, error};

// Get dashboard summary
async fn get_dashboard_summary(
    State(state): State<AppState>,
    Query(query): Query<ReportQuery>,
) -> impl IntoResponse {
    match state.report_service.get_dashboard_summary(&state.db).await {
        Ok(report) => {
            info!("Dashboard summary fetched successfully");
            Json(json!({
                "success": true,
                "message": "Dashboard summary fetched successfully",
                "data": {
                    "report": report
                }
            }))
        },
        Err(err) => {
            error!("Failed to fetch dashboard summary: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to fetch dashboard summary"
            }))
        }
    }
}

// Get profit and loss report
async fn get_profit_loss(
    State(state): State<AppState>,
    Query(query): Query<ReportQuery>,
) -> impl IntoResponse {
    if query.start.is_none() || query.end.is_none() {
        return Json(json!({
            "success": false,
            "message": "Start date and end date are required"
        }));
    }

    match state.report_service.get_profit_loss(&state.db, &query).await {
        Ok(reports) => {
            info!("Profit and loss report fetched successfully");
            Json(json!({
                "success": true,
                "message": "Profit and loss report fetched successfully",
                "data": {
                    "reports": reports
                }
            }))
        },
        Err(err) => {
            error!("Failed to fetch profit and loss report: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to fetch profit and loss report"
            }))
        }
    }
}

// Get returns report
async fn get_returns_report(
    State(state): State<AppState>,
    Query(query): Query<ReportQuery>,
) -> impl IntoResponse {
    match state.report_service.get_returns_report(&state.db, &query).await {
        Ok(returns_report) => {
            info!("Returns report fetched successfully");
            Json(json!({
                "success": true,
                "message": "Returns report fetched successfully",
                "data": {
                    "returnsReport": returns_report
                }
            }))
        },
        Err(err) => {
            error!("Failed to fetch returns report: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to fetch returns report"
            }))
        }
    }
}

// Get stocks report
async fn get_stocks_report(
    State(state): State<AppState>,
    Query(query): Query<ReportQuery>,
) -> impl IntoResponse {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(50);
    
    match state.report_service.get_stocks_report(&state.db).await {
        Ok(stocks_report) => {
            info!("Stocks report fetched successfully");
            Json(json!({
                "success": true,
                "message": "Stocks report fetched successfully",
                "data": {
                    "stocksReport": stocks_report
                }
            }))
        },
        Err(err) => {
            error!("Failed to fetch stocks report: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to fetch stocks report"
            }))
        }
    }
}

// Get sales analysis
async fn get_sales_analysis(
    State(state): State<AppState>,
    Query(query): Query<ReportQuery>,
) -> impl IntoResponse {
    match state.report_service.get_sales_analysis(&state.db, &query).await {
        Ok(sales_analysis) => {
            info!("Sales analysis report fetched successfully");
            Json(json!({
                "success": true,
                "message": "Sales analysis report fetched successfully",
                "data": {
                    "salesAnalysis": sales_analysis
                }
            }))
        },
        Err(err) => {
            error!("Failed to fetch sales analysis report: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to fetch sales analysis report"
            }))
        }
    }
}

// Get delegates report
async fn get_delegates_report(
    State(state): State<AppState>,
    Query(query): Query<ReportQuery>,
) -> impl IntoResponse {
    match state.report_service.get_delegates_report(&state.db, &query).await {
        Ok(delegates_report) => {
            info!("Delegates report fetched successfully");
            Json(json!({
                "success": true,
                "message": "Delegates report fetched successfully",
                "data": {
                    "delegatesReport": delegates_report
                }
            }))
        },
        Err(err) => {
            error!("Failed to fetch delegates report: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to fetch delegates report"
            }))
        }
    }
}

// Get customer report
async fn get_customer_report(
    State(state): State<AppState>,
    Query(query): Query<ReportQuery>,
) -> impl IntoResponse {
    match state.report_service.get_customers_report(&state.db, &query).await {
        Ok(customer_report) => {
            info!("Customer report fetched successfully");
            Json(json!({
                "success": true,
                "message": "Customer report fetched successfully",
                "data": {
                    "customerReport": customer_report
                }
            }))
        },
        Err(err) => {
            error!("Failed to fetch customer report: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to fetch customer report"
            }))
        }
    }
}

// Get supplier report
async fn get_supplier_report(
    State(state): State<AppState>,
    Query(query): Query<ReportQuery>,
) -> impl IntoResponse {
    match state.report_service.get_suppliers_report(&state.db, &query).await {
        Ok(supplier_report) => {
            info!("Supplier report fetched successfully");
            Json(json!({
                "success": true,
                "message": "Supplier report fetched successfully",
                "data": {
                    "supplierReport": supplier_report
                }
            }))
        },
        Err(err) => {
            error!("Failed to fetch supplier report: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to fetch supplier report"
            }))
        }
    }
}

// Get sales report
async fn get_sales_report(
    State(state): State<AppState>,
    Query(query): Query<ReportQuery>,
) -> impl IntoResponse {
    match state.report_service.get_sales_report(&state.db, &query).await {
        Ok(sales_report) => {
            info!("Sales report fetched successfully");
            Json(json!({
                "success": true,
                "message": "Sales report fetched successfully",
                "data": {
                    "salesReport": sales_report
                }
            }))
        },
        Err(err) => {
            error!("Failed to fetch sales report: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to fetch sales report"
            }))
        }
    }
}

// Get specific product report
async fn get_specific_product_report(
    State(state): State<AppState>,
    Query(query): Query<ReportQuery>,
) -> impl IntoResponse {
    if query.product_id.is_none() {
        return Json(json!({
            "success": false,
            "message": "Product ID is required"
        }));
    }

    match state.report_service.get_product_report(&state.db, query.product_id.unwrap() as i32, &query).await {
        Ok(product_report) => {
            info!("Product report fetched successfully");
            Json(json!({
                "success": true,
                "message": "Product report fetched successfully",
                "data": {
                    "productReport": product_report
                }
            }))
        },
        Err(err) => {
            error!("Failed to fetch product report: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to fetch product report"
            }))
        }
    }
}

// Get company report
async fn get_company_report(
    State(state): State<AppState>,
    Query(query): Query<ReportQuery>,
) -> impl IntoResponse {
    if query.company_id.is_none() {
        return Json(json!({
            "success": false,
            "message": "Company ID is required"
        }));
    }

    // match state.report_service.get_company_report(&state.db, query.company_id.unwrap(), &query).await {
    let placeholder_result: Result<serde_json::Value, anyhow::Error> = Ok(serde_json::json!({}));
    match placeholder_result {
        Ok(company_report) => {
            info!("Company report fetched successfully");
            Json(json!({
                "success": true,
                "message": "Company report fetched successfully",
                "data": {
                    "companyReport": company_report
                }
            }))
        },
        Err(err) => {
            error!("Failed to fetch company report: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to fetch company report"
            }))
        }
    }
}

// Get stock report
async fn get_stock_report(
    State(state): State<AppState>,
    Query(query): Query<ReportQuery>,
) -> impl IntoResponse {
    match state.report_service.get_stock_report(&state.db).await {
        Ok(stock_report) => {
            info!("Stock report fetched successfully");
            Json(json!({
                "success": true,
                "message": "Stock report fetched successfully",
                "data": {
                    "stockReport": stock_report
                }
            }))
        },
        Err(err) => {
            error!("Failed to fetch stock report: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to fetch stock report"
            }))
        }
    }
}

// Get debts report
async fn get_debts_report(
    State(state): State<AppState>,
    Query(query): Query<ReportQuery>,
) -> impl IntoResponse {
    match state.report_service.get_debts_report(&state.db, &query).await {
        Ok(debts_report) => {
            info!("Debts report fetched successfully");
            Json(json!({
                "success": true,
                "message": "Debts report fetched successfully",
                "data": {
                    "debtsReport": debts_report
                }
            }))
        },
        Err(err) => {
            error!("Failed to fetch debts report: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to fetch debts report"
            }))
        }
    }
}

// Get money box report
async fn get_money_box_report(
    State(state): State<AppState>,
    Query(query): Query<ReportQuery>,
) -> impl IntoResponse {
    match state.report_service.get_money_box_report(&state.db, &query).await {
        Ok(money_box_report) => {
            info!("Money box report fetched successfully");
            Json(json!({
                "success": true,
                "message": "Money box report fetched successfully",
                "data": {
                    "moneyBoxReport": money_box_report
                }
            }))
        },
        Err(err) => {
            error!("Failed to fetch money box report: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to fetch money box report"
            }))
        }
    }
}

// Get expenses report
async fn get_expenses_report(
    State(state): State<AppState>,
    Query(query): Query<ReportQuery>,
) -> impl IntoResponse {
    match state.report_service.get_expenses_report(&state.db, &query).await {
        Ok(expenses_report) => {
            info!("Expenses report fetched successfully");
            Json(json!({
                "success": true,
                "message": "Expenses report fetched successfully",
                "data": {
                    "expensesReport": expenses_report
                }
            }))
        },
        Err(err) => {
            error!("Failed to fetch expenses report: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to fetch expenses report"
            }))
        }
    }
}

// Get customer debts detailed report
async fn get_customer_debts_detailed_report(
    State(state): State<AppState>,
    Query(query): Query<ReportQuery>,
) -> impl IntoResponse {
    match state.report_service.get_customer_debts_report(&state.db, &query).await {
        Ok(customer_debts_report) => {
            info!("Customer debts detailed report fetched successfully");
            Json(json!({
                "success": true,
                "message": "Customer debts detailed report fetched successfully",
                "data": {
                    "customerDebtsReport": customer_debts_report
                }
            }))
        },
        Err(err) => {
            error!("Failed to fetch customer debts detailed report: {}", err);
            Json(json!({
                "success": false,
                "message": "Failed to fetch customer debts detailed report"
            }))
        }
    }
}

pub fn reports_routes() -> Router<AppState> {
    Router::new()
        .route("/api/reports/dashboard", get(get_dashboard_summary))
        .route("/api/reports/profit-loss", get(get_profit_loss))
        .route("/api/reports/returns", get(get_returns_report))
        .route("/api/reports/stocks", get(get_stocks_report))
        .route("/api/reports/sales-analysis", get(get_sales_analysis))
        .route("/api/reports/delegates", get(get_delegates_report))
        .route("/api/reports/customers", get(get_customer_report))
        .route("/api/reports/suppliers", get(get_supplier_report))
        .route("/api/reports/sales", get(get_sales_report))
        .route("/api/reports/product/:product_id", get(get_specific_product_report))
        .route("/api/reports/company/:company_id", get(get_company_report))
        .route("/api/reports/stock", get(get_stock_report))
        .route("/api/reports/debts", get(get_debts_report))
        .route("/api/reports/money-box", get(get_money_box_report))
        .route("/api/reports/expenses", get(get_expenses_report))
        .route("/api/reports/customer-debts", get(get_customer_debts_detailed_report))
}