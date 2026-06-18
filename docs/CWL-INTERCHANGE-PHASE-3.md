# CWL interchange — Phase 3 plan

> **Status:** accepted (2026-06-17)  
> **Authority:** `docs/STRATEGIC-PLAN.md` Phase 3; **G5830**  
> **North star:** project-to-CWL on translate + authoring bootstrap minimum

## Goal

Open **Phase 3** with verify-gated CWL interchange: every translate exports `migration.cwl`, semantic diff is available for review, and authoring bootstrap (templates, preview, diagnose v3) stays green.

## Phase A — Project-to-CWL translate path (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanMonth3ProjectToCwlGate` | doc + CWL diff + oracle fixtures (+ optional roundtrip) |

Registry: `docs/PROJECT-TO-CWL-TRANSLATE-PATH.md` (**G5720**).

## Phase B — Authoring bootstrap (shipped)

| Gate | Scope |
| --- | --- |
| `runCwlAuthoringBootstrapHardeningGate` | templates + preview dev loop + diagnose v3 |

Registry: Month 1 program (**G5680**).

## Phase C — STRATEGIC-PLAN entry reinforcement (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase3CwlInterchangeEntryGate` | doc + project-to-CWL + authoring bootstrap |

```bash
pnpm run hub:strategic-plan-phase3-cwl-interchange-entry-smoke
```

Set `CHRYSALIS_STRATEGIC_PLAN_SKIP_PROJECT_CWL_ROUNDTRIP=1` for oracle-only project-to-CWL (Vitest default).

## In progress (Phase 3 backlog)

_(none — Phase 3 reinforcement queue complete at G5873; default queue follows STRATEGIC-PLAN Phase 4 unless amended.)_

## Phase D — CWL RFC track (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase3CwlRfcGate` | doc + `runCwlAllRfcRoundtripSmoke` |

Registry: `docs/CWL-RFC-PHASE-3-REINFORCEMENT.md`.

```bash
pnpm run hub:strategic-plan-phase3-cwl-rfc-smoke
```

Set `CHRYSALIS_STRATEGIC_PLAN_SKIP_CWL_RFC_ROUNDTRIP=1` for doc-only (Vitest default).

## Phase E — OpenAPI export (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase3CwlOpenapiExportGate` | doc + `runCwlOpenapiSmoke` |

Registry: `docs/CWL-OPENAPI-EXPORT-PHASE-3.md`.

```bash
pnpm run hub:strategic-plan-phase3-cwl-openapi-export-smoke
```

## Phase F — Full-stack parallel track alignment (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase3FullstackAlignmentGate` | doc + Month 2 scope RFC gate |

Registry: `docs/CWL-FULLSTACK-PHASE-3-ALIGNMENT.md`.

```bash
pnpm run hub:strategic-plan-phase3-fullstack-alignment-smoke
```

## Phase G — Phase 3 program close (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase3CwlInterchangeCloseGate` | entry + RFC + OpenAPI + full-stack |

```bash
pnpm run hub:strategic-plan-phase3-cwl-interchange-close-smoke
```

Skip heavy roundtrips: `CHRYSALIS_STRATEGIC_PLAN_SKIP_PROJECT_CWL_ROUNDTRIP=1` and `CHRYSALIS_STRATEGIC_PLAN_SKIP_CWL_RFC_ROUNDTRIP=1`.

## Operator entry points

```bash
pnpm run hub:strategic-plan-month3-project-to-cwl-smoke
pnpm run hub:strategic-plan-month1-hardening-smoke
pnpm run hub:cwl-diff-smoke
pnpm run hub:cwl-all-rfc-roundtrip-smoke
pnpm run hub:cwl-openapi-smoke
```

## Invariants (DESIGN §3)

- CWL export requires WebIR provenance — no smoke-only contract claims
- Semantic diff only — no line-oriented text diff masquerading as route review
