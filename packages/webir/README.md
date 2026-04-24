# @chrysalis/webir

## Purpose

Defines **WebIR**, the multi-dialect intermediate representation at the heart of
Chrysalis. Every Chrysalis frontend (ingest) produces WebIR; every backend
(emit) consumes WebIR. This package owns the types, dialect registries,
visitor/pass infrastructure, and provenance model.

## Public API

- `Node`, `NodeId`, `EffectSet`, `WebIRType`, `Provenance`, `Locator`, `Hole`
- `Dialect` registry and the canonical dialects:
  - `dialects/web-request` — routes, handlers, request/response shapes
  - `dialects/effect` — `DB.read`, `DB.write`, `Mail.send`, `Session.*`, `Time.*`, `Random.*`, `Http.fetch`, `Cache.*`
  - `dialects/data` — SSA dataflow over scalars, records, arrays, sums
- `visit`, `rewrite`, `fold` — pure visitor helpers; `irCoverageStats` for
  non-hole fraction over reachable nodes (Milestone 4 dashboard)
- `Module` — a WebIR compilation unit

## Invariants

- **Zero runtime dependencies.** WebIR is the portable artifact. Do not import
  `hono`, `drizzle`, `express`, or any backend here.
- **Every node has `id`, `type`, `effects`, `provenance`, and `origin`.**
  Adding a node type without these fields is a bug.
- **Holes are nodes.** A hole has a typed input/output contract and compiles.
- **Dialects are append-only.** Removing or renaming ops breaks every frontend
  and backend at once; prefer adding a new op.

## Non-goals

- Executing WebIR directly (that's `verify` and the emit backends).
- PHP-specific or TypeScript-specific constructs. Those belong in `ingest` and
  `emit-*`, respectively.
- Pretty-printing to any surface language.
