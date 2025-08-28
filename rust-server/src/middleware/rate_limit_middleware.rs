use axum::{
    extract::{Request, ConnectInfo},
    middleware::Next,
    response::Response,
    Json,
};
use serde_json::json;
use std::{
    collections::HashMap,
    net::SocketAddr,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};
use tower::{Layer, Service};

#[derive(Clone)]
pub struct RateLimitLayer {
    max_requests: u32,
    window_duration: Duration,
    limiter: Arc<Mutex<RateLimiter>>,
}

impl RateLimitLayer {
    pub fn new(max_requests: u32, window_duration: Duration) -> Self {
        Self {
            max_requests,
            window_duration,
            limiter: Arc::new(Mutex::new(RateLimiter::new())),
        }
    }
}

impl<S> Layer<S> for RateLimitLayer {
    type Service = RateLimitService<S>;

    fn layer(&self, service: S) -> Self::Service {
        RateLimitService {
            inner: service,
            limiter: self.limiter.clone(),
            max_requests: self.max_requests,
            window_duration: self.window_duration,
        }
    }
}

#[derive(Clone)]
pub struct RateLimitService<S> {
    inner: S,
    limiter: Arc<Mutex<RateLimiter>>,
    max_requests: u32,
    window_duration: Duration,
}

impl<S> Service<Request> for RateLimitService<S>
where
    S: Service<Request<axum::body::Body>, Response = Response> + Clone + Send + 'static,
    S::Future: Send + 'static,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = futures::future::BoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn poll_ready(
        &mut self,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, request: Request) -> Self::Future {
        let limiter = self.limiter.clone();
        let max_requests = self.max_requests;
        let window_duration = self.window_duration;
        let mut inner = self.inner.clone();

        Box::pin(async move {
            // Get IP address from ConnectInfo extension
            let ip = request
                .extensions()
                .get::<ConnectInfo<SocketAddr>>()
                .map(|info| info.0.ip())
                .unwrap_or_else(|| std::net::IpAddr::V4(std::net::Ipv4Addr::LOCALHOST));

            // Check rate limit
            let is_allowed = {
                let mut limiter = limiter.lock().unwrap();
                limiter.check_rate_limit(ip, max_requests, window_duration)
            };

            if !is_allowed {
                // Return rate limit error
                let error_response = Json(json!({
                    "error": "Too many requests from this IP, please try again later.",
                    "retryAfter": "15 minutes"
                }));
                
                let response = Response::builder()
                    .status(429)
                    .header("Content-Type", "application/json")
                    .body(axum::body::Body::from(serde_json::to_vec(&error_response.0).unwrap()))
                    .unwrap();
                    
                return Ok(response);
            }

            // Continue with the request
            inner.call(request).await
        })
    }
}

#[derive(Default)]
struct RateLimiter {
    clients: HashMap<std::net::IpAddr, ClientInfo>,
}

#[derive(Debug)]
struct ClientInfo {
    request_count: u32,
    window_start: Instant,
}

impl RateLimiter {
    fn new() -> Self {
        Self {
            clients: HashMap::new(),
        }
    }

    fn check_rate_limit(
        &mut self,
        ip: std::net::IpAddr,
        max_requests: u32,
        window_duration: Duration,
    ) -> bool {
        let now = Instant::now();
        
        let client_info = self.clients.entry(ip).or_insert_with(|| ClientInfo {
            request_count: 0,
            window_start: now,
        });

        // Reset window if expired
        if now.duration_since(client_info.window_start) >= window_duration {
            client_info.request_count = 0;
            client_info.window_start = now;
        }

        // Check if limit exceeded
        if client_info.request_count >= max_requests {
            return false;
        }

        // Increment counter
        client_info.request_count += 1;
        true
    }

    // Clean up old entries periodically
    fn cleanup(&mut self, window_duration: Duration) {
        let now = Instant::now();
        self.clients.retain(|_, client_info| {
            now.duration_since(client_info.window_start) < window_duration * 2
        });
    }
}
