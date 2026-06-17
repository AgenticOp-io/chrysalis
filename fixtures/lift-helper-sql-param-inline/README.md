# lift-helper-sql-param-inline

B5.5 **v3+** positive control: lib helpers run parameterized SQL; ingest inlines direct-return, assign-then-return, multi-assign chain, literal-RHS assign (**`/iota`**), **`__cast_int`** (**`/kappa`**), **`??` coalesce** (**`/lambda`**), **`strval`/`(string)`** (**`/mu`/`/nu`**, G2361), and prelude (effect-free expr) bodies at route call sites. **`chrysalis_sql_param_noinline`** on **`/delta`** stays as a call at ingest (non-inlinable binop assign **`$active + 1`**); emit lowers it via **`src/lib-helpers.ts`**. **`chrysalis_sql_param_sideeffect`** on **`/zeta`** stays as a call (effectful prelude); emit lowers via lib-helpers and is included in oracle replay.

Oracle replay verify: **`scripts/verify-lift-helper-sql-param-inline-replay.mjs`** (11 handlers when PHP is on PATH).

Vitest: `packages/ingest/tests/lift-helper-sql-param-inline.test.ts`, `packages/cli/tests/lift-helper-sql-param-inline-replay-verify.test.ts`.
