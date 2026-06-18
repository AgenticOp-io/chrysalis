# CWL runtime — session stub honesty

> **Status:** accepted (2026-06-17)  
> **Authority:** `docs/CWL-RUNTIME-PHASE-5.md`; **G5950**  
> **North star:** session stub smoke only until Redis/DB parity exists

## Goal

Keep **session semantics honest** in Phase 5: stub session smoke passes, but production session claims remain paused per `docs/RUNTIME-CWL-PARITY-PLAN.md` Phase C.

## Phase A — Session stub (shipped)

| Gate | Scope |
| --- | --- |
| `runSessionStubGate` | Stub session bridge smoke on CWL flagship |

## Phase B — STRATEGIC-PLAN reinforcement (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase5SessionStubGate` | doc + session stub |

```bash
pnpm run hub:strategic-plan-phase5-session-stub-smoke
```

## Non-goals

- Marketing production Redis session without verify parity gates

## Invariants (DESIGN §3)

- Real session parity remains emit + verify authoritative; runtime-cwl uses stubs
