# mysqli-probe

Minimal fixture for **Lane B**: PHP uses **mysqli** (not PDO) in `lib/db.php`, while
route files still call the same **`query_all` / `query_one` / `exec_sql`** helpers as
`fixtures/tiny-blog`. Ingest therefore produces the same **`effect.db.query`** lowering
at call sites; only the runtime DB driver differs.

- **Ingest tests:** `packages/ingest/tests/mysqli-probe.test.ts`
- **Manifest factory list:** `chrysalis.routes.json` **`dbFactoryReturnCallees`** lists **`DbFactory::getConnection`** so assignments and **`DbFactory::getConnection()->query(...)`** lower like **`db()->query`** (**D224**). No entry means **`legacy:db-query-unknown-receiver`** for that callee shape.
- **CI:** `.github/workflows/ci.yml` enforces **`--max-holes 5`** on ingest for this fixture (ceiling). If you
  legitimately **reduce** holes, lower that number in the workflow so CI stays honest.
- **Parser parity:** `packages/parser-bridge/tests/nikic.test.ts` includes this page
- **Oracle:** optional `Chrysalis\Oracle\Db\MySQLi` when the prelude is present (same pattern as tiny-blog PDO)

There is no bundled MySQL database; `schema.sql` documents a minimal table layout for operators.

Route pages intentionally omit `require_once lib/db.php` (same pattern as `fixtures/tiny-blog/pages/*`): a
front controller would load `lib/db.php` before the page; ingest still resolves **`query_*`** via the call-effect map.

**`GET /widgets/db-query`** (`pages/direct_query.php`) calls **`db()->query("SELECT …")`**, which ingest lowers to
**`effect.db.query`**.

**`GET /widgets/alias-query`** (`pages/alias_query.php`) assigns **`$db = db()`** then **`$db->query(...)`**; ingest
tracks **`db()`** aliases and lowers the call the same way.

**`GET /widgets/mysqli-new-query`** (`pages/mysqli_new_query.php`) uses **`$m = new mysqli(...); $m->query(...)`**;
ingest treats **`new mysqli`** like **`db()`** for **`->query`** lowering.

**`GET /widgets/alias-copy`** (`pages/alias_copy.php`) uses **`$b = $a`** after **`$a = db()`** so **`$b->query`**
is lowered like **`$a->query`**.

**`GET /widgets/pdo-query`** (`pages/pdo_query.php`) uses **`$pdo = new PDO(...); $pdo->query(...)`** on **`widgets`**.

**`GET /widgets/factory-query`** (`pages/factory_query.php`) assigns **`DbFactory::getConnection()`** then **`->query`** on **`widgets`** (same SQL shape as other probe routes).

**`GET /widgets/factory-query-chain`** (`pages/factory_query_chain.php`) calls **`DbFactory::getConnection()->query(...)`** directly.

Receivers must be **`db()`**, a variable assigned **`db()`** / **`new mysqli`** / **`new PDO`** / **`mysqli_connect(...)`**, a **manifest-listed** static factory return, copied
from a tracked variable (**`$b = $a`**), or a direct **`db()->query`** / listed **`Factory::method()->query`**; other **`$x->query`** shapes stay
**`legacy:db-query-unknown-receiver`** (see **`fixtures/db-query-unknown-receiver-probe`**).
