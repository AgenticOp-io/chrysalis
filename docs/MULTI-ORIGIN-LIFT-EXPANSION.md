# Multi-origin lift expansion plan

> **Status:** active plan (**D6405**, **G9840–G9880**) — 2026-07-12  
> **Authority:** `DESIGN.md` D6405; `STRATEGIC-PLAN.md` §12  
> **Driven by:** [`SVELTE-CWL-CONVERSION-LESSONS.md`](./SVELTE-CWL-CONVERSION-LESSONS.md)  
> **North star:** every origin language lifts into **CWL in the build**; origin runtimes are evidence/debug only

---

## 1. Goal

Extrapolate WISP Svelte lessons into a **repeatable multi-origin program**:

```text
Origin (Svelte | Vue | React/Next | Angular | PHP templates | …)
  → language adapter lift (WebIR)
  → structural-shell / CSS / load-bind
  → hole registry (named, never silent)
  → LLM propose + IS hit/near-miss (optional accelerate)
  → verify / oracle dispose
  → CWL runtime or emit target
```

Success metric: **% routes with signed CWL + hole manifest + verify evidence**, not “SPA still running beside chimera.”

---

## 2. Lesson → universal rule map

| Svelte/WISP lesson | Universal rule | Package owner |
| --- | --- | --- |
| Sidecar hid conversion debt | Default deploy = CWL-native prefixes `*` | chimera / pipeline config |
| Structural-shell for interactive pages | All SPA frameworks default structural-shell | `@chrysalis/ui-*` / convert-site |
| CSS + document shell required for “look” | ui-assets + runtime wrap always | runtime-cwl |
| Force-demo ≠ parity | No origin-specific demo JS as default | WISP scripts only as showcase wrappers |
| Brace/string integrity | Language-agnostic CWL patch tools | apply-surfaces / publish |
| Redirects last | Publish ordering invariant | full-build / deploy bundle |
| Stub API goldens | Trace/sample hydrate before “data parity” | load-bind |
| Auth must stay on CWL for session | Non-GET auth posts never go to origin fallback | chimera |
| LLM without verify is drift | Governor + verify-gated apply | web-llm / hub |
| IS skip on exact digest | Cache converted intelligence, not weights | intelligence-shorthand |
| GenieACS temptation | Explicit OOS lists per showcase | DESIGN / charter |

---

## 3. Origin language tiers

### Tier A — shipped / showcase-proven (extend depth)

| Origin | Status | Next depth |
| --- | --- | --- |
| **SvelteKit** | WISP showcase through **G9908** (hydrate + shells + attr scrub + filter honesty) | Remaining live-widget depth only with oracle/traces |
| **PHP** | Adoption vector; port-site | Keep matrix + oracle; feed IS from PHP ports |
| **OpenAPI / HAR** | Sink ingest | Contract → CWL routes |
| **Vue / Nuxt** | Load-bind (**G9927**) + SFC scoped-CSS (**G9929**) + layout sheets (**G9942**) + App.vue shell (**G9946**) + structural depth (**G9924**) + **overlay shell keys** (shared `ui-markup-overlay-shell`) | Optional middleware honesty |
| **Angular** | DI graph (**G9931**) + providedIn/providers (**G9941**) + NgModule (**G9945**) + structural depth (**G9926**) + **overlay shell keys** | Optional standalone `bootstrapApplication` variants |
| **React / Next** | RSC (**G9928**) + CSS modules (**G9930**) + layout/globals (**G9940**) + loading/font honesty (**G9944**) + structural depth (**G9925**) + **overlay shell keys** | Optional `error.tsx` / `template.tsx` honesty |
| **PHP Blade** | Inventory + basic structural markup (`phpBladeMarkupAdapter`) + `@if($showX)` shell stamp | Alpine/Livewire remain honesty holes (no invented runtime) |

### Tier B — adapter exists or partial (expand next)

| Origin | Expansion slice | Gate idea |
| --- | --- | --- |
| **PHP Blade** | Alpine `x-show` / Livewire `wire:*` hydrate (honesty today) | Extend beyond hole markers only with origin traces |
| **Blazor / ERB / Django** | Inventory + markup adapters | Explicit plan amendment before start |

