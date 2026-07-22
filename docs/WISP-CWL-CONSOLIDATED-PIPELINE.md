# WISP → CWL consolidated pipeline

> **POC status (2026-07-20):** Sub-modal gap catalog **P0–P3 closed**; full-lift residuals cleared (`20260720e`).  
> **Method:** This WISP tree is the **filled proof** of [`UNIVERSAL-CONVERSION-METHOD.md`](./UNIVERSAL-CONVERSION-METHOD.md) — start every new site with a **complete inventory**.  
> **Method run:** `reports/chrysalis/method-run-wisp.json` (inventory → dual deploy evidence).  
> **Deploy:** GCE chimera for verify; Firebase Hosting (`pnpm run wisp:deploy:firebase` → https://wisptools-management.web.app) for production POC.

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
- `scripts/wisp/extract-wisp-module-tips.mjs` — source-owned tips asset.
- `scripts/wisp/extract-wisp-wizard-catalog.mjs` — source-owned wizard asset.
- `scripts/build-wisp-cwl-arcgis-bundle.mjs` — ArcGIS vendor island.
- `scripts/lib/cwl-static-export.mjs` — clean static export.
- `scripts/wisp/wisp-conversion-audit.mjs` — behavioral completeness gate.
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

Live verification (GCE `http://34.61.255.147:19100`; bump `WISP_CWL_ASSET_BUST`
on each ship — see § Map interaction + embed fidelity canon):
visible truthy toggles open on voice-telephony, work-orders, plan, customers,
dashboard; Plan Help opens; zero `data-cwl-n10g` injectors on those pages.
Map right-click + embed modal fit verified through asset bust `20260719u`.
P0 map depth (plan-draft menu, Filters/Stats/Device panels, Hardware→EPC open,
selected-entity selects) shipped as `20260720a`.
P1 deploy/plan depth (SiteEquipment chain, DeployedHardware nested edit,
planners hydrate + approval actions, PlanLayerFilter preference, slot boot-hide)
shipped as `20260720b`.
P2 nested bridges (WO lookup, helpdesk assign, monitoring alert→ticket, HSS
SiteDevices, inventory wizards, customers onboarding, PCI stack opens, billing
honest-skip) shipped as `20260720c`.
P3 module bridges (voice/sites/CBRS/user-mgmt; honest-unavailable + origin-dead
catalog closure) shipped as `20260720d`.
Full lift (`20260720e`): BaseWizard **slot fold** + `isOpen`→parent shell-key
alias; dual-deploy GCE + Firebase. Live census: **0** pages with slot siblings;
PCI `showSiteEditor` / `showSiteEditorInWizard` shell-keys present.

Still known gaps (not modal-toggle resolution):

- `/modules/billing` `showUpgradeModal` — origin sets the flag during PayPal
  redirect; there is no closed overlay chrome to stamp (honest-skip).
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
| Right-click blank | `MapContextMenu` at coords | Island hitTest miss → `revealLiftedHost(MapContextMenu)` + clamp |
| Right-click feature | Tower/Sector/Backhaul/plan-draft menu for **that** id | `selectedMapAsset` — never `dataCache.*( )[0]` |
| Plan create/delete | `POST/DELETE /api/plans/:id/features` | Plan mode stages drafts; Remove From Plan deletes feature |
| Embed scale | Modals fit iframe pane | `data-cwl-map-embed=1` + island CSS; no `100vw` fullscreen inside iframe |

Live probes (same-origin on GCE):

```text
GET /api/network/sites
GET /api/network/sectors
GET /api/network/cpe
GET /api/network/equipment
GET /api/network/hardware-deployments
GET /api/plans/:id/features
```

Manual map checks (Plan iframe after hard-refresh):

1. Pan works; right-click empty map opens Add Site menu **visible** in-pane.
2. Right-click a tower/sector opens that entity’s menu (Edit/Delete hit the
   selected id).
3. Add Site modal fits the iframe (scroll body, no overflow off-pane).
4. With an active plan: create stages a diamond; Remove From Plan DELETEs it.

If markers exist but names look synthetic (`Bulk …`, `CWL Eq …`), that is
**tenant seed data**, not a missing iframe — still hydrate correctly so clicks
and modals match origin.

### 4. Close the loop

1. Fix converter and/or island (never a generated-output mutator).
2. One-pass or asset redeploy to GCE; bump `WISP_CWL_ASSET_BUST`.
3. Re-run toggle click harness + map layer counts + hardware modal hydrate +
   map right-click / modal-fit checks above.
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

## Deploy wizard / route audit (2026-07-19p)

Full GCE module audit found deploy looking “broken” for a different reason than
missing routes (all origin static pages exist in CWL):

1. **Wizard slot leak** — `DeploymentWizard` / `SiteDeploymentWizard` compile to
   a closed `BaseWizard` shell **plus** visible `<div slot="content|footer">`
   siblings. Those siblings painted under the map. Converter must wrap the
   entire self-gated lift in one `cwl-self-gated-shell` with `data-cwl-shell-key`.
2. **Approved filters** — `openApproved` opened the lifted wrapper, not
   `[data-cwl-shell-key="showProjectFilters"]`.
3. **`selectDeploymentType`** — wired as `data-cwl-action` but had no client
   handler to open `showDeploymentWizard`.
4. Thin/auth redirects (`/modules/monitor` → monitoring, portal login shells)
   are intentional; inventory `/add` and `/reports` are present.

Discovery addition: after opening any module, assert no
`[data-cwl-lifted-component]` hosts visible `[slot]` siblings while a child
`[data-cwl-shell-key][hidden]` remains closed.

## Map interaction + embed fidelity canon (2026-07-19u) — required

Operator feedback loop that got us “close”: pan works → right-click dead →
menus open but wrong target → modals overflow the plan iframe. Treat these as
**permanent rules**, not one-off patches.

### Canonical target

- Live fidelity target is **GCE chimera** `http://34.61.255.147:19100`
  (not Firebase) unless the operator explicitly asks for Hosting.
- Hard-refresh after every asset deploy (`Ctrl+F5`). Confirm bust on
  `wisp-cwl-client.js`, `wisp-cwl-modules.js`, `wisp-cwl-map.js`,
  `wisp-cwl-map-island.css`, and `wisp-cwl-modules.css`.

### Deploy footguns (never repeat)

1. Asset-only redeploy: `runWispGceDeploy({ skipLift: true, structuralOnly: true })`.
2. `skipLift` **implies** `structuralOnly` in the pipeline — never let Phase-30
   shells wipe structural `routes.cwl`.
3. Bump `WISP_CWL_ASSET_BUST` in `scripts/lib/cwl-chimera-gateway.mjs` whenever
   island/client/modules assets change. Bust **CSS** links too (modules.css /
   map-island.css), not only JS.

### Self-gated shells (menus + modals)

Converted `{#if show}` chrome looks like:

```html
<div data-cwl-lifted-component="MapContextMenu">
  <div class="cwl-self-gated-shell" data-cwl-shell-key="showContextMenu" hidden>
    <div class="context-menu">…</div>
  </div>
</div>
```

**Canon:** opening any lifted menu/modal must `revealLiftedHost` — unhide the
host **and** nested `.cwl-self-gated-shell` / `[data-cwl-shell-key]` /
`[data-cwl-bind="if"]` / `.modal-overlay` surfaces. Unhiding only the outer
`[data-cwl-lifted-component]` is a no-op (ancestor `[hidden]` still wins).
Close with `concealLiftedHost`.

Same pattern for `openLiftedModal` (AddSiteModal, AddSectorModal, …).

### Map right-click / CRUD (island owns it)

Files: `fixtures/hub-wisp-management/wisp-cwl-map.js`,
`wisp-cwl-modules.js` (`handleMapMessage`), `wisp-cwl-client.js`.

| Behavior | Rule |
| --- | --- |
| Right-click blank | hitTest miss → MapContextMenu at coords |
| Right-click graphic | hitTest hit → Tower/Sector/Backhaul menu bound to `selectedMapAsset` |
| Edit / Delete | Use `selectedMapAsset.id` (and plan feature id). **Never** `dataCache.towers[0]` |
| Plan mode create | `POST /api/plans/:planId/features` (not live `/api/network/*`) |
| Plan mode remove | `DELETE /api/plans/:planId/features/:id` + `plan-features-changed` to parent |
| Button detection | ArcGIS `event.button` **or** `event.native.button`; also `contextmenu` fallback |
| Menu placement | `placeFixedMenu` clamps into `window.innerWidth/Height` |
| Modal fit | `fitModalToViewport` + embed CSS; scroll `.modal-body` |

### Client must not steal map menu clicks

`wisp-cwl-client.js` document capture routes `data-cwl-action="handleAction"`
with args like `create-site-tower` through the generic `/add|create|new/`
family into the **wrong** structural editor.

**Canon:** if the click is inside
`MapContextMenu` / `TowerActionsMenu` / `SectorActionsMenu` /
`BackhaulActionsMenu`, **return without routing** and let the map island
bubble handler own it.

### Embed scale (Plan/Deploy SharedMap iframe)

Origin coverage-map CSS uses `.fullscreen-map { width:100vw; height:100vh }`.
Inside the plan iframe that overflows the pane and makes Add* cards feel
oversized.

**Canon:**

1. Gateway boots early: set `html[data-cwl-map-embed="1"]` when
   `parent !== window` or `mode=plan|deploy` / `planMode|deployMode`.
2. `wisp-cwl-map-island.css` under that attribute: map chrome `inset:0; 100%`
   (not `100vw`); modals `max-width/max-height` to available pane; menus
   `max-height` + overflow; single-column form grids in embed.
3. Parent plan/deploy overlays in `wisp-cwl-modules.css` also fit
   `100dvh - 1rem` with scrollable bodies.
4. Prefer `width/height: 100%` + `inset: 0` over `100vw`/`100vh` for map
   fullscreen hosts (avoids scrollbar-induced horizontal overflow).

### Nested shell / wizard open (client)

When opening any overlay via `openOverlayEl`:

- Reveal nested `.cwl-self-gated-shell`
- Reveal `[data-cwl-bind="if"]` panels gated on `show…`
- Reveal escaped `[slot]` siblings of a closed BaseWizard host
- Boot: hide escaped slot siblings while the gate stays closed

### What still is not “done” (honest remaining gaps)

Full prioritized backlog: **§ Sub-modal / nested overlay gap catalog** below and
`reports/wisp/sub-modal-gap-catalog.json`. Highlights:

- Billing `showUpgradeModal` only (honest-skip — no origin chrome).
- Row-level hydrate for list Edit buttons (needs selected-entity payload).
- Standalone `/modules/coverage-map` (non-embed) keeps full desktop chrome;
  embed rules must not break that path.
- Origin DEAD/UNWIRED components — do **not** invent chrome for them.

### Agent checklist before claiming map/UI fidelity

- [ ] Bust matches live HTML for client, modules, map, island CSS
- [ ] Right-click blank + feature menus visible in Plan iframe
- [ ] Delete/Edit targets selected id (spot-check Network tab)
- [ ] Add modal fits pane (no off-screen overflow)
- [ ] No deepen injectors; no Phase-30 wipe on skipLift deploy
- [ ] Gap recorded here if deferred
- [ ] Sub-modal catalog regenerated (`node scripts/wisp-cwl-sub-modal-census.mjs`)
      when claiming overlay work done

## Sub-modal / nested overlay gap catalog (2026-07-20)

**Machine-readable:** `reports/wisp/sub-modal-gap-catalog.json`  
**Regen:** `node scripts/wisp-cwl-sub-modal-census.mjs` (hits live GCE)

Live census (GCE, 16 high-traffic pages, bust `20260720e`): **189** lifted
components, **159** shell keys. **0** pages with BaseWizard slot siblings
(full-lift slot fold). Orphan toggles: billing `showUpgradeModal` only.
PCI `showSiteEditor` / `showSiteEditorInWizard` now carry shell-keys.

Do **not** invent UI for origin DEAD GATE / UNWIRED components (AddNOC dedicated
gates, CustomerBillingModal never imported, TransferModal, etc.). Fix reachable
origin paths first.

### Nested open chains that must work (origin truth)

```
coverage-map blank right-click → MapContextMenu → AddSite|Sector|CPE
coverage-map tower right-click → TowerActionsMenu
  → SiteEdit | AddSector | AddBackhaul | AddInventory | HardwareDeployment
      → EPCDeployment (nested)
coverage-map plan-draft right-click → plan-draft-menu → edit/add/deploy
DeviceManagementPanel → UnifiedDeviceDetailsModal
Deploy SiteEquipmentModal → AddInventoryModal
Deploy DeployedHardwareModal → showEditModal | showEPCEditModal
CreateWorkOrderModal → CustomerLookupModal
TicketDetailsModal → showAssignModal
PCI ContextMenu → SiteEditor | CellEditor | ImportWizard
HSS RemoteEPCs → SiteDevicesModal → Add device
```

### Priority backlog (fix next)

| Pri | Id | Page | Issue |
| --- | --- | --- | --- |
| ~~P0~~ | plan-draft-menu | coverage-map | **Fixed `20260720a`** — island `openPlanDraftMenu` + wire |
| ~~P0~~ | map-filter-device-panel | coverage-map | **Fixed `20260720a`** — shell-key reveal + hydrate |
| ~~P0~~ | hardware-deploy-epc-chain | coverage-map | **Fixed `20260720a`** — open nest; save stays honest (no HSS) |
| ~~P0~~ | map-first-entity-fallback | coverage-map | **Fixed `20260720a`** — selected/nearest, no `dataCache.*[0]` |
| ~~P1~~ | deploy-wizard-slot-leak | deploy | **Fixed `20260720b`**; **cleared `20260720e`** — converter slot fold (0 live slots) |
| ~~P1~~ | deploy-site-equipment-chain | deploy | **Fixed `20260720b`** — view-inventory → SiteEquipment → AddInventory |
| ~~P1~~ | deployed-hardware-nested-edit | deploy | **Fixed `20260720b`** — showEditModal / showEPCEditModal row hydrate |
| ~~P1~~ | deploy-planners-hydrate | deploy | **Fixed `20260720b`** — analyze rehydrate + approve/reject |
| ~~P1~~ | plan-parent-panels | plan | **Fixed `20260720b`** — PlanLayerFilter; origin-dead report/missing/req left alone |
| ~~P2~~ | pci-site-editor-orphan | pci-resolution | **Fixed `20260720c`**; **`20260720e`** — `isOpen`→`showSiteEditor` shell-key |
| ~~P2~~ | pci-analysis-stack | pci-resolution | **Fixed `20260720c`** — analysis/context→editor bridges |
| ~~P2~~ | billing-upgrade | billing | **Fixed `20260720c`** — honest-skip (no origin chrome) |
| ~~P2~~ | work-order-lookup-nest | work-orders | **Fixed `20260720c`** — Create → CustomerLookup |
| ~~P2~~ | helpdesk-assign-nest | help-desk | **Fixed `20260720c`** — Details → Assign |
| ~~P2~~ | monitoring-alert-ticket-nest | monitoring | **Fixed `20260720c`** — alert→ticket + setup |
| ~~P2~~ | hss-remote-epc-nest | hss-management | **Fixed `20260720c`** — SiteDevices → Add |
| ~~P2~~ | inventory-wizards-slots | inventory | **Fixed `20260720c`** — key opens + slot hide |
| ~~P2~~ | customers-onboarding | customers | **Fixed `20260720c`** — prefer lifted Add/Edit + onboard |
| ~~P3~~ | voice-inline-modals | voice-telephony | **Fixed `20260720d`** — account/TN/location/tips opens |
| ~~P3~~ | sites-module-modals | sites | **Fixed `20260720d`** — lifted SiteEdit/Sector/CPE/Backhaul/EPC |
| ~~P3~~ | cbrs-wizards | cbrs-management | **Fixed `20260720d`** — setup/registration/settings stack |
| ~~P3~~ | user-mgmt-nest | user-management | **Fixed `20260720d`** — invite/edit → delete confirm |
| ~~P3~~ | honest-unavailable-map | coverage-map | **Closed `20260720d`** — keep honest (no invent) |
| ~~P3~~ | origin-dead-unwired | origin | **Closed `20260720d`** — do not invent |

### How to work the backlog

1. Pick one **P0/P1** id; reproduce on GCE with hard-refresh.
2. Fix converter and/or island (never output mutators). Prefer
   `revealLiftedHost` / row hydrate / nested shell open — not deepen buttons.
3. Bump `WISP_CWL_ASSET_BUST`; `runWispGceDeploy({ skipLift:true, structuralOnly:true })`.
4. Re-run `node scripts/wisp-cwl-sub-modal-census.mjs`; mark the gap fixed in
   this section (or remove from JSON gaps array) with the bust id.
5. Do not “fix” origin-dead gates by inventing chrome.
