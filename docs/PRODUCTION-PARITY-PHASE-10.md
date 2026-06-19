# Production parity — Phase 10

> **Status:** active (2026-06-19)  
> **Queue:** **G6200–G6253**  
> **Authority:** Plan amendment 2026-06-19 — unpause Runtime Phase C, WordPress vertical, matrix expansion, multi-language evidence path.

Phase 10 promotes previously policy-paused workstreams into a **verify-gated** build queue. Claims still require oracle/replay evidence (DESIGN §3).

## Phase A — Runtime Phase C: production SQL/session (G6200)

| ID | Gate | Smoke |
| --- | --- | --- |
| G6201 | `runProductionParityPhase10DocGate` | — |
| G6202 | `runProductionSessionRedisParityGate` | `pnpm run test:oracle-php-session-redis` (skip when Redis unset) |
| G6203 | `runProductionSqlVerifyParityGate` | `pnpm run hub:production-sql-verify-parity-smoke` |
| G6200 | `runRuntimePhaseCProductionParityGate` | composes session + SQL gates |

Runtime plan: [`RUNTIME-CWL-PARITY-PLAN.md`](./RUNTIME-CWL-PARITY-PLAN.md) Phase C **active**.

## Phase B — WordPress vertical entry (G6210)

| ID | Gate | Smoke |
| --- | --- | --- |
| G6210 | `runWordPressVerticalPhase10EntryGate` | `pnpm run hub:strategic-plan-phase10-wordpress-entry-smoke` |

Plan: [`WORDPRESS-VERTICAL-PHASE-10.md`](./WORDPRESS-VERTICAL-PHASE-10.md).

## Phase C — Matrix expansion (G6220)

Matrix gold for **customer routes / flagship fixtures** only — not vanity pairs.

| ID | Gate | Smoke |
| --- | --- | --- |
| G6220 | `runMatrixExpansionPhase10Gate` | `pnpm run hub:strategic-plan-phase10-matrix-expansion-smoke` |

## Phase D — Multi-language evidence (G6230)

Second-oracle path + capability matrix honesty for additional language claims.

| ID | Gate | Smoke |
| --- | --- | --- |
| G6230 | `runMultiLanguageEvidencePhase10Gate` | composes Phase 4 close (skip-fast) + matrix block |

## Phase E — Hub completion (G6240)

Hub-completion schema **513** + `phase10ProductionParity` section.

## Phase F — Program close (G6250)

| ID | Gate | Smoke |
| --- | --- | --- |
| G6250 | `runStrategicPlanPhase10ProductionParityCloseGate` | `pnpm run hub:strategic-plan-phase10-production-parity-close-smoke` |

## Invariants (DESIGN §3)

- Session/SQL parity gates use **oracle + verify** — not runtime-cwl stub claims alone.
- WordPress and matrix expansion emit **holes** when unsupported — no silent best-effort.
- Multi-language production claims require **second oracle flagship** evidence.
