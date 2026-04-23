# @chrysalis/rewrite

Confidence-gated IR rewrite engine. Consumes `@chrysalis/insight`
opportunities and produces a new `Module` with the proposed lifts
applied. Driven by the `chrysalis rewrite` CLI, which wires
ingest → insight → rewrite → emit into a single command.

## Design philosophy

- **Detection ≠ rewrite.** `@chrysalis/insight` is a pure structural
  query and is safe to run every build. `@chrysalis/rewrite` mutates
  the IR and is gated by an explicit confidence threshold (default
  0.75) so noisy recognizers cannot flip working code. See DESIGN.md
  D13/D15 for the full argument.
- **IR-native lifts.** Every rewrite operates on WebIR, not on PHP
  source or emitted TypeScript. That way a future `emit-fastify` or
  `emit-bun` inherits every lift for free.
- **Atomic edits.** Two primitives — `add` (introduce a new node) and
  `replaceOperand` (rewire an operand pointer) — cover the vast
  majority of useful lifts. Larger transforms compose from pairs of
  these.
- **Provenance.** Every rewritten node gets a new
  `{ source: "intent-rewrite" }` provenance entry so the audit trail
  survives into the emitted code.

## Passes

| pass id | handles recognizer | effect |
| --- | --- | --- |
| `sanitize-output` | `unescaped-output` | Wraps tainted leaves of a concat-like echo in `htmlspecialchars`. For `html.template` sinks, flips the offending part's `escape: false` to `true` and wraps its operand. Preserves literal HTML surrounding the taint. |
| `parameterize-sql` | `raw-sql-concat` | Walks the `sqlExpr` tree stashed by ingest, inlines string literals as SQL text, and lifts every other leaf as a `?`-placeholder bound parameter. Emitted TS becomes `queryAll("SELECT … WHERE id = ?", [id])`. Structurally SQLi-proof. |

## Invariant verification

Every pass can declare an `invariants: InvariantSpec` field listing the
`dialect.op` shapes it is allowed to mutate. `applyRewrites` runs the
pass's edits on a scratch module, diffs it against the pre-rewrite
module, and **rolls the edit back** if a node outside the allowlist
changed structurally or an effect count shifted. Rolled-back
opportunities land in the `skipped` list with a
`verify-invariant-failed` reason and the precise violations attached.

Patterns support two forms — a bare `dialect.op` string or a refined
`{ dialectOp, attrMatch }` — so a pass can declare "I only mutate
`data.binop` with `operator: '.'`" and still have arithmetic binops
protected. `sanitize-output`'s spec is:

```ts
invariants: {
  mayModify: [
    "effect.echo",
    "data.html.template",
    "data.concat",
    { dialectOp: "data.binop", attrMatch: { operator: "." } },
  ],
}
```

See DESIGN.md D16 for the rationale and the split with HTTP-level
replay (`@chrysalis/verify`).

## CLI

```
chrysalis rewrite <php-project-dir>
  [--out <ts-out-dir>]            # if set, re-emit after applying rewrites
  [--traces <dir>]                # corpus-boost confidence before gating
  [--min-confidence 0.75]         # threshold; below → record as "skipped"
  [--passes <id,id,...>]          # restrict to named passes
  [--report <rewrite.json>]       # persist per-opportunity result
  [--json]                        # machine-readable output on stdout
```

## Invariants

- `applyRewrites` returns a new immutable `Module`; the input is
  untouched.
- If a pass's `apply` throws, the opportunity is recorded in `skipped`
  with the thrown message; other opportunities are unaffected.
- Edits are collected first, applied in a single batch — the IR is
  always consistent at the boundary of `applyRewrites`.
- `minConfidence` filters *after* `handles()` matches, so the
  `skipped` list accurately reflects what each pass *wanted* to do.
