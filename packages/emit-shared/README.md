# @chrysalis/emit-shared

## Purpose

Shared **WebIR handler body → TypeScript** lowering used by multiple HTTP emit
backends (`emit-hono`, `emit-fastify`, …). Owns the effect/data statement
walker and framework-specific HTTP surface via `HttpEmitProfile`.

## Public API

- `emitHandlerBody(module, handlerId, options?, profile?)` — handler function
  body text, holes, inferred effects, domain type imports, and flags
  `usesQueryAllWhereIn` / `usesChrysalisBatchHelpers` for conditional handler
  imports. Defaults to `honoHttpProfile`.
- Internal `data.call` callees `__chrysalis_pluck`, `__chrysalis_row_by_column`,
  `__chrysalis_query_all_where_in` lower to runtime/db helpers for N+1 batching
  (D42). Ingest does not synthesize them; the **`batch-n1-read`** rewrite pass
  (`@chrysalis/rewrite`, D43) may introduce them on qualified modules.
- `__chrysalis_zod_body_field` lowers to `parseZodBodyFieldRaw` (runtime.ts) when
  **`boundary-zod`** runs (D44).
- **Emit:** `data.block` may emit `Array.reduce` instead of `for…of` when a
  literal init, `data.foreach`, and a single accumulating `__assign` match the v1
  reduce pattern (see ROADMAP).
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
