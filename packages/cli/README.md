# @chrysalis/cli

## Purpose

The `chrysalis` command-line entry point. Orchestrates the pipeline by
delegating to other packages; contains no translation logic of its own.

## Public API

Subcommands (some are Milestone 1 stubs):

- `chrysalis init <dir>` — mark a directory as a Chrysalis project
- `chrysalis observe` — run the oracle sidecar against a live PHP app; optional
  **`chrysalis.observe.json`** in the PHP root **merges** onto built-in default redaction (same `path` overrides `kind`).
  Bad JSON or invalid rule shapes exit **2** with **`[observe]`** stderr (**D209**).
- `chrysalis ingest` — PHP source → WebIR module on disk; prints auth-tagged
  ingest hole count when non-zero (6A); optional **`--shard-index` / `--shard-count`** (V2-M2 route filter); optional **`--merge-all-shards --shard-count K`** (run **`mergeWebIrModules`** over every shard **`0..K-1`**); optional **`--ingest-cache <dir>`** (V2-M2 AST cache)
- `chrysalis archaeology` — recover schema from DB + traces + optional PHP form scan (`--php-root <dir>`, repeatable)
- `chrysalis emit --target=hono|fastify` — WebIR → generated project; optional **`--shard-index` / `--shard-count`** (partial route emit, V2-M2); optional **`--merge-all-shards --shard-count K`** (full merged module via **`mergeWebIrModules`**, **D247** cross-shard dedupe); optional **`--ingest-cache <dir>`**
- `chrysalis verify` — replay oracle traces against the generated code; optional
  **`--replay-concurrency N`** (requires **`--disable-cookie-chain`** or
  **`CHRYSALIS_VERIFY_DISABLE_COOKIE_CHAIN=1`**), **`--replay-timeout-ms`**,
  **`--replay-worker-threads`** (remote verify throughput; no **`--project`**),
  **`--shard-index i --shard-count K`** (V2-M1 deterministic corpus partition),
  and env **`CHRYSALIS_VERIFY_*`** aliases (**`CHRYSALIS_VERIFY_WORKER_THREADS=1`**, D206).
  **`--json-summary`** prints a single JSON object on **stdout** (progress on **stderr**); includes **`schemaVersion`** (stable for **`jq`**) and **`toolVersion`** (repo root **`package.json`**); use for CI (**D222**, **D223**).
  On failures: divergence-kind counts, absolute **`summary.json`** path, and **`repair`** / **`--project`** hints (**D212**).
  **`--only-route "METHOD /path"`** and **`--only-trace-id <id>`** narrow replay for large corpora (**D213**)
- `chrysalis verify-merge` — merge per-shard **`summary.json`** files; **`--json-out`** prints **`chrysalis.verify.summary.merged`** (V2-M1)
- `chrysalis corpus-merge` — merge multiple **`traces/`**-shaped roots into **`--out`** (V2-M3); **`--on-duplicate error|skip`**, optional **`--dedupe-trace-id skip`**, **`--sample-modulo K --sample-remainder R`**, **`--dry-run`**, **`--json-out <file>`** (**`chrysalis.corpus-merge.summary`**)
- `chrysalis rewrite` — IR rewrites; optional `--http-replay` and
  `--http-replay-backends=hono,fastify`
- `chrysalis deploy --mode=legacy|shadow|canary|cutover` — chimera router
  (`--canary-percent`, stickiness cookie/header flags for canary)
- `chrysalis status` — migration dashboard; **`--json`** prints a single JSON object on **stdout**; shard / merge-all-shards progress lines go to **stderr** (same machine contract as **`verify --json-summary`**). **`--json`** includes `migration`
  and `oracleFootprint` (`routes[]` with `--project`) and **`ingestSharding`** (`monolithic` | **`routeShard`** | **`mergedShards`**) when **`--project`** ingest succeeds (**DESIGN D248**). With **`--project`**, optional **`--merge-all-shards --shard-count K`** ingests each shard and merges for full-route metrics (same **`mergeWebIrModules`** as **`ingest`**). With `--project`, also
  writes `reports/oracle-footprint.json`. Correctness from `--report`, optional
  `reports/migration/*.json` sidecars (`--migration-reports <dir>`); when
  `residual-legacy.json` includes 6A fields, `migration` also surfaces
  `authResidualLegacyRequestPct` and `authEmitHoleMax`; with `--project`,
  `migration.coverage.authHoles` counts ingest holes whose reason starts with
  `auth:` (parallel to emit-stats auth holes); optional **`migration.authIngestHoleMax`**
  mirrors **`residual-legacy.json`** after flagship verify (paired with emit-side
  **`authEmitHoleMax`**); the human migration line rolls emit + ingest counts into the auth row when non-zero;
  **`residualLegacy.dynamicNewWebIrCount`** counts WebIR `__new_dynamic` sites and **`dynamicNewHoleCount`**
  ingest holes whose reason starts with `new:dynamic` (D199/D199b)
