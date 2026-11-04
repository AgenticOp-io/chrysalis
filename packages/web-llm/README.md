# @chrysalis/web-llm

## Purpose

**Intelligence Shorthand (IS)** is the first-class Convert surface in this package: a tier ladder (IS-T5…T0) for storing verified migration competence as capsules, policy refs, and oracles — not as full neural weights. Models propose; **WebIR + oracle + verify** dispose.

Also includes open website LLM scaffolding: verify-gated trajectories, Web Verify Benchmark (WVB), MCP tool schemas, convert governor / aim, and policy helpers.

**Prefer the IS entrypoint:**

```ts
import {
  resolveShorthandForTask,
  scoreNearMissCandidates,
  CYNOENGINE_ATTRIBUTION,
} from "@chrysalis/web-llm/shorthand";
```

Root `@chrysalis/web-llm` re-exports the same IS APIs for back-compat (**D6600**).

CynoEngine-inspired laws (near-miss salience, utility prior, governor, aim) are adapted here with citation — not a code port. See [`docs/CYNO-CHRYSALIS-COLLAB.md`](../../docs/CYNO-CHRYSALIS-COLLAB.md).

## Public API

### Intelligence Shorthand (primary)

- `resolveShorthandForTask`, `promoteShorthandsByDomain`, `loadIntelligenceShorthandsFromRepo`
- `resolveShorthandWithTransfer`, `summarizeIsLiveAnalytics`, `demoteShorthandsForDomain`
- `productHitRateLiveReady`, `evidenceSource` provenance (`seed` vs `hub-convert-verify`)
- `scoreNearMissCandidates`, `CYNOENGINE_ATTRIBUTION`, `utilityPriorView` (visible utility prior — **D6600**)
- `recordUtilityOutcome`, `recordEvidenceUsedUtility`, `loadIsUtilityStore`
- `classifyConvertAction`, `governConvertAction`, `listGovernedAgentTools`
- `createConvertAim`, `evaluateAimDrive`, `gateConvertCycle`

### Framework / training

- `WEB_LLM_*` kinds and schema versions
- `appendTrajectoryRecord`, `readTrajectoryRecords`, `createTrajectorySessionId`, `summarizeTrajectoryFile`
- `buildWebVerifyBenchmark`, `summarizeWebVerifyBenchmark`
- `buildTrainingShardsFromRecords`, `benchmarkEvalPrompts`
- `buildWebVerifyLeaderboard`, `renderLeaderboardHtml`
- `logWebLlmSmokeGate`, `isWebLlmTrajectoryLoggingEnabled`
- `chrysalisAgentToolDefinitions`, `findAgentTool`
- `buildLoraTrainManifest`, `validateLoraTrainManifest`, `buildLoraTrainPlan`, `validateLoraTrainPlan`, `readTrainingShardsFromJsonl`
- `evaluateVerifyGatePolicy`, `VERIFY_GATE_POLICY`

## Invariants

1. Trajectory records never claim verify pass without an attached gate result or explicit `unverified` flag.
2. Benchmark cases reference in-repo fixtures only (no network fetch at build time).
3. Agent tools shell out to built `packages/cli/dist/bin.js` — no bypass of CLI verify semantics.
4. No torch/peft GPU dependencies in this npm package — Horizon C train runs on operator GPU VM via `scripts/chrysalis-lora-qlora-train.py`.
5. Near-miss never sets `skipLlm`; only exact IS hits may skip the model. Utility priors never replace verify.

## Non-goals

- Pretraining or hosting inference (see `docs/OPEN-WEB-LLM-PROGRAM.md`).
- Replacing WebIR/CWL ingest or emitting raw TS/PHP without verify.
- Bundling torch/peft in npm dependencies.
- Merging CynoEngine into this monorepo.
