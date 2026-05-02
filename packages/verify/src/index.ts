/**
 * @chrysalis/verify — replay oracle.
 *
 * Takes a TraceCorpus (produced by `@chrysalis/oracle`) and a running HTTP
 * endpoint (an app emitted by `@chrysalis/emit-hono` or any compatible
 * target), replays every captured request, and diffs the responses to
 * produce per-route correctness scores. Optional **`concurrency`** (with
 * **`disableCookieChain`**) speeds replay for independent traces (D202).
 *
 * Heuristic divergence attribution (≤5 WebIR nodes per failed trace when
 * `ReplayOptions.module` is set) is Milestone 3 v1; emit-level source maps are
 * future work.
 */

export {
  replayCorpus,
  traceDeterminismSeed,
  type ReplayOptions,
  type TraceOutcome,
} from "./replay.js";

export {
  resolveVerifyReplayExtras,
  type VerifyReplayExtrasResult,
} from "./verify-replay-extras.js";

export {
  MAX_ATTRIBUTION_NODES,
  attributeDivergenceToNodes,
  findHandlerBodyRoot,
} from "./attribute.js";

export {
  buildSqlReplayTapeFromTrace,
  canSqlReplayTrace,
  encodeSqlTapeHeader,
  type SqlReplayTape,
} from "./sql-replay.js";

export {
  diffResponse,
  type DiffResult,
  type Divergence,
  type DivergenceKind,
  type DiffOptions,
  type ReplayedResponse,
} from "./diff.js";

export {
  buildReport,
  writeReport,
  divergenceKindHistogram,
  failedTraceCount,
  type CorrectnessReport,
  type DivergenceHistogramEntry,
  type EndpointScore,
} from "./report.js";

export {
  mergeCorrectnessReports,
  buildMergedVerifySummaryJson,
  type MergedVerifySummaryJson,
} from "./merge-partition.js";

export {
  DEFAULT_BODY_RULES,
  DEFAULT_HEADER_RULES,
  normalizeBody,
  normalizeHeaders,
  normalizeSetCookie,
  type NormalizeRule,
  type Normalized,
} from "./normalize.js";

export {
  VERIFY_SUMMARY_BATCH_KIND,
  VERIFY_SUMMARY_BATCH_SCHEMA_VERSION,
  VERIFY_SUMMARY_KIND,
} from "./verify-summary-batch.js";
