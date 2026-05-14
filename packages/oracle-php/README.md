# chrysalis/oracle (PHP side)

Userland PHP prelude that records HTTP, SQL, and other side effects for a
running PHP app and emits NDJSON traces into a directory. This is the "record"
half of the Chrysalis Oracle. The "read/index/verify" half lives in the Node
package [`@chrysalis/oracle`](../oracle).

## How it works

One PHP file, `src/bootstrap.php`, is loaded via `auto_prepend_file` before the
app runs. It:

- reads the configured trace directory and redaction config from env vars,
- starts an output buffer to capture the response body,
- registers a `shutdown_function` to flush a trace file atomically,
- subclasses `PDO` in `Chrysalis\Oracle\Db\PDO` so apps that swap their factory
  get SQL instrumentation for free,
- subclasses `mysqli` / `mysqli_stmt` in `Chrysalis\Oracle\Db\MySQLi` and
  `Chrysalis\Oracle\Db\MySQLiStatement` for `query()` and prepared-statement SQL
  instrumentation when apps use mysqli factories,
- registers `HttpStreamWrapper` for `http://` and `https://` so `fopen` /
  `file_get_contents` URL fetches emit `http.outbound` events.

The schema of the NDJSON output is pinned by
[`packages/oracle/src/trace-schema.ts`](../oracle/src/trace-schema.ts). The PHP
and Node sides both assert against the same `SCHEMA_VERSION`.

**`sql.query` row redaction:** rules with path **`sql.row.<column>`** (see
`DEFAULT_REDACTION` in the Node oracle package) apply to **`rows`** cells on a
case-insensitive column-name match.

**`sql.query` bind redaction:** rules with path **`sql.params[<driver>:<sqlPrefix>].<index>`**
(see `packages/oracle/src/redaction.ts`) apply to **`params`** list entries when the event’s
**`driver`** matches (`*` matches any) and **`sql`** starts with **`sqlPrefix`** (case-insensitive,
prefix must be non-empty). **`drop`** is stored as **mask** so bind arity stays stable for replay tapes.
**`sql.params` rules run only when `rowShape` is empty** (mutation-shaped events): SELECT binds can
appear in recorded-SQL tape matching and are left untouched at capture time.

## Smoke tests (PHP)

From the repo root (PHP 8+ on `PATH`):

```sh
pnpm run test:oracle-php-redactor
# equivalent:
php packages/oracle-php/tests/redactor_sql_rows_test.php
php packages/oracle-php/tests/redactor_sql_params_test.php
```

CI **`typecheck-and-test`**, **`oracle-live-drive`**, **`verify-e2e`**, **`verify-flagship-laravel-min`**, and
**`verify-flagship-laravel-full`** run both after install/build so Node Vitest skips (no PHP on PATH) do not
hide PHP regressions.

**mysqli end-to-end smoke (CI only by default):** with **`CHRYSALIS_MYSQLI_SMOKE=1`** and env
**`CHRYSALIS_MYSQL_HOST`**, **`CHRYSALIS_MYSQL_PORT`**, **`CHRYSALIS_MYSQL_USER`**, **`CHRYSALIS_MYSQL_PASSWORD`**,
**`CHRYSALIS_MYSQL_DATABASE`** pointing at a reachable MySQL 8 server (CI uses a job service), run:

```sh
php packages/oracle-php/tests/mysqli_capture_smoke.php
```

The script retries the TCP connect, exercises **`Chrysalis\Oracle\Db\MySQLi`** + prepared **`get_result()`**,
and checks the written NDJSON for mysqli **`sql.query`** events including **`params`**. Without the smoke
flag it prints a skip line and exits **0**. Ingest coverage for mysqli-backed apps that still use the same
SQL helper names lives in **`fixtures/mysqli-probe`** (**DESIGN D215**).

## Running

The `chrysalis observe` CLI sets up the env and starts PHP's built-in server
with the prelude wired in. If you'd rather do it by hand:

```sh
export CHRYSALIS_TRACE_DIR=/abs/path/to/traces
export CHRYSALIS_REDACTION_JSON='{"rules":[{"path":"request.post.password","kind":"mask"}]}'
php -d auto_prepend_file=packages/oracle-php/src/bootstrap.php \
    -S 127.0.0.1:8080 -t fixtures/tiny-blog
```

## Redaction

