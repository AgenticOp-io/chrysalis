# Optional migration sidecars (`laravel-min`)

`chrysalis status --json` can merge **two optional** JSON files from a directory
(default `reports/migration/` at repo root, or any path via
`--migration-reports <dir>`):

| File | Shape | Meaning |
|------|--------|---------|
| `idiomaticity.json` | `{ "pct": 0..1 }` | How idiomatic emitted TypeScript is (e.g. from rewrite stats). |
| `residual-legacy.json` | `{ "legacyRequestPct": 0..100 }` | Share of traffic still served by legacy PHP (e.g. chimera or edge logs). |

This directory is **empty by default** so those fields stay `null` (`—` in the
text dashboard) until you add real pipeline output. When numbers move in a
meaningful way, commit the JSON here (or publish them from CI into artifacts)
and note the change in `flagship/README.md` under **Status** so `main` stays
auditable for Milestone 4 monotonic metrics.

Example local check after `verify:flagship`:

```bash
chrysalis status --json --project flagship/laravel-min \
  --traces traces/flagship-laravel-min \
  --report reports/verify-flagship-laravel-min \
  --migration-reports flagship/laravel-min/migration-reports
```
