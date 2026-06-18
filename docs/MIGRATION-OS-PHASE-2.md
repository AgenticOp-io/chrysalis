# Migration OS — Phase 2 plan

> **Status:** accepted (2026-06-17)  
> **Authority:** `docs/STRATEGIC-PLAN.md` Phase 2; **G5780**  
> **Deliverable:** per-project **migration contract** (`routes.cwl` + hole manifest)

## Goal

Turn scattered Hub smokes into a coherent **Migration OS**: scan a site, pick a program, export a contract, and surface verify evidence — before operators claim a migration is "done".

## Phase A — Site intelligence (shipped)

| Smoke | Scope | Done when |
| --- | --- | --- |
| `runSiteIntelligenceSmoke` | Languages, frameworks, route estimate | primaryOrigin + routeCount |

Registry: `hub-site-intelligence.mjs` (**G266**).

## Phase B — Migration contract + programs (shipped)

| Smoke | Scope | Done when |
| --- | --- | --- |
| `runMigrationContractSmoke` | `routes.cwl` + hole manifest export | schema ok, holes counted |
| `runMigrationProgramsSmoke` | api-slice / auth-slice / public-read-only templates | ≥3 templates |
| `runMigrationOsSmoke` | contract + planner + programs composite | G231–G233 |

Registry: `hub-migration-contract.mjs`, `hub-migration-programs.mjs`.

## Phase C — Evidence dashboard (shipped)

| Smoke | Scope | Done when |
| --- | --- | --- |
| `runHubEvidenceSmoke` | verify %, holes, pipeline gate, migration contract path | schema v4 + programId |

Registry: `hub-evidence.mjs` (**G96** / **G184**).

## Phase D — Path explorer apply (shipped)

| Smoke | Scope | Done when |
| --- | --- | --- |
| `runPathAdviceSmoke` | Pair grade + pipeline steps for program | ≥4 steps |

Registry: `hub-apply-path-advice.mjs` (**G236**).

## Phase E — STRATEGIC-PLAN entry reinforcement (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase2MigrationOsEntryGate` | doc + site intel + migration OS + evidence + path advice (+ optional standalone batch) |

```bash
pnpm run hub:strategic-plan-phase2-migration-os-entry-smoke
```

Set `CHRYSALIS_STRATEGIC_PLAN_SKIP_MIGRATION_OS_STANDALONE_BATCH=1` for core pillars only (Vitest default).

## In progress (Phase 2 backlog)

- Multi-origin Migration OS batch on GCE
- Delivery dashboard wiring in hub-completion Phase 2 section

## Phase F — License tier alignment (shipped)

| Gate | Scope | Done when |
| --- | --- | --- |
| `runHubLicenseTierSmoke` | Tier map + OSS-default report | ≥7 features, ladder ok |
| `runStrategicPlanPhase2LicenseTierGate` | doc + tier smoke | G5790 |

Registry: `docs/MIGRATION-OS-LICENSE-TIER-ALIGNMENT.md`, `hub-license-status.mjs`.

```bash
pnpm run hub:strategic-plan-phase2-license-tier-smoke
```

## Operator entry points

```bash
pnpm run hub:migration-os-smoke
pnpm run hub:site-intelligence-smoke
pnpm run hub:evidence-smoke
pnpm run hub:path-advice-smoke
pnpm run hub:migration-os-standalone-batch-smoke
```

## Invariants (DESIGN §3)

- Migration contract exports require WebIR ingest — no smoke-only CWL claims
- Evidence dashboard reads verify reports; playbooks advise, they do not bypass verify
