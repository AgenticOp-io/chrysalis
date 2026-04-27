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
type in the Node package for rule semantics.

## SQL query rows (verify replay)

Prepared statements and `PDO::query()` buffer the full result set after execute
so each `sql.query` event can include a `rows` array (JSON objects). Node
verify replays those rows through the `x-chrysalis-sql-tape` header when
`recordedSqlReplay` is enabled. Large results are capped per query (see
`Recorder::MAX_SQL_ROWS_PER_EVENT`).

`MySQLi::query()` records SQL text, duration, driver `mysqli`, row count, shape,
and (for default `MYSQLI_STORE_RESULT` selects) full assoc rows after buffering,
then rewinds the live `mysqli_result` with `data_seek(0)` so the app sees the
same cursor. Unbuffered `MYSQLI_USE_RESULT` selects omit row payloads (row count
may stay unknown until the client finishes reading).

`MySQLi::prepare()` returns `MySQLiStatement`, which emits on `execute()` for
mutations and on the first `get_result()` or `store_result()` for result sets;
`get_result()` includes row payloads when mysqlnd is available (same requirement
as vanilla `mysqli_stmt::get_result()`). Each `sql.query` carries a `params`
array from `execute([...])` when used, or from the variables last passed to
`bind_param()` (execute-time snapshot). Indirect `bind_param` via
`call_user_func_array` is not traced as parameters.

## Outbound HTTP

Requires `allow_url_fopen=1` (default on most installs). The wrapper delegates
to PHP’s built-in HTTP stream implementation and records method, URL, status,
response byte length, and duration after the stream closes.

## Mail

There is no safe way to intercept global `mail()` from userland. Use
`Chrysalis\Oracle\Mail::send(...)` as a drop-in when you want `mail.send`
events (subject/to redaction uses `mail.subject` / `mail.to` rules).

## Session bridge (with emitted Hono apps)

When the emitted app sets `CHRYSALIS_SESSION_DIR`, it persists session data as
`{dir}/{sid}.json`. To share state with PHP, use the **same** directory, the
same cookie name (`CHRYSALIS_SESSION_COOKIE`, default `chrysalis_sid`), and
read/write JSON objects with the same keys (e.g. `user_id`). PHP must call
`session_name()` to match the cookie name and load/save JSON compatible with
Node (plain scalars and arrays — not PHP object graphs).

## Status

Milestone 1: PDO SQL capture. Milestone 2 adds outbound HTTP (stream wrapper)
and opt-in mail via `Mail::send`. Milestone 6 adds first-class `mysqli` capture
via `Chrysalis\Oracle\Db\MySQLi` and `MySQLiStatement` (`query()` + prepared
paths). Non-URL `file_put_contents` remains future work.
