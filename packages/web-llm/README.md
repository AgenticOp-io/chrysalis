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
- `buildLoraTrainManifest`, `validateLoraTrainManifest`, `buildLoraTrainPlan`, `validateLoraTrainPlan`, `readTrainingShardsFromJsonl` (IS-T2 train manifest + Horizon C plan — CPU export; GPU train via `scripts/chrysalis-lora-qlora-train.py`)
- `evaluateVerifyGatePolicy`, `VERIFY_GATE_POLICY`

## Invariants

1. Trajectory records never claim verify pass without an attached gate result or explicit `unverified` flag.
2. Benchmark cases reference in-repo fixtures only (no network fetch at build time).
3. Agent tools shell out to built `packages/cli/dist/bin.js` — no bypass of CLI verify semantics.
4. No torch/peft GPU dependencies in this npm package — Horizon C train runs on operator GPU VM via `scripts/chrysalis-lora-qlora-train.py`.

## Non-goals

- Pretraining or hosting inference (see `docs/OPEN-WEB-LLM-PROGRAM.md`).
- Replacing WebIR/CWL ingest or emitting raw TS/PHP without verify.
- Bundling torch/peft in npm dependencies.
