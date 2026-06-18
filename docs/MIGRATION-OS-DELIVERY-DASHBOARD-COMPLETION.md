# Migration OS — delivery dashboard + hub-completion

> **Status:** accepted (2026-06-17)  
> **Authority:** `docs/MIGRATION-OS-PHASE-2.md`; **G5810**  
> **North star:** `phase2MigrationOs` section in hub-completion aggregates operator surfaces

## Goal

Wire **delivery dashboard** evidence and Phase 2 strategic smokes into **hub-completion** so CI and Console share one Migration OS status block.

## Phase A — Delivery dashboard smoke (shipped)

| Smoke | Scope |
| --- | --- |
| `runDeliveryDashboardSmoke` | Artifacts + license slice on plain-php flagship |

Registry: `hub-delivery-dashboard.mjs` (**G152**).

## Phase B — Hub-completion section (shipped)

| Field | Source |
| --- | --- |
| `phase2MigrationOs.deliveryDashboard` | `hub:delivery-dashboard-smoke` |
| `phase2MigrationOs.multiOrigin` | `hub:migration-os-mega-batch-smoke` |
| `phase2MigrationOs.entry` | `hub:strategic-plan-phase2-migration-os-entry-smoke` |
| `phase2MigrationOs.licenseTier` | `hub:strategic-plan-phase2-license-tier-smoke` |

Registry: `hub-completion-phase2-migration-os.mjs`. Hub-completion **schema 511**.

## Phase C — STRATEGIC-PLAN reinforcement (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase2DeliveryDashboardGate` | doc + dashboard smoke + section validator |

```bash
pnpm run hub:strategic-plan-phase2-delivery-dashboard-smoke
```

## Invariants (DESIGN §3)

- Dashboard aggregates verify evidence — not emit-only status
