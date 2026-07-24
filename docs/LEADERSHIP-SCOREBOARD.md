# Chrysalis leadership scoreboard

Single source of truth for closed **D6448-ST** flagships and hole-free **secondary dialects** (not ST).  
Update this file when a prove/smoke closes or an honest-skip is chartered. Do not invent Nest DI / LiveView / Flutter / onion runtimes to pad the board (**D6442** / **D6447**).

**As of:** 2026-07-24 (G10017 Go Fiber secondary dialect)

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
| G9950 | NestJS decorators | `hub:nestjs-smoke` | DI/guards/pipes = honest holes; **route-surface ST** via `hub:nestjs-flagship`; G10015 @Headers/@Cookies/@Body field peels |
| G9951 | Hapi | `hub:hapi-smoke` | plugins/lifecycle = honest holes; G10005 params/query/payload destructure peel |
| G10005 | Koa / Hapi / Restify / Polka | `hub:koa-smoke` … `hub:polka-smoke` | IDENT destructure from params/query/payload (shared JS AST); 20 + pass-through mw (G9959); no onion invent |
| G9957 | Restify | `hub:restify-smoke` | 20 + pass-through `pre`/`use` (G9959) |
| G9958 | Polka | `hub:polka-smoke` | 20 + pass-through `app.use` (G9959); completes thin Node set |
| G10019 | Hono TS ORIGIN | `hub:hono-smoke` | secondary to Express/TS ST; **≠ emit-hono**; middleware = honest holes |
| — | Scala Http4s | `hub:scala-http4s-smoke` | secondary to Akka ST |
| — | cpp-httplib | `hub:cpp-httplib-smoke` | secondary to Crow ST |
| G10003 | FastAPI | `hub:fastapi-smoke` | secondary to Flask Python ST; Depends/OAuth = honest holes |
| G10013 | Starlette | `hub:starlette-smoke` | secondary to Flask Python ST; Mount/middleware = honest holes |
| G10021 | Litestar | `hub:litestar-smoke` | secondary to Flask Python ST; Provide/DI/Controller = honest holes |
| G10023 | Falcon | `hub:falcon-smoke` | secondary to Flask Python ST; hooks/middleware/ASGI onion = honest holes |
| G10012 | JAX-RS Java | `hub:jaxrs-smoke` | secondary to Spring Java ST; CDI/filters/providers/Application = honest holes |
| G10020 | Micronaut Java | `hub:micronaut-smoke` | secondary to Spring Java ST; DI/filters/Application = honest holes |
| G10008 | ASP.NET controllers | `hub:aspnet-controllers-smoke` | secondary to Minimal API C# ST; DI/filter/Razor = honest holes |
| G10004 | Ktor Kotlin | `hub:ktor-smoke` | secondary to Spring Kotlin ST; auth/plugins/nested routing = honest holes |
| G10024 | http4k Kotlin | `hub:http4k-smoke` | secondary to Spring Kotlin ST; filters/lenses/nested/server = honest holes |
| G10009 | Go Chi | `hub:chi-smoke` | secondary to Gin Go ST; middleware/Mount = honest holes |
| G10010 | Go Echo | `hub:echo-smoke` | secondary to Gin Go ST; middleware/Group/binders = honest holes |
| G10017 | Go Fiber | `hub:fiber-smoke` | secondary to Gin Go ST; middleware/Group/BodyParser = honest holes |
| G10018 | Go Gorilla mux | `hub:gorilla-smoke` | secondary to Gin Go ST; middleware/Subrouter = honest holes |
| G10022 | Ruby Roda | `hub:roda-smoke` | secondary to Sinatra Ruby ST; nested `r.on`/plugins = honest holes |

**Thin Node set (complete):** Fastify · Nest · Koa · Hapi · Restify · Polka (all secondary to Express/TS ST).

---

## Honest skips / paused (not cheap deepen)

