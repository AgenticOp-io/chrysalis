# Product proof — Phase 8 (strict reinforcement)

> **Status:** active (2026-06-17)  
> **Queue:** **G6050–G6113**  
> **Authority:** `docs/STRATEGIC-PLAN.md` §7 Phase 8; closes proof gaps left by Phases 0–7 optional `SKIP_*` envs.

Phases 0–7 shipped reinforcement gates that pass locally with `CHRYSALIS_STRATEGIC_PLAN_SKIP_*=1`. Phase 8 composes the **same pillars without skips** when `CHRYSALIS_STRICT_STRATEGIC_PLAN=1` (or on `GITHUB_ACTIONS`).

## Honest boundaries

- **Production SQL/session:** `docs/RUNTIME-CWL-PARITY-PLAN.md` Phase C remains **paused**. Phase 8 proves **stub session + emit verify authority**, not live DB parity.
- **Customer pilot / north-star timing:** operator steps outside the repo; gates prove in-repo evidence factory readiness.
- **WPTP D2+ / sibling repos:** out of scope (see `docs/MASTER-PROGRAM.md`).

## Phase A — Entry (G6050)

| ID | Gate | Smoke |
| --- | --- | --- |
| G6051 | `runProductProofPhase8DocGate` | — |
| G6052 | `resolveStrategicPlanSkips` strict resolver | — |
| G6050 | `runStrategicPlanPhase8ProductProofEntryGate` | `pnpm run hub:strategic-plan-phase8-product-proof-entry-smoke` |

## Phase B — Oracle / wedge proof (G6060)

| ID | Gate | Composes |
| --- | --- | --- |
| G6061 | `runProductProofOraclePhase8DocGate` | — |
| G6060 | `runStrategicPlanPhase8OracleProofGate` | `runStrategicPlanMonth23ExpressOracleGate`, `runStrategicPlanPhase1LaravelIngestDepthGate`, `runStrategicPlanPhase1PhpWedgeGate`, `runStrategicPlanPhase1PhpEmitParityGate` |

Smoke: `pnpm run hub:strategic-plan-phase8-oracle-proof-smoke`

## Phase C — HTTP / emit proof (G6070)

| ID | Gate | Composes |
| --- | --- | --- |
| G6071 | `runProductProofHttpEmitPhase8DocGate` | — |
| G6070 | `runStrategicPlanPhase8HttpEmitProofGate` | `runStrategicPlanMonth12RuntimeParityGate`, `runStrategicPlanPhase6EmitVerifyMegaGate`, `runStrategicPlanPhase6ProductionGraduationGate`, `runStrategicPlanPhase7FullstackEntryGate` (gold verify) |

Smoke: `pnpm run hub:strategic-plan-phase8-http-emit-proof-smoke`

## Phase D — CWL interchange proof (G6080)

| ID | Gate | Composes |
| --- | --- | --- |
| G6081 | `runProductProofCwlInterchangePhase8DocGate` | — |
| G6080 | `runStrategicPlanPhase8CwlInterchangeProofGate` | `runStrategicPlanMonth3ProjectToCwlGate`, `runStrategicPlanPhase3CwlRfcGate` |

Smoke: `pnpm run hub:strategic-plan-phase8-cwl-interchange-proof-smoke`

## Phase E — Hub operator proof (G6090)

| ID | Gate | Composes |
| --- | --- | --- |
| G6091 | `runProductProofHubOperatorPhase8DocGate` | — |
| G6092 | `runHubEvidenceUiProofGate` | Console UI + `/api/hub/projects/{id}/evidence` |
| G6090 | `runStrategicPlanPhase8HubOperatorProofGate` | `runStrategicPlanPhase2MigrationOsCloseGate`, `runHubEvidenceMvpBatchSmoke`, `runHubEvidenceUiProofGate` |

Smoke: `pnpm run hub:strategic-plan-phase8-hub-operator-proof-smoke`

## Phase F — Cutover + runtime honesty (G6100)

| ID | Gate | Composes |
| --- | --- | --- |
| G6101 | `runProductProofCutoverPhase8DocGate` | — |
| G6102 | `runRuntimeSessionSqlHonestyGate` | `RUNTIME-CWL-PARITY-PLAN` Phase C paused |
| G6100 | `runStrategicPlanPhase8CutoverProofGate` | `runStrategicPlanPhase1ChimeraCutoverGate`, `runStrategicPlanPhase5SessionStubGate`, `runStrategicPlanPhase5ProductionSearchGate`, `runRuntimeSessionSqlHonestyGate` |

Smoke: `pnpm run hub:strategic-plan-phase8-cutover-proof-smoke`

## Phase G — Program close (G6110)

| ID | Gate | Smoke |
| --- | --- | --- |
| G6110 | `runStrategicPlanPhase8ProductProofCloseGate` | `pnpm run hub:strategic-plan-phase8-product-proof-close-smoke` |

**Strict path (GCE only):** `pnpm run test:gce:phase8-strict` — refreshes **`chrysalis-test-vm`**, sets **`CHRYSALIS_STRICT_STRATEGIC_PLAN=1`**, runs close smoke detached. Status: `pnpm run test:gce:phase8-strict:status`. Do **not** run strict close on Windows (fixture lock contention); local CLI exits **2** unless **`CHRYSALIS_ALLOW_STRICT_LOCAL=1`**.

## Skip env reference (local fast path)

When **not** strict, these env vars remain supported (same as Phases 0–7):

- `CHRYSALIS_STRATEGIC_PLAN_SKIP_ORACLE_VERIFY=1`
- `CHRYSALIS_STRATEGIC_PLAN_SKIP_EMIT_HTTP=1`
- `CHRYSALIS_STRATEGIC_PLAN_SKIP_FLAGSHIP_GOLD=1`
- `CHRYSALIS_STRATEGIC_PLAN_SKIP_PROJECT_CWL_ROUNDTRIP=1`
- `CHRYSALIS_STRATEGIC_PLAN_SKIP_CWL_RFC_ROUNDTRIP=1`
- `CHRYSALIS_STRATEGIC_PLAN_SKIP_LARAVEL_LIVE_GAPS=1`
- `CHRYSALIS_STRATEGIC_PLAN_SKIP_MIGRATION_OS_MEGA_BATCH=1`
- `CHRYSALIS_STRATEGIC_PLAN_SKIP_MIGRATION_OS_STANDALONE_BATCH=1`
- `CHRYSALIS_STRATEGIC_PLAN_SKIP_PHP_WEDGE_FLAGSHIPS=1`
- `CHRYSALIS_STRATEGIC_PLAN_SKIP_EMIT_PARITY_FLAGSHIPS=1`
- `CHRYSALIS_STRATEGIC_PLAN_SKIP_CHIMERA_ORIGIN_BATCH=1`
