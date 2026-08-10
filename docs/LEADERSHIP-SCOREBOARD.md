# Chrysalis leadership scoreboard

Single source of truth for closed **D6448-ST** flagships and hole-free **secondary dialects** (not ST).  
Update this file when a prove/smoke closes or an honest-skip is chartered. Do not invent Nest DI / LiveView / Flutter / onion runtimes to pad the board (**D6442** / **D6447**).

**As of:** 2026-08-05 (**D6551** core vs peel; **G10125** UT↔Helix spine; **G10124** COPY REPLACING; EXTFMAP sole COBOL P0 — still open)

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
| G10072 | Fastify register prefix | `hub:fastify-prefix-smoke` | `register(…, { prefix })` path join; no plugin invent |
| G9949–b | Axum Rust | `hub:axum-smoke` | named handlers + nest |
| G10011 | Rocket Rust | `hub:rocket-smoke` | `#[get]` + `.mount` + `<id>`/`?<q>` |
| G10029 | Poem Rust | `hub:poem-smoke` | `.at` + named get|post + `.nest` + `:id` |
| G10037 | Salvo Rust | `hub:salvo-smoke` | `with_path` + flat `.push` + `{id}` + `req.param`/`query` |
| G9950 | NestJS decorators | `hub:nestjs-smoke` | DI/guards/pipes = honest holes; **route-surface ST** via `hub:nestjs-flagship`; G10015 @Headers/@Cookies/@Body field peels |
| G9951 | Hapi | `hub:hapi-smoke` | plugins/lifecycle = honest holes; G10005 params/query/payload destructure peel |
| G10005 | Koa / Hapi / Restify / Polka | `hub:koa-smoke` … `hub:polka-smoke` | IDENT destructure from params/query/payload (shared JS AST); 20 + pass-through mw (G9959); no onion invent |
| G9957 | Restify | `hub:restify-smoke` | 20 + pass-through `pre`/`use` (G9959) |
| G9958 | Polka | `hub:polka-smoke` | 20 + pass-through `app.use` (G9959); completes thin Node set |
| G10019 | Hono TS ORIGIN | `hub:hono-smoke` | secondary to Express/TS ST; **≠ emit-hono**; route surface |
| G10044 | Hono pass-through mw | `hub:hono-smoke` v2 | empty/next-only `app.use` → `js.passthrough` (G9959 parallel); complex mw = honest holes |
| G10025 | Elysia TS ORIGIN | `hub:elysia-smoke` | secondary to Express/TS ST; plugins/macros = honest holes; empty lifecycle via G10053 |
| G10053 | Elysia empty lifecycle | `hub:elysia-smoke` v2 | empty `onRequest`/`onBeforeHandle` → `js.passthrough` (G10044 parallel); plugin `.use` = honest hole |
| G10043 | Oak Deno/JS ORIGIN | `hub:oak-smoke` | secondary to Express/TS ST; middleware/`router.routes()` = honest holes |
| G10047 | itty-router JS/TS ORIGIN | `hub:itty-smoke` | secondary to Express/TS ST; empty `all` via G10064; complex mw/nested Router = honest holes |
| G10064 | itty empty `router.all` | `hub:itty-smoke` v2 | empty/`next`-only `router.all` → `js.passthrough` (G10044 parallel); itty has no onion `next` |
| G10063 | Cloudflare Workers fetch export | `hub:cf-workers-smoke` | secondary to Express/TS ST; itty remains Workers router; KV/D1/env = honest holes |
| G10059 | AdonisJS TS ORIGIN | `hub:adonis-smoke` | secondary to Express/TS ST; Lucid/IoC/controller refs = honest holes |
| G10067 | Express Router mount | `hub:express-router-smoke` | `app.use('/prefix', router)` + literal path join; complex use = honest hole (G9959 empty OK) |
| — | Scala Http4s | `hub:scala-http4s-smoke` | secondary to Akka ST |
| G10051 | Scala Finch | `hub:finch-smoke` | secondary to Akka ST; Http4s remains first Scala secondary; coproduct/lenses/bootstrap = honest holes |
| — | cpp-httplib | `hub:cpp-httplib-smoke` | secondary to Crow ST |
| G10003 | FastAPI | `hub:fastapi-smoke` | secondary to Flask Python ST; Depends/OAuth = honest holes |
| G10013 | Starlette | `hub:starlette-smoke` | secondary to Flask Python ST; Mount/middleware = honest holes |
| G10021 | Litestar | `hub:litestar-smoke` | secondary to Flask Python ST; Provide/DI/Controller = honest holes |
| G10023 | Falcon | `hub:falcon-smoke` | secondary to Flask Python ST; hooks/middleware/ASGI onion = honest holes |
| G10026 | Quart | `hub:quart-smoke` | secondary to Flask Python ST (Flask-async twin); middleware/WebSocket/Blueprint beyond cheap = honest holes |
| G10027 | Bottle | `hub:bottle-smoke` | secondary to Flask Python ST; plugins/middleware/templates/mount = honest holes |
| G10033 | Sanic | `hub:sanic-smoke` | secondary to Flask Python ST; middleware/Blueprint/listeners/WebSocket = honest holes |
| G10039 | aiohttp | `hub:aiohttp-smoke` | secondary to Flask Python ST; middleware/subapp/View/WebSocket = honest holes |
| G10040 | Tornado | `hub:tornado-smoke` | secondary to Flask Python ST; mixins/UIModule/async/url() = honest holes |
| G10070 | Flask Blueprint | `hub:flask-blueprint-smoke` | secondary peel on Flask ST; same-file Blueprint + literal url_prefix join; cross-file/nested/middleware = honest holes |
| G10012 | JAX-RS Java | `hub:jaxrs-smoke` | secondary to Spring Java ST; CDI/filters/providers/Application = honest holes |
| G10020 | Micronaut Java | `hub:micronaut-smoke` | secondary to Spring Java ST; DI/filters/Application = honest holes |
| G10034 | Quarkus JAX-RS Java | `hub:quarkus-smoke` | secondary to Spring Java ST; **reuses G10012 JAX-RS peels**; CDI/RESTEasy filters/Panache = honest holes |
| G10035 | Javalin Java | `hub:javalin-smoke` | secondary to Spring Java ST; plugins/`before`/`after`/DI/WebSocket = honest holes |
| G10036 | Spark Java | `hub:sparkjava-smoke` | secondary to Spring Java ST; filters/static/WebSocket = honest holes |
| G10046 | Jooby Java | `hub:jooby-smoke` | secondary to Spring Java ST; module/MVC/filters/WebSocket = honest holes |
| G10042 | Helidon MP JAX-RS Java | `hub:helidon-smoke` | secondary to Spring Java ST; **reuses G10012 JAX-RS peels**; CDI/MP Config/Helidon SE = honest holes |
| G10008 | ASP.NET controllers | `hub:aspnet-controllers-smoke` | secondary to Minimal API C# ST; DI/filter/Razor = honest holes |
| G10041 | Carter C# | `hub:carter-smoke` | secondary to Minimal API C# ST; **reuses Minimal API Map\* peels**; MapCarter/DI/filters = honest holes |
| G10119 | Tapir Scala | `hub:tapir-smoke` | unparked from G10057; endpoint.VERB.in + serverLogicSuccess Map/lit; no jsonBody invent; interpreters = honest holes |
| G10118 | Deno.serve | `hub:deno-serve-smoke` | unparked from G10060; Deno.serve + method/pathname switch via CF Workers peel reuse; no `{ routes }` invent; URLPattern/@std/http = honest holes |
| G10117 | Drogon C++ | `hub:drogon-smoke` | unparked from G10058; app().registerHandler + Json::Value/newHttpJsonResponse/setBody/setStatusCode/getParameter/{id}; METHOD_ADD/filters = honest holes |
| G10116 | Agent-era substrate | `hub:agent-era-substrate-smoke` | D6541 — Hole Type System + CWL-Above-Code + Dispose Plane entry; taxonomy refuses invent/demo-only/force-settle |
| G10114 | Nancy FX C# | `hub:nancy-smoke` | unparked from G10050; NancyModule Get|Post + AsJson/HttpStatusCode/parameters.id; NancyHost/indexer = honest holes |
| G10114 | Revel Go | `hub:revel-smoke` | unparked from G10065; conf/routes METHOD PATH Controller.Action + RenderJSON/Status/Params; interceptors/router.GET invent = honest holes |
| G10004 | Ktor Kotlin | `hub:ktor-smoke` | secondary to Spring Kotlin ST; auth/plugins/nested routing = honest holes |
| G10024 | http4k Kotlin | `hub:http4k-smoke` | secondary to Spring Kotlin ST; filters/lenses/nested/server = honest holes |
| G10009 | Go Chi | `hub:chi-smoke` | secondary to Gin Go ST; middleware/Mount = honest holes |
| G10066 | Gin Group prefix peel | `hub:gin-group-smoke` | Gin ST deepen; literal `Group("/p")` path join; non-literal/mw/`Use` = honest holes |
| G10010 | Go Echo | `hub:echo-smoke` | secondary to Gin Go ST; middleware/Group/binders = honest holes |
| G10017 | Go Fiber | `hub:fiber-smoke` | secondary to Gin Go ST; middleware/Group/BodyParser = honest holes |
| G10038 | Go Iris | `hub:iris-smoke` | secondary to Gin Go ST; middleware/Party/ReadJSON = honest holes |
| G10018 | Go Gorilla mux | `hub:gorilla-smoke` | secondary to Gin Go ST; middleware/Subrouter = honest holes |
| G10030 | Go net/http ServeMux (1.22+) | `hub:servemux-smoke` | secondary to Gin Go ST; middleware none; pattern conflicts = honest holes |
| G10022 | Ruby Roda | `hub:roda-smoke` | secondary to Sinatra Ruby ST; nested `r.on`/plugins = honest holes |
| G10032 | Ruby Grape | `hub:grape-smoke` | secondary to Sinatra Ruby ST; reuses Sinatra peels; `route_param`/`present` = honest holes |
| G10062 | Ruby Padrino | `hub:padrino-smoke` | secondary to Sinatra Ruby ST; reuses Sinatra peels (Grape-class); symbol controllers/mount/filters = honest holes |
| G10126 | Phoenix controllers | `hub:phoenix-controllers-smoke` | unparked controller skip; `Ctrl, :action` + thin json/put_status; LiveView = honest holes |
| G10115 | Ruby Rails routes.rb | `hub:rails-routes-smoke` | unparked from G10006; `to: "ctrl#action"` + thin `render json:`/`params[:id]`; resources/filters/AR = honest holes |
| G10028 | PHP Slim | `hub:slim-smoke` | secondary to Laravel/Symfony/plain-php ST; PSR-15/`$app->group` = honest holes |
| G10049 | PHP Lumen / Laravel-router | `hub:lumen-smoke` | secondary to Laravel/Symfony/plain-php ST; Slim remains first PHP secondary; middleware/controllers = honest holes |