| Subject | Status | Catalog / note |
| --- | --- | --- |
| Nest DI / guards / pipes | honest holes | G9950 |
| Restify plugins / complex `pre` bodies | honest holes | peel only empty/next-only |
| Koa/Polka non-empty middleware | honest holes | no onion invent |
| Hono `app.use` / middleware helpers | honest holes | G10019 ORIGIN surface only; ≠ emit-hono |
| Phoenix controllers / LiveView | skipped | `fixtures/ci/phoenix-controller-honest-skip.json` |
| Rails secondary (`routes.rb` → controller) | skipped (G10006) | `fixtures/ci/rails-controller-honest-skip.json` |
| Roda nested `r.on` / plugins / auth | honest holes | G10022 route surface only (`roda-honest-holes.json`) |
| Flutter / Dart Frog / Pipeline | honest holes | Dart ST is Shelf + same-file named handlers (G10007) |
| FastAPI Depends / OAuth / middleware | honest holes | G10003 route surface only |
| Go Chi middleware / Mount / non-literal paths | honest holes | G10009 route surface only |
| Go Echo middleware / Group / binders | honest holes | G10010 route surface only |
| Go Fiber middleware / Group / BodyParser | honest holes | G10017 route surface only |
| Go Gorilla mux middleware / Subrouter / non-literal paths | honest holes | G10018 route surface only |
| Starlette Mount / middleware / ASGI onion | honest holes | G10013 `@app.route` surface only |
| Litestar Provide / DI / middleware / Controller | honest holes | G10021 `@get|post` surface only |
| Falcon hooks / middleware / ASGI onion | honest holes | G10023 `add_route`+`on_*` surface only |
| JAX-RS CDI / filters / providers / Application | honest holes | G10012 resource route surface only |
| Micronaut DI / filters / Application | honest holes | G10020 controller route surface only |
| ASP.NET DI / filter pipeline / Razor | honest holes | G10008 controller attribute route surface only |
| http4k Filter / lenses / nested routes / servers | honest holes | G10024 route surface only |
| COBOL primary | paused **61/61** behavioral; structural CardDemo deepen continues | no LCB claim; G10001 closed CSUTLDWY/CSSETATY COPY resolve; DFHAID/DFHBMSCA stay holes |
| Dependabot merges | operator-only | do not merge unless asked |

---

## Cheap deepen queue

