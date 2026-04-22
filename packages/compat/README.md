# @chrysalis/compat

## Purpose

Runtime shim that lets generated code fall back to PHP-shaped stdlib semantics
(`count`, `array_map`, `isset`, `empty`, `in_array`, etc.) when the ingest or
emit passes cannot lower a call to an idiomatic TypeScript equivalent. Ships as
a published npm package so generated projects can depend on it normally.

## Public API

Deliberately small, grown only by concrete need:

- `count`, `isset`, `empty`, `in_array`
- `array_map`, `array_filter`, `array_reduce`, `array_keys`, `array_values`
- `strlen`, `substr`, `str_replace`, `preg_match` (a careful subset)
- `$_GET`, `$_POST`, `$_SESSION`, `$_COOKIE` — typed per-request accessors,
  integrated with the chimera runtime's session bridge

Every export has PHP-faithful semantics for the cases Chrysalis encounters,
**not** a full PHP emulation. Surprises are bugs; we do not silently paper
over semantic differences.

## Invariants

- **Shim usage is measured and visible.** Every call to a `compat` function
  is counted in the migration dashboard's "idiomaticity" metric. Generated
  code that relies heavily on `compat` scores lower by design.
- **No hidden global state.** Superglobal accessors require a request context;
  there is no ambient `$_POST` at module scope.
- **Zero heavyweight dependencies.** This package ships to user runtimes; keep
  it light.

## Non-goals

- Full PHP standard library coverage.
- Emulating PHP's type juggling beyond what is needed to match observed
  behavior. Surprises during verification lead to a lowering pass, not a
  deeper shim.
- Being the preferred output. The emit backend + intent-preserving rewrites
  should make `compat` smaller over time.
