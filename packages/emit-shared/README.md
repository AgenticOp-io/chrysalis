# @chrysalis/emit-shared

## Purpose

Shared **WebIR handler body → TypeScript** lowering used by multiple HTTP emit
backends (`emit-hono`, `emit-fastify`, …). Owns the effect/data statement
walker and framework-specific HTTP surface via `HttpEmitProfile`.

## Public API

- `emitHandlerBody(module, handlerId, options?, profile?)` — handler function
  body text, holes, inferred effects, domain type imports, and flags
  `usesQueryAllWhereIn` / `usesChrysalisBatchHelpers` / `usesPhpFqnNew` /
  `usesPhpDynamicNew` / `usesZod` for conditional handler imports. Defaults to
  `honoHttpProfile`.
- Internal `data.call` callees `__chrysalis_pluck`, `__chrysalis_row_by_column`,
  `__chrysalis_query_all_where_in` lower to runtime/db helpers for N+1 batching
  (D42). Ingest does not synthesize them; the **`batch-n1-read`** rewrite pass
  (`@chrysalis/rewrite`, D43) may introduce them on qualified modules.
- `__chrysalis_zod_body_field` lowers to `parseZodBodyFieldRaw` (runtime.ts) when
  **`boundary-zod`** runs (D44).
- **`__new`** with a string literal: single-segment global class → `new Name(…)`;
  multi-segment FQN → `phpFqnNew` at runtime (D194). Runtime backends expose
  optional `registerPhpFqnCtor(fqn, ctor)` to resolve known PHP class names
  without hole fallback.
- **`__new_dynamic`** lowers to `phpDynamicNew(classExpr, ...args)`: runtime
  resolves registered string class names and otherwise delegates to a typed
  hole (`new:dynamic`).
- **Emit:** `data.block` may emit `Array.reduce` instead of `for…of` when a
  literal init, `data.foreach`, and a single accumulating `__assign` match the v1
  reduce pattern (see ROADMAP).
- `honoHttpProfile`, `fastifyHttpProfile` — `HttpEmitProfile` values.
- `emitExpr`, `emitStmt` — lower-level helpers (mainly for tests).
- `ident`, `stringLit`, … — TS text helpers.
- **`summarizeEmittedTypeScriptLayout(outDir)`** — post-emit filesystem scan of **`.ts`** files (skips **`node_modules`**, **`chrysalis-sessions`**, …); returns **`EmittedTsLayout`** for **`emit-stats`** / dashboards (**V2-M4**, **DESIGN D250**).
- **`ChrysalisEmitStrategyV1`**, **`ChrysalisEmitRouteRegistration`** — consumed by HTTP emitters for **`routeRegistration`** (**`eager`** vs **`lazy`** server binding; **DESIGN D252**) and optional **`runtimeFacadeModule`** (**`src/chrysalis-runtime-facade.ts`**, **DESIGN D272**), **`emitSharedRuntimeImports`** (**`src/chrysalis-runtime-imports.ts`**, **DESIGN D281**; incompatible with **`handlerImportBarrel`**), **`emitDedupeIdenticalHandlerBodies`** (**`src/chrysalis-deduped/`**, **DESIGN D282**).
- **`computeEmittedHandlerDedupeKey`**, **`chrysalisBodyDedupeExportId`** — canonical grouping key and export name for **D282** identical-body dedupe (**`emit-handler-body-dedupe.ts`**).
- **`buildChrysalisRuntimeFacadeModuleSource`** — text for **`src/chrysalis-runtime-facade.ts`** (**`export * from "./runtime.js"`**) when **`emitStrategy.runtimeFacadeModule`** is set.
- **`buildChrysalisRuntimeSharedImportsModuleSource`** — aggregated **`export { … } from "./runtime.js"`** (or from **`./chrysalis-runtime-facade.js`**) for **`emitStrategy.emitSharedRuntimeImports`**.
- **`formatEmitProvenanceDisplay(provenanceRoot, originFile)`** — stable posix path for **`@chrysalis-provenance`** in emitted handlers when **`provenanceRoot`** is the PHP project directory.
- **Per-handler emit fingerprints (D259):** **`buildEmitHandlerFingerprintsJson`**, **`EMIT_HANDLER_FINGERPRINTS_KIND`**, **`EMIT_HANDLER_FINGERPRINTS_SCHEMA_VERSION`**, **`sha256Utf8Hex`** — when **`emitStrategy.emitHandlerFingerprints`** is set, HTTP emitters write **`chrysalis.emit-handler-fingerprints.json`** (SHA-256 of each emitted handler source text at **`outDir`**).
- **V2-M4 layout scalability (surface area, D278):** optional **`emitStrategy.handlerImportBarrel`** (**`src/chrysalis-handler-imports.ts`**), **`emitRoutePathConstants`**, **`emitHandlerFingerprints`**, **`runtimeFacadeModule`**, **`emitSharedRuntimeImports`** (**`src/chrysalis-runtime-imports.ts`**, **D281**), **`emitDedupeIdenticalHandlerBodies`** (**`src/chrysalis-deduped/`**, **D282**) reduce duplicated import noise / duplicate lowered bodies. **Per-handler bodies** stay one file per route unless **`routeRegistration.lazy`** splits server wiring or **D282** delegates to a shared module. **ROADMAP** *Remaining*: IR-level helper commoning when lowered bodies are not identical.

## Invariants

- **No framework imports** in this package; profiles are plain string templates.
- **Holes** are compiling `__hole(...)` calls, never silent throws.
- **String-dispatch** uses the same `matchStringDispatchChain` rules as
  `@chrysalis/insight`.

## Non-goals

- Emitting `package.json`, servers, or DB adapters (each backend package).
- Owning WebIR types or ingest — only consumes `@chrysalis/webir`.
