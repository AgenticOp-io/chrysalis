# @chrysalis/parser-bridge

## Purpose

Spawns a PHP subprocess running `nikic/php-parser` and streams a canonical,
versioned PHP AST JSON back to Node. This package is the **only** place in
Chrysalis that knows about PHP's parse syntax.

From the repo root, **`pnpm test`** runs **`scripts/ensure-parser-bridge-vendor.mjs`** first when **`vendor/`**
is missing: it uses **`composer`** on **`PATH`**, or bootstraps **`composer.phar`** via the official installer when **`php`** is available (**`scripts/parser-bridge-composer-install.mjs`**). Run **`pnpm run vendor:parser-bridge`** manually to force install.
Set **`CHRYSALIS_SKIP_PARSER_VENDOR=1`** to skip that hook. **`tests/nikic.test.ts`** still requires **`php`** on **`PATH`** in addition to **`vendor/`**.

**When to use `nikic`:** opt in for **parity-sensitive** pipelines (throw / dynamic **`new`**, namespaces, edge
syntax) or when glayzzle mis-parses a file; default **`glayzzle`** stays self-contained. CI runs
**`packages/parser-bridge/tests/nikic.test.ts`** explicitly after **`vendor:parser-bridge`** so parity
cannot regress silently.

## Public API

- `parseFile(path: string, opts?: { provider?: "glayzzle" | "nikic" }): Promise<PhpAst>`
- `parseSource(src: string, filename?: string, opts?: ParseOptions): Promise<PhpAst>`
- `PhpAst` — a discriminated-union TypeScript type mirroring `nikic/php-parser`'s
  node shapes. Version-stamped so incompatible parser upgrades are loud.

## Invariants

- The default `glayzzle` provider (bundled `php-parser`) is for local/dev. The **`nikic`**
  provider (**`composer install`** in this package, DESIGN **D195**) invokes **`php/dump-nikic-ast.php`**
  and **`src/providers/nikic-json.ts`**; **`vendor/`** is not committed. The glayzzle / nikic mappers share
  the same canonical shapes: flattened `namespace` blocks, qualified top-level `FunctionDecl` names,
  synthetic `FunctionDecl` entries for top-level static class methods as
  `Ns\Class::method` so ingest call-effect maps align with FQN PHP calls; for
  function- or top-level `static $x` declarations that stay `Unknown`, the detail
  text lists the bound names (e.g. `static variable declaration ($csrfToken)`) so
  ingest can run auth-adjacent hole tagging on the reason string. **`throw`**,
  static-name **`new ClassName(args)`**, and dynamic-target **`new $x(args)`**
  are modeled (schema **0.1.4**, DESIGN D193-D198); multi-segment FQN is
  carried to **`__new`** + **`phpFqnNew`** at emit (D194), while dynamic
  construction lowers to **`__new_dynamic`**.
- The AST JSON schema is pinned and tested via golden fixtures. Bumping the
  PHP-side parser version requires regenerating fixtures.
- The bridge is stateless. Each call is an isolated subprocess or a pooled
  worker with no shared interpreter state.

## Non-goals

- Semantic analysis, type inference, or IR construction — those belong in
  `ingest`.
- Supporting PHP runtime behavior. We parse only.
