# CWL runtime at scale — Phase 6 plan

> **Status:** accepted (2026-06-17)  
> **Authority:** `docs/STRATEGIC-PLAN.md` Phase 6; **G5970**  
> **North star:** production graduation gates without claiming real SQL/session parity

## Goal

Open **Phase 6** with verify-gated **production graduation** depth: dual-backend emit verify via `runEmitVerifyMegaGate`, composite `runProductionGraduationGate`, Fastify search artifacts, diagnose v2, and Phase 5 runtime foundations — while real SQL/session remains evidence-gated.

## Phase A — Phase 5 foundation (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase5CwlRuntimeCloseGate` | runtime parity + production search + session stub |

Registry: `docs/CWL-RUNTIME-PHASE-5.md`.

## Phase B — Emit verify mega (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase6EmitVerifyMegaGate` | doc + `runEmitVerifyMegaGate` on CWL flagship |

Registry: `docs/CWL-RUNTIME-EMIT-VERIFY-PHASE-6.md`.

Set `CHRYSALIS_STRATEGIC_PLAN_SKIP_EMIT_HTTP=1` for doc-only (Vitest default).

## Phase C — Production graduation (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase6ProductionGraduationGate` | doc + `runProductionGraduationGate` composite |

Registry: `docs/CWL-RUNTIME-PRODUCTION-GRADUATION-PHASE-6.md`.

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase6RuntimeScaleEntryGate` | doc + Phase 5 close + production graduation |

```bash
pnpm run hub:strategic-plan-phase6-runtime-scale-entry-smoke
```

## Phase E — Phase 6 program close (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase6RuntimeScaleCloseGate` | entry + emit verify mega + production graduation |

```bash
pnpm run hub:strategic-plan-phase6-runtime-scale-close-smoke
```

Skip emit HTTP: `CHRYSALIS_STRATEGIC_PLAN_SKIP_EMIT_HTTP=1`.

## Non-goals

- Marketing production Redis/DB session without verify parity
- Real SQL in runtime-cwl without emit + verify evidence

## Invariants (DESIGN §3)

- Emit verify mega remains authoritative for HTTP cutover claims
- Session stub honesty from Phase 5 carries forward
