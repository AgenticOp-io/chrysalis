# Project-to-CWL translate path

> **Status:** accepted (2026-06-17)  
> **Authority:** `docs/STRATEGIC-PLAN.md` §12 Month 3; **G5720**  
> **Phase 3:** CWL interchange + authoring bootstrap

## Goal

Every hub **translate** and **ingest-emit** path exports a reviewable **`migration.cwl`** contract and emits **semantic CWL diff** artifacts when a baseline exists — so migration programs can audit route changes, not opaque file churn.

## Phase A — Translate export + diff (shipped)

| Step | Component | Done when |
| --- | --- | --- |
| Export | `exportProjectMigrationCwl` / `hub-translate.mjs` | `.chrysalis/migration.cwl` written after translate |
| Diff | `writeProjectCwlDiffArtifacts` in `hub-translate.mjs` | `.chrysalis/cwl-diff.{json,md}` when baseline present |
| Contract | `hub-migration-contract.mjs` schema v2 | `cwlDiff` paths in migration contract bundle |

## Phase B — Oracle fixture gates (shipped)

| Gate | Scope | Done when |
| --- | --- | --- |
| `runProjectToCwlOracleGates` | plain-php, symfony, express, laravel-min, tiny-blog | Hole-free export where required |
| `runProjectToCwlMandatoryGate` | Oracle + all-origins roundtrip | G1799 / queue 65 |
| `runCwlDiffMandatoryGate` | Gold semantic diff fixture | `fixtures/hub-gold-cwl-diff` |

## Phase C — STRATEGIC-PLAN reinforcement (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanMonth3ProjectToCwlGate` | doc + diff + oracle (+ optional full roundtrip) |

```bash
pnpm run hub:strategic-plan-month3-project-to-cwl-smoke
```

Set `CHRYSALIS_STRATEGIC_PLAN_SKIP_PROJECT_CWL_ROUNDTRIP=1` for plain-php + symfony oracle only (Vitest default).

## Operator scripts

| Script | Purpose |
| --- | --- |
| `pnpm run hub:project-to-cwl-roundtrip-smoke` | All 23 origins re-lift |
| `pnpm run hub:cwl-diff-smoke` | Semantic diff gold |
| `pnpm run hub:translate-cwl-roundtrip-smoke` | hub-translate → CWL re-lift |

## Non-goals

- Mandatory CWL diff without a baseline file (diff is skipped honestly)
- Selling project-to-CWL as production migration without verify evidence on the origin slice

## Invariants (DESIGN §3)

- Export goes through WebIR — no shortcut emit without provenance
- Holes in export remain explicit in `migration.cwl` and diagnose output
- Diff is **semantic** (route/handler/body), not line-oriented text diff
