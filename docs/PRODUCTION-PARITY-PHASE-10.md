# Production parity — Phase 10

> **Status:** active (2026-06-19)  
> **Queue:** **G6200–G6253** (depth **G6213–G6241**)  
> **Authority:** Plan amendment 2026-06-19 — unpause Runtime Phase C, WordPress vertical, matrix expansion, multi-language evidence path.

Phase 10 promotes previously policy-paused workstreams into a **verify-gated** build queue. Claims still require oracle/replay evidence (DESIGN §3).

## Phase A — Runtime Phase C: production SQL/session (G6200)

| ID | Gate | Smoke |
| --- | --- | --- |
| G6201 | `runProductionParityPhase10DocGate` | — |
| G6202 | `runProductionSessionRedisParityGate` | `pnpm run test:oracle-php-session-redis` (skip when Redis unset) |
| G6203 | `runProductionSqlVerifyParityGate` | `pnpm run hub:production-sql-verify-parity-smoke` |
| G6204 | `runRuntimeCwlProductionSessionHonestyGate` | composes depth |
| G6206 | `runMysqliProbeIngestSqlGate` | composes depth |
| G6207 | `runMysqliProbeSqlVerifyParityGate` | mysqli-probe verify replay |
| G6208 | `runRuntimePhaseCProductionDepthGate` | composes G6200 + G6204–G6207 |
| G6209 | `runRuntimeCwlProductionSessionBridgeGate` | runtime-cwl injected session |
| G6210+ | `runRuntimeCwlResolveSessionBridgeGate` | cookie → session via `resolveSession` |
| G6200 | `runRuntimePhaseCProductionParityGate` | composes session + SQL gates |

Runtime plan: [`RUNTIME-CWL-PARITY-PLAN.md`](./RUNTIME-CWL-PARITY-PLAN.md) Phase C **active**.

## Phase B — WordPress vertical (G6210)

| ID | Gate | Smoke |
| --- | --- | --- |
| G6210 | `runWordPressVerticalPhase10EntryGate` | `pnpm run hub:strategic-plan-phase10-wordpress-entry-smoke` |
| G6212 | `runWordPressVerticalProbeIngestGate` | `pnpm run hub:wordpress-probe-ingest-smoke` |
| G6213 | `runWordPressVerticalObserveManifestGate` | composes depth |
| G6214 | `runWordPressVerticalAdminRouteIngestGate` | composes depth |
| G6215 | `runWordPressVerticalVerifyPrepareGate` | composes depth |
| G6216 | `runWordPressVerticalPhase10DepthGate` | composes depth |
| G6217 | `runWordPressVerticalOracleCaptureGate` | `chrysalis.probe.json` capture routes |
| G6218 | `runWordPressVerticalOracleLiveCaptureGate` | `pnpm run hub:wordpress-probe-oracle-capture-smoke` |
| G6219 | `runWordPressVerticalVerifyReplayGate` | verify replay correctness 1 |

Plan: [`WORDPRESS-VERTICAL-PHASE-10.md`](./WORDPRESS-VERTICAL-PHASE-10.md).

## Phase C — Matrix expansion (G6220)

Matrix gold for **customer routes / flagship fixtures** only — not vanity pairs.

| ID | Gate | Smoke |
| --- | --- | --- |
| G6220 | `runMatrixExpansionPhase10Gate` | `pnpm run hub:strategic-plan-phase10-matrix-expansion-smoke` |
| G6221 | `runMatrixCustomerRouteRegistryGate` | composes depth |
| G6222 | `runMatrixExpansionPhase10DepthGate` | composes depth |
| G6223 | `runMatrixCustomerRouteOraclePairGate` | mysqli-probe oracle-product verify replay |

## Phase D — Multi-language evidence (G6230)

Second-oracle path + capability matrix honesty for additional language claims.

| ID | Gate | Smoke |
| --- | --- | --- |
| G6230 | `runMultiLanguageEvidencePhase10Gate` | composes Phase 4 close (skip-fast) + matrix block |
| G6231 | `runMultiLanguageExpressOraclePairGate` | composes depth |

## Phase E — Hub completion (G6240)

Hub-completion schema **513** + `phase10ProductionParity` section (depth schema **4**).

| ID | Gate |
| --- | --- |
| G6241 | `runStrategicPlanPhase10DepthGate` |

## Phase F — Program close (G6250)

| ID | Gate | Smoke |
| --- | --- | --- |
| G6250 | `runStrategicPlanPhase10ProductionParityCloseGate` | `pnpm run hub:strategic-plan-phase10-production-parity-close-smoke` |

Depth smoke: `pnpm run hub:strategic-plan-phase10-depth-smoke`

## Invariants (DESIGN §3)

- Session/SQL parity gates use **oracle + verify** — not runtime-cwl stub claims alone.
- WordPress and matrix expansion emit **holes** when unsupported — no silent best-effort.
- Multi-language production claims require **second oracle flagship** evidence.
