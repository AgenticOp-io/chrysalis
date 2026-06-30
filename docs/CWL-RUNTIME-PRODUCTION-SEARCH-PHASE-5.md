> **Archive notice:** Closed strategic-plan **phase** — source material for gates and fixtures. Active stack: [MIGRATION-OS.md](./MIGRATION-OS.md). Index: [rchive/INDEX.md](./archive/INDEX.md).

# CWL runtime — production search probe

> **Status:** closed (2026-06-17)  
> **Authority:** `docs/CWL-RUNTIME-PHASE-5.md`; **G5940**  
> **North star:** `/search?q=` probe via runtime-cwl (RFC-0015)

## Goal

Pin **production-style search** probing on the CWL flagship through in-process runtime-cwl — not emit-only claims.

## Phase A — Search probe (shipped)

| Gate | Scope |
| --- | --- |
| `runProductionSearchGate` | `GET /search?q=prod21` via `runCwlRuntimeProductionSmoke` |

Registry: `scripts/hub-ingest/hub-cwl-runtime-production-smoke.mjs`.

## Phase B — STRATEGIC-PLAN reinforcement (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase5ProductionSearchGate` | doc + production search |

```bash
pnpm run hub:strategic-plan-phase5-production-search-smoke
```

## Invariants (DESIGN §3)

- Probe uses injected context; no real network in generated handlers
