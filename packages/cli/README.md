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
  ingest hole count when non-zero (6A)
- `chrysalis archaeology` — recover schema from DB + traces + optional PHP form scan (`--php-root <dir>`, repeatable)
- `chrysalis emit --target=hono|fastify` — WebIR → generated project
- `chrysalis verify` — replay oracle traces against the generated code; optional
  **`--replay-concurrency N`** (requires **`--disable-cookie-chain`** or
  **`CHRYSALIS_VERIFY_DISABLE_COOKIE_CHAIN=1`**), **`--replay-timeout-ms`**,
  **`--replay-worker-threads`** (remote verify throughput; no **`--project`**),
  and env **`CHRYSALIS_VERIFY_*`** aliases (**`CHRYSALIS_VERIFY_WORKER_THREADS=1`**, D206).
  On failures: divergence-kind counts, absolute **`summary.json`** path, and **`repair`** / **`--project`** hints (**D212**)
- `chrysalis rewrite` — IR rewrites; optional `--http-replay` and
  `--http-replay-backends=hono,fastify`
- `chrysalis deploy --mode=legacy|shadow|canary|cutover` — chimera router
  (`--canary-percent`, stickiness cookie/header flags for canary)
- `chrysalis status` — migration dashboard; `--json` includes `migration`
  and `oracleFootprint` (`routes[]` with `--project`). With `--project`, also
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
  hole closure; `--repair-verbose` for HTTP chat diagnostics; `--write-module
  <webir.json>` after a successful run to dump the accepted module snapshot

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
