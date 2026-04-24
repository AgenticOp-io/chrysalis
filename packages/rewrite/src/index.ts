/**
 * @chrysalis/rewrite — public API.
 */
export {
  applyModuleEdits,
  applyRewrites,
  applyRewritesAsync,
  makeDataCall,
  type AppliedRecord,
  type ApplyModuleEditsOptions,
  type AsyncRewriteOptions,
  type Edit,
  type HttpReplayBackendSlice,
  type HttpReplayResolver,
  type HttpReplayVerifyOptions,
  type HttpReplayVerifyResult,
  type RewriteCtx,
  type RewriteOptions,
  type RewritePass,
  type RewriteReport,
  type RewriteResult,
  type SkippedRecord,
} from "./framework.js";
export {
  verifyInvariants,
  formatViolations,
  type InvariantSpec,
  type InvariantResult,
  type InvariantViolation,
} from "./invariants.js";
export { sanitizeOutputPass } from "./passes/sanitize-output.js";
export { parameterizeSqlPass } from "./passes/parameterize-sql.js";
export {
  postVerifyRewrite,
  type PostVerifyFailure,
  type PostVerifyResult,
} from "./post-verify.js";
export {
  verifyBehavior,
  type BehaviorDivergence,
  type BehaviorVerifyOptions,
  type BehaviorVerifyResult,
  type Probe,
  type RouteInfo,
} from "./verify-replay.js";
export {
  simulateHandler,
  simValueEquals,
  DEFAULT_STUB_DB,
  type DbReadEvent,
  type DbWriteEvent,
  type RequestInput,
  type SessionWriteEvent,
  type SimError,
  type SimResponse,
  type SimValue,
  type StubDb,
} from "./simulate.js";
import { sanitizeOutputPass } from "./passes/sanitize-output.js";
import { parameterizeSqlPass } from "./passes/parameterize-sql.js";
import type { RewritePass } from "./framework.js";

/**
 * Default set of passes shipped with Chrysalis. Ordered so safer,
 * additive transforms come first. Users can pass a custom list to
 * `applyRewrites` to widen or narrow the set.
 */
export const DEFAULT_PASSES: ReadonlyArray<RewritePass> = [
  sanitizeOutputPass,
  parameterizeSqlPass,
];
