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
- **Emit strategy (CLI → `emitStrategy`):** same optional artifacts as **emit-hono** — **`chrysalis-route-paths.ts`**, **`chrysalis.emit-handler-fingerprints.json`**, **`chrysalis-runtime-facade.ts`** (**`--emit-runtime-facade`** / **`runtimeFacadeModule`**, **D272**), **`chrysalis-runtime-imports.ts`** (**`--emit-shared-runtime-imports`** / **`emitSharedRuntimeImports`**, **D281**), resume/barrel/provenance/lazy routes — via **`chrysalis emit`** flags; see **`packages/cli/README.md`** (**DESIGN D252**, **D256**, **D258**, **D259**, **D272**, **D281**, **D260–D269**).

## Invariants

- **In-process replay:** `src/server.ts` exports `fetch` implemented with
  `app.inject`, compatible with `@chrysalis/verify` `ReplayOptions.fetch`.
- **SQL replay tape:** same `x-chrysalis-sql-tape` contract as emit-hono
  (`AsyncLocalStorage` + `enterWith` on request).
- **Session / env:** same `CHRYSALIS_SESSION_DIR`,
  `CHRYSALIS_SESSION_SQLITE_PATH`, `CHRYSALIS_SESSION_REDIS_URL`,
  `CHRYSALIS_SESSION_COOKIE`,
  `CHRYSALIS_DB_PATH` semantics as emit-hono.
- **Effect annotations** and **provenance** JSDoc match emit-hono output shape.
- **Constructor bridge bootstrap.** Generated `src/runtime.ts` exports
  `registerPhpFqnCtor(fqn, ctor)` for both FQN static `new` and dynamic
  `phpDynamicNew` lookup paths. Register constructors once during app startup
  (for example in `src/index.ts`) to replace hole fallbacks incrementally.
- **Vitest npm probes:** same as emit-hono — temp `npm install` only when
  `CI=true` or `CHRYSALIS_E2E_EMIT=1`.
- **Flagship parity:** Same Vitest slices as emit-hono — **`flagship/laravel-min`**
  (nineteen handlers, zero holes, key handler files) and **`flagship/laravel-full/chrysalis-templates`**
  (fifty-two handlers: `ping_show.ts`, `health_txt_show.ts`, `api_health_show.ts`, `jump_show.ts`,
  `count_show.ts`, `framework_show.ts`, `first_item_show.ts`, `last_item_show.ts`, `items_list_show.ts`, `lib_count_show.ts`, `sum_ids_show.ts`, `min_id_show.ts`, `max_id_show.ts`, `avg_id_show.ts`, `id_span_show.ts`, `sum_squares_show.ts`, `even_count_show.ts`, `odd_count_show.ts`, `gt_two_count_show.ts`, `lt_three_count_show.ts`, `gte_two_count_show.ts`, `lte_three_count_show.ts`, `ne_two_count_show.ts`, `session_visit_show.ts`, `session_me_show.ts`, `hello_show.ts`,
  `between_count_show.ts`, `eq_one_count_show.ts`, `eq_three_count_show.ts`, `eq_two_count_show.ts`, `ne_one_count_show.ts`, `ne_three_count_show.ts`, `lt_two_count_show.ts`, `gt_one_count_show.ts`, `gte_one_count_show.ts`, `lte_one_count_show.ts`, `between_one_two_count_show.ts`, `gt_three_count_show.ts`, `lt_one_count_show.ts`, `gte_three_count_show.ts`, `lte_two_count_show.ts`, `eq_zero_count_show.ts`, `ne_zero_count_show.ts`, `items_snapshot_show.ts`, `items_group_parity_show.ts`, `items_cte_rollup_show.ts`, `recursive_stress_show.ts`, `session_login_post.ts`, `session_logout_post.ts`, `echo_post.ts`, zero holes).

## Non-goals

- Feature parity experiments beyond what tiny-blog needs (plugins, schema auth).
- Replacing emit-hono as the default CLI target.
