# @chrysalis/hub-native-bridge

## Purpose

Canonical route-pattern parsers for hub native origins (**Java**, **Go**, **Ruby**, **C#**).
Mirrors `@chrysalis/python-bridge` for Phase **41c** ingest adapters.

## Public API

- `parseJavaRoutes(source, file?)`
- `parseGoRoutes(source)`
- `parseRubyRoutes(source)`
- `parseCsharpRoutes(source)`

## Invariants

- Parse-only; semantic lowering stays in hub ingest / `@chrysalis/ingest` adapters.
- Pure TypeScript (no subprocess) — regex/annotation patterns aligned with hub gold fixtures.

## Non-goals

- Full language compilers or semantic analysis.