### Tier C — later matrix (shared convert orch precondition met)

Flutter web and other non-HTML shell origins — **shared convert orchestration shipped** (`convertMultiOriginProjects`, **G9943**). Start a named origin only after an explicit plan amendment (adapters + fixtures; no publish fork).

---

## 4. Build queue (G9840–G9880)

| ID | Slice | Deliverable | Gate |
| --- | --- | --- | --- |
| **G9840** | Lessons + plan + CWL-native operator default | Docs + pipeline flip off sidecar | `hub:svelte-native-convert-entry-smoke` ✅ |
| **G9850** | Svelte native convert orchestration | `wisp:svelte-native-convert` + report schema v2 | `hub:svelte-native-convert-close-smoke` ✅ |
| **G9860** | LLM/IS wired into convert loop | IS routing + shorthand export in convert | `hub:svelte-native-llm-is-smoke` ✅ |
| **G9870** | Cross-language checklist + first non-Svelte port | Vue via shared `convertSiteProjectUi` | `hub:vue-structural-shell-smoke` ✅ |
| **G9880** | Program close | Multi-origin expansion doc + regression composite | `hub:multi-origin-lift-close-smoke` ✅ |
| **G9924** | Vue structural-shell depth | Named holes for `v-*` / interp / events / components | `hub:vue-structural-shell-depth-smoke` ✅ |
| **G9925** | Next structural-shell depth | Named holes; static mode refuses silent strip | `hub:next-structural-shell-depth-smoke` ✅ |
| **G9926** | Angular structural-shell depth | Named template + `inject()` DI holes | `hub:angular-structural-shell-depth-smoke` ✅ |
| **G9927** | Vue load-bind (shared hydrate) | Wrap `v-if`/`v-for`; hydrate on shared path | `hub:vue-load-bind-smoke` ✅ |
| **G9928** | Next RSC depth | Async RSC fixture + interp hydrate | `hub:next-rsc-depth-smoke` ✅ |
| **G9929** | Vue scoped-CSS depth | SFC `<style>` lift without Vite dist | `hub:vue-scoped-css-depth-smoke` ✅ |
| **G9930** | Next CSS depth | Co-located `page.module.css` without `.next` | `hub:next-css-depth-smoke` ✅ |
| **G9931** | Angular DI graph | Relative inject walk + edge/service holes | `hub:angular-di-graph-smoke` ✅ |
| **G9940** | Next layout/globals CSS | Ancestor `layout` CSS attributed per route; nested isolation | `hub:next-layout-css-depth-smoke` ✅ |
| **G9941** | Angular providedIn / providers | `providedIn` scopes + `providers: []` edges/holes | `hub:angular-provided-in-smoke` ✅ |
| **G9942** | Vue/Nuxt layout CSS | `definePageMeta({ layout })` + `layouts/*.vue` sheets | `hub:vue-nuxt-layout-css-smoke` ✅ |
| **G9943** | Shared convert orch | `convertMultiOriginProjects` across Vue/Next/Angular | `hub:multi-origin-convert-orch-smoke` ✅ |
| **G9944** | Next loading/font honesty | Companion `loading.tsx` + `next/font` holes | `hub:next-loading-font-smoke` ✅ |
| **G9945** | Angular NgModule providers | Sibling `*.module.ts` provider edges/holes | `hub:angular-ngmodule-providers-smoke` ✅ |
| **G9946** | Vue App.vue shell CSS | SPA/Nuxt app shell with layouted pages | `hub:vue-app-shell-css-smoke` ✅ |
| **G9947** | Vue/Nuxt Nitro/h3 server routes | `server/api` `defineEventHandler` + h3 path/query/status (secondary dialect; Express-in-SFC remains Vue ST) | `hub:vue-nitro-smoke` ✅ |

**Refuse:** sidecar as close proof; GenieACS; LLM bypass of verify; inventing widgets to zero holes; silent `{…}` strip.

---

## 5. Shared APIs (do not fork per language)

