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

- The default `glayzzle` provider (bundled `php-parser`) is for local/dev; a
  `nikic/php-parser` subprocess path is planned for parity corpora. The glayzzle
  AST flattens `namespace` blocks, qualifies top-level `FunctionDecl` names, and
  emits synthetic `FunctionDecl` entries for top-level static class methods as
  `Ns\Class::method` so ingest call-effect maps align with FQN PHP calls.
- The AST JSON schema is pinned and tested via golden fixtures. Bumping the
  PHP-side parser version requires regenerating fixtures.
- The bridge is stateless. Each call is an isolated subprocess or a pooled
  worker with no shared interpreter state.

## Non-goals

- Semantic analysis, type inference, or IR construction — those belong in
  `ingest`.
- Supporting PHP runtime behavior. We parse only.
