# WISP → CWL consolidated pipeline

## Canonical command

```bash
pnpm run wisp:convert-one-pass
pnpm run wisp:convert-one-pass:deploy
```

`scripts/wisp-cwl-one-pass.mjs` is the only supported end-to-end compiler. The
older phase apply scripts, deepen batches, restart scripts, POC wrappers, and
standalone smoke scripts are historical tools. They may remain useful for
forensics, but the canonical command must not depend on them.

The aliases `wisp:pipeline`, `wisp:full-build`, `wisp:svelte-native-convert`,
`wisp:poc-from-scratch`, and `hub:wisp-poc-from-scratch` all enter the
one-pass compiler.

## One-pass stages

1. Resolve and validate the Module_Manager source root.
2. Remove prior generated origin output (`generated/cwl` and the prior preview).
3. Build the Svelte structural ingest package.
4. Inventory all origin files into the source corpus and conversion queue.
5. Recursively extract concrete Express routes from `backend-services`.
6. Generate `api-proxy.cwl` from the extracted route contract.
7. Apply recorded API goldens to matching generated handlers.
8. Extract module tips and the wizard catalog from source-owned TypeScript.
9. Build the ArcGIS vendor island with Module_Manager's Vite toolchain.
10. Convert every origin UI piece exactly once.
11. Enforce CWL syntax, residue, route, login, dashboard, and root gates.
12. Synchronize generated CWL back to Module_Manager.
13. Export every CWL page to clean static HTML.
14. Run the behavioral completeness audit.
15. Synchronize original CSS.
16. Produce the unsupported-hole report.
17. Build and verify the GCE bundle.
18. Optionally deploy to GCE.

Every stage writes its result into `reports/wisp/wisp-cwl-one-pass.json`. A
failure stops the pipeline before packaging or deployment.

## Canonical modules

- `scripts/lib/source-corpus.mjs` — origin inventory and conversion queue.
- `scripts/lib/convert-origin-pieces.mjs` — one structural conversion pass.
- `packages/ingest/src/ui-markup-svelte-structural.ts` — Svelte markup,
  block, event, component, and runtime-binding conversion.
- `scripts/lib/sync-api-paths-from-backend.mjs` — recursive Express route
  extraction.
- `scripts/lib/cwl-generate-api-proxy.mjs` — specificity-ordered API module.
- `scripts/wisp-cwl-apply-api-golden-handlers.mjs` — recorded response bodies.
- `scripts/lib/extract-wisp-module-tips.mjs` — source-owned tips asset.
- `scripts/lib/extract-wisp-wizard-catalog.mjs` — source-owned wizard asset.
- `scripts/build-wisp-cwl-arcgis-bundle.mjs` — ArcGIS vendor island.
- `scripts/lib/cwl-static-export.mjs` — clean static export.
- `scripts/lib/wisp-conversion-audit.mjs` — behavioral completeness gate.
- `scripts/wisp-cwl-pipeline.mjs` — deployment/bundle implementation library.

## Historical script policy

Historical scripts fall into four groups:

1. **Phase mutators** (`wisp-cwl-apply-*`, `phase*`) modified generated
   `routes.cwl` after conversion. Their reusable behavior belongs in ingest,
   conversion helpers, source extractors, or the runtime client.
2. **Deepen/restart/batch scripts** repeatedly settled holes. They are replaced
   by deterministic structural conversion and hard audit gates.
3. **Smoke scripts** prove one old milestone. Stable assertions belong in unit
   tests or `wisp-conversion-audit.mjs`; browser-only checks belong in the live
   audit.
4. **Deploy wrappers** remain compatibility entry points only. They must consume
   the one-pass output and must never rebuild or mutate it.

No new generated-output mutator should be added. Fix the source converter,
runtime client, API generator, or audit instead.

## Generated artifacts

- `fixtures/hub-wisp-management/routes.cwl`
- `fixtures/hub-wisp-management/api-proxy.cwl`
- `fixtures/hub-wisp-management/cwl-static-export/`
- `fixtures/hub-wisp-management/wisp-module-tips.json`
- `fixtures/hub-wisp-management/wisp-wizard-catalog.json`
- `reports/wisp/wisp-cwl-one-pass.json`
- `reports/wisp/wisp-conversion-audit.json`
- `reports/wisp/wisp-conversion-audit.md`

The generated reports are evidence, not alternative build entry points.

## Deploy targets: GCE vs Firebase (operator record)

**CWL apps can deploy to Firebase Hosting, but GCE chimera is the primary
verify and operator target for interactive WISP/CWL.**

