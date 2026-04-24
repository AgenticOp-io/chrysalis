# @chrysalis/emit-hono

## Purpose

Emits a runnable **Hono + SQLite (`node:sqlite`)** TypeScript project from a
WebIR `Module`, with optional **Drizzle sqlite-core schema** (`src/schema.ts`)
when archaeology supplies `EmitInput.schemaReport`. Handler bodies are lowered
via `@chrysalis/emit-shared` (`honoHttpProfile`). The first Chrysalis backend;
the reference for how to write additional backends (`emit-fastify`, `emit-next`,
`emit-rust`, ...).

## Public API

- `emit(input: EmitInput): Promise<EmitResult>`
- `EmitInput` — WebIR module, target directory, optional `schemaReport` (emits
  `src/schema.ts` + `drizzle-orm` dependency), optional `domainTypesByTable`
  (lowercase SQL table name → archaeology interface name) for `queryOne<T>` /
  `queryAll<T>` on single-table reads; runtime config as the package grows
- `EmitResult` — file list, hole registry, emission report

## Invariants

- **Session store.** Default in-memory Map; set `CHRYSALIS_SESSION_DIR` for
  JSON files per sid (chimera / PHP bridge demo). Optional
  `CHRYSALIS_SESSION_COOKIE` overrides the default `chrysalis_sid` name.
- **Optional row typing.** With `domainTypesByTable`, exactly one table on
  a `db.query` → `queryOne<Interface>` or `queryAll<Interface>` and
  `import type` from `../domain.js`. Multi-table SQL keeps untyped generics.
- **Drizzle schema file.** With `schemaReport`, `src/schema.ts` mirrors the
  same merged DDL as `domain.ts`; runtime I/O remains `queryOne` / `queryAll`
  on `node:sqlite` (no native addon) so verify SQL replay stays deterministic.
- **String-dispatch shape.** If/elseif chains that match
  `matchStringDispatchChain` from `@chrysalis/insight` (same rules as the
  `string-dispatch` recognizer) emit as a single TypeScript `switch` on a
  normalized string discriminant, not a nested if ladder.
- **`src/server.ts` exports `app`; `src/index.ts` only listens.** Downstream
  verification (`app.fetch` in-process) must not require a TCP server.
- **The output project compiles.** Type errors in generated code are emission
  bugs. CI must fail if any fixture emits a non-compiling project.
- **Effect signatures are preserved.** Every handler's generated signature
  carries the effect union inferred by WebIR.
- **Provenance survives.** Generated types and non-trivial handlers include
  `@chrysalis-provenance` JSDoc blocks.
- **Holes are compiling stubs** that delegate to the chimera runtime. Never
  emit `throw new Error("TODO")` in place of a hole.

## Non-goals

- Running the generated project. That's user or CI territory.
- Modifying WebIR. Emission is read-only.
- Supporting non-Hono targets — those are other packages.