Keep logic in packages; language adapters only:

1. **Site inventory** — `scripts/lib/site-inventory/` (+ `chrysalis-site-inventory.mjs`) — Step 1 before convert
2. `liftProjectUiAssets` / `liftProjectUiMarkup`
3. `convertSiteProjectUi({ markupMode: "structural-shell", forceSettleResidualHoles })`
4. `bindSiteProjectLoadFromTraces`
5. `verifySiteScaleMatrix`
6. Chimera `cwlNativePrefixes` + native API
7. `resolveShorthandForTask` / `governConvertAction` / verify-apply
8. **Gap catalog** — `chrysalis-gap-catalog.mjs` (`chrysalis.gap-catalog.v1`) — not WISP-only

New origins add **inventory + markup/CSS adapters + fixtures**, not new deploy topologies.

### 5A. Inventory adapters (Step 1 — required)

| Adapter | Package path | Paired markup lift |
| --- | --- | --- |
| `sveltekit` | `scripts/lib/site-inventory/sveltekit.mjs` | `svelteKitMarkupAdapter` |
| `vite-vue` | `…/vue.mjs` | `viteVueMarkupAdapter` |
| `next-app` | `…/next.mjs` | `nextAppMarkupAdapter` |
| `angular` | `…/angular.mjs` | `angularMarkupAdapter` |
| `php-blade` | `…/php-blade.mjs` | `phpBladeMarkupAdapter` (basic; Alpine/Livewire = honesty holes) |
| `php` | `…/php.mjs` | PHP handler ingest + oracle |

Live census is always CWL-attribute based (`data-cwl-shell-key`, toggles, lifts). Method: [`UNIVERSAL-CONVERSION-METHOD.md`](./UNIVERSAL-CONVERSION-METHOD.md) §2.

Smoke: `pnpm run chrysalis:site-inventory-adapters-smoke`

---

## 6. LLM / Shorthand operating model (all languages)

```text
for each route/module:
  digest = source + prior CWL
  is = resolveShorthand(digest, domain)
  if is.hit: replay capsule → verify
  elif is.nearMiss: apply donor + LLM hole-delta → verify
  else: deterministic lift → optional LLM enrich → verify
  on verify green: mint/update IS-T3; record hitRate metrics
  on fail: demote shorthand; hole remains
```

Product metrics stay **hit / near-miss / miss / verifyCostMs** ([`INTELLIGENCE-SHORTHAND.md`](./INTELLIGENCE-SHORTHAND.md)).

---

## 7. Operator demo policy (locked)

| Mode | When | Proxy header for pages |
| --- | --- | --- |
| **CWL-native (default)** | Operator conversion experience | `cwl` |
| **Svelte sidecar (opt-in)** | Diff source vs CWL for engineers | `svelte` — `CHRYSALIS_WISP_SVELTE_SIDECAR=1` only |
| **Firebase static** | Hosting export path | static export — separate target |

---

## 8. Close criteria (G9880)

- [x] Lessons doc + this plan committed and linked from Migration OS / README
- [x] Default GCE deploy is CWL-native (no sidecar)
- [x] `wisp:svelte-native-convert` produces deployable CWL from reuploaded Module_Manager
- [x] LLM/IS path documented and smoke-gated (skip-LLM on hit still verify-gated)
- [x] At least one non-Svelte origin uses the **same** convert-site APIs with a smoke
- [x] STRATEGIC-PLAN §12 points here; ROADMAP lists G9840–G9880

---

## 9. Related

- [`SVELTE-CWL-CONVERSION-LESSONS.md`](./SVELTE-CWL-CONVERSION-LESSONS.md)
- [`WHOLE-SITE-CWL-CONVERSION.md`](./WHOLE-SITE-CWL-CONVERSION.md)
- [`CWL-UNIVERSAL-TRANSLATOR-PROGRAM.md`](./CWL-UNIVERSAL-TRANSLATOR-PROGRAM.md)
- [`LLM-CONVERT-FULL-PROGRAM.md`](./LLM-CONVERT-FULL-PROGRAM.md)
