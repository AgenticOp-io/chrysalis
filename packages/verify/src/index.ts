/**
 * @chrysalis/verify — replay oracle.
 *
 * Takes a TraceCorpus (produced by `@chrysalis/oracle`) and a running HTTP
 * endpoint (an app emitted by `@chrysalis/emit-hono` or any compatible
 * target), replays every captured request, and diffs the responses to
 * produce per-route correctness scores.
 *
 * Node-level divergence attribution (mapping a response diff back to specific
 * WebIR nodes) is Milestone 3; Milestone 1 delivers the measurement loop so
 * we have numbers to hold ourselves to.
 */

export {
  replayCorpus,
  type ReplayOptions,
  type TraceOutcome,
} from "./replay.js";

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
  type CorrectnessReport,
  type EndpointScore,
} from "./report.js";

export {
  DEFAULT_BODY_RULES,
  DEFAULT_HEADER_RULES,
  normalizeBody,
  normalizeHeaders,
  normalizeSetCookie,
  type NormalizeRule,
  type Normalized,
} from "./normalize.js";
