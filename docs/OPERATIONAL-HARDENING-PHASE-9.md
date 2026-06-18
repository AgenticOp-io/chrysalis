# Operational hardening — Phase 9

> **Status:** active (2026-06-18)  
> **Queue:** **G6120–G6153**  
> **Builds on:** Phase 8 strict product proof (**G6113**) passed on GCE.

Phase 9 wires Phase 8 proof into **hub-completion**, **capability matrix**, and **CI gates** so strict proof is a recorded operational artifact, not only a one-off GCE run.

## Phase A — Entry (G6120)

| ID | Gate | Smoke |
| --- | --- | --- |
| G6121 | `runOperationalHardeningPhase9DocGate` | — |
| G6120 | `runStrategicPlanPhase9OperationalEntryGate` | `pnpm run hub:strategic-plan-phase9-operational-entry-smoke` |

## Phase B — Hub completion (G6130)

| ID | Gate | Composes |
| --- | --- | --- |
| G6131 | `runHubCompletionPhase8ProductProofSectionGate` | `buildHubCompletionPhase8ProductProofSection` |
| G6132 | `runGcePhase8StrictArtifactGate` | `reports/ci/gce-phase8-strict.ok` (optional skip locally) |
| G6130 | `runStrategicPlanPhase9HubCompletionGate` | section + artifact gates |

Smoke: `pnpm run hub:strategic-plan-phase9-hub-completion-smoke`

Hub-completion schema **512** adds **`phase8ProductProof`**.

## Phase C — Capability + north-star honesty (G6140)

| ID | Gate | Composes |
| --- | --- | --- |
| G6141 | `runCapabilityMatrixPhase8ProofGate` | `hub:capability-matrix` includes phase8 strict |
| G6142 | `runNorthStarMetricsHonestyGate` | `docs/STRATEGIC-PLAN.md` §0 metrics documented |
| G6140 | `runStrategicPlanPhase9CapabilityGate` | matrix + north-star |

Smoke: `pnpm run hub:strategic-plan-phase9-capability-smoke`

## Phase D — Program close (G6150)

| ID | Gate | Smoke |
| --- | --- | --- |
| G6150 | `runStrategicPlanPhase9OperationalCloseGate` | `pnpm run hub:strategic-plan-phase9-operational-close-smoke` |

**GCE strict re-run:** `pnpm run test:gce:phase8-strict` (not required for Phase 9 close; artifact gate accepts skip when marker absent).
