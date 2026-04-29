# @chrysalis/verify

## Purpose

The replay oracle. Takes a `TraceCorpus` (from `@chrysalis/oracle`) and a
running HTTP endpoint (an app emitted by `@chrysalis/emit-hono` or any
compatible backend), replays every captured request in timestamp order, and
diffs each response against what was captured.

## Public API

- `replayCorpus(corpus, { baseUrl, fetch?, recordedSqlReplay?, injectDeterminismHeaders?, module?, disableCookieChain?, concurrency?, timeoutMs?, workerThreads?, onlyRoute?, onlyTraceId? })` — returns `TraceOutcome[]`. By default each request includes `x-chrysalis-now-iso` (trace `startedAt`) and `x-chrysalis-random-seed` (FNV-1a of `traceId`) for emitted apps that use `chrysalisNow` / `chrysalisRandom`. Set `injectDeterminismHeaders: false` to omit them. **`onlyRoute`** / **`onlyTraceId`** restrict replay to matching traces (same route key as outcomes: `METHOD path`); throws if filters match nothing. **`concurrency` > 1** is allowed only with **`disableCookieChain: true`** (isolated cookie jar per trace; outcomes remain sorted by capture time). Optional **`workerThreads: true`** with **`concurrency` > 1**, global **`fetch`** (no injected fetch / `onRequest`), and **no** `module` uses **`worker_threads`** for isolated replay (remote verify); requires **`dist/replay-worker.js`** from **`pnpm build`**, looked up next to the compiled **`replay.js`** or under **`dist/`** when **`replay` is loaded from TypeScript sources. The **`chrysalis verify`** / **`chrysalis repair`** CLIs forward **`--replay-concurrency`**, **`--disable-cookie-chain`**, **`--replay-timeout-ms`**, **`--replay-worker-threads`** (plus `CHRYSALIS_VERIFY_*` env aliases); **`chrysalis verify`** also accepts **`--only-route`** / **`--only-trace-id`** (DESIGN D213). See DESIGN D204 / D206.
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
- `normalizeBody` / `normalizeHeaders` — allowlisted normalization rules
  (timestamps, session-cookie values, UUIDs, whitespace). Exported so callers
  can extend them.

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
