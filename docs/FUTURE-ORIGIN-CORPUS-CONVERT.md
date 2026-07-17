# Future: origin source corpus → piecemeal convert → demo

> **Status:** **LOCKED method** — **DESIGN D6444** · canon [`UNIVERSAL-TRANSLATOR-CANON.md`](./UNIVERSAL-TRANSLATOR-CANON.md) **§2C** · gate **G9993**  
> **Why this exists:** UI-only convert cannot make the product work. Features were built over years across **many files** (Module_Manager UI + `backend-services` APIs + shared libs).  
> **POC surface:** WISPTools management demo (`wisptools-management.web.app`) — evidence for Universal Translator, not the product itself.

---

## 1. The method (do not skip)

```text
1. Ingest ALL origin source files
2. Persist a code database (SQLite) + planning JSON
3. Derive a convert queue (pieces)
4. Convert ONE piece at a time → verify / bind / hole
5. Restage + deploy demo only after the piece is honest
```

| Law | Doc |
| --- | --- |
| Translate only | **D6442** · canon §2A |
| Source UI is look authority | **D6443** · canon §2B |
| Whole-product file corpus + queue | **D6444** · canon §2C (this file) |

**Refuse:** Redesigning colors/layout in CWL overlays; inventing map engines; claiming “demo done” from a single page shell while `/api/*` or islands are unbound.

---

## 2. What to index (POC roots)

| Root | Role |
| --- | --- |
| `…/wisptools/Module_Manager` | SvelteKit UI, components, stores, map controllers |
| `…/wisptools/backend-services` | Express `/api/*` contract authority (oracle bind / native CWL handlers) |

Set `CHRYSALIS_WISP_ROOT` to Module_Manager. The sibling `backend-services` tree is discovered automatically.

---

## 3. Artifacts (code database)

Rebuild:

```bash
pnpm run hub:origin-source-corpus
pnpm run hub:origin-source-corpus-smoke
```

| Artifact | Path |
| --- | --- |
| Planning JSON (stats + pieces) | `reports/origin-corpus/chrysalis.source-corpus.v1.json` |
| **Code database** (per-file rows) | `reports/origin-corpus/chrysalis.source-corpus.v1.sqlite` |
| Convert queue | `reports/origin-corpus/chrysalis.convert-queue.v1.json` |

### SQLite tables

- `files` — root, path, kind, sha, imports, symbols, inferred `http_path`
- `pieces` — convert units with priority, depends_on, next_action
- `meta` — kind / schemaVersion / roots / generatedAt

### File kinds (examples)

`page` · `layout` · `component` · `lib` · `api-handler` · `style` · `config` · `source` · `asset`

### Piece kinds

| Kind | Meaning |
| --- | --- |
| `ui-route` | One `+page.svelte` → HTTP path |
| `module-support` | Components/libs under `src/routes/modules/<name>/` |
| `api-cluster` | Backend route family (`/api/auth`, `/api/network`, …) |
| `shared-lib` | Cross-cutting `src/lib/*` (auth, tenant, maps, api-client) |

---

## 4. Default convert order (demo)

Always re-read `chrysalis.convert-queue.v1.json` → `next[]`. Typical front of queue:

1. `ui:/login`, `ui:/dashboard` — shells must match Module_Manager
2. `api:auth`, `api:tenants`, `api:users` — session/tenant truth
3. `api:network` (+ coverage-related APIs) — map data
4. `module-support:coverage-map` + `ui:/modules/coverage-map` — ArcGIS island + origin CSS/classes
5. `ui:/modules/plan`, `ui:/modules/deploy` — iframe/SharedMap contract
6. Remaining modules / admin — piece by piece

**Per piece checklist**

1. List all `paths` for the piece from the DB  
2. Lift / bind / wire only what those files define (D6442)  
3. Prefer holes over invention  
4. Run the smallest relevant smoke  
5. Update piece `status` in the queue when we add status tracking  
6. Deploy demo only when the piece’s live contract works (or is honestly holed)

---

## 5. Demo pipeline (management hosting)

```bash
# Index first (also runs inside from-scratch)
pnpm run hub:origin-source-corpus

# Convert → static export → stage → optional Firebase
pnpm run hub:wisp-poc-from-scratch -- --deploy-firebase
```

- **From-scratch gate:** **G9992** · report `reports/wisp/poc-from-scratch.json`  
- **Corpus gate:** **G9993** · `hub:origin-source-corpus-smoke`  
- **Hosting:** `https://wisptools-management.web.app` (`hosting:management`)  
- **Look:** `original-css/*` only for origin classes; map island sheet is CWL-only markers (**D6443**)

