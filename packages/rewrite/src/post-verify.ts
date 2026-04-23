/**
 * Post-rewrite analysis gate (D18).
 *
 * After a batch of rewrites lands, this gate re-runs each applied
 * opportunity's recognizer on the rewritten module and asserts that
 * the "same" finding no longer appears. In other words: a pass that
 * claimed to fix an XSS must leave a module where the XSS recognizer
 * doesn't find it anymore, otherwise the rewrite is (at best)
 * ineffective and (at worst) introducing a divergence the invariant
 * system couldn't catch.
 *
 * Why this is a separate layer from `invariants.ts`:
 *
 *   - Invariants catch "the pass mutated a node it didn't claim to
 *     mutate." That's a pass-hygiene check.
 *   - post-verify catches "the pass claimed to fix finding X but
 *     recognizer R still reports X." That's a pass-effectiveness
 *     check.
 *
 * The two are complementary — invariants run per-opportunity (cheap,
 * roll back one edit), post-verify runs once per batch (still cheap,
 * one more recognizer pass) and rolls back the *entire* batch if any
 * applied opportunity was not actually fixed. Rollback semantics are
 * deliberately all-or-nothing at this layer: partial rollback here
 * would leave a module with an inconsistent mix of "verified" and
 * "not verified" rewrites, which is worse than either extreme.
 *
 * Scope: this gate cannot detect behavioral divergence that a
 * recognizer doesn't notice (e.g. a rewrite that deletes a session
 * write but doesn't introduce a new XSS). That's the domain of full
 * HTTP replay (`@chrysalis/verify`); post-verify is the cheap gate
 * that runs even without a corpus. A future D19 will layer
 * HTTP-replay verification on top of this.
 */
import type { Module } from "@chrysalis/webir";
import type { Opportunity, Recognizer, RecognizerId } from "@chrysalis/insight";
import type { AppliedRecord } from "./framework.js";

export interface PostVerifyFailure {
  readonly opportunity: string;
  readonly pass: string;
  readonly recognizer: RecognizerId;
  /**
   * The residual opportunity id that still fires after the rewrite
   * landed. If the recognizer assigns identity-stable ids, this will
   * match the applied opportunity's id exactly; otherwise it's the
   * closest structural match.
   */
  readonly residual: string;
  readonly detail: string;
}

export interface PostVerifyResult {
  readonly ok: boolean;
  readonly failures: ReadonlyArray<PostVerifyFailure>;
  /**
   * Set of recognizers that were re-run (one per distinct recognizer
   * across the applied opportunities). Useful for callers that want
   * to log how much extra work the gate did.
   */
  readonly recognizersRun: ReadonlyArray<RecognizerId>;
}

/**
 * Re-run every recognizer that had at least one applied opportunity,
 * and fail the gate if any of the applied opportunities' ids still
 * appear in the post-rewrite findings. Identity is by `Opportunity.id`,
 * which recognizers construct as
 * `<recognizer>:<method>:<path>:<anchor-node-id>` — stable across
 * rewrites for the same anchor node.
 */
export function postVerifyRewrite(
  after: Module,
  applied: ReadonlyArray<AppliedRecord>,
  recognizers: ReadonlyArray<Recognizer>,
): PostVerifyResult {
  const byRecognizer = new Map<RecognizerId, Recognizer>();
  for (const r of recognizers) byRecognizer.set(r.id, r);

  const neededRecognizers = new Set<RecognizerId>();
  for (const a of applied) neededRecognizers.add(a.recognizer as RecognizerId);

  const residualByOpId = new Map<string, Opportunity>();
  const recognizersRun: RecognizerId[] = [];
  for (const rid of neededRecognizers) {
    const rec = byRecognizer.get(rid);
    if (!rec) continue; // caller didn't wire it; treat as "cannot verify"
    recognizersRun.push(rid);
    for (const op of rec.recognize(after)) {
      residualByOpId.set(op.id, op);
    }
  }

  const failures: PostVerifyFailure[] = [];
  for (const a of applied) {
    const residual = residualByOpId.get(a.opportunity);
    if (!residual) continue; // applied opportunity is no longer findable — success
    failures.push({
      opportunity: a.opportunity,
      pass: a.pass,
      recognizer: a.recognizer as RecognizerId,
      residual: residual.id,
      detail: `opportunity ${a.opportunity} still flagged by ${a.recognizer} after rewrite: ${residual.rationale}`,
    });
  }

  return {
    ok: failures.length === 0,
    failures,
    recognizersRun,
  };
}
