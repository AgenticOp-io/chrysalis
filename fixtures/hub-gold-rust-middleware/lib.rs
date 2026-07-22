use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder};

#[get("/ready")]
async fn ready() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({"ready": true}))
}

#[post("/echo")]
async fn echo() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({"ok": true}))
}

#[actix_web::main]
async fn main() {
    HttpServer::new(|| App::new().service(ready).service(echo))
        .bind(("127.0.0.1", 8080))
        .unwrap()
        .run()
        .await
        .unwrap();
}
