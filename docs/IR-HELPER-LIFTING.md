# IR helper lifting (design pass)

**Status:** **B1–B5.5 v7** on `main` (fixtures + Vitest + simulate + oracle/replay gates + parametric lib-helper inlining + emit **`lib-helpers.ts`** on Hono/Fastify). Ingest normalizes SQL whitespace, keyword case (quote-aware), and inlines lib query helpers at call sites. Hub: **semantic smoke v5** (`sql-param-inline`) and **emit replay twin gate** (sql-same + sql-case + param-inline twins) in completion batch (**G2303–G2304**).  
**Related:** **D283** structural dedupe (`dedupeStructuralSubgraphsInModule`), **D294** origin-insensitive dedupe CLI, **ROADMAP** post-2.0 row **B — IR helper lifting**.

## Problem

Large PHP codebases repeat helper logic across route files (`lib/`, `vendor/`, and top-level functions in handlers). Today:

1. **Per-file lowering** — each route handler inlines or calls helpers; effects merge via **`buildCallEffectMap`** fixpoint (**`library-effects.ts`**).
2. **Structural dedupe (D283)** — only merges **identical** subgraphs (optionally ignoring **`origin`**). Helpers that differ by constant, variable name, or line-level structure stay duplicated in WebIR.

**Goal:** Lift **semantically equivalent** helper bodies into **shared WebIR** nodes when safe, reducing module size and making emit/verify fingerprints more stable — without violating **DESIGN §3** (holes, provenance, oracle-backed semantics).

## Non-goals

- Cross-file “best effort” merge when effects or provenance cannot be proven equivalent.
- Lifting that bypasses the oracle or weakens replay (e.g. merging helpers with different SQL literals without explicit proof).
- Neutral IR hub types on Chrysalis `main` (WPTP **`wptp-ir`** remains the interchange venue).

## Preconditions (must hold before merge)

| Gate | Requirement |
| --- | --- |
| **Effects** | Union of **`EffectSet`** from both bodies identical (same tags, same table keys). |
| **Provenance** | Merged node carries **union** of provenance entries; no silent drop of PHP file/line. |
| **Holes** | If either body contains a **`data.hole`**, do not lift (or lift only hole-free regions). |
| **Oracle** | Fixture route(s) that call the helper still **verify** at current threshold after lift (ingest → emit → replay). |
| **Origin policy** | Default: require structural key match **with** origin; opt-in **`ignoreOrigin`** only where D283 already allows. |

## Proposed approach (v0)

1. **Candidate discovery** — During ingest, index top-level functions in `lib/**`, vendor autoload paths, and route-file helpers by **normalized body key** (extend **`mergeDedupeStructuralKey`** or a new **semantic key** that hashes effect tags + statement shape, not only structural equality).

2. **Equivalence class** — Group functions with identical **effect signature** + **compatible structural hash**. Members with different origins but same structure → same class as D283 ignore-origin.

3. **Lift pass** — After per-file lowering, replace duplicate function bodies with **`data.ref`** (or shared subgraph id) to a canonical **`ModuleBuilder`** node; update **`buildCallEffectMap`** to resolve refs.

4. **CLI** — **`--ingest-lift-shared-helpers`** (default **off**); requires **`--ingest-dedupe-structural-subgraphs`** or documents ordering relative to dedupe.

5. **Tests** — Golden under **`fixtures/`** with two routes calling the same lib helper; expect **`nodes.size`** drop and **zero holes**; **`chrysalis verify`** on tiny fixture.

## Phasing

