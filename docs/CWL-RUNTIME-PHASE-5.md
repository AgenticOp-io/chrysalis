> **Archive notice:** Closed strategic-plan **phase** — source material for gates and fixtures. Active stack: [MIGRATION-OS.md](./MIGRATION-OS.md). Index: [rchive/INDEX.md](./archive/INDEX.md).

# CWL runtime — Phase 5 plan

> **Status:** closed (2026-06-17)  
> **Authority:** `docs/STRATEGIC-PLAN.md` Phase 5; **G5930**  
> **North star:** in-process `@chrysalis/runtime-cwl` parity with verify-gated emit

## Goal

Open **Phase 5** with credible runtime-cwl depth: gold parity probes, authoring bootstrap hardening, and honest session/SQL boundaries — without marketing production SQL/session parity.

## Phase A — Runtime parity (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanMonth12RuntimeParityGate` | plan doc + `runRuntimeCwlParityGate` + optional Fastify search verify |

Registry: `docs/RUNTIME-CWL-PARITY-PLAN.md` (**G5690**).

```bash
pnpm run hub:strategic-plan-month12-runtime-parity-smoke
```

Set `CHRYSALIS_STRATEGIC_PLAN_SKIP_EMIT_HTTP=1` for in-process-only (Vitest default).

## Phase B — Authoring bootstrap (shipped)

| Gate | Scope |
| --- | --- |
| `runCwlAuthoringBootstrapHardeningGate` | templates + preview + diagnose v3 |

Registry: Month 1 program (**G5680**).

## Phase C — STRATEGIC-PLAN entry reinforcement (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase5CwlRuntimeEntryGate` | doc + runtime parity + authoring bootstrap |

```bash
pnpm run hub:strategic-plan-phase5-cwl-runtime-entry-smoke
```

Set `CHRYSALIS_STRATEGIC_PLAN_SKIP_EMIT_HTTP=1` for in-process-only (Vitest default).

## In progress (Phase 5 backlog)

_(none — Phase 5 reinforcement queue complete at G5963; default queue follows STRATEGIC-PLAN Phase 6 unless amended.)_

## Phase D — Production search probe (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase5ProductionSearchGate` | doc + `runProductionSearchGate` |

Registry: `docs/CWL-RUNTIME-PRODUCTION-SEARCH-PHASE-5.md`.

```bash
pnpm run hub:strategic-plan-phase5-production-search-smoke
```

## Phase E — Session stub honesty (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase5SessionStubGate` | doc + `runSessionStubGate` |

Registry: `docs/CWL-RUNTIME-SESSION-STUB-PHASE-5.md`.

```bash
pnpm run hub:strategic-plan-phase5-session-stub-smoke
```

## Phase F — Phase 5 program close (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase5CwlRuntimeCloseGate` | entry + production search + session stub |

```bash
pnpm run hub:strategic-plan-phase5-cwl-runtime-close-smoke
```

Skip emit HTTP: `CHRYSALIS_STRATEGIC_PLAN_SKIP_EMIT_HTTP=1`.

## Operator entry points

```bash
pnpm run hub:strategic-plan-month1-hardening-smoke
pnpm run hub:strategic-plan-month12-runtime-parity-smoke
pnpm run hub:cwl-authoring-batch-v63-smoke
pnpm run hub:cwl-runtime-production-smoke
```

## Non-goals

- Production Redis/DB session claims without verify evidence
- Runtime marketing without `runRuntimeCwlParityGate` green

## Invariants (DESIGN §3)

- Handlers use injected `ctx.*`; no wall-clock or real network in sandboxes
- Unsupported IR returns **501** — never invented bodies
