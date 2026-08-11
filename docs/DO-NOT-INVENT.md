# Do not invent (D6442 / D6447)

Single index of **origin shapes we refuse to fabricate**.  
Translate source or leave an honest hole. Do not pad leadership with façades.

**Law:** [`UNIVERSAL-TRANSLATOR-CANON.md`](./UNIVERSAL-TRANSLATOR-CANON.md) · Scoreboard: [`LEADERSHIP-SCOREBOARD.md`](./LEADERSHIP-SCOREBOARD.md)

---

## Machine catalogs (detail)

| Catalog | Covers |
| --- | --- |
| [`fixtures/ci/js-secondary-dialect-honest-holes.json`](../fixtures/ci/js-secondary-dialect-honest-holes.json) | Koa / Nest / Hapi / Restify / Polka / Hono ORIGIN (≠ emit-hono) / Elysia ORIGIN / Oak Deno ORIGIN / itty-router Workers ORIGIN / AdonisJS ORIGIN / CF Workers fetch-export |
| [`fixtures/ci/hono-honest-holes.json`](../fixtures/ci/hono-honest-holes.json) | Hono complex mw / createMiddleware / RPC / JSX / validators / WebSocket residual (**G10131** honesty; refuse runtime 20/20; pass-through ceiling G10044) |
| [`fixtures/ci/koa-honest-holes.json`](../fixtures/ci/koa-honest-holes.json) | Koa onion mw / compose / plugins / throw / cookies / nested Router residual (**G10132** honesty; refuse runtime 20/20; pass-through ceiling G9959) |
| [`fixtures/ci/elysia-honest-holes.json`](../fixtures/ci/elysia-honest-holes.json) | Elysia plugins / non-empty lifecycle / macros / derive / guard / nested group residual (**G10133** honesty; refuse runtime 20/20; empty-lifecycle ceiling G10053) |
| [`fixtures/ci/go-secondary-dialect-honest-holes.json`](../fixtures/ci/go-secondary-dialect-honest-holes.json) | Go Chi / Echo / Fiber / Iris / Beego / Buffalo / Martini / Gorilla mux / ServeMux / Revel secondaries; Gin ST (+ Group peel G10066) |
| [`fixtures/ci/revel-honest-skip.json`](../fixtures/ci/revel-honest-skip.json) | Revel Go secondary peel **closed route-surface** (G10114; was G10065 skip; interceptors/router.GET invent remain holes) |
| [`fixtures/ci/elixir-plug-honest-holes.json`](../fixtures/ci/elixir-plug-honest-holes.json) | Plug.Router ST; Phoenix / LiveView / pipelines |
| [`fixtures/ci/phoenix-controller-honest-skip.json`](../fixtures/ci/phoenix-controller-honest-skip.json) | Phoenix controller route-surface **closed G10126**; LiveView still hole |
| [`fixtures/ci/phoenix-liveview-honest-holes.json`](../fixtures/ci/phoenix-liveview-honest-holes.json) | Phoenix LiveView / HEEx / sockets / channels residual (**G10128** honesty; refuse runtime 20/20) |
| [`fixtures/ci/rails-controller-honest-skip.json`](../fixtures/ci/rails-controller-honest-skip.json) | Rails route-table **closed G10115**; resources/filters/AR → G10130 |
| [`fixtures/ci/rails-filters-honest-holes.json`](../fixtures/ci/rails-filters-honest-holes.json) | Rails filters / resources / ActiveRecord residual (**G10130** honesty; refuse runtime 20/20) |
| [`fixtures/ci/roda-honest-holes.json`](../fixtures/ci/roda-honest-holes.json) | Roda secondary (G10022); nested `r.on`/plugins = holes |
| [`fixtures/ci/quart-honest-holes.json`](../fixtures/ci/quart-honest-holes.json) | Quart secondary (G10026); middleware/WebSocket/Blueprint beyond cheap = holes |
| [`fixtures/ci/flask-blueprint-honest-holes.json`](../fixtures/ci/flask-blueprint-honest-holes.json) | Flask Blueprint secondary peel (G10070); cross-file/nested/register override/middleware = holes |
| [`fixtures/ci/bottle-honest-holes.json`](../fixtures/ci/bottle-honest-holes.json) | Bottle secondary (G10027); plugins/middleware/templates/mount = holes |
| [`fixtures/ci/dart-shelf-honest-holes.json`](../fixtures/ci/dart-shelf-honest-holes.json) | Shelf ST; Flutter / Frog / Pipeline (Flutter residual → G10129) |
| [`fixtures/ci/flutter-honest-holes.json`](../fixtures/ci/flutter-honest-holes.json) | Flutter / widgets / engine / Material / Dart Frog residual (**G10129** honesty; refuse runtime 20/20) |
| [`fixtures/ci/http4k-honest-holes.json`](../fixtures/ci/http4k-honest-holes.json) | http4k Kotlin secondary; Spring ST; Ktor secondary |
| [`fixtures/ci/java-secondary-dialect-honest-holes.json`](../fixtures/ci/java-secondary-dialect-honest-holes.json) | Java JAX-RS (G10012) / Micronaut (G10020) / Quarkus via JAX-RS peels (G10034) / Helidon MP via JAX-RS peels (G10042) / Javalin (G10035); Spring ST |
| [`fixtures/ci/finch-honest-holes.json`](../fixtures/ci/finch-honest-holes.json) | Finch Scala secondary (G10051); Akka ST; Http4s first Scala secondary; coproduct/lenses/TwitterServer = holes |

