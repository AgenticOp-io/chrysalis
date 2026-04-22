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
  get SQL instrumentation for free.

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

## Status

Milestone 1 supports PDO only. `mysqli`, `file_put_contents`, `mail`, and
outbound HTTP instrumentation are deferred to Milestone 2.
