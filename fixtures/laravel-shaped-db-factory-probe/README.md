# laravel-shaped-db-factory-probe

Documents **three** copy-paste callee labels for **`chrysalis.routes.json`** **`dbFactoryReturnCallees`** (see **D224** / **D225**):

1. **`Illuminate\Support\Facades\DB::connection`** — minimal class under `lib/Illuminate/...` (not a full Laravel app).
2. **`App\Database\Support\Conn::make`** — PSR-4-style app factory.
3. **`ChrysalisProbe\Repo::db`** — static method named `db` (not the global `db()` function).

**What is real vs synthetic**

- **Ingest / WebIR:** `pnpm exec vitest run packages/ingest/tests/laravel-shaped-db-factory-probe.test.ts` asserts four routes, **zero** holes, and **`db.read:probe_row`** on each handler (SQL includes **`FROM probe_row`** for effect tagging).
- **PHP runtime:** `lib/pdo_probe_schema.php` opens **`sqlite::memory:`**, creates **`probe_row`**, inserts a row, and returns **`PDO`**. Factory methods use that helper so **`->query('SELECT … FROM probe_row …')`** succeeds if you run the handlers under PHP (no on-disk DB file).
- **Parser nikic parity:** Requires Composer **`packages/parser-bridge/vendor`** and PHP on PATH locally; **CI** runs it (`.github/workflows/ci.yml`).

Handlers use only **`->query(...)`** (no `fetch_assoc`, etc.) so the probe stays focused on factory lowering.