Details: [`WISP-POC-FROM-SCRATCH.md`](./WISP-POC-FROM-SCRATCH.md).

---

## 6. Query examples

```bash
# How many files per kind
node -e "const {DatabaseSync}=require('node:sqlite'); const db=new DatabaseSync('reports/origin-corpus/chrysalis.source-corpus.v1.sqlite',{readOnly:true}); console.log(db.prepare('SELECT kind, COUNT(*) n FROM files GROUP BY kind ORDER BY n DESC').all());"

# Coverage-map support files
node -e "const {DatabaseSync}=require('node:sqlite'); const db=new DatabaseSync('reports/origin-corpus/chrysalis.source-corpus.v1.sqlite',{readOnly:true}); console.log(db.prepare(\"SELECT path FROM files WHERE path LIKE '%coverage-map%' ORDER BY path\").all().length);"
```

---

## 7. Future work (record here as we go)

| Date | Piece / note | Status |
| --- | --- | --- |
| 2026-07-15 | Corpus v1 + queue (799 files, 151 pieces) + G9993 smoke | **done** |
| 2026-07-15 | Wire corpus step into `hub:wisp-poc-from-scratch` | **done** |
| 2026-07-15 | This doc + demo convert pass (corpus → from-scratch → Firebase management) | **done** (live: `https://wisptools-management.web.app`) |
| 2026-07-15 | Background truth: HSS `https://hss.wisptools.io/api/network/{sites,sectors,cpe,equipment}` returns 200 + CORS for management hosting; CF `apiProxy` is 5xx — client must keep `preferDirectBackend` | **known** |
| 2026-07-15 | Coverage stuck popups: origin `.modal-overlay{display:flex}` overrode UA `[hidden]`; island CSS `[hidden]{display:none!important}`; deep-lift Add*/Help; skip inventing Tips/Help shells on coverage-map; JSON.stringify CWL HTML embeds | **done** (redeployed management) |
| 2026-07-15 | Convert queue consumer CLI: `hub:convert-all-pieces` / `hub:convert-next-piece` | **done** |
| 2026-07-15 | **Convert all 151 pieces** → statuses updated; static export 104 pages; Firebase management redeployed. Report: `reports/origin-corpus/chrysalis.convert-all-pieces.v1.json` | **done** |
| 2026-07-15 | Sync Express mounts → `wisp-api-paths.json` (`hub:sync-api-paths`) + regenerate native api-proxy (59 paths); fix `:param`→`[param]` UI lift; expand pieces to 155 (layouts/styles/shared components); **0 holes** | **done** |
| 2026-07-15 | Chimera: stub `wisp-api-native` / 501 → prefer HSS upstream; extract `moduleTips` (81 tips / 14 modules) + coverage-map tip island; residual corpus pieces → **159** (700 files); broader list hydration selectors | **done** |
| 2026-07-15 | Tips islands for dashboard/plan/deploy (+ other modules via `WispCwlTips`); re-apply oracle goldens into `api-proxy.cwl`; stage `assets/wisp-api-goldens/*` + map golden fallback | **done** |
| 2026-07-15 | Fill remaining **105** API goldens (contract-empty/mutate) → **229/229** handlers applied; map context-menu → AddSite/NOC/Warehouse + Create Site POST `/api/network/sites` | **done** |
| 2026-07-16 | Live-refresh network GETs from HSS (`hub:live-refresh-api-goldens`) — sites/sectors real arrays; cpe/equipment `[]`; re-applied 229 handlers | **done** |
| 2026-07-16 | Wire AddSector / AddCPE / AddBackhaul saves + hydrate site `<select>`s from map cache; CPE gets context-menu lat/lng | **done** |
| 2026-07-16 | Expand live-refresh defaults (12 open GETs) + `--discover`; wire AddNOC / AddWarehouse → POST `/api/network/sites` | **done** |
| 2026-07-16 | Bearer live-refresh via `--firebase-demo-login` (plans/tenant-settings/…); customers cards use `fullName`; inventory/customers golden fallback + empty honesty | **done** |
| 2026-07-16 | **Next 10 batch:** plan list + sites table + work-orders/notifications empty honesty; structural Add Customer/Item saves; plan golden fallback; admin GET skip + mutate traces (`hub:live-mutate-trace-goldens`) | **done** |
| 2026-07-16 | **Next 20 batch:** sector/CPE siteId; WO/site/bundle/inventory creates; hardware→equipment; maintain/monitor→incidents; tenant-settings; plan status PUT; extra lists; card edit; scan; nearest-site; 7 live mutate 201s | **done** |
| 2026-07-16 | **Next 100 batch:** remount/honesty matrix; CBRS/PCI/ACS/coverage hydrates; equipment/sector/CPE saves; portal/admin/billing honest holes; live GET+mutate goldens; `hub:fidelity-batch100`; Firebase management redeploy | **done** (ledger: `reports/wisp/fidelity-batch100.json`) |
| 2026-07-16 | **Next 1000 batch:** hole taxonomy (1865 markers); map AddInventory + honest Vehicle/RMA/EPC/HSS; action menus; structural inventory transfer; live GET/mutate; `hub:fidelity-batch1000`; Firebase management redeploy | **done** (ledger: `reports/wisp/fidelity-batch1000.json`) |
| 2026-07-16 | **Residuals close:** incident POST schema wired (8× mutate incl. incidents); customer 409 tenantId quirk honest UX; graphs stay 404→incidents; platform-admin optional env probe; load-bind without force-settle; `hub:fidelity-residuals-close` | **done** (`reports/wisp/fidelity-residuals-close.json`) |
| 2026-07-16 | **External residuals executed:** platform-admin `admin@wisptools.io` bootstrapped (`hub:platform-admin-bootstrap`) → `/api/users`+`/admin/tenants` 200 goldens; monitoring remount → `/api/monitoring/graphs/devices` (live 200); customer 409 → client PUT-existing fallback; backend `customers.js` index-heal + graphs `GET /` ready pending GCE deploy (`gcloud auth login` + `deploy-backend-to-gce.ps1`) | **done** (HSS root `GET /api/monitoring/graphs` still 404 until deploy) |
| 2026-07-16 | **GCE backend deploy + leadHash index heal:** `deploy-backend-to-gce.ps1` Upload; graphs `GET /` **200**; dropped/recreated `tenantId_1_leadHash_1` as partial unique; customer POST **201** (`CUST-2026-0002`) | **done** |
| 2026-07-16 | **Deepen batch:** monitoring `/api/monitoring/graphs`; admin `/admin/tenants`; sites Edit+PUT; map SiteEditModal PUT; inv/WO row-nav + detail hydrate; load-bind +8 pages; customer mutate **201**; `hub:fidelity-deepen` + Firebase management redeploy | **done** (`reports/wisp/fidelity-deepen.json`) |
| 2026-07-16 | **Deepen2 batch:** inv/WO/incident/bundle Edit+PUT; sector/CPE Edit+PUT; tenant-settings PUT form; map sector/CPE edit + device details; 6× live PUT goldens; `hub:fidelity-deepen2` + Firebase management redeploy | **done** (`reports/wisp/fidelity-deepen2.json`) |
| 2026-07-16 | **Deepen passes 3–12 (×10):** equipment Edit+PUT; map backhaul edit; notif mark-read; users cols; transfer/scan polish; plan approve POST; detail hydrate expand; WO/incident lifecycle; `hub:fidelity-deepen-n10` + Firebase redeploy | **done** (`reports/wisp/fidelity-deepen-n10.json`) |
| 2026-07-16 | **Deepen passes 13–22 (×10):** WO assign/log; incident notes; plan reject/authorize; customer history/complaints; inventory deploy; equipment create; pricing/subs/install lists; admin tenants polish; map equipment create; `hub:fidelity-deepen-n10b` + Firebase redeploy | **done** (`reports/wisp/fidelity-deepen-n10b.json`) |
| 2026-07-16 | **Deepen passes 23–32 (×10):** inv return/maint; WO list-complete; incident→ticket; plan features; HD list; bundle items; sector/CPE create; create-subscriber; install submit (honest photos gate); `hub:fidelity-deepen-n10c` + Firebase redeploy | **done** (`reports/wisp/fidelity-deepen-n10c.json`) |
| 2026-07-16 | **Deepen passes 33–42 (×10):** inv bulk-update; WO assign; plan toggle-visibility; sites bulk-import; geocode; notif refresh; equip PUT (honest 403 ownership); bundle item PUT; incident close; plan requirements/analyze; `hub:fidelity-deepen-n10d` + Firebase redeploy | **done** (`reports/wisp/fidelity-deepen-n10d.json`) |
| 2026-07-16 | **Deepen passes 43–52 (×10):** inv bulk-import; reverse-geocode; bundle DELETE/use; plan PO/feature/req mutates; site HW + HD PUT/DELETE; notif count; equip bulk-import; `hub:fidelity-deepen-n10e` + Firebase redeploy | **done** (`reports/wisp/fidelity-deepen-n10e.json`) |
| 2026-07-16 | **Deepen passes 53–62 (×10):** customers/WO bulk-import; WO start/close; complaint PUT; customer/inventory/bundle DELETE; network DELETEs; install approve (honest gate); pricing DELETE+import; `hub:fidelity-deepen-n10f` + Firebase redeploy | **done** (`reports/wisp/fidelity-deepen-n10f.json`) |
| 2026-07-16 | **Deepen passes 63–72 (×10):** HSS groups PUT/DELETE; BW PUT (create 500 honest); subscribers PUT/DELETE (id-shape honest); subcontractors/permissions/invite/suspend honest HSS bugs; assign-owner; plans DELETE; CBRS import body; `hub:fidelity-deepen-n10g` + Firebase redeploy | **done** (`reports/wisp/fidelity-deepen-n10g.json`) |
| 2026-07-16 | **Deepen passes 73–82 (×10):** inv return/maint schemas; install PUT+photos; plan discover bbox; incident notes; WO complete; pricing create; BW PUT existing; graphs devices; `hub:fidelity-deepen-n10h` + Firebase redeploy | **done** (`reports/wisp/fidelity-deepen-n10h.json`) |
| 2026-07-16 | **Deepen desk cleanup:** shared harness + catalog + CLI (`hub:fidelity-deepen -- --batch| --candidates`); n10g/n10h thin wrappers; n10–n10f frozen legacy | **done** |
| 2026-07-16 | **Deepen passes 83–92 (×10):** desk `--probe` → notif read; tenant ACS; HSS group PUT; plans PUT/analyze/features(sector); bundle PUT/items; customer+CPE PUT; equip create+PUT; `hub:fidelity-deepen -- --batch n10i` + Firebase | **done** (`reports/wisp/fidelity-deepen-n10i.json`) |
| 2026-07-16 | **Deepen passes 93–102 (×10):** sectors/sites PUT; site HW; BW PUT; WO log/assign/start; incident PUT/notes/close; inv PUT/deploy; HD PUT; plans toggle-visibility; geocode; `hub:fidelity-deepen -- --batch n10j` | **done** (`reports/wisp/fidelity-deepen-n10j.json`) |
| 2026-07-16 | **Deepen passes 103–112 (×10):** plan features GET; bundle use; complaints; HSS sub/groups; pricing import; WO close; notif count; sites bulk; `hub:fidelity-deepen -- --batch n10k` | **done** (`reports/wisp/fidelity-deepen-n10k.json`) |
| 2026-07-16 | **Deepen passes 113–122 (×10):** sector/CPE/inv/customer/plan/bundle/WO/incident creates; HD DELETE; equip bulk+graphs; `hub:fidelity-deepen -- --batch n10l` | **done** (`reports/wisp/fidelity-deepen-n10l.json`) |
| 2026-07-16 | **Deepen passes 123–132 (×10):** scan lookup; transfer; site/WO DELETE; plan ready→approve→auth; tenant company; install create; group GET; requirements; pricing basePrice; scan check-in/out honest residual; `hub:fidelity-deepen -- --batch n10m` | **done** (`reports/wisp/fidelity-deepen-n10m.json`) |
| 2026-07-16 | **Deepen passes 133–142 (×10):** plan features GET/DELETE; ready→reject; inv bulk-update; customer history/subscriber; incident ack/resolve/ticket; CBRS devices import; `hub:fidelity-deepen -- --batch n10n` + Firebase | **done** (`reports/wisp/fidelity-deepen-n10n.json`) |
| 2026-07-16 | **Script hygiene:** removed orphan one-shots (`wisp-hydrate-audit`, `wisp-residual-audit`, `wisp-reconvert-triage`, `wisp-cwl-slim-overlay-css`, `gce-wisp-hybrid-restart`); collapsed redundant `hub:fidelity-deepen-n10g`…`n10n` package aliases → `--batch` | **done** |
| 2026-07-16 | **Deepen passes 143–152 (×10):** source-doc first — plan req del / feature PATCH / missing-hw; bundle items category; CPE/equip ownership (`X-User-Email`); inv alerts/by-location; HSS group cycle; pricing `/price`; `hub:fidelity-deepen -- --batch n10o` + Firebase | **done** (`reports/wisp/fidelity-deepen-n10o.json`) |
| 2026-07-16 | **Deepen passes 153–162 (×10):** WO/incident/customer stats + SLA/warranty/maint alerts; customer email search; WO assigned; create-subscriber (GET subscriber honest residual); inv csv; stats toolbar UI; `hub:fidelity-deepen -- --batch n10p` + Firebase | **done** (`reports/wisp/fidelity-deepen-n10p.json`) |
| — | (none — deepen-n10p closed; next `n10q` 163–172 via `--source-doc`) | **open** |

