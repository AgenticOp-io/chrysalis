# WISP production POC program (Phase 28)

> **Status:** **active** (2026-06-26, **G7800**)  
> **Authority:** **DESIGN D6270**; requires **G7790** WISP full-site program **closed**  
> **Predecessor:** [`WISP-FULL-SITE-CWL-PROGRAM.md`](./WISP-FULL-SITE-CWL-PROGRAM.md) (structural cutover)

## Thesis

Phase **27** closed the **structural** full-site bar (zero app-logic holes, native handler contracts, runtime-cwl cutover). Phase **28** completes the **production POC move**: operator HTTP contracts, pipeline honesty, integration client UI depth, and an **oracle trace pilot** for native API handlers — without faking verify.

**Infra that stays infra:** MongoDB, browser SDKs (ArcGIS, ECharts), Firebase as optional vendor OAuth provider.

## Phases

### Phase 28a — Operator HTTP contract (**G7801**)

Align `wisp-cwl-poc-verify`, demo manifest probes, and chimera native API headers post cutover.

**Close:** `pnpm run hub:wisp-production-poc-operator-contract-close-smoke`

### Phase 28b — Scenario inventory + pipeline (**G7802** / **G7803**)

Post-G7790 scenario metadata; `wisp:full-build` runs Phase 27 + 28g apply chain (not Phase 13 re-apply).

**Close:** `pnpm run hub:wisp-production-poc-scenario-close-smoke`, `pnpm run hub:wisp-production-poc-pipeline-close-smoke`

### Phase 28c — Integration client UI depth (**G7804**)

ArcGIS / ECharts / cross-frame chartered routes get CWL `client ui` vendor hosts (SDK remains browser infra).

**Apply:** `pnpm run wisp:apply-phase28g-integrations-ui`  
**Close:** `pnpm run hub:wisp-production-poc-integrations-close-smoke`

### Phase 28d — Oracle trace pilot (**G7805**)

**Honest bar:** WISP native API trace capture + replay before claiming production parity.

| Tier | Criterion |
| --- | --- |
| T1 | Trace capture playbook documented |
| T2 | Pilot corpus manifest (`chrysalis.wisp-api-trace-pilot.v1.json`) |
| T3 | ≥1 route replay green via oracle verify (when corpus present) |

**Close:** `pnpm run hub:wisp-production-poc-verify-replay-close-smoke`

### Program close (**G7890**)

Phases **28a–28d** doc/contract gates green + **G7790** regression subordinate.

**Smoke:** `pnpm run hub:wisp-production-poc-close-smoke`

## Trace capture playbook (Phase 28d)

1. Deploy chimera with `runtime-cwl-native` on GCE (`pnpm run wisp:deploy:gce --skip-lift`).
2. Capture Express oracle traces for pilot routes (`/api/tenants` GET) from `acs-hss-server`.
3. Store under `fixtures/hub-wisp-management/.chrysalis/traces/` and update pilot manifest.
4. Lift handler body from traces → replace stub in `api-proxy.cwl` → run verify replay.

Until T3 is green, Phase **28d** closes on **T1+T2 only** (honest pending replay).

## Honest gaps (post G7890 target)

| Gap | Status |
| --- | --- |
| Full backend-services lift (all `/api/*`) | Pending trace + ingest per route family |
| Firebase Hosting CWL static export | `hosting-apiProxy` remains on Firebase target |
| Live operator deploy refresh | Run `wisp:deploy:gce` + `wisp:operator-verify -- --require` after merge |

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

## Apply chain (post-G7790 fixture refresh)

```bash
pnpm run wisp:apply-post-g7790-chain
# or individually: wisp:apply-phase27b-native-api … wisp:apply-phase28g-integrations-ui
```

## Related

- [`WISP-CWL-FULLSTACK-PROGRAM.md`](./WISP-CWL-FULLSTACK-PROGRAM.md) — Phase 12–14 POC history
- [`PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) — default queue when G7890 closed
