use axum::{
    extract::{Path, Query},
    http::StatusCode,
    response::Json,
    routing::{delete, get, patch, post, put},
    Router,
};
use std::collections::HashMap;

// hub-gold-axum — 20-route Axum dialect (secondary to Actix hub-flagship-rust ST).
// Mirrors hub-flagship-express depth; `.route` + get|post|… closures (D6447).
// JSON uses serde_json::json! (same peel as Actix flagship).

pub fn app() -> Router {
    Router::new()
        .route("/health", get(|| async { true }))
        .route("/ping", get(|| async { 42 }))
        .route("/version", get(|| async { 1 }))
        .route("/ready", get(|| async { "ok" }))
        .route("/count", get(|| async { 3 }))
        .route("/flag", get(|| async { "chrysalis" }))
        .route("/build", get(|| async { 2026 }))
        .route("/tier", get(|| async { "gold" }))
        .route(
            "/meta",
            get(|| async {
                Json(serde_json::json!({"service": "hub-gold-axum", "version": 1}))
            }),
        )
        .route(
            "/echo",
            post(|| async { Json(serde_json::json!({"echo": true})) }),
        )
        .route("/items", get(|| async { true }))
        .route(
            "/items/{id}",
            get(|Path(id): Path<String>| async move {
                Json(serde_json::json!({"id": id}))
            }),
        )
        .route(
            "/items",
            post(|| async {
                (StatusCode::CREATED, Json(serde_json::json!({"created": true})))
            }),
        )
        .route(
            "/search",
            get(|Query(query): Query<HashMap<String, String>>| async move {
                let q = query.get("q").cloned().unwrap_or_else(|| "".to_string());
                Json(serde_json::json!({"q": q}))
            }),
        )
        .route(
            "/items/{id}",
            put(|Path(id): Path<String>| async move {
                Json(serde_json::json!({"updated": true, "id": id}))
            }),
        )
        .route(
            "/items/{id}",
            delete(|Path(_id): Path<String>| async move { true }),
        )
        .route(
            "/items/{id}",
            patch(|Path(id): Path<String>| async move {
                Json(serde_json::json!({"patched": true, "id": id}))
            }),
        )
        .route(
            "/users/{userId}",
            get(|Path(userId): Path<String>| async move { userId }),
        )
        .route("/stats", get(|| async { 3 }))
        .route(
            "/notify",
            post(|| async {
                (StatusCode::ACCEPTED, Json(serde_json::json!({"ok": true})))
            }),
        )
}
