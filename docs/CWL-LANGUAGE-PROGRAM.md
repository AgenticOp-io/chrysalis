# CWL language program

> **Status:** **Language v1 closed** (2026-06-19, **G6750**); **Complete language closed** (2026-06-22, **G7150**); **IR Helper Program v1 closed** (**G7200** — [`IR-HELPER-PROGRAM.md`](./IR-HELPER-PROGRAM.md), not a CWL surface)  
> **Authority:** `docs/CWL-SURFACE-TAXONOMY.md` (**D6193**); `docs/CWL.md`; `docs/CWL-RFC.md`; `docs/STRATEGIC-PLAN.md` §7

Chrysalis Web Language (CWL) is the **consolidated web language** for routes, pages, data loaders, effects metadata, and (future) UI composition — all lowering through **WebIR** to emit targets and oracle verify.

**CWL is authoritative.** The WISP showcase POC exists solely to demonstrate CWL on a real app — it does **not** define the language (**D6205**).

This program defines what **“language v1 complete”** means in-repo. It is **not** a claim that every PHP construct or every React/Svelte widget is lowered.

## Language v1 — complete (G6750)

| Layer | Scope | Status |
| --- | --- | --- |
| **CWL API** | RFC-0001–0008 (`@route`, params, body, status, content-type, `use`) | **Shipped** — hub gold + verify |
| **CWL Pages** | RFC-0010/0011/0014 (`@page`, layouts, HTML interpolation) | **Shipped** |
| **CWL Data** | RFC-0013 (`load { }`) | **Shipped** — page loaders on flagship + WISP |
| **CWL Effects** | RFC-0007 + WISP M6 `session.read` metadata | **Declarative shipped** |
| **CWL UI** | RFC-0012 component holes | **Explicit holes** — not v1; no silent lowering |
| **IR helper B-tier** | B5.5–B8 formal-assign lib SQL inlining | **Closed** — `empty`, `isset`, casts, trim, strlen |
| **IR helper B9+** | Incremental inline depth | **Closed** — program **G7200**; tier regression **G6731** optional |
| **Probes** | RFC-0015/0016 production + form-action hole catalog | **Shipped** — regression gates |

## Complete language program — closed (Phase 15–18, **D6206**, **G7150**)

**North star:** CWL is a **complete web language** — all five surfaces native, verify-backed, hole-budget-clean on chartered apps. **Language v1 (G6750)** was a milestone, not the finish line.

| Phase | Surface / win | Status | Close gate |
| --- | --- | --- | --- |
| **15** | **CWL UI v0** — component syntax beyond RFC-0012 holes; WebIR + emit + replay | **Closed G7110** | **G7110** |
| **16** | **CWL Data complete** — RFC-0013 load shapes; no `hub-*:load-function` on charter | **Closed G7120** | **G7120** |
| **17** | **CWL Effects executable** — RFC-0007 parity, not metadata-only | **Closed G7130** | **G7130** |
| **18** | **Cutover / greenfield** — ladder step 5; chimera-out for app logic | **Closed G7140** | **G7140** |
| **Program** | All surfaces + **hole budget zero** on flagship CWL-native routes | **Closed G7150** | **G7150** |

**Entry G7100:** this section + [`CWL-SURFACE-TAXONOMY.md`](./CWL-SURFACE-TAXONOMY.md) + [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) §12 aligned (doc gate; implementation follows RFC + hub smokes).

## Universal web language program — closed (G7390, D6260 / D6261)

**Status:** closed (2026-06-24). Program doc: [`CWL-UNIVERSAL-LANGUAGE-PROGRAM.md`](./CWL-UNIVERSAL-LANGUAGE-PROGRAM.md).

**Superseded by:** Phase **25** fully complete web language — [`CWL-FULL-WEB-LANGUAGE-PROGRAM.md`](./CWL-FULL-WEB-LANGUAGE-PROGRAM.md) (**G7590** target).

