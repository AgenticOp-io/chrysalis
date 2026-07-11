# @chrysalis/verify

## Purpose

The replay oracle. Takes a `TraceCorpus` (from `@chrysalis/oracle`) and a
running HTTP endpoint (an app emitted by `@chrysalis/emit-hono` or any
compatible backend), replays every captured request in timestamp order, and
diffs each response against what was captured.

## Public API

- `replayCorpus(corpus, { baseUrl, fetch?, …, onlyRoute?, onlyTraceId?, shardIndex?, shardCount? })` — returns `TraceOutcome[]`. By default each request includes `x-chrysalis-now-iso` (trace `startedAt`) and `x-chrysalis-random-seed` (FNV-1a of `traceId`) for emitted apps that use `chrysalisNow` / `chrysalisRandom`. Set `injectDeterminismHeaders: false` to omit them. **`onlyRoute`** / **`onlyTraceId`** restrict replay to matching traces (same route key as outcomes: `METHOD path`); throws if filters match nothing. **`shardCount`** (>= 2) with optional **`shardIndex`** (default `0`) replays only traces where `traceDeterminismSeed(traceId) % shardCount === shardIndex` (V2-M1 partitioned verify). **`concurrency` > 1** is allowed only with **`disableCookieChain: true`** (isolated cookie jar per trace; outcomes remain sorted by capture time). Optional **`workerThreads: true`** with **`concurrency` > 1**, global **`fetch`** (no injected fetch / `onRequest`), and **no** `module` uses **`worker_threads`** for isolated replay (remote verify); requires **`dist/replay-worker.js`** from **`pnpm build`**, looked up next to the compiled **`replay.js`** or under **`dist/`** when **`replay` is loaded from TypeScript sources. The **`chrysalis verify`** / **`chrysalis repair`** CLIs forward **`--replay-concurrency`**, **`--disable-cookie-chain`**, **`--replay-timeout-ms`**, **`--replay-worker-threads`**, **`--shard-index`**, **`--shard-count`** (plus `CHRYSALIS_VERIFY_*` env aliases); **`chrysalis verify`** also accepts **`--only-route`** / **`--only-trace-id`** (DESIGN D213). **`--ingest-progress-file`** on **`verify`** (with **`--project`**) and **`repair`** is handled in the CLI ingest step (**DESIGN D280**). **`--ingest-dedupe-structural-subgraphs`** on **`verify --project`** (and other ingest-driven CLIs) runs optional within-module WebIR structural dedupe before emit/replay setup (**DESIGN D283**). **`chrysalis repair`** does not accept shard or route filters. See DESIGN D204 / D206.
- `resolveVerifyReplayExtras(flags?)` — merges CLI-style flags with **`CHRYSALIS_VERIFY_*`** env vars into **`Partial<ReplayOptions>`** (same rules as the CLI). Repo **`scripts/verify-*.mjs`** pass `{}` so CI can tune replay without forking scripts.
- `traceDeterminismSeed(traceId)` — uint32 seed helper (same algorithm as replay headers).
- `buildSqlReplayTapeFromTrace` / `canSqlReplayTrace` / `encodeSqlTapeHeader` —
  helpers for recorded SELECT rows (optional `sql.query.rows` in traces).
- `diffResponse(expected, actual)` — per-pair diff with divergence list and
  body similarity.
- `buildReport(outcomes)` → `CorrectnessReport` with per-route and aggregate
  correctness.
- `divergenceKindHistogram(report)` / `failedTraceCount(report)` — aggregate
  failure diagnostics for CLI dashboards (**DESIGN D212**).
- `writeReport(outDir, report, outcomes)` — persists `summary.json` + one file
  per route under `outDir`.
- `mergeCorrectnessReports(reports)` — merges disjoint per-shard **`CorrectnessReport`** values (same shape as **`summary.json`**) into one report; callers must ensure shards partition traces.
- `buildMergedVerifySummaryJson({ toolVersion, shardCount, inputs })` — wraps merged aggregate + endpoints in **`kind: "chrysalis.verify.summary.merged"`**, **`schemaVersion: 1`** (machine JSON for **`chrysalis verify-merge --json-out`**).
- **`VERIFY_SUMMARY_KIND`**, **`VERIFY_SUMMARY_BATCH_KIND`**, **`VERIFY_SUMMARY_BATCH_SCHEMA_VERSION`** — constants for **`chrysalis verify --json-summary`** and offline **`chrysalis.verify.summary.batch`** rollups (**`scripts/aggregate-verify-summaries.mjs`**, **DESIGN D271**).
- `normalizeBody` / `normalizeHeaders` — allowlisted normalization rules
  (timestamps, session-cookie values, UUIDs, whitespace). Exported so callers
  can extend them.
