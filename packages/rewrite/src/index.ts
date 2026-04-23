/**
 * @chrysalis/rewrite — public API.
 */
export {
  applyRewrites,
  makeDataCall,
  type AppliedRecord,
  type Edit,
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
import { sanitizeOutputPass } from "./passes/sanitize-output.js";
import type { RewritePass } from "./framework.js";

/**
 * Default set of passes shipped with Chrysalis. Ordered so safer,
 * additive transforms come first. Users can pass a custom list to
 * `applyRewrites` to widen or narrow the set.
 */
export const DEFAULT_PASSES: ReadonlyArray<RewritePass> = [sanitizeOutputPass];
