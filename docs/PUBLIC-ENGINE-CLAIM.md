# Public engine claim (trust fix)

> agenticop.io promises an **Apache-2.0** Chrysalis engine. Until the GitHub remote is public, that claim is incomplete.  
> This checklist closes the **trust gap** without inventing a second product.

**Not legal advice.** Coordinate with counsel before flipping visibility.

## Why it matters

The Cursor Pilot Kit only works for buyers if they can **clone and run** without a private invite. Private + “open source” on the marketing site is a brand integrity failure.

## Checklist (before `gh repo edit --visibility public`)

Use [`../commercial/chrysalis-private-pack/07-oss-scrub-checklist.md`](../../commercial/chrysalis-private-pack/07-oss-scrub-checklist.md) (AgenticOps layout) plus:

- [ ] `LICENSE` is Apache-2.0; `package.json` / `COMMERCIAL.md` / README agree  
- [ ] No SA keys, `.env`, customer corpora, filled private pack in history  
- [ ] Pilot Kit docs link from README (`docs/CURSOR-PILOT-KIT.md`)  
- [x] `pnpm run hub:cursor-pilot-kit-smoke` green  
- [x] `pnpm run pilot:laravel-min` green on clean Linux/GCE (`chrysalis-test-vm`, 2026-07-24) with PHP `mysqli` + `pdo_sqlite` — still verify on buyer machines  
- [x] `pnpm run hub:complete-conversion-prove:laravel-min` → `stGreen`+`stClosed` (2026-07-24) — hole-free CWL projection (session boot + ternary lit-branch guards); Hono verify gold 20/20  
- [x] `pnpm run hub:complete-conversion-prove:python` → `stGreen`+`stClosed` (2026-07-24) — first Python cwl-api D6448-ST (`hub-flagship-python` Flask 20/20 hole-free; status tuples + path/query; no invented UI)  
- [x] `pnpm run hub:complete-conversion-prove:go` → `stGreen`+`stClosed` (2026-07-24) — first Go cwl-api D6448-ST (`hub-flagship-go` Gin 20/20 hole-free; brace-bounded gin.H + string/status/scalar; no invented UI)  
- [x] `pnpm run hub:complete-conversion-prove:csharp` → `stGreen`+`stClosed` (2026-07-24) — first C# cwl-api D6448-ST (`hub-flagship-csharp` ASP.NET Minimal API 20/20 hole-free; bounded Map lambdas + Results.Json statusCode + string/scalar/path-ref; no invented UI)  
- [x] `pnpm run hub:complete-conversion-prove:java` → `stGreen`+`stClosed` (2026-07-24) — first Java cwl-api D6448-ST (`hub-flagship-java` Spring `@RestController` 20/20 hole-free; brace-bounded methods + ResponseEntity status+body + Map.of/string/scalar/path-ref; no invented UI)  
- [x] `pnpm run hub:complete-conversion-prove:ruby` → `stGreen`+`stClosed` (2026-07-24) — first Ruby cwl-api D6448-ST (`hub-flagship-ruby` Sinatra 20/20 hole-free; string/status/json depth + path/query; no invented UI)  
- [x] `pnpm run hub:complete-conversion-prove:kotlin` → `stGreen`+`stClosed` (2026-07-24) — first Kotlin cwl-api D6448-ST (`hub-flagship-kotlin` Spring `@RestController` 20/20 hole-free; brace/expression `fun` + mapOf/ResponseEntity + path/query; no invented UI)  
- [x] `pnpm run hub:complete-conversion-prove:scala` → `stGreen`+`stClosed` (2026-07-24) — first Scala cwl-api D6448-ST (`hub-flagship-scala` Akka HTTP 20/20 hole-free; `complete`/`Map`/`StatusCodes` + path/query; no invented UI); Http4s secondary dialect hole-free (`pnpm run hub:scala-http4s-smoke` / `hub-gold-scala-http4s` 20/20 `Ok`/`Created`/`Accepted`)  
- [x] `pnpm run hub:complete-conversion-prove:swift` → `stGreen`+`stClosed` (2026-07-24) — first Swift cwl-api D6448-ST (`hub-flagship-swift` Vapor 20/20 hole-free; multi-segment PathComponents `app.get("items", ":id")` + dict/`encodeResponse` status + path/query; no invented UI)  
- [x] `pnpm run hub:complete-conversion-prove:rust` → `stGreen`+`stClosed` (2026-07-24) — first Rust cwl-api D6448-ST (`hub-flagship-rust` Actix Web 20/20 hole-free; scalar/`serde_json::json!`/`HttpResponse` status + path/query; no invented UI); secondary Axum dialect hole-free (`pnpm run hub:axum-smoke` / `hub-gold-axum` 20/20 named `get(handler)` + `.nest`)  
- [x] `pnpm run hub:complete-conversion-prove:typescript` → `stGreen`+`stClosed` (2026-07-24) — first TypeScript cwl-api D6448-ST (`hub-flagship-typescript` Express 20/20 hole-free; typed Request/Response `.ts` origin via shared JS/TS AST lift; not a JS rename; no invented UI)  
- [x] `pnpm run hub:complete-conversion-prove:vue` → `stGreen`+`stClosed` (2026-07-24) — first Vue cwl-api D6448-ST (`hub-flagship-vue` Express API in SFC `<script>` via existing Vue→JS AST lift; express-depth path/query/JSON/status 20/20 hole-free; minimal template shell only; no invented product UI); secondary Nuxt Nitro/h3 dialect hole-free (`pnpm run hub:vue-nitro-smoke` / `hub-gold-vue-nitro` 20 routes + destructure/`readBody` bind + `getHeader`/`getCookie` + nested `server/middleware` presets)  
- [x] `pnpm run hub:fastify-smoke` → Fastify TypeScript origin dialect hole-free (`hub-gold-fastify` 20/20; secondary to Express/TS ST; distinct from emit-fastify)  
- [x] `pnpm run hub:axum-smoke` → Axum Rust origin dialect hole-free (`hub-gold-axum` 20/20 named handlers + nest; secondary to Actix Rust ST)  
- [x] `pnpm run hub:nestjs-smoke` → NestJS TypeScript origin dialect hole-free (`hub-gold-nestjs` 20/20 `@Controller`+HTTP decorators + path join + `@Param`/`@Query`/`@HttpCode`; secondary to Express/TS ST; DI/guards/pipes unwired)  
- [x] `pnpm run hub:koa-smoke` → Koa TypeScript origin dialect hole-free (`hub-gold-koa` 20/20 `app.get|post` + `ctx.body`/`ctx.status`/`ctx.params`/`ctx.query`/`ctx.request.body`; secondary to Express/TS ST)  
- [x] `pnpm run hub:hapi-smoke` → Hapi TypeScript origin dialect hole-free (`hub-gold-hapi` 20/20 `server.route` + `request.params|query|payload` + `h.response().code`; secondary to Express/TS ST; plugins/lifecycle unwired)  
- [x] `pnpm run hub:elixir-smoke` → Elixir Plug.Router foundation hole-free (`hub-gold-elixir-plug` 20/20 `get|post do…end` + `Jason.encode!`/`send_resp` + `conn.params|query_params|body_params`; Phoenix LiveView/controllers unwired; not ST)  
- [x] `pnpm run hub:complete-conversion-prove:cpp` → `stGreen`+`stClosed` (2026-07-24) — first C++ cwl-api D6448-ST at **express-depth** (`hub-flagship-cpp` Crow 20/20 hole-free; verbs/path/query/JSON/status via `cpp-ast-ingest`); secondary cpp-httplib dialect hole-free (`pnpm run hub:cpp-httplib-smoke` / `hub-gold-cpp-httplib` 20/20); no invented UI  
- [x] `pnpm run hub:complete-conversion-prove:wisp` → `stGreen`+`stClosed` (2026-07-24) — first filled `wisp-ui` D6448-ST (evidence-only hole zero + signed-in origin-compare; no deepen injectors / D6447)  
- [ ] Trademark notice for AgenticOp / Chrysalis  
- [ ] CONTRIBUTING: private adapters/corpora not accepted into `main`  
- [ ] Site copy: “Start a Pilot” → this kit’s 15-minute path  

## After public

1. Pin release tag that includes Pilot Kit.  
2. Update agenticop.io hub / Start a Pilot CTA.  
3. Keep **trade secrets** in `AgenticOps/commercial/chrysalis-private-pack/` only.

## Explicit non-goal

Do **not** weaken verify gates, force-settle holes, or ship demo façades to make a public demo look green (**D6447**).
