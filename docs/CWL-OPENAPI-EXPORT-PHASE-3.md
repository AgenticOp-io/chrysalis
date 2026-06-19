# CWL OpenAPI export — Phase 3

> **Status:** closed (2026-06-17)  
> **Authority:** `docs/CWL-INTERCHANGE-PHASE-3.md`; **G5850**  
> **North star:** optional OpenAPI export from lifted WebIR on translate paths

## Goal

Prove **OpenAPI export from CWL/WebIR** on flagship fixtures — the interchange complement to OpenAPI→CWL import (**G139**).

## Phase A — Export smoke (shipped)

| Component | Scope |
| --- | --- |
| `exportProjectOpenApi` | WebIR → OpenAPI 3.x paths |
| `runCwlOpenapiSmoke` | plain-php flagship ≥10 paths |
| `hub-migration-contract.mjs` | `artifacts.openapi` in contract bundle |

## Phase B — STRATEGIC-PLAN reinforcement (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase3CwlOpenapiExportGate` | doc + OpenAPI smoke |

```bash
pnpm run hub:strategic-plan-phase3-cwl-openapi-export-smoke
```

## Operator scripts

```bash
pnpm run hub:cwl-openapi-smoke
```

## Invariants (DESIGN §3)

- OpenAPI export reflects WebIR routes — not hand-authored stubs
- Import (Stage B) and export are separate evidence paths