Update those JSON files when a hole is closed by a real peel — not by inventing runtime.

---

## Product-wide refuse (forever / OOS)

| Subject | Why |
| --- | --- |
| GenieACS / invented FCAPS widgets | **D6205** — WISPTools legacy, not Chrysalis |
| LiteRT.js as convert runtime | Refused |
| Bing / invented OSM map defaults | Maps = ArcGIS when source is ArcGIS |
| Demo façades / force-settled holes | **D6447** |
| Silent best-effort without holes | **DESIGN §3** |
| Dependabot merges | Operator-only; do not merge unless asked |

---

## Framework / dialect honest holes (route surface OK; runtime not)

| Stack | Do not invent | Closed instead |
| --- | --- | --- |
| NestJS | DI, guards, pipes, interceptors, bootstrap | Route-surface ST (`hub:nestjs-flagship`); @Headers/@Cookies/@Body field peels (G10015) |
| Koa / Polka | Non-empty onion `app.use` / koa-compose / plugins / throw / nested Router | Empty/next-only pass-through (G9959); G10005 IDENT destructure peel; Koa honesty **G10132** |
| Restify | Plugins, complex `pre`/`use` bodies | Empty/next-only pass-through (G9959); G10005 IDENT destructure peel |
| Hapi | Plugins, `server.ext` lifecycle, auth options | Route + `h.response().code` smoke; G10005 IDENT destructure peel |
| Hono | Complex `app.use` / createMiddleware / RPC / JSX / validators / WebSocket / nested `app.route` / ResponseInit | Empty/next-only pass-through (G10044); ORIGIN route surface (G10019); honesty **G10131**; **≠ emit-hono** |
| Elysia | plugins / `.use` (not `(ctx, next)`), non-empty lifecycle / options/`as`, macros / derive / guard, nested `group`, WebSocket / schema runtime | ORIGIN route surface (G10025); empty `onRequest`/`onBeforeHandle` → `js.passthrough` (G10053); honesty **G10133** |
| itty-router | middleware / nested Router / named handlers, body/headers/cookies | ORIGIN Workers route surface secondary (G10047); empty `all` via G10064 |
| AdonisJS | Lucid ORM, IoC/`@inject`/providers, controller string refs, middleware/groups/auth | ORIGIN route surface secondary (G10059); no Lucid/IoC invent |
| Cloudflare Workers fetch export | KV/D1/R2/`env`, dynamic segments/URLPattern, opaque fetch, scheduled | ORIGIN fetch-export secondary via method+pathname switch (G10063); itty remains router dialect |
| FastAPI | `Depends`, OAuth, middleware onion | Route surface secondary (G10003) |
| Starlette | `Mount`, middleware, ASGI onion, `Route()` table-only | Route surface secondary via `@app.route` (G10013) |
| Falcon | Hooks, middleware, ASGI onion, sink responders, cross-file resources | Route surface secondary via `add_route` + `on_*` (G10023) |
| Quart | Middleware/`before_request`, WebSocket/streaming, Blueprint beyond same-file cheap | Route surface secondary via Flask-twin `@app.get|route` (G10026) |
| Flask Blueprint | Cross-file Blueprint modules, `register_blueprint` url_prefix override, nested Blueprint, Blueprint middleware | Same-file Blueprint + `@bp.get|route` + literal url_prefix join (G10070) |
| Bottle | Plugins/`install()`, middleware/hooks, templates, multi-app mount, non-literal `method=`/paths | Route surface secondary via `@get|route` + query/params + HTTPResponse (G10027) |
| Go Chi | Middleware, `Mount`, non-literal paths | Route surface secondary (G10009) |
| Gin | Non-literal `Group`, `Group("/p", mw…)`, `g.Use` (no invent) | Literal Group path join (G10066); flat ST `hub-flagship-go` |
| Go Echo | Middleware, `Group` deep nesting, `c.Bind` binders | Route surface secondary (G10010) |
| Go Fiber | Middleware, `Group` deep nesting, `c.BodyParser` binders | Route surface secondary (G10017) |
| Go Gorilla mux | Middleware, `PathPrefix`/`Subrouter`, non-literal paths | Route surface secondary (G10018) |
| Go net/http ServeMux (1.22+) | Middleware wrappers (stdlib none), pattern conflicts, non-literal paths | Route surface secondary (G10030) |
| Litestar | `Provide`/DI, middleware/guards, class `Controller`, `Response`/`MediaType`, WebSocket | Route surface secondary via bare `@get|post` (G10021) |
| Java JAX-RS | CDI, filters, providers, `Application` subclass | Spring `@RestController` ST; resource routes secondary (G10012) |
| Java Micronaut | DI (`@Singleton`/`@Factory`), filters, `Application.run` bootstrap | Spring `@RestController` ST; controller routes secondary (G10020) |
| Java Quarkus | CDI/Arc, RESTEasy filters, Panache, `@QuarkusMain` bootstrap | Spring ST; JAX-RS route surface via G10012 peels (G10034) — no Quarkus invent |
| Java Helidon MP | CDI, MicroProfile Config, Helidon SE reactive routing, MP filters | Spring ST; JAX-RS route surface via G10012 peels (G10042) - no Helidon invent |
| ASP.NET MVC | DI container, filter pipeline, Razor UI | Minimal API ST; controller attributes secondary (G10008) |
| Ktor | Auth, plugins, nested routing beyond cheap peel | Route surface secondary (G10004) |
| http4k | Filter/then chains, Body/Header lenses beyond req.path/query, nested/contract routing, server backends | Route surface secondary (G10024) |
| Finch (Scala) | Endpoint `:+:` coproduct, jsonBody/header/cookie lenses, TwitterServer bootstrap, non-flat `::` | Flat `get("path")` / `path[String]` / `param` secondary (G10051) |
| Ruby Rails | filters / `resources` / ActiveRecord / ActionCable | Sinatra ST; Rails route-table G10115; filters honesty G10130 |
| Ruby Roda | Nested `r.on`/`r.is`, multi-file plugins/auth, non-literal matchers | Shallow `r.get|post` secondary (G10022) |
| Elixir | LiveView / HEEx / sockets / channels, pipelines | Plug.Router ST; Phoenix controllers route-surface G10126; LiveView honesty G10128 |
| Dart | Flutter, Dart Frog, Pipeline, mount/stream, cross-file named handlers | Shelf ST + same-file named handlers (G10007); Flutter honesty G10129 |
| PHP Blade | Alpine `x-show`, Livewire `wire:*` hydrate | Inventory + basic Blade structural |
| Vue Nitro | Whole-body / unbound `readBody` invent | Field peels + nested middleware presets |
| OpenAPI/HAR | Nested body invent; cookie invent when absent; response-header invent when absent/schema-only; `/raw` without example; `/items/1`→`:id` invent; hyphenated cookie/header rename | Flat example peels; IDENT-safe header/cookie/body/response-header (G10002/G10031/G10054); concrete HAR paths |

