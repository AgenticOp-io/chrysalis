> **Archive notice:** Closed strategic-plan **phase** — source material for gates and fixtures. Active stack: [`MIGRATION-OS.md`](./MIGRATION-OS.md). Index: [`archive/INDEX.md`](./archive/INDEX.md).

# PHP wedge — Phase 1 plan

> **Status:** closed (2026-06-17)  
> **Authority:** `docs/STRATEGIC-PLAN.md` §7 Phase 1; **G5740**  
> **Priority:** **P0**

## Goal

Drive **PHP oracle migration** depth from verify gaps to operator playbooks — Laravel flagship-first, plain PHP and Symfony as second verticals — without reopening matrix gold or CWL authoring queue ladders.

## Phase A — Verify gaps + playbooks (shipped)

| Gate | Scope | Done when |
| --- | --- | --- |
| `runLaravelVerifyGapsBatchSmoke` | Laravel backlog export + ingest action | Gaps + action ok |
| `runVerifyPlaybooksSmoke` | Divergence kind → Hub playbook mapping | ≥3 playbooks |

Registry: `hub-laravel-verify-gaps.mjs`, `hub-verify-playbooks.mjs`.

## Phase B — Second vertical flagships (shipped)

| Fixture | Smoke | Oracle tier |
| --- | --- | --- |
| `fixtures/hub-flagship-plain-php` | `runPlainPhpFlagshipSmoke` | PHP → hono structural + emit parity |
| `fixtures/hub-flagship-symfony` | `runSymfonyFlagshipSmoke` | Symfony layout pilot |

Full batch: `pnpm run hub:php-wedge-batch-smoke` (G1015 v8).

## Phase C — STRATEGIC-PLAN reinforcement (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase1PhpWedgeGate` | doc + gaps + playbooks + optional flagships |

```bash
pnpm run hub:strategic-plan-phase1-php-wedge-smoke
```

Set `CHRYSALIS_STRATEGIC_PLAN_SKIP_PHP_WEDGE_FLAGSHIPS=1` for gaps/playbooks only (Vitest default).

## In progress (Phase 1 backlog)

_(none — Phase 1 PHP wedge reinforcement queue complete at G5773; next work follows STRATEGIC-PLAN Phase 2 unless amended.)_

## Phase F — Chimera cutover runbooks + operator metrics (shipped)

| Gate | Scope | Done when |
| --- | --- | --- |
| `runChimeraCutoverGate` | Plain-PHP phased runbook | ≥3 phases |
| `runChimeraOperatorSnapshotFixtureGate` | Operator snapshot schema v1 fixture | kind + stats |
| `runStrategicPlanPhase1ChimeraCutoverGate` | doc + cutover + operator (+ optional origin batch) | G5770 |

Registry: `docs/CHIMERA-CUTOVER-PHASE-1.md`, `hub-chimera-cutover.mjs`.

```bash
pnpm run hub:strategic-plan-phase1-chimera-cutover-smoke
```

Set `CHRYSALIS_STRATEGIC_PLAN_SKIP_CHIMERA_ORIGIN_BATCH=1` for plain-php cutover only (Vitest default).

## Phase E — PHP emit parity on oracle slice (shipped)

| Gate | Scope | Done when |
| --- | --- | --- |
| `runPhpOracleMicroTripleEmitVerifyGate` | tiny-blog hono/fastify CI verify + nextjs replay | correctness ≥ 1 |
| `runFlagshipEmitParity` | plain-php + symfony tri-target gold + trace replay | G151/G157 |
| `runStrategicPlanPhase1PhpEmitParityGate` | doc + micro + optional flagships | G5760 |

Registry: `docs/PHP-EMIT-PARITY-ORACLE-SLICE.md`, `fixtures/tiny-blog`, `fixtures/ci/tiny-blog-verify-for-status`.

```bash
pnpm run hub:strategic-plan-phase1-php-emit-parity-smoke
```

Set `CHRYSALIS_STRATEGIC_PLAN_SKIP_EMIT_PARITY_FLAGSHIPS=1` for oracle-micro only (Vitest default).

## Phase D — Laravel ingest depth from verify gaps (shipped)

| Gate | Scope | Done when |
| --- | --- | --- |
| `runLaravelVerifyGapsIngestClosureSmoke` | Backlog fixture → ingest remediation | G804 |
| `runLaravelVerifyGapsResolvedFixtureGate` | Resolved fixture has zero backlog | correctness ≥ 1 |
| `runStrategicPlanPhase1LaravelIngestDepthGate` | doc + closure + resolved (+ optional live) | G5750 |

Registry: `docs/LARAVEL-VERIFY-GAPS-INGEST-DEPTH.md`, `fixtures/hub-laravel-verify-gaps-backlog`, `fixtures/hub-laravel-verify-gaps`.

```bash
pnpm run hub:strategic-plan-phase1-laravel-ingest-depth-smoke
```

Set `CHRYSALIS_STRATEGIC_PLAN_SKIP_LARAVEL_LIVE_GAPS=1` to skip live flagship verify (Vitest default).

## Non-goals

- New pattern-lift matrix gold without a real customer route or flagship fixture
- WordPress vertical before Laravel path is boringly reliable

## Invariants (DESIGN §3)

- Verify replay remains authoritative; playbooks advise, they do not bypass verify
- Gap closure is ingest-gated — no silent best-effort lowering
