# @chrysalis/cli

## Purpose

The `chrysalis` command-line entry point. Orchestrates the pipeline by
delegating to other packages; contains no translation logic of its own.

## Public API

Subcommands (some are Milestone 1 stubs):

- `chrysalis init <dir>` — mark a directory as a Chrysalis project
- `chrysalis observe` — run the oracle sidecar against a live PHP app
- `chrysalis ingest` — PHP source → WebIR module on disk
- `chrysalis archaeology` — recover schema from DB + traces + optional PHP form scan (`--php-root <dir>`, repeatable)
- `chrysalis emit --target=hono|fastify` — WebIR → generated project
- `chrysalis verify` — replay oracle traces against the generated code
- `chrysalis rewrite` — IR rewrites; optional `--http-replay` and
  `--http-replay-backends=hono,fastify`
- `chrysalis deploy --mode=legacy|shadow|canary|cutover` — chimera router
  (`--canary-percent`, stickiness cookie/header flags for canary)
- `chrysalis status` — migration dashboard; `--json` includes `migration`
  and `oracleFootprint` (`routes[]` with `--project`). With `--project`, also
  writes `reports/oracle-footprint.json`. Correctness from `--report`, optional
  `reports/migration/*.json` sidecars (`--migration-reports <dir>`)
- `chrysalis repair <traces-dir> --base-url <url> --project <php-root>` —
  verify-gated repair (`@chrysalis/repair`): default stub proposer; optional
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
