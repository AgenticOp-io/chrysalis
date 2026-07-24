# hub-gold-poem

Secondary Rust dialect fixture: **Poem** named `.at(path, get|post|…(handler))`
+ `.nest("/items", item_routes())` + `Json(serde_json::json!(…))` + `(StatusCode::*, Json(…))`
+ `Path` / `Query` (`:id` path templates).

- Same 20-route express-depth API surface as `hub-flagship-rust` (Actix remains D6448-ST).
- Prove hole-free lift: `pnpm run hub:poem-smoke`
- No invented product UI / middleware / OpenAPI (**D6447**).

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| Inline nest `Route::new()` (unnamed) as nest target | not lowered (use named `fn …() -> Route`) |
| Middleware / `.with(…)` layers | not lowered |
| poem-openapi / OpenAPI invent | not lowered (**D6447**) |
| Extractors beyond Path/Query used in peels | not lowered |
| Chained `get(a).post(b)` on one `.at` | not lowered (use one method per `.at`) |
| Non-literal path templates | not lowered |