Redaction is applied **at capture time**. Traces on disk are always safe to
share at whatever level the configured rules specify. See the `RedactionConfig`
type in the Node package for rule semantics. **`Redactor.php` must stay in
lockstep** with `packages/oracle/src/redaction.ts` (`DEFAULT_REDACTION`); the
CLI loads **`chrysalis.observe.json`** when present, **merges** those rules onto
**`DEFAULT_REDACTION`** (same path overrides `kind`), and passes the resulting canonical JSON in the env.

## SQL query rows (verify replay)

Prepared statements and `PDO::query()` buffer the full result set after execute
so each `sql.query` event can include a `rows` array (JSON objects). Node
verify replays those rows through the `x-chrysalis-sql-tape` header when
`recordedSqlReplay` is enabled. Large results are capped per query (see
`Recorder::MAX_SQL_ROWS_PER_EVENT`).

`MySQLi::query()` records SQL text, duration, driver `mysqli`, row count, shape,
and (for default `MYSQLI_STORE_RESULT` selects) full assoc rows after buffering,
then rewinds the live `mysqli_result` with `data_seek(0)` so the app sees the
same cursor. Unbuffered `MYSQLI_USE_RESULT` selects omit row payloads and
report `rowCount: 0` (unknown at capture time) to avoid forcing cursor drains
or driver-specific `num_rows` behavior before app reads.

`MySQLi::prepare()` returns `MySQLiStatement`, which emits on `execute()` for
mutations and on the first `get_result()` or `store_result()` for result sets;
`get_result()` includes row payloads when mysqlnd is available (same requirement
as vanilla `mysqli_stmt::get_result()`). Each `sql.query` carries a `params`
array from `execute([...])` when used, or from the variables last passed to
`bind_param()` (execute-time snapshot). Indirect `bind_param` via
`call_user_func_array` is not traced as parameters. On mysqlnd-less installs
where `get_result()` returns `false`, pending SELECT capture is preserved so a
subsequent `store_result()` can still emit `sql.query`.

## Outbound HTTP

Requires `allow_url_fopen=1` (default on most installs). The wrapper delegates
to PHP’s built-in HTTP stream implementation and records method, URL, status,
response byte length, and duration after the stream closes.

## Mail

There is no safe way to intercept global `mail()` from userland. Use
`Chrysalis\Oracle\Mail::send(...)` as a drop-in when you want `mail.send`
events (subject/to redaction uses `mail.subject` / `mail.to` rules).

## Session bridge (with emitted Hono / Fastify apps)

### File-backed (`CHRYSALIS_SESSION_DIR`)

When the emitted app sets `CHRYSALIS_SESSION_DIR`, it persists session data as
`{dir}/{sid}.json`. To share state with PHP, use the **same** directory, the
same cookie name (`CHRYSALIS_SESSION_COOKIE`, default `chrysalis_sid`), and
read/write JSON objects with the same keys (e.g. `user_id`). PHP must call
`session_name()` to match the cookie name and load/save JSON compatible with
Node (plain scalars and arrays — not PHP object graphs).

### Redis (`CHRYSALIS_SESSION_REDIS_URL`, DESIGN D178 / D273)

Emitted TypeScript uses Redis keys `chrysalis:sess:<sid>` with a JSON object
payload (same cookie name env as above). For **legacy PHP** on the same origin,
call **`Chrysalis\Oracle\Session\RedisChrysalisSessionHandler::registerFromEnv()`**
once **before** `session_start()` when `CHRYSALIS_SESSION_REDIS_URL` is set to the
same URL as the Node process. Requires the **phpredis** extension (`ext-redis`).
The handler sets `session.serialize_handler` to `php_serialize` so PHP session
arrays round-trip as JSON next to Node.

**`rediss://` (TLS):** supported with **phpredis** via a TLS client stream (default port **6379** when omitted). Optional query **`verify_peer=0`** or **`verify_peer=false`** disables certificate verification (use only when your platform requires it). **`RedisChrysalisSessionHandler::connectRedis($url)`** exposes the same connection rules for smoke tests (`packages/oracle-php/tests/redis_session_bridge_smoke.php`).

## Status

Milestone 1: PDO SQL capture. Milestone 2 adds outbound HTTP (stream wrapper)
and opt-in mail via `Mail::send`. Milestone 6 adds first-class `mysqli` capture
via `Chrysalis\Oracle\Db\MySQLi` and `MySQLiStatement` (`query()` + prepared
paths). Non-URL `file_put_contents` remains future work.
