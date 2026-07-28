# Do not invent (D6442 / D6447)

Single index of **origin shapes we refuse to fabricate**.  
Translate source or leave an honest hole. Do not pad leadership with façades.

**Law:** [`UNIVERSAL-TRANSLATOR-CANON.md`](./UNIVERSAL-TRANSLATOR-CANON.md) · Scoreboard: [`LEADERSHIP-SCOREBOARD.md`](./LEADERSHIP-SCOREBOARD.md)

---

## Machine catalogs (detail)

| Catalog | Covers |
| --- | --- |
| [`fixtures/ci/js-secondary-dialect-honest-holes.json`](../fixtures/ci/js-secondary-dialect-honest-holes.json) | Koa / Nest / Hapi / Restify / Polka / Hono ORIGIN (≠ emit-hono) / Elysia ORIGIN / Oak Deno ORIGIN |
| [`fixtures/ci/go-secondary-dialect-honest-holes.json`](../fixtures/ci/go-secondary-dialect-honest-holes.json) | Go Chi / Echo / Fiber / Gorilla mux / ServeMux secondaries; Gin ST |
| [`fixtures/ci/elixir-plug-honest-holes.json`](../fixtures/ci/elixir-plug-honest-holes.json) | Plug.Router ST; Phoenix / LiveView / pipelines |
| [`fixtures/ci/phoenix-controller-honest-skip.json`](../fixtures/ci/phoenix-controller-honest-skip.json) | Phoenix controller peel **skipped** (not cheap) |
| [`fixtures/ci/rails-controller-honest-skip.json`](../fixtures/ci/rails-controller-honest-skip.json) | Rails secondary peel **skipped** (G10006; not cheap) |
| [`fixtures/ci/roda-honest-holes.json`](../fixtures/ci/roda-honest-holes.json) | Roda secondary (G10022); nested `r.on`/plugins = holes |
| [`fixtures/ci/quart-honest-holes.json`](../fixtures/ci/quart-honest-holes.json) | Quart secondary (G10026); middleware/WebSocket/Blueprint beyond cheap = holes |
| [`fixtures/ci/bottle-honest-holes.json`](../fixtures/ci/bottle-honest-holes.json) | Bottle secondary (G10027); plugins/middleware/templates/mount = holes |
| [`fixtures/ci/dart-shelf-honest-holes.json`](../fixtures/ci/dart-shelf-honest-holes.json) | Shelf ST; Flutter / Frog / Pipeline |
| [`fixtures/ci/http4k-honest-holes.json`](../fixtures/ci/http4k-honest-holes.json) | http4k Kotlin secondary; Spring ST; Ktor secondary |
| [`fixtures/ci/java-secondary-dialect-honest-holes.json`](../fixtures/ci/java-secondary-dialect-honest-holes.json) | Java JAX-RS (G10012) / Micronaut (G10020) / Quarkus via JAX-RS peels (G10034) / Helidon MP via JAX-RS peels (G10042) / Javalin (G10035); Spring ST |

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
| Koa / Polka | Non-empty onion `app.use` | Empty/next-only pass-through (G9959); G10005 IDENT destructure peel |
| Restify | Plugins, complex `pre`/`use` bodies | Empty/next-only pass-through (G9959); G10005 IDENT destructure peel |
| Hapi | Plugins, `server.ext` lifecycle, auth options | Route + `h.response().code` smoke; G10005 IDENT destructure peel |
| Hono | Complex `app.use` / middleware helpers, nested `app.route`, ResponseInit status | Empty/next-only pass-through (G10044); ORIGIN route surface (G10019); **≠ emit-hono** |
| Elysia | plugins / `.use`, lifecycle hooks, macros / derived context, nested `group` | ORIGIN route surface secondary (G10025) |
| FastAPI | `Depends`, OAuth, middleware onion | Route surface secondary (G10003) |
| Starlette | `Mount`, middleware, ASGI onion, `Route()` table-only | Route surface secondary via `@app.route` (G10013) |
| Falcon | Hooks, middleware, ASGI onion, sink responders, cross-file resources | Route surface secondary via `add_route` + `on_*` (G10023) |
| Quart | Middleware/`before_request`, WebSocket/streaming, Blueprint beyond same-file cheap | Route surface secondary via Flask-twin `@app.get|route` (G10026) |
| Bottle | Plugins/`install()`, middleware/hooks, templates, multi-app mount, non-literal `method=`/paths | Route surface secondary via `@get|route` + query/params + HTTPResponse (G10027) |
| Go Chi | Middleware, `Mount`, non-literal paths | Route surface secondary (G10009) |
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
| Ruby Rails | ActionController, `render json:`, cross-file `ctrl#action`, route macros | Sinatra ST (`hub-flagship-ruby`) |
| Ruby Roda | Nested `r.on`/`r.is`, multi-file plugins/auth, non-literal matchers | Shallow `r.get|post` secondary (G10022) |
| Elixir | Phoenix controllers, LiveView, pipelines | Plug.Router ST |
| Dart | Flutter, Dart Frog, Pipeline, mount/stream, cross-file named handlers | Shelf ST + same-file named handlers (G10007) |
| PHP Blade | Alpine `x-show`, Livewire `wire:*` hydrate | Inventory + basic Blade structural |
| Vue Nitro | Whole-body / unbound `readBody` invent | Field peels + nested middleware presets |
| OpenAPI/HAR | Nested body invent; cookie invent when absent; `/raw` without example; `/items/1`→`:id` invent; hyphenated cookie rename | Flat example peels; IDENT-safe header/cookie/body (G10002/G10031); concrete HAR paths |

---

## Charter required (not cheap; need real corpus)

| Subject | Missing origin | Catalog / note |
| --- | --- | --- |
| Flutter / Dart Frog UI | Real Flutter/Frog app corpus | dart-shelf honest holes |
| Phoenix LiveView / controllers | Cross-file `Ctrl,:action` + maps | phoenix-controller-honest-skip |
| IBM BMS maps | `DFHAID` / `DFHBMSCA` / `EXTFMAP` copybooks in-tree | COBOL prove — stay unresolved |
| COBOL behavioral > **61/61** | Real Db2/CICS/VSAM/RANDOM behavior | Paused; no LCB claim |
| Rails secondary | `routes.rb` + controller cross-file; inline rack lambda peel not cheap | `rails-controller-honest-skip` (G10006) |
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
| GnuCOBOL behavioral subjects already green (61/61) | New behavioral façades to claim “modernized CLBS” |

Prove: `pnpm run hub:cobol-clbs-prove-smoke` · Docs: [`COBOL-MODERNIZATION-PROVE.md`](./COBOL-MODERNIZATION-PROVE.md)

---

## How to add or close an entry

1. **Add hole** — append to the matching `fixtures/ci/*honest*.json` (or new catalog) + one line here + scoreboard “Honest skips”.
2. **Close hole** — only after a real origin peel + smoke/prove; never by stubbing runtime.
3. **Charter** — Flutter / LiveView / BMS / Rails (G10006 skipped) / Blazor require an explicit plan amendment before build.
