# hub-gold-axum

Secondary Rust dialect fixture: **Axum** `.route(path, get|post|…(|| async { … }))`
closures + `Json(serde_json::json!(…))` + `(StatusCode::*, Json(…))` + `Path` / `Query`.

- Same 20-route express-depth API surface as `hub-flagship-rust` (Actix remains D6448-ST).
- Prove hole-free lift: `pnpm run hub:axum-smoke`
- No invented product UI (**D6447**).

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| Named `get(handler)` without inline closure | `hub-rust:handler-body` |
| `Router::merge` / nested `nest` / middleware layers | not lowered |
| Extractors beyond Path/Query used in peels (State, Extension, TypedHeader) | not lowered |
| Non-literal path templates | not lowered |
