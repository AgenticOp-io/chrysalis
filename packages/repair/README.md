# @chrysalis/repair

## Purpose

Runs a **bounded, verify-gated** repair loop over WebIR: when oracle replay
finds divergences, a `RepairProposer` may supply `Edit[]` patches; each patch
is applied with `@chrysalis/rewrite`'s `applyModuleEdits` and kept only if the
**entire** trace corpus replays without divergence. The CLI can opt into an
OpenAI-compatible **HTTP chat** proposer (`--llm` + `CHRYSALIS_REPAIR_LLM_*`);
it only proposes validated `replaceOperand` edits and never bypasses replay.

## Public API

- `runVerifiedRepairLoop(options)` — drives propose → apply → full replay until
  success, proposer abstains, or `maxIterations`.
- `stubRepairProposer()` — default no-op proposer for CLI scaffolding.
- `createHttpChatRepairProposer(options)` / `createHttpChatRepairProposerFromEnv()`
  — optional Chat Completions client (JSON-only `replaceOperand` proposals).
- `tryParseRepairEditsFromLlmJson(module, parsed)` — validate parsed model JSON.
- `applyHoleClosure` / `applyHoleClosureAndVerify` — replace a `data.hole`
  operand with a replacement subgraph, record human **sign-off** on the new
  root's provenance, optionally gate on full `replayCorpus`.
- Types: `RepairProposer`, `RepairProposeContext`, `VerifiedRepairLoopOptions`,
  `VerifiedRepairLoopResult`, `RepairReplayBase`, `ApplyHoleClosureOptions`,
  `HoleClosureSignOff`.

## Invariants

- Patches are never accepted without a successful full-corpus replay (same
  contract as `applyRewritesAsync`'s HTTP gate, but decoupled from insight
  opportunities).
- `replaceOperand` edits record `provenance` with `source: "repair-pass"` when
  applied inside the loop.
- The loop does not mutate the input module; it returns the last accepted
  module reference.
- Hole closure rejects holes with multiple operand parents (v1). The old hole
  node may remain in the node map but is no longer reachable from roots;
  `countHoles` only counts holes on root-connected walks.

## Non-goals

- **Unattributed** auto-fixes or edits that skip the full-corpus replay gate.
  (The in-tree HTTP proposer is opt-in, bounded, and still verify-gated.)
- Emitting TypeScript or auto-rebuilding runnable apps (CLI / harness).
- Proving that heuristically attributed nodes are the true root cause of a
  divergence (see `@chrysalis/verify` attribution).
