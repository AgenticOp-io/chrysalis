# IR Helper Program

> **Status:** **Program v1 closed** (2026-06-24, **G7200**)  
> **Authority:** [`IR-HELPER-LIFTING.md`](./IR-HELPER-LIFTING.md) (design pass + tier history); this doc is the **program charter and close checklist**.  
> **Not a CWL language surface** — CWL may consume IR helper lifting; completion is defined here, not in [`CWL-LANGUAGE-PROGRAM.md`](./CWL-LANGUAGE-PROGRAM.md).

## North star

On chartered PHP apps, lib helpers that are provably equivalent to inlined WebIR are **lifted** (Track A) or **inlined at call sites** (Track B), with **oracle-backed verify** and **no silent best-effort** lowering (**DESIGN §3**).

## Two tracks

| Track | Mechanism | v1 status |
| --- | --- | --- |
| **A — Cross-file lift** | `--ingest-lift-shared-helpers*` + structural dedupe; semantic keys B3–B5.5 | **Closed** (B0–B5.5) |
| **B — Call-site SQL inline** | `tryInlineLibHelperCall` / `tryExtractInlineQuery` on `return query_*` helpers | **Closed** (chartered shapes + 102 I3 callees) |

Deferred Track A depth (non-B5 semantic widening) remains **maintenance backlog** per **D2404** — not required for program v1 close.

## Track B — body-shape matrix (complete)

| Shape | Pattern | Status | Fixture control |
| --- | --- | --- | --- |
| **I0** | `return query_all(...)` | Supported | `sql_param.php` |
| **I1** | `$v = literal; return query…` | Supported | `sql_param_literal.php` |
| **I2** | `$v = $param; return query…` | Supported | `sql_param_local.php` |
| **I3** | `$v = f($param[, literals…]); return query…` | Supported | B6–B75 registry + P3 maintenance (102 callees) |
| **I4** | assign chain → query | Supported | `sql_param_chain.php` |
| **I5** | `$v = $param ?? literal` | Supported | `sql_param_coalesce.php` |
| **H1** | multi-local feed | **Hole** | `sql_param_noinline.php` |
| **H2** | effectful prelude | **Hole** | `sql_param_sideeffect.php` |

Cast / strval / boolval / floatval / prelude-skip variants ship under B5.5 (see lifting doc).

## Track B — I3 callee registry (frozen at B75)

**102** formal-assign wrapper callees are chartered for full call-site inline on `fixtures/lift-helper-sql-param-inline`. Source of truth: `@chrysalis/emit-shared` **`IR_HELPER_INLINE_REGISTRY`** / **`IR_HELPER_INLINE_CALLEE_IDS`** (ingest + emit-shared share **`tryExtractInlineQuery`**; Vitest imports the catalog).

**B-tier numbering frozen** at B75 — new callees are **program maintenance** (registry + Vitest), not new language tiers. **P3 maintenance batch 1** (D6256) added 20 generic registry-driven callees (json/hash/preg/format tier) via **`generic: true`** rows and **`IR_HELPER_GENERIC_CALLEE_MAP`** — 74 → 94 without new G6731 B-tier gates. **P3 maintenance batch 2** (D6257) closed the remaining safe formal-assign gaps (implode/preg/hex/strval/filter/crc32 tier) — 94 → 102; **`genericFormalLiteral2`** for `preg_replace`; `mb_*` and `str_shuffle` remain program holes.

## Explicit program holes (v1 out of scope)

| Hole | Reason |
| --- | --- |
| Multi-local assign | Cannot prove single param substitution |
| Effectful prelude before return | Effects merge / ordering |
| Branching / early return | Control-flow not in extract grammar |
| Multiple queries per helper | Not single-effect inline |
| Dynamic operands (non-formal, non-literal) | No closed substitution |
| `str_shuffle`, `mb_*`, etc. | Random / extension — separate charter |

## Close gates

| Gate | Smoke | Role |
| --- | --- | --- |
| **G7200** | `pnpm run hub:ir-helper-program-close-smoke` | **Program close** (authority) |
| **G2303** | `hub:ir-helper-lifting-semantic-smoke` | Track A + param-inline ingest (zero holes) |
| **G2304** | `hub:ir-helper-lifting-replay-twin-smoke` | Track B oracle replay twins |
| **G6731** | `hub:cwl-language-maintenance-smoke` | **Regression only** — per-tier B7–B75 gates; subordinate to **G7200** |
| **G7204** | via G7200 composite | Ingest idempotency (param-inline fixture) |

## Registry (P1)

Pattern metadata lives in **`packages/emit-shared/src/ir-helper-inline-registry.ts`**. Each entry declares `suffix`, `phpCallee`, `pattern`, and `resolveKind`. Resolve/emit bodies remain in **`lib-helper-inline.ts`**; ingest delegates extract to emit-shared (**no duplicate `convert.ts` grammar**).

New inline callees: add a registry row + fixture + Vitest — not a new B-tier.

### G7200 composite checks

1. Program doc gate (this file + registry exports)
2. Coverage gate — registry ↔ fixtures (102 I3 callees)
3. Inline Vitest batch (ingest + emit-shared + catalog)
4. Ingest idempotency on param-inline fixture (**G7204**)
5. Coverage artifact — `fixtures/ci/ir-helper-program-coverage.json`
6. Track A: lift, semantic, embed, full-path smokes
7. Track B: replay twin smoke

## Coverage artifact

```json
{
  "kind": "chrysalis.ir-helper-program-coverage",
  "schemaVersion": 1,
  "programCloseGate": "G7200",
  "inlineCalleeCount": 94
}
```

Emitted by close smoke and `@chrysalis/emit-shared` **`buildIrHelperProgramCoverage()`**.

## Default verify (operators)

```bash
pnpm run hub:ir-helper-program-close-smoke
```

Regression (optional, slower):

```bash
pnpm run hub:cwl-language-maintenance-smoke   # G6731 tier regression
pnpm run hub:ir-helper-lifting-replay-twin-smoke
```

## Related

- Design history: [`IR-HELPER-LIFTING.md`](./IR-HELPER-LIFTING.md)
- Maintenance index: [`PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) §2
- Strategic queue: [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) §12