### Next 10 (execute in order) — **batch closed 2026-07-16**

| # | Step | Status |
| --- | --- | --- |
| 1–10 | Prior batch | **done** |

### Next 20 (execute in order) — **batch closed 2026-07-16**

| # | Step | Status |
| --- | --- | --- |
| 1 | Sector create with real `siteId` | **done** |
| 2 | CPE create with HSS-required fields | **done** |
| 3 | Work-order create modal | **done** |
| 4 | Sites Create Site toolbar | **done** |
| 5 | Hardware → `/api/network/equipment` | **done** |
| 6 | Bundles create + empty honesty | **done** |
| 7 | Tenant-settings hydrate (ACS settings) | **done** |
| 8 | Plan approve/start/deploy live PUT | **done** |
| 9 | Deploy page uses `/api/plans` | **done** |
| 10 | Help-desk/maintain → `/api/incidents` | **done** |
| 11 | Monitoring → `/api/incidents` (graphs 404) | **done** (honest remount) |
| 12–15 | Incidents/pricing/subs/install list notes | **done** |
| 16 | Customer edit prefill from card | **done** |
| 17 | Inventory scan on structural page | **done** |
| 18 | Map AddSector nearest site bind | **done** |
| 19 | Live mutate goldens (7× 201) | **done** |
| 20 | Smoke + Firebase deploy | **done** (this batch) |

