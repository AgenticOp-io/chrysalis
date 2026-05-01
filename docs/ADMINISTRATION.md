# Administration

Topics for **operators** running Chrysalis in CI or on shared infrastructure: environment variables, structured gates, reports, redaction policy touchpoints, and upgrades.

## Environment variables (selected)

Verify and replay honor **`CHRYSALIS_VERIFY_*`** and related knobs exposed by `@chrysalis/verify` (see `packages/verify/README.md` and `scripts/verify-*.mjs`).

| Variable | Used by | Notes |
| --- | --- | --- |
| `CHRYSALIS_SKIP_PARSER_VENDOR` | `pretest` | Skip Composer vendor install for parser-bridge |
| `CHRYSALIS_PARSER_PROVIDER` | ingest / CLI | e.g. `nikic` vs default |
| `CHRYSALIS_VERIFY_DUAL_PROFILE` | `scripts/ci-gates.mjs verify-dual-summary` | Pins expected `profile` on dual-summary JSON |
| `CHRYSALIS_VERIFY_MERGED_MIN_CORRECTNESS` | `scripts/ci-gates.mjs verify-merged-summary` | When set (0..1), requires `merged.aggregate.correctness` at least this value |
| `CHRYSALIS_IDIOMATICITY_MIN` / `CHRYSALIS_RESIDUAL_LEGACY_MAX` | `migration-sidecar-floors` | When set, enforces floors against `reports/migration/*.json` |
| `CHRYSALIS_RELEASE_*` | `migration-sidecar-floors-release` | Release policy wrapper (see `ci-gates` help text) |
| `CHRYSALIS_SESSION_*`, `CHRYSALIS_DEPLOY_TOPOLOGY` | `session-bridge-release` gate | See `scripts/ci-gates.mjs` header comment |
| `VERIFY_THRESHOLD` | `status-migration` gate | Default `0.95` |
| `CONFIDENCE_TREND_ALLOW_WARMUP`, `CONFIDENCE_STREAK_REQUIRED`, `CONFIDENCE_5NINES` | confidence gates | See `scripts/ci-gates.mjs` |

Do **not** rely on `process.env` inside **generated** handlers or verify sandboxes for nondeterminism; Chrysalis uses injected context where applicable (`DESIGN.md` non-negotiables).

## CI gates

`scripts/ci-gates.mjs` is the structured gate entrypoint (JSON shape, TypeScript AST checks). Common commands:

```text
node scripts/ci-gates.mjs verify-dual-summary [path]
node scripts/ci-gates.mjs verify-merged-summary [path]
node scripts/ci-gates.mjs corpus-merge-summary [path]
node scripts/ci-gates.mjs migration-sidecar-floors [reports/migration]
node scripts/ci-gates.mjs session-bridge-release
```

`pnpm run ci:*` shims exist at the repo root. Missing JSON and invalid JSON produce operator-oriented stderr (`DESIGN` D231). See [`AGENTS.md`](../AGENTS.md) Local `ci-gates` and root `README.md`. For a one-line map of V2 CLI scale-out flags (verify sharding, **`verify-merge`**, **`corpus-merge`**, ingest/emit sharding, **`--ingest-cache`**), run **`chrysalis --help`** locally (Vitest locks the banner text).

## Reports layout

Under a typical workspace root:

- `reports/verify/` — replay summaries and per-route files  
- `reports/ci/` — dual-backend verify summaries, **merged** partition summaries (`verify-e2e-merged-summary.json`), and optional **`corpus-merge`** machine summaries (`chrysalis corpus-merge … --json-out`) consumed by CI gates  
- `reports/migration/` — idiomaticity / residual-legacy sidecars when generated  
- `reports/shadow/` — shadow-mode divergence stream  

Back up **trace corpora** (`traces/` or your chosen directory) and any **custom observe config**; they are the behavioral contract for verify.

## Multi-host trace corpora (V2-M3 planning)

When several machines or cells each run **`chrysalis observe`**, keep each capture under a **stable top-level directory** (for example `traces/<host-or-cell>/…` or separate repos) so operators never overwrite NDJSON in place. Before **`chrysalis verify`**, merge or symlink day-buckets into one **`readCorpus`** root only after **redaction defaults** and **`chrysalis.observe.json`** merge rules are aligned on all writers (`DESIGN.md`, `packages/oracle/README.md`). Prefer **`chrysalis corpus-merge <dir> … --out <merged>`** (path-level merge with **`--on-duplicate`**, optional content dedupe via **`--dedupe-trace-id skip`**) over ad-hoc copies when combining hosts. Document which host produced which subdirectory in runbooks; sampling policy remains an explicit operator decision.

## Redaction and security

Oracle capture-time redaction is security-sensitive. If you change defaults:

- Keep **`packages/oracle/src/redaction.ts`** (`DEFAULT_REDACTION`) and **`packages/oracle-php/src/Redactor.php`** aligned (`AGENTS.md` Oracle-php lockstep).
- Run `pnpm run test:oracle-php-redactor` with PHP on `PATH` before merging.

For vulnerability reports, see [`SECURITY.md`](../SECURITY.md).

## Upgrades

1. Pull upstream; read `CHANGELOG.md` for breaking changes.  
2. `pnpm install`  
3. `pnpm -r build`  
4. `pnpm test` (and optional `pnpm run test:oracle-php-redactor`, `pnpm run verify:e2e` on representative projects)  
5. Re-emit and re-verify critical apps; compare `reports/verify` and migration JSON trends.

## Logs and retention

- CI: attach `reports/verify`, `reports/ci`, and migration artifacts as workflow artifacts where configured.  
- Production chimera / observe: use your platform log stack; Chrysalis does not mandate a log format beyond NDJSON traces on disk.

## Corpus volume and retention (v0)

Oracle traces are **append-only NDJSON** per request. Growth is roughly **linear in traffic** and **per-route cardinality**; multi-host layouts multiply writers, not the merge semantics (**`corpus-merge`**). **Rotation:** archive or delete **day buckets** (`YYYY-MM-DD/`) after verify snapshots and legal retention windows; Chrysalis does not ship a built-in compactor. **Compression:** gzip **day bundles** or object-store **prefixes** as an operator choice; **`readCorpus`** expects uncompressed files today. **Sizing:** plan disk for **peak capture rate × retention** plus merged copies when using **`corpus-merge`** (duplicates **`--on-duplicate skip`** reduce bytes only when the same trace id appears twice). Default **redaction** still applies at capture (**`DEFAULT_REDACTION`** + optional **`chrysalis.observe.json`**).
