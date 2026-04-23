# @chrysalis/insight

Pattern recognition over WebIR. Walks a `Module` produced by
`@chrysalis/ingest`, reports `Opportunity` records for known legacy
anti-patterns, and proposes idiomatic typed replacements. Consumed by
`chrysalis insight`, the `chrysalis status` dashboard, and (M2) the
`@chrysalis/rewrite` trace-verified rewriter.

## Recognizers (v0)

| id | Pattern | Proposed lift |
| --- | --- | --- |
| `n-plus-one-queries` | `foreach` body issues a DB read per iteration | `batch-loader` — single `SELECT ... WHERE id IN (...)` + lookup map |
| `scattered-validation` | One request field touched by ≥2 distinct guards (isset/empty/trim/intval/preg_match/strlen/compare-to-literal/…) | `zod-schema` — one schema parsed at handler top |
| `string-dispatch` | `if/elseif` chain on literal equality against a single request field | `action-union` — discriminated union + `z.enum` + exhaustive `switch` |

## Confidence is two-tier

Pure IR recognizers cap `confidence` at **0.8**. The runner raises that
value toward **1.0** only when the trace corpus agrees — e.g. the inner
N+1 query was observed firing N times per request in a real trace. That
boost is applied in `boostWithCorpus`, so recognizers themselves stay
pure over the IR and remain trivially unit-testable.

`severity` is a coarse three-level grouping (`info` / `suggestion` /
`strong`) chosen so the CLI and status dashboard can tier their output
without exposing raw confidence numbers.

## Invariants

- **Pure over the IR.** Recognizers never touch the filesystem, network,
  or mutable state. Corpus evidence is attached in a separate post-
  processing pass.
- **Provenance survives.** Every `Opportunity` carries a `Locator` pinned
  to a concrete source position so status and rewrite stages can resurface
  it across rebuilds.
- **Opportunities are not rewrites.** This package only detects. The
  actual IR rewrite + trace-verified re-emit lives in `@chrysalis/rewrite`
  (M2). A bad detection is noise; a bad rewrite is a regression. Separate
  packages, separate failure semantics.

## CLI

```
chrysalis insight <php-project-dir>
  [--traces <dir>]       # boost confidence with a captured corpus
  [--out <report.json>]  # persist the full report to disk
  [--only <comma-list>]  # restrict to named recognizers
  [--json]               # machine-readable output on stdout
  [--strict]             # exit 1 if any opportunity is found
```

## Non-goals

- Rewriting IR (see M2 `@chrysalis/rewrite`)
- AST-level rewrites on the PHP source (Chrysalis lives on WebIR)
- Generic lint rules (use PHPStan/Psalm; this package only covers
  *patterns whose modern equivalent we can emit*)