### Next 100 (execute in order) — **batch closed 2026-07-16**

Ledger: `reports/wisp/fidelity-batch100.json` · runner: `pnpm run hub:fidelity-batch100`

| # | Area | Status |
| --- | --- | --- |
| 1–20 | Remount + honest holes (voice/hss/billing/admin/…) | **done** |
| 21–42 | Module hydrates (incl. CBRS/PCI/ACS/portal honesty) | **done** |
| 43–59, 61–62 | Structural creates/saves (no invent PUT/tenant) | **done** |
| 60 | Incident create if API allows | **skipped-no-schema** |
| 63–80 | Map/portal/ACS/admin/billing depth | **done** |
| 81–95 | Live GET refresh + 7× mutate 201 + goldens stage | **done** |
| 96–100 | Syntax check + Firebase stage/deploy + this §7 entry | **done** |

Honest residuals: HSS 404/403 mounts stay holes; `/api/monitoring/graphs` still 404 (incidents remount); customer POST may 409 on demo tenant quirk.

### Next 1000 (execute in order) — **batch closed 2026-07-16**

Ledger: `reports/wisp/fidelity-batch1000.json` · taxonomy: `reports/wisp/fidelity-batch1000-hole-taxonomy.json` · runner: `pnpm run hub:fidelity-batch1000`

