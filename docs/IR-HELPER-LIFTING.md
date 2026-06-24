# IR helper lifting (design pass)

**Status:** **baseline closed (2026-06-17)** — **B1–B5.5 v16** on `main` (fixtures + Vitest + simulate + oracle/replay gates + parametric lib-helper inlining + literal-RHS assign + **`__cast_int`** formal assign + **`??` coalesce formal assign + **`strval`/`__cast_string`** + **`boolval`/`__cast_bool`** + **`floatval`/`__cast_float`** formal assign + emit **`lib-helpers.ts`** on Hono/Fastify + full param-inline replay corpus). Ingest normalizes SQL whitespace, keyword case (quote-aware), and inlines lib query helpers at call sites. Hub: **semantic smoke v5** (`sql-param-inline`) and **emit replay twin gate** (sql-same + sql-case + param-inline twins) in completion batch (**G2303–G2304**). **Maintenance:** non-structurally-identical cross-file semantic lift beyond B5 tiers stays future work (see **V2-M4** *Remaining* in [`ROADMAP-ARCHIVE.md`](./ROADMAP-ARCHIVE.md)).
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
| **B5.1** | Extend slot map to param reads inside nested expressions when no assign introduces a local (same order walk). | **Done** — operand walk registers **`data.param`** inside call/binop trees; **`nested_call_*`** twins in **`lift-helper-param-twin`**. |
| **B5.2** | Arithmetic / structural equivalence (constant folding, commutative reorder) with identical effect signatures. | **Done (v1–v2)** — scale-by-2 + commutative `+`/`*`; broader folding deferred. |
| **B5.3** | Oracle-backed proof for SQL literal or side-effect twins. | **Done (v1–v5)** — **`bodyHasIrEffects`** disables arithmetic widening; **`fixtures/lift-helper-sql-twin/`** negative control; **`normalizeSqlLiteralForHelperLift`** aliases whitespace-only SQL twins (**`sql-ws-twin`**, **`sql-same-twin`**); **v4:** **`simulateHandler`** proves alpha/beta twins match under semantic lift; **v5:** oracle capture + twin body/SQL parity gate (**`verify-lift-helper-sql-same-twin-oracle.mjs`**). |
| **B5.4** | SQL keyword case normalization for effectful semantic lift keys. | **Done (v1–v6)** — keyword uppercasing after whitespace collapse; **v2:** oracle twin verify; **v3:** quote-aware literals; **v4:** escaped-quote Vitest; **v5:** backtick identifiers; **v6:** line/block SQL comments. |
| **B5.5** | Ingest inlining of lib helpers whose body is **`return <effect.db.query>`** (zero-arg, parametric, or assign-then-return). | **Done (v1–v16)** — **`tryInlineLibHelperCall`** + **`HelperBodyEntry`**; replay twins; parametric/chain bodies; **v5.1:** negative control (**`sql_param_noinline`**); **v6:** skip effect-free prelude expr stmts (**`sql_param_prelude`**); **v7 (G2318–G2319):** emit **`lib-helpers.ts`** for non-inlinable helpers + effectful-prelude control (**`sql_param_sideeffect`**); **v8 (G2325–G2326):** literal-RHS assign inlining + **`/zeta`** emit replay twin; **v9 (G2344):** **`__cast_int`** / **`intval`** wrapper on formal assign (**`sql_param_cast`**, **`/kappa`**); **v10 (G2348–G2349):** **`??` coalesce formal ?? literal assign (**`sql_param_coalesce`**, **`/lambda`**) + replay corpus through **`/iota`/`/kappa`/`/lambda`**; **v11 (G2359–G2361):** **`strval`** / **`__cast_string`** wrapper on formal assign (**`sql_param_strval`**, **`sql_param_cast_string`**, **`/mu`/`/nu`**) + replay corpus through 11 handlers; **v12 (G2368–G2371):** **`boolval`/`__cast_bool`** and **`floatval`/`__cast_float`** formal assign (**`sql_param_bool`**, **`sql_param_float`**, **`/xi`/`/omicron`**) + replay corpus through 13 handlers; **v13 (G2376–G2380):** **`trim()`** formal assign (**`sql_param_trim`**, **`/pi`**) + replay corpus through 14 handlers; **v14 (G2385–G2388):** **`(float)`** cast formal assign (**`sql_param_cast_float`**, **`/rho`**) + replay corpus through 15 handlers; **v15–v16 (G2396–G2398):** **`(bool)`** and **`(int)`** cast formal assign (**`sql_param_cast_bool`**, **`sql_param_cast_int`**, **`/sigma`/`/tau`**) + replay corpus through 17 handlers. |

