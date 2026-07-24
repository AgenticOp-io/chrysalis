# @chrysalis/python-bridge

## Purpose

Spawns CPython and streams canonical Python hub route JSON from `ast.parse`.
This package is the **only** place in Chrysalis that runs Python AST extraction
for hub ingest (parser-bridge pattern for Python origins).

## Public API

- `parseSource(src: string, filename?: string): Promise<PythonHubParseResult>`
- `parseFile(path: string): Promise<PythonHubParseResult>`
- `resolvePythonBinary(): string`

## Invariants

- Stateless subprocess per call; no shared interpreter state.
- Route JSON schema is version-stamped (`SCHEMA_VERSION`).
- Parse-only — semantic lowering belongs in `@chrysalis/ingest` hub adapter.

## Non-goals

- Full Python semantic analysis or type inference.
- Replacing legacy Flask/FastAPI/Starlette/Litestar runtime behavior.
- Inventing Provide/DI, middleware, or Controller onion peels (**D6447**).