**Thin Node set (complete):** Fastify · Nest · Koa · Hapi · Restify · Polka (all secondary to Express/TS ST).

---

## Honest skips / paused (not cheap deepen)

| Subject | Status | Catalog / note |
| --- | --- | --- |
| Nest DI / guards / pipes | honest holes | G9950 |
| Restify plugins / complex `pre` bodies | honest holes | peel only empty/next-only |
| Koa/Polka non-empty middleware | honest holes | no onion invent |
| Hono complex `app.use` / middleware helpers | honest holes | empty/next-only closed (G10044); ≠ emit-hono |
| Elysia plugins / non-empty lifecycle / macros | honest holes | empty lifecycle closed (G10053); G10025 route surface |
| Oak `app.use` / `router.routes()` / request body|headers|cookies | honest holes | G10043 ORIGIN route surface only |
| itty-router non-empty `all` / nested Router / body|headers|cookies | honest holes | empty `all` closed (G10064); G10047 ORIGIN route surface |
| Cloudflare Workers KV/D1/`env` / dynamic segments / opaque fetch | honest holes | G10063 fetch-export method+pathname surface only |
| Phoenix controllers (route-table) | **Closed route-surface G10126** | was skip; `hub:phoenix-controllers-smoke` 20/20; LiveView still honest hole |
| Rails secondary (`routes.rb` → controller) | **Closed route-surface G10115** | was G10006 skip; `hub:rails-routes-smoke` 20/20; resources/filters/AR still honest holes |
| Nancy FX C# secondary | **Closed route-surface G10114** | was G10050 skip; `hub:nancy-smoke` 20/20; NancyHost/indexer still honest holes |
| Revel Go secondary | **Closed route-surface G10114** | was G10065 skip; `hub:revel-smoke` 20/20; interceptors/router.GET invent still honest holes |
| Tapir Scala secondary | **Closed route-surface G10119** | was G10057 skip; `hub:tapir-smoke` 20/20; jsonBody/interpreters still honest holes |
| Deno.serve TS ORIGIN | **Closed route-surface G10118** | was G10060 skip; `hub:deno-serve-smoke` 20/20; CF Workers peel reuse; `{ routes }` invent still refused |
| Drogon C++ secondary | **Closed route-surface G10117** | was G10058 skip; `hub:drogon-smoke` 20/20; METHOD_ADD/filters still honest holes |
| Roda nested `r.on` / plugins / auth | honest holes | G10022 route surface only (`roda-honest-holes.json`) |
| Grape `route_param` / `present` / `params do` / namespace | honest holes | G10032 flat route surface only (`grape-honest-holes.json`) |
| Padrino symbol controllers / mount / filters | honest holes | G10062 flat Sinatra-compatible surface only (`padrino-honest-holes.json`) |
| Flutter / Dart Frog / Pipeline | honest holes | Dart ST is Shelf + same-file named handlers (G10007) |
| FastAPI Depends / OAuth / middleware | honest holes | G10003 route surface only |
| Go Chi middleware / Mount / non-literal paths | honest holes | G10009 route surface only |
| Gin non-literal Group / Group middleware / `g.Use` | honest holes | G10066 literal Group path join only |
| Go Echo middleware / Group / binders | honest holes | G10010 route surface only |
| Go Fiber middleware / Group / BodyParser | honest holes | G10017 route surface only |
| Go Iris middleware / Party / ReadJSON | honest holes | G10038 route surface only |
| Go Gorilla mux middleware / Subrouter / non-literal paths | honest holes | G10018 route surface only |
| Go ServeMux middleware (stdlib none) / pattern conflicts / non-literal paths | honest holes | G10030 route surface only |
| Starlette Mount / middleware / ASGI onion | honest holes | G10013 `@app.route` surface only |
| Litestar Provide / DI / middleware / Controller | honest holes | G10021 `@get|post` surface only |
| Falcon hooks / middleware / ASGI onion | honest holes | G10023 `add_route`+`on_*` surface only |
| Quart middleware / WebSocket / Blueprint beyond cheap | honest holes | G10026 Flask-twin `@app.get|route` surface only (`quart-honest-holes.json`) |
| Bottle plugins / middleware / templates / mount | honest holes | G10027 `@get|route` + query/params + HTTPResponse surface only (`bottle-honest-holes.json`) |
| Sanic middleware / Blueprint / listeners / WebSocket | honest holes | G10033 `@app.get|route` + `<id>`/`<id:str>` + args + json/text surface only (`sanic-honest-holes.json`) |
| aiohttp middleware / subapp / View / WebSocket | honest holes | G10039 `web.get|post` + match_info + query + json_response/Response surface only (`aiohttp-honest-holes.json`) |
| Tornado mixins / UIModule / async / url() wrappers | honest holes | G10040 Application table + class get|post surface only (`tornado-honest-holes.json`) |
| Flask Blueprint cross-file / nested / register override / middleware | honest holes | G10070 same-file Blueprint + literal url_prefix join only (`flask-blueprint-honest-holes.json`) |
| Slim `$app->add` PSR-15 / `$app->group` / named class handlers | honest holes | G10028 route surface only (`slim-honest-holes.json`) |
| Lumen `$router->group` / middleware / cross-file controllers / `Route::resource` | honest holes | G10049 route surface only (`lumen-honest-holes.json`) |
| JAX-RS CDI / filters / providers / Application | honest holes | G10012 resource route surface only |
| Micronaut DI / filters / Application | honest holes | G10020 controller route surface only |
| Quarkus CDI / RESTEasy filters / Panache | honest holes | G10034 resource route surface via JAX-RS peels only |
| Javalin plugins / before/after / DI / WebSocket | honest holes | G10035 route surface only |
| Spark filters / staticFiles / WebSocket | honest holes | G10036 route surface only |
| Jooby Module/MVC / filters / WebSocket | honest holes | G10046 route surface only |
| Helidon CDI / MP Config / SE | honest holes | G10042 resource route surface via JAX-RS peels only |
| ASP.NET DI / filter pipeline / Razor | honest holes | G10008 controller attribute route surface only |
| Carter MapCarter / DI / filters / non-app Map\* receiver | honest holes | G10041 ICarterModule Map\* surface only (`csharp-secondary-dialect-honest-holes.json`) |
| http4k Filter / lenses / nested routes / servers | honest holes | G10024 route surface only |
| Finch Endpoint `:+:` / lenses / TwitterServer / non-flat `::` | honest holes | G10051 flat string/path/param surface only (`finch-honest-holes.json`) |
| COBOL primary | **68/68** behavioral (**G10113**); WebIR deepen **G10085–G10106** exhausted + **G10111/G10112** + **G10121** ODO + **G10122** RENAMES + **G10124** COPY REPLACING; **G10120** mega-corpus; sole open P0=`copy:EXTFMAP` | no LCB claim; **live z/OS / CICS TX** for EXTFMAP — [`COBOL-IBM-SDFHCOB-DROP.md`](./COBOL-IBM-SDFHCOB-DROP.md) · [`COBOL-NO-ZOS-CEILING.md`](./COBOL-NO-ZOS-CEILING.md) · [`COBOL-EXTERNAL-PROVE-CORPORA.md`](./COBOL-EXTERNAL-PROVE-CORPORA.md) |
| Dependabot merges | operator-only | do not merge unless asked |

