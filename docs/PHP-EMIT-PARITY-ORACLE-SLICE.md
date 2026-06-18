# PHP emit parity — oracle slice

> **Status:** accepted (2026-06-17)  
> **Authority:** `docs/STRATEGIC-PLAN.md` Phase 1; **G5760**  
> **North star:** hono = fastify = nextjs on verify replay, not emit-only smoke

## Goal

Pin **verify-backed** triple-emit parity on the canonical PHP oracle micro surface (`fixtures/tiny-blog`) and on PHP wedge flagships — structural gold plus trace replay where suites exist.

## Phase A — Oracle micro contract (shipped)

| Artifact | Role |
| --- | --- |
| `fixtures/tiny-blog` | 5-route oracle micro surface |
| `fixtures/ci/tiny-blog-verify-for-status/summary.json` | Hono/Fastify trace replay baseline (correctness **1.0**) |
| `runPhpNextjsVerify` | Next.js trace replay on same fixture (skip when WPTP emit absent) |

Registry: `hub-php-oracle-micro-fixture.mjs`, `hub-php-nextjs-verify.mjs`.

## Phase B — Flagship vertical parity (shipped)

| Prefix | Gate |
| --- | --- |
| `plain-php-flagship` | `runFlagshipEmitParity` — gold + trace replay on hono/fastify/nextjs |
| `symfony-flagship` | `runFlagshipEmitParity` — same tri-target contract |

Prior art: **G151** (hono=fastify), **G157** (nextjs extension).

## Phase C — STRATEGIC-PLAN reinforcement (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase1PhpEmitParityGate` | doc + oracle micro verify + optional flagships |

```bash
pnpm run hub:strategic-plan-phase1-php-emit-parity-smoke
```

Set `CHRYSALIS_STRATEGIC_PLAN_SKIP_EMIT_PARITY_FLAGSHIPS=1` for oracle-micro only (Vitest default).

## Operator entry points

```bash
pnpm run hub:oracle-micro-fixture
pnpm run hub:php-oracle-micro-verify-batch-smoke
pnpm run hub:php-oracle-smoke
```

## Invariants (DESIGN §3)

- Emit parity claims require **verify replay** evidence — not ingest/emit exit codes alone
- Next.js path uses WPTP silver bridge; absence skips locally but GCE should run full tri-target verify