| Target | URL / entry | Use when | Avoid when |
| --- | --- | --- | --- |
| **GCE chimera** | `chrysalis-test-vm` `:19100` (e.g. `http://34.61.255.147:19100`) | Converting and verifying full CWL: live `/api/*` proxy, theme boot, ArcGIS map islands, plan/deploy postMessage, modals, auth | You only need a CDN static brochure |
| **Firebase Hosting** | `management.wisptools.io` / `wisptools-management.web.app` | Optional second URL: static CWL export + Hosting rewrites → `apiProxy` | Treating Hosting as the conversion fidelity target for maps, buttons, or live-first API |

### Why GCE is canonical for conversion

1. **Same-origin gateway** — chimera serves HTML, assets, theme boot, live-first
   API proxy (Firebase demo auth → `hss.wisptools.io`), and CWL islands together.
2. **Dynamic routes** — real path routing. Firebase needs a client 404 router for
   detail URLs (`/modules/inventory/{id}`, etc.).
3. **Map interactivity** — plan/deploy SharedMap is an iframe → coverage-map
   ArcGIS island with a parent `postMessage` contract. That contract is validated
   on GCE; Firebase only hosts the static files.
4. **One-pass default** — `wisp-cwl-one-pass.mjs --deploy-gce`. Firebase is
   deliberately out of that path (`pnpm run wisp:deploy:firebase` separately).

### Firebase is still supported

- Stage: `pnpm run wisp:stage:firebase-static`
- Deploy: `pnpm run wisp:deploy:firebase`
- Client build profile: `pnpm run wisp:build:client:firebase`

Do **not** use Firebase as the place to judge “is the conversion done?” for
plan/deploy maps, unbound buttons, or live API hydration. Fix those on GCE,
then optionally mirror the static export to Hosting.

### Operator rule (2026-07-19)

- Verify conversion fidelity on **GCE**.
- Use Firebase only when a second CDN URL is required.
- Record remaining map/button gaps against the GCE demo, not Hosting.

## Deepened fidelity pass (2026-07-19)

The “~60% feel” usually means three conversion gaps stacking:

1. **Help button occluded** — plan/deploy inject `#plan-active-summary.plan-summary`
   at `z-index: 11`, which sits above the origin help FAB (fixed inside the
   `z-index: 10` header stacking context). Origin uses `z-index: 5` for the
   summary; CWL modules CSS must match so Help stays clickable.
2. **Tab chains with data companions** — `{#if activeTab === 'overview' && schema}
   {:else if activeTab === 'accounts'}…` must compile every branch into a
   `data-cwl-bind="if"` state panel. Dropping the companion `&& schema` case
   collapses voice-telephony (and similar) to the overview only.
3. **Open-modal handlers** — `on:click={openInviteModal}` / `openAddTn` where the
   function body only sets `showX = true` must emit `data-cwl-toggle`, not an
   unbound `data-cwl-action`.

Census blocker added: `missing-origin-labels` (origin `<button>` / `<h2>` labels
absent from the export after decoding `data-cwl-each-tpl`).

## Modal toggle resolution (2026-07-19k / 2026-07-19m)

Root cause of “most buttons still don’t work”: toggles were wired
(`data-cwl-toggle="showAddTn:true"`) but the closed modal chrome had no
`data-cwl-modal-shell` / `data-cwl-lifted-component` name the fuzzy
`findShellByName` matcher could resolve. Page-local overlays stamped with
`stampClosedUiChrome` were invisible to the client.

Fix:

1. **Converter** — `stampClosedUiChrome(html, shellKey)` writes
   `data-cwl-shell-key="<toggle ident>"` on closed `{#if showX}` chrome.
   Structural component inlines that receive `show={ident}` /
   `bind:show={ident}` also stamp that page-level gate key.
2. **Client** — `findShellByKey` resolves toggles by exact key before the
   fuzzy name search.
3. **Fidelity deepen injectors off** — `initDeepenN10gSurfaces` …
   `initDeepenN10xSurfaces` invent synthetic toolbar buttons (`data-cwl-n10g`,
   etc.) that are not in the origin Svelte UI. They stay disabled unless
   `window.__WISP_CWL_ENABLE_DEEPEN_SURFACES__ === true`. Origin controls only.

Live verification (GCE `http://34.61.255.147:19100`, asset bust `20260719m`):
visible truthy toggles open on voice-telephony, work-orders, plan, customers,
dashboard; Plan Help opens; zero `data-cwl-n10g` injectors on those pages.

Still known gaps (not modal-toggle resolution):

- `/modules/billing` `showUpgradeModal` — origin sets the flag during PayPal
  redirect; there is no closed overlay chrome to stamp.
- `/modules/pci-resolution` `showSiteEditorInWizard` — nested wizard-local
  state, not a page-level shell.
