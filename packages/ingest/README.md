# @chrysalis/ingest

## Purpose

The PHP frontend. Takes PHP AST JSON from `@chrysalis/parser-bridge` and
produces a WebIR `Module` populated across the `web.request`, `effect`,
`data`, and `control` dialects. Unsupported constructs become typed holes.

## Public API

- `ingestFile(phpPath: string, route: RouteSpec, opts?: IngestFileOptions): Promise<Module>`
- `ingestDirectory(root: string, opts?: IngestOptions): Promise<Module>`
- `IngestFileOptions.projectRoot` — when set, applies the same `buildCallEffectMap`
  widening as `ingestDirectory` (`lib/`, Composer-aware optional `vendor/`,
  + hoisted functions for that route)
- `IngestOptions.parserProvider` / `IngestFileOptions.parserProvider` — forwards
  parser selection to `@chrysalis/parser-bridge` (`glayzzle` default, optional `nikic`)
- `IngestOptions` — include/exclude globs, PHPDoc handling, hole policy

## Invariants

- Every emitted WebIR node has a `Locator` pointing at the originating
  `file:line:col`.
- Unsupported constructs never throw and never silently elide — they become
  `hole` nodes with a descriptive `reason` and typed input/output contracts
  inferred from context. When a reason clearly references auth-boundary PHP
  (Gate, CSRF, Sanctum/Passport, Socialite/Fortify/OAuth-shaped tokens — DESIGN D189),
  ingest prefixes it with `auth:` (Milestone 6A).
- Ingest is deterministic: same input AST → byte-equal WebIR (modulo timestamps
  in `Module.meta`).

## Known PHP builtins (partial list)

Lowered to WebIR effects or `data.call` helpers (see `convert.ts`): **`query_all` /
`query_one` / `exec_sql`** (used by **`fixtures/tiny-blog`** and **`fixtures/mysqli-probe`**;
PDO vs mysqli in `lib/` does not change ingest lowering at call sites), static `Class::method()` calls (parser `StaticFetch` callee) as `data.call` with
a `class::method` label (not a hole; class methods are collected into call-effect overlays),
`session_start`, `session_name`, `session_set_cookie_params` (PHP-only cookie
setup; emitted middleware owns cookies), `$_SESSION[...]` read/write, redirects,
`time`, `rand` family, `getrandmax`, `microtime` (float and string modes), `uniqid`
(literal entropy flag), `parse_url` (component or full parts record), `json_encode`
(single argument only — extra args / options are a hole). PHP arrays with **only**
string literal keys lower to `__object_literal` (object-shaped JSON); unkeyed lists
still use `__array_literal`. Mixed or non-string-literal keys become an ingest hole.
Anything else becomes a hole or generic call.

## Non-goals

- Running or executing PHP.
- Target-language specifics. Ingest does not know what emit backend will be
  used. It produces WebIR; that's the contract.
- Schema recovery (that's `archaeology`).
