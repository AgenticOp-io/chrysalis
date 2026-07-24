# hub-gold-rocket

Secondary Rust dialect fixture: **Rocket** `#[get("/path")]` / `#[post("/path")]`
+ `.mount("/items", routes![…])` + `Json(serde_json::json!(…))` + `(Status::*, Json(…))`
+ `<id>` path segments + `?<q>` query segments.

- Same 20-route express-depth API surface as `hub-flagship-rust` (Actix remains D6448-ST).
- Prove hole-free lift: `pnpm run hub:rocket-smoke`
- No invented fairings/auth (**D6447**).

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| Fairings / catchers / custom guards | not lowered |
| `FromForm` / multipart / cookie extractors | not lowered |
| State / managed config beyond route handlers | not lowered |
| Non-literal path templates | not lowered |
| `routes!` without matching `.mount` prefix | not lowered |
