# @chrysalis/parser-bridge

## Purpose

Spawns a PHP subprocess running `nikic/php-parser` and streams a canonical,
versioned PHP AST JSON back to Node. This package is the **only** place in
Chrysalis that knows about PHP's parse syntax.

## Public API

- `parseFile(path: string): Promise<PhpAst>`
- `parseSource(src: string, filename?: string): Promise<PhpAst>`
- `PhpAst` — a discriminated-union TypeScript type mirroring `nikic/php-parser`'s
  node shapes. Version-stamped so incompatible parser upgrades are loud.

## Invariants

- Uses `nikic/php-parser` as a subprocess. We do not bundle a JS PHP parser.
- The AST JSON schema is pinned and tested via golden fixtures. Bumping the
  PHP-side parser version requires regenerating fixtures.
- The bridge is stateless. Each call is an isolated subprocess or a pooled
  worker with no shared interpreter state.

## Non-goals

- Semantic analysis, type inference, or IR construction — those belong in
  `ingest`.
- Supporting PHP runtime behavior. We parse only.
