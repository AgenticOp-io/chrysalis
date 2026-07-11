# @chrysalis/ingest

## Purpose

The PHP frontend. Takes PHP AST JSON from `@chrysalis/parser-bridge` and
produces a WebIR `Module` populated across the `web.request`, `effect`,
`data`, and `control` dialects. Unsupported constructs become typed holes.

## Public API

- `ingestFile(phpPath: string, route: RouteSpec, opts?: IngestFileOptions): Promise<Module>`
- `ingestDirectory(root: string, opts?: IngestOptions): Promise<Module>`
- `IngestFileOptions.projectRoot` — when set, applies the same `buildCallEffectMap`
  widening as `ingestDirectory` (`lib/`, Composer-aware optional `vendor/`,
  + hoisted functions for that route)
- `IngestOptions.parserProvider` / `IngestFileOptions.parserProvider` — forwards
  parser selection to `@chrysalis/parser-bridge` (`glayzzle` default, optional `nikic`)
- `IngestOptions.ingestCacheDir` (V2-M2, opt-in) — reuse on-disk PHP AST JSON keyed by file SHA-256, parser provider, and **`INGEST_AST_CACHE_VERSION`**; **`chrysalis ingest` / `emit`** expose **`--ingest-cache <dir>`**.
- `IngestOptions.ingestProgressFile` (V2-M2, opt-in) — append **`chrysalis.ingest.progress`** JSON after each successful route root (**`recordIngestRouteProgress`**, **`fingerprintIngestRouteList`**); **`chrysalis ingest` / `emit` / `verify --project` / `repair` / `insight` / `status --project`** expose **`--ingest-progress-file <path>`** (**DESIGN D277**, **`verify`** requires **`--project`** when set — **D280**). Diagnostic only; does not skip ingest work; not combinable with **`--merge-all-shards`** on the CLI. **`parseIngestProgressJson`**, **`readIngestProgressFile`** — strict validation for operator tooling (**DESIGN D278**).
- `IngestOptions.ingestCheckpointFile` / `ingestResumeFromCheckpoint` (**DESIGN D294**, opt-in) — read/write partial WebIR + completed route keys for resume; **`chrysalis`** CLI **`--ingest-checkpoint-file`**, **`--ingest-resume-checkpoint`** on ingest-driven commands. Not combinable with **`--merge-all-shards`** on the CLI. Vitest **`packages/ingest/tests/ingest-checkpoint-resume.test.ts`**.
- `IngestOptions.dedupeStructuralSubgraphs` (opt-in, **DESIGN D283**) — after lowering, run **`dedupeStructuralSubgraphsInModule`** from **`@chrysalis/webir`** (same structural key as **`mergeWebIrModules`**, **D247**) on the monolithic module. CLI **`--ingest-dedupe-structural-subgraphs`** on ingest-driven commands. Optional **`IngestOptions.dedupeStructuralSubgraphsIgnoreOrigin`** (**`mergeDedupeStructuralKeyIgnoringOrigin`**, **D294**) + CLI **`--ingest-dedupe-structural-subgraphs-ignore-origin`** (requires structural dedupe on). Optional **`IngestOptions.liftSharedHelpers`** (**B2**, **D323**) + CLI **`--ingest-lift-shared-helpers`** (requires structural dedupe on) — canonicalizes identical lib/vendor helper bodies in **`buildCallEffectMap`** before the call-effect fixpoint. Optional **`liftSharedHelpersIgnoreOrigin`** (default **true** / origin-insensitive helper-lift key) + CLI **`--ingest-lift-shared-helpers-respect-origin`** (requires lift on; sets **`liftSharedHelpersIgnoreOrigin: false`**) — twins in different files stay distinct when lifting. Optional **`liftSharedHelpersSemantic`** (**B3**, **D324**) + **`--ingest-lift-shared-helpers-semantic`** (requires lift on) — also merges helpers that differ only by PHP local names. Optional **`embedSharedHelperBodiesInModule`** (**B4**, **D325**) + **`--ingest-embed-shared-helper-bodies`** (requires structural dedupe on) — **`mergeWebIrModules`** of lib/vendor helper body roots into the route module before dedupe. Default **off**; when on, **`Module.nodes`** may shrink vs default ingest for identical subgraphs. Vitest **`merge-webir-modules.test.ts`** asserts **`fixtures/tiny-blog`** monolithic dedupe **`nodes.size`** matches **`mergeWebIrModules`** over **K=2** shards; **`many-routes-synthetic-ingest.test.ts`** asserts deduped **`nodes.size` ≤** default and matches a standalone **`dedupeStructuralSubgraphsInModule(full)`** pass; **`lift-shared-helpers.test.ts`** + **`lift-helper-gap-probe.test.ts`** cover helper lifting fixtures.
- `INGEST_AST_CACHE_VERSION` — bump in **`parse-cache.ts`** when ingest lowering changes without parser output changing (cache invalidation).
- `IngestOptions` — include/exclude globs, PHPDoc handling, hole policy, optional **`shardIndex` / `shardCount`** (V2-M2): only routes whose manifest **`file`** maps to the shard are lowered; **`buildCallEffectMap`** still uses the **full** route list for sound effect widening. For a **full** merged **`Module`**, run **`K`** ingests with **`shardIndex` 0..K-1** and call **`mergeWebIrModules`** from **`@chrysalis/webir`** (cross-shard structural dedupe, **DESIGN D247**), or use **`chrysalis ingest --merge-all-shards --shard-count K`**.
- `filterRoutesForShard` / `routeFileShardBucket` — deterministic route sharding (same FNV mix as verify **`traceDeterminismSeed`** on the relative path string). Vitest **`many-routes-synthetic-ingest.test.ts`** exercises **12** trivial routes in a temp tree (shard partition + full ingest) as a documented **size class** for CI-scale many-route smoke. Optional env **`CHRYSALIS_INGEST_BUDGET_MS`** / **`CHRYSALIS_INGEST_RSS_MAX_BYTES`** assert wall-clock or **`rss`** after the loop (**DESIGN D254**, **D255**, **D276**); see **`docs/OPERATIONS.md`** (V2-M2 runbook).
- `normalizeDbFactoryCalleeLabel(label)` — strips leading **`\\`** from manifest callee strings for stable matching.
- `dbFactoryReturnCalleeSet(manifest)` — builds the **`Set<string>`** used during ingest from **`dbFactoryReturnCallees`**.
- `chrysalis.routes.json` optional **`dbFactoryReturnCallees`**: string list of normalized callee labels (`Class::method` or global function) the project **declares** return a DB connection; enables **`$x->query`** / **`Factory::get()->query`** lowering without body inference (**D224**). Example FQNs: **`fixtures/laravel-shaped-db-factory-probe`** (**D225**).
- `liftUiAssets(opts)` (**DESIGN D6365**, **G9300b**) — UI asset lift: de-scope a source framework's scoped CSS into **one bundle per source route** (never one global sheet; unrelated components reusing class names would collide) plus a `chrysalis.ui.route-style-map` artifact (`@chrysalis/webir`), route→stylesheet mapping read **mechanically from the source build manifest**. Adapter contract **`UiFrameworkCssAdapter`**; registry **`UI_FRAMEWORK_CSS_ADAPTERS`** ships **`svelteKitCssAdapter`**, **`viteVueCssAdapter`**, **`viteCssModulesAdapter`**, and **`angularCssAdapter`**. **`liftUiMarkup`** / **`UI_FRAMEWORK_MARKUP_ADAPTERS`** (**G9306–G9307**: sveltekit, vite-vue, angular) produce **`chrysalis.ui.route-markup-map`** artifacts; **`mode: "structural-shell"`** (**D6367** / **G9460**) keeps layout HTML for interactive Svelte pages and records `legacy:markup-lift-svelte-*` holes (default for **`convertSiteProjectUi`**). **`@chrysalis/emit-shared`** consumes markup via **`resolveRouteMarkupHref`**, **`applyLiftedMarkupToCwlSource`** (**G9308–G9309**); **`hub-project-cwl-export.mjs`** patches projected **`migration.cwl`** when **`.chrysalis/ui-markup/`** exists. **`convertSiteProjectUi`** / **`chrysalis convert-site`** (**D6366**) orchestrates UI lift + CWL `@page` patch + optional load-bind and writes **`.chrysalis/site-convert.json`**. **`bindSiteProjectLoadFromTraces`** (**G9430** / **G9480** `seedApiPaths`) binds oracle-traced API JSON into `load { }` (optional `apiPath` seed via **`inferUiPageApiPath`** / **`seedApiPathsIntoCwlSource`**). CLI: **`chrysalis ui-assets`**, **`chrysalis ui-markup [--mode static|structural-shell]`**, **`chrysalis convert-site`**. Close smokes: **`hub:ui-asset-lift-smoke`**, **`hub:ui-markup-lift-smoke`**, **`hub:site-convert-smoke`**, **`hub:site-load-bind-smoke`**, **`hub:whole-site-cwl-close-smoke`**, **`hub:wisp-whole-site-finish-smoke`** (**G9480**), **`hub:wisp-remaining-holes-finish-smoke`** (**G9490** — layout passthrough + structural hydration; GenieACS out of scope).

