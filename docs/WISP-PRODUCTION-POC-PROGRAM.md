> **Archive notice:** Closed **program** — regression and history only. Active stack: [MIGRATION-OS.md](./MIGRATION-OS.md). Index: [rchive/INDEX.md](./archive/INDEX.md).

# WISP production POC program (Phase 28)

> **Status:** **Program closed** (2026-06-27, **G7890**) — was **active** (**G7800**, 2026-06-26)  
> **Authority:** **DESIGN D6270** / close **D6271**; requires **G7790** WISP full-site program **closed**  
> **Predecessor:** [`WISP-FULL-SITE-CWL-PROGRAM.md`](./WISP-FULL-SITE-CWL-PROGRAM.md) (structural cutover)

## Thesis

Phase **27** closed the **structural** full-site bar (zero app-logic holes, native handler contracts, runtime-cwl cutover). Phase **28** completed the **production POC move**: operator HTTP contracts, pipeline honesty, integration client UI depth, and an **oracle trace pilot** for native API handlers — without faking verify.

**Infra that stays infra:** MongoDB, browser SDKs (ArcGIS, ECharts), Firebase as optional vendor OAuth provider.

## Phases

### Phase 28a — Operator HTTP contract (**G7801** — closed)

Align `wisp-cwl-poc-verify`, demo manifest probes, and chimera native API headers post cutover.

**Close:** `pnpm run hub:wisp-production-poc-operator-contract-close-smoke`

### Phase 28b — Scenario inventory + pipeline (**G7802** / **G7803** — closed)

Post-G7790 scenario metadata; `wisp:full-build` runs Phase 27 + 28g apply chain (not Phase 13 re-apply).

**Close:** `pnpm run hub:wisp-production-poc-scenario-close-smoke`, `pnpm run hub:wisp-production-poc-pipeline-close-smoke`

### Phase 28c — Integration client UI depth (**G7804** — closed)

ArcGIS / ECharts / cross-frame chartered routes get CWL `client ui` vendor hosts (SDK remains browser infra).

**Apply:** `pnpm run wisp:apply-phase28g-integrations-ui`  
**Close:** `pnpm run hub:wisp-production-poc-integrations-close-smoke`

### Phase 28d — Oracle trace pilot (**G7805** — closed)

**Honest bar:** WISP native API trace capture + replay before claiming production parity.

| Tier | Criterion | Status |
| --- | --- | --- |
| T1 | Trace capture playbook documented | **green** |
| T2 | Pilot corpus manifest (`chrysalis.wisp-api-trace-pilot.v1.json`) | **green** |
| T3 | ≥1 route replay green via oracle verify | **green** (`GET /api/tenants`, correctness 1.0) |

**Close:** `pnpm run hub:wisp-production-poc-verify-replay-close-smoke`

### Program close (**G7890** — closed)

Phases **28a–28d** doc/contract gates green + **G7790** regression subordinate.

**Smoke:** `pnpm run hub:wisp-production-poc-close-smoke`

## Trace capture playbook (Phase 28d)

1. **Capture (local oracle):** `pnpm run wisp:api-trace-capture` — starts `fixtures/hub-wisp-api-oracle` or pass `--live-base-url`.
2. **Apply handler:** patches `wisp_api_tenants_get` in `api-proxy.cwl` from `wisp-api-tenants-get.golden.json` (JSON string return; nested array object literals are simulate holes).
3. **Store traces** under `fixtures/hub-wisp-management/wisp-api-pilot-traces/` and update `chrysalis.wisp-api-trace-pilot.v1.json`.
4. **Replay verify:** `pnpm run wisp:api-trace-replay-verify` — runtime-cwl native handler vs oracle corpus.

Optional live capture: deploy chimera with `runtime-cwl-native` on GCE (`pnpm run wisp:deploy:gce --skip-lift`) when backend routes exist.

## Honest gaps (post G7890 — not default build)

| Gap | Status |
| --- | --- |
| Full backend-services lift (all `/api/*`) | **Closed** — 109 handlers oracle-verified (`wisp-api-goldens/`, replay 1.0) |
| Firebase Hosting CWL static export | **Closed** — `cwl-static-export/` (87 pages, Phase 29b) |
| Live operator deploy refresh | Operator-run — `wisp:deploy:gce` + `wisp:operator-verify -- --require` |

## Gates

| ID | Gate | Smoke |
| --- | --- | --- |
| **G7800** | Program entry | `hub:wisp-production-poc-program-entry-smoke` |
| **G7801** | Operator HTTP contract | `hub:wisp-production-poc-operator-contract-close-smoke` |
| **G7802** | Scenario inventory post-G7790 | `hub:wisp-production-poc-scenario-close-smoke` |
| **G7803** | Pipeline post-G7790 | `hub:wisp-production-poc-pipeline-close-smoke` |
| **G7804** | Integration client UI | `hub:wisp-production-poc-integrations-close-smoke` |
| **G7805** | Verify replay pilot | `hub:wisp-production-poc-verify-replay-close-smoke` |
| **G7890** | **Production POC close** | `hub:wisp-production-poc-close-smoke` |
| **G7891** | Post-close governance | `hub:maintenance-mode-governance-smoke` |

## Apply chain (post-G7790 fixture refresh)

```bash
pnpm run wisp:apply-post-g7790-chain
# or individually: wisp:apply-phase27b-native-api … wisp:apply-phase28g-integrations-ui
```

Re-applies Phase 28d pilot handler when `wisp-api-tenants-get.golden.json` exists.

## Related

- [`WISP-CWL-FULLSTACK-PROGRAM.md`](./WISP-CWL-FULLSTACK-PROGRAM.md) — Phase 12–14 POC history
- [`PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) — default queue when G7890 closed

**G7890 regression:** `pnpm run hub:wisp-production-poc-close-smoke` (includes **G7790**).