## Hub gates (G2303–G2304)

| Script | Role |
| --- | --- |
| **`hub-ir-helper-lifting-semantic-smoke.mjs`** | Schema **v5** — ingest lift batch over gap-probe, param/sql twins, and **`lift-helper-sql-param-inline`**; expects zero holes. |
| **`hub-ir-helper-lifting-replay-twin-smoke.mjs`** | Schema **v2** — runs **`verify-lift-helper-sql-same-twin-replay`**, **`verify-lift-helper-sql-case-twin-replay`**, and **`verify-lift-helper-sql-param-inline-replay`**; wired as **`irHelperLiftingReplayTwin`** in hub completion (**`irHelperLiftingReplayTwinOk`** passes on **`no-php`** skip). |

Both are invoked from **`hub-completion-heavy-smokes.mjs`** and surfaced in the capability matrix / delivery dashboard.

## Non-B5 deferred (honest gap — G6265) → **B6 active (Phase 11)**

**B0–B5.5 v16** remains **closed**. **B6 v0 (G6283):** `strlen()` formal assign inlining on parametric lib SQL helpers — fixture route **`/phi`** on `lift-helper-sql-param-inline`.

**B7 v0 (G6730):** `empty()` formal assign inlining on parametric lib SQL helpers — fixture route **`/upsilon`** on `lift-helper-sql-param-inline`. Gate: `runIrHelperLiftingB7EmptyInlineGate`; composite: `pnpm run hub:cwl-language-maintenance-smoke` (**G6731**).

**B8 v0 (G6740):** `isset()` formal assign inlining on parametric lib SQL helpers — fixture route **`/chi`** on `lift-helper-sql-param-inline`. Gate: `runIrHelperLiftingB8IssetInlineGate`; composite: `pnpm run hub:cwl-language-v1-close-smoke` (**G6750**).

**B9 v0 (G6760):** `count()` formal assign inlining on parametric lib SQL helpers — fixture route **`/psi`** on `lift-helper-sql-param-inline`. Gate: `runIrHelperLiftingB9CountInlineGate`; composite: `pnpm run hub:cwl-language-maintenance-smoke` (**G6731**).

**B10 v0 (G6770):** `is_array()` formal assign inlining on parametric lib SQL helpers — fixture route **`/omega`** on `lift-helper-sql-param-inline`. Gate: `runIrHelperLiftingB10IsArrayInlineGate`; composite: `pnpm run hub:cwl-language-maintenance-smoke` (**G6731**).

**B11 v0 (G6780):** `is_string()` formal assign inlining on parametric lib SQL helpers — fixture route **`/eta`** on `lift-helper-sql-param-inline`. Gate: `runIrHelperLiftingB11IsStringInlineGate`; composite: `pnpm run hub:cwl-language-maintenance-smoke` (**G6731**).

**B12 v0 (G6790):** `abs()` formal assign inlining on parametric lib SQL helpers — fixture route **`/theta`** on `lift-helper-sql-param-inline`. Gate: `runIrHelperLiftingB12AbsInlineGate`; composite: `pnpm run hub:cwl-language-maintenance-smoke` (**G6731**).

**B13 v0 (G6800):** `is_numeric()` formal assign inlining on parametric lib SQL helpers — fixture route **`/varsigma`** on `lift-helper-sql-param-inline`. Gate: `runIrHelperLiftingB13IsNumericInlineGate`; composite: `pnpm run hub:cwl-language-maintenance-smoke` (**G6731**).

