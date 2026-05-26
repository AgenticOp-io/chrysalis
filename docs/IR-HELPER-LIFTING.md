# IR helper lifting (design pass)

**Status:** **B1** done; **B2 v0** (call-effect body canonicalization) on `main`. **B3** semantic merge remains backlog.  
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
| **B3** | Semantic key + effect-proof merge for near-duplicates (ROADMAP “future”) |

## Decision

Track implementation under **ROADMAP** row **B** and GitHub issue **#3**. Land only after **B2** has verify-backed fixtures; **B3** needs Architecture board sign-off on equivalence rules.
