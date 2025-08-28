use axum::{
    extract::{State, Json},
    http::{StatusCode, HeaderMap},
    response::IntoResponse,
    routing::{post, get},
    Router,
};
use crate::{
    models::{user::*, ApiResponse},
    AppState,
};
use serde_json::{self, json};
use tracing::{info, error};

pub async fn login_handler(
    State(state): State<AppState>,
    Json(request): Json<LoginRequest>,
) -> impl IntoResponse {
    let username = request.username.clone();
    info!("Login attempt for user: {}", username);

    match state.auth_service.login(&state.db, request).await {
        Ok(response) => {
            info!("تم تسجيل الدخول بنجاح للمستخدم: {}", username);
            (StatusCode::OK, Json(response))
        }
        Err(e) => {
            error!("فشل تسجيل الدخول للمستخدم {}: {}", username, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<AuthResponse>::error("خطأ في الخادم".to_string())),
            )
        }
    }
}

pub async fn register_handler(
    State(state): State<AppState>,
    Json(request): Json<RegisterRequest>,
) -> impl IntoResponse {
    let username = request.username.clone();
    info!("تسجيل محاولة للمستخدم: {}", username);

    match state.auth_service.register(&state.db, request).await {
        Ok(response) => {
            info!("تم تسجيل المستخدم بنجاح: {}", username);
            (StatusCode::CREATED, Json(response))
        }
        Err(e) => {
            error!("فشل تسجيل المستخدم {}: {}", username, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<AuthResponse>::error("خطأ في الخادم".to_string())),
            )
        }
    }
}

pub async fn profile_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let auth_header = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    let token = match auth_header {
        Some(token) => token,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::<UserResponse>::error("لا يوجد رمز توثيق".to_string())),
            );
        }
    };

    match state.auth_service.get_user_from_token(&state.db, token).await {
        Ok(user) => {
            let user_response: UserResponse = user.into();
            (StatusCode::OK, Json(ApiResponse::success(user_response)))
        }
        Err(e) => {
            error!("فشل استرجاع الملف الشخصي: {}", e);
            (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::<UserResponse>::error("رمز توثيق غير صالح".to_string())),
            )
        }
    }
}

// Get current user handler
pub async fn get_current_user_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    // Extract token from headers
    let auth_header = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    let token = match auth_header {
        Some(token) => token,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::<User>::error("لا يوجد رمز توثيق".to_string())),
            )
        }
    };

    match state.auth_service.get_user_from_token(&state.db, token).await {
        Ok(user) => {
            info!("تم استرجاع المستخدم الحالي: {}", user.username);
            (StatusCode::OK, Json(ApiResponse::success(user)))
        }
        Err(e) => {
            error!("فشل استرجاع المستخدم الحالي: {}", e);
            (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::<User>::error("رمز توثيق غير صالح".to_string())),
            )
        }
    }
}

// Get user permissions handler  
pub async fn get_user_permissions_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    // Extract user ID from JWT token
    let auth_header = headers.get("Authorization");
    match auth_header {
        Some(auth_value) => {
            match auth_value.to_str() {
                Ok(auth_str) => {
                    match auth_str.strip_prefix("Bearer ") {
                        Some(token) => {
                            match state.auth_service.verify_token(token) {
                                Ok(claims) => {
                                    match claims.get_user_id() {
                                        Ok(user_id) => {
                                            // Get user permissions with details
                                            match state.permissions_service.get_user_permissions_with_details(&state.db, user_id).await {
                                                Ok(permissions) => {
                                                    info!("تم استرجاع صلاحيات المستخدم: {}", user_id);
                                                    (StatusCode::OK, Json(ApiResponse::success(permissions)))
                                                }
                                                Err(err) => {
                                                    error!("فشل استرجاع صلاحيات المستخدم: {}", err);
                                                    (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::error("فشل استرجاع صلاحيات".to_string())))
                                                }
                                            }
                                        }
                                        Err(err) => {
                                            tracing::error!("رمز توثيق غير صالح: {}", err);
                                            (StatusCode::BAD_REQUEST, Json(ApiResponse::error("رمز توثيق غير صالح".to_string())))
                                        }
                                    }
                                }
                                Err(_) => {
                                    (StatusCode::UNAUTHORIZED, Json(ApiResponse::error("رمز توثيق غير صالح".to_string())))
                                }
                            }
                        }
                        None => {
                            (StatusCode::UNAUTHORIZED, Json(ApiResponse::error("رمز توثيق غير صالح".to_string())))
                        }
                    }
                }
                Err(_) => {
                    (StatusCode::UNAUTHORIZED, Json(ApiResponse::error("رمز توثيق غير صالح".to_string())))
                }
            }
        }
        None => {
            (StatusCode::UNAUTHORIZED, Json(ApiResponse::error("التوثيق مطلوب".to_string())))
        }
    }
}

// Get permissions grouped by category handler
pub async fn get_permissions_grouped_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    // Extract token from headers
    let auth_header = headers.get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    let token = match auth_header {
        Some(token) => token,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::<serde_json::Value>::error("لا يوجد رمز توثيق".to_string())),
            );
        }
    };

    // Verify token and check if user is admin
    match state.auth_service.get_user_from_token(&state.db, token).await {
        Ok(user) => {
            if user.role.as_deref() != Some("admin") {
                return (
                    StatusCode::FORBIDDEN,
                    Json(ApiResponse::<serde_json::Value>::error("الوصول المسموح للمدير".to_string())),
                );
            }

            match state.permissions_service.get_all_permissions(&state.db).await {
                Ok(permissions) => {
                    // Group permissions by category
                    let mut grouped: std::collections::HashMap<String, Vec<serde_json::Value>> = std::collections::HashMap::new();
                    
                    for permission in permissions {
                        let category = permission.category.clone();
                        let permission_json = serde_json::json!({
                            "id": permission.id,
                            "permission_id": permission.permission_id,
                            "name": permission.name,
                            "description": permission.description,
                            "category": permission.category,
                            "is_active": permission.is_active,
                            "created_at": permission.created_at,
                            "updated_at": permission.updated_at
                        });
                        
                        grouped.entry(category).or_insert_with(Vec::new).push(permission_json);
                    }
                    
                    info!("تم استرجاع صلاحيات المستخدم بنجاح");
                    (StatusCode::OK, Json(ApiResponse::success(serde_json::to_value(grouped).unwrap())))
                }
                Err(e) => {
                    error!("فشل استرجاع صلاحيات المستخدم: {}", e);
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ApiResponse::<serde_json::Value>::error("فشل استرجاع صلاحيات".to_string())),
                    )
                }
            }
        }
        Err(e) => {
            error!("فشل التحقق من رمز التوثيق: {}", e);
            (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::<serde_json::Value>::error("رمز توثيق غير صالح".to_string())),
            )
        }
    }
}

// Logout handler
pub async fn logout_handler() -> impl IntoResponse {
    // Since we're using stateless JWTs, logout is handled client-side
    // Just return success
    (StatusCode::OK, Json(ApiResponse::success("تم تسجيل الخروج بنجاح")))
}

pub fn auth_routes() -> Router<AppState> {
    Router::new()
        .route("/api/auth/login", post(login_handler))
        .route("/api/auth/register", post(register_handler))
        .route("/api/auth/profile", get(profile_handler))
        .route("/api/auth/user", get(get_current_user_handler))
        .route("/api/auth/user/permissions", get(get_user_permissions_handler))
        .route("/api/auth/permissions/grouped", get(get_permissions_grouped_handler))
        .route("/api/auth/logout", get(logout_handler))
}


