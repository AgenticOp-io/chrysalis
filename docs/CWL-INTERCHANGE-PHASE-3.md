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

## Phase C — STRATEGIC-PLAN Phase 3 entry (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase3CwlInterchangeEntryGate` | doc + project-to-CWL + authoring bootstrap |

```bash
pnpm run hub:strategic-plan-phase3-cwl-interchange-entry-smoke
```

Set `CHRYSALIS_STRATEGIC_PLAN_SKIP_PROJECT_CWL_ROUNDTRIP=1` for oracle-only project-to-CWL (Vitest default).

## In progress (Phase 3 backlog)

- CWL RFC track reinforcement (body, response, effects, auth presets)
- OpenAPI export from CWL on translate
- Full-stack CWL surface parallel track alignment

## Operator entry points

```bash
pnpm run hub:strategic-plan-month3-project-to-cwl-smoke
pnpm run hub:strategic-plan-month1-hardening-smoke
pnpm run hub:cwl-diff-smoke
```

## Invariants (DESIGN §3)

- CWL export requires WebIR provenance — no smoke-only contract claims
- Semantic diff only — no line-oriented text diff masquerading as route review
