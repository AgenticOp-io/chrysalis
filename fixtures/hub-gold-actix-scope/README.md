# hub-gold-actix-scope

Actix Web **scope nest deepen** (G10068 / D6530): literal `web::scope("/prefix")`
+ `.service(handler)` / `.route("…", web::METHOD().to(handler))` path join.
Relative `#[get("")]` / `#[get("/{id}")]` macros under scope; absolute macros for
the rest of the 20-route express-depth surface.

- Flagship `hub-flagship-rust` stays flat (D6448-ST unchanged).
- Prove hole-free lift: `pnpm run hub:actix-scope-smoke`
- No invented guards / middleware / product UI (**D6447**).

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| Nested `web::scope` inside scope | not lowered |
| `.guard(…)` / auth middleware on scope | not lowered (**D6447**) |
| `web::resource("…").route(…)` under scope | not lowered (prefer `.service` / `.route`) |
| Non-literal scope / route path templates | not lowered |
| Cross-file configure helpers for scope | not lowered |
