# @chrysalis/verify

## Purpose

The replay oracle. Executes translated handlers in a sandbox with deterministic
time/RNG and captured SQL results, diffs the outcome against the original
`TraceFrame`, and attributes divergences to specific WebIR node IDs.

## Public API

- `verify(input: VerifyInput): Promise<CorrectnessReport>`
- `VerifyInput` — generated project path, WebIR module, trace corpus
- `CorrectnessReport` — per-endpoint scores, per-frame diffs, node-level
  attribution

## Invariants

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
