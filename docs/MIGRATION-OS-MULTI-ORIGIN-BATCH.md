# Migration OS — multi-origin batch

> **Status:** accepted (2026-06-17)  
> **Authority:** `docs/MIGRATION-OS-PHASE-2.md`; **G5800**  
> **North star:** plain-php + symfony + Laravel-min Migration OS batches pass together

## Goal

Prove **multi-origin** Migration OS depth before GCE mega runs — contract, assessment, and chimera cutover on three PHP-family flagships.

## Phase A — Per-origin batches (shipped)

| Smoke | Fixture |
| --- | --- |
| `runPlainPhpMigrationOsBatchSmoke` | `fixtures/hub-flagship-plain-php` |
| `runSymfonyMigrationOsBatchSmoke` | `fixtures/hub-flagship-symfony` |
| `runLaravelMinMigrationOsBatchSmoke` | Laravel-min scaffold |

## Phase B — Mega batch (shipped)

| Smoke | Scope |
| --- | --- |
| `runMigrationOsMegaBatchSmoke` | All three origin batches |

GCE: deferred via `hub-gce-mega-dedupe` in heavy completion. Local: `pnpm run hub:migration-os-mega-batch-smoke`.

## Phase C — STRATEGIC-PLAN reinforcement (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase2MigrationOsMultiOriginGate` | doc + mega batch |

```bash
pnpm run hub:strategic-plan-phase2-migration-os-multi-origin-smoke
```

Set `CHRYSALIS_STRATEGIC_PLAN_SKIP_MIGRATION_OS_MEGA_BATCH=1` for doc-only (Vitest default).

## Invariants (DESIGN §3)

- Each origin batch includes migration contract export — not smoke-only ingest
