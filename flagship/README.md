# Flagship migration (Milestone 4)

This directory will hold the **first real PHP application** Chrysalis tracks
end-to-end in public: ingest roots, optional Oracle corpora, and notes on
Laravel (or successor) layout.

## First target

**Laravel** — small starter (e.g. Breeze) plus a bounded set of routes and
templates we can ingest, observe, and verify without fighting WordPress-scale
dynamics.

## Metrics

Run the unified dashboard (four DESIGN success metrics roll up under
`migration`):

```bash
# After `pnpm run verify:flagship` (or in CI), include oracle + verify outputs:
chrysalis status --json --project flagship/laravel-min \
  --traces traces/flagship-laravel-min \
  --report reports/verify-flagship-laravel-min
```

- **Coverage** — IR `migration.coverage` (non-hole nodes / reachable nodes);
  requires `--project`.
- **Correctness** — verify aggregate from `--report` (same as the correctness
  section).
- **Idiomaticity** — optional `reports/migration/idiomaticity.json`:
  `{ "pct": 0.15 }` (0..1), maintained by your pipeline (e.g. rewrite pass
  stats).
- **Residual legacy** — optional `reports/migration/residual-legacy.json`:
  `{ "legacyRequestPct": 45.0 }` (0..100), e.g. from chimera or edge logs.

Override sidecar directory with `--migration-reports <dir>`.

## Current tree

- **`laravel-min/`** — Laravel-shaped layout, `GET /`, `/health`, `/items` (SQLite via
  `query_all`); optional `composer install` for `vendor/` autoload; ingest/emit
  tests plus **`scripts/verify-flagship-laravel-min.mjs`** (Oracle → dual emit →
  replay) in CI job `verify-flagship-laravel-min`. Not a Composer Laravel
  install; see `laravel-min/README.md` for the full-framework next step.

## Status

Full Laravel/Breeze adoption is still open. Milestone 4 phased checklist in
`ROADMAP.md` is complete for `laravel-min`; next steps are a Composer-backed
tree, more routes (DB/session), a wider oracle corpus, and keeping migration
metrics (`coverage`, `correctness`, optional idiomaticity/residual-legacy)
non-regressing on `main` with a short note in this file each time they move.
When the emitted stack diverges from the oracle, use **`chrysalis repair`**
(see `packages/repair` and `ROADMAP` Milestone 3) against the same traces and
`--project` PHP root; patches stay verify-gated.