- `verifyUiRouteStyleParity` / `verifyUiRouteMarkupParity` — in-memory lift parity for CSS selectors / HTML class inventories (**D6365**).
- `verifySiteScaleMatrix({ projectDir, tracesDir?, cwlPaths? })` — site-scale conversion matrix (**D6366**, **G9440**): on-disk UI CSS/markup artifact integrity, traced API GET index, and CWL `load`-bind evidence. Missing layers skip; present failures fail. Smoke: **`pnpm run hub:site-scale-matrix-smoke`**.

### Replay environment (CLI + env)

**`chrysalis verify`** forwards **`--replay-concurrency`**, **`--disable-cookie-chain`**, **`--replay-timeout-ms`**, **`--replay-worker-threads`**, **`--only-route`**, **`--only-trace-id`**, **`--shard-index`**, **`--shard-count`** into **`resolveVerifyReplayExtras`** together with env:

| Env | Effect |
| --- | --- |
| **`CHRYSALIS_VERIFY_REPLAY_CONCURRENCY`** | Same as **`--replay-concurrency`** (integer). |
| **`CHRYSALIS_VERIFY_DISABLE_COOKIE_CHAIN=1`** | Same as **`--disable-cookie-chain`**. |
| **`CHRYSALIS_VERIFY_TIMEOUT_MS`** | Same as **`--replay-timeout-ms`** (milliseconds, minimum 1000). |
| **`CHRYSALIS_VERIFY_WORKER_THREADS=1`** | Same as **`--replay-worker-threads`** (requires **`concurrency` > 1**, global **`fetch`**, no **`module`** — see **`resolveVerifyReplayExtras`** / DESIGN D206). |
| **`CHRYSALIS_VERIFY_SHARD_COUNT`** | Same as **`--shard-count`** (integer >= 2). |
| **`CHRYSALIS_VERIFY_SHARD_INDEX`** | Same as **`--shard-index`** (defaults to **`0`** when **`CHRYSALIS_VERIFY_SHARD_COUNT`** is set). |

**`chrysalis verify-merge`** reads one or more **`summary.json`** files from parallel shard runs and prints merged **`CorrectnessReport`** JSON (human-readable by default). With **`--json-out`**, stdout is a single line **`chrysalis.verify.summary.merged`** object (**`schemaVersion: 1`**) including per-input shard metadata. Optional **`--shard-count`** (defaults to number of files) records the replay fan-out **K** when some shards produced no report file.

### Partitioned verify (V2-M1)

Run **`K`** independent **`verify`** invocations with the same corpus and **`--shard-index i --shard-count K`** (and typically **`--disable-cookie-chain`** if using **`--replay-concurrency > 1`**). Each run writes its own **`--report`** directory. Combine with **`verify-merge r0/summary.json r1/summary.json … --json-out`**. Merged aggregate matches monolithic verify when shards form a complete partition (Vitest: **`packages/verify/tests/replay.test.ts`**). CI validates **`chrysalis.verify.summary.merged`** via **`scripts/ci-gates.mjs verify-merged-summary`** and **`chrysalis.corpus-merge.summary`** (multi-host trace directory merge) via **`corpus-merge-summary`** (see root **`README.md`** / **`docs/ADMINISTRATION.md`**). **`chrysalis --help`** lists the main V2 scale-out CLI flag families (verify sharding, **`verify-merge`**, **`corpus-merge`**, ingest/emit sharding, **`--ingest-cache`**, and **`--ingest-dedupe-structural-subgraphs`**). **`pnpm run verify:e2e`** (**`scripts/verify-tiny-blog.mjs`**) also splits the captured corpus across two host directories, **`mergeCorpusDirectories`**, and replays the merged tree vs **Hono** (V2-M3) using a **pristine sqlite copy** so merged replay matches a fresh DB.

**Trace sharding vs route sharding:** **`verify --shard-*`** partitions **captured traces**; **`ingest --shard-*`** lowers only a **route bucket** from **`chrysalis.routes.json`**. For **full-route** static metrics (oracle footprint, holes) while you still operate on route-level ingest shards elsewhere, use **`chrysalis ingest --merge-all-shards --shard-count K`** or **`mergeWebIrModules`** (**`@chrysalis/webir`**, **DESIGN D247**). **`chrysalis status --project --json`** includes **`ingestSharding`** (**`monolithic`**, **`routeShard`**, or **`mergedShards`**) so machine summaries record which ingest path produced **`oracleFootprint`** (**DESIGN D248**).

