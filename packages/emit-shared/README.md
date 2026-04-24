# @chrysalis/emit-shared

## Purpose

Shared **WebIR handler body → TypeScript** lowering used by multiple HTTP emit
backends (`emit-hono`, `emit-fastify`, …). Owns the effect/data statement
walker and framework-specific HTTP surface via `HttpEmitProfile`.

## Public API

- `emitHandlerBody(module, handlerId, options?, profile?)` — handler function
  body text, holes, inferred effects, domain type imports. Defaults to
  `honoHttpProfile`.
- `honoHttpProfile`, `fastifyHttpProfile` — `HttpEmitProfile` values.
- `emitExpr`, `emitStmt` — lower-level helpers (mainly for tests).
- `ident`, `stringLit`, … — TS text helpers.

## Invariants

- **No framework imports** in this package; profiles are plain string templates.
- **Holes** are compiling `__hole(...)` calls, never silent throws.
- **String-dispatch** uses the same `matchStringDispatchChain` rules as
  `@chrysalis/insight`.

## Non-goals

- Emitting `package.json`, servers, or DB adapters (each backend package).
- Owning WebIR types or ingest — only consumes `@chrysalis/webir`.