**B14 v0 (G6810):** logical **`!`** formal assign inlining on parametric lib SQL helpers — fixture route **`/digamma`** on `lift-helper-sql-param-inline`. Gate: `runIrHelperLiftingB14NotInlineGate`; composite: `pnpm run hub:cwl-language-maintenance-smoke` (**G6731**).

**B15 v0 (G6820):** `is_int()` formal assign inlining — fixture route **`/stigma`**. Gate: `runIrHelperLiftingB15IsIntInlineGate`.

**B16 v0 (G6830):** `is_bool()` formal assign inlining — fixture route **`/sampi`**. Gate: `runIrHelperLiftingB16IsBoolInlineGate`.

**B17 v0 (G6840):** `is_null()` formal assign inlining — fixture route **`/koppa`**. Gate: `runIrHelperLiftingB17IsNullInlineGate`.

**B18 v0 (G6850):** unary **`-`** formal assign inlining — fixture route **`/qoppa`**. Gate: `runIrHelperLiftingB18NegInlineGate`.

**B19 v0 (G6860):** `round()` formal assign inlining — fixture route **`/san`**. Gate: `runIrHelperLiftingB19RoundInlineGate`.

**B20 v0 (G6870):** `floor()` formal assign inlining — fixture route **`/sho`**. Gate: `runIrHelperLiftingB20FloorInlineGate`.

**B21 v0 (G6880):** `ceil()` formal assign inlining — fixture route **`/tsan`**. Gate: `runIrHelperLiftingB21CeilInlineGate`.

**B22 v0 (G6890):** `strtolower()` formal assign inlining — fixture route **`/teth`**. Gate: `runIrHelperLiftingB22StrtolowerInlineGate`.

**B23 v0 (G6900):** `strtoupper()` formal assign inlining — fixture route **`/heth`**. Gate: `runIrHelperLiftingB23StrtoupperInlineGate`.

**B24 v0 (G6910):** `htmlspecialchars()` formal assign inlining — fixture route **`/yodh`**. Gate: `runIrHelperLiftingB24HtmlspecialcharsInlineGate`.

**B25 v0 (G6920):** `nl2br()` formal assign inlining — fixture route **`/kaph`**. Gate: `runIrHelperLiftingB25Nl2brInlineGate`.

**B26 v0 (G6930):** `urlencode()` formal assign inlining — fixture route **`/lamed`**. Gate: `runIrHelperLiftingB26UrlencodeInlineGate`.

**B27 v0 (G6940):** `rawurlencode()` formal assign inlining — fixture route **`/mem`**. Gate: `runIrHelperLiftingB27RawurlencodeInlineGate`.

**B28 v0 (G6950):** `urldecode()` formal assign inlining — fixture route **`/nun`**. Gate: `runIrHelperLiftingB28UrldecodeInlineGate`.

**B29 v0 (G6960):** `rawurldecode()` formal assign inlining — fixture route **`/samekh`**. Gate: `runIrHelperLiftingB29RawurldecodeInlineGate`.

**B30 v0 (G6970):** `ltrim()` formal assign inlining — fixture route **`/ayin`**. Gate: `runIrHelperLiftingB30LtrimInlineGate`.

**B31 v0 (G6980):** `rtrim()` formal assign inlining — fixture route **`/pe`**. Gate: `runIrHelperLiftingB31RtrimInlineGate`.

**B32 v0 (G6990):** `is_float()` formal assign inlining — fixture route **`/tsadi`**. Gate: `runIrHelperLiftingB32IsFloatInlineGate`.

**B33 v0 (G7000):** `is_object()` formal assign inlining — fixture route **`/qof`**. Gate: `runIrHelperLiftingB33IsObjectInlineGate`.

**B34 v0 (G7010):** `is_scalar()` formal assign inlining — fixture route **`/resh`**. Gate: `runIrHelperLiftingB34IsScalarInlineGate`.

**B35 v0 (G7020):** `round(, precision)` formal + literal inlining — fixture route **`/shin`**. Gate: `runIrHelperLiftingB35Round2InlineGate`.

