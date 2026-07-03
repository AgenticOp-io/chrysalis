# Full matrix oracle product program (Phase 41)

> **Status:** **active** (2026-07-03, **G8700**) — user-amended locked path (**D6300**)  
> **Authority:** **DESIGN D6300**; [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) §12; hub readiness matrix (`buildLanguageReadinessReport`)  
> **Requires:** **G7690** universal translator closed (maintenance regression); **G8550** Migration OS closed  
> **Supersedes for default build:** maintenance-only queue (**D6299**) when user scopes “build all matrix pairs”

## Thesis

Promote every **core hub web language pair** (9×9 minus identity = **72 pairs**) from **open/silver/structural gold** to **oracle product** tier:

| Tier | Bar |
| --- | --- |
| **Oracle product** | Native or AST ingest → WebIR → emit → **trace oracle verify** on real routes (req/res, middleware, SQL/session effects where declared) |
| **Structural gold** (intermediate) | Hole-free lift/emit on gold fixtures; hub-gold-verify / trace replay |
| **Silver / open** (today) | Partial lift, scaffold emit, documented holes |

**Hub spine unchanged:** every pair is `Lang A → WebIR → (CWL) → Lang B`. No string transpile without WebIR.

**Charter:** `fixtures/hub-full-matrix-oracle/chrysalis.matrix-oracle-composer.v1.json`

## Core matrix (72 pairs)

Origins and outputs (same set):

`cwl`, `csharp`, `go`, `java`, `javascript`, `php`, `python`, `ruby`, `typescript`

**Today (2026-07-03):** ~4 structural gold cells (PHP→TS, CWL↔TS, literal→CWL); remainder silver/open with blockers indexed in hub UI.

## Tracks (build order — do not skip)

### Phase 41a — JavaScript / TypeScript semantic lowering (**G8710**)

Close hub blocker: *Full semantic lowering (req/res, middleware, SQL effects) is not implemented.*

| Slice | Scope | Close gate |
| --- | --- | --- |
| **41a.1** | `req`/`res` bindings, status, headers, cookies | **G8711** |
| **41a.2** | Middleware pipeline executable in WebIR + verify replay | **G8712** |
| **41a.3** | SQL / DB effects (declared + lifted call patterns) | **G8713** |
| **41a.4** | Call-expression lowering beyond literals (`hub-js:call-expression`) | **G8714** |

**Regression:** extend `hub-gold-verify` + `javascript-ast-ingest.mjs` fixtures.

### Phase 41b — Python native ingest + oracle (**G8720**)

Close hub blocker: *Native `@chrysalis/ingest` package adapter and oracle verify are not implemented.*

| Slice | Scope | Close gate |
| --- | --- | --- |
| **41b.1** | `@chrysalis/ingest` origin adapter (parser bridge pattern) | **G8721** |
| **41b.2** | `packages/oracle-python` trace parity on gold fixture | **G8722** |
| **41b.3** | Python → CWL / hono / fastify oracle product pairs | **G8723** |

### Phase 41c — JVM / Go / C# / Ruby native ingest (**G8730**)

Close hub blocker: *Native parser ingest in `@chrysalis/ingest` and oracle verify are not implemented.*

| Language | Gate |
| --- | --- |
| Java | **G8731** |
| Go | **G8732** |
| C# | **G8733** |
| Ruby | **G8734** |

Pattern: parser bridge → WebIR → oracle capture host per `docs/HUB-TRANSLATION-PATHS.md`.

### Phase 41d — Native emit gold (non-TS targets) (**G8740**)

Close hub blockers: *Direct native emitters for non-TS outputs still scaffold/open routes.*

| Slice | Scope | Gate |
| --- | --- | --- |
| **41d.1** | PHP → python/java/go/ruby/csharp native emit + verify | **G8741** |
| **41d.2** | All origins → native emit lanes (`hub-native-*`) hole-free on gold WebIR | **G8742** |
| **41d.3** | WPTP contract path parity where OpenAPI/HAR present | **G8743** |

### Phase 41e — CWL executable effects outbound (**G8750**)

Close hub blocker: *CWL effect typing beyond declared effects: list is metadata until WebIR effect pass lands.*

| Slice | Scope | Gate |
| --- | --- | --- |
| **41e.1** | Declared `effects:` → executable WebIR (not metadata-only) for all outbound emits | **G8751** |
| **41e.2** | CWL → every core output at structural gold | **G8752** |
| **41e.3** | CWL → every core output at oracle product | **G8753** |

Builds on Phase 21 (**G7330**) and Phase 17 (**G7130**) regression.

### Phase 41f — Matrix oracle close (**G8760** → **G8790**)

| Gate | Meaning |
| --- | --- |
| **G8760** | All 72 core pairs ≥ structural gold |
| **G8770** | All 72 core pairs ≥ oracle product (trace verify) |
| **G8780** | Hub readiness report: zero `open` cells in core matrix |
| **G8790** | **Program close** — composite smoke green |

**Smokes:**

- Entry: `pnpm run hub:full-matrix-oracle-program-entry-smoke` (**G8700**)
- Progress: `pnpm run hub:full-matrix-oracle-progress-smoke` (**G8701**)
- Close: `pnpm run hub:full-matrix-oracle-close-smoke` (**G8790**)

## Gates summary

| ID | Gate | Smoke |
| --- | --- | --- |
| **G8700** | Program entry | `hub:full-matrix-oracle-program-entry-smoke` |
| **G8701** | Matrix progress (honest grade census) | `hub:full-matrix-oracle-progress-smoke` |
| **G8710–G8714** | Phase 41a JS/TS semantic | `hub:js-semantic-*-smoke`, `hub:phase41-llm-build-slice-smoke` |
| **G8720–G8723** | Phase 41b Python native | `hub:python-native-ingest-smoke`, `hub:python-oracle-trace-smoke`, `hub:python-oracle-product-smoke`, `hub:phase41b-python-build-slice-smoke` |
| **G8730–G8734** | Phase 41c Java/Go/C#/Ruby native | `hub:phase41c-native-build-slice-smoke` |
| **G8740–G8743** | Phase 41d native emit gold | `hub:phase41d-native-emit-smoke` |
| **G8750–G8753** | Phase 41e CWL effects outbound | `hub:phase41e-cwl-effects-smoke` |
| **G8760–G8780** | Phase 41f promotion slices | `hub:phase41-master-build-slice-smoke` |
| **G8790** | **Program close** | `hub:full-matrix-oracle-close-smoke` |

## Default queue (Phase 41 active)

1. **G8701 progress** — census before/after each slice
2. **G8710** → **G8750** tracks in order (41a first — unblocks largest origin cluster)
3. **G8550** / **G8570** maintenance — run after each track merge
4. **G7690** universal translator regression — subordinate

**Regression (closed):** Migration OS (**G8550**), Open web-LLM (**G8290**), IS runtime (**G8600**), IR helper tier (**G6731**)

## Non-goals

- Vanity **575×26** full catalog matrix without oracle fixtures
- Oracle-free “gold” promotion (structural gold alone is not program close)
- Per-pair string transpilers bypassing WebIR
- Selling scaffold cells as migration-ready (**STRATEGIC-PLAN** §3)
