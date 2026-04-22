# @chrysalis/verify

## Purpose

The replay oracle. Takes a `TraceCorpus` (from `@chrysalis/oracle`) and a
running HTTP endpoint (an app emitted by `@chrysalis/emit-hono` or any
compatible backend), replays every captured request in timestamp order, and
diffs each response against what was captured.

## Public API

- `replayCorpus(corpus, { baseUrl })` — returns `TraceOutcome[]`.
- `diffResponse(expected, actual)` — per-pair diff with divergence list and
  body similarity.
- `buildReport(outcomes)` → `CorrectnessReport` with per-route and aggregate
  correctness.
- `writeReport(outDir, report, outcomes)` — persists `summary.json` + one file
  per route under `outDir`.
- `normalizeBody` / `normalizeHeaders` — allowlisted normalization rules
  (timestamps, session-cookie values, UUIDs, whitespace). Exported so callers
  can extend them.

The `verify()` sandbox-mode API (IR-level node attribution, SQL replay,
deterministic time/RNG injection) is Milestone 2/3 work — see the root
`DESIGN.md` D8/D9 for why Milestone 1 ships HTTP replay first.

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