Implementation: **`packages/verify/src/verify-replay-extras.ts`**. On threshold failure **`chrysalis verify`** also prints a pointer to this README in the repo. **stdout** carries aggregate correctness, frame counts, and one summary line per route (unless **`--json-summary`**). When any frame fails, **stderr** prints **`[verify] stderr: failure diagnostics`** (failed frame count, divergence-kind histogram, next-step hints), then **`[verify] stderr: per-trace divergences`** (trace id, kinds, optional IR node ids, details). With **`--json-summary`**, progress lines go to **stderr** and **stdout** is a single JSON object (one line): **`schemaVersion`** is the JSON-summary contract version (**D223**).

#### `--json-summary` field reference

| Field | Description |
| --- | --- |
| **`kind`** | Always **`"chrysalis.verify.summary"`**. |
| **`schemaVersion`** | Integer contract version (currently **`1`**). |
| **`toolVersion`** | Version string from the repo root **`package.json`**. |
| **`corpusRoot`** | Absolute path to the traces directory passed to **`verify`**. |
| **`baseUrl`** | Base URL used for replay. |
| **`reportDir`** | Directory where **`summary.json`** and per-route files were written. |
| **`summaryPath`** | Absolute path to **`summary.json`**. |
| **`threshold`** | Correctness threshold used for **`pass`** (CLI **`--threshold`**). |
| **`aggregate`** | Same structure as **`CorrectnessReport.aggregate`** in the written report. |
| **`failedFrameCount`** | Count of replay frames that did not meet correctness. |
| **`failedTraceCount`** | Count of traces with at least one failing frame. |
| **`divergenceKinds`** | Histogram `{ kind, count }[]` from **`divergenceKindHistogram`**. |
| **`endpoints`** | Per-route rows (same as report **`endpoints`**). |
| **`pass`** | **`true`** iff aggregate correctness **≥** **`threshold`**. |

**`chrysalis repair`** forwards the same replay tuning flags as **`verify`** (concurrency, cookie chain, timeout, worker threads) via **`resolveVerifyReplayExtras`**, but it **does not** accept **`--only-route`** / **`--only-trace-id`** / **`--shard-*`**: the repair gate always replays the **full** corpus. On repair failure the CLI prints a pointer here as well.

**Recorded SQL results (Milestone 2):** when traces include `rows` on
`sql.query` events (PHP PDO recorder) and `recordedSqlReplay: true`, each
replay request sends `x-chrysalis-sql-tape` (base64url JSON). The emitted
Hono app's `sqlTapeMiddleware` + `queryOne` / `queryAll` serve SELECTs from
the tape in order. Traces without row payloads behave as before (live DB).
Use `chrysalis verify ... --no-recorded-sql` to disable.

**Heuristic IR attribution (Milestone 3 v1):** when `replayCorpus` is called
with `module` (ingested WebIR), failed traces attach up to five `NodeId`s on
`TraceOutcome.attributedNodeIds`. The `chrysalis verify --project` and
`chrysalis repair` CLIs pass this through. Handler determinism headers (above)
complement SQL tape replay for injectable clock/PRNG in generated TypeScript.

## Invariants (current, Milestone 1)

- **Replay order is deterministic.** Traces are sorted by `header.startedAt`
  before replay; same corpus → same fetch sequence.
- **Normalization is an allowlist.** Anything not on the list is compared
  strictly. Rules that fired are recorded on each outcome, so a rule that
  silently suppresses a real divergence is visible.
- **Single-user cookie chaining.** Cookies from each response flow into the
  next request. Multi-user threading is Milestone 2.

## Invariants (target, Milestone 2+)

- **Replay is byte-deterministic.** Time, RNG, DB reads, outbound HTTP, and
  mail are all injected from the `TraceFrame`. Any nondeterminism surfaces as
  a failing frame, not a flaky one.
- **Divergence attribution is minimal.** For each failing frame, the report
  names the smallest set of IR nodes implicated by the diff.
- **Reports are stable artifacts.** Same code + same corpus → same report.
  This is what enables CI gating on Chrysalis correctness metrics.

## Non-goals

- Fixing divergences (that's the Milestone 3 repair pass).
- Running the legacy PHP app. We replay against captures, not against PHP.
- Property-based or generative testing. The oracle provides concrete inputs;
  we verify those.