---

## Cheap deepen queue

**Default next (D6540 / G10114 + D6541 / G10116):** **dual primary** ingress (COBOL **or** language deepen) **and** agent-era substrate when ownership/SoR is in scope.

| Priority | Work | Status |
| --- | --- | --- |
| **S0** | Agent-era substrate (Hole Type System · CWL-Above-Code · Dispose Plane) | **Entry closed G10116** — dispose certificate on convert-apply; taxonomy + dialect honesty catalogs typed |
| **S0b** | CWL language pillar core (`LANGUAGE_VERSION` + goldens + round-trip) | **Closed G10123** — always check CWL before Convert deepen; `hub:cwl-language-pillar-smoke` |
| **S0c** | Core vs peel boundary (IR/CWL/verify vs hub scripts) | **Charter D6551** — [`CORE-VS-PEEL.md`](./CORE-VS-PEEL.md); WebIR reverse-home done; fat ingest RFC-0024 attachment holes prove (`hub:cwl-attachment-holes-smoke`) |
| **L0** | Unpark previously skipped frameworks → route-surface gold | **Active G10114** — Nancy · Rails · Revel · Drogon · Deno.serve · **Tapir G10119** closed � **Phoenix controllers G10126** closed · next: Phoenix LiveView (charter only — no invent) |
| **L1** | Cheap honest-hole peels inside closed secondaries | Reopen when L0 chartered or operator names a dialect |
| **1** | COBOL Tier A COPY surface | **Closed G10075** |
| **2** | COBOL Tier B Small gnu-honest extracts | **Closed G10076–G10078** (**65/65** → **68/68** via G10113) |
| **2b–2c** | COBOL BMS/CICS + WebIR deepen | **Exhausted G10079–G10112** |
| **3** | COBOL Tier B Medium+ structural | **Closed G10083** + **G10111** — no runtime |
| **4** | COBOL Tier C IBM BMS AID books | **EXTFMAP** sole open P0 |
| — | Secondary-dialect / prefix bingo | **Unpaused (D6540)** — peel without inventing onions |
| — | Flutter / Phoenix LiveView / Rails *filters/resources* | Still charter; Rails route-table + thin `render json` closed G10115 |

