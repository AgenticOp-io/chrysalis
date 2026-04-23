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

## Post-rewrite analysis gate (D18)

After a batch of rewrites lands, the driver can re-run each applied
opportunity's recognizer on the rewritten module and assert that the
"same" finding no longer appears. If any applied opportunity is still
findable, the entire batch is rolled back and every rewrite is moved
into `skipped` with the residual finding's detail for forensic
inspection.

This sits alongside — not instead of — the per-opportunity invariant
verifier:

- **Invariants (D16):** _pass hygiene._ "The pass only mutated nodes it
  declared it would mutate."
- **Post-verify (D18):** _pass effectiveness._ "The pass actually fixed
  the finding it claimed to handle."

Enable it by passing `postVerifyRecognizers` to `applyRewrites`:

```ts
import { DEFAULT_RECOGNIZERS } from "@chrysalis/insight";
import { DEFAULT_PASSES, applyRewrites } from "@chrysalis/rewrite";

const { module, report } = applyRewrites(mod, opportunities, DEFAULT_PASSES, {
  postVerifyRecognizers: DEFAULT_RECOGNIZERS,
});
if (!report.postVerify?.ok) {
  for (const f of report.postVerify!.failures) {
    console.error(`${f.pass} didn't fix ${f.opportunity}: ${f.detail}`);
  }
}
```

The `chrysalis rewrite` CLI enables the gate by default and prints
`post-verify: ok` or a rollback summary. Pass `--no-post-verify` to
inspect a broken rewrite without auto-rollback.

## Behavior-verify gate (D19)

The third verification layer runs the IR simulator over each route
in both the pre- and post-rewrite modules against synthesized probe
inputs, and rolls back if the post-rewrite response diverges from
what the applied passes' declared transforms predict.

| Layer | Question it answers |
| :--- | :--- |
| Invariants (D16) | Did the pass only mutate nodes it declared? |
| Post-verify (D18) | Did the pass actually fix the finding? |
| Behavior-verify (D19) | Did the module's response change in a way no applied pass claimed? |

The simulator is in-process and runs on the IR directly — no emit,
no compile, no server. Two probes per route (benign and XSS-flavored
attack) exercise the handler; responses include status, body, redirect
target, DB reads/writes (observably compared by `tables` + returned
rows, **not** SQL text — that's intentional so `parameterize-sql`
doesn't flag as a regression), and session writes.

Enable by passing `behaviorVerify: true` (or a richer
`BehaviorVerifyOptions`) to `applyRewrites`:

```ts
const { module, report } = applyRewrites(mod, opportunities, DEFAULT_PASSES, {
  postVerifyRecognizers: DEFAULT_RECOGNIZERS,
  behaviorVerify: true,
});
if (report.behaviorVerify && !report.behaviorVerify.ok) {
  for (const d of report.behaviorVerify.divergences) {
    console.error(`${d.route} ${d.probe} [${d.kind}]: ${d.detail}`);
  }
}
```

The `chrysalis rewrite --verify-behavior` CLI flag enables the gate
and prints `behavior-verify: ok (probes=N routes=N abstained=N)` or
a divergence report. Abstentions happen when the simulator hits an op
it doesn't interpret (recorded as `SimError`); they never roll back
the batch, but the count is reported so you know the coverage.

The simulator's op set is intentionally narrow — exactly what
`@chrysalis/ingest` produces today. When ingest grows new ops, the
simulator grows with it. Until then, abstention keeps this gate
honest: it won't lie and say "behavior unchanged" when it didn't
actually evaluate the code.

## HTTP replay gate (D20)

After D16–D19, **`applyRewritesAsync`** can replay a
`TraceCorpus` from `@chrysalis/oracle` against any `fetch`-compatible
handler — typically **`app.fetch.bind(app)`** from an emitted Hono
app (`src/server.ts` exports `app` without listening).

```ts
import { readCorpus } from "@chrysalis/oracle";
import { applyRewritesAsync, DEFAULT_PASSES } from "@chrysalis/rewrite";
import { DEFAULT_RECOGNIZERS } from "@chrysalis/insight";

const corpus = readCorpus({ root: "./traces" });
const { module, report } = await applyRewritesAsync(mod, opps, DEFAULT_PASSES, {
  postVerifyRecognizers: DEFAULT_RECOGNIZERS,
  httpReplay: {
    corpus,
    baseUrl: "http://127.0.0.1",
    fetch: app.fetch.bind(app),
  },
});
```

`@chrysalis/verify`'s `replayCorpus` compares each trace's captured
response to the handler output via `diffResponse`. Any divergence
rolls back the **entire** rewrite batch; `report.httpReplayVerify`
lists per-trace outcomes.

**Oracle caveat:** bodies captured from PHP **before** `sanitize-output`
will not match emitted TS **after** that pass (escaping changes HTML).
Use the IR behavior-verify gate (D19) to validate those transforms, or
replay against a corpus recorded from the migrated app.

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
