# hub-gold-axum

Secondary Rust dialect fixture: **Axum** named `.route(path, get|post|…(handler))`
+ `.nest("/items", item_routes())` + `Json(serde_json::json!(…))` + `(StatusCode::*, Json(…))`
+ `Path` / `Query`.

- Same 20-route express-depth API surface as `hub-flagship-rust` (Actix remains D6448-ST).
- Prove hole-free lift: `pnpm run hub:axum-smoke`
- No invented product UI (**D6447**).

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| Inline nest `Router::new()` (unnamed) as nest/merge target | not lowered (use named `fn …() -> Router`) |
| Middleware layers / towers | not lowered |
| Extractors beyond Path/Query used in peels (State, Extension, TypedHeader) | not lowered |
| Non-literal path templates | not lowered |