| Phase | Win | Status | Close gate |
| --- | --- | --- | --- |
| **19** | **CWL UI v1** | **Closed G7310** | **G7310** |
| **20** | **CWL Data v2** | **Closed G7320** | **G7320** |
| **21** | **Effects middleware** | **Closed G7330** | **G7330** |
| **22** | **Universal ingest** | **Closed G7340** | **G7340** |
| **23** | **Greenfield cutover** | **Closed G7350** | **G7350** |
| **Program** | Universal web language close | **Closed G7390** | **G7390** |

**Entry G7300:** archived — superseded by **G7390** close.

**Phase 15 first deliverables (RFC before code):**

1. **CWL UI syntax RFC** — props, server/client islands, hydration policy (extends RFC-0012)
2. **WebIR node types** — `id`, `type`, `effects`, `provenance`, `origin` per **DESIGN §3**
3. **WISP proof routes** — replace permanent holes where policy allows (e.g. `/login` bridge documented)
4. **Verify/replay** — no runtime UI claims without oracle evidence

**Refuse (D6206):** silent component lowering; IR helper B-tier as substitute for UI; GenieACS (**D6205**).

**Showcase:** WISP proves surfaces; **CWL RFCs define syntax** (**D6205**).

## Explicitly not “language v1” (unchanged)

Per **DESIGN §3** and **D6205**:

- **CWL UI** — was explicit holes in v1; **Phase 15 (D6206)** closes native UI syntax with RFC + verify — no silent lowering
- **Backend replatform** — WISPTools Express/Mongo stays proxied; CWL replaces **web language**, not databases
- **575×26 matrix marketing depth** — structural/oracle parity only where gated

## Gates

