use axum::{
    extract::{Path, Query, State},
    http::{StatusCode, HeaderMap},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use tracing::{info, error};
use crate::{
    models::{ApiResponse, PaginatedResponse, User, UserResponse, UpdateUserRequest},
    services::AuthService,
    AppState,
};

#[derive(Deserialize)]
pub struct GetUsersQuery {
    pub role: Option<String>,
}

pub fn user_routes() -> axum::Router<AppState> {
    axum::Router::new()
        .route("/api/users", axum::routing::get(get_users))
        .route("/api/users/:id", axum::routing::get(get_user))
        .route("/api/users/:id", axum::routing::put(update_user))
        .route("/api/users/:id", axum::routing::delete(delete_user))
        .route("/api/users/:id/permissions", axum::routing::get(get_user_permissions))
        .route("/api/users/profile", axum::routing::get(get_profile))
        .route("/api/users/profile", axum::routing::put(update_profile))
}

// Get all users (admin only)
pub async fn get_users(
    State(state): State<AppState>,
    Query(query): Query<GetUsersQuery>,
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
                Json(ApiResponse::<Vec<UserResponse>>::error("No token provided".to_string())),
            );
        }
    };

    // Verify token and check if user is admin
    match state.auth_service.get_user_from_token(&state.db, token).await {
        Ok(user) => {
            if user.role.as_deref() != Some("admin") {
                return (
                    StatusCode::FORBIDDEN,
                    Json(ApiResponse::<Vec<UserResponse>>::error("Admin access required".to_string())),
                );
            }

            match state.auth_service.get_all_users(&state.db, query.role.as_deref()).await {
                Ok(users) => {
                    let user_responses: Vec<UserResponse> = users.into_iter().map(|u| u.into()).collect();
                    (StatusCode::OK, Json(ApiResponse::success(user_responses)))
                }
                Err(e) => {
                    error!("Failed to get users: {}", e);
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ApiResponse::<Vec<UserResponse>>::error("Failed to get users".to_string())),
                    )
                }
            }
        }
        Err(e) => {
            error!("Token verification failed: {}", e);
            (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::<Vec<UserResponse>>::error("Invalid token".to_string())),
            )
        }
    }
}

// Get user by ID
pub async fn get_user(
    State(state): State<AppState>,
    Path(user_id): Path<i64>,
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
                Json(ApiResponse::<UserResponse>::error("No token provided".to_string())),
            );
        }
    };

    // Verify token and check permissions
    match state.auth_service.get_user_from_token(&state.db, token).await {
        Ok(current_user) => {
            // Users can only access their own profile unless they're admin
            if current_user.role.as_deref() != Some("admin") && current_user.id.unwrap_or(0) != user_id {
                return (
                    StatusCode::FORBIDDEN,
                    Json(ApiResponse::<UserResponse>::error("Access denied".to_string())),
                );
            }

            match state.auth_service.get_user_by_id(&state.db, user_id).await {
                Ok(Some(user)) => {
                    let user_response: UserResponse = user.into();
                    (StatusCode::OK, Json(ApiResponse::success(user_response)))
                }
                Ok(None) => {
                    (StatusCode::NOT_FOUND, Json(ApiResponse::<UserResponse>::error("User not found".to_string())))
                }
                Err(e) => {
                    error!("Failed to get user: {}", e);
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ApiResponse::<UserResponse>::error("Failed to get user".to_string())),
                    )
                }
            }
        }
        Err(e) => {
            error!("Token verification failed: {}", e);
            (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::<UserResponse>::error("Invalid token".to_string())),
            )
        }
    }
}

// Update user
pub async fn update_user(
    State(state): State<AppState>,
    Path(user_id): Path<i64>,
    headers: HeaderMap,
    Json(request): Json<UpdateUserRequest>,
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
                Json(ApiResponse::<UserResponse>::error("No token provided".to_string())),
            );
        }
    };

    // Verify token and check permissions
    match state.auth_service.get_user_from_token(&state.db, token).await {
        Ok(current_user) => {
            // Users can only update their own profile unless they're admin
            if current_user.role.as_deref() != Some("admin") && current_user.id.unwrap_or(0) != user_id {
                return (
                    StatusCode::FORBIDDEN,
                    Json(ApiResponse::<UserResponse>::error("Access denied".to_string())),
                );
            }

            match state.auth_service.update_user(&state.db, user_id, request).await {
                Ok(Some(user)) => {
                    let user_response: UserResponse = user.into();
                    (StatusCode::OK, Json(ApiResponse::success(user_response)))
                }
                Ok(None) => {
                    (StatusCode::NOT_FOUND, Json(ApiResponse::<UserResponse>::error("User not found".to_string())))
                }
                Err(e) => {
                    error!("Failed to update user: {}", e);
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ApiResponse::<UserResponse>::error("Failed to update user".to_string())),
                    )
                }
            }
        }
        Err(e) => {
            error!("Token verification failed: {}", e);
            (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::<UserResponse>::error("Invalid token".to_string())),
            )
        }
    }
}

