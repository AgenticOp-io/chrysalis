# CWL surface taxonomy

> **Status:** accepted (2026-06-19)  
> **Authority:** **DESIGN D6193**; `docs/STRATEGIC-PLAN.md` §7  
> **Related:** [`CWL.md`](./CWL.md), [`CWL-FULLSTACK-SCOPE-RFC.md`](./CWL-FULLSTACK-SCOPE-RFC.md), [`WISP-CWL-FULLSTACK-PROGRAM.md`](./WISP-CWL-FULLSTACK-PROGRAM.md)

## Thesis

**Chrysalis Web Language (CWL) is one consolidated web language** — not an API-only DSL. It is the **authoring and contract layer** that replaces PHP, JavaScript/TypeScript route handlers, SvelteKit/Next.js server surfaces, and OpenAPI operation shells as **source**, while lowering through **WebIR** to emit targets (`hono`, `fastify`, `nextjs`, `runtime-cwl`) and oracle verify.

CWL does **not** replace:

- Databases (MongoDB, SQL), message queues, or WISPTools legacy backend binaries
- Firebase Auth, Hosting, or Cloud Functions (deployment paths)
- Browser runtimes (V8) or ArcGIS SDK (client libraries)

Those remain **infra and vendor** layers. CWL replaces **web application language** — the code that declares routes, pages, data loading, effects, and (eventually) UI composition.

**WISP** ([`WISP-CWL-FULLSTACK-PROGRAM.md`](./WISP-CWL-FULLSTACK-PROGRAM.md)) **exists solely to showcase CWL** on a real operator app. It does **not** define the language — **CWL** (RFCs, WebIR, oracle) is authoritative.

## Surfaces (named layers)

All surfaces share one module file (or multi-file `import`), one WebIR module, and one verify contract. Names are **product vocabulary**; syntax is CWL.

| Surface | CWL syntax (today) | Replaces | Status |
| --- | --- | --- | --- |
| **CWL API** | `@route` + handler + JSON/object `return` | Express routes, `+server.ts`, Next route handlers, OpenAPI ops | **Shipped** — RFC-0001–0008, verify gold |
| **CWL Pages** | `@page` + `return html` | Static HTML, SSR shells, Blade/Jinja-like pages | **Shipped** — RFC-0010/0011/0014 |
| **CWL Data** | `load { … }` on pages | Svelte `load`, Next `page.server`, PHP controller prep | **Partial** — RFC-0013 |
| **CWL UI** | *(reserved)* / `hole hub-*:page-component` | Svelte/React/Vue component trees, stores, hydration | **Hole** — RFC-0012; no silent lowering |
| **CWL Effects** | `effects:`, `use auth`, `use json` | Middleware, session, body parsers | **Declarative** — deepening with verify |

### Not a CWL surface

| Name | Role |
| --- | --- |
| **Chimera gateway** | Migration **runtime shell**: serves native CWL routes, proxies API, sidecars holed origins. Not authored in CWL. |
| **Emit backends** | Hono, Fastify, Next.js — **targets**, not surfaces. |
| **Compat / holes** | Explicit unsupported regions — never silent stubs (**DESIGN §3**). |

## Stack diagram

```text
  Authoring (CWL surfaces)
  ┌─────────────────────────────────────────┐
  │  CWL API    @route  → JSON handlers      │
  │  CWL Pages  @page   → HTML / layouts     │
  │  CWL Data   load    → page data sidecar  │
  │  CWL UI     (future / holes today)       │
  │  CWL Effects use / effects metadata      │
  └──────────────────┬──────────────────────┘
                     │ 1:1
                     ▼
              WebIR (semantic IR)
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
    emit-hono   runtime-cwl   chimera
    emit-fastify              (migration)
    emit-nextjs
                     │
                     ▼
              oracle / verify replay
```

## Origin → surface mapping

| Source language / framework | CWL API | CWL Pages | CWL Data | CWL UI |
| --- | --- | --- | --- | --- |
| PHP / Laravel | lift handlers | rare `@page` | — | — |
| SvelteKit | `+server.ts` → `@route` or hole | static → `@page` | `+page.server` → `load` hole | `+page.svelte` → component hole |
| Next.js App Router | `route.ts` | `page.tsx` shell | `page.server` | component hole |
| OpenAPI / HAR | `@route` contract | — | — | — |
| CWL-authored (target) | native | native | literal loads | native (when RFC ships) |

Hole reasons: `scripts/hub-ingest/cwl-fullstack-holes.mjs`.

## Replacement ladder (programs)

Programs close surfaces in order — no big-bang rewrite:

| Step | Surface | Done when |
| --- | --- | --- |
| 1 | **CWL API** contract signed | All `/api/*` in CWL; proxy or native handler + verify |
| 2 | **CWL Pages** | Static/SSR HTML routes native in `runtime-cwl` |
| 3 | **CWL Data** | Page loads replay against oracle |
| 4 | **CWL UI** | Component holes closed or compiled islands with RFC + replay |
| 5 | **Cutover** | Chimera sidecars removed; single CWL module deploy |

**WISP Phase 12 (Phase 0 closed, G6310):** step 1 contract + step 2 partial (`/docs` @page) + step 4 bridged via Svelte sidecar.

**WISP Phase 13 (closed G6410):** step 2–4 closed on representative modules; M4 ACS routes are **fixture regression only** — not language depth.

**WISP Phase 14 (closed):** HSS chimera/deploy refresh — see [`WISP-CWL-FULLSTACK-PROGRAM.md`](./WISP-CWL-FULLSTACK-PROGRAM.md) § Phase 14.

## WISP module → surface (Phase 13 planning)

| Module wave | Primary surfaces | Notes |
| --- | --- | --- |
| M0 docs/help/login | Pages, then UI | `/docs` native; login UI hole → CWL UI RFC |
| M1 dashboard | Data, UI, API | Tenant context in `load`; widgets = UI |
| M2 admin/customers | API, UI | Admin API already in proxy contract |
| M3 plan/deploy/coverage-map | UI, Data, API | ArcGIS = client hole until CWL UI policy |
| M4 hss/monitor | API, UI | HSS + SNMP monitoring POC showcase (**GenieACS is WISPTools legacy — not POC scope**, **D6205**) |
| M5 remainder | All | Pure CWL cutover gate |

## Gates

| ID | Gate | Smoke |
| --- | --- | --- |
| G6340 | `runCwlSurfaceTaxonomyDocGate` | `pnpm run hub:cwl-surface-taxonomy-smoke` |
| G6731 | CWL language maintenance | `pnpm run hub:cwl-language-maintenance-smoke` |
| **G6750** | **Language v1 closed** | `pnpm run hub:cwl-language-v1-close-smoke` |

## Language v1 closed (G6750)

**Status:** closed (2026-06-19). Program doc: [`CWL-LANGUAGE-PROGRAM.md`](./CWL-LANGUAGE-PROGRAM.md).

CWL **API**, **Pages**, **Data**, and **Effects** surfaces are shipped and gated. **CWL UI** remains an explicit **Hole** per **RFC-0012** — no silent lowering. IR helper B-tier **B5.5–B8** (formal-assign lib SQL inlining) is closed.

Regression: `pnpm run hub:cwl-language-v1-close-smoke` (**G6750**), `pnpm run hub:cwl-language-maintenance-smoke` (**G6731**).

## Non-goals

- Renaming `@route` / `@page` syntax in this amendment (names are **documentation** only)
- Claiming CWL UI parity without RFC + verify
- Conflating chimera gateway with a CWL surface
- Replacing Firebase/Mongo/WISPTools legacy backends as part of “web language” replacement
