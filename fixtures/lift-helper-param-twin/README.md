# lift-helper-param-twin

**IR helper lifting B5** — semantic widening for param-name twins (v0) and scale-by-2 arithmetic twins (B5.2).

- **`chrysalis_direct_alpha(int $n)`** vs **`chrysalis_direct_beta(int $m)`** — both `return $param + 1`; aliases under B5 v0 semantic lift.
- **`chrysalis_arith_alpha`** (`return $n * 2`) vs **`chrysalis_arith_beta`** (`return $n + $n`) — aliases under B5.2.
- **`chrysalis_arith_gamma`** (`return $n * 3`) — negative control; does not alias beta.

Contrast **`fixtures/lift-helper-gap-probe/`** (locals `$x` vs `$y`; covered by B3 once assigns register slots).

Vitest: **`packages/ingest/tests/lift-helper-param-twin.test.ts`**.