| # | Area | Status |
| --- | --- | --- |
| 1–40 | Corpus/measure + indexed residual must-skips | **done** / **skipped-indexed** |
| 41–220 | Coverage-map inventory wire + honest EPC/HSS/Vehicle/RMA | **done** / **skipped-no-api** |
| 221–540 | Module hydrate/honesty/empty matrix (127 export pages) | **done** |
| 541–720 | Dead-API honesty (portal/admin invent skipped) | **done** / **skipped-dead-api** |
| 721–840 | Live GET refresh + mutate goldens | **done** |
| 841–920 | Hole classification (no force-settle) | **done** / **skipped-opaque** |
| 921–980 | Client leftovers (transfer, prior structural) | **done** / incident **skipped-no-schema** |
| 981–1000 | Syntax + stage + Firebase deploy + this §7 entry | **done** |

Honest residuals unchanged: indexed docs/assets; Vehicle/RMA/EPC/HSS invents; portal/billing invent; opaque `{expr}` interp; graphs/incident schema.

### Residuals close — **closed 2026-07-16**

Ledger: `reports/wisp/fidelity-residuals-close.json` · runner: `pnpm run hub:fidelity-residuals-close`

| Residual | Result |
| --- | --- |
| Incident POST | **done** — schema from HSS validation; structural editor; mutate probe 201 |
| Customer create 409 | **done** — root cause was unique `(tenantId, leadHash)` indexing `null`; partial index + POST **201** live |
| Monitoring graphs | **done** — `/api/monitoring/graphs` and `/devices` both **200** after GCE deploy |
| Platform-admin bearer | **done** — `hub:platform-admin-bootstrap` → `admin@wisptools.io`; `/api/users` + `/admin/tenants` goldens |
| Load-bind (no force-settle) | **done** — customers/sites/inventory/help-desk hole deltas −46/−69/−37/−53 |

