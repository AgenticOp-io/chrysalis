use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder};

#[get("/health")]
async fn health() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({"ok": true}))
}

#[get("/meta")]
async fn meta() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({"service": "hub-gold-rust-structured", "version": 1}))
}

#[actix_web::main]
async fn main() {
    HttpServer::new(|| App::new().service(health).service(meta))
        .bind(("127.0.0.1", 8080))
        .unwrap()
        .run()
        .await
        .unwrap();
}
