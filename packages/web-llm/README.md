# @chrysalis/web-llm

## Purpose

Open **website LLM framework** scaffolding for Chrysalis: verify-gated agent trajectories, the **Web Verify Benchmark (WVB)**, MCP tool schemas, and policy helpers. Models propose; **WebIR + oracle + verify** dispose.

## Public API

- `WEB_LLM_*` kinds and schema versions
- `appendTrajectoryRecord`, `readTrajectoryRecords`, `createTrajectorySessionId`, `summarizeTrajectoryFile`
- `buildWebVerifyBenchmark`, `summarizeWebVerifyBenchmark`
- `buildTrainingShardsFromRecords`, `benchmarkEvalPrompts`
- `buildWebVerifyLeaderboard`, `renderLeaderboardHtml`
- `logWebLlmSmokeGate`, `isWebLlmTrajectoryLoggingEnabled`
- `chrysalisAgentToolDefinitions`, `findAgentTool`
- `resolveShorthandForTask`, `promoteShorthandsByDomain`, `loadIntelligenceShorthandsFromRepo` (IS runtime protocol)
- `buildLoraTrainManifest`, `validateLoraTrainManifest`, `readTrainingShardsFromJsonl` (IS-T2 train manifest — CPU export only)
- `evaluateVerifyGatePolicy`, `VERIFY_GATE_POLICY`

## Invariants

1. Trajectory records never claim verify pass without an attached gate result or explicit `unverified` flag.
2. Benchmark cases reference in-repo fixtures only (no network fetch at build time).
3. Agent tools shell out to built `packages/cli/dist/bin.js` — no bypass of CLI verify semantics.
4. No training weights or GPU dependencies in this package (recipes and eval only).

## Non-goals

- Pretraining or fine-tuning models (see `docs/OPEN-WEB-LLM-PROGRAM.md`).
- Replacing WebIR/CWL ingest or emitting raw TS/PHP without verify.
- Hosted inference, billing, or telemetry to third parties.
