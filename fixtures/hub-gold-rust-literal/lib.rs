use actix_web::{get, web, App, HttpResponse, HttpServer, Responder};

#[get("/health")]
async fn health() -> impl Responder {
    "ok"
}

#[get("/ping")]
async fn ping() -> impl Responder {
    "pong"
}

#[actix_web::main]
async fn main() {
    HttpServer::new(|| App::new().service(health).service(ping))
        .bind(("127.0.0.1", 8080))
        .unwrap()
        .run()
        .await
        .unwrap();
}
