# lift-helper-sql-same-twin

B5.3 **v3+** positive control: two lib helpers run the **same** SQL literal; semantic helper-lift aliases them under `--ingest-lift-shared-helpers-semantic`.

Oracle twin verify (`scripts/verify-lift-helper-sql-same-twin-oracle.mjs`) captures `/alpha` and `/beta` and asserts identical response bodies and normalized SQL tapes.

Vitest: `packages/ingest/tests/lift-helper-sql-same-twin.test.ts`, `packages/rewrite/tests/lift-helper-sql-same-twin-simulate.test.ts`, `packages/cli/tests/lift-helper-sql-same-twin-oracle-verify.test.ts`.