**B36 v0 (G7030):** `max(, literal)` formal + literal inlining — fixture route **`/tav`**. Gate: `runIrHelperLiftingB36MaxInlineGate`.

**B37 v0 (G7040):** `min(, literal)` formal + literal inlining — fixture route **`/alef`**. Gate: `runIrHelperLiftingB37MinInlineGate`.

**B38 v0 (G7050):** `substr(, literal)` formal + literal inlining — fixture route **`/bet`**. Gate: `runIrHelperLiftingB38SubstrInlineGate`.

**B39 v0 (G7060):** `strpos(, literal)` formal + literal inlining — fixture route **`/gimel`**. Gate: `runIrHelperLiftingB39StrposInlineGate`.

**B40 v0 (G7070):** `stripos(, literal)` formal + literal inlining — fixture route **`/dalet`**. Gate: `runIrHelperLiftingB40StriposInlineGate`.

**B41 v0 (G7080):** `strrpos(, literal)` formal + literal inlining — fixture route **`/he`**. Gate: `runIrHelperLiftingB41StrrposInlineGate`.

**B42 v0 (G7090):** `strripos(, literal)` formal + literal inlining — fixture route **`/vav`**. Gate: `runIrHelperLiftingB42StrriposInlineGate`.

**B43 v0 (G7091):** `str_contains(, literal)` formal + literal inlining — fixture route **`/zayin`**. Gate: `runIrHelperLiftingB43StrContainsInlineGate`.

**B44 v0 (G7092):** `str_starts_with(, literal)` formal + literal inlining — fixture route **`/chet`**. Gate: `runIrHelperLiftingB44StrStartsWithInlineGate`.

**B45 v0 (G7093):** `str_ends_with(, literal)` formal + literal inlining — fixture route **`/tet`**. Gate: `runIrHelperLiftingB45StrEndsWithInlineGate`.

**B46 v0 (G7094):** `substr_count(, literal)` formal + literal inlining — fixture route **`/yod`**. Gate: `runIrHelperLiftingB46SubstrCountInlineGate`.

**B47 v0 (G7095):** `explode(, literal)` formal + literal inlining — fixture route **`/kaf`**. Gate: `runIrHelperLiftingB47ExplodeInlineGate`.

**B48 v0 (G7096):** `strcmp(, literal)` formal + literal inlining — fixture route **`/sin`**. Gate: `runIrHelperLiftingB48StrcmpInlineGate`.

**B49 v0 (G7097):** `strcasecmp(, literal)` formal + literal inlining — fixture route **`/samech`**. Gate: `runIrHelperLiftingB49StrcasecmpInlineGate`.

**B50 v0 (G7098):** `strncmp(, literal, literal)` formal + literal inlining — fixture route **`/peh`**. Gate: `runIrHelperLiftingB50StrncmpInlineGate`.

**B51 v0 (G7099):** `strncasecmp(, literal, literal)` formal + literal inlining — fixture route **`/fe`**. Gate: `runIrHelperLiftingB51StrncasecmpInlineGate`.

**B52 v0 (G7102):** `strrev()` formal inlining — fixture route **`/kuf`**. Gate: `runIrHelperLiftingB52StrrevInlineGate`.

**B53 v0 (G7103):** `str_repeat(, literal)` formal + literal inlining — fixture route **`/gim`**. Gate: `runIrHelperLiftingB53StrRepeatInlineGate`.

**B55 v0 (G7105):** `str_replace(, lit, lit)` formal assign inlining — fixture route **`/repl`**. Gate: `runIrHelperLiftingB55StrReplaceInlineGate`.

**B56 v0 (G7106):** `str_ireplace(, lit, lit)` formal assign inlining — fixture route **`/irepl`**. Gate: `runIrHelperLiftingB56StrIreplaceInlineGate`.

**B57 v0 (G7107):** `ucfirst()` formal assign inlining — fixture route **`/ucf`**. Gate: `runIrHelperLiftingB57UcfirstInlineGate`.

**B58 v0 (G7108):** `lcfirst()` formal assign inlining — fixture route **`/lcf`**. Gate: `runIrHelperLiftingB58LcfirstInlineGate`.

