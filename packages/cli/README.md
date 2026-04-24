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
- `chrysalis status` — print the migration dashboard
- `chrysalis repair <endpoint>` — (Milestone 3) LLM-driven repair loop

## Invariants

- The CLI is a thin orchestrator. Business logic lives in the packages it
  invokes.
- Every command prints a report in a stable machine-readable format (JSON)
  in addition to any human-readable output.
- No network access by default. Oracle, observe, and deploy commands are the
  only ones that touch networks, and they require explicit configuration.

## Non-goals

- Implementing parsing, IR transforms, code emission, or replay.
- Shipping a GUI. A separate package can do that later.
