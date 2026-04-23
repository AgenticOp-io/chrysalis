/**
 * @chrysalis/rewrite — framework for IR-level rewrites driven by
 * `@chrysalis/insight` opportunities.
 *
 * Design note (see DESIGN.md D15): rewrite is deliberately a separate
 * package from `insight`. Detection is pure structural query; rewriting
 * mutates the IR and must be gated by explicit confidence thresholds.
 * Splitting them keeps failure semantics cleanly separated — a bad
 * detection is diagnostic noise, a bad rewrite is a program regression —
 * and lets recognizers be unit-testable without any rewrite side effects.
 */
import type {
  Locator,
  Module,
  NodeBase,
  NodeId,
  Provenance,
  WebIRType,
} from "@chrysalis/webir";
import { IdGen, synthetic } from "@chrysalis/webir";
import type { Opportunity, Recognizer } from "@chrysalis/insight";
import {
  formatViolations,
  verifyInvariants,
  type InvariantSpec,
  type InvariantViolation,
} from "./invariants.js";
import {
  postVerifyRewrite,
  type PostVerifyFailure,
  type PostVerifyResult,
} from "./post-verify.js";
import {
  verifyBehavior,
  type BehaviorVerifyOptions,
  type BehaviorVerifyResult,
} from "./verify-replay.js";

/**
 * A single atomic edit to a `Module`. Edits are produced by passes and
 * applied in a batch by `applyRewrites`. Two shapes cover the vast
 * majority of useful rewrites:
 *
 *   - `add`: introduce a new node (typically a sanitizer/wrapper call)
 *   - `replaceOperand`: rewire an existing node's `operands[i]` to a
 *     different `NodeId`
 *
 * More ambitious transforms (e.g. replacing a subtree entirely with a
 * new subtree) can be expressed as `add` + `replaceOperand` pairs.
 */
export type Edit =
  | { readonly kind: "add"; readonly node: NodeBase }
  | {
      readonly kind: "replaceOperand";
      readonly nodeId: NodeId;
      readonly index: number;
      readonly newOperandId: NodeId;
    };

/**
 * Context passed to a pass's `apply` method. Gives read access to the
 * current module and a deterministic id generator for synthesized nodes
 * (suffix-namespaced per pass to avoid collisions with ingest ids).
 */
export interface RewriteCtx {
  readonly module: Module;
  allocId(): NodeId;
  get(id: NodeId): NodeBase | undefined;
  synthetic(reason: string): Locator;
  provenance(reason: string): Provenance;
}

export interface RewritePass {
  /** Stable machine-readable id; used in reports and as a provenance tag. */
  readonly id: string;
  /** Human-readable name for CLI output. */
  readonly name: string;
  /** True if this pass handles opportunities of the given recognizer. */
  handles(op: Opportunity): boolean;
  /**
   * Compute the edits that realize the lift for one opportunity. Return
   * an empty array (or throw) to signal the rewrite can't be applied
   * cleanly for this specific opportunity; the driver will record it
   * as `skipped` with the thrown message.
   */
  apply(ctx: RewriteCtx, op: Opportunity): ReadonlyArray<Edit>;
  /**
   * Optional invariant spec checked by `applyRewrites` after the pass
   * runs. If any declared invariant is violated, the edits are rolled
   * back and the opportunity is recorded in `skipped` with a
   * `verify-invariant-failed` reason. See `invariants.ts` for the
   * available checks and DESIGN.md D16 for the rationale.
   */
  readonly invariants?: InvariantSpec;
}

export interface RewriteOptions {
  /** Opportunities below this confidence are not applied. Default: 0.75. */
  readonly minConfidence?: number;
  /** Only apply passes in this set (by `id`). Default: all passes. */
  readonly only?: ReadonlyArray<string>;
  /**
   * If false, skip the per-opportunity invariant checks declared by
   * each pass. Default: true. Invariants are cheap — they only walk
   * the Module twice — but tests that want to exercise a "bare" edit
   * sequence occasionally need them off.
   */
  readonly verifyInvariants?: boolean;
  /**
   * If provided, after the batch lands the driver re-runs each of
   * these recognizers on the rewritten module and asserts that every
   * applied opportunity is no longer findable. If any applied
   * opportunity still fires, the entire batch is rolled back and the
   * report carries a non-empty `postVerify.failures`. Default:
   * disabled. See DESIGN.md D18 for the rationale.
   */
  readonly postVerifyRecognizers?: ReadonlyArray<Recognizer>;
  /**
   * When set (either `true` or a `BehaviorVerifyOptions`), after the
   * batch lands the driver simulates each route in both the pre- and
   * post-rewrite modules against a set of probe inputs (synthesized
   * from request-field metadata or supplied by the caller) and
   * rolls back all-or-nothing if any probe produces a behaviorally
   * divergent response that isn't explained by an applied pass's
   * declared transform. Default: disabled. See DESIGN.md D19.
   */
  readonly behaviorVerify?: boolean | BehaviorVerifyOptions;
}

export interface AppliedRecord {
  readonly pass: string;
  readonly opportunity: string;
  readonly recognizer: string;
  readonly editCount: number;
}