**Parity bar (languages vs COBOL):** route-surface gold **20/20** + honest residual catalog + no invented runtime. COBOL keeps behavioral cobc prove; languages keep verify gold — do not force-fake LiveView/DI to “match” COBOL subject counts.

**Closed this finish pack:**
- G10124 — COPY … REPLACING layout inventory (`copyReplacing` / books / pairs / modes); fixtures `hub-cobol-layout-copy-replacing`; best-fit `webir-hole-attrs-copy-replacing`; CWL bridge WebIR subset widened
- G10123 — CWL language pillar bridge (`chrysalis-cwl` LANGUAGE_VERSION + language-gold local parse→print; Convert `hub:cwl-language-pillar-smoke`; CWL-Above-Code requires pillar)
- G10123 amend (2026-08-05) — pull CWL 0.1.7 / RFC-0022: smoke v3 + `24-dna-bridge` WebIR + DNA contract gate; Helix owns DNA enforce
- G10122 — Level-66 RENAMES layout inventory (`renames` / `renamesNames` / `renamesRanges`); copybook-rs fixtures `hub-cobol-layout-renames`; best-fit `webir-hole-attrs-renames`
- G10121 — OCCURS DEPENDING ON layout inventory (`odo` / `dependingOnNames`); JRecord labeled fixtures `hub-cobol-layout-odo`; best-fit `webir-hole-attrs-occurs-depending` (does **not** reopen G10106 exhaust)
- G10120 — public mega-corpus registry + census off-repo (phases 1–8 mapped; JRecord/cb2xml/zopeneditor/db2-samples/gnucobol-src; **GCE prove STATUS_OK** — CLBS 68/68 + external + census 1156→scale); feature-index + `hub:cobol-corpus-query` + `hub:cobol-peel-candidates`; does **not** close EXTFMAP
- G10113 — no-z/OS CardDemo/bank COMPUTE peels (`monthly-interest` / `card-tran-type-fee` / `bank-withdraw`); behavioral **68/68** on `agenticop-master` cobc; [`COBOL-NO-ZOS-CEILING.md`](./COBOL-NO-ZOS-CEILING.md); best-fit `webir-emit-pattern-no-zos-card-bank`
- G10112 — CICS RETURN TRANSID/options, FORMATTIME/ASKTIME, SYNCPOINT, ABEND ABCODE, GETMAIN/FREEMAIN/DELAY, INQUIRE FILE, RETRIEVE INTO, ENQ/DEQ RESOURCE catalogs; best-fit `webir-hole-attrs-cics-control-options`; no CICS invent
- G10111 — CardDemo CSD (`CRDDEMOM`/`CRDDEMO2`) + DCLGEN (`AUTHFRDS`/`DCLTR*`) structural inventory + PROGRAM/MAPSET crosswalks; site-inventory `.csd`/`.dcl`; best-fit `carddemo-csd-dclgen-structural`; no CICS/Db2 invent
- G10106 — CICS INTO/FROM data areas; **`cobol-inventory-peels-exhausted`** stamp (23 surface keys; P0=`copy:EXTFMAP` only)
- G10105 — INITIALIZE / SET TO TRUE / GOBACK / STOP RUN / EXIT PROGRAM / LENGTH OF / REDEFINES / USAGE tokens
- G10104 — EXEC CICS ASSIGN option names; EIB/DFHCOMMAREA symbol catalog
- G10103 — EXEC SQL cursor names; JCL DD↔ASSIGN crosswalk (system DDs filtered; unmatched app DDs honest holes)
- G10102 — HANDLE AID names/targets; HANDLE ABEND LABEL; ORGANIZATION types; FD names; INVALID KEY counts
- G10101 — HANDLE CONDITION names/targets; STRING/UNSTRING/INSPECT counts; OPEN modes; JCL `EXEC PGM=`↔PROGRAM-ID crosswalk (utilities stay holes)
- G10100 — TD vs TS QUEUE split; SELECT ASSIGN / CALL / ACCEPT / DISPLAY catalogs; LINK/XCTL↔PROGRAM-ID crosswalk; residual INCLUDE dual-resolve + files[] + sole open P0=`copy:EXTFMAP` gate; indexed-family WebIR widen
- G10099 — EXEC CICS `FILE`/`QUEUE` literal catalogs + BMS MAP/MAPSET crosswalk attrs on online holes (no VSAM/TDQ invent)
- G10098 — WebIR hole attrs for handleCondition/handleAid/resp/OCCURS/SEARCH/ENTRY/USING; indexed-row `meta.limit`; `EXEC SQL INCLUDE` expand when on disk (SQLCA dual of COPY)
- G10097 — card-pay-option / card-status-multi-rate / card-account-fee-table / card-fee-schedule WebIR catalogs (no EVALUATE invent)
- G10096 — seq-ctl-func-sum / seq-key-scan|update|range / entry-alt / bill-pipeline + indexed-row family WebIR catalogs (no ISAM/EVALUATE invent)
- G10095 — nested-if-grade / search-table / evaluate-subject / rounded-chain WebIR literal catalogs (no IF/SEARCH/EVALUATE/COMPUTE invent)
- G10094 — indexed/file-io inventory fields on WebIR hole attrs (`recordKeys`, `accessModes`, `fileIo`, `evaluateWhens`, …); no runtime invent
- G10093 — evaluate-phase / evaluate-func / indexed-key-read WebIR literal catalogs (no EVALUATE/ISAM invent)
- G10092 — typed WebIR for `seq-max` (operands + int max) / `perform-varying-sum` (`+` fold); licensed DFHAID/DFHBMSCA expand-when-present; IBM books gitignored
- G10091 — typed WebIR `data.binOp` for arithmetic emit patterns (rounded-product / truncate-div / ot-weekly / seq-sum); expected literal retained
- G10090 — `chrysalis.cobol.residual.v1` shared residual ledger (P0 proprietary COPY / P1 runtime holes); `hub:cobol-residual-ledger`
- G10089 — COBOL site-inventory adapter (`scripts/lib/site-inventory/cobol.mjs`); adapters smoke + inventory-first
- G10088 — widen emit→WebIR literals (evaluate-phase / seq-sum / ot-weekly / COPY-linked literal)
- G10087 — `expandCobolCopybooks` for in-repo COPY; DFHAID/DFHBMSCA/EXTFMAP/CMQ* skipped unless licensed file on disk
- G10086 — proven `detectEmitPattern` expected → WebIR literal on MAIN/sole-entry (CLBSMATH)
- G10085 — inventory catalogs → shaped `data.hole` attrs (`unresolved`, `execCicsOps`, …)
- G10084 — Tier C AID/BMSCA **symbol catalog** from CardDemo upstream; DFHAID/DFHBMSCA/EXTFMAP COPY stay proprietary holes
- G10083 — Tier B Medium+ structural: VSAM-MQ (`COACCT01`/`CODATE01`) + IMS/Db2/MQ auth (`COPAU*`/`CBPAUP0C`) + EXEC DLI / IBM MQ CALL catalogs
- G10082 — CICS SEND-TEXT / SEND-MAP / RECEIVE-MAP + MAP/MAPSET + LINK/XCTL PROGRAM literal catalog
- G10081 — real COTRTLI/COTRTUP `.bms` fetched into `_upstream/`
- G10080 — online MAP/MAPSET ↔ BMS label crosswalk; honest holes `INQMAP`/`INQMNU`/`PORT*`/`PORTSET`
- G10079 — BMS DFHM* field/map inventory (`inventoryBmsSource`)
- G10078 — Tier B Small remainder: `PORTFLIODN`/`ERRHANDDN`/`CKPRSTPH` → 66/40/100; behavioral **65/65**
- G10077 — Tier A+ queue hygiene: scoreboard/ROADMAP/§12 point at COBOL; dialect bingo not default next
- G10076 — Tier B Small: `CKPRSTDN` / `ckprstdn` → 150
- G10075 — Tier A: COPY/INCLUDE census exhausted; BMS stay holes
- G10001 — `CSUTLDWY`/`CSSETATY` COPY resolve (earlier CardDemo peel)

