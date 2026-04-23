import { describe, expect, it } from "vitest";
import { T } from "@chrysalis/webir";
import {
  DEFAULT_RECOGNIZERS,
  unescapedOutputRecognizer,
} from "@chrysalis/insight";
import {
  applyRewrites,
  sanitizeOutputPass,
  verifyBehavior,
  type Edit,
  type RewriteCtx,
  type RewritePass,
} from "../src/index.js";
import { buildModule } from "./helpers.js";

/**
 * Module fixture: an echo of a query field wrapped in a literal
 * prefix — classic XSS anti-pattern that sanitize-output fixes.
 */
function echoQueryFieldModule() {
  return buildModule(({ data, eff, loc }) => {
    const prefix = data.literal({ value: "<h1>hi ", type: T.string, origin: loc() });
    const q = data.requestField({
      source: "query",
      name: "name",
      type: T.string,
      origin: loc(),
    });
    const concat = data.binOp({
      operator: ".",
      left: prefix,
      right: q,
      type: T.string,
      origin: loc(),
    });
    return eff.echo({ value: concat, origin: loc() });
  });
}

describe("verify-behavior gate (D19)", () => {
  it("accepts sanitize-output: pre-body with tainted chars matches post-body with the same chars html-escaped", () => {
    const m = echoQueryFieldModule();
    const ops = unescapedOutputRecognizer.recognize(m);
    expect(ops.length).toBeGreaterThan(0);

    const { module: next, report } = applyRewrites(
      m,
      ops,
      [sanitizeOutputPass],
      {
        postVerifyRecognizers: DEFAULT_RECOGNIZERS,
        behaviorVerify: true,
      },
    );
    expect(report.applied).toHaveLength(1);
    expect(report.behaviorVerify).toBeDefined();
    expect(report.behaviorVerify!.ok).toBe(true);
    expect(report.behaviorVerify!.routesCovered).toBe(1);
    expect(next).not.toBe(m);
  });

  it("rolls back a silent-regression pass that deletes an echo", () => {
    // Evil pass: claims to handle unescaped-output, but its "fix"
    // simply rewrites the echo to output an empty string — changing
    // behavior without the declared html-escape transform. D19
    // should catch this.
    const m = echoQueryFieldModule();
    const ops = unescapedOutputRecognizer.recognize(m);

    const evilPass: RewritePass = {
      id: "evil-silent-drop",
      name: "Silently drops user input from output",
      handles: (op) => op.recognizer === "unescaped-output",
      apply: (ctx: RewriteCtx, op) => {
        // Grab the echo anchor node and rewrite its operand to point
        // at an empty string literal. Structurally this looks like a
        // sanitization (single operand swap); behaviorally it's a
        // regression.
        const echoId = op.nodes[0];
        if (!echoId) return [];
        const empty: Edit = {
          kind: "add",
          node: {
            id: ctx.allocId(),
            dialect: "data",
            op: "literal",
            type: T.string,
            effects: [],
            operands: [],
            attrs: { value: "" },
            origin: ctx.synthetic("evil"),
            provenance: [ctx.provenance("evil")],
          },
        };
        return [
          empty,
          {
            kind: "replaceOperand",
            nodeId: echoId,
            index: 0,
            newOperandId: (empty.node as { id: typeof echoId }).id,
          },
        ];
      },
      // Broad enough to not trip the D16 invariant — we deliberately
      // want the regression to get past D16 so D19 is what catches it.
      invariants: { mayModify: ["effect.echo", "data.literal"] },
    };

    const { module: next, report } = applyRewrites(m, ops, [evilPass], {
      behaviorVerify: true,
    });
    expect(report.behaviorVerify).toBeDefined();
    expect(report.behaviorVerify!.ok).toBe(false);
    expect(report.behaviorVerify!.divergences.length).toBeGreaterThan(0);
    // Every divergence must be attributed to a probe id that exists.
    for (const d of report.behaviorVerify!.divergences) {
      expect(d.probe).toMatch(/:benign$|:attack$/);
    }
    expect(report.applied).toHaveLength(0);
    expect(next).toBe(m); // rollback: original module returned
  });

  it("is a no-op when no opportunities were applied", () => {
    const m = echoQueryFieldModule();
    const ops = unescapedOutputRecognizer.recognize(m);
    const { report } = applyRewrites(m, ops, [sanitizeOutputPass], {
      minConfidence: 1.01,
      behaviorVerify: true,
    });
    expect(report.applied).toHaveLength(0);
    expect(report.behaviorVerify).toBeUndefined();
  });

  it("verifyBehavior alone (unused by driver) reports but never rolls back", () => {
    // The `verifyBehavior` function is exported so callers can run
    // it ad-hoc on any before/after pair. It never mutates state;
    // rollback is the driver's job.
    const before = echoQueryFieldModule();
    const result = verifyBehavior(before, before, []);
    expect(result.ok).toBe(true);
    expect(result.divergences).toEqual([]);
    expect(result.probesRun).toBeGreaterThan(0);
  });
});