**B59 v0 (G7109):** `ucwords()` formal assign inlining — fixture route **`/ucw`**. Gate: `runIrHelperLiftingB59UcwordsInlineGate`.

**B60 v0 (G7112):** `strip_tags()` formal assign inlining — fixture route **`/stag`**. Gate: `runIrHelperLiftingB60StripTagsInlineGate`.

**B61 v0 (G7113):** `addslashes()` formal assign inlining — fixture route **`/adds`**. Gate: `runIrHelperLiftingB61AddslashesInlineGate`.

**B62 v0 (G7114):** `stripslashes()` formal assign inlining — fixture route **`/subs`**. Gate: `runIrHelperLiftingB62StripslashesInlineGate`.

**B63 v0 (G7115):** `str_rot13()` formal assign inlining — fixture route **`/rot13`**. Gate: `runIrHelperLiftingB63StrRot13InlineGate`.

**B64 v0 (G7116):** `str_word_count()` formal assign inlining — fixture route **`/swc`**. Gate: `runIrHelperLiftingB64StrWordCountInlineGate`.

**B65 v0 (G7117):** `str_split(, lit)` formal assign inlining — fixture route **`/split`**. Gate: `runIrHelperLiftingB65StrSplitInlineGate`.

**B66 v0 (G7118):** `strcspn(, lit)` formal assign inlining — fixture route **`/cspn`**. Gate: `runIrHelperLiftingB66StrcspnInlineGate`.

**B67 v0 (G7119):** `strspn(, lit)` formal assign inlining — fixture route **`/sspn`**. Gate: `runIrHelperLiftingB67StrspnInlineGate`.

**B68 v0 (G7124):** `ltrim(, lit)` formal assign inlining — fixture route **`/ltrimc`**. Gate: `runIrHelperLiftingB68LtrimCharlistInlineGate`.

**B69 v0 (G7125):** `rtrim(, lit)` formal assign inlining — fixture route **`/rtrimc`**. Gate: `runIrHelperLiftingB69RtrimCharlistInlineGate`.

**B70 v0 (G7126):** `trim(, lit)` formal assign inlining — fixture route **`/trimc`**. Gate: `runIrHelperLiftingB70TrimCharlistInlineGate`.

**B71 v0 (G7127):** `wordwrap(, lit, lit)` formal assign inlining — fixture route **`/wrap`**. Gate: `runIrHelperLiftingB71WordwrapInlineGate`.

**B72 v0 (G7128):** `chunk_split(, lit, lit)` formal assign inlining — fixture route **`/csplit`**. Gate: `runIrHelperLiftingB72ChunkSplitInlineGate`.

**B73 v0 (G7129):** `strtr(, lit, lit)` formal assign inlining — fixture route **`/xlat`**. Gate: `runIrHelperLiftingB73StrtrInlineGate`.

**B74 v0 (G7132):** `htmlentities()` formal assign inlining — fixture route **`/hent`**. Gate: `runIrHelperLiftingB74HtmlentitiesInlineGate`.

**B75 v0 (G7133):** `html_entity_decode()` formal assign inlining — fixture route **`/hdec`**. Gate: `runIrHelperLiftingB75HtmlEntityDecodeInlineGate`.

**String helper v1.1 closed at B75 (G7133).**

**B54 v0 (G7104):** `str_pad(, literal, literal)` formal + literal inlining — fixture route **`/dale`**. Gate: `runIrHelperLiftingB54StrPadInlineGate`.

**Gate:** `runIrHelperLiftingB6StrlenInlineGate` — verifies B6 inlining + ingest test coverage.  
**Historical gate:** `runIrHelperLiftingNonB5DeferredGate` (scaffolding, G6265).

Broader cross-file semantic lift beyond B6 still requires verify-gated design passes.

## Decision

**Closed (2026-06-17).** **B0–B5.5 v16** shipped with hub semantic + replay twin gates (**G2303–G2304**). Track maintenance under **ROADMAP** post-2.0 row **B** (GitHub **#3**). Non-structural cross-file lift beyond B5 tiers requires a new design pass + plan amendment.