export interface SkippedRecord {
  readonly pass: string;
  readonly opportunity: string;
  readonly recognizer: string;
  readonly reason: string;
  readonly violations?: ReadonlyArray<InvariantViolation>;
}

export interface RewriteReport {
  readonly sourceApp: string;
  readonly applied: ReadonlyArray<AppliedRecord>;
  readonly skipped: ReadonlyArray<SkippedRecord>;
  readonly summary: {
    readonly considered: number;
    readonly applied: number;
    readonly skipped: number;
    readonly byPass: Readonly<Record<string, number>>;
  };
  /**
   * Populated when `postVerifyRecognizers` was supplied in options.
   * `ok: true` means every applied opportunity is no longer findable
   * by its recognizer. `ok: false` means the batch was rolled back.
   */
  readonly postVerify?: PostVerifyResult;
  /**
   * Populated when `behaviorVerify` was enabled. `ok: true` means
   * every probe produced a post-rewrite response equal to the
   * pass-transformed pre-rewrite response. `ok: false` means the
   * batch was rolled back.
   */
  readonly behaviorVerify?: BehaviorVerifyResult;
}

export interface RewriteResult {
  readonly module: Module;
  readonly report: RewriteReport;
}

/**
 * Drive a set of rewrite passes over a module given a list of detected
 * opportunities. Applies edits in a single batch, producing a new
 * immutable `Module` with all changes reflected.
 */
export function applyRewrites(
  mod: Module,
  opportunities: ReadonlyArray<Opportunity>,
  passes: ReadonlyArray<RewritePass>,
  opts: RewriteOptions = {},
): RewriteResult {
  const minConfidence = opts.minConfidence ?? 0.75;
  const allowedPassIds = opts.only ? new Set(opts.only) : null;
  const verifyOn = opts.verifyInvariants !== false;

  // Seed id generator past any existing ingest ids. We use a dedicated
  // prefix so synthesized nodes are visually distinguishable in debug
  // dumps.
  const ids = new IdGen("rw");
  let currentNodes = new Map<NodeId, NodeBase>();
  for (const [id, node] of mod.nodes) currentNodes.set(id, node);
  let currentModule: Module = {
    nodes: currentNodes,
    roots: mod.roots,
    meta: mod.meta,
  };

  const applied: AppliedRecord[] = [];
  const skipped: SkippedRecord[] = [];
  const byPass = new Map<string, number>();

  for (const op of opportunities) {
    for (const pass of passes) {
      if (allowedPassIds && !allowedPassIds.has(pass.id)) continue;
      if (!pass.handles(op)) continue;
      if (op.confidence < minConfidence) {
        skipped.push({
          pass: pass.id,
          opportunity: op.id,
          recognizer: op.recognizer,
          reason: `confidence ${op.confidence.toFixed(2)} below threshold ${minConfidence.toFixed(2)}`,
        });
        continue;
      }

      // Per-opportunity context sees the *current* (post-previous-
      // opportunity) module, so later passes can react to earlier
      // rewrites. This is more correct than the earlier batch model,
      // which applied all edits in a single pass and therefore
      // couldn't compose opportunities.
      const ctx: RewriteCtx = {
        module: currentModule,
        allocId: () => ids.alloc(),
        get: (id) => currentModule.nodes.get(id),
        synthetic: (reason) => synthetic(reason),
        provenance: (reason) => ({
          source: "intent-rewrite",
          locator: synthetic(reason),
          reason,
        }),
      };

      let patch: ReadonlyArray<Edit>;
      try {
        patch = pass.apply(ctx, op);
      } catch (err) {
        skipped.push({
          pass: pass.id,
          opportunity: op.id,
          recognizer: op.recognizer,
          reason: err instanceof Error ? err.message : String(err),
        });
        continue;
      }
      if (patch.length === 0) {
        skipped.push({
          pass: pass.id,
          opportunity: op.id,
          recognizer: op.recognizer,
          reason: "pass returned no edits",
        });
        continue;
      }

      let candidateModule: Module;
      try {
        candidateModule = applyEditsToModule(currentModule, patch);
      } catch (err) {
        skipped.push({
          pass: pass.id,
          opportunity: op.id,
          recognizer: op.recognizer,
          reason: err instanceof Error ? err.message : String(err),
        });
        continue;
      }

      if (verifyOn && pass.invariants) {
        const v = verifyInvariants(currentModule, candidateModule, pass.invariants);
        if (!v.ok) {
          skipped.push({
            pass: pass.id,
            opportunity: op.id,
            recognizer: op.recognizer,
            reason: `verify-invariant-failed: ${formatViolations(v.violations)}`,
            violations: v.violations,
          });
          continue;
        }
      }

      currentModule = candidateModule;
      applied.push({
        pass: pass.id,
        opportunity: op.id,
        recognizer: op.recognizer,
        editCount: patch.length,
      });
      byPass.set(pass.id, (byPass.get(pass.id) ?? 0) + 1);
    }
  }

  // Post-rewrite analysis gate (D18). If the caller supplied
  // recognizers, re-run them on the rewritten module and roll back
  // the whole batch if any applied opportunity is still findable.
  // Rollback is all-or-nothing here on purpose: partial rollback
  // would leave a module with a mix of verified and unverified
  // rewrites, which is harder to reason about than either extreme.
  let postVerify: PostVerifyResult | undefined;
  let finalModule = currentModule;
  let finalApplied: ReadonlyArray<AppliedRecord> = applied;
  let finalSkipped: ReadonlyArray<SkippedRecord> = skipped;
  const rollbackByPass = new Map<string, number>(byPass);
  if (opts.postVerifyRecognizers && applied.length > 0) {
    postVerify = postVerifyRewrite(
      currentModule,
      applied,
      opts.postVerifyRecognizers,
    );
    if (!postVerify.ok) {
      // Roll back: restore the pre-rewrite module and move every
      // applied opportunity into skipped with the verification
      // failure detail for forensic inspection.
      finalModule = mod;
      const rolledSkipped: SkippedRecord[] = [...skipped];
      for (const a of applied) {
        const failure = postVerify.failures.find(
          (f) => f.opportunity === a.opportunity,
        );
        rolledSkipped.push({
          pass: a.pass,
          opportunity: a.opportunity,
          recognizer: a.recognizer,
          reason: failure
            ? `rolled back: post-verify found residual — ${failure.detail}`
            : `rolled back: batch post-verify failed for another opportunity`,
        });
      }
      finalApplied = [];
      finalSkipped = rolledSkipped;
      rollbackByPass.clear();
    }
  }

  // Behavioral verification gate (D19). Runs only if post-verify
  // didn't already roll back (no point simulating a module that's
  // about to be thrown away). Simulates each route under probes,
  // diffs pre vs expected-post, and rolls back all-or-nothing on
  // unexplained divergence.
  let behaviorVerify: BehaviorVerifyResult | undefined;
  if (opts.behaviorVerify && finalApplied.length > 0 && finalModule !== mod) {
    const behaviorOpts: BehaviorVerifyOptions =
      typeof opts.behaviorVerify === "object" ? opts.behaviorVerify : {};
    behaviorVerify = verifyBehavior(mod, finalModule, finalApplied, behaviorOpts);
    if (!behaviorVerify.ok) {
      finalModule = mod;
      const rolledSkipped: SkippedRecord[] = [...finalSkipped];
      for (const a of finalApplied) {
        rolledSkipped.push({
          pass: a.pass,
          opportunity: a.opportunity,
          recognizer: a.recognizer,
          reason:
            `rolled back: behavior-verify found ${behaviorVerify.divergences.length} ` +
            `unexplained divergence(s) across ${behaviorVerify.probesRun} probe(s)`,
        });
      }
      finalApplied = [];
      finalSkipped = rolledSkipped;
      rollbackByPass.clear();
    }
  }

  const report: RewriteReport = {
    sourceApp: mod.meta.sourceApp,
    applied: finalApplied,
    skipped: finalSkipped,
    summary: {
      considered: opportunities.length,
      applied: finalApplied.length,
      skipped: finalSkipped.length,
      byPass: Object.fromEntries(rollbackByPass),
    },
    ...(postVerify ? { postVerify } : {}),
    ...(behaviorVerify ? { behaviorVerify } : {}),
  };

  return { module: finalModule, report };
}

