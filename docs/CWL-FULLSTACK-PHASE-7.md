# Full-stack CWL surface — Phase 7 plan

> **Status:** accepted (2026-06-17)  
> **Authority:** `docs/STRATEGIC-PLAN.md` Phase 7; **G6010**  
> **North star:** CWL full-stack flagships with hole budgets and scope RFC evidence

## Goal

Close the **parallel full-stack track** with scope RFC alignment, flagship pilot evidence, and hole-budget enforcement — without claiming origin component-tree lowering.

## Phase A — Scope RFC (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanMonth2FullstackScopeGate` | scope RFC + catalog + hole budget + diagnose v3 |

Registry: `docs/CWL-FULLSTACK-SCOPE-RFC.md` (**G5700**).

## Phase B — Flagship pilot (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanMonth34FullstackPilotGate` | hole budget + interpolation + flagship smoke |

Registry: `docs/CWL-FULLSTACK-FLAGSHIP-PILOT.md` (**G5730**).

Set `CHRYSALIS_STRATEGIC_PLAN_SKIP_FLAGSHIP_GOLD=1` for preview/budget without gold verify (Vitest default).

## Phase C — STRATEGIC-PLAN entry (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase7FullstackEntryGate` | doc + scope + flagship pilot |

```bash
pnpm run hub:strategic-plan-phase7-fullstack-entry-smoke
```

## Phase D — Hole budget reinforcement (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase7HoleBudgetGate` | doc + budget v2 + delivery interpolation |

Registry: `docs/CWL-FULLSTACK-HOLE-BUDGET-PHASE-7.md`.

## Phase E — Phase 7 program close (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase7FullstackCloseGate` | entry + hole budget |

```bash
pnpm run hub:strategic-plan-phase7-fullstack-close-smoke
```

## Non-goals

- Hydration, client stores, production SQL/session without parity evidence
- New per-queue authoring ladder markdown

## Invariants (DESIGN §3)

- Hole budget violations fail the gate — no silent ceiling bumps
- Unsupported UI/SSR constructs remain explicit holes
