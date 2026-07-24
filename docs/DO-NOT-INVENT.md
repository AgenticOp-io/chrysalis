# Do not invent (D6442 / D6447)

Single index of **origin shapes we refuse to fabricate**.  
Translate source or leave an honest hole. Do not pad leadership with façades.

**Law:** [`UNIVERSAL-TRANSLATOR-CANON.md`](./UNIVERSAL-TRANSLATOR-CANON.md) · Scoreboard: [`LEADERSHIP-SCOREBOARD.md`](./LEADERSHIP-SCOREBOARD.md)

---

## Machine catalogs (detail)

| Catalog | Covers |
| --- | --- |
| [`fixtures/ci/js-secondary-dialect-honest-holes.json`](../fixtures/ci/js-secondary-dialect-honest-holes.json) | Koa / Nest / Hapi / Restify / Polka |
| [`fixtures/ci/go-secondary-dialect-honest-holes.json`](../fixtures/ci/go-secondary-dialect-honest-holes.json) | Go Chi / Echo secondaries; Gin ST |
| [`fixtures/ci/elixir-plug-honest-holes.json`](../fixtures/ci/elixir-plug-honest-holes.json) | Plug.Router ST; Phoenix / LiveView / pipelines |
| [`fixtures/ci/phoenix-controller-honest-skip.json`](../fixtures/ci/phoenix-controller-honest-skip.json) | Phoenix controller peel **skipped** (not cheap) |
| [`fixtures/ci/rails-controller-honest-skip.json`](../fixtures/ci/rails-controller-honest-skip.json) | Rails secondary peel **skipped** (G10006; not cheap) |
| [`fixtures/ci/dart-shelf-honest-holes.json`](../fixtures/ci/dart-shelf-honest-holes.json) | Shelf ST; Flutter / Frog / Pipeline |

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
| FastAPI | `Depends`, OAuth, middleware onion | Route surface secondary (G10003) |
| Go Chi | Middleware, `Mount`, non-literal paths | Route surface secondary (G10009) |
| Go Echo | Middleware, `Group` deep nesting, `c.Bind` binders | Route surface secondary (G10010) |
| Starlette | `Mount`, middleware, ASGI onion, `Route()` table-only | Route surface secondary via `@app.route` (G10013) |
| Java JAX-RS | CDI, filters, providers, `Application` subclass | Spring `@RestController` ST; resource routes secondary (G10012) |
| ASP.NET MVC | DI container, filter pipeline, Razor UI | Minimal API ST; controller attributes secondary (G10008) |
| Ktor | Auth, plugins, nested routing beyond cheap peel | Route surface secondary (G10004) |
| Ruby Rails | ActionController, `render json:`, cross-file `ctrl#action`, route macros | Sinatra ST (`hub-flagship-ruby`) |
| Elixir | Phoenix controllers, LiveView, pipelines | Plug.Router ST |
| Dart | Flutter, Dart Frog, Pipeline, mount/stream, cross-file named handlers | Shelf ST + same-file named handlers (G10007) |
| PHP Blade | Alpine `x-show`, Livewire `wire:*` hydrate | Inventory + basic Blade structural |
| Vue Nitro | Whole-body / unbound `readBody` invent | Field peels + nested middleware presets |
| OpenAPI/HAR | Nested body invent; `/raw` without example; `/items/1`→`:id` invent | Flat example peels; concrete HAR paths |

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
