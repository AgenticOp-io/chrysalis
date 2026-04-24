# @chrysalis/emit-fastify

## Purpose

Emits a runnable **Fastify + `node:sqlite`** TypeScript project from a WebIR
`Module`. Second Chrysalis backend; demonstrates that handler lowering is shared
(`@chrysalis/emit-shared`) and only the HTTP/runtime shell differs.

## Public API

- `emit(input: EmitInput): Promise<EmitResult>`
- `EmitInput` — `module`, `outDir`, optional `schemaReport` (Drizzle
  `src/schema.ts` + dependency), optional `domainTypesByTable` (archaeology row
  generics on `queryOne` / `queryAll`).
- `EmitResult` — emitted files, holes, handler count, effects per handler.

## Invariants

- **In-process replay:** `src/server.ts` exports `fetch` implemented with
  `app.inject`, compatible with `@chrysalis/verify` `ReplayOptions.fetch`.
- **SQL replay tape:** same `x-chrysalis-sql-tape` contract as emit-hono
  (`AsyncLocalStorage` + `enterWith` on request).
- **Session / env:** same `CHRYSALIS_SESSION_DIR`, `CHRYSALIS_SESSION_COOKIE`,
  `CHRYSALIS_DB_PATH` semantics as emit-hono.
- **Effect annotations** and **provenance** JSDoc match emit-hono output shape.

## Non-goals

- Feature parity experiments beyond what tiny-blog needs (plugins, schema auth).
- Replacing emit-hono as the default CLI target.
