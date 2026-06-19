# Full-stack CWL — Phase 3 parallel track alignment

> **Status:** closed (2026-06-17)  
> **Authority:** `docs/STRATEGIC-PLAN.md` Phase 7 + Phase 3; **G5860**  
> **North star:** full-stack scope RFC aligned with CWL interchange without reopening queue 437

## Goal

Align **Phase 3 CWL interchange** with the **full-stack CWL parallel track** (Phase 7) via the Month 2 scope RFC — hole catalog, layout/search gates, hole budget v2 — without new authoring queue ladders.

## Phase A — Scope RFC (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanMonth2FullstackScopeGate` | scope doc + catalog + hole budget + diagnose v3 |

Registry: `docs/CWL-FULLSTACK-SCOPE-RFC.md` (**G5700**).

## Phase B — STRATEGIC-PLAN reinforcement (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase3FullstackAlignmentGate` | alignment doc + Month 2 scope gate |

```bash
pnpm run hub:strategic-plan-phase3-fullstack-alignment-smoke
```

## Non-goals

- New pattern-lift matrix gold beyond flagship fixtures
- Reopening CWL authoring queues **111–437**

## Invariants (DESIGN §3)

- Full-stack holes stay catalogued — no silent lowering
- Queue **437** / schema **510** program remains maintenance-only