**Secondary-dialect wave (G10003–G10074, closed; not the active queue):** route-surface peels and honest-skips across JS/Go/Java/Python/Ruby/Scala/Swift/Rust/C#/PHP — see git history / `docs/CHANGELOG.md` / catalogs under `fixtures/ci/*honest*`. Do **not** spawn another dialect wave unless the operator asks.

**Next (charter required — do not invent):**
1. **EXTFMAP** (sole P0) — needs live z/OS ZD&T hunt on `B5C551` / SDFHCOB **or** operator ABSENT attest after hunt (`CHRYSALIS_EXTFMAP_ABSENT=1`). Never invent. See [`EXTFMAP-RESIDUAL.md`](./EXTFMAP-RESIDUAL.md). **CMQ*** closed via DHE MQ Advanced for Developers drop.
2. **Maintain UT↔Helix spine** — in **chrysalis-cwl** `npm run smoke:ut-spine` (G10125); not Convert Pilot Kit
3. **Chartered IBM runtimes** — Db2/CICS/VSAM/MQ/IMS/JES (not GnuCOBOL substitutes). Closest no-z/OS trial: **CICS TX + COBOL for Linux**.
4. **Parallel GTM:** Cursor Pilot Kit + public-claim + **OSS scrub** (`hub:oss-scrub-smoke` **G10109**) — [`CURSOR-PILOT-KIT.md`](./CURSOR-PILOT-KIT.md) · [`PUBLIC-ENGINE-CLAIM.md`](./PUBLIC-ENGINE-CLAIM.md)
5. **Brand CTA (Requested):** agenticop.io “Start a Pilot” → Pilot Kit 15-minute path
6. **Flutter** / **Phoenix LiveView** / Rails — only if explicitly chartered
7. **Full git-history OSS scrub** — operator (BFG/filter-repo) if secrets ever landed; tracked-tree gate is green

