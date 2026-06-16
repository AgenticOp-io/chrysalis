# lift-helper-sql-twin

**IR helper lifting B5.3 v2** — effectful SQL helpers with different literals must not semantic-alias.

- **`chrysalis_sql_alpha()`** — `query_all('… active = 1')`
- **`chrysalis_sql_beta()`** — `query_all('… active = 0')`

Vitest: **`packages/ingest/tests/lift-helper-sql-twin.test.ts`**.
