# Whole-site CWL conversion

> **Status:** **closed** (**G9450**, **D6366** — 2026-07-09)  
> **Authority:** `DESIGN.md` D6366; `STRATEGIC-PLAN.md` §12; `ROADMAP.md` G9400–G9450  
> **North star:** ingest an entire site → export a **working CWL site** (different language, same behavior + surfaces).  
> **Proof was last:** `pnpm run hub:whole-site-cwl-close-smoke` closes the program on a composite fixture after G9410–G9440.

Chrysalis is not finished when one adapter unit test passes. Whole-site conversion means a project can lift UI assets/markup, bind traced API data into CWL `load { }`, verify the matrix, and **serve** the exported CWL through `@chrysalis/runtime-cwl`.

---

## Close proof (G9450)

| Check | Evidence |
| --- | --- |
| Program docs | DESIGN D6366, this doc, ROADMAP G9450 |
| UI convert (G9420) | `hub:site-convert-smoke` |
| Load bind (G9430) | `hub:site-load-bind-smoke` |
| Site-scale matrix (G9440) | `hub:site-scale-matrix-smoke` + matrix on `fixtures/site-scale-matrix` |
| Runtime serve | `runtime-cwl` GET `/login` + `/admin/billing` (HTML + `cwl-page-load` sidecar + **G9470** document shell / CSS) |

**Honest scope:** the close fixture includes CSS/markup artifacts, oracle traces, and CWL with bound `load` fields. It is **not** a claim that every WISP route matches the Svelte original or that GenieACS/live backends are converted (**D6205**).

---

## What “complete” means

| Layer | Source | CWL output | Owner | Close status |
| --- | --- | --- | --- | --- |
| **API / backend** | PHP, Go, Java, … routes + handlers | `@route` / `@api` in `migration.cwl` | `port-site` → WebIR ingest → CWL export | Closed on Open Legacy fixtures (**G8400**) |
| **Per-route CSS** | Svelte/Vue/Angular/CSS Modules build | `chrysalis.ui.route-style-map` + bundles | `liftProjectUiAssets` (**G9300–G9305**); **document shell** (**G9470** / **D6368**) injects `<link>` + serves files | Matrix layer **ui-css**; runtime-cwl `uiAssets` |
| **Per-route HTML** | Framework source / static templates | `chrysalis.ui.route-markup-map` + HTML bundles | `liftProjectUiMarkup` (**G9306–G9309**); **structural-shell** (**G9460** / **D6367**) for interactive pages | Matrix layer **ui-markup** |
| **Live data in HTML** | `load`, stores, API fetches | CWL `load { }` + traced responses | **G9430** `bindSiteProjectLoadFromTraces` | Matrix layer **load-bind**; runtime sidecar |
| **Client islands** | Svelte components, maps, auth | CWL islands + chimera bridge | WISP phase 13/28 + **G9490** nested event bind | Showcase — modals/maps/auth holes remain; GenieACS never in scope |
| **Proof / demo** | Operator smokes, GCE deploy | Hub demo, public showcase | **G9450** close smoke | Closed for package pipeline; WISP visual parity separate |

**Running app is the spec** (`DESIGN.md` §3). Conversion completeness is measured against deployed behavior, not against “no forbidden stub strings.”

---

## Pipeline

```text
Source site (repo + build output)
        │
        ├─► Site intelligence ──► WebIR ingest ──► migration.cwl (API)
        │
        ├─► liftProjectUiAssets ──► .chrysalis/ui-assets/
        │
        ├─► liftProjectUiMarkup ──► .chrysalis/ui-markup/
        │
        ├─► convertSiteProjectUi ──► patch @page bodies
        │
        ├─► bindSiteProjectLoadFromTraces ──► load { } + HTML hydration (when corpus)
        │
        ├─► verifySiteScaleMatrix ──► UI CSS/markup + API + load-bind layers
        │
        ├─► verify replay (when corpus exists) ──► correctness report
        │
        └─► runtime-cwl / static export / chimera serve ──► working site
```

**Orchestration entry points:**