---

## Charter required (not cheap; need real corpus)

| Subject | Missing origin | Catalog / note |
| --- | --- | --- |
| Flutter / Dart Frog UI | Real Flutter/Frog app corpus | flutter-honest-holes (G10129); Shelf ST closed G9956 |
| Phoenix LiveView / HEEx / channels | Real LiveView corpus + non-invent peel | phoenix-liveview-honest-holes (G10128); controllers closed G10126 |
| IBM BMS maps | Licensed `DFHAID` / `DFHBMSCA` / `EXTFMAP` in SDFHCOB | **G10084** symbol catalog only; COPY stay unresolved |
| COBOL behavioral beyond chartered gnu-honest extracts | Real Db2/CICS/VSAM/RANDOM/BMS/MQ/IMS behavior | **65/65** after G10078; Medium+ is **structural** (G10083); no LCB claim |
| Rails secondary | route-table + thin `render json` closed G10115; resources/filters/AR residual | rails-filters-honest-holes (G10130); route-table G10115 |
| Revel Go secondary | `conf/routes` + `Controller.Action` / `revel.Result` — route-surface closed; no router.GET invent | `revel-honest-skip` (G10114 closed; interceptors remain holes) |
| Blazor / ERB / Django | Inventory + markup adapters | MULTI-ORIGIN Tier C — plan amendment |
| JAX-RS CDI / filters / providers / Application | Full CDI container, filter pipeline, `Application` bootstrap | Spring is Java ST; JAX-RS resource routes closed (G10012); CDI/filters/providers = holes |
| Micronaut DI / filters / Application | `@Singleton`/`@Factory` DI, `HttpServerFilter`, `Application.run` | Spring is Java ST; Micronaut controller routes closed (G10020); DI/filters/Application = holes |
| Quarkus CDI / RESTEasy filters / Panache | Arc CDI, RESTEasy filter pipeline, Panache ORM, Quarkus bootstrap | Spring is Java ST; Quarkus JAX-RS route surface closed via G10012 peels (G10034); CDI/filters/Panache = holes |
| Helidon CDI / MP Config / SE | CDI container, MicroProfile Config, Helidon SE WebServer, MP filters | Spring is Java ST; Helidon MP JAX-RS route surface closed via G10012 peels (G10042); CDI/MP Config/SE = holes |
| ASP.NET MVC / Razor / DI / filters | Full MVC filter pipeline, DI container, Razor UI | Minimal API is ST; controller attribute routes closed (G10008); Razor/DI/filters = holes |
| Middleware onion (any) | Real origin mw corpus + bounded peel | Never invent onion runtime |

