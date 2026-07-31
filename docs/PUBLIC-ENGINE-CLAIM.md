# Public engine claim (trust fix)

> agenticop.io promises an **Apache-2.0** Chrysalis engine. Until the GitHub remote is public, that claim is incomplete.  
> This checklist closes the **trust gap** without inventing a second product.

**Not legal advice.** Coordinate with counsel before flipping visibility.

## Why it matters

The Cursor Pilot Kit only works for buyers if they can **clone and run** without a private invite. Private + “open source” on the marketing site is a brand integrity failure.

## Checklist (before `gh repo edit --visibility public`)

Use [`../commercial/chrysalis-private-pack/07-oss-scrub-checklist.md`](../../commercial/chrysalis-private-pack/07-oss-scrub-checklist.md) (AgenticOps layout) plus:

- [x] `LICENSE` is Apache-2.0; `package.json` / `COMMERCIAL.md` / README agree (**G10108**)  
- [ ] No SA keys, `.env`, customer corpora, filled private pack in history  
- [x] Pilot Kit docs link from README (`docs/CURSOR-PILOT-KIT.md`) — laravel-min + `pilot:cobol-clbs` (**G10108**)  
- [x] `pnpm run hub:cursor-pilot-kit-smoke` green  
- [x] `pnpm run hub:public-engine-claim-smoke` green (**G10108**)  
- [x] `pnpm run pilot:laravel-min` green on clean Linux/GCE (`chrysalis-test-vm`, 2026-07-24) with PHP `mysqli` + `pdo_sqlite` — still verify on buyer machines  
- [x] `pnpm run pilot:cobol-clbs` green locally (inventory + best-fit + residual; EXTFMAP sole P0) (**G10107**)  
- [x] `pnpm run hub:complete-conversion-prove:laravel-min` → `stGreen`+`stClosed` (2026-07-24) — hole-free CWL projection (session boot + ternary lit-branch guards); Hono verify gold 20/20  
- [x] `pnpm run hub:slim-smoke` → Slim PHP origin dialect hole-free (`hub-gold-slim` 20/20; secondary to Laravel/Symfony/plain-php ST; `$app->get|post` + `{id}` + `$args` + `getQueryParams` + `withJson`/`withStatus`; PSR-15/`$app->group` unwired)  
- [x] `pnpm run hub:lumen-smoke` → Lumen / Laravel-router PHP origin dialect hole-free (`hub-gold-lumen` 20/20; secondary to Laravel/Symfony/plain-php ST; `$router->get|post` / `Route::get|post` + `{id}` + `$request->query` + `response()->json`; middleware/controllers unwired)  
- [x] `pnpm run hub:complete-conversion-prove:python` → `stGreen`+`stClosed` (2026-07-24) — first Python cwl-api D6448-ST (`hub-flagship-python` Flask 20/20 hole-free; status tuples + path/query; no invented UI)  
- [x] `pnpm run hub:fastapi-smoke` → FastAPI Python origin dialect hole-free (`hub-gold-fastapi` 20/20; secondary to Flask ST; `{id}` paths + `query_params` + `status_code=`; Depends/OAuth unwired)  
- [x] `pnpm run hub:starlette-smoke` → Starlette Python origin dialect hole-free (`hub-gold-starlette` 20/20; secondary to Flask ST; `@app.route` + `{id}` paths + `query_params` + status tuple; Mount/middleware unwired)  
- [x] `pnpm run hub:falcon-smoke` → Falcon Python origin dialect hole-free (`hub-gold-falcon` 20/20; secondary to Flask ST; `app.add_route` + class `on_get|on_post|…` + `{id}` + `req.get_param` + `resp.media`/`resp.status`; hooks/middleware unwired)  
- [x] `pnpm run hub:litestar-smoke` → Litestar Python origin dialect hole-free (`hub-gold-litestar` 20/20; secondary to Flask ST; bare `@get|post|…` + `{id}` + `query_params` + `status_code=`; Provide/DI/Controller unwired)  
- [x] `pnpm run hub:quart-smoke` → Quart Python origin dialect hole-free (`hub-gold-quart` 20/20; secondary to Flask ST; Flask-async twin `@app.get|post|…`/`@app.route` + `<id>` + `request.args` + status tuples; middleware/WebSocket/Blueprint beyond cheap unwired)  
- [x] `pnpm run hub:aiohttp-smoke` → aiohttp Python origin dialect hole-free (`hub-gold-aiohttp` 20/20; secondary to Flask ST; `web.Application` + `web.get|post|…` + `{id}`/`{id:\d+}` + `request.match_info` + `request.query.get` + `web.json_response`/`web.Response`; middleware/subapp/View/WebSocket unwired)  
- [x] `pnpm run hub:tornado-smoke` → Tornado Python origin dialect hole-free (`hub-gold-tornado` 20/20; secondary to Flask ST; `tornado.web.Application([(r"/path", Handler), …])` + class `get|post|…` + `(?P<id>[^/]+)`/`([^/]+)` + `self.get_argument` + `self.write`/`self.set_status`; mixins/UIModule/async/url() unwired)  
- [x] `pnpm run hub:flask-blueprint-smoke` → Flask Blueprint secondary peel hole-free (`hub-gold-flask-blueprint` 20/20; same-file `Blueprint` + `@bp.get|post|route` + literal `url_prefix` join; Flask `@app.*` remains ST; cross-file/nested/middleware unwired)  
- [x] `pnpm run hub:ktor-smoke` → Ktor Kotlin origin dialect hole-free (`hub-gold-ktor` 20/20; secondary to Spring Kotlin ST; `{id}` paths + `call.parameters` + `queryParameters` + `HttpStatusCode`; auth/plugins unwired)  
- [x] `pnpm run hub:http4k-smoke` → http4k Kotlin origin dialect hole-free (`hub-gold-http4k` 20/20; secondary to Spring Kotlin ST; `{id}` paths + `req.path`/`req.query` + `Response(Status).body`; filters/lenses unwired)
- [x] `pnpm run hub:complete-conversion-prove:go` → `stGreen`+`stClosed` (2026-07-24) — first Go cwl-api D6448-ST (`hub-flagship-go` Gin 20/20 hole-free; brace-bounded gin.H + string/status/scalar; no invented UI); secondary Chi (`hub:chi-smoke`), Echo (`hub:echo-smoke`), Fiber (`hub:fiber-smoke` / `hub-gold-fiber` 20/20 `app.Get|Post|…` + `c.Params`/`c.Query` + `c.JSON`/`c.Status(n).JSON`/`c.SendString`), Gorilla mux (`hub:gorilla-smoke` / `hub-gold-gorilla` 20/20 `HandleFunc`+`Methods` + `mux.Vars` + `json.NewEncoder`/`w.WriteHeader`)  
- [x] `pnpm run hub:complete-conversion-prove:csharp` → `stGreen`+`stClosed` (2026-07-24) — first C# cwl-api D6448-ST (`hub-flagship-csharp` ASP.NET Minimal API 20/20 hole-free; bounded Map lambdas + Results.Json statusCode + string/scalar/path-ref; no invented UI)  
- [x] `pnpm run hub:aspnet-controllers-smoke` → ASP.NET controller attribute dialect hole-free (`hub-gold-aspnet-controllers` 20/20 `[ApiController]`+`[Route]`+`[HttpGet|Post|…]` + controller method bodies; secondary to Minimal API ST; DI/filter/Razor unwired)  
- [x] `pnpm run hub:carter-smoke` → Carter C# origin dialect hole-free (`hub-gold-carter` 20/20 `ICarterModule`+`AddRoutes`+`app.Map*`; **reuses Minimal API Map\* peels**; secondary to Minimal API ST; MapCarter/DI/filters unwired)  
- [x] `pnpm run hub:jaxrs-smoke` → JAX-RS Java origin dialect hole-free (`hub-gold-jaxrs` 20/20 `@Path`+`@GET|POST|…` + `@PathParam`/`@QueryParam` + `Response.status().entity().build()`; secondary to Spring Java ST; CDI/filters/providers/Application unwired)  
- [x] `pnpm run hub:quarkus-smoke` → Quarkus JAX-RS Java origin dialect hole-free (`hub-gold-quarkus` 20/20 `jakarta.ws.rs` `@Path`+`@GET|POST|…`; **reuses G10012 JAX-RS peels**; secondary to Spring Java ST; CDI/RESTEasy filters/Panache unwired)  
- [x] `pnpm run hub:javalin-smoke` → Javalin Java origin dialect hole-free (`hub-gold-javalin` 20/20 `Javalin.create` + `app.get|post|…` + `{id}` + `ctx.pathParam`/`ctx.queryParam` + `ctx.status(n).json`/`ctx.json`/`ctx.result`; secondary to Spring Java ST; plugins/DI/WebSocket unwired)  
- [x] `pnpm run hub:helidon-smoke` → Helidon MP JAX-RS Java origin dialect hole-free (`hub-gold-helidon` 20/20 `jakarta.ws.rs` `@Path`+`@GET|POST|…`; **reuses G10012 JAX-RS peels**; secondary to Spring Java ST; CDI/MP Config/Helidon SE unwired)  
- [x] `pnpm run hub:complete-conversion-prove:java` → `stGreen`+`stClosed` (2026-07-24) — first Java cwl-api D6448-ST (`hub-flagship-java` Spring `@RestController` 20/20 hole-free; brace-bounded methods + ResponseEntity status+body + Map.of/string/scalar/path-ref; no invented UI)  
- [x] `pnpm run hub:complete-conversion-prove:ruby` → `stGreen`+`stClosed` (2026-07-24) — first Ruby cwl-api D6448-ST (`hub-flagship-ruby` Sinatra 20/20 hole-free; string/status/json depth + path/query; no invented UI)  
- [x] `pnpm run hub:complete-conversion-prove:kotlin` → `stGreen`+`stClosed` (2026-07-24) — first Kotlin cwl-api D6448-ST (`hub-flagship-kotlin` Spring `@RestController` 20/20 hole-free; brace/expression `fun` + mapOf/ResponseEntity + path/query; no invented UI); secondary Ktor dialect hole-free (`pnpm run hub:ktor-smoke` / `hub-gold-ktor` 20/20 `routing { get|post|… }` + `call.parameters` + `queryParameters` + `HttpStatusCode`); secondary http4k dialect hole-free (`pnpm run hub:http4k-smoke` / `hub-gold-http4k` 20/20 `"path" bind Method.* to` + `req.path`/`req.query` + `Response(Status).body`)  
- [x] `pnpm run hub:complete-conversion-prove:scala` → `stGreen`+`stClosed` (2026-07-24) — first Scala cwl-api D6448-ST (`hub-flagship-scala` Akka HTTP 20/20 hole-free; `complete`/`Map`/`StatusCodes` + path/query; no invented UI); Http4s secondary dialect hole-free (`pnpm run hub:scala-http4s-smoke` / `hub-gold-scala-http4s` 20/20 `Ok`/`Created`/`Accepted`)  
- [x] `pnpm run hub:complete-conversion-prove:swift` → `stGreen`+`stClosed` (2026-07-24) — first Swift cwl-api D6448-ST (`hub-flagship-swift` Vapor 20/20 hole-free; multi-segment PathComponents `app.get("items", ":id")` + dict/`encodeResponse` status + path/query; no invented UI)  
- [x] `pnpm run hub:complete-conversion-prove:rust` → `stGreen`+`stClosed` (2026-07-24) — first Rust cwl-api D6448-ST (`hub-flagship-rust` Actix Web 20/20 hole-free; scalar/`serde_json::json!`/`HttpResponse` status + path/query; no invented UI); secondary Axum dialect hole-free (`pnpm run hub:axum-smoke` / `hub-gold-axum` 20/20 named `get(handler)` + `.nest`); secondary Rocket (`hub:rocket-smoke` 20/20); secondary Poem (`hub:poem-smoke` / `hub-gold-poem` 20/20 `.at` + named handlers + `.nest`)  
- [x] `pnpm run hub:complete-conversion-prove:typescript` → `stGreen`+`stClosed` (2026-07-24) — first TypeScript cwl-api D6448-ST (`hub-flagship-typescript` Express 20/20 hole-free; typed Request/Response `.ts` origin via shared JS/TS AST lift; not a JS rename; no invented UI)  
- [x] `pnpm run hub:complete-conversion-prove:vue` → `stGreen`+`stClosed` (2026-07-24) — first Vue cwl-api D6448-ST (`hub-flagship-vue` Express API in SFC `<script>` via existing Vue→JS AST lift; express-depth path/query/JSON/status 20/20 hole-free; minimal template shell only; no invented product UI); secondary Nuxt Nitro/h3 dialect hole-free (`pnpm run hub:vue-nitro-smoke` / `hub-gold-vue-nitro` 20 routes + destructure/`readBody` bind + `getHeader`/`getCookie` + nested `server/middleware` presets)  
- [x] `pnpm run hub:fastify-smoke` → Fastify TypeScript origin dialect hole-free (`hub-gold-fastify` 20/20; secondary to Express/TS ST; distinct from emit-fastify)  
- [x] `pnpm run hub:fastify-prefix-smoke` → Fastify `register({ prefix })` path join hole-free (`hub-gold-fastify-prefix` 20/20; G10072 / D6534)  
- [x] `pnpm run hub:axum-smoke` → Axum Rust origin dialect hole-free (`hub-gold-axum` 20/20 named handlers + nest; secondary to Actix Rust ST)  
- [x] `pnpm run hub:rocket-smoke` → Rocket Rust origin dialect hole-free (`hub-gold-rocket` 20/20 `#[get|post|…]` + `.mount`; secondary to Actix Rust ST)  
- [x] `pnpm run hub:poem-smoke` → Poem Rust origin dialect hole-free (`hub-gold-poem` 20/20 `.at` + named `get|post|…(handler)` + `.nest`; secondary to Actix Rust ST; middleware/poem-openapi unwired)  
- [x] `pnpm run hub:actix-scope-smoke` → Actix Web `web::scope` nest path-join deepen (`hub-gold-actix-scope` 20/20; flagship stays flat ST; G10068 / D6530)  
- [x] `pnpm run hub:nestjs-smoke` → NestJS TypeScript origin dialect hole-free (`hub-gold-nestjs` 20/20 `@Controller`+HTTP decorators + path join + `@Param`/`@Query`/`@Body`/`@Headers`/`@Cookies`/`@HttpCode`; secondary to Express/TS ST; DI/guards/pipes unwired)  
- [x] `pnpm run hub:complete-conversion-prove:nestjs` → `stGreen`+`stClosed` (2026-07-24) — NestJS route-surface D6448-ST (`hub:nestjs-flagship` / `hub-gold-nestjs`; DI/guards/pipes stay honest holes; no invented Nest runtime)  
- [x] `pnpm run hub:koa-smoke` → Koa TypeScript origin dialect hole-free (`hub-gold-koa` 20/20 + pass-through `app.use` preset; secondary to Express/TS ST)  
- [x] `pnpm run hub:hapi-smoke` → Hapi TypeScript origin dialect hole-free (`hub-gold-hapi` 20/20 `server.route` + `request.params|query|payload` + `h.response().code`; secondary to Express/TS ST; plugins/lifecycle unwired)  
- [x] `pnpm run hub:restify-smoke` → Restify TypeScript origin dialect hole-free (`hub-gold-restify` 20/20 + pass-through `server.pre`/`use` presets; secondary to Express/TS ST; plugins/complex mw unwired)  
- [x] `pnpm run hub:hono-smoke` → Hono TypeScript ORIGIN dialect hole-free (`hub-gold-hono` 20/20 + pass-through `app.use` presets; secondary to Express/TS ST; **≠ emit-hono**; complex mw unwired)
- [x] `pnpm run hub:elysia-smoke` → Elysia TypeScript ORIGIN dialect hole-free (`hub-gold-elysia` 20/20; secondary to Express/TS ST; plugins/lifecycle/macros unwired)  
- [x] `pnpm run hub:oak-smoke` → Oak Deno/JS ORIGIN dialect hole-free (`hub-gold-oak` 20/20; secondary to Express/TS ST; middleware/`router.routes()` unwired)  
- [x] `pnpm run hub:itty-smoke` → itty-router TypeScript ORIGIN dialect hole-free (`hub-gold-itty` 20/20; secondary to Express/TS ST; middleware/nested Router unwired)
- [x] `pnpm run hub:polka-smoke` → Polka TypeScript origin dialect hole-free (`hub-gold-polka` 20/20 + pass-through `app.use` preset; secondary to Express/TS ST; completes thin Node set)  
- [x] `pnpm run hub:complete-conversion-prove:elixir` → `stGreen`+`stClosed` (2026-07-24) — first Elixir cwl-api D6448-ST (`hub-gold-elixir-plug` Plug.Router 20/20 hole-free; `hub:elixir-flagship`; Phoenix LiveView/controllers honest holes; no invented UI)  
- [x] `pnpm run hub:complete-conversion-prove:dart` → `stGreen`+`stClosed` (2026-07-24) — first Dart cwl-api D6448-ST (`hub-gold-dart-shelf` Shelf 20/20 hole-free; `hub:dart-flagship`; Flutter/Dart Frog/Pipeline honest holes; no invented UI)  
- [x] `pnpm run hub:elixir-smoke` → Elixir Plug.Router foundation hole-free (`hub-gold-elixir-plug` 20/20 `get|post do…end` + `Jason.encode!`/`send_resp` + `conn.params|query_params|body_params`; Phoenix LiveView/controllers unwired)  
- [x] `pnpm run hub:dart-smoke` → Dart/Shelf foundation hole-free (`hub-gold-dart-shelf` 20/20 `router.get|post` + `Response.ok`/`Response(status)` + `jsonEncode` + query/body + `<id>`; Flutter/Dart Frog/Pipeline unwired)  
- [x] `pnpm run hub:complete-conversion-prove:cpp` → `stGreen`+`stClosed` (2026-07-24) — first C++ cwl-api D6448-ST at **express-depth** (`hub-flagship-cpp` Crow 20/20 hole-free; verbs/path/query/JSON/status via `cpp-ast-ingest`); secondary cpp-httplib dialect hole-free (`pnpm run hub:cpp-httplib-smoke` / `hub-gold-cpp-httplib` 20/20); no invented UI  
- [x] `pnpm run hub:complete-conversion-prove:wisp` → `stGreen`+`stClosed` (2026-07-24) — first filled `wisp-ui` D6448-ST (evidence-only hole zero + signed-in origin-compare; no deepen injectors / D6447)  
- [x] CONTRIBUTING: private adapters/corpora not accepted into `main`  
- [x] Trademark notice for AgenticOp / Chrysalis (README **Trademarks** — **G10108**)  
- [ ] Site copy: “Start a Pilot” → this kit’s 15-minute path (**Requested:** brand lane `brand/agenticops-web` — do not silent-edit)  

## After public

1. Pin release tag that includes Pilot Kit.  
2. Update agenticop.io hub / Start a Pilot CTA.  
3. Keep **trade secrets** in `AgenticOps/commercial/chrysalis-private-pack/` only.

## Explicit non-goal

Do **not** weaken verify gates, force-settle holes, or ship demo façades to make a public demo look green (**D6447**).
