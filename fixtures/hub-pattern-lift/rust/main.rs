use actix_web::{get, post, web, App, HttpServer, Responder};

#[get("/health")]
async fn health() -> impl Responder {
    "ok"
}

#[post("/items")]
async fn items() -> impl Responder {
    "created"
}

#[actix_web::main]
async fn main() {
    HttpServer::new(|| App::new().service(health).service(items))
        .bind(("127.0.0.1", 8080))
        .unwrap()
        .run()
        .await
        .unwrap();
}
