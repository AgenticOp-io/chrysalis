# oracle-node

## Purpose

Minimal **HTTP trace recorder** for Node.js / Express-style apps. Produces NDJSON traces compatible with `@chrysalis/verify` — hub capture lane for JavaScript origins, not a duplicate ingest package.

## Public API

- `Recorder` — `onRequestStart`, `onResponse`, `buildTrace`, `writeNdjson`
- `record-smoke.mjs` — writes one trace file for CI smoke

## Invariants

- Recorder runs on the legacy Node process only; generated handlers use injected `ctx`.
- Header redaction for `authorization` / `cookie`.

## Non-goals

- Full Express middleware distribution; use hub AST lift + trace replay for gold literal paths today.
