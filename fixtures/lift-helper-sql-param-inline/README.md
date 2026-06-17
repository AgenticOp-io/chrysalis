# lift-helper-sql-param-inline

B5.5 **v3+** positive control: two lib helpers run the same parameterized SQL; ingest inlines **`chrysalis_sql_param`** (direct return) and **`chrysalis_sql_param_local`** (assign-then-return) at route call sites.

Emit replay verify: **`scripts/verify-lift-helper-sql-param-inline-replay.mjs`**.

Vitest: `packages/ingest/tests/lift-helper-sql-param-inline.test.ts`, `packages/cli/tests/lift-helper-sql-param-inline-replay-verify.test.ts`.