| Phase | Deliverable |
| --- | --- |
| **B0 (done)** | D283 dedupe + ignore-origin CLI |
| **B1** | **Done:** **`fixtures/lift-helper-gap-probe/`** + **`fixtures/lift-helper-dedupe-control/`**; Vitest **`packages/ingest/tests/lift-helper-gap-probe.test.ts`** |
| **B2** | **Done (v0):** **`liftSharedHelpers`** / CLI **`--ingest-lift-shared-helpers`** (requires **`--ingest-dedupe-structural-subgraphs`**); fixture **`fixtures/lift-helper-lift-twin/`** |
| **B2.5** | **Done (v0):** origin-sensitive helper lift — **`liftSharedHelpersIgnoreOrigin: false`** / CLI **`--ingest-lift-shared-helpers-respect-origin`** (requires lift); twins in different files are not aliased (**`lift-shared-helpers.test.ts`**, **`ingest-lift-shared-helpers-cli.test.ts`**) |
| **B3** | **Done (v0):** local-name slot normalization + **`--ingest-lift-shared-helpers-semantic`**; **`lift-helper-gap-probe`** aliases |
| **B4** | **Done (v0):** **`embedSharedHelperBodiesInModule`** / CLI **`--ingest-embed-shared-helper-bodies`** (requires structural dedupe) — merges lib/vendor helper bodies as extra module roots via **`mergeWebIrModules`**, then **`dedupeStructuralSubgraphsInModule`**. Pair emit-time **`--emit-dedupe-identical-handler-bodies`** (**D282**) for handler TS shrink. |
| **B5** | **Done (v0):** formal-parameter read slots in **`buildHelperLiftLocalSlotMap`** — twins that differ only by param names on a **direct return** (no intermediate locals) alias under **`--ingest-lift-shared-helpers-semantic`**. Fixture **`fixtures/lift-helper-param-twin/`**; Vitest **`lift-helper-param-twin.test.ts`**. |
| **B5.2** | **Done (v1–v2):** scale-by-2 (`P * 2` ≡ `P + P`) and commutative `+`/`*` reorder in semantic keys; guards **`arith_gamma`**, **`comm_*`** twins. |

## B5 semantic widening tiers

| Tier | Rule | Status |
| --- | --- | --- |
| **B5 v0** | Register **`data.param`** reads as order-based slots (extends B3 assign-target slots). Aliases bodies whose lowered IR differs only by formal parameter **names** on direct returns. | **Done** — **`registerParamRead`** in **`lift-shared-helpers.ts`**. |
| **B5.1** | Extend slot map to param reads inside nested expressions when no assign introduces a local (same order walk). | Deferred — v0 walk already visits all operands. |
| **B5.2** | Arithmetic / structural equivalence (constant folding, commutative reorder) with identical effect signatures. | **Done (v1–v2)** — scale-by-2 + commutative `+`/`*`; broader folding deferred. |
| **B5.3** | Oracle-backed proof for SQL literal or side-effect twins. | **Done (v1–v5)** — **`bodyHasIrEffects`** disables arithmetic widening; **`fixtures/lift-helper-sql-twin/`** negative control; **`normalizeSqlLiteralForHelperLift`** aliases whitespace-only SQL twins (**`sql-ws-twin`**, **`sql-same-twin`**); **v4:** **`simulateHandler`** proves alpha/beta twins match under semantic lift; **v5:** oracle capture + twin body/SQL parity gate (**`verify-lift-helper-sql-same-twin-oracle.mjs`**). |
| **B5.4** | SQL keyword case normalization for effectful semantic lift keys. | **Done (v1–v6)** — keyword uppercasing after whitespace collapse; **v2:** oracle twin verify; **v3:** quote-aware literals; **v4:** escaped-quote Vitest; **v5:** backtick identifiers; **v6:** line/block SQL comments. |
| **B5.5** | Ingest inlining of lib helpers whose body is **`return <effect.db.query>`** (zero-arg, parametric, or assign-then-return). | **Done (v1–v7)** — **`tryInlineLibHelperCall`** + **`HelperBodyEntry`**; replay twins; parametric/chain bodies; **v5.1:** negative control (**`sql_param_noinline`**); **v6:** skip effect-free prelude expr stmts (**`sql_param_prelude`**); **v7 (G2318–G2319):** emit **`lib-helpers.ts`** for non-inlinable helpers + effectful-prelude control (**`sql_param_sideeffect`**). |

## Hub gates (G2303–G2304)

| Script | Role |
| --- | --- |
| **`hub-ir-helper-lifting-semantic-smoke.mjs`** | Schema **v5** — ingest lift batch over gap-probe, param/sql twins, and **`lift-helper-sql-param-inline`**; expects zero holes. |
| **`hub-ir-helper-lifting-replay-twin-smoke.mjs`** | Schema **v2** — runs **`verify-lift-helper-sql-same-twin-replay`**, **`verify-lift-helper-sql-case-twin-replay`**, and **`verify-lift-helper-sql-param-inline-replay`**; wired as **`irHelperLiftingReplayTwin`** in hub completion (**`irHelperLiftingReplayTwinOk`** passes on **`no-php`** skip). |

Both are invoked from **`hub-completion-heavy-smokes.mjs`** and surfaced in the capability matrix / delivery dashboard.

## Decision

Track implementation under **ROADMAP** row **B** and GitHub issue **#3**. Land only after **B2** has verify-backed fixtures; **B3** needs Architecture board sign-off on equivalence rules.
