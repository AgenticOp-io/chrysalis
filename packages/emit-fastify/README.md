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
- **Flagship parity:** Same Vitest slices as emit-hono — **`flagship/laravel-min`**
  (nineteen handlers, zero holes, key handler files) and **`flagship/laravel-full/chrysalis-templates`**
  (thirty-nine handlers: `ping_show.ts`, `health_txt_show.ts`, `api_health_show.ts`, `jump_show.ts`,
  `count_show.ts`, `framework_show.ts`, `first_item_show.ts`, `last_item_show.ts`, `items_list_show.ts`, `lib_count_show.ts`, `sum_ids_show.ts`, `min_id_show.ts`, `max_id_show.ts`, `avg_id_show.ts`, `id_span_show.ts`, `sum_squares_show.ts`, `even_count_show.ts`, `odd_count_show.ts`, `gt_two_count_show.ts`, `lt_three_count_show.ts`, `gte_two_count_show.ts`, `lte_three_count_show.ts`, `ne_two_count_show.ts`, `session_visit_show.ts`, `session_me_show.ts`, `hello_show.ts`,
  `between_count_show.ts`, `eq_one_count_show.ts`, `eq_three_count_show.ts`, `eq_two_count_show.ts`, `ne_one_count_show.ts`, `ne_three_count_show.ts`, `lt_two_count_show.ts`, `gt_one_count_show.ts`, `gte_one_count_show.ts`, `lte_one_count_show.ts`, `session_login_post.ts`, `session_logout_post.ts`, `echo_post.ts`, zero holes).

## Non-goals

- Feature parity experiments beyond what tiny-blog needs (plugins, schema auth).
- Replacing emit-hono as the default CLI target.
