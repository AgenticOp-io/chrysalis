# @chrysalis/ingest

## Purpose

The PHP frontend. Takes PHP AST JSON from `@chrysalis/parser-bridge` and
produces a WebIR `Module` populated across the `web.request`, `effect`,
`data`, and `control` dialects. Unsupported constructs become typed holes.

## Public API

- `ingestFile(astPath: string): Promise<Module>`
- `ingestDirectory(root: string, opts?: IngestOptions): Promise<Module>`
- `IngestOptions` — include/exclude globs, PHPDoc handling, hole policy

## Invariants

- Every emitted WebIR node has a `Locator` pointing at the originating
  `file:line:col`.
- Unsupported constructs never throw and never silently elide — they become
  `hole` nodes with a descriptive `reason` and typed input/output contracts
  inferred from context.
- Ingest is deterministic: same input AST → byte-equal WebIR (modulo timestamps
  in `Module.meta`).

## Non-goals

- Running or executing PHP.
- Target-language specifics. Ingest does not know what emit backend will be
  used. It produces WebIR; that's the contract.
- Schema recovery (that's `archaeology`).