### Deepen batch — **closed 2026-07-16**

Ledger: `reports/wisp/fidelity-deepen.json` · runner: `pnpm run hub:fidelity-deepen`

| Item | Result |
| --- | --- |
| Monitoring remount | **done** — `/api/monitoring/graphs` (root + devices **200**, empty list honest) |
| Admin tenants | **done** — `/admin/tenants` remount + golden |
| Sites Edit + PUT | **done** — structural table Edit → `PUT /api/network/sites/:id` |
| Map SiteEditModal | **done** — PUT with siteId from tower cache |
| Inv/WO detail | **done** — row click nav + list→detail hydrate |
| Load-bind expand | **done** — 12 pages probed (WO/plan/hardware/bundles/users/monitoring/admin) |
| Customer mutate | **done** — POST **201** (`CUST-2026-0003` + mutate probe) |
| Firebase | **done** — `hosting:management` redeployed |

### Deepen2 batch — **closed 2026-07-16**

Ledger: `reports/wisp/fidelity-deepen2.json` · runner: `pnpm run hub:fidelity-deepen2`

| Item | Result |
| --- | --- |
| Inventory / WO / incident / bundle Edit+PUT | **done** — structural FromRow editors |
| Sector / CPE Edit+PUT | **done** — CBRS/PCI/ACS tables + map menus |
| Tenant-settings PUT | **done** — ACS/company form → `PUT /api/tenant-settings` |
| Map device details | **done** — hydrate from `dataCache` (no invent) |
| Live PUT probes | **done** — 6/7 wrote; CPE PUT **403** kept honest (HSS auth) |
| Firebase | **done** — `hosting:management` redeployed |

### Deepen passes 3–12 (×10) — **closed 2026-07-16**

Ledger: `reports/wisp/fidelity-deepen-n10.json` · runner: `pnpm run hub:fidelity-deepen-n10`

| # | Pass | Result |
| --- | --- | --- |
| 3 | Hardware equipment Edit+PUT | **done** — client wired; live list empty → skip honest |
| 4 | Map backhaul/equipment Edit+PUT | **done** — BackhaulActionsMenu → equipment PUT |
| 5 | Notifications mark-read | **done** — `PUT /api/notifications/:id/read` **200** |
| 6 | Users table cols | **done** — email/displayName/role/disabled |
| 7 | Inventory transfer path | **done** — `POST /api/inventory/:id/transfer` **200** (reason enum) |
| 8 | Inventory scan polish | **done** — location fields; lookup **200** |
| 9 | Plans approve POST | **done** — ready→`POST …/approve` **200** |
| 10 | Detail hydrate expand | **done** — customers/sites/help-desk/bundles + row nav |
| 11 | WO lifecycle | **done** — start/complete/close; start **200** |
| 12 | Incident lifecycle | **done** — ack/resolve/close; acknowledge **200** |
| — | Firebase | **done** — `hosting:management` redeployed |

### Deepen passes 13–22 (×10) — **closed 2026-07-16**

Ledger: `reports/wisp/fidelity-deepen-n10b.json` · runner: `pnpm run hub:fidelity-deepen-n10b`

| # | Pass | Result |
| --- | --- | --- |
| 13 | WO assign / log | **done** — both **200** |
| 14 | Incident notes | **done** — notes **200** (+ resolve/convert UI) |
| 15 | Plan reject / authorize | **done** — both **200** |
| 16 | Customer history / complaints | **done** — both **200** |
| 17 | Inventory deploy | **done** — **200** |
| 18 | Equipment create | **done** — **201** (+ empty-list CTA) |
| 19 | Pricing + subcontractors lists | **done** — pricing POST **200**; subs list |
| 20 | Installation documentation | **done** — create **200** |
| 21 | Admin tenants polish | **done** — GET **200** + richer cols |
| 22 | Map equipment create | **done** — context/menu POST **201** |
| — | Firebase | **done** — `hosting:management` redeployed |

### Deepen passes 23–32 (×10) — **closed 2026-07-16**

Ledger: `reports/wisp/fidelity-deepen-n10c.json` · runner: `pnpm run hub:fidelity-deepen-n10c`

