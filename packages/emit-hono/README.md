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
- **Flagship parity:** Vitest ingests **`flagship/laravel-min`** (nineteen handlers, zero holes,
  expected handler files including `api_health_show.ts` … `session_*`) and
  **`flagship/laravel-full/chrysalis-templates`** (forty-four handlers:
  `ping_show.ts`, `health_txt_show.ts`, `api_health_show.ts`, `jump_show.ts`, `count_show.ts`,
  `framework_show.ts`, `first_item_show.ts`, `last_item_show.ts`, `items_list_show.ts`, `lib_count_show.ts`, `sum_ids_show.ts`, `min_id_show.ts`, `max_id_show.ts`, `avg_id_show.ts`, `id_span_show.ts`, `sum_squares_show.ts`, `even_count_show.ts`, `odd_count_show.ts`, `gt_two_count_show.ts`, `lt_three_count_show.ts`, `gte_two_count_show.ts`, `lte_three_count_show.ts`, `ne_two_count_show.ts`, `session_visit_show.ts`, `session_me_show.ts`, `hello_show.ts`,
  `between_count_show.ts`, `eq_one_count_show.ts`, `eq_three_count_show.ts`, `eq_two_count_show.ts`, `ne_one_count_show.ts`, `ne_three_count_show.ts`, `lt_two_count_show.ts`, `gt_one_count_show.ts`, `gte_one_count_show.ts`, `lte_one_count_show.ts`, `between_one_two_count_show.ts`, `gt_three_count_show.ts`, `lt_one_count_show.ts`, `gte_three_count_show.ts`, `lte_two_count_show.ts`, `session_login_post.ts`, `session_logout_post.ts`, `echo_post.ts`, zero holes) —
  mirrored by `@chrysalis/emit-fastify` tests.

## Non-goals

- Running the generated project. That's user or CI territory.
- Modifying WebIR. Emission is read-only.
- Supporting non-Hono targets — those are other packages.
