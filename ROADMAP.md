# Chrysalis - Roadmap

> Read `DESIGN.md` first. This file is the **active** execution plan.
> **Operator stack:** [`docs/MIGRATION-OS.md`](./docs/MIGRATION-OS.md) · **Doc index:** [`docs/README.md`](./docs/README.md)
> Completed history is archived in [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md).

## Status (2026-07)

- **Releases:** `v1.0.0` -> `v2.0.x` tagged on `main`.
- **Active lane:** **Post–G9990 maintain** — **translate-only** (**D6442**) + **source-authoritative UI** (**D6443**) + **origin source corpus / piecemeal queue** (**D6444** / **G9993**); Migration OS (**G8550**); UT regression (**G7690**). WISP = POC only; GenieACS OOS; **LiteRT.js refused**. **Maps = ArcGIS when source is ArcGIS**.
- **Closed (2026-07-24):** **Dart/Shelf foundation** — `hub:dart-smoke` / `hub-gold-dart-shelf` 20/20 hole-free (`router.get|post|…` + `Response.ok`/`Response(status)` + `jsonEncode` + query/body peels + `<id>` path params); new origin language (G9954). Flutter/Dart Frog/Pipeline = honest holes (**D6447**). Not ST. Honest-holes catalog: `fixtures/ci/dart-shelf-honest-holes.json`. Phoenix controller peel deferred (no LiveView invent).
- **Closed (2026-07-24):** **Elixir Plug.Router foundation** — `hub:elixir-smoke` / `hub-gold-elixir-plug` 20/20 hole-free (`get|post|… do…end` + `send_resp` + `Jason.encode!` + `conn.params|query_params|body_params`); new origin language (G9953). Phoenix LiveView/controllers = honest holes (**D6447**). Not ST. Honest-holes catalog: `fixtures/ci/elixir-plug-honest-holes.json`. Dart closed above.
- **Closed (2026-07-24):** **Hapi TS secondary dialect** — `hub:hapi-smoke` / `hub-gold-hapi` 20/20 hole-free (`server.route` + `handler` + `request.params|query|payload` + `h.response().code`); Express/TS remain D6448-ST. Honest-holes catalog: `fixtures/ci/js-secondary-dialect-honest-holes.json`. Elixir/Dart foundations closed above.
- **Closed (2026-07-24):** **Koa TS secondary dialect** — `hub:koa-smoke` / `hub-gold-koa` 20/20 hole-free (`app.get|post` + `ctx.body`/`ctx.status`/`ctx.params`/`ctx.query`/`ctx.request.body`); Express/TS remain D6448-ST. Nest route-surface ST closed via `hub:nestjs-flagship` + `hub:complete-conversion-prove:nestjs` (DI/guards honest holes). Honest-holes catalog: `fixtures/ci/js-secondary-dialect-honest-holes.json`. Elixir/Dart ingest still absent.
- **Closed (2026-07-24):** **NestJS decorator route foundation** — `hub:nestjs-smoke` / `hub-gold-nestjs` 20/20 hole-free (`@Controller` + `@Get|Post|…` + path join + `@Param`/`@Query`/`@HttpCode`); Express/TS remain primary D6448-ST. Elixir/Dart ingest still absent.
- **Closed (2026-07-24):** **Axum Rust secondary dialect** — `hub:axum-smoke` / `hub-gold-axum` 20/20 hole-free (`.route` + get|post|… closures + `Json(serde_json::json!)` + `StatusCode` tuples); Actix remains Rust D6448-ST. Elixir/Dart ingest still absent.
- **Closed (2026-07-24):** **Vue/Nuxt Nitro/h3 deepen v4** — destructure `const { x } = await readBody(event)` (+ prior header/cookie/bind/`??`); `hub:vue-nitro-smoke` v4 20 routes + 2 middleware hole-free; Express-in-SFC remains Vue D6448-ST. Elixir/Dart ingest still absent.
- **Closed (2026-07-24):** **Fastify TS origin dialect** — `hub:fastify-smoke` / `hub-gold-fastify` 20/20 hole-free (`fastify.*` + `reply.send`/`reply.code`); Express/TS remain D6448-ST; distinct from emit-fastify. Elixir/Dart ingest still absent.
- **Closed (2026-07-24):** **Vue/Nuxt Nitro/h3 deepen v3** — `getHeader`/`getRequestHeader`/`getCookie` + `readBody` bindings; `hub:vue-nitro-smoke` v3 20 routes + 2 middleware hole-free; Express-in-SFC remains Vue D6448-ST. Elixir/Dart ingest still absent.
- **Closed (2026-07-24):** **Vue/Nuxt Nitro/h3 deepen** — `readBody` field peel + `server/middleware` (nested) presets; `hub:vue-nitro-smoke` v2 20 routes + 2 middleware hole-free; Express-in-SFC remains Vue D6448-ST. Elixir/Dart ingest still absent.
- **Closed (2026-07-24):** **Vue/Nuxt Nitro/h3 server dialect** — `hub:vue-nitro-smoke` / `hub-gold-vue-nitro` 20/20 hole-free (`defineEventHandler`); Express-in-SFC remains Vue D6448-ST. Elixir/Dart ingest still absent.
- **Canon:** [`docs/UNIVERSAL-TRANSLATOR-CANON.md`](docs/UNIVERSAL-TRANSLATOR-CANON.md) (**G9960–G9990** + **§2A–2C**)
- **Locked (2026-07-15):** **D6444** — ingest all origin files → SQLite/JSON code DB → convert one piece at a time (**G9993**).
- **Locked (2026-07-15):** **D6443** — source-authoritative UI conversion method (origin CSS/classes/islands are look/behavior authority).
- **Locked (2026-07-14):** **D6442** — translate-only fidelity law; reset invented map/loader decisions.
- **Closed (2026-07-14):** **D6441** — preserve third-party vendor islands (Vite/`@arcgis/core` as source; no CDN rewrite).
- **Closed (2026-07-14):** **G9992** — WISP POC from-scratch one-shot (`hub:wisp-poc-from-scratch`); ADC Firebase auth; docs [`WISP-POC-FROM-SCRATCH.md`](docs/WISP-POC-FROM-SCRATCH.md).
- **Closed (2026-07-14):** **D6440 / G9991** — `chrysalis chat` CLI (license-ungated) + `convert-site --skip-http-path`; README → UT Canon; CWL IDENT at list/lift; `hub:ut-maintain-packaging-smoke`.
- **Closed (2026-07-14):** **G9990** UT Canon program (`hub:ut-canon-program-close-smoke`).
- **Closed (2026-07-14):** **Wave D** — engine depth (`hub:ut-wave-d-close-smoke` **G9989**); multi-origin llmIs reads `scripts/lib/cwl-svelte-native-convert.mjs`.
- **Closed (2026-07-14):** **Wave C** — AI assist under verify (`hub:ut-wave-c-close-smoke` **G9985**): Migration Chat, LLM verify-apply, IS close, live hit-rate honesty, convert governor.
- **Closed (2026-07-14):** **Wave B** — composer strength (`hub:ut-wave-b-close-smoke` **G9975**, **D6439**): G7690 green (nextjs honest WPTP skip + CWL `toCwlIdent` roundtrip); charter audit; php→python proof; adapter work-items; outbound G7602.
- **Closed (2026-07-14):** **Wave A** — canon lock + `scripts/lib` extract (`hub:ut-wave-a-close-smoke` **G9965**, **D6438**).
- **Closed (2026-07-14):** **D6438** canon document + STRATEGY/AGENTS lock (**G9960**).
- **Closed (2026-07-14):** **D6437** UT reframing + initiative knowledge DB.
- **Closed (2026-07-14):** **management.wisptools.io visual + multipage Firebase** (**G9952**, **D6436**) — POC deploy.
- **Closed (2026-07-13):** **Module_Manager depth** (**G9951**, **D6435**) — POC; `hub:wisp-cwl-module-depth-smoke`.
- **Maintained:** `hub:ut-canon-program-close-smoke` (**G9990**) · `hub:ut-maintain-packaging-smoke` (**G9991**) · `hub:wisp-poc-from-scratch` (**G9992**, operator) · `hub:cwl-universal-translator-close-smoke` (**G7690**) · `hub:migration-os-close-smoke` (**G8550**).
- **Closed (2026-07-13):** **Module buttons convert** (**G9950**, **D6434**) — plan/deploy toolbars + structural search/export/scan; `hub:wisp-cwl-module-buttons-smoke`.
- **Closed (2026-07-13):** **SharedMap↔ArcGIS interaction** (**G9949**, **D6433**) — plan/deploy postMessage drives map; `hub:wisp-cwl-map-interact-smoke`.
- **Closed (2026-07-13):** **WISP ArcGIS + grind** (**G9947–G9948**, **D6432**) — MapView + API geometry; module-access/PCI host; `hub:wisp-cwl-arcgis-grind-smoke`.
- **Closed (2026-07-13):** **Next loading.tsx + next/font honesty** (**G9944**, **D6429**) — `hub:next-loading-font-smoke`.
- **Closed (2026-07-13):** **Angular NgModule providers** (**G9945**, **D6430**) — `hub:angular-ngmodule-providers-smoke`.
- **Closed (2026-07-13):** **Vue App.vue shell CSS** (**G9946**, **D6431**) — `hub:vue-app-shell-css-smoke`; multi-origin close **v4**.
- **Closed (2026-07-13):** **Angular providedIn / providers** (**G9941**, **D6426**) — `hub:angular-provided-in-smoke`.
- **Closed (2026-07-13):** **Vue/Nuxt layout CSS** (**G9942**, **D6427**) — `hub:vue-nuxt-layout-css-smoke`.
- **Closed (2026-07-13):** **Shared multi-origin convert orch** (**G9943**, **D6428**) — `hub:multi-origin-convert-orch-smoke`.
- **Closed (2026-07-13):** **Next layout/globals CSS depth** (**G9940**, **D6425**) — ancestor `layout` CSS per route; nested portal isolation; `hub:next-layout-css-depth-smoke`.
- **Closed (2026-07-13):** **Remaining WISP empty-page hydrate** (**G9932–G9939**, **D6424**) — voice/plan/bundles/permissions/roles/CBRS/support; empty-list honesty; `hub:wisp-cwl-remaining-surface-smoke`. Pause from **D6416** lifted.
- **Closed (2026-07-13):** **Angular DI graph depth** (**G9931**, **D6423**) — `LoginComponent→AuthService→SessionStore` edges; `hub:angular-di-graph-smoke`.
- **Closed (2026-07-13):** **Next App Router CSS depth** (**G9930**, **D6422**) — co-located `page.module.css` without `.next`; `hub:next-css-depth-smoke`.
- **Closed (2026-07-12):** **Vue scoped-CSS depth** (**G9929**, **D6421**) — SFC `<style scoped>` lift without Vite dist; `:global`/`::v-deep` descope; `hub:vue-scoped-css-depth-smoke`.
- **Closed (2026-07-12):** **Vue load-bind + Next RSC depth** (**G9927–G9928**, **D6420**) — shared hydrate for Vue/Next/Angular markers; `hub:vue-load-bind-smoke` · `hub:next-rsc-depth-smoke`.
- **Closed (2026-07-12):** **Angular structural-shell depth** (**G9926**, **D6419**) — `*ngIf`/`*ngFor`/interp/event/bind/component/async + `inject()` DI holes; `hub:angular-structural-shell-depth-smoke`.
- **Closed (2026-07-12):** **Vue/Next structural-shell depth** (**G9924–G9925**, **D6418**) — named holes (no silent `{…}` strip); `hub:vue-structural-shell-depth-smoke` · `hub:next-structural-shell-depth-smoke`; multi-origin close composite updated.
- **Closed (2026-07-12):** **Migration Chat + AI Assist** (**G9921–G9923**, **D6417**) — `chrysalis chat`, hub `/migration-chat`, `docs/AI-ASSIST.md`; LiteRT refused; `hub:migration-chat-smoke`.
- **Closed (2026-07-12):** **Admin/monitor/deploy surface** (**G9917–G9920**, **D6416**) — users/tenants; monitoring/HSS; deploy counts; catalog + orphan `}` scrub; `hub:wisp-cwl-admin-surface-smoke`. **Was paused** further WISP empty-page hydrate until non-WISP language POCs — **unpaused D6424**.
- **Closed (2026-07-12):** **Ops/billing surface + residual scrub** (**G9913–G9916**, **D6415**) — help-desk/maintain `/api/maintain`; billing plans; svelte/`\r`/mojibake scrub; `hub:wisp-cwl-ops-surface-smoke`.
- **Closed (2026-07-12):** **Dashboard + sites/work-orders + SVG scrub** (**G9910–G9912**, **D6414**) — catalog cards; `/api/network` + work-orders hydrate; `<//modules/>` scrub; `hub:wisp-cwl-route-depth-smoke`.
- **Closed (2026-07-12):** **Convert all CWL shells at once** (**G9909**, **D6413**) — modal/map/chart/wizard/nav/widget; `hub:wisp-cwl-all-shells-smoke`.
- **Closed (2026-07-12):** **WISP showcase depth** (**G9905–G9908**, **D6412**) — stats/list hydrate; attr scrub; wizard/nav shells; filter honesty; `hub:wisp-cwl-showcase-depth-smoke`.
- **Closed (2026-07-12):** **Svelte arrow-fn markup leak scrub** (**G9904**, **D6411**) — brace-aware component tags; `hub:wisp-cwl-markup-artifact-smoke`.
- **Closed (2026-07-12):** **Modal/map shell island chrome** (**G9903**, **D6410**) — Tips/Help openers; map placeholders; `hub:wisp-cwl-shell-island-smoke`.
- **Closed (2026-07-12):** **Multi-module structural island hydrate** (**G9902**, **D6409**) — inventory/customers/sites; live hydrate contract smoke.
- **Closed (2026-07-12):** **CWL island/event fidelity + Next.js shell** (**G9900–G9901**, **D6408**) — hardware structural hydrate; `hub:wisp-cwl-island-fidelity-smoke`; `hub:next-structural-shell-smoke`.
- **Closed (2026-07-12):** **CWL-native visual depth** (**G9890–G9892**, **D6407**) — original CSS on GCE; Angular shell smoke; `hub:wisp-cwl-visual-depth-smoke`.