| Command | Role |
| --- | --- |
| `chrysalis port-site` / `site-port-to-cwl.mjs` | Full Migration OS port (backend + UI gates) |
| `chrysalis convert-site` / `convertSiteProjectUi` | UI-only lift + CWL `@page` patch + load-bind; writes `.chrysalis/site-convert.json` |
| `bindSiteProjectLoadFromTraces` | Traced API → `load { }` |
| `verifySiteScaleMatrix` | Site-scale conversion matrix |
| `wisp-cwl-package-ui-lift.mjs` | WISP showcase wrapper |
| `hub:whole-site-cwl-close-smoke` | Program close / regression |

---

## Build queue (closed)

| Slice | Goal | Gate |
| --- | --- | --- |
| **G9410** | Wire package UI lift into WISP pipeline | `hub:wisp-package-ui-lift-smoke` |
| **G9420** | Unified convert-site orchestration | `hub:site-convert-smoke` |
| **G9430** | CWL `load` binding from traces | `hub:site-load-bind-smoke` |
| **G9440** | Site-scale verify matrix | `hub:site-scale-matrix-smoke` |
| **G9450** | Program close: fixture serves end-to-end | `hub:whole-site-cwl-close-smoke` |

**Closed prerequisites:** G9300–G9309 (UI asset + markup adapters), G8400 (site-port backend wedge).

---

## WISP relationship (D6205)

WISP Module_Manager is the **showcase lab**, not the product. Whole-site conversion rules live in packages; WISP scripts are thin wrappers. Do not add WISP-only CSS or markup rules that do not generalize. `hub:wisp-cwl-ui-parity-close-smoke` is a showcase regression, not a substitute for G9450.

---

## Holes and honesty

Unsupported constructs become **holes** with registry names (`legacy:css-scoping-*`, `legacy:markup-lift-*`, `legacy:markup-lift-svelte-*`, `hub-svelte:*`). Partial conversion is valid output when holes are declared — silent best-effort translation is forbidden (`DESIGN.md` §3 item 6).

**G9460 / D6367:** `convertSiteProjectUi` defaults to **`markupMode: "structural-shell"`** so interactive Svelte pages lift as layout shells with explicit holes instead of being skipped. Static-only lift remains available via `chrysalis ui-markup --mode static`.

**G9470 / D6368:** `createCwlRuntime({ uiAssets })` / `chrysalis-cwl-serve --project` wraps HTML fragments in a document shell with route+fallback stylesheet links and serves `/assets/original-css/*` from `.chrysalis/ui-assets/`.

**G9480 / D6369:** WISP finish on product APIs — `applyNoSourceMarkupHolesToCwlSource` for routes without `+page.svelte`; `bindSiteProjectLoadFromTraces({ seedApiPaths })`; CSS lift synced into the hub fixture; mid-token HTML template guard so load fields do not corrupt hole attributes. Showcase gate: `hub:wisp-whole-site-finish-smoke`.

**G9500 / D6371:** Fill every *fillable* hole — balanced `{#if}`/`{#each}`, showcase `loadBools`, static component inline, load-scalar hydration. Gate: `hub:wisp-fill-holes-smoke`. Residual after chrome shells + enriched-trace hydrate (**G9660–G9750**) is **~564** intentional showcase-bound. GenieACS never in scope. **39** no-source `/add` routes stay holes (DESIGN §3 — no invented forms).

---

## Operator smokes

```bash
pnpm run hub:whole-site-cwl-close-smoke   # G9450 program close / regression
pnpm run hub:wisp-whole-site-finish-smoke # G9480 WISP finish (needs WISP root)
pnpm run hub:wisp-remaining-holes-finish-smoke # G9490 remaining holes (needs WISP root)
pnpm run hub:wisp-fill-holes-smoke        # G9500 fill fillable holes (needs WISP root)
pnpm run hub:wisp-showcase-bound-smoke    # honest ~564-hole budget (fixture only)
pnpm run hub:site-convert-smoke
pnpm run hub:site-load-bind-smoke
pnpm run hub:site-scale-matrix-smoke
pnpm run hub:wisp-package-ui-lift-smoke
pnpm run hub:ui-asset-lift-smoke
pnpm run hub:ui-markup-lift-smoke
```

---

## Related docs

- [`MIGRATION-OS.md`](./MIGRATION-OS.md) — operator stack index  
- [`docs/README.md`](./README.md) — doc index  
- `DESIGN.md` D6365 (UI adapters), D6366 (whole-site program), D6369 / D6370 (WISP finish)  
- `ROADMAP.md` G9400–G9450 / G9480 / G9490 closed queue
