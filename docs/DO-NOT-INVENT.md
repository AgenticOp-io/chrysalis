# Do not invent (D6442 / D6447)

Single index of **origin shapes we refuse to fabricate**.  
Translate source or leave an honest hole. Do not pad leadership with façades.

**Law:** [`UNIVERSAL-TRANSLATOR-CANON.md`](./UNIVERSAL-TRANSLATOR-CANON.md) · Scoreboard: [`LEADERSHIP-SCOREBOARD.md`](./LEADERSHIP-SCOREBOARD.md)

---

## Machine catalogs (detail)

| Catalog | Covers |
| --- | --- |
| [`fixtures/ci/js-secondary-dialect-honest-holes.json`](../fixtures/ci/js-secondary-dialect-honest-holes.json) | Koa / Nest / Hapi / Restify / Polka |
| [`fixtures/ci/elixir-plug-honest-holes.json`](../fixtures/ci/elixir-plug-honest-holes.json) | Plug.Router ST; Phoenix / LiveView / pipelines |
| [`fixtures/ci/phoenix-controller-honest-skip.json`](../fixtures/ci/phoenix-controller-honest-skip.json) | Phoenix controller peel **skipped** (not cheap) |
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
| NestJS | DI, guards, pipes, interceptors, bootstrap | Route-surface ST (`hub:nestjs-flagship`) |
| Koa / Polka | Non-empty onion `app.use` | Empty/next-only pass-through (G9959) |
| Restify | Plugins, complex `pre`/`use` bodies | Empty/next-only pass-through (G9959) |
| Hapi | Plugins, `server.ext` lifecycle, auth options | Route + `h.response().code` smoke |
| FastAPI | `Depends`, OAuth, middleware onion | Route surface secondary (G10003) |
| Elixir | Phoenix controllers, LiveView, pipelines | Plug.Router ST |
| Dart | Flutter, Dart Frog, Pipeline, mount/stream | Shelf ST |
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
| Rails secondary | `routes.rb` + controller cross-file | Same class as Phoenix skip |
| Ktor secondary | 20-route gold + peel charter | Kotlin Spring is ST today |
| Blazor / ERB / Django | Inventory + markup adapters | MULTI-ORIGIN Tier C — plan amendment |
| ASP.NET MVC / Razor | Controllers beyond Minimal API | Minimal is ST; classic = hole |
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
3. **Charter** — Flutter / LiveView / BMS / Rails / Ktor / Blazor require an explicit plan amendment before build.