function applyEditsToModule(mod: Module, edits: ReadonlyArray<Edit>): Module {
  const nodes = new Map<NodeId, NodeBase>();
  for (const [id, n] of mod.nodes) nodes.set(id, n);
  for (const e of edits) {
    if (e.kind === "add") {
      nodes.set(e.node.id, e.node);
      continue;
    }
    const existing = nodes.get(e.nodeId);
    if (!existing) {
      throw new Error(`rewrite: replaceOperand target ${String(e.nodeId)} not found`);
    }
    if (e.index < 0 || e.index >= existing.operands.length) {
      throw new Error(
        `rewrite: replaceOperand index ${e.index} out of range for ${String(e.nodeId)}`,
      );
    }
    const newOps = [...existing.operands];
    newOps[e.index] = e.newOperandId;
    const patched: NodeBase = {
      ...existing,
      operands: Object.freeze(newOps),
      provenance: [
        ...existing.provenance,
        {
          source: "intent-rewrite",
          locator: existing.origin,
          reason: `operand[${e.index}] rewritten by applyRewrites`,
        },
      ],
    };
    nodes.set(e.nodeId, patched);
  }
  return { nodes, roots: mod.roots, meta: mod.meta };
}

/** Helper for passes: construct a well-formed `data.call` node. */
export function makeDataCall(
  ctx: RewriteCtx,
  callee: string,
  args: ReadonlyArray<NodeId>,
  type: WebIRType,
  reason: string,
): NodeBase {
  return {
    id: ctx.allocId(),
    dialect: "data",
    op: "call",
    type,
    effects: [],
    operands: args,
    attrs: { callee },
    origin: ctx.synthetic(reason),
    provenance: [ctx.provenance(reason)],
  };
}