| # | Pass | Result |
| --- | --- | --- |
| 23 | Inventory return / maintenance | **done** — both **200** |
| 24 | WO complete from list | **done** — **200** |
| 25 | Incident convert-to-ticket | **done** — **200** |
| 26 | Plan features POST | **done** — **201** (`featureType: site`) |
| 27 | Hardware-deployments | **done** — list empty skip honest |
| 28 | Bundle items POST | **done** — **200** |
| 29 | Sector / CPE create | **done** — both **201**/ok |
| 30 | Customer create-subscriber | **done** — **201** |
| 31 | Install-doc submit | **honest** — needs ≥3 photos (HSS gate) |
| 32 | Install-doc photos | **honest** — multipart; no invent binary |
| — | Firebase | **done** — `hosting:management` redeployed |

### Deepen passes 33–42 (×10) — **closed 2026-07-16**

Ledger: `reports/wisp/fidelity-deepen-n10d.json` · runner: `pnpm run hub:fidelity-deepen-n10d`

| # | Pass | Result |
| --- | --- | --- |
| 33 | Inventory bulk-update | **done** — **200** |
| 34 | WO assign from list | **done** — **200** |
| 35 | Plan toggle-visibility | **done** — **200** |
| 36 | Sites bulk-import | **done** — **200** |
| 37 | Network geocode | **done** — **200** |
| 38 | Notifications refresh after mark-read | **done** — GET + PUT read + refresh |
| 39 | Equipment PUT after create | **honest** — create **201**; PUT **403** ownership |
| 40 | Bundle item PUT | **done** — **200** |
| 41 | Incident close from list | **done** — **200** |
| 42 | Plan requirements / analyze | **done** — both ok |
| — | Firebase | **done** — `hosting:management` redeployed |

### Deepen passes 43–52 (×10) — **closed 2026-07-16**

Ledger: `reports/wisp/fidelity-deepen-n10e.json` · runner: `pnpm run hub:fidelity-deepen-n10e`

| # | Pass | Result |
| --- | --- | --- |
| 43 | Inventory bulk-import | **done** — **200** |
| 44 | Reverse-geocode | **done** — **200** |
| 45 | Bundle item DELETE | **done** — **200** |
| 46 | Bundle use | **done** — **200** |
| 47 | Plan purchase-order | **honest** — **400** no missing hardware |
| 48 | Plan feature PATCH/DELETE | **done** — create+patch+delete |
| 49 | Plan requirement DELETE | **done** — **200** |
| 50 | Site hardware + HD PUT/DELETE | **done** — create/put/delete (`hardware_type: router`) |
| 51 | Notifications unread count | **done** — **200** |
| 52 | Equipment bulk-import | **done** — **200** |
| — | Firebase | **done** — `hosting:management` redeployed |

### Deepen passes 53–62 (×10) — **closed 2026-07-16**

Ledger: `reports/wisp/fidelity-deepen-n10f.json` · runner: `pnpm run hub:fidelity-deepen-n10f`

Same live HSS Mongo API as Module_Manager (`https://hss.wisptools.io`).

| # | Pass | Result |
| --- | --- | --- |
| 53 | Customers bulk-import | **done** — **200** |
| 54 | Work-orders bulk-import | **done** — **200** |
| 55 | WO start + close | **done** — both **200** |
| 56 | Customer complaint PUT | **done** — **200** |
| 57 | Customers soft-DELETE | **done** — **200** |
| 58 | Inventory DELETE | **done** — **200** |
| 59 | Bundle DELETE | **done** — **200** |
| 60 | Network CPE/sector/equipment DELETE | **done** — all ok |
| 61 | Install-doc approve / payment-approve | **honest** — submit/admin gate (or timeout) |
| 62 | Pricing DELETE + import-from-inventory | **done** — create/delete/import |
| — | Firebase | **done** — `hosting:management` redeployed |

### Deepen passes 63–72 (×10) — **closed 2026-07-16**

Ledger: `reports/wisp/fidelity-deepen-n10g.json` · runner: `pnpm run hub:fidelity-deepen-n10g`

Same live HSS Mongo API as Module_Manager (`https://hss.wisptools.io`).

| # | Pass | Result |
| --- | --- | --- |
| 63 | HSS groups PUT/DELETE | **done** — create/put/delete |
| 64 | HSS bandwidth-plans PUT/DELETE | **honest** — create **500**; PUT existing **200** (no DELETE — sole live plan) |
| 65 | HSS subscribers PUT/DELETE | **honest** — create **201**; PUT/DELETE **404** id-shape |
| 66 | Subcontractors POST + approve | **honest** — admin timeout |
| 67 | Permissions role PUT | **honest** — **500** `isPlatformAdminUser` |
| 68 | Users invite | **honest** — **500** Failed to invite user |
| 69 | Users suspend/activate | **honest** — invite gate (no owner suspend) |
| 70 | Admin tenants assign-owner | **done** — **200** |
| 71 | Plans DELETE polish | **done** — create+delete |
| 72 | CBRS import sites/devices body | **done** — **200** |
| — | Firebase | **done** — `hosting:management` redeployed |

