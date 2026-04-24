# @chrysalis/cli

## Purpose

The `chrysalis` command-line entry point. Orchestrates the pipeline by
delegating to other packages; contains no translation logic of its own.

## Public API

Subcommands (some are Milestone 1 stubs):

- `chrysalis init <dir>` — mark a directory as a Chrysalis project
- `chrysalis observe` — run the oracle sidecar against a live PHP app
- `chrysalis ingest` — PHP source → WebIR module on disk
- `chrysalis archaeology` — recover schema from DB + forms + traces
- `chrysalis emit --target=hono|fastify` — WebIR → generated project
- `chrysalis verify` — replay oracle traces against the generated code
- `chrysalis rewrite` — IR rewrites; optional `--http-replay` and
  `--http-replay-backends=hono,fastify`
- `chrysalis deploy --mode=legacy|shadow|canary|cutover` — chimera router
  (`--canary-percent`, stickiness cookie/header flags for canary)
- `chrysalis status` — migration dashboard; `--json` includes `migration`
  (IR coverage with `--project`, correctness from `--report`, optional
  `reports/migration/*.json` sidecars; `--migration-reports <dir>`)
- `chrysalis repair <traces-dir> --base-url <url> --project <php-root>` —
  verify-gated repair loop (`@chrysalis/repair`; stub proposer until an LLM
  adapter is wired)

## Invariants

- The CLI is a thin orchestrator. Business logic lives in the packages it
  invokes.
- Key commands support `--json` (or write a report path) for machine-readable
  output alongside human-readable logs.
- No network access by default. Oracle, observe, and deploy commands are the
  only ones that touch networks, and they require explicit configuration.

## Non-goals

- Implementing parsing, IR transforms, code emission, or replay.
- Shipping a GUI. A separate package can do that later.
