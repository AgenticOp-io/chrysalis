# Operations

This document is the practical runbook for running Chrysalis day to day: how to ingest and emit a real project, capture and merge traces, replay against the new app, look at the migration dashboard, and run the dual-stack router. It assumes you have already built the workspace ([Installation](./INSTALLATION.md)) and read the [User guide](./USER-GUIDE.md) at least once. For complete end-to-end scenarios — first-time setup, production capture, canary rollout, rollback — see the [How-to cookbook](./HOW-TO.md). For **Python** / **Go** entrypoints that still run the Node CLI, see [Installation](./INSTALLATION.md#optional-python-and-go-entrypoints-same-cli) (**DESIGN D295**).

Examples assume the Chrysalis workspace root is the current directory and the CLI has been built (`pnpm -r build`).

---

## Table of contents

1. [The command map](#the-command-map)
2. [Ingest and emit](#ingest-and-emit)
3. [Working with very large projects](#working-with-very-large-projects)
4. [Capture (observe)](#capture-observe)
5. [Working with multi-host capture](#working-with-multi-host-capture)
6. [Verify](#verify)
7. [Splitting verify across machines](#splitting-verify-across-machines)
8. [Status and migration debt](#status-and-migration-debt)
9. [Dual-stack rollout](#dual-stack-rollout)
10. [Sharing sessions between PHP and Node](#sharing-sessions-between-php-and-node)
11. [Operator metrics, fleet rollups, privacy](#operator-metrics-fleet-rollups-privacy)
12. [CI helper scripts](#ci-helper-scripts)
13. [Where outputs land](#where-outputs-land)

---

## The command map

| If you want to … | Run |
| --- | --- |
| Look at how much of the app translates today | `chrysalis ingest <php-root>` |
| Generate a TypeScript service | `chrysalis emit … --target=hono` (or `fastify`) |
| Record real PHP traffic as test data | `chrysalis observe <php-root> --traces <dir>` |
| Sanity-check a captured corpus | `chrysalis corpus <traces-dir>` |
| Combine captures from several machines | `chrysalis corpus-merge <dir> [<dir> …] --out <merged>` |
| Replay captured traffic against the new app | `chrysalis verify <traces-dir> --base-url <url> --report <dir>` |
| Combine verify reports from a parallel run | `chrysalis verify-merge <summary>… --json-out` |
| See a migration dashboard | `chrysalis status --project <php-root>` (add `--json` for CI) |
| Find code-quality findings | `chrysalis insight <php-root>` |
| Run a verify-driven repair loop | `chrysalis repair <traces-dir> --base-url <url> --project <php-root>` |
| Run both stacks behind one URL | `chrysalis deploy --mode=… --legacy <url> --modern <url>` |

If `chrysalis` is not on your `PATH`, prefix every command with `node packages/cli/dist/bin.js` instead.

---

## Ingest and emit

The minimal PHP-to-TypeScript loop is two commands:

```bash
node packages/cli/dist/bin.js ingest /path/to/your-php-app
node packages/cli/dist/bin.js emit /path/to/your-php-app \
    --out generated/your-app --target=hono
```

The first prints a summary so you can see how many routes Chrysalis recognized, how many graph nodes it produced, and how many holes (typed placeholders for things it refused to guess) it inserted. The second writes a complete Node project to `generated/your-app/` that you can `npm install && npm start`.

**Pick a parser if needed.** The default Glayzzle parser works for the vast majority of PHP. If your code uses unusual namespace tricks or dynamic constructs and Glayzzle struggles, pass `--parser-provider nikic`. That requires `php` on `PATH` and the parser-bridge `vendor/` (see [Installation](./INSTALLATION.md)).

```bash
node packages/cli/dist/bin.js ingest /path/to/your-php-app --parser-provider nikic
```

**Add typed rows when you have a schema.** Pointing `--schema` at your SQL DDL lets emit attach typed row generics to `queryOne` and `queryAll`, write a `domain.ts` of TypeScript interfaces, and (when possible) a Drizzle `schema.ts`. Each field carries a comment explaining where the type came from (the DDL line, observed traces, an HTML form input).

```bash
node packages/cli/dist/bin.js emit /path/to/your-php-app \
    --out generated/your-app --target=hono --schema /path/to/schema.sql
```

**Optional emit layouts.** Several flags reshape how the output is organized; they do not change behavior. Pick whichever ones make your generated tree easier to navigate or smaller:

| Flag | What it changes |
| --- | --- |
| `--emit-handler-import-barrel` | Adds `src/chrysalis-handler-imports.ts` that re-exports every handler. `server.ts` then imports from one place. |
| `--emit-shared-runtime-imports` | Adds `src/chrysalis-runtime-imports.ts` that re-exports the runtime helpers handlers need. Cuts repeated imports across handlers. **Mutually exclusive** with `--emit-handler-import-barrel`. |
| `--emit-dedupe-identical-handler-bodies` | Detects routes whose lowered bodies are byte-identical and emits **one** shared module under `src/chrysalis-deduped/`, with each duplicate route becoming a thin wrapper. Useful in template-heavy apps. |
| `--emit-route-path-constants` | Adds `src/chrysalis-route-paths.ts` with named constants for every route path. |
| `--emit-handler-fingerprints` | Writes `chrysalis.emit-handler-fingerprints.json` with a SHA-256 per emitted handler. Good for detecting unintended changes between builds. |
| `--emit-runtime-facade` | Adds `src/chrysalis-runtime-facade.ts` re-exporting `runtime.ts`. Gives PHP-shaped shims a stable import path. |
| `--emit-route-registration lazy` | Routes register on first request rather than eagerly at boot. Useful when you have thousands of routes. |

**Survive a crash with `--emit-resume`.** If a previous emit was interrupted, re-running with `--emit-resume` skips handler files already written (tracked in `<out>/.chrysalis-emit-state.json`); scaffolding files and shared modules are regenerated from the full route set. Drop the flag for a fresh write.

---

## Working with very large projects

### When ingest takes too long

Run several ingest jobs in parallel, each on a different shard of the route list. Every shard is deterministic: route X always lands in the same shard for the same `--shard-count`.

```bash
# Machine 0
node packages/cli/dist/bin.js ingest /path/to/huge-app --shard-index 0 --shard-count 4

# Machine 1, 2, 3 — same command with --shard-index 1, 2, 3
```

When all four shards finish, get a single combined graph by re-ingesting once with `--merge-all-shards`:

```bash
node packages/cli/dist/bin.js ingest /path/to/huge-app --merge-all-shards --shard-count 4
```

This re-runs each shard in turn (cheap when caching is on) and merges them with cross-shard duplicate-IR removal, so library code shared by many routes is not duplicated in memory.

`emit` and `status --project` accept the same flags.

### Caching the parser output

Pass `--ingest-cache <dir>` to keep parsed PHP ASTs on disk between runs. Files keyed by SHA-256 of contents plus parser provider plus an internal cache version. Unchanged files are skipped on the next run.

```bash
node packages/cli/dist/bin.js ingest /path/to/huge-app --ingest-cache .chrysalis/ast-cache
```

The cache is invalidated automatically when any of the keying inputs change.

### Resuming after a crash

For genuine resume across processes, add a checkpoint file:

```bash
# First run — builds the cache and the checkpoint
node packages/cli/dist/bin.js ingest /path/to/huge-app \
    --ingest-cache .chrysalis/ast-cache \
    --ingest-checkpoint-file .chrysalis/ingest.ckpt

# After a crash — same command plus --ingest-resume-checkpoint
node packages/cli/dist/bin.js ingest /path/to/huge-app \
    --ingest-cache .chrysalis/ast-cache \
    --ingest-checkpoint-file .chrysalis/ingest.ckpt \
    --ingest-resume-checkpoint
```

Resume will pick up at the first route the previous run did not complete. Checkpoints cannot be combined with `--merge-all-shards`; for sharded runs, give each shard its own checkpoint path.

### Watching how far ingest got (forensics)

If a run might be killed by an OOM or timeout, ask Chrysalis to append a JSON line for each completed route:

```bash
node packages/cli/dist/bin.js ingest /path/to/huge-app \
    --ingest-progress-file .chrysalis/ingest.progress
```

After a crash, read the file. The last successful route's manifest fingerprint and key are recorded. This file is for debugging and dashboards; it does not affect the run. Cannot be combined with `--merge-all-shards` because shards would all write to the same path.

### Trimming duplicate IR within one ingest

Some apps have many routes that lower to identical subgraphs (for example, when a single helper is called from many places). Optionally collapse them after ingest:

```bash
node packages/cli/dist/bin.js ingest /path/to/huge-app \
    --ingest-dedupe-structural-subgraphs
```

This shrinks the in-memory graph and the on-disk emit output. Default is off because the cost is small but real and the benefit is project-specific. Pair with `--ingest-dedupe-structural-subgraphs-ignore-origin` to merge subgraphs even when the PHP file/line metadata differs (stricter matching).

---

## Capture (observe)

`observe` starts a local PHP built-in server with the Chrysalis capture file (`packages/oracle-php/src/bootstrap.php`) loaded ahead of your application via `auto_prepend_file`. Each HTTP request through that server produces NDJSON trace lines under the directory you choose.

```bash
node packages/cli/dist/bin.js observe /path/to/your-php-app \
    --traces ./captures --port 8080
```

In another terminal, drive HTTP traffic at `http://127.0.0.1:8080`. Use your existing smoke tests, your QA team's recorded suite, a Selenium script, or a few curl commands. Each request creates one trace file under `./captures/<YYYY-MM-DD>/`.

For staging or production capture, **load the same `bootstrap.php` from your existing PHP-FPM or Apache configuration** with `php_value auto_prepend_file=…`, set `CHRYSALIS_TRACE_DIR` to a writable directory, and let the application run normally. `observe` is the convenience wrapper; the bootstrap file is the actual capture mechanism.

### Customizing redaction

Defaults already redact common sensitive data: Authorization and cookie headers, common API key headers, well-known session cookies (`PHPSESSID`, `laravel_session`, …), CSRF/token-shaped POST fields, sensitive query parameters (`access_token`, `code`, `state`), `Set-Cookie` headers, and SQL row columns whose names look sensitive.

To extend or override the rules, drop a `chrysalis.observe.json` at the PHP root:

```json
{
  "rules": [
    { "path": "request.post.password", "kind": "drop" },
    { "path": "response.headers.x-internal-debug", "kind": "drop" },
    { "path": "sql.row.ssn", "kind": "mask" },
    { "path": "sql.params[mysqli:UPDATE users SET pwd].0", "kind": "mask" }
  ]
}
```

Rules merge on top of the defaults; same `path` overrides the built-in `kind`. Invalid JSON or unknown rule shapes exit with code `2` and a stderr line starting with `[observe]`.

The same defaults are encoded twice — once in `packages/oracle/src/redaction.ts` and once in `packages/oracle-php/src/Redactor.php`. They must stay in sync. After changing either, run:

```bash
pnpm run test:oracle-php-redactor
```

CI runs the PHP-side redactor smoke tests in every relevant lane.

### Quick sanity check

```bash
node packages/cli/dist/bin.js corpus ./captures
```

Output (illustrative):

```text
traces: 320
  GET /                         105
  GET /posts/:id                 60
  POST /comments                100
  PUT /posts/:id                 55
  side effects: http.outbound=12 mail.send=3
```

---

## Working with multi-host capture

When several machines or environments capture traffic, give each one a stable top-level directory so files never collide:

```
captures/
  host-a/
    2025-05-01/
      *.ndjson
  host-b/
    2025-05-02/
      *.ndjson
```

Before you verify, combine those into one corpus root:

```bash
node packages/cli/dist/bin.js corpus-merge \
    captures/host-a captures/host-b \
    --out captures/merged
```

The defaults are conservative: if two source trees both contain `2025-05-01/foo.ndjson`, the merge fails. Use `--on-duplicate skip` to take the first. Use `--dedupe-trace-id skip` to also skip whole files whose trace id was already copied from an earlier source.

To take a stable random sample instead of a full copy:

```bash
node packages/cli/dist/bin.js corpus-merge captures/host-a captures/host-b \
    --out captures/sampled --sample-modulo 8 --sample-remainder 0
```

This keeps roughly 1 in 8 traces. Same trace id always lands in the same bucket, so the sample is repeatable across runs.

To preview without writing anything, add `--dry-run`. To capture the merge decisions in a JSON summary CI gates can validate, add `--json-out reports/corpus-merge.json`. The JSON document carries `kind: chrysalis.corpus-merge.summary` and `schemaVersion: 1`.

**Important:** redaction rules must already be aligned across writers before you merge. Otherwise you risk one host's looser settings leaking into a corpus you intended to share.

---

## Verify

Verify replays a corpus against a running emitted server and compares responses to what was recorded.

```bash
# Terminal A: run the new app
cd generated/your-app
npm install
PORT=3000 npm start

# Terminal B: replay the corpus against it
node packages/cli/dist/bin.js verify ./captures \
    --base-url http://127.0.0.1:3000 \
    --threshold 0.95 \
    --report reports/verify
```

After the replay finishes, `reports/verify/summary.json` has the overall correctness score and `reports/verify/<route>.json` files have per-route detail. The console prints an aggregate line, per-route breakdown, and (for any failures) divergence kinds and hints.

### Make the output machine-readable

For CI, pass `--json-summary`. Stdout becomes a single JSON object you can pipe to `jq`; progress moves to stderr.

```bash
node packages/cli/dist/bin.js verify ./captures \
    --base-url http://127.0.0.1:3000 --json-summary | tee /tmp/v.json | jq '.aggregate.correctness'
```

The document carries `kind: chrysalis.verify.summary` and `schemaVersion: 1`. The `pass` field is `true` exactly when the aggregate score met `--threshold`.

### Replay without a database

When traces include SELECT row payloads (the PHP capture records them by default for prepared statements with mysqlnd), verify can replay reads from a "tape" header instead of hitting a real database. This is the default. Pass `--no-recorded-sql` to force a live database hit instead.

### Speed up replay

`--replay-concurrency N` runs N replays in parallel. Each parallel worker has an isolated cookie jar, so the flag requires `--disable-cookie-chain` (or the env var `CHRYSALIS_VERIFY_DISABLE_COOKIE_CHAIN=1`).

`--replay-worker-threads` pushes replay into Node worker threads — useful when payload decoding is the bottleneck. Requires concurrency > 1 and the global `fetch` (no injected fetch).

`--replay-timeout-ms` puts a per-request timeout. Default is unlimited.

### Repository wrapper scripts

The workspace ships a few one-shot scripts that capture against the bundled fixtures and run a verify loop:

```bash
pnpm run verify:e2e           # tiny-blog: capture, merge two synthetic hosts, replay against Hono
pnpm run verify:flagship      # flagship/laravel-min
pnpm run verify:laravel-full  # flagship Laravel + Chrysalis templates (needs composer + a prior scaffold)
```

These are useful when validating workspace changes against a known fixture; they are not required for using Chrysalis on your own code.

---

## Splitting verify across machines

For a corpus with many traces, fan replay out across processes or machines.

Step 1 — run multiple `verify` commands on the same traces directory with `--shard-index i --shard-count K`. Each shard handles only the traces whose hash falls in its bucket and writes its own report tree.

```bash
# Machine 0
node packages/cli/dist/bin.js verify ./captures \
    --base-url http://127.0.0.1:3000 \
    --shard-index 0 --shard-count 4 --report reports/verify-shard0

# Machine 1, 2, 3 — same command with --shard-index 1, 2, 3
```

Step 2 — combine the per-shard reports into one merged correctness view. No HTTP runs in this step.

```bash
node packages/cli/dist/bin.js verify-merge \
    reports/verify-shard0/summary.json \
    reports/verify-shard1/summary.json \
    reports/verify-shard2/summary.json \
    reports/verify-shard3/summary.json \
    --json-out > reports/verify/merged.json
```

The merged document carries `kind: chrysalis.verify.summary.merged`. Use `--shard-count K` on `verify-merge` only when the original fan-out differed from the number of summary files (for example, an empty shard wrote no report).

---

## Status and migration debt

`status` is the single dashboard. Pointed at a project, traces directory, and report directory, it prints how much of the app is translated, how correct the new code is against captured traffic, and (in JSON) the underlying numbers.

```bash
node packages/cli/dist/bin.js status \
    --project /path/to/your-php-app \
    --traces ./captures \
    --report reports/verify \
    --schema /path/to/schema.sql
```

For automation, add `--json`. The whole document goes to stdout as one JSON object; sharding/merging progress moves to stderr so the stream stays pipeable.

```bash
node packages/cli/dist/bin.js status \
    --project /path/to/your-php-app --json | jq '.correctness.aggregate'
```

When `--project` is set, status also writes `reports/oracle-footprint.json`: a per-route summary of the side effects a replay would care about (DB reads/writes, sessions, time, randomness, outbound HTTP). This is useful for estimating how expensive a verify run will be before you start one.

### One-page migration debt summary

A small wrapper turns `status --json` into a one-screen human summary plus optional gate flags:

```bash
pnpm run migration-debt -- --project /path/to/your-php-app \
    --max-holes 0 --json-out reports/migration-debt.json
```

It exits non-zero when `--max-holes` or `--min-correctness` thresholds are not met, and writes a `chrysalis.migration-debt.summary` JSON file you can attach to CI artifacts.

It accepts the same scale-out flags as `status`:

```bash
pnpm run migration-debt -- --project /path/to/your-php-app \
    --merge-all-shards --shard-count 4 --json-out reports/migration-debt.json
```

---

## Dual-stack rollout

`chrysalis deploy` starts a single HTTP listener (Chimera) that proxies to either your legacy PHP server or your new Node server, based on a mode and a set of rules.

```bash
node packages/cli/dist/bin.js deploy --mode=shadow \
    --legacy http://127.0.0.1:18080 \
    --modern http://127.0.0.1:3000 \
    --port 8080 \
    --shadow-log-dir reports/shadow
```

In `shadow`, every request goes to PHP and the response is returned to the client. The same request is mirrored to Node in the background; the two responses are diffed using the same comparison rules verify uses, and divergences are appended to `reports/shadow/shadow.ndjson`. The client never sees the modern response.

Switch to `canary` to start sending a percentage of eligible traffic to Node:

```bash
node packages/cli/dist/bin.js deploy --mode=canary --canary-percent 10 \
    --legacy http://127.0.0.1:18080 \
    --modern http://127.0.0.1:3000 \
    --port 8080 \
    --canary-cookie chrysalis_sid \
    --canary-salt prod-cluster-a
```

Bucketing is sticky: the same user always lands on the same stack, picked by a hash of the configured cookie, header, or client IP plus a salt. The router sets two debug headers on every response so operators can see what happened:

- `x-chrysalis-target: legacy | modern | legacy-shadow`
- `x-chrysalis-canary: in | out | n/a` (only in canary mode)

### Routing rules in a JSON file

For non-trivial rule sets, put them in a JSON file and pass `--config <file>`. Flags still override file values.

```json
{
  "kind": "chrysalis.chimera.config",
  "schemaVersion": 1,
  "toolVersion": "2.0.1",
  "mode": "cutover",
  "legacy": "http://127.0.0.1:18080",
  "modern": "http://127.0.0.1:3000",
  "rules": [
    { "match": "GET /api/*", "target": "modern" },
    { "match": "/health",   "target": "modern" }
  ],
  "canary": {
    "percentModern": 10,
    "salt": "prod-cluster-a",
    "stickinessCookie": "chrysalis_sid"
  }
}
```

Patterns are `"/path"`, `"/prefix/*"`, or `"METHOD /path"`. First match wins.

For older single-file configs without `kind`, the loader still works (treated as version 0). For multi-node deployments behind a load balancer, give every instance the **same** file so all of them route the same way.

### Loading the config from a URL

If your routing config lives in object storage or a config service, load it over HTTP:

```bash
node packages/cli/dist/bin.js deploy --mode=cutover \
    --legacy http://127.0.0.1:18080 --modern http://127.0.0.1:3000 \
    --config-url https://config.internal/chimera.json
```

Or set `CHRYSALIS_CHIMERA_CONFIG_URL`. The fetch has a 30-second timeout and does not follow redirects. Cannot be combined with `--config <file>`.

### Optional HMAC signing

To guarantee that only configs signed by your secrets are ever loaded, add an `hmacSha256` field at the top level of the JSON. Two shapes are supported:

- A single 64-hex string. The deploy process verifies it against `CHRYSALIS_CHIMERA_CONFIG_HMAC_SECRET` (and optionally the JSON array `CHRYSALIS_CHIMERA_CONFIG_HMAC_PREVIOUS_SECRETS` for in-flight key rotation).
- An object mapping key id to 64-hex digest. Set `CHRYSALIS_CHIMERA_CONFIG_HMAC_KEYS_JSON` (or pass `--config-hmac-keys-json '<json>'`) to the subset of `{keyId: secret}` pairs the host knows. Verification succeeds if any listed digest matches.

To compute the digest for a payload, use the helpers in `@chrysalis/runtime-chimera`:

- `stableStringifyChimeraDeploySigningPayload(config)` — produces the deterministic JSON bytes that get signed.
- `computeChimeraDeployConfigHmacHex(config, secret)` — returns the hex digest for a single secret.
- `computeChimeraDeployConfigHmacHexByKeyIds(config, { keyId: secret, … })` — returns the digest map.

Or, offline, run:

```bash
node scripts/chimera-routing-fingerprint.mjs path/to/chimera.json
```

This prints the routing fingerprint (which is a separate, non-secret hash over the routing fields). Requires a built workspace.

### Reloading without restart

On Linux, send `SIGHUP` or `SIGUSR2` to the `chrysalis deploy` process to reload the file or re-fetch the URL. The old listener stops and a new one starts (a brief blip on that one instance). If the new config fails parse or HMAC, the previous listener stays running and a stderr line explains why.

On Windows, signal handling is limited; prefer process manager restarts.

### Key rotation in practice

For the simple string-digest layout: publish files signed with the new secret, distribute `CHRYSALIS_CHIMERA_CONFIG_HMAC_SECRET=<new>` plus `CHRYSALIS_CHIMERA_CONFIG_HMAC_PREVIOUS_SECRETS=["<old>"]` to all hosts so they accept either, then drop the old secret once everyone is on the new one.

For the object-digest layout: sign the same payload with both keys to produce `{"k2025": "<hex>", "k2026": "<hex>"}`. Hosts that hold both keys verify against either; hosts that only hold the new key still pass once the old one is removed. Distribute the new key id list as `CHRYSALIS_CHIMERA_CONFIG_HMAC_KEYS_JSON` and signal a reload.

---

## Sharing sessions between PHP and Node

When both stacks serve the same site, users must keep their session across the cutover. Three options:

| Backend | When to use it |
| --- | --- |
| **In-memory** (default) | Single-process testing only. |
| **JSON file per session** (`CHRYSALIS_SESSION_DIR`) | Single-host development. Both stacks read and write `{dir}/{sid}.json`. PHP writes JSON-compatible scalar values, not full PHP object graphs. |
| **SQLite** (`CHRYSALIS_SESSION_SQLITE_PATH`) | Single-host cutover or canary on emit-side; persists sessions across restarts. |
| **Redis** (`CHRYSALIS_SESSION_REDIS_URL`) | Multi-host. The right answer for production. |

The cookie name comes from `CHRYSALIS_SESSION_COOKIE` (default `chrysalis_sid`).

For the Redis option, point both PHP and Node at the same URL and use the same cookie name. PHP additionally needs the `phpredis` extension and one line of bootstrap before `session_start()`:

```php
\Chrysalis\Oracle\Session\RedisChrysalisSessionHandler::registerFromEnv();
session_start();
```

`rediss://` (TLS) is supported; an optional `verify_peer=0` query disables certificate verification for self-signed staging environments.

To smoke-test the bridge:

```bash
CHRYSALIS_SESSION_REDIS_URL=redis://127.0.0.1:6379 \
pnpm run test:oracle-php-session-redis
```

Skips cleanly when Redis or the PHP extension is missing.

---

## Operator metrics, fleet rollups, privacy

Chrysalis emits **only files**. There is no "phone home" of any kind. Every metric or summary you produce is yours; you decide what to do with it.

### Operator snapshots from the dual-stack router

Add `--operator-metrics-json <path>` and `--operator-metrics-ndjson <path>` to the deploy command. The first overwrites a JSON file every interval; the second appends one JSON line every interval. Both carry `kind: chrysalis.chimera.operator-snapshot` and `schemaVersion: 1`, plus a `deployRoutingFingerprintSha256` over the routing fields (mode, upstream URLs, rules, canary settings, host, port). Useful to detect "this node is running an older config than the rest of the cluster".

```bash
node packages/cli/dist/bin.js deploy --mode=cutover \
    --legacy http://127.0.0.1:18080 --modern http://127.0.0.1:3000 \
    --config /etc/chrysalis/chimera.json \
    --operator-metrics-json /var/lib/chrysalis/ops.json \
    --operator-metrics-ndjson /var/log/chrysalis/ops.ndjson \
    --operator-metrics-interval-ms 30000
```

`CHRYSALIS_CHIMERA_INSTANCE_ID` labels the snapshot (defaults to `hostname:pid`). Useful for fleet rollups.

### Combining snapshots across machines

If many hosts append NDJSON snapshots into one or more files, combine them offline:

```bash
node scripts/aggregate-chimera-operator-snapshots.mjs \
    ops-host-a.ndjson ops-host-b.ndjson > operator-batch.json
```

Stdout is a single `chrysalis.chimera.operator-snapshot.batch` document.

### Combining verify summaries

Same idea for verify outputs from many shards or replicas:

```bash
node scripts/aggregate-verify-summaries.mjs shard0.json shard1.json > verify-batch.json
```

Stdout is a single `chrysalis.verify.summary.batch` document.

### Status uplink

A simple wrapper turns one `status --json` document into a fleet-shaped uplink envelope (`chrysalis.fleet.status-uplink`, schema version 0):

```bash
node packages/cli/dist/bin.js status --project /path/to/your-php-app --json > /tmp/st.json
pnpm run fleet:export-status-uplink -- --payload-json /tmp/st.json --project-label your-app
```

The output is one envelope per project; combine many with `--items-json` or feed them to your own ETL.

### Privacy and storage

- Chrysalis ships only the schemas, fixtures, and helpers. The fleet artefacts are files your team owns; store them on infrastructure you control.
- Trace corpora are sensitive even with redaction defaults. Treat them like backups: encrypt, restrict, retain only as long as you need.
- Align `chrysalis.observe.json` across all writers before merging multi-host corpora. Otherwise one host's looser settings can leak into a corpus you intended to share.

---

## CI helper scripts

The repository ships a small set of scripts that wrap common gates so CI can call them by name. They live under `scripts/` and have shorthand names in the root `package.json`.

| Script (pnpm form) | What it does |
| --- | --- |
| `pnpm run verify:e2e` | Capture against the bundled tiny-blog fixture, merge two synthetic host corpora, replay against the Hono backend. |
| `pnpm run verify:flagship` | Same idea for the larger flagship Laravel-min fixture. |
| `pnpm run ci:verify-dual-summary -- <path>` | Validate that a verify summary file has the expected dual-backend shape. |
| `pnpm run ci:verify-merged-summary -- <path>` | Validate `chrysalis.verify.summary.merged`. |
| `pnpm run ci:corpus-merge-summary -- <path>` | Validate `chrysalis.corpus-merge.summary`. |
| `pnpm run ci:tiny-n1-insight -- <path>` | Validate `chrysalis insight` JSON for an N+1 fixture. |
| `pnpm run ci:migration-sidecar-floors -- <dir>` | Enforce optional idiomaticity / residual-legacy floors when env vars are set. |
| `pnpm run ci:emit-layout-floors -- <path>` | Enforce optional ceilings on emitted-file counts. |
| `pnpm run ci:chimera-operator-snapshot -- <path>` | Validate a chimera operator snapshot batch. |
| `pnpm run ci:verify-summary-batch -- <path>` | Validate a verify summary batch. |

All gates print operator-friendly stderr when their inputs are missing or malformed instead of throwing a stack trace.

To rotate or archive old day buckets after retention, the workspace ships a small reference mover:

```bash
pnpm run corpus:rotate-archive -- \
    --traces-root /var/lib/chrysalis/traces \
    --archive-root /var/lib/chrysalis/archive \
    --older-than-days 30 --dry-run
```

It moves each `YYYY-MM-DD` directory older than the threshold from `--traces-root` into `--archive-root`. Pass `--dry-run` to print the plan without renaming. Compression and storage tier choices are yours; the script touches only the directory layout.

---

## Where outputs land

By default, all outputs land under the workspace and are gitignored:

| Output | Location |
| --- | --- |
| Generated TypeScript projects | `generated/<your-app>/` |
| Captured traces | `traces/` (or wherever you point `--traces`) |
| Verify reports | `reports/verify/` (or `reports/verify-<shard>/` per shard) |
| CI dual-backend or merged verify summaries | `reports/ci/` |
| Insight reports | `reports/insight/` |
| Rewrite reports | `reports/rewrite/` |
| Migration sidecars | `reports/migration/` |
| Shadow-mode divergence stream | `reports/shadow/shadow.ndjson` |
| Chimera operator snapshots | `--operator-metrics-json` / `--operator-metrics-ndjson` paths |

Treat all of these as build outputs. Move long-lived corpora and reports to a private store you control; do not commit them to public repositories.

---

## Where to read next

- Environment variables and CI gates in detail: [Administration](./ADMINISTRATION.md).
- Where each component runs in CI and production: [Deployment](./DEPLOYMENT.md).
- The product walkthrough and command reference, if you have not already: [User guide](./USER-GUIDE.md).
- The architecture in narrative form: [Whitepaper](./WHITEPAPER.md).