Middleware onion / plugin runtimes are **not** next — they require inventing runtime (**D6447**). Pass-through presets (G9959 Koa/Restify/Polka; G10044 Hono; G10053 Elysia empty lifecycle) are the honest ceiling for `use`/`pre` until a real origin corpus needs more.

## Related

- **Do not invent index:** [`DO-NOT-INVENT.md`](./DO-NOT-INVENT.md)  
- Machine catalogs: `fixtures/ci/js-secondary-dialect-honest-holes.json`, `elixir-plug-honest-holes.json`, `dart-shelf-honest-holes.json`, `java-secondary-dialect-honest-holes.json`, `csharp-secondary-dialect-honest-holes.json`, `go-secondary-dialect-honest-holes.json`, `phoenix-controller-honest-skip.json`, `rails-controller-honest-skip.json`, `roda-honest-holes.json`, `grape-honest-holes.json`, `padrino-honest-holes.json`, `quart-honest-holes.json`, `bottle-honest-holes.json`, `tornado-honest-holes.json`, `slim-honest-holes.json`, `lumen-honest-holes.json`, `nancy-honest-skip.json`, `tapir-honest-skip.json`, `drogon-honest-skip.json`, `revel-honest-skip.json`
- Claims checklist: [`PUBLIC-ENGINE-CLAIM.md`](./PUBLIC-ENGINE-CLAIM.md)  
- Lift expansion gates: [`MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md)  
- Strategic queue: [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) §12  
