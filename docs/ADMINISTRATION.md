# Administration

This document is the reference for environment variables, CI gates, the report tree, redaction policy, and upgrade procedure.

It is the companion to [Operations](./OPERATIONS.md) (the runbook), [Deployment](./DEPLOYMENT.md) (where things run), and the [User guide](./USER-GUIDE.md) (per-command behavior).

---

## Table of contents

1. [Environment variables](#environment-variables)
2. [The report tree](#the-report-tree)
3. [CI gates](#ci-gates)
4. [Multi-host trace corpora](#multi-host-trace-corpora)
5. [Redaction and security](#redaction-and-security)
6. [Corpus retention and rotation](#corpus-retention-and-rotation)
7. [Upgrades](#upgrades)
8. [Logs and retention](#logs-and-retention)
9. [GitHub repository settings](#github-repository-settings)

---

## Environment variables

Variables fall into a handful of groups. Pick the table you need.

### Build / install

| Variable | Used by | Effect |
| --- | --- | --- |
| `CHRYSALIS_SKIP_PARSER_VENDOR` | `pretest` hook | Set to `1` to skip the parser-bridge vendor bootstrap. Tests that need the alternate `nikic` parser will skip cleanly. |
| `CHRYSALIS_PARSER_PROVIDER` | Ingest-driven CLIs | Default parser for ingest-driven commands when `--parser-provider` is omitted. Accepts `glayzzle` (default) or `nikic`. The flag still wins. |
| `CHRYSALIS_CLI_JS` | Python / Go CLI shims (`python/chrysalis_shim`, `go/shim`) | Absolute path to `packages/cli/dist/bin.js`. When set, shims skip walking parent directories to find the repo. **DESIGN D295**. |
| `CHRYSALIS_NODE` | Python / Go CLI shims | Path to the `node` binary used to run `CHRYSALIS_CLI_JS`. Overrides `PATH` lookup. **DESIGN D295**. |
| `CHRYSALIS_STRICT_CLI_SHIMS` | `pnpm run test:cli-shims` | Set to **`1`** to require **both** Go and Python shims to succeed (mirrors **`GITHUB_ACTIONS=true`**). **DESIGN D295**. |

### Ingest scale tests (Vitest only)

These are read by the synthetic many-routes ingest test. They do not affect production behavior.

| Variable | Effect |
| --- | --- |
| `CHRYSALIS_INGEST_BUDGET_MS` | When set to a positive integer, asserts that the synthetic ingest loop completes within that many milliseconds. |
| `CHRYSALIS_INGEST_RSS_MAX_BYTES` | When set, asserts that `process.memoryUsage().rss` after the loop is below this byte ceiling. |

### Verify replay

These are read by `chrysalis verify` when the matching CLI flag is omitted. The flag always wins.

| Variable | Equivalent flag |
| --- | --- |
| `CHRYSALIS_VERIFY_REPLAY_CONCURRENCY` | `--replay-concurrency N` |
| `CHRYSALIS_VERIFY_DISABLE_COOKIE_CHAIN` | `--disable-cookie-chain` (set to `1`) |
| `CHRYSALIS_VERIFY_TIMEOUT_MS` | `--replay-timeout-ms MS` (minimum 1000) |
| `CHRYSALIS_VERIFY_WORKER_THREADS` | `--replay-worker-threads` (set to `1`) |
| `CHRYSALIS_VERIFY_SHARD_COUNT` | `--shard-count K` |
| `CHRYSALIS_VERIFY_SHARD_INDEX` | `--shard-index I` (defaults to `0` when shard count is set) |

### Dual-stack router

| Variable | Used by | Effect |
| --- | --- | --- |
| `CHRYSALIS_CHIMERA_CONFIG_URL` | `chrysalis deploy` | Fetches the routing config from this URL. Mutually exclusive with `--config <file>`. |
| `CHRYSALIS_CHIMERA_CONFIG_HMAC_SECRET` | `chrysalis deploy` | When `hmacSha256` in the config is a hex string, this is the secret used to verify it. |
| `CHRYSALIS_CHIMERA_CONFIG_HMAC_PREVIOUS_SECRETS` | `chrysalis deploy` | JSON array of strings. Additional secrets accepted during a single-secret rotation. |
| `CHRYSALIS_CHIMERA_CONFIG_HMAC_KEYS_JSON` | `chrysalis deploy` | JSON object mapping `keyId → secret`. Used when `hmacSha256` is an object of digests. |
| `CHRYSALIS_CHIMERA_INSTANCE_ID` | `chrysalis deploy` | Label written to operator snapshots. Defaults to `hostname:pid`. |

### Emitted Node app

These are read by the Node service that `chrysalis emit` writes — not by Chrysalis itself.

| Variable | Effect |
| --- | --- |
| `PORT` | Port the emitted app listens on. Default `3000`. |
| `CHRYSALIS_DB_PATH` | Path to a SQLite file, when the emitted app uses `node:sqlite`. |
| `CHRYSALIS_SESSION_DIR` | One JSON file per session id under this directory. Single-host development only. |
| `CHRYSALIS_SESSION_SQLITE_PATH` | Shared SQLite session table. Single-host cutover or canary. |
| `CHRYSALIS_SESSION_REDIS_URL` | Redis-backed sessions. The right answer for multi-host. Supports `rediss://` for TLS. |
| `CHRYSALIS_SESSION_COOKIE` | Cookie name the emitted app uses for the session id. Default `chrysalis_sid`. |

The PHP capture file reads its own variables:

| Variable | Effect |
| --- | --- |
| `CHRYSALIS_TRACE_DIR` | Directory the PHP capture writes NDJSON traces into. Required when the bootstrap is loaded. |
| `CHRYSALIS_REDACTION_JSON` | Inline JSON redaction config. Otherwise the bootstrap reads `chrysalis.observe.json` from the PHP root. |

### Repair (optional LLM)

| Variable | Effect |
| --- | --- |
| `CHRYSALIS_REPAIR_LLM_API_KEY` | API key for the OpenAI-compatible chat endpoint used by `chrysalis repair --llm`. |
| `CHRYSALIS_REPAIR_LLM_BASE_URL` | Base URL for the chat endpoint. Defaults to OpenAI. |
| `CHRYSALIS_REPAIR_LLM_MODEL` | Model name. |
| `CHRYSALIS_REPAIR_VERBOSE` | Set to `1` for HTTP chat diagnostics on stderr. Same effect as `--repair-verbose`. |

### Commercial license gate

| Variable | Effect |
| --- | --- |
| `CHRYSALIS_REQUIRE_LICENSE` | Set to `1` (or `true`) to enforce the license gate on every command except `init` and `license`. |
| `CHRYSALIS_LICENSE` | The signed envelope as a base64 string. |
| `CHRYSALIS_LICENSE_PATH` | Path to a file containing the envelope. Used when `CHRYSALIS_LICENSE` is unset. |
| `CHRYSALIS_LICENSE_PUBLIC_KEY` | The Ed25519 public key as PEM. |
| `CHRYSALIS_LICENSE_PUBLIC_KEY_PATH` | Path to a PEM file. Used when the inline variant is unset. |
| `CHRYSALIS_LICENSE_MIN_TIER` | Optional. `dev`, `pro`, or `enterprise`. Enforces a minimum tier when the envelope's tier is below this value. |

Verification is offline. There is no license server.

### CI gate variables

| Variable | Used by | Effect |
| --- | --- | --- |
| `CHRYSALIS_VERIFY_DUAL_PROFILE` | `ci-gates verify-dual-summary` | Pins the expected `profile` string when validating dual-backend verify summaries. |
| `CHRYSALIS_VERIFY_MERGED_MIN_CORRECTNESS` | `ci-gates verify-merged-summary` | When set (`0..1`), requires `merged.aggregate.correctness` to be at least this value. |
| `CHRYSALIS_IDIOMATICITY_MIN`, `CHRYSALIS_RESIDUAL_LEGACY_MAX` | `ci-gates migration-sidecar-floors` | When set, enforces floors against the migration sidecar JSON. |
| `CHRYSALIS_EMIT_LAYOUT_MAX_HONO_*`, `CHRYSALIS_EMIT_LAYOUT_MAX_FASTIFY_*` | `ci-gates emit-layout-floors` | Optional integer ceilings on emitted-file metrics for the flagship `emit-stats` reports. |
| `CHRYSALIS_RELEASE_*` | `ci-gates migration-sidecar-floors-release` | Release-policy wrapper. See the script header comments. |
| `CHRYSALIS_SESSION_*`, `CHRYSALIS_DEPLOY_TOPOLOGY` | `ci-gates session-bridge-release` | Required posture for the session-bridge release lane. |
| `VERIFY_THRESHOLD` | `ci-gates status-migration` | Default `0.95`. The minimum aggregate correctness the gate accepts. |
| `CONFIDENCE_TREND_ALLOW_WARMUP`, `CONFIDENCE_STREAK_REQUIRED`, `CONFIDENCE_5NINES` | confidence gates | See the script header comments in `scripts/ci-gates.mjs`. |

**Important rule.** Generated handlers and the verify sandbox must not read time, randomness, or environment-dependent values from `process.env` directly. Chrysalis injects those values via the per-request context (`ctx.time`, `ctx.random`, …) so replay can pin them to the values from the trace. Reading `process.env`, `Date.now()`, `Math.random()`, or the live network from generated code is a bug.

---

## The report tree

By default Chrysalis writes outputs under the workspace root:

| Path | Contents |
| --- | --- |
| `reports/verify/` | `summary.json` plus per-route files from `chrysalis verify`. |
| `reports/verify/<backend>/` | Per-backend subdirs for dual-backend verify (`hono/`, `fastify/`). |
| `reports/ci/` | Dual-backend, merged, or batch summary documents fed to `pnpm run ci:*` gates. |
| `reports/migration/` | Optional sidecar JSON: `idiomaticity.json`, `residual-legacy.json`, flagship `emit-stats.json`. |
| `reports/shadow/shadow.ndjson` | One NDJSON line per shadow-mode divergence between PHP and Node. |
| `reports/insight/` | Insight reports written by `chrysalis insight --out`. |
| `reports/rewrite/` | Rewrite reports written by `chrysalis rewrite --report`. |
| `reports/oracle-footprint.json` | Per-route summary of side effects, written by `chrysalis status --project`. |
| `reports/confidence/` | Confidence-trend snapshots used by the five-nines gate. |

Treat all of these as build outputs. They are gitignored in the workspace; do not commit them. For long-lived storage move them to a private store you control.

The trace corpus (`traces/` by default) is also a build output, but a higher-value one: it is the behavioral test suite. Back it up as such.

---

## CI gates

`scripts/ci-gates.mjs` is one entry point with several subcommands. Each one validates a specific JSON shape or a small filesystem invariant.

```text
node scripts/ci-gates.mjs verify-dual-summary [path]
node scripts/ci-gates.mjs verify-merged-summary [path]
node scripts/ci-gates.mjs corpus-merge-summary [path]
node scripts/ci-gates.mjs migration-sidecar-floors [reports/migration]
node scripts/ci-gates.mjs emit-layout-floors [path/to/flagship-*-emit-stats.json]
node scripts/ci-gates.mjs session-bridge-release
```

Convenience wrappers in the root `package.json` (run with `pnpm run ci:<name>`):

| pnpm script | Validates |
| --- | --- |
| `ci:verify-dual-summary` | A dual-backend verify summary file (one section per backend, both with the same shape). |
| `ci:verify-merged-summary` | `chrysalis.verify.summary.merged` — the merged report from `verify-merge`. Optional minimum correctness. |
| `ci:corpus-merge-summary` | `chrysalis.corpus-merge.summary` — the JSON written by `corpus-merge --json-out`. |
| `ci:migration-sidecar-floors` | `reports/migration/*.json` against optional floors. No-ops when the env vars are unset. |
| `ci:emit-layout-floors` | Optional ceilings on emitted-file counts in the flagship `emit-stats` JSON. No-ops when the env vars are unset. |
| `ci:tiny-n1-insight` | A `chrysalis insight` report for an N+1 fixture meets minimum confidence. |
| `ci:chimera-operator-snapshot` | The operator-snapshot batch shape. |
| `ci:verify-summary-batch` | The verify-summary batch shape. |

When inputs are missing or malformed the gate prints an operator-friendly stderr line (with the resolved path and a short hint) instead of a stack trace. Each gate has a small Vitest fixture under `fixtures/ci/` so you can sanity-check the shape locally.

The `chrysalis --help` banner lists the major scale-out CLI flag families. CI keeps the banner stable so build scripts can grep for known strings.

The **GitHub Actions** job **`typecheck-and-test`** (`.github/workflows/ci.yml`) also runs **`pnpm run test:cli-shims`** after **`pnpm -r build`**. That script is **not** part of `ci-gates.mjs`; it smoke-tests the **Python** and **Go** shims that forward argv to the Node CLI (**DESIGN D295**, **`docs/INSTALLATION.md`**). With **`GITHUB_ACTIONS=true`** (or **`CHRYSALIS_STRICT_CLI_SHIMS=1`**), **both** shims must pass or the job fails.

---

## Multi-host trace corpora

When several machines or cells each run capture, give each one a stable top-level directory:

```
captures/
  host-a/
    2025-05-01/
      *.ndjson
  host-b/
    2025-05-02/
      *.ndjson
```

Before any verify run, combine those into one corpus root with `chrysalis corpus-merge` (see [Operations](./OPERATIONS.md) for the full flag list). Two rules to follow:

1. **Align redaction first.** Every host should run with the same `chrysalis.observe.json` (or equivalent rules) before you merge. Otherwise one host's looser settings leak into the merged corpus.
2. **Document who produced what.** In your runbook, write down which host or environment each top-level directory came from. The merge tool does not preserve this metadata.

For sampling, use `--sample-modulo K --sample-remainder R`. The sample is stable: the same trace id always falls in the same bucket across runs.

---

## Redaction and security

Capture-time redaction is security-sensitive. The defaults are encoded twice:

- **TypeScript side:** `packages/oracle/src/redaction.ts` (`DEFAULT_REDACTION`).
- **PHP side:** `packages/oracle-php/src/Redactor.php`.

When you change one, you must change the other. CI runs `pnpm run test:oracle-php-redactor` in every relevant lane to catch drift. Run it locally too:

```bash
pnpm run test:oracle-php-redactor    # requires php on PATH
```

To extend redaction per environment, drop a `chrysalis.observe.json` at each PHP app root. The bootstrap merges its rules on top of the defaults; same `path` overrides built-in `kind`. See `packages/oracle/README.md` for the full rule grammar.

For vulnerability reports, follow the policy in [`SECURITY.md`](../SECURITY.md).

---

## Corpus retention and rotation

The capture file appends one NDJSON file per request, organized by date:

```
traces/
  2025-05-01/
    <traceId>.ndjson
    ...
  2025-05-02/
    ...
```

Growth is roughly proportional to traffic times average payload size times the per-route side-effect count. You will want to keep only as much as you need for verify and any legal retention window.

The workspace ships a small reference rotation script that moves day buckets older than a threshold into an archive root:

```bash
pnpm run corpus:rotate-archive -- \
    --traces-root /var/lib/chrysalis/traces \
    --archive-root /var/lib/chrysalis/archive \
    --older-than-days 30 --dry-run
```

`--dry-run` prints the plan without renaming anything. Compression and storage tier choices are yours; the script only touches the directory layout.

For sampling instead of rotation, use `chrysalis corpus-merge --sample-modulo K`.

---

## Upgrades

```bash
git pull
pnpm install
pnpm -r build
pnpm test
```

Read `CHANGELOG.md` for breaking changes. After a successful workspace upgrade, re-emit and re-verify your critical apps; compare `reports/verify` and any migration JSON trends. The `toolVersion` field embedded in machine summaries lets you tell at a glance which version produced which artefact.

---

## Logs and retention

Chrysalis does not mandate a log format. Tools write:

- **Stderr** for human-readable progress, warnings, and errors.
- **Stdout** for machine-readable JSON when the matching `--json` / `--json-summary` / `--json-out` flag is set.
- **Files** under the report tree as described above.

Standard practice:

- In CI, attach `reports/verify`, `reports/ci`, and migration sidecar JSON as workflow artefacts.
- In production, route the dual-stack router and the emitted Node app's stdout/stderr through your platform log stack like any other Node service.
- Treat NDJSON traces and report files as data; encrypt at rest, restrict access, retain only as long as you need.

---

## GitHub repository settings

For the public Chrysalis repository (`theorem6/chrysalis`):

**Already enabled:**

- Issues and Discussions.
- Dependabot security updates (the automated vulnerability PRs that complement `.github/dependabot.yml`).
- `.github/CODEOWNERS` routes default review requests to `@theorem6`.

**Not available on no-cost GitHub plans for private repositories:** classic branch protection, rulesets, and secret scanning return HTTP 403/422 from the REST API until the repo is public or the org is on a paid plan with the feature.

After upgrading the plan, configure `main` (in the UI or via the API) to:

- Require a pull request before merging (no direct pushes).
- Require status checks to pass (strict: require branches up to date). The job names registered by the CI workflow are visible under **Actions → latest run → job names**:
  - `typecheck + build + test`
  - `oracle live drive (php + node)`
  - `verify (replay corpus vs emitted app)`
  - `verify flagship (laravel-min)`
  - `verify flagship (laravel-full scaffold)`
  - `insight (catalog WebIR anti-patterns)`
  - `rewrite (autonomously fix detectable security findings)`
- Optionally require one approving review and code-owner review.

Confirm the exact names under Actions before saving rules.

---

## Where to read next

- Day-to-day commands and runbooks: [Operations](./OPERATIONS.md).
- Where each component runs in CI and production: [Deployment](./DEPLOYMENT.md).
- Per-command behavior with worked examples: [User guide](./USER-GUIDE.md).
- Architecture in narrative form: [Whitepaper](./WHITEPAPER.md).
