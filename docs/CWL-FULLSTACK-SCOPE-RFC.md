# Full-stack CWL scope RFC

> **Status:** accepted (2026-06-17)  
> **Authority:** `docs/STRATEGIC-PLAN.md` §12 Month 2; **G5700**  
> **Related:** [CWL-SURFACE-TAXONOMY.md](CWL-SURFACE-TAXONOMY.md) (named surfaces), [CWL-RFC-0012](CWL-RFC-0012-full-stack-components.md), [CWL-RFC-0013](CWL-RFC-0013-page-load-functions.md)

## Goal

Define **what CWL covers today** for full-stack web surfaces — backend handlers, frontend/SSR pages, and honest holes — so migration programs can sign contracts without over-claiming component or hydration semantics.

**Product names** for surfaces (CWL API, CWL Pages, CWL Data, CWL UI, CWL Effects) are defined in [`CWL-SURFACE-TAXONOMY.md`](./CWL-SURFACE-TAXONOMY.md).

## Backend boundary — **CWL API**

| Surface | CWL syntax | Lowered to | Evidence |
| --- | --- | --- | --- |
| HTTP API handlers | `@route` + JSON/object returns | WebIR handlers + emit | `runEmitVerifyMegaGate`, oracle verify |
| Effects | `effects: none` / named effects | WebIR effect tags | `runDiagnoseV3Gate` |
| Auth presets | `use auth session` / bearer | Hole or stub until parity | `runSessionStubGate` (stub only) |

**In scope:** route shells, param binding, JSON bodies, health/notify API slices on `fixtures/hub-flagship-cwl-fullstack`.

**Out of scope:** production SQL/session without verify parity; silent best-effort API lowering.

## Frontend / SSR boundary — **CWL Pages** and **CWL Data**

| Surface | CWL syntax | Status | Evidence |
| --- | --- | --- | --- |
| HTML pages | `@page` + `return html` | Shipped | `runLayoutSearchGate`, runtime probes |
| Layout modules | `import "layouts/…"` | Shipped | `runCwlAuthoringTemplatesGate` |
| Query/path interpolation | `param` / `query` in HTML | Shipped | `runQueryHtmlGate`, diagnose v3 |
| Page load sidecars | `load { … }` | Partial (RFC-0013) | `runLoadArrayGate` |
| Component trees | — | **CWL UI** — **Hole** (`hub-*:page-component`) | Origin lift smokes |

**In scope:** CWL-authored flagship with zero catalogued holes (`maxHoles: 0` budget).

**Out of scope:** hydration, client stores, Vue/React component lowering.

## Holes policy

1. **Catalogued only** — reasons must exist in `scripts/hub-ingest/cwl-fullstack-holes.mjs` (RFC-0012/0013).
2. **`cwl diagnose`** warns on `uncatalogued-hole`; errors on parse failures only.
3. **No silent stubs** — unsupported constructs emit explicit `hole` tokens in CWL projection.
4. **Budget gate** — `chrysalis.fullstack-hole-budget.json` pins `maxHoles` per flagship fixture.

Registry gate: `runFullstackCwlScopeCatalogGate` (G5702).

## Origin mapping

| Origin | Page hole | API hole | Load hole |
| --- | --- | --- | --- |
| SvelteKit | `hub-svelte:page-component` | `hub-svelte:server-handler` | `hub-svelte:load-function` |
| Next.js App Router | `hub-next:page-component` | `hub-next:route-handler` | `hub-next:load-function` |
| CWL-authored | none (target) | none on flagship | literal+param loads only |

## Reinforcement gates

| Gate | Scope |
| --- | --- |
| `runFullstackCwlScopeRfcGate` | hole catalog + OpenAPI pages + layout/search (G1809) |
| `runStrategicPlanMonth2FullstackScopeGate` | doc + scope + catalog + hole budget + diagnose v3 (G5700) |

```bash
pnpm run hub:strategic-plan-month2-fullstack-scope-smoke
```

## Non-goals

- Matrix gold as headline for full-stack oracle parity
- Promoting origin lifts to “production-ready” while component holes remain
- Client-side routing or hydration without RFC + replay linkage
