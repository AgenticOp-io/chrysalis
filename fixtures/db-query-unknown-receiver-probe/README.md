# db-query-unknown-receiver-probe

Intentional **negative** ingest fixture: one route with **`$obj->query(...)`** where
**`$obj = new stdClass()`** is not a tracked DB receiver. Ingest emits
**`legacy:db-query-unknown-receiver`** (not **`effect.db.query`**).

- **CI:** **`migration-debt --max-holes 1`** (Lane D hole-economics gate)
- **Tests:** `packages/ingest/tests/db-query-unknown-receiver.test.ts`,
  `packages/cli/tests/migration-debt-gates.test.ts`

Positive **`new SQLite3`** tracking lives on **`fixtures/mysqli-probe`**
(**`GET /widgets/sqlite3-query`**, **G2406**).
