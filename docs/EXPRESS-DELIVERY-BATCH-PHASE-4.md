# Express delivery batch — Phase 4

> **Status:** closed (2026-06-17)  
> **Authority:** `docs/SECOND-ORACLE-ORIGIN-PHASE-4.md`; **G5910**  
> **North star:** assessment + chimera cutover on Express flagship

## Goal

Prove **delivery readiness** for the JavaScript/Express origin — migration assessment and phased chimera cutover — alongside depth batch evidence.

## Phase A — Delivery pillars (shipped)

| Smoke | Scope |
| --- | --- |
| `runMigrationAssessmentExpressSmoke` | readiness tier + programId |
| `runChimeraCutoverExpressSmoke` | phased cutover runbook |

Composite: `runExpressDeliveryBatchSmoke` (**G306** / **G308**).

## Phase B — STRATEGIC-PLAN reinforcement (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase4ExpressDeliveryBatchGate` | doc + delivery batch |

```bash
pnpm run hub:strategic-plan-phase4-express-delivery-batch-smoke
```

## Invariants (DESIGN §3)

- Cutover phases must reference verify evidence — not marketing-only readiness claims