- List/row actions that need selected-entity hydrate (`openEditModal` with a
  row payload) still depend on API-bound islands.

## Empirical fidelity discovery recipe (required)

When the operator says “most of this isn’t working” or “looks fake,” do **not**
guess from census counts alone. Run this discovery loop on **GCE** before more
converter work.

### 1. Confirm the live build

- Asset bust on `wisp-cwl-client.js` / `wisp-cwl-modules.js` / `wisp-cwl-map.js`
  matches the deploy you just shipped.
- Structural routes are large (tens of KB), not thin Phase-30 shells.
- `skipLift` redeploys must keep `structuralOnly` so `routes.cwl` is never wiped.

### 2. Dead-control discovery (modals / buttons)

1. For each sampled page, collect visible `[data-cwl-toggle$=":true"]` keys.
2. Resolve each key against:
   - `[data-cwl-shell-key="<key>"]` (exact — preferred),
   - then `[data-cwl-lifted-component]` / modal-shell names,
   - then overlay `aria-label` word match.
3. Click every unmatched and matched opener; record open / no-op / wrong shell.
4. Converter must stamp `data-cwl-shell-key` on closed `{#if showX}` chrome and
   on `show={ident}` / `bind:show={ident}` inlined components.
5. Client must `findShellByKey` before fuzzy `findShellByName`.
6. Never invent toolbar buttons (`initDeepenN10*`) to paper over gaps — they
   make the demo feel fake. Keep them behind
   `__WISP_CWL_ENABLE_DEEPEN_SURFACES__`.

### 3. Map / hardware connection discovery (plan + deploy)

Origin truth is `MapLayerManager` + `planService.getAllExistingHardware` +
coverage-map network loads — **not** a single `/api/network/equipment` dump.

Compare origin vs CWL on GCE:

| Contract | Origin | CWL must match |
| --- | --- | --- |
| Production hardware | Aggregate towers + sectors + CPE + equipment (+ inventory links) into `HardwareView` (`id`, `type`, `name`, `location`, `status`, `module`) | Same aggregate into `mapState.productionHardware` |
| Map base layers | Coverage page loads `/api/network/sites\|sectors\|cpe\|equipment` | Island `loadNetworkData` owns towers/sectors/cpe/equipment layers |
| Parent → iframe | `state-update` with staged features, production hardware, overlays, filters, capabilities | Same payload; **do not** re-paint equipment layer from productionHardware (wipes live network graphics) |
| Deployed hardware | `/api/network/hardware-deployments` (site-nested lat/lng) | Load + plot + hydrate DeployedHardwareModal |
| Deploy overlays | `projectOverlays` from plan features of visible projects | Fill + render; empty arrays feel “fake connection” |
| Hardware panel | Module tabs over `HardwareView` | Prefer `productionHardware`, not inventory-only fallback |

Live probes (same-origin on GCE):

```text
GET /api/network/sites
GET /api/network/sectors
GET /api/network/cpe
GET /api/network/equipment
GET /api/network/hardware-deployments
GET /api/plans/:id/features
```

If markers exist but names look synthetic (`Bulk …`, `CWL Eq …`), that is
**tenant seed data**, not a missing iframe — still hydrate correctly so clicks
and modals match origin.

### 4. Close the loop

1. Fix converter and/or island (never a generated-output mutator).
2. One-pass or asset redeploy to GCE; bump `WISP_CWL_ASSET_BUST`.
3. Re-run toggle click harness + map layer counts + hardware modal hydrate.
4. Record the gap and fix in this doc (or the census) so the next pass starts
   from evidence.

## Map / hardware hydrate fix (2026-07-19n)

Root cause of “fake map connection / fake hardware”:

1. `loadPlanMapLayers` only fetched `/api/network/equipment` and treated it as
   `productionHardware` (wrong vs origin `getAllExistingHardware`).
2. `applyStateUpdate` called `renderEquipment(productionHardware)`, wiping the
   live sites/sectors/CPE/equipment layers the island had just loaded.
3. `/api/network/hardware-deployments` was never plotted; hardware panel fell
   back to inventory-only tables.
4. Coverage-map island loaded `wisp-cwl-map.js` **without** asset bust, so map
   fixes often never reached the iframe.

Fix: aggregate HardwareView from sites+sectors+cpe+equipment+deployments;
stop painting productionHardware onto equipmentLayer; add deployments layer;
hardware panel prefers `mapState.productionHardware`; bust map island assets.

Live GCE check (`20260719n`): Tower Sites 57, Sectors 46, CPE 53, Equipment 8,
Hardware Deployments 1; Hardware panel lists geo HardwareView rows with lat/lng.
Names like `Bulk …` / `CWL Eq …` are **tenant seed data**, not a missing iframe.
