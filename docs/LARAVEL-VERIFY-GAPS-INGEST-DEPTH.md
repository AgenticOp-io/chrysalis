# Laravel verify gaps — ingest depth

> **Status:** accepted (2026-06-17)  
> **Authority:** `docs/PHP-WEDGE-PHASE-1.md` Phase D; **G5750**  
> **North star:** `flagship/laravel-full` via `pnpm run verify:laravel-full`

## Goal

Close the loop from **verify divergence** → **prioritized ingest backlog** → **operator remediation action** — with fixture-backed proof before live flagship runs.

## Phase A — Backlog → ingest action (shipped)

| Fixture | Role |
| --- | --- |
| `fixtures/hub-laravel-verify-gaps-backlog` | Non-zero backlog; body/status mismatches on auth probes |
| `runLaravelVerifyGapsIngestClosureSmoke` | Exports gaps + `ingestRemediation` for top backlog item |

## Phase B — Resolved baseline (shipped)

| Fixture | Role |
| --- | --- |
| `fixtures/hub-laravel-verify-gaps` | Zero backlog; correctness **1.0** on auth probes |
| `runLaravelVerifyGapsResolvedFixtureGate` | Pins resolved shape for regression |

## Phase C — Live flagship (optional, GCE)

| Smoke | Scope |
| --- | --- |
| `runLaravelVerifyLiveGapsClosureSmoke` | Live reports + auth-probe reingest verify closure/replay/http |

Requires `reports/verify-flagship-laravel-full` or equivalent on disk. Skip locally with `CHRYSALIS_STRATEGIC_PLAN_SKIP_LARAVEL_LIVE_GAPS=1`.

## Operator entry points

```bash
pnpm run hub:strategic-plan-phase1-laravel-ingest-depth-smoke
pnpm run hub:laravel-verify-gaps-batch-smoke
pnpm run hub:laravel-verify-live-gaps-closure-smoke
pnpm run hub:laravel-verify-gaps
```

## Invariants (DESIGN §3)

- Ingest remediation surfaces `ingestOwner` + `divergenceKind` — no silent lowering
- Live closure requires verify evidence; fixture smokes do not substitute for production cutover claims