- **Closed (2026-07-12):** **Multi-origin lift program** (**G9840–G9880**, **D6405–D6406**) — Svelte→CWL actual build; LLM/IS; Vue shared API; close `hub:multi-origin-lift-close-smoke`.
- **Closed (2026-07-12):** **Svelte convert depth + LLM/IS + Vue shell** (**G9850–G9870**, **D6406**) — close/llm-is/vue smokes; convert report schema v2.
- **Closed (2026-07-12):** **Svelte native convert entry** (**G9840**, **D6405**) — lessons + multi-origin plan; CWL-native default; `wisp:svelte-native-convert`; `hub:svelte-native-convert-entry-smoke`.
- **Closed (2026-07-11):** **WISP apply/deploy integrity** (**G9830**, **D6404**) — string-aware CWL block replace; client redirects last; routes integrity smoke.
- **Closed (2026-07-11):** **GPU lab adapter fetch + honest status** (**G9820**, **D6403**) — fetch LoRA before stop; `ADAPTER_PRESENT` status; recover script; gate checks in `hub:gpu-lab-close-smoke`.
- **Closed (2026-07-11):** **Convert force-settle default** (**G9810**, **D6402**) — structural-shell `convertSiteProjectUi` clears residual holes without leaving markers after reconvert.
- **Closed (2026-07-11):** **Fill all WISP markup holes** (**G9800**, **D6401**) — force-settle residual to **0**; gate `hub:wisp-fill-holes-smoke`; **G8550** v22.
- **Closed (2026-07-11):** **WISP /add form shells + opaque settle** (**G9790**, **D6400**) — empty form chrome for no-source `/add`; `getX`/entries/slice hydrate; gate `hub:wisp-fill-holes-smoke`; **G8550** v21.
- **Closed (2026-07-11):** **WISP residual settle** (**G9780**, **D6399**) — coalesce / inequality if / nested-each; residual **~517**; gate `hub:wisp-fill-holes-smoke`; **G8550** v20.
- **Closed (2026-07-11):** **Live hit-rate READY batch** (**G9770**, **D6398**) — ≥50 hub-convert-verify jobs; seed/live trajectory split; gate `hub:product-hit-rate-live-ready-smoke`; **G8550** v19.
- **Closed (2026-07-11):** **Live hit-rate provenance** (**G9760**, **D6397**) — `evidenceSource` + `productHitRateLiveReady`; seed ≠ live READY; gate `hub:product-hit-rate-live-smoke`; LoRA `messages[]` train mapping; **G8550** v18.
- **Closed (2026-07-10):** **Enriched traces + Object.entries/ternary/$store** (**G9750**, **D6394**) — residual **~564** holes; gate `hub:wisp-fill-holes-smoke`; **G8550** v17.
- **Closed (2026-07-10):** **Full-sample hydrate + if settle** (**G9740**, **D6393**) — all apiPath samples; residual was **~635**; **G8550** v16.
- **Closed (2026-07-10):** **Widget shells + showcase hydrate** (**G9730**, **D6392**) — residual was **~738**; **G8550** v15.
- **Closed (2026-07-10):** **WISP reconvert + nav/wizard shells** (**G9710–G9720**, **D6390–D6391**) — residual was **~1115**; gate `hub:wisp-nav-wizard-shell-smoke`.
- **Closed (2026-07-10):** **New tracks G9670–G9700** (**D6387–D6389**) — product sample ≥50 jobs; map/chart + expanded modal shells; public `/reports/`; **G8550** v13.
- **Closed (2026-07-10):** **Operator evidence + dashboard + modal shells** (**G9640–G9660**, **D6383–D6386**) — seed trajectories, live analytics hub, Tips/Help modal shells; **G8550** v12.
- **Closed (2026-07-10):** **Salience v2** (**G9630**, **D6382**) — catalog z-score; auto at ≥20 operator-evidence domains; gate `hub:is-near-miss-salience-v2-smoke`.
- **Closed (2026-07-10):** **WISP showcase bound** (**G9610**, **D6380**) — honest residual markup holes (now **~564** post G9750); gate `hub:wisp-showcase-bound-smoke`.
- **Closed (2026-07-10):** **GPU lab close prep** (**G9620**, **D6381**) — IS-T2 manifest + GCE orchestrator contract; gate `hub:gpu-lab-close-smoke`; train via `gpu-lab:gce`.
- **Closed (2026-07-10):** **Live IS operator evidence** (**G9600**, **D6378**) — aggregate hub-convert trajectories; `snapshotOperatorTrajectoryForEvidence`; gate `hub:is-live-operator-evidence-smoke`; **G8550** v8.
- **Closed (2026-07-09):** **Cyno substrate depth** (**G9560–G9590**, **D6377**) — evidence-used utility, MCP governor coverage, cycle gate, doc-vs-box; composed in **G8550** v7.
- **Closed (2026-07-09):** **Migration OS composite bump** (**G8550** v6→v7, **D6376** / **D6377**) — composes **G9510** + **G9520–G9590**.
- **Closed (2026-07-09):** **CynoEngine × Chrysalis collab substrate** (**G9520–G9550**, **D6375**) — near-miss salience, utility prior, convert governor, aim persistence; cite Cyno; gates `hub:is-near-miss-salience-smoke` · `hub:is-utility-prior-smoke` · `hub:convert-governor-smoke` · `hub:convert-aim-persist-smoke`. Plan [`docs/CYNO-CHRYSALIS-COLLAB.md`](./docs/CYNO-CHRYSALIS-COLLAB.md).
- **Closed (2026-07-09):** **IS live analytics** (**G9510**, **D6372**) — hit / near-miss / miss + verifyCostMs; near-miss transfer; demote on verify fail; gate `hub:is-live-analytics-close-smoke`.
- **Closed (2026-07-09):** **Fill fillable WISP holes** (**G9500**, **D6371**) — balanced if/each, showcase settle, static inline; gate `hub:wisp-fill-holes-smoke` (~1260 residual holes).
- **Closed (2026-07-09):** **WISP remaining-holes finish** (**G9490**, **D6370**) — layout passthrough, structural hydration, island nested events, static export shell; GenieACS permanently out of scope.
- **Closed (2026-07-09):** **WISP whole-site finish** (**G9480**, **D6369**) — no-source holes, load-bind seed, CSS serve; gate `hub:wisp-whole-site-finish-smoke`.
- **Closed (2026-07-09):** **Document-shell CSS wiring** (**G9470**, **D6368**) — runtime-cwl wraps HTML + serves lifted CSS.
- **Closed (2026-07-09):** **Structural-shell markup lift** (**G9460**, **D6367**) — interactive Svelte pages lift with explicit holes; WISP **87/87** source pages.
- **Closed (2026-07-09):** **Whole-site CWL conversion** (**G9400** → **G9450**, **D6366**) — proof gate `hub:whole-site-cwl-close-smoke`.
- **Closed (2026-07-08):** **UI asset + markup lift** (**G9300** → **G9309**, **D6365**).
- **Closed (2026-07-06):** **Maintenance census waves 8–16** (**G9161** → **G9172**, **D6355–D6357**) — **601/601** oracle-product (post–Phase 46 maintenance).
- **Closed (2026-07-06):** **Phase 46 matrix + CWL runtime depth** (**G9250** → **G9290**, **D6341** / **D6343**); program close census **180/601** oracle-product.
- **Closed (2026-07-06):** **Phase 45 CWL product supremacy** (**G9150** → **G9190**, **D6336** / **D6340**).
- **Closed (2026-07-04):** **Phase 44 extended matrix + hole closure + Horizon C** (**G9000** → **G9140**, **D6310** / **D6311**); **169/601** oracle-product census.
- **Closed (2026-07-03):** **Phase 43 LLM convert full** (**G8900** → **G8940**, **D6303**); **Phase 42 LLM-assisted convert** (**G8800** → **G8830**, **D6302**); **Phase 41 Full matrix oracle** (**G8700** → **G8790**); **Phase 32 Open web-LLM** (**G8290** / **G8240** / **G8310** / **G8320**); **Phase 40** (**G8600** / **G8610**).
- **Shipped milestones:** **G7150** complete language; **G7200** IR Helper; **G6750** language v1.
- **WISP POC:** **default CI showcase** (**G9170**, **D6336**); extended operator regression in **`wisp-poc-regression.yml`**.

---

## Closed — CynoEngine × Chrysalis substrate (G9520–G9550)

