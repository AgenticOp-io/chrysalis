# Chimera cutover — Phase 1 plan

> **Status:** closed (2026-06-17)  
> **Authority:** `docs/STRATEGIC-PLAN.md` Phase 1; **G5770**  
> **North star:** verify-gated phased cutover runbooks + operator metrics snapshots

## Goal

Make **chimera cutover safety** a function of verify evidence and operator metrics — not ad-hoc DevOps checklists. Phase 1 pins the runbook generator and operator snapshot contract for PHP wedge flagships.

## Phase A — Runbook generator (shipped)

| Component | Role |
| --- | --- |
| `buildChimeraCutoverRunbook` | Phased steps: prep gates → shadow → canary ramp → cutover |
| `runChimeraCutoverSmoke` | Plain-PHP flagship runbook has ≥3 phases |

Registry: `hub-chimera-cutover.mjs` (**G143**).

## Phase B — Operator metrics contract (shipped)

| Fixture | Role |
| --- | --- |
| `fixtures/ci/chimera-operator-snapshot-v1-smoke.json` | `chrysalis.chimera.operator-snapshot` schema v1 baseline |
| `fixtures/ci/chimera-operator-snapshot-batch-v1-smoke.json` | Fleet rollup batch shape |

Runtime: `@chrysalis/runtime-chimera` **`buildChimeraOperatorSnapshot`**.

## Phase C — Multi-origin batch (optional, GCE)

| Smoke | Scope |
| --- | --- |
| `runChimeraCutoverOriginBatchSmoke` | plain-php + symfony + express + Laravel-min |

Skip locally with `CHRYSALIS_STRATEGIC_PLAN_SKIP_CHIMERA_ORIGIN_BATCH=1`.

## Phase D — STRATEGIC-PLAN reinforcement (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase1ChimeraCutoverGate` | doc + runbook smoke + operator fixture (+ optional origin batch) |

```bash
pnpm run hub:strategic-plan-phase1-chimera-cutover-smoke
```

## Operator entry points

```bash
pnpm run hub:chimera-cutover-smoke
pnpm run hub:chimera-cutover-origin-batch-smoke
pnpm run ci:chimera-operator-snapshot
```

See also `docs/OPERATIONS.md` (operator metrics section) and `docs/HOW-TO.md` (canary/cutover recipes).

## Invariants (DESIGN §3)

- Cutover phases require verify gate evidence from `buildHubEvidenceReport`
- Operator snapshots are file-only; no telemetry phone-home