---

## COBOL-specific (structural OK; behavioral / BMS not)

| OK to deepen (when copybooks exist) | Do not invent |
| --- | --- |
| COPY resolve for in-repo `.cpy` (e.g. CSUTLDWY, CKPRST) | DFHAID / DFHBMSCA / EXTFMAP stubs |
| EXEC SQL / CICS **catalog** holes | Fake Db2 / CICS / VSAM runtimes |
| BMS DFHM* **label inventory** + MAP/MAPSET crosswalk (G10079–G10082) | DFHAID / DFHBMSCA / EXTFMAP stubs or invented PORT/INQ maps |
| CardDemo Medium+ **structural** VSAM-MQ / IMS / Db2 catalogs (G10083) | Fake MQ / IMS / Db2 runtimes or invented CMQ* books |
| CardDemo **CSD + DCLGEN** structural catalogs (G10111) | Invented CICS region / Db2 connect from CSD/DCLGEN text |
| AID/BMSCA **symbol catalog** from upstream (G10084) | Invented `DFHAID.cpy` / `DFHBMSCA.cpy` (IBM proprietary) |
| Operator-licensed SDFHCOB drop on disk (gitignored) | Committing / publishing IBM Restricted Materials as product code |
| GnuCOBOL behavioral subjects already green (65/65 after G10078) | New behavioral façades to claim “modernized CLBS” |

**G10076–G10078 Tier B Small:** `ckprstdn`/`portfliodn`/`errhanddn`/`ckprstph` COPY-linked only — not Db2/CICS/VSAM/BMS.

**G10075 Tier A closed:** mini COPY/INCLUDE surface exhausted (228 resolved; only BMS names unresolved). Do not invent BMS maps or missing `.cpy`.

**G10079–G10082 structural BMS/CICS:** inventory + crosswalk only. Missing `INQMAP`/`INQMNU`/`PORT*`/`PORTSET` and AID copybooks stay holes — do not fabricate map bodies or IBM books.

**G10085–G10106:** WebIR deepen inventory peels **exhausted** on CLBS mini (procedure/USAGE, CICS INTO/FROM, prior FILE/QUEUE/HANDLE/LINK/JCL/SQL catalogs). **G10111** adds CSD/DCLGEN artifact-class inventory; **G10112** adds CICS control option catalogs (RETURN/FORMATTIME/SYNCPOINT/…) — still refuse inventing EXTFMAP/DFHATTR stubs or Db2/IMS/MQ/VSAM/JES runtimes. Operator SDFHCOB path: [`COBOL-IBM-SDFHCOB-DROP.md`](./COBOL-IBM-SDFHCOB-DROP.md) (books **gitignored** — never publish).

**G10077 Tier A+:** secondary-dialect / prefix bingo is **not** the default next queue — COBOL primary (chartered Tier B Medium+ / Tier C) unless the operator explicitly asks for another dialect peel.

Prove: `pnpm run hub:cobol-clbs-prove-smoke` · Docs: [`COBOL-MODERNIZATION-PROVE.md`](./COBOL-MODERNIZATION-PROVE.md)

---

## How to add or close an entry

1. **Add hole** — append to the matching `fixtures/ci/*honest*.json` (or new catalog) + one line here + scoreboard “Honest skips”.
2. **Close hole** — only after a real origin peel + smoke/prove; never by stubbing runtime.
3. **Charter** — Flutter runtime / LiveView runtime / BMS / Rails resources·filters runtime (beyond G10115 route-table) / Blazor require an explicit plan amendment before build. Honesty catalogs G10130/G10129/G10128 refuse force-close.
