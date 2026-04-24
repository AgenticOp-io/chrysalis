# @chrysalis/ingest

## Purpose

The PHP frontend. Takes PHP AST JSON from `@chrysalis/parser-bridge` and
produces a WebIR `Module` populated across the `web.request`, `effect`,
`data`, and `control` dialects. Unsupported constructs become typed holes.

## Public API

- `ingestFile(phpPath: string, route: RouteSpec, opts?: IngestFileOptions): Promise<Module>`
- `ingestDirectory(root: string, opts?: IngestOptions): Promise<Module>`
- `IngestFileOptions.projectRoot` — when set, applies the same `buildCallEffectMap`
  widening as `ingestDirectory` (`lib/` + hoisted functions for that route)
- `IngestOptions` — include/exclude globs, PHPDoc handling, hole policy

## Invariants

- Every emitted WebIR node has a `Locator` pointing at the originating
  `file:line:col`.
- Unsupported constructs never throw and never silently elide — they become
  `hole` nodes with a descriptive `reason` and typed input/output contracts
  inferred from context.
- Ingest is deterministic: same input AST → byte-equal WebIR (modulo timestamps
  in `Module.meta`).

## Known PHP builtins (partial list)

Lowered to WebIR effects or `data.call` helpers (see `convert.ts`): SQL helpers,
session, redirects, `time`, `rand` family, `getrandmax`, `microtime` (float and
string modes), `uniqid` (literal entropy flag), `parse_url` (component or full
parts record). Anything else becomes a hole or generic call.

## Non-goals

- Running or executing PHP.
- Target-language specifics. Ingest does not know what emit backend will be
  used. It produces WebIR; that's the contract.
- Schema recovery (that's `archaeology`).