**Closed this wave (G10001–G10013, G10009–G10012, G10017–G10018, G10020–G10022):**
- G10001 — `CSUTLDWY`/`CSSETATY` COPY resolve on COACTUPC/COTRTUPC
- G10002 — OpenAPI `in: header` + flat `requestBody` body params; HAR IDENT-safe headers + flat `postData` body params; `CKPRST.cpy` + `CKPRSTCP` structural COPY resolve; NestJS ST board/claim sync; CONTRIBUTING private-corpora clause
- G10003 — FastAPI secondary dialect (`hub:fastapi-smoke` 20/20); `{id}` paths + `query_params` + `status_code=` decorator peel
- G10013 — Starlette secondary dialect (`hub:starlette-smoke` 20/20); `@app.route` + `{id}` paths + `query_params` + status tuple peel
- G10021 — Litestar secondary dialect (`hub:litestar-smoke` 20/20); bare `@get|post` + `{id}` paths + `query_params` + `status_code=` decorator peel
- G10019 — Hono ORIGIN secondary dialect (`hub:hono-smoke` 20/20); `new Hono` + `c.req.param|query` + `c.json`/`c.text`; ≠ emit-hono
- G10023 — Falcon secondary dialect (`hub:falcon-smoke` 20/20); `app.add_route` + class `on_get|on_post|…` + `{id}` + `req.get_param` + `resp.media`/`resp.status` peel
- G10004 — Ktor secondary dialect (`hub:ktor-smoke` 20/20); `{id}` paths + `call.parameters` + `queryParameters` + `HttpStatusCode` on `call.respond`
- G10024 — http4k secondary dialect (`hub:http4k-smoke` 20/20); `"path" bind Method.* to` + `{id}` + `req.path`/`req.query` + `Response(Status).body`
- G10005 — Thin-Node IDENT destructure peel (`const { id } = ctx|req|request.params|query|payload`) for Koa/Hapi/Restify/Polka smokes (20/20); nested/computed/rest patterns stay honest holes
- G10007 — Dart Shelf same-file named handlers (`router.get('/x', myHandler)` peel; cross-file = honest hole)
- G10012 — JAX-RS Java secondary dialect (`hub:jaxrs-smoke` 20/20); class `@Path` prefix join + `@GET|POST|…` + `@PathParam`/`@QueryParam` + `Response.status().entity().build()` peel
- G10020 — Micronaut Java secondary dialect (`hub:micronaut-smoke` 20/20); `@Controller` + `@Get|Post|…` + `@PathVariable`/`@QueryValue` + `HttpResponse.status().body()` peel
- G10008 — ASP.NET controller secondary dialect (`hub:aspnet-controllers-smoke` 20/20); `[Route]` prefix join + `[HttpGet|Post|…]` + controller method body peel
- G10009 — Go Chi secondary dialect (`hub:chi-smoke` 20/20); `r.Get|Post` + `{id}` paths + `chi.URLParam` + `r.URL.Query().Get` + `json.NewEncoder`/`w.WriteHeader` peel
- G10010 — Go Echo secondary dialect (`hub:echo-smoke` 20/20); `:id` paths + `c.Param` + `c.QueryParam` + `c.JSON`/`c.String`; Gin remains Go ST
- G10017 — Go Fiber secondary dialect (`hub:fiber-smoke` 20/20); `:id` paths + `c.Params` + `c.Query` + `c.JSON`/`c.Status(n).JSON`/`c.SendString`; Gin remains Go ST
- G10018 — Go Gorilla mux secondary dialect (`hub:gorilla-smoke` 20/20); `HandleFunc`+`Methods` + `{id}` paths + `mux.Vars` + `json.NewEncoder`/`w.WriteHeader`; Gin remains Go ST
- G10022 — Roda Ruby secondary dialect (`hub:roda-smoke` 20/20); shallow `r.get|post` + `String`/`|id|` + Hash/`response.status`/`r.params`; Sinatra remains Ruby ST

**Skipped (G10006):** Rails secondary — cross-file `controller#action` + ActionController (Phoenix-class); inline rack lambda probe 6/6 handler holes on Sinatra-only peel. Sinatra ST unchanged (`hub-flagship-ruby`).

**Closed (G10022 / D6484):** Roda secondary dialect (`hub:roda-smoke` 20/20); shallow `r.get|post` + `String`/`|id|` + Hash/`response.status`/`r.params`; nested `r.on`/plugins = honest holes. Sinatra remains Ruby ST; Rails stays skipped.

**Next (charter required — do not invent):**
1. **Flutter** (or Dart Frog) UI/route surface  
2. **Phoenix LiveView** (or controller peel with cross-file resolve)  
3. **COBOL** behavioral beyond 61/61 (refuse façades)  
4. **IBM BMS** maps (`DFHAID` / `DFHBMSCA` / `EXTFMAP`) — stay honest holes until a real map corpus ships

Middleware onion / plugin runtimes are **not** next — they require inventing runtime (**D6447**). Pass-through presets (G9959) are the honest ceiling for Koa/Restify/Polka `use`/`pre` until a real origin corpus needs more.

---

## Related

- **Do not invent index:** [`DO-NOT-INVENT.md`](./DO-NOT-INVENT.md)  
- Machine catalogs: `fixtures/ci/js-secondary-dialect-honest-holes.json`, `elixir-plug-honest-holes.json`, `dart-shelf-honest-holes.json`, `java-secondary-dialect-honest-holes.json`, `phoenix-controller-honest-skip.json`, `rails-controller-honest-skip.json`, `roda-honest-holes.json`
- Claims checklist: [`PUBLIC-ENGINE-CLAIM.md`](./PUBLIC-ENGINE-CLAIM.md)  
- Lift expansion gates: [`MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md)  
- Strategic queue: [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) §12  