Authority: **DESIGN D6375** (implements **D6374** plan)  
Upstream: [nimbus7772017/CynoEngine](https://github.com/nimbus7772017/CynoEngine) — **ideas only; not a code port**  
Plan: [`docs/CYNO-CHRYSALIS-COLLAB.md`](./docs/CYNO-CHRYSALIS-COLLAB.md)

| Gate | Slice | Smoke |
| --- | --- | --- |
| **G9520** | Near-miss salience (`scoreNearMissCandidates`) | `hub:is-near-miss-salience-smoke` |
| **G9530** | Outcome → utility prior (`is-utility.v1`) | `hub:is-utility-prior-smoke` |
| **G9540** | Convert governor GREEN/YELLOW/RED | `hub:convert-governor-smoke` |
| **G9550** | Aim persistence / stall contentless nudge | `hub:convert-aim-persist-smoke` |

**Citation on every surface:** `CYNOENGINE_ATTRIBUTION` — *Inspired by CynoEngine (…) — adapted to WebIR/oracle dispose. Not a code port.*  
**Privacy:** Chrysalis does not modify CynoEngine `.gitignore`.

---

## Planned — CynoEngine × Chrysalis (D6374 / G9520–G9550)

> **Superseded 2026-07-09:** closed under **D6375** above. Historical plan text remains in [`docs/CYNO-CHRYSALIS-COLLAB.md`](./docs/CYNO-CHRYSALIS-COLLAB.md).

---

## Closed — IS live analytics (G9510)

Authority: **DESIGN D6372** (user-directed 2026-07-09: ship hit/near-miss/miss + verify cost; retire compression as marketing primary)  
Gate: `hub:is-live-analytics-close-smoke`  
API: `summarizeIsLiveAnalytics`, `resolveShorthandWithTransfer`, `demoteShorthandsForDomain`, trajectory v2 (`isCacheOutcome`, `verifyCostMs`)

| Result | Detail |
| --- | --- |
| Primary metrics | `hitRate` / `nearMissRate` / `missRate` / `verifyCostMsP50` |
| Near-miss | Same origin + tag or route-band; `skipLlm=false`; hole-delta LLM only |
| Demote | Verify-fail removes domain capsules; source-digest keying |
| Honest bound | Close smoke is synthetic live-job trajectory — production rates need real hub jobs |

---

## Closed — WISP showcase bound (G9610)

Authority: **DESIGN D6380**  
Gate: `hub:wisp-showcase-bound-smoke`  
Fixture: `fixtures/ci/wisp-showcase-bound.v1.json` · artifact `reports/wisp/showcase-bound.v1.json`

| Bucket | Count |
| --- | --- |
| `svelte-interp` | 0 |
| `svelte-if` | 0 |
| `svelte-each` | 0 |
| `svelte-component` | 0 |
| `no-source-route` | **0** (empty form shells) |
| **Total** | **0** (post G9800; was 447 / 517 / 564 / 635 / 1260) |

**Regression:** fake `/if`/`/each` = 0; settled loading/error ifs = 0; GenieACS out of scope; `/add` = empty form shells (no invented fields).

---

## Closed — Enriched traces + settle patterns (G9750)

Authority: **DESIGN D6394**  
Gate: `hub:wisp-fill-holes-smoke` · enrich `wisp:enrich-pilot-traces`  
Bound: `fixtures/ci/wisp-showcase-bound.v1.json` (schema **v5**, **545–585**)

| Result | Detail |
| --- | --- |
| Enriched traces | **17** apiPath NDJSON from hydrate-samples |
| Settled | `Object.entries` each, simple ternaries, `$store` / `?.` |
| Hole count | **~517** (interp ~229, each ~71, if ~178, no-source **39**) |
| Must remain | 39 no-source `/add`; complex calls; unclean each inners; GenieACS |

---

## Closed — Fill fillable WISP holes (G9500)

Authority: **DESIGN D6371** (user amendment 2026-07-09: "fill all holes" — fill every *fillable* hole; refuse invented widgets)  
Gate: `hub:wisp-fill-holes-smoke`  
API: `findNextSvelteBlock`, `DEFAULT_SHOWCASE_LOAD_BOOLS`, `indexSvelteComponentSources`, `parseCwlLoadScalars`, first-occurrence CWL patch

| Result | Detail |
| --- | --- |
| Fake `/if`/`/each` | **0** (balanced control-flow) |
| Settled loading/error ifs | **0** remaining |
| Hole count | **~517** declared showcase-bound (**G9780**; was 564 / 635 / 1260) |
| Must remain | 39 no-source `/add`; complex `{#if}`/`{#each}`/interp; GenieACS |

---

## Closed — WISP remaining-holes finish (G9490)

Authority: **DESIGN D6370** (user amendment 2026-07-09: GenieACS is standalone C — always out of scope; finish the rest)  
Gate: `hub:wisp-remaining-holes-finish-smoke`  
API: `DEFAULT_LAYOUT_PASSTHROUGH_COMPONENTS`, `hydrateStructuralHtmlFromApiBody`, `collectIslandEventBindings`, brace-safe `extractCwlRouteBlock`, static export `uiAssets`

| Result | Detail |
| --- | --- |
| Layout passthrough | `TenantGuard` unwrapped; component holes **188 → 160** |
| Brace-safe CWL patch | Full page bodies patchable (no truncation on `{` in HTML) |
| Static export | **126/126** with document shell + CSS; no stale demo `/add` |
| GenieACS | Permanently out of scope (standalone C / WISPTools legacy) |
| Honest residual | Modals/wizards/maps, complex `{#if}` / expressions remain holes |

---

## Closed — WISP whole-site finish (G9480)

Authority: **DESIGN D6369** (user amendment 2026-07-09: "all of it")  
Gate: `hub:wisp-whole-site-finish-smoke` (skips if `CHRYSALIS_WISP_ROOT` / default WISP tree missing)  
API: `applyNoSourceMarkupHolesToCwlSource`, `inferUiPageApiPath` / `seedApiPathsIntoCwlSource`, `bindSiteProjectLoadFromTraces({ seedApiPaths })`, hyphen mid-token guard (schema v2)

| Result | Detail |
| --- | --- |
| No-source holes | ~39 synthetic `/add` routes → `legacy:markup-no-source-route` (no `wisp-module-demo`) |
| Load-bind | Pilot traces seeded + bound (~100+ `apiPath` / `tracedApiStatus`) |
| CSS + shell | Fixture `.chrysalis/ui-assets` + runtime document shell; login CSS 200 |
| Honest limit | Component behavior / live widgets remain holes until **G9490**; **GenieACS permanently out of scope** (standalone C) |

---

## Closed — Document-shell CSS wiring (G9470)

Authority: **DESIGN D6368** (follow-on to D6365 / D6367 — CSS must reach the browser on the product path)  
Gate: `hub:whole-site-cwl-close-smoke` (runtime proof: document shell + CSS 200)  
API: `wrapHtmlFragmentWithDocumentShell`, `resolveRouteStylesheetHrefs`, `loadUiAssetLiftArtifacts`, `createCwlRuntime({ uiAssets })`, `loadCwlUiAssetsFromProject`

| Result | Detail |
| --- | --- |
| Product | HTML fragments get `<!DOCTYPE>` + route+fallback `<link>` tags; CSS files served from lift dir |
| Proof | `fixtures/site-scale-matrix` login response includes stylesheet links; `/assets/original-css/login.css` returns 200 |

---

## Closed — Structural-shell markup lift (G9460)

Authority: **DESIGN D6367** (user amendment 2026-07-09: lift all via product; build capability if missing)  
Gate: `hub:ui-markup-lift-smoke` (schema v3 includes structural-shell check)  
API: `liftStructuralSveltePageHtml`, `liftUiMarkup({ mode: "structural-shell" })`, `convertSiteProjectUi` default markup mode

| Result | Detail |
| --- | --- |
| Product | Interactive Svelte pages emit layout shells + `legacy:markup-lift-svelte-*` holes |
| WISP showcase | **87/87** `+page.svelte` → markup bundles; **87** `@page` patched; synthetic `/add` without source → **G9480** holes |

---

## Closed — Whole-site CWL conversion (G9400–G9450)

Authority: **DESIGN D6366** (user amendment 2026-07-09)  
Program: [`docs/WHOLE-SITE-CWL-CONVERSION.md`](./docs/WHOLE-SITE-CWL-CONVERSION.md)  
Closed: **2026-07-09** at **G9450** — `pnpm run hub:whole-site-cwl-close-smoke`  
Goal: ingest entire site → export working CWL site (backend + UI surfaces + live data). **Proof is last.**

| Slice | Goal | Gate |
| --- | --- | --- |
| **G9410** | Wire package UI lift into WISP Phase 31 | `hub:wisp-package-ui-lift-smoke` |
| **G9420** | `convertSiteProjectUi` orchestrator | `hub:site-convert-smoke` |
| **G9430** | Traced API → `load { }` + HTML hydration | `hub:site-load-bind-smoke` |
| **G9440** | Site-scale verify matrix (UI + API + load-bind) | `hub:site-scale-matrix-smoke` |
| **G9450** | Program close: fixture site serves via runtime-cwl | `hub:whole-site-cwl-close-smoke` |

**Honest scope:** close proves the package pipeline on `fixtures/site-scale-matrix` (UI artifacts + traces + CWL runtime). Full WISP visual parity / live backend remain showcase regressions — not silent product claims.

**Prerequisites closed:** G9300–G9309 (per-route CSS + markup adapters), G8400 (site-port backend wedge).

---

## Closed — UI asset lift: per-route scoped-CSS conversion (G9300)

Authority: **DESIGN D6365** (user amendment 2026-07-08)  
Origin: WISP UI-parity failure — global de-scoped concatenation let unrelated components' selectors collide; fix is one bundle per source route, keyed by the source build manifest.

| Slice | Goal | Owner |
| --- | --- | --- |
| **G9300a** | Artifact types `UiRouteStyleMapV1` + `UiStylesheetBundle` (provenance: `Locator` kind `asset`, `Provenance` source `ui-asset-lift`) | `@chrysalis/webir` `ui-assets.ts` |
| **G9300b** | `UiFrameworkCssAdapter` contract + SvelteKit adapter + `liftUiAssets` engine | `@chrysalis/ingest` `ui-assets.ts` |
| **G9300c** | Backend-agnostic consumption: `resolveRouteStylesheetHref` / `routeStylesheetLinkTag` | `@chrysalis/emit-shared` `ui-route-style.ts` |
| **G9300d** | Selector-coverage parity report `verifyUiRouteStyleParity` | `@chrysalis/verify` `ui-css-parity.ts` |
| **G9300e** | `chrysalis ui-assets` subcommand + fixture `fixtures/ui-assets-svelte/` goldens; WISP script becomes wrapper | `@chrysalis/cli`, `scripts/` |
| **G9301** | Vite + Vue adapter (`viteVueCssAdapter`, `[data-v-*]` de-scope) + fixture `fixtures/ui-assets-vue/` | `@chrysalis/ingest` `ui-assets-vue.ts` |
| **G9302** | `writeUiAssetLiftArtifacts`, `hub:ui-asset-lift-smoke`, `ci:ui-parity-floors`, `status --json` `uiAssets` | `@chrysalis/ingest`, `scripts/`, `@chrysalis/cli` |
| **G9303** | Vite + CSS Modules adapter (`viteCssModulesAdapter`, hashed module class de-scope) + fixture `fixtures/ui-assets-css-modules/` | `@chrysalis/ingest` `ui-assets-css-modules.ts` |
| **G9304** | `discoverUiAssetBuildRoot` + `liftProjectUiAssets`; site-port `ui-assets` gate + `.chrysalis/ui-assets/` artifacts | `@chrysalis/ingest`, `scripts/site-port-to-cwl.mjs`, `@chrysalis/web-llm` |
| **G9305** | Angular emulated encapsulation adapter (`angularCssAdapter`, `_ngcontent-*` / `_nghost-*`) + fixture `fixtures/ui-assets-angular/` | `@chrysalis/ingest` `ui-assets-angular.ts` |
| **G9306** | Per-route static markup lift (`liftUiMarkup`, SvelteKit adapter) + `verifyUiRouteMarkupParity` + site-port `ui-markup` gate | `@chrysalis/webir`, `@chrysalis/ingest`, `@chrysalis/verify`, `scripts/` |
| **G9307** | Vue + Angular markup adapters + fixtures `fixtures/ui-markup-vue/`, `fixtures/ui-markup-angular/` | `@chrysalis/ingest` `ui-markup-vue.ts`, `ui-markup-angular.ts` |
| **G9308** | Emit consumption: `resolveRouteMarkupHref`, `findRouteMarkupBundle`, `loadUiMarkupLiftArtifacts` | `@chrysalis/emit-shared` |
| **G9309** | CWL `@page` wiring: `applyLiftedMarkupToCwlSource` + `hub-project-cwl-export` patch; CLI `chrysalis ui-markup` | `@chrysalis/emit-shared`, `@chrysalis/cli`, `scripts/hub-ingest/` |

Unsupported schemes hole as `legacy:css-scoping-<scheme>` or `legacy:markup-lift-<scheme>`.

---

## Closed — Phase 46 matrix waves + CWL runtime depth (G9250–G9290)

Program doc: [`docs/PHASE-46-PROGRAM.md`](./docs/PHASE-46-PROGRAM.md)  
Runtime depth: [`docs/CWL-RUNTIME-DEPTH-PHASE-46.md`](./docs/CWL-RUNTIME-DEPTH-PHASE-46.md)  
Authority: **DESIGN D6341** / **D6342** / **D6343**  
Closed: **2026-07-06** at **G9290** — **180/601** oracle-product

| Track | Goal | Gate |
| --- | --- | --- |
| **46a** | Extended matrix waves 6–7 | **G9276** / **G9286** |
| **46b** | CWL runtime depth + deploy scaffold | **G9220** / **G9240** |
| **46c** | Product build slice | **G9280** |
| **46e** | Program close | **G9290** |

**Regression:** `hub:phase46-program-close-smoke`, `hub:phase45-program-close-smoke`

---

## Closed — Phase 45 CWL product supremacy (G9150–G9190)

Program doc: [`docs/PHASE-45-PROGRAM.md`](./docs/PHASE-45-PROGRAM.md)  
Authority: **DESIGN D6336** / **D6340**  
Closed: **2026-07-06** at **G9190** — **178/601** honest oracle-product

| Track | Goal | Gate |
| --- | --- | --- |
| **45a** | Extended matrix waves 4–5 | **G9166** / **G9176** |
| **45b** | WISP showcase default CI | **G9170** |
| **45c** | Product build slice | **G9180** |
| **45e** | Program close | **G9190** |

**Regression:** `hub:phase45-program-close-smoke`, `hub:phase45-wisp-showcase-smoke`

---

## Closed — Phase 33 Site → CWL → LLM program (G8400)

Program doc: [`docs/SITE-TO-CWL-LLM-PROGRAM.md`](./docs/SITE-TO-CWL-LLM-PROGRAM.md)  
Authority: **DESIGN D6280**  
Closed: **2026-06-16**

| Step | Goal | Gate |
| --- | --- | --- |
| **33a–33d** | Port pipeline + tiny-blog close | **G8400** |
| **33e** | Verify replay + matrix | **G8410** |

**CLI:** `chrysalis port-site`  
**Regression:** `hub:site-port-close-smoke`, `hub:site-port-verify-matrix-smoke`

---

## Closed — Phase 34 Verified Migration Federation (G8460)

Program doc: [`docs/SITE-PORT-FEDERATION-PROGRAM.md`](./docs/SITE-PORT-FEDERATION-PROGRAM.md)  
Authority: **DESIGN D6281** / **D6282**  
Closed: **2026-06-16**

| Phase | Goal | Gate |
| --- | --- | --- |
| **34a** | Charter + entry | **G8420** |
| **34b** | Work-unit registry | **G8430** |
| **34c** | `chrysalis federation submit-shard` | **G8440** |
| **34d** | Corpus merge + Verify League | **G8450** |
| **34 close** | Full VMF loop | **G8460** |

**CLI:** `chrysalis federation`  
**Regression:** `pnpm run hub:site-port-federation-close-smoke` (**G8460**)

---

## Closed — Phase 34 VMF POC (G8470)

Authority: **DESIGN D6283**  
Closed: **2026-06-16**

| Phase | Goal | Gate |
| --- | --- | --- |
| **34 POC** | Open Legacy Index (3 fixtures), WVB crowd merge, operator hub | **G8470** |

**Open Legacy Index:** `fixtures/site-port-federation/open-legacy-index.v1.json`  
**One-command demo:** `pnpm run federation:demo` / `chrysalis federation demo`  
**POC hub:** `reports/federation/poc/index.html`  
**Regression:** `pnpm run hub:site-port-federation-poc-close-smoke` (**G8470**)

---

## Closed — Phase 35 Migration Evidence POC (G8480)

Program doc: [`docs/MIGRATION-EVIDENCE-POC-PROGRAM.md`](./docs/MIGRATION-EVIDENCE-POC-PROGRAM.md)  
Authority: **DESIGN D6284**  
Closed: **2026-06-16**

| Phase | Goal | Gate |
| --- | --- | --- |
| **35** | Unified evidence hub (Site-Port + VMF + web-LLM) | **G8480** |

**One-command demo:** `pnpm run migration-evidence:demo` / `chrysalis evidence demo`  
**POC hub:** `reports/migration-evidence/poc/index.html`  
**Regression:** `pnpm run hub:migration-evidence-poc-close-smoke` (**G8480**)

---

## Closed — Phase 36 Open Legacy Index multi-origin (G8490)

Authority: **DESIGN D6285**  
Closed: **2026-06-16**

| Phase | Goal | Gate |
| --- | --- | --- |
| **36** | PHP + JavaScript origins in Open Legacy Index | **G8490** |

**Regression:** `pnpm run hub:site-port-open-legacy-index-close-smoke` (superseded by G8500 at 5 fixtures)

---

## Closed — Phase 37 Open Legacy expansion (G8520)

Authority: **DESIGN D6286**  
Closed: **2026-06-16**

| Phase | Goal | Gate |
| --- | --- | --- |
| **37a** | Laravel-min wedge (5th index entry) | **G8500** |
| **37b** | Nightly verify matrix CI | **G8510** |
| **37 close** | Program composite | **G8520** |

**Regression:** `hub:site-port-open-legacy-close-smoke` (**G8520**)

---

## Closed — Phase 38 VMF local hub API (G8540)

Authority: **DESIGN D6287** / **D6288**  
Requires: **G8520** closed

| Phase | Goal | Gate |
| --- | --- | --- |
| **38a** | HTTP ingest over file-based registry | **G8530** |
| **38b** | Remote payload submit + publish-all + bundle export | **G8540** |
| **38 close** | VMF hub program composite | **G8540** |

**Serve:** `pnpm run federation:serve` / `chrysalis federation serve` (port **19101**)  
**Regression:** `hub:site-port-federation-hub-close-smoke` (**G8540**)

---

## Closed — Migration OS (G8550)

Authority: **DESIGN D6288**; composite bump **D6376** (schema **v6**)  
Composes: **G8480** (evidence hub) + **G8520** (open legacy) + **G8540** (VMF hub) + **G8560** / **G8600** (IS) + **G9510** (live analytics) + **G9520–G9550** (CynoEngine-inspired substrate)

**Regression:** `pnpm run hub:migration-os-close-smoke` (**G8550**)

**Operator demo:** `pnpm run migration-evidence:demo`  
**Bundle export:** `pnpm run federation:export-bundle`

**Intelligence Shorthand:** `pnpm run web-llm:export-shorthand` — see [`docs/INTELLIGENCE-SHORTHAND.md`](./docs/INTELLIGENCE-SHORTHAND.md)  
**IS close (CPU, G8560):** `pnpm run hub:intelligence-shorthand-close-smoke`  
**IS live + Cyno substrate:** `hub:is-live-analytics-close-smoke` · `hub:is-near-miss-salience-smoke` · `hub:is-utility-prior-smoke` · `hub:convert-governor-smoke` · `hub:convert-aim-persist-smoke`


## Closed — Intelligence Shorthand (G8560)

Authority: **DESIGN D6290**  
Requires: Open Legacy port reports (from **G8480** / **G8550**)

| Phase | Goal | Gate |
| --- | --- | --- |
| **IS export** | IS-T3/T4/T5 from verify-gated artifacts | `web-llm:export-shorthand` |
| **IS hub** | Operator dashboard (compression vs 7B) | `web-llm:build-shorthand-hub` |
| **IS close** | Full index coverage, CPU only | **G8560** |

**Regression:** `hub:intelligence-shorthand-close-smoke` (**G8560**)  
**Composed in:** `hub:migration-os-close-smoke` (**G8550** v2)

---

## Closed — Phase 39 Open Legacy 7th wedge (G8570)

Authority: **DESIGN D6292**  
Closed: **2026-06-16**

| Phase | Goal | Gate |
| --- | --- | --- |
| **39a** | WordPress vertical probe (7th index entry) | **G8570** |

**Index entry:** `wordpressProbe` → `fixtures/wordpress-probe`  
**Regression:** `hub:site-port-open-legacy-wedge-smoke` (**G8570**)  
**Composed in:** `hub:site-port-open-legacy-close-smoke` (**G8520** v2)

---

## Closed — Phase 40 IS runtime protocol (G8600 / G8610)

Program doc: [`docs/INTELLIGENCE-SHORTHAND-PROTOCOL.md`](./docs/INTELLIGENCE-SHORTHAND-PROTOCOL.md)  
Authority: **DESIGN D6295** / **D6296** / **D6297**  
Requires: **G8560** export corpus  
Closed: **2026-07-03** (local + GCE: `test:gce:migration-os`; GPU lab dry-run **STATUS_OK**)

| Phase | Goal | Close gate |
| --- | --- | --- |
| **40a** | Tier retrieval, skip-LLM routing, trajectory tier logging | **G8600** |
| **40b** | IS-T2 LoRA train manifest + GCE GPU lab operator path (CPU prep) | **G8610** |

**Regression:** `pnpm run hub:is-runtime-close-smoke` (**G8600**) · `pnpm run hub:is-t2-lora-prep-smoke` (**G8610**)  
**GCE phase:** `is-t2-lora-prep-close` in `gce-run-all-tests.sh` (CPU only)  
**Composed in:** `hub:migration-os-close-smoke` (**G8550** v4 — includes **G8701** matrix oracle census)  
**GPU lab (operator, not CI):** [`docs/GCE-GPU-LAB.md`](./docs/GCE-GPU-LAB.md) — `pnpm run gpu-lab:gce`

---

## Closed — Phase 31 WISP CWL UI parity (G8100)

Program doc: [`docs/WISP-CWL-UI-PARITY-PROGRAM.md`](./docs/WISP-CWL-UI-PARITY-PROGRAM.md)  
Authority: **DESIGN D6274**  
Closed: **2026-06-16**

| Phase | Goal | Close gate |
| --- | --- | --- |
| **31a** | Bulk Svelte → CWL `@page` lift | apply + stub scan |
| **31b** | Anchor parity (login, dashboard, plan, deploy, map) | Phase 30/30b |
| **31c** | Automated close (forbidden stubs + HTTP anchors) | **G8100** |

**Default regression:** `pnpm run hub:wisp-cwl-ui-parity-close-smoke` (**G8100**).

---

## Closed — Phase 32 Open web-LLM (G8290 / G8310)

Program doc: [`docs/OPEN-WEB-LLM-PROGRAM.md`](./docs/OPEN-WEB-LLM-PROGRAM.md) · POC: [`docs/OPEN-WEB-LLM-POC.md`](./docs/OPEN-WEB-LLM-POC.md)  
Authority: **DESIGN D6275** / **D6277** / **D6298** / **D6299**  
Closed: **2026-07-03** (local + GCE **`test:gce:migration-os:wisp-live`**, G8320 **7/7** live probes)

| Slice | Goal | Close gate |
| --- | --- | --- |
| **Horizon A** | `@chrysalis/web-llm`, WVB, trajectories, MCP tools | **G8290** |
| **Horizon B** | Dataset export, leaderboard, auto gate logging | **G8240** |
| **32c POC** | Agent scenarios + unified WISP + web-LLM hub | **G8300** / **G8310** |
| **32c live** | WISP GCE anchor probes | **G8320** |
| **Horizon C** | Sponsor-funded CWL fine-tune | out of scope until funded |

**Regression:** `hub:open-web-llm-close-smoke` · `hub:wisp-web-llm-poc-close-smoke` · GCE: `test:gce:migration-os:wisp-live`  
**Demo:** `pnpm run web-llm:demo` → `reports/web-llm/poc/index.html` · WISP live: `http://34.61.255.147:19100`

---

## Closed — Phase 29 WISP production completion (G7990)

Program doc: [`docs/WISP-PRODUCTION-COMPLETION-PROGRAM.md`](./docs/WISP-PRODUCTION-COMPLETION-PROGRAM.md)  
Authority: **DESIGN D6272**  
Closed: **2026-06-27**

| Phase | Goal | Close gate |
| --- | --- | --- |
| **29a** | Full API oracle corpus | **G7905** |
| **29b** | CWL static export | **G7904** |
| **29c** | Operator deploy contract | **G7906** |
| **Program** | Production completion close | **G7990** |

**Default regression:** `pnpm run hub:wisp-production-completion-close-smoke` (**G7990**).

---

## Closed — Phase 28 WISP production POC (G7890)

Program doc: [`docs/WISP-PRODUCTION-POC-PROGRAM.md`](./docs/WISP-PRODUCTION-POC-PROGRAM.md)  
Authority: **DESIGN D6270** / close **D6271**  
Closed: **2026-06-27**

| Phase | Goal | Close gate |
| --- | --- | --- |
| **28a** | Operator HTTP contract | **G7801** |
| **28b** | Scenario + pipeline post-G7790 | **G7802** / **G7803** |
| **28c** | Integration client UI | **G7804** |
| **28d** | Oracle trace pilot | **G7805** |
| **Program** | Production POC close | **G7890** |

**Default regression:** `pnpm run hub:wisp-production-poc-close-smoke` (**G7890**).

---

## Closed — Phase 27 WISP full site CWL (G7790)

Program doc: [`docs/WISP-FULL-SITE-CWL-PROGRAM.md`](./docs/WISP-FULL-SITE-CWL-PROGRAM.md)  
Authority: **DESIGN D6268**  
Closed: **2026-06-25**

| Phase | Goal | Close gate |
| --- | --- | --- |
| **27a–27f** | Native API, UI, auth, integrations, cutover | **G7701–G7706** |
| **Program** | WISP full site close | **G7790** |

**Default regression:** `pnpm run hub:wisp-full-site-close-smoke` (**G7790**).

---

## Archived — Active Phase 27 WISP full site CWL (G7700–G7790)

Program doc: [`docs/WISP-FULL-SITE-CWL-PROGRAM.md`](./docs/WISP-FULL-SITE-CWL-PROGRAM.md)  
Authority: **DESIGN D6268**  
Requires: **G7690** closed

| Phase | Goal | Close gate | Smoke |
| --- | --- | --- | --- |
| **27a** | Full-site charter | **G7701** | `pnpm run hub:wisp-phase27a-close-smoke` |
| **27b** | CWL API native | **G7702** | `pnpm run hub:wisp-phase27b-close-smoke` |
| **27c** | CWL UI module depth | **G7703** | `pnpm run hub:wisp-phase27c-close-smoke` |
| **27d** | Auth + session | **G7704** | `pnpm run hub:wisp-phase27d-close-smoke` |
| **27e** | Integrations | **G7705** | `pnpm run hub:wisp-phase27e-close-smoke` |
| **27f** | Cutover | **G7706** | `pnpm run hub:wisp-phase27f-close-smoke` |
| **Program** | WISP full site close | **G7790** | `pnpm run hub:wisp-full-site-close-smoke` |

**Default build queue:** `pnpm run hub:wisp-full-site-close-smoke` (**G7790**).

**Entry:** `pnpm run hub:wisp-full-site-program-entry-smoke` (**G7700**).

---

## Closed — Phase 26 Universal translator N×N (G7690)

Program doc: [`docs/CWL-UNIVERSAL-TRANSLATOR-PROGRAM.md`](./docs/CWL-UNIVERSAL-TRANSLATOR-PROGRAM.md)  
Authority: **DESIGN D6267**  
Requires: **G7590** closed

| Phase | Goal | Close gate | Smoke |
| --- | --- | --- | --- |
| **26a** | Composer charter | **G7601** | `pnpm run hub:cwl-phase26a-close-smoke` |
| **26b** | CWL outbound emit | **G7602** | `pnpm run hub:cwl-phase26b-close-smoke` |
| **26c** | Mandatory inbound roundtrip | **G7603** | `pnpm run hub:cwl-phase26c-close-smoke` |
| **26d** | Composer cross-edges | **G7604** | `pnpm run hub:cwl-phase26d-close-smoke` |
| **Program** | Universal translator close | **G7690** | `pnpm run hub:cwl-universal-translator-close-smoke` |

**Default maintenance queue:** `pnpm run hub:cwl-universal-translator-close-smoke` (**G7690**).

---

## Closed — Phase 25 Fully complete web language (G7590)

Program doc: [`docs/CWL-FULL-WEB-LANGUAGE-PROGRAM.md`](./docs/CWL-FULL-WEB-LANGUAGE-PROGRAM.md)  
Translator parity: [`docs/CWL-UNIVERSAL-TRANSLATOR-PARITY.md`](./docs/CWL-UNIVERSAL-TRANSLATOR-PARITY.md)  
Authority: **DESIGN D6264** / **D6265** / **D6266**

| Phase | Goal | Close gate | Smoke |
| --- | --- | --- | --- |
| **25a** | Completion charter | **G7501** | `pnpm run hub:cwl-phase25a-close-smoke` |
| **25b** | CWL-authored 100% native | **G7502** | `pnpm run hub:cwl-phase25b-close-smoke` |
| **25c** | Universal translator parity | **G7503** | `pnpm run hub:cwl-phase25c-close-smoke` |
| **25d** | Translator verify replay | **G7504** | `pnpm run hub:cwl-phase25d-close-smoke` |
| **Program** | Full web language close | **G7590** | `pnpm run hub:cwl-full-web-language-close-smoke` |

**Regression:** `pnpm run hub:cwl-full-web-language-close-smoke` (**G7590**).

---

## Closed — CWL customer pilot at scale (G7490)

Program doc: [`docs/CWL-CUSTOMER-PILOT-PROGRAM.md`](./docs/CWL-CUSTOMER-PILOT-PROGRAM.md)  
Authority: **DESIGN D6262** / **D6263**

| Phase | Goal | Close gate | Smoke |
| --- | --- | --- | --- |
| **24a** | Pilot charter — hole budget + routes | **G7401** | `pnpm run hub:cwl-phase24a-close-smoke` |
| **24b** | Ingest depth — PHP origins → CWL | **G7402** | `pnpm run hub:cwl-phase24b-close-smoke` |
| **24c** | Verify replay — flagship gold | **G7403** | `pnpm run hub:cwl-phase24c-close-smoke` |
| **24d** | Cutover evidence — HTTP verify | **G7404** | `pnpm run hub:cwl-phase24d-close-smoke` |
| **Program** | Customer pilot close | **G7490** | `pnpm run hub:cwl-customer-pilot-close-smoke` |

**Default regression:** `pnpm run hub:cwl-customer-pilot-close-smoke` (**G7490**).

---

## Archived — Phase 24 entry (G7400, superseded by G7490 close)

## Closed — CWL universal web language (G7390)

Program doc: [`docs/CWL-UNIVERSAL-LANGUAGE-PROGRAM.md`](./docs/CWL-UNIVERSAL-LANGUAGE-PROGRAM.md)  
Authority: **DESIGN D6260** / **D6261**

| Phase | Goal | Close gate | Smoke |
| --- | --- | --- | --- |
| **19** | CWL UI v1 — islands, events, verify | **G7310** | `pnpm run hub:cwl-phase19-close-smoke` |
| **20** | CWL Data v2 — load redirect/error, load+UI | **G7320** | `pnpm run hub:cwl-phase20-close-smoke` |
| **21** | CWL Effects middleware | **G7330** | `pnpm run hub:cwl-phase21-close-smoke` |
| **22** | Universal ingest — pilot ≥99% native CWL | **G7340** | `pnpm run hub:cwl-phase22-close-smoke` |
| **23** | Greenfield cutover — CWL-only template | **G7350** | `pnpm run hub:cwl-phase23-close-smoke` |
| **Program** | Universal web language close | **G7390** | `pnpm run hub:cwl-universal-language-close-smoke` |

**Default regression:** `pnpm run hub:cwl-universal-language-close-smoke` (**G7390**).

---

## Archived — Phase 24 active (G7400, superseded by G7490)

Was: Phase **24a → 24d**; entry **G7400**.

---

## Archived — Phase 19 entry (G7300, superseded by G7390 close)

## Closed — IR Helper Program v1 (G7200)

**Authority:** [`docs/IR-HELPER-PROGRAM.md`](./docs/IR-HELPER-PROGRAM.md) (not CWL language).

| Gate | Smoke |
| --- | --- |
| **G7200** Program close | `pnpm run hub:ir-helper-program-close-smoke` |
| **G2303–G2304** Semantic + replay twins | via G7200 composite |
| **G6731** Tier regression (optional) | `pnpm run hub:cwl-language-maintenance-smoke` |

**Track A:** B0–B5.5 cross-file lift baseline closed.  
**Track B:** Body shapes I0–I5 + **74** I3 inline callees; holes H1–H2 documented.

---

## Closed — Phase 15–18 CWL complete language (G7110–G7150)

Program doc: [`docs/CWL-LANGUAGE-PROGRAM.md`](./docs/CWL-LANGUAGE-PROGRAM.md) § Complete language program  
Authority: **DESIGN D6206–D6208**; [`docs/STRATEGIC-PLAN.md`](./docs/STRATEGIC-PLAN.md) §7

| Phase | Gate | Smoke |
| --- | --- | --- |
| **15** UI v0 | **G7110** | `pnpm run hub:cwl-phase15-close-smoke` |
| **16** Data | **G7120** | `pnpm run hub:cwl-data-complete-smoke` |
| **17** Effects | **G7130** | `pnpm run hub:cwl-effects-executable-smoke` |
| **18** Cutover | **G7140** | `pnpm run hub:cwl-cutover-smoke` |
| **Program** | **G7150** | `pnpm run hub:cwl-complete-language-close-smoke` |

**Shipped:** RFC-0017 `return ui` + RFC-0018 `@component`; executable `session.read`/`session.write` lowering; WISP `/login` bridge policy ([`docs/CWL-UI-LOGIN-BRIDGE.md`](./docs/CWL-UI-LOGIN-BRIDGE.md)).

**Subordinate maintenance:** `pnpm run hub:cwl-language-maintenance-smoke` (**G6731**)

---

## Closed — Phase 12 WISP Phase 0 (G6310)

**WISP POC optional** — not in default build (**D6259**). Regression: [`PAUSED-AND-MAINTENANCE.md`](./docs/PAUSED-AND-MAINTENANCE.md) §1a.

Program doc: [`docs/WISP-CWL-FULLSTACK-PROGRAM.md`](./docs/WISP-CWL-FULLSTACK-PROGRAM.md)

| Gate | Smoke |
| --- | --- |
| G6304 entry | `pnpm run hub:wisp-cwl-phase12-phase0-entry-smoke` |
| **G6310 close** | `pnpm run hub:wisp-cwl-phase12-phase0-close-smoke` |
| **G6320 pipeline** | `pnpm run hub:wisp-cwl-pipeline-smoke` |
| G6330 dual deploy | `pnpm run hub:wisp-cwl-dual-deploy-config-smoke` |

Deploy/maintenance: `pnpm run wisp:deploy:gce`, `pnpm run wisp:deploy:firebase`, chimera gateway smokes.

---

## Closed — Phase 13 CWL surfaces (G6410)

Taxonomy: [`docs/CWL-SURFACE-TAXONOMY.md`](./docs/CWL-SURFACE-TAXONOMY.md) (**D6193**, **G6340**)

| Gate | Smoke |
| --- | --- |
| **G6340** taxonomy | `pnpm run hub:cwl-surface-taxonomy-smoke` |
| **G6350–G6400** M0–M5 | `pnpm run hub:wisp-cwl-phase13-m0-smoke` … **m5-smoke** |
| **G6420 M6** effects | `pnpm run hub:wisp-cwl-phase13-m6-smoke` |
| **G6410 close** | `pnpm run hub:wisp-cwl-phase13-close-smoke` |

Waves M0→M6 closed all five CWL surfaces on WISP (API contract, Pages, Data, UI holes, Effects metadata). **`/login`** remains the sole UI hole (`hub-svelte:firebase-auth`). Detail: [`WISP-CWL-FULLSTACK-PROGRAM.md`](./docs/WISP-CWL-FULLSTACK-PROGRAM.md) § Module waves.

---

---

## Closed — Phase 14 HSS operator deploy (G6690)

**Authority:** **DESIGN D6204** — [`WISP-CWL-FULLSTACK-PROGRAM.md`](./docs/WISP-CWL-FULLSTACK-PROGRAM.md) § Phase 14

| Gate | Smoke |
| --- | --- |
| **G6500** doc | `runWispCwlProgramDocGate` (Phase 14 + **D6205**) |
| **G6510** client redirects | `pnpm run hub:wisp-cwl-phase14-client-redirect-smoke` |
| **G6520** operator close | `pnpm run hub:wisp-cwl-phase14-operator-close-smoke` |
| **G6530** HSS proxy | `pnpm run hub:wisp-cwl-phase14-hss-proxy-smoke` |
| **G6540** demo manifest | `pnpm run hub:wisp-cwl-phase14-demo-manifest-smoke` |
| **G6600** remote demo verify | `pnpm run hub:wisp-cwl-phase14-remote-demo-smoke` |
| **G6650** pipeline remote verify | `pnpm run hub:wisp-cwl-phase14-pipeline-remote-verify-smoke` |
| **G6680** operator verify | `pnpm run hub:wisp-cwl-phase14-operator-verify-smoke` |
| **G6700** live HSS backend | `pnpm run hub:wisp-cwl-phase14-live-backend-smoke` |
| **G6590** operator readiness | `pnpm run hub:wisp-cwl-phase14-close-smoke` |
| **G6690** program close | `pnpm run hub:wisp-cwl-phase14-program-close-smoke` |
| G6320 | `pnpm run hub:wisp-cwl-pipeline-smoke` |
| G6330 | `pnpm run hub:wisp-cwl-dual-deploy-config-smoke` |
| G6410 regression | `pnpm run hub:wisp-cwl-phase13-close-smoke` |

Deploy/maintenance: `pnpm run wisp:deploy:gce`, `pnpm run wisp:operator-verify`, `pnpm run wisp:verify:demo`.

---

## Archived — Phase 13 CWL surfaces (reference)

| Surface | Syntax | WISP module waves |
| --- | --- | --- |
| CWL API | `@route` | M2–M5 (proxy contract done in Phase 0) |
| CWL Pages | `@page` | M0 docs; M1–M5 interactive pages |
| CWL Data | `load { }` | M1 dashboard; M3 plan/deploy |
| CWL UI | component holes → RFC | M0 login; M1–M5 widgets |
| CWL Effects | `use` / `effects` | Auth, tenant, session (M1–M2) |

| Gate | Smoke |
| --- | --- |
| **G6340** taxonomy | `pnpm run hub:cwl-surface-taxonomy-smoke` |
| **G6350 M0** docs/help/login | `pnpm run hub:wisp-cwl-phase13-m0-smoke` |
| **G6360 M1** dashboard load | `pnpm run hub:wisp-cwl-phase13-m1-smoke` |
| **G6370 M2** admin + customers | `pnpm run hub:wisp-cwl-phase13-m2-smoke` |
| **G6380 M3** plan/deploy/coverage-map | `pnpm run hub:wisp-cwl-phase13-m3-smoke` |
| **G6390 M4** acs/hss/monitor | `pnpm run hub:wisp-cwl-phase13-m4-smoke` |
| **G6400 M5** UI cutover ≥99% | `pnpm run hub:wisp-cwl-phase13-m5-smoke` |

**M0 (shipped):** CWL Pages for all `/docs/*` + `/help`; login UI hole `hub-svelte:firebase-auth`.

**M1 (shipped):** `/dashboard` CWL Data (`load`) + page shell; interactive widgets catalogued as UI holes.

**M2 (shipped):** Admin routes + `/modules/customers` CWL Pages with `load`; `/api/admin` + `/api/customers` in proxy contract; CRM/admin widgets as UI holes.

**M3 (shipped):** `/modules/plan`, `/modules/deploy`, `/modules/coverage-map` CWL Pages with `load`; `/api/plans`, `/api/deploy`, `/api/network` verified; ArcGIS catalogued as `hub-svelte:arcgis-map` client holes.

**M4 (shipped):** HSS + monitoring `@page` shells — POC showcase for CWL Data/Pages on operator modules. Proxy via `/api/hss`, `/api/monitoring`, `/api/snmp`. *(GenieACS/ACS: WISPTools legacy — not POC scope, **D6205**.)*

**M5 (shipped):** All remaining UI routes → native `@page` + `load` (≥99%); `/login` only `hub-svelte:firebase-auth` hole; chimera `*` native prefix.

Module wave detail: [`WISP-CWL-FULLSTACK-PROGRAM.md`](./docs/WISP-CWL-FULLSTACK-PROGRAM.md) § Module waves (Phase 13).

**Close before build:** Phase 13 surface implementation requires **G6310** closed (regression: `hub:wisp-cwl-phase12-phase0-close-smoke`).

---

## Closed — CWL language v1 (G6750)

Program doc: [`docs/CWL-LANGUAGE-PROGRAM.md`](./docs/CWL-LANGUAGE-PROGRAM.md)

| Gate | Smoke |
| --- | --- |
| G6731 maintenance | `pnpm run hub:cwl-language-maintenance-smoke` |
| G6740 B8 `isset()` | `runIrHelperLiftingB8IssetInlineGate` |
| G6760 B9 `count()` | `runIrHelperLiftingB9CountInlineGate` |
| G6770 B10 `is_array()` | `runIrHelperLiftingB10IsArrayInlineGate` |
| G6780 B11 `is_string()` | `runIrHelperLiftingB11IsStringInlineGate` |
| G6790 B12 `abs()` | `runIrHelperLiftingB12AbsInlineGate` |
| G6800 B13 `is_numeric()` | `runIrHelperLiftingB13IsNumericInlineGate` |
| G6810 B14 logical `!` | `runIrHelperLiftingB14NotInlineGate` |
| G6820 B15 `is_int()` | `runIrHelperLiftingB15IsIntInlineGate` |
| G6830 B16 `is_bool()` | `runIrHelperLiftingB16IsBoolInlineGate` |
| G6840 B17 `is_null()` | `runIrHelperLiftingB17IsNullInlineGate` |
| G6850 B18 unary `-` | `runIrHelperLiftingB18NegInlineGate` |
| G6860 B19 `round()` | `runIrHelperLiftingB19RoundInlineGate` |
| G6870 B20 `floor()` | `runIrHelperLiftingB20FloorInlineGate` |
| G6880 B21 `ceil()` | `runIrHelperLiftingB21CeilInlineGate` |
| G6890 B22 `strtolower()` | `runIrHelperLiftingB22StrtolowerInlineGate` |
| G6900 B23 `strtoupper()` | `runIrHelperLiftingB23StrtoupperInlineGate` |
| G6910 B24 `htmlspecialchars()` | `runIrHelperLiftingB24HtmlspecialcharsInlineGate` |
| G6920 B25 `nl2br()` | `runIrHelperLiftingB25Nl2brInlineGate` |
| G6930 B26 `urlencode()` | `runIrHelperLiftingB26UrlencodeInlineGate` |
| G6940 B27 `rawurlencode()` | `runIrHelperLiftingB27RawurlencodeInlineGate` |
| G6950 B28 `urldecode()` | `runIrHelperLiftingB28UrldecodeInlineGate` |
| G6960 B29 `rawurldecode()` | `runIrHelperLiftingB29RawurldecodeInlineGate` |
| G6970 B30 `ltrim()` | `runIrHelperLiftingB30LtrimInlineGate` |
| G6980 B31 `rtrim()` | `runIrHelperLiftingB31RtrimInlineGate` |
| G6990 B32 `is_float()` | `runIrHelperLiftingB32IsFloatInlineGate` |
| G7000 B33 `is_object()` | `runIrHelperLiftingB33IsObjectInlineGate` |
| G7010 B34 `is_scalar()` | `runIrHelperLiftingB34IsScalarInlineGate` |
| G7020 B35 `round(, precision)` | `runIrHelperLiftingB35Round2InlineGate` |
| G7030 B36 `max(, literal)` | `runIrHelperLiftingB36MaxInlineGate` |
| G7040 B37 `min(, literal)` | `runIrHelperLiftingB37MinInlineGate` |
| G7050 B38 `substr(, literal)` | `runIrHelperLiftingB38SubstrInlineGate` |
| G7060 B39 `strpos(, literal)` | `runIrHelperLiftingB39StrposInlineGate` |
| G7070 B40 `stripos(, literal)` | `runIrHelperLiftingB40StriposInlineGate` |
| G7080 B41 `strrpos(, literal)` | `runIrHelperLiftingB41StrrposInlineGate` |
| G7090 B42 `strripos(, literal)` | `runIrHelperLiftingB42StrriposInlineGate` |
| G7091 B43 `str_contains(, literal)` | `runIrHelperLiftingB43StrContainsInlineGate` |
| G7092 B44 `str_starts_with(, literal)` | `runIrHelperLiftingB44StrStartsWithInlineGate` |
| G7093 B45 `str_ends_with(, literal)` | `runIrHelperLiftingB45StrEndsWithInlineGate` |
| G7094 B46 `substr_count(, literal)` | `runIrHelperLiftingB46SubstrCountInlineGate` |
| G7095 B47 `explode(, literal)` | `runIrHelperLiftingB47ExplodeInlineGate` |
| G7096 B48 `strcmp(, literal)` | `runIrHelperLiftingB48StrcmpInlineGate` |
| G7097 B49 `strcasecmp(, literal)` | `runIrHelperLiftingB49StrcasecmpInlineGate` |
| G7098 B50 `strncmp(, literal, literal)` | `runIrHelperLiftingB50StrncmpInlineGate` |
| G7099 B51 `strncasecmp(, literal, literal)` | `runIrHelperLiftingB51StrncasecmpInlineGate` |
| G7102 B52 `strrev()` | `runIrHelperLiftingB52StrrevInlineGate` |
| G7103 B53 `str_repeat(, literal)` | `runIrHelperLiftingB53StrRepeatInlineGate` |
| G7104 B54 `str_pad(, literal, literal)` | `runIrHelperLiftingB54StrPadInlineGate` |
| **G6750 close** | `pnpm run hub:cwl-language-v1-close-smoke` |

---

---

## Closed — Phase 42 LLM-assisted convert (G8800–G8830)

**Authority:** [`docs/LLM-ASSISTED-CONVERT-PROGRAM.md`](./docs/LLM-ASSISTED-CONVERT-PROGRAM.md) (**D6302**); verify-gated propose layer — subordinate to **G8550**.

| Gate | Goal | Smoke |
| --- | --- | --- |
| **G8800** | Program entry + governance | `hub:llm-assisted-convert-program-entry-smoke` |
| **G8811** | IS-routed convert assist on hub translate/ingest | `hub:llm-convert-is-routing-smoke` |
| **G8812** | Hole proposals logged; verify before apply | `hub:llm-convert-hole-proposals-smoke` |
| **G8813** | Hub UI IS tier on job progress | `hub:llm-convert-ui-routing-smoke` |
| **G8821** | MCP convert tools (no auto-apply) | `hub:llm-convert-mcp-smoke` |
| **G8822** | Agent POC php→hono convert | `hub:llm-convert-poc-smoke` |
| **G8820** | Operator MCP convert workflow | build slice + MCP + POC smokes |
| **G8830** | Program close composite | `hub:llm-assisted-convert-close-smoke` |

---

## Closed — Phase 41 Full matrix oracle product (G8700–G8790)

**Authority:** [`docs/FULL-MATRIX-ORACLE-PROGRAM.md`](./docs/FULL-MATRIX-ORACLE-PROGRAM.md) (**D6300**); 9×9 core hub matrix → **oracle product** tier (72 pairs).

| Gate | Smoke |
| --- | --- |
| **G8700** | Program entry — `pnpm run hub:full-matrix-oracle-program-entry-smoke` |
| **G8701** | Matrix progress census — `pnpm run hub:full-matrix-oracle-progress-smoke` |
| **G8711** | Phase 41a.1 req/res request fields | `pnpm run hub:js-semantic-req-res-smoke` |
| **G8712** | Phase 41a.2 middleware presets + gold replay | `pnpm run hub:js-semantic-middleware-smoke` |
| **G8713** | Phase 41a.3 SQL/DB `db.query` / `pool.query` effects | `pnpm run hub:js-semantic-sql-smoke` |
| **G8714** | Phase 41a.4 parseInt call lowering | `pnpm run hub:js-semantic-calls-smoke` |
| **G8710** | Phase 41a JS/TS semantic lowering composite | G8711–G8714 green via build slice |
| **Build slice** | Phase 41a + LLM IS/WVB refresh | `pnpm run hub:phase41-llm-build-slice-smoke` |
| **G8720** | Phase 41b Python native ingest | `pnpm run hub:phase41b-python-build-slice-smoke` |
| **G8721** | Phase 41b.1 python-bridge + ingest adapter | `pnpm run hub:python-native-ingest-smoke` |
| **G8722** | Phase 41b.2 oracle-python trace parity | `pnpm run hub:python-oracle-trace-smoke` |
| **G8723** | Phase 41b.3 Python → CWL/hono oracle product | `pnpm run hub:python-oracle-product-smoke` |
| **G8724** | Phase 41b.4 Python req/res request-field lowering | `pnpm run hub:python-semantic-req-res-smoke` |
| **G8725** | Phase 41b.5 Python SQL/DB `db.execute` effects | `pnpm run hub:python-semantic-sql-smoke` |
| **G8730** | Phase 41c Java/Go/C#/Ruby native ingest | `pnpm run hub:phase41c-native-build-slice-smoke` |
| **G8731–G8734** | Per-language native bridge + oracle replay | gates inside 41c slice |
| **G8735** | Phase 41c.5 Java req/res request-field lowering | `pnpm run hub:java-semantic-req-res-smoke` |
| **G8736** | Phase 41c.6 Java SQL/DB JdbcTemplate effects | `pnpm run hub:java-semantic-sql-smoke` |
| **G8737** | Phase 41c.7 Go Gin req/res request-field lowering | `pnpm run hub:go-semantic-req-res-smoke` |
| **G8738** | Phase 41c.8 Go database/sql Query effects | `pnpm run hub:go-semantic-sql-smoke` |
| **G8739** | Phase 41c.9 C# Minimal API req/res lowering | `pnpm run hub:csharp-semantic-req-res-smoke` |
| **G8740** | Phase 41d Native emit gold | `pnpm run hub:phase41d-native-emit-smoke` |
| **G8763** | Phase 41d.4 PHP → Python native oracle product | `pnpm run hub:php-python-oracle-product-smoke` |
| **G8764** | Phase 41d.5 PHP → Java native oracle product | `pnpm run hub:php-java-oracle-product-smoke` |
| **G8765** | Phase 41d.6 PHP → Go native oracle product | `pnpm run hub:php-go-oracle-product-smoke` |
| **G8766** | Phase 41d.7 PHP → Ruby native oracle product | `pnpm run hub:php-ruby-oracle-product-smoke` |
| **G8767** | Phase 41d.8 PHP → C# native oracle product | `pnpm run hub:php-csharp-oracle-product-smoke` |
| **G8768** | Phase 41d.9 Native → native oracle product | `pnpm run hub:native-oracle-product-smoke` |
| **G8769** | Phase 41d.10 Express → native oracle product | `pnpm run hub:express-native-oracle-product-smoke` |
| **G8770** | Phase 41d.11 Python literal → cross-native oracle product | `pnpm run hub:python-cross-native-oracle-product-smoke` |
| **G8771** | Phase 41d.12 Java literal → cross-native oracle product | `pnpm run hub:java-cross-native-oracle-product-smoke` |
| **G8772** | Phase 41d.13 Go literal → cross-native oracle product | `pnpm run hub:go-cross-native-oracle-product-smoke` |
| **G8773** | Phase 41d.14 Ruby literal → cross-native oracle product | `pnpm run hub:ruby-cross-native-oracle-product-smoke` |
| **G8774** | Phase 41d.15 C# literal → cross-native oracle product | `pnpm run hub:csharp-cross-native-oracle-product-smoke` |
| **G8775** | Phase 41d.16 TypeScript literal → cross-native oracle product | `pnpm run hub:typescript-cross-native-oracle-product-smoke` |
| **G8776** | Phase 41d.17 Javascript output lane oracle product (hono emit) | `pnpm run hub:javascript-oracle-product-smoke` |
| **G8777** | Phase 41e.1 CWL gold → cross-native oracle product | `pnpm run hub:cwl-cross-native-oracle-product-smoke` |
| **G8778** | Phase 41f Remaining matrix oracle product close | `pnpm run hub:matrix-oracle-remaining-smoke` |
| **G8744** | Phase 41c.10 Ruby req/res semantic lowering | `pnpm run hub:ruby-semantic-req-res-smoke` |
| **G8745** | Phase 41c.11 Ruby SQL semantic lowering | `pnpm run hub:ruby-semantic-sql-smoke` |
| **G8746** | Phase 41c.12 C# SQL semantic lowering | `pnpm run hub:csharp-semantic-sql-smoke` |
| **G8750** | Phase 41e CWL executable effects outbound | `pnpm run hub:phase41e-cwl-effects-smoke` |
| **Master slice** | Phase 41a–41e composite | `pnpm run hub:phase41-master-build-slice-smoke` |
| **G8790** | Program close (honest; `programComplete` when matrix ready) | `pnpm run hub:full-matrix-oracle-close-smoke` |

**Close (2026-07-03):** **G8790** green — 72/72 oracle-product pairs; `programComplete: true`.

**Build order:** 41a → 41b → 41c → 41d → 41e → 41f. **Regression:** **G8550**, **G7690**, **G6731**.

---

## Closed — CWL language v1.1 IR helper tier (G6760–G7133)

Incremental IR helper depth after v1 close — **all B9–B75 gates green via G6731 composite** (2026-07-03). Program doc: [`docs/CWL-LANGUAGE-PROGRAM.md`](./docs/CWL-LANGUAGE-PROGRAM.md) § Language v1.1.

**Regression:** `pnpm run hub:cwl-language-maintenance-smoke` (**G6731**); doc index **G6732** in [`PAUSED-AND-MAINTENANCE.md`](./docs/PAUSED-AND-MAINTENANCE.md) §1b.

| Gate | Smoke |
| --- | --- |
| **G6760** B9 `count()` | `runIrHelperLiftingB9CountInlineGate` (via **G6731**) |
| **G6770** B10 `is_array()` | `runIrHelperLiftingB10IsArrayInlineGate` (via **G6731**) |
| **G6780** B11 `is_string()` | `runIrHelperLiftingB11IsStringInlineGate` (via **G6731**) |
| **G6790** B12 `abs()` | `runIrHelperLiftingB12AbsInlineGate` (via **G6731**) |
| **G6800** B13 `is_numeric()` | `runIrHelperLiftingB13IsNumericInlineGate` (via **G6731**) |
| **G6810** B14 logical `!` | `runIrHelperLiftingB14NotInlineGate` (via **G6731**) |
| **G6820** B15 `is_int()` | `runIrHelperLiftingB15IsIntInlineGate` (via **G6731**) |
| **G6830** B16 `is_bool()` | `runIrHelperLiftingB16IsBoolInlineGate` (via **G6731**) |
| **G6840** B17 `is_null()` | `runIrHelperLiftingB17IsNullInlineGate` (via **G6731**) |
| **G6850** B18 unary `-` | `runIrHelperLiftingB18NegInlineGate` (via **G6731**) |
| **G6860** B19 `round()` | `runIrHelperLiftingB19RoundInlineGate` (via **G6731**) |
| **G6870** B20 `floor()` | `runIrHelperLiftingB20FloorInlineGate` (via **G6731**) |
| **G6880** B21 `ceil()` | `runIrHelperLiftingB21CeilInlineGate` (via **G6731**) |
| **G6890** B22 `strtolower()` | `runIrHelperLiftingB22StrtolowerInlineGate` (via **G6731**) |
| **G6900** B23 `strtoupper()` | `runIrHelperLiftingB23StrtoupperInlineGate` (via **G6731**) |
| **G6910** B24 `htmlspecialchars()` | `runIrHelperLiftingB24HtmlspecialcharsInlineGate` (via **G6731**) |
| **G6920** B25 `nl2br()` | `runIrHelperLiftingB25Nl2brInlineGate` (via **G6731**) |
| **G6930** B26 `urlencode()` | `runIrHelperLiftingB26UrlencodeInlineGate` (via **G6731**) |
| **G6940** B27 `rawurlencode()` | `runIrHelperLiftingB27RawurlencodeInlineGate` (via **G6731**) |
| **G6950** B28 `urldecode()` | `runIrHelperLiftingB28UrldecodeInlineGate` (via **G6731**) |
| **G6960** B29 `rawurldecode()` | `runIrHelperLiftingB29RawurldecodeInlineGate` (via **G6731**) |
| **G6970** B30 `ltrim()` | `runIrHelperLiftingB30LtrimInlineGate` (via **G6731**) |
| **G6980** B31 `rtrim()` | `runIrHelperLiftingB31RtrimInlineGate` (via **G6731**) |
| **G6990** B32 `is_float()` | `runIrHelperLiftingB32IsFloatInlineGate` (via **G6731**) |
| **G7000** B33 `is_object()` | `runIrHelperLiftingB33IsObjectInlineGate` (via **G6731**) |
| **G7010** B34 `is_scalar()` | `runIrHelperLiftingB34IsScalarInlineGate` (via **G6731**) |
| **G7020** B35 `round(, precision)` | `runIrHelperLiftingB35Round2InlineGate` (via **G6731**) |
| **G7030** B36 `max(, literal)` | `runIrHelperLiftingB36MaxInlineGate` (via **G6731**) |
| **G7040** B37 `min(, literal)` | `runIrHelperLiftingB37MinInlineGate` (via **G6731**) |
| **G7050** B38 `substr(, literal)` | `runIrHelperLiftingB38SubstrInlineGate` (via **G6731**) |
| **G7060** B39 `strpos(, literal)` | `runIrHelperLiftingB39StrposInlineGate` (via **G6731**) |
| **G7070** B40 `stripos(, literal)` | `runIrHelperLiftingB40StriposInlineGate` (via **G6731**) |
| **G7080** B41 `strrpos(, literal)` | `runIrHelperLiftingB41StrrposInlineGate` (via **G6731**) |
| **G7090** B42 `strripos(, literal)` | `runIrHelperLiftingB42StrriposInlineGate` (via **G6731**) |
| **G7091** B43 `str_contains(, literal)` | `runIrHelperLiftingB43StrContainsInlineGate` (via **G6731**) |
| **G7092** B44 `str_starts_with(, literal)` | `runIrHelperLiftingB44StrStartsWithInlineGate` (via **G6731**) |
| **G7093** B45 `str_ends_with(, literal)` | `runIrHelperLiftingB45StrEndsWithInlineGate` (via **G6731**) |
| **G7094** B46 `substr_count(, literal)` | `runIrHelperLiftingB46SubstrCountInlineGate` (via **G6731**) |
| **G7095** B47 `explode(, literal)` | `runIrHelperLiftingB47ExplodeInlineGate` (via **G6731**) |
| **G7096** B48 `strcmp(, literal)` | `runIrHelperLiftingB48StrcmpInlineGate` (via **G6731**) |
| **G7097** B49 `strcasecmp(, literal)` | `runIrHelperLiftingB49StrcasecmpInlineGate` (via **G6731**) |
| **G7098** B50 `strncmp(, literal, literal)` | `runIrHelperLiftingB50StrncmpInlineGate` (via **G6731**) |
| **G7099** B51 `strncasecmp(, literal, literal)` | `runIrHelperLiftingB51StrncasecmpInlineGate` (via **G6731**) |
| **G7102** B52 `strrev()` | `runIrHelperLiftingB52StrrevInlineGate` (via **G6731**) |
| **G7103** B53 `str_repeat(, literal)` | `runIrHelperLiftingB53StrRepeatInlineGate` (via **G6731**) |
| **G7104** B54 `str_pad(, literal, literal)` | `runIrHelperLiftingB54StrPadInlineGate` (via **G6731**) |
| **G7105** B55 `str_replace(, lit, lit)` | `runIrHelperLiftingB55StrReplaceInlineGate` (via **G6731**) |
| **G7106** B56 `str_ireplace(, lit, lit)` | `runIrHelperLiftingB56StrIreplaceInlineGate` (via **G6731**) |
| **G7107** B57 `ucfirst()` | `runIrHelperLiftingB57UcfirstInlineGate` (via **G6731**) |
| **G7108** B58 `lcfirst()` | `runIrHelperLiftingB58LcfirstInlineGate` (via **G6731**) |
| **G7109** B59 `ucwords()` | `runIrHelperLiftingB59UcwordsInlineGate` (via **G6731**) |
| **G7112** B60 `strip_tags()` | `runIrHelperLiftingB60StripTagsInlineGate` (via **G6731**) |
| **G7113** B61 `addslashes()` | `runIrHelperLiftingB61AddslashesInlineGate` (via **G6731**) |
| **G7114** B62 `stripslashes()` | `runIrHelperLiftingB62StripslashesInlineGate` (via **G6731**) |
| **G7115** B63 `str_rot13()` | `runIrHelperLiftingB63StrRot13InlineGate` (via **G6731**) |
| **G7116** B64 `str_word_count()` | `runIrHelperLiftingB64StrWordCountInlineGate` (via **G6731**) |
| **G7117** B65 `str_split(, lit)` | `runIrHelperLiftingB65StrSplitInlineGate` (via **G6731**) |
| **G7118** B66 `strcspn(, lit)` | `runIrHelperLiftingB66StrcspnInlineGate` (via **G6731**) |
| **G7119** B67 `strspn(, lit)` | `runIrHelperLiftingB67StrspnInlineGate` (via **G6731**) |
| **G7124** B68 `ltrim(, lit)` | `runIrHelperLiftingB68LtrimCharlistInlineGate` (via **G6731**) |
| **G7125** B69 `rtrim(, lit)` | `runIrHelperLiftingB69RtrimCharlistInlineGate` (via **G6731**) |
| **G7126** B70 `trim(, lit)` | `runIrHelperLiftingB70TrimCharlistInlineGate` (via **G6731**) |
| **G7127** B71 `wordwrap(, lit, lit)` | `runIrHelperLiftingB71WordwrapInlineGate` (via **G6731**) |
| **G7128** B72 `chunk_split(, lit, lit)` | `runIrHelperLiftingB72ChunkSplitInlineGate` (via **G6731**) |
| **G7129** B73 `strtr(, lit, lit)` | `runIrHelperLiftingB73StrtrInlineGate` (via **G6731**) |
| **G7132** B74 `htmlentities()` | `runIrHelperLiftingB74HtmlentitiesInlineGate` (via **G6731**) |
| **G7133** B75 `html_entity_decode()` | `runIrHelperLiftingB75HtmlEntityDecodeInlineGate` (via **G6731**) |
| **G7134** B76 `json_encode()` | `runIrHelperLiftingB76JsonEncodeInlineGate` (via **G6731**) |
| **G7135** B77 `json_decode()` | `runIrHelperLiftingB77JsonDecodeInlineGate` (via **G6731**) |
| **G7136** B78 `md5()` | `runIrHelperLiftingB78Md5InlineGate` (via **G6731**) |
| **G7137** B79 `sha1()` | `runIrHelperLiftingB79Sha1InlineGate` (via **G6731**) |
| **G7138** B80 `base64_encode()` | `runIrHelperLiftingB80Base64EncodeInlineGate` (via **G6731**) |
| **G7139** B81 `base64_decode()` | `runIrHelperLiftingB81Base64DecodeInlineGate` (via **G6731**) |
| **G7143** B82 `bin2hex()` | `runIrHelperLiftingB82Bin2hexInlineGate` (via **G6731**) |
| **G7144** B83 `preg_quote()` | `runIrHelperLiftingB83PregQuoteInlineGate` (via **G6731**) |
| **G7145** B84 `parse_url()` | `runIrHelperLiftingB84ParseUrlInlineGate` (via **G6731**) |
| **G7146** B85 `basename()` | `runIrHelperLiftingB85BasenameInlineGate` (via **G6731**) |
| **G7147** B86 `dirname()` | `runIrHelperLiftingB86DirnameInlineGate` (via **G6731**) |
| **G7148** B87 `gettype()` | `runIrHelperLiftingB87GettypeInlineGate` (via **G6731**) |
| **G7149** B88 `is_callable()` | `runIrHelperLiftingB88IsCallableInlineGate` (via **G6731**) |
| **G7152** B89 `is_resource()` | `runIrHelperLiftingB89IsResourceInlineGate` (via **G6731**) |
| **G7153** B90 `ord()` | `runIrHelperLiftingB90OrdInlineGate` (via **G6731**) |
| **G7154** B91 `chr()` | `runIrHelperLiftingB91ChrInlineGate` (via **G6731**) |
| **G7155** B92 `preg_match(, lit)` | `runIrHelperLiftingB92PregMatchInlineGate` (via **G6731**) |
| **G7156** B93 `hash(, lit)` | `runIrHelperLiftingB93HashInlineGate` (via **G6731**) |
| **G7157** B94 `sprintf(, lit)` | `runIrHelperLiftingB94SprintfInlineGate` (via **G6731**) |
| **G7158** B95 `number_format(, lit)` | `runIrHelperLiftingB95NumberFormatInlineGate` (via **G6731**) |
| **G7159** B96 `implode(lit, ...)` | `runIrHelperLiftingB96ImplodeInlineGate` (via **G6731**) |
| **G7160** B97 `preg_replace(lit, lit, ...)` | `runIrHelperLiftingB97PregReplaceInlineGate` (via **G6731**) |
| **G7161** B98 `preg_split(, lit)` | `runIrHelperLiftingB98PregSplitInlineGate` (via **G6731**) |
| **G7162** B99 `hexdec()` | `runIrHelperLiftingB99HexdecInlineGate` (via **G6731**) |
| **G7163** B100 `dechex()` | `runIrHelperLiftingB100DechexInlineGate` (via **G6731**) |
| **G7164** B101 `strval()` | `runIrHelperLiftingB101StrvalInlineGate` (via **G6731**) |
| **G7165** B102 `filter_var(, lit)` | `runIrHelperLiftingB102FilterVarInlineGate` (via **G6731**) |
| **G7166** B103 `crc32()` | `runIrHelperLiftingB103Crc32InlineGate` (via **G6731**) |

---

---

## Closed — Phase 44 extended matrix + hole closure + Horizon C (G9000–G9140)

**Authority:** [`docs/PHASE-44-PROGRAM.md`](./docs/PHASE-44-PROGRAM.md) (**D6310** / **D6311**); subordinate to **G8550**.

| Gate | Goal | Smoke |
| --- | --- | --- |
| **G9000** | Program entry | `hub:phase44-program-entry-smoke` |
| **G9001** | 601-pair oracle census | `hub:extended-matrix-oracle-progress-smoke` |
| **G9010** | Wave-1 file-lift promotion | `hub:extended-matrix-oracle-wave1-smoke` |
| **G9030** | Wave-1 track close | `hub:extended-matrix-oracle-wave1-close-smoke` |
| **G9020** | Wave-2 pattern-lift + CWL | `hub:extended-matrix-oracle-wave2-smoke` |
| **G9040** | Wave-2 track close | `hub:extended-matrix-oracle-wave2-close-smoke` |
| **G9051** | LLM hole-closure hints | `hub:llm-convert-hole-closure-smoke` |
| **G9070** | Hole-closure verify-apply close | `hub:llm-convert-hole-closure-close-smoke` |
| **G9110** | Horizon C train loop (dry-run) | `hub:horizon-c-train-loop-smoke` |
| **G9085** | Wave-3 track close | `hub:extended-matrix-oracle-wave3-close-smoke` |
| **G9121** | Operator hub UI | `hub:phase44-ui-smoke` |
| **G9130** | Horizon C operator train close | `hub:horizon-c-train-close-smoke` |
| **G9140** | Program close composite | `hub:phase44-program-close-smoke` |
| **—** | Build slice regression | `hub:phase44-build-slice-smoke` |

---

## Closed — Phase 43 LLM convert full (G8900–G8940)

**Authority:** [`docs/LLM-CONVERT-FULL-PROGRAM.md`](./docs/LLM-CONVERT-FULL-PROGRAM.md) (**D6303**); extends Phase 42 — subordinate to **G8550**.

| Gate | Goal | Smoke |
| --- | --- | --- |
| **G8900** | Program entry | `hub:llm-convert-full-program-entry-smoke` |
| **G8911** | LLM/stub hole enrichment | `hub:llm-convert-enrich-smoke` |
| **G8912** | Verify-gated operator apply | `hub:llm-convert-verify-apply-smoke` |
| **G8913** | Apply → repair hole-closure bridge | `hub:llm-convert-repair-bridge-smoke` |
| **G8920** | MCP enrich + verify + apply | build slice |
| **G8940** | Program close composite | `hub:llm-convert-full-close-smoke` |

---

## Default queue — WISP full site closed (G7790)

**Build queue:** `pnpm run hub:wisp-full-site-close-smoke` (**G7790**).  
**Subordinate:** **G7690** (included in G7790 composite).

---

## Archived — Default queue universal translator closed (G7690)

**Maintenance queue:** `pnpm run hub:cwl-universal-translator-close-smoke` (**G7690**).  
**Subordinate:** **G7590** (included in G7690 composite).

---

## Archived — Default queue universal translator active (G7600–G7690)

**Build queue:** `pnpm run hub:cwl-universal-translator-close-smoke` (**G7690**).  
**Subordinate:** **G7590** (included in G7690 composite).

---

## Archived — Default queue post G7590 (fully complete web language closed)

**Regression:** `pnpm run hub:cwl-full-web-language-close-smoke` (**G7590**).  
**Subordinate:** **G7490** (included in G7590 composite).

---

## Archived — Default queue full web language active (G7590)

**Regression:** `pnpm run hub:cwl-universal-language-close-smoke` (**G7390**).
**Subordinate:** **G7150** + **G7200** (included in G7390 composite).
**Optional:** `pnpm run hub:cwl-language-maintenance-smoke` (**G6731**); WISP POC — [`PAUSED-AND-MAINTENANCE.md`](./docs/PAUSED-AND-MAINTENANCE.md) §1a.

**Governance:** `pnpm run hub:maintenance-mode-governance-smoke`

Closed programs: Phase 10–18 (**G7150**), IR Helper v1 (**G7200**), WISP showcase POC (**G6690**, optional).

---

## Maintenance hygiene

Reactive work (parser probes, hole economics, docs, redaction) — see [`PAUSED-AND-MAINTENANCE.md`](./docs/PAUSED-AND-MAINTENANCE.md) §2.

**Full CI-scale tests:** `pnpm run test:gce` — [`docs/GCE-LOCAL-VERIFY.md`](./docs/GCE-LOCAL-VERIFY.md).

---

## Closed programs (archive only)

| Program | Closed at | Archive |
| --- | --- | --- |
| Strategic plan phases 0–9 | **G6153** | [`docs/STRATEGIC-PLAN.md`](./docs/STRATEGIC-PLAN.md) §7 |
| Phase 10 production parity | **G6257** | [`docs/PRODUCTION-PARITY-PHASE-10.md`](./docs/PRODUCTION-PARITY-PHASE-10.md) |
| Ship log | **G6257** | [`docs/archive/STRATEGIC-PLAN-SHIPPED-LOG.md`](./docs/archive/STRATEGIC-PLAN-SHIPPED-LOG.md) |

Do **not** treat archive tables as active backlog.

Everything shipped before Phase 10 archive is in [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md).
