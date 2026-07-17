# Chrysalis — Design Document

> **This document is the north star. If something you are about to build contradicts
> this document, stop and either (a) change this document with justification, or
> (b) change your plan. Do not silently drift.**

Status: **v0.1 — foundational**
Last updated by: D308 (**verify replay redaction-safe bodies and SQL tape** — Decision Log **2026-05-19 — D308**); D307 (**WPTP D6 enterprise policy pack** — Decision Log **2026-05-19 — D307**); D306 (**WPTP silver Next.js WebIR bridge** — Decision Log **2026-05-19 — D306**); D305 (**WPTP D4 Next.js emit harness CI** — Decision Log **2026-05-19 — D305**); D304 (**WPTP D3 silver harness CI** — Decision Log **2026-05-19 — D304**); D303 (**canonical public GitHub remote — `AgenticOp-io/chrysalis`** — Decision Log **2026-05-19 — D303**); D293 (**historical `theorem6/chrysalis` user namespace** — Decision Log **2026-05-10 — D293**); D292 (**outbound services identity — **AgenticOp** at **https://agenticop.io** + **`branding/agenticop/`** logos** — Decision Log **2026-05-06 — D292**); D291 (**canonical repo root `chrysalis/` + committed workspace `chrysalis.project.json`** — Decision Log **2026-05-06 — D291**); D290 (**`chrysalis init` + `chrysalis.project.json` marker** — Decision Log **2026-05-08 — D290**); D289 (**commercial documentation + optional local CLI license gate** — Decision Log **2026-05-05 — D289**); D286 (**GitHub canonical org remote — `4GEngineer/chrysalis` (historical; superseded by D293)** — Decision Log **2026-04-30 — D286**); D285 (**v2.0.0 source release — semver bump + changelog** — Decision Log **2026-04-30 — D285**); D284 (**v2.0.0 tag documentation + operator five-nines prerequisites** — Decision Log **2026-05-03 — D284**); D283 (**within-module structural subgraph dedupe v0:** **`dedupeStructuralSubgraphsInModule`** in **`@chrysalis/webir`**; optional **`IngestOptions.dedupeStructuralSubgraphs`** + CLI **`--ingest-dedupe-structural-subgraphs`** on **`ingest`**, **`emit`**, **`verify --project`**, **`repair`**, **`insight`**, **`status --project`**, **`rewrite`**; same key contract as **D247**); D282 (**emit identical lowered-handler body dedupe v0:** **`emitStrategy.emitDedupeIdenticalHandlerBodies`**, **`computeEmittedHandlerDedupeKey`**, **`src/chrysalis-deduped/`** shared modules + thin route handlers; CLI **`--emit-dedupe-identical-handler-bodies`**; WebIR unchanged); D281 (**emit shared runtime imports module:** **`emitStrategy.emitSharedRuntimeImports`** + **`buildChrysalisRuntimeSharedImportsModuleSource`** → **`src/chrysalis-runtime-imports.ts`**; CLI **`--emit-shared-runtime-imports`**; mutually exclusive with **`handlerImportBarrel`**); D280 (**ingest progress on verify/repair/insight:** CLI forwards **`--ingest-progress-file`** with **`verify --project`**, **`repair`**, **`insight`**); D279 (**operator JSON index:** root **`README.md`** machine table row for **`chrysalis.ingest.progress`**; **`docs/README.md`** Operations row **D278** pointer); D278 (**ingest progress parse API + V2-M4 layout doc:** **`parseIngestProgressJson`**, **`readIngestProgressFile`**, **`emit-shared` README** V2-M4 surface); D277 (**ingest progress JSON:** **`chrysalis.ingest.progress`** **`schemaVersion` 0**, CLI **`--ingest-progress-file`**, **`@chrysalis/ingest`** **`ingestProgressFile`**; diagnostic only, **DESIGN §3** preserved); D276 (**V2-M2 synthetic ingest CI guards doc alignment:** **`CHRYSALIS_INGEST_RSS_MAX_BYTES`** + **`CHRYSALIS_INGEST_BUDGET_MS`** in **`many-routes-synthetic-ingest`** / **OPERATIONS** / **ROADMAP**; **D255**); D275 (**V2-M2 ingest runbook:** **`docs/OPERATIONS.md`** *Ingest scale and resume*; contrast **`emit --emit-resume`**); D274 (**V2-M6 closure:** fleet aggregation reference in **`docs/OPERATIONS.md`**; **`ROADMAP`** **V2-M6** **closed**); D273 (**PHP Redis session save handler:** **`Chrysalis\Oracle\Session\RedisChrysalisSessionHandler`** + **`registerFromEnv()`**, aligned with emitted **`CHRYSALIS_SESSION_REDIS_URL`** keys **`chrysalis:sess:`**); D272 (**runtime import facade v0:** **`emitStrategy.runtimeFacadeModule`** + **`buildChrysalisRuntimeFacadeModuleSource`**, **`src/chrysalis-runtime-facade.ts`**, CLI **`--emit-runtime-facade`**); D271 (**verify summary batch:** **`chrysalis.verify.summary.batch`** **`schemaVersion` 1** + **`scripts/aggregate-verify-summaries.mjs`**; **`VERIFY_SUMMARY_*`** in **`@chrysalis/verify`**; **`pnpm run ci:verify-summary-batch`**); D270 (**parser-bridge vendor without global Composer:** **`scripts/parser-bridge-composer-install.mjs`** bootstraps **`composer.phar`** via official installer when **`php`** is on **`PATH`**); D260–D269 (**operator JSON micro-slices:** **`chrysalis --help`** scale-out line + **`aggregate-chimera-operator-snapshots.mjs`** pointer; root **`README.md`** machine-JSON rows; **`docs/README`**, **`emit-shared` / `emit-hono` / `emit-fastify`** README cross-links; Vitest stdin + invalid JSON + wrong **kind** on aggregate script); D259 (**operator-snapshot batch:** **`chrysalis.chimera.operator-snapshot.batch`** **`schemaVersion` 1** + **`scripts/aggregate-chimera-operator-snapshots.mjs`**; fixture **`fixtures/ci/chimera-operator-snapshot-batch-v1-smoke.json`**; **emit** **`emitStrategy.emitHandlerFingerprints`** → **`chrysalis.emit-handler-fingerprints.json`**, CLI **`--emit-handler-fingerprints`**, **`buildEmitHandlerFingerprintsJson`** in **`@chrysalis/emit-shared`**); D258 (**chimera operator drift:** **`chrysalis.chimera.operator-snapshot`** **`schemaVersion` 1** + **`deployRoutingFingerprintSha256`**; **`chrysalis deploy`** **`--operator-metrics-json`** / **`--operator-metrics-ndjson`**, **`--operator-metrics-interval-ms`**, **`CHRYSALIS_CHIMERA_INSTANCE_ID`**; **`scripts/chimera-routing-fingerprint.mjs`**; **`pnpm run ci:chimera-operator-snapshot`**; **emit** **`emitStrategy.emitRoutePathConstants`**, **`src/chrysalis-route-paths.ts`**, CLI **`--emit-route-path-constants`**; **V2-M6** privacy note in **OPERATIONS**); D257 (**multi-key chimera deploy HMAC:** **`hmacSha256`** may be a **hex string** or **`{ [keyId]: hex }`**; **`parseChimeraDeployConfigJson`** tries **`hmacSecret`** + **`hmacPreviousSecrets`** for string form; **`hmacSecretsByKeyId`** for object form (**any** matching id); **`computeChimeraDeployConfigHmacHexByKeyIds`** for signing; CLI **`--config-hmac-keys-json`**, **`CHRYSALIS_CHIMERA_CONFIG_HMAC_KEYS_JSON`**, **`CHRYSALIS_CHIMERA_CONFIG_HMAC_PREVIOUS_SECRETS`** JSON array; **OPERATIONS** rotation runbook updated); D256 (**`emitStrategy.handlerImportBarrel`** + **`src/chrysalis-handler-imports.ts`** Hono/Fastify barrel; CLI **`--emit-handler-import-barrel`**; **`chrysalis deploy`** **`--config-url`** / **`CHRYSALIS_CHIMERA_CONFIG_URL`**; **SIGHUP/SIGUSR2** reload (stop+restart chimera); **`pnpm run ci:chimera-lb-smoke`** round-robin LB Vitest; KMS/HMAC rotation runbook in **OPERATIONS**); D255 (**`hmacSha256`** optional HMAC for **`chrysalis deploy --config`**, **`stableStringifyChimeraDeploySigningPayload`**, CLI **`--config-hmac-secret`** / **`CHRYSALIS_CHIMERA_CONFIG_HMAC_SECRET`**; **`CHRYSALIS_INGEST_RSS_MAX_BYTES`** synthetic ingest hook; **`scripts/export-fleet-status-uplink.mjs`** + nested **`items[].status`** in fleet uplink v0); D254 (**`ChimeraStats`** shadow **`divergenceLines`** / **`mirrorErrors`** + canary counters; **`emitResume`** + **`.chrysalis-emit-state.json`** on **`emit-hono` / `emit-fastify`** + CLI **`--emit-resume`**; **`CHRYSALIS_INGEST_BUDGET_MS`** on synthetic many-route ingest; **`chrysalis.fleet.status-uplink`** v0 fixture; **OPERATIONS** multi-AZ / stickiness / emit-resume notes); D253 (**versioned `chrysalis.chimera.config`** + **`parseChimeraDeployConfigJson`** for **`chrysalis deploy --config`**); D252 (**`emitStrategy.routeRegistration`** **`lazy`/`eager`**, **`provenanceRoot`**, **`@chrysalis-provenance`**, CLI **`--emit-route-registration`**); D251 (**`emit-layout-floors`** + **`CHRYSALIS_EMIT_LAYOUT_MAX_*`** on flagship **`emit-stats`**); D250 (**`summarizeEmittedTypeScriptLayout`** in **`@chrysalis/emit-shared`** + flagship **`emit-stats` `layout`**); D248 (**`chrysalis status --json`** **`ingestSharding`** field + ingest AST cache miss policy); D247 (**`mergeWebIrModules`** cross-shard structural dedupe via **`merge-dedupe-key.ts`**); D246 (**`mergeWebIrModules`** + CLI **`--merge-all-shards`** for **`ingest` / `emit` / `status`**); D245 (V2-M2 synthetic **12-route** temp-tree ingest stress test + **`ROADMAP`** progress note for shard merge / emit resume); D244 (V2-M3 **`verify-tiny-blog.mjs`**: two synthetic trace hosts + merge + Hono replay); D243 (V2 ergonomics: **`chrysalis --help`** scale-out line; **`corpus-merge-summary`** invalid JSON + wrong-**`kind`** tests; dry-run vs live merge counter parity; CLI **`--dry-run --json-out`**; admin/verify/cli README cross-links); D242 (V2-M3 **`corpus-merge-summary`** CI gate + **`fixtures/ci/corpus-merge-summary-smoke.json`** + root **`ci:corpus-merge-summary`**); D241 (V2-M2 opt-in PHP AST ingest cache: SHA-256 + parser + `INGEST_AST_CACHE_VERSION`, CLI `--ingest-cache`); D240 (V2-M3 `mergeCorpusDirectories` + `chrysalis corpus-merge` for NDJSON day-bucket trees); D239 (V2-M2 ingest route sharding + CLI `--shard-*`); D238 (V2-M1 `verify-merged-summary` CI gate + e2e merged artifact + ADMIN multi-host corpus doc); D237 (V2-M1 partitioned verify: `replayCorpus` shard filter, `verify-merge`, `mergeCorrectnessReports`, repair strips shards); D236 (Chrysalis 2.0 charter: scale-out roadmap in `ROADMAP.md` — partitioned verify, resumable ingest, multi-host oracle, emit layout, multi-instance chimera; **DESIGN §3** non-negotiables preserved); D230 (dual-summary CI gate + tests + machine-JSON docs for verify artifacts); D229 (flagship dual-backend machine verify summaries in `reports/ci` + CI artifact uploads); D228 (verify-e2e dual-backend machine summary artifact `reports/ci/verify-e2e-summary.json` + CI upload); D227 (machine JSON docs: root README table + CLI/verify README + ingest export `normalizeDbFactoryCalleeLabel`); D226 (`migration-debt --json-out` `kind`/`schemaVersion`/`toolVersion`); D225 (`fixtures/laravel-shaped-db-factory-probe` + FQN `dbFactoryReturnCallees` docs); D224 (manifest `dbFactoryReturnCallees` for declared DB factory `->query` lowering); D223 (`verify --json-summary` `schemaVersion`/`toolVersion` + `db-query-unknown-receiver-probe` migration gate); D222 (`chrysalis verify --json-summary`); D221 (Wave 3 — `new PDO` receiver tracking, parser-parity-probe + nikic, verify stderr diagnostics bundle); D220 (Lane B — copy alias `$b = $a` for tracked DB receivers + mysqli-probe `alias-copy` route); D219 (Lane B — `new mysqli` / `mysqli_connect` variable aliases for `$x->query` lowering + mysqli-probe route); D218 (Lane B — `legacy:db-query-unknown-receiver` hole for `$x->query` when receiver is not `db()` / tracked `db()` alias; fixture `db-query-unknown-receiver-probe`); D217 (Wave 2 closure: `db()` factory alias tracking for `$db->query` lowering + mysqli-probe alias route; `migration-debt` `--max-holes` / `--min-correctness` gates; verify per-route stdout vs per-trace divergence stderr; nikic strip-pos on mysqli direct/alias pages); D216 (Wave 2 slice: `db()->query` ingest lowering, mysqli-probe direct route, migration-debt CI artifact, nikic `lib/db.php` parity, repair stderr replay pointer); D215 (multi-lane Wave 1 closure: mysqli-probe ingest fixture, migration-debt `--json-out`, verify replay env doc + threshold stderr pointer, nikic parity on mysqli route); D214 (CI MySQL 8 service + oracle-php `mysqli_capture_smoke.php` for mysqli `sql.query` tape); D213 (`replayCorpus` only-route / only-trace-id + CI nikic step + migration-debt script); D212 (`chrysalis verify` divergence histogram + summary path + next-step hints); D211 (multi-lane program: parser / oracle / verify / holes — ROADMAP § multi-lane); D210 (UTF-8 BOM strip for `chrysalis.observe.json` + CI `composer:v2` for parser-bridge pretest); D209 (`chrysalis.observe.json` strict parse + CLI `observe` error surface); D208 (`loadObserveConfig` merges `chrysalis.observe.json` onto `DEFAULT_REDACTION`); D207 (`replay-worker.js` path resolves from `src/` via adjacent `dist/`); D206 (mutation-only DEFAULT `sql.params` + optional verify `worker_threads`); D205 (`sql.params[...]` bind redaction in oracle-php + CI root `tsc -b`); D204 (CLI `verify`/`repair` replay tuning flags); D203 (`sql.row.`* redaction for captured SQL row payloads); D202 (default trace redaction expansion + optional `replayCorpus` concurrency); D201 (corpus-gated `sanitize-output`; oracle footprint `dynamicNewCount` per route); D199b (status `dynamicNewWebIrCount` for `__new_dynamic` calls); D200 (corpus-gated `parameterize-sql` + `raw-sql-concat` corpus boost); D199 (status tracks dynamic new holes + top reasons); D198 (dynamic `new $x(...)` parser shape + `__new_dynamic` emit/runtime bridge); D197 (corpus-gated `batch-n1-read` + `phpFqnNew` ctor registry hook); D196 (ingest/CLI parser-provider wiring for `nikic` opt-in pipelines); D195 (parser-bridge `**nikic` provider**: subprocess JSON mapper); D194 (FQN `new` → `phpFqnNew` + runtime hole delegation); D193 (throw + unqualified `new` glayzzle → WebIR → emit); D192 (Milestone 6A — Socialite + Fortify flagship oracle probe); D191 (Milestone 6A — `json_encode` + PHP associative array → `__object_literal` lowering); D190 (Milestone 6A — Gate + Sanctum/OAuth flagship oracle probes); D189 (Milestone 6A — ingest auth hole count in status / CLI JSON); D186 (Milestone 6A — static hole detail + ingest auth-tag e2e test); D185 (Milestone 6A — ingest + webir shared auth hole tagging); D184 (Milestone 6A — status reads auth residual-legacy sidecar); D183 (Milestone 6A — auth-boundary emit hole tagging + residual sidecar); D182 (Milestone 6 — confidence-preserving callable-choice narrowing); D181 (Milestone 6 — composer autoload-aware vendor effect depth); D180 (Milestone 6 — mysqli use-result unbuffered row-count semantics); D179 (Milestone 6 — session bridge release-policy CI gate lane); D178 (Milestone 6 — emitted Redis session bridge option); D177 (Milestone 6 — mysqli get_result fallback keeps pending capture); D176 (Milestone 6 — emitted shared SQLite session bridge option); D175 (Milestone 6 — call_user_func array-literal callable narrowing); D174 (Milestone 6 — parser class static methods into overlay map); D173 (Milestone 6 — ingest static `Class::method` call lowering); D172 (Milestone 6 — parser-bridge glayzzle namespace + qualified FunctionDecl); D171 (Milestone 6 — call-overlay FQN tail match + Vitest webir src alias); D170 (Milestone 6 — oracle-php mysqli prepared-statement params in traces); D169 (Milestone 6 — oracle-php mysqli prepared + buffered query rows); D168 (Milestone 6 — deeper call_user_func overlay narrowing + safe fallback); D167 (Milestone 6A auth-boundary scoped track); D166 (Milestone 6 — migration sidecar release-policy gate lane); D165 (Milestone 6 — oracle-php mysqli query-path capture); D164 (Milestone 6 — call_user_func overlay narrowing for literal callees); D163 (Milestone 6 — ingest vendor helper effects in call overlay); D162 (Milestone 6 roadmap shell — deferred depth backlog promoted to checklist); D161 (Milestone 5 closure — checklist complete in ROADMAP); D160 (Milestone 5 — laravel-min D148-D160 method-guard pack); D147 (Milestone 5 — laravel-min POST /count method guard); D146 (Milestone 5 — laravel-min POST /session/visit method guard); D145 (Milestone 5 — laravel-min POST /session/me method guard); D144 (Milestone 5 — laravel-min GET /logout method guard); D143 (Milestone 5 — laravel-min login empty/invalid credential negatives); D142 (Milestone 5 — laravel-min bad-CSRF login negative trace); D141 (Milestone 5 — laravel-min home/db/visit/login post-capture assertions); D140 (Milestone 5 — laravel-min echo request-shape + method-guard assertions); D139 (Milestone 5 — laravel-min cross-backend verify report parity); D138 (Milestone 5 — laravel-min metadata/static route contract assertions); D137 (Milestone 5 — laravel-min verify corpus semantics: health/jump/session/login); D136 (Milestone 5 — laravel-min verify: wider `/hello` oracle + capture assertions); D135 (Milestone 5 — flagship full verify: wider `chrysalis-hello` oracle shapes); D134 (Milestone 5 — optional CI floors for idiomaticity/residual sidecars); D133 (Milestone 4–5 — laravel-min emit-stats + status sidecars + CI artifacts); D132 (Milestone 5 — pipeline-owned idiomaticity/residual sidecars + CI matrix rollup gates); D131 (Milestone 5 — matrix confidence rollup + chimera test fetch retries); D130 (Milestone 5 — confidence trend stores/enforces cross-backend parity health); D129 (Milestone 5 — cross-emitter verify report parity in five-nines gate); D128 (Milestone 5 — cookie/session header invariants in five-nines confidence gate); D127 (Milestone 5 — header contract strictness + redirect location invariants); D126 (Milestone 5 — session transition monotonicity checks in five-nines confidence gate); D125 (Milestone 5 — session idempotency assertions in five-nines confidence gate); D124 (Milestone 5 — request-shape robustness checks in five-nines gate); D123 (Milestone 5 — CI auto-switch from confidence warmup to strict trend mode); D122 (Milestone 5 — resolve laravel-min/Breeze/auth ownership boundaries); D121 (Milestone 5 — rolling confidence trend gate + stricter threshold + expanded negative-path assertions); D120 (Milestone 5 — per-cell KPI thresholds in five-nines confidence dashboard); D119 (Milestone 5 — risk-cell dashboard coverage in five-nines confidence artifact); D118 (Milestone 5 — five-nines confidence gate with negative-path + metamorphic checks + CI artifact); D117 (Milestone 5 — seed-variant replay matrix + seed-aware semantic assertions in `verify:laravel-full`); D116 (Milestone 5 — stress replay + semantic route assertions in `verify:laravel-full`); D115 (Milestone 5 — complexity ladder pack: snapshot/group-by/CTE/recursive templates + oracle); D114 (Milestone 5 — `chrysalis-ne-zero-count` template + oracle); D113 (Milestone 5 — `chrysalis-eq-zero-count` template + oracle); D112 (Milestone 5 — `chrysalis-lte-two-count` template + oracle); D111 (Milestone 5 — `chrysalis-gte-three-count` template + oracle); D110 (Milestone 5 — `chrysalis-lt-one-count` template + oracle); D109 (Milestone 5 — `chrysalis-gt-three-count` template + oracle); D108 (Milestone 5 — `chrysalis-between-one-two-count` template + oracle); D107 (Milestone 5 — `chrysalis-lte-one-count` template + oracle); D106 (Milestone 5 — `chrysalis-gte-one-count` template + oracle); D105 (Milestone 5 — `chrysalis-gt-one-count` template + oracle); D104 (Milestone 5 — `chrysalis-lt-two-count` template + oracle); D103 (Milestone 5 — `chrysalis-ne-three-count` template + oracle); D102 (Milestone 5 — `chrysalis-ne-one-count` template + oracle); D101 (Milestone 5 — `chrysalis-eq-two-count` template + oracle); D100 (Milestone 5 — `chrysalis-eq-three-count` template + oracle); D99 (Milestone 5 — `chrysalis-eq-one-count` template + oracle); D98 (Milestone 5 — `chrysalis-between-count` template + oracle); D97 (Milestone 5 — `chrysalis-ne-two-count` template + oracle); D96 (Milestone 5 — `chrysalis-lte-three-count` template + oracle); D95 (Milestone 5 — `chrysalis-gte-two-count` template + oracle); D94 (Milestone 5 — `chrysalis-lt-three-count` template + oracle); D93 (Milestone 5 — `chrysalis-gt-two-count` template + oracle); D92 (Milestone 5 — `chrysalis-odd-count` template + oracle); D91 (Milestone 5 — `chrysalis-even-count` template + oracle); D90 (Milestone 5 — `chrysalis-sum-squares` template + oracle); D89 (Milestone 5 — `chrysalis-id-span` template + oracle); D88 (Milestone 5 — `chrysalis-avg-id` template + oracle); D87 (Milestone 5 — `chrysalis-max-id` template + oracle); D86 (Milestone 5 — `chrysalis-min-id` template + oracle); D85 (Milestone 5 — Breeze in scaffold + CI); D84 (Milestone 5 phase 1 — canonical Laravel worktree); D83 (Milestone 5 roadmap shell); D82 (Milestone 4 v1 pilot closure); D81; D40 oracle footprint; D39; D38; D37 + section 9 checklist sync

---

## 1. One-sentence pitch

**Chrysalis is an AI-assisted universal web translator and coexistence framework:**
legacy (and greenfield) web stacks lift into **WebIR / CWL**, LLM and Intelligence
Shorthand propose repairs, and the **oracle + verify** loop disposes truth — so
conversion is grown inside a running app rather than trusted as a one-shot dump.

The "PHP-to-TypeScript converter" is the first frontend/backend pair of that system.
**WISP Module_Manager is a POC showcase only** (**D6437**) — not the product.


---

## 2. The core insight

Every existing converter (Rector, 2to3, js_of_ocaml, Kotlin's J2K, LLM agents)
treats **source code as the source of truth**. For legacy apps, this is wrong.
The real source of truth is distributed across:

- The **running behavior** (what the app returns for real inputs)
- The **database schema** it talks to
- The **HTML** it emits and the forms that feed it back
- The **HTTP contract** clients depend on
- The **side effects** nobody documented

Source code is one lossy projection of that truth.

Chrysalis reframes legacy modernization from a **translation problem**
(intractable) into a **specification problem** (tractable): the live app is
the spec, and code translation is just one way to satisfy it — verified, not
trusted.

---

## 3. Non-negotiable principles

These are invariants. Violating one means the project has lost its identity.

1. **The running app is the spec.** Static translation is a candidate; behavioral
  replay is the oracle. We never ship unverified translation.
2. **Partial output beats no output.** Any node that cannot be translated
  becomes a typed, compiling **hole** that calls back into the legacy runtime.
   Migration is never blocked by a single construct.
3. **Provenance everywhere.** Every generated type, schema, route, and handler
  carries metadata describing *why* it exists (which PHP file, which SQL column,
   which observed trace). Humans must be able to audit any decision.
4. **Dual-stack from day one.** The framework's shipping mode is *coexistence
  with legacy*, not replacement. Big-bang rewrites are a failure mode.
5. **Effects are types.** Every handler's type signature carries its effects.
  The compiler enforces this. No silent mutation, no hidden I/O.
6. **The IR is the product.** WebIR is the asset. Frontends and backends are
  replaceable. Keep WebIR clean, framework-agnostic, and language-agnostic.
7. **Determinism in the runtime.** Time, randomness, and I/O are injectable at
  the framework level so replay is byte-exact.
8. **Intent over syntax.** We preserve what the code was *trying to do*, not its
  surface form. `foreach`+mutation might become `.reduce`, a loop, or a
   generator depending on downstream usage.
9. **Ship to production with holes.** Correctness is measured and reported,
  never assumed. You can deploy an 87%-translated endpoint if the remaining
   13% is a hole that delegates safely.
10. **MIT or Apache-2.0 license.** GPL kills dev-tool adoption.

---

## 4. System architecture

```
                         ┌────────────────────────────────┐
 Legacy PHP app  ──────▶ │  Oracle sidecar (record)       │ ──▶ trace corpus
                         │  HTTP + SQL + outbound + time  │
                         └────────────────────────────────┘
                                         │
                                         ▼
  PHP source ──▶ parser-bridge ──▶ ingest ──▶ ┌──────────────────┐
                                              │     WebIR        │
                  DB introspection  ────────▶ │  (typed effect   │
                  HTML/form scan    ────────▶ │   graph, many    │
                  Trace corpus      ────────▶ │   dialects)      │
                                              └──────────────────┘
                                                       │
                   passes: lowering, optimization, repair (LLM-guided, verified)
                                                       │
                                                       ▼
                                        ┌──────────────────────────┐
                                        │ emit-* backends          │
                                        │  hono+drizzle (default)  │
                                        │  next+drizzle            │
                                        │  fastify+kysely          │
                                        │  (future: rust, gleam…)  │
                                        └──────────────────────────┘
                                                       │
                                                       ▼
                                       generated project + holes
                                                       │
                                                       ▼
                                        ┌──────────────────────────┐
                                        │ verify (replay oracle)   │
                                        │ green / red per endpoint │
                                        └──────────────────────────┘
                                                       │
                                                       ▼
                                        ┌──────────────────────────┐
                                        │ runtime-chimera          │
                                        │ dual-stack router,       │
                                        │ session bridge,          │
                                        │ schema lens,             │
                                        │ shadow/canary/cutover    │
                                        └──────────────────────────┘
```

---

## 5. The three signature layers

### 5.1 WebIR — a multi-dialect IR for web applications

Inspired by MLIR. Each dialect is an explicit, typed operation set. Progressive
lowering takes high-level intent to executable code without losing provenance.

Dialects (in lowering order):


| Dialect       | Purpose                                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `web.request` | Route → handler, request/response shapes, auth, middleware                                                                    |
| `effect`      | Explicit effect ops: `DB.read`, `DB.write`, `Mail.send`, `Session.mutate`, `Time.now`, `Random.uuid`, `Http.fetch`, `Cache.*` |
| `data`        | Pure dataflow in SSA form; scalars, records, arrays, sums                                                                     |
| `control`     | Structured control flow (loops, branches) after pure extraction                                                               |
| `target.ts`   | TypeScript-shaped ops (for emit)                                                                                              |
| `target.rust` | Future                                                                                                                        |


Every node has:

- `id: NodeId` — stable, referenced by reports and repair passes
- `type: WebIRType` — static type, possibly `Unknown` or `Hole`
- `effects: EffectSet` — inferred or annotated
- `provenance: Provenance[]` — list of `{source, locator, reason}` entries
- `origin: Locator` — pointer back to PHP file:line:col (or DB/form/trace)

A **hole** is a first-class IR node with a typed input/output contract and a
callback reference into the legacy runtime. Holes compile. Holes run. Holes are
a TODO list, not a failure.

### 5.2 Oracle — record/replay as verification

The sidecar proxy runs in front of the legacy app and records:

- HTTP request (method, path, headers, body, query) + response (status, headers, body)
- SQL queries and result sets (via a DB proxy or driver shim)
- Outbound HTTP, mail, queue, cache calls
- Session mutations
- Time reads (`date()`, `microtime()`) and RNG outputs

Each record is a `TraceFrame`. A `TraceCorpus` is a persisted, deduplicated
set of frames covering the observed surface area.

Verification pipeline:

1. Translate PHP → WebIR → target code.
2. For each `TraceFrame`, run the target handler in a sandbox with:
  - Captured inputs
  - Captured time/RNG values injected via the runtime's determinism hooks
  - A fake DB that returns captured result sets for matching queries
3. Diff emitted effects + response against recorded ones.
4. Attribute each divergence to the minimal set of responsible IR nodes
  (using the `id`/`origin` metadata).
5. Emit a per-endpoint `CorrectnessReport` with a numeric score and divergence list.
6. Optionally, invoke a **repair pass** that proposes IR rewrites scoped to the
  divergent nodes. Repair proposals are re-verified — never trusted.

#### Oracle footprint (static replay surface)

Before running the oracle or a full replay, WebIR alone can summarize **what must
be hydrated** per HTTP route: wall-clock / RNG effects, session edges, which
`db.read` tables imply SQL tape rows, outbound HTTP and mail, and how many
holes sit in the handler body. `@chrysalis/webir` exposes `computeOracleFootprint`
for this; `chrysalis status` (with `--project`) prints a condensed roll-up
(hydration index, read/write table hints, route counts, optional session/http/mail/cache/fs
flags) and writes `reports/oracle-footprint.json` under the project root
(schema `oracle-footprint/1.0.0`, full per-route rows). `status --json` includes
the same `routes[]` as the file. This is pure IR analysis — no PHP runtime, no
new third-party packages — and complements principle 1 (behavioral replay) by
making the **cost of honest verify** visible in CI.

### 5.3 Chimera runtime — dual-stack coexistence

The production mode of Chrysalis. A small, framework-provided runtime that lets
PHP and the new stack run behind one router, sharing state.

Components:

- **Traffic router** — per-route, per-cohort, per-percentage, per-user-hash
routing. Modes: `legacy`, `shadow` (both run, legacy wins), `canary`
(percentage on new stack), `cutover` (new wins, legacy fallback), `done`.
- **Session bridge** — one session store behind both stacks. Default
implementation: Redis with a PHP session handler + TS session middleware that
speak the same serialization. Cookies unchanged.
- **Schema lens** — typed views over the existing DB shared by both sides.
Migration of *data layout* is decoupled from migration of *code*.
- **Shadow-diff recorder** — in shadow mode, both stacks run per request; the
diff is logged against the same report format used by `verify`. Your
production traffic becomes a continuous conformance test.

---

## 6. Signature primitives the framework exposes to users

### 6.1 Effect-typed handlers

```ts
export const checkout: Handler<
  In<CheckoutBody>,
  Out<Redirect>,
  Effects<DB.Read<'carts'> | DB.Write<'orders'> | Mail.Send | Session.Touch>
> = async (ctx) => { ... }
```

The compiler enforces effect annotations. Adding a DB write to a read-only
handler is a type error. Effects can be *narrowed* by middleware and *widened*
only at module boundaries with explicit acknowledgement.

### 6.2 Holes

```ts
export async function legacyInvoicePdf(id: OrderId): Promise<Buffer> {
  return chrysalis.hole('legacy:invoice_pdf', { id })
}
```

Every hole is:

- Typed on both sides
- Registered in `chrysalis.holes.json` with status, owner, last-verified date
- Invocable via the chimera runtime (which forwards to legacy PHP)
- A first-class item in the CLI's migration dashboard

### 6.3 Schema archaeology output

Generated types carry provenance:

```ts
/**
 * @chrysalis-provenance
 *  id:     orders.id (db: not null, uuid)
 *  total:  orders.total (db: decimal(10,2)) ∧ checkout.php form validator (money)
 *  items:  join orders_items + observed JSON shape over 1,247 traces
 *  status: db CHECK constraint ∧ 1,247 observed values in {'pending','paid','shipped'}
 */
export type Order = { ... }
```

### 6.4 Deterministic request pipeline

The runtime exposes:

- `ctx.time.now()` — injectable, deterministic in replay
- `ctx.random.uuid()` / `ctx.random.int()` — same
- `ctx.db` — typed, auditable, replay-aware
- `ctx.http.fetch()` — recorded, replayable
- `ctx.session` — shared with legacy via the bridge

User code that bypasses these (e.g. `new Date()`) is flagged by a lint rule as
non-deterministic and will fail replay.

### 6.5 Intent-preserving rewrites

Passes that produce idiomatic output, not literal translation:

- `foreach` accumulator → `.map` / `.reduce` / loop / generator (based on
consumer shape inferred from WebIR's data dialect)
- `$_POST['x']` + inline regex → Zod/Valibot schema at the route boundary
- Detected N+1 query patterns (found via oracle trace analysis) → batched
DataLoader-style coalescing
- Scattered HTML echoes → JSX or a chosen template engine based on target

Each rewrite records its rule name in the node's provenance.

### 6.6 Request-level FFI

Interop unit is the **request**, not the function. Either a request runs on
legacy PHP or on the new stack. The session bridge and schema lens handle
shared state. This is the only FFI design that avoids the stateful-globals
nightmare of function-level PHP↔JS bridges.

---

## 7. Repository layout

Documentation and paths below assume the checkout directory is named **`chrysalis/`**
(matching the public repository name). Your local folder name may differ; the
committed **`chrysalis.project.json`** at this root is the same marker **`chrysalis init`**
writes for a Chrysalis-managed tree (**D290**), so **`chrysalis init`** from the
monorepo root is a no-op when the file already matches schema **1.0.0**.
**`branding/agenticop/`** holds optional **AgenticOp** (**`https://agenticop.io`**) logos for the services lane (**D292**); **`docs/AGENTICOP.md`** explains positioning.

```
chrysalis/                      # monorepo root (framework + packages + fixtures)
├── DESIGN.md                   # this document — the north star
├── ROADMAP.md                  # staged milestones, acceptance criteria
├── AGENTS.md                   # instructions to keep future agents on track
├── README.md                   # elevator pitch, quick start
├── package.json                # pnpm root
├── chrysalis.project.json      # workspace marker (same schema as customer PHP roots; D291)
├── branding/                   # outbound marks (AgenticOp SVGs; not Apache-2.0-licensed as marks)
│   └── agenticop/
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .gitignore
├── packages/
│   ├── cli/                    # `chrysalis` command
│   ├── webir/                  # IR types, dialects, visitors, provenance
│   ├── parser-bridge/          # spawn PHP + nikic/php-parser, emit AST JSON
│   ├── ingest/                 # PHP AST → WebIR (with holes)
│   ├── oracle/                 # sidecar proxy: record + persist trace corpus
│   ├── archaeology/            # schema recovery from DB + forms + traces
│   ├── verify/                 # replay engine, divergence attribution, reports
│   ├── emit-hono/              # WebIR → Hono + Drizzle project (default target)
│   ├── runtime-chimera/        # dual-stack router, session bridge, schema lens
│   └── compat/                 # `@chrysalis/compat` — PHP stdlib shim for TS
└── fixtures/
    └── tiny-blog/              # Milestone 1 target app (5 endpoints)
```

Rules for packages:

- Each package is independently versioned and typechecked.
- No circular dependencies. `webir` has zero runtime deps.
- Backends (`emit-*`) depend on `webir`; nothing depends on backends except
`cli`.
- `compat` is the only package published to end users' runtime.

---

## 8. Default target stack (provisional)

**Hono + Drizzle** is the first `emit-*` backend.

Rationale:

- Modern, edge-compatible, small surface area, TypeScript-native.
- Drizzle gives typed SQL without an opinionated ORM.
- Fast to demo end-to-end; shortest path to a credible Milestone 1.

This is not exclusive. The architecture requires that `emit-next`,
`emit-fastify`, and non-TS backends remain feasible. If a design choice makes
other backends harder, push back.

---

## 9. Milestone 1 — vertical slice (2–3 weeks)

Proves the thesis end-to-end on one small app.

**Target fixture:** `fixtures/tiny-blog/` — 5 PHP endpoints:

1. `GET /posts` — list
2. `GET /posts/:id` — view
3. `POST /login` — session create
4. `POST /posts` — create (auth required)
5. `POST /posts/:id/comments` — create comment

**Must demonstrate:**

- Oracle records HTTP + SQL + session traces of the PHP app in use
- `parser-bridge` produces PHP AST JSON
- `ingest` produces WebIR with at least `web.request`, `effect`, `data` dialects
- `archaeology` produces a unified `Post`, `User`, `Comment` type with provenance
- `emit-hono` produces a compiling, runnable Hono + Drizzle project
- `verify` replays every captured trace and produces a per-endpoint correctness score
- `runtime-chimera` has a working traffic router with `legacy`, `shadow`, `cutover` modes
- CLI prints a migration dashboard showing translation %, hole count, correctness score
- At least one deliberately-left hole compiles and delegates to legacy PHP

**Out of scope for Milestone 1:**

- LLM-driven repair passes (design stub only)
- Intent-preserving rewrites beyond a handful of obvious ones
- Exhaustive alternate emit targets beyond the portability proofs in-tree (see `ROADMAP.md`; Fastify landed in Milestone 2)
- Anything WordPress, Laravel, Symfony, or ORM-related at flagship scale without a controlled pilot

---

## 10. Anti-goals (things we explicitly will not do)

- We do not support full PHP semantics on day one. Missing constructs become holes.
- We do not attempt to run unmodified PHP inside TypeScript. That is a different project.
- We do not migrate the database schema. Chrysalis operates *through* the
existing schema via the schema lens. Data migration is a separate concern.
- We do not produce "transpiled-looking" TS. Output that screams "this was
converted from PHP" is a failure. Intent preservation > syntactic preservation.
- We do not ship features without oracle verification support. If you can't
verify it on a trace, you can't claim to have translated it.
- We do not take on WordPress as a Milestone 1 or 2 concern. WordPress is a
tarpit; it gets its own design spike once the core is solid.

---

## 11. Success metrics

A conversion is judged by four numbers, always reported together:

1. **Coverage** — % of PHP source nodes mapped to non-hole IR
2. **Correctness** — % of oracle traces replayed without divergence
3. **Idiomaticity** — % of nodes processed by at least one intent-preserving rewrite
4. **Residual legacy** — % of production requests still served by the legacy
  stack (measured from the chimera router)

The project's claim of groundbreaking-ness is only credible if, on real apps,
all four trend monotonically in the right direction over a migration.

---

## 12. Glossary

- **WebIR** — the multi-dialect intermediate representation at the heart of Chrysalis.
- **Dialect** — a named, typed operation set within WebIR.
- **Hole** — a first-class IR node with a typed contract and a callback into the legacy runtime; used wherever translation is incomplete.
- **Oracle** — the sidecar recorder and the replay engine together; source of behavioral truth.
- **TraceFrame / TraceCorpus** — a single recorded interaction / the persisted collection of them.
- **Chimera** — the dual-stack runtime that lets PHP and the new stack coexist.
- **Schema lens** — a typed, shared view of the legacy database used by both stacks.
- **Provenance** — metadata on every generated artifact describing why it exists.
- **Repair pass** — a (later) LLM-driven IR rewriter scoped to nodes that failed verification.
- **Intent-preserving rewrite** — a pass that replaces a literal translation with an idiomatic one based on WebIR-wide usage analysis.

---

## 13. Decision log

Append-only. When a decision here is overturned, add a new entry; never delete.

- **2026-04-21 — D1** Default first backend is Hono + Drizzle. Other backends
remain first-class citizens of the architecture.
- **2026-04-21 — D2** WebIR is authored in TypeScript with zero runtime
dependencies. Interop with PHP parsing happens via a subprocess bridge to
`nikic/php-parser`, not a native JS PHP parser.
- **2026-04-21 — D3** Holes are first-class IR nodes and runtime citizens. A
hole must compile, run, and be invocable against the legacy stack.
- **2026-04-21 — D4** The request is the FFI unit between legacy and new
stacks. Function-level FFI is explicitly rejected.
- **2026-04-21 — D5** `parser-bridge` is provider-pluggable. `nikic/php-parser`
via a PHP subprocess is the **canonical** provider for production use; a
pure-JS provider (`php-parser` by glayzzle) is permitted as a **dev/fallback**
so that contributors on systems without PHP installed can still run the
pipeline. The public `parser-bridge` API is provider-agnostic. Golden
fixtures are authored against the nikic output; the glayzzle provider is
tested for shape-compatibility with those fixtures, not as a separate spec.
This softens D2 but preserves its intent: no native JS parser is *bundled*
as a hidden default; users explicitly choose a provider, and nikic is the
documented recommendation.
- **2026-04-22 — D6** The Oracle **records** via a userland PHP prelude
(`packages/oracle-php/`) loaded by `auto_prepend_file`, not via an Apache/Nginx
proxy and not via a native Zend extension. Rationale: the prelude gives us
file-and-line **provenance** on every captured effect (which the wire layer
cannot), requires zero compilation (which the extension cannot), and installs
with a single `.ini` line on any PHP 7.4+. A native extension remains on the
roadmap as a drop-in performance upgrade for high-volume production observation
(Milestone 4+); both implementations target the same NDJSON trace schema, so
`verify`/`ingest` consume them interchangeably. Cross-language interception
(MySQL wire proxy, eBPF) is explicitly **rejected** for Milestone 1 because it
cannot attribute SQL to the source line that issued it, and that attribution
is load-bearing for every downstream stage.
- **2026-04-22 — D7** Redaction is applied **at capture time**, in the PHP
prelude, before any event is written to disk. There is no unredacted trace
file. The redaction config is hashed into the trace header so traces captured
under different policies cannot be silently compared. Rationale: the moment
we point Chrysalis at a real application, the `traces/` directory contains
passwords, session tokens, and PII. If redaction is a post-processing step,
there is always a window where the raw artifact exists on disk — and in
practice, that window is forever. Capture-time redaction eliminates the
liability at the cost of some discarded information that can be re-captured
by adjusting config.
- **2026-04-22 — D8** Milestone 1 `verify` replays the corpus against the
emitted app **over HTTP**, against a **freshly-seeded database**, with
ordered single-user cookie chaining. This is the simplest honest measurement
we can make today: it is backend-agnostic (not tied to Hono, not tied to any
runtime), it measures the integration surface clients actually see, and it
catches the real bugs we have. What it does *not* do — and what Milestone 2
will — is inject *recorded* SQL results into the emitted handler via a DB
interceptor. Today, the replayed handler hits its own SQLite with the same
seed PHP started from, and timestamps/auto-ids are normalized in the diff.
The trade-off: correct replay depends on DB determinism, which is fine for
tiny-blog but will degrade on apps that depend on wall-clock timestamps,
`rand()`, or external calls we haven't shimmed. Fixing that is a
SQL-replay-in-front-of-the-DB problem, not a verify problem, so it gets
solved in the oracle layer once.
- **2026-04-22 — D10** Archaeology's Milestone 1 input set is **DDL +
observed SQL row shapes**, not template form scans. Rationale: on
tiny-blog, DDL covers every real column, and traces confirm which ones are
actually read. Form scans would duplicate that evidence at higher cost
(requires a real PHP template parser and a model of how `$_POST` flows
into fields). We surface orphan observed shapes (observed-only columns
not in DDL) and unknown DDL fragments explicitly in the report rather
than papering over them. Form scans are deferred to Milestone 2 where
they matter more: applications with dynamic form fields driven by config,
where DDL alone will undercount.
- **2026-04-22 — D9** Verify's response diff uses **Jaccard token similarity
over normalized bodies** rather than exact equality. Normalization rules are
an allowlist (ISO/SQLite timestamps, session-cookie values, UUIDs,
whitespace); anything not in the allowlist is compared strictly. The diff
report records which normalization tags fired on each trace, so a rule that
is silently suppressing real divergence shows up as "why did this test pass
*because* I normalized X?" rather than being invisible. Rejected: structural
HTML tree diff (too brittle on whitespace and attribute ordering); exact
string equality (fails on every timestamp-rendering page and gives us zero
signal). Token Jaccard with allowlisted normalization is the cheapest thing
that catches real bugs without drowning us in false positives. Refinements
(2026-04-22, same-day) applied once the CI numbers landed: (a) redirects
(3xx) skip content-type comparison entirely — their contract is
`status + Location`, not the body's mime; (b) non-2xx responses skip
content-type too, since framework defaults for generic error pages differ
(PHP tends to text/html, Node servers text/plain) and are not a
correctness signal; (c) 4xx/5xx responses use a looser body-similarity
threshold (0.4) than 2xx (0.9), because error bodies are conventionally
free-form and a real format divergence (JSON↔HTML) still tokenizes
clearly. 2xx comparison stays strict — the meaningful contract lives
there.
- **2026-04-22 — D11** The Chimera proxy uses the **same diff primitive** as
`verify` in shadow mode, and treats shadow mode as "verify-in-production"
rather than a second implementation of response comparison. Concretely,
`packages/runtime-chimera` depends on `@chrysalis/verify` and calls
`diffResponse` on every mirrored pair. Rationale: the alternative — a
separate diff implementation in the proxy — would inevitably drift from
verify's semantics, and shadow-mode decisions ("is this route safe to cut
over?") must be interchangeable with verify-mode decisions on replay data.
Two codepaths means two thresholds, two bug surfaces, and two definitions of
"divergence." Shadow is explicitly fire-and-observe: the mirror to the modern
stack runs after the legacy response has already been returned to the
client, so a slow or broken modern stack can never degrade user-visible
latency or error rate — the worst it can do is miss divergences, which is
recoverable.
- **2026-04-22 — D12** `chrysalis status` is the migration dashboard's
**single surface**. It composes file artifacts written by earlier stages
(`traces/`, `reports/verify/summary.json` or per-backend dirs under `reports/verify/`,
`reports/shadow/shadow.ndjson`,
the fixture's `schema.sql`, the PHP project for residual-legacy counting)
rather than querying a live service. Rationale: stages run at different
cadences (observe is interactive, verify is CI-driven, chimera is
long-running production), and trying to aggregate them through a live API
would force every stage to depend on the dashboard. Reading files on demand
makes `status` a pure projection — it can run offline, in CI, or as a
pre-commit hook — and keeps the individual stages decoupled.
- **2026-04-22 — D13** We ship a **dedicated recognition stage**
(`@chrysalis/insight`) that walks the WebIR and catalogs legacy
anti-patterns as `Opportunity` records, pure over the IR. The three
launch recognizers — N+1 queries, scattered input validation, and
string-based dispatch — were chosen for high signal-to-noise on real PHP
code and because each has a textbook idiomatic replacement on the Node
side (batched loaders, zod schemas, discriminated unions). Rationale
(why a separate package, not a pass inside `emit-hono`): recognition is a
structural query, not a lowering step; it must be re-runnable
deterministically across rebuilds, survive emitter swaps (a future
`emit-fastify` inherits the same catalog), and feed both the CLI
(`chrysalis insight`) and the dashboard (`chrysalis status`). Conflating
it with emission would couple the modernization roadmap to the backend
choice, which is the exact inversion of what Chrysalis is about.
Confidence scoring is *two-tier*: pure IR recognizers cap at 0.8, and the
runner boosts toward 1.0 only when the trace corpus confirms the pattern
(e.g. the inner N+1 query was actually observed firing N times per
request). That keeps the catalog honest — we only promote `strong` when
the runtime agreed with us — and paves the way for the Milestone 2
rewriter, which will accept only corpus-confirmed opportunities for
automatic trace-verified rewrites. Rejected alternative: having each
recognizer own both detection and rewrite logic. Rewrite is a separate
concern with different failure semantics (a bad detection is noise; a
bad rewrite is a regression) and belongs in its own package once the
catalog stabilizes.
- **2026-04-22 — D14** We add an **intra-handler taint primitive**
(`@chrysalis/insight/taint`) as the substrate for data-flow-driven
recognizers. The primitive is a binary lattice (`clean | tainted`) with
a small, explicit set of sources (`data.request.field`,
`effect.session.read`, `effect.db.query` return values) and sanitizers
(`htmlspecialchars`, `intval`, `json_encode`, numeric coercions,
boolean-yielding operators). Propagation is post-order and single-pass
— sound over SSA-ish WebIR — and resolves `data.param` reads through
the per-handler bindings map built by `collectBindings`. Rationale for
a new primitive rather than per-recognizer ad-hoc flow: multiple
security-oriented recognizers (`unescaped-output` for XSS,
`raw-sql-concat` for SQLi, and upcoming open-redirect / SSRF
recognizers) all ask the same question — "does a source reach this
sink, unsanitized, within this handler?" — so the flow logic belongs
in one vetted place. Sanitizer list is intentionally small and
additive; a future iteration can promote it to a config file so users
can register their application's own escapers. The primitive is
deliberately conservative (false positives preferred over false
negatives) and bounded in scope to a single handler — cross-handler
flows are a distinct tier gated by the corpus, not a static-only
pass. Rejected alternatives: (a) a full SMT-style dataflow engine
(e.g. a lightweight CodeQL), which would overshoot the precision
needed by `insight` and couple us to a larger runtime; (b) inlining
the flow into each recognizer, which duplicates sanitizer/source
tables and makes cross-recognizer consistency impossible to audit.
Security-recognizer outputs are corpus-boostable exactly like
structural ones: for `unescaped-output` we flip severity to STRONG
when a captured response body literally contains the observed
request-field value, which is the textbook smoking-gun confirmation
that the unsanitized path survives in production.
- **2026-04-22 — D15** We ship a **confidence-gated IR rewrite engine**
(`@chrysalis/rewrite`) that consumes `@chrysalis/insight` opportunities
and produces a patched `Module`. Detection and rewrite are separate
packages (see D13): detection is a pure structural query over the IR
that is safe to run every build, rewriting is an effectful
transformation that must be gated by an explicit confidence threshold
(default 0.75) so noisy recognizers cannot flip working code. The
engine is built around two atomic edit primitives — `add` (introduce
a new node) and `replaceOperand` (rewire an existing node's operand
pointer) — which together cover the vast majority of useful lifts; a
pass that wants to "replace a whole subtree" does so by adding a new
root and rewiring the consumer. Edits are collected across all
opportunities and applied in a single batch, so the IR is always
consistent at the boundary of `applyRewrites`.
The first shipped pass, `sanitize-output`, fixes the `unescaped-output`
recognizer's XSS findings by wrapping the tainted *leaves* of a
concat-like echo value in `htmlspecialchars`. It deliberately walks
the string-building tree (both explicit `data.concat` and left-folded
`.`-binops) and consults the insight taint primitive so that literal
HTML surrounding the taint (e.g. `<h1>`, `</h1>`) is preserved
verbatim — the difference between a functional sanitizer and an
over-escaper that entity-encodes the entire page. For
`data.html.template` sinks it flips the offending expression's
`escape: false` to `true` and wraps its operand, letting the emitter
inherit the safe-by-default template semantics.
Why target `htmlspecialchars` rather than the emit-target-specific
helper: the emitter already recognizes `htmlspecialchars(x)` and
lowers it to the appropriate helper (`escapeHtml` under the
Hono runtime). Keeping the rewrite IR-native means future emitters
(`emit-fastify`, `emit-bun`) inherit every rewrite in the catalog
without changes to the rewrite engine. Rejected alternatives: (a)
rewriting the PHP source directly, which couples us to PHP's parser
idiosyncrasies and breaks the "IR is the portable substrate"
invariant; (b) baking the sanitizer call into the emitter as a
special case, which would force every target backend to duplicate
that logic and would erase the audit trail of a rewrite as a first-
class operation with provenance (`source: "intent-rewrite"` on the
emitted nodes).
Confidence threshold semantics: below threshold the opportunity is
**skipped with a recorded reason**, not silently dropped. The CI
rewrite-gate runs with the default threshold and asserts that
tiny-n1's `unescaped-output` STRONG finding is applied and survives
all the way through to the emitted TypeScript containing
`escapeHtml(...)` — this guards the full IR → emit pipeline against
regressions where a rewrite applied to the IR is lost in translation.
- **2026-04-22 — D16** Layer a **per-pass structural-invariant verifier**
(`@chrysalis/rewrite/invariants`) between the rewrite engine and the
emit stage. HTTP-level replay (`@chrysalis/verify`) is the gold-
standard behavioral oracle, but it requires spinning up a running
server and a full recorded corpus — too heavy to run per-opportunity
inside `applyRewrites`. Instead each `RewritePass` now declares an
`InvariantSpec` listing which `dialect.op` shapes it is allowed to
mutate; `applyRewrites` runs the pass on a scratch module, compares
the result to the pre-rewrite module, and **rolls the edit back** if
any node outside the allowlist changed structurally or an effect
count shifted. The opportunity is reported in the `skipped` list with
a `verify-invariant-failed` reason and the precise violations.
The invariant model is intentionally coarse — it cannot prove full
behavioral equivalence (that would need a WebIR interpreter) — but
it cheaply rules out the failure classes we care about most in an
autonomous rewrite pipeline: a "sanitize" pass accidentally deleting
a DB write; a pass introducing an un-provenance-tagged node (breaks
the audit trail); a pass mutating an effect it didn't claim to
touch. `mayModify` supports both plain `dialect.op` strings and a
refined `{ dialectOp, attrMatch }` form so a pass can declare "I
only touch `data.binop` *with* `operator: '.'`", preserving
protection for arithmetic binops that share the same op name.
The per-opportunity apply-verify-commit loop also fixes a subtler
bug in the original batch model: later passes now see the output of
earlier passes on the same module, so multi-pass rewrites compose
correctly. Rejected alternatives: (a) defer all verification to
post-emit HTTP replay — too slow to block a rewrite and leaves a
window where the IR is known-broken on disk; (b) require passes to
self-check via bespoke test suites — fine for library code but the
invariant system is declarative, so every new pass gets
"I didn't silently mutate an effect I don't own" protection for free
without any extra test authoring.
- **2026-04-22 — D17** Ship the `parameterize-sql` rewrite pass as the
second member of the `@chrysalis/rewrite` pass catalog. Paired with
the `raw-sql-concat` recognizer + the taint primitive, this closes
the SQLi half of the OWASP top-two — XSS was closed by
`sanitize-output` under D15.
The structural problem: PHP's `query_all("SELECT ... " . $x)` pattern
loses the concat tree at ingest time. The original ingester just
flagged the SQL attr as `"<dynamic>"` and moved on, which was enough
for detection but not for rewrite (no way to recover the attacker-
controlled leaves). Fix: ingest now preserves the full expression
tree as a non-operand `sqlExpr` attr on the `effect.db.query` node,
and the walkers in `@chrysalis/insight/walk.ts` treat it as a
**virtual operand** so taint analysis reaches request fields that
only appear inside the dynamic SQL tree. The `operands` array stays
the bound-params contract — emit, invariants, and the recognizer's
`anyParamTainted` check all continue to work unchanged.
The pass walks the `sqlExpr` tree, classifying each leaf:
  - a `data.literal` of kind `string` → inlined into the rebuilt
  literal SQL string verbatim
  - everything else → emitted as a `?` placeholder, and the node
  itself is appended to `operands` (bound params)
  After rewrite the db.query has a literal `sql` attr, no `sqlExpr`,
  and a params array containing the lifted leaves. The emitted TS
  becomes `queryAll("SELECT ... WHERE id = ?", [id])` — structurally
  SQLi-proof because the SQL text contains only developer-written
  characters plus `?` placeholders.
  Invariants: the pass declares `mayModify: ["effect.db.query"]` —
  it's the narrowest possible claim and keeps the structural
  invariant verifier catching any cross-pass bug that would touch
  cookies, sessions, redirects, or response bodies.
  Rejected alternatives: (a) make `sqlExpr` a real operand (operand[0]
  = SQL tree, operands[1:] = params) — cleaner in theory but requires
  coordinated changes across the emitter, recognizer, and every
  consumer of db.query operands, and it breaks the "operands are
  bound params" mental model that's been stable since Milestone 1;
  (b) inline all leaves as params even when they're literal strings —
  structurally safe but emits `? ? ?` instead of the developer's own
  SQL keywords, making the rewritten code harder to review and
  diverging from the database's query-plan cache.
- **2026-04-22 — D18** Add a **post-rewrite analysis gate** that runs
after a batch of rewrites lands and asserts each applied
opportunity has actually been fixed (i.e. the recognizer that
produced it no longer fires on the same anchor in the rewritten
module). If any applied opportunity still fires, the driver rolls
back the entire batch and returns the original module with every
rewrite recorded in `skipped` for forensic inspection.
Why a separate layer from invariants (D16): invariants catch
**pass hygiene** ("the pass mutated a node it didn't claim to
mutate") while post-verify catches **pass effectiveness** ("the
pass claimed to fix finding X but the recognizer still reports
X"). The two are complementary — invariants run per-opportunity
(fast, granular rollback), post-verify runs once per batch (still
cheap, one more recognizer pass) and rolls back all-or-nothing.
All-or-nothing rollback is deliberate: partial rollback at this
level would leave a module with a mix of "verified" and
"unverified" rewrites, which is harder to reason about than either
extreme. The batch of rewrites that landed together got there in a
specific interleaving; rolling back only the bad one would produce
a state the driver never actually traversed, and any subsequent
re-apply would be starting from mystery data. By contrast, the
original module is a known-good ground truth.
Cost model: the gate runs each affected recognizer exactly once
over the rewritten module (not once per opportunity). Recognizers
are already designed to be cheap — they walk the handler subtree
once and emit opportunities — so the gate typically doubles the
recognize work but not the total rewrite work.
Scope: post-verify cannot detect behavioral divergence that no
recognizer notices (e.g. a rewrite that silently drops a session
write). That's the domain of full HTTP replay via
`@chrysalis/verify`, which is the intended D19 layer. Post-verify
is the cheap IR-level gate that runs even without a traces corpus.
The CLI enables post-verify by default (`chrysalis rewrite ...`
prints `post-verify: ok` or lists the residual findings and notes
the rollback). `--no-post-verify` exists for users who want to
inspect a broken / partial rewrite for debugging.
- **2026-04-23 — D19** Add an **in-process IR simulator** and a
**behavior-verify gate** that evaluates each route's handler under
both the pre- and post-rewrite module on synthesized probe inputs
and rolls back the batch if the post-rewrite response diverges
from the pass-transformed pre-rewrite response.
Why a simulator rather than HTTP replay: the typical behavioral
oracle for migration tools is "run the old app, run the new app,
compare traces." That requires two live deployments, a traces
corpus, a DB in a known state, and subprocess orchestration — none
of which is cheap or portable enough to put in the default rewrite
pipeline. A pure-IR simulator gives us a behavioral signal with
none of that plumbing, at the cost of only covering the ops the
simulator understands.
The simulator (`packages/rewrite/src/simulate.ts`) implements
exactly the subset of WebIR ops that `@chrysalis/ingest`
currently produces: `data.literal`, `data.request.field`,
`data.binop` (including lazy `??`), `data.unaryop` (including
`isset`/`empty`), `data.member`, `data.call` (with specialized
handlers for `__assign`, `htmlspecialchars`, `intval`, `trim`,
`strlen`, `password_verify`, `current_user`, `session_start`,
and an `echo` fallback), `data.concat`, `data.html.template`,
`data.block`, `data.if`/`data.ifElse`, `data.foreach`,
`data.hole`, plus the `effect.echo`, `effect.db.query`,
`effect.redirect`, `effect.http.error`, `effect.session.read`,
`effect.session.write`, `effect.time.now`, `effect.random`
effects. Unrecognized ops return a `SimError`; the gate treats
runs with non-empty `errors` as **abstain**, not as divergence.
The probe generator synthesizes one "benign" probe (alphanumeric
field values) and one "attack" probe (containing classic XSS
triggers `<script>`, `"`, `&`, `'`) per route, reading
per-handler request-field metadata out of the IR so each probe
targets exactly the inputs the handler actually consumes.
Probes with no user-controlled input get only the benign case.
The DB stub is **param-insensitive** by design: it returns a
fixed row set keyed by `(table, kind, returns)` and ignores
`params`. If it varied on `params`, pre-rewrite (dynamic SQL
passed through a single concat argument, zero bound params)
and post-rewrite (parameterized SQL, params lifted to operands)
would always look divergent under `parameterize-sql`, defeating
the point. The consequence: behavior-verify cannot detect
SQL-level semantic regressions through this stub. Real DB
semantics belong in a future HTTP-replay layer; this gate's
contract is "IR changes outside of declared pass transforms
don't change behavior on probe inputs."
Pass-aware response transforms: the gate predicts what the
post-rewrite response *should* look like by transforming the
pre-rewrite response according to the set of applied passes:
  - `sanitize-output` — every occurrence of a probe's tainted
  input value in the pre-body should appear HTML-escaped in
  the post-body. Replaces longest tainted strings first so
  nested occurrences don't double-escape.
  - `parameterize-sql` — no predicted change. The stub's
  param-insensitivity makes the `db.query` results identical
  across pre and post; the SQL text diff (`"SELECT … " . $id`
  → `"SELECT … ?"`) is deliberately not compared.
  - All other observables (status, redirect target, session
  writes, db-write side effects, db-read tables) are expected
  to match byte-for-byte.
  Rollback is all-or-nothing for the same reason D18's is:
  partial rollback leaves a module in a state that was never
  traversed by the driver, which is strictly harder to reason
  about than the original module or the full batch.
  Positioned between D16 (pass hygiene) and an eventual
  HTTP-replay gate (D20+ — real DB, real emitted TS, real
  traces), D19 is the cheapest gate that can catch **behavioral
  regressions a recognizer would never notice**, e.g. a pass
  that silently drops an echo, swaps a redirect target, or
  adds an extraneous session write. The behavior-verify test
  suite exercises exactly that class of "evil pass."
  The gate is opt-in via `chrysalis rewrite --verify-behavior`
  rather than default, because on a module full of unsupported
  ops it would abstain on every probe and contribute nothing
  except noise to the default output. CI exercises it on
  `fixtures/tiny-n1` where the op coverage is high enough to run
  real checks.
  Rejected: making the simulator symbolic. A symbolic evaluator
  would "abstain" less often (returning a structural symbol instead
  of a concrete error) but would force every response-transform
  predicate to become symbolic too. The concrete evaluator is
  simpler, debuggable, and good enough for probes at fixed inputs.
  If we outgrow it we can layer a symbolic evaluator on top without
  reshaping the gate's contract.
  Rejected: running the simulator only on the post-rewrite module
  and hand-checking invariants. That approach can't tell you what
  *changed* — only that the post-rewrite response is "plausible."
  Comparing against a simulated pre-rewrite response gives us
  *directional* signal ("this change was not predicted by any
  applied pass") which is what actually catches regressions.
- **2026-04-23 — D20** Wire `**@chrysalis/verify` HTTP replay** into the
rewrite driver as an **optional async gate** after D16–D19.
`**ReplayOptions.fetch`** — `replayCorpus` accepts an injected
`fetch` (defaults to `globalThis.fetch`). Callers pass
`app.fetch.bind(app)` from a Hono app to replay against an
in-process handler with no TCP listen. This is the missing
primitive for "replay without a subprocess server."
`**applyRewritesAsync**` — `@chrysalis/rewrite` exposes an async
entry point that runs the same synchronous pipeline as
`applyRewrites`, then (if `httpReplay` is set and at least one
rewrite applied and the module was not already rolled back)
invokes `replayCorpus` on the supplied corpus. Any frame with
`diff.divergences.length > 0` triggers **all-or-nothing**
rollback, same contract as D18/D19. The report gains
`httpReplayVerify` with `outcomes` and `failedRoutes`.
`**emit-hono` split** — generated apps now emit `**src/server.ts**`
(defines `export const app` and `registerRoutes`) and a thin
`**src/index.ts**` that only calls `serve({ fetch: app.fetch })`.
Downstream tools import `./server.js` to obtain `app` without
starting a listener.
**Corpus vs security passes** — Traces captured from PHP encode
*pre-fix* response bodies. After `sanitize-output`, emitted HTML
differs by design (escaped user input). HTTP replay against a
PHP oracle therefore only matches **byte-for-byte** when the
batch does not change observable HTML, or when the corpus was
re-recorded from the migrated app, or when diff rules are
extended (future). D19 remains the gate for "escape transform
predicted correctly"; D20 is for **runtime truth** against a
handler that should match the oracle (e.g. `parameterize-sql`
only, or a post-migration golden corpus).
**CLI** — `chrysalis rewrite --http-replay <traces-dir>` requires
`--out`. It runs `applyRewritesAsync` with `resolveFetch` that
emits the rewritten module, runs `npm install` in the output dir
(skip with `--http-replay-skip-install` if deps are already
present), and loads `src/server.ts` through `tsx` for
`replayCorpus`. On replay failure the batch rolls back and the CLI
re-emits the **pre-rewrite** module so `--out` stays consistent
with the returned IR.
- **2026-04-23 — preg_match lowering** — `preg_match` is lowered to
`data.call` / `preg_match` (boolean) instead of a hole when the
PHP prelude resolves the call. The emit-hono runtime exposes
`pregMatch(pattern, subject)` implementing **slash-delimited**
patterns only (closing delimiter = last `/` in the string, flags
after it). The D19 simulator uses the same rule so behavior-verify
stays aligned with emitted TS.   Non-slash PHP regex delimiters
remain best-effort via `new RegExp(pattern)` in the runtime only
when the pattern does not start with `/`.
**Cast / ternary pseudo-calls** — Ingest lowers PHP casts to
`data.call` with callee `__cast_int`, `__cast_float`, `__cast_string`,
`__cast_bool`, and ternary to `__ternary`; `__array_literal` wraps
variadic operands into a simulated array. The D19 simulator
implements these with the same semantics as emit-hono's
`emitKnownCall` so N+1-style handlers (e.g. tiny-n1 dashboard)
evaluate without abstention.
- **2026-04-23 — D21** **String-dispatch `switch` emission** — `@chrysalis/emit-hono`
emits an idiomatic TypeScript `switch` when a `data.if` head matches the
same structural predicate as the `string-dispatch` insight recognizer.
`**matchStringDispatchChain**` — Exported from `@chrysalis/insight`
(implementation in `recognizers/string-dispatch.ts`). It returns the
branch literals, `then` body node ids, optional terminal `else` body, and
the `request.field` node id used as the discriminant. The recognizer
delegates to this helper so detection and emission cannot drift.
**Emit shape** — One temp holds the raw field expression; the `switch`
discriminant is `v == null ? "" : String(v)` so behavior stays close to
PHP loose comparisons without mapping `null` to the string `"null"`.
Each case runs the emitted `then` body and `break`s; a terminal `else`
becomes `default`.
**Dependency direction** — `emit-hono` depends on `insight` for the
matcher only. `insight` does not depend on any emit package (no cycle).
**Non-goal in this decision** — A future IR rewrite still replaces the
pattern with a validated `z.enum` action union at the route boundary;
D21 is emission-only, not the full `action-union` lift from the
opportunity catalog.
Rejected: reimplementing the chain walk inside emit-hono. Duplicated
rules would diverge from the recognizer and violate principle 3
(provenance of *intent* — here, shared definition of "what counts as
string dispatch").
- **2026-04-23 — D22** **Archaeology row generics in emit** — When callers
supply a map from normalized SQL table name (lowercase, matching ingest
`guessTables`) to the TypeScript interface name from archaeology
(`EntityReport.typescriptName`), `@chrysalis/emit-hono` emits
`queryOne<T>` / `queryAll<T>` for `effect.db.query` nodes that tag
**exactly one** table. JOINs and other multi-table reads keep the default
generic (`Record<string, unknown>`) so we do not assert the wrong row
shape.
`**domainTypesByTable**` — Built by `domainTypesByTable(report)` in
`@chrysalis/archaeology`. `emit-hono` does not depend on archaeology;
the CLI and `scripts/run-e2e.mjs` run archaeology, write `src/domain.ts`,
and pass the map into `emit()`.
`**chrysalis emit --schema <file.sql>**` — Optional path: generates
`src/domain.ts`, then emits handlers with row generics where applicable.
Rejected: making `emit-hono` import `@chrysalis/archaeology`. That would
couple the default backend to schema recovery; the map is optional input
and keeps the package graph acyclic.
- **2026-04-23 — D23** **Recorded SELECT rows in verify replay** — The PHP
PDO wrapper buffers each SELECT after `execute()` / `query()` and records
`sql.query.rows` (JSON-safe objects, capped per query). `@chrysalis/verify`
can attach a base64url `x-chrysalis-sql-tape` header per trace when
`recordedSqlReplay` is on and every SELECT event has complete rows (no
`rowsTruncated`). Emitted Hono/Fastify apps run the SQL-tape hook and satisfy
`queryOne` / `queryAll` from the tape **in order**; `execSql` still uses
SQLite so INSERT/UPDATE behavior stays real. CLI: `chrysalis verify --no-recorded-sql` disables the header.
Rejected: replaying writes from tape — inserts/updates still execute against
the real DB so auto-increment and constraints stay honest.
- **2026-04-23 — D24** **File JSON session bridge (demo)** — When
`CHRYSALIS_SESSION_DIR` is set, emitted `session.ts` reads/writes
`{sid}.json` after each request. Cookie name follows
`CHRYSALIS_SESSION_COOKIE` (default `chrysalis_sid`). PHP can share state
by using the same directory and cookie plus JSON-compatible keys (see
`packages/oracle-php/README.md`). Production dual-stack should move to Redis
or another shared service; this is the SQLite-analog "acceptable for demo"
path from the roadmap.
Rejected: mutating PHP's `session.save_path` alone without documenting JSON
shape — Node and PHP must agree on payload encoding; documenting JSON is
the minimal contract.
- **2026-04-24 — D25** **Dual-backend oracle gate (tiny-blog)** — After
capturing a trace corpus from PHP, CI runs `scripts/verify-tiny-blog.mjs`,
which emits the **same** WebIR module to **both** `@chrysalis/emit-hono`
and `@chrysalis/emit-fastify`, seeds each SQLite file identically, and
replays the corpus **in-process** via each target's `fetch` (`app.fetch`
for Hono; `fetch` from `app.inject` for Fastify). Both must meet the same
correctness threshold; reports land under `reports/verify/hono` and
`reports/verify/fastify`. Rationale: one oracle, one IR — if only Hono were
gated, Fastify could drift silently; gating both is the honest portability
proof for Milestone 2. TCP servers for verify are no longer required for
this fixture once injected `fetch` matches the replay contract (D20).
Rejected: comparing only aggregate scores across backends — we persist full
per-route reports per backend so a regression localizes to a target.
- **2026-04-24 — D26** **Rewrite HTTP-replay: multi-emitter gate** —
`applyRewritesAsync` accepts `httpReplay.resolveFetches`, an ordered list of
labeled `resolveFetch` callbacks. After a successful rewrite batch, the
**same** corpus is replayed against each resolved `fetch`; **any** divergence
rolls back the batch. The CLI exposes `--http-replay-backends=hono,fastify`
(comma-separated, de-duplicated): Hono emits to `--out`, Fastify to
`{out}-fastify` (or `--out` alone when Fastify is the only backend). This
extends D25’s “one IR, many emitters” proof from CI verify into the rewrite
pipeline so a pass cannot silently break portability.
Rejected: hard-coding Fastify’s sibling directory name inside `@chrysalis/rewrite`
— the package stays emitter-agnostic; only the CLI picks concrete paths.
- **2026-04-24 — D27** **Chimera canary + stickiness** — `runtime-chimera` adds
`mode: "canary"`: same rule table as cutover, but among requests whose rule
targets `modern`, only `canary.percentModern` (0–100) are forwarded to the
modern stack. Bucketing uses SHA-256(`salt`, stickiness key) mod 100. Key
derivation order: `stickinessCookie` value if present, else
`stickinessHeader`, else `socket.remoteAddress`, so a returning user stays on
the same stack without server-side session. Responses add
`x-chrysalis-canary: in | out | n/a` (`n/a` when the route is legacy-eligible
only). CLI: `--canary-percent`, optional `--canary-salt`, `--canary-cookie`,
`--canary-header`, or `chimera.json` `canary` block.
Rejected: random per-request sampling without a stickiness key — it would
break UX for multi-request flows. Rejected: reading `Date.now()` or
`Math.random()` for bucketing — hash-only inputs keep replay/debugging stable.
- **2026-04-24 — D28** **Archaeology: enums from captured SQL rows** — The
Oracle already records `sql.query.rows` on PHP captures. `@chrysalis/archaeology`
now harvests **string** cell values per column (bounded: max distinct count,
max literal length, no control characters; skip non-strings). Plain DDL
`TEXT` columns can become `"a" | "b"` unions when 2..N distinct values
survive the cap. DDL enums (`CHECK ... IN` / `ENUM`) are **validated**:
any trace literal not in the declared set becomes a `@chrysalis-conflict`
on the field (DDL stays authoritative for the type).
Rejected: unbounded union growth from high-cardinality columns — above the
cap we omit literals and keep `string`. Rejected: inferring numeric/boolean
unions from row JSON in this pass (string-only v1).
- **2026-04-24 — D29** `**chrysalis status` archaeology signals** — When
`--schema` runs `runArchaeology`, the dashboard now counts **fields with any
`conflicts**` and **fields whose provenance includes trace-promoted literal
unions** (prefix shared as `TRACE_LITERAL_UNION_PROVENANCE_PREFIX` in
`@chrysalis/archaeology`). Operators see merge quality at a glance without
opening `domain.ts`.
Rejected: parsing emitted TypeScript to infer unions — provenance on the
`SchemaReport` is the canonical source of truth.
- **2026-04-23 — D32** **Oracle: outbound HTTP + mail in trace schema** —
PHP observe mode registers userland stream wrappers for `http` and `https`
that delegate to the built-in wrappers and emit `http.outbound` after each
fetch closes (method, URL, status, response bytes, duration, PHP origin).
Mail cannot be monkey-patched from userland; `Chrysalis\Oracle\Mail::send`
records `mail.send` (to, subject, body byte length) before calling PHP
`mail()`. Node `trace-schema.ts`, default redaction (`outbound.url`,
`mail.to`, `mail.subject`), and `chrysalis corpus` summaries stay in lockstep
with the prelude.
Rejected: claiming full `mail()` coverage without an opt-in API — PHP offers
no supported global hook. Rejected: depending on `curl` extension only —
`file_get_contents('https://…')` must be observed for typical legacy code.
- **2026-04-23 — D30** **Cross-call handler effects via `lib/**` — Route files
often call shared PHP functions (`require_login`, `current_user`, …) that
are not inlined into the route AST. Ingest therefore parses all top-level
`FunctionDecl` bodies under `<project>/lib/**.php` into a throwaway WebIR
module, runs a fixpoint on `effectsReachableWithCallOverlay` so nested
library calls merge transitively, and passes the resulting map into route
handler effect inference so `data.call` sites union callee effects.
Rationale: keeps a single oracle-aligned IR for routes without requiring
whole-program PHP linking in v1; under-approximation when a callee is not
defined under `lib/`.
Rejected: hard-coding effect stubs only for known names — duplicating PHP
semantics in TypeScript would drift from `lib/*.php`. Rejected: merging
library nodes into the shipped route module — golden size and ID stability
stay route-scoped; only effect sets cross the boundary.
- **2026-04-23 — D31** **Route-file top-level functions in call-effect map** —
Legacy route scripts sometimes declare `function foo()` at file scope, then
call `foo()` from the procedural body. Ingest now indexes those bodies into
the same fixpoint map as `lib/` (names already taken by `lib/` keep the
library definition). Handler lowering skips top-level `FunctionDecl`
statements so they are not emitted as holes. Rationale: closes a common
real-world gap without whole-program analysis; matches PHP’s file-scope
function visibility for the typical “one entry script per route” layout.
Rejected: hoisting nested `function` inside handlers in v1 — needs real scope
/ closure modeling. Rejected: auto-parsing every `*.php` under the project
— only manifest route files plus `lib/` keep the contract explicit.
- **2026-04-23 — D33** **Verified repair loop (Milestone 3 v1)** — New package
`@chrysalis/repair` drives `RepairProposer` → `applyModuleEdits` → full
`replayCorpus` acceptance. CLI `chrysalis repair` wires the loop with a stub
proposer; callers must supply real proposals (LLM or otherwise). Exported
`applyModuleEdits` from `@chrysalis/rewrite` tags operand rewrites with
configurable provenance (`repair-pass` in the loop). Rejected: accepting patches
without full-corpus replay. Rejected: baking a specific LLM vendor into
`webir` / `verify`.
- **2026-04-23 — D34** **Verify-gated hole closure (Milestone 3)** —
`applyHoleClosure` in `@chrysalis/repair` adds a replacement subgraph,
rewires the unique parent `replaceOperand` away from `data.hole`, and
appends a `hand-authored` provenance entry on the replacement root recording
the human signer (and optional note). `applyHoleClosureAndVerify` runs full
`replayCorpus` before the closure is considered accepted. v1 rejects holes
referenced from more than one operand site. Rejected: deleting the old hole
`NodeId` from the map without a general `removeNode` edit — unreachable nodes
are benign and `countHoles` is root-walk scoped.
- **2026-04-23 — D35** **Milestone 4 dashboard roll-up** — `chrysalis status`
always includes a `migration` object: **coverage** from
`irCoverageStats(module)` when `--project` ingests WebIR; **correctness**
mirrors the verify-report aggregate; **idiomaticity** and **residual legacy
request %** read optional JSON sidecars under `reports/migration/` (or
`--migration-reports`) so CI and chimera can feed signals without new core
dependencies. Milestone 4’s flagship target is documented as Laravel-first in
`ROADMAP.md` / `flagship/README.md`.
Rejected: hard-coding Laravel paths in `status` — only generic sidecars and
IR coverage belong in core CLI.
- **2026-04-23 — D36** **Flagship skeleton (`flagship/laravel-min`)** — A
Laravel-**shaped** tree (e.g. `public/index.php`, `app/Http/Handlers/`) with
`chrysalis.routes.json` proves ingest + emit on a second app layout without
vendoring Composer Laravel in-repo. Real Breeze (or similar) stays a
documented follow-up; oracle + verify for the flagship mirror `tiny-blog` when
routes gain DB/session.
Rejected: committing `vendor/` or a full framework tree as the default M4
slice — blows CI time and review surface; the skeleton stays procedural PHP
until the pilot explicitly opts into framework bootstrap.
**Observe docroot:** Laravel-style apps use `public/` as the PHP server root;
`startObserver({ phpRoot })` must point at `public/`, while
`loadObserveConfig` and `ingestDirectory` use the project root (where
`chrysalis.observe.json` and `chrysalis.routes.json` live). See
`scripts/verify-flagship-laravel-min.mjs`.
- **2026-04-23 — D37** **Injectable clock/PRNG in emitted apps + verify wiring** —
Emitted Hono/Fastify stacks ship `src/ctx.ts` (`chrysalisNow`, `chrysalisRandom`,
optional request middleware reading `x-chrysalis-now-iso` and
`x-chrysalis-random-seed`). Ingest lowers PHP `time()`, `rand`/`mt_rand`/`random_int`,
`microtime(true)`, `uniqid` (literal entropy flag), `getrandmax`/`mt_getrandmax`,
and `parse_url` with a `PHP_URL_*` component to WebIR/effects or runtime helpers
(`parseUrlComponent`); remaining shapes stay holes. `@chrysalis/verify` replay
sends those headers by default from trace `startedAt` and a deterministic FNV-1a
seed of `traceId` (`injectDeterminismHeaders: false` to disable). Rationale:
honors principle 7 (determinism in the runtime) for generated handlers without
reading wall clock or `Math.random` in handler bodies when the IR marks the effects.
Rejected: silently translating nondeterministic PHP builtins to raw `Date`/`Math`
in handlers.   Rejected: expanding `uniqid`/`microtime` to full PHP bit-accuracy in
v1 — documented approximations and holes where needed.
- **2026-04-23 — D38** `**microtime()` string mode + `parse_url($url)` array-like
lowering** — `microtime()` / `microtime(false)` lower to `effect.time.now`
(`epoch_float`) wrapped by runtime `microtimeString` (injectable wall clock).
Single-argument `parse_url` lowers to `parseUrlParts` → `Record<string, string>`
with PHP-shaped keys (`scheme`, `host`, `port`, …); parse failures yield `{}`
(PHP returns `false` — callers that branch on false may need a follow-up).
Rationale: closes common front-controller patterns without `Date`/`Math` in
handlers for those paths.
Rejected: returning literal `false` from `parseUrlParts` in TS (breaks typed
record consumers); use empty object + optional chaining in emitted PHP style.
- **2026-04-23 — D39** **Oracle footprint (static WebIR)** — `computeOracleFootprint`
in `@chrysalis/webir` walks each `web.request.route` → handler body, unions
reachable effects (`effectsReachableFrom`), aggregates `db.read` tables as a
tape hint, flags time/RNG/session/http/mail, counts holes and reachable nodes
per route, and derives a **hydration index** (0–100) from a weighted score
normalized per route. `chrysalis status` surfaces a condensed summary after
ingest. Rationale: teams need a first-party signal for “how heavy is honest
replay for this module?” without running PHP or adding migration-tooling
dependencies; the IR already encodes the effect surface.
Rejected: inferring footprint from emitted TypeScript or from trace files only
— WebIR stays the single portable truth; traces refine replay but do not
replace static effect summaries for greenfield CI.
- **2026-04-23 — D40** **Oracle footprint artifact and full effect surface** —
Footprint aggregates `cache.read` / `cache.write` and `fs.read` / `fs.write`,
distinct `**db.write`** tables (`writeTablesHint`), and `**totalHoleCount**`
across routes. `chrysalis status --project` persists
`reports/oracle-footprint.json` (versioned `chrysalisSchema`) for CI and
diffing; machine consumers use that file or `status --json` (`routes[]`).
Rejected: treating write tables as replay tape rows in the same list as reads
— writes shape DB state; the hint names tables that need seeding or isolation,
not SELECT result replay.
- **2026-04-24 — D41** **CI gates: structured checks, WebIR stays truth** —
GitHub Actions use `scripts/ci-gates.mjs` for migration/oracle-footprint JSON
invariants, tiny-n1 insight catalog counts, rewrite pre-baseline XSS findings,
and post-rewrite emitted-handler checks. Emitted TypeScript is validated with the
TypeScript compiler API (e.g. `escapeHtml(...)` calls, no `+`-built SQL first
argument to `queryAll`/`queryOne`/`execSql`) instead of regex on source text.
Rationale: matches principle that **WebIR is the owned intermediate language**
(oracle footprint and coverage still come from IR + traces), while **edges**
use boring, explicit scripts; the **host toolchain remains TypeScript** (no new
GP language, no host rewrite).
Rejected: expanding CI with more string-matching on generated `.ts` without
structure — high false positive/negative rate and obscures real regressions.
CI JSON readers strip a UTF-8 BOM so artifacts stay valid across platforms.
- **2026-04-24 — D42** **N+1 batching helpers (emit + simulator)** — Emitted
apps include `queryAllWhereIn(selectList, table, idColumn, ids)` on `db.js`
(static SQL identifiers only; dynamic data is the id list). `runtime.js`
adds `chrysalisPluck` and `chrysalisRowByColumn`. WebIR may reference these
via internal `data.call` callees `__chrysalis_query_all_where_in`,
`__chrysalis_pluck`, and `__chrysalis_row_by_column` lowered by
`@chrysalis/emit-shared`; the IR simulator records the batch call as a
`db.read` for D19. Rationale: unblocks the `batch-n1-read` rewrite pass
without inventing a new emit backend; SQL tape shape will change when a batch
replaces per-row queries (regenerate corpora or extend replay matching).
Rejected: dynamic table/column strings from request input in `queryAllWhereIn`
— that reintroduces injection; only codegen literals are allowed.
- **2026-04-23 — D43** `**batch-n1-read` rewrite pass** — `@chrysalis/rewrite`
ships `batch-n1-read` (in `DEFAULT_PASSES` after `parameterize-sql`). It
splices batched-load `data.call` nodes (`__chrysalis_pluck`,
`__chrysalis_query_all_where_in`, `__chrysalis_row_by_column`) ahead of a
qualifying foreach and rewires the inner `__assign` (v1 scope: one inner
read, param iterable, `row-or-null`, non-`SELECT *`, FK from loop row).
**D19:** when this pass applies, expected `dbReads` for a probe are aligned
with the **post** simulation, not the generic pre→post predictor, so fewer
executed reads after batching do not roll the batch back. Invariants omit
`effect.db.query` from strict effect-count preservation because orphaned inner
query nodes may remain in the graph while executed reads shrink.
Rejected: silently rewriting N+1 patterns that violate v1 preconditions —
the pass throws or is skipped; unsupported shapes remain insight findings
until a broader pass or manual fix.
- **2026-04-23 — D44** `**boundary-zod` + foreach reduce + multi-inner N+1** —
`**boundary-zod`** rewrites `scattered-validation` opportunities on POST
fields: clone one `request.field`, `__chrysalis_zod_body_field` →
`parseZodBodyFieldRaw` in emit (dependency-free string normalization aligned
with the D19 simulator). `**foreach` reduce:** compound assignment in ingest;
emit prefers `Array.reduce` when init + foreach + accumulating assign match a
strict structural pattern. `**batch-n1-read`** batches multiple inner reads in
one application when each satisfies the existing SQL/FK/`__assign`
preconditions.
Rejected: adding a hard npm `zod` dependency to every emitted app — the helper
matches the simulator; projects may add `zod` at the app layer when they want
full schema objects.
- **2026-04-24 — D45** **Milestone 2 closure — archaeology form signal + dispatch
union + effect widening + batch `SELECT *`.** (1) **Archaeology:** optional
recursive scan of `.php` sources for inline `<input|select|textarea name=…>`
(heuristic SQL-in-file + INSERT/UPDATE tie-break for shared column names);
merged as `form` provenance on entity fields, with unattributed controls
surfaced in reports. This **does not** replace D10’s point that Milestone 1
archaeology was **DDL + trace shapes** only; there is still no full Twig/Blade
template parser — only text embedded in PHP. (2) `**dispatch-union-zod`:**
`string-dispatch` opportunities get a dependency-free enum-shaped boundary
(`parseZodEnumBodyFieldRaw`) plus `data.param` rewire; D19 simulator and emit
stay aligned. (3) **Effects:** `call_user_func*`, `call_user_func_array`,
`forward_static_call`, and `forward_static_call_array` union **all** callee
effects from the overlay map (sound over-approximation); nested `FunctionDecl`
bodies under `lib/`** and route files participate in `buildCallEffectMap`.
(4) `**batch-n1-read`:** inner `SELECT *` is batchable by projecting the FK /
`WHERE` column as the hoisted select list (D43’s “no `SELECT *`” v1 note is
superseded for this narrow case). **Explicitly not part of M2 closure:**
Composer vendor resolution, effect narrowing, bare inner reads without
`__assign`, corpus-only batch confidence gating, and a first-class `mysqli`
oracle driver remain follow-ons.
- **2026-04-24 — D46** **Opt-in HTTP chat repair proposer (Milestone 3).**
`chrysalis repair --llm` with `CHRYSALIS_REPAIR_LLM_API_KEY` calls an
OpenAI-compatible Chat Completions endpoint from the **CLI / repair package**
only. The model returns JSON describing `replaceOperand` edits; the package
validates node ids against the WebIR module before `applyModuleEdits`, and
`**runVerifiedRepairLoop` still requires a full-corpus replay** to accept a
patch. This does **not** relax D3 / AGENTS rules about network or
non-injected time/random in **generated** handlers — it is developer tooling,
not emitted runtime.
- **2026-04-24 — D47** **Hole-closure patch file + repair diagnostics (Milestone 3).**
`parseHoleClosurePatchJson` accepts a JSON document describing
`applyHoleClosure` inputs (hole id, replacement subgraph nodes, human
`signOff`). `chrysalis repair … --hole-patch <file.json>` ingests the PHP
project, applies closure once, and accepts it only if **full-corpus replay**
passes (same bar as the LLM loop). Optional `--repair-verbose` /
`CHRYSALIS_REPAIR_VERBOSE` logs non-fatal HTTP chat proposer diagnostics to
stderr without changing the verify gate.
- **2026-04-24 — D48** **Repair snapshot export + stricter hole-patch validation.**
After a **successful** `chrysalis repair` (hole-patch path or verify-gated
loop), optional `--write-module <path>` writes a deterministic WebIR JSON
snapshot via `moduleToGoldenSnapshot` (relative PHP/form locators to
`--project`). `parseHoleClosurePatchJson` now rejects unknown `Effect.kind`
and `WebIRType.kind` strings so hand-edited patches cannot silently drift
from the lattice.
- **2026-04-24 — D49** **Milestone 3 closure.** The repair vertical slice is
**complete for v1**: verify-gated `runVerifiedRepairLoop`, opt-in HTTP chat
`RepairProposer`, human `hole-patch` JSON with the same replay bar, module
snapshot export, and diagnostics env/flags. **Deferred** (not blocking): finer
emit↔IR divergence maps, composite proposers, and any repair that weakens the
full-corpus gate. Execution focus moves to **Milestone 4** (flagship app and
monotonic migration metrics on `main`).
- **2026-04-24 — D50** **Flagship `laravel-min`: Composer path + DB route + wider
oracle corpus.** The skeleton ships `**composer.json`** (PHP constraint +
`autoload.files` for `app/autoload.php`); CI runs `**composer install**` so
`public/index.php` can load `**vendor/autoload.php**` without vendoring that
tree in git. `**GET /items**` reads SQLite via the same `**query_all**` surface
as `fixtures/tiny-blog` (ingest/emit parity, oracle SQL capture). The flagship
verify script seeds `**data/app.sqlite**` from `**schema.sql**`, replays the
same DDL+DML into each emitted `**blog.sqlite**`, and **drives six HTTP hits**
across three routes before dual-backend replay — stretching the corpus while
keeping the existing correctness gate.
- **2026-04-24 — D51** `**laravel-min` `GET /count` (`query_one`).** Adds a fourth
manifest route that reads `**SELECT COUNT(*) AS c FROM items`** via the same
`**query_one**` lowering as tiny-blog (read-only aggregate, safe for oracle +
dual emit replay). The flagship verify driver now exercises **four routes**
with **eight sequential hits** before replay, further stress-testing routing,
SQL capture, and migration status without mutating fixture rows during capture.
- **2026-04-24 — D52** `**laravel-min` session-aware counter (`GET /session/visit`).**
Adds a sixth manifest route using PHP `**session_name('chrysalis_sid')`** (same
default as emitted `**session.ts**`) plus `**$_SESSION['visits']**` read/write
after `**session_start()**`. The flagship verify driver issues **two** sequential
hits on that path (after the existing GET/POST mix) so `**@chrysalis/verify`**
cookie chaining matches emitted session persistence; replay sets
`**CHRYSALIS_SESSION_DIR**` under each generated app so file-backed session JSON
is empty at corpus start, mirroring SQL replay hygiene. Ingest lowers
`**session_name**` and `**session_set_cookie_params**` to the same void stub as
`**session_start()**` (middleware owns cookie policy in emitted TypeScript).
- **2026-04-24 — D53** `**laravel-min` `GET /hello` (query string).** Adds a seventh
manifest route that echoes `**$_GET['name']`** (with `**trim**` and `**??**`)
as plain text so the flagship oracle driver records **query-shaped** HTTP
requests; verify hits `**/hello`** twice with different `**name=**` values to
widen the corpus without new server-side mutable state beyond existing session
and SQL paths.
- **2026-04-24 — D54** `**laravel-min` session login + `me` (`POST /session/login`,
`GET /session/me`).** Adds two manifest routes so the oracle records a minimal
**anonymous read → form login → authenticated read** sequence on the same
PHP session cookie as the visit counter; verify replays it with the same
`**CHRYSALIS_SESSION_DIR`** discipline as D52. The driver also widens the base
`**GET`/`items`/`count**` loop to **ten** hits before query/echo/session phases.
- **2026-04-24 — D55** `**laravel-min` `GET /jump` (redirect).** Adds a manifest route
that issues `**header('Location: /health')`** then `**exit**`, lowering to the
same `**effect.redirect**` path as tiny-blog logins. The flagship verify driver
records a   `**GET /jump**` with `**redirect: manual**` so the oracle preserves the
**3xx + `Location**` contract for dual-emit replay (no automatic follow).
- **2026-04-24 — D56** `**laravel-min` production-shaped session auth (fixture).**
Replaces naive body-only session login with `**GET /login`** (HTML form + static
`**csrf**` in session), `**POST /login**` (`**query_one**` + `**password_verify**`,
redirect on success), and `**POST /logout**` (clears session user id, redirects).
`**schema.sql**` gains a `**users**` table; `**verify-flagship-laravel-min.mjs**`
bcrypt-seeds `**secret**` for user `**flagship**` on both fixture and emitted
`**blog.sqlite**` via PHP `**password_hash**` so oracle and replay stay aligned.
CSRF is **deterministic** in this skeleton (not production-grade entropy); real
apps still need token rotation and origin checks beyond this pilot.
- **2026-04-24 — D57** `**laravel-min` `GET /api/health` (JSON).** Adds a read-only
JSON health endpoint with explicit `**Content-Type: application/json`** and a
fixed `**{"ok":true,"app":"laravel-min"}**` body (no `**json_encode**` in PHP, so
ingest/emit stay on the echo/redirect surfaces already gated in CI). The flagship
verify driver hits `**/api/health**` twice (mid-corpus and after the auth/logout
tail) to widen the oracle without new mutable server state.
- **2026-04-24 — D58** `**laravel-min` `GET /robots.txt`.** Adds a plain-text crawl
policy endpoint (common production surface) and includes `**/robots.txt`** in the
flagship verify script’s base `**GET**` fan-out so the oracle records another
stable path alongside HTML, JSON, redirects, SQL, and session flows.
- **2026-04-24 — D59** `**laravel-min` `GET /humans.txt`.** Adds a deterministic
plain-text `**humans.txt`** endpoint (common public metadata surface) and one more
`**GET**` in the flagship verify driver’s base path loop so the oracle corpus grows
without new mutable server state.
- **2026-04-24 — D60** `**laravel-min` `GET /.well-known/security.txt`.** Adds a
deterministic RFC 9116-style `**security.txt`** document at the well-known path (fixture
`**Contact**` / `**Acknowledgments**` lines only, no live security workflow) and extends
the verify driver’s base `**GET**` loop so emitted stacks exercise multi-segment static
paths alongside the existing pilot surfaces.
- **2026-04-24 — D61** `**laravel-min` `GET /sitemap.xml`.** Adds a minimal deterministic
XML sitemap (`**application/xml`**, single fixture URL) and one more base-loop `**GET**`
so the oracle records another common production content type without dynamic URL generation
or database reads.
- **2026-04-24 — D62** `**laravel-min` `GET /css/pilot.css`.** Adds a deterministic static
stylesheet (`**text/css`**, Laravel-shaped `**public/css/...**` URL) and one more base-loop
`**GET**` so routing and replay cover a nested static asset path alongside metadata and API
surfaces.
- **2026-04-24 — D63** `**laravel-min` `GET /manifest.webmanifest`.** Adds a minimal Web App
Manifest (`**application/manifest+json`**, literal JSON echo like `**/api/health**`, no
`**json_encode**`) and one more base-loop `**GET**` so the oracle sees the standard PWA
metadata filename alongside other static surfaces.
- **2026-04-24 — D64** **Composer Laravel adoption track (`flagship/laravel-full`).**
Adds documentation + `**chrysalis.routes.example.json`** for a real `**composer create-project**` tree, `**pnpm run scaffold:laravel-full**` (`scripts/scaffold-flagship-laravel.mjs`)
that writes `**flagship/chrysalis-laravel-work/**` (gitignored), and cross-links from
`**laravel-min**` / `**flagship/README.md**`. Does **not** vendor Laravel in git; CI remains
on `**laravel-min`** until bounded handler manifests and verify corpora exist for the
Composer-backed app.
- **2026-04-24 — D65** `**laravel-full/chrysalis-templates` + scaffold wiring.** Ships a
committed **ingestable** slice (`GET /chrysalis-ping`, literal string return) and a Laravel
`**routes/chrysalis.php`** stub merged by `**scaffold-flagship-laravel.mjs**` (append
`**require**` to `**routes/web.php**` when missing). Re-running the scaffold on an existing
Composer tree **re-syncs** templates without re-downloading Laravel. Vitest covers ingest of
the template root; runtime PHP still requires Composer + `**php artisan serve`** locally.
- **2026-04-24 — D66** `**verify:laravel-full` (optional Oracle + dual verify).** Adds
`**scripts/verify-flagship-laravel-full.mjs`** and `**pnpm run verify:laravel-full**`: skips when
PHP is missing or `**flagship/chrysalis-laravel-work**` lacks `**vendor/**` / `**public/index.php**`;
otherwise captures `**GET /chrysalis-ping**` twice, ingests the Composer tree, dual-emits, replays
with the same `**blog.sqlite**` bootstrap as `**laravel-min**` verify for harness parity. CI runs
the script after `**verify-flagship-laravel-min**` (no-op skip until a cached scaffold tree exists).
- **2026-04-24 — D67** `**chrysalis-templates` second route + emit parity.** Adds `**GET /chrysalis-health.txt`**
(`health_txt_show.php`), Laravel `**routes/chrysalis.php**` wiring, widens `**verify:laravel-full**`
corpus (four GETs), and Vitest emit-hono / emit-fastify coverage for the two-handler template slice
alongside `**laravel-min**`.
- **2026-04-24 — D68** **Optional `status:laravel-full` migration roll-up.** Adds
`**scripts/status-flagship-laravel-full.mjs`** and `**pnpm run status:laravel-full**`:
skip when scaffold/traces/reports are absent; otherwise run `chrysalis status --json` for
`**flagship/chrysalis-laravel-work**`, enforce `**status-migration**` gate, and write
`**reports/migration/flagship-laravel-full.json**`.
- **2026-04-24 — D69** **Dedicated CI job for Composer Laravel scaffold verify/status.**
Moves `laravel-full` checks out of the `laravel-min` job into
`**verify flagship (laravel-full scaffold)`** with separate artifacts and cache-backed
reuse of both Composer package cache and the scaffolded
`**flagship/chrysalis-laravel-work**` tree keyed by scaffold/templates inputs.
- **2026-04-24 — D70** **Composer template corpus widened (JSON + redirect).**
Extends `laravel-full/chrysalis-templates` with `**GET /api/chrysalis-health`**
(`application/json`, literal body) and `**GET /chrysalis-jump**` (302 redirect to
`/chrysalis-health.txt`) alongside existing text endpoints; verify driver now records
these paths and emit parity tests require four template handlers across Hono/Fastify.
- **2026-04-24 — D71** **Composer template session route (`/chrysalis-session/visit`).**
Adds deterministic session counter behavior to `laravel-full/chrysalis-templates`
(`session_name('chrysalis_sid')`, `session_start`, `$_SESSION['visits']` increment,
JSON body), updates Laravel route stub + verify corpus, and requires five template
handlers in ingest/emit parity tests (Hono/Fastify).
- **2026-04-24 — D72** **Composer template POST echo route (`/chrysalis-echo`).**
Adds a bounded form POST surface to `laravel-full/chrysalis-templates` (`echo_post.php`,
URL-encoded `msg` input, JSON response), widens `verify:laravel-full` with two POST bodies,
and raises template ingest/emit parity to six handlers across Hono/Fastify.
- **2026-04-24 — D73** **Composer template query route (`/chrysalis-hello`).**
Adds a deterministic query-parameter surface (`hello_show.php`, `$_GET['name']` + `trim`)
to `laravel-full/chrysalis-templates`, widens `verify:laravel-full` with two
`GET /chrysalis-hello?name=...` hits, and raises template ingest/emit parity to seven
handlers across Hono/Fastify.
- **2026-04-24 — D74** **Composer template auth-like session trio (`me/login/logout`).**
Adds bounded session read/write surfaces to `laravel-full/chrysalis-templates`:
`**GET /chrysalis-session/me`**, `**POST /chrysalis-session/login**`
(`username=flagship`), and `**POST /chrysalis-session/logout**`. Verify corpus now
exercises the `me → login → me → logout → me` sequence; template ingest/emit parity
rises to ten handlers across Hono/Fastify.
- **2026-04-24 — D75** **Composer template DB-count route (`/chrysalis-count`).**
Adds a bounded SQL-read surface backed by template-local SQLite
(`chrysalis/lib/db.php`, `chrysalis/schema.sql`, `count_show.php`) and seeds the same
schema for fixture + emitted replay in `verify:laravel-full`. Template ingest/emit parity
rises to eleven handlers across Hono/Fastify.
- **2026-04-24 — D76** **Composer template framework-wrapper route (`/chrysalis-framework`).**
Adds one bounded Laravel service-wrapper surface in `routes/chrysalis.php`: route
ownership still comes from explicit `chrysalis.routes.json` + procedural handler
(`framework_show.php`), while the runtime response is created through Laravel's
`ResponseFactory` resolved from the service container. Verify corpus adds
`GET /chrysalis-framework` x2 and template ingest/emit parity rises to twelve handlers
across Hono/Fastify.
- **2026-04-24 — D77** **Composer template DB-first-item route (`/chrysalis-first-item`).**
Adds a second bounded SQL-read shape over the template-local SQLite surface:
`first_item_show.php` returns the first seeded item name from
`SELECT name FROM items ORDER BY id ASC LIMIT 1`. Verify corpus adds
`GET /chrysalis-first-item` x2 and template ingest/emit parity rises to thirteen
handlers across Hono/Fastify.
- **2026-04-24 — D78** **Composer template items list route (`/chrysalis-items`).**
Extends template-local `chrysalis/lib/db.php` with `**query_all`** and adds
`items_list_show.php`: `**SELECT id, name FROM items ORDER BY id ASC**` plus a
bounded `**foreach**` that builds the same plain-text lines as `laravel-min`
`**GET /items**`. Verify corpus adds `**GET /chrysalis-items**` x2; template
ingest/emit parity rises to fourteen handlers across Hono/Fastify.
- **2026-04-24 — D79** **Composer template second aggregate JSON route (`/chrysalis-lib-count`).**
Adds `**lib_count_show.php`**: same bounded `**query_one**` aggregate as `**/chrysalis-count**`, but
returns `**{"countViaLib":…}**` so the oracle + dual replay corpus exercises an additional JSON
envelope without new SQL shapes. Note: ingest widens effects for same-file and `**lib/****`
helpers (D31/D30), but `**emit-***` still records emit-time holes for `**data.call**` to arbitrary
PHP function names that are not in `**emitKnownCall**`; this handler stays **inline-only** so the
flagship slice remains **zero-hole** until callee emission is generalized. Verify adds
`**GET /chrysalis-lib-count`** x2; template ingest/emit parity rises to fifteen handlers across Hono/Fastify.
- **2026-04-24 — D80** **Composer template DB-last-item route (`/chrysalis-last-item`).**
Adds `**last_item_show.php`**: `**SELECT name FROM items ORDER BY id DESC LIMIT 1**` with the same
literal JSON concatenation pattern as `**/chrysalis-first-item**`, so the seeded SQLite corpus
records a second single-row read with inverted ordering (deterministic `**charlie**` on the template
schema). Verify adds `**GET /chrysalis-last-item**` x2; template ingest/emit parity rises to sixteen
handlers across Hono/Fastify.
- **2026-04-24 — D81** **Composer template `SUM(id)` aggregate route (`/chrysalis-sum-ids`).**
Adds `**sum_ids_show.php`**: `**SELECT SUM(id) AS s FROM items**` via `**query_one**`, returning
`**{"sumIds":6}**` on the seeded three-row `**items**` table (ids 1..3). Verify adds
`**GET /chrysalis-sum-ids**` x2; template ingest/emit parity rises to seventeen handlers across Hono/Fastify.
- **2026-04-25 — D82** **Milestone 4 v1 pilot closure.** The **Milestone 4 phased checklist**
in `ROADMAP.md` is complete: `**flagship/laravel-min`** (Laravel-shaped tree, Composer autoload,
multi-route oracle driver, dual emit + verify in CI, migration + oracle-footprint artifacts) and
`**flagship/laravel-full**` (bounded `**chrysalis-templates/**` slice, scaffold, optional verify/status,
dedicated CI). **Coverage** and **correctness** are reproducible from `chrysalis status --json` inputs
documented in `flagship/README.md`; **idiomaticity** and **residual legacy** remain optional sidecars
until a pipeline owns those files. **Explicitly not claimed as closed:** full Composer **Breeze**
product surface, production-grade rotating CSRF / gateways / MFA, and arbitrary `**lib/`** PHP callee
emission without emit-time holes (see D79). Follow-on work stays under **Milestone 4+** in `ROADMAP.md`
until a future milestone split is warranted.
- **2026-04-25 — D83** **Milestone 5 roadmap shell (flagship depth, draft).** `ROADMAP.md`
names **Milestone 5 — Flagship depth (draft)** as the successor track for former **Milestone 4+**
items (tracked Composer flagship, optional Breeze, production auth where owned, larger corpora,
optional idiomaticity/residual-legacy gates). **No new product claims** at introduction beyond
naming the track; M4 v1 acceptance is unchanged (D82). The first concrete M5 checklist item
(canonical Composer worktree + CI) is recorded under **D84**.
- **2026-04-25 — D84** **Milestone 5 phase 1 — canonical Composer Laravel worktree.** The repo
**starts** M5 by naming `**flagship/chrysalis-laravel-work/`** (materialized by
`**pnpm run scaffold:laravel-full**`, gitignored) as the **canonical full Laravel** ingest and
oracle root alongside the existing CI job `**verify flagship (laravel-full scaffold)`**.
`**flagship/laravel-min/**` remains the **Laravel-shaped** fast fixture and verify harness until a
later item explicitly merges or replaces it; no vendor tree is committed to git.
- **2026-04-25 — D85** **Milestone 5 — optional Laravel Breeze in the canonical worktree.** The
scaffold script (`scripts/scaffold-flagship-laravel.mjs`) accepts `**--with-breeze`** or env
`**CHRYSALIS_SCAFFOLD_BREEZE=1**` ( `**pnpm run scaffold:laravel-full:breeze**` ). When set, after
`**composer create-project**` (or on an existing tree without `**laravel/breeze**`), it runs
`**composer require laravel/breeze --dev**`, `**php artisan breeze:install blade --no-interaction --pest**`,
`**php artisan migrate --force**`, ensures `**database/database.sqlite**`, then `**npm ci`/`npm install**`
and `**npm run build**`, then copies Chrysalis templates and re-appends `**routes/chrysalis.php**`
to `**routes/web.php**`. CI enables the env flag on `**verify flagship (laravel-full scaffold)**` so
`**verify:laravel-full**` continuously validates coexistence. **Ingest scope is unchanged:** only
files listed in `**chrysalis.routes.json`** are translated; Breeze’s published PHP is ignored until
explicitly routed in the manifest. **Not claimed:** ingest/verify parity on Breeze’s auth Blade stack
(deferred ROADMAP item).
- **2026-04-25 — D86** **Composer template `MIN(id)` aggregate route (`/chrysalis-min-id`).**
Adds `**min_id_show.php`**: `**SELECT MIN(id) AS m FROM items**` via `**query_one**`, returning
`**{"minId":1}**` on the seeded three-row `**items**` table. `**chrysalis.routes.json**`, `**routes/chrysalis.stub.php**`,
`**verify-flagship-laravel-full.mjs**` (two `**GET**` captures), ingest + dual-emit parity tests, and
README counts move to **eighteen** template handlers. Does **not** close the Milestone 5 “larger corpora /
sidecar gates” item — incremental oracle growth only.
- **2026-04-25 — D87** **Composer template `MAX(id)` aggregate route (`/chrysalis-max-id`).**
Adds `**max_id_show.php`**: `**SELECT MAX(id) AS x FROM items**` via `**query_one**`, returning
`**{"maxId":3}**` on the seeded `**items**` table. Manifest, Laravel stub routes, `**verify-flagship-laravel-full**`
(two `**GET**` captures), ingest + dual-emit parity tests, and README counts move to **nineteen**
template handlers. Same “incremental corpus only” scope as **D86**.
- **2026-04-25 — D88** **Composer template `ROUND(AVG(id))` aggregate route (`/chrysalis-avg-id`).**
Adds `**avg_id_show.php`**: `**SELECT ROUND(AVG(id)) AS a FROM items**` via `**query_one**`, returning
`**{"avgId":2}**` on the seeded ids 1..3 table. Manifest, Laravel stub routes, `**verify-flagship-laravel-full**`
(two `**GET**` captures), ingest + dual-emit parity tests, and README counts move to **twenty** template handlers.
Same incremental oracle scope as **D86–D87**.
- **2026-04-25 — D89** **Composer template id-span aggregate route (`/chrysalis-id-span`).**
Adds `**id_span_show.php`**: `**SELECT (MAX(id) - MIN(id)) AS s FROM items**` via `**query_one**`, returning
`**{"idSpan":2}**` on the seeded ids 1..3 table. Manifest, Laravel stub routes, `**verify-flagship-laravel-full**`
(two `**GET**` captures), ingest + dual-emit parity tests, and README counts move to **twenty-one** template handlers.
Same incremental oracle scope as **D86–D88**.
- **2026-04-25 — D90** **Composer template sum-squares aggregate route (`/chrysalis-sum-squares`).**
Adds `**sum_squares_show.php`**: `**SELECT SUM(id * id) AS ss FROM items**` via `**query_one**`, returning
`**{"sumSquares":14}**` on the seeded ids 1..3 table. Manifest, Laravel stub routes, `**verify-flagship-laravel-full**`
(two `**GET**` captures), ingest + dual-emit parity tests, and README counts move to **twenty-two** template handlers.
Same incremental oracle scope as **D86–D89**.
- **2026-04-25 — D91** **Composer template filtered-count route (`/chrysalis-even-count`).**
Adds `**even_count_show.php`**: `**SELECT COUNT(*) AS c FROM items WHERE (id % 2) = 0**` via `**query_one**`,
returning `**{"evenCount":1}**` on the seeded ids 1..3 table. Manifest, Laravel stub routes,
`**verify-flagship-laravel-full**` (two `**GET**` captures), ingest + dual-emit parity tests, and README
counts move to **twenty-three** template handlers. Same incremental oracle scope as **D86–D90**.
- **2026-04-25 — D92** **Composer template odd-count route (`/chrysalis-odd-count`).**
Adds `**odd_count_show.php`**: `**SELECT COUNT(*) AS c FROM items WHERE (id % 2) = 1**` via `**query_one**`,
returning `**{"oddCount":2}**` on the seeded ids 1..3 table. Manifest, Laravel stub routes,
`**verify-flagship-laravel-full**` (two `**GET**` captures), ingest + dual-emit parity tests, and README
counts move to **twenty-four** template handlers. Same incremental oracle scope as **D86–D91**.
- **2026-04-25 — D93** **Composer template greater-than filter count (`/chrysalis-gt-two-count`).**
Adds `**gt_two_count_show.php`**: `**SELECT COUNT(*) AS c FROM items WHERE id > 2**` via `**query_one**`,
returning `**{"gtTwoCount":1}**` on the seeded ids 1..3 table. Manifest, Laravel stub routes,
`**verify-flagship-laravel-full**` (two `**GET**` captures), ingest + dual-emit parity tests, and README
counts move to **twenty-five** template handlers. Same incremental oracle scope as **D86–D92**.
- **2026-04-25 — D94** **Composer template less-than filter count (`/chrysalis-lt-three-count`).**
Adds `**lt_three_count_show.php`**: `**SELECT COUNT(*) AS c FROM items WHERE id < 3**` via `**query_one**`,
returning `**{"ltThreeCount":2}**` on the seeded ids 1..3 table. Manifest, Laravel stub routes,
`**verify-flagship-laravel-full**` (two `**GET**` captures), ingest + dual-emit parity tests, and README
counts move to **twenty-six** template handlers. Same incremental oracle scope as **D86–D93**.
- **2026-04-25 — D95** **Composer template greater-equal filter count (`/chrysalis-gte-two-count`).**
Adds `**gte_two_count_show.php`**: `**SELECT COUNT(*) AS c FROM items WHERE id >= 2**` via `**query_one**`,
returning `**{"gteTwoCount":2}**` on the seeded ids 1..3 table. Manifest, Laravel stub routes,
`**verify-flagship-laravel-full**` (two `**GET**` captures), ingest + dual-emit parity tests, and README
counts move to **twenty-seven** template handlers. Same incremental oracle scope as **D86–D94**.
- **2026-04-25 — D96** **Composer template less-equal filter count (`/chrysalis-lte-three-count`).**
Adds `**lte_three_count_show.php`**: `**SELECT COUNT(*) AS c FROM items WHERE id <= 3**` via `**query_one**`,
returning `**{"lteThreeCount":3}**` on the seeded ids 1..3 table. Manifest, Laravel stub routes,
`**verify-flagship-laravel-full**` (two `**GET**` captures), ingest + dual-emit parity tests, and README
counts move to **twenty-eight** template handlers. Same incremental oracle scope as **D86–D95**.
- **2026-04-25 — D97** **Composer template not-equal filter count (`/chrysalis-ne-two-count`).**
Adds `**ne_two_count_show.php`**: `**SELECT COUNT(*) AS c FROM items WHERE id <> 2**` via `**query_one**`,
returning `**{"neTwoCount":2}**` on the seeded ids 1..3 table. Manifest, Laravel stub routes,
`**verify-flagship-laravel-full**` (two `**GET**` captures), ingest + dual-emit parity tests, and README
counts move to **twenty-nine** template handlers. Same incremental oracle scope as **D86–D96**.
- **2026-04-25 — D98** **Composer template BETWEEN filter count (`/chrysalis-between-count`).**
Adds `**between_count_show.php`**: `**SELECT COUNT(*) AS c FROM items WHERE id BETWEEN 2 AND 3**` via `**query_one**`,
returning `**{"betweenCount":2}**` on the seeded ids 1..3 table. Manifest, Laravel stub routes,
`**verify-flagship-laravel-full**` (two `**GET**` captures), ingest + dual-emit parity tests, and README
counts move to **thirty** template handlers. Same incremental oracle scope as **D86–D97**.
- **2026-04-25 — D99** **Composer template equals filter count (`/chrysalis-eq-one-count`).**
Adds `**eq_one_count_show.php`**: `**SELECT COUNT(*) AS c FROM items WHERE id = 1**` via `**query_one**`,
returning `**{"eqOneCount":1}**` on the seeded ids 1..3 table. Manifest, Laravel stub routes,
`**verify-flagship-laravel-full**` (two `**GET**` captures), ingest + dual-emit parity tests, and README
counts move to **thirty-one** template handlers. Same incremental oracle scope as **D86–D98**.
- **2026-04-25 — D100** **Composer template equals filter count (`/chrysalis-eq-three-count`).**
Adds `**eq_three_count_show.php`**: `**SELECT COUNT(*) AS c FROM items WHERE id = 3**` via `**query_one**`,
returning `**{"eqThreeCount":1}**` on the seeded ids 1..3 table. Manifest, Laravel stub routes,
`**verify-flagship-laravel-full**` (two `**GET**` captures), ingest + dual-emit parity tests, and README
counts move to **thirty-two** template handlers. Same incremental oracle scope as **D86–D99**.
- **2026-04-25 — D101** **Composer template equals filter count (`/chrysalis-eq-two-count`).**
Adds `**eq_two_count_show.php`**: `**SELECT COUNT(*) AS c FROM items WHERE id = 2**` via `**query_one**`,
returning `**{"eqTwoCount":1}**` on the seeded ids 1..3 table. Manifest, Laravel stub routes,
`**verify-flagship-laravel-full**` (two `**GET**` captures), ingest + dual-emit parity tests, and README
counts move to **thirty-three** template handlers. Same incremental oracle scope as **D86–D100**.
- **2026-04-25 — D102** **Composer template not-equal filter count (`/chrysalis-ne-one-count`).**
Adds `**ne_one_count_show.php`**: `**SELECT COUNT(*) AS c FROM items WHERE id <> 1**` via `**query_one**`,
returning `**{"neOneCount":2}**` on the seeded ids 1..3 table. Manifest, Laravel stub routes,
`**verify-flagship-laravel-full**` (two `**GET**` captures), ingest + dual-emit parity tests, and README
counts move to **thirty-four** template handlers. Same incremental oracle scope as **D86–D101**.
- **2026-04-25 — D103** **Composer template not-equal filter count (`/chrysalis-ne-three-count`).**
Adds `**ne_three_count_show.php`**: `**SELECT COUNT(*) AS c FROM items WHERE id <> 3**` via `**query_one**`,
returning `**{"neThreeCount":2}**` on the seeded ids 1..3 table. Manifest, Laravel stub routes,
`**verify-flagship-laravel-full**` (two `**GET**` captures), ingest + dual-emit parity tests, and README
counts move to **thirty-five** template handlers. Same incremental oracle scope as **D86–D102**.
- **2026-04-25 — D104** **Composer template less-than filter count (`/chrysalis-lt-two-count`).**
Adds `**lt_two_count_show.php`**: `**SELECT COUNT(*) AS c FROM items WHERE id < 2**` via `**query_one**`,
returning `**{"ltTwoCount":1}**` on the seeded ids 1..3 table. Manifest, Laravel stub routes,
`**verify-flagship-laravel-full**` (two `**GET**` captures), ingest + dual-emit parity tests, and README
counts move to **thirty-six** template handlers. Same incremental oracle scope as **D86–D103**.
- **2026-04-25 — D105** **Composer template greater-than filter count (`/chrysalis-gt-one-count`).**
Adds `**gt_one_count_show.php`**: `**SELECT COUNT(*) AS c FROM items WHERE id > 1**` via `**query_one**`,
returning `**{"gtOneCount":2}**` on the seeded ids 1..3 table. Manifest, Laravel stub routes,
`**verify-flagship-laravel-full**` (two `**GET**` captures), ingest + dual-emit parity tests, and README
counts move to **thirty-seven** template handlers. Same incremental oracle scope as **D86–D104**.
- **2026-04-25 — D106** **Composer template greater-or-equal filter count (`/chrysalis-gte-one-count`).**
Adds `**gte_one_count_show.php`**: `**SELECT COUNT(*) AS c FROM items WHERE id >= 1**` via `**query_one**`,
returning `**{"gteOneCount":3}**` on the seeded ids 1..3 table. Manifest, Laravel stub routes,
`**verify-flagship-laravel-full**` (two `**GET**` captures), ingest + dual-emit parity tests, and README
counts move to **thirty-eight** template handlers. Same incremental oracle scope as **D86–D105**.
- **2026-04-25 — D107** **Composer template less-or-equal filter count (`/chrysalis-lte-one-count`).**
Adds `**lte_one_count_show.php`**: `**SELECT COUNT(*) AS c FROM items WHERE id <= 1**` via `**query_one**`,
returning `**{"lteOneCount":1}**` on the seeded ids 1..3 table. Manifest, Laravel stub routes,
`**verify-flagship-laravel-full**` (two `**GET**` captures), ingest + dual-emit parity tests, and README
counts move to **thirty-nine** template handlers. Same incremental oracle scope as **D86–D106**.
- **2026-04-25 — D108** **Composer template bounded filter count (`/chrysalis-between-one-two-count`).**
Adds `**between_one_two_count_show.php`**: `**SELECT COUNT(*) AS c FROM items WHERE id BETWEEN 1 AND 2**`
via `**query_one**`, returning `**{"betweenOneTwoCount":2}**` on the seeded ids 1..3 table.
Manifest, Laravel stub routes, `**verify-flagship-laravel-full**` (two `**GET**` captures), ingest +
dual-emit parity tests, and README counts move to **forty** template handlers. Same incremental
oracle scope as **D86–D107**.
- **2026-04-25 — D109** **Composer template greater-than filter count (`/chrysalis-gt-three-count`).**
Adds `**gt_three_count_show.php`**: `**SELECT COUNT(*) AS c FROM items WHERE id > 3**` via `**query_one**`,
returning `**{"gtThreeCount":0}**` on the seeded ids 1..3 table. Manifest, Laravel stub routes,
`**verify-flagship-laravel-full**` (two `**GET**` captures), ingest + dual-emit parity tests, and README
counts move to **forty-one** template handlers. Same incremental oracle scope as **D86–D108**.
- **2026-04-25 — D110** **Composer template strict-lower-bound filter count (`/chrysalis-lt-one-count`).**
Adds `**lt_one_count_show.php`**: `**SELECT COUNT(*) AS c FROM items WHERE id < 1**` via `**query_one**`,
returning `**{"ltOneCount":0}**` on the seeded ids 1..3 table. Manifest, Laravel stub routes,
`**verify-flagship-laravel-full**` (two `**GET**` captures), ingest + dual-emit parity tests, and README
counts move to **forty-two** template handlers. Same incremental oracle scope as **D86–D109**.
- **2026-04-25 — D111** **Composer template inclusive-upper-bound filter count (`/chrysalis-gte-three-count`).**
Adds `**gte_three_count_show.php`**: `**SELECT COUNT(*) AS c FROM items WHERE id >= 3**` via `**query_one**`,
returning `**{"gteThreeCount":1}**` on the seeded ids 1..3 table. Manifest, Laravel stub routes,
`**verify-flagship-laravel-full**` (two `**GET**` captures), ingest + dual-emit parity tests, and README
counts move to **forty-three** template handlers. Same incremental oracle scope as **D86–D110**.
- **2026-04-25 — D112** **Composer template inclusive-two filter count (`/chrysalis-lte-two-count`).**
Adds `**lte_two_count_show.php`**: `**SELECT COUNT(*) AS c FROM items WHERE id <= 2**` via `**query_one**`,
returning `**{"lteTwoCount":2}**` on the seeded ids 1..3 table. Manifest, Laravel stub routes,
`**verify-flagship-laravel-full**` (two `**GET**` captures), ingest + dual-emit parity tests, and README
counts move to **forty-four** template handlers. Same incremental oracle scope as **D86–D111**.
- **2026-04-25 — D113** **Composer template zero-equality filter count (`/chrysalis-eq-zero-count`).**
Adds `**eq_zero_count_show.php`**: `**SELECT COUNT(*) AS c FROM items WHERE id = 0**` via `**query_one**`,
returning `**{"eqZeroCount":0}**` on the seeded ids 1..3 table. Manifest, Laravel stub routes,
`**verify-flagship-laravel-full**` (two `**GET**` captures), ingest + dual-emit parity tests, and README
counts move to **forty-five** template handlers. Same incremental oracle scope as **D86–D112**.
- **2026-04-25 — D114** **Composer template zero-inequality filter count (`/chrysalis-ne-zero-count`).**
Adds `**ne_zero_count_show.php`**: `**SELECT COUNT(*) AS c FROM items WHERE id <> 0**` via `**query_one**`,
returning `**{"neZeroCount":3}**` on the seeded ids 1..3 table. Manifest, Laravel stub routes,
`**verify-flagship-laravel-full**` (two `**GET**` captures), ingest + dual-emit parity tests, and README
counts move to **forty-six** template handlers. Same incremental oracle scope as **D86–D113**.
- **2026-04-25 — D115** **Composer complexity ladder pack (realistic → unrealistic).**
Adds `**items_snapshot_show.php`**, `**items_group_parity_show.php**`, `**items_cte_rollup_show.php**`,
and `**recursive_stress_show.php**` with deterministic outputs on seeded ids 1..3:
`**/chrysalis-items-snapshot**` (`COUNT/MIN/MAX/SUM` in one row),
`**/chrysalis-items-group-parity**` (`GROUP BY id % 2` parity buckets),
`**/chrysalis-items-cte-rollup**` (`WITH`-CTE rollup), and
`**/chrysalis-recursive-stress**` (recursive CTE stress shape intended as near-unrealistic upper bound).
Manifest, Laravel stub routes, `**verify-flagship-laravel-full**` (two `**GET**` captures each),
ingest + dual-emit parity tests, and README counts move to **fifty-two** template handlers (D190/D192 add auth and Socialite/Fortify probes).
Same incremental oracle scope as **D86–D114**, now explicitly broadening SQL-shape diversity.
- **2026-04-25 — D116** **Verify harness stress + semantic assertions (`verify:laravel-full`).**
Extends `**scripts/verify-flagship-laravel-full.mjs`** with multi-run stress replay
(`--stress-runs=N` / `CHRYSALIS_VERIFY_STRESS_RUNS`) and deterministic fingerprint
drift checks per backend. Adds corpus semantic assertions for high-complexity routes:
`**/chrysalis-items-snapshot**`, `**/chrysalis-items-group-parity**`,
`**/chrysalis-items-cte-rollup**`, and `**/chrysalis-recursive-stress**`.
Also adds `**pnpm run verify:laravel-full:stress**` and README callouts.
- **2026-04-26 — D117** **Seed-variant replay matrix for `verify:laravel-full`.**
Extends `**scripts/verify-flagship-laravel-full.mjs`** with seed controls:
`**--seed-variant=baseline|empty|ten**` (or `**CHRYSALIS_VERIFY_SEED_VARIANT**`) and
`**--seed-variants=...**` (or `**CHRYSALIS_VERIFY_SEED_VARIANTS**`) for sequential matrix replay.
Fixture capture DB and emitted backend DB now share the same seed-specific schema rewrite,
preserving oracle parity while exercising edge cardinalities (`0`, `3`, `10` rows).
Semantic assertions for `**/chrysalis-items-snapshot**`,
`**/chrysalis-items-group-parity**`, `**/chrysalis-items-cte-rollup**`, and
`**/chrysalis-recursive-stress**` are now seed-aware. Adds
`**pnpm run verify:laravel-full:seed-matrix**` and README/ROADMAP callouts.
- **2026-04-26 — D118** **Five-nines confidence gate for `laravel-full` verify.**
Extends `**scripts/verify-flagship-laravel-full.mjs`** with explicit negative-path
semantics (`GET /chrysalis-session/login` method guard and bad-login body),
metamorphic cross-route invariants (snapshot/parity/CTE/recursive relations),
and confidence artifact emission at
`**reports/confidence/flagship-laravel-full.json**` (per backend correctness/drift).
Adds `**pnpm run verify:laravel-full:5nines**`, extends `**scripts/ci-gates.mjs**`
with `confidence-5nines`, and upgrades CI to run + artifact this gate.
- **2026-04-26 — D119** **Risk-cell dashboard in five-nines confidence artifact.**
Extends `**reports/confidence/flagship-laravel-full.json`** shape with `riskCells`
coverage rows (health/metadata, redirects, session happy+negative paths, SQL
aggregates/CTE, seed variance, replay determinism, dual-emitter parity).
Extends `confidence-5nines` CI gate to require all risk cells and require each
cell to remain `covered`, making confidence artifacts directly actionable.
- **2026-04-26 — D120** **Per-cell KPI thresholds in five-nines dashboard.**
Extends each confidence `riskCells[]` row with numeric `kpi` payload
(`value`, `min`, `unit`) computed from the captured corpus and replay settings.
Adds KPI gate enforcement in `confidence-5nines` so confidence fails when a
cell regresses beneath threshold, turning the artifact into a trendable,
machine-enforced confidence dashboard.
- **2026-04-26 — D121** **Rolling confidence trend gate + stricter five-nines CI lane.**
Extends `**scripts/verify-flagship-laravel-full.mjs`** to append per-run entries into
`**reports/confidence/history/flagship-laravel-full.history.json**` and broadens
negative-path semantics (`GET /chrysalis-session/logout` method guard, empty-login, empty-echo).
Extends `**scripts/ci-gates.mjs**` with `confidence-trend` (rolling streak check) and
updates `**verify:laravel-full:5nines**` to require both `confidence-5nines` and
`confidence-trend`. CI now restores/saves confidence history cache and runs the
laravel-full lane at `**VERIFY_THRESHOLD=0.99999**`.
- **2026-04-26 — D122** **Resolve flagship scope boundaries (laravel-min, Breeze, auth ownership).**
Chooses to keep `**flagship/laravel-min`** as the permanent **shaped fast fixture**
with its own verify harness (not folded into `laravel-full`). Chooses to keep
**Breeze first-party auth UI** outside manifest parity scope until a dedicated
milestone explicitly onboards those routes. Chooses to keep production-shaped
auth internals (rotating CSRF, gateways, MFA/OAuth) outside owned parity scope
for current milestones and represent them via explicit holes/residual-legacy
reporting until that milestone is opened.
- **2026-04-26 — D123** **CI auto-switch for confidence trend strictness.**
Adds `confidence-trend-ready` to `**scripts/ci-gates.mjs`** so CI can detect when
enough history exists to enforce strict rolling trend gates. The
`verify flagship (laravel-full scaffold)` workflow now sets
`CONFIDENCE_TREND_ALLOW_WARMUP` dynamically: warmup while history is short,
strict mode once history reaches `CONFIDENCE_STREAK_REQUIRED`.
- **2026-04-26 — D124** **Request-shape robustness checks in five-nines gate.**
Extends laravel-full verify corpus with JSON content-type mismatch probes for
form-only handlers (`POST /chrysalis-session/login`, `POST /chrysalis-echo`) and
method-guard probe for `GET /chrysalis-echo`. Adds corresponding semantic
assertions and introduces a dedicated confidence risk cell
`request-shape-robustness` enforced by `confidence-5nines`.
- **2026-04-26 — D125** **Session idempotency checks in five-nines gate.**
Extends laravel-full verify corpus to invoke `POST /chrysalis-session/logout`
twice and asserts stable success semantics (`{"ok":true}` remains available
across repeated logout traces). Adds dedicated confidence risk cell
`session-idempotency` with KPI thresholding under `confidence-5nines`.
- **2026-04-26 — D126** **Session transition monotonicity checks in five-nines gate.**
Extends laravel-full verify corpus with relogin branch and additional
`GET /chrysalis-session/me` observation. Adds explicit transition assertion
that session state follows `null -> flagship -> null -> flagship` in order.
Adds dedicated confidence risk cell `session-transition-monotonicity` with
KPI thresholds enforced by `confidence-5nines`.
- **2026-04-26 — D127** **Header contract strictness + redirect location invariants.**
Extends semantic assertions for laravel-full verify to enforce content-type
contracts on text/json routes (`/chrysalis-health.txt`, `/api/chrysalis-health`,
`/chrysalis-items-snapshot`, `/chrysalis-session/me`) and location header
invariant on `/chrysalis-jump`. Adds confidence risk cells
`header-contract-strictness` and `redirect-location-invariants` enforced by
`confidence-5nines`.
- **2026-04-26 — D128** **Cookie/session header invariants in five-nines gate.**
Extends laravel-full semantic assertions to require `set-cookie` with
`chrysalis_sid=` on session transition routes (`POST /chrysalis-session/login`,
`POST /chrysalis-session/logout`, `GET /chrysalis-session/me`). Adds confidence
risk cell `cookie-session-header-invariants` with KPI thresholds enforced by
`confidence-5nines`.
- **2026-04-26 — D129** **Cross-emitter verify report parity in five-nines gate.**
After Hono and Fastify replays, compares a **stable** `buildReport` fingerprint
(aggregate + per-endpoint scores; excludes `generatedAt`) for run 1 of each
backend. Mismatch fails the verify run and the confidence risk cell
`cross-backend-verify-parity`. Stress-run drift also uses the stable fingerprint
so multi-run stress mode measures real verify drift, not timestamp noise.
- **2026-04-26 — D130** **Trend history tracks cross-backend parity health.**
`appendConfidenceHistory` now persists `crossBackendParityOk` from each five-
nines run so rolling confidence trend entries retain explicit emitter parity
state. `confidence-trend` treats `crossBackendParityOk: false` as a regression
(while remaining backward-compatible with older entries that omit the field).
- **2026-04-26 — D131** **Seed matrix confidence + chimera test robustness.**
Multi-seed `verify:laravel-full:5nines` parent artifact adds
`matrixCrossBackendParityOk` (true when every non-skipped variant has
`crossBackendParity.ok !== false`). `runtime-chimera` proxy integration tests
retry the first `fetch` to the chimera port to absorb occasional Windows
`bad port` / `fetch failed` races after `listen`.
- **2026-04-26 — D132** **Pipeline-owned idiomaticity/residual sidecars (flagship full).**
`verify-flagship-laravel-full.mjs` writes `**reports/migration/flagship-laravel-full-emit-stats.json`**
(manifest route count + per-emitter hole/handler counts). `**status-flagship-laravel-full.mjs**`
then writes `**reports/migration/idiomaticity.json**` (`pct` from emitted-handler
`@chrysalis/compat` scan, dual-emitter conservative `min`) and
`**reports/migration/residual-legacy.json**` (`legacyRequestPct` from emit-hole
density vs manifest routes; documented as distinct from chimera production
traffic). `**confidence-5nines**` requires `**matrixCrossBackendParityOk: true**`
on seed-matrix parent artifacts; `**confidence-trend**` rejects
`**matrixCrossBackendParityOk: false**` when present on history rows; matrix
verify children set `**CHRYSALIS_VERIFY_MATRIX_ACTIVE=1**` so history rows carry
`**matrixActive` / `matrixCrossBackendParityOk**`. Logic lives in
`**scripts/flagship-migration-metrics.mjs**` (no `webir`/`emit` imports).
- **2026-04-26 — D133** **Laravel-min parity for emit-stats + migration sidecars.**
`verify-flagship-laravel-min.mjs` writes `**flagship-laravel-min-emit-stats.json`**.
New `**pnpm run status:laravel-min**` (`scripts/status-flagship-laravel-min.mjs`)
runs the same `**status-migration**` gate as CI, persists `**flagship-laravel-min.json**`,
and calls `**writeFlagshipLaravelMinMigrationSidecars**` (shared metrics module with
`**pilot**` field on sidecars). CI uploads emit-stats + sidecars for both flagship
jobs; `**writeMigrationSidecars**` parameterizes emit-stats path + generated handler
roots.
- **2026-04-26 — D134** **Optional CI floors for migration sidecars.**
Adds `**ci-gates.mjs migration-sidecar-floors [reports/migration]`** driven by
`**CHRYSALIS_IDIOMATICITY_MIN**` (0..1, requires `**idiomaticity.json**`) and/or
`**CHRYSALIS_RESIDUAL_LEGACY_MAX**` (0..100, requires `**residual-legacy.json**`).
If neither env var is set, the gate skips. CI flagship jobs run the gate after
`**status:laravel-***` with conservative defaults (`**0.01**` / `**50**`) to catch
regressions without over-fitting current emit noise.
- **2026-04-26 — D135** **Flagship full verify: wider `chrysalis-hello` oracle shapes.**
`**verify-flagship-laravel-full.mjs`** captures `**GET /chrysalis-hello**` with no query
(default `**world**` trim path), `**?name=**` (empty trimmed segment), the existing
`**flagship` / `composer**` pair, and `**name=x%20y**` (decoded space). Semantic
assertions pin each distinct plaintext body on the grouped route `**GET /chrysalis-hello**`.
- **2026-04-26 — D136** `**laravel-min` verify: wider `/hello` oracle + post-capture assertions.**
`**verify-flagship-laravel-min.mjs`** captures `**GET /hello**` with no query (default
`**guest**`), `**?name=**`, the existing `**flagship-corpus` / `chrysalis**` pair, and
`**name=x%20y**`. Immediately after `**readCorpus**`, asserts each expected `**hello:`…**
body appears on the grouped route `**GET /hello`** (same path-keying as D135).
- **2026-04-26 — D137** `**laravel-min` verify corpus semantics beyond `/hello`.**
Expands post-capture assertions in `**verify-flagship-laravel-min.mjs`** to pin
`**GET /health**` body, `**GET /api/health**` JSON body, `**GET /jump**` status/location,
`**GET /session/me**` anon/auth states, and redirect status for `**POST /login**` /
`**POST /logout**`. This keeps fixture drift visible before dual-emitter replay.
- **2026-04-26 — D138** `**laravel-min` metadata/static route contracts in verify.**
Further expands `**verify-flagship-laravel-min.mjs`** post-capture assertions to pin
exact body + content-type for `**/robots.txt**`, `**/humans.txt**`,
`**/.well-known/security.txt**`, `**/sitemap.xml**`, `**/css/pilot.css**`, and
`**/manifest.webmanifest**`. This hardens deterministic fixture surfaces that often
regress from incidental formatting/header changes.
- **2026-04-26 — D139** `**laravel-min` cross-backend verify parity gate.**
`**verify-flagship-laravel-min.mjs`** now computes a stable fingerprint over
verify report `aggregate` + `endpoints` per backend and fails when Hono/Fastify
diverge. This mirrors the parity invariant already enforced in the flagship-full
confidence harness, but scoped to the fast `laravel-min` fixture lane.
- **2026-04-26 — D140** `**laravel-min` echo request-shape + method-guard semantics.**
`**verify-flagship-laravel-min.mjs`** now captures and asserts negative echo shapes:
empty form POST and JSON POST return **400** with `**msg required`**, while
`**GET /echo**` remains a **404** method/route guard (`Not Found`). Existing
successful form echoes remain pinned (`echo:flagship-verify`, `echo:second-post`).
- **2026-04-26 — D141** `**laravel-min` home + DB list/count + visit + login form contracts.**
Extends `**assertLaravelMinCorpusSemantics`** to pin `**GET /**` HTML fragment,
`**GET /items**` / `**GET /count**` against the seeded `**items**` table, monotonic
`**GET /session/visit**` bodies `**visits:1**` / `**visits:2**`, and minimal `**GET /login**`
HTML markers plus `**text/html**` — all on the existing capture (no extra HTTP
driver requests).
- **2026-04-26 — D142** `**laravel-min` bad-CSRF `POST /login` + mixed-status assertions.**
Oracle driver issues `**POST /login`** with a wrong `**csrf**` token after
`**GET /login**`, expected **403** + `**csrf rejected`**. Post-capture semantics
use `**assertRouteContainsStatus**` so `**POST /login**` can include both **403** and
**302** traces without weakening the happy-path redirect pin.
- **2026-04-26 — D143** `**laravel-min` login credential negative traces.**
Adds oracle `**POST /login`** with valid CSRF but wrong password (**401** +
`**invalid credentials`**) and with only CSRF (empty user/pass → 400 +
`**credentials required**`). Post-capture semantics assert all four status/body
variants alongside the happy-path **302** redirect.
- **2026-04-26 — D144** `**laravel-min` `GET /logout` method guard (404).**
Oracle driver records `**GET /logout`** against the fixture front controller; only
`**POST /logout**` is wired, so the response is **404** `**Not Found`** (same
default as `**GET /echo**`). Post-capture semantics pin `**GET /logout**` status/body.
- **2026-04-26 — D145** `**laravel-min` `POST /session/me` method guard (404).**
Oracle driver records wrong-method `**POST /session/me`**; the fixture front
controller wires `**GET /session/me**` only, so default handling remains
404 `**Not Found**`. Post-capture semantics pin status/body for this route.
- **2026-04-26 — D146** `**laravel-min` `POST /session/visit` method guard (404).**
Oracle driver records wrong-method `**POST /session/visit`**; the fixture front
controller wires `**GET /session/visit**` only, so default handling remains
404 `**Not Found**`. Post-capture semantics pin status/body for this route.
- **2026-04-26 — D147** `**laravel-min` `POST /count` method guard (404).**
Oracle driver records wrong-method `**POST /count`**; the fixture front controller
wires `**GET /count**` only, so default handling remains 404 `**Not Found**`.
Post-capture semantics pin status/body for this route.
- **2026-04-26 — D148-D160** `**laravel-min` method-guard expansion pack (404).**
Oracle driver now records additional wrong-method calls and post-capture semantics
pin each to **404** `**Not Found`**: `**POST /items**`, `**POST /health**`,
`**POST /api/health**`, `**POST /jump**`, `**POST /hello**`, `**POST /**`,
`**POST /robots.txt**`, `**POST /humans.txt**`, `**POST /.well-known/security.txt**`,
`**POST /sitemap.xml**`, `**POST /css/pilot.css**`, `**POST /manifest.webmanifest**`,
and `**PUT /login**` (since only GET/POST are wired for `/login`).
- **2026-04-26 — D161** **Milestone 5 checklist closure.**
`ROADMAP.md` marks Milestone 5 as complete and closes the remaining checklist
item (larger corpora / pipeline-owned migration sidecars), reflecting delivered
D84-D160 work in canonical scaffold/verify/status pipelines plus expanded
`laravel-min` oracle and semantics coverage.
- **2026-04-26 — D162** **Milestone 6 roadmap shell (deferred backlog tracked).**
`ROADMAP.md` opens **Milestone 6 — Depth follow-ons** in planning state and
converts deferred/optional backlog into explicit checklist items (vendor-effect
depth, effect narrowing, `mysqli` oracle path, production session infra track,
migration sidecar release policy, and auth-boundary milestone carve-out).
- **2026-04-26 — D164** **Effect narrowing for `call_user_func*` overlays.**
`effectsReachableWithCallOverlay` now narrows dynamic-helper widening when the
first argument is a literal string callee found in the overlay map; truly
dynamic callees keep the prior all-callees widening behavior.
- **2026-04-26 — D165** **Oracle PHP `mysqli` query-path capture (initial slice).**
Adds `Chrysalis\Oracle\Db\MySQLi` as a drop-in subclass that records
`query()` SQL events (driver/sql/rowCount/shape/duration/origin) and wires it
into bootstrap loading + package docs. Prepared-statement / row-payload parity
remains a follow-on.
- **2026-04-26 — D166** **Migration sidecar release-policy lane.**
Adds `ci-gates` command `**migration-sidecar-floors-release`** plus root script
`**pnpm run release-gate:migration-sidecars**`. The release lane enforces
default floors (**idiomaticity >= 0.01**, **residual legacy <= 50**) with env
override support, and flagship CI jobs now call the policy command directly.
- **2026-04-26 — D167** **Auth boundary carve-out gets a dedicated scoped track.**
`ROADMAP.md` now includes **Milestone 6A — Auth boundary** with explicit owned
scope, explicit out-of-scope boundaries, hole policy, and completion metrics,
replacing implicit deferred notes with a concrete tracked milestone shell.
- **2026-04-26 — D168** **Effect narrowing deepening for `call_user_func*`.**
Overlay resolution now normalizes leading namespace slashes in literal callable
names and falls back to full widening when the literal callee is not present in
the overlay map, preserving safety while reducing over-approximation where
callable identity is known.
- **2026-04-26 — D169** **Oracle PHP `mysqli` depth (prepare + row payloads).**
Adds `Chrysalis\Oracle\Db\MySQLiStatement` for `prepare()` / `execute()` /
`get_result()` / `store_result()` tracing: mutating statements emit on
`execute()`; SELECT-shaped statements emit when the result is first consumed.
`MySQLi::query()` now reports driver `mysqli`, buffers assoc rows for
`MYSQLI_STORE_RESULT` selects (rewind via `data_seek(0)`), and leaves
`MYSQLI_USE_RESULT` without row payloads. `get_result()` requires mysqlnd (same
as stock PHP).
- **2026-04-26 — D170** **Oracle PHP `mysqli` prepared `params` provenance.**
`MySQLiStatement` now fills `sql.query.params` from `execute([...])` when
provided, otherwise from execute-time snapshots of `bind_param()` input slots
(PDO-style provenance). Indirect `bind_param` calls that bypass the subclass
still emit `params: []` by design.
- **2026-04-26 — D171** **Vendor/Composer call-overlay depth (FQ name → short key).**
`effectsReachableWithCallOverlay` now falls back from an exact callee miss to
the merged effect set of every overlay entry whose normalized name shares the
same unqualified tail, so calls like `\Package\foo()` match a `vendor/` helper
indexed as `foo`. Vitest resolves `@chrysalis/webir` to `src/` (like ingest and
parser-bridge) so cross-package tests cannot silently run against stale `dist/`.
- **2026-04-26 — D172** **Glayzzle `namespace` support for overlay keys.**
The bundled php-parser provider now flattens `namespace` declarations, composes
nested namespace prefixes, qualifies top-level `FunctionDecl` names, and lowers
`usegroup` to `Noop` so `namespace …; use …; function …` parses. Parser schema
bumps to **0.1.2**. Together with D171, vendor helpers declared in a namespace
align with FQN call sites without relying solely on tail widening.
- **2026-04-26 — D173** **Ingest lowers static `Class::method()` calls.**
`convertCall` now accepts callee `expr` + `StaticFetch`, emitting `data.call`
with callee string `className::method` (same shape as a bare `StaticFetch`
expression) instead of a `call:expr` hole. Enables `effectsReachableWithCallOverlay`
to match when overlay keys include static entry points; collecting class bodies
into the overlay map remains future work.
- **2026-04-26 — D174** **Parser class static methods become overlay keys.**
The glayzzle provider now flattens top-level `class` declarations into synthetic
`FunctionDecl` entries for static methods named `Ns\Class::method`, so
`buildCallEffectMap` can ingest those method bodies. Together with D173 static
call-site lowering, class-based vendor helpers now participate in overlay
fixpointing.
- **2026-04-26 — D175** `**call_user_func` array-literal callable narrowing.**
`effectsReachableWithCallOverlay` now resolves first-arg callable arrays of the
form `["Class", "method"]` / `["Ns\\Class", "method"]` lowered as
`__array_literal` + literal string operands to `Class::method`, and applies
the same overlay match logic as string literals. Unknown/dynamic arrays still
take the existing full-widen fallback.
- **2026-04-27 — D176** **Emitted shared-store SQLite session bridge option.**
`emit-hono` and `emit-fastify` runtime templates now accept
`CHRYSALIS_SESSION_SQLITE_PATH`, storing session payloads in
`chrysalis_sessions` (`sid`, `payload`, `updated_at`) while preserving current
memory/file fallback behavior. Deterministic verify defaults are unchanged when
the env var is unset.
- **2026-04-27 — D177** `**mysqli_stmt::get_result()` mysqlnd fallback behavior.**
Oracle PHP now preserves pending SELECT capture when `get_result()` returns
`false` on mysqlnd-less runtimes, allowing a later `store_result()` call to
emit `sql.query` instead of dropping the statement trace.
- **2026-04-27 — D178** **Emitted Redis session bridge option.**
`emit-hono` / `emit-fastify` session runtimes now support
`CHRYSALIS_SESSION_REDIS_URL` (`chrysalis:sess:<sid>` keys) in addition to
sqlite/file/memory stores, enabling shared session state in multi-host
chimera/cutover setups while keeping default deterministic verify behavior.
- **2026-04-27 — D179** **Session bridge release-policy CI gate lane.**
Adds `scripts/ci-gates.mjs` command `session-bridge-release` and
root script `release-gate:session-bridge` so deploy lanes can enforce explicit
backend posture (`CHRYSALIS_SESSION_BRIDGE_MODE`) before cutover. In strict
mode (default), backend mode must be set; multi-host topology requires
`redis` + `CHRYSALIS_SESSION_REDIS_URL`; memory mode is blocked unless
explicitly allowed (`CHRYSALIS_ALLOW_MEMORY_SESSION_RELEASE=1`).
- **2026-04-27 — D180** `**mysqli` `MYSQLI_USE_RESULT` row-count semantics.**
Oracle PHP `MySQLi::query()` now treats unbuffered `MYSQLI_USE_RESULT`
select row counts as unknown-at-capture (`rowCount: 0`) and avoids reading
`num_rows` before the app drains the cursor. Buffered `MYSQLI_STORE_RESULT`
behavior (row payload capture + `data_seek(0)` rewind) remains unchanged.
- **2026-04-27 — D181** **Composer autoload-aware vendor call-effect depth.**
`buildCallEffectMap` now ingests vendor helpers from Composer metadata
(`autoload.files`, `autoload.psr-4` dirs) in addition to recursive
`vendor/**/*.php` fallback. This closes vendor helper gaps where autoloaded
helper files use non-`.php` extensions while preserving sound widening.
- **2026-04-27 — D182** **Confidence-preserving callable-choice narrowing.**
`effectsReachableWithCallOverlay` now resolves explicit callable choice nodes
(`__ternary`, `??`) for `call_user_func*` and unions only matched branch
targets when fully-resolved; if any branch is unknown/unmapped, it retains
full widening fallback to avoid missed side effects.
- **2026-04-27 — D183** **Milestone 6A — auth-boundary emit holes + migration metrics.**
Emitted handlers record unresolved `data.call` sites with `auth:unresolved call: …`
when the PHP callee matches conservative auth-boundary heuristics (Laravel
`Gate`/`auth`/`csrf`/`Sanctum`/`Passport` class patterns). Flagship
`*-emit-stats.json` includes per-emitter `authHoles`; `residual-legacy.json` adds
`authLegacyRequestPct` and `authEmitHoleMax` parallel to the existing hole-density
index. **Also:** `webir` `tryResolveCallableArrayLiteral` operands are guarded for
strict TypeScript (no `getNode(undefined)`).
- **2026-04-27 — D184** `**chrysalis status` surfaces auth-boundary residual metrics.**
When `reports/migration/residual-legacy.json` includes 6A fields, `chrysalis status`
exposes `migration.authResidualLegacyRequestPct` and `migration.authEmitHoleMax`
in `--json` output and prints the auth density alongside `legacy-req` in the
human-readable migration row.
- **2026-04-27 — D185** **Shared `auth:` tagging for ingest `data.hole` reasons.**
`isAuthBoundaryCallee` and `authTaggedHoleReason` are defined in `@chrysalis/webir`
(`auth-boundary.ts`); ingest runs every hole reason through `authTaggedHoleReason`.
Emit continues to use the same `isAuthBoundaryCallee` for unresolved `data.call`
sites. `facades\gate` and related substrings are included in the heuristic so
Gate-style class paths match without requiring a `::` call site in the reason text.
- **2026-04-27 — D186** **Glayzzle `static` Unknown detail includes variable names.**
Parser-bridge now appends `($a, $b, …)` to the `static variable declaration` text
so token-based `auth:` tagging can see names like `$csrfToken` without changing
the generic static message for every file. A minimal `fixtures/auth-tag-probe` app
and an ingest test assert an end-to-end `data.hole` whose reason starts with
`auth:` when a static uses an auth-adjacent identifier.
- **2026-04-27 — D187** `**countAuthTaggedHoles(module)` + CLI/status surfacing for ingest (6A).**
`@chrysalis/webir` `visit` exports the count of `data.hole` nodes whose
`attrs.reason` starts with `auth:` (same string rule as emit report `authHoles`).
`chrysalis ingest` appends a short parenthetical when non-zero; `chrysalis status --json` adds `migration.coverage.authHoles` and the human migration line includes
`N auth-tagged` when `N > 0`.
- **2026-04-27 — D188** **Milestone 6A “real” success bar: flagship auth replay + ingest trend hook.**
`verify-flagship-laravel-min.mjs` and `verify-flagship-laravel-full.mjs` now
re-apply `VERIFY_THRESHOLD` to a fixed **auth-boundary** route slice of the oracle
report (login / session identity / logout in each pilot) in addition to the
aggregate gate, and fail if required routes are missing from the captured corpus.
Both verify scripts embed **ingest** `{ holes, authHoles }` in emit-stats JSON;
`residual-legacy.json` gains `**authIngestHoleMax`** (paired with existing emit-side
`**authEmitHoleMax**`) so dashboards can track ingest-vs-emit auth-hole closure over
releases; `chrysalis status` surfaces `**migration.authIngestHoleMax**` when present.
- **2026-04-27 — D189** **Milestone 6A charter widening — Laravel-first auth stack ownership.**
**Previously**, flagship procedural/session pilots (D188) anchored correctness gates while
broader bullets (CSRF rotation semantics, Gate/MFA/OAuth) read like aspirations without an
explicit widening boundary.
**Now**, Milestone **6A owns** the Chrysalis adoption path for **first-party Laravel-shaped**
authentication and authorization surfaces **when oracle-backed**: session-bound login flows,
`**Gate` / policies / `Authorization`**, Sanctum / Passport / PAT tokens as emitted sites or
`**auth:` holes**, **Fortify / Breeze scaffolding hooks**, and **OAuth/OAuth2/Socialite**
redirect/token exchanges — always **through WebIR**, never compat-default shortcuts. Anything not
lowered yet stays an `**auth:`-labeled hole** or unresolved `**auth:` emit call**, tracked beside
ingest `**authIngestHoleMax`** for closure trending.
**Still excluded:** translations **without** oracle-attested emitted handlers (DESIGN §3),
silent guessing on MFA/crypto ceremonies, and proprietary middleware **without** a reproducible
NDJSON corpus (customers may attach corpora to bring those surfaces **into** scope case-by-case).
- **2026-04-27 — D190** **Flagship oracle probes for `Gate` + Sanctum/OAuth-shaped callees.**
`**laravel-min**` adds `**GET /gate-probe**` (and `?m=deny`) backed by a tiny
`Illuminate\Support\Facades\Gate` stub so the PHP oracle captures `**allows`/`denies**` static
calls before ingest. `**laravel-full/chrysalis-templates**` adds `**GET /chrysalis-auth-probe**`
returning JSON from stub `**Laravel\Sanctum\NewAccessToken::probe**` and
`**League\OAuth2\Client\GenericProvider::probe**`. Both flagship verify scripts pin response shapes;
`**milestone-6a-auth-verify-gate.mjs**` includes the new routes in the Milestone 6A replay slice.
**Ingest** lowers these calls to deterministic WebIR (`Gate::{allows,denies}` → string equality on the
committed probe ability names; the two `::probe()` methods → literals) so dual-emit stays hole-free.
- **2026-04-27 — D191** `**json_encode` + associative PHP arrays in WebIR.**
Single-argument `**json_encode($v)**` lowers to `**data.call` `json_encode**`; **emit** maps to
`**JSON.stringify**`. PHP **array literals** whose entries all use **string literal** keys lower to
`**__object_literal**` (flat `key`, `value` operand pairs); unkeyed list entries still use
`**__array_literal**`. Mixed key styles (or non-string-literal keys) become an **ingest hole**
(`array: mixed or non-string-literal keys`) so we do not silently mis-translate. The flagship
`**chrysalis-auth-probe**` handler again uses idiomatic `**return json_encode([ "k" => … ]);**`
(D190’s string-concat workaround is superseded).
- **2026-04-27 — D192** **Socialite + Fortify shaped `::probe()` on `chrysalis-templates`.**
Adds `**GET /chrysalis-socialite-fortify-probe**` with committed stubs
`**Laravel\Socialite\Facades\Socialite::probe**` and `**Laravel\Fortify\Fortify::probe**`
returning fixed strings. **Ingest** lowers both to string **literals** (same pattern as D190
Sanctum/OAuth probes) so dual-emit stays hole-free; **verify-flagship-laravel-full** pins the JSON
body; **milestone-6a-auth-verify-gate** includes the route in the auth slice.
- **2026-04-27 — D193** **Glayzzle `throw` + `new` (unqualified) through WebIR to emit.**
Parser schema **0.1.3** adds `**Throw**` statements and `**New**` expressions (`new` with a
`name` target only; dynamic `new $x` stays `UnknownExpr`). **Ingest** lowers `**throw**`
to `**data.call` `__throw**` (same terminal family as `**__return**` / `**__exit**`) and
`**new Foo(…)**` with identifier segments to `**__new**` with a string **literal** class name
operand (see **D194** for FQN). **Emit** maps `**__throw**` to `**throw …;**` and `**__new**`
to `**new ClassName(…)**` when the first operand is a single-segment literal. **Verify**
attribution treats `**__throw**` like `**__return**` for status/body heuristics. Fixture
`**fixtures/throw-new-probe**` exercises the three routes.
- **2026-04-27 — D194** **FQN / multi-segment `new` — WebIR `__new`, emit `phpFqnNew`, runtime hole.**
**Ingest** no longer emits an ingest **hole** for valid PHP class names with two or more
segments joined by `\\` (each segment a normal PHP identifier). The first `**__new**`
operand remains a **string literal** holding the full FQN. **Emit** keeps direct
`**new Ident(…)**` for a **single** segment; for FQN it emits `**phpFqnNew**` with the
FQN string literal and ctor args
and sets `**usesPhpFqnNew**` so generated handlers import `**phpFqnNew**` from runtime.
`**phpFqnNew**` delegates to `**__hole(`new:`+ fqn with→`.`)** so translation stays compiling and observable; there is still no static TypeScript class for an arbitrary PHP namespace. **Dynamic` new $x`** remains **`UnknownExpr`** / unsupported; **class registry** wiring for **`phpFqnNew`** remains future work.
- **2026-04-27 — D195** `**nikic/php-parser` subprocess provider (`provider: "nikic"`).**
`**packages/parser-bridge*`* uses Composer `**nikic/php-parser**`; `**php/dump-nikic-ast.php**` prints
`**json_encode**` of the Stmt array (stdin mode `-` for `**parseSource**`). `**providers/nikic-json.ts**`
maps `**nodeType**` JSON to canonical `**PhpAst**` (parallel to `**glayzzle**`). `**Expr_ConstFetch**`
for `**null` / `true` / `false**` lowers like glayzzle keyword literals. `**vendor/**` is not committed;
CI runs `**composer install**` in `**packages/parser-bridge**` before `**pnpm**` tests so `**nikic**`
parity specs run.
- **2026-04-27 — D196** **Ingest + CLI parser-provider wiring (`--parser-provider`).**
`**@chrysalis/ingest`** adds `**IngestOptions.parserProvider**` / `**IngestFileOptions.parserProvider**`
and threads the provider through route parsing plus `**buildCallEffectMap**` (lib/vendor/route helper scans).
CLI commands that ingest source (`**ingest**`, `**emit**`, `**verify --project**`, `**repair**`,
`**insight**`, `**rewrite**`, `**status --project**`) accept `**--parser-provider glayzzle|nikic**`.
Default remains glayzzle for stability and zero-PHP setup; nikic is opt-in and explicitly exercised
by ingest integration tests when parser-bridge vendor deps are present.
- **2026-04-28 — D197** **Close two Milestone-2 depth gaps: corpus-gated N+1 rewrite + FQN ctor bridge.**
(1) **Rewrite gating:** `batch-n1-read` now requires corpus confirmation (`corpusConfirmations>=1`
or `observedMaxPerRequest>=2`) before it applies, enforcing the intended corpus-backed confidence
model for high-impact SQL rewrites. Structural shape still must match (`row-or-null`, one `?`,
foreach member param, SQL lookup form). (2) **FQN runtime bridge:** emitted runtimes expose
`registerPhpFqnCtor(fqn, ctor)`; `phpFqnNew` first checks that registry, then falls back to hole
delegation. This keeps default-safe behavior while allowing projects to close specific FQN holes
without custom emitter forks.
- **2026-04-28 — D198** **Model dynamic class construction (`new $x(...)`) end-to-end.**
Parser providers now produce canonical `**NewDynamic`** when `new` targets a non-name class
expression (keeping anonymous classes as unsupported holes). Ingest lowers this to
`**__new_dynamic(classExpr, ...args)**` instead of a generic unknown hole. Emit lowers
`__new_dynamic` to runtime `**phpDynamicNew**`, and emitted runtimes resolve the class
expression through the existing constructor registry when it is a string, otherwise delegating
to hole `new:dynamic`. This preserves safety-by-default while letting adopters close dynamic
constructor gaps without backend-specific emitter forks.
- **2026-04-28 — D199** **Expose dynamic-constructor debt in status dashboards.**
`chrysalis status --project ...` now computes top ingest hole reasons and explicitly reports
`new:dynamic` hole count. JSON output includes `residualLegacy.topHoleReasons` and
`residualLegacy.dynamicNewHoleCount` so CI and migration dashboards can track dynamic
constructor closure as a first-class KPI rather than an undifferentiated hole total.
**D199b:** `residualLegacy.dynamicNewWebIrCount` counts WebIR `data.call` sites with callee
`__new_dynamic` (the normal ingest lowering for `new $x(...)`), distinct from rare ingest
holes whose reason begins with `new:dynamic`.
- **2026-04-28 — D200** **Corpus-gated `parameterize-sql` + trace boost for `raw-sql-concat`.**
High-impact SQL rewrites stay corpus-backed: `parameterize-sql` applies only when
`corpusConfirmations>=1` or `observedMaxPerRequest>=2`, matching `batch-n1-read`.
`boostRawSqlConcat` attaches those fields when oracle traces on the opportunity route include
at least one `sql.query` event (per-trace SQL counts feed `observedMaxPerRequest`). Insight
with `--traces` therefore supplies evidence automatically; tests may inject evidence explicitly.
- **2026-04-28 — D201** **Corpus-gated `sanitize-output` + oracle footprint `dynamicNewCount`.**
XSS sanitization rewrites match other high-impact passes: `sanitize-output` applies only when
`corpusConfirmations>=1` or `observedMaxPerRequest>=2`. Static oracle footprint (`computeOracleFootprint`)
counts `**data.call`** sites with callee `**__new_dynamic**` per route (`dynamicNewCount`), bumps hydration weight,
and CLI JSON/report aggregates `**routesWithDynamicNew**` so migration dashboards surface dynamic-constructor
debt alongside replay hydration hints.
- **2026-04-28 — D202** **Stronger default oracle redaction + verify replay throughput hook.**
`**DEFAULT_REDACTION`** expands coverage for common web leaks (API key / auth-token headers, Laravel
and framework session cookies, CSRF-shaped POST fields, OAuth-ish query params, `response.headers.set-cookie`)
while keeping `**packages/oracle-php/src/Redactor.php**` in lockstep with `packages/oracle/src/redaction.ts`.
`**replayCorpus**` accepts optional `**concurrency` > 1** only when `**disableCookieChain: true`**, using an
isolated cookie jar per trace and returning outcomes in chronological order — safe for stress corpora
without cross-request session coupling; default remains sequential for the common cookie-chained case.
- **2026-04-28 — D203** `**sql.row.<field>` redaction for SELECT row captures.**
Oracle `**sql.query`** events may include `**rows**` (bounded assoc payloads). Default rules now
**hash or mask** common high-risk **column names** (`password`, `token`, `api_key`, …) at capture time
in   `**Redactor.php`**, with the same paths in `**DEFAULT_REDACTION**` for config parity. **Bind
`params` are not blanket-redacted** so recorded-SQL replay and tape semantics stay usable; optional
targeted `**sql.params[...]`** bind rules ship in **D205**.
- **2026-04-28 — D204** **CLI wiring for verify/repair replay throughput and timeouts.**
`**chrysalis verify`** and `**chrysalis repair**` accept `**--replay-concurrency**`, `**--disable-cookie-chain**`,
and `**--replay-timeout-ms**`, with env aliases `**CHRYSALIS_VERIFY_REPLAY_CONCURRENCY**`,
`**CHRYSALIS_VERIFY_DISABLE_COOKIE_CHAIN**`, `**CHRYSALIS_VERIFY_TIMEOUT_MS**` so CI scripts can scale
independent-trace replay without forking ad-hoc Node drivers.
- **2026-04-28 — D205** **Targeted `sql.params[driver:prefix].index` redaction in oracle-php + CI root build.**
`**Redactor.php`** now evaluates rules whose path matches `**sql.params[<driver>:<sqlPrefix>].<index>**`
against each `**sql.query**` event’s `**params**` list: optional `**driver**` wildcard (`*`), case-insensitive
SQL **prefix** match (non-empty prefix required), `**drop`** coerced to `**mask**` so positional bind counts stay
stable for SQL tape replay. `**packages/oracle/src/redaction.ts**` documents the grammar (DEFAULT remains
conservative — operators opt in to bind rules). CI runs `**pnpm exec tsc -b --force**` at the repo root so the
solution `**tsconfig.json**` stays green alongside `**pnpm -r typecheck**`.
- **2026-04-28 — D206** **Mutation-only DEFAULT bind redaction + worker-thread verify opt-in.**
`**Redactor.php`** applies `**sql.params[...]**` rules only when `**rowShape**` is empty so SELECT binds that
participate in `**x-chrysalis-sql-tape**` `**paramsMatch**` stay bit-accurate; `**DEFAULT_REDACTION**` adds one
narrow rule (`**UPDATE users SET password**` bind index 0). `**replayCorpus**` may use `**worker_threads**`
(`**workerThreads: true**`) when `**concurrency` > 1**, `**disableCookieChain`**, global `**fetch**` (no injected
`**fetch**` / `**onRequest**`), **no** `**module`**, and built `**replay-worker.js**` exists — intended for remote
`**chrysalis verify --base-url**` throughput; `**chrysalis repair**` forces `**workerThreads: false**` (always needs IR).
- **2026-04-28 — D207** `**replay-worker.js` resolution for TypeScript test runs.**
`**replayCorpus`** looks for `**replay-worker.js**` next to `**replay.js**`, then `**../dist/replay-worker.js**`
relative to `**src/replay.ts**`, so Vitest and `**tsx**` can exercise `**workerThreads**` after `**pnpm build**`
without requiring `**replay-worker.ts**` beside `**replay.ts**`.
- **2026-04-28 — D208** `**chrysalis.observe.json` merges onto default redaction.**
`**loadObserveConfig`** previously treated a present file as a full replacement, so minimal
fixtures (for example a single `request.headers.cookie` rule) dropped the rest of
`**DEFAULT_REDACTION**`. File rules now **layer**: default order and paths stay, matching paths
take the file's `**kind`**, and extra file-only paths append. Trace header redaction hashes change
for projects that relied on the old replace semantics.
- **2026-04-28 — D209** **Strict `chrysalis.observe.json` validation + dev hook for nikic vendor.**
`**loadObserveConfig`** now rejects invalid JSON, non-object roots, bad `**redaction**` / `**rules**`
shapes, and entries with supported `**kind**` but missing / empty `**path**` (unknown kinds remain
skipped). Errors include the absolute config path. `**chrysalis observe**` catches failures and exits
**2** with `**[observe]`** stderr. Root `**pnpm run vendor:parser-bridge**` runs `**composer install**`
in `**packages/parser-bridge**` so local Vitest can run **nikic** parity tests; `**pretest`** (`**scripts/ensure-parser-bridge-vendor.mjs**`) runs automatically before `**pnpm test**` when `**vendor/**` is missing and Composer is on `**PATH**` (CI relies on this instead of a duplicate workflow step). `**CHRYSALIS_SKIP_PARSER_VENDOR=1**` skips the hook; `**pnpm exec vitest run**` bypasses `**pretest**` entirely.
- **2026-04-28 — D210** **UTF-8 BOM tolerance for `chrysalis.observe.json` + explicit Composer in CI.**
`**loadObserveConfig`** strips a leading `**U+FEFF**` before `**JSON.parse**` so editor-saved UTF-8-with-BOM
configs do not fail spuriously. `**typecheck-and-test**` sets `**tools: composer:v2**` on `**setup-php**`
so `**pretest**` vendor install is not dependent on the runner image’s default Composer layout.
- **2026-04-28 — D211** **Multi-lane program (co-designed).** Chrysalis advances on four parallel tracks —
**parser contract** (glayzzle default vs **nikic** opt-in, parity and CI honesty), **oracle depth**
(broader PHP/DB capture without weakening redaction or replay semantics), **verify UX** (operator-facing
failure clarity, narrow replay, large-corpus ergonomics), and **hole economics** (clustered visibility into
ingest/emit/auth/dynamic-new debt tied to `status` and sidecars). Work is intentionally **sharded into
waves** with explicit dependencies (see `**ROADMAP.md`** “Multi-lane program”); no single release pretends
to close all four lanes at once.
- **2026-04-28 — D212** **Verify UX: divergence histogram + actionable footer.** `**@chrysalis/verify`**
exports `**divergenceKindHistogram**` / `**failedTraceCount**` on `**CorrectnessReport**`. `**chrysalis verify**`
prints an absolute `**summary.json**` path on every run, a per-kind failure tally when any trace fails,
and **next steps** (open summary, example `**repair`** line when `**--project**` was passed, otherwise a
`**--project**` attribution hint). Threshold failures also repeat the summary path on stderr.
- **2026-04-28 — D213** **Wave-1 multi-lane slice: verify narrowing + nikic CI signal + migration debt script.**
`**ReplayOptions`** gains `**onlyRoute**` (exact `METHOD path` key) and `**onlyTraceId**`; `**replayCorpus**`
filters before ordering and throws if filters are set but match zero traces. `**chrysalis verify**` wires
`**--only-route**` / `**--only-trace-id**` and maps CLI errors to exit **2**. `**chrysalis repair`** does
**not** expose these flags: the verified repair gate still requires full-corpus replay for acceptance.
CI `**typecheck-and-test`** runs `**pnpm run vendor:parser-bridge**` then **nikic** Vitest alone so parity
cannot hide inside the aggregate suite. Root `**pnpm run migration-debt`** runs `**scripts/migration-debt.mjs**`
(wraps `**chrysalis status --json**`) for a compact debt summary.
- **2026-04-28 — D214** **Lane B — mysqli CI smoke against live MySQL.** `**typecheck-and-test`** runs a
**MySQL 8.0** service container and `**php packages/oracle-php/tests/mysqli_capture_smoke.php`** with
`**CHRYSALIS_MYSQLI_SMOKE=1**`. The script uses a minimal `**Recorder**` harness (no full HTTP bootstrap),
connects with `**Chrysalis\Oracle\Db\MySQLi**`, runs `**query()**` plus `**prepare` / `bind_param` /
`execute` / `get_result()**`, then asserts the NDJSON trace contains at least two `**sql.query**` events
with `**driver: "mysqli"**` and a bound `**params**` snapshot for the prepared SELECT. The script exits
**0** with a skip message when the env flag is unset so local `**pnpm test`** is unchanged. PHP is built
with `**mysqli**` explicitly enabled in CI for this step.
- **2026-04-28 — D215** **Multi-lane Wave 1 closure (operator + ingest + parser honesty).** `**fixtures/mysqli-probe`**
documents mysqli-backed `**lib/db.php**` while route files keep the same `**query_*` / `exec_sql**` helper
names as `**fixtures/tiny-blog**`, so ingest `**effect.db.query**` tags stay stable without PDO. `**scripts/migration-debt.mjs**`
accepts `**--json-out <path>**` / `**--json-out=<path>**` and writes a compact JSON snapshot (`**generatedAt**`, corpus,
correctness, residual/migration slices, oracle route count) for CI or local trend scripts. `**@chrysalis/verify**`
README gains a **Replay environment** table (`**CHRYSALIS_VERIFY_*`** ↔ CLI flags); `**chrysalis verify**` repeats that
pointer on threshold failure stderr. Parser-bridge **nikic** Vitest adds `**fixtures/mysqli-probe/pages/smoke.php`**
strip-pos parity against glayzzle.
- **2026-04-28 — D216** **Wave 2 — `db()->query` ingest + economics/verify polish.** Ingest lowers `**db()->query(...)`**
(literal or dynamic SQL, optional extra operands for mysqli result modes) to `**effect.db.query**` only when the
receiver is a `**db()**` call — arbitrary `**$x->query**` stays unchanged. `**fixtures/mysqli-probe**` adds
`**GET /widgets/db-query**` exercising the pattern next to `**query_one**`. CI `**typecheck-and-test**` runs
`**migration-debt --json-out reports/ci/migration-debt.json**` after tests and uploads it as `**migration-debt-json**`.
Parser-bridge **nikic** Vitest adds strip-pos parity on `**fixtures/mysqli-probe/lib/db.php`**.   `**chrysalis repair**`
stderr on failure points at `**packages/verify/README.md**` (full-corpus replay; no narrow filters).
- **2026-04-28 — D217** **Wave 2 closure — alias `db()` receivers + verify/migration-debt polish.** Ingest tracks
`**$v = db()`** assignments and treats `**$v->query(...)**` like `**db()->query(...)**` when `**$v**` is in the
current alias set; `**If**` / `**Foreach**` fork alias sets per branch and union-merge (over-approximate for
effects). `**fixtures/mysqli-probe**` adds `**GET /widgets/alias-query**`. `**chrysalis verify**` prints one
summary line per route on stdout; per-trace divergence detail lines move to stderr under `**[verify] stderr:**`
when `**failedFrames > 0**`. `**scripts/migration-debt.mjs**` accepts `**--max-holes N**` and
`**--min-correctness <0..1>**` (exit **4** on breach or missing required JSON fields). Parser-bridge **nikic**
Vitest adds strip-pos parity on `**pages/direct_query.php`** and `**pages/alias_query.php**`; `**packages/cli/tests/migration-debt-gates.test.ts**`
covers `**--max-holes**` / `**--min-correctness**`. CI `**typecheck-and-test**` enforces `**--max-holes 0**` on **tiny-blog** and `**--max-holes 5`** on **mysqli-probe**; `**verify-e2e`** enforces `**--max-holes 0**` + `**--min-correctness 1**` on **tiny-blog** after `**verify-tiny-blog.mjs`** (uses `**--report reports/verify**`).
- **2026-04-28 — D218** **Lane B — explicit hole for untracked `->query`.** Method calls `**$recv->query(...)`** where the callee is a `**PropertyFetch**` named `**query**` and `**tryLowerDbFactoryQueryCall**` does not apply (receiver is not `**db()**` or a `**db()**`-aliased variable) become `**data.hole**` with reason `**legacy:db-query-unknown-receiver**` instead of the generic `**call:expr**`, so reports and `**chrysalis status**` attribute residual debt accurately. `**fixtures/db-query-unknown-receiver-probe**` uses `**new SQLite3**` (untracked); `**packages/ingest/tests/db-query-unknown-receiver.test.ts**` locks the reason string.
- **2026-04-28 — D219** **Lane B — mysqli connection aliases.** Assignments `**$v = new mysqli(...)`** (class name `**mysqli**` or FQN ending in `**\\mysqli**`) and `**$v = mysqli_connect(...)**` add `**$v**` to the same alias set as `**$v = db()**`, so `**$v->query(...)**` lowers to `**effect.db.query**`. `**fixtures/mysqli-probe**` adds `**GET /widgets/mysqli-new-query**`; the unknown-receiver negative probe later uses `**new SQLite3**` (**D218** / **D221**).
- **2026-04-28 — D220** **Lane B — copy alias for DB receivers.** `**$b = $a`** adds `**$b**` to the tracked receiver set when `**$a**` is already tracked (same sequential + `**if` / `foreach**` merge as other aliases). `**fixtures/mysqli-probe**` adds `**GET /widgets/alias-copy**` (`**$a = db(); $b = $a; $b->query(...)**`). CI `**mysqli-probe**` `**--max-holes**` ceiling tracks ingest debt (see **D221**).
- **2026-04-28 — D221** **Wave 3 — PDO receivers + parser parity + verify stderr.** Ingest tracks `**$v = new PDO(...)`** like `**mysqli**` for `**$v->query**` lowering (`**isPdoClassName**`). `**fixtures/mysqli-probe**` adds `**GET /widgets/pdo-query**`; the unknown-receiver negative probe switches to `**new SQLite3**`. `**fixtures/parser-parity-probe**` holds coalesce + nested-array snippets with **nikic** strip-pos parity. `**chrysalis verify`** sends failed-frame counts, divergence-kind histogram, and next-step hints to **stderr** under `**[verify] stderr: failure diagnostics`**, then per-trace lines under `**[verify] stderr: per-trace divergences**`; **stdout** stays aggregate + per-route summaries.
- **2026-04-28 — D222** **Lane C — `verify --json-summary`.** `**chrysalis verify ... --json-summary`** routes progress to **stderr** and prints one JSON object on **stdout** with `**kind: "chrysalis.verify.summary"`**, `**aggregate**`, `**endpoints**`, `**divergenceKinds**`, `**failedFrameCount**`, `**failedTraceCount**`, `**pass**` (vs `**threshold**`), and paths. Human tables and duplicate stderr divergence listings are suppressed so `**jq**` / CI can consume **stdout** only. Threshold failure still exits **1** and prints the replay README pointer on **stderr**.
- **2026-04-28 — D223** **Lane C + D — JSON summary contract + ingest gate.** `**--json-summary`** stdout adds `**schemaVersion: 1**` (increment when fields are renamed or meanings change) and `**toolVersion**` from the repo root `**package.json**` `**version**` (fallback `**0.0.0**`). `**packages/cli/tests/verify-json-summary.test.ts**` locks the shape. CI `**migration-debt**` adds `**--max-holes 1**` on `**fixtures/db-query-unknown-receiver-probe**` (expected single `**legacy:db-query-unknown-receiver**` hole); `**migration-debt:gate:ingest**` includes the same.
- **2026-04-28 — D224** **Lane B — manifest-declared DB factory returns.** `**chrysalis.routes.json`** may include `**dbFactoryReturnCallees**`: normalized callee labels (`Class::method` or global function) the project **declares** return a connection whose `**->query`** may lower to `**effect.db.query**`. Assignments `**$v = DeclaredFactory::getConnection()**` add `**$v**` to the same alias set as `**db()**`; `**DeclaredFactory::getConnection()->query(...)**` chains are accepted when the static call label is listed. No PHP body analysis — omission keeps `**legacy:db-query-unknown-receiver**`. `**fixtures/mysqli-probe**` adds `**DbFactory::getConnection**`, `**factory_query**`, `**factory_query_chain**`; `**packages/ingest/tests/db-factory-manifest.test.ts**` locks positive and negative behavior.
- **2026-04-28 — D225** **Lane B + A — Laravel-shaped FQN callees in a probe fixture.** `**fixtures/laravel-shaped-db-factory-probe`** documents three manifest strings used in real stacks: `**Illuminate\Support\Facades\DB::connection**`, `**App\Database\Support\Conn::make**`, `**ChrysalisProbe\Repo::db**` (minimal `**lib/**` classes, not a full framework). `**lib/pdo_probe_schema.php**` creates `**probe_row**` in `**sqlite::memory:**` so handler SQL is valid at PHP runtime. Handlers use `**FROM probe_row**` so `**guessTables**` tags `**db.read:probe_row**`. Ingest + `**migration-debt --max-holes 0**` CI gate; **nikic** strip-pos parity on the four page files.
- **2026-04-28 — D226** **Lane D — `migration-debt --json-out` contract.** `**scripts/migration-debt.mjs`** `**--json-out**` embeds `**kind: "chrysalis.migration-debt.summary"**`, `**schemaVersion: 1**`, and `**toolVersion**` (repo root `**package.json**`, fallback `**0.0.0**`) alongside `**corpus**`, `**correctness**`, `**residualLegacy**`, `**migration**`, `**oracleFootprintRouteCount**`. CI artifact `**reports/ci/migration-debt.json**` gains the same fields for `**jq**` / dashboards. `**packages/cli/tests/migration-debt-json.test.ts**` locks `**kind**` and `**schemaVersion**`.
- **2026-04-28 — D227** **Documentation — machine-readable JSON index.** Root `**README.md`** adds a table linking `**status --json**`, `**verify --json-summary**`, and `**migration-debt --json-out**` with contract notes. `**packages/cli/README.md**` documents `**scripts/migration-debt.mjs**` flags and `**verify --json-summary**` top-level keys. `**packages/verify/README.md**` adds a `**--json-summary` field reference** table. `**@chrysalis/ingest`** re-exports `**normalizeDbFactoryCalleeLabel**` alongside `**dbFactoryReturnCalleeSet**` / `**loadRouteManifest**` and lists both helpers in `**packages/ingest/README.md**`.
- **2026-04-29 — D228** **Lane C — dual-backend verify machine artifact in CI.** `**scripts/verify-tiny-blog.mjs`** now writes `**reports/ci/verify-e2e-summary.json**` with `**kind: "chrysalis.verify.summary.dual"**`, `**schemaVersion: 1**`, `**toolVersion**`, replay metadata, pass/fail bit, and per-backend aggregate/endpoint payloads sourced from the same in-process replay reports. CI `**verify-e2e**` artifact upload now includes this JSON next to `**reports/verify**` so dashboards can consume verify output without parsing logs or replaying twice.

- **2026-04-29 — D229** **Lane C — flagship dual-backend verify machine artifacts in CI.** `**scripts/verify-flagship-laravel-min.mjs`** now writes `**reports/ci/verify-flagship-laravel-min-summary.json**`, and `**scripts/verify-flagship-laravel-full.mjs`** writes `**reports/ci/verify-flagship-laravel-full-summary.json**`. Both use `**kind: "chrysalis.verify.summary.dual"**`, `**schemaVersion: 1**`, `**toolVersion**`, pass/fail status, and per-backend replay summary payloads from the same verify runs. CI artifact uploads for flagship verify jobs now include these JSON files alongside verify and migration reports.

- **2026-04-29 — D230** **Lane C + docs — enforce dual-summary contracts in CI.** `**scripts/ci-gates.mjs`** adds **`verify-dual-summary`** to validate `**kind`**, `**schemaVersion`**, required top-level fields, exactly **`hono`** + **`fastify`** backend rows (including **`corpusRoot`**, **`pass`**, **`summaryPath`**, **`aggregate.correctness`**, **`endpoints[]`**, **`failedFrameCount`**), with optional profile pinning via **`CHRYSALIS_VERIFY_DUAL_PROFILE`**. CI runs this gate for tiny-blog, laravel-min, and laravel-full summary JSON outputs. `**packages/cli/tests/verify-dual-summary-gate.test.ts**` locks the gate contract and profile mismatch behavior. Root **`package.json`** exposes **`pnpm run ci:verify-dual-summary`** (optional path: **`pnpm run ci:verify-dual-summary -- <file>`**). Missing summary paths fail with **`verify-dual-summary: summary file missing`** (resolved path + hint) instead of an uncaught **`ENOENT`** stack. **`JSON.parse`** failures surface as **`verify-dual-summary: invalid JSON`** with path and the parser message; other read errors use **`verify-dual-summary: could not read`**. Root and CLI READMEs list the dual-summary artifact files, gate, and local command.

- **2026-04-29 — D231** **Lane C — shared JSON artifact reads in `ci-gates`.** `**readJsonGateArtifact**` centralizes resolved-path missing-file messages, **`SyntaxError`** (**`invalid JSON`**), and generic read failures for file-backed gates (**`tiny-n1-insight`**, **`rewrite-pre-xss`**, **`tiny-n1-rewrite`** report JSON, **`confidence-5nines`**, **`confidence-trend`** post-warmup, **`confidence-trend-ready`**, **`verify-dual-summary`**, **`migration-sidecar-floors`** sidecar JSON when env floors are set). **`status-migration`** wraps stdin **`JSON.parse`** with **`status-migration: invalid JSON on stdin`**. **`confidence-trend`** missing-file diagnostics use **`resolve(path)`** for consistent absolute paths. `**packages/cli/tests/ci-gates-json-artifacts.test.ts**` covers missing files, invalid JSON (insight, 5nines, trend-ready, both sidecars), **`migration-sidecar-floors`** missing **`idiomaticity.json`** or **`residual-legacy.json`** when the corresponding floor env is set, skip-when-unset, **`confidence-trend`** warmup vs strict missing-file, **`tiny-n1-rewrite`** missing report JSON, and **`status-migration`** stdin parse failures; root **`package.json`** adds **`ci:*`** gate shims (**`ci:migration-sidecar-floors`** included). **`README.md`**, **`AGENTS.md`**, and **`packages/cli/README.md`** distinguish **`pnpm run ci:insight`** (insight + gate) from **`pnpm run ci:tiny-n1-insight`** (gate only).

- **2026-04-30 — D232** **Documentation + v1.0.0 source release.** **`docs/`** adds **`INSTALLATION.md`**, **`OPERATIONS.md`**, **`ADMINISTRATION.md`**, **`RELEASE.md`**, and an index **`README.md`**. Root **`LICENSE`** (MIT), **`SECURITY.md`**, **`CHANGELOG.md`**, and **`CONTRIBUTING.md`** land for operator and contributor expectations. **`scripts/make-release-artifacts.mjs`** + **`pnpm run release:artifacts`** emit **`git archive`** **`.tar.gz`** / **`.zip`** under **`release/`** (gitignored). Root and workspace **`package.json`** versions align at **`1.0.0`**; root gains **`repository`**. **`README.md`** status reflects the first tagged release while keeping cross-cutting roadmap honesty. **`.github/workflows/release.yml`** (tag **`v*.*.*`**) uploads archives and creates a GitHub Release with **`gh`**.

- **2026-04-30 — D233** **Program management — GitHub Project (v2) bootstrap.** **`docs/GITHUB_PROJECT.md`** documents creating a linked **GitHub Project**, **`gh auth refresh -s project,read:project`**, and post-bootstrap views. **`scripts/bootstrap-github-project.mjs`** + **`pnpm run github:project-bootstrap`** create or reuse a **`Chrysalis`** project, **`gh project link`** to the GitHub repository, and add **`Lane`** / **`Board status`** single-select fields aligned with **`ROADMAP.md`** multi-lane + release ops. **`docs/RELEASE.md`** points maintainers at the project playbook after **`v1.0.1`**.

- **2026-04-30 — D234** **CI — idempotent GitHub Release assets.** **`.github/workflows/release.yml`** sets **`GH_REPO`**, runs under **`bash`** with **`pipefail`**, and when **`gh release view <tag>`** succeeds, uploads archives with **`gh release upload --clobber`** instead of always calling **`gh release create`** (avoids HTTP 422 duplicate-release failures on workflow retries or pre-created releases).

- **2026-04-29 — D235** **Patch release v1.0.1 (install + ops docs).** Root and workspace **`package.json`** versions bump to **`1.0.1`**. **`docs/INSTALLATION.md`** gains **Installing from a release tarball** (unpack, **`pnpm install`**, **`pnpm -r build`**, **`pnpm test`**). **`CHANGELOG`**, **`README`**, **`ROADMAP`**, **`docs/RELEASE.md`**, and **`docs/GITHUB_PROJECT.md`** track the tag; **`git archive`** artifacts are **`chrysalis-1.0.1-source.{tar.gz,zip}`** via **`pnpm run release:artifacts`** on tag **`v1.0.1`**.

- **2026-04-29 — D236** **Chrysalis 2.0 charter — scale without drifting the thesis.** **`ROADMAP.md`** adds **Road to Chrysalis 2.0** with milestones **V2-M1** (partitioned verify + merged machine reports), **V2-M2** (resumable / incremental ingest + shard boundaries), **V2-M3** (multi-host oracle + corpus ops), **V2-M4** (emit layout + build scalability), **V2-M5** (multi-instance chimera + %-traffic canary), optional **V2-M6** (fleet aggregation of status/verify JSON). Scale work must remain **measurable** (fixtures, budgets, CI gates) and must **not** relax **`DESIGN.md` §3**: behavioral oracle as spec, WebIR as the IR product, verify as the ship gate, typed holes for partial translation, injected **`ctx`** for determinism, provenance on generated surfaces. **Explicit non-goals:** skipping verify for large repos, TS emit that bypasses WebIR, silent unsupported-construct translation, request-scoped PHP FFI beyond chimera’s request unit.

- **2026-04-29 — D237** **V2-M1 implementation slice — partitioned verify + merge.** **`replayCorpus`** accepts optional **`shardIndex` / `shardCount`** (deterministic filter: **`traceDeterminismSeed(traceId) % K === i`**). **`mergeCorrectnessReports`** merges disjoint **`CorrectnessReport`** payloads; **`buildMergedVerifySummaryJson`** emits **`kind: "chrysalis.verify.summary.merged"`**, **`schemaVersion: 1`**. **`chrysalis verify`** / **`resolveVerifyReplayExtras`** accept **`--shard-index`**, **`--shard-count`**, and **`CHRYSALIS_VERIFY_SHARD_*`**; **`chrysalis verify-merge`** reads shard **`summary.json`** files; **`chrysalis repair`** strips shard fields so repair always replays the **full** corpus. Vitest locks partition-vs-monolithic parity; **`docs/OPERATIONS.md`** and **`packages/verify/README.md`** document the workflow.

- **2026-04-29 — D238** **V2-M1 CI — `verify-merged-summary` gate + e2e artifact.** **`scripts/ci-gates.mjs`** adds **`verify-merged-summary`** ( **`CHRYSALIS_VERIFY_MERGED_MIN_CORRECTNESS`** optional floor). **`verify-tiny-blog.mjs`** writes **`reports/ci/verify-e2e-merged-summary.json`**: K=2 **partition-of-outcomes** smoke vs monolithic Hono replay, or **single-shard fallback** when an empty bucket would break K=2. **`typecheck-and-test`** runs the gate on **`fixtures/ci/verify-merged-summary-smoke.json`**; **`verify-e2e`** runs the gate on the live artifact with **`CHRYSALIS_VERIFY_MERGED_MIN_CORRECTNESS=0.95`**. **`docs/ADMINISTRATION.md`** documents multi-host corpus directory discipline (V2-M3 operator slice).

- **2026-04-29 — D239** **V2-M2 slice — route-level ingest sharding.** **`ingestDirectory`** accepts **`shardIndex` / `shardCount`** and lowers only routes in the deterministic **`routeFileShardBucket(manifestRoute.file)`** bucket; **`buildCallEffectMap(root, manifest.routes, …)`** is unchanged so **`lib/`** / helper widening stays sound (over-approximation). **`chrysalis ingest`** and **`chrysalis emit`** forward **`--shard-index`** / **`--shard-count`**. Same FNV-1a 32-bit mix as verify **`traceDeterminismSeed`** on the relative path string (**`packages/ingest/src/route-shard.ts`**).

- **2026-04-29 — D240** **V2-M3 slice — corpus directory merge.** **`mergeCorpusDirectories`** copies **`YYYY-MM-DD/*.ndjson`** from multiple source roots into one **`readCorpus`**-compatible tree; **`onDuplicate: 'error' | 'skip'`** (first source wins on skip). **`chrysalis corpus-merge`** exposes the workflow. No trace **content** rewriting; operators still own semantic dedupe and sampling until a later milestone.

- **2026-04-29 — D241** **V2-M2 slice — opt-in incremental PHP parse cache.** **`ingestDirectory`** accepts optional **`ingestCacheDir`**; **`loadOrParsePhpAstWithCache`** stores JSON keyed by **SHA-256 of file bytes**, **`parserProvider`**, and **`INGEST_AST_CACHE_VERSION`** (bump when ingest lowering changes without parser output changing). Default remains **no cache** (explicit **`--ingest-cache`** on **`chrysalis ingest` / `emit`**). Preserves parser-accurate AST inputs and **DESIGN §3** determinism (no wall-clock in cache logic).

- **2026-04-30 — D242** **V2-M3 CI — `corpus-merge-summary` gate.** **`scripts/ci-gates.mjs corpus-merge-summary`** validates **`chrysalis.corpus-merge.summary`** (**`schemaVersion`**: **`1`**, **`toolVersion`**, **`generatedAt`**, **`options`**, non-empty **`sources[]`**, **`counts`**). Committed fixture **`fixtures/ci/corpus-merge-summary-smoke.json`**; **`typecheck-and-test`** runs the gate after **`pnpm test`**. Root **`pnpm run ci:corpus-merge-summary`** mirrors **`verify-merged-summary`** ergonomics (**`DESIGN` D231** read path). **`@chrysalis/oracle`** exports **`CorpusMergeTraceIdPolicy`** alongside merge APIs.

- **2026-04-30 — D243** **V2 operator ergonomics — corpus-merge + scale-out discoverability.** **`chrysalis --help`** prints one line pointing at **`verify`** sharding, **`verify-merge`**, **`corpus-merge`**, and **`ingest` / `emit`** sharding + **`--ingest-cache`**. Vitest locks the line (**`packages/cli/tests/cli-help-scaleout.test.ts`**). **`corpus-merge-summary`** gains **`readJsonGateArtifact`** invalid-JSON subprocess coverage and a wrong-**`kind`** rejection test; **`mergeCorpusDirectories`** dry-run vs live run returns identical **`MergeCorpusDirectoriesResult`** for the same inputs; CLI tests cover **`--json-out`** field shapes and **`--dry-run --json-out`** (summary written, out dir absent). **`docs/ADMINISTRATION.md`**, **`packages/verify/README.md`**, and **`packages/cli/README.md`** reference **`--help`** / gate coverage for operators.

- **2026-04-30 — D244** **V2-M3 closure slice — multi-host merge replay in `verify-tiny-blog`.** After PHP observe capture, **`scripts/verify-tiny-blog.mjs`** copies day-bucket NDJSON into **`reports/ci/traces-host-a`** vs **`reports/ci/traces-host-b`** (alternating sorted relative paths), runs **`mergeCorpusDirectories`** into **`reports/ci/traces-merged-multi-host`**, asserts **`readCorpus`** trace count matches the monolithic tree, and **`replayCorpus`** on the merged corpus against **Hono** at the same **`VERIFY_THRESHOLD`** as the standard loop. The merged replay uses a **pristine copy** of the seeded **`blog.sqlite`** (**`reports/ci/pristine-hono-blog.sqlite`**) via **`CHRYSALIS_DB_PATH`** so it is not biased by earlier in-process replays on the primary generated DB file. Preserves **DESIGN §3**: same **`webirModule`**, injected replay **`fetch`**, no new oracle shortcuts.

- **2026-04-30 — D245** **V2-M2 progress — synthetic many-route ingest without a committed bulk fixture.** Vitest **`packages/ingest/tests/many-routes-synthetic-ingest.test.ts`** materializes **12** trivial GET routes under a temp project, proves **`ingestDirectory`** lowers all roots, and that **K=4** **`shardIndex` / `shardCount`** buckets partition the manifest route list. **`ROADMAP.md`** records **parser AST resume** via **`parse-cache`** and defers **WebIR merge across shards**, **emit-side crash resume**, and **RSS/time CI budgets** as explicit remaining work (no silent milestone closure).

- **2026-04-30 — D246** **V2-M2 WebIR merge model (v1).** **`mergeWebIrModules`** in **`@chrysalis/webir`** unions disjoint shard **`Module`** graphs: post-order reachable nodes per shard, remap **`NodeId`**s into one **`ModuleBuilder`**, reject duplicate **`web.request`** route keys (**`METHOD path`**). **`chrysalis ingest`**, **`emit`**, and **`status`** accept **`--merge-all-shards`** with **`--shard-count K`** (mutually exclusive with **`--shard-index`**) to run **`ingestDirectory`** for **`i = 0..K-1`** and merge. **Route roots** and **hole counts** align on **`fixtures/tiny-blog`** for **K=2**. **DESIGN §3:** no silent translation; duplicate routes surface as **`Error`**, not patched IR.

- **2026-04-30 — D247** **V2-M2 WebIR merge — cross-shard structural dedupe.** **`mergeWebIrModules`** assigns each node a **SHA-256** structural key from dialect/op/type/effects/stable attrs/origin/sorted provenance and **operand subtree keys** (post-order). The first occurrence wins in shard order; later shards reuse the canonical **`NodeId`**. This collapses shared **`lib/`** IR duplicated across shards. **Monolithic** **`ingestDirectory`** still lowers **each route file** in separate passes and may duplicate identical helper subgraphs inside one **`Module`**, so merged **`nodes.size`** can be **lower** than monolithic **`nodes.size`** for the same project; that gap is expected until an optional within-module dedupe pass exists. **DESIGN §3:** keys include **`origin`** so unrelated same-shaped IR in different files does not collapse.

- **2026-04-30 — D248** **V2-M2 operator JSON + cache policy.** **`chrysalis status --project --json`** includes **`ingestSharding`**: **`{ mode: "monolithic" }`**, **`routeShard`** with **`shardIndex` / `shardCount`**, or **`mergedShards`** with **`shardCount`**, reflecting the ingest path used for **`oracleFootprint`** / migration metrics. **Optional AST cache** (**`--ingest-cache`**, **`loadOrParsePhpAstWithCache`**): corrupt or version-mismatched cache entries are **ignored** and the file is re-parsed; no silent reuse of invalid AST (**DESIGN §3**).

- **2026-04-30 — D250** **V2-M4 slice — emitted TypeScript layout metrics.** **`summarizeEmittedTypeScriptLayout`** in **`@chrysalis/emit-shared`** walks an emitted app root (skips **`node_modules`**, **`chrysalis-sessions`**, etc.), aggregates **`.ts`** file count, total lines, and the **largest** file by line count (ties broken by lexicographically smallest relative path). **`verify-flagship-laravel-min.mjs`** and **`verify-flagship-laravel-full.mjs`** attach **`layout`** under **`hono`** / **`fastify`** in **`reports/migration/flagship-laravel-*-emit-stats.json`** for regression dashboards; optional CI ceilings on those metrics are **D251**.

- **2026-04-30 — D251** **V2-M4 — optional CI ceilings on emit layout.** **`scripts/ci-gates.mjs emit-layout-floors [path]`** reads a flagship **`emit-stats`** JSON (default **`reports/migration/flagship-laravel-min-emit-stats.json`**). When any **`CHRYSALIS_EMIT_LAYOUT_MAX_HONO_TS_FILES`**, **`…_HONO_TS_LINES`**, **`…_HONO_LARGEST_FILE_LINES`**, **`…_FASTIFY_TS_FILES`**, **`…_FASTIFY_TS_LINES`**, or **`…_FASTIFY_LARGEST_FILE_LINES`** is set to a **non-negative integer**, the gate requires **`hono.layout`** / **`fastify.layout`** as needed and fails if **`tsFileCount`**, **`tsLineCount`**, or **`largestFileLineCount`** exceeds the corresponding ceiling. If **no** such env vars are set, the gate **skips** (exit **0**, log line) like **`migration-sidecar-floors`**. Root **`pnpm run ci:emit-layout-floors`**; Vitest coverage in **`packages/cli/tests/ci-gates-json-artifacts.test.ts`**. **DESIGN §3:** thresholds are operator policy on **observed** layout metrics, not a second emit path.

- **2026-04-30 — D252** **V2-M4 — emit strategy v1 (route registration + provenance).** Handlers remain **one module per route** (existing layout). **`emitStrategy.routeRegistration`**: **`eager`** (default) keeps static **`import`** of each handler in **`server.ts`**; **`lazy`** registers routes with **`await import("./handlers/<name>.js")`** per binding so the server module does not eagerly load every handler. **Hono** uses top-level **`await registerRoutes(app)`** when **`lazy`**. **Fastify** emits the same pattern inside **`buildApp()`** (already async). **`provenanceRoot`** on **`emit-hono` / `emit-fastify` `EmitInput`**: **`formatEmitProvenanceDisplay`** (**`@chrysalis/emit-shared`**) stores a stable **posix** path in **`@chrysalis-provenance`** on each handler file (relative to the PHP project root when possible). **`chrysalis emit`** passes **`provenanceRoot`** from the CLI project directory; **`chrysalis rewrite`** and verify/ **`run-e2e`** scripts pass their ingest roots. **`chrysalis emit --emit-route-registration=lazy|eager`** wires **`emitStrategy`** (default eager). **Not in v1:** extracting a shared **`lib/`** chunk from duplicated TS across handlers (separate ROADMAP follow-up).

- **2026-04-30 — D253** **V2-M5 slice — versioned chimera deploy config file.** **`@chrysalis/runtime-chimera`** exports **`parseChimeraDeployConfigJson`**, **`CHIMERA_DEPLOY_CONFIG_KIND`** (**`chrysalis.chimera.config`**), and **`CHIMERA_DEPLOY_CONFIG_SCHEMA_VERSION` (1)**. **`chrysalis deploy --config`** uses the parser: UTF-8 **BOM** strip, **`kind` + `schemaVersion`** validation when **`kind`** is set, **`rules`** / **`canary`** / **`mode`** shape checks, clear **`pathLabel:`** error prefixes. **Legacy** JSON objects **without** **`kind`** remain valid (implicit v0). Fixture **`fixtures/chimera-deploy-config-v1-smoke.json`** documents the v1 envelope. **Follow-ups:** signed bundles, multi-node reload contract, **`toolVersion`** discipline beyond opaque string.

- **2026-04-30 — D254** **V2 operator batch — chimera stats, emit resume, ingest budget hook, fleet uplink v0, runbooks.** **`ChimeraStats.shadow`** adds **`divergenceLines`** (sum of diff divergence entries) and **`mirrorErrors`** (modern mirror threw before diff); **`diverged`** counts only non-empty diffs. **`ChimeraStats.canary`** tracks modern-rule vs served stack (**`modernRuleMatches`**, **`servedModern`**, **`servedLegacyWhileModernRule`**, **`noModernRule`**). **`@chrysalis/emit-shared`** owns **`loadEmitResumeCompletedHandlers`**, **`markEmitResumeHandlerComplete`**, **`clearEmitResumeState`**, **`EMIT_RESUME_STATE_BASENAME`**; **`emit-hono` / `emit-fastify`** accept **`emitResume`**; **`chrysalis emit --emit-resume`** forwards it. A normal emit clears stale state at start; a successful emit clears state at end. **`packages/ingest/tests/many-routes-synthetic-ingest.test.ts`** honors optional **`CHRYSALIS_INGEST_BUDGET_MS`**. **`fixtures/ci/fleet-status-uplink-v0-smoke.json`** documents **`kind`:** **`chrysalis.fleet.status-uplink`**, **`schemaVersion`:** **0** (CLI does not upload it). **`docs/OPERATIONS.md`** adds multi-AZ cutover outline, stickiness/session notes, emit-resume behavior, and explicit “no hot reload yet”. **DESIGN §3:** no new oracle shortcuts; chimera shadow still never blocks the client; resume skips only handler **writes** while still re-lowering handlers for **`chrysalis.holes.json`** consistency on success.

- **2026-04-30 — D255** **V2 follow-up — signed deploy config (v1), RSS ingest hook, fleet exporter, multi-process chimera smoke.** Optional top-level **`hmacSha256`** on **`chrysalis deploy --config`** JSON: **HMAC-SHA256** over **`stableStringifyChimeraDeploySigningPayload`** of all other top-level fields (sorted keys, recursive). **`parseChimeraDeployConfigJson`** accepts **`hmacSecret`**; CLI reads **`CHRYSALIS_CHIMERA_CONFIG_HMAC_SECRET`** or **`--config-hmac-secret`**. **`computeChimeraDeployConfigHmacHex`** is exported for operator signing scripts. Vitest covers bad/missing secret and good signature. **`CHRYSALIS_INGEST_RSS_MAX_BYTES`** optional ceiling on **RSS** after the synthetic many-route ingest loop. **`scripts/export-fleet-status-uplink.mjs`** + **`pnpm run fleet:export-status-uplink`** wrap a JSON file as **`chrysalis.fleet.status-uplink`** with **`items[].status`**. Fleet smoke fixture updated to nested **`status`**. Proxy Vitest starts **two** **`startChimera`** instances on ephemeral ports to document **multi-instance** feasibility (shared upstream URLs; operators still align config out-of-band). **Follow-ups:** hot reload, central config store, shared **lib** emit chunk.

- **2026-04-30 — D256** **Emit handler import barrel + deploy central URL + reload + LB harness.** **`emitStrategy.handlerImportBarrel`** (CLI **`--emit-handler-import-barrel`**) emits **`src/chrysalis-handler-imports.ts`** as a re-export barrel (**`aggregateEmittedHandlerImports`**, **`buildHonoChrysalisHandlerImportsSource`**, **`buildFastifyChrysalisHandlerImportsSource`** in **`@chrysalis/emit-shared`**); handlers switch imports to **`../chrysalis-handler-imports.js`** while **`domain.js`** type imports stay per-handler. **`chrysalis deploy`** accepts **`--config-url`** or **`CHRYSALIS_CHIMERA_CONFIG_URL`** (fetch, 30s timeout) mutually exclusive with **`--config`**. **SIGHUP** / **SIGUSR2** triggers reload: re-load/re-fetch JSON, re-merge flags, **stop** prior **`startChimera`** and **start** fresh (fail-open on errors). **`packages/runtime-chimera/tests/proxy-lb-round-robin.test.ts`** runs an HTTP round-robin in front of two chimera ports; **`pnpm run ci:chimera-lb-smoke`** isolates it. **`docs/OPERATIONS.md`** adds KMS/HMAC rotation steps. **DESIGN §3:** barrel does not bypass WebIR or oracle; deploy fetch uses **`fetch`** only in the CLI process (not generated handlers).

- **2026-04-30 — D257** **V2-M5 — multi-key HMAC on one chimera deploy JSON.** **`hmacSha256`** may be a single **64-hex string** (unchanged) or a **non-empty object** mapping opaque **key ids** (e.g. KMS key labels) to **64-hex** digests of the same signing payload (**all top-level fields except `hmacSha256`**, **`stableStringifyChimeraDeploySigningPayload`**). **`parseChimeraDeployConfigJson`**: string form tries **`hmacSecret`** then **`hmacPreviousSecrets`**; object form requires **`hmacSecretsByKeyId`** and succeeds if **any** id verifies. **`computeChimeraDeployConfigHmacHexByKeyIds`** builds the object for operators. CLI: **`--config-hmac-keys-json '<json>'`** or **`CHRYSALIS_CHIMERA_CONFIG_HMAC_KEYS_JSON`**; **`CHRYSALIS_CHIMERA_CONFIG_HMAC_PREVIOUS_SECRETS`** JSON array for string-form rotation without duplicating secrets in code. **DESIGN §3:** verification stays in the deploy CLI / parser; no env reads inside generated handlers.

- **2026-04-30 — D258** **Five-operator slices — drift JSON, emit route constants, fleet privacy.** (1) **`buildChimeraOperatorSnapshot`**, **`computeChimeraDeployRoutingFingerprintSha256`**, fixture **`fixtures/ci/chimera-operator-snapshot-v1-smoke.json`**. (2) **`chrysalis deploy`** periodic **operator metrics**: overwrites **`--operator-metrics-json`**, appends NDJSON to **`--operator-metrics-ndjson`**, tunable interval, instance id from **`CHRYSALIS_CHIMERA_INSTANCE_ID`**. (3) **`scripts/chimera-routing-fingerprint.mjs`** prints routing fingerprint for a config file. (4) **`emitStrategy.emitRoutePathConstants`** + **`buildChrysalisRoutePathsModuleSource`** (**`@chrysalis/emit-shared`**) → **`src/chrysalis-route-paths.ts`**; Hono/Fastify **`server.ts`** uses **`ChrysalisRoutePaths`**. (5) **`docs/OPERATIONS.md`** — **Fleet JSON and privacy (V2-M6)** (no third-party telemetry; self-hosted artifacts only). **DESIGN §3:** snapshots and fingerprints exclude HMAC secrets; emit still flows WebIR → handlers.

- **2026-04-30 — D259** **Operator snapshot batch + per-handler emit fingerprints.** (1) **`chrysalis.chimera.operator-snapshot.batch`** (**`schemaVersion`:** **1**; **`CHIMERA_OPERATOR_SNAPSHOT_BATCH_KIND`**, **`CHIMERA_OPERATOR_SNAPSHOT_BATCH_SCHEMA_VERSION`** in **`@chrysalis/runtime-chimera`**); **`scripts/aggregate-chimera-operator-snapshots.mjs`** reads one or more **NDJSON** files (or **stdin**) of **`chrysalis.chimera.operator-snapshot`** lines and prints one pretty JSON batch document (**`itemCount`**, **`items`**, **`wallTimeIso`**). Fixture **`fixtures/ci/chimera-operator-snapshot-batch-v1-smoke.json`**. (2) **`emitStrategy.emitHandlerFingerprints`** + **`buildEmitHandlerFingerprintsJson`** (**`@chrysalis/emit-shared`**) → **`chrysalis.emit-handler-fingerprints.json`** at project root (SHA-256 hex of each emitted handler module text, including resume-skipped writes); **`chrysalis emit --emit-handler-fingerprints`**. **DESIGN §3:** handler hashes are **emit output** only (no **`process.env`** / oracle reads in the fingerprint path); fleet operators merge NDJSON snapshots off-process.

- **2026-04-30 — D260** **`chrysalis --help`** scale-out banner lists **`--emit-handler-fingerprints`** and **`scripts/aggregate-chimera-operator-snapshots.mjs`** (fleet NDJSON merge). Vitest **`cli-help-scaleout`** locks the text.

- **2026-04-30 — D261** **`packages/emit-shared/README.md`** documents **`buildEmitHandlerFingerprintsJson`**, **`EMIT_HANDLER_FINGERPRINTS_*`**, **`sha256Utf8Hex`**, and **`emitStrategy.emitHandlerFingerprints`**.

- **2026-04-30 — D262** **`packages/emit-hono/README.md`** — **`EmitInput` / `emitStrategy`** cross-link to CLI flags (**route paths**, **fingerprints**, **resume**, **barrel**, **provenance**, **lazy routes**).

- **2026-04-30 — D263** **`packages/emit-fastify/README.md`** — same **`emitStrategy`** cross-link as emit-hono.

- **2026-04-30 — D264** **Root `README.md`** machine-readable JSON table: rows for **`aggregate-chimera-operator-snapshots.mjs`** output (**`chrysalis.chimera.operator-snapshot.batch`**) and **`chrysalis emit-handler-fingerprints.json`** (**`chrysalis.emit.handlerFingerprints`**).

- **2026-04-30 — D265** **`docs/README.md`** Operations guide row mentions operator-snapshot NDJSON batch merge and points to **DESIGN D259** / **D260–D269**.

- **2026-04-30 — D266** **Vitest (`chimera-operator-snapshot-batch.test.ts`):** **`aggregate-chimera-operator-snapshots.mjs`** with **no file args** reads valid NDJSON from **stdin** (single snapshot line → **`itemCount` 1**).

- **2026-04-30 — D267** **Vitest:** aggregate script **exit 2** + stderr when a line is **not valid JSON**.

- **2026-04-30 — D268** **Vitest:** aggregate script **exit 2** + stderr when **`kind`** ≠ **`chrysalis.chimera.operator-snapshot`**.

- **2026-04-30 — D269** **`ROADMAP.md`** / **`CHANGELOG.md`** record the **D260–D269** documentation + test wave as closed operator-ergonomics follow-up to **D259**.

- **2026-05-02 — D270** **Parser-bridge vendor when `composer` is not on `PATH`.** **`scripts/parser-bridge-composer-install.mjs`**: try **`composer install`**; on “command not found”–class failures, fetch **`getcomposer.org/installer`**, run **`php composer-setup.php`** → **`packages/parser-bridge/composer.phar`**, then **`php composer.phar install`**. **`ensure-parser-bridge-vendor.mjs`** and **`pnpm run vendor:parser-bridge`** use it; **`pretest`** still skips only when **`php`** is unavailable. **DESIGN §3:** network + **`fetch`** run in repo scripts only, not generated handlers.

- **2026-05-02 — D271** **Fleet verify-summary batch (V2-M6).** **`chrysalis.verify.summary.batch`** (**`schemaVersion`:** **1**; **`VERIFY_SUMMARY_BATCH_KIND`**, **`VERIFY_SUMMARY_BATCH_SCHEMA_VERSION`**, **`VERIFY_SUMMARY_KIND`** in **`@chrysalis/verify`**). **`scripts/aggregate-verify-summaries.mjs`** merges **`chrysalis verify --json-summary`** objects from **NDJSON** stdin/files or **one** pretty-printed summary per file; **`chrysalis --help`** scale-out line lists it beside **`aggregate-chimera-operator-snapshots.mjs`**. Fixture **`fixtures/ci/verify-summary-batch-v1-smoke.json`**; Vitest **`packages/verify/tests/verify-summary-batch.test.ts`**; root **`pnpm run ci:verify-summary-batch`**. **DESIGN §3:** batch tool is operator/offline only; verify replay semantics unchanged.

- **2026-04-30 — D272** **Runtime import facade v0 (V2-M4 shared-chunk slice).** **`emitStrategy.runtimeFacadeModule`** (CLI **`chrysalis emit --emit-runtime-facade`**) emits **`src/chrysalis-runtime-facade.ts`** with **`buildChrysalisRuntimeFacadeModuleSource`** (**`export * from "./runtime.js"`**, **`@chrysalis/emit-shared`**). **`emit-hono`** / **`emit-fastify`** switch per-handler **`../runtime.js`** imports and the optional **`chrysalis-handler-imports`** barrel re-export to **`./chrysalis-runtime-facade.js`** when enabled. **DESIGN §3:** WebIR and **`runtime.ts`** lowering unchanged; facade is an optional stable import surface for operators who may replace or wrap **`runtime.ts`** without editing every handler.

- **2026-04-30 — D273** **PHP Redis session save handler (V2-M5 session bridge).** **`Chrysalis\Oracle\Session\RedisChrysalisSessionHandler`** in **`packages/oracle-php`** implements **`SessionHandlerInterface`** using **phpredis**, Redis keys **`chrysalis:sess:<id>`**, JSON payloads matching emitted Hono/Fastify **`CHRYSALIS_SESSION_REDIS_URL`** mode (**DESIGN D178**). **`registerFromEnv()`** applies **`session.serialize_handler=php_serialize`** and aligns **`session.name`** with **`CHRYSALIS_SESSION_COOKIE`**. **DESIGN §3:** no new network oracles in generated code; PHP prelude remains opt-in for operators.

- **2026-05-02 — D274** **Milestone V2-M6 (operator aggregation) — formal closure.** **`docs/OPERATIONS.md`** adds **Fleet aggregation reference (V2-M6 closure)** — read-only operator path: versioned batch kinds (**`chrysalis.chimera.operator-snapshot.batch`**, **`chrysalis.verify.summary.batch`**, **`chrysalis.fleet.status-uplink`**), offline scripts (**`aggregate-chimera-operator-snapshots.mjs`**, **`aggregate-verify-summaries.mjs`**, **`export-fleet-status-uplink.mjs`**), explicit **out-of-scope** statement (no Chrysalis-hosted fleet SaaS / third-party telemetry). **`ROADMAP.md`** marks **V2-M6** **closed**; **`v2.0.0` tag criteria** include **V2-M6** closure. **DESIGN §3:** fleet artifacts remain operator-controlled; no default-on external data exfiltration.

- **2026-05-02 — D275** **V2-M2 ingest scale / resume runbook.** **`docs/OPERATIONS.md`** documents **Ingest scale and resume (V2-M2 runbook)** — **`--ingest-cache`**, **`--shard-*`**, **`--merge-all-shards`**, recovery patterns, contrast with **`emit --emit-resume`** / **`.chrysalis-emit-state.json`** (**D254**). No new ingest state file shipped; **DESIGN §3** preserved (no silent IR shortcuts). **`ROADMAP` V2-M2** progress note updated.

- **2026-05-02 — D276** **V2-M2 synthetic ingest stress — document RSS + wall-clock hooks (D255 alignment).** **`CHRYSALIS_INGEST_RSS_MAX_BYTES`** was already honored in **`packages/ingest/tests/many-routes-synthetic-ingest.test.ts`** alongside **`CHRYSALIS_INGEST_BUDGET_MS`** (**D254**, **D255**). **`docs/OPERATIONS.md`**, **`ROADMAP.md` V2-M2**, and **`packages/ingest/README.md`** now state the same contract: optional **Vitest-only** regression rails on the **12-route** temp tree; not a production memory SLA. **`ROADMAP` “Still open”** no longer lists RSS. **DESIGN §3:** test reads **`process.memoryUsage()`** in harness only, not generated handlers.

- **2026-05-02 — D277** **Ingest progress JSON (V2-M2 diagnostic slice).** **`kind`:** **`chrysalis.ingest.progress`**, **`schemaVersion`:** **0** — **`completedRouteKeys`**, **`manifestRouteFingerprint`** (SHA-256 of canonical sorted route rows), **`toolVersion`** from **`@chrysalis/ingest`**, optional **`shardFilter`**. **`IngestOptions.ingestProgressFile`**; CLI **`--ingest-progress-file`** on **`ingest`**, **`emit`** (ingest phase), **`status --project`**; rejected with **`--merge-all-shards`**. File updates after **each** route root is added; **does not** skip **`ingestHandler`** work (contrast **`emit --emit-resume`**). **DESIGN §3:** operator artifact only; no **`Date.now`** in generated handlers; no silent IR shortcuts.

- **2026-05-02 — D278** **Ingest progress validation + V2-M4 layout clarity.** **`parseIngestProgressJson`**, **`readIngestProgressFile`** in **`@chrysalis/ingest`** — strict **`ParseIngestProgressResult`** for operator scripts; **`loadExisting`** for **`recordIngestRouteProgress`** reuses **`readIngestProgressFile`**. Fixture **`fixtures/ci/ingest-progress-v0-smoke.json`**. **`packages/emit-shared/README.md`** documents shipped V2-M4 **layout** options (barrel, route paths, fingerprints, runtime facade) vs **Remaining** body-level dedupe. **`ROADMAP` V2-M4** *Remaining* narrows to **IR-level** duplicate handler bodies. **`docs/OPERATIONS.md`** points to parsers. **DESIGN §3:** validation is tooling-only; generated handlers unchanged.

- **2026-05-02 — D279** **Operator JSON index — ingest progress.** Root **`README.md`** *Machine-readable JSON* table adds **`chrysalis.ingest.progress`** **`schemaVersion` 0** (sources expanded in **D280**). **`docs/README.md`** Operations guide row cites **D278** parse helpers beside **D277**. **DESIGN §3:** documentation only.

- **2026-05-02 — D280** **Ingest progress flag on verify, repair, insight.** **`chrysalis verify`** accepts **`--ingest-progress-file`** only with **`--project`** (exit **2** otherwise; validated before **`readCorpus`**). **`chrysalis repair`** and **`chrysalis insight`** forward the path to **`ingestDirectory`**. **`ROADMAP` V2-M2** checklist + operator docs (**`docs/OPERATIONS.md`**, **`packages/cli` / `ingest` / `verify` README**). **DESIGN §3:** same diagnostic artifact as **D277**; no replay or verify semantics change.

- **2026-04-30 — D281** **Shared runtime import module (non-barrel V2-M4 slice).** **`emitStrategy.emitSharedRuntimeImports`** (CLI **`chrysalis emit --emit-shared-runtime-imports`**) emits **`src/chrysalis-runtime-imports.ts`** via **`buildChrysalisRuntimeSharedImportsModuleSource`** (**`@chrysalis/emit-shared`**): one **`export { … } from "./runtime.js"`** (or **`./chrysalis-runtime-facade.js`** when **`runtimeFacadeModule`** is set) aggregating lowering helpers across handlers. **`emit-hono`** / **`emit-fastify`** switch non-barrel handler runtime value imports to **`../chrysalis-runtime-imports.js`**. **Incompatible** with **`handlerImportBarrel`** (CLI rejects the pair; emitters throw if both set). **DESIGN §3:** WebIR and **`runtime.ts`** unchanged; optional layout-only dedupe of import lines.

- **2026-04-30 — D282** **Identical lowered-handler body dedupe (emit v0, V2-M4).** **`emitStrategy.emitDedupeIdenticalHandlerBodies`** (CLI **`chrysalis emit --emit-dedupe-identical-handler-bodies`**) runs after **`emitHandlerBody`** per route: routes are grouped by **`computeEmittedHandlerDedupeKey`** (canonical JSON over lowered **`body`**, **`shape`**, sorted **`@chrysalis-effects`** tags, sorted domain type imports, and the conditional import flags on **`EmittedHandler`**). Groups with **≥ 2** routes emit one shared module under **`src/chrysalis-deduped/<chrysalisBodyDedupe_*.ts>`** (**`chrysalisBodyDedupeExportId`** = **`chrysalisBodyDedupe_`** + **16** hex chars of **SHA-256** of the key) containing the full lowered function body with **direct** imports (not the handler-import barrel). Per-route **`src/handlers/<name>.ts`** files keep route-specific **`@chrysalis-provenance`** and **`@chrysalis-effects`** annotations and **`export async function <name>(…)`** thin wrappers that **`return`** the shared export. **DESIGN §3:** WebIR graph and oracle/verify semantics are unchanged (same runtime calls per route); dedupe is **emit-output** layout only. **Out of scope for v0:** merging non-identical bodies, cross-route **IR** subgraph lifting, or changing **`chrysalis.holes.json`** provenance rows (holes remain attributed to each route’s PHP file as today).

- **2026-04-30 — D285** **v2.0.0 source release — semver + release hygiene.** Root and all **`packages/*/package.json`** **`version`** fields advance **1.0.1 → 2.0.0** so **`pnpm run release:artifacts`** on tag **`v2.0.0`** emits **`chrysalis-2.0.0-source.{tar.gz,zip}`** matching the workspace. **`CHANGELOG.md`** section **[2.0.0]** rolls up prior **Unreleased** entries; CI smoke fixtures under **`fixtures/ci/`** that embed **`toolVersion`** now read **2.0.0**. The **`ROADMAP.md`** **v2.0.0 tag criteria** checklist was already satisfied on **`main`** before this bump (**D284**); roadmap **Remaining** / multi-lane **Next** bullets (optional ingest checkpoint beyond AST cache + shards, IR helper lifting beyond **D283**, automated corpus rotation, operator dashboards, PHP **`rediss://`**) stay **post-release backlog**, not silent scope expansion. **DESIGN §3:** unchanged — no oracle shortcut, no WebIR bypass, no silent unsupported lowering.

- **2026-05-03 — D284** **v2.0.0 tag criteria documentation + full five-nines operator path.** **`CHANGELOG.md`** and this Decision Log record the **proposal** checklist from **`ROADMAP.md`** (“**v2.0.0 tag criteria**”): **V2-M1** and **V2-M2** closed; at least one of **V2-M3** / **V2-M4** closed; **V2-M5** closed or explicitly deferred with a Decision Log entry; **V2-M6** closed or deferred; **`CHANGELOG.md`** + **`DESIGN.md`** summarize scale contracts (**`schemaVersion`** bumps on **`chrysalis.verify.summary.merged`**, **`chrysalis.verify.summary`**, **`chrysalis.verify.summary.batch`**, **`chrysalis.chimera.config`**, **`chrysalis.chimera.operator-snapshot`**, **`chrysalis.chimera.operator-snapshot.batch`**, **`chrysalis.fleet.status-uplink`**, **`chrysalis.corpus-merge.summary`**, **`chrysalis.ingest.progress`**, confidence **`reports/confidence/flagship-laravel-full.json`**, NDJSON corpus layout under **`readCorpus`**). **`docs/OPERATIONS.md`** now states prerequisites for **`pnpm run verify:laravel-full:5nines`**: **`composer`** on **`PATH`**, **`pnpm run scaffold:laravel-full`** (materializes gitignored **`flagship/chrysalis-laravel-work/`**; optional **`pnpm run scaffold:laravel-full:breeze`** for CI-shaped Breeze coexistence), then the script chain (**`verify-flagship-laravel-full.mjs`** seed matrix + stress + **`ci-gates` `confidence-5nines`** + **`confidence-trend`**). Without the worktree + **`vendor/autoload.php`**, the verify script exits **0** and confidence gates **skip** (local smoke only). **DESIGN §3:** documentation-only; no change to oracle or replay semantics.

- **2026-04-30 — D283** **Within-module structural subgraph dedupe (WebIR v0, optional ingest).** **`dedupeStructuralSubgraphsInModule`** in **`@chrysalis/webir`** (**`dedupe-module-structural.ts`**) walks nodes reachable from **`Module.roots`** in post-order and collapses nodes that share the same **`mergeDedupeStructuralKey`** as **`mergeWebIrModules`** (**D247**): dialect, op, type, effects, attrs, origin, provenance, and operand subtree keys. First occurrence becomes canonical; later duplicates remap operands and roots through a fresh **`ModuleBuilder`** graph. **`IngestOptions.dedupeStructuralSubgraphs`**; CLI **`--ingest-dedupe-structural-subgraphs`** forwarded from **`ingest`**, **`emit`** (ingest phase), **`verify --project`**, **`repair`**, **`insight`**, **`status --project`**, **`rewrite`**. **Default off** so monolithic **`ingestDirectory`** behavior is unchanged unless opted in. **DESIGN §3:** sound only when structural equality implies semantic equality (same contract as cross-shard merge); does **not** replace **D282** emit-time body dedupe (different layer). **Empirical parity (tiny-blog):** **`ingestDirectory(fixtures/tiny-blog, { dedupeStructuralSubgraphs: true }).nodes.size`** equals **`mergeWebIrModules([shard0, shard1])`** for **K=2** (**`packages/ingest/tests/merge-webir-modules.test.ts`**): monolithic dedupe is an operator alternative to running **K** shard ingests + merge when the goal is a compact single-process graph. **`chrysalis status --json`** **`migration.coverage.nodes`** follows **`irCoverageStats`** (reachable nodes from **`Module.roots`**); **`chrysalis ingest`** **`nodes:`** uses **`Module.nodes.size`**, which may shrink under **D283** even when the reachable walk count is unchanged on a given fixture. **Origin-insensitive variant:** **`mergeDedupeStructuralKeyIgnoringOrigin`** + **`--ingest-dedupe-structural-subgraphs-ignore-origin`** (**D294**). **Remaining:** richer IR-level **helper lifting** when subgraphs are not structurally identical even ignoring origin stays backlog.

- **2026-04-30 — D286** **GitHub canonical org remote.** The public **Git** / **Releases** home for this monorepo is **`https://github.com/4GEngineer/chrysalis`** (organization namespace). Root **`package.json`** **`repository.url`**, **`README.md`**, **`docs/INSTALLATION.md`**, **`docs/GITHUB_PROJECT.md`**, **`CHANGELOG.md`** release link definitions, and **`scripts/bootstrap-github-project.mjs`** fallback **`CHRYSALIS_GH_PROJECT_OWNER`** align with that canonical path so clones, tarball links, and **`gh project`** bootstrap defaults stay consistent after transfer. **DESIGN §3:** unchanged (metadata and contributor ergonomics only).

- **2026-05-10 — D293** **Canonical public GitHub under `theorem6/chrysalis`.** Forward-looking **clone / Releases / issues / security** links and **`package.json` `repository.url`** use **`https://github.com/theorem6/chrysalis`** (user namespace), consolidating public hosting with other **`theorem6`** repositories. **`CODEOWNERS`** defaults to **`@theorem6`**. **`scripts/bootstrap-github-project.mjs`** default **`CHRYSALIS_GH_PROJECT_OWNER`** is **`theorem6`** unless overridden. **D286** remains above as the historical org-home record. **DESIGN §3:** unchanged (metadata only).

- **2026-05-05 — D289** **Commercial monetization documentation + optional local CLI license gate.** **`docs/COMMERCIAL.md`** orders revenue levers (**services**, **enterprise support**, **licensed distribution**, training, reference dashboards) and states that **billing** stays **outside** the repo. Workspace package **`@chrysalis/license`** verifies **Ed25519** signatures over **`canonicalStringify(claims)`** for **`claims`** (**`sub`**, **`tier`**: **`dev` \| `pro` \| `enterprise`**, **`exp`**, optional **`iss`**, **`iat`**, **`features`**). **`assertMinLicenseTier`** enforces **`dev` < `pro` < `enterprise`** when **`CHRYSALIS_LICENSE_MIN_TIER`** is set together with **`CHRYSALIS_REQUIRE_LICENSE=1`**. **`chrysalis license check|print`** validates **`CHRYSALIS_LICENSE`** / **`CHRYSALIS_LICENSE_PATH`** + public key material; other subcommands are gated only when **`CHRYSALIS_REQUIRE_LICENSE=1`**. **`scripts/sign-license.mjs`** (**`pnpm run license:sign`**) signs **`claims.json`** with **`CHRYSALIS_LICENSE_PRIVATE_KEY_PATH`** after **`pnpm --filter @chrysalis/license build`**. **No** in-tree Stripe, license-server callbacks, or usage telemetry; verification remains **offline**. **`licenseAllowsFeature`:** **`enterprise`** tier treats all feature ids as allowed; **`pro`** / **`dev`** use explicit **`claims.features`** when product policy requires feature flags. **Publication:** the **commercial program** (public SKUs, pricing, and any **standalone** npm **paid** line for **`@chrysalis/license`**) is **not launched** until explicitly announced; the repo carries **playbook + optional gate** for maintainers and future vendor builds. **DESIGN §3:** oracle-backed verify, WebIR, holes, and injected **`ctx.time`** / **`ctx.random`** in **generated** handlers unchanged; license **`exp`** uses the **CLI host** clock.

- **2026-05-08 — D290** **`chrysalis init` + `chrysalis.project.json` + 2.0.1 patch hygiene.** CLI **`chrysalis init [<dir>]`** (default **cwd**) creates **`chrysalis.project.json`** with **`kind`:** **`chrysalis.project`**, **`schemaVersion`:** **`1.0.0`**, **`initializedAt`** (ISO-8601). Creates **`dir`** when absent (**`mkdir -p`** semantics). **Idempotent** when the file already matches **`schemaVersion` 1.0.0** and carries **`initializedAt`**; refuses to overwrite unknown or invalid JSON. **`CHRYSALIS_REQUIRE_LICENSE`** does **not** gate **`init`** (bootstrap before distributing keys). Marker is a **convention** for tooling and humans; ingest/emit do **not** require it today. Workspace semver **2.0.1** updates **`fixtures/ci/*` `toolVersion`** fields and root **devDependencies** (**`vitest` 4.x**, **`vite` 6.4.2+**) so **`pnpm audit`** is clean on the prior Vitest/Vite/esbuild advisory chain. **DESIGN §3:** unchanged (no WebIR / oracle behavior change).

- **2026-05-06 — D291** **Canonical monorepo root naming + committed workspace marker.** **`DESIGN.md` §7** uses **`chrysalis/`** as the documented checkout directory (replacing the legacy **`PHP_converter/`** placeholder). The repository root commits **`chrysalis.project.json`** with the same **`kind` / `schemaVersion` / `initializedAt`** shape as **`chrysalis init`** (**D290**) so clones show the framework workspace as already initialized for that convention; customer PHP trees still use **`init`** at their own roots. **DESIGN §3:** unchanged (documentation + marker file only).

- **2026-05-06 — D292** **AgenticOp outbound identity (`agenticop.io`).** **Canonical public practice** name and domain: **AgenticOp** — **`https://agenticop.io`** (not **`agenticops.*`**). The repo adds **`docs/AGENTICOP.md`**, **`branding/agenticop/`** SVG mark + horizontal wordmark, root **`branding/README.md`**, and cross-links from **`README.md`**, **`docs/README.md`**, and **`docs/COMMERCIAL.md`**. **Chrysalis** remains the **MIT** product; AgenticOp is the **optional human-facing** services and programs lane that positions **agent-assisted change** with **oracle-backed verification** (**`chrysalis verify`**, chimera, status JSON). **DESIGN §3:** unchanged (no runtime or oracle semantic change; marketing and asset layout only).

- **2026-05-12 — D294** **Post-2.0 depth backlog (options A–E) — operator slices.** **(A) Full ingest checkpoint:** **`serializeModuleCheckpoint` / `deserializeModuleCheckpoint`**, **`IdGen.seedAfterExistingNodeIds`**, **`moduleBuilderResumeFromModule`** (**`@chrysalis/webir`**); **`@chrysalis/ingest`** **`ingest-checkpoint`** + **`ingestDirectory`** **`ingestCheckpointFile`**, **`ingestResumeFromCheckpoint`**; CLI **`--ingest-checkpoint-file`**, **`--ingest-resume-checkpoint`** on **`ingest`**, **`emit`**, **`verify`**, **`repair`**, **`insight`**, **`status`**, **`rewrite`**. Incompatible with **`--merge-all-shards`** (per-shard checkpoint paths required). **(B) D283 follow-on:** **`mergeDedupeStructuralKeyIgnoringOrigin`**, **`dedupeStructuralSubgraphsInModule({ ignoreOrigin })`**, **`IngestOptions.dedupeStructuralSubgraphsIgnoreOrigin`**, CLI **`--ingest-dedupe-structural-subgraphs-ignore-origin`** (requires **`--ingest-dedupe-structural-subgraphs`**). Broader **IR helper lifting** when bodies are not structurally identical even ignoring origin remains backlog. **(C) Corpus rotation:** **`scripts/corpus-rotate-archive.mjs`**, **`pnpm run corpus:rotate-archive`**, **`docs/ADMINISTRATION.md`**. **(D) PHP Redis TLS:** **`rediss://`** in **`RedisChrysalisSessionHandler`**, optional query **`verify_peer=0|false`**. **(E) Grafana example:** **`examples/grafana/`**. **DESIGN §3:** checkpoint I/O is operator tooling only; **`verify_peer`** relaxation applies only to the **PHP** Redis client connection path, not generated TypeScript handlers.

- **2026-05-19 — D309** **Flagship PDO direct-query oracle lane.** **`GET /chrysalis-pdo-count`** exercises **`db_connect()->query()`** + **`fetch`** via lib **`pdo_item_count_row()`** (handler **`pdo_count_show.php`**) alongside **`GET /chrysalis-lib-count`** (`query_one`). Ingest lowers inline **`db_connect()->query(...)`** like **`db()`** and **`pdo_item_count_row()`** as a fixed **`items`** read. Flagship verify drive fetches the route twice per seed variant. **DESIGN §3:** no oracle shortcuts; same SQLite seed semantics as sibling aggregate routes.

- **2026-05-20 — D312** **Translation Hub operator web (v0).** **`scripts/chrysalis-operator-web.mjs`** + **`chrysalis-hub-store.mjs`** on port **19090**: landing page, SSH origin scan, per-language target matrix (honest grades), project registry under **`~/.chrysalis-hub/`**, optional **`scp`** pull, **`chrysalis init`**, live ingest console (SSE + **`chrysalis.ingest.progress`**). Hub runs on a server with SSH to origin hosts; does not replace WPTP neutral IR. **DESIGN §3:** still oracle-gated translation for PHP; non-PHP targets marked planned.

- **2026-05-20 — D313** **Translation Hub bounded universality (v1 matrix + routing).** **`TARGET_MATRIX`** lists every language id in **`EXT_TO_LANGUAGE`** with explicit targets (**`supported: false`** where no in-repo ingest exists). **`planHubTranslation`** / **`resolveHubRoute`** route only **PHP → `typescript-chrysalis`** to **`chrysalis ingest`**; planned pairs register **`hub:*`** holes in **`.chrysalis/hub.report.json`**; WPTP compose scripts (**`export-webir-bundle`**, **`wptp-d3-silver-harness`**, etc.) are documented as **WPTP CI path** (not hub-automated gold). Full Python/Java/Go ingest remains **WPTP sibling adapters** + future Decision Log — no fake transpilers on **`main`**. **DESIGN §3:** unchanged oracle/WebIR gates.

- **2026-05-20 — D315** **Translation Hub client/server multi-site batch.** Hub is explicitly **server** (`chrysalis-operator-web.mjs`) + **browser client**; projects hold **`sites[]`** (SSH origins, isolated `workspaces/.../sites/<id>/`). **`chrysalis-hub-batch.mjs`** runs parallel translation with **`CHRYSALIS_HUB_MAX_PARALLEL`**, per-site **`ingest.progress`**, SSE **`batchProgress`**. Deploy automation: **`hub-install.sh`**, **`gce-hub-finish-deploy.sh`**, **`hub-post-deploy-verify.mjs`**. **DESIGN §3:** still no fake transpilers; batch uses same route grades as single-site.

- **2026-05-20 — D319** **Translation Hub v1 complete (G10–G13).** Trace upload (**`chrysalis-hub-traces-upload.mjs`**), emitted-app launcher (**`chrysalis-hub-runtime.mjs`**), tenancy (**`hubActorFromRequest`**, project **`owner`**), per-site WPTP compose (**`wptp-compose-site.mjs`**). Portal is the sole operator surface for the hub product slice. **DESIGN §3** unchanged.

- **2026-05-20 — D321** **Translation Hub portal product complete (G18).** Browser-only operator flows: local project create, project settings, per-site route plan, formatted observe assist, org join, batch tuning, Chrysalis status job, runtime health refresh, **`pnpm run hub:serve`**, optional **`docker-compose.hub.yml`**. Hub remains client/server; core translation quality is unchanged.

- **2026-05-26 — D357** **Hub framework cross-emit batch + oracle boundary (G52).** Vitest locks **go/csharp/java/ruby → hono/fastify** gold suites and **4** oracle-tier PHP→framework pairs (core lane separation from hub structural CI). **`hub-completion`** schema **v13** lists cross-framework and middleware CWL suite ids. **DESIGN §3** unchanged.

- **2026-05-26 — D358** **Cross-framework CWL gold (G53).** Add **`java/go/csharp/ruby → cwl`** structural suites on existing literal fixtures so CWL emit stays hole-free beyond JS/TS/Python and middleware. **`hub-completion`** schema **v14**. **DESIGN §3** unchanged.

- **2026-05-26 — D373** **Hub migration-debt smoke (G68).** **`hub-multi-lane-smoke`** v2 invokes **`migration-debt`** on **`fixtures/tiny-blog`** and records **`migrationDebtOk`** / hole count in **`hub-completion`** schema **v21**. **DESIGN §3** unchanged.
- **2026-05-26 — D374** **Extended asset hub gold (G69).** Remaining scaffold-tier asset origins (**css**, **scss**, **markdown**, **yaml**, **c**, **cpp**) gain **`literal-hono/fastify/nextjs`** structural + trace suites when file-lift is hole-free; **`assetExtended*Gold`** sections in **`hub-completion`** schema **v22**.
- **2026-05-26 — D375** **PHP oracle ingest smoke (G70).** Hub CI runs **`hub-php-oracle-smoke`** (`chrysalis ingest` on **`fixtures/tiny-blog`**) to prove the **core** PHP lane without duplicating full oracle verify in hub structural gold. Oracle tier stays **4** pairs only.
- **2026-05-26 — D376** **Operator completion sections (G71).** **`hub-completion-sections.mjs`** is shared by **`hub-completion`** and **`GET /api/hub/completion-sections`** for path-explorer coverage context.
- **2026-05-26 — D377** **Path knowledge v2 (G72).** Every hub pair exports evidence-backed **`pros`**, **`cons`**, **`riskLevel`**, **`idiomLoss`**, **`verifyExpectation`**, and **`canonicalWebIrPattern`**. **`compareHubLanguages`** + operator **`GET /api/hub/language-compare`** rank candidate outputs for migration planning.
- **2026-05-26 — D378** **PHP oracle full smoke (G73).** **`hub-php-oracle-smoke`** v2 runs ingest, **hono** emit, and verify correctness gate on **`fixtures/tiny-blog`** — core lane boundary without hub structural PHP gold.
- **2026-05-26 — D379** **CWL RFC-0001 (G74).** Module-level **`use json`** / **`use urlencoded`** lowers to **`web.request.middleware`** presets (Express/Flask synthesis). **`docs/CWL-RFC.md`** indexes accepted RFCs.
- **2026-05-26 — D380** **Web database catalog (G75).** **`hub-web-databases.mjs`** catalogs tier-1/2/3 datastores (Postgres, MySQL, MongoDB, Redis, DynamoDB, Elasticsearch, …) with pros/cons and Chrysalis notes; path knowledge **schema v3** embeds summary.
- **2026-05-26 — D381** **CWL middleware gold (G76).** **`cwl-middleware-hono/fastify`** structural + trace suites on **`fixtures/hub-gold-cwl-middleware`**.
- **2026-05-26 — D382** **PHP oracle dual emit (G77).** **`hub-php-oracle-smoke`** v3 verifies ingest + **hono** + **fastify** emit + correctness gate.
- **2026-05-26 — D383** **Migration planner (G78).** **`hub-migration-planner.mjs`** combines language compare, pair risk, and detected databases into operator steps.

- **2026-05-26 — D384** **CWL path parameters (G79).** **`hub-cwl-path-params.mjs`** extracts `:name` segments into WebIR `pathParams`; CWL **`param`** + object return refs lower to **`requestField` path**. Gold **`cwl-path-params-hono`** / **`cwl-path-params-fastify`**.

- **2026-05-26 — D385** **CWL query parameters (G80).** CWL **`query`** bindings lower to **`requestField` query**; gold **`cwl-query-params-*`**.

- **2026-05-26 — D386** **CWL path/query Next.js gold (G81).** **`cwl-path-params-nextjs`**, **`cwl-query-params-nextjs`** structural + trace replay.

- **2026-05-26 — D387** **Origin database detection (G82).** **`hub-detect-databases.mjs`** infers catalog ids from origin scan **`services`** env hints.

- **2026-05-26 — D388** **Migration planner scan wiring (G83).** Operator + **`/api/hub/migration-plan`** accept detected databases from scan **`services`**.

- **2026-05-26 — D389** **CWL request context (G84).** **`header`** / **`cookie`** bindings lower to **`requestField`**.

- **2026-05-26 — D390** **PHP oracle Next.js smoke (G85).** **`hub-php-oracle-smoke`** v4 emits Next.js via WebIR bundle when **`wptp-emit-nextjs`** is available.

- **2026-05-26 — D391** **Console migration plan (G86).** Operator Console shows project migration steps with aggregated database detection.

- **2026-05-26 — D392** **CI knowledge exports (G87).** **`ci:hub-knowledge`** persists and gates path knowledge + web database catalog JSON.

- **2026-05-26 — D393** **Locked strategic plan.** **`docs/STRATEGIC-PLAN.md`** governs build order and refusals (PHP oracle wedge → Hub migration OS → CWL interchange). **`AGENTS.md`** requires assistants to follow it; user clarifications without “build” are not forks. Amended only via Decision Log + explicit user approval.

- **2026-05-26 — D394** **Capability matrix (G88).** **`docs/CAPABILITY-MATRIX.md`** + **`hub-capability-matrix.mjs`**; hub-completion **v27** **`capabilityMatrix`** section separates oracle product (4 pairs) from structural/scaffold tiers.

- **2026-05-26 — D395** **Verify playbooks (G89).** **`hub-verify-playbooks.mjs`** maps **`status-mismatch`**, **`header-mismatch`**, **`body-mismatch`** to migration steps; Operator **`/api/hub/verify-playbooks`**.

- **2026-05-26 — D396** **Hub evidence MVP (G90).** **`hub-evidence.mjs`** aggregates holes + verify summary + blockers; **`GET /api/hub/projects/{id}/evidence`**; Console evidence dashboard.

- **2026-05-26 — D397** **Migration programs (G91).** **`hub-migration-programs.mjs`** templates (**api-slice**, **auth-slice**, **public-readonly**); **`/api/hub/migration-program`**.

- **2026-05-26 — D398** **Project-to-CWL v0 (G92).** **`hub-project-cwl-export.mjs`** writes **`.chrysalis/migration.cwl`** after PHP hub-translate from **ingested** / hub WebIR.

- **2026-05-26 — D399** **CWL RFC-0005 body (G93).** **`body`** bindings → **`requestField` source body**; **`cwl-request-body-*`** gold.

- **2026-05-26 — D400** **CWL RFC-0006 status (G94).** **`status N;`** parsed for migration contracts; full **`web.request` response** lowering deferred.

- **2026-05-26 — D401** **Hub completion v27 (G101).** **125** structural + **99** trace gold suites; gates for **`cwlRequestBodyGold`**, **`cwlResponseStatusGold`**, **`capabilityMatrix`**.

- **2026-05-26 — D402** **Node oracle spike (G103).** **`hub-node-oracle-spike.mjs`** + **`fixtures/hub-node-oracle-spike`** pilot README.

- **2026-05-26 — D403** **CWL RFC-0007 (G106).** **`use auth session|bearer`** middleware presets + handler **`effects`** → WebIR **`Effect[]`**; **`cwl-auth-effects-*`** gold.

- **2026-05-26 — D404** **Laravel verify gaps (G104).** **`hub-laravel-verify-gaps.mjs`** ranks verify divergences → ingest backlog with playbook hints.

- **2026-05-26 — D405** **PHP Next.js verify (G105).** **`hub-php-nextjs-verify.mjs`** in-process trace replay; **`phpOracleSmoke`** schema **v5** **`verifyNextjsOk`**.

- **2026-05-26 — D406** **Hub verify gate (G107).** **`CHRYSALIS_HUB_VERIFY_GATE`** appends **`hub-evidence.mjs`** after chrysalis ingest-emit in hub job steps.

- **2026-05-26 — D407** **Hub completion v28 (G108).** **128** structural / **102** trace suites; **`laravelVerifyGaps`**, **`phpNextjsVerify`**, **`cwlAuthEffectsGold`**.

- **2026-05-26 — D408** **Laravel flagship verify closure (G109).** **`pnpm run sync:laravel-templates`** re-copies **`flagship/laravel-full/chrysalis-templates`** (including **`/chrysalis-pdo-count`** / **`pdo_item_count_row`**); **`verify:laravel-full`** **119/119** on Hono + Fastify; **`hub-laravel-verify-gaps`** resolves **`reports/verify-flagship-laravel-full/hono/summary.json`** and per-route trace JSON; **`hub-cwl-openapi-export.mjs`** writes **`.chrysalis/migration.openapi.json`** on PHP hub-translate.

- **2026-05-26 — D409** **Express 10-route flagship (G110).** **`fixtures/hub-flagship-express`** (10 literal/json routes, hole-free JS AST lift); hub gold **`express-flagship-*`**; **`hub-express-flagship.mjs`**; **`hub-completion`** schema **v29** (**132** structural / **105** trace suites).

- **2026-05-27 — D410** **Node live oracle capture mode (G111).** **`packages/oracle-node/record-live-http.mjs`** captures real HTTP endpoints with **`--base-url`** + **`--routes`** and writes verify-compatible NDJSON; **`hub-oracle-record.mjs`** dispatches Node live mode via the same flags. Preserves lane split: capture remains in recorder, replay/semantic checks remain in **`@chrysalis/verify`**.

- **2026-05-27 — D411** **Node Express flagship oracle verify (G112).** **`fixtures/hub-flagship-express`** + **`src/serve.mjs`**; **`record-live-http --corpus-dir`** writes per-trace NDJSON; **`hub-node-express-oracle-verify.mjs`** records legacy Express then replays corpus against emitted Hono; hub-completion **v30**.

- **2026-05-27 — D412** **GCE cross-platform local verify (G113).** **`gce-cross-platform-verify.ps1`** orchestrates Linux Debian + Windows Server VMs; **`gce-vm-verify-suite`** shared gates; documented in **`docs/GCE-LOCAL-VERIFY.md`** (no GitHub Actions required).

- **2026-05-27 — D413** **Hub evidence verify trend (G114).** **`hub-evidence.mjs`** schema **v2** reads **`.chrysalis/evidence-history.jsonl`**; **`--record-snapshot`** on hub verify gate; operator shows correctness delta vs prior snapshot.

- **2026-05-27 — D414** **Capability matrix Node pilot (G115).** **`ORACLE_PRODUCT_PAIRS`** includes **javascript→hono** on **`fixtures/hub-flagship-express`** with **`hub-node-express-oracle-verify`**; matrix schema **v2**; hub-completion **v30** gates **≥5** oracle pairs.

- **2026-05-27 — D415** **Plain PHP flagship (G116).** **`fixtures/hub-flagship-plain-php`** ( **`chrysalis.routes.json`** , 10 literal pages); **`exportPhpHubWebir`** for hub gold; **`hub-plain-php-flagship.mjs`**; second PHP wedge pilot in capability matrix (**6** oracle pairs); hub-completion **v31**.

- **2026-05-27 — D416** **CWL RFC-0008 response content-type (G117).** **`content-type`** on handlers; **`emit-tree`** lowers **`web.request.response`** to Hono/Fastify returns; gold **`cwl-response-content-type-*`**; hub-completion **v32**.

- **2026-05-27 — D417** **Symfony flagship pilot (G118).** **`fixtures/hub-flagship-symfony`** (10 **`__invoke`** controllers, **`config/routes.yaml`** mirror, **`chrysalis.routes.json`** ingest); gold **`symfony-flagship-*`**; **`hub-symfony-flagship.mjs`**; capability matrix **7** PHP oracle pairs; hub-completion **v33**.

- **2026-05-27 — D418** **Flagship +10 route slice (G119).** Second **10** routes (items CRUD, search, users, stats, notify) on **`hub-flagship-plain-php`**, **`hub-flagship-symfony`**, **`hub-flagship-express`** (**20** total); **`hub-express-flagship-routes.mjs`** canonical list; Node oracle capture uses full **20** traces.

- **2026-05-30 — D440** **CWL semantic diff for PR review (G141).** Phase 3 called for "CWL diff in PRs" so migration contracts are reviewable, not opaque text replacements. `hub-cwl-diff.mjs` parses both sides with the existing `cwl-parser`, normalizes each route to a snapshot (handler, status, content-type, path/query params, body literal/object/hole), and emits structured JSON (`chrysalis.hub.cwl-diff` schema v1) plus Markdown tables (`added` / `removed` / `changed` with field-level deltas). `writeProjectCwlDiffArtifacts` writes `.chrysalis/cwl-diff.{json,md}` when a baseline file exists (`--base`, `migration.cwl.baseline`, or `.chrysalis/migration.cwl.baseline`) and `.chrysalis/migration.cwl` is present. Wired into `hub-migration-contract.mjs` (schema v2, `cwlDiff` + artifact paths) and auto-invoked from `hub-translate` after CWL export. Gold fixture `fixtures/hub-gold-cwl-diff` (1 added, 1 removed, 1 changed, 1 unchanged). Rationale: semantic route diff is what reviewers need for migration contracts; line diff on CWL text hides whether a route's status/body/hole changed.

- **2026-05-30 — D441** **Site intelligence scan (G142).** STRATEGIC-PLAN Phase 2 calls for scan → languages, DBs, route estimate, risk before operators commit to a migration program. `hub-site-intelligence.mjs` reuses `scanLocalDirectory` for language counts, scans `.env`/docker-compose hints for DB catalog ids, `discoverContractArtifacts` for OpenAPI/HAR presence, and estimates routes from `chrysalis.routes.json` (high confidence) down through `migration.cwl`, WebIR artifacts, and handler-file heuristics. Emits a scored risk profile (unknown surface, polyglot tree, write-heavy routes, missing contract) as `chrysalis.hub.site-intelligence` v1 and optional `.chrysalis/site-intelligence.json`. Operator API `GET /api/hub/site-intelligence`. Rationale: one honest pre-flight report beats ad-hoc directory guessing; route estimate sources are ordered by confidence so operators see when a number is heuristic.

- **2026-05-30 — D442** **Chimera cutover runbooks + operator metrics (G143).** STRATEGIC-PLAN Phase 1 requires cutover runbooks tied to verify gates, not generic DevOps checklists. `hub-chimera-cutover.mjs` composes phased steps (prep gates → shadow → canary ramp → cutover) from `buildHubEvidenceReport` (verify 1.0, holes 0, migration contract), `buildMigrationProgram` route patterns, optional on-disk `chimera.json`, and the latest `chrysalis.chimera.operator-snapshot` NDJSON line (D258/D259). Outputs JSON + Markdown (`.chrysalis/chimera-cutover.{json,md}`) and exposes operator metrics (correctness, holes, delivery score, chimera mode, snapshot stats). Operator API `GET /api/hub/chimera-cutover`. Rationale: cutover safety is a function of verify evidence and chimera mode progression; the runbook generator makes that dependency explicit and machine-readable.

- **2026-05-30 — D443** **Migration assessment report (G144).** STRATEGIC-PLAN business shape #1 (Assessment) and Phase 2 Migration OS need a single readiness artifact, not disconnected scan/plan/evidence panels. `hub-migration-assessment.mjs` merges site intelligence, language compare, path knowledge, program recommendation, optional evidence, and chimera gate readiness into `chrysalis.hub.migration-assessment` with explicit tiers and next steps. Writes `.chrysalis/migration-assessment.{json,md}`. Operator API `GET /api/hub/migration-assessment`. Rationale: operators sell and run assessments before pilots; one JSON+MD bundle is the deliverable.

- **2026-05-30 — D444** **Path explorer apply to project (G145).** STRATEGIC-PLAN Phase 2 called for path explorer → "apply to this project". `hub-apply-path-advice.mjs` writes `.chrysalis/path-advice.json` combining path knowledge, gold suite coverage, migration plan/program, and site context for a concrete workspace. Operator GET/POST APIs plus Path explorer **Apply pair to project** (Console project required). Rationale: pair advice must land on disk where translate/verify pipelines can consume it, not only render in the browser.

- **2026-05-30 — D445** **Post-translate delivery artifacts (G146).** STRATEGIC-PLAN Phase 2 requires Hub pipeline delivery metrics after translate, not a separate manual step. `hub-post-translate-artifacts.mjs` bundles site intelligence, path advice, migration assessment, and chimera cutover refresh; `hub-translate.mjs` invokes it on every successful path and surfaces `deliveryArtifacts` on stdout. Rationale: operators and CI should get a consistent `.chrysalis/` artifact set whenever translate completes — the migration OS deliverable is the project folder state, not only emitted code.

- **2026-05-30 — D446** **Per-project verify gaps → ingest backlog (G147).** STRATEGIC-PLAN Phase 1 P0 calls for Laravel/plain PHP ingest driven by verify gaps, not only a global flagship report. `hub-verify-gaps-shared.mjs` centralizes summary/trace loading and backlog ranking; `hub-verify-gaps-ingest.mjs` applies it per project workspace (`reports/verify/**` → `.chrysalis/verify-gaps-ingest.json` with `ingestNext`). `hub-laravel-verify-gaps.mjs` refactored onto the shared module. Migration assessment surfaces the top gap in `nextSteps`. Rationale: ingest work should be prioritized from the project's own verify replay, with the same playbook taxonomy as G91.

- **2026-05-30 — D448** **CWL runtime accelerated (`@chrysalis/runtime-cwl`; G154).** User-amended plan: CWL runtime moves from Phase 5 pause to an in-repo preview server. New package loads `.cwl` → WebIR via `export-cwl-webir.mjs` and serves routes with `simulateHandler` (D19). Literal handler returns (`return true`, object literals) now populate echo body when no explicit `effect.echo` — minimal simulator extension for CWL semantics, not a second runtime. Unsupported IR returns **501**. Rationale: authoring/preview without Hono emit; migrations still use chimera + verify.

- **2026-05-30 — D449** **Verify gaps → ingest remediation action (G149).** G147 ranked gaps; G149 closes the operator loop with `hub-verify-gaps-ingest-action.mjs`: `ingestRemediation` (owner, playbook, suggested re-ingest command), optional re-ingest when `CHRYSALIS_HUB_GAP_REINGEST=1`, artifact `.chrysalis/verify-gaps-ingest-action.json`. Wired into post-ingest-emit. Rationale: ingest work is owned by `packages/ingest`; the hub must surface the next concrete action per project, not only a global flagship report.

- **2026-05-30 — D450** **Hub-translate verify + evidence gate (G150).** `chrysalis-ingest-emit` already ran evidence gate; `hub-translate` did not. `hub-post-translate-verify.mjs` runs `chrysalis verify` when traces + `CHRYSALIS_HUB_VERIFY_BASE_URL` exist (honest skip otherwise); `chrysalis-hub-runners.mjs` adds verify + evidence gate after hub-translate. Opt out: `CHRYSALIS_HUB_POST_TRANSLATE_VERIFY=0`, `CHRYSALIS_HUB_VERIFY_GATE=0`. Rationale: “translate done” must mean the same verify gate as ingest-emit when traces are available.

- **2026-05-30 — D451** **PHP flagship hono=fastify emit parity (G151).** Plain-php and Symfony flagships now run gold + trace replay on **hono and fastify** (suites already existed; smoke scripts only ran hono). `emitParity` in flagship reports and hub-completion. Rationale: strategic plan requires emit parity on oracle slices before claiming PHP wedge reliability; express already proved tri-target on a separate track.

- **2026-05-30 — D453** **Hub license tier alignment (G153).** Phase 2 commercial alignment for **D289**: `hub-license-status.mjs` verifies local Ed25519 envelopes when `CHRYSALIS_REQUIRE_LICENSE=1`, maps hub operator actions to **dev/pro/enterprise** tiers, and gates batch/pipeline APIs in `chrysalis-operator-web.mjs`. Delivery dashboard (v2) and hub-completion surface license status; OSS default unchanged (gate off). Post-translate delivery bundle now also runs verify replay skip, verify-gaps action, and evidence snapshot (completing G150 in one translate path). Rationale: vendor distributions can enforce SKU tiers on Hub without a license server.

- **2026-05-30 — D452** **Console delivery dashboard (G152).** `hub-delivery-dashboard.mjs` aggregates evidence, migration assessment, verify-gaps backlog, chimera phase/gates, and `.chrysalis/` artifact checklist. Operator API `GET /api/hub/projects/{id}/delivery-dashboard`; Console **Delivery dashboard** button loads the aggregate. Rationale: Phase 2 Migration OS is usable only when operators see readiness, gaps, and artifacts in one view—not scattered JSON files.

- **2026-05-30 — D447** **Post-ingest-emit delivery on hub runner (G148).** The `chrysalis-ingest-emit` hub action bypassed `hub-translate`, so G146 delivery artifacts never ran for the primary PHP oracle path. `hub-post-ingest-emit.mjs` runs CWL/OpenAPI export, CWL diff, post-translate delivery bundle, and verify-gaps ingest; `chrysalis-hub-runners.mjs` invokes it after emit (before evidence gate). Opt out with `CHRYSALIS_HUB_POST_INGEST_EMIT=0`. Rationale: both hub translate and ingest-emit must leave the same migration OS artifact set on disk.

- **2026-05-30 — D461** **Hub verify license gate (G162).** G153 mapped `hub-verify-gate` to pro tier but operator verify endpoints were ungated. `POST …/sites/{id}/verify` and `POST …/verify-all-sites` now call `assertHubLicenseAllows("hub-verify-gate")` with **403 license-gate** on failure. `hub-cwl-preview` registered as dev-tier feature on the same map.

- **2026-05-30 — D466** **Laravel-min hub smoke (G167).** `hub-laravel-min-smoke.mjs` checks `flagship/laravel-min` route manifest (≥15 routes) and links to merged Laravel verify-gaps backlog; surfaced under `laravelMinSmoke` in hub-completion schema v41.

- **2026-05-30 — D465** **Verify license gate depth (G166).** G162 gated verify POST endpoints; G166 adds the same `hub-verify-gate` check inside `startProjectVerifyJob` (async verify jobs) and on `GET …/projects/{id}/evidence` so license enforcement cannot be bypassed via alternate entry points.

- **2026-05-30 — D464** **Hub completion schema 41 + emit parity gates (G165).** Schema v41 CI requires `emitParity.ok` on plain-php, symfony, and express flagships; `laravelVerifyGaps.ingestNext` when backlog is non-empty; `laravelVerifyGaps.actionScript`; and `laravelMinSmoke.ok`.

- **2026-05-30 — D463** **Persist CWL preview artifact (G164).** G156/G160 previewed CWL in memory and the delivery dashboard; G164 writes `.chrysalis/cwl-preview.json` via `writeCwlPreviewArtifacts` on post-translate and post-ingest-emit so operators and diff tools have a stable on-disk contract snapshot.

- **2026-05-30 — D462** **Laravel verify-gaps global ingest action (G163).** G159 merged flagship verify failures into a global backlog; G163 closes the operator loop with `hub-laravel-verify-gaps-action.mjs` (`ingestRemediation`, suggested re-verify command) and operator API `GET /api/hub/laravel-verify-gaps-action`. Per-project remediation remains G149; this is repo-level P0 ingest prioritization owned by `packages/ingest`.

- **2026-05-30 — D470** **Hub completion schema 42 (G171).** Completion report carries `laravelVerifyGapsAction` and `hubEvidence.schemaVersion: 3`; CI v42 gates require both.

- **2026-05-30 — D469** **Hub evidence verify-gaps pipeline gate (G170).** Evidence schema v3 composes per-project and Laravel-global verify-gaps into blockers; `CHRYSALIS_HUB_EVIDENCE_FAIL_ON_INGEST_GAPS=1` extends the pipeline evidence gate to fail on ingest backlog (default off).

- **2026-05-30 — D468** **Migration assessment Laravel global action (G169).** Assessment and Console delivery panel surface `laravelGlobalAction.ingestRemediation` with suggested re-verify command for Laravel-tagged sites.

- **2026-05-30 — D467** **Delivery dashboard v4 + Laravel global action (G168).** Dashboard schema v4 adds `laravelGlobalAction`; reads persisted `.chrysalis/cwl-preview.json` when present before live preview build.

- **2026-05-30 — D471** **Laravel auth probe ingest closure (G172).** M6A static probe lowering (D190) already produced correct JSON for `chrysalis-auth-probe` and `chrysalis-socialite-fortify-probe`; G172 adds committed fixture `fixtures/laravel-auth-probe` + Vitest coverage and updates `fixtures/hub-laravel-verify-gaps` to resolved verify (correctness 1). Synthetic backlog moves to `fixtures/hub-laravel-verify-gaps-backlog` for hub operator/backlog UI tests only.

- **2026-05-30 — D474** **Hub completion schema 43 (G175).** Completion carries `hubEvidence.schemaVersion: 4` and `laravelVerifyLive.exportScript`; CI v43 gates both.

- **2026-05-30 — D473** **Hub evidence v4 plan → pipeline gate (G174).** Evidence schema v4 composes `migrationPlan` from `.chrysalis/migration-assessment.json` and exposes `pipelineGate` (verify + blockers, contract waiver for scan-only/assess tiers). Hub-translate runner appends evidence gate step; optional strict fail via `CHRYSALIS_HUB_PIPELINE_GATE_STRICT=1`. Console evidence panel shows program/tier and top next step.

- **2026-05-31 — D820** **Hub completion schema 58 (G560).** Translate CWL roundtrip all origins + flagship CWL roundtrip; CI gates v58.
- **2026-05-31 — D821** **hub-project-to-cwl-roundtrip-smoke (G561).** Project export migration.cwl route-surface re-lift all 23 origins.
- **2026-05-31 — D822** **CWL universal mega batch v3 (G562).** Includes project-to-CWL roundtrip smoke.
- **2026-05-31 — D823** **Capability matrix v17 (G563).** Project-to-CWL roundtrip script metadata.
- **2026-05-31 — D824** **Delivery dashboard v19 (G564).** month15Program project roundtrip env gate.
- **2026-05-31 — D825** **Hub evidence schema v16 (G565).** requireProjectToCwlRoundtripEnv.
- **2026-05-31 — D826** **ci-gates v59 (G566).** Project-to-CWL roundtrip + universal mega v3 gates.
- **2026-05-31 — D827** **Strategic test G590 (G567).** Schema 59 project roundtrip smokes.
- **2026-05-31 — D828** **ci-gates v59 test (G568).** Accepts schema v59 payloads.
- **2026-05-31 — D829** **Hub completion schema 59 (G590).** Project-to-CWL roundtrip all origins.
- **2026-05-31 — D830** **hub-contract-import-cwl-roundtrip-smoke (G591).** OpenAPI + HAR import migration.cwl route-surface re-lift.
- **2026-05-31 — D831** **CWL universal mega batch v4 (G592).** Includes contract import CWL roundtrip.
- **2026-05-31 — D832** **Capability matrix v18 (G593).** Contract import roundtrip script metadata.
- **2026-05-31 — D833** **Delivery dashboard v20 (G594).** month16Program contract import roundtrip env gate.
- **2026-05-31 — D834** **Hub evidence schema v17 (G595).** requireContractImportCwlRoundtripEnv.
- **2026-05-31 — D835** **ci-gates v60 (G596).** Contract import CWL roundtrip + universal mega v4 gates.
- **2026-05-31 — D836** **Strategic test G620 (G597).** Schema 60 contract import roundtrip smokes.
- **2026-05-31 — D837** **ci-gates v60 test (G598).** Accepts schema v60 payloads.
- **2026-05-31 — D839** **Hub completion schema 60 (G620).** Contract import CWL roundtrip OpenAPI + HAR.
- **2026-05-31 — D840** **hub-php-oracle-micro-verify-batch-smoke (G621).** tiny-blog oracle micro + Next.js trace verify.
- **2026-05-31 — D841** **Oracle product ultra batch v2 (G622).** Includes PHP oracle micro verify.
- **2026-05-31 — D842** **Capability matrix v19 (G623).** Oracle micro verify batch metadata.
- **2026-05-31 — D843** **Delivery dashboard v21 (G624).** month17Program PHP oracle micro verify.
- **2026-05-31 — D844** **Hub evidence schema v18 (G625).** requirePhpOracleMicroVerifyEnv.
- **2026-05-31 — D845** **ci-gates v61 (G626).** PHP oracle micro verify + oracle ultra v2 gates.
- **2026-05-31 — D846** **Strategic test G650 (G627).** Schema 61 PHP oracle micro verify smokes.
- **2026-05-31 — D847** **ci-gates v61 test (G628).** Accepts schema v61 payloads.
- **2026-05-31 — D849** **Hub completion schema 61 (G650).** PHP oracle micro verify batch on tiny-blog.
- **2026-05-31 — D850** **hub-php-nextjs-verify-batch-smoke (G651).** tiny-blog + plain-php + symfony Next.js trace verify.
- **2026-05-31 — D851** **Oracle product ultra batch v3 (G652).** Includes PHP Next.js verify batch.
- **2026-05-31 — D852** **Capability matrix v20 (G653).** PHP Next.js verify batch metadata.
- **2026-05-31 — D853** **Delivery dashboard v22 (G654).** month18Program PHP Next.js verify batch.
- **2026-05-31 — D854** **Hub evidence schema v19 (G655).** requirePhpNextjsVerifyBatchEnv.
- **2026-05-31 — D855** **ci-gates v62 (G656).** PHP Next.js verify batch + oracle ultra v3 gates.
- **2026-05-31 — D856** **Strategic test G680 (G657).** Schema 62 PHP Next.js verify smokes.
- **2026-05-31 — D857** **ci-gates v62 test (G658).** Accepts schema v62 payloads.
- **2026-05-31 — D859** **Hub completion schema 62 (G680).** PHP Next.js verify batch all PHP flagships.
- **2026-05-31 — D860** **hub-laravel-verify-gaps-batch-smoke (G681).** Verify gaps export + ingest action batch.
- **2026-05-31 — D861** **hub-php-wedge-batch-smoke (G682).** Next.js verify + oracle micro + Laravel gaps + Node express oracle.
- **2026-05-31 — D862** **Oracle product ultra batch v4 (G683).** Includes PHP wedge batch.
- **2026-05-31 — D863** **Capability matrix v21 (G684).** PHP wedge batch metadata.
- **2026-05-31 — D864** **Delivery dashboard v23 (G685).** month19Program PHP wedge batch.
- **2026-05-31 — D865** **Hub evidence schema v20 (G686).** requirePhpWedgeBatchEnv.
- **2026-05-31 — D866** **ci-gates v63 (G687).** PHP wedge batch + oracle ultra v4 gates.
- **2026-05-31 — D867** **Strategic test G710 (G688).** Schema 63 PHP wedge smokes.
- **2026-05-31 — D868** **ci-gates v63 test (G689).** Accepts schema v63 payloads.
- **2026-05-31 — D870** **Hub completion schema 63 (G710).** PHP wedge batch oracle product depth.
- **2026-05-31 — D871** **hub-evidence-mvp-batch-smoke (G711).** Verify trend + holes + plan → pipeline gate.
- **2026-05-31 — D872** **Evidence standalone mega batch v2 (G712).** Includes hub evidence MVP batch.
- **2026-05-31 — D873** **Capability matrix v22 (G713).** Hub evidence MVP batch metadata.
- **2026-05-31 — D874** **Delivery dashboard v24 (G714).** month20Program hub evidence MVP.
- **2026-05-31 — D875** **Hub evidence schema v21 (G715).** requireHubEvidenceMvpBatchEnv.
- **2026-05-31 — D876** **ci-gates v64 (G716).** Hub evidence MVP + evidence mega v2 gates.
- **2026-05-31 — D877** **Strategic test G740 (G717).** Schema 64 hub evidence MVP smokes.
- **2026-05-31 — D878** **ci-gates v64 test (G718).** Accepts schema v64 payloads.
- **2026-05-31 — D880** **Hub completion schema 64 (G740).** Hub evidence MVP migration-OS readout.
- **2026-05-31 — D881** **hub-wptp-strict-batch-smoke (G741).** Strict Next.js verify + WPTP matrix gold.
- **2026-05-31 — D882** **Capability matrix v23 (G742).** WPTP strict batch metadata.
- **2026-05-31 — D883** **Delivery dashboard v25 (G743).** month21Program WPTP strict batch.
- **2026-05-31 — D884** **Hub evidence schema v22 (G744).** requireWptpStrictBatchEnv.
- **2026-05-31 — D885** **ci-gates v65 (G745).** WPTP strict batch + REQUIRE_WPTP_NEXTJS no-skip gates.
- **2026-05-31 — D886** **CI typecheck-and-test (G746).** REQUIRE_WPTP_NEXTJS on hub completion job.
- **2026-05-31 — D887** **Strategic test G770 (G747).** Schema 65 WPTP strict smokes.
- **2026-05-31 — D888** **ci-gates v65 test (G748).** Accepts schema v65 payloads.
- **2026-05-31 — D890** **Hub completion schema 65 (G770).** Strict WPTP CI wiring.
- **2026-05-31 — D891** **hub-flagship-full-gaps-batch-smoke (G771).** Plain-php + symfony + express verify gaps → ingest.
- **2026-05-31 — D892** **hub-flagship-verify-gaps-standalone-smoke (G772).** Per-flagship gaps export + ingest action.
- **2026-05-31 — D893** **Verify product ultra batch v2 (G773).** Includes flagship-full gaps batch.
- **2026-05-31 — D894** **Capability matrix v24 (G774).** Flagship-full gaps batch metadata.
- **2026-05-31 — D895** **Delivery dashboard v26 (G775).** month22Program flagship-full gaps.
- **2026-05-31 — D896** **Hub evidence schema v23 (G776).** requireFlagshipFullGapsBatchEnv.
- **2026-05-31 — D897** **ci-gates v66 (G777).** Flagship-full gaps + verify product ultra v2 gates.
- **2026-05-31 — D898** **Strategic test G800 (G778).** Schema 66 flagship-full gaps smokes.
- **2026-05-31 — D899** **ci-gates v66 test (G779).** Accepts schema v66 payloads.
- **2026-05-31 — D900** **Hub completion schema 66 (G800).** Flagship-full gaps → ingest depth.
- **2026-05-31 — D901** **fixtures/ci/hub-flagship-express-verify-for-status (G801).** Committed express verify seed for gaps/status.
- **2026-05-31 — D902** **hub-express-flagship-verify-seed (G802).** Copy CI seed into express flagship reports.
- **2026-05-31 — D903** **hub-flagship-full-gaps-batch-smoke v2 (G803).** Express verify seed before gaps export.
- **2026-05-31 — D904** **hub-laravel-verify-gaps-ingest-closure-smoke (G804).** Backlog fixture → ingest remediation.
- **2026-05-31 — D905** **hub-gap-reingest-batch-smoke (G805).** Remediation probe + optional `CHRYSALIS_HUB_GAP_REINGEST`.
- **2026-05-31 — D906** **hub-gaps-ingest-closure-batch-smoke (G806).** Express seed + flagship gaps v2 + Laravel closure + reingest.
- **2026-05-31 — D907** **Verify product ultra batch v3 (G807).** Includes gaps ingest closure batch.
- **2026-05-31 — D908** **Capability matrix v25 (G808).** Gaps ingest closure batch metadata.
- **2026-05-31 — D909** **Delivery dashboard v27 (G809).** month23Program gaps ingest closure.
- **2026-05-31 — D910** **Hub evidence schema v24 (G810).** requireGapsIngestClosureBatchEnv + requireGapReingestEnv.
- **2026-05-31 — D911** **ci-gates v67 (G811).** Gaps ingest closure + verify product ultra v3 gates.
- **2026-05-31 — D912** **package.json hub:* scripts (G812).** Express seed, Laravel closure, gap reingest, gaps closure batch.
- **2026-05-31 — D913** **Strategic test G830 (G813).** Schema 67 gaps ingest closure smokes.
- **2026-05-31 — D914** **ci-gates v67 test (G814).** Accepts schema v67 payloads.
- **2026-05-31 — D930** **Hub completion schema 67 (G830).** Gaps ingest closure tranche.
- **2026-05-31 — D931** **hub-gaps-ingest-strict-batch-smoke (G831).** Closure + live Laravel + reingest strict probe.
- **2026-05-31 — D932** **hub-laravel-verify-live-gaps-closure-smoke (G832).** Live merged verify backlog closure.
- **2026-05-31 — D933** **hub-php-wedge-batch-smoke v2 (G833).** Includes gaps ingest closure batch.
- **2026-05-31 — D934** **Oracle product ultra batch v5 (G834).** Includes PHP wedge v2.
- **2026-05-31 — D935** **Evidence standalone mega batch v3 (G835).** Includes gaps ingest closure.
- **2026-05-31 — D936** **Verify gaps origin batch v2 (G836).** Plain-php flagship gaps + express seed.
- **2026-05-31 — D937** **hub-gap-reingest-strict-smoke (G837).** Remediation probe + optional `CHRYSALIS_HUB_GAP_REINGEST_STRICT`.
- **2026-05-31 — D938** **CI typecheck-and-test (G838).** `CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH=1` on hub completion.
- **2026-05-31 — D939** **Capability matrix v26 (G839).** Gaps ingest strict batch metadata.
- **2026-05-31 — D940** **Delivery dashboard v28 (G840).** month24Program gaps ingest strict.
- **2026-05-31 — D941** **Hub evidence schema v25 (G841).** requireGapReingestStrictEnv.
- **2026-05-31 — D942** **ci-gates v68 (G842).** Gaps ingest strict + mega batch v3/v5 gates.
- **2026-05-31 — D943** **Verify product ultra batch v4 (G843).** Includes gaps ingest strict batch.
- **2026-05-31 — D944** **Strategic test G860 (G844).** Schema 68 gaps ingest strict smokes.
- **2026-05-31 — D945** **ci-gates v68 test (G845).** Accepts schema v68 payloads.
- **2026-05-31 — D960** **Hub completion schema 68 (G860).** Strict gaps ingest CI + live Laravel closure.
- **2026-05-31 — D961** **hub-laravel-auth-probe-reingest-smoke (G861).** Laravel-auth-probe + backlog → strict reingest exit 0.
- **2026-05-31 — D962** **hub-gap-reingest-batch-smoke v2 (G862).** Copies full laravel-auth-probe fixture tree.
- **2026-05-31 — D963** **hub-gaps-ingest-strict-batch-smoke v2 (G863).** Includes auth-probe strict reingest.
- **2026-05-31 — D964** **hub-php-wedge-batch-smoke v3 (G864).** Includes gaps ingest strict batch v2.
- **2026-05-31 — D965** **Oracle product ultra batch v6 (G865).** Includes PHP wedge v3.
- **2026-05-31 — D966** **Evidence standalone mega batch v4 (G866).** Includes gaps ingest strict v2.
- **2026-05-31 — D967** **Verify product ultra batch v5 (G867).** Includes laravel-auth-probe reingest.
- **2026-05-31 — D968** **Capability matrix v27 (G868).** Auth-probe reingest + batch v2/v3 metadata.
- **2026-05-31 — D969** **Delivery dashboard v29 (G869).** month25Program auth-probe strict reingest.
- **2026-05-31 — D970** **Hub evidence schema v26 (G870).** Hub completion evidence gate bump.
- **2026-05-31 — D971** **CI typecheck-and-test (G871).** `CHRYSALIS_HUB_GAP_REINGEST_STRICT=1` on hub completion.
- **2026-05-31 — D972** **ci-gates v69 (G872).** laravelAuthProbeReingest + mega batch v3/v4/v5/v6 gates.
- **2026-05-31 — D973** **hub-gap-reingest-strict-smoke v2 (G873).** Exports gap reingest batch schema v2.
- **2026-05-31 — D974** **package.json hub:* script (G874).** `hub:laravel-auth-probe-reingest-smoke`.
- **2026-05-31 — D975** **Strategic test G890 (G875).** Schema 69 auth-probe strict reingest smokes.
- **2026-05-31 — D976** **ci-gates v69 test (G876).** Accepts schema v69 payloads.
- **2026-05-31 — D990** **Hub completion schema 69 (G890).** Auth-probe strict reingest CI closure.
- **2026-05-31 — D991** **hub-laravel-auth-probe-verify-seed (G891).** Resolved verify summary after auth-probe reingest.
- **2026-05-31 — D992** **hub-laravel-auth-probe-reingest-verify-closure-smoke (G892).** Strict reingest + backlog 0 / correctness 1.
- **2026-05-31 — D993** **hub-gap-reingest-batch-smoke v3 (G893).** Strict reingest + verify closure env wiring.
- **2026-05-31 — D994** **hub-laravel-auth-probe-reingest-smoke v2 (G894).** Includes verify closure after strict reingest.
- **2026-05-31 — D995** **hub-laravel-verify-live-gaps-closure-smoke v2 (G895).** Live backlog 0 + auth-probe verify closure.
- **2026-05-31 — D996** **hub-gaps-ingest-strict-batch-smoke v3 (G896).** Includes auth-probe verify closure.
- **2026-05-31 — D997** **hub-php-wedge-batch-smoke v4 (G897).** Includes gaps ingest strict batch v3.
- **2026-05-31 — D998** **Oracle product ultra batch v7 (G898).** Includes PHP wedge v4.
- **2026-05-31 — D999** **Evidence standalone mega batch v5 (G899).** Includes auth-probe verify closure.
- **2026-05-31 — D1000** **Verify product ultra batch v6 (G900).** Includes auth-probe verify closure.
- **2026-05-31 — D1001** **hub-verify-gaps-ingest-action v2 (G901).** Post-reingest verify closure seed.
- **2026-05-31 — D1002** **Capability matrix v28 (G902).** Verify closure + batch v3/v4/v5/v6/v7 metadata.
- **2026-05-31 — D1003** **Delivery dashboard v30 (G903).** month26Program verify closure.
- **2026-05-31 — D1004** **Hub evidence schema v27 (G904).** requireGapReingestVerifyClosureEnv.
- **2026-05-31 — D1005** **CI typecheck-and-test (G905).** `CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE=1` on hub completion.
- **2026-05-31 — D1006** **ci-gates v70 (G906).** laravelAuthProbeVerifyClosure + mega batch v4/v5/v6/v7 gates.
- **2026-05-31 — D1007** **package.json hub:* scripts (G907).** verify-seed + verify-closure smokes.
- **2026-05-31 — D1008** **Strategic test G920 (G908).** Schema 70 auth-probe verify closure smokes.
- **2026-05-31 — D1009** **ci-gates v70 test (G909).** Accepts schema v70 payloads.
- **2026-05-31 — D1020** **Hub completion schema 70 (G920).** Auth-probe verify closure + live Laravel backlog zero.
- **2026-05-31 — D1021–D1050** **Hub completion schema 71 (G921–G950).** Real post-reingest verify replay (`hub-verify-replay.mjs`, `CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY`); multi-flagship trace replay batch; IR helper lifting smoke (post-2.0 option B); ci-gates v71; plan amendment month27Program in `docs/STRATEGIC-PLAN.md`. Seed-based verify closure (schema 70) remains for fast pipeline probes; replay is the stronger correctness gate in CI.
- **2026-05-31 — D1051–D1080** **Hub completion schema 72 (G951–G980).** HTTP oracle verify after reingest (`hub-verify-http.mjs`, `CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP`); shared probe corpus; multi-flagship HTTP verify batch; IR helper semantic lifting smoke (B3); ci-gates v72; plan amendment month28Program. HTTP verify takes precedence over in-process replay when both env vars are set. **DESIGN §3** unchanged.
- **2026-05-31 — D1081–D1110** **Hub completion schema 73 (G981–G1010).** IR helper embed lifting smoke (B4, `--ingest-embed-shared-helper-bodies`); Fastify HTTP oracle verify for auth-probe and multi-flagship batch; batch bumps (php-wedge v7, gaps-ingest-strict v6, flagship-full-gaps v5, verify-product-ultra v9, evidence mega v8, oracle ultra v10); ci-gates v73; plan amendment month29Program. **DESIGN §3** unchanged.
- **2026-06-01 — D1111–D1140** **Hub completion schema 74 (G1011–G1040).** Hub verify-gaps program graduation: reingest + Fastify HTTP via `CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP_TARGET`; IR helper B1–B4 full-path smoke; verify-gaps-ingest-action v5; improved HTTP server teardown; ci-gates v74; plan amendment month30Program. **DESIGN §3** unchanged.
- **2026-06-01 — D1141** **Strategic amendment: full-stack CWL + accelerated authoring/runtime.** User explicitly amended strategy to pursue CWL as a full-stack language target, start authoring as soon as viable, and treat runtime as a first-class objective (not optional backlog). `docs/STRATEGIC-PLAN.md` now updates CWL Stage C/D timing, elevates runtime acceleration, adds a parallel full-stack CWL track, and refreshes next-90-days priorities toward authoring/runtime/tooling gates. `ROADMAP.md` strategic table is aligned to this new phase model. **DESIGN §3 non-negotiables remain in force** (holes-first, oracle/verify truth, no silent claims of parity).
- **2026-06-01 — D1143** **CWL RFC-0010 full-stack page surface (G1143).** `@page` + `page { ... }` + `return html "..."` in `cwl-parser`/`cwl-ingest`; authoring bootstrap includes home page; gold `cwl-fullstack-{hono,fastify}` on `fixtures/hub-gold-cwl-fullstack`; runtime-cwl sets HTML content-type for `<` bodies. Component/SSR/hydration remain future holes. **DESIGN §3** unchanged.
- **2026-06-01 — D1145** **CWL RFC-0011 layouts + page params (G1145).** Layout fragments via RFC-0009 `import`; parametric `@page` routes; gold `fixtures/hub-gold-cwl-layout`; `hub:cwl-layout-smoke`. **DESIGN §3** unchanged.
- **2026-06-01 — D1146** **CWL @page emit round-trip (G1146).** `renderCwlRoutes` emits `@page`/`return html` for HTML surfaces; `walkCwlHandlerBody` detects page kind from response attrs/body; `hub:cwl-fullstack-roundtrip-smoke`. **DESIGN §3** unchanged.
- **2026-06-01 — D1144** **SvelteKit hub origin v0 (G1144).** `svelte` origin in language catalog; `sveltekit-route-lift.mjs` for `+server.ts` / `+page.svelte` file routes; gold fixture `hub-gold-svelte-kit`; `hub:sveltekit-smoke`. Page components remain explicit holes. **DESIGN §3** unchanged.
- **2026-06-01 — D1178** **hub-completion full-stack depth gates (G1178).** Schema **75** adds `hub:cwl-authoring-batch-v2-smoke` gate. **DESIGN §3** unchanged.

- **2026-06-01 — D1179–D1188** **Full-stack CWL queue 3 (G1179–G1188).** Flagship page-load route; production sidecar probe; Svelte load-bound `{#if}`; Next.js `page.server.ts` load; deep export smokes; page-load parity; authoring batch v3; hub-completion schema **76**; delivery dashboard `pageLoadRouteCount`. **DESIGN §3** unchanged.

- **2026-06-01 — D1189–D1198** **Full-stack CWL queue 4 (G1189–G1198).** CWL HTML `html.template` interpolation; load env binding; Svelte/Next.js template depth; interpolation smokes; authoring batch v4; hub-completion schema **77**. **DESIGN §3** unchanged.

- **2026-06-01 — D1199–D1208** **Full-stack CWL queue 5 (G1199–G1208).** RFC-0014 HTML interpolation; Svelte blog slug template; HTML round-trip; HTTP verify in batch v5; hub-completion schema **78**. **DESIGN §3** unchanged.
- **2026-06-01 — D1209–D1358** **Full-stack CWL queues 6–20 (G1209–G1358).** Query/load/layout/diagnose gates; OpenAPI page surfaces; bootstrap v2; delivery interpolation metric; hono emit probe; Next/Svelte search origins; hole budget v2; mega-origin + graduation batch v20; hub-completion schema **93**. **DESIGN §3** unchanged.
- **2026-06-01 — D1359–D1368** **Full-stack CWL queue 21 (G1359–G1368).** RFC-0015 production-readiness probes; runtime `/search?q=` smoke; batch v21; hub-completion schema **94**; queues 21–30 program index. **DESIGN §3** unchanged.
- **2026-06-01 — D1659–D1758** **Full-stack CWL queues 51–60 (G1659–G1758).** CWL flagship HTTP oracle verify; verify-gaps ingest + action on fullstack; post-50 composite/graduation; fast batch chain env; hub-completion schema **133**. **DESIGN §3** unchanged.
- **2026-06-01 — D1559–D1658** **Full-stack CWL queues 41–50 (G1559–G1658).** Flagship pilot + delivery + chimera + verify-gaps action + preview; post-40 composite/graduation; hub-completion schema **123**; ROADMAP G-id fix queues 24–29. **DESIGN §3** unchanged.
- **2026-06-01 — D1459–D1558** **Full-stack CWL queues 31–40 (G1459–G1558).** Post-30 verify-gaps bridge; runtime hono parity + production probes; project-to-CWL roundtrip; graduation replay; post-30 composite + graduation; hub-completion schema **113**; v30 graduation-only CI mode. **DESIGN §3** unchanged.
- **2026-06-01 — D1369–D1458** **Full-stack CWL queues 22–30 (G1369–G1458).** Fastify search verify; Next/Svelte searchParams export; RFC-0016 form-action probe; session stub; Express depth; diagnose v2; emit mega batch; Phase 6 graduation batch v30; hub-completion schema **103**. **DESIGN §3** unchanged.

- **2026-06-01 — D1169–D1177** **Full-stack CWL queue 2 (G1169–G1177).** runtime-cwl `__page_load`, bootstrap `layouts/shell.cwl`, deep Svelte/Next.js export smokes, hono parity, production `/about` probe, static `{#if true|false}` Svelte lift, page-load HTML sidecar. **DESIGN §3** unchanged.

- **2026-06-01 — D1168** **runtime-cwl production readiness gates (G1168).** Multi-route flagship probes (GET pages, GET/POST API) via `@chrysalis/runtime-cwl`; `hub:cwl-runtime-production-smoke`. No SQL/session production claims. **DESIGN §3** unchanged.

- **2026-06-01 — D1167** **Next.js App Router origin v0 (G1167).** `nextjs-route-lift.mjs` for `app/**/route.ts` + static JSX pages; `fixtures/hub-gold-nextjs-app`; `hub:nextjs-app-smoke`; RFC-0012 `hub-next:*` holes. **DESIGN §3** unchanged.

- **2026-06-01 — D1166** **Hole budget on delivery dashboard (G1166).** `buildDeliveryDashboard` exposes `fullstackHoleBudget` check vs live CWL hole count; Console summary PASS/FAIL. **DESIGN §3** unchanged.

- **2026-06-01 — D1165** **Hub bootstrap → flagship template (G1165).** `chrysalis cwl init` / portal bootstrap seeds flagship routes + `chrysalis.fullstack-hole-budget.json` sidecar. **DESIGN §3** unchanged.

- **2026-06-01 — D1164** **CWL formatter v1 (G1164).** `chrysalis cwl fmt` + `cwl-fmt.mjs` WebIR round-trip normalize. **DESIGN §3** unchanged.

- **2026-06-01 — D1163** **Svelte template partial lift (G1163).** Static `{@html "..."}` and literal-array `{#each}` in `liftStaticSveltePageHtml`. **DESIGN §3** unchanged.

- **2026-06-01 — D1162** **Flagship migration contract export (G1162).** `exportProjectMigrationCwl` attaches `fullstackHoleBudget` + check to `cwl-export.json`; smoke. **DESIGN §3** unchanged.

- **2026-06-01 — D1161** **Full-stack flagship HTTP verify (G1161).** CWL origin synthesizes `chrysalis.routes.json` for verify CLI; live hono/fastify `--base-url` smoke. **DESIGN §3** unchanged.

- **2026-06-01 — D1160** **Page + load CWL emit merge (G1160).** `load { … };` in parser/emit/ingest; `__page_load` WebIR marker; merged `@page` surfaces. **DESIGN §3** unchanged.

- **2026-06-01 — D1159** **RFC-0013 load-function lowering v1 (G1159).** Simple SvelteKit `+page.server.ts` load lowers to WebIR + CWL; deep fixture smoke load hole-free. **DESIGN §3** unchanged.

- **2026-06-01 — D1159-plan** **Full-stack CWL next-10 queue (planning).** Locked implementation order **G1159–G1168** in `docs/CWL-FULLSTACK-NEXT-10.md`, `ROADMAP.md`, and `STRATEGIC-PLAN.md` §12. Covers load-function RFC, page/load emit, flagship HTTP verify, Hub template/evidence, Svelte template depth, CWL fmt, Next.js origin, runtime-cwl production gates. **No code in this entry** — queue authority only. **DESIGN §3** unchanged.

- **2026-06-01 — D1158** **SvelteKit deep lift (G1158).** Multi-method `+server` exports (POST); `+page.server.ts` → catalogued **`hub-svelte:load-function`** hole on page route; `{#if}` blocks stay **`hub-svelte:page-component`**; deep fixture + budget smoke. **DESIGN §3** unchanged.
- **2026-06-01 — D1157** **CWL full-stack flagship pilot (G1157).** **`fixtures/hub-flagship-cwl-fullstack`** with **`chrysalis.fullstack-hole-budget.json`** (0 holes); preview/diagnose/gold evidence gate. **DESIGN §3** unchanged.
- **2026-06-01 — D1156** **Hub CWL diagnose API (G1156).** `GET /api/hub/cwl-diagnose`; Console preview POST embeds **`diagnose`** summary. **DESIGN §3** unchanged.
- **2026-06-01 — D1155** **CWL authoring batch smoke (G1155).** `hub-cwl-authoring-batch-smoke.mjs` batches runtime parity + SvelteKit lift/export. **DESIGN §3** unchanged.
- **2026-06-01 — D1154** **svelte → CWL gold suite (G1154).** **`svelte-literal-cwl`** on **`hub-gold-svelte-kit`**. **DESIGN §3** unchanged.
- **2026-06-01 — D1153** **SvelteKit AST lift depth (G1153).** **`liftSvelteKitServerHandlerBody`** (`json()` + `params.*`); **`liftStaticSveltePageHtml`** + **`lowerHubHtmlPageBody`**; gold fixture hole-free. **DESIGN §3** unchanged.
- **2026-06-01 — D1152** **CWL lint/diagnostics v0 (G1152).** `cwl-diagnose.mjs` reports parse errors, duplicate routes, catalogued vs uncatalogued holes; **`chrysalis cwl lint`**. **DESIGN §3** unchanged.
- **2026-06-01 — D1151** **runtime-cwl full-stack parity smoke (G1151).** `hub-cwl-runtime-parity-smoke.mjs` probes RFC-0010/0011 gold fixtures via `@chrysalis/runtime-cwl`; **`simulateHandler`** evaluates **`web.request.response`** for CWL page/API status+body; **`hub-cwl-preview`** resolves built **`runtime-cwl`** from repo **`dist/`** when workspace import fails. **DESIGN §3** unchanged.
- **2026-06-01 — D1150** **Hub Console CWL preview (G1150).** `POST /api/hub/cwl-preview` writes `cwl-preview.json`; Console **Preview CWL runtime** button runs in-process probe. **DESIGN §3** unchanged.
- **2026-06-01 — D1149** **CWL RFC-0012 component holes (G1149).** `cwl-fullstack-holes.mjs` catalogs SvelteKit hole reasons; SvelteKit lift references registry. **DESIGN §3** unchanged.
- **2026-06-01 — D1148** **SvelteKit → CWL export (G1148).** Lift → emit → `exportProjectMigrationCwl` for `svelte` origin; `hub-sveltekit-cwl-export-smoke`. Holes remain explicit per RFC-0012. **DESIGN §3** unchanged.
- **2026-06-01 — D1147** **Hub CWL full-stack project bootstrap (G1147).** Portal **New CWL full-stack project** creates local hub workspace with `cwlBootstrap` → `.chrysalis/migration.cwl` via `writeCwlPreviewArtifacts`. **DESIGN §3** unchanged.

- **2026-05-31 — D810** **ci-gates v58 test (G540).** Accepts schema v58 complete CWL universe payloads.

- **2026-05-31 — D809** **Strategic test G560 (G539).** Schema 58 complete CWL universe smokes.

- **2026-05-31 — D808** **ci-gates v58 (G538).** Flagship + translate CWL roundtrip gates.

- **2026-05-31 — D807** **Hub evidence schema v15 (G537).** `requireTranslateCwlRoundtripEnv` + `requireFlagshipCwlRoundtripEnv`.

- **2026-05-31 — D806** **Delivery dashboard v18 (G536).** `month14Program` translate/flagship roundtrip.

- **2026-05-31 — D805** **Capability matrix v16 (G535).** Flagship + translate roundtrip metadata.

- **2026-05-31 — D804** **CWL universal mega batch v2 (G534).** Includes roundtrip + translate coverage + translate roundtrip.

- **2026-05-31 — D803** **hub-translate-cwl-roundtrip-smoke (G533).** Translate migration.cwl route-surface re-lift all 23 origins.

- **2026-05-31 — D802** **hub-cwl-flagship-roundtrip-batch-smoke (G532).** 3-suite flagship CWL roundtrip batch.

- **2026-05-31 — D801** **Flagship CWL roundTrip gold (G531).** plain-php/symfony/express flagship CWL re-lift.

- **2026-05-31 — D800** **Hub completion schema 57 (G530).** CWL literal roundtrip gold + translate CWL all origins; CI gates v57.

- **2026-05-31 — D799** **ci-gates v57 test (G510).** Accepts schema v57 roundtrip + translate-all payloads.

- **2026-05-31 — D798** **Strategic test G530 (G509).** Schema 57 roundtrip + translate-all smokes.

- **2026-05-31 — D797** **ci-gates v57 (G508).** Roundtrip batch + translate 23-origin gates.

- **2026-05-31 — D796** **Hub evidence schema v14 (G507).** `requirePatternLiteralRoundtripEnv` + `requireTranslateCwlAllOriginsEnv`.

- **2026-05-31 — D795** **Delivery dashboard v17 (G506).** `month13Program` roundtrip + translate-all.

- **2026-05-31 — D794** **Capability matrix v15 (G505).** Roundtrip + translate-all metadata.

- **2026-05-31 — D793** **translate-cwl all 23 origins (G504).** hub-translate exports migration.cwl per origin.

- **2026-05-31 — D792** **hub-cwl-pattern-literal-roundtrip-batch-smoke (G503).** 21-suite CWL roundtrip batch.

- **2026-05-31 — D791** **roundTrip on 21 literal-cwl suites (G502).** Pattern-lift + asset CWL roundtrip gold.

- **2026-05-31 — D790** **CWL roundtrip route parity (G501).** Compare exported CWL route count on re-lift.

- **2026-05-31 — D789** **Hub completion schema 56 (G500).** Pattern-literal CWL gold + translate CWL coverage; CI gates v56.

- **2026-05-31 — D788** **ci-gates v56 test (G489).** Accepts schema v56 pattern-literal CWL payloads.

- **2026-05-31 — D787** **Strategic test G500 (G488).** Schema 56 pattern-literal CWL smokes.

- **2026-05-31 — D786** **ci-gates v56 (G487).** Pattern literal CWL + translate CWL gates.

- **2026-05-31 — D785** **Hub evidence schema v13 (G486).** `requirePatternLiteralCwlEnv` + `requireTranslateCwlEnv`.

- **2026-05-31 — D784** **Delivery dashboard v16 (G485).** `month12Program` pattern-literal CWL.

- **2026-05-31 — D783** **Capability matrix v14 (G484).** patternLiteralCwl + translateCwl scripts.

- **2026-05-31 — D782** **cwlPatternLiteralGold completion (G483).** vue + asset CWL suite ids.

- **2026-05-31 — D781** **crossFrameworkCwlGold extended (G482).** kotlin/scala/swift metadata.

- **2026-05-31 — D780** **hub-translate-cwl-coverage-smoke (G481).** Translate path exports migration.cwl.

- **2026-05-31 — D779** **hub-cwl-pattern-literal-cwl-batch-smoke (G480).** 18-suite CWL gold batch.

- **2026-05-31 — D778** **Structural suite count 154 (G479).** +10 pattern-lift/asset CWL gold suites.

- **2026-05-31 — D777** **c/cpp literal-cwl gold (G478).** Native asset CWL suites.

- **2026-05-31 — D776** **css/scss/markdown/yaml literal-cwl gold (G477).** Asset CWL suites.

- **2026-05-31 — D775** **json-literal-cwl gold (G476).** json silver file-lift CWL suite.

- **2026-05-31 — D774** **html-literal-cwl gold (G475).** html silver file-lift CWL suite.

- **2026-05-31 — D773** **sql-literal-cwl gold (G474).** sql silver file-lift CWL suite.

- **2026-05-31 — D772** **vue-literal-cwl gold (G473).** vue pattern-lift CWL structural suite.

- **2026-05-31 — D771** **ensureProjectWebir on translate CWL path (G472).** Contract import lifts before export.

- **2026-05-31 — D770** **Silver file-lift literal CWL bodies (G471).** Asset origins hole-free on CWL emit.

- **2026-05-31 — D769** **Hub completion schema 55 (G470).** All 23 origins export CWL; CI gates v55.

- **2026-05-31 — D768** **ci-gates v55 test (G469).** Accepts schema v55 universal CWL payloads.

- **2026-05-31 — D767** **Strategic test G470 (G468).** Schema 55 universal CWL smokes.

- **2026-05-31 — D766** **month11Program completion (G467).** Universal CWL batches in completion report.

- **2026-05-31 — D765** **Oracle gates + universal CWL (G466).** Mega batch includes oracle fixture gates.

- **2026-05-31 — D764** **CWL projection on all origins (G465).** summarizeCwlProjection per origin export.

- **2026-05-31 — D763** **ensureWebir routeCount check (G464).** Lift must produce routes before CWL export.

- **2026-05-31 — D762** **CWL universal mega CLI (G463).** `pnpm run hub:cwl-universal-mega-batch-smoke`.

- **2026-05-31 — D761** **CWL all-origins CLI (G462).** `pnpm run hub:project-to-cwl-all-origins`.

- **2026-05-31 — D760** **Universal CWL mega in completion (G461).** cwlUniversalMegaBatch wired schema 55.

- **2026-05-31 — D759** **CWL origin count gate (G460).** ci-gates v55 requires originCount >= 23.

- **2026-05-31 — D758** **PHP tiny-blog CWL probe (G459).** php origin in universal registry uses tiny-blog.

- **2026-05-31 — D757** **Asset silver CWL coverage (G458).** File-lift origins export route-shell CWL.

- **2026-05-31 — D756** **Asset batch in completion (G455).** cwlAssetOriginsBatch wired.

- **2026-05-31 — D755** **Pattern-lift CWL coverage (G457).** ruby/csharp/kotlin/rust/scala/swift/vue export CWL.

- **2026-05-31 — D754** **CWL Stage-B sink for all origins (G456).** lift → WebIR → CWL on every origin probe.

- **2026-05-31 — D753** **App-stack batch in completion (G454).** cwlAppStackOriginsBatch wired.

- **2026-05-31 — D752** **Universal CWL strict CI env (G453).** `CHRYSALIS_HUB_COMPLETION_REQUIRE_UNIVERSAL_CWL` in ci-gates v55.

- **2026-05-31 — D751** **Hub evidence schema v12 (G452).** `requireUniversalCwlEnv` metadata.

- **2026-05-31 — D750** **Delivery dashboard v15 (G451).** `month11Program` universal CWL scripts.

- **2026-05-31 — D749** **Capability matrix v13 (G450).** cwlAllOrigins metadata (23 origins).

- **2026-05-31 — D748** **CWL batches in completion (G449).** all-origins + universal mega batches wired.

- **2026-05-31 — D747** **Universal CWL in completion (G448).** projectToCwlAllOrigins wired schema 55.

- **2026-05-31 — D746** **Asset-format CWL origins batch (G447).** sql/html/css/json/yaml/markdown/c/cpp/cwl.

- **2026-05-31 — D745** **App-stack CWL origins batch (G446).** php/js/ts/py/java/go + pattern-lift stacks.

- **2026-05-31 — D744** **CWL universal mega batch (G445).** all origins + CWL mega + oracle gates.

- **2026-05-31 — D743** **CWL all-origins batch (G444).** batch smoke over universal CWL export.

- **2026-05-31 — D742** **Project-to-CWL all origins (G443).** export migration.cwl for 23/23 hub origins.

- **2026-05-31 — D741** **ensureProjectWebir all origins (G442).** generalized lift for every origin language.

- **2026-05-31 — D740** **CWL origin fixtures registry (G441).** canonical probe map for all 23 hub origins.

- **2026-05-31 — D739** **Hub completion schema 54 (G440).** Origin depth + chimera/verify ultra batches; CI gates v54.

- **2026-05-31 — D738** **Verify product ultra in completion (G439).** Verify product ultra batch wired schema 54.

- **2026-05-31 — D737** **Chimera assessment mega in completion (G438).** Chimera assessment mega batch wired.

- **2026-05-31 — D736** **Origin depth ultra in completion (G437).** Origin depth ultra batch wired.

- **2026-05-31 — D735** **Per-origin depth in completion (G436).** Plain/symfony/express/Laravel-min depth batches wired.

- **2026-05-31 — D734** **Evidence standalone mega in completion (G435).** Evidence standalone mega batch wired.

- **2026-05-31 — D733** **Contract standalone mega in completion (G434).** Contract standalone mega batch wired.

- **2026-05-31 — D732** **Origin depth strict CI env (G433).** `CHRYSALIS_HUB_COMPLETION_REQUIRE_ORIGIN_DEPTH` in ci-gates v54.

- **2026-05-31 — D731** **Hub evidence schema v11 (G432).** `requireOriginDepthEnv` in completion hubEvidence block.

- **2026-05-31 — D730** **Verify standalone mega in completion (G429).** Verify standalone mega batch wired.

- **2026-05-31 — D729** **Artifacts origin in completion (G428).** Post-translate artifacts origin batch wired.

- **2026-05-31 — D728** **Delivery dashboard v14 (G431).** `month10Program` origin depth scripts.

- **2026-05-31 — D727** **Capability matrix v12 (G430).** Origin depth + chimera/verify ultra metadata.

- **2026-05-31 — D726** **Verify gaps origin in completion (G427).** Verify gaps origin batch wired.

- **2026-05-31 — D725** **Assessment origin in completion (G426).** Migration assessment origin batch wired.

- **2026-05-31 — D724** **Chimera origin in completion (G425).** Chimera cutover origin batch wired schema 54.

- **2026-05-31 — D723** **Verify product ultra batch (G424).** Verify gaps origin + verify standalone mega + laravel depth.

- **2026-05-31 — D722** **Chimera assessment mega batch (G423).** Chimera + assessment origin batches.

- **2026-05-31 — D721** **Origin depth ultra batch (G422).** Plain-php + symfony + express + tiny-blog depth.

- **2026-05-31 — D720** **Laravel-min depth batch (G421).** Site intel + path advice + CWL + assessment + chimera.

- **2026-05-31 — D719** **Express depth batch (G420).** Site intel + path advice + project-to-CWL express.

- **2026-05-31 — D718** **Symfony depth batch (G419).** Site intel + path advice + project-to-CWL symfony.

- **2026-05-31 — D717** **Plain-php depth batch (G418).** Site intel + path advice + project-to-CWL plain-php.

- **2026-05-31 — D716** **Evidence standalone mega batch (G417).** Evidence + WPTP gold standalone.

- **2026-05-31 — D715** **Contract standalone mega batch (G416).** Contract CWL + contract roundtrip.

- **2026-05-31 — D714** **Verify standalone mega batch (G415).** Playbooks + post-translate verify + node express oracle.

- **2026-05-31 — D713** **Post-translate artifacts origin batch (G414).** Symfony + express + Laravel-min artifacts.

- **2026-05-31 — D712** **Verify gaps origin batch (G413).** Symfony + express + Laravel-min verify gaps.

- **2026-05-31 — D711** **Migration assessment origin batch (G412).** All four origin assessments.

- **2026-05-31 — D710** **Chimera cutover origin batch (G411).** Plain-php + symfony + express + Laravel-min chimera.

- **2026-05-31 — D709** **Hub completion schema 53 (G410).** Ultra mega delivery + oracle batches; CI gates v53; pipeline runner v3.

- **2026-05-31 — D708** **Delivery pipeline runner schema v3 (G409).** Completion + ci-gates enforce runner v3.

- **2026-05-31 — D707** **month9Program completion (G408).** Ultra mega + advisory batches in completion.

- **2026-05-31 — D706** **Tiny-blog depth in completion (G407).** Tiny-blog depth batch wired.

- **2026-05-31 — D705** **Post-translate verify origins in completion (G406).** Origin verify batch wired schema 53.

- **2026-05-31 — D704** **Contract verify in completion (G405).** Contract verify standalone batch wired.

- **2026-05-31 — D703** **Oracle ultra strict CI env (G404).** `CHRYSALIS_HUB_COMPLETION_REQUIRE_ORACLE_ULTRA` in ci-gates v53.

- **2026-05-31 — D702** **Hub evidence schema v10 (G403).** `requireOracleUltraEnv` in completion hubEvidence block.

- **2026-05-31 — D701** **Delivery dashboard v13 (G402).** `month9Program` ultra batch scripts.

- **2026-05-31 — D700** **Capability matrix v11 (G401).** Ultra mega batches + tiny-blog depth metadata.

- **2026-05-31 — D699** **Express/symfony Laravel-min pairs in completion (G400).** Pair delivery batches wired.

- **2026-05-31 — D698** **Delivery pipeline runner v3 (G399).** Four-profile pipeline + runner; schema v3.

- **2026-05-31 — D697** **Contract verify standalone batch (G398).** Contract CWL + verify gaps action.

- **2026-05-31 — D696** **Tiny-blog depth batch (G397).** Site intel + path advice + project-to-CWL.

- **2026-05-31 — D695** **Path advice tiny-blog (G396).** Path advice smoke on tiny-blog.

- **2026-05-31 — D694** **Site intelligence tiny-blog (G395).** Site intel smoke on tiny-blog.

- **2026-05-31 — D693** **Project-to-CWL tiny-blog (G394).** Dedicated CWL export on tiny-blog.

- **2026-05-31 — D692** **Post-translate verify origin batch (G393).** Symfony + express + Laravel-min verify batch.

- **2026-05-31 — D691** **Post-translate verify express (G392).** Post-translate verify on express flagship.

- **2026-05-31 — D690** **Post-translate verify symfony (G391).** Post-translate verify on symfony flagship.

- **2026-05-31 — D689** **Oracle ultra in completion (G390).** Oracle product ultra batch wired.

- **2026-05-31 — D688** **Migration OS mega in completion (G389).** Migration OS mega batch wired.

- **2026-05-31 — D687** **Ultra delivery in completion (G388).** All delivery ultra mega batch wired.

- **2026-05-31 — D686** **Advisory mega in completion (G387).** Advisory standalone mega batch wired schema 53.

- **2026-05-31 — D685** **Oracle product ultra batch (G386).** Oracle standalone + Laravel-min + tiny-blog + evidence.

- **2026-05-31 — D684** **Migration OS mega batch (G385).** Plain-php + symfony + Laravel-min migration OS.

- **2026-05-31 — D683** **All delivery ultra mega batch (G384).** Full delivery + plain-php + express + tiny-blog.

- **2026-05-31 — D682** **Symfony Laravel-min delivery pair (G383).** Symfony + Laravel-min delivery batches.

- **2026-05-31 — D681** **Express Laravel-min delivery pair (G382).** Express + Laravel-min delivery batches.

- **2026-05-31 — D680** **Advisory standalone mega batch (G381).** Evidence trend + detect databases + path knowledge.

- **2026-05-31 — D679** **Hub completion schema 52 (G380).** Four-origin delivery + oracle mega batches; CI gates v52; runner batch v3.

- **2026-05-31 — D678** **Laravel-min migration OS depth (G379).** Laravel-min migration OS + oracle batches in completion.

- **2026-05-31 — D677** **month8 completion wiring (G378).** Symfony delivery + CWL mega + pipeline standalone in completion.

- **2026-05-31 — D676** **Four-origin strict CI env (G377).** `CHRYSALIS_HUB_COMPLETION_REQUIRE_FOUR_ORIGIN` in ci-gates v52.

- **2026-05-31 — D675** **Hub evidence schema v9 (G376).** `requireFourOriginEnv` in completion hubEvidence block.

- **2026-05-31 — D674** **Delivery dashboard v12 (G375).** `month8Program` four-origin + mega batch scripts.

- **2026-05-31 — D673** **Capability matrix v10 (G374).** Four-origin + symfony delivery + CWL mega metadata.

- **2026-05-31 — D672** **Four-origin in completion (G373).** Four-origin + full delivery mega batches wired.

- **2026-05-31 — D671** **Oracle standalone in completion (G372).** Oracle standalone mega batch wired schema 52.

- **2026-05-31 — D670** **Laravel-min oracle batch (G371).** Project-to-CWL + verify gaps + post-translate verify.

- **2026-05-31 — D669** **Delivery pipeline standalone batch (G370).** Four-profile delivery pipeline batch smoke.

- **2026-05-31 — D668** **Delivery pipeline runner v2 (G369).** Four-profile pipeline + runner batch.

- **2026-05-31 — D667** **Evidence standalone (G368).** Hub evidence standalone wrapper smoke.

- **2026-05-31 — D666** **Contract CWL standalone (G367).** Contract CWL standalone wrapper smoke.

- **2026-05-31 — D665** **Post-translate verify Laravel-min (G366).** Post-translate verify on Laravel-min scaffold.

- **2026-05-31 — D664** **CWL mega batch (G365).** All RFC roundtrip + CWL full batch.

- **2026-05-31 — D663** **Full delivery mega batch (G364).** Four-origin + symfony delivery batches.

- **2026-05-31 — D662** **Delivery pipeline Laravel-min profile (G363).** Four-profile delivery pipeline fixtures.

- **2026-05-31 — D661** **Hub runner batch v3 (G362).** Laravel-min profile in runner batch smoke.

- **2026-05-31 — D660** **Verify gaps ingest action standalone (G361).** Gaps ingest action standalone smoke.

- **2026-05-31 — D659** **Path knowledge standalone batch (G360).** Path knowledge + language compare batch.

- **2026-05-31 — D658** **Detect databases standalone (G359).** Detect databases standalone wrapper smoke.

- **2026-05-31 — D657** **Evidence trend standalone (G358).** Evidence trend standalone wrapper smoke.

- **2026-05-31 — D656** **Tiny-blog delivery in completion (G357).** Tiny-blog delivery batch wired schema 52.

- **2026-05-31 — D655** **Plain-php migration OS in completion (G356).** Plain-php migration OS batch wired schema 52.

- **2026-05-31 — D654** **Migration OS Laravel-min (G355).** Dedicated migration OS smoke on Laravel-min scaffold.

- **2026-05-31 — D653** **Oracle standalone mega batch (G354).** Node express + WPTP + contract + playbooks + post-translate verify.

- **2026-05-31 — D652** **Laravel-min migration OS batch (G353).** Migration OS + assessment + chimera on Laravel-min.

- **2026-05-31 — D651** **Symfony delivery batch (G352).** Symfony standalone delivery mega smoke.

- **2026-05-31 — D650** **Four-origin delivery batch (G351).** Three-origin + Laravel-min delivery batches.

- **2026-05-31 — D649** **Hub completion schema 51 (G350).** Laravel-min delivery + three-origin + CWL full batches; CI gates v51.

- **2026-05-31 — D648** **month7Program completion (G349).** Three-origin + CWL full + Laravel depth batches wired in completion schema 51.

- **2026-05-31 — D647** **Laravel-min delivery in completion (G348).** Laravel-min standalone smokes wired schema 51.

- **2026-05-31 — D646** **Laravel-min strict CI env (G347).** `CHRYSALIS_HUB_COMPLETION_REQUIRE_LARAVEL_MIN` in ci-gates v51.

- **2026-05-31 — D645** **Hub evidence schema v8 (G346).** `requireLaravelMinEnv` in completion hubEvidence block.

- **2026-05-31 — D644** **Delivery dashboard v11 (G345).** `month7Program` Laravel-min + delivery batch scripts.

- **2026-05-31 — D643** **Capability matrix v9 (G344).** Laravel-min delivery + three-origin + oracle standalone metadata.

- **2026-05-31 — D642** **Laravel depth batch (G343).** Gaps + action + live + min smoke batch.

- **2026-05-31 — D641** **Tiny-blog oracle batch (G342).** Evidence live + translate E2E on tiny-blog.

- **2026-05-31 — D640** **Verify gaps Laravel-min (G341).** Verify gaps ingest on Laravel-min scaffold.

- **2026-05-31 — D639** **Plain-php migration OS batch (G340).** Migration OS + assessment + chimera plain-php batch.

- **2026-05-31 — D638** **CWL full batch (G339).** Params + roundtrip + multi + interchange mega batch.

- **2026-05-31 — D637** **Post-translate verify standalone (G338).** Post-translate verify standalone wrapper.

- **2026-05-31 — D636** **Verify playbooks standalone (G337).** Playbooks standalone wrapper.

- **2026-05-31 — D635** **Contract roundtrip standalone (G336).** OpenAPI/HAR roundtrip standalone wrapper.

- **2026-05-31 — D634** **WPTP gold standalone (G335).** WPTP gold smoke with honest skip wrapper.

- **2026-05-31 — D633** **Node express oracle standalone (G334).** Honest-skip oracle verify standalone wrapper.

- **2026-05-31 — D632** **Laravel verify live standalone (G333).** Live export standalone smoke wrapper.

- **2026-05-31 — D631** **Laravel verify gaps action standalone (G332).** Action standalone smoke wrapper.

- **2026-05-31 — D630** **Laravel verify gaps standalone (G331).** Gaps report standalone smoke wrapper.

- **2026-05-31 — D629** **Three-origin delivery batch (G330).** Plain-php + express + symfony delivery batches.

- **2026-05-31 — D628** **Tiny-blog delivery batch (G329).** Evidence + translate + assessment on tiny-blog.

- **2026-05-31 — D627** **Plain-php delivery batch (G328).** Plain-php standalone delivery mega smoke.

- **2026-05-31 — D626** **Laravel-min delivery batch (G327).** Site intel + path advice + assessment + chimera batch.

- **2026-05-31 — D625** **Project-to-CWL Laravel-min (G326).** Dedicated CWL export smoke on Laravel-min.

- **2026-05-31 — D624** **Post-translate artifacts Laravel-min (G325).** Artifact bundle smoke on Laravel-min.

- **2026-05-31 — D623** **Chimera cutover Laravel-min (G324).** Cutover runbook smoke on Laravel-min.

- **2026-05-31 — D622** **Migration assessment Laravel-min (G323).** Assessment smoke on Laravel-min.

- **2026-05-31 — D621** **Path advice Laravel-min (G322).** Path advice smoke on Laravel-min scaffold.

- **2026-05-31 — D620** **Site intelligence Laravel-min (G321).** Standalone site intel on `flagship/laravel-min`.

- **2026-05-31 — D619** **Hub completion schema 50 (G320).** Express/symfony standalone delivery + CWL batches; three-flagship in-process; CI gates v50.

- **2026-05-31 — D618** **Three-flagship in-process parity (G319).** plain-php + symfony + express `inProcess: true` in completion.

- **2026-05-31 — D617** **Standalone translate/evidence batches (G318).** Completion wiring for translate E2E + evidence live standalone batches.

- **2026-05-31 — D616** **CWL batch smokes in completion (G317).** Params roundtrip + multi + interchange batch gates.

- **2026-05-31 — D615** **Standalone delivery strict CI env (G316).** `CHRYSALIS_HUB_COMPLETION_REQUIRE_STANDALONE_DELIVERY` in ci-gates v50.

- **2026-05-31 — D614** **Hub evidence schema v7 (G315).** `requireStandaloneDeliveryEnv` in completion hubEvidence block.

- **2026-05-31 — D613** **Delivery dashboard v10 (G314).** `month6Program` express + symfony batch scripts.

- **2026-05-31 — D612** **Capability matrix v8 (G313).** Express delivery + CWL batch + standalone batch metadata.

- **2026-05-31 — D611** **Symfony migration delivery depth (G312).** Symfony assessment/chimera standalone in completion.

- **2026-05-31 — D610** **Express delivery smokes in completion (G311).** Express standalone smokes wired schema 50.

- **2026-05-31 — D609** **Project-to-CWL express dedicated (G310).** Hole-free CWL export on express flagship.

- **2026-05-31 — D608** **Chimera cutover express (G309).** javascript-origin cutover smoke.

- **2026-05-31 — D607** **Migration assessment express (G308).** javascript-origin assessment smoke.

- **2026-05-31 — D606** **Symfony migration OS batch (G307).** migration OS + assessment + chimera symfony batch.

- **2026-05-31 — D605** **Express delivery batch (G306).** Site + path + assessment + chimera express profiles.

- **2026-05-31 — D604** **Translate E2E standalone batch (G305).** Four-variant translate batch gate.

- **2026-05-31 — D603** **Evidence live standalone batch (G304).** Four-profile evidence live batch.

- **2026-05-31 — D602** **CWL interchange batch (G303).** Preview + openapi + diff + middleware batch.

- **2026-05-31 — D601** **CWL multi batch (G302).** Multi gold + multi roundtrip batch.

- **2026-05-31 — D600** **CWL params roundtrip batch (G301).** Path + query roundtrip combined gate.

- **2026-05-31 — D599** **Hub runner batch v2 (G300).** Adds express profile; schema v2.

- **2026-05-31 — D598** **Chimera cutover symfony standalone (G299).** Phased runbook on symfony flagship.

- **2026-05-31 — D597** **Migration assessment symfony standalone (G298).** Readiness tier on symfony flagship.

- **2026-05-31 — D596** **Post-translate artifacts express (G297).** G146 bundle with javascript lift.

- **2026-05-31 — D595** **Verify gaps express smoke (G296).** Honest skip when no verify report.

- **2026-05-31 — D594** **Path advice express smoke (G295).** Pair grade on express flagship.

- **2026-05-31 — D593** **Site intelligence express smoke (G294).** javascript-origin site scan.

- **2026-05-31 — D592** **Express strategic test in-process (G293).** Direct import flagship runner.

- **2026-05-31 — D591** **Express completion in-process (G292).** `expressFlagshipGold.inProcess` in completion.

- **2026-05-31 — D590** **Express flagship in-process emit parity (G291).** `runExpressFlagshipSmoke` + shared emit parity helper.

- **2026-05-30 — D589** **Hub completion schema 49 (G290).** CWL params/multi smokes, migration OS standalone batch, symfony delivery smokes, in-process flagship parity; CI gates v49.

- **2026-05-30 — D588** **Evidence trend standalone markers (G289).** month5Program references evidence trend alongside CWL params smokes.

- **2026-05-30 — D587** **Post-translate artifacts symfony smoke (G288).** G146 bundle smoke on symfony flagship.

- **2026-05-30 — D586** **Path advice symfony smoke (G287).** Pair grade gate on symfony flagship fixture.

- **2026-05-30 — D585** **Delivery pipeline runner smoke (G286).** Combined delivery batch v2 + hub runner batch gate.

- **2026-05-30 — D584** **Site intelligence symfony smoke (G285).** Standalone site scan on symfony flagship.

- **2026-05-30 — D583** **CWL params strict CI env (G284).** `CHRYSALIS_HUB_COMPLETION_REQUIRE_CWL_PARAMS` in ci-gates v49.

- **2026-05-30 — D582** **Hub evidence schema v6 (G283).** Completion `hubEvidence.schemaVersion: 6` with `requireCwlParamsEnv`.

- **2026-05-30 — D581** **Delivery dashboard v9 (G282).** `month5Program` CWL params + migration OS standalone scripts.

- **2026-05-30 — D580** **Capability matrix v7 (G281).** CWL params/multi + migration OS standalone + symfony delivery metadata.

- **2026-05-30 — D579** **Hub runner batch smoke (G280).** plain-php + symfony translate step shape validation.

- **2026-05-30 — D578** **Verify gaps symfony smoke (G279).** Verify gaps ingest on symfony flagship.

- **2026-05-30 — D577** **Flagship completion in-process (G278).** Completion uses exported flagship runners with `inProcess: true`.

- **2026-05-30 — D576** **Migration OS standalone batch in completion (G277).** Batch smoke wired into schema 49 ok chain.

- **2026-05-30 — D575** **CWL all-RFC roundtrip v2 (G276).** Path/query/multi roundtrips added to all-RFC batch.

- **2026-05-30 — D574** **CWL params batch smoke (G275).** Path + query runtime combined gate.

- **2026-05-30 — D573** **CWL query params roundtrip (G274).** RFC-0003 dedicated roundtrip smoke.

- **2026-05-30 — D572** **CWL path params roundtrip (G273).** RFC-0002 dedicated roundtrip smoke.

- **2026-05-30 — D571** **Migration OS standalone batch (G272).** Site intel + assessment + chimera + path knowledge + language compare.

- **2026-05-30 — D570** **Migration OS symfony smoke (G271).** Contract/planner/programs on symfony flagship.

- **2026-05-30 — D569** **Language compare smoke (G270).** Recommended hono output with 3+ targets.

- **2026-05-30 — D568** **Path knowledge smoke (G269).** Pair count + php→hono grade gate.

- **2026-05-30 — D567** **Chimera cutover standalone smoke (G268).** Phased runbook gate outside delivery pipeline.

- **2026-05-30 — D566** **Migration assessment standalone smoke (G267).** Readiness tier + program id gate.

- **2026-05-30 — D565** **Site intelligence standalone smoke (G266).** Primary origin + route count on plain-php flagship.

- **2026-05-30 — D564** **CWL multi-file roundtrip (G265).** RFC-0009 module graph roundtrip.

- **2026-05-30 — D563** **CWL multi-file gold runtime (G264).** RFC-0009 gold replay on multi module fixture.

- **2026-05-30 — D562** **CWL query params runtime (G263).** RFC-0003 gold replay smoke.

- **2026-05-30 — D561** **CWL path params runtime (G262).** RFC-0002 gold replay smoke.

- **2026-05-30 — D560** **Flagship in-process emit parity (G261).** Shared `hub-flagship-emit-parity.mjs`; exported flagship runners; strategic tests import in-process.

- **2026-05-30 — D559** **Hub completion schema 48 (G260).** Migration OS + CWL interchange smokes, delivery pipeline batch v2, evidence live express; CI gates v48.

- **2026-05-30 — D529** **Hub completion schema 47 (G230).** RFC 0004/7/8 runtime + roundtrip, contract roundtrip, delivery pipeline, project-to-CWL v3; CI gates v47.

- **2026-05-30 — D528** **Hub translate E2E batch (G229).** `hub-translate-e2e-smoke.mjs` schema v2 with plain-php/symfony/tiny-blog/express variants.

- **2026-05-30 — D527** **Hub evidence live batch (G228).** `hub-evidence-live.mjs` schema v2 multi-profile batch.

- **2026-05-30 — D526** **Delivery dashboard v7 (G227).** Extended `month3Program` with RFC 0004/7/8 smokes and delivery pipeline scripts.

- **2026-05-30 — D525** **Capability matrix v5 (G226).** CWL RFC smokes, delivery pipeline, verify playbooks, hub runner metadata.

- **2026-05-30 — D524** **WPTP Next.js CI env (G225).** `CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS` documented in completion hubEvidence block.

- **2026-05-30 — D523** **CWL generic roundtrip helper (G224).** `hub-cwl-roundtrip-smoke.mjs` shared ingest/project/render path.

- **2026-05-30 — D522** **CWL gold runtime smoke helper (G223).** `hub-cwl-gold-runtime-smoke.mjs` for RFC trace replay smokes.

- **2026-05-30 — D521** **Hub runner smoke (G222).** `hub-runner-smoke.mjs` validates translate + evidence gate steps.

- **2026-05-30 — D520** **Project-to-CWL laravel-min + tiny-blog gates (G221).** Honest hole manifest exports (`requireHoleFree: false`).

- **2026-05-30 — D519** **Verify playbooks smoke (G220).** `hub-verify-playbooks-smoke.mjs` in completion.

- **2026-05-30 — D518** **Post-translate verify smoke (G219).** Honest skip without traces/base URL.

- **2026-05-30 — D517** **Post-translate delivery bundle smoke (G218).** G146 artifacts via `hub-delivery-pipeline-smoke.mjs`.

- **2026-05-30 — D516** **Chimera cutover smoke (G217).** Phased runbook gate in delivery pipeline smoke.

- **2026-05-30 — D515** **Migration assessment smoke (G216).** Readiness tier in delivery pipeline smoke.

- **2026-05-30 — D514** **Site intelligence smoke (G215).** Route estimate gate in delivery pipeline smoke.

- **2026-05-30 — D513** **Hub evidence live tiny-blog (G214).** Evidence live batch profile.

- **2026-05-30 — D512** **Hub evidence live symfony (G213).** Evidence live batch profile.

- **2026-05-30 — D511** **HAR contract roundtrip smoke (G212).** `hub-contract-roundtrip-smoke.mjs`.

- **2026-05-30 — D510** **OpenAPI contract roundtrip smoke (G211).** Import projection in contract roundtrip smoke.

- **2026-05-30 — D509** **Hub-translate E2E tiny-blog (G210).** Oracle micro with honest hole manifest.

- **2026-05-30 — D508** **Hub-translate E2E express (G209).** JavaScript lift-emit path.

- **2026-05-30 — D507** **Hub-translate E2E symfony (G208).** Symfony flagship variant.

- **2026-05-30 — D506** **CWL auth-effects roundtrip (G207).** RFC-0007 round-trip smoke.

- **2026-05-30 — D505** **CWL auth-effects runtime smoke (G206).** `hub-cwl-auth-effects-smoke.mjs`.

- **2026-05-30 — D504** **CWL content-type roundtrip (G205).** RFC-0008 round-trip smoke.

- **2026-05-30 — D503** **CWL content-type runtime smoke (G204).** `hub-cwl-response-content-type-smoke.mjs`.

- **2026-05-30 — D502** **CWL request-context roundtrip (G203).** RFC-0004 round-trip smoke.

- **2026-05-30 — D501** **CWL request-context runtime smoke (G202).** `hub-cwl-request-context-smoke.mjs`.

- **2026-05-30 — D500** **CWL header/cookie projection (G201).** RFC-0004 request context hole-free projection.

- **2026-05-30 — D499** **Hub completion schema 46 (G200).** Body roundtrip, translate E2E, evidence live, node spike v3, matrix v4; CI gates v46.

- **2026-05-30 — D498** **Node oracle product depth (G199).** `hub-node-oracle-spike` schema v3 cross-checks `hub-node-express-oracle-verify`.

- **2026-05-30 — D497** **Delivery dashboard v6 (G198).** `month3Program` surfaces evidence live, translate E2E, body roundtrip, strict env keys.

- **2026-05-30 — D496** **CWL body round-trip smoke (G197).** `hub-cwl-body-roundtrip-smoke.mjs` proves ingest → project → render → re-ingest hole-free.

- **2026-05-30 — D495** **WPTP Next.js mandatory completion gate (G196).** `CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1` in ci-gates v46.

- **2026-05-30 — D494** **Evidence pipeline strict CI (G195).** `CHRYSALIS_HUB_PIPELINE_GATE_STRICT=1` requires `hubEvidenceLive.pipelineGatePass` in ci-gates v46.

- **2026-05-30 — D493** **Hub evidence live (G194).** `hub-evidence-live.mjs` runs full `buildHubEvidenceReport` with pipeline gate pass on plain-php flagship.

- **2026-05-30 — D492** **CWL body smoke projection gate (G193).** G182 body smoke requires hole-free projection and `withBodyParams >= 2`.

- **2026-05-30 — D491** **Hub-translate E2E smoke (G192).** `hub-translate-e2e-smoke.mjs` on plain-php flagship produces hole-free migration.cwl via chrysalis-php path.

- **2026-05-30 — D490** **CWL body projection lowering (G191).** `cwlValueOf`/`renderCwlRoutes` project `request.field` body bindings; `summarizeCwlProjection.withBodyParams`.

- **2026-05-30 — D489** **Hub completion schema 45 (G190).** Completion runs CWL body runtime smoke, evidence smoke, contract CWL smoke, symfony nextjs verify, node oracle spike; capability matrix v3; CI gates v45.

- **2026-05-30 — D488** **Strict Laravel live completion gate (G189).** Optional `CHRYSALIS_HUB_COMPLETION_REQUIRE_LARAVEL_LIVE=1` fails ci-gates when `laravelVerifyLive.ok` is false.

- **2026-05-30 — D487** **Capability matrix v3 (G188).** Lists oracle micro fixture, nextjs flagship fixtures, and project-to-CWL origins (php + javascript).

- **2026-05-30 — D486** **Delivery dashboard v5 (G187).** Schema v5 adds `month3Program` block referencing Month 3 smoke scripts.

- **2026-05-30 — D485** **Contract CWL smoke (G186).** `hub-contract-cwl-smoke.mjs` validates OpenAPI import and WebIR projection paths through the contract orchestrator.

- **2026-05-30 — D484** **Node oracle spike in completion (G185).** Hub completion executes `hub-node-oracle-spike.mjs` and surfaces `nodeOracleSpike.ok`.

- **2026-05-30 — D483** **Hub evidence smoke fixture (G184).** `hub-evidence-smoke.mjs` materializes assessment + verify + migration contract on plain-php and asserts evidence schema v4 pipeline fields.

- **2026-05-30 — D482** **Express JS project-to-CWL gate (G183).** Project-to-CWL gates schema v2 lifts javascript WebIR and exports hole-free migration.cwl on express flagship.

- **2026-05-30 — D481** **CWL RFC-0005 request body runtime smoke (G182).** Mirrors G177 for request body gold suites on hono/fastify/nextjs.

- **2026-05-30 — D480** **PHP Next.js verify on symfony flagship (G181).** Extends G178 WPTP pipeline to `fixtures/hub-flagship-symfony` via `--symfony`.

- **2026-05-30 — D479** **Hub completion schema 44 (G180).** Completion executes live Laravel verify export, CWL RFC-0006 runtime smoke, project-to-CWL oracle gates, and plain-php Next.js WPTP verify; CI gates v44 require executable pass (with WPTP/Laravel skip paths documented).

- **2026-05-30 — D478** **Project-to-CWL oracle fixture gates (G179).** `hub-project-to-cwl-gates.mjs` exports and gates hole-free `migration.cwl` on plain-php and symfony flagships; `cwl-export.json` schema v3 carries `cwlProjection`.

- **2026-05-30 — D477** **PHP Next.js verify on plain-php flagship (G178).** Extends G105 WPTP pipeline beyond tiny-blog to `fixtures/hub-flagship-plain-php` via `--flagship`; completion surfaces `phpNextjsFlagshipVerify`.

- **2026-05-30 — D476** **CWL RFC-0006 runtime status closure (G177).** Closes D400 deferral: `hub-cwl-response-status-smoke.mjs` proves `status N;` routes replay with correct HTTP status on hono/fastify/nextjs gold.

- **2026-05-30 — D475** **PHP oracle micro-fixture (G176).** Formalizes `fixtures/tiny-blog` as the canonical oracle micro surface (`hub-php-oracle-micro-fixture.mjs`); `phpOracleSmoke` schema v6 references it; capability matrix documents the contract.

- **2026-05-30 — D472** **Live Laravel verify export for hub (G173).** `hub-laravel-verify-export.mjs` surfaces `reports/verify-flagship-laravel-full/hono/summary.json` as `reports/ci/hub-laravel-verify-live.json`; `verify:laravel-full` invokes export after replay so hub merged verify-gaps reads live flagship results.

- **2026-05-30 — D460** **Express flagship emit parity + oracle hook (G161).** Phase 4 Node/Express depth: `hub-express-flagship.mjs` v3 runs gold + trace replay on hono, fastify, and nextjs (matching PHP flagships G157); optional live oracle capture/replay via `CHRYSALIS_HUB_EXPRESS_ORACLE=1` (completion keeps separate `runNodeExpressOracleVerify`).

- **2026-05-30 — D459** **CWL preview in delivery dashboard (G160).** Delivery dashboard schema v3 composes `cwlPreview` (route/hole/import counts from `hub-cwl-preview`) when `migration.cwl` exists; Console delivery panel shows CWL summary lines.

- **2026-05-30 — D458** **Laravel verify-gaps merge + global backlog (G159).** P0 ingest-from-gaps: `loadMergedVerifyReports` unions failures across report dirs; committed fixture `fixtures/hub-laravel-verify-gaps` exercises auth/socialite probe divergences; `buildLaravelVerifyGapsReport` exposes `ingestNext`; migration assessment and delivery dashboard surface `laravelGlobalGaps` for Laravel-tagged sites.

- **2026-05-29 — D457** **Chimera cutover license gate (G158).** G153 mapped `hub-chimera-cutover` to enterprise tier but the operator API was not gated. `GET /api/hub/chimera-cutover` now calls `assertHubLicenseAllows("hub-chimera-cutover")` and returns **403 license-gate** when enforcement is on and tier is insufficient (same pattern as batch/pipeline). OSS default remains gate-off.

- **2026-05-29 — D456** **PHP flagship nextjs emit parity (G157).** Phase 1 requires hono = fastify = nextjs on the oracle slice; G151 proved hono=fastify for plain-php and symfony. Added gold suites `plain-php-flagship-nextjs` and `symfony-flagship-nextjs` (structural + trace replay, correctness 1); extended flagship smoke scripts' `emitParity` to `["hono", "fastify", "nextjs"]`. Gold inventory **144** structural / **115** trace-replay suites.

- **2026-05-29 — D455** **Hub CWL runtime preview (G156).** G154 shipped the in-process CWL runtime; operators still lacked a way to preview a project's migration contract without running full translate + emit. `hub-cwl-preview.mjs` resolves multi-file CWL (D454), lists routes with hole flags, and optionally probes the first GET route through `@chrysalis/runtime-cwl` (simulator-backed, not production emit). Operator API `GET /api/hub/cwl-preview?projectDir=…` (+ optional `cwlPath`, `probe=0`). Rationale: preview uses the same WebIR simulation path as verify (D19), giving honest bodies without inventing a second runtime semantics layer.

- **2026-05-29 — D454** **CWL multi-file modules (RFC-0009; G155).** Phase 3 interchange needs composable contracts beyond a single `migration.cwl`. Module-level `import "relative.cwl";` merges routes and `use` presets from resolved files (`cwl-module-graph.mjs`); import cycles throw; duplicate `METHOD path` pairs become honest `cwl:duplicate-route` holes. Wired into `cwl-ingest` (disk path resolution), `lift-to-webir` (CWL projects lift only `routes.cwl` when multiple `.cwl` files exist), site intelligence route estimates, and CWL diff path parsing. Gold fixture `fixtures/hub-gold-cwl-multi` + suite `cwl-multi-gold-hono` (142 structural suites). Rationale: multi-file is an authoring/organization feature — WebIR remains one module; honesty rules (non-negotiable #6) apply to conflicts, not silent merges.

- **2026-05-30 — D439** **Contract import wired into hub-translate + HAR → CWL (G140).** G139 proved OpenAPI → CWL import in isolation; G140 closes the operational loop and completes the HAR half of the Stage-B "Sink". `hub-contract-cwl-import.mjs` resolves the migration CWL source via `discoverContractArtifacts`: **OpenAPI import > HAR import > WebIR projection** (OpenAPI wins when both contracts are present). Wired into `hub-translate.mjs` (PHP path, WPTP path, and hub-lift-emit path — non-PHP translate previously skipped migration CWL entirely) and `hub-migration-contract.mjs`. Import writes unified `cwl-export.json` meta with a `source` field (`openapi-import` | `har-import` | `webir-projection`). New `hub-har-to-cwl.mjs` dedupes HAR entries by `(method, pathname)`, maps query strings to `query` bindings, and uses recorded status/content-type/flat JSON or text bodies; missing or non-flat bodies become honest holes. Shared response helpers extracted to `hub-contract-cwl-shared.mjs` (used by both importers). Gold fixture `fixtures/hub-gold-har-cwl` (6 routes, hole-free, round-trips through `cwl-ingest`); orchestrator proven on `hub-gold-openapi-cwl` and temp HAR project dirs. Rationale: contract-first sites should get a signed migration contract from the contract they already ship, not only from a later WebIR lift; wiring it into translate makes "run translate → get migration.cwl" true for OpenAPI/HAR trees without a separate manual step.

- **2026-05-30 — D438** **OpenAPI → CWL import (Stage-B "Sink"; G139).** CWL had a one-way arrow (WebIR → OpenAPI export, D408/G109); the locked plan's CWL Stage B ("OpenAPI/HAR → CWL") and Phase 3 want the reverse so a migration can begin from a published contract, not only from lifted source. New `hub-openapi-to-cwl.mjs` converts an OpenAPI 3.x document into CWL route objects and renders them through the **shared** `renderCwlRoutes` (single source of truth with the export/round-trip emit), so an imported contract carries the same status/param/default/content-type/object-body fidelity and re-ingests through `cwl-ingest`. Mapping: `{name}`→`:name` paths; `in:path`/`in:query` params (path only when present in the path, query carrying `schema.default`); success status = lowest 2xx; response media type → `content-type`; a **flat** response `example` → `return <literal>`. Honesty boundary (DESIGN non-negotiable #6): an unspecified or non-flat body becomes an explicit hole (`openapi:no-response-body` / `openapi:nested-response-body`), never an invented value, and the importer keeps the known surface alongside the hole via a new backward-compatible `renderCwlRoutes({ surfaceOnHole })` (default off ⇒ existing golden snapshots byte-identical). Exercising the importer surfaced and fixed two latent round-trip bugs the hole-free flagships never hit: (1) `renderCwlRoutes` emitted `hole "reason"` (quoted) but the parser's `HOLE_RE` wants a bare token, so the reason silently became `cwl:unknown-statement` — now emits `hole foo:bar;` (bare token, or `hole legacy "msg";` for free text); (2) `walkCwlHandlerBody` read response status only from `effect.http.error` (the lift path), missing the `web.request.response` `attrs.status` that `cwl-ingest` writes, so a round-tripped `status N;` projected as `withStatus: 0` — now it reads non-200 status off the response node too. Gold fixture `fixtures/hub-gold-openapi-cwl` (7 operations) imports 6/7 hole-free (only the example-less `/raw` is a hole), `withStatus: 2`, `objectBodies: 5`, and round-trips through `cwl-ingest`; all 141 gold suites stay green. Scope is deliberately the importer + round-trip; wiring it into `hub-translate`/operator and a HAR → CWL sibling are follow-ons. Rationale: reusing the shared renderer (not a parallel projection) keeps one CWL contract shape across import/export/emit, and fixing the round-trip bugs hardens CWL as the interchange center rather than papering import-only paths.

- **2026-05-29 — D437** **JS runtime emit returns real bodies + applies response status (G138).** Closes the bounded-scope follow-on flagged in D436. Two emit bugs kept the JavaScript-origin runtime lossy: hono's `__return_json` emitted `c.json(value)` and ignored `__status`, so `res.status(n).json(...)` returned a 200; and bare concise-arrow returns were discarded. The fix is surgical: in `emit-tree.ts`, when a preceding `effect.http.error` set `__status` (`ctx.statusVarUsed`), the hono `__return_json` buffers the JSON (`__html += JSON.stringify(value)`) and returns `__respond(c, __html, __status)` — reusing the proven PHP echo+json_encode+`__respond` path, which sniffs JSON (`application/json`) and applies the status without forcing a `ContentfulStatusCode` cast/import; default-200 routes keep the direct `c.json(...)` path so existing js/ts-literal and 200 routes (echo/meta) are untouched. Rather than emit `() => value` shorthand (which real Express ignores), the flagship `src/app.js` rich routes were rewritten to real Express semantics (`res.json({...})`, `res.status(201|202).json({...})`) and `oracle/app-live.js` re-recorded to mirror the emitted runtime byte-for-byte; trivial literal routes stay empty (discarded bare returns). Result: flagship projection now reports **`withStatus: 2`** (was 0), `withParams: 5`, `objectBodies: 8`, hole-free; structural gold + hono/fastify/nextjs trace replay green (0 divergences across 112 suites); `ci-gates hub-completion` green (schema 40, no bump — the change is emit+oracle, the v40 hole-free gate already covers it). Rationale: aligning the JS emit's WebIR-consumption with the PHP emit (status via `http.error` → `__status` → `__respond`) keeps a single runtime contract per backend rather than a second, JS-specific lossy path, and the oracle re-record keeps every change behind a green trace-replay gate.

- **2026-05-29 — D436** **JavaScript lift extracts request params + response status (G137).** The JS hub lift (`javascript-ast-ingest.mjs`) only lowered literals and `res.json({...})` object payloads; path/query access and explicit status were either holed or absent, so the JS-origin CWL projection always reported `withStatus: 0` / `withParams: 0` even though the PHP lift surfaced both (`effect.http.error` + `data.request.field`). The lift now lowers: `req.params.<name>` / `req.params["name"]` → `data.request.field` source `path`; `req.query.<name>` → source `query`; `<field> ?? <literal>` → `data.binop` `??` (carrying the CWL default); and `res.status(n)....` chains → `effect.http.error` status prepended to the handler block. Concise-arrow bodies of shape `MemberExpression` (`(req) => req.params.id`) and `LogicalExpression` (`?? `) are now accepted by `extractHandlerExpression` rather than holed. Proven by the deterministic gold fixture `fixtures/hub-gold-js-rich` (hole-free projection: `withStatus: 2`, `withParams: 5`, `withParamDefaults: 1`; faithful CWL emit + the same node shapes the PHP lift produces, so the projection is genuinely origin-agnostic). The express flagship's param routes were enriched to exercise the new lift; its projection moved to `withParams: 5` / `withParamDefaults: 1` / `objectBodies: 7` (hole-free), with structural gold and hono/fastify/nextjs trace replay all green. **Deliberately bounded:** the runtime emitters (hono/fastify) still compute-and-discard non-`res.json` returns and ignore `__status` (the flagship's live oracle returns empty bodies to match, by design since G110). So the flagship's *projection* fidelity improves now (it reads the lift/WebIR), while faithful *runtime* bodies and flagship `withStatus` are a separate emit-fidelity workstream (emit must consume `request.field`/`http.error` into real `c.json(..., status)` responses) that additionally requires re-recording the express oracle corpus. Splitting it this way keeps each change behind a green gate instead of papering the lift gap with a lossy runtime path.

- **2026-05-28 — D435** **Enforce hole-free express CWL projection in CI (G136).** The CWL projection coverage gate (D430/G131) only fired for the two PHP flagships, even though G135 showed the JavaScript-origin express flagship projects identically. This closes the asymmetry: `hub-express-flagship.mjs` (schema v2) computes `summarizeCwlProjection` on the lifted WebIR, `hub-completion.mjs` (schema 40) carries it under `expressFlagshipGold.cwlProjection`, and `ci-gates.mjs` adds a schema-v40 gate requiring `holeFree === total` for the express projection — mirroring the v39 PHP gates. Rationale: a coverage metric that is only enforced on one origin can silently rot on the other; gating both origins makes "hole-free across origins" a CI invariant rather than a one-time observation. The real completion artifact now reports schema 40 with the express projection hole-free (20/20).

- **2026-05-28 — D434** **Node oracle spike drives the express flagship (G135).** The Phase-4 Node oracle spike (`hub-node-oracle-spike.mjs`, D402) only lifted the tiny `hub-gold-js-literal` fixture. It now (schema v2) also drives the real 20-route `hub-flagship-express`: lifts it (asserting hole-free) and runs `summarizeCwlProjection` (the D430 coverage metric) on the JavaScript-origin WebIR, requiring a hole-free projection with object bodies present. This proves the rich CWL projection (D423–D427) and its evidence metric are origin-agnostic — they work identically on PHP and JavaScript WebIR, because they operate on the shared dialects, not on any language-specific shape. Strengthens the "WebIR is the contract" invariant with a cross-origin check rather than a PHP-only one.

- **2026-05-28 — D433** **Project-to-CWL rich projection for the migration contract (G134).** `hub-project-cwl-export.mjs` (the `translate` / migration-contract CWL surface, D398) still used the original literal-only projection (`listHubWebRoutes` + a local renderer) that emitted a hole for any handler whose body was not a bare literal — so the migration contract for the flagships was almost entirely holes, even though `emit-cwl-from-hub` (G124–G128) could already project them richly. This unifies the two: the rich renderer is extracted into `renderCwlRoutes` in `hub-webir-routes.mjs` (single source of truth, co-located with `listCwlRoutes`), and both `emit-cwl-from-hub` and `hub-project-cwl-export` call it. The migration contract now carries status, params, `??` defaults, content-type, and object/array bodies, and is hole-free for both PHP flagships (20 routes, 0 holes). Export meta schema bumps to v2. Chosen to avoid two divergent CWL projections (the non-negotiable against papering over with a second-best path) — there is now exactly one projection, used by round-trip emit and by the migration contract alike.

- **2026-05-28 — D432** **`nikic` parser-provider parity for the `__invoke` lift (G133).** D431 changed both parser providers; this proves they stay in lockstep, upholding the non-negotiable that no pass hardcodes against a single parser backend. Adds `fixtures/parser-parity-probe/pages/invokable_controller.php` — a class with `__invoke` (header + `(int)` cast + `json_encode` of an object containing a `?? ''` coalesce), a static `helper`, and an unused instance method `notInvoked`. Parser-bridge parity (`packages/parser-bridge/tests/nikic.test.ts`): the glayzzle and nikic ASTs are structurally equal (positions stripped), and both hoist exactly `App\\Controller\\ProbeController::__invoke` + `::helper` (instance `notInvoked` excluded by both). Ingest parity (`packages/ingest/tests/invoke-nikic-parity.test.ts`): ingesting the Symfony flagship under each provider yields an identical WebIR summary (`{ routes: 20, echoes, holes: 0 }`), so the lifted handler bodies are provider-independent end to end. Both suites skip cleanly when `php`/the nikic vendor are absent; they run in CI `typecheck-and-test` where PHP and the parser-bridge vendor are present.

- **2026-05-28 — D431** **Symfony `__invoke()` body lift, invokable controllers (G132).** Acts on the gap D430's coverage metric made visible: Symfony controllers ingested to hole-free route *shells* because their logic lives in a non-static `__invoke()` method, while the parser bridge hoisted only *static* class methods and ingest lifted only top-level executable statements. The fix is two small, framework-agnostic steps. (1) Parser bridge: `convertTopLevelClassToFunctionDecls` (both `glayzzle` and `nikic-json` providers) now also hoists a non-static method named `__invoke` to a `Class::__invoke` `FunctionDecl`. (2) Ingest: new `selectRouteHandlerStatements` (`convert.ts`) chooses the handler body — top-level executable statements when present (unchanged for plain-php pages), else the body of an `__invoke` `FunctionDecl`. Crucially this keys off the PHP **invokable** convention (`__invoke`), not Symfony or any framework, so it does not violate the "no hardcoding against a single framework" rule and the engine stays manifest-driven (the manifest still says only "the handler is in this file"). Result: the Symfony flagship projects with the same fidelity as plain-php (`objectBodies` 0→10, params/status/`??`-default all populated), still hole-free, with all 141 gold + 112 trace-replay suites green and Symfony trace correctness 1. Instance methods other than `__invoke` remain excluded (no general method-dispatch lift); supporting named-action controllers (`indexAction`, etc.) would need a manifest method field and is deferred. This is the inverse of papering over: the gap was surfaced as evidence (D430), then closed at the engine with a minimal, principled change rather than a per-fixture hack.

- **2026-05-28 — D430** **CWL projection coverage as counted evidence (G131).** The G124–G128 work made the PHP→CWL projection deep (status, params, `??` defaults, content-type, object bodies) but only proved it through binary gold pass/fail. This adds `summarizeCwlProjection(module)` (`hub-webir-routes.mjs`), which runs `listCwlRoutes` and counts `total`/`holeFree` plus per-feature coverage (`withStatus`, `withParams`, `withParamDefaults`, `withContentType`, `objectBodies`) and the distinct `holeReasons`. It is computed in `exportPhpHubWebir` (so both PHP flagships get it for free) and surfaced as `{plainPhp,symfony}FlagshipGold.cwlProjection` at completion schema **v39**, gated by ci-gates: when present, `holeFree` must equal `total`. This is the evidence-factory principle applied to projection fidelity — a coverage number, not a marketing claim, and a regression guard that catches a future change that would reintroduce a CWL hole on a flagship. The metric is deliberately honest: it exposes that the **Symfony flagship currently projects route shells** (`objectBodies: 0`, no params) because Symfony `__invoke()` method bodies are not yet lifted the way plain-php top-level pages are. That gap is real, pre-existing, and now backed by a number; a ROADMAP follow-on tracks lifting class-method bodies. We chose to surface the gap rather than hide it behind the (legitimately) green hole-free gate, consistent with "no silent best-effort" — the projection is hole-free, but its *depth* differs per flagship and the evidence says so.

- **2026-05-28 — D429** **Class-prefix on collection routes, empty method path (G130).** Closes the class-prefix matrix for the Symfony flagship. Symfony's idiom for a collection endpoint under a class prefix is an empty method path: `#[Route('/items')]` on the class + `#[Route('', methods: ['GET'])]` on the method, resolving to the bare `/items`. The attribute reader's path capture was widened from `[^'"]+` to `[^'"]*` so an empty string parses, and `joinSymfonyPaths` already returns the prefix when the method path is empty. `ItemsListController` (GET) and `ItemsCreateController` (POST) were converted to `#[Route('/items', name: 'items_')]` + `#[Route('', name: 'list'|'create', ...)]`, resolving to `/items` (no path param) with names `items_list`/`items_create` matching the yaml. Combined with D426 (path-param routes) and D428 (names), all three class-prefix shapes — path-param, collection, and name — now flow end-to-end through the real flagship with zero path/route-count change; full surface + name parity holds at 20 routes, ingest stays hole-free, and symfony gold + trace replay (correctness 1) stay green. No schema bump (covered by the existing `routesAttributeParity` + `routesNameParity` gates).

- **2026-05-28 — D428** **Symfony route-name parity, class-level `name:` prefix (G129).** Extends the Symfony second-vertical parity from the route surface (method/path/file/params) to route **names**. `symfonyYamlToRouteSpecs` and `symfonyAttributeRouteSpecs` now carry `name` (yaml top-level key; attribute-resolved name including class-level `name:` prefixes), and `symfonyRouteManifestParity` adds a `names` block that compares the yaml name set to the attribute name set. The `chrysalis.routes.json` manifest stays deliberately name-less — it is the runtime projection that `@chrysalis/ingest` consumes, and route names are a Symfony-source concern with no runtime surface — so name parity is a yaml↔attributes check, not a three-way one. The four live `/items/{id}` controllers were converted to `#[Route('/items', name: 'items_')]` (class) + `#[Route('/{id}', name: 'show'|'update'|'patch'|'delete', ...)]` (method), which `parseSymfonyAttributeRoute` concatenates to the same `items_show`/`items_update`/`items_patch`/`items_delete` names the yaml declares (`${classPrefix.name}${methodAttr.name}`). Surfaced as `symfonyFlagshipGold.routesNameParity` and gated by ci-gates at schema **v38**. Together with D426 (path prefix) this proves both halves of Symfony's class-level `#[Route]` combination flow end-to-end through the real flagship with zero path/route-count change.

- **2026-05-28 — D427** **CWL preserves `??` query/param defaults (G128).** Closes the last lossy edge in the PHP→CWL projection: a null-coalesce at the use site (`$_GET["q"] ?? ""`) was projecting to a bare `query q;`, silently dropping the `""` default. `cwlValueOf` now carries a literal default off the `??` binop onto the resulting ref, `walkCwlHandlerBody`'s `collect` hoists it to the param declaration, and `emit-cwl-from-hub.mjs` renders it as `query/param NAME = <literal>;`. The reverse path is symmetric and round-trip-faithful: the CWL parser reads the optional `= <literal>` on `param`/`query` lines, threads the defaults onto path/query return values (object entries and bare returns), and `cwl-ingest` reconstructs the original `requestField ?? literal` binop (via `lowerCwlParamField`). Net effect: the WebIR→CWL→WebIR round-trip rebuilds the exact `??` structure (1 binop, 20 routes, hole-free), so the projection is lossless rather than approximate. Defaults are hoisted to the declaration (CWL's home for them) rather than re-emitted at every reference, keeping the surface idiomatic. All 141 gold suites stay green.

- **2026-05-28 — D426** **Class-prefix attributes live in the Symfony flagship (G127).** Promotes the G122 class-prefix combination from the isolated `hub-symfony-attr-prefix` probe into the real flagship: `ItemsShow/Update/Patch/DeleteController` now declare class-level `#[Route('/items')]` + method `#[Route('/{id}', ...)]`, which `parseSymfonyAttributeRoute` resolves to the identical `/items/{id}` paths. Chosen so the resolved route surface, route count (20), `config/routes.yaml`, and `chrysalis.routes.json` are unchanged — only the human declaration idiom changed — so three-way parity, hole-free `@chrysalis/ingest` lift (attributes ignored by the body lift), and `symfony-flagship-{hono,fastify,cwl}` gold + trace replay (correctness 1) all stay green. Proves prefixes flow end-to-end, not just through a parity table.

- **2026-05-28 — D425** **CWL content-type fidelity from body shape (G126).** Building on D423, the CWL projection now re-derives the response MIME that ingest deliberately drops from `header(Content-Type)` (the "emit infers MIME" contract): `walkCwlHandlerBody` marks a response JSON when the echoed value flows through `json_encode`/`__return_json` or is an object/array literal, otherwise text; `emit-cwl-from-hub.mjs` emits `content-type "application/json"` / `content-type "text/plain; charset=utf-8"` accordingly, and omits it for no-content (204/304) responses. This is inference faithful to PHP/JS semantics (json_encode → JSON), not best-effort guessing. Flagship CWL stays hole-free, re-parses with 0 holes, and carries the correct content-type on round-trip.

- **2026-05-28 — D424** **Fastify no-content response fidelity (G125).** The generated Fastify server's in-process `fetch` shim built `new Response(inj.payload, { status })` unconditionally; for 204/304/1xx the WHATWG/undici `Response` constructor rejects a non-null body ("Invalid response status code 204"). `@chrysalis/emit-fastify` `runtime-files.ts` `SERVER_TS` now computes `nullBodyStatus` and passes `null` for those codes. Surfaced by G119's `DELETE /items/:id` (204); fixed without touching handler logic. All 112 trace-replay suites pass at correctness 1.

- **2026-05-28 — D423** **PHP→CWL effect-block lowering (G124).** The CWL projection (`emit-cwl-from-hub.mjs`) previously only emitted literal/object bodies, so PHP handlers — which lift to a `data.block` of `[header no-op, echo json_encode(...)]` plus `http_response_code` effects and `request.field` references — became `hub:multi-statement-body` holes (20/20 on the plain-php flagship). New `walkCwlHandlerBody` + `cwlValueOf` + `listCwlRoutes` in `hub-webir-routes.mjs` flatten blocks, drop the `header(Content-Type)` no-op (MIME stays emit-inferred per the existing ingest design) and BOM/empty `InlineHtml` echoes, carry `effect.http.error{status}` to CWL `status`, collect path/query `request.field` into `param`/`query` declarations, and project `json_encode`/`__object_literal`/`__array_literal`/`__return_json`/cast/`??` into CWL return values. The CWL grammar gained bare scalar param-ref returns (`return userId;`) and array literals (`cwl-parser.ts` + `cwl-ingest` top-level `pathParam`/`queryParam` body). `classifyHubHandlerBody`/`listHubWebRoutes` (consumed by the native Java/Python/Go/etc. emitters) are untouched. Result: `plain-php-flagship-cwl`, `symfony-flagship-cwl`, and `express-flagship-cwl` are hole-free; emitted CWL re-parses with 0 holes; upholds non-negotiable #6 (no silent best-effort — genuinely unmappable shapes still hole with a named reason).

- **2026-05-28 — D422** **Symfony `#[Route]` method-list robustness (G123).** `extractRouteAttr` previously only matched the array form `methods: [...]`, so the equally-valid PHP scalar form `methods: 'POST'` fell through to the `GET` default — a silent mis-ingest of the HTTP method. It now matches both the array and the quoted-scalar form; the `routes.yaml` reader likewise strips quotes from method tokens. Each declaration still expands to one route per method (`['GET','POST']` → two manifest entries on one controller file). A focused **`fixtures/hub-symfony-attr-methods`** probe (scalar `POST` + multi-method `GET,POST`, 2 declarations → 3 routes) runs through `symfonyRouteManifestParity` for three-way parity; gated in **`hub-symfony-flagship`** `ok` and hub-completion **v37** (`symfonyFlagshipGold.attributeMethodsParity`).

- **2026-05-28 — D421** **Symfony class-prefix attribute combination (G122).** **`parseSymfonyAttributeRoute`** splits a controller at the `class` keyword: any `#[Route]` before it is the class-level prefix and is joined with the method-level attribute (path `/api` + `/items/{id}` → `/api/items/{id}`; name `api_` + `items_show` → `api_items_show`). Controllers without a class prefix are unchanged. A focused **`fixtures/hub-symfony-attr-prefix`** probe (2 routes, real prefixed controllers + `routes.yaml` + `chrysalis.routes.json`) runs through **`symfonyRouteManifestParity`** so the resolved surface stays in three-way parity; gated in **`hub-symfony-flagship`** `ok` and hub-completion **v36** (`symfonyFlagshipGold.attributePrefixParity`).

- **2026-05-28 — D420** **Symfony `#[Route]` attribute parity (G121).** **`parseSymfonyAttributeRoute`** / **`symfonyAttributeRouteSpecs`** read modern Symfony controller attributes (`#[Route('/p/{id}', name: ..., methods: [...])]`) from **`src/Controller/*.php`**; **`symfonyRouteManifestParity`** now requires **attributes ↔ `routes.yaml` ↔ `chrysalis.routes.json`** to all agree (single gate). The 20 flagship controllers carry real `#[Route]` attributes; **`@chrysalis/ingest`** lift stays hole-free (attributes ignored by the body lift). hub-completion **v35** (`symfonyFlagshipGold.routesAttributeParity`).

- **2026-05-28 — D419** **Symfony `routes.yaml` ingest + parity (G120).** **`hub-symfony-routes.mjs`** derives the hub route manifest from Symfony **`config/routes.yaml`** (dependency-free strict reader; `{name}`→`:name`, controller FQCN→`src/Controller/<Class>.php`, `id`→int else string) and **`symfonyRouteManifestParity`** verifies it matches **`chrysalis.routes.json`** that **`@chrysalis/ingest`** consumes. `@chrysalis/ingest` stays manifest-driven (no YAML dependency in the engine); YAML is the human source of truth, JSON is the verified ingest projection. Gated in **`hub-symfony-flagship`** `ok` and hub-completion **v34**.

- **2026-05-26 — D372** **Vue SFC script AST lift (G67).** **`hub-lift-dispatch`** extracts **`<script>`** from **`.vue`** and lowers via **`javascript-ast-ingest`** before pattern-lift holes. Enables **`hub-gold-vue-literal`** structural gold. **DESIGN §3** unchanged.

- **2026-05-26 — D371** **Asset + Vue framework/Next.js gold (G66).** **`sql/html/json → hono/fastify/nextjs`** on **`hub-pattern-lift`** asset trees; **`vue-literal-*`** on **`hub-gold-vue-literal`**. **DESIGN §3** unchanged.

- **2026-05-26 — D370** **Hub multi-lane nikic parity (G65).** **`hub-multi-lane-smoke`** schema **v1** runs Vitest **`nikic.test.ts`** when parser-bridge **`vendor/`** and **`php`** are available; records **`parserNikicParity`** in **`hub-completion`** schema **v20**. **DESIGN §3** unchanged.

- **2026-05-26 — D369** **CWL ↔ Next.js parity (G64).** Vitest **`hub-cwl-nextjs-parity`** asserts **`cwl-gold-nextjs`** handler count matches lifted route count alongside hono/fastify gold. **DESIGN §3** unchanged.

- **2026-05-26 — D368** **Pattern-lift → Next.js gold (G63).** **`ruby/java/go/csharp/kotlin/scala/swift/rust → nextjs`** literal structural + trace suites; completes pattern-lift origin Next.js CI depth. **DESIGN §3** unchanged.

- **2026-05-26 — D367** **Contract-first trace replay (G62).** **`listOpenApiFixtureRoutes`** drives replay probes for **`fixtures/hub-contract-first`**; **`hub-gold-trace-replay`** runs WPTP compose before replay for **`wptpCompose`** suites. **`hub-completion`** schema **v19**. **DESIGN §3** unchanged.

- **2026-05-26 — D366** **Python → Next.js hub gold (G61).** **`python-literal-nextjs`** structural + trace on **`hub-gold-python-literal`**. **DESIGN §3** unchanged.

- **2026-05-26 — D365** **Middleware + CWL → Next.js gold (G60).** **`js-middleware-nextjs`**, **`python-middleware-nextjs`**, **`cwl-gold-nextjs`** with Next.js trace replay (POST JSON probes where routes exist). **DESIGN §3** unchanged.

- **2026-05-26 — D364** **Hub multi-lane boundary smoke (G59).** **`hub-multi-lane-smoke`** runs oracle-php redactor tests when **`php`** is on PATH and records parser-bridge **`vendor/`** presence; wired into **`hub-completion`** schema **v18** so hub CI stays aligned with core parser/oracle lanes without duplicating full **`pnpm test`**. **DESIGN §3** unchanged.

- **2026-05-26 — D363** **WPTP contract-first hub gold (G58).** **`contract-first-hono`** / **`contract-first-nextjs`** structural suites on **`fixtures/hub-contract-first`** (OpenAPI → compose); **`hub-wptp-contract-gold.mjs`**; CI builds **`wptp-matrix`** before hub gates. **DESIGN §3** unchanged.

- **2026-05-26 — D362** **Next.js trace replay + structured Next.js gold (G57).** **`hub-gold-nextjs-fetch`** probes **`generated/nextjs/app/**/route.ts`** handlers in-process; trace replay for **`js/ts-literal-nextjs`** and **`js/ts-structured-nextjs`**. **DESIGN §3** unchanged.

- **2026-05-26 — D361** **JS/TS → Next.js structural gold (G56).** **`js-literal-nextjs`**, **`ts-literal-nextjs`** on literal fixtures via **`emit-nextjs-from-hub`** and **`@wptp/emit-nextjs`**; structural only (no trace replay). **`typecheck-and-test`** checks out **`wptp-emit-nextjs`** before **`ci:hub-completion`**. **`hub-completion`** schema **v17**. **DESIGN §3** unchanged.

- **2026-05-26 — D360** **Rust framework structural gold (G55).** **`rust-literal-hono`**, **`rust-literal-fastify`**, **`rust-literal-cwl`** on **`hub-gold-rust-literal`** (actix string responders). Completes pattern-lift origin → framework/CWL structural CI for **ruby/java/go/csharp/rust/kotlin/scala/swift**. **`hub-completion`** schema **v16**. **DESIGN §3** unchanged.

- **2026-05-26 — D359** **Kotlin/Scala/Swift framework structural gold (G54).** Add **`kotlin/scala/swift → hono/fastify/cwl`** structural suites on the native literal fixtures (pattern-lift origins) with trace replay for Hono/Fastify. **`hub-completion`** schema **v15**. **DESIGN §3** unchanged.

- **2026-05-26 — D356** **Python Flask middleware → CWL (G51).** **`python-middleware-cwl`** structural suite on **`hub-gold-python-middleware`**. **DESIGN §3** unchanged.

- **2026-05-26 — D355** **C# → Hono/Fastify structural gold (G50).** **`csharp-literal-hono`** / **`csharp-literal-fastify`** with trace replay. **DESIGN §3** unchanged.

- **2026-05-26 — D354** **Go → Hono/Fastify structural gold (G49).** **`go-literal-hono`** / **`go-literal-fastify`** (gin string literals) with trace replay. **DESIGN §3** unchanged.

- **2026-05-26 — D353** **Java → Hono/Fastify structural gold (G48).** **`java-literal-hono`** / **`java-literal-fastify`** on **`hub-gold-java-literal`** (Spring literal returns) with trace replay. **`hub-completion`** schema **v12**. **DESIGN §3** unchanged.

- **2026-05-26 — D352** **Ruby → Hono/Fastify structural gold (G47).** **`ruby-literal-hono`** / **`ruby-literal-fastify`** structural + trace replay on **`hub-gold-ruby-literal`** (Sinatra literals). Expands hub CI **`verifyTier: structural`** matrix coverage for **ruby** framework outputs. **DESIGN §3** unchanged.

- **2026-05-26 — D351** **Python Flask middleware gold (G46).** **`hub-flask-middleware.mjs`** records synthetic **`express.json`** / **`urlencoded`** presets for Flask apps (trace replay probe compatibility). **`python-ast-ingest`** lowers **`jsonify({...})`** to **`__return_json`**. Suites **`python-middleware-hono`** / **`python-middleware-fastify`**. **`hub-completion`** schema **v11**. **DESIGN §3** unchanged.

- **2026-05-26 — D350** **Kotlin / Scala / Swift native structural gold (G45).** Fixtures **`hub-gold-kotlin-literal`**, **`hub-gold-scala-literal`**, **`hub-gold-swift-literal`**; pattern lift for **Ktor `get`**, **Akka `complete`**, **Vapor `return`**. Suites **`kotlin-native-kotlin`**, **`scala-native-scala`**, **`swift-native-swift`**. **DESIGN §3** unchanged.

- **2026-05-26 — D349** **Hub `res.json` response emit (G44).** Hub **`javascript-ast-ingest`** lowers **`res.json(payload)`** to **`__return_json`**; **`emit-tree`** emits **`c.json(...)`** (Hono) or **`reply.code(__status).send(...)`** (Fastify). Restores **`js-middleware-fastify`** trace replay for POST JSON bodies. **DESIGN §3** unchanged.

- **2026-05-26 — D348** **Middleware POST trace replay + native gold depth (G43).** Trace replay probes **POST** routes with **JSON** / **urlencoded** bodies when matching middleware presets are lowered in WebIR. **Hono** emits **`chrysalisUrlencodedBodyMiddleware`**. **csharp** **MapGet** lambda and **rust** actix responder string literals lift hole-free; **csharp-native** / **rust-native** structural gold suites. **`hub-completion`** schema **v10** records middleware trace replay. **DESIGN §3** unchanged.

- **2026-05-26 — D347** **Native structural gold + verify-tier API (G42).** **`hub-gold-verify`** runs native emitters (**python**, **java**, **go**, **ruby**) for same-language structural suites; fixtures **`hub-gold-*-literal`**. Ingest depth: **gin `c.String`**, **Sinatra `do … end`** literals. **`GET /api/hub/verify-tiers`**; operator path explorer and work queue filter by **`verifyTier`**. **`hub-completion`** schema **v9** lists native structural suite ids. **DESIGN §3** unchanged.

- **2026-05-26 — D346** **Hub middleware lowering + verify tiers (G41).** Express **`app.use(express.json())`** lowers to **`web.request.middleware`** with literal preset bodies (holes for unknown middleware). **`planHubMiddlewareEmit`** emits **Hono** **`chrysalisJsonBodyMiddleware`** and **Fastify** registration comments. Hub matrix **`grade`** is **gold** for all **575** runnable pairs; **`verifyTier`** separates **oracle** (Chrysalis ingest), **structural** (hub gold suites), and **scaffold-*** (native/asset emit without CI proof). **`hub-completion`** schema **v8**. **DESIGN §3** unchanged (scaffold pairs are not falsely oracle-verified).

- **2026-05-26 — D345** **Gold coverage matrix (G40).** **`buildHubGoldCoverageReport`** aligns matrix **gold** grades with **hub-gold-manifest** structural suites or **chrysalis-ingest-emit** lanes; **`coverageGaps`** must be **0**. **`GET /api/hub/gold-coverage`**; **`hub-completion`** schema **v7**; gold-suites API schema **v2** includes per-pair coverage flags. Deploy verify adds **emit-fastify-dist** and HTTP gold-coverage probe. **DESIGN §3** unchanged.

- **2026-05-26 — D344** **Deploy gold-suites probe (G39).** **`gce-hub-finish-deploy`** validates **`GET /api/hub/gold-suites`** after the operator hub starts; **`hub-post-deploy-verify --http-probe-only`** runs HTTP + gold-suites checks post-restart. **`ci-gates`** enforces v6 **`expectedSuiteCount`** vs **`suiteCount`** parity. Demo install doc documents path explorer. **DESIGN §3** unchanged.

- **2026-05-26 — D343** **TS structured gold + middleware shell (G38).** **`hub-gold-ts-structured`** fixture; **ts-structured** and **js-middleware-cwl** gold suites (**24** structural / **16** trace). Lift report schema **v2** adds **`middlewareShell`** (`legacy:express-use` per file, routes still hole-free). **`hub-completion`** schema **v6** requires gold/trace suite counts match manifest. Matrix gold unchanged (**17**). **DESIGN §3** unchanged.

- **2026-05-26 — D342** **Gold suite coverage API (G37).** **`hub-gold-manifest`** adds **js-middleware-fastify** and **cwl-gold-fastify**; **`buildHubGoldSuiteCoverage`** maps matrix pairs to CI suite ids. **`GET /api/hub/gold-suites`** on the operator hub; path explorer shows per-pair structural/trace coverage. **`hub-post-deploy-verify`** checks the endpoint when the hub HTTP probe runs. **20** structural / **14** trace suites; matrix gold count unchanged (**17**). **DESIGN §3** unchanged.

- **2026-05-26 — D341** **Structured gold parity + path explorer (G36).** **`hub-gold-manifest`** adds **python-structured** (**fastify**, **cwl**), **js-structured-cwl**, **ts-literal-fastify**; **`hub-completion`** schema **v5** embeds **`goldVerify.suiteIds`** and **`traceReplay.suiteIds`**. Operator **Path explorer** auto-loads synthesis, renders clickable **goldPairs**, and honors **`#/paths?origin=&output=`**. Matrix **17** gold pairs unchanged; CI structural/trace depth widens. **DESIGN §3** unchanged.

- **2026-05-26 — D340** **Fastify hub gold trace replay (G35).** **`hub-gold-manifest`** adds **fastify** emit/trace suites (JS literal/structured, Python literal, CWL) alongside existing **hono** gates; **`hub-gold-trace-replay`** installs the correct runtime package per **`emitTarget`**. **`lift-to-webir`** reports **`middlewareUseCount`** from **`countExpressMiddlewareUses`**. **`hub-completion`** schema **v4** records trace targets. Matrix gold count unchanged (**17**); CI depth for the second TS framework stack. **DESIGN §3** unchanged.

- **2026-05-26 — D339** **Hub gold depth + path explorer (G34).** **`hub-gold-verify`** supports **CWL** emit and **round-trip** re-lift; fixtures for structured JSON, middleware shell (**`hub-gold-js-middleware`**), and **TS/Python** literals; **javascript/typescript/python → cwl** **gold** when structural gates pass; **`resolveHubPython`** (`python3`/`python`/`py` probe); **`lift-to-webir`** ignores **`generated/`** and **`.chrysalis/`**. Operator **Path explorer** (`#/paths`). **17** matrix gold pairs; trace replay on all hono **`traceReplay`** suites. Middleware: routes **gold**, pipeline **`app.use`** detected (**partial**, not lowered). **DESIGN §3** unchanged.

- **2026-05-26 — D338** **Hub cross-language synthesis gate (G33).** **`buildCrossLanguageSynthesis`** is exported from **`chrysalis-hub-store.mjs`** and served at **`GET /api/hub/cross-language-synthesis`**. **`hub-completion`** schema **v3** requires **`crossLanguageSynthesis.ok`** (575-pair universe) and includes **CWL** in **`hub-native-emit-smoke`**. Complements G31/G32 without a second IR. **DESIGN §3** unchanged.

- **2026-05-26 — D337** **Chrysalis Web Language (CWL, G32).** **CWL** (`.cwl`) is the WebIR-native hub language: **`cwl-parser.mjs`**, **`cwl-ingest.mjs`**, **`emit-cwl-from-hub.mjs`**, gold suite **`cwl-gold-hono`**, hub matrix origin+output **`cwl`**. Consolidates cross-language route/handler/literal/hole semantics from the 575-pair map without a second IR. Spec **`docs/CWL.md`**; synthesis **`docs/HUB-CROSS-LANGUAGE-SYNTHESIS.md`**. Does not replace legacy language runtimes. **DESIGN §3** unchanged.

- **2026-05-26 — D336** **Hub path knowledge base (G31).** **`hub-path-knowledge.mjs`** builds **`chrysalis.translation-hub.path-knowledge`**: every origin×output pair annotated with **similarities** (shared IR, ingest/emit lanes, gold clusters), **differences** (lane mismatch, verify expectations, capability gaps), and **bestPracticeIds** aligned with **DESIGN §3**. Language profiles, lane comparisons, and origin clusters are included. **`pnpm run hub:path-knowledge`**, **`GET /api/hub/path-knowledge`**. Complements G29 path matrix and G30 emit/oracle depth. **DESIGN §3** unchanged.

- **2026-05-26 — D335** **Hub comprehensive paths program (G30).** Completes the “all paths” engineering slice without cloning **`@chrysalis/ingest`** per language: **kotlin/scala/swift** native emitters; **python** simple-dict literal lowering + second **gold** pair (**python→hono** via **`hub-gold-manifest`**); generalized **`hub-gold-verify`** / **`hub-gold-trace-replay`**; minimal **`oracle-python`** / **`oracle-node`** NDJSON recorders + **`hub-oracle-record`**; **`hub-native-emit-smoke`** in **`hub-completion`** schema v2. Semantic middleware/ORM lowering and per-origin full oracle parity remain future depth. **DESIGN §3** unchanged.

- **2026-05-26 — D334** **Translation Hub path matrix (G29).** **`hub-translation-paths.mjs`** is the canonical model for how every hub origin×output pair flows through **ingest → WebIR → emit → verify**, plus **contract-first WPTP** alternates. Grades (**gold/silver/open**) remain on **`HUB_ROUTES`**; paths explain *which scripts and oracle lanes* apply without duplicating **`@chrysalis/ingest`** per language. **`pnpm run hub:path-matrix`** and **`GET /api/hub/translation-path-matrix`** export **`chrysalis.translation-hub.path-matrix`** JSON. Does not add native ingest packages for all origins — promotion still requires trace-backed verify per **DESIGN §3**. **DESIGN §3** unchanged.

- **2026-05-26 — D333** **Hub matrix completion finish (G28).** **javascript-ast-ingest** lowers **`res.json({...})`** and string-key **object literals** via **`__object_literal`**; **`hub-gold-trace-replay`** probes emitted Hono and replays with **`@chrysalis/verify`** (in-process trace oracle for hub gold). Native emit **ruby/csharp/rust** (**`emit-*-from-hub.mjs`**). CI checks out **`theorem6/wptp-matrix@v0.1.10`** and runs **`hub:wptp-gold-smoke`**; **`hub-completion`** schema v1 includes **`traceReplay`**. Does not replace PHP oracle for arbitrary apps. **DESIGN §3** unchanged.

- **2026-05-26 — D332** **Hub completion CI + Java/Go native emit (G27).** **`emit-java-from-hub.mjs`** and **`emit-go-from-hub.mjs`** emit Spring/gin skeletons from hub WebIR; **`hub-completion.mjs`** aggregates **`hub:matrix-smoke`** + **`hub:gold-verify`** + route grade counts into **`chrysalis.hub.completion`** for **`ci:hub-completion`** in GitHub Actions. Does not claim full oracle parity or semantic lowering for Java/Go bodies. **DESIGN §3** unchanged.

- **2026-05-26 — D331** **Hub native Python emit + second gold pair (G26).** **`emit-python-from-hub.mjs`** emits Flask from hub WebIR; **`hub-webir-routes.mjs`** walks routes for native emitters. **javascript** / **typescript** → **hono** / **fastify** / **typescript** routes promote to **gold** when literal-only lift passes **`hub-gold-verify`** (oracle footprint zero holes + Hono emit). Contract-first WPTP compose smoke via **`hub:wptp-gold-smoke`**. Does not claim PHP-oracle parity for non-PHP origins or full semantic lowering. **DESIGN §3** unchanged.

- **2026-05-26 — D330** **Hub open-matrix pattern + file lift (G25).** **`pattern-route-parsers.mjs`** / **`pattern-route-lift.mjs`** / **`hub-lift-dispatch.mjs`** lift HTTP registrations for **ruby**, **csharp**, **kotlin** (Java patterns), **rust**, **scala**, **swift**, **vue**; **sql/html/css/json/yaml/markdown/c/cpp** get one GET route per scanned file. Fixtures **`fixtures/hub-pattern-lift`**; **`pnpm run hub:matrix-smoke`**. Does not add oracle parity or native emitters — bodies remain **holes** unless literal. **DESIGN §3** unchanged.

- **2026-05-26 — D329** **Hub Java + Go route lift v0 (G23–G24).** Source-pattern ingest for **Spring/JAX-RS** (`java-ast-ingest.mjs`) and **Go** HTTP routers (`go-ast-ingest.mjs`); shared **`hub-lift-webir-route.mjs`**. Literal returns near registrations lower when obvious; other bodies stay **holes**. Not javac/go parser front-ends. **DESIGN §3** unchanged.

- **2026-05-26 — D328** **Hub Python AST ingest v0 (G22).** **`python-ast-ingest.mjs`** invokes CPython **`ast`** ( **`python3`** on PATH, override **`CHRYSALIS_HUB_PYTHON`**) to discover Flask/FastAPI-style decorated routes and literal **`return`** values; **dict** / call bodies remain **holes**. Wired through **`lift-to-webir`**. Does not add **`@chrysalis/ingest`** PHP-style oracle ingest. **DESIGN §3** unchanged.

- **2026-05-26 — D327** **Hub JavaScript/TypeScript AST ingest v0 (G21).** **`javascript-ast-ingest.mjs`** parses **.js/.ts** (TypeScript via **`transpileModule`**) with **acorn**, lowers Express-style routes and simple **literal** returns into WebIR; **CallExpression** / **ObjectExpression** bodies remain **holes**. **`lift-to-webir`** prefers AST before regex heuristic. Does not replace **`@chrysalis/ingest`** PHP path or claim oracle parity. **DESIGN §3** unchanged.

- **2026-05-26 — D326** **Translation Hub contract-first matrix leg (G20).** **`discoverContractArtifacts`** walks site trees for OpenAPI/Swagger/HAR; **`wptp-compose-site`** and **`runHubEmitPipeline`** prefer WPTP silver compose for **any origin → hono|nextjs** when contracts exist (not PHP-only). **`lift-routes-heuristic`** detects Express/Fastify-style routes for **javascript**/**typescript** hub lift (handler bodies stay holes). Does not claim native ingest for all languages — scaffolds and oracle gates unchanged. **DESIGN §3** unchanged.

- **2026-05-26 — D325** **IR helper lifting B4 v0 (embed helper bodies in route module).** **`buildLibraryHelpersWebIrModule`** + **`IngestOptions.embedSharedHelperBodiesInModule`**; CLI **`--ingest-embed-shared-helper-bodies`** (requires **`--ingest-dedupe-structural-subgraphs`**). Merges lib/vendor helper lowered bodies as extra **`Module.roots`** via **`mergeWebIrModules`**, then structural dedupe. Complements B2 call-effect canonicalization; emit-time handler dedupe remains **`--emit-dedupe-identical-handler-bodies`** (**D282**). GCE WPTP bootstrap defaults to full harness (**`CHRYSALIS_ROOT`**, **`verify-tiny-blog`**, **`WPTP_EMIT_NEXTJS_ROOT`**). **DESIGN §3** unchanged.

- **2026-05-25 — D324** **IR helper lifting B3 v0 (semantic local-name equivalence).** Extends B2 with order-based local slot normalization when building helper-lift keys; **`IngestOptions.liftSharedHelpersSemantic`** + CLI **`--ingest-lift-shared-helpers-semantic`** (requires **`--ingest-lift-shared-helpers`**). **`lift-helper-gap-probe`** twins (`$x` vs `$y`) canonicalize for call-effect widening. Does not claim full semantic equivalence for arbitrary PHP. **DESIGN §3** unchanged.

- **2026-05-25 — D323** **IR helper lifting B2 v0 (call-effect body canonicalization).** **`buildHelperLiftAliasMap`** / **`applyHelperLiftAliases`** in **`@chrysalis/ingest`**; **`IngestOptions.liftSharedHelpers`** + CLI **`--ingest-lift-shared-helpers`** (requires **`--ingest-dedupe-structural-subgraphs`**). Structurally identical lib/vendor function bodies (origin-insensitive key) share one lowered root before the call-effect fixpoint; fixture **`fixtures/lift-helper-lift-twin/`**. Does not merge near-duplicates (**B3** / **`lift-helper-gap-probe`**). **DESIGN §3** unchanged.

- **2026-05-25 — D322** **Translation Hub language readiness + work queue (G19).** **`buildLanguageReadinessReport`** and **`buildLanguageWorkQueue`** in **`chrysalis-hub-store.mjs`** expose popularity-ordered ingest/emit status per language and scoped backlog rows (tasks + acceptance criteria) for open/silver pairs; portal **Languages** tab and **`GET /api/hub/language-readiness`**, **`GET /api/hub/language-work-queue`**. Does not change route grades or oracle gates — it surfaces honest debt for operators and program planning. **DESIGN §3** unchanged.

- **2026-05-20 — D320** **Translation Hub post-v1 portal depth (G14–G17).** **`chrysalis-hub-org.mjs`** org registry + project **`orgId`** ACLs; resumable trace upload (**`upload/start|chunk|finish`**); emitted-app **`probeRuntimeHealth`** with SSE **`runtimeHealth`**; hub translate defaults **`CHRYSALIS_HUB_PREFER_WPTP=1`** via **`wptp-emit-pipeline.mjs`** with explicit scaffold fallback hole. Does not claim full WPTP native emit parity — that remains WPTP CI / core emitters. **DESIGN §3** unchanged.

- **2026-05-20 — D318** **Translation Hub portal verify, observe, lifecycle, auth.** Console drives **`chrysalis verify`** (**`chrysalis-hub-verify.mjs`**) against **`site/.chrysalis/traces`** + operator-supplied **base URL**; **`observe-assist`** JSON for staging capture; **`PATCH`** sites, remove/re-pull; optional **`CHRYSALIS_OPERATOR_TOKEN`** in browser; **`wptp-smoke`** on hub VM when **`wptp-matrix`** present. **DESIGN §3:** verify remains oracle-gated; hub does not run capture on prod.

- **2026-05-20 — D317** **Translation Hub portal-first async setup.** Browser is the only required client: **`POST /api/hub/projects`** accepts **`sites[]`**; **`chrysalis-hub-setup.mjs`** runs prep/pull/detect in the background with SSE **`setup`** / **`siteSetup`**; **`POST …/run-pipeline`** chains setup then batch translate. Long SSH work must not block HTTP. **DESIGN §3:** unchanged — no remote Chrysalis install, no fake capture.

- **2026-05-20 — D316** **Translation Hub SSH origin prep (two-phase ops).** **`chrysalis-hub-prep-origin.mjs`** + **`scripts/agents/chrysalis-origin-bootstrap.sh`**: over SSH the hub copies **`scripts/agents/`**, installs **`chrysalis-origin-scan`**, writes **`~/.chrysalis/observe/CAPTURE-ON-ORIGIN.md`** and optional **`chrysalis.observe.json`** on the app tree — **no** remote Node/Chrysalis stack install and **no** automatic **`php.ini`** / **`auto_prepend_file`** changes. Site records store **`originPrep`**; UI/API **`POST …/prep-all-sites`** and default **Prepare origin on add**. Translation stays on the hub; live HTTP/SQL remains **PHP oracle on staging** per **`packages/oracle-php`**. **DESIGN §3:** no silent capture or fake remote conversion.

- **2026-05-20 — D314** **Translation Hub universal operator surface (open matrix).** **`scripts/hub-ingest/language-catalog.mjs`** is the single language list for origin and output menus; **`HUB_ROUTES`** includes every distinct origin×output pair with **`status: ready`** and grade **`open`** (native scaffold via **`emit-target-project.mjs`**), **`silver`** (hub lift + TS framework emit), or **`gold`** (PHP Chrysalis ingest + emit). **`HUB_MISSION_OPEN`** documents that the hub product story is no longer PHP-only framing; oracle-gated verify remains the PHP→TS reference leg. **DESIGN §3:** no silent transpilers — scaffolds and holes stay explicit; WPTP **`wptp-emit-*`** deepens native output over time.

- **2026-05-19 — D311** **IR helper lifting — design pass (docs only).** **`docs/IR-HELPER-LIFTING.md`** records problem, gates (effects, provenance, holes, oracle), phased plan **B0–B3**, and CLI sketch **`--ingest-lift-shared-helpers`**. Implementation remains backlog (**D310** gate). **DESIGN §3:** no runtime change on `main`.

- **2026-05-19 — D310** **IR helper lifting — scope gate (backlog).** Post-**D283** structural dedupe and **`--ingest-dedupe-structural-subgraphs-ignore-origin`** do not lift non-identical helper bodies into shared IR. A future lifting pass must prove effects + provenance per **`DESIGN §3`** before landing; no partial best-effort merge on **`main`**.

- **2026-05-19 — D308** **Verify replay respects oracle redaction.** **`replay-http` `buildBody`** uses **`rawBody`** when **`post`** fields contain redaction placeholders (`***REDACTED***`, `sha256:`). **`sql-replay` `canSqlReplayTrace`** skips SQL tapes with redacted row cells so live SQLite serves secrets (e.g. bcrypt **`password`** on **`POST /login`**). Restores **`verify-tiny-blog`** at **`VERIFY_THRESHOLD=0.95`** in CI. **DESIGN §3:** no oracle shortcuts.

- **2026-05-19 — D307** **WPTP D6 enterprise policy pack (in-tree).** **`docs/WPTP-D6-ENTERPRISE-POLICY.md`** covers private adapters, SSO/holes-first posture, data residency, and alignment with **`docs/COMMERCIAL.md`**. **`docs/WPTP-D6-EXIT-REPORT.md`** records technical exit; sponsor SKUs stay in **`docs/WPTP-FUNDING-TRACKER.md`**. **`docs/WPTP-D7-ONGOING.md`** defines quarterly matrix audit. **DESIGN §3:** unchanged runtime.

- **2026-05-19 — D306** **WPTP silver Next.js via Chrysalis WebIR bundle bridge.** **`scripts/emit-webir-bundle-nextjs.mjs`** validates bundles with **`@chrysalis/webir`** and emits via sibling **`@wptp/emit-nextjs`** (no **`@chrysalis/emit-nextjs`** on `main`). **`wptp-matrix`** adds **`compose-chrysalis-nextjs`**, harness ids **`openapi-ir-nextjs-chrysalis`** / **`har-ir-nextjs-chrysalis`**, matrix edges, and Chrysalis CI **`wptp-silver-nextjs-harness`**. **DESIGN §3:** Chrysalis product emit remains Hono/Fastify only; Next.js is WPTP silver.

- **2026-05-19 — D305** **WPTP D4 technical exit in Chrysalis CI.** **`scripts/wptp-d4-nextjs-harness.mjs`** runs matrix bronze paths **`openapi-ir-nextjs`** and **`har-ir-nextjs`** (`@wptp/emit-nextjs` App Router stubs + **`verifyComposedNextJsBronze`**). Workflow **`.github/workflows/wptp-d4-harness.yml`** also runs **`theorem6/wptp-emit-nextjs`** **`npm test`**. Charter **`docs/WPTP-D4-EXIT-REPORT.md`**. **DESIGN §3:** unchanged product charter on `main` (no Chrysalis `emit-nextjs` pass).

- **2026-05-19 — D303** **Canonical public GitHub remote — `AgenticOp-io/chrysalis`.** Forward-looking **clone / Releases / issues / security** links and **`package.json` `repository.url`** use **`https://github.com/AgenticOp-io/chrysalis`** (org home; **`theorem6/chrysalis`** redirects). **`scripts/bootstrap-github-project.mjs`** default owner is **`AgenticOp-io`** unless overridden. WPTP GitHub Project lives under the org. **D293** remains as the historical **`theorem6`** user-namespace record. **DESIGN §3:** metadata only.

- **2026-05-19 — D304** **WPTP D3 technical exit in Chrysalis CI.** **`scripts/wptp-d3-silver-harness.mjs`** runs matrix silver paths **`openapi-ir-hono-chrysalis`** and **`har-ir-hono-chrysalis`** (OpenAPI + HAR → IR → WebIR → **`emit-webir-bundle-hono`**). Workflow **`.github/workflows/wptp-d3-harness.yml`**. Charter **`docs/WPTP-D3-EXIT-REPORT.md`**. **DESIGN §3:** unchanged product charter on `main`.

- **2026-05-17 — D302** **WPTP contract-replay gold + Fastify bronze + GitHub Pages.** New **`theorem6/wptp-emit-fastify`** mirrors **`@wptp/emit-hono`** (`reply.send` stubs, status codes, POST body echo). **`wptp-matrix`** adds **contract-replay gold** harness cases (OpenAPI/HAR × Hono/Fastify) using **`fixtures/replay/*.replay.json`** — automated HTTP replay **without Chrysalis PHP oracle**. Matrix grows to **18** edges; **`pages.yml`** publishes static site from **`_site/`**. **DESIGN §3:** Chrysalis runtime unchanged.

- **2026-05-17 — D301** **WPTP program depth slice (matrix site, gold smoke, IR/Hono bronze).** **`wptp-matrix`** static site renders **12** matrix edges + composer paths; **`verify:harness`** adds optional **`php-webir-hono`** when **`CHRYSALIS_ROOT`** is set (tiny-blog **`chrysalis status`** + WebIR emit smoke). **`@wptp/adapter-openapi`** lifts **`responseStatus`** from OpenAPI **`responses`**; **`@wptp/emit-hono`** stubs use status codes, **`operationId`**, and echo POST bodies. **`wptp-ir`** adds **`petstore-mini`** golden + export round-trip tests (**11** IR fixtures). **DESIGN §3:** unchanged in Chrysalis runtime.

- **2026-05-17 — D300** **WPTP contract → Hono bronze via `@wptp/emit-hono`.** Sibling **`theorem6/wptp-emit-hono`** emits a minimal Hono project with **`return c.json({ ok, route, method })`** stubs (OpenAPI **`{id}`** → Hono **`:id`**). Matrix **`openapi-ir-hono`** / **`har-ir-hono`** compose through **`wptp-matrix`** without **`CHRYSALIS_ROOT`**; harness runs **`app.fetch`** runtime checks after **`npm install`** in the emitted tree. **Gold** PHP→Hono remains **`php-webir-hono`** (Chrysalis **`@chrysalis/emit-hono`**). Optional **silver** path: **`exportIrToWebIrBundleV0`** + **`scripts/emit-webir-bundle-hono.mjs`** (Chrysalis lowering; not required for bronze contracts). **DESIGN §3:** Chrysalis emit unchanged; WPTP bronze does not claim oracle parity.

- **2026-05-16 — D299** **WPTP OpenAPI → Hono bronze compose path (Chrysalis WebIR bridge).** **`theorem6/wptp-ir`** **`exportIrToWebIrBundleV0`** synthesizes stub **handler** subgraphs for contract-only routes; **`scripts/emit-webir-bundle-hono.mjs`** and **`@chrysalis/webir` `moduleFromGoldenSnapshot`** feed **`@chrysalis/emit-hono`**. Superseded for matrix **bronze** compose by **D300** (`@wptp/emit-hono`); WebIR export remains the **silver** reverse-lift. **DESIGN §3:** Chrysalis **`@chrysalis/emit-hono`** only on that optional path.

- **2026-05-16 — D298** **WPTP compose paths, verify harness, IR→WebIR export.** Sibling **`theorem6/wptp-matrix`** adds **`har-ir-nextjs`** compose, **`wptp-compose`** / **`wptp-verify-harness`** CLIs, and in-repo **bronze** + **silver** harness runs (`npm run verify:harness`). **`theorem6/wptp-ir`** adds **`exportIrToWebIrBundleV0`** (silver reverse lift for Chrysalis emit reuse). Matrix rows **`browser-to-nextjs-composed`**, **`ir-v0-to-webir-bundle`**; composed OpenAPI evidence points at matrix harness CI. Chrysalis **`docs/WPTP-GLOBAL-SCOPE.md`** documents composer paths and grade wiring. **DESIGN §3:** unchanged in this repo — no new emit pass consumes IR until a future entry wires export into ingest/emit.

- **2026-05-16 — D297** **WPTP global scope sibling repos (matrix + OpenAPI adapter).** Program-level artifacts live outside Chrysalis: **`theorem6/wptp-matrix`** (public compatibility matrix **`data/matrix.v0.json`**, validator forbids **Gold** without **harness** + **corpus|ci**), **`theorem6/wptp-adapter-openapi`** (OpenAPI 3 → IR v0 routes, **bronze**), charter **`docs/WPTP-GLOBAL-SCOPE.md`**. Chrysalis **`main`** unchanged for ingest/emit; matrix rows reference Chrysalis as evidence for PHP→TS **Gold** edges. **DESIGN §3:** no new runtime in this repo.

- **2026-05-16 — D296** **WPTP IR hub sibling repo (`theorem6/wptp-ir`) and WebIR bundle export.** The **Web Platform Translation Program** (**`docs/MASTER-PROGRAM.md`**) funds **D2** as a **separate repository** so neutral IR does not expand Chrysalis product charter on **`main`**. **`theorem6/wptp-ir`** ships **IR `schemaVersion` 0.1.0**, **import** from **`chrysalis.webir.bundle@1.0.0`**, explicit **`losses[]`**, and **10+** conformance fixtures. Chrysalis adds **`scripts/export-webir-bundle.mjs`** to wrap existing WebIR golden/module JSON (same shape as **`moduleToGoldenSnapshot`**) for that importer. **DESIGN §3:** unchanged in this repo — no neutral IR types in **`@chrysalis/webir`**; emit/verify still consume WebIR only until a future Decision Log entry wires IR hub export into passes.

- **2026-06-02 — D2254** **Parallel graduation lock fan-out (G2254).** **`runAuthoringGraduationLockGate`**, **`runMonth23GraduationLockGate`**, **`runPost90HubGraduationLockGate`** use **`Promise.all`** for independent gate slices (vitest + GCE latency).

- **2026-06-02 — D2059** **Hub verify-gaps × CWL queues 91–110 (G2059–G2258).** Express/symfony/laravel-min gaps, auth-probe reingest HTTP+Fastify, IR helper lifting, hub ops mega batches; **`runPost90HubGraduationLockGate`**; batches **v91–v110**; hub-completion **schema 183**; gate-only **`skipPriorChain`**. GCE runs **v60 + v110**. Vitest: **`hub-cwl-authoring-batch-v91-v110.test.ts`**.

- **2026-06-03 — D2260** **v63 gate-only skipPrior (G2260).** `runCwlAuthoringBatchV63Smoke` with `skipPriorChain` runs **`runRuntimeCwlParityGate`** only (`gate63Mode: runtime-cwl-parity`), not full **`runPost62CompositeGate`** (duplicate post61 work caused >600s timeouts on GCE). Graduation path unchanged. **DESIGN §3** verify-gated.
- **2026-06-03 — D2261** **GCE authoring v65/v70 floors (G2261).** v65 **`project-to-cwl-mandatory`** gate-only vitest **240s** (observed **132s** on GCE). **`hub-node-express-oracle-verify.mjs`** reads **`CHRYSALIS_EXPRESS_SERVER_START_TIMEOUT_MS`** (GCE default **60s** via **`gce-run-all-tests.sh`** / **`gce-hub-authoring-batch-vitest.sh`**) for v70 **`authoring-graduation-lock`** parallel express oracle under load. Authoring batch vitest **`--testTimeout=900000`** on GCE.
- **2026-06-03 — D2262** **GCE graduation lock timeouts (G2262).** v90 **`month23-graduation-lock`** gate-only vitest **1200s** (17-way **`Promise.all`**; hit **600s** wall on GCE). v108 **900s**, v110 **1200s**; **`gce-hub-authoring-batch-vitest.sh`** **`--testTimeout=1200000`** ceiling. Superseded for v90/v110 vitest by **D2263** (fast skipPrior path).
- **2026-06-03 — D2263** **Gate-only graduation lock fast path (G2263).** Authoring vitest **`skipPriorChain`** for v90/v110 runs **`runEvidenceTrendStandaloneGate`** (`gate90Mode` / vitest **`evidence-trend`**) instead of full parallel graduation locks (v71–89 / v91–109 already exercised in same file). Full **`post90-hub-graduation-lock`** remains on **`gce-run-all-tests.sh`** v110 phase via **`CHRYSALIS_RUN_FULL_GRADUATION_LOCK=1`**. Matches v109 / **G2260** delta-only pattern. **DESIGN §3** verify-gated.
- **2026-06-03 — D2264** **GCE v91–110 authoring floors (G2264).** **`hub-verify-gaps-symfony-smoke.mjs`** accepts **`no-verify-report`** skip like express/laravel-min (fixes v92 on GCE). v108 gate-only **`evidence-trend`** skipPrior (composite deferred; v109/v110 cover graduation). v106 **`oracle-product-ultra`** vitest **2400s** on GCE; authoring **`--testTimeout=2400000`** ceiling. Superseded for v106 vitest by **D2265** (fast skipPrior + dedicated GCE phase).
- **2026-06-03 — D2265** **v106 oracle-product-ultra fast path (G2265).** Authoring vitest **`skipPriorChain`** for v106 runs **`runEvidenceTrendStandaloneGate`** (`gate106Mode: evidence-trend`) like v108/v110. Full **`oracle-product-ultra`** on **`gce-run-all-tests.sh`** v106 phase via **`CHRYSALIS_RUN_ORACLE_PRODUCT_ULTRA=1`**. **DESIGN §3** verify-gated.
- **2026-06-03 — D2266** **v107 verify-standalone-mega fast path (G2266).** Authoring vitest **`skipPriorChain`** for v107 runs **`evidence-trend`**; full **`verify-standalone-mega`** on **`gce-run-all-tests.sh`** v107 phase via **`CHRYSALIS_RUN_VERIFY_STANDALONE_MEGA=1`**. Mirrors **D2265**. **DESIGN §3** verify-gated.
- **2026-06-03 — D2267** **Graduation lock mega gate wave (G2267).** **`runPost90HubGraduationLockGate`** runs **`runMigrationOsMegaGate`**, **`runOracleProductUltraGate`**, and **`runVerifyStandaloneMegaGate`** sequentially after parallel light gates — avoids GCE RAM/timeout spikes from 17-way **`Promise.all`** (**D2254** fan-out retained for light gates only). **DESIGN §3** unchanged.
- **2026-06-04 — D2268** **GCE v65/v70 reload floors (G2268).** v65 **`project-to-cwl-mandatory`** vitest **480s** (loaded GCE exceeded **240s** at **245s**); v70 **`authoring-graduation-lock`** **900s** (observed **386s** under same load). **DESIGN §3** verify-gated.
- **2026-06-04 — D2269** **GCE hub-completion fast path (G2269).** When **`CHRYSALIS_GCE_HUB_COMPLETION_FAST=1`** or **`CHRYSALIS_GCE_ALL_TESTS=1`**, **`hub-completion.mjs`** runs matrix/gold/trace/multi-lane only and defers duplicate smokes/batches with **`{ ok: true, skip: "gce-deferred-hub-completion-fast" }`** so **`ci:hub-completion`** passes after vitest + dedicated v106/v107/v110 GCE phases (avoids multi-hour re-run hang). **DESIGN §3** unchanged — deferred work is not skipped on non-GCE completion.
- **2026-06-04 — D2270** **GCE hub gold gates phase (G2270).** **`gce-hub-gold-gates.sh`** runs structural **`hub-gold-verify`** + **`hub-gold-trace-replay`** once before **`ci:hub-completion`**; hub-completion fast path **reuses** **`reports/ci/gce-gold-verify.json`** / **`gce-trace-replay.json`** instead of re-running (~50 min duplicate). **`runJson`** parses failure JSON from **stderr**; **`goldVerify`/`traceReplay` report fields** no longer fall back to expected suite counts when subprocess output is missing (**`subprocessExit`** surfaced). **DESIGN §3** verify-gated.
- **2026-06-03 — D2259** **Post110 verify-gaps reinforcement (G2259).** **`hub-verify-gaps-post110-reinforcement-smoke.mjs`** composes hub verify-gaps months **26–30** (B1–B5): strict auth-probe reingest, multi-flagship replay/HTTP/Fastify, IR helper embed + full path. GCE phase after v110 when **`CHRYSALIS_GCE_POST110_PHASE_B=1`** (default on full GCE). Delivery dashboard **v36** + capability matrix **v33**. **DESIGN §3** unchanged — verify-gated HTTP/replay only.
- **2026-06-16 — D2271** **GCE phased runner (G2271).** **`gce-run-all-tests.sh`** split into **38** **`gce-run-phase`** rows with **`gce-progress.json`** schema **v2**, bootstrap from phase logs, skip-completed resume, mega slices/dedupe, and operator restart scripts. **DESIGN §3** unchanged — CI harness only.
- **2026-06-16 — D2272** **HTTP verify subprocess probe (G2272).** **`hub-verify-http-probe-worker.mjs`** runs **`loadHubProbeContext`** + **`probeHubGoldCorpus`** in a fresh Node process; parent **`runProjectVerifyHttp`** defaults to subprocess probe (opt-in in-process via **`CHRYSALIS_HUB_VERIFY_HTTP_INPROCESS_PROBE=1`**). Avoids tsx/esbuild state corruption when many HTTP verifies run in one long-lived smoke (GCE post110 B4 fastify hang). **DESIGN §3** verify-gated — no oracle shortcuts.
- **2026-06-16 — D2273** **Hub verify emit skip-reemit (G2273).** **`prepareProjectVerifyEmit`** skips lift/export/emit when **`isVerifyEmitComplete`** + WebIR exist; **`prewarmFlagshipVerifyEmits`** before post110 B3; PHP flagship hono/fastify in **`gce-ensure-fixture-emits.sh`**. Override **`CHRYSALIS_HUB_VERIFY_FORCE_REEMIT=1`**. **DESIGN §3** unchanged.
- **2026-06-16 — D2274** **Post110 GCE green (G2274).** Full **`pnpm run test:gce`** → **`gce-all-tests.ok`** with **`post110-verify-gaps`** exit **0** (2026-06-16). Closes **`docs/CWL-FULLSTACK-POST-110-PROGRAM.md`** Phase A+B. **DESIGN §3** verify-gated.
- **2026-06-16 — D2275** **`--ingest-lift-shared-helpers-respect-origin` CLI pass-through (G2275).** **`packages/cli/src/bin.ts`** forwards the flag to ingest options for **`verify`**, **`repair`**, **`insight`**, **`status`**, and **`rewrite`** (matching the existing ingest/emit wiring), and **`chrysalis --help`** mentions the flag for the V2 scale-out flag family. **`packages/cli/tests/cli-help-scaleout.test.ts`** asserts the help text. **DESIGN §3** unchanged.
- **2026-06-16 — D2276** **IR helper lift flag validation + CLI tests (G2276).** **`validateIngestLiftFlagsFromCli`** / **`ingestLiftOptionsFromFlags`** centralize ingest lift/dedupe flag dependency checks on all ingest-driven CLI commands; **`ingestDirectory`** rejects **`liftSharedHelpersIgnoreOrigin: false`** without **`liftSharedHelpers`**. Vitest **`packages/cli/tests/ingest-lift-shared-helpers-cli.test.ts`** + **`packages/ingest/tests/lift-shared-helpers.test.ts`**. **`docs/IR-HELPER-LIFTING.md`** B2.5 row. **DESIGN §3** unchanged.
- **2026-06-16 — D2277** **IR helper lifting B5 v0 param-read slots (G2277).** **`buildHelperLiftLocalSlotMap`** registers **`data.param`** nodes during the body walk so semantic lift aliases helpers that differ only by formal parameter names on direct returns (extends B3 assign-target slots). Fixture **`fixtures/lift-helper-param-twin/`** with negative control for arithmetic-form twins; Vitest **`packages/ingest/tests/lift-helper-param-twin.test.ts`**. **B5.2+** structural equivalence remains deferred per **`docs/IR-HELPER-LIFTING.md`**. **DESIGN §3** unchanged — holes-first; no best-guess merge.
- **2026-06-16 — D2278** **IR helper lifting B5.2 scale-by-2 equivalence (G2278).** **`helperLiftArithmeticCanonicalKey`** in **`lift-shared-helpers.ts`** canonicalizes **`binOp("*", P, literal(2))`** and **`binOp("+", P, P)`** to the same semantic structural fragment during **`--ingest-lift-shared-helpers-semantic`** alias discovery. Narrow explicit rule only — **`arith_gamma`** (`$n * 3`) stays unmerged. **DESIGN §3** unchanged.
- **2026-06-16 — D2279** **Lane A parser parity: arrow + match (G2279).** Canonical AST adds **`ArrowFunction`** and **`Match`** / **`MatchArm`** expression kinds; **`glayzzle`** + **`nikic-json`** mappers; **`fixtures/parser-parity-probe/pages/arrow_fn.php`** and **`match_expr.php`** with strip-pos parity in **`nikic.test.ts`**. Ingest still holes **`expr:ArrowFunction`** / **`expr:Match`** until lowering lands. **DESIGN §3** unchanged — parser contract before ingest widening.
- **2026-06-16 — D2280** **B5.2 v2 + B5.3 gate; ingest arrow/match; parser named args + attributes (G2280).** Commutative **`+`/`*`** semantic keys + **`bodyHasIrEffects`** arithmetic gate; ingest lowers **`__arrow_fn`** / **`__match`** (emit + simulate); **`Call.argNames`** + **`PhpAttribute`** on **`FunctionDecl`**; parity pages **`named_args.php`**, **`attributes.php`**. **DESIGN §3** unchanged.
- **2026-06-16 — D2281** **B5.3 v2 SQL-twin + first-class callable parity (G2281).** Fixture **`fixtures/lift-helper-sql-twin/`** proves effectful SQL literal helpers do not semantic-alias; parser adds **`PhpVariadicPlaceholder`**; ingest lowers **`strlen(...)`**-style creation via **`__first_class_callable`** plus variable callee calls; parity page **`first_class_callable.php`**. **DESIGN §3** unchanged — no silent SQL literal merge.
- **2026-06-16 — D2282** **Lane A parser parity: backed enum declarations (G2282).** Canonical AST adds **`EnumDecl`** / **`PhpEnumCase`**; glayzzle **`enum`** + nikic **`Stmt_Enum`** mappers; ingest drops enum decls as no-op; parity page **`enum_decl.php`**. **DESIGN §3** unchanged.
- **2026-06-16 — D2283** **WebIR named PHP call args on `data.call` (G2283).** Optional **`argNames`** parallel array on **`data.call`** attrs; ingest **`phpCallArgNames`** forwards parser **`Call.argNames`** for builtins like **`strlen`**. Emit/simulate unchanged — positional operands only. **DESIGN §3** unchanged.
- **2026-06-16 — D2284** **WebIR PHP attributes on `data.call` (G2284).** Optional **`phpAttributes`** on **`data.call`** attrs; ingest **`collectFunctionAttributes`** + **`phpCallAttributes`** attach callee **`FunctionDecl`** metadata (e.g. **`#[\Chrysalis\Probe('parity')]`**). Emit/simulate unchanged. **DESIGN §3** unchanged.
- **2026-06-16 — D2285** **B5.3 v3 SQL whitespace canonicalization (G2285).** **`normalizeSqlLiteralForHelperLift`** during semantic helper-lift keys; effectful twins with whitespace-only SQL differences alias; different literals stay split (**`sql-twin`**). **DESIGN §3** unchanged — no silent merge of distinct SQL.
- **2026-06-16 — D2286** **Lib PHP attributes on WebIR calls (G2286).** **`collectLibraryFunctionAttributes`** indexes lib/vendor/route helpers; **`ingestHandler`** merges with route-local attrs; fixture **`lift-helper-attr-lib`**. **DESIGN §3** unchanged.
- **2026-06-16 — D2287** **Emit phpAttrs suffix + hub semantic smoke v3 (G2287).** Emit appends `/* phpAttrs:… */` on **`data.call`** for traceability; hub semantic smoke schema **v3** adds **`sql-ws-twin`** and **`sql-same-twin`**. **DESIGN §3** unchanged.
- **2026-06-16 — D2288** **Class method attributes + simulate/footprint metadata (G2288).** Parser bridge forwards **`attrGroups`** on hoisted class methods; simulate records **`phpAttributedCalls`**; oracle footprint counts attributed calls; hub attr smoke + B5.3 v4 simulate twin equivalence. **DESIGN §3** unchanged.
- **2026-06-16 — D2289** **Class static attributes on WebIR calls + hub completion (G2289).** Ingest **`resolveFunctionAttributes`** matches hoisted **`Class::method`** keys; fixture **`lift-helper-attr-class`**; hub completion **`irHelperLiftingAttr`** gate. **DESIGN §3** unchanged.
- **2026-06-16 — D2290** **Attr hub smoke v2 + ingest simulate metadata (G2290).** Hub attr smoke schema **v2** adds **`attr-class`**; Vitest proves ingested lib attrs surface in **`phpAttributedCalls`**. **DESIGN §3** unchanged.
- **2026-06-16 — D2291** **B5.3 v5 oracle twin verify (G2291).** **`verify-lift-helper-sql-same-twin-oracle.mjs`** captures `/alpha` + `/beta` and gates on identical response bodies, normalized SQL tapes, and semantic helper alias. **DESIGN §3** unchanged.
- **2026-06-16 — D2292** **B5.4 SQL keyword case normalization (G2292).** **`normalizeSqlLiteralForHelperLift`** uppercases a fixed SQL keyword set after whitespace collapse so case-only SQL twins alias under semantic lift; fixture **`lift-helper-sql-case-twin`**. **DESIGN §3** unchanged — distinct literals still split.
- **2026-06-16 — D2293** **Hub oracle twin completion gate (G2293).** **`hub-ir-helper-lifting-oracle-twin-smoke.mjs`** runs sql-same-twin oracle verify in hub completion; **`irHelperLiftingOracleTwinOk`** passes on **`no-php`** skip. **DESIGN §3** unchanged.
- **2026-06-16 — D2294** **Ingest lib-helper inlining (G2294).** Zero-arg lib calls whose collected body is exactly **`return <effect.db.query>`** inline at ingest via **`tryInlineLibHelperCall`** instead of opaque **`data.call`**. **DESIGN §3** unchanged — no emit-time guesswork.
- **2026-06-16 — D2295** **B5.4 v2 oracle twin verify (G2295).** **`verify-lift-helper-sql-case-twin-oracle.mjs`** captures case-only SQL keyword twins and gates on body/SQL parity plus semantic alias. **DESIGN §3** unchanged.
- **2026-06-16 — D2296** **Hub oracle twin smoke v2 (G2296).** Hub completion oracle twin gate runs **sql-same-twin** and **sql-case-twin** verifies (schema **v2**). **DESIGN §3** unchanged.
- **2026-06-16 — D2297** **B5.5 v2 emit HTTP replay (G2297).** **`verify-lift-helper-sql-same-twin-replay.mjs`** ingests with inlined helpers, emits Hono, and **`replayCorpus`** at threshold **1.0**. **DESIGN §3** unchanged — trace-backed verify, no oracle shortcuts.
- **2026-06-16 — D2298** **B5.4 v3 quote-aware SQL normalization (G2298).** **`normalizeSqlLiteralForHelperLift`** uppercases keywords only outside quoted string literals. **DESIGN §3** unchanged.
- **2026-06-16 — D2299** **B5.5 v3 parametric lib helper inlining (G2299).** **`HelperBodyEntry`** + param clone/substitute for direct-return and assign-then-return query helpers. **DESIGN §3** unchanged.
- **2026-06-16 — D2300** **sql-case-twin emit replay (G2300).** Shared **`lift-helper-sql-twin-replay-core.mjs`** + case-twin verify script. **DESIGN §3** unchanged.
- **2026-06-16 — D2301** **Lane A nikic union type hints (G2301).** **`typeHint`** serializes **`UnionType`** / **`NullableType`** as **`A|B|null`**. Glayzzle union syntax remains unsupported on bundled php-parser 3.x. **DESIGN §3** unchanged.
- **2026-06-16 — D2302** **Lane A readonly class properties (G2302).** Canonical **`ClassDecl`** + **`PhpClassProperty`**; glayzzle + nikic emit class metadata alongside hoisted methods. **DESIGN §3** unchanged.
- **2026-06-16 — D2303** **Hub emit replay twin completion gate (G2303).** **`hub-ir-helper-lifting-replay-twin-smoke.mjs`** runs sql-same/case emit replay verify in hub completion; **`irHelperLiftingReplayTwinOk`** passes on **`no-php`** skip. **DESIGN §3** unchanged.
- **2026-06-16 — D2304** **Hub semantic smoke v5 (G2304).** Semantic lift batch adds **`lift-helper-sql-param-inline`** fixture. **DESIGN §3** unchanged.
- **2026-06-16 — D2305** **Parser parity ingest readonly class (G2305).** **`readonly_class.php`** ingests hole-free under parser-parity-probe Vitest. **DESIGN §3** unchanged.
- **2026-06-17 — D2306** **sql-param-inline emit replay (G2306).** **`verify-lift-helper-sql-param-inline-replay.mjs`**; hub replay twin smoke schema **v2** adds param-inline fixture. **DESIGN §3** unchanged.
- **2026-06-17 — D2307** **B5.4 v4 quote-aware SQL edge tests (G2307).** Vitest guards for double-quoted literals and escaped quotes in **`normalizeSqlLiteralForHelperLift`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2308** **B5.5 v5 multi-assign lib helper inlining (G2308).** **`tryExtractInlineQuery`** resolves local→formal chains; **`lift-helper-sql-param-inline`** adds **`sql_param_chain`** + `/gamma` route. **DESIGN §3** unchanged.
- **2026-06-17 — D2309** **Lane A constructor property promotion (G2309).** Glayzzle + nikic emit promoted **`__construct`** params on **`ClassDecl`**; parity page **`constructor_promotion.php`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2310** **Lane A union type parity page (G2310).** **`union_type.php`** full glayzzle ≡ nikic parity + ingest. **DESIGN §3** unchanged.
- **2026-06-17 — D2311** **Lane A intersection type hints (G2311).** Pipe **`UnionType`**, ampersand **`IntersectionType`** / glayzzle **`intersectiontype`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2312** **B5.5 inline negative control (G2312).** Non-chain assign body does not inline at call site. **DESIGN §3** unchanged.
- **2026-06-17 — D2313** **Lane A readonly class modifier (G2313).** **`ClassDecl.readonly`** from class flags. **DESIGN §3** unchanged.
- **2026-06-17 — D2314** **B5.4 v5 backtick SQL identifiers (G2314).** Quote-aware normalization skips backtick-quoted names. **DESIGN §3** unchanged.
- **2026-06-17 — D2315** **B5.4 v6 SQL comment quoting (G2315).** **`--`** / **`/* */`** regions skip keyword uppercasing. **DESIGN §3** unchanged.
- **2026-06-17 — D2316** **B5.5 v6 prelude stmt skip inline (G2316).** Effect-free non-assign preludes before assign→return query bodies. **DESIGN §3** unchanged.
- **2026-06-17 — D2317** **Lane A never return type parity (G2317).** **`never_type.php`** fixture + ingest. **DESIGN §3** unchanged.
- **2026-06-17 — D2318** **Emit lib-helper module (G2318).** Ingest stores **`meta.helperBodies`**; emit writes **`src/lib-helpers.ts`** for referenced helpers that fail emit-time inline (same **`tryExtractInlineQuery`** shape as ingest). **`/delta`** replay twin. **DESIGN §3** unchanged.
- **2026-06-17 — D2319** **Effectful prelude negative control (G2319).** **`sql_param_sideeffect`** + **`/zeta`** — effectful stmt before return stays a call at ingest; prelude guard rejects holes and non-pure stmts. Emit replay twin added in **G2326**. **DESIGN §3** unchanged.
- **2026-06-17 — D2320** **Lane A enum method hoisting (G2320).** Top-level enums hoist instance/static methods as **`Enum::method`** **`FunctionDecl`** (glayzzle + nikic); **`enum_methods.php`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2321** **Emit lib-helpers on Fastify (G2321).** **`emit-fastify`** mirrors Hono **`lib-helpers.ts`** emission + handler imports. **DESIGN §3** unchanged.
- **2026-06-17 — D2322** **Lane A nikic `self::` StaticFetch parity (G2322).** **`classFqnForStaticLike`** empty **`className`** for **`self`/`static`/`parent`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2323** **Lane A mixed type parity (G2323).** **`mixed_type.php`** fixture + ingest. **DESIGN §3** unchanged.
- **2026-06-17 — D2324** **B5.5 prelude inline guard tests (G2324).** Vitest on **`tryExtractInlineQuery`** prelude skip vs effectful block. **DESIGN §3** unchanged.
- **2026-06-17 — D2325** **B5.5 literal-RHS assign inlining (G2325).** **`tryExtractInlineQuery`** maps locals from literal assigns; **`sql_param_literal`** + **`/iota`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2326** **`/zeta` emit replay twin (G2326).** Oracle drive includes **`/zeta`**; lib-helper sideeffect path replays at 100%. **DESIGN §3** unchanged.
- **2026-06-17 — D2327** **Lane A unit enum parity (G2327).** **`unit_enum.php`** — **`scalarType: null`**, case values null. **DESIGN §3** unchanged.
- **2026-06-17 — D2328** **Lane A trait method hoisting (G2328).** Top-level traits hoist methods as **`Trait::method`** **`FunctionDecl`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2329** **Lane A interface method hoisting (G2329).** Top-level interfaces hoist methods as **`Interface::method`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2330** **Lane A int-backed enum parity (G2330).** **`int_enum.php`** — **`scalarType: int`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2331** **Lane A static class property metadata (G2331).** **`PhpClassProperty.static`** on **`ClassDecl`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2332** **Lane A heredoc/nowdoc parity (G2332).** **`heredoc.php`** glayzzle ≡ nikic. **DESIGN §3** unchanged.
- **2026-06-17 — D2334** **B5.5 tryExtractInlineQuery Vitest (G2334).** emit-shared unit tests for literal-RHS accept vs binop reject. **DESIGN §3** unchanged.
- **2026-06-17 — D2335** **Lane A abstract class metadata (G2335).** **`ClassDecl.abstract`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2336** **Lane A final class metadata (G2336).** **`ClassDecl.final`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2337** **Lane A throw expression parity (G2337).** **`throw_expr.php`** arrow **`throw`**. **DESIGN §3** unchanged.

- **2026-06-17 — D2338** **Docs hygiene: multi-repo workspace + ROADMAP archive split.** (1) Multi-repo program ergonomics: tracked **`chrysalis-program.code-workspace`** (multi-root: Chrysalis D1 + WPTP siblings D2–D5) and **`docs/MULTI-REPO-WORKSPACE.md`** (use cases per deliverable). Hygiene settings (`git.openRepositoryInParentFolders: never`, `repositoryScanMaxDepth: 1`, `detectSubmodules: false`, watcher/search excludes) added to **`.vscode/settings.json`** so nested `vendor/`/`flagship/` `.git` trees never surface as phantom repos; **`.gitignore`** ignores local scratch probes (`scripts/_probe-*`, `generated/_probe-*/`, root `*Controller.php`). (2) **`ROADMAP.md`** slimmed to the **active** plan; completed history (G-series, Milestones 0–6A, Road to Chrysalis 2.0) moved verbatim to **`ROADMAP-ARCHIVE.md`**. (3) New goal-indexed **`docs/USE-CASES.md`**; `docs/README.md`, `AGENTS.md` pointers updated. Process/docs only — **DESIGN §3** unchanged.

- **2026-06-17 — D2339** **Lane A `void` return parity (G2339).** **`void_return.php`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2340** **Lane A `callable` hint parity (G2340).** **`callable_hint.php`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2341** **Lane A list-destruct assign parity (G2341).** nikic **`Expr_List`** → **`unhandled expr: list`**; **`list_destruct.php`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2342** **Lane A array-unpack parity (G2342).** glayzzle **`unpack: true`** → **`array unpack`** UnknownExpr; **`spread_array.php`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2343** **Lane A class const + static method parity page (G2343).** **`class_const.php`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2344** **B5.5 v9 cast-formal lib helper inlining (G2344).** **`resolveInlineAssignRhs`** unwraps **`__cast_int`** / **`intval`** on formal assign; **`sql_param_cast.php`** + **`/kappa`**. **DESIGN §3** unchanged.

- **2026-06-17 — D2345** **Lane A ClassDecl.constants metadata (G2345).** **`PhpClassConstant`** on **`ClassDecl`**; glayzzle + nikic mappers; **`class_const.php`** asserts **`TAG`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2346** **Lane A clone expression parity (G2346).** nikic **`Expr_Clone`** → **`unhandled expr: clone`**; **`clone_expr.php`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2347** **Lane A coalesce return parity page (G2347).** **`coalesce_return.php`** (nikic **`Coalesce`** normalized in parity tests). **DESIGN §3** unchanged.
- **2026-06-17 — D2348** **B5.5 v10 coalesce formal ?? literal inlining (G2348).** **`localToCoalesce`** in **`tryExtractInlineQuery`**; **`sql_param_coalesce.php`** + **`/lambda`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2349** **B5.5 param-inline replay corpus expansion (G2349).** Oracle drive + replay verify through **`/iota`**, **`/kappa`**, **`/lambda`** (9 handlers). **DESIGN §3** unchanged.
- **2026-06-17 — D2350** **Glayzzle nullable parameter/return hints (G2350).** Honor **`parameter.nullable`** / function **`nullable`** flag in **`hintFromGlayzzleParam`** / **`returnHintFromGlayzzleFunction`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2351–D2354** **Parser parity probe widening (G2351–G2354).** Fixtures + nikic/glayzzle tests for **`bool_type`**, **`nullable_type`**, **`visibility_methods`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2352** **Nikic parent static call parity (G2352).** **`Expr_StaticCall`** with empty FQN emits **`StaticFetch`** callee expr (not **`::method`** name). **DESIGN §3** unchanged.
- **2026-06-17 — D2353** **Nikic instanceof parity (G2353).** **`Expr_Instanceof`** → canonical **`BinOp`** **`instanceof`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2356–D2358** **Parser parity probe widening (G2356–G2358).** Fixtures + tests for **`static_return`**, **`variadic_param`**, **`variadic_call`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2359–D2361** **B5.5 v11 string-cast lib helper inlining (G2359–G2361).** **`strval`** / **`__cast_string`** formal assign in **`resolveInlineAssignRhs`**; **`/mu`/`/nu`** routes; replay corpus **11 handlers**. **DESIGN §3** unchanged.
- **2026-06-17 — D2362–D2367** **Parser parity probe widening (G2362–G2367).** Fixtures + nikic/glayzzle tests for **`self_call`**, **`static_call`**, **`foreach_simple`**, **`try_catch`** (Unknown stmt detail normalize), **`float_type`**, **`promoted_default`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2368–D2371** **B5.5 v12 bool/float cast lib helper inlining (G2368–G2371).** **`boolval`/`__cast_bool`** and **`floatval`/`__cast_float`** formal assign; **`/xi`/`/omicron`** routes; replay corpus **13 handlers**; ingest parity pages for coalesce/nested/nullsafe. **DESIGN §3** unchanged.
- **2026-06-17 — D2372–D2375** **Parser parity probe widening (G2372–G2375).** Fixtures + tests for **`foreach_key`**, **`arrow_typed`**, **`spaceship`**, **`pow_expr`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2376–D2380** **B5.5 v13 trim lib helper inlining (G2376–G2380).** **`trim()`** formal assign in **`resolveInlineAssignRhs`**; **`/pi`** route; replay corpus **14 handlers**. **DESIGN §3** unchanged.
- **2026-06-17 — D2381–D2384** **Parser parity probe widening (G2381–G2384).** Fixtures + tests for **`null_coalesce_param`**, **`shift_left`**, **`logical_and`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2382** **Nikic `$var::class` parity (G2382).** **`Expr_ClassConstFetch`** with variable receiver maps to glayzzle-compatible **`StaticFetch`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2385–D2388** **B5.5 v14 `(float)` cast lib helper inlining (G2385–G2388).** **`(float)`** formal assign via existing **`floatCast`** path; **`/rho`** route; replay corpus **15 handlers**. **DESIGN §3** unchanged.
- **2026-06-17 — D2389–D2395** **Parser parity probe widening (G2389–G2395).** Fixtures + tests for **`ternary_expr`**, **`compound_assign`**, **`bitwise_or`**, **`bitwise_not`**, **`bitwise_and`**, **`concat_expr`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2392** **Glayzzle nullable class property hints (G2392).** **`hintFromGlayzzleProperty`**; **`nullsafe_call`** parity page. **DESIGN §3** unchanged.
- **2026-06-17 — D2396–D2398** **B5.5 v15–v16 parenthesized cast lib helper inlining (G2396–G2398).** **`(bool)`** / **`(int)`** formal assign via **`boolCast`** / int unwrap; **`/sigma`/`/tau`** routes; replay corpus **17 handlers**; ingest parity includes **`invokable_controller`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2399** **Multi-lane program baseline closure (G2399).** Lanes **A–D** marked **closed** in **`ROADMAP.md`** (Waves **0–6** shipped). **Lane D** adds CI **`migration-debt --max-holes 5`** on **`fixtures/parser-parity-probe`** (pinned ceiling for expected contested-syntax ingest holes: **`call:expr`**, **`expr:UnknownExpr`**). Post-2.0 options **A, C, D, E** closed; **B** baseline closed through **B5.5 v16**. Default queue returns to **`docs/STRATEGIC-PLAN.md`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2400** **B5.1 nested param-read semantic lift (G2400).** Vitest locks **`nested_call_*`** twins (**`strlen((string) $param)`**) under **`--ingest-lift-shared-helpers-semantic`**; **`docs/IR-HELPER-LIFTING.md`** marks **B5.1** done. **DESIGN §3** unchanged.
- **2026-06-17 — D2401** **Parser-parity-probe full-fixture hole budget (G2401).** Vitest pins **5** ingest holes on manifest ingest (**`/nullsafe`**, **`/trait-methods`**, **`/interface-methods`**, **`/abstract-class`**, **`/throw-expr`**) — class bodies included vs per-page **`FunctionDecl`-stripped** tests. **DESIGN §3** unchanged — honest debt, not silent translation.
- **2026-06-17 — D2402** **Hub verify-gaps program closure (G2402).** **`docs/STRATEGIC-PLAN.md`** months **26–30** + post–queue **110** Phase **B** marked **closed**; reinforcement via **`hub:verify-gaps-post110-reinforcement-smoke`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2403** **Phase 0 packaging + post-2.0 table closure (G2403).** **`docs/CAPABILITY-MATRIX.md`** closes Phase **0**; **`ROADMAP.md`** post-2.0 options section + multi-runtime CLI (**D295**) + commercial baseline marked **closed**. **DESIGN §3** unchanged.
- **2026-06-17 — D2404** **V2-M4 IR helper lifting remaining line (G2404).** **`ROADMAP-ARCHIVE.md`** V2-M4 defers non-B5 semantic lift to maintenance; **B** baseline closed in **`docs/IR-HELPER-LIFTING.md`**. **DESIGN §3** unchanged.
- **2026-06-17 — D2405** **Parser-parity-probe zero-hole manifest ingest (G2405).** Parser-bridge adds **`NullsafePropertyFetch`**, **`NullsafeMethodCall`**, **`ThrowExpr`**; glayzzle **`throw`** reads **`node.what`**; ingest lowers to **`__nullsafe_*`**, **`__throw_expr`**, and **`__method_call`** for non-`query` instance method calls. Full **`ingestDirectory`** on **`fixtures/parser-parity-probe`** is hole-free; CI **`migration-debt --max-holes 0`**. **DESIGN §3** unchanged — contested syntax via explicit ops, not silent best-effort.
- **2026-06-17 — D2406** **SQLite3 `->query` receiver tracking (G2406).** Ingest tracks **`new SQLite3(...)`** assignments like **`new PDO`** / **`new mysqli`** for **`->query`** lowering; **`fixtures/mysqli-probe`** adds **`GET /widgets/sqlite3-query`**. CI **`mysqli-probe`** ceiling **`--max-holes 0`**. **`fixtures/db-query-unknown-receiver-probe`** stays the intentional **1-hole** negative (untracked receiver). **DESIGN §3** unchanged.
- **2026-06-17 — D2407** **Queue 111 Phase C resume (G2407–G2411).** User-directed full-stack continuation: **`runPost111CompositeGate`** (flagship HTTP verify + Svelte/Next search + mandatory project-to-CWL); **`hub-cwl-authoring-batch-v111-smoke`**; hub-completion schema **184**; **`docs/CWL-FULLSTACK-QUEUES-111-120.md`**. **DESIGN §3** verify-gated — no hydration or production SQL/session claims.
- **2026-06-17 — D2417** **Queue 112 template/budget depth (G2417–G2421).** **`runSvelteEachPartialLiftGate`** locks RFC-0012 `{#each}`/`{@html}` helper; **`runPost112CompositeGate`** adds form-action probe, hole-budget v2, delivery interpolation; batch **v112**; hub-completion schema **185**. **DESIGN §3** unchanged — form-action stays catalogued hole.
- **2026-06-17 — D2427** **Queue 113 production search + CWL export depth (G2427–G2431).** **`runPost113CompositeGate`** composes RFC-0015 **`runProductionSearchGate`**, Next/Svelte searchParams export, and deep CWL export smokes; batch **v113**; hub-completion schema **186**. **DESIGN §3** unchanged — in-process runtime only.
- **2026-06-17 — D2437** **Queue 114 Fastify search emit + runtime parity (G2437–G2441).** **`runPost114CompositeGate`** composes **`runFastifyEmitSearchGate`**, **`runRuntimeHonoParityGate`**, **`runRuntimeProductionGate`**, and hono **`runEmitPageProbeGate`**; batch **v114**; hub-completion schema **187**. **DESIGN §3** unchanged.
- **2026-06-17 — D2447** **Queue 115 emit verify mega + session/diagnose (G2447–G2451).** **`runPost115CompositeGate`** composes **`runEmitVerifyMegaGate`**, **`runSessionStubGate`**, **`runDiagnoseV2Gate`**, and **`runCwlHtmlInterpolationGate`**; batch **v115**; hub-completion schema **188**. **DESIGN §3** unchanged — session stub only, no production Redis/SQL.
- **2026-06-17 — D2457–D2547** **Queues 116–125 Phase C full-stack graduation (G2457–G2551).** Composite gates **`runPost116CompositeGate`** through **`runPost125CompositeGate`**; batches **v116–v125**; hub-completion schema **189–198**. **DESIGN §3** unchanged.
- **2026-06-17 — D2557–D2747** **Queues 126–145 Phase D hub bridge + graduation (G2557–G2751).** Composite gates **`runPost126CompositeGate`** through **`runPost145CompositeGate`**; batches **v126–v145**; hub-completion schema **199–218**. **DESIGN §3** unchanged.
- **2026-06-17 — D2757** **Queues 146–165 post-composite replay (G2757–G2951).** **`runPost146CompositeGate`** through **`runPost165CompositeGate`** replay **`runPost63CompositeGate`**–**`runPost82CompositeGate`**; batches **v146–v165**; hub-completion schema **219–238**. **DESIGN §3** unchanged.
- **2026-06-17 — D2957** **Queues 166–175 Phase E post-83..102 replay (G2957–G3051).** **`runPost166CompositeGate`** through **`runPost175CompositeGate`**; batches **v166–v175**; hub-completion schema **239–248**. **DESIGN §3** unchanged.
- **2026-06-17 — D3057** **Queues 176–185 Phase F hub-bridge replay (G3057–G3151).** **`runPost176CompositeGate`** through **`runPost185CompositeGate`**; batches **v176–v185**; hub-completion schema **249–258**. **DESIGN §3** unchanged.
- **2026-06-17 — D3157** **Queues 186–195 Phase G Phase C replay (G3157–G3251).** **`runPost186CompositeGate`** through **`runPost195CompositeGate`**; batches **v186–v195**; hub-completion schema **259–268**. **DESIGN §3** unchanged.
- **2026-06-17 — D3957** **Queues 266–285 Phase M post-194..213 replay (G3957–G4151).** **`runPost266CompositeGate`** through **`runPost285CompositeGate`** replay post-194 diagnose through post-213 flagship HTTP express; batches **v266–v285**; hub-completion schema **339–358**. **DESIGN §3** unchanged.
- **2026-06-17 — D4157** **Queues 286–305 Phase N post-214..233 replay (G4157–G4351).** **`runPost286CompositeGate`** through **`runPost305CompositeGate`** replay post-214 dual-origin search export through post-233 post-78 depth; batches **v286–v305**; hub-completion schema **359–378**. **DESIGN §3** unchanged.
- **2026-06-17 — D4357** **Queues 306–325 Phase O post-234..253 replay (G4357–G4551).** **`runPost306CompositeGate`** through **`runPost325CompositeGate`** replay post-234 post-79 depth through post-253 hub ops mega; batches **v306–v325**; hub-completion schema **379–398**. **DESIGN §3** unchanged.
- **2026-06-17 — D4557** **Queues 326–345 Phase P post-254..273 replay (G4557–G4751).** **`runPost326CompositeGate`** through **`runPost345CompositeGate`** replay post-254 Phase C pilot through post-273 post-90 verify-gaps composite; batches **v326–v345**; hub-completion schema **399–418**. **DESIGN §3** unchanged.
- **2026-06-17 — D4757** **Queues 346–365 Phase Q post-274..293 replay (G4757–G4951).** **`runPost346CompositeGate`** through **`runPost365CompositeGate`** replay post-274 session + runtime through post-293 post-67 depth; batches **v346–v365**; hub-completion schema **419–438**. **DESIGN §3** unchanged.
- **2026-06-19 — D6191** **Phase 11 honest gaps implementation (G6280–G6290).** Plan amendment; WordPress customer sample oracle, north-star status JSON gate, commercial license verify, IR helper B6 strlen inline, WPTP D7 harness.
- **2026-06-19 — D6190** **Honest gaps scaffolding program (G6262–G6270).** Per-gap operator playbooks + composite **`runHonestGapsProgramCompleteGate`**; hub-completion schema **10**.
- **2026-06-19 — D6189** **WordPress core-stub fastify verify (G6229)**, **maintenance program complete (G6260–G6261)**. **`runMaintenanceProgramCompleteGate`**; hub-completion schema **9**.
- **2026-06-19 — D6188** **Phase 10 program archive close (G6254–G6257).** Ship log + maintenance default queue; **`runStrategicPlanPhase10ProgramArchiveCloseGate`**; hub-completion schema **8**; phases **0–10 closed**.
- **2026-06-19 — D6187** **emit-fastify `wpCall` parity (G6228)**, **conditional handler imports (`usesWpCall`)**, **WordPress fastify verify replay gate**. Hub-completion schema **7**.
- **2026-06-19 — D6186** **SimValue normalization (G6226)**, **session-resolve-probe fixture**, **wp.call verify replay gate (G6227)**. `@chrysalis/rewrite` **`normalizeSimValue`** maps legacy `kind: "string"` → `"str"`; hub-completion schema **6**.
- **2026-06-19 — D6185** **WordPress wp_* effect lowering (G6225)**, **core stub oracle (G6224)**, **resolveSession strict gate (G6211+)**, **Phase 10 hub-completion close (G6251–G6253)**. Manifest **`wordpressEffectCallees`** → **`effect.wp.call`**; hub-completion schema **5**.
- **2026-06-19 — D6184** **WordPress oracle live capture + verify replay (G6218–G6219)**, **resolveSession bridge (G6210+)**, **emit-hono mysqli factory golden (G6207)**.
- **2026-06-19 — D6183** **Static factory lib-helper emit fix (G6207)** + **session bridge (G6209)**, **WordPress oracle capture (G6217)**, **mysqli oracle pair (G6223)**. `libHelperTsExportName` sanitizes `Class::method` for TS exports; capability matrix **37**.
- **2026-06-19 — D6182** **Phase 10 depth slices (G6213–G6241).** WordPress observe/admin/verify-prepare depth, matrix customer route registry, express oracle pair gate; capability matrix **36**.
- **2026-06-19 — D6181** **WordPress probe fixture + ingest gate (G6212).** `fixtures/wordpress-probe` records `wp_*` as `data.call`; `runWordPressVerticalProbeIngestGate`.
- **2026-06-19 — D6180** **Phase 10 production parity program (G6200–G6253).** Plan amendment unpause Runtime Phase C, WordPress vertical entry, matrix expansion, multi-language evidence path; hub-completion **513**; **`runStrategicPlanPhase10ProductionParityCloseGate`**.
- **2026-06-18 — D6170** **Maintenance-mode governance gates (G6160–G6163).** **`runMaintenanceModeGovernanceGate`**; **`hub:maintenance-mode-governance-smoke`**; locks maintenance-only default queue, policy-paused boundaries, and Runtime Phase C **paused** honesty without opening Phase 10.
- **2026-06-18 — D6160** **Paused backlog consolidation.** **`docs/PAUSED-AND-MAINTENANCE.md`** single index; ship log moved to **`docs/archive/STRATEGIC-PLAN-SHIPPED-LOG.md`**; **`ROADMAP.md`** and **`STRATEGIC-PLAN.md`** §12 trimmed to maintenance-only default queue.
- **2026-06-18 — D6150** **Phase 9 operational hardening close (G6150–G6153).** Hub-completion schema **512** + `phase8ProductProof`; capability matrix **34**; `runStrategicPlanPhase9OperationalCloseGate`; **`hub:strategic-plan-phase9-operational-close-smoke`**. Wires Phase 8 strict proof into completion + CI gates.
- **2026-06-18 — D6110** **Phase 8 product proof program close (G6110–G6113).** **`docs/PRODUCT-PROOF-PHASE-8.md`**; **`resolveStrategicPlanSkips`** + GCE strict path; strict proof **passed on GCE 2026-06-18**.
- **2026-06-17 — D6040** **Phase 7 full-stack CWL program close (G6040–G6043).** Composes scope + flagship pilot + hole budget; **`hub:strategic-plan-phase7-fullstack-close-smoke`**. Closes Phase 7 reinforcement queue.
- **2026-06-17 — D6020** **Phase 7 hole budget reinforcement (G6020–G6023).** **`docs/CWL-FULLSTACK-HOLE-BUDGET-PHASE-7.md`**; **`runStrategicPlanPhase7HoleBudgetGate`**.
- **2026-06-17 — D6010** **Phase 7 full-stack CWL entry (G6010–G6013).** **`docs/CWL-FULLSTACK-PHASE-7.md`**; **`runStrategicPlanPhase7FullstackEntryGate`** composes scope RFC + flagship pilot.
- **2026-06-17 — D6000** **Phase 6 runtime at scale program close (G6000–G6003).** Composes entry + emit verify mega + production graduation; **`hub:strategic-plan-phase6-runtime-scale-close-smoke`**. Closes Phase 6.
- **2026-06-17 — D5990** **Phase 6 production graduation (G5990–G5993).** **`docs/CWL-RUNTIME-PRODUCTION-GRADUATION-PHASE-6.md`**; **`runStrategicPlanPhase6ProductionGraduationGate`** (`CHRYSALIS_STRATEGIC_PLAN_SKIP_EMIT_HTTP=1`).
- **2026-06-17 — D5980** **Phase 6 emit verify mega (G5980–G5983).** **`docs/CWL-RUNTIME-EMIT-VERIFY-PHASE-6.md`**; **`runStrategicPlanPhase6EmitVerifyMegaGate`**.
- **2026-06-17 — D5970** **Phase 6 runtime at scale entry (G5970–G5973).** **`docs/CWL-RUNTIME-SCALE-PHASE-6.md`**; **`runStrategicPlanPhase6RuntimeScaleEntryGate`** builds on Phase 5 close + production graduation.
- **2026-06-17 — D5960** **Phase 5 CWL runtime program close (G5960–G5963).** Composes entry + production search + session stub; **`hub:strategic-plan-phase5-cwl-runtime-close-smoke`**. Closes Phase 5 reinforcement queue.
- **2026-06-17 — D5950** **Phase 5 session stub honesty (G5950–G5953).** **`docs/CWL-RUNTIME-SESSION-STUB-PHASE-5.md`**; **`runStrategicPlanPhase5SessionStubGate`**.
- **2026-06-17 — D5940** **Phase 5 production search probe (G5940–G5943).** **`docs/CWL-RUNTIME-PRODUCTION-SEARCH-PHASE-5.md`**; **`runStrategicPlanPhase5ProductionSearchGate`**.
- **2026-06-17 — D5930** **Phase 5 CWL runtime entry (G5930–G5933).** **`docs/CWL-RUNTIME-PHASE-5.md`**; **`runStrategicPlanPhase5CwlRuntimeEntryGate`** composes Month 1–2 runtime parity + authoring bootstrap (`CHRYSALIS_STRATEGIC_PLAN_SKIP_EMIT_HTTP=1`); **`hub:strategic-plan-phase5-cwl-runtime-entry-smoke`**.
- **2026-06-17 — D5920** **Phase 4 second oracle origin program close (G5920–G5923).** Composes entry + live verify + depth + delivery batches; **`hub:strategic-plan-phase4-second-oracle-origin-close-smoke`**. Closes Phase 4 reinforcement queue.
- **2026-06-17 — D5910** **Phase 4 Express delivery batch (G5910–G5913).** **`docs/EXPRESS-DELIVERY-BATCH-PHASE-4.md`**; **`runStrategicPlanPhase4ExpressDeliveryBatchGate`** + assessment/chimera cutover smokes.
- **2026-06-17 — D5900** **Phase 4 Express depth batch (G5900–G5903).** **`docs/EXPRESS-DEPTH-BATCH-PHASE-4.md`**; **`runStrategicPlanPhase4ExpressDepthBatchGate`** wires site intel + path advice + project-to-CWL for Express.
- **2026-06-17 — D5890** **Phase 4 live oracle verify (G5890–G5893).** **`docs/SECOND-ORACLE-LIVE-VERIFY-PHASE-4.md`**; **`runStrategicPlanPhase4LiveOracleVerifyGate`** + **`runNodeExpressOracleFlagshipGate`** (`CHRYSALIS_STRATEGIC_PLAN_SKIP_ORACLE_VERIFY=1`).
- **2026-06-17 — D5880** **Phase 4 second oracle origin entry (G5880–G5883).** **`docs/SECOND-ORACLE-ORIGIN-PHASE-4.md`**; **`runStrategicPlanPhase4SecondOracleOriginEntryGate`** composes capability matrix row + **`runStrategicPlanMonth23ExpressOracleGate`** (`CHRYSALIS_STRATEGIC_PLAN_SKIP_ORACLE_VERIFY=1` for lift-only); **`hub:strategic-plan-phase4-second-oracle-origin-entry-smoke`**. Default queue → Phase 4 backlog.
- **2026-06-17 — D5870** **Phase 3 CWL interchange program close (G5870–G5873).** Composes entry + RFC + OpenAPI + full-stack alignment; **`hub:strategic-plan-phase3-cwl-interchange-close-smoke`**. Closes Phase 3 reinforcement queue.
- **2026-06-17 — D5860** **Phase 3 full-stack CWL alignment (G5860–G5863).** **`docs/CWL-FULLSTACK-PHASE-3-ALIGNMENT.md`**; **`runStrategicPlanPhase3FullstackAlignmentGate`** wires Month 2 scope RFC without reopening queue 437.
- **2026-06-17 — D5850** **Phase 3 CWL OpenAPI export (G5850–G5853).** **`docs/CWL-OPENAPI-EXPORT-PHASE-3.md`**; **`runStrategicPlanPhase3CwlOpenapiExportGate`** + **`hub:cwl-openapi-smoke`**.
- **2026-06-17 — D5840** **Phase 3 CWL RFC track reinforcement (G5840–G5843).** **`docs/CWL-RFC-PHASE-3-REINFORCEMENT.md`**; **`runStrategicPlanPhase3CwlRfcGate`** + **`runCwlAllRfcRoundtripSmoke`** (`CHRYSALIS_STRATEGIC_PLAN_SKIP_CWL_RFC_ROUNDTRIP=1`).
- **2026-06-17 — D5830** **Phase 3 CWL interchange entry (G5830–G5833).** **`docs/CWL-INTERCHANGE-PHASE-3.md`**; **`runStrategicPlanPhase3CwlInterchangeEntryGate`** composes project-to-CWL + authoring bootstrap (`CHRYSALIS_STRATEGIC_PLAN_SKIP_PROJECT_CWL_ROUNDTRIP=1`); **`hub:strategic-plan-phase3-cwl-interchange-entry-smoke`**. Default queue → Phase 3.
- **2026-06-17 — D5820** **Phase 2 Migration OS program close (G5820–G5823).** Composes entry + license + multi-origin + delivery dashboard gates; **`hub:strategic-plan-phase2-migration-os-close-smoke`**. Closes Phase 2 reinforcement queue.
- **2026-06-17 — D5810** **Phase 2 delivery dashboard + hub-completion (G5810–G5813).** **`hub-delivery-dashboard-smoke`**, **`phase2MigrationOs`** section (**hub-completion schema 511**), **`runStrategicPlanPhase2DeliveryDashboardGate`**.
- **2026-06-17 — D5800** **Phase 2 multi-origin Migration OS batch (G5800–G5803).** **`docs/MIGRATION-OS-MULTI-ORIGIN-BATCH.md`**; **`runStrategicPlanPhase2MigrationOsMultiOriginGate`** + mega batch smoke (`CHRYSALIS_STRATEGIC_PLAN_SKIP_MIGRATION_OS_MEGA_BATCH=1`).
- **2026-06-17 — D5790** **Phase 2 Migration OS license tier alignment (G5790–G5793).** **`docs/MIGRATION-OS-LICENSE-TIER-ALIGNMENT.md`**; **`runStrategicPlanPhase2LicenseTierGate`** composes tier map smoke + commercial doc gate; **`hub:strategic-plan-phase2-license-tier-smoke`**. **DESIGN D289** local gate-off default preserved.
- **2026-06-17 — D5780** **Phase 2 Migration OS entry (G5780–G5783).** **`docs/MIGRATION-OS-PHASE-2.md`**; **`runStrategicPlanPhase2MigrationOsEntryGate`** composes site intelligence + migration contract/programs + evidence dashboard + path advice (+ optional standalone batch, `CHRYSALIS_STRATEGIC_PLAN_SKIP_MIGRATION_OS_STANDALONE_BATCH=1`); **`hub:strategic-plan-phase2-migration-os-entry-smoke`**. Default queue → Phase 2.
- **2026-06-17 — D5770** **Phase 1 Chimera cutover reinforcement (G5770–G5773).** **`docs/CHIMERA-CUTOVER-PHASE-1.md`**; **`runStrategicPlanPhase1ChimeraCutoverGate`** composes cutover runbook smoke + operator snapshot fixture + optional origin batch (`CHRYSALIS_STRATEGIC_PLAN_SKIP_CHIMERA_ORIGIN_BATCH=1`); **`hub:strategic-plan-phase1-chimera-cutover-smoke`**. Closes Phase 1 PHP wedge reinforcement queue.
- **2026-06-17 — D5760** **Phase 1 PHP emit parity oracle slice (G5760–G5763).** **`docs/PHP-EMIT-PARITY-ORACLE-SLICE.md`**; **`runStrategicPlanPhase1PhpEmitParityGate`** composes tiny-blog triple-emit verify + optional flagship **`runFlagshipEmitParity`** (`CHRYSALIS_STRATEGIC_PLAN_SKIP_EMIT_PARITY_FLAGSHIPS=1`); **`hub:strategic-plan-phase1-php-emit-parity-smoke`**. **DESIGN §3** verify-gated emit parity.
- **2026-06-17 — D5750** **Phase 1 Laravel verify gaps ingest depth (G5750–G5753).** **`docs/LARAVEL-VERIFY-GAPS-INGEST-DEPTH.md`**; **`runStrategicPlanPhase1LaravelIngestDepthGate`** composes ingest closure fixture + resolved fixture + optional live gaps (`CHRYSALIS_STRATEGIC_PLAN_SKIP_LARAVEL_LIVE_GAPS=1`); **`hub:strategic-plan-phase1-laravel-ingest-depth-smoke`**. **DESIGN §3** ingest-gated remediation.
- **2026-06-17 — D5740** **STRATEGIC-PLAN Phase 1 PHP wedge entry (G5740–G5743).** Next 90 days program **closed** at **G5733**; default queue → Phase 1. **`docs/PHP-WEDGE-PHASE-1.md`**; **`runStrategicPlanPhase1PhpWedgeGate`** composes Laravel verify gaps + verify playbooks + optional plain-php/symfony flagships (`CHRYSALIS_STRATEGIC_PLAN_SKIP_PHP_WEDGE_FLAGSHIPS=1`); **`hub:strategic-plan-phase1-php-wedge-smoke`**. **DESIGN §3** verify-gated.
- **2026-06-17 — D5730** **STRATEGIC-PLAN Month 3–4 full-stack flagship pilot (G5730–G5733).** **`docs/CWL-FULLSTACK-FLAGSHIP-PILOT.md`**; **`runStrategicPlanMonth34FullstackPilotGate`** composes hole budget + interpolation + **`runCwlFullstackFlagshipSmoke`** (`CHRYSALIS_STRATEGIC_PLAN_SKIP_FLAGSHIP_GOLD=1` for preview/budget without gold verify); **`hub:strategic-plan-month34-fullstack-pilot-smoke`**. **DESIGN §3** explicit hole budget; gold verify authoritative when enabled.
- **2026-06-17 — D5720** **STRATEGIC-PLAN Month 3 project-to-CWL translate path (G5720–G5723).** **`docs/PROJECT-TO-CWL-TRANSLATE-PATH.md`**; **`runStrategicPlanMonth3ProjectToCwlGate`** composes doc + **`runCwlDiffMandatoryGate`** + **`runProjectToCwlOracleGates`** + optional roundtrip (`CHRYSALIS_STRATEGIC_PLAN_SKIP_PROJECT_CWL_ROUNDTRIP=1` for plain-php/symfony only); **`hub:strategic-plan-month3-project-to-cwl-smoke`**. **DESIGN §3** WebIR provenance; semantic diff only.
- **2026-06-17 — D5710** **STRATEGIC-PLAN Month 2–3 Express oracle origin depth (G5710–G5713).** **`docs/NODE-EXPRESS-ORACLE-ORIGIN-PLAN.md`**; **`runStrategicPlanMonth23ExpressOracleGate`** composes doc + **`runExpressDepthGate`** + optional **`runNodeExpressOracleFlagshipGate`** (`CHRYSALIS_STRATEGIC_PLAN_SKIP_ORACLE_VERIFY=1` for lift-only); **`hub:strategic-plan-month23-express-oracle-smoke`**. **DESIGN §3** verify-gated oracle product tier.
- **2026-06-17 — D5700** **STRATEGIC-PLAN Month 2 full-stack CWL scope RFC (G5700–G5703).** **`docs/CWL-FULLSTACK-SCOPE-RFC.md`**; **`runStrategicPlanMonth2FullstackScopeGate`** composes scope doc + **`runFullstackCwlScopeRfcGate`** + catalog + hole budget + diagnose v3; **`hub:strategic-plan-month2-fullstack-scope-smoke`**. **DESIGN §3** holes explicit; no hydration/component claims.
- **2026-06-17 — D5690** **STRATEGIC-PLAN Month 1–2 runtime-cwl parity reinforcement (G5690–G5693).** **`runStrategicPlanMonth12RuntimeParityGate`** composes parity plan doc + **`runRuntimeCwlParityGate`** + optional **`runFastifyEmitSearchGate`** (`CHRYSALIS_STRATEGIC_PLAN_SKIP_EMIT_HTTP=1` for in-process-only); **`hub:strategic-plan-month12-runtime-parity-smoke`**. **DESIGN §3** verify-gated; no production SQL/session claims.
- **2026-06-23 — D6258** **Queues 438–457 post-437 maintenance ladder (G5677–G5876).** After **IR Helper Program v1 close** (**G7200**), **`runPost438CompositeGate`** chains **`runPost437CompositeGate`** + **`runIrHelperProgramCloseGate`**; **`runPost439CompositeGate`** through **`runPost457CompositeGate`** replay prior composite depth; batches **v438–v457**; hub-completion schema stays **513** with capstone section **`fullstackAuthoringBatchV457`**. Does not reopen the Phase 7 full-stack program. **DESIGN §3** unchanged.

- **2026-06-16 — D6259** **WISP POC decoupled from default build.** User amendment: WISP Module_Manager showcase is **optional POC** — not default CI, not the default agent build queue. **Removed** WISP Phase 12–14 smokes from **`.github/workflows/ci.yml`**; added **`.github/workflows/wisp-poc-regression.yml`** (weekly + manual). Default queue: **G7200** + **G7150** + **G6731** (optional). Governance **`runCwlOnlyMaintenanceGovernanceGate`** (**G7210**) when **`isWispPocDecoupledFromBuild()`**. WISP scripts/smokes remain for operator demo refresh. **`docs/STRATEGIC-PLAN.md` §12**, **`docs/PAUSED-AND-MAINTENANCE.md`**, **`docs/WISP-CWL-FULLSTACK-PROGRAM.md`**, **`ROADMAP.md`**.

- **2026-06-16 — D6260** **CWL universal web language program (Phases 19–23, G7300–G7390).** User amendment after **G7150**: CWL replaces **web application language as verified source** — not infra/vendor layers. **Phase 19** UI v1 (RFC-0019, islands, hydration, verify) → **Phase 20** Data v2 → **Phase 21** Effects middleware → **Phase 22** Universal ingest (pilot ≥99%) → **Phase 23** Greenfield cutover; program close **G7390**. **WISP POC** stays optional (**D6259**). Entry **`hub:cwl-universal-language-program-entry-smoke`** (**G7300**); governance **`runCwlUniversalLanguageActiveGovernanceGate`**. **`docs/CWL-UNIVERSAL-LANGUAGE-PROGRAM.md`**, **`docs/STRATEGIC-PLAN.md` §7 + §12**, **`ROADMAP.md`**, **`docs/PAUSED-AND-MAINTENANCE.md`**, **`docs/CWL-SURFACE-TAXONOMY.md`**.
- **2026-06-25 — D6269** **WISP full site CWL program closed (G7790).** Phase **27** closed: native API (**G7702**), UI depth (**G7703**), session auth (**G7704**), integrations charter (**G7705**), runtime-cwl cutover (**G7706**); **zero** app-logic UI/API holes on WISP fixture; chimera **`cwl-native-api`** + **`svelteSidecar: false`**. Default maintenance **G7790** composite. **`docs/WISP-FULL-SITE-CWL-PROGRAM.md`**, apply scripts **`wisp:apply-phase27b-native-api`** through **`wisp:apply-phase27f-cutover`**.
- **2026-06-27 — D6272** **WISP production completion program closed (G7990).** Phase **29** closed: full API oracle corpus (**109** handlers, replay **1.0**), CWL static export (**87** pages), operator deploy contract; **`wisp:api-trace-capture-all`**, **`wisp:cwl-static-export`**. Default maintenance **G7990** composite (**G7991** governance). **`docs/WISP-PRODUCTION-COMPLETION-PROGRAM.md`**, **`wisp-api-goldens/`**, **`cwl-static-export/`**.
- **2026-06-27 — D6273** **Firebase CWL static export staging (G7910).** When pipeline **`firebase.apiMode`** is **`cwl-static-export`**, **`buildWispClient(firebase)`** stages **`cwl-static-export/`** into **`Module_Manager/build/client`** instead of Svelte **`npm run build`**; gate **`hub:wisp-cwl-firebase-static-export-stage-smoke`**.
- **2026-06-16 — D6274** **WISP CWL UI parity program (Phase 31, G8100).** After **G7990**, automated UI parity for pure CWL deploy: **`wisp:apply-phase31-bulk-lift`**, Phase **30/30b** anchor routes, forbidden-stub crawler, chimera HTTP probes; **`splitCwlHtmlTemplate`** skips load/path/query ids inside hyphenated CSS tokens (e.g. **`module-header`**); close **`hub:wisp-cwl-ui-parity-close-smoke`**. **`docs/WISP-CWL-UI-PARITY-PROGRAM.md`**, **`docs/STRATEGIC-PLAN.md` §12**, **`ROADMAP.md`**, **`docs/PAUSED-AND-MAINTENANCE.md`**.
- **2026-06-16 — D6275** **Open web-LLM framework (Phase 32, G8290).** Verify-gated agent trajectories, Web Verify Benchmark (WVB), MCP tool server, **`@chrysalis/web-llm`** package — no GPU/training in-tree; sponsor-funded fine-tune deferred. **`docs/OPEN-WEB-LLM-PROGRAM.md`**, **`docs/WEB-VERIFY-BENCHMARK.md`**, close **`hub:open-web-llm-close-smoke`**.
- **2026-06-16 — D6279** **WISP complete demo surfaces (G8330, Phase 32).** Replace empty `wisp-app-surface` shells with interactive **`wisp-demo-content`** module HTML (`wisp-cwl-module-demo-lib.mjs`, **`wisp:apply-phase32-complete-demo`**), client hydration in **`wisp-cwl-client.js`**, full-route probe gate **`hub:wisp-complete-demo-close-smoke`** (87/87 UI routes).
- **2026-06-16 — D6280** **Site → CWL → LLM program (Phase 33, G8400).** Product pipeline: site intelligence → ingest → CWL export → verify-gated trajectory logging → training shard export; **`chrysalis port-site`**, **`scripts/site-port-to-cwl.mjs`**, **`@chrysalis/web-llm`** **`site-port`** helpers; close **`hub:site-port-close-smoke`** on **`fixtures/tiny-blog`**. **`docs/SITE-TO-CWL-LLM-PROGRAM.md`**; no in-repo GPU fine-tune.
- **2026-06-16 — D6281** **Verified Migration Federation (Phase 34 entry, G8420).** World expansion via verify-gated public tier (open fixtures, trajectory shards, WVB league) — no raw source upload; charter **`chrysalis.site-port-federation.v1`**, verify matrix **G8410**, federation entry **`hub:site-port-federation-entry-smoke`**. **`docs/SITE-PORT-FEDERATION-PROGRAM.md`**.
- **2026-06-16 — D6282** **Verified Migration Federation closed (Phase 34, G8460).** File-based registry **`reports/federation/`**, **`chrysalis federation`** (`submit-shard`, `merge-corpus`, `publish-league`), **`@chrysalis/web-llm`** **`federation`** validators; gates **G8430–G8460**. Hosted Hub ingest deferred; local loop complete.
- **2026-06-16 — D6283** **VMF POC closed (Phase 34 POC, G8470).** Open Legacy Index **`open-legacy-index.v1.json`** (3 fixtures), **`mergeFederationWvb`**, static operator hub **`reports/federation/poc/`**, one-command **`federation:demo`** / **`chrysalis federation demo`**; verify matrix **G8410** driven by index; gate **G8470**.
- **2026-06-16 — D6284** **Migration Evidence POC (Phase 35, G8480).** Unified operator hub **`reports/migration-evidence/poc/`** composing Site-Port + VMF + web-LLM agent demos; **`migration-evidence:demo`**, **`chrysalis evidence demo`**, gate **`hub:migration-evidence-poc-close-smoke`**. **`docs/MIGRATION-EVIDENCE-POC-PROGRAM.md`**.
- **2026-06-16 — D6285** **Open Legacy Index multi-origin (Phase 36, G8490).** Fourth index entry **`expressJs`** (`fixtures/hub-flagship-express`, **`javascript`** origin, **`chrysalis.routes.json`**); verify matrix + registry gates for **4** fixtures / **PHP + JS** origins; **`hub:site-port-open-legacy-index-close-smoke`**.
- **2026-06-16 — D6286** **Open Legacy expansion (Phase 37, G8500/G8510/G8520).** Fifth index entry **`laravelMin`** (`flagship/laravel-min`); index-driven registry/close gates (schema v2); nightly verify matrix **`hub:site-port-open-legacy-nightly-smoke`** + **`.github/workflows/open-legacy-index-nightly.yml`**; program close **`hub:site-port-open-legacy-close-smoke`**.
- **2026-06-16 — D6287** **VMF local hub API (Phase 38, G8530/G8540).** **`federation-hub-server.mjs`** REST over file registry (`GET/POST /api/vmf/*`); remote payload submit (**`submitFederationPayload`**, no source upload), **`POST /api/vmf/publish-all`**, **`GET /api/vmf/bundle`**, **`federation:export-bundle`**, submission dedupe **`pickBestSubmissionsByContributorFixture`**; **`federation:serve`**, gate **`hub:site-port-federation-hub-close-smoke`** (**G8540**). Hosted cloud deferred.
- **2026-06-16 — D6288** **Migration OS program close (G8550).** Composite gate **`hub:migration-os-close-smoke`** — evidence hub (**G8480**) + open legacy (**G8520**) + VMF hub (**G8540**); sixth index entry **`cwlFullstack`**; nightly publish loop v2 merges corpus/WVB/league/bundle.
- **2026-06-16 — D6289** **Intelligence Shorthand (IS tiers).** Formal tier ladder **IS-T0…T5** for storing domain intelligence outside full weights; artifact **`chrysalis.web-llm.intelligence-shorthand`**, **`buildSkillCapsuleFromShard`**, **`web-llm:export-shorthand`**. Research: weight compression ~4–10× max (3-bit PTP); domain verify-gated externalization **10³–10⁹×**. **`docs/INTELLIGENCE-SHORTHAND.md`**.
- **2026-06-16 — D6290** **Intelligence Shorthand close (G8560).** CPU-only export of **IS-T3/T4/T5** from Open Legacy port reports + federation shards; hub **`reports/web-llm/shorthand/poc/`**; gate **`hub:intelligence-shorthand-close-smoke`**; GCE phase **`intelligence-shorthand-close`**. No in-repo GPU.
- **2026-06-16 — D6291** **IS hub API + Migration OS v2 (G8550).** VMF **`GET /api/vmf/shorthand`**, **`POST /api/vmf/export-shorthand`**; **`chrysalis federation|evidence export-shorthand`**; **G8550** schema v2 composes **G8560**; hub API smoke v3.
- **2026-06-16 — D6292** **Open Legacy 7th wedge (G8570).** Index entry **`wordpressProbe`** (`fixtures/wordpress-probe`, 2 routes, WordPress vertical); gate **`hub:site-port-open-legacy-wedge-smoke`**; composed in **G8520** schema v2 (index-driven count).
- **2026-06-16 — D6293** **WISP + web-LLM unified POC v2 (G8310).** **G8310** schema v2 composes **G8560** IS close (`skipPort`) and optional **G8320** live anchors when **`CHRYSALIS_WISP_POC_LIVE=1`** or **`CHRYSALIS_G8310_LIVE=1`**.
- **2026-06-16 — D6294** **Documentation focus — Migration OS hub.** **`docs/MIGRATION-OS.md`** is the operator entry; **`docs/README.md`** restructured; **`docs/archive/INDEX.md`** catalogs closed phases/programs; archive banners on legacy phase docs; **`AGENTS.md`** default queue → **G8550** stack.
- **2026-07-02 — D6295** **IS runtime protocol (Phase 40, G8600).** Corpus-aware **`resolveShorthandForTask`**, **`promoteShorthandsByDomain`**, MCP **`web_llm_resolve_shorthand`**, trajectory **`isTier`/`skipLlm`** fields, close **`hub:is-runtime-close-smoke`**; composed in **G8550** v3. **`docs/INTELLIGENCE-SHORTHAND-PROTOCOL.md`**. CPU only — no GPU.
- **2026-07-02 — D6296** **IS-T2 LoRA prep + GCE GPU lab (Phase 40b, G8610).** **`buildLoraTrainManifest`** / **`validateLoraTrainManifest`**, CPU **`web-llm:export-lora-manifest`**, **`hub:is-t2-lora-prep-smoke`**, operator **`gpu-lab:*`** scripts for on/off spot T4 (**`chrysalis-gpu-lab`**, separate from CPU **`chrysalis-test-vm`**). **Session cap:** **`CHRYSALIS_GPU_LAB_MAX_MINUTES`** (default **120**) + background VM auto-stop; train wrapped in **`timeout`** when **`CHRYSALIS_GPU_LAB_DRY_RUN=0`**. No in-repo QLoRA train loop — manifest + dry-run gate only. **`docs/GCE-GPU-LAB.md`**.
- **2026-07-03 — D6297** **Phase 40 program close (G8600 + G8610).** Close gates green locally and on **`chrysalis-test-vm`** (**`test:gce:migration-os`**, phase **`is-t2-lora-prep-close`**); GPU lab operator dry-run **STATUS_OK** via **`gpu-lab:gce`**. Default build queue → **Phase 32** (**G8290** / **G8240**). Phase 40 regression remains in **G8550** v3 composite.
- **2026-07-03 — D6298** **Open web-LLM Horizons A+B close (G8290 + G8240).** **`hub:open-web-llm-horizon-b-smoke`** and **`hub:open-web-llm-close-smoke`** green locally; composed in **`test:gce:migration-os`** (**`open-web-llm-close`** phase). Default build queue → **Phase 32c** (**G8310** / optional **G8320** live).
- **2026-07-03 — D6299** **Phase 32 program close (G8310 + G8320).** **`hub:wisp-web-llm-poc-close-smoke`** green locally; **`test:gce:migration-os:wisp-live`** on **`chrysalis-test-vm`** (**G8320** 7/7 live probes). Default build queue → **Migration OS maintenance** + subordinate **CWL v1.1** (**G6731**).
- **2026-07-03 — D6303** **Phase 43 LLM convert full (G8900).** User-amended: extend closed Phase 42 with **LLM/stub hole enrichment**, **verify-gated operator apply** (`hub_convert_apply_holes`), MCP **`hub_convert_llm_enrich`** / **`hub_convert_verify_gate`**. **Refused:** auto-apply without verify+confirm; bypass WebIR/ingest/emit. Program [`docs/LLM-CONVERT-FULL-PROGRAM.md`](./docs/LLM-CONVERT-FULL-PROGRAM.md); subordinate to **G8550**; close **G8940**.
- **2026-07-03 — D6304** **Phase 43 close (G8940) + repair bridge (G8913).** Hub convert apply invokes **`@chrysalis/repair`** when proposal patch is **hole-closure** and traces + **`CHRYSALIS_HUB_VERIFY_BASE_URL`** exist; scaffold patches skip repair. Close smoke **`hub:llm-convert-full-close-smoke`** composes build slice + repair bridge + Phase 42 regression.
- **2026-07-03 — D6302** **Phase 42 LLM-assisted convert (G8800).** User-amended locked path: integrate LLM into convert product only as **verify-gated propose** — IS tier routing (**G8600**), hole/scaffold proposals logged to trajectory, operator MCP tools without auto-apply. **Refused:** string transpile without WebIR, LLM repair that skips verify, promoting matrix tier without trace oracle. Program [`docs/LLM-ASSISTED-CONVERT-PROGRAM.md`](./docs/LLM-ASSISTED-CONVERT-PROGRAM.md); subordinate to **G8550** maintenance; close **G8830**.
- **2026-07-03 — D6301** **Phase 41 program close (G8790).** All **72/72** core hub language pairs at **oracle product** tier (trace-replay on gold fixtures); close **`hub:full-matrix-oracle-close-smoke`** green locally. Default build queue → **Migration OS maintenance** (**G8550** / **G8570**) + subordinate **G6731**. Phase 41 regression composed in maintenance governance (**G8791**).
- **2026-07-03 — D6300** **Phase 41 Full matrix oracle product (G8700).** User-amended locked path: promote **72** core hub language pairs (9×9) from open/silver/structural gold to **oracle product** tier (native ingest, semantic lowering, native emit, CWL executable effects, trace verify). Program [`docs/FULL-MATRIX-ORACLE-PROGRAM.md`](./docs/FULL-MATRIX-ORACLE-PROGRAM.md); charter **`fixtures/hub-full-matrix-oracle/chrysalis.matrix-oracle-composer.v1.json`**; entry **`hub:full-matrix-oracle-program-entry-smoke`**. Build order: **41a** JS/TS semantic → **41b** Python → **41c** JVM/Go/C#/Ruby → **41d** native emit → **41e** CWL effects → **41f** close (**G8790**). Maintenance **G8550**/**G7690** subordinate after each track.
- **2026-06-16 — D6277** **Open web-LLM agent POC (G8300/G8310).** Scripted verify-gated agent scenarios (`@chrysalis/web-llm` **`agent-poc`**, **`poc-checks`**), shared tool runner **`web-llm-tool-runner.mjs`**, static POC hub, smokes **`hub:open-web-llm-poc-smoke`** and composite **`hub:wisp-web-llm-poc-close-smoke`** (G8100 + G8290 + G8300). **`docs/OPEN-WEB-LLM-POC.md`**, fixture **`chrysalis.web-llm-poc-scenarios.v1.json`**.
- **2026-06-16 — D6276** **Open web-LLM Horizon B (G8240).** Auto gate trajectory logging (**`CHRYSALIS_WEB_LLM_TRAJECTORY`**), training shard export, static WVB leaderboard, **`docs/WEB-LLM-TRAINING-RECIPE.md`**, smoke **`hub:open-web-llm-horizon-b-smoke`** (composed into **G8290**).
- **2026-06-27 — D6271** **WISP production POC program closed (G7890).** Phase **28** closed: operator HTTP contract (**G7801**), post-G7790 scenario/pipeline (**G7802**/**G7803**), integration client UI (**G7804**), oracle trace pilot replay green (**G7805**, `GET /api/tenants`); apply chain **`wisp:apply-post-g7790-chain`** re-applies pilot handler from golden. Default maintenance **G7890** composite (**G7891** governance). **`docs/WISP-PRODUCTION-POC-PROGRAM.md`**, trace corpus **`wisp-api-pilot-traces/`**, scripts **`wisp:api-trace-capture`** / **`wisp:api-trace-replay-verify`**.
- **2026-06-26 — D6270** **WISP production POC program (Phase 28, G7800–G7890).** Post-**G7790** production POC move: operator HTTP contract (**G7801**), post-G7790 scenario/pipeline (**G7802**/**G7803**), integration client UI depth (**G7804**), honest oracle trace pilot manifest (**G7805**); apply chain **`wisp:apply-post-g7790-chain`**. **`docs/WISP-PRODUCTION-POC-PROGRAM.md`**, chimera session preview injection, demo manifest native API probes.
- **2026-06-24 — D6268** **WISP full site CWL replacement (Phase 27, G7700–G7790).** User amendment after **G7690**: CWL must **replace any website** web application tier — WISP Module_Manager is first proof (native API handlers, UI depth, auth, cutover; no permanent `hub-cwl:upstream-proxy` / Svelte fallback on chartered routes). Phases **27a–27f**; close **G7790** composes Phase 27 + **G7690** regression. **`docs/WISP-FULL-SITE-CWL-PROGRAM.md`**, charter **`chrysalis.wisp-full-site.v1.json`**; supersedes WISP POC deferral bar for app logic. Default build queue reactivated for Phase 27 (**D6259** WISP optional regression preserved for pre-27 operator path).
- **2026-06-24 — D6267** **Universal translator N×N through CWL (Phase 26, G7600–G7690).** User amendment after **G7590**: universal translator means **all chartered web languages convert to all others through CWL** as primary hub — composer-gated cross-edges (not brute 16×16), mandatory inbound roundtrip, CWL outbound to native + hono/fastify. Phases **26a–26d**; close **G7690** composes Phase 26 + **G7590** regression. **`docs/CWL-UNIVERSAL-TRANSLATOR-PROGRAM.md`**, charter **`chrysalis.translator-composer.v1.json`**; smokes **`hub:cwl-translator-cross-edge-smoke`**, **`hub:cwl-cwl-outbound-emit-smoke`**.
- **2026-06-24 — D6266** **Fully complete web language program close (G7590).** Phase **25** closed: CWL-authored **100%** native on chartered modules; universal translator at **CWL parity** (oracle hole-free, web-origin **100%** native aggregate on hub matrix, gold + HTTP verify). Default queue **G7590** regression. Governance **`runCwlFullWebLanguageClosedGovernanceGate`** (**G7591**).
- **2026-06-24 — D6265** **Universal translator parity (Phase 25c–25d, G7503–G7504).** Project-to-CWL translate path must meet **CWL-equivalent** evidence: oracle hole-free export, 24/24 origin export, web-origin ≥99% native aggregate, gold + HTTP verify, semantic diff mandatory. **`docs/CWL-UNIVERSAL-TRANSLATOR-PARITY.md`**; smokes **`hub:cwl-translator-parity-smoke`**, **`hub:cwl-translator-verify-smoke`**.
- **2026-06-24 — D6264** **Fully complete web language program (Phase 25, G7500–G7590).** User amendment after **G7490**: north star is **fully complete web language** — 100% native CWL-authored modules, no reserved surfaces on chartered tiers, translator at CWL parity. Phases **25a–25d**; program close **G7590** composes Phase 25 + **G7490** regression. Entry **`hub:cwl-full-web-language-program-entry-smoke`** (**G7500**); governance **`runCwlFullWebLanguageActiveGovernanceGate`** / **`runCwlFullWebLanguageClosedGovernanceGate`** (**G7591**). **`docs/CWL-FULL-WEB-LANGUAGE-PROGRAM.md`**, **`docs/STRATEGIC-PLAN.md` §7 + §12**, **`ROADMAP.md`**, **`docs/CWL-SURFACE-TAXONOMY.md`**.
- **2026-06-24 — D6263** **CWL customer pilot program closed (G7490).** Phase **24** shipped: signed charter (`fixtures/hub-pilot-customer-slice`), PHP plain + Symfony hole-free ingest, flagship verify replay + HTTP cutover evidence. Smokes **`hub:cwl-phase24a-close-smoke`** … **`hub:cwl-customer-pilot-close-smoke`**; CI default queue → **G7490** regression; governance **`runCwlCustomerPilotClosedGovernanceGate`** (**G7491**). **`phase24a`** close uses charter gate only (entry **G7400** archived).
- **2026-06-24 — D6262** **CWL customer pilot at scale (Phase 24, G7400–G7490).** User amendment after **G7390**: named customer pilot slice with signed charter (`fixtures/hub-pilot-customer-slice/chrysalis.pilot-charter.v1.json`), PHP ingest origins (plain + Symfony), flagship verify replay, HTTP cutover evidence. Phases **24a–24d**; program close **G7490** composes pilot phases + **G7390** regression. Entry **`hub:cwl-customer-pilot-program-entry-smoke`** (**G7400**); governance **`runCwlCustomerPilotActiveGovernanceGate`** / **`runCwlCustomerPilotClosedGovernanceGate`** (**G7491**). **`docs/CWL-CUSTOMER-PILOT-PROGRAM.md`**, **`docs/STRATEGIC-PLAN.md` §7 + §12**, **`ROADMAP.md`**, **`docs/PAUSED-AND-MAINTENANCE.md`**.
- **2026-06-24 — D6261** **CWL universal web language program closed (G7390).** Phases **19–23** shipped: RFC-0019 UI v1 (`client ui`, islands, events), RFC-0013 v2 (load redirect/error, load+UI, cookie in load), RFC-0020 effects middleware (`auth.require`, `cors.allow`, `csrf.verify`), universal ingest pilot (100% native on chartered fixtures + svelte-literal-cwl structural gold), greenfield CWL-only template. Smokes **`hub:cwl-phase19-close-smoke`** … **`hub:cwl-universal-language-close-smoke`**; CI default queue → **G7390** regression; governance **`runCwlUniversalLanguageClosedGovernanceGate`** (**G7391**). **`hub-webir-routes.mjs`** projects `data.ui.tree`, `effect.redirect`.
- **2026-06-17 — D5680** **STRATEGIC-PLAN Month 1 authoring bootstrap hardening (G5680–G5683).** **`runCwlAuthoringBootstrapHardeningGate`** composes templates + preview/dev loop + **`runDiagnoseV3Gate`**; **`cwl-diagnose`** schema **v3** (layout imports, surface mismatch, param-unused); **`docs/RUNTIME-CWL-PARITY-PLAN.md`** + **`runRuntimeCwlParityPlanGate`**; **`hub:strategic-plan-month1-hardening-smoke`**. No hub-completion schema bump — post-437 ladder maintenance only. **DESIGN §3** verify-gated; no production SQL/session claims.
- **2026-06-17 — D4957** **Queues 366–437 Phase R–U post-294..365 replay (G4957–G5671) — full-stack ladder complete.** **`runPost366CompositeGate`** through **`runPost437CompositeGate`**; batches **v366–v437**; hub-completion schema **439–510**. **DESIGN §3** unchanged.
- **2026-06-17 — D3757** **Queues 246–265 Phase L post-174..193 replay (G3757–G3951).** **`runPost246CompositeGate`** through **`runPost265CompositeGate`** replay post-174 runtime production through post-193 CWL preview; batches **v246–v265**; hub-completion schema **319–338**. **DESIGN §3** unchanged.
- **2026-06-17 — D3557** **Queues 226–245 Phase K post-154..173 replay (G3557–G3751).** **`runPost226CompositeGate`** through **`runPost245CompositeGate`** replay post-154 Post-71 depth through post-173 Post-100 session stub; batches **v226–v245**; hub-completion schema **299–318**. **DESIGN §3** unchanged.
- **2026-06-17 — D3457** **Queues 216–225 Phase J post-144..153 replay (G3457–G3551).** **`runPost216CompositeGate`** through **`runPost225CompositeGate`** replay post-144 Month-23 lock through post-153 Post-70 depth; batches **v216–v225**; hub-completion schema **289–298**. **DESIGN §3** unchanged.
- **2026-06-17 — D3357** **Queues 206–215 Phase I post-134..143 replay (G3357–G3451).** **`runPost206CompositeGate`** through **`runPost215CompositeGate`** replay post-134 HTTP/gaps depth through post-143 deep export; batches **v206–v215**; hub-completion schema **279–288**. **DESIGN §3** unchanged.
- **2026-06-17 — D3257** **Queues 196–205 Phase H post-124..133 replay (G3257–G3351).** **`runPost196CompositeGate`** through **`runPost205CompositeGate`** replay post-124 graduation through post-133 authoring; batches **v196–v205**; hub-completion schema **269–278**. **DESIGN §3** unchanged.

- **2026-06-02 — D1859** **CWL Month 2–3 queues 71–90 (G1859–G2058).** Runtime parity depth, flagship pilot, framework deep exports, translate/contract roundtrip, **`runMonth23GraduationLockGate`**; batches **v71–v90**; hub-completion **schema 163**; gate-only **`skipPriorChain`**. GCE runs **v60 + v90** skip-prior smokes. **DESIGN §3:** verify-gated; holes-first.

- **2026-06-02 — D1789** **CWL authoring bootstrap queues 64–70 (G1789–G1858).** Gates **`runCwlFormatterLintGate`**, **`runProjectToCwlMandatoryGate`**, **`runFullstackCwlScopeRfcGate`**, **`runNodeExpressOracleFlagshipGate`**, **`runPost60AuthoringCompositeGate`**, **`runAuthoringEmitVerifyMegaGate`**, **`runAuthoringGraduationLockGate`**; batches **v64–v70**; hub-completion **schema 143**. **`skipPriorChain`** on v64–v69 runs **gate-only** (not deep post-composites) for fast CI; v70 runs graduation lock. Svelte origin roundtrip uses **`fixtures/hub-gold-svelte-kit`**. GCE runs **v60 + v70** skip-prior smokes. **DESIGN §3:** verify-gated; no production SQL/session claims.

- **2026-06-02 — D1779** **runtime-cwl parity gate v1 (G1779).** **`runRuntimeCwlParityGate`** composes **`runCwlRuntimeParitySmoke`** (gold fullstack/layout), **`runRuntimeHonoParityGate`**, **`runRuntimeProductionGate`**, and flagship **`runQueryHtmlGate`** / **`runLoadArrayGate`**. **`hub-cwl-authoring-batch-v63-smoke.mjs`** chains v62 + post-62 graduation; hub-completion **schema 136**. **DESIGN §3:** in-process runtime-cwl only — no production SQL/session claims.

- **2026-06-02 — D1769** **CWL preview/dev loop gate (G1769).** **`runCwlPreviewDevLoopGate`** exercises **`writeCwlPreviewArtifacts`** (bootstrap + **`@chrysalis/runtime-cwl`** probe), **`cwl-preview.json`** artifact, **`diagnoseCwlFile`** on bootstrapped **`.chrysalis/migration.cwl`**, and flagship **`buildCwlPreviewReport`**. **`hub-cwl-authoring-batch-v62-smoke.mjs`** chains v61 + post-61 graduation; hub-completion **schema 135**. **DESIGN §3:** in-process preview only — no emit/oracle shortcuts.

- **2026-06-02 — D1759** **CWL authoring templates gate (G1759).** **`runCwlAuthoringTemplatesGate`** in **`hub-cwl-fullstack-gates.mjs`** bootstraps a temp **`.chrysalis/migration.cwl`** via **`buildCwlPreviewReport`**, asserts **`layouts/shell.cwl`** is written beside the CWL path (not project root), starter template parity (**`/search`**, **`load {`**, shell import), and reference layout under **`fixtures/hub-flagship-cwl-fullstack/layouts/shell.cwl`**. **`hub-cwl-authoring-batch-v61-smoke.mjs`** chains v60 + post-60 graduation; hub-completion **schema 134**. **DESIGN §3:** preview/bootstrap only — emit + trace replay unchanged.

- **2026-06-19 — D6192** **WISP CWL flagship Phase 12 (G6300–G6310).** **AgenticOp-io/WISP-Management** `Module_Manager/` is the full-stack CWL reference app for the **UI layer**: chimera gateway on front GCE, **`/api/*` proxy to existing backend** (`acs-hss-server` / GenieACS stack **unchanged**). Firebase + ArcGIS scenario catalog; **`hub-cwl:upstream-proxy`**. Backend → CWL conversion **deferred**. **`docs/WISP-CWL-FULLSTACK-PROGRAM.md`**, **`fixtures/hub-wisp-management/`**. **DESIGN §3:** holes for Firebase/ArcGIS/charts; no silent UI lowering.

- **2026-06-19 — D6193** **CWL surface taxonomy (G6340).** User-amended strategy: CWL is the **consolidated web language** — not API-only. Named surfaces: **CWL API** (`@route`), **CWL Pages** (`@page`), **CWL Data** (`load`), **CWL UI** (component hole / future RFC), **CWL Effects** (`use` / `effects`). Chimera is a migration runtime shell, not a surface. **`docs/CWL-SURFACE-TAXONOMY.md`**; **`docs/STRATEGIC-PLAN.md`** §7 Phase 13 queue; WISP module waves map to surfaces. Replacement ladder: API contract → Pages → Data → UI → cutover. **DESIGN §3** unchanged (holes-first, verify truth).

- **2026-06-19 — D6194** **Close before build (G6310 closed).** User principle: **close a phase before opening the next build queue**. Phase 12 WISP **Phase 0 closed** (**G6310** green): 87 UI routes, API proxy contract, chimera gateway, dual deploy, hole manifest. **Phase 13** CWL surface waves (M0→M5) is the **active** build queue. Agents refuse new phase implementation until prior **close gate** passes and status docs mark **closed**. **`docs/STRATEGIC-PLAN.md`**, **`ROADMAP.md`**, **`AGENTS.md`**.

- **2026-06-19 — D6195** **WISP Phase 13 M0 surfaces (G6350).** Native **CWL Pages** for `/docs/*` (incl. project-status) and static `/help` overview; `/login` → **`hub-svelte:firebase-auth`** UI hole (CWL-RFC-0012). **`scripts/wisp-cwl-apply-m0-surfaces.mjs`** re-applies after WISP lift; chimera native prefixes `/docs,/help`. Fixture manifest **`wisp-m0-surface-manifest.v1.json`**. UI holes **76** (75 page-component + 1 firebase-auth).

- **2026-06-19 — D6197** **WISP Phase 13 M1 CWL Data (G6360).** `/dashboard` **`@page` + `load { tenantLabel, … }`** — CWL Data surface on POC; static page shell + **`cwl-page-load`** sidecar; interactive widgets catalogued as **UI holes** (not WISP-only engine shortcuts). **`scripts/wisp-cwl-apply-m1-surfaces.mjs`**, **`wisp-cwl-apply-phase13-surfaces.mjs`**, chimera native prefix `/dashboard`. North star = **CWL**; WISP validates the pattern.

- **2026-06-19 — D6198** **WISP Phase 13 M2 admin + customers (G6370).** Five **`/admin/*`** routes + **`/modules/customers`** → **`@page` + `load { adminArea | module, … }`**; **`/api/admin`** + **`/api/customers`** verified in **`api-proxy.cwl`**; admin/CRM widgets + portal sub-routes catalogued as **UI holes**. **`scripts/wisp-cwl-apply-m2-surfaces.mjs`**; chimera native prefixes **`/admin,/modules/customers`**. UI holes **69** (68 page-component + 1 firebase-auth).

- **2026-06-19 — D6199** **WISP Phase 13 M3 plan/deploy/coverage-map (G6380).** **`/modules/plan`**, **`/modules/deploy`**, **`/modules/coverage-map`** → **`@page` + `load { module, apiPath, … }`**; **`/api/plans`**, **`/api/deploy`**, **`/api/network`** verified in proxy contract; ArcGIS MapView/geocode catalogued as **`hub-svelte:arcgis-map`** client holes (not lowered in **`runtime-cwl`**). **`scripts/wisp-cwl-apply-m3-surfaces.mjs`**. UI holes **66** after lift.

- **2026-06-19 — D6200** **WISP Phase 13 M4 ACS/HSS/monitor (G6390).** Eleven **`/modules/acs-cpe-management/*`** routes + **`/modules/hss-management`** + **`/modules/monitoring`** → **`@page` + `load`**; GenieACS stays backend (**`hub-cwl:upstream-proxy`** / **`/api/device-assignment`**); **`scripts/wisp-cwl-apply-m4-surfaces.mjs`**.

- **2026-06-19 — D6201** **WISP Phase 13 M5 UI cutover (G6400).** Auto-lift all remaining **`hub-svelte:page-component`** routes to **`@page` + `load`** via **`scripts/wisp-cwl-apply-m5-surfaces.mjs`**; **≥99%** native page ratio; **`/login`** only **`hub-svelte:firebase-auth`** hole. Chimera: **`WISP_CWL_NATIVE_PREFIXES=*`**, fix **`/admin`** UI paths (no longer proxied to backend). **UI holes 1**.

- **2026-06-19 — D6202** **WISP Phase 13 M6 CWL Effects (G6420).** **`effects: session.read`** on M1–M2 protected routes (dashboard, admin, customers, tenant ops) via **`scripts/wisp-cwl-apply-m6-effects.mjs`**; declarative RFC-0007 metadata; runtime-cwl does not enforce auth (Firebase/chimera upstream).

- **2026-06-19 — D6203** **WISP Phase 13 close (G6410).** Composite gate **`hub-wisp-cwl-phase13-close-smoke`** — M0–M6 + taxonomy + single login UI hole; **`runPhase13ClosedGovernanceGate`**; default queue returns to maintenance.

- **2026-06-19 — D6205** **CWL authoritative; POC showcases; GenieACS out of scope.** User clarification: **CWL** (RFCs, WebIR, oracle) defines the language — **WISP exists solely to showcase it**, not to define it. **GenieACS** was original **WISPTools** design; it serves **no purpose in the Chrysalis POC** and is **removed from consideration** (not deferred, not operator-only in POC docs — absent from scenario inventory, M4 showcase, and language gates). **`docs/STRATEGIC-PLAN.md`**, **`docs/WISP-CWL-FULLSTACK-PROGRAM.md`**, **`docs/CWL-SURFACE-TAXONOMY.md`**, **`docs/CWL-LANGUAGE-PROGRAM.md`**, **`AGENTS.md`**.

- **2026-06-22 — D6206** **CWL complete web language program (Phase 15–18).** User amendment: **complete CWL as a web language** is the product north star — not “language v1 closed + IR helper maintenance only.” **Language v1 (G6750)** remains a shipped milestone; **Phase 15–18** is the **active locked path** to close all five surfaces (**CWL API, Pages, Data, UI, Effects**) with verify-backed native syntax, **hole budget zero** on chartered flagship routes, and **ladder step 5** cutover (app logic without chimera sidecars; explicit vendor bridges allowed). **Default build queue** supersedes maintenance-first: **Phase 15 UI v0** first, then Data complete, Effects executable, cutover/greenfield. **IR helper B-tier (G6731)** continues as **subordinate** ingest depth — not the finish line. **Refuse:** silent UI lowering, runtime claims without replay, GenieACS (**D6205**). **`docs/STRATEGIC-PLAN.md` §12**, **`docs/CWL-LANGUAGE-PROGRAM.md`**, **`ROADMAP.md`**, **`docs/PAUSED-AND-MAINTENANCE.md`**.

- **2026-06-22 — D6207** **CWL native UI v0 (RFC-0017, G7111).** Phase **15** first implementation slice: **`return ui { element … }`** on `@page` routes lowers to WebIR **`data.ui.tree`** (serialised nodes + operand bindings); runtime **`renderCwlUiTree`** + **`escapeHtml`** for server HTML; gold fixture **`fixtures/hub-gold-cwl-ui-v0`**; smokes **`hub:cwl-phase15-entry-smoke`** (**G7101**), **`hub:cwl-ui-v0-smoke`** (**G7111**). **Non-goals:** hydration, silent Svelte lowering.

- **2026-06-24 — D6220** **IR helper B50 `strncmp(, literal, literal)` (G7098).** Formal + two literals **`strncmp($formal, 'needle', n)`** assign inlining via **`strncmpFormalLiteral2`**; fixture route **`/peh`**; emit via slice + strcmp logic; gate **`runIrHelperLiftingB50StrncmpInlineGate`** in **G6731**.

- **2026-06-24 — D6221** **IR helper B51 `strncasecmp(, literal, literal)` (G7099).** Formal + two literals assign inlining via **`strncasecmpFormalLiteral2`**; fixture route **`/fe`**; emit via lowercase slice + strcmp logic; gate **`runIrHelperLiftingB51StrncasecmpInlineGate`** in **G6731**.

- **2026-06-24 — D6222** **IR helper B52 `strrev()` (G7102).** Formal-only assign inlining via **`strrevFormal`**; fixture route **`/kuf`**; emit via split/reverse/join; gate **`runIrHelperLiftingB52StrrevInlineGate`** in **G6731**.

- **2026-06-24 — D6223** **IR helper B53 `str_repeat(, literal)` (G7103).** Formal + literal assign inlining via **`strRepeatFormalLiteral`**; fixture route **`/gim`**; emit via **`String.repeat`**; gate **`runIrHelperLiftingB53StrRepeatInlineGate`** in **G6731**.

- **2026-06-24 — D6225** **IR helper B55 `str_replace(, lit, lit)` (G7105).** Formal assign inlining; fixture route **`/repl`**; gate **`runIrHelperLiftingB55StrReplaceInlineGate`** in **G6731**.

- **2026-06-24 — D6226** **IR helper B56 `str_ireplace(, lit, lit)` (G7106).** Formal assign inlining; fixture route **`/irepl`**; gate **`runIrHelperLiftingB56StrIreplaceInlineGate`** in **G6731**.

- **2026-06-24 — D6227** **IR helper B57 `ucfirst()` (G7107).** Formal assign inlining; fixture route **`/ucf`**; gate **`runIrHelperLiftingB57UcfirstInlineGate`** in **G6731**.

- **2026-06-24 — D6228** **IR helper B58 `lcfirst()` (G7108).** Formal assign inlining; fixture route **`/lcf`**; gate **`runIrHelperLiftingB58LcfirstInlineGate`** in **G6731**.

- **2026-06-24 — D6229** **IR helper B59 `ucwords()` (G7109).** Formal assign inlining; fixture route **`/ucw`**; gate **`runIrHelperLiftingB59UcwordsInlineGate`** in **G6731**.

- **2026-06-24 — D6230** **IR helper B60 `strip_tags()` (G7112).** Formal assign inlining; fixture route **`/stag`**; gate **`runIrHelperLiftingB60StripTagsInlineGate`** in **G6731**.

- **2026-06-24 — D6231** **IR helper B61 `addslashes()` (G7113).** Formal assign inlining; fixture route **`/adds`**; gate **`runIrHelperLiftingB61AddslashesInlineGate`** in **G6731**.

- **2026-06-24 — D6232** **IR helper B62 `stripslashes()` (G7114).** Formal assign inlining; fixture route **`/subs`**; gate **`runIrHelperLiftingB62StripslashesInlineGate`** in **G6731**.

- **2026-06-24 — D6233** **IR helper B63 `str_rot13()` (G7115).** Formal assign inlining; fixture route **`/rot13`**; gate **`runIrHelperLiftingB63StrRot13InlineGate`** in **G6731**.

- **2026-06-24 — D6234** **IR helper B64 `str_word_count()` (G7116).** Formal assign inlining; fixture route **`/swc`**; gate **`runIrHelperLiftingB64StrWordCountInlineGate`** in **G6731**.

- **2026-06-24 — D6235** **IR helper B65 `str_split(, lit)` (G7117).** Formal assign inlining; fixture route **`/split`**; gate **`runIrHelperLiftingB65StrSplitInlineGate`** in **G6731**.

- **2026-06-24 — D6236** **IR helper B66 `strcspn(, lit)` (G7118).** Formal assign inlining; fixture route **`/cspn`**; gate **`runIrHelperLiftingB66StrcspnInlineGate`** in **G6731**.

- **2026-06-24 — D6237** **IR helper B67 `strspn(, lit)` (G7119).** Formal assign inlining; fixture route **`/sspn`**; gate **`runIrHelperLiftingB67StrspnInlineGate`** in **G6731**.

- **2026-06-24 — D6238** **IR helper B68 `ltrim(, lit)` (G7124).** Formal assign inlining; fixture route **`/ltrimc`**; gate **`runIrHelperLiftingB68LtrimCharlistInlineGate`** in **G6731**.

- **2026-06-24 — D6239** **IR helper B69 `rtrim(, lit)` (G7125).** Formal assign inlining; fixture route **`/rtrimc`**; gate **`runIrHelperLiftingB69RtrimCharlistInlineGate`** in **G6731**.

- **2026-06-24 — D6240** **IR helper B70 `trim(, lit)` (G7126).** Formal assign inlining; fixture route **`/trimc`**; gate **`runIrHelperLiftingB70TrimCharlistInlineGate`** in **G6731**.

- **2026-06-24 — D6241** **IR helper B71 `wordwrap(, lit, lit)` (G7127).** Formal assign inlining; fixture route **`/wrap`**; gate **`runIrHelperLiftingB71WordwrapInlineGate`** in **G6731**.

- **2026-06-24 — D6242** **IR helper B72 `chunk_split(, lit, lit)` (G7128).** Formal assign inlining; fixture route **`/csplit`**; gate **`runIrHelperLiftingB72ChunkSplitInlineGate`** in **G6731**.

- **2026-06-24 — D6243** **IR helper B73 `strtr(, lit, lit)` (G7129).** Formal assign inlining; fixture route **`/xlat`**; gate **`runIrHelperLiftingB73StrtrInlineGate`** in **G6731**.

- **2026-06-24 — D6244** **IR helper B74 `htmlentities()` (G7132).** Formal assign inlining; fixture route **`/hent`**; gate **`runIrHelperLiftingB74HtmlentitiesInlineGate`** in **G6731**.

- **2026-06-24 — D6257** **IR Helper Program P3 maintenance batch 2 complete (102 callees).** Eight new **`generic: true`** registry rows (implode/preg/hex/strval/filter/crc32 tier) plus **`genericFormalLiteral2`** for **`preg_replace`** (`formalLast` operand order). Runtime shims **`implode`**, **`pregReplace`**, **`pregSplit`**, **`hexdec`**, **`dechex`**, **`strval`**, **`filterVar`**, **`crc32`** in emit-hono/emit-fastify; fixtures routes **`/m96`–`/m103`**. P3 maintenance closed; **`mb_*`** and **`str_shuffle`** remain holes.

- **2026-06-24 — D6256** **IR Helper Program P3 maintenance batch 1 (94 callees).** Twenty new **`generic: true`** registry rows (json/hash/preg/format tier) use **`IR_HELPER_GENERIC_CALLEE_MAP`** + **`genericFormal` / `genericFormalLiteral`** resolve/emit in **`lib-helper-inline.ts`** and ingest **`buildQueryParamReplacements`** — no new G6731 B-tier gates. Runtime shims in emit-hono/emit-fastify; fixtures routes **`/m76`–`/m95`**.

- **2026-06-24 — D6255** **IR Helper Program registry (P1, G7204).** **`ir-helper-inline-registry.ts`** is authoritative pattern metadata (74 entries at v1 close; 94 after P3 batch 1); prelude skips and callee ids derive from registry. Ingest **`convert.ts`** delegates **`tryExtractInlineQuery`** to **`@chrysalis/emit-shared`** (deduped ~1k lines). **G7204** idempotency gate + **`fixtures/ci/ir-helper-program-coverage.json`** artifact in **G7200**.

- **2026-06-24 — D6250** **IR Helper Program v1 charter (G7200).** User amendment: **IR helper lifting is a standalone program**, not a CWL language surface or finish line. **`docs/IR-HELPER-PROGRAM.md`** is program authority; **G7200** (`hub:ir-helper-program-close-smoke`) is the composite close gate. **G6731** tier regression is **subordinate**. **DESIGN §3:** no silent inline; holes for H1/H2 and out-of-charter callees.

- **2026-06-24 — D6251** **IR Helper Program body-shape matrix (I0–I5, H1–H2).** Track B call-site SQL inline documents **six supported shapes** (direct return through coalesce) and **two explicit holes** (multi-local, effectful prelude). Fixtures under **`fixtures/lift-helper-sql-param-inline`**.

- **2026-06-24 — D6252** **IR Helper Program catalog (`IR_HELPER_INLINE_CALLEE_IDS`).** **`@chrysalis/emit-shared`** **`ir-helper-program-catalog.ts`** is the contract for **74** I3 callees (frozen at B75); ingest Vitest imports the catalog instead of duplicating callee lists.

- **2026-06-24 — D6253** **IR Helper Program close gates (G7201–G7203 + G7200).** Doc gate (**G7201**), fixture↔catalog coverage (**G7202**), inline Vitest batch (**G7203**), composite **G7200** (Track A smokes + replay twin + coverage artifact).

- **2026-06-24 — D6254** **B-tier numbering frozen at B75.** New inline callees are **program maintenance** (registry + fixtures + Vitest), not new CWL language tiers. String helper v1.1 closed at **G7133**; program v1 closed at **G7200**.

- **2026-06-24 — D6245** **IR helper B75 `html_entity_decode()` (G7133).** Formal assign inlining; fixture route **`/hdec`**; gate **`runIrHelperLiftingB75HtmlEntityDecodeInlineGate`** in **G6731**.
- **2026-07-03 — D6246** **IR helper B76 `json_encode()` (G7134).** Formal assign inlining; fixture route **`/m76`**; gate **`runIrHelperLiftingB76JsonEncodeInlineGate`** in **G6731**.
- **2026-07-04 — D6247** **IR helper B77 `json_decode()` (G7135).** Formal assign inlining; fixture route **`/m77`**; gate **`runIrHelperLiftingB77JsonDecodeInlineGate`** in **G6731**.
- **2026-07-05 — D6248** **IR helper B78 `md5()` (G7136).** Formal assign inlining; fixture route **`/m78`**; gate **`runIrHelperLiftingB78Md5InlineGate`** in **G6731**.
- **2026-07-05 — D6249** **IR helper B79 `sha1()` (G7137).** Formal assign inlining; fixture route **`/m79`**; gate **`runIrHelperLiftingB79Sha1InlineGate`** in **G6731**.
- **2026-07-05 — D6312** **IR helper B80 `base64_encode()` (G7138).** Formal assign inlining; fixture route **`/m80`**; gate **`runIrHelperLiftingB80Base64EncodeInlineGate`** in **G6731**.
- **2026-07-05 — D6313** **IR helper B81 `base64_decode()` (G7139).** Formal assign inlining; fixture route **`/m81`**; gate **`runIrHelperLiftingB81Base64DecodeInlineGate`** in **G6731**.
- **2026-07-05 — D6314** **IR helper B82 `bin2hex()` (G7143).** Formal assign inlining; fixture route **`/m82`**; gate **`runIrHelperLiftingB82Bin2hexInlineGate`** in **G6731**.
- **2026-07-05 — D6315** **IR helper B83 `preg_quote()` (G7144).** Formal assign inlining; fixture route **`/m83`**; gate **`runIrHelperLiftingB83PregQuoteInlineGate`** in **G6731**.
- **2026-07-05 — D6316** **IR helper B84 `parse_url()` (G7145).** Formal assign inlining; fixture route **`/m84`**; gate **`runIrHelperLiftingB84ParseUrlInlineGate`** in **G6731**.
- **2026-07-05 — D6317** **IR helper B85 `basename()` (G7146).** Formal assign inlining; fixture route **`/m85`**; gate **`runIrHelperLiftingB85BasenameInlineGate`** in **G6731**.
- **2026-07-05 — D6318** **IR helper B86 `dirname()` (G7147).** Formal assign inlining; fixture route **`/m86`**; gate **`runIrHelperLiftingB86DirnameInlineGate`** in **G6731**.
- **2026-07-05 — D6319** **IR helper B87 `gettype()` (G7148).** Formal assign inlining; fixture route **`/m87`**; gate **`runIrHelperLiftingB87GettypeInlineGate`** in **G6731**.
- **2026-07-05 — D6320** **IR helper B88 `is_callable()` (G7149).** Formal assign inlining; fixture route **`/m88`**; gate **`runIrHelperLiftingB88IsCallableInlineGate`** in **G6731**.
- **2026-07-05 — D6321** **IR helper B89 `is_resource()` (G7152).** Formal assign inlining; fixture route **`/m89`**; gate **`runIrHelperLiftingB89IsResourceInlineGate`** in **G6731**.
- **2026-07-05 — D6322** **IR helper B90 `ord()` (G7153).** Formal assign inlining; fixture route **`/m90`**; gate **`runIrHelperLiftingB90OrdInlineGate`** in **G6731**.
- **2026-07-05 — D6323** **IR helper B91 `chr()` (G7154).** Formal assign inlining; fixture route **`/m91`**; gate **`runIrHelperLiftingB91ChrInlineGate`** in **G6731**.
- **2026-07-05 — D6324** **IR helper B92 `preg_match(, lit)` (G7155).** Formal + literal assign inlining; fixture route **`/m92`**; gate **`runIrHelperLiftingB92PregMatchInlineGate`** in **G6731**.
- **2026-07-05 — D6325** **IR helper B93 `hash(, lit)` (G7156).** Formal + literal assign inlining; fixture route **`/m93`**; gate **`runIrHelperLiftingB93HashInlineGate`** in **G6731**.
- **2026-07-05 — D6326** **IR helper B94 `sprintf(, lit)` (G7157).** Formal + literal assign inlining; fixture route **`/m94`**; gate **`runIrHelperLiftingB94SprintfInlineGate`** in **G6731**.
- **2026-07-05 — D6327** **IR helper B95 `number_format(, lit)` (G7158).** Formal + literal assign inlining; fixture route **`/m95`**; gate **`runIrHelperLiftingB95NumberFormatInlineGate`** in **G6731**.
- **2026-07-05 — D6328** **IR helper B96 `implode(lit, ...)` (G7159).** Literal + formal assign inlining; fixture route **`/m96`**; gate **`runIrHelperLiftingB96ImplodeInlineGate`** in **G6731**.
- **2026-07-05 — D6329** **IR helper B97 `preg_replace(lit, lit, ...)` (G7160).** Two literals + formal-last assign inlining; fixture route **`/m97`**; gate **`runIrHelperLiftingB97PregReplaceInlineGate`** in **G6731**.
- **2026-07-05 — D6330** **IR helper B98 `preg_split(, lit)` (G7161).** Formal + literal assign inlining; fixture route **`/m98`**; gate **`runIrHelperLiftingB98PregSplitInlineGate`** in **G6731**.
- **2026-07-05 — D6331** **IR helper B99 `hexdec()` (G7162).** Formal assign inlining; fixture route **`/m99`**; gate **`runIrHelperLiftingB99HexdecInlineGate`** in **G6731**.
- **2026-07-05 — D6332** **IR helper B100 `dechex()` (G7163).** Formal assign inlining; fixture route **`/m100`**; gate **`runIrHelperLiftingB100DechexInlineGate`** in **G6731**.
- **2026-07-05 — D6333** **IR helper B101 `strval()` (G7164).** Formal assign inlining; fixture route **`/m101`**; gate **`runIrHelperLiftingB101StrvalInlineGate`** in **G6731**.
- **2026-07-05 — D6334** **IR helper B102 `filter_var(, lit)` (G7165).** Formal + literal assign inlining; fixture route **`/m102`**; gate **`runIrHelperLiftingB102FilterVarInlineGate`** in **G6731**.
- **2026-07-06 — D6351** **Maintenance census wave 10 (G9164).** File-lift origins (sql/html/css/json/yaml/markdown/scss/c/cpp) × native outbound — **279/601** (**322** below target).
- **2026-07-06 — D6352** **Maintenance census wave 11 (G9165).** All non-rust hub origins × rust actix outbound with **`oracle-rust`** native trace replay — **300/601** (**301** below target).
- **2026-07-06 — D6353** **Maintenance census wave 12 (G9166).** All non-kotlin hub origins × kotlin Ktor outbound with **`oracle-kotlin`** native trace replay — **321/601** (**280** below target).
- **2026-07-06 — D6354** **Maintenance census wave 13 (G9167).** All non-scala hub origins × scala Akka HTTP outbound with **`oracle-scala`** native trace replay — **342/601** (**259** below target).
- **2026-07-06 — D6359** **Closed phase census regression (G9140/G9190/G9290).** `isExtendedMatrixCensusProgramHonest` allows **601/601** post-close maintenance while preserving close-time oracle floors — fixes phase **44–46** program-close smokes after wave **16**.
- **2026-07-06 — D6358** **Maintenance census doc index (G9160).** Align **`PAUSED-AND-MAINTENANCE.md`**, **`ROADMAP.md`**, **`PHASE-46-PROGRAM.md`**, **`MIGRATION-OS.md`** with **601/601** oracle-product close — census promotion removed from honest gaps; Phase 46 close record (**180/601**) preserved as historical.
- **2026-07-06 — D6357** **Maintenance census wave 16 (G9172).** php/cwl origins × asset file-lift + rust/kotlin/scala native backfill with trace replay — **601/601** (**0** below target).
- **2026-07-06 — D6356** **Maintenance census wave 15 (G9169).** All non-swift hub origins × swift Vapor outbound with **`oracle-swift`** native trace replay — **575/601** (**26** below target).
- **2026-07-06 — D6355** **Maintenance census wave 14 (G9168).** Asset file-lift outputs (c/cpp/sql/html/css/scss/json/yaml/markdown/vue) × 21 origins with **`oracle-asset`** route-manifest trace replay — **552/601** (**49** below target).
- **2026-07-06 — D6350** **Maintenance census wave 9 (G9163).** Rust/Kotlin/Scala/Swift pattern-lift × native outbound trace-replay — **225/601** (**376** below target); probe-route dedupe fixes svelte→go Gin replay.
- **2026-07-06 — D6349** **Maintenance census wave 8 (G9161).** Svelte/Vue component-lift × native outbound (python/java/go/ruby/csharp/php) trace-replay promotion — **200/601** (**401** below target). Charter wave **8**; svelte→go deferred (gin route collision).
- **2026-07-06 — D6348** **Dependency hygiene (maintenance).** pnpm overrides for **protobufjs**, **undici**, **esbuild**, **js-yaml**, **hono**, **@opentelemetry/core**; **vite** 6.4.3; **firebase-tools** 14.27.x.
- **2026-07-06 — D6347** **Maintenance census batch 2 (G9160).** Promote remaining CWL hub-gold trace-replay suites (kotlin/scala/swift/rust → CWL + structured/flagship CWL coverage) — **189/601** (**412** below target).
- **2026-07-06 — D6346** **CWL runtime scaffold depth maintenance (G9238).** `@chrysalis/runtime-cwl-browser` island bind/mount; `@chrysalis/runtime-cwl-worker` fetch delegate; smoke `hub:cwl-runtime-scaffold-depth-smoke`. No hydration claim.
- **2026-07-06 — D6345** **Maintenance census promotion (G9160).** Promote **sql/html/scss/c/cpp → CWL** hub-gold trace-replay suites after verify replay green — **185/601** oracle-product (**416** below target). No 601/601 claim; post–Phase 46 maintenance only.
- **2026-07-06 — D6343** **Phase 46 program close (G9290).** Waves **6–7** closed (**180/601** oracle-product); CWL runtime deploy scaffold (**G9240**); default queue returns to **G8550** maintenance. Program [`docs/PHASE-46-PROGRAM.md`](./docs/PHASE-46-PROGRAM.md).
- **2026-07-06 — D6342** **CWL runtime-cwl deploy productization (G9240).** `emit-runtime-cwl` vendors runtime stack, emits `Dockerfile` + operator `README.md`; deploy smoke `hub:cwl-runtime-deploy-smoke`. Operator doc: [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md#deploying-cwl-runtime-cwl-target).
- **2026-07-06 — D6341** **Phase 46 matrix waves 6–7 + CWL runtime depth (G9250–G9290).** User-amended: parallel **46a** extended matrix waves (**G9275–G9286**) and **46b** CWL runtime depth (**G9210–G9220**, `@chrysalis/emit-runtime-cwl`, `@chrysalis/runtime-cwl-browser`, `@chrysalis/runtime-cwl-worker`). Requires **G9190** closed. Program [`docs/PHASE-46-PROGRAM.md`](./docs/PHASE-46-PROGRAM.md), [`docs/CWL-RUNTIME-DEPTH-PHASE-46.md`](./docs/CWL-RUNTIME-DEPTH-PHASE-46.md).
- **2026-07-06 — D6340** **Phase 45 program close (G9190).** Wave 5 config-lift CWL promotion (**G9176**); honest **178/601** oracle-product census; default queue returns to **G8550** maintenance. Program [`docs/PHASE-45-PROGRAM.md`](./docs/PHASE-45-PROGRAM.md).
- **2026-07-06 — D6339** **Phase 45a extended matrix wave 5 (G9175–G9176).** Markdown/YAML/Vue → CWL trace-replay promotion; charter **`wave5`**. Vue/Svelte component-lift oracle promotion — **`svelte-literal-*` trace replay suites** in **`hub-gold-manifest.mjs`**; charter **`wave4`**; smokes **`hub:extended-matrix-oracle-wave4-smoke`**, **`hub:extended-matrix-oracle-wave4-close-smoke`**. Program [`docs/PHASE-45-PROGRAM.md`](./docs/PHASE-45-PROGRAM.md).
- **2026-07-06 — D6336** **Phase 45 CWL product supremacy (G9150–G9190).** User-amended: default build prioritizes **CWL product evidence** above maintenance-only regression. **WISP showcase re-coupled to default CI** (**G9170** — supersedes **D6259** default-build bar; showcase remains subordinate to CWL north star). Extended matrix wave maintenance (**G9160**), product build slice (**G9180**), IR helper/CWL language **first-class**. Program [`docs/PHASE-45-PROGRAM.md`](./docs/PHASE-45-PROGRAM.md); governance **`runPhase45ActiveGovernanceGate`** (**G9151**). **`docs/STRATEGIC-PLAN.md` §12**, **`docs/PAUSED-AND-MAINTENANCE.md`**, **`docs/WISP-CWL-FULLSTACK-PROGRAM.md`**, **`ROADMAP.md`**, **`.github/workflows/ci.yml`**.
- **2026-07-05 — D6335** **IR helper B103 `crc32()` (G7166).** Formal assign inlining; fixture route **`/m103`**; gate **`runIrHelperLiftingB103Crc32InlineGate`** in **G6731**.
- **2026-07-04 — D6311** **Phase 44 program close (G9140).** Extended matrix waves 1–3 (**169/601** oracle-product), hole-closure repair bridge, Horizon C operator train contract — honest partial census; default queue returns to **G8550** maintenance. Program [`docs/PHASE-44-PROGRAM.md`](./docs/PHASE-44-PROGRAM.md).
- **2026-07-04 — D6310** **Phase 44 program (G9000).** User-amended: **601-pair extended matrix oracle waves**, **LLM hole-closure → repair**, **Horizon C in-repo QLoRA train loop** (`scripts/chrysalis-lora-qlora-train.py`). Subordinate to **G8550**; close **G9140**. Program [`docs/PHASE-44-PROGRAM.md`](./docs/PHASE-44-PROGRAM.md).
- **2026-07-04 — D6305** **Hub matrix pair next-action honesty.** `buildLanguageReadinessReport` uses verify depth (trace replay / structural gold) instead of generic origin `notDone` for gold oracle-product pairs (**Phase 41** closed messaging).

- **2026-06-24 — D6224** **IR helper B54 `str_pad(, literal, literal)` (G7104).** Formal + two literals assign inlining via **`strPadFormalLiteral2`**; fixture route **`/dale`**; emit via **`padEnd`** (STR_PAD_RIGHT default); gate **`runIrHelperLiftingB54StrPadInlineGate`** in **G6731**.

- **2026-06-24 — D6219** **IR helper B49 `strcasecmp(, literal)` (G7097).** Formal + literal **`strcasecmp($formal, 'literal')`** assign inlining; fixture route **`/samech`**; emit via lowercase + strcmp logic; gate **`runIrHelperLiftingB49StrcasecmpInlineGate`** in **G6731**.

- **2026-06-24 — D6218** **IR helper B48 `strcmp(, literal)` (G7096).** Formal + literal **`strcmp($formal, 'literal')`** assign inlining; fixture route **`/sin`**; emit via strcmp IIFE; gate **`runIrHelperLiftingB48StrcmpInlineGate`** in **G6731**.

- **2026-06-24 — D6217** **IR helper B47 `explode(, literal)` (G7095).** Formal + literal **`explode(',', $formal)`** assign inlining; fixture route **`/kaf`**; emit via **`String(…).split(…)`**; gate **`runIrHelperLiftingB47ExplodeInlineGate`** in **G6731**.

- **2026-06-24 — D6216** **IR helper B46 `substr_count(, literal)` (G7094).** Formal + literal **`substr_count($formal, 'literal')`** assign inlining; fixture route **`/yod`**; emit via non-overlapping indexOf IIFE; gate **`runIrHelperLiftingB46SubstrCountInlineGate`** in **G6731**.

- **2026-06-24 — D6215** **IR helper B45 `str_ends_with(, literal)` (G7093).** Formal + literal **`str_ends_with($formal, 'literal')`** assign inlining; fixture route **`/tet`**; emit via **`String(…).endsWith(…)`**; gate **`runIrHelperLiftingB45StrEndsWithInlineGate`** in **G6731**.

- **2026-06-24 — D6214** **IR helper B44 `str_starts_with(, literal)` (G7092).** Formal + literal **`str_starts_with($formal, 'literal')`** assign inlining; fixture route **`/chet`**; emit via **`String(…).startsWith(…)`**; gate **`runIrHelperLiftingB44StrStartsWithInlineGate`** in **G6731**.

- **2026-06-23 — D6213** **IR helper B43 `str_contains(, literal)` (G7091).** Formal + literal **`str_contains($formal, 'literal')`** assign inlining; fixture route **`/zayin`**; emit via **`String(…).includes(…)`**; gate **`runIrHelperLiftingB43StrContainsInlineGate`** in **G6731**.

- **2026-06-23 — D6212** **IR helper B42 `strripos(, literal)` (G7090).** Formal + literal **`strripos($formal, 'literal')`** assign inlining; fixture route **`/vav`**; emit via **`String(…).toLowerCase().lastIndexOf(String(…).toLowerCase())`**; gate **`runIrHelperLiftingB42StrriposInlineGate`** in **G6731**.

- **2026-06-23 — D6211** **IR helper B41 `strrpos(, literal)` (G7080).** Formal + literal **`strrpos($formal, 'literal')`** assign inlining; fixture route **`/he`**; emit via **`String(…).lastIndexOf(…)`**; gate **`runIrHelperLiftingB41StrrposInlineGate`** in **G6731**.

- **2026-06-23 — D6210** **IR helper B40 `stripos(, literal)` (G7070).** Formal + literal **`stripos($formal, 'literal')`** assign inlining; fixture route **`/dalet`**; emit via **`String(…).toLowerCase().indexOf(String(…).toLowerCase())`**; gate **`runIrHelperLiftingB40StriposInlineGate`** in **G6731**.

- **2026-06-22 — D6209** **IR helper B39 `strpos(, literal)` (G7060).** Post-**G7150** default maintenance slice: formal + literal **`strpos($formal, 'literal')`** assign inlining on parametric lib SQL helpers; fixture route **`/gimel`** on **`lift-helper-sql-param-inline`**; ingest + **`@chrysalis/emit-shared`** emit via **`String(…).indexOf(…)`**; gate **`runIrHelperLiftingB39StrposInlineGate`** in **`hub:cwl-language-maintenance-smoke`** (**G6731**).

- **2026-06-22 — D6208** **CWL complete language program close (Phases 15–18, G7150).** Phase **15 close (G7110):** **`@component`** reuse (**RFC-0018**), **`resolveCwlUiComponent`**, WISP **`/login`** documented chimera bridge (**`docs/CWL-UI-LOGIN-BRIDGE.md`** — preserves **G6410** firebase hole). Phase **16 (G7120):** RFC-0013 load parity on flagship + WISP native **`load { }`**. Phase **17 (G7130):** **`wrapCwlExecutableEffects`** lowers declared **`session.read` / `session.write`** to effect-dialect executable nodes (not metadata-only). Phase **18 (G7140):** ladder step 5 cutover evidence — WISP hole budget (single **`hub-svelte:firebase-auth`** UI hole). Composite **`hub:cwl-complete-language-close-smoke`** (**G7150**) composes 15–18 + **G6731** maintenance. Smokes: **`hub:cwl-phase15-close-smoke`**, **`hub:cwl-data-complete-smoke`**, **`hub:cwl-effects-executable-smoke`**, **`hub:cwl-cutover-smoke`**, **`hub:cwl-complete-language-close-smoke`**.

- **2026-06-19 — D6204** **Phase 14 HSS operator.** **`acs-hss-server` / `hss.wisptools.io`** hosts operator backend-services + MongoDB (proxy target). Phase 14: HSS site / chimera deploy. Superseded for GenieACS scope by **D6205**.

- **2026-06-19 — D6196** **North star = CWL; WISP = important POC.** User clarification: the **final consolidated web language (CWL)** is the north star; **WISP Module_Manager** is the reference full-stack **POC** that stress-tests surface waves — important, but not the product or end state. Engine/WebIR/oracle wins must **generalize**; WISP-specific paths stay catalogued. **`docs/STRATEGIC-PLAN.md`**, **`docs/WISP-CWL-FULLSTACK-PROGRAM.md`**, **`docs/CWL-SURFACE-TAXONOMY.md`**, **`AGENTS.md`**.

- **2026-05-13 — D295** **Multi-runtime CLI shims (Python + Go) in-tree.** The canonical implementation remains **`packages/cli/dist/bin.js`** (Node + TypeScript packages). **`go/shim/`** ships a **`main`** that **`exec`s** **`node <abs-bin.js> [argv…]`** after resolving **`CHRYSALIS_CLI_JS`** (absolute path override) or walking **`cwd`** then the Go binary’s directory upward for **`packages/cli/dist/bin.js`**. **`python/chrysalis_shim/`** ships the same contract via **`subprocess.run`** (**`chrysalis-py`** console script or **`python -m chrysalis_shim`** with **`PYTHONPATH=src`**). **`CHRYSALIS_NODE`** names the Node binary for both shims. **Rationale:** teams standardizing on Python or Go toolchains get native entrypoints without forking ingest / WebIR / verify (**DESIGN §3** single source of truth; no silent second implementation). **CI / smoke:** **`pnpm run test:cli-shims`** (**`scripts/test-cli-shims.mjs`**) requires **both** shims when **`GITHUB_ACTIONS=true`** or **`CHRYSALIS_STRICT_CLI_SHIMS=1`**; otherwise missing Go or Python is a skip. **Non-goals:** re-porting **`@chrysalis/webir`**, **`emit-*`**, or **`replayCorpus`** to Python or Go in this decision — those remain future **emit-backend** or **full rewrite** tracks if ever undertaken.

- **2026-07-07 — D6360** **Public demo lockdown (hub.agenticop.io).** User-directed: the public Translation Hub demo must not let a visitor trigger an unbounded, LLM-assisted rewrite of a real site. **`scripts/chrysalis-hub-demo-guard.mjs`** adds `CHRYSALIS_HUB_DEMO_MODE` (off by default; set on the public hub only) with `CHRYSALIS_HUB_DEMO_MAX_ROUTES` (default 2 pages/site/request) and `CHRYSALIS_HUB_DEMO_MAX_SITES` (default 1 site/batch request). `hubJobSteps()` (`chrysalis-hub-runners.mjs`) prepends a `hub-demo-route-guard` step that reads the pre-existing `chrysalis.routes.json` manifest and aborts before ingest/emit/LLM hole-proposal cost when over cap; `startProjectBatch` (`chrysalis-operator-web.mjs`) rejects (`403 demo-scope-limit`) batch/pipeline requests over the site cap. The pre-existing single-flight lock (`hubBusy()`) already serializes all setup/batch/verify/translate jobs hub-wide — this decision only adds the per-request scope caps. `/api/config` reports `demoMode` so the UI shows a banner. Local/private hub installs are unaffected unless they opt in. **DESIGN §3:** unchanged — no oracle/verify semantics touched; this is hub operator-tooling cost control, not an engine change.

- **2026-07-07 — D6361** **Chrysalis re-licensed MIT → Apache-2.0 before public announcement.** User-directed, before the launch post went out and before any external star/fork/clone existed (verified via GitHub traffic API: 0 external clones). Root **`LICENSE`** and every **`packages/*/package.json`** **`license`** field now read **Apache-2.0**. Rationale: same permissiveness as MIT for the open-engine-plus-services model (**D393** locked strategic plan unchanged), plus an express patent grant + patent-retaliation clause — relevant given Chrysalis is a code-transformation/compiler-shaped project, and it lowers the bar for corporate contributors whose legal teams are more comfortable under Apache-2.0. **DESIGN §3 item 10** already allowed "MIT or Apache-2.0" — no non-negotiable changed. **Non-goals refused in the same conversation:** closing the repo back to private, and BSL/AGPL (source-available or copyleft) — both would contradict the open-inspectable-engine trust story just shipped; a paid hosted tier, if ever pursued, is a separate future Decision Log entry, not a re-license.

- **2026-07-07 — D6363** **Demo-hub signup/demand metadata (complements D6362).** User-directed: "keep any metadata that would improve the model/software." `registerHubAccount`/`loginHubAccount` (`chrysalis-hub-store.mjs`) now capture best-effort `signupMeta`/`lastLoginMeta` (IP, user-agent, `Referer`) and `loginCount`/`lastLoginAt` per account — never used for access control, purely so the operator can see how visitors found the demo and whether they returned. New `recordHubDemandSignal` appends one line per project creation to `~/.chrysalis-hub/demand-signals.jsonl` (origin language, output language, site count, actor role, demo-mode flag) — a real-world signal for which language pairs to prioritize, complementing the static `popularityRank` (`hub-ingest/language-catalog.mjs`). New read-only `scripts/hub-demand-report.mjs` (`pnpm run hub:demand-report`) summarizes both files (signup counts, top referrers, top language pairs, email list for pilot follow-up) — local-only, no new network surface. **Non-goal:** no analytics vendor, no cross-request tracking beyond what's already logged per account/project; all of this lives in the operator's own `~/.chrysalis-hub/` and is never sent anywhere.

- **2026-07-07 — D6362** **Login/register gate for the public demo hub (complements D6360).** User-directed: the public demo must require sign-in, not just be rate-capped. `CHRYSALIS_OPERATOR_TOKEN` remains the admin secret (`checkAuth`, unchanged for that path); new `registerHubAccount`/`loginHubAccount`/`findHubAccountByToken` (`chrysalis-hub-store.mjs`) back a lightweight `~/.chrysalis-hub/accounts.json` store — email + `scryptSync` password hash + a stable random `apiToken` returned on both register and login (same token every login, so a visitor's demo projects persist across sessions via the pre-existing `hubActorFromRequest` tenant-hash scoping — no new tenancy code needed). `checkAuth` now accepts the admin token **or** any registered account's `apiToken`; a new blanket gate in `chrysalis-operator-web.mjs` (`isPublicHubApiPath`) requires auth on all `/api/*` routes except `/api/config`, `/api/hub/auth/*`, and docs, once `CHRYSALIS_OPERATOR_TOKEN` is set — closing the previous gap where GET routes were unauthenticated even with a token configured. New endpoints `POST /api/hub/auth/register` and `/login` are deliberately exempt from the gate (bootstrap). `CHRYSALIS_HUB_MAX_ACCOUNTS` (default 200) caps store growth from spam. Frontend: `#authGate` (`chrysalis-operator-index.html`) is now a real register/log-in form (was a raw bearer-token field); token persists in `localStorage` (was `sessionStorage`) plus a nav "Sign out" link. **Non-goal:** this is not a general multi-tenant SaaS auth system — no email verification, password reset, or session expiry; acceptable for a capped free demo, not for paid/managed tenancy (a future decision if pursued). Local/private hub installs are unaffected unless `CHRYSALIS_OPERATOR_TOKEN` is set.

- **2026-07-07 — D6364** **Browser-upload alternative to SSH pull, for sites with no reachable origin server.** User-directed: "allow the pages to be uploaded if that can work." New `POST /api/hub/projects/:id/sites/:siteId/source/upload` (`chrysalis-operator-web.mjs`) accepts either `multipart/form-data` (field `files`, one part per file, relative path carried in `filename`) or a raw `application/zip` body, and writes into `site.localDir` — the same directory a `pullFromSsh` or "Local workspace only" project already uses, so the rest of the pipeline (`hubJobSteps`, ingest, the D6360 demo-route-guard) is unchanged. New `safeRelativePath`/`saveSourceFiles`/`saveZipSource` (`chrysalis-hub-traces-upload.mjs`, which already held the multipart/zip upload primitives for oracle traces) reject any entry with `..`, an absolute path, or a drive letter, and (for zips) validate every entry name via `unzip -Z1` *before* extracting — a malicious zip is rejected outright rather than partially extracted. Demo mode (`CHRYSALIS_HUB_DEMO_MODE`) gets much smaller caps (5MB / 40 files vs. 25MB / 500 files) since unbounded uploads are a disk-quota risk independent of the D6360 LLM-cost caps. Response reports `hasRoutesManifest` so the UI can tell a visitor whether their upload included the required `chrysalis.routes.json` (Chrysalis never auto-detects routes from source — DESIGN §3 item 6 — so an upload of raw PHP with no manifest is accepted but won't be ingestable until one is added; the New Project and Console views show an inline example). Frontend: a new "No server to point at? Upload your files" card (`viewNew`) creates a local (no-SSH) project and uploads in one action; the Console gets a matching "Upload source for selected site" control for adding/replacing files on an existing site. **Bug fix found while adding this (same file):** `parseMultipartFiles` mis-detected the closing `--boundary--` marker — it checked the two bytes *at* the start of a delimiter match (always `--`, true for every boundary, not just the closing one) instead of the two bytes *after* it, so it silently kept only the **first** file of any multi-file `multipart/form-data` upload and dropped the rest with no error. This also affected the pre-existing oracle-trace upload endpoint; both are fixed by the same one-line reordering (advance past the delimiter before checking for `--`).

- **2026-07-08 — D6365** **UI asset lift: per-route scoped-CSS conversion as an architecture capability (G9300).** User amendment: "add these rules in across the entire architecture, not just the POC" → "implement, its important." Promotes the WISP UI-parity CSS lesson (per-route de-scoping; the global-concatenation collision failure) from `scripts/wisp-cwl-css-lift.mjs` into the packages. **Rules (normative):** (1) never de-scope a source framework's scoped CSS into one global sheet — isolation granularity must be preserved as **one bundle per source route**; (2) the route→stylesheet map comes **mechanically from the source build manifest**, never hand-maintained; (3) de-scoping is a **per-framework adapter** with a common contract — strip scoping tokens, repair selectors the strip invalidates (empty `:where()/:is()/:not()/:has()`), drop selectors that become over-broad (bare pseudos, dangling combinators), leave keyframes untouched; (4) `url()` assets are copied and rewritten with recorded sources; (5) emitted pages link **exactly their route's bundle** plus a shared layout fallback; (6) unsupported scoping schemes become holes (`legacy:css-scoping-<scheme>`), never best-effort output (§3 item 6); (7) every bundle carries provenance (§3 item 2 — new `Locator` kind `asset`, new `Provenance` source `ui-asset-lift`). **Ownership:** `@chrysalis/webir` `ui-assets.ts` (artifact types `UiRouteStyleMapV1` kind `chrysalis.ui.route-style-map` + `UiStylesheetBundle`, backend-portable); `@chrysalis/ingest` `ui-assets.ts` (`UiFrameworkCssAdapter` interface, SvelteKit adapter `svelteKitCssAdapter`, `liftUiAssets` engine, `postcss` dependency); `@chrysalis/emit-shared` `ui-route-style.ts` (`resolveRouteStylesheetHref`/`routeStylesheetLinkTag`, consumed identically by any emit backend — §3 item 3); `@chrysalis/verify` `ui-css-parity.ts` (`verifyUiRouteStyleParity` selector-coverage report, artifact `chrysalis.verify.ui-css-parity`); CLI `chrysalis ui-assets` subcommand. Fixture `fixtures/ui-assets-svelte/` with golden bundle snapshots. `scripts/wisp-cwl-css-lift.mjs` becomes a thin wrapper over the package API — WISP stays showcase, not owner (D6205 north-star rule). Vue scoped CSS / CSS Modules / Angular emulated encapsulation adapters are follow-on roadmap items under the same contract.

- **2026-07-09 — D6377** **Cyno substrate depth (G9560–G9590) + strategic plan shared with Cyno.** User-directed: build next improvements in best order; cite Cyno; share strategic plan link. **Ship:** (1) **G9560** `recordEvidenceUsedUtility` — credit only domains actually used in verify outcome (never mere surface). (2) **G9570** `listGovernedAgentTools` / `agentToolsGovernorCoverageOk` — every MCP tool GREEN/YELLOW/RED. (3) **G9580** `gateConvertCycle` — aim + governor before hub mutate paths. (4) **G9590** `hub:doc-vs-box-smoke` — docs claiming BUILT must match scripts/exports. **G8550** schema **v7** composes these. **Upstream:** [CynoEngine](https://github.com/nimbus7772017/CynoEngine). **Citation:** `CYNOENGINE_ATTRIBUTION`. **DESIGN §3:** verify still disposes.
- **2026-07-10 — D6378** **Live IS operator evidence (G9600).** Product gap after **G9510**: synthetic smokes do not prove operator hit rates. **Ship:** `aggregateIsLiveAnalyticsFromTrajectoryFiles`, `discoverOperatorTrajectoryPaths`, `snapshotOperatorTrajectoryForEvidence` (`reports/web-llm/operator-evidence/<domain>/latest.trajectory.jsonl`); hub convert verify copies trajectory on gate; `web-llm:aggregate-live-analytics`; `hub:is-live-operator-evidence-smoke`. Synthetic workdirs excluded from aggregate. **G8550** schema **v8**. **DESIGN §3:** analytics honest scope (`live-job` vs `synthetic-smoke`); verify still disposes.
- **2026-07-10 — D6379** **G8550 v9 maintenance composite (G8570 + G6731).** User-directed: wire Open Legacy wedge + CWL language maintenance into Migration OS close. **Ship:** explicit `openLegacyWedgeOk` (**G8570** via **G8520**); `runCwlLanguageMaintenanceSmoke` in **G8550** (opt-out `CHRYSALIS_MIGRATION_OS_SKIP_CWL_MAINTENANCE=1` for fast local). **G6731** remains weekly CI standalone. **DESIGN §3** unchanged.
- **2026-07-10 — D6380** **WISP showcase bound (G9610).** Honest residual ~1260 markup holes on WISP fixture — intentional categories, not regressions. **Ship:** `wisp-hole-metrics-lib.mjs`, `fixtures/ci/wisp-showcase-bound.v1.json`, `hub:wisp-showcase-bound-smoke`, artifact `reports/wisp/showcase-bound.v1.json`. **G8550** schema **v10**. **DESIGN §3:** holes explicit; no invented widgets.
- **2026-07-10 — D6381** **GPU lab close prep (G9620).** Operator has GCE T4; CPU gate validates IS-T2 manifest + orchestrator contract before spend. **Ship:** `hub:gpu-lab-close-smoke` composes **G8610** + script/doc checks; real train via `pnpm run gpu-lab:gce`. **GCE:** optional `CHRYSALIS_GCE_GPU_LAB=1` phase. **DESIGN §3:** verify-gated shards only; dry-run default.
- **2026-07-10 — D6382** **Salience v2 (G9630).** Catalog z-score normalization across near-miss pool; production auto-switch when `countOperatorEvidenceDomains` ≥ **20**. **Ship:** `scoreNearMissCandidatesV2`, `scoreNearMissCandidatesAuto`, `SALIENCE_V2_MIN_OPERATOR_DOMAINS`; wired in `resolveShorthandWithTransfer`; `hub:is-near-miss-salience-v2-smoke`. **G8550** schema **v11**. **DESIGN §3:** near-miss never skipLlm; verify disposes.
- **2026-07-10 — D6383** **WISP modal shell lift (G9660).** `DEFAULT_MODAL_SHELL_COMPONENTS` collapses inert modals to `data-cwl-modal-shell` without component holes.
- **2026-07-10 — D6384** **Operator evidence seed (G9640).** `web-llm:seed-operator-evidence` writes ≥20 hub-convert-shaped trajectories; enables salience v2 production.
- **2026-07-10 — D6385** **Live analytics dashboard (G9650).** `web-llm:build-live-analytics-hub` — honest salience v2 + product sample gates.
- **2026-07-10 — D6386** **G8550 v12** composes G9640–G9660 + G9160/G9450 regression (opt-out `CHRYSALIS_MIGRATION_OS_SKIP_SLOW_REGRESSION=1`).
- **2026-07-10 — D6387** **Product hit-rate sample floor (G9670).** `PRODUCT_HIT_RATE_MIN_JOBS=50` / `productHitRateSampleReady`; seed config schema **v2** writes ≥50 hub-convert-shaped jobs so live analytics can claim product sample READY (still not real verify hit rates). Gate: `hub:product-hit-rate-sample-smoke` (alias of operator-evidence seed).
- **2026-07-10 — D6388** **WISP map/chart + expanded modal shells (G9680 / G9690).** `DEFAULT_MAP_SHELL_COMPONENTS` / `DEFAULT_CHART_SHELL_COMPONENTS` + expanded `DEFAULT_MODAL_SHELL_COMPONENTS` collapse inert embeds to `data-cwl-map-shell` / `data-cwl-chart-shell` / `data-cwl-modal-shell` without inventing widget behavior. Gates: `hub:wisp-map-shell-smoke`, `hub:wisp-modal-shell-smoke`.
- **2026-07-10 — D6389** **Public `/reports/` + G8550 v13 (G9700).** Operator hub serves path-safe static reports under `/reports/` (demo dashboards without auth). Gate: `hub:public-reports-smoke`. **G8550** schema **v13** composes G9670–G9700. **DESIGN §3:** holes over invented widgets; seeded evidence ≠ production verify claims.
- **2026-07-10 — D6390** **WISP nav/wizard chrome shells (G9710).** After reconvert showed modal/map/chart shells cut component holes 171→81, add `DEFAULT_NAV_SHELL_COMPONENTS` / `DEFAULT_WIZARD_SHELL_COMPONENTS` (`data-cwl-nav-shell` / `data-cwl-wizard-shell`) for MainMenu, ModuleWizardMenu, breadcrumbs, filter panels, and multi-step wizards — still no invented live widgets. Gate: `hub:wisp-nav-wizard-shell-smoke`.
- **2026-07-10 — D6391** **WISP showcase bound refresh (G9720) + G8550 v14.** Reconvert after shells: residual **~1115** holes (26 live-widget components + if/each/interp + 39 no-source). Bound fixture schema **v2**; **G8550** schema **v14**. **DESIGN §3:** honest residual; GenieACS out of scope.
- **2026-07-10 — D6392** **Widget shells + showcase hydrate (G9730) + G8550 v15.** Pilot traces are surface stubs (`ok/surface/resource/op` only) — cannot invent live widgets from empty JSON. **Ship:** (1) `DEFAULT_WIDGET_SHELL_COMPONENTS` → `data-cwl-widget-shell`; (2) `fixtures/.../hydrate-samples/*.json` merged when traces are stubs; (3) keyed `{#each}`, `formatCurrency`/`formatNumber` unwrap, simple if settle, widget summary tables; (4) bind hydrates HTML even when load fields already present. Reconvert residual **~738**. **G8550** schema **v15**. **DESIGN §3:** holes over invented controls; samples are explicit showcase data, not oracle claims.
- **2026-07-10 — D6393** **Full-sample hydrate + if/length/bool settle (G9740) + G8550 v16.** Cover all WISP `apiPath`s with hydrate-samples; expand showcase loadBools/constants; settle `===` / `.length` / `&&` / `||` if-holes; only expand `{#each}` when inners fully resolve (no census inflation). Residual **~635**. **G8550** schema **v16**. **DESIGN §3:** unchanged.
- **2026-07-10 — D6394** **Enriched pilot traces + Object.entries/ternary/$store (G9750) + G8550 v17.** `wisp-enrich-pilot-traces` writes rich NDJSON from hydrate-samples; bind merges enriched+legacy corpora; settle `Object.entries(…) as [k,v]`, simple ternaries, `$store` / `?.` lookup. Residual **~564** (39 no-source unchanged). **G8550** schema **v17**. **DESIGN §3:** samples/enriched traces are showcase data, not live production claims; no invented `/add` forms.
- **2026-07-11 — D6395** **IS-T2 LoRA manifest paths are repo-relative posix.** Windows `gpu-lab:prep` previously embedded absolute `C:\…` paths; GPU dry-run then failed with `missing dataset`. `buildLoraTrainManifest` now writes `reports/web-llm/…` relatives; `chrysalis-lora-qlora-train.py` resolves against `CHRYSALIS_GPU_LAB_ROOT` or manifest parents. **Also:** `gpu-lab:gce` syncs the train `.py` into `gpu-lab-artifacts` (test-vm REPO checkout may be stale). **DESIGN §3:** portable artifacts; no environment shortcuts in verify.
- **2026-07-11 — D6396** **Locked public Translation Hub edge (nginx on chrysalis-test-vm).** User-directed: do not deviate. **Hosts:** `hub.agenticop.io` + `chrysalis.agenticop.io` A → **34.61.255.147**. **Site file:** `/etc/nginx/sites-available/chrysalis-hub` only (`docs/nginx/chrysalis-hub.vhost.example`); `proxy_pass http://127.0.0.1:19090`; WebSocket headers; `client_max_body_size 512m`; long proxy timeouts. **TLS:** certbot **webroot** at `/var/www/chrysalis/acme` (email `admin@agenticop.io`) — not certbot `--nginx` rewriting other sites. **After HTTPS:** bind hub `CHRYSALIS_OPERATOR_BIND=127.0.0.1`; optionally close GCE **tcp:19090**. **Forbidden:** edit FDE nginx (`fragility-default-ip`, `fragility-public`), touch **8765**, claim **default_server** on :80. Script: `scripts/gce-hub-nginx-tls.sh` / `pnpm run deploy:hub-caddy-tls`. Docs: `HUB-DEMO-INSTALL.md`, `AGENTICOP.md`. **DESIGN §3:** unchanged (ops edge only).
- **2026-07-11 — D6397** **Live operator hit-rate provenance (G9760) + G8550 v18.** Seeded trajectories satisfy sample floor (**G9670**) but must not claim production hit-rate READY. **Ship:** trajectory `evidenceSource` (`seed` | `hub-convert-verify` | `synthetic-smoke`); analytics `seedJobCount` / `liveVerifiedJobCount`; `productHitRateLiveReady` (≥50 verify-sourced jobs); dashboard honesty; gate `hub:product-hit-rate-live-smoke`. **Also:** LoRA train `fmt()` maps `messages[]` shards (fixes loss=0). **G8550** schema **v18**. **DESIGN §3:** holes over invented claims; seed ≠ live verify.
- **2026-07-11 — D6398** **Live hit-rate READY accumulator (G9770) + G8550 v19.** Batch `web-llm:batch-hub-convert-verify-evidence` runs hub-convert IS routing + `recordConvertVerifyGate` over ≥50 domains using committed verify summary-cache (same mode as hub status smokes — not invented correctness). Seed writes `seed.trajectory.jsonl`; live writes `hub-convert.trajectory.jsonl` (no clobber). Gate: `hub:product-hit-rate-live-ready-smoke`. **G8550** schema **v19**. **DESIGN §3:** seed ≠ live; verify still disposes.
- **2026-07-12 — D6410** **Modal/map shell island chrome (G9903).** Inert `data-cwl-modal-shell` / `data-cwl-map-shell` markers were invisible dead ends. **Ship:** `initShellIslands` — honest dialog chrome (name + “not lifted” body + Close), Tips/Help button openers, map placeholders, scrub residual Svelte junk text; CSS for overlay; gate `hub:wisp-cwl-shell-island-smoke`. **DESIGN §3:** holes/shells over invented Tips/Help/map widgets; GenieACS OOS.

- **2026-07-17 — D6445** **External-call + API-key discovery protocol (deepen desk) + auto-exhaust stop.** Operator: before continuing fidelity deepen, identify calls to external servers/hardware and required API keys — if keys do not exist, document them to the user as a whole (do not invent). **Protocol:** scan Module_Manager + `backend-services` for (1) non-first-party `https?://` hosts, (2) `process.env` / `import.meta.env` secret-shaped names, (3) hardware tokens (SNMP/MikroTik/ACS/TR-069), (4) cross-check `.env.example` documented keys; classify local presence without printing values; emit operator briefing. **Auto-continue:** deepen must not wait for repeated “continue” — run `--until-exhausted` / `hub:fidelity-deepen-until-exhausted` which proposes ×10 rounds (static GET → param GET → golden-backed mutations) until **3 consecutive rounds with zero newly green exact method+path probes**. Empty queue alone is **not** a stop (it only increments the streak toward that 3). **Ship:** `scripts/lib/wisp-external-deps-protocol.mjs`, `scripts/lib/wisp-fidelity-deepen-auto.mjs`, desk `--external-deps` / `--until-exhausted`, fixtures `chrysalis.wisp-external-deps.v1.json` + `chrysalis.wisp-fidelity-deepen-auto-state.v1.json`. Missing key → honest residual / skip — never invent vendors or credentials (**D6442** / **D6441**). **DESIGN §3:** holes over invention; provenance of secrets as names only.
- **2026-07-17 — D6446** **Structural lift tag-end + orphan module modals (UI completeness).** `findPascalComponentTagEnd` must skip `//` / `/* */` comments and template literals (apostrophe in `we're` previously left `<HardwareDeploymentModal` raw). Convert appends module-local orphan `*Modal.svelte` chrome when the page does not reference them (**TransferModal**, **CustomerBillingModal**). Islands prefer lifted hosts over invented shell forms. Queue-empty ≠ complete — deep-lift continues under **D6443/D6444**. **Also:** `hub:wisp-deep-lift-all-holes` force-settles residual `data-cwl-hole` markers (**1805→0**) via bind traces + G9800 empty/omit (never invent widgets).

- **2026-07-15 — D6444** **Origin source corpus + piecemeal convert queue (locked).** Operator: background features live across many files built over time; UI-only convert cannot make the app work. **True method:** (1) ingest **all** origin source files (Module_Manager + sibling `backend-services` for POC); (2) persist a **code database** (SQLite + planning JSON); (3) derive a **convert queue** of pieces (UI routes, module support, API clusters, shared libs); (4) convert **one piece at a time** against that queue — verify/bind or hole — never assume a single route HTML pass covers behavior. **Ship:** `scripts/lib/source-corpus.mjs`, `scripts/build-origin-source-corpus.mjs`, artifacts under `reports/origin-corpus/`, smoke `hub:origin-source-corpus-smoke` (**G9993**). Extends **D6443** (UI authority) with whole-product file authority. **DESIGN §3:** provenance; holes; no invented backends.

- **2026-07-15 — D6443** **Source-authoritative UI conversion method (locked).** Operator: colors/layout exist in source; conversion was still fighting origin with CWL overlays and invented map hosts, and the showcase “didn’t work.” **True method (normative):** (1) read **all** origin UI files (routes + components + styles + vendor islands); (2) lift **per-route CSS** from origin build/SFC styles (**D6365**); (3) lift markup **preserving class names**; (4) preserve vendor islands (**D6441**/ **D6442**); (5) **forbid** CWL overlay CSS from redefining selectors already present in lifted `original-css` for that route; (6) bind origin client behavior or emit a **hole**. Coverage-map ArcGIS host must use origin classes (`.coverage-map-container` / `.map-container`), not invented restyles of `.floating-controls`. Package: `@chrysalis/ingest` `ui-source-authority.ts`; canon §2B. **DESIGN §3:** original look/behavior is authority; holes over invent.

- **2026-07-14 — D6442** **Translate-only fidelity law (reset after map dialectic).** Operator reset: stop inventing. Chrysalis **only translates** source → WebIR/CWL → emit and makes that translation work. **Refuse:** inventing features, alternate map engines, Bing/OSM basemaps when source is ArcGIS, CDN/loader dialects, “helpfulness” patches not present in origin, new POC chrome unless origin requires it for parity. **Vendor SDKs:** preserve source package + toolchain + behavior (**extends D6441**); for WISP maps that means **ArcGIS** (`@arcgis/core`, `topo-vector` / source basemap list + `PUBLIC_ARCGIS_API_KEY`) — **not** Bing, not invented OSM defaults. Missing pieces → **holes**, not substitutes. **Ship:** amend [`UNIVERSAL-TRANSLATOR-CANON.md`](docs/UNIVERSAL-TRANSLATOR-CANON.md) §2A, STRATEGY §0/§12, `AGENTS.md`. **No new invented code under this decision.** **DESIGN §3:** holes over invention; provenance; verify dispose.

- **2026-07-14 — D6440** **`chrysalis chat` CLI + convert-site skip paths.** Finish packaging left unstaged after UT Canon close: `chrysalis chat` delegates to Migration Chat (ungated under `CHRYSALIS_REQUIRE_LICENSE`, same class as `init`/`cwl`); `convert-site --skip-http-path` wires emit-shared `skipHttpPaths` so parity/redirect routes survive markup lift (**G9830**). README points at UT Canon. **DESIGN §3:** verify-gated tools; holes over overwrite.

- **2026-07-14 — D6441** **Preserve third-party vendor islands (do not CDN-rewrite).** Operator rule after ArcGIS CDN/ESM and custom-esbuild breakage: CWL converts app shell/contracts; **SDK add-ins stay as in the source** — same package + source toolchain (WISP: Module_Manager **Vite** + `@arcgis/core`). **Refuse:** Esri AMD CDN, CDN ESM as primary load (testing-only), inventing alternate bundler dialects that diverge from the origin app. **Ship:** `scripts/build-wisp-cwl-arcgis-bundle.mjs` uses Vite from Module_Manager; `wisp-cwl-map.js` loads `/assets/wisp-cwl-arcgis.bundle.js` only (honest fail, no silent CDN fallback); hole `hub-svelte:arcgis-map` summary updated. Applies generically to charts/auth SDKs (`hub-svelte:chart-component`, Firebase holes). **DESIGN §3:** holes over rewriting vendors; provenance of client islands.

- **2026-07-14 — D6439** **UT Canon Waves B–D + program close G9990.** Unblocks **G7690**: (1) Next.js gold/auth-effects honest-skip when **`wptp-emit-nextjs`** absent; (2) CWL **`toCwlIdent`** so file-derived handler names round-trip; (3) multi-origin llmIs reads **`scripts/lib/cwl-svelte-native-convert.mjs`**. **Ship:** Wave B–D close smokes + `hub:ut-canon-program-close-smoke` (**G9990**). **DESIGN §3:** IDENT grammar; named skips; LLM propose never bypasses verify.

- **2026-07-14 — D6438** **Universal Translator Canon locked (G9960–G9990).** Operator amended: full definitive plan is [`docs/UNIVERSAL-TRANSLATOR-CANON.md`](docs/UNIVERSAL-TRANSLATOR-CANON.md). Product = AI-assisted UT through WebIR/CWL; WISP = POC only. Waves A–D (quarantine/genericize → composer → AI assist → engine depth); default build queue in STRATEGY §12. **Ship wave A:** `scripts/lib/*` extract completion, `hub:ut-canon-lock-smoke` / `hub:ut-lib-extract-smoke` / `hub:ut-wave-a-close-smoke`, neutral `cwl:*` package.json aliases. **DESIGN §3:** verify dispose; holes; no WISP in package APIs.

- **2026-07-14 — D6437** **Universal Translator reframing — WISP is POC only.** Explicit operator amendment: product goal is an **AI-assisted universal web translator** (WebIR + CWL hub + LLM/IS propose / verify dispose). WISP Module_Manager is **showcase POC**, not engine core. **Ship:** `docs/initiative-knowledge.v1.json` (+ `scripts/build-initiative-knowledge.mjs`); `docs/UNIVERSAL-TRANSLATOR-PATH.md`; first-wave extract of generic convert libs to `scripts/lib/*` (neutral names) with temporary `scripts/wisp-*` shims. **Queue:** UT/G7690 + Migration OS + origin gold — not new WISP chrome by default. **DESIGN §3:** provenance + verify; holes over invention; WebIR is the product.

- **2026-07-14 — D6436** **management.wisptools.io look + multipage Firebase (G9952).** CWL overlay CSS and SPA `** → /index.html` rewrite made the showcase look unlike Module_Manager and broke multipage static. **Ship:** original-css first / additive overlays; slim login+module chrome; dashboard/login parity without card descriptions; Firebase `management` hosting `cleanUrls` + empty SPA rewrite; stage re-wraps runtime DOCTYPE bodies with chimera shell + client JS; deploy to `hosting:management`. **DESIGN §3:** original CSS is look authority; no SPA catch-all inventing a single route.

- **2026-07-13 — D6435** **Module_Manager depth conversion (G9951).** Prior closes left map API unauthenticated, Module Manager without Coverage entry, and most interactive modals as shells. **Ship:** `wisp-cwl-map.js` loads `/api/network/{sites,sectors,cpe,equipment}` via `WispCwlApi`; sector cones + tower colors; MapControls/FilterPanel; `/modules` directory + dashboard secondary links; PCI/Frequency from sector PCI/EARFCN; marketing discover POST + spatial fallback; inventory scan/transfer; customer add/edit; gate `hub:wisp-cwl-module-depth-smoke`. **Honest residual:** full MM coverage-map add/edit modal trees, monitoring maps, GenieACS OOS. **DESIGN §3:** convert real APIs/actions; no invented ACS/FCAPS.

- **2026-07-13 — D6434** **Convert Module_Manager module buttons (G9950).** Plan/deploy/structural chrome was mostly dead or navigate-only vs Module_Manager handlers. **Ship:** full deploy toolbar (Approved/Projects/Deployed/PCI/Frequency/Hardware/Deploy Plan); plan Create + project lifecycle; Hardware as inventory side panel (not leave map); marketing rectangle → spatial filter over `/api/coverage`+`/api/network` geometry; structural Search/Export/Scan + portal/site links; project-status plans golden; gate `hub:wisp-cwl-module-buttons-smoke`. **Honest residual:** empty `/add` form shells; full PCI/Frequency modals → route/panel honesty; GenieACS OOS. **DESIGN §3:** convert real actions; no invented ACS/FCAPS.

- **2026-07-13 — D6433** **Convert SharedMap↔ArcGIS program interaction (G9949).** Coverage MapView loaded but ignored plan/deploy chrome — orphaned from Module_Manager `SharedMap.svelte` / `arcgisMapController` postMessage protocol. **Ship:** convert iframe contract into `wisp-cwl-map.js` + `wisp-cwl-modules.js` (`state-update`, `request-state`/`map-ready`, `center-map-on-location`, `select-plan`, layer filters, Sketch rectangle draw → `rectangle-drawn`, `asset-click`); gate `hub:wisp-cwl-map-interact-smoke`. **Honest residual:** full sector/CPE renderers + marketing discovery API remain holes (not invented). GenieACS OOS. **DESIGN §3:** convert real interaction code; empty/honesty over fake discovery.

- **2026-07-13 — D6432** **WISP ArcGIS + grind complete (G9947–G9948).** Coverage map was a MapView basemap shell; `/api/coverage` 404’d; ArcGIS config held a mistaken Google `AIza` key; PCI map host + module-access stayed empty. **Ship:** native `/api/coverage` + `/api/module-access` goldens/handlers; network/coverage goldens with honest lat/lng; `wisp-cwl-map.js` GraphicsLayer overlays from APIs (OSM basemap without Esri key); PCI chimera loads map island; module-access table hydrate; gate `hub:wisp-cwl-arcgis-grind-smoke`. **Still refused:** GenieACS; invented geometry/FCAPS matrices; LiteRT. **DESIGN §3:** real ArcGIS JS + real API coords; holes/empty honesty over invention.

- **2026-07-13 — D6431** **Vue App.vue shell CSS (G9946).** Layout sheets did not include SPA/Nuxt `App.vue`. **Ship:** attribute `src/App.vue` with layouted pages; case-insensitive dedupe on Windows; gate `hub:vue-app-shell-css-smoke`; multi-origin close schema **v4**. **DESIGN §3 / D6365:** real shell CSS only.

- **2026-07-13 — D6430** **Angular NgModule providers DI (G9945).** Component `providers` covered; companion `@NgModule` ignored. **Ship:** walk sibling `*.module.ts` providers as `ngmodule` edges/holes (`legacy:markup-lift-angular-di-ngmodule`); `FeatureAudit` fixture; gate `hub:angular-ngmodule-providers-smoke`. **DESIGN §3:** holes over invented services.

- **2026-07-13 — D6429** **Next loading.tsx + next/font honesty (G9944).** Companion route files and fonts were silent. **Ship:** `scanNextCompanionHoles` / `scanNextFontHoles` → holes `legacy:markup-lift-next-loading` / `…-next-font`; fixture `loading.tsx` + layout font import; gate `hub:next-loading-font-smoke`. **DESIGN §3:** holes over invented skeletons/`@font-face`.

- **2026-07-13 — D6428** **Shared multi-origin convert orchestration (G9943).** Tier C blocked on “no per-framework publish forks.” **Ship:** `convertMultiOriginProjects` batches the same `convertSiteProjectUi` options across Vue/Next/Angular fixtures; gate `hub:multi-origin-convert-orch-smoke`; multi-origin close schema **v3**. **DESIGN §3:** shared API over adapters; Angular CSS may skip honestly (`no-frontend-build`).

- **2026-07-13 — D6427** **Vue/Nuxt layout SFC CSS depth (G9942).** Page SFCs lifted `<style>` but Nuxt `layouts/*.vue` stayed unused. **Ship:** `collectVueLayoutStylesheets` + `parseVuePageLayoutName` (`definePageMeta({ layout })`); default vs portal isolation; gate `hub:vue-nuxt-layout-css-smoke`. **DESIGN §3 / D6365:** real layout CSS only; no invented stylesheets.

- **2026-07-13 — D6426** **Angular providedIn + providers DI depth (G9941).** DI graph walked inject edges but ignored `providedIn` scopes and `providers: []`. **Ship:** parse `providedIn` / providers list; holes `legacy:markup-lift-angular-di-provided-in` / `…-di-providers`; component-scoped `LoginLogger`; gate `hub:angular-provided-in-smoke`. **DESIGN §3:** holes over invented DI graphs.

- **2026-07-13 — D6425** **Next layout/globals CSS depth (G9940).** App Router pages already lifted co-located `page.module.css` (**G9930**) but ancestor `layout.tsx` CSS stayed only as orphan fallback. **Ship:** `collectNextLayoutStylesheets` walks root→nested layouts; attributes imported/`layout.css` into each page bundle; drops globals from `_layout` fallback once attributed; fixture root + `app/portal` layouts; gate `hub:next-layout-css-depth-smoke`; multi-origin close schema **v2**. **DESIGN §3 / D6365:** real layout CSS only; nested portal tokens must not leak into `/login`.

- **2026-07-13 — D6424** **Unpause remaining WISP empty-page hydrate (G9932–G9939).** Pause reason in **D6416** satisfied after Vue/Next/Angular language POCs (**G9924–G9931**). **Ship:** structural client hydrate for voice (`/api/voice`), plan counts (`/api/plans`, map stays shell), bundles (`/api/bundles`), permissions/roles (`/api/permissions` — empty-list honesty, no invented FCAPS matrix), CBRS (`/api/network` grants/sites), support-dashboard (`/api/maintain`); fix wrong `routes.cwl`/`inferUiPageApiPath` apiPaths; gate `hub:wisp-cwl-remaining-surface-smoke`. **Still refused:** GenieACS, invented maps/widgets/money/role matrices, LiteRT. Default queue returns to **G8550** / Migration Chat regression. **DESIGN §3:** hydrate from real APIs; holes/empty honesty over invention.

- **2026-07-13 — D6423** **Angular DI graph depth (G9931).** Prior Angular DI holes only noted `inject()` presence. **Ship:** `buildAngularDiGraph` walks relative `inject()`/constructor targets (`LoginComponent→AuthService→SessionStore`); holes `legacy:markup-lift-angular-di-edge` / `…-di-service`; unresolved package tokens listed honestly; wired into Angular structural lift via file path; gate `hub:angular-di-graph-smoke`. **DESIGN §3:** holes over invented services; no fake package DI.

- **2026-07-13 — D6422** **Next App Router CSS depth (G9930).** Next CSS had no adapter — only Vite CSS Modules / Vue / Angular. **Ship:** `nextAppCssAdapter` lifts co-located `page.module.css` + CSS imports without a `.next` build; registered in discover + `UI_FRAMEWORK_CSS_ADAPTERS`; per-route isolation on `fixtures/ui-markup-next`; gate `hub:next-css-depth-smoke`. **DESIGN §3 / D6365:** one bundle per route; no invented styles.

- **2026-07-12 — D6421** **Vue scoped-CSS depth from SFC source (G9929).** Vue CSS lift required a Vite `dist` manifest; markup-only fixtures skipped assets (`no-frontend-build`). **Ship:** `extractVueSfcStyleCss` + `viteVueCssAdapter` SFC fallback; `readStylesheetContent` on CSS adapter contract; descope `:global` / `::v-deep` / `/deep/` / `>>>`; per-route isolation on `fixtures/ui-markup-vue`; gate `hub:vue-scoped-css-depth-smoke`. **DESIGN §3 / D6365:** one bundle per route; no global de-scope collision.

- **2026-07-12 — D6420** **Vue load-bind + Next RSC depth (G9927–G9928).** Shared `hydrateStructuralHtmlFromApiBody` was Svelte-marker-only; Vue `v-if`/`v-for` only stripped attrs (no HTML wrap). **Ship:** Vue/Angular wrap control elements in `data-cwl-hole` markers; hydrate recognizes `vue`/`next`/`angular` interp + `vue-for`/`angular-for` + multi-origin if; `parseEachHeader` accepts `item in items` / `let item of items`; Next async `/dashboard` RSC fixture; gates `hub:vue-load-bind-smoke` · `hub:next-rsc-depth-smoke`; multi-origin close updated. **DESIGN §3:** shared APIs over per-framework forks; holes over invented widgets.

- **2026-07-12 — D6419** **Angular structural-shell depth (G9926) — template + DI holes.** Angular shell smoke was static-login shallow. **Ship:** `liftStructuralAngularTemplateHtml` / `scanAngularTsForDiHoles` with holes `legacy:markup-lift-angular-{if,for,interp,event,bind,component,async,di}`; companion `.component.ts` via `inject()`; static refuses dynamics; `hub:angular-structural-shell-depth-smoke`; folded into `hub:multi-origin-lift-close-smoke`. **DESIGN §3:** holes over invented widgets/services.

- **2026-07-12 — D6418** **Vue/Next structural-shell depth (G9924–G9925) — named holes, no silent strip.** Vue/Next “structural-shell” smokes were static-login shallow; Next previously stripped `{…}` silently. **Ship:** `liftStructuralVueTemplateHtml` / `liftStructuralNextPageJsx` with holes `legacy:markup-lift-vue-{if,for,interp,event,bind,component}` and `legacy:markup-lift-next-{interp,component,client,rsc}`; static Next/Vue refuse dynamics; fixtures + `hub:vue-structural-shell-depth-smoke` / `hub:next-structural-shell-depth-smoke`; folded into `hub:multi-origin-lift-close-smoke`. **DESIGN §3:** holes over invented widgets; no silent best-effort strip.

- **2026-07-12 — D6417** **Migration Chat + AI Assist packaging; LiteRT.js refused.** User-directed: interactive CLI/hub chat like an AI session; state that Chrysalis works best with AI; do **not** adopt LiteRT.js (browser `.tflite` runtime — wrong class for convert/repair; optional CWL app demos forever out of convert substrate). **Ship:** `chrysalis chat` / `pnpm run chrysalis:chat`; hub `/migration-chat` + `/api/hub/migration-chat/*` + `aiAssist` on `/api/config`; [`docs/AI-ASSIST.md`](docs/AI-ASSIST.md); gate `hub:migration-chat-smoke`. **DESIGN §3:** models propose; verify disposes; no verify bypass.

- **2026-07-12 — D6416** **Admin/monitor/deploy surface (G9917–G9920) + pause WISP hydrate grind.** Users/tenants from `/api/users`+`/api/tenants`; monitoring/HSS list hydrate (path override away from `/api/monitoring/graphs`); deploy control counts from `/api/deploy` (map stays shell); dashboard CORE/ADMIN catalog; scrub orphan `}` after shells. Gate: `hub:wisp-cwl-admin-surface-smoke`. **Operator amendment:** further WISP empty-page hydrate is **paused** — remaining fidelity needs real-world language POCs beyond WISP. Default queue returns to multi-origin / language substrates + **G8550**. **DESIGN §3:** hydrate from real APIs; no invented maps; GenieACS OOS.

- **2026-07-12 — D6415** **Ops/billing showcase surface (G9913–G9916).** Help-desk + maintain hydrate from `/api/maintain` (tickets + `report.summary`); billing plans/invoices from `/api/customer-billing` only; scrub residual `svelte:*`, literal `\r`, mojibake after `←`; expand live hydrate API probe. Gate: `hub:wisp-cwl-ops-surface-smoke`. **DESIGN §3:** hydrate from real APIs; no invented money/maps; GenieACS OOS.

- **2026-07-12 — D6414** **Showcase route depth (G9910–G9912).** Empty dashboard module/admin cards hydrate from known CWL routes (+ merge `/api/admin.modules` by id); scrub broken SVG closes `<//modules/…>`; sites use `/api/network`, work-orders structural hydrate (`workOrders` + `.work-orders-grid`). Gate: `hub:wisp-cwl-route-depth-smoke`. **DESIGN §3:** hydrate from real APIs/routes; no invented GenieACS modules.

- **2026-07-12 — D6413** **Convert all CWL shells at once (G9909).** One client pass converts modal/wizard/nav (overlay) + map/chart/widget (inline) shells; auto Tips/Help/wizard openers in header-actions; hydrated widgets keep summary tables with caption. Gate: `hub:wisp-cwl-all-shells-smoke`. **DESIGN §3:** honest shells over invented live widgets/maps/charts.

- **2026-07-12 — D6412** **WISP showcase depth G9905–G9908.** Secondary stats + list hydrate from API `stats`/items (customer-grid + injected table); residual attr/SVG scrub (`"}`, `on:submit|`, broken path tags); wizard/nav shell openers; empty filter/dropdown honesty. Gate: `hub:wisp-cwl-showcase-depth-smoke`. **DESIGN §3:** hydrate from real APIs; shells over invented filters/wizards.

- **2026-07-12 — D6411** **Scrub Svelte arrow-fn markup leaks (G9904).** Structural shell replace used `[^>]*`, so `on:select={() => x = true}` truncated at `=>` and left visible ` true}` / `/>` in HTML. **Ship:** brace-aware PascalCase tag scan; `scrubStructuralMarkupArtifacts`; fixture scrub; gate `hub:wisp-cwl-markup-artifact-smoke`. **DESIGN §3:** holes/shells over corrupted markup.

- **2026-07-12 — D6409** **Multi-module structural island hydrate (G9902).** Extend G9900 beyond hardware: inventory/customers/sites page classes + path→`/api/*` (path wins over wrong traced `apiPath`); Refresh/Add chrome on those shells; live contract smoke. Gates: `hub:wisp-cwl-island-fidelity-smoke` (schema v2), `hub:wisp-cwl-island-live-hydrate-smoke`. **DESIGN §3:** hydrate from real APIs; no invented widgets; GenieACS OOS.

- **2026-07-12 — D6408** **CWL island/event fidelity + Next.js shared API (G9900–G9901).** Structural-shell pages (hardware) are not `.wisp-module-demo` — client must bind islands + hydrate `/api/*` and chrome events (Refresh → reload, Add Hardware → `/add`). **Ship:** `initStructuralModulePages` in `wisp-cwl-client.js`; gate `hub:wisp-cwl-island-fidelity-smoke`. Next.js App Router adapter `next-app` on `convertSiteProjectUi` (same multi-origin path as Vue/Angular); fixture `fixtures/ui-markup-next`; gate `hub:next-structural-shell-smoke`. **DESIGN §3:** CWL is the product; no invented widgets; GenieACS OOS.

- **2026-07-12 — D6407** **CWL-native visual depth (G9890–G9892).** Live hardware page used only `wisp-cwl-app.css` because (1) style map loaded from repo `fixtures/…` path that does not exist on GCE POC dir, (2) `original-css/` omitted from deploy tarball. **Ship:** gateway loads `wisp-cwl-original-css-map.json` beside itself; `syncWispOriginalCssAssets` into fixture+bundle; deploy packs `original-css` + map; Angular shared-API smoke; `hub:wisp-cwl-visual-depth-smoke`. **DESIGN §3:** CWL is the product; CSS lift is part of conversion fidelity.


- **2026-07-12 — D6406** **Multi-origin lift depth (G9850–G9870).** Deepen `wisp:svelte-native-convert` (integrity + IS routing + report schema v2); gates `hub:svelte-native-convert-close-smoke`, `hub:svelte-native-llm-is-smoke`; first non-Svelte shared-API proof `hub:vue-structural-shell-smoke` on `fixtures/ui-markup-vue`. Complements **D6405**. **DESIGN §3:** verify disposes; no sidecar as product; GenieACS OOS.

- **2026-07-12 — D6405** **Svelte → CWL actual build (no sidecar as product) + multi-origin expansion (G9840).** Operator amendment: conversion experience must be **CWL in the build**, not a SvelteKit sidecar that masks lift debt. **Ship:** [`docs/SVELTE-CWL-CONVERSION-LESSONS.md`](docs/SVELTE-CWL-CONVERSION-LESSONS.md) (failures: force-demo, hybrid sidecar, brace integrity, auth/API); [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](docs/MULTI-ORIGIN-LIFT-EXPANSION.md) (G9840–G9880); default operator pipeline `svelteSidecar: false`, `cwlNativePrefixes: *`, `operatorUi: cwl-native`; `wisp:svelte-native-convert` + entry smoke; LLM/IS wired as accelerate-only (verify still disposes). Sidecar opt-in via `CHRYSALIS_WISP_SVELTE_SIDECAR=1` for diff only. GenieACS still OOS. **DESIGN §3:** holes over invention; CWL authoritative; WISP is showcase.

- **2026-07-11 — D6402** **Structural-shell convert defaults to force-settle (G9810).** `convertSiteProjectUi` force-settles residual markup holes after patch (even without oracle traces) so reconvert no longer leaves ~1k hole markers; opt out with `forceSettleResidualHoles: false`. Complements **D6401**. **DESIGN §3:** empty/omit ≠ invented widgets.

- **2026-07-11 — D6403** **GPU lab adapter fetch + honest status (G9820).** Real train wrote `STATUS_OK` while status `tail` showed weight-load bars (misleading). **Ship:** orchestrator `fetch_adapter` before `stop_gpu` + `train-result.v1.json`; `gpu-lab:gce:status` via `gce-gpu-lab-status-remote.sh` (`ADAPTER_PRESENT`, milestones, no bar spam; Windows-safe single-line SSH); recover script; `gce-fetch-reports` always pulls `reports/web-llm/lora`. **DESIGN §3:** operator honesty; no verify shortcuts.

- **2026-07-11 — D6404** **WISP apply/deploy integrity (G9830).** Live demo publish hit 501 on `/login`+`/dashboard` and a dead-end `/` auth spinner. Root causes: (1) `replaceRouteHandlerBlock` counted `{`/`}` inside `return html "…"` → leftover HTML as `cwl:unknown-statement`; (2) deploy `prepareWispCwlDeployBundle` re-ran parity lifts *after* client redirects, wiping `/` navigation. **Ship:** string-aware brace match; client redirects **last** in full-build + deploy bundle; `inspectRoutesCwlIntegrity` / post-brace junk gate; smoke `hub:wisp-cwl-routes-integrity-smoke`. **DESIGN §3:** holes over silent best-effort; operator path must not corrupt CWL.

- **2026-07-11 — D6401** **Fill all residual WISP markup holes (G9800) + G8550 v22.** User: "fill all holes." **Ship:** `hydrateStructuralHtmlFromApiBody({ forceSettle })` / `bindSiteProjectLoadFromTraces({ forceSettleResidualHoles })` — expand each with residual inners, omit unknown ifs, empty opaque interp/handlers, last-resort strip; hydrate pages without traces via showcase constants. Residual **0** (was ~447). Empty `/add` form shells unchanged. Bound schema **v8**. **G8550** schema **v22**. **DESIGN §3:** empty/omit ≠ invented widgets; GenieACS still OOS.

- **2026-07-11 — D6400** **WISP /add form shells + opaque settle (G9790) + G8550 v21.** User amendment: close residual buckets (1) no-source `/add`, (2) opaque expressions, via general CWL/engine APIs — not GenieACS. **Ship:** `buildNoSourceFormShellHtml` / `applyNoSource…({ formShell: true })` — empty chrome (title, back, disabled Save) with **no invented fields**; hydrate `getX()` aliases, broken `Object.entries(… ?? )`, `.slice(0,n)` each, `getStatusCount`. Bound schema **v7**; **G8550** schema **v21**. **DESIGN §3:** empty shells ≠ invented widgets; GenieACS still OOS (**D6205**).

- **2026-07-11 — D6399** **WISP residual settle (G9780) + G8550 v20.** Fill fillable expression debt without inventing `/add` forms: `||` coalesce, numeric / `.length` inequality ifs, nested each+if hydrate, `formatDateTime`, percent `toFixed`. Residual **~517** (was ~564); **39** no-source unchanged; GenieACS out of scope. Bound schema **v6** band **495–535**. Gate: `hub:wisp-fill-holes-smoke` + `hub:wisp-showcase-bound-smoke`. **G8550** schema **v20**. **DESIGN §3:** holes over invented widgets.

- **2026-07-09 — D6376** **Migration OS close composes IS live + Cyno substrate (G8550 schema v6).** After **D6375** closed **G9520–G9550**, fold those gates (plus **G9510** live analytics) into `hub:migration-os-close-smoke` so the operator composite regresses hit/near-miss/miss, salience, utility prior, convert governor, and aim persistence in one command. **Also:** `verifySiteScaleMatrix` treats page/route oracle corpora with **no `/api` GET successes** as skip `no-api-gets` (not fail) — Open Legacy backend fixtures must not fail whole-site matrix. **Citation:** CynoEngine-inspired slices keep `CYNOENGINE_ATTRIBUTION`. **DESIGN §3:** unchanged — verify still disposes.

- **2026-07-09 — D6375** **CynoEngine-inspired IS/convert substrate (G9520–G9550) — ideas in; codebases apart.** Implements the **D6374** queue with transparent citation on every surface. **Upstream:** [nimbus7772017/CynoEngine](https://github.com/nimbus7772017/CynoEngine). **Ship:** (1) **G9520** `scoreNearMissCandidates` / salience-ranked near-miss in `resolveShorthandWithTransfer` — tag/route/digest/authority/novelty mix; trajectory `nearMissScore` / `nearMissFeatures` / `collaborationAttribution`; never `skipLlm` on near-miss. (2) **G9530** `chrysalis.web-llm.is-utility` Beta prior from verify graded outcomes only; down-rank donors below floor; hub verify-apply records utility. (3) **G9540** `classifyConvertAction` / `governConvertAction` GREEN/YELLOW/RED/DENY; RED needs confirm + verify green; wired into hub apply. (4) **G9550** `createConvertAim` / `evaluateAimDrive` / `shouldStallAfterRound` — refuse contentless “proceed” without aim; persist aim on hub IS routing trajectory. **Gates:** `hub:is-near-miss-salience-smoke`, `hub:is-utility-prior-smoke`, `hub:convert-governor-smoke`, `hub:convert-aim-persist-smoke`. **Citation:** `Inspired by CynoEngine (…) — adapted to WebIR/oracle dispose. Not a code port.` **Non-goals:** merge CynoEngine; import lake/souls; replace oracle with salience. **Privacy:** still do not edit Cyno `.gitignore`. **DESIGN §3:** verify still disposes.

- **2026-07-09 — D6374** **CynoEngine × Chrysalis collaboration program (ideas in; codebases apart).** User-directed: incorporate Cyno-inspired retrieval/governance ideas into Chrysalis; cite CynoEngine; update collab issues. **Plan:** [`docs/CYNO-CHRYSALIS-COLLAB.md`](docs/CYNO-CHRYSALIS-COLLAB.md) — queue **G9520** near-miss salience → **G9530** outcome→utility → **G9540** convert governor → **G9550** aim persistence. **Upstream:** [nimbus7772017/CynoEngine](https://github.com/nimbus7772017/CynoEngine). **Stance:** port laws into `@chrysalis/web-llm` / hub scripts with smokes; **do not** merge repos or import lake/souls/prod topology. **Privacy:** Chrysalis does **not** modify CynoEngine `.gitignore` or push lockout files into their tree — instance privacy remains the Cyno maintainers’ choice; we only publish recommendations in our docs/issues. Collab: CynoEngine#1, chrysalis#54. **DESIGN §3:** verify still disposes; salience never replaces oracle.

- **2026-07-09 — D6373** **Program cohesion under AgenticOp-io (one org, one Project, many repos).** User-directed: fractured `theorem6/*` vs `AgenticOp-io/*` homes block contributors. **Action:** transfer all WPTP siblings (`wptp-ir`, `wptp-matrix`, `wptp-adapter-openapi`, `wptp-adapter-browser`, `wptp-emit-nextjs`, `wptp-emit-hono`, `wptp-emit-fastify`) from **`theorem6`** → **`AgenticOp-io`**; link those repos plus `chrysalis`, `WISP-Management`, `fragility-discovery-engine`, `agenticops-web`, `Bandwidth-Test-Manager` to org Project **[Web Platform Translation Program](https://github.com/orgs/AgenticOp-io/projects/1)**; Chrysalis CI/docs/scripts clone **`AgenticOp-io/wptp-*`**. **Canonical contributor entry:** [`docs/PROGRAM-HOME.md`](docs/PROGRAM-HOME.md). Repos stay separate (WPTP blast-radius policy unchanged); planning and access are unified. GitHub redirects old `theorem6/wptp-*` URLs. **DESIGN §3:** unchanged (metadata / org layout only).

- **2026-07-09 — D6372** **IS live analytics + near-miss transfer (G9510) — evidence over compression theater.** User-directed after external critique: ship trajectory analytics (**hit / near-miss / miss** + **verifyCostMs**) on live-shaped jobs; retire **compressionFactorVs7BWeights** as a marketing primary (keep as storage analogy only). **Capability:** `@chrysalis/web-llm` `summarizeIsLiveAnalytics` / `extractIsLiveJobsFromTrajectory` (artifact `chrysalis.web-llm.is-live-analytics`); trajectory schema **v2** fields `isCacheOutcome`, `verifyCostMs`, `sourceDigest`, `nearMissDomainId`; `resolveShorthandWithTransfer` / catalog-aware `resolveShorthandForTask` (exact hit → `skipLlm`; near-miss → replay donor + **hole-delta LLM only**, never skip verify); `demoteShorthandsForDomain` / `demoteShorthandInRepo` on verify-fail or source-digest mismatch. Hub convert logs cache outcome + verify wall time; auto-demotes on fail. Static shorthand hub leads with live rates, not × vs 7B. **Gate:** `hub:is-live-analytics-close-smoke`. **Honest bound:** close smoke uses a synthetic live-job trajectory; production hit rate still requires real operator jobs writing the same fields. **DESIGN §3:** verify still disposes — `skipLlm` never bypasses gates.

- **2026-07-09 — D6371** **Fill fillable WISP markup holes (G9500) — balanced control-flow, showcase settle, static inline; never invent widgets.** User amendment after G9490: "yes fill all holes." **Honest bound:** cannot fill modals/wizards/maps/complex expressions / GenieACS / no-source `/add` without inventing UI (§3 item 6). **Filled:** (1) balanced `{#if}`/`{#each}` parsing (`findNextSvelteBlock`) — eliminates fake `/if`/`/each` interp holes from nested blocks; (2) `DEFAULT_SHOWCASE_LOAD_BOOLS` settles loading/error/modal-open flags through `liftUiMarkup` structural opts; (3) `indexSvelteComponentSources` + `DEFAULT_STATIC_INLINE_COMPONENTS` inline fully-static components; (4) `parseCwlLoadScalars` merges load fields into structural hydration; (5) first-occurrence CWL block replace so patches never multiply `@page` routes. **Gate:** `hub:wisp-fill-holes-smoke`. **Result on WISP fixture:** ~1260 declared holes (0 fake `/if`, 0 settled loading/error ifs, 39 no-source). **GenieACS permanently out of scope** (**D6370**).

- **2026-07-09 — D6370** **Finish remaining WISP showcase holes on product APIs (G9490); GenieACS permanently out of scope.** User amendment after G9480: GenieACS is **standalone C** (WISPTools legacy) and **must always stay out of Chrysalis scope** — not deferred, not “finish later.” Finish the **rest** of the in-scope showcase: **(1) Layout passthrough** — `liftStructuralSveltePageHtml` unwraps pure layout gates (`TenantGuard` via `DEFAULT_LAYOUT_PASSTHROUGH_COMPONENTS`) without inventing modal/widget bodies. **(2) Structural HTML hydration** — `hydrateStructuralHtmlFromApiBody` / `resolveJsonPath` fill simple interp holes and expand `{collection as item}` each-holes from traced JSON; `hydrateDemoHtmlFromApiBody` still handles demo shells then delegates. **(3) Island events** — `collectIslandEventBindings` binds nested `data-cwl-on-*` inside `data-cwl-island` (RFC-0019 emit shape). **(4) Static export** — `wisp-cwl-static-export` loads `uiAssets` so exported HTML gets the G9470 document shell. **Gate:** `hub:wisp-remaining-holes-finish-smoke`. **Honest residual:** modals/wizards/maps/charts, complex `{#if}` / expressions, Firebase auth remain holes; GenieACS never enters the queue. **DESIGN §3 item 6:** holes over invented widgets.

- **2026-07-09 — D6369** **WISP whole-site finish on product APIs (G9480) — no-source holes, load-bind seed, CSS serve, mid-token HTML guard.** User amendment after G9470: "all of it" — finish the three remaining slices without inventing demo forms. **(1) No-source holes:** `@chrysalis/emit-shared` `applyNoSourceMarkupHolesToCwlSource` / `buildNoSourceMarkupHoleHtml` replace synthetic `/add` demo shells with `legacy:markup-no-source-route` markers (`data-cwl-route`, detail text avoids bare load-field identifiers). WISP `buildWispModuleAddRouteBlock` emits the same hole HTML. **(2) Load-bind seed:** `@chrysalis/ingest` `inferUiPageApiPath` + `seedApiPathsIntoCwlSource`; `bindSiteProjectLoadFromTraces({ seedApiPaths })` seeds missing `apiPath` before binding pilot traces. **(3) CSS:** product `liftProjectUiAssets` + G9470 document shell on the WISP fixture tree. **(4) Mid-token guard:** `splitCwlHtmlTemplate` must not substitute load/path/query ids inside hyphenated tokens, and must not walk back (that duplicated prefixes: `legacy:markup-no-` + `markup-no-source-route`). Hyphen smoke schema v2 asserts hole attribute integrity. **Gate:** `hub:wisp-whole-site-finish-smoke` (skips if WISP root missing). **Honest claim:** 87 source pages + CSS serve + traced load bind + explicit holes for ~39 routes without `+page.svelte`; component behavior / live widgets remain holes until G9490; **GenieACS permanently out of scope** (**D6205** / **D6370**). **DESIGN §3 item 6:** holes, not invented demos.

- **2026-07-09 — D6368** **Document-shell CSS wiring for CWL serve/export (G9470).** After G9460 structural markup lift, pages still rendered unstyled on the product path: `convertSiteProjectUi` lifted CSS into `.chrysalis/ui-assets/` and patched HTML bodies, but **no package** injected `<link rel="stylesheet">` or served the CSS files — only the WISP chimera gateway did (showcase-only). **Capability:** `@chrysalis/emit-shared` `wrapHtmlFragmentWithDocumentShell`, `resolveRouteStylesheetHrefs` (route **+** layout fallback per D6365 rule 5), `loadUiAssetLiftArtifacts`; `@chrysalis/runtime-cwl` `uiAssets` config / `loadCwlUiAssetsFromProject` wraps HTML responses and serves `/assets/original-css/*` (+ optional `original-assets`). CLI `chrysalis-cwl-serve` auto-loads `.chrysalis/ui-assets` beside the CWL file or via `--project`. G9450 close smoke asserts document shell + CSS HTTP 200. WISP chimera `wispOriginalCssLink` updated to emit route+fallback links. **DESIGN §3 item 3:** no backend-hardcoding — emit-shared owns the link tags; runtime-cwl is one consumer.

- **2026-07-09 — D6367** **Structural-shell UI markup lift (G9460) — lift interactive pages with explicit holes.** User amendment after G9450: "lift all using the product. if the product cannot, build the capability." Static markup lift (`liftStaticSveltePageHtml`, G9306) skipped **78/87** WISP `+page.svelte` files because residual `{#if}` / `{#each}` / `{interp}` / PascalCase components failed the static gate — leaving demo shells in CWL. **Capability:** `liftStructuralSveltePageHtml` + `liftUiMarkup({ mode: "structural-shell" })` keep layout HTML (classes, structure) and replace dynamics with `data-cwl-hole="legacy:markup-lift-svelte-*"` markers + recorded `holes[]` on `UiMarkupBundle` (`liftMode: "static" | "structural-shell"`). Attribute mustaches are scrubbed with balanced-brace parsing (never inject hole elements into `class="..."`). Default for `convertSiteProjectUi` is **`structural-shell`** so whole-site convert no longer silently skips interactive pages; CLI `chrysalis ui-markup --mode structural-shell` and `chrysalis convert-site --markup-mode …`. Static mode remains the default for `chrysalis ui-markup` alone (parity with G9306 fixtures). **Ownership:** `@chrysalis/ingest` `ui-markup-svelte-structural.ts`; `@chrysalis/webir` bundle fields. **Honest claim:** all WISP source pages produce markup bundles and patch matching `@page` handlers; synthetic `/add` routes without a `+page.svelte` become explicit no-source holes (**D6369** / **G9480**); component *behavior* and live widgets remain holes until component lift. **DESIGN §3 item 6:** holes, not invented widgets.

- **2026-07-09 — D6366** **Whole-site CWL conversion program (G9400); proof is last.** User amendment after attempting a full WISP→CWL conversion: the process is **not complete** — many routes remain demo shells, live API data is not bound into pages, and demo/proof gates must not be mistaken for product closure. **Program:** ingest an entire site (backend + frontend build) and export a **working CWL site** in a different language; WISP remains showcase only (**D6205**). **Normative ordering:** (1) backend port (`port-site` / WebIR → `migration.cwl`); (2) `liftProjectUiAssets` + `liftProjectUiMarkup` → `.chrysalis/ui-assets/` + `.chrysalis/ui-markup/`; (3) `convertSiteProjectUi` patches `@page` bodies; (4) **`bindSiteProjectLoadFromTraces`** (**G9430**) merges oracle-traced API JSON into `load { }` and hydrates demo HTML when a corpus exists; (5) **`verifySiteScaleMatrix`** (**G9440**) checks on-disk UI CSS/markup artifacts + API GET index + load-bind evidence as one project matrix (missing layers skip; present failures fail); (6) verify replay when corpus exists; (7) **proof/demo closure last** — **`hub:whole-site-cwl-close-smoke`** (**G9450**, closed 2026-07-09) composes G9420–G9440 + **`runtime-cwl`** serve of `fixtures/site-scale-matrix` (HTML + `cwl-page-load` sidecar). Public hub demo / WISP visual parity / GCE deploy remain showcase or operator regressions, not silent “whole WISP converted” claims. **Ownership:** `@chrysalis/ingest` `site-convert.ts` / `site-load-bind.ts`; `@chrysalis/verify` `site-scale-matrix.ts`; program doc [`docs/WHOLE-SITE-CWL-CONVERSION.md`](docs/WHOLE-SITE-CWL-CONVERSION.md). **Repo visibility:** `AgenticOp-io/chrysalis` returned to **private** (2026-07-09) while conversion work was incomplete — external contributors were only `theorem6` + `dependabot[bot]`. **Refused:** treating G9300 adapter closure or stub-free route scans as "whole site converted."
