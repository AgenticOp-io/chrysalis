# oracle-node

## Purpose

Minimal **HTTP trace recorder** for Node.js / Express-style apps. Produces NDJSON traces compatible with `@chrysalis/verify` — hub capture lane for JavaScript origins, not a duplicate ingest package.

## Public API

- `Recorder` — `onRequestStart`, `onResponse`, `buildTrace`, `writeNdjson`
- `record-smoke.mjs` — writes one trace file for CI smoke
- `record-live-http.mjs` — captures live HTTP endpoints (`--base-url`, `--routes`, `--out` or `--corpus-dir`)

## Invariants

- Recorder runs on the legacy Node process only; generated handlers use injected `ctx`.
- Header redaction for `authorization` / `cookie`.

## Non-goals

- Full Express middleware distribution; use hub AST lift + trace replay for gold literal paths today.

## Live Capture Example

```bash
node scripts/hub-ingest/hub-oracle-record.mjs \
  --origin javascript \
  --base-url http://127.0.0.1:3000 \
  --routes "GET /health,GET /meta,POST /echo" \
  --out traces/node-live.ndjson
```