// Delete user
pub async fn delete_user(
    State(state): State<AppState>,
    Path(user_id): Path<i64>,
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
                Json(ApiResponse::<()>::error("No token provided".to_string())),
            );
        }
    };

    // Verify token and check if user is admin
    match state.auth_service.get_user_from_token(&state.db, token).await {
        Ok(current_user) => {
            if current_user.role.as_deref() != Some("admin") {
                return (
                    StatusCode::FORBIDDEN,
                    Json(ApiResponse::<()>::error("Admin access required".to_string())),
                );
            }

            // Prevent deleting the admin user
            if user_id == 1 {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(ApiResponse::<()>::error("Cannot delete admin user".to_string())),
                );
            }

            match state.auth_service.delete_user(&state.db, user_id).await {
                Ok(true) => {
                    (StatusCode::OK, Json(ApiResponse::success(())))
                }
                Ok(false) => {
                    (StatusCode::NOT_FOUND, Json(ApiResponse::<()>::error("User not found".to_string())))
                }
                Err(e) => {
                    error!("Failed to delete user: {}", e);
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ApiResponse::<()>::error("Failed to delete user".to_string())),
                    )
                }
            }
        }
        Err(e) => {
            error!("Token verification failed: {}", e);
            (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::<()>::error("Invalid token".to_string())),
            )
        }
    }
}

// Get current user profile
pub async fn get_profile(
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
                Json(ApiResponse::<UserResponse>::error("No token provided".to_string())),
            );
        }
    };

    match state.auth_service.get_user_from_token(&state.db, token).await {
        Ok(user) => {
            let user_response: UserResponse = user.into();
            (StatusCode::OK, Json(ApiResponse::success(user_response)))
        }
        Err(e) => {
            error!("Token verification failed: {}", e);
            (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::<UserResponse>::error("Invalid token".to_string())),
            )
        }
    }
}

// Get user permissions by user ID
pub async fn get_user_permissions(
    State(state): State<AppState>,
    Path(user_id): Path<i64>,
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
                Json(ApiResponse::<serde_json::Value>::error("No token provided".to_string())),
            );
        }
    };

    // Verify token and check if user is admin
    match state.auth_service.get_user_from_token(&state.db, token).await {
        Ok(current_user) => {
            if current_user.role.as_deref() != Some("admin") {
                return (
                    StatusCode::FORBIDDEN,
                    Json(ApiResponse::<serde_json::Value>::error("Admin access required".to_string())),
                );
            }

            match state.permissions_service.get_user_permissions_with_details(&state.db, user_id).await {
                Ok(permissions) => {
                    info!("User permissions retrieved for user ID: {}", user_id);
                    (StatusCode::OK, Json(ApiResponse::success(serde_json::to_value(permissions).unwrap())))
                }
                Err(e) => {
                    error!("Failed to get user permissions: {}", e);
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ApiResponse::<serde_json::Value>::error("Failed to get user permissions".to_string())),
                    )
                }
            }
        }
        Err(e) => {
            error!("Token verification failed: {}", e);
            (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::<serde_json::Value>::error("Invalid token".to_string())),
            )
        }
    }
}

// Update current user profile
pub async fn update_profile(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<UpdateUserRequest>,
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
                Json(ApiResponse::<UserResponse>::error("No token provided".to_string())),
            );
        }
    };

    match state.auth_service.get_user_from_token(&state.db, token).await {
        Ok(current_user) => {
            let user_id = current_user.id.unwrap_or(0);
            match state.auth_service.update_user(&state.db, user_id, request).await {
                Ok(Some(user)) => {
                    let user_response: UserResponse = user.into();
                    (StatusCode::OK, Json(ApiResponse::success(user_response)))
                }
                Ok(None) => {
                    (StatusCode::NOT_FOUND, Json(ApiResponse::<UserResponse>::error("User not found".to_string())))
                }
                Err(e) => {
                    error!("Failed to update profile: {}", e);
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ApiResponse::<UserResponse>::error("Failed to update profile".to_string())),
                    )
                }
            }
        }
        Err(e) => {
            error!("Token verification failed: {}", e);
            (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::<UserResponse>::error("Invalid token".to_string())),
            )
        }
    }
}