- `chrysalis repair <traces-dir> --base-url <url> --project <php-root>` —
  verify-gated repair (`@chrysalis/repair`): same replay flags as **`verify`**
  (`--replay-concurrency`, `--disable-cookie-chain`, `--replay-timeout-ms`; worker threads
  are disabled because repair always ingests **`--project`**); default stub proposer; optional
  `--llm` + `CHRYSALIS_REPAIR_LLM_API_KEY`; `--hole-patch <file.json>` for signed
  hole closure; `--repair-verbose` for HTTP chat diagnostics;   `--write-module
  <webir.json>` after a successful run to dump the accepted module snapshot

### Related script: `scripts/migration-debt.mjs`

Runs `chrysalis status --json` (via the CLI entry) and prints a one-screen human summary. **Requires `--project <php-root>`** (same as `status`).

**Script-only flags** (stripped before invoking `status`; everything else is forwarded):

| Flag | Effect |
| --- | --- |
| **`--json-out <path>`** or **`--json-out=<path>`** | Writes pretty-printed JSON with **`kind`**: `"chrysalis.migration-debt.summary"`, **`schemaVersion`**: `1`, **`toolVersion`** (repo root `package.json`), **`generatedAt`** (ISO-8601), and slices: **`corpus`**, **`correctness`**, **`residualLegacy`**, **`migration`**, **`oracleFootprintRouteCount`** (integer). |
| **`--max-holes <n>`** | Exit **4** if `residualLegacy.holeCount` is missing or **>** `n`. |
| **`--min-correctness <0..1>`** | Exit **4** if `correctness.aggregate` is missing or below the threshold. |

Example:

```bash
node scripts/migration-debt.mjs --project fixtures/tiny-blog --json-out reports/migration-debt.json
```

Repo **`package.json`** scripts **`migration-debt:gate:ingest`** and **`migration-debt:gate:post-verify`** mirror these thresholds in CI (see root **`README.md`**). For **`tiny-n1-insight`**, **`pnpm run ci:insight`** runs **`chrysalis insight`** then the gate; **`pnpm run ci:tiny-n1-insight`** runs the gate only when **`reports/insight/tiny-n1.json`** is already present.

### Related gate: `scripts/ci-gates.mjs verify-dual-summary`

Validates machine-readable dual-backend verify summary artifacts: **`kind`**, **`schemaVersion`**, **`toolVersion`**, **`corpusRoot`**, **`reportDir`**, **`pass`**, and exactly two backend rows (**`hono`** and **`fastify`**) each with **`summaryPath`**, **`aggregate.correctness`**, **`endpoints[]`**, **`failedFrameCount`**, and a correctness field (**`correctness`** and/or stress **`minCorrectness`**). Optional env **`CHRYSALIS_VERIFY_DUAL_PROFILE`** pins the expected **`profile`** string for flagship lanes.

Local check (defaults to `reports/ci/verify-e2e-summary.json` when no path is passed through):

```bash
pnpm run ci:verify-dual-summary
pnpm run ci:verify-dual-summary -- reports/ci/verify-flagship-laravel-min-summary.json
pnpm run ci:verify-merged-summary -- fixtures/ci/verify-merged-summary-smoke.json
pnpm run ci:corpus-merge-summary -- fixtures/ci/corpus-merge-summary-smoke.json
pnpm run ci:tiny-n1-insight -- reports/insight/tiny-n1.json
pnpm run ci:migration-sidecar-floors -- reports/migration
```