### Deepen passes 73–82 (×10) — **closed 2026-07-16**

Ledger: `reports/wisp/fidelity-deepen-n10h.json` · runner: `pnpm run hub:fidelity-deepen-n10h`

| # | Pass | Result |
| --- | --- | --- |
| 73 | Inventory return | **done** — embedded `returnLocation` + `reason: other` |
| 74 | Inventory maintenance | **done** — `type` + `date` |
| 75 | Install-doc PUT | **done** — `installedByName` |
| 76 | Install-doc photos multipart | **honest** — HSS storageBucket missing |
| 77 | Plan marketing discover | **honest** — bbox path **504**/timeout (spatial fallback in UI) |
| 78 | Incident notes | **done** |
| 79 | Work-order complete | **done** |
| 80 | Equipment-pricing create | **done** — `equipmentType: radio` |
| 81 | HSS BW PUT existing | **done** — create still **500** honest |
| 82 | Monitoring graphs devices | **done** — GET hydrate |
| — | Firebase | **done** — `hosting:management` redeployed |

### Deepen desk (harness) — **added 2026-07-16**

Shared tooling so ×10 batches are not copy-pasted runners:

| Piece | Path / command |
| --- | --- |
| Harness | `scripts/lib/wisp-fidelity-deepen-harness.mjs` |
| Batch bodies | `scripts/lib/wisp-fidelity-deepen-batches/{n10g,n10h}.mjs` |
| Catalog | `fixtures/hub-wisp-management/chrysalis.wisp-fidelity-deepen-catalog.v1.json` |
| CLI | `pnpm run hub:fidelity-deepen -- --list` |
| Candidates | `pnpm run hub:fidelity-deepen-candidates` |
| Source doc | `pnpm run hub:fidelity-deepen-source-doc` — **contract authority** (`backend-services` + Module_Manager services) |
| Live probe | `pnpm run hub:fidelity-deepen-probe` — deploy **parity** only (do not invent bodies) |
| Run batch | `pnpm run hub:fidelity-deepen -- --batch n10h` |
| Legacy frozen | `n10`–`n10f` scripts unchanged; `hub:fidelity-deepen-legacy` = original deepen |

Workflow: **candidates → `--source-doc` → `--probe` (parity) → AI proposes ×10 → `--batch` → FUTURE §7**. Bodies from in-repo HSS/`backend-services` (D6442).

### Deepen passes 83–92 (×10) — **closed 2026-07-16**

Ledger: `reports/wisp/fidelity-deepen-n10i.json` · runner: `pnpm run hub:fidelity-deepen -- --batch n10i`

From desk `viableForNextBatch` live GETs + mutate probes.

| # | Pass | Result |
| --- | --- | --- |
| 83 | Notifications PUT `/:id/read` + count | **done** |
| 84 | Tenant-settings ACS PUT | **done** |
| 85 | HSS groups PUT | **done** |
| 86 | Plans PUT | **done** |
| 87 | Plans analyze | **done** |
| 88 | Plans features (`featureType: sector`) | **done** — UI fixed from invalid `site` |
| 89 | Bundle PUT | **done** |
| 90 | Bundle items (`equipmentType: radio`) | **done** |
| 91 | Customers PUT + CPE PUT | **done** |
| 92 | Equipment create+PUT (`type` required) | **done** |
| — | Firebase | **done** — `hosting:management` redeployed |

---

## 8. Related docs

- Canon §2A–2C: [`UNIVERSAL-TRANSLATOR-CANON.md`](./UNIVERSAL-TRANSLATOR-CANON.md)  
- POC one-shot: [`WISP-POC-FROM-SCRATCH.md`](./WISP-POC-FROM-SCRATCH.md)  
- Whole-site close (packages): [`WHOLE-SITE-CWL-CONVERSION.md`](./WHOLE-SITE-CWL-CONVERSION.md)  
- Svelte lessons: [`SVELTE-CWL-CONVERSION-LESSONS.md`](./SVELTE-CWL-CONVERSION-LESSONS.md)  
- Engine lib: `scripts/lib/source-corpus.mjs` · CLI: `scripts/build-origin-source-corpus.mjs`
