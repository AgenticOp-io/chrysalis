# mysqli-probe

Minimal fixture for **Lane B**: PHP uses **mysqli** (not PDO) in `lib/db.php`, while
route files still call the same **`query_all` / `query_one` / `exec_sql`** helpers as
`fixtures/tiny-blog`. Ingest therefore produces the same **`effect.db.query`** lowering
at call sites; only the runtime DB driver differs.

- **Ingest tests:** `packages/ingest/tests/mysqli-probe.test.ts`
- **Parser parity:** `packages/parser-bridge/tests/nikic.test.ts` includes this page
- **Oracle:** optional `Chrysalis\Oracle\Db\MySQLi` when the prelude is present (same pattern as tiny-blog PDO)

There is no bundled MySQL database; `schema.sql` documents a minimal table layout for operators.

Route pages intentionally omit `require_once lib/db.php` (same pattern as `fixtures/tiny-blog/pages/*`): a
front controller would load `lib/db.php` before the page; ingest still resolves **`query_*`** via the call-effect map.
