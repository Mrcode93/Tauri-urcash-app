use axum::{
    extract::{Request, State},
    http::{header::AUTHORIZATION, StatusCode},
    middleware::Next,
    response::Response,
};
use crate::AppState;
use crate::models::user::User;
use crate::services::auth_service::Claims;
use anyhow::Result;
use tracing::{info, warn};

pub async fn auth_middleware(
    State(state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // Extract token from Authorization header
    let auth_header = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|auth_header| auth_header.to_str().ok())
        .and_then(|auth_str| {
            if auth_str.starts_with("Bearer ") {
                Some(auth_str[7..].to_string())
            } else {
                None
            }
        });

    let token = match auth_header {
        Some(token) => token,
        None => {
            warn!("No authorization header found");
            return Err(StatusCode::UNAUTHORIZED);
        }
    };

    // Verify token and get user
    let claims = match state.auth_service.verify_token(&token) {
        Ok(claims) => claims,
        Err(e) => {
            warn!("Token verification failed: {}", e);
            return Err(StatusCode::UNAUTHORIZED);
        }
    };

    // Get user from database
    let user = match state.auth_service.get_user_from_token(&state.db, &token).await {
        Ok(user) => user,
        Err(e) => {
            warn!("Error getting user from token: {}", e);
            return Err(StatusCode::UNAUTHORIZED);
        }
    };

    // Check if user is active
    if user.is_active != 1 {
        warn!("Inactive user attempted to access protected route: {}", user.username);
        return Err(StatusCode::FORBIDDEN);
    }

    // Add user and claims to request extensions
    request.extensions_mut().insert(user.clone());
    request.extensions_mut().insert(claims);

    info!("User {} authenticated successfully", user.username);
    Ok(next.run(request).await)
}

pub async fn admin_middleware(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // First run auth middleware
    let response = auth_middleware(State(state), request, next).await?;
    
    // Check if user is admin
    if let Some(user) = response.extensions().get::<User>() {
        if !user.is_admin() {
            warn!("Non-admin user attempted to access admin route: {}", user.username);
            return Err(StatusCode::FORBIDDEN);
        }
    }

    Ok(response)
}

pub async fn manager_middleware(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // First run auth middleware
    let response = auth_middleware(State(state), request, next).await?;
    
    // Check if user is admin or manager
    if let Some(user) = response.extensions().get::<User>() {
        if !user.can_manage_users() {
            warn!("User without manager privileges attempted to access manager route: {}", user.username);
            return Err(StatusCode::FORBIDDEN);
        }
    }

    Ok(response)
}

// Helper function to extract user from request extensions
pub fn get_current_user(request: &Request) -> Option<&User> {
    request.extensions().get::<User>()
}

// Helper function to extract claims from request extensions
pub fn get_current_claims(request: &Request) -> Option<&Claims> {
    request.extensions().get::<Claims>()
}
