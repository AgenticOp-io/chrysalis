# Chrysalis leadership scoreboard

Single source of truth for closed **D6448-ST** flagships and hole-free **secondary dialects** (not ST).  
Update this file when a prove/smoke closes or an honest-skip is chartered. Do not invent Nest DI / LiveView / Flutter / onion runtimes to pad the board (**D6442** / **D6447**).

**As of:** 2026-07-24 (G10003 FastAPI secondary dialect)

---

## Closed D6448-ST (route-surface / filled)

| Language / stack | Flagship | Prove |
| --- | --- | --- |
| PHP Laravel min | `hub-flagship-laravel-min` (session + cwl-api) | `hub:complete-conversion-prove:laravel-min` |
| PHP Symfony | `hub-flagship-symfony` | `hub:complete-conversion-prove:symfony` |
| PHP Express delivery | `hub-flagship-express` | `hub:complete-conversion-prove:express` |
| PHP tiny-blog / plain | prior ST set | see `PUBLIC-ENGINE-CLAIM.md` |
| Python Flask | `hub-flagship-python` | `hub:complete-conversion-prove:python` |
| Go Gin | `hub-flagship-go` | `hub:complete-conversion-prove:go` |
| C# ASP.NET Minimal | `hub-flagship-csharp` | `hub:complete-conversion-prove:csharp` |
| Java Spring | `hub-flagship-java` | `hub:complete-conversion-prove:java` |
| Ruby Sinatra | `hub-flagship-ruby` | `hub:complete-conversion-prove:ruby` |
| Kotlin Spring | `hub-flagship-kotlin` | `hub:complete-conversion-prove:kotlin` |
| Scala Akka HTTP | `hub-flagship-scala` | `hub:complete-conversion-prove:scala` |
| Swift Vapor | `hub-flagship-swift` | `hub:complete-conversion-prove:swift` |
| Rust Actix Web | `hub-flagship-rust` | `hub:complete-conversion-prove:rust` |
| TypeScript Express | `hub-flagship-typescript` | `hub:complete-conversion-prove:typescript` |
| Vue Express-in-SFC | `hub-flagship-vue` | `hub:complete-conversion-prove:vue` |
| C++ Crow | `hub-flagship-cpp` | `hub:complete-conversion-prove:cpp` |
| Elixir Plug.Router | `hub-gold-elixir-plug` / `hub:elixir-flagship` | `hub:complete-conversion-prove:elixir` |
| Dart Shelf | `hub-gold-dart-shelf` / `hub:dart-flagship` | `hub:complete-conversion-prove:dart` |
| NestJS decorators | `hub-gold-nestjs` / `hub:nestjs-flagship` | `hub:complete-conversion-prove:nestjs` |
| WISP filled UI | management CWL | `hub:complete-conversion-prove:wisp` |

---

## Secondary dialects (hole-free smoke; not ST)

| Gate | Dialect | Smoke | Notes |
| --- | --- | --- | --- |
| G9947–d | Nuxt Nitro/h3 | `hub:vue-nitro-smoke` | 20 routes + nested `server/middleware` presets |
| G9948 | Fastify TS | `hub:fastify-smoke` | 20/20; ≠ emit-fastify |
| G9949–b | Axum Rust | `hub:axum-smoke` | named handlers + nest |
| G9950 | NestJS decorators | `hub:nestjs-smoke` | DI/guards/pipes = honest holes; **route-surface ST** via `hub:nestjs-flagship` |
| G9951 | Hapi | `hub:hapi-smoke` | plugins/lifecycle = honest holes |
| — | Koa | `hub:koa-smoke` | 20 + pass-through `app.use` (G9959) |
| G9957 | Restify | `hub:restify-smoke` | 20 + pass-through `pre`/`use` (G9959) |
| G9958 | Polka | `hub:polka-smoke` | 20 + pass-through `app.use` (G9959); completes thin Node set |
| — | Scala Http4s | `hub:scala-http4s-smoke` | secondary to Akka ST |
| — | cpp-httplib | `hub:cpp-httplib-smoke` | secondary to Crow ST |
| G10003 | FastAPI | `hub:fastapi-smoke` | secondary to Flask Python ST; Depends/OAuth = honest holes |

**Thin Node set (complete):** Fastify · Nest · Koa · Hapi · Restify · Polka (all secondary to Express/TS ST).

---

## Honest skips / paused (not cheap deepen)

| Subject | Status | Catalog / note |
| --- | --- | --- |
| Nest DI / guards / pipes | honest holes | G9950 |
| Restify plugins / complex `pre` bodies | honest holes | peel only empty/next-only |
| Koa/Polka non-empty middleware | honest holes | no onion invent |
| Phoenix controllers / LiveView | skipped | `fixtures/ci/phoenix-controller-honest-skip.json` |
| Flutter / Dart Frog / Pipeline | honest holes | Dart ST is Shelf only |
| FastAPI Depends / OAuth / middleware | honest holes | G10003 route surface only |
| COBOL primary | paused **61/61** behavioral; structural CardDemo deepen continues | no LCB claim; G10001 closed CSUTLDWY/CSSETATY COPY resolve; DFHAID/DFHBMSCA stay holes |
| Dependabot merges | operator-only | do not merge unless asked |

---

## Cheap deepen queue

**Closed this wave (G10001–G10003):**
- G10001 — `CSUTLDWY`/`CSSETATY` COPY resolve on COACTUPC/COTRTUPC
- G10002 — OpenAPI `in: header` + flat `requestBody` body params; HAR IDENT-safe headers + flat `postData` body params; `CKPRST.cpy` + `CKPRSTCP` structural COPY resolve; NestJS ST board/claim sync; CONTRIBUTING private-corpora clause
- G10003 — FastAPI secondary dialect (`hub:fastapi-smoke` 20/20); `{id}` paths + `query_params` + `status_code=` decorator peel

**Next (charter required — do not invent):**
1. **Flutter** (or Dart Frog) UI/route surface  
2. **Phoenix LiveView** (or controller peel with cross-file resolve)  
3. **COBOL** behavioral beyond 61/61 (refuse façades)  
4. **IBM BMS** maps (`DFHAID` / `DFHBMSCA` / `EXTFMAP`) — stay honest holes until a real map corpus ships
5. **Rails / Ktor** secondary dialects (similar shape to FastAPI — charter when needed)

Middleware onion / plugin runtimes are **not** next — they require inventing runtime (**D6447**). Pass-through presets (G9959) are the honest ceiling for Koa/Restify/Polka `use`/`pre` until a real origin corpus needs more.

---

## Related

- Claims checklist: [`PUBLIC-ENGINE-CLAIM.md`](./PUBLIC-ENGINE-CLAIM.md)  
- Lift expansion gates: [`MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md)  
- Strategic queue: [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) §12  
