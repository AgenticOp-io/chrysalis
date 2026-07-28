# hub-gold-salvo

Secondary Rust dialect fixture: **Salvo** flat
`Router::with_path("…").get|post|…(handler)` + `.push` children +
`{id}` path templates + `req.param` / `req.query` + `Json(serde_json::json!(…))`
+ `res.status_code(StatusCode::*)`.

- Same 20-route express-depth API surface as `hub-flagship-rust` (Actix remains D6448-ST).
- Prove hole-free lift: `pnpm run hub:salvo-smoke`
- No invented product UI / hoop middleware / OpenAPI (**D6447**).
- Note: Salvo `get` takes a handler only (not `get("/path", handler)`); path comes from `with_path` / `.path`.

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| Nested `.push(Router::with_path("{id}"))` path join | not lowered (use flat `items/{id}`) |
| Hoop middleware / `Router::hoop` | not lowered |
| OpenAPI / oapi invent | not lowered (**D6447**) |
| Non-literal path templates | not lowered |
| Depot / extractors beyond `param`/`query` | not lowered |