The default path is only present after a dual-summary writer has run (for example **`pnpm run verify:e2e`** for `reports/ci/verify-e2e-summary.json`); if the file is missing, the gate prints **`verify-dual-summary: summary file missing`** with the resolved path and a short hint instead of an uncaught filesystem stack trace. Malformed JSON yields **`verify-dual-summary: invalid JSON`** (path + parse error); other read failures use **`verify-dual-summary: could not read`**.

Vitest: **`packages/cli/tests/verify-dual-summary-gate.test.ts`** (dual contract); **`packages/cli/tests/ci-gates-verify-merged-summary.test.ts`** (merged verify contract); **`packages/cli/tests/ci-gates-corpus-merge-summary.test.ts`** (**`corpus-merge-summary`** contract); **`packages/cli/tests/ci-gates-json-artifacts.test.ts`** (missing/invalid JSON across **`readJsonGateArtifact`** gates, **`migration-sidecar-floors`** missing **`idiomaticity.json`**, skip path, **`confidence-trend`** warmup, **`tiny-n1-rewrite`** missing report, **`status-migration`** stdin).

Root **`package.json`**: **`pnpm run ci:tiny-n1-insight`**, **`ci:rewrite-pre-xss`**, **`ci:confidence-5nines`**, **`ci:confidence-trend`**, **`ci:confidence-trend-ready`**, **`ci:migration-sidecar-floors`** (optional **`-- <path>`**; sidecar gate **no-ops** unless **`CHRYSALIS_IDIOMATICITY_MIN`** / **`CHRYSALIS_RESIDUAL_LEGACY_MAX`** are set), plus **`ci:verify-dual-summary`**, **`ci:verify-merged-summary`**, and **`ci:corpus-merge-summary`** above.

Current CI files validated by dual-summary gate:

- `reports/ci/verify-e2e-summary.json`
- `reports/ci/verify-flagship-laravel-min-summary.json`
- `reports/ci/verify-flagship-laravel-full-summary.json`

### Related gate: `scripts/ci-gates.mjs verify-merged-summary`

Validates **`chrysalis.verify.summary.merged`** (**`schemaVersion`**: **`1`**, **`toolVersion`**, **`shardCount`**, **`inputs[]`** with per-shard aggregates, **`merged`** report). Optional **`CHRYSALIS_VERIFY_MERGED_MIN_CORRECTNESS`** enforces **`merged.aggregate.correctness`**. **`verify-tiny-blog.mjs`** writes **`reports/ci/verify-e2e-merged-summary.json`** after the Hono replay (partition smoke or single-shard fallback).

### Related gate: `scripts/ci-gates.mjs corpus-merge-summary`

Validates **`chrysalis.corpus-merge.summary`** written by **`chrysalis corpus-merge … --json-out`**: **`schemaVersion`**: **`1`**, **`toolVersion`**, **`generatedAt`**, **`options`** (**`outDir`**, **`onDuplicate`**, **`dedupeTraceId`**, **`dryRun`**, optional sampling fields), non-empty **`sources[]`**, and **`counts`** (non-negative integers). Fixture: **`fixtures/ci/corpus-merge-summary-smoke.json`**. Vitest also covers **`readJsonGateArtifact`** missing/invalid JSON and a wrong-**`kind`** rejection (**`packages/cli/tests/ci-gates-json-artifacts.test.ts`**, **`ci-gates-corpus-merge-summary.test.ts`**).

### `verify --json-summary` shape (reference)

Stdout is a single JSON object. Top-level keys: **`kind`**, **`schemaVersion`**, **`toolVersion`**, **`corpusRoot`**, **`baseUrl`**, **`reportDir`**, **`summaryPath`**, **`threshold`**, **`aggregate`** (same as report aggregate), **`failedFrameCount`**, **`failedTraceCount`**, **`divergenceKinds`**, **`endpoints`**, **`pass`**. See **`packages/verify/README.md`** for semantics.

## Invariants

- The CLI is a thin orchestrator. Business logic lives in the packages it
  invokes.
- Key commands support `--json` (or write a report path) for machine-readable
  output alongside human-readable logs.
- No network access by default. Oracle, observe, deploy, `verify` / `repair`
  (when pointed at a `--base-url`), and `repair --llm` may touch networks when
  explicitly configured.

## Non-goals

- Implementing parsing, IR transforms, code emission, or replay.
- Shipping a GUI. A separate package can do that later.
