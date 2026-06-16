# lift-helper-param-twin

**IR helper lifting B5 v0** — helpers that differ only by **formal parameter names** on a direct return (no intermediate locals).

- **`chrysalis_direct_alpha(int $n)`** vs **`chrysalis_direct_beta(int $m)`** — both `return $param + 1`; identical effects, different param labels in lowered IR without B5 semantic widening.

Contrast **`fixtures/lift-helper-gap-probe/`** (locals `$x` vs `$y`; covered by B3 once assigns register slots).

Vitest: **`packages/ingest/tests/lift-helper-param-twin.test.ts`**.
