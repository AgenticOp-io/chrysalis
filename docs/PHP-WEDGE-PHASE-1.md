# PHP wedge — Phase 1 plan

> **Status:** accepted (2026-06-17)  
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

- Laravel ingest depth from live verify gaps (flagship-full north star)
- PHP emit parity: hono = fastify = nextjs on oracle slice (verify, not smoke-only)
- Chimera cutover runbooks + operator metrics

## Non-goals

- New pattern-lift matrix gold without a real customer route or flagship fixture
- WordPress vertical before Laravel path is boringly reliable

## Invariants (DESIGN §3)

- Verify replay remains authoritative; playbooks advise, they do not bypass verify
- Gap closure is ingest-gated — no silent best-effort lowering
