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