| ID | Gate | Smoke |
| --- | --- | --- |
| G6340 | Surface taxonomy | `pnpm run hub:cwl-surface-taxonomy-smoke` |
| G6731 | Language maintenance regression | `pnpm run hub:cwl-language-maintenance-smoke` |
| G6730 | B7 `empty()` formal assign | `runIrHelperLiftingB7EmptyInlineGate` |
| G6740 | B8 `isset()` formal assign | `runIrHelperLiftingB8IssetInlineGate` |
| G6760 | B9 `count()` formal assign | `runIrHelperLiftingB9CountInlineGate` |
| G6770 | B10 `is_array()` formal assign | `runIrHelperLiftingB10IsArrayInlineGate` |
| G6780 | B11 `is_string()` formal assign | `runIrHelperLiftingB11IsStringInlineGate` |
| G6790 | B12 `abs()` formal assign | `runIrHelperLiftingB12AbsInlineGate` |
| G6800 | B13 `is_numeric()` formal assign | `runIrHelperLiftingB13IsNumericInlineGate` |
| G6810 | B14 logical `!` formal assign | `runIrHelperLiftingB14NotInlineGate` |
| G6820 | B15 `is_int()` formal assign | `runIrHelperLiftingB15IsIntInlineGate` |
| G6830 | B16 `is_bool()` formal assign | `runIrHelperLiftingB16IsBoolInlineGate` |
| G6840 | B17 `is_null()` formal assign | `runIrHelperLiftingB17IsNullInlineGate` |
| G6850 | B18 unary `-` formal assign | `runIrHelperLiftingB18NegInlineGate` |
| G6860 | B19 `round()` formal assign | `runIrHelperLiftingB19RoundInlineGate` |
| G6870 | B20 `floor()` formal assign | `runIrHelperLiftingB20FloorInlineGate` |
| G6880 | B21 `ceil()` formal assign | `runIrHelperLiftingB21CeilInlineGate` |
| G6890 | B22 `strtolower()` formal assign | `runIrHelperLiftingB22StrtolowerInlineGate` |
| G6900 | B23 `strtoupper()` formal assign | `runIrHelperLiftingB23StrtoupperInlineGate` |
| G6910 | B24 `htmlspecialchars()` formal assign | `runIrHelperLiftingB24HtmlspecialcharsInlineGate` |
| G6920 | B25 `nl2br()` formal assign | `runIrHelperLiftingB25Nl2brInlineGate` |
| G6930 | B26 `urlencode()` formal assign | `runIrHelperLiftingB26UrlencodeInlineGate` |
| G6940 | B27 `rawurlencode()` formal assign | `runIrHelperLiftingB27RawurlencodeInlineGate` |
| G6950 | B28 `urldecode()` formal assign | `runIrHelperLiftingB28UrldecodeInlineGate` |
| G6960 | B29 `rawurldecode()` formal assign | `runIrHelperLiftingB29RawurldecodeInlineGate` |
| G6970 | B30 `ltrim()` formal assign | `runIrHelperLiftingB30LtrimInlineGate` |
| G6980 | B31 `rtrim()` formal assign | `runIrHelperLiftingB31RtrimInlineGate` |
| G6990 | B32 `is_float()` formal assign | `runIrHelperLiftingB32IsFloatInlineGate` |
| G7000 | B33 `is_object()` formal assign | `runIrHelperLiftingB33IsObjectInlineGate` |
| G7010 | B34 `is_scalar()` formal assign | `runIrHelperLiftingB34IsScalarInlineGate` |
| G7020 | B35 `round(, precision)` formal + literal | `runIrHelperLiftingB35Round2InlineGate` |
| G7030 | B36 `max(, literal)` formal + literal | `runIrHelperLiftingB36MaxInlineGate` |
| G7040 | B37 `min(, literal)` formal + literal | `runIrHelperLiftingB37MinInlineGate` |
| G7050 | B38 `substr(, literal)` formal + literal | `runIrHelperLiftingB38SubstrInlineGate` |
| G7060 | B39 `strpos(, literal)` formal + literal | `runIrHelperLiftingB39StrposInlineGate` |
| G7070 | B40 `stripos(, literal)` formal + literal | `runIrHelperLiftingB40StriposInlineGate` |
| G7080 | B41 `strrpos(, literal)` formal + literal | `runIrHelperLiftingB41StrrposInlineGate` |
| G7090 | B42 `strripos(, literal)` formal + literal | `runIrHelperLiftingB42StrriposInlineGate` |
| G7091 | B43 `str_contains(, literal)` formal + literal | `runIrHelperLiftingB43StrContainsInlineGate` |
| G7092 | B44 `str_starts_with(, literal)` formal + literal | `runIrHelperLiftingB44StrStartsWithInlineGate` |
| G7093 | B45 `str_ends_with(, literal)` formal + literal | `runIrHelperLiftingB45StrEndsWithInlineGate` |
| G7094 | B46 `substr_count(, literal)` formal + literal | `runIrHelperLiftingB46SubstrCountInlineGate` |
| G7095 | B47 `explode(, literal)` formal + literal | `runIrHelperLiftingB47ExplodeInlineGate` |
| G7096 | B48 `strcmp(, literal)` formal + literal | `runIrHelperLiftingB48StrcmpInlineGate` |
| G7097 | B49 `strcasecmp(, literal)` formal + literal | `runIrHelperLiftingB49StrcasecmpInlineGate` |
| G7098 | B50 `strncmp(, literal, literal)` formal + literal | `runIrHelperLiftingB50StrncmpInlineGate` |
| G7099 | B51 `strncasecmp(, literal, literal)` formal + literal | `runIrHelperLiftingB51StrncasecmpInlineGate` |
| G7102 | B52 `strrev()` formal | `runIrHelperLiftingB52StrrevInlineGate` |
| G7103 | B53 `str_repeat(, literal)` formal + literal | `runIrHelperLiftingB53StrRepeatInlineGate` |
| G7105 | B55 `str_replace(, lit, lit)` formal assign | `runIrHelperLiftingB55StrReplaceInlineGate` |
| G7106 | B56 `str_ireplace(, lit, lit)` formal assign | `runIrHelperLiftingB56StrIreplaceInlineGate` |
| G7107 | B57 `ucfirst()` formal assign | `runIrHelperLiftingB57UcfirstInlineGate` |
| G7108 | B58 `lcfirst()` formal assign | `runIrHelperLiftingB58LcfirstInlineGate` |
| G7109 | B59 `ucwords()` formal assign | `runIrHelperLiftingB59UcwordsInlineGate` |
| G7112 | B60 `strip_tags()` formal assign | `runIrHelperLiftingB60StripTagsInlineGate` |
| G7113 | B61 `addslashes()` formal assign | `runIrHelperLiftingB61AddslashesInlineGate` |
| G7114 | B62 `stripslashes()` formal assign | `runIrHelperLiftingB62StripslashesInlineGate` |
| G7115 | B63 `str_rot13()` formal assign | `runIrHelperLiftingB63StrRot13InlineGate` |
| G7116 | B64 `str_word_count()` formal assign | `runIrHelperLiftingB64StrWordCountInlineGate` |
| G7117 | B65 `str_split(, lit)` formal assign | `runIrHelperLiftingB65StrSplitInlineGate` |
| G7118 | B66 `strcspn(, lit)` formal assign | `runIrHelperLiftingB66StrcspnInlineGate` |
| G7119 | B67 `strspn(, lit)` formal assign | `runIrHelperLiftingB67StrspnInlineGate` |
| G7124 | B68 `ltrim(, lit)` formal assign | `runIrHelperLiftingB68LtrimCharlistInlineGate` |
| G7125 | B69 `rtrim(, lit)` formal assign | `runIrHelperLiftingB69RtrimCharlistInlineGate` |
| G7126 | B70 `trim(, lit)` formal assign | `runIrHelperLiftingB70TrimCharlistInlineGate` |
| G7127 | B71 `wordwrap(, lit, lit)` formal assign | `runIrHelperLiftingB71WordwrapInlineGate` |
| G7128 | B72 `chunk_split(, lit, lit)` formal assign | `runIrHelperLiftingB72ChunkSplitInlineGate` |
| G7129 | B73 `strtr(, lit, lit)` formal assign | `runIrHelperLiftingB73StrtrInlineGate` |
| G7132 | B74 `htmlentities()` formal assign | `runIrHelperLiftingB74HtmlentitiesInlineGate` |
| G7133 | B75 `html_entity_decode()` formal assign | `runIrHelperLiftingB75HtmlEntityDecodeInlineGate` |
| G7104 | B54 `str_pad(, literal, literal)` formal + literal | `runIrHelperLiftingB54StrPadInlineGate` |
| **G6750** | **Language v1 program close** | `pnpm run hub:cwl-language-v1-close-smoke` |
| **G7100** | Complete language program entry | Doc gate — § Complete language program |
| **G7101** | Phase 15 program entry | `pnpm run hub:cwl-phase15-entry-smoke` |
| **G7110** | Phase 15 CWL UI v0 close | `pnpm run hub:cwl-phase15-close-smoke` |
| **G7111** | CWL UI v0 server tree | `pnpm run hub:cwl-ui-v0-smoke` |
| **G7120** | Phase 16 CWL Data complete close | `pnpm run hub:cwl-data-complete-smoke` |
| **G7130** | Phase 17 CWL Effects executable close | `pnpm run hub:cwl-effects-executable-smoke` |
| **G7140** | Phase 18 cutover / greenfield close | `pnpm run hub:cwl-cutover-smoke` |
| **G7150** | **CWL complete language close** | `pnpm run hub:cwl-complete-language-close-smoke` |

## Language v1.1 — subordinate maintenance (G6760–G7050)

Post-v1 incremental IR helper depth on the **same B-tier pattern** (formal-assign lib SQL inlining). **Subordinate** to Phase 15–18 (**D6206**); extends ingest/emit helper lifting only.

Regression: `pnpm run hub:ir-helper-program-close-smoke` (**G7200**). Optional tier regression: **G6731**.

## Default queue

**Universal language program:** **`hub:cwl-universal-language-program-entry-smoke`** (**G7300**). Build Phases **19 → 23** per [`CWL-UNIVERSAL-LANGUAGE-PROGRAM.md`](./CWL-UNIVERSAL-LANGUAGE-PROGRAM.md).

**Regression:** **`hub:cwl-complete-language-close-smoke`** (**G7150**), **`hub:ir-helper-program-close-smoke`** (**G7200**). See [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) §12.

**Subordinate:** IR helper tier regression — [`PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) §2.

**WISP POC:** optional only (**D6259**) — not default build.