## Invariants

- The handler body is the route file's top-level executable statements
  (`selectRouteHandlerStatements`). For invokable controllers (no top-level
  statements but a non-static `__invoke` method, hoisted by the parser bridge to
  a `Class::__invoke` `FunctionDecl`), the `__invoke` body is lifted instead.
  This keys off the PHP invokable convention, not any framework. Other instance
  methods are not dispatched (named-action controllers would need a manifest
  method field — out of scope).
- Every emitted WebIR node has a `Locator` pointing at the originating
  `file:line:col`.
- Unsupported constructs never throw and never silently elide — they become
  `hole` nodes with a descriptive `reason` and typed input/output contracts
  inferred from context. When a reason clearly references auth-boundary PHP
  (Gate, CSRF, Sanctum/Passport, Socialite/Fortify/OAuth-shaped tokens — DESIGN D189),
  ingest prefixes it with `auth:` (Milestone 6A).
- Ingest is deterministic: same input AST → byte-equal WebIR (modulo timestamps
  in `Module.meta`).

## Known PHP builtins (partial list)

Lowered to WebIR effects or `data.call` helpers (see `convert.ts`): **`query_all` /
`query_one` / `exec_sql`** (used by **`fixtures/tiny-blog`** and **`fixtures/mysqli-probe`**;
PDO vs mysqli in `lib/` does not change ingest lowering at call sites), **`db()->query(...)`** and
**manifest-declared** factory returns (**`dbFactoryReturnCallees`**), tracked **`new mysqli` / `new PDO` / `new SQLite3` / `mysqli_connect`** and copy aliases — other **`$x->query`** stays **`legacy:db-query-unknown-receiver`**, static `Class::method()` calls (parser `StaticFetch` callee) as `data.call` with
a `class::method` label (not a hole; class methods are collected into call-effect overlays),
`session_start`, `session_name`, `session_set_cookie_params` (PHP-only cookie
setup; emitted middleware owns cookies), `$_SESSION[...]` read/write, redirects,
`time`, `rand` family, `getrandmax`, `microtime` (float and string modes), `uniqid`
(literal entropy flag), `parse_url` (component or full parts record), `json_encode`
(single argument only — extra args / options are a hole). PHP arrays with **only**
string literal keys lower to `__object_literal` (object-shaped JSON); unkeyed lists
still use `__array_literal`. Mixed or non-string-literal keys become an ingest hole.
Anything else becomes a hole or generic call.

## Non-goals

- Running or executing PHP.
- Target-language specifics. Ingest does not know what emit backend will be
  used. It produces WebIR; that's the contract.
- Schema recovery (that's `archaeology`).
