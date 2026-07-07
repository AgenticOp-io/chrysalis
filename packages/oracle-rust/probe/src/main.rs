mod routes;

use actix_web::{http::Method, test, App};
use serde_json::{json, Value};
use std::env;
use std::fs;
use std::path::PathBuf;

#[actix_web::main]
async fn main() {
    match run().await {
        Ok(()) => {}
        Err(msg) => {
            println!("{}", json!({ "ok": false, "error": msg }));
            std::process::exit(1);
        }
    }
}

async fn run() -> Result<(), String> {
    let fixture = PathBuf::from(env::args().nth(1).ok_or("missing-fixture")?);
    let spec_raw = fs::read_to_string(fixture.join("chrysalis.oracle-probe-routes.json"))
        .map_err(|_| "missing-probe-routes".to_string())?;
    let spec: Value =
        serde_json::from_str(&spec_raw).map_err(|_| "invalid-probe-routes".to_string())?;
    let routes = spec
        .get("routes")
        .and_then(|v| v.as_array())
        .ok_or("invalid-probe-routes".to_string())?;

    let app = test::init_service(App::new().configure(routes::configure)).await;
    let mut results = Vec::new();

    for route in routes {
        let method_s = route
            .get("method")
            .and_then(|v| v.as_str())
            .unwrap_or("GET")
            .to_uppercase();
        let path = route.get("path").and_then(|v| v.as_str()).unwrap_or("/");
        let method = match method_s.as_str() {
            "GET" => Method::GET,
            "POST" => Method::POST,
            "PUT" => Method::PUT,
            "PATCH" => Method::PATCH,
            "DELETE" => Method::DELETE,
            "HEAD" => Method::HEAD,
            _ => Method::GET,
        };
        let req = test::TestRequest::default()
            .method(method)
            .uri(path)
            .to_request();
        let resp = test::call_service(&app, req).await;
        let status = resp.status().as_u16();
        let mut headers = serde_json::Map::new();
        if let Some(ct) = resp.headers().get("content-type") {
            if let Ok(s) = ct.to_str() {
                headers.insert("Content-Type".to_string(), json!(s));
            }
        }
        let body_bytes = test::read_body(resp).await;
        let body = String::from_utf8_lossy(&body_bytes).into_owned();
        results.push(json!({
            "method": method_s,
            "path": path,
            "status": status,
            "body": body,
            "headers": headers,
        }));
    }

    println!(
        "{}",
        json!({
            "ok": true,
            "results": results,
            "routeCount": results.len(),
        })
    );
    Ok(())
}
