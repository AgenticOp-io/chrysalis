import { describe, expect, it } from "vitest";
import { T } from "@chrysalis/webir";
import {
  DEFAULT_RECOGNIZERS,
  rawSqlConcatRecognizer,
  unescapedOutputRecognizer,
} from "@chrysalis/insight";
import {
  applyRewrites,
  parameterizeSqlPass,
  sanitizeOutputPass,
  type Edit,
  type RewriteCtx,
  type RewritePass,
} from "../src/index.js";
import { buildModule } from "./helpers.js";

/**
 * Module fixture: lookup-style dynamic SQL built by `"..." . $_GET['id']`.
 * Reused across tests in this file.
 */
function dynamicSqlModule() {
  return buildModule(({ data, eff, loc }) => {
    const lit = data.literal({
      value: "SELECT * FROM users WHERE id = ",
      type: T.string,
      origin: loc(),
    });
    const field = data.requestField({
      source: "query",
      name: "id",
      type: T.string,
      origin: loc(),
    });
    const concat = data.binOp({
      operator: ".",
      left: lit,
      right: field,
      type: T.string,
      origin: loc(),
    });
    return eff.dbQuery({
      kind: "read",
      sql: "<dynamic>",
      sqlExpr: concat,
      params: [],
      returns: "rows",
      tables: ["users"],
      type: T.unknown,
      origin: loc(),
    });
  });
}

describe("post-verify gate (D18)", () => {
  it("passes when every applied rewrite actually fixes its finding", () => {
    const m = dynamicSqlModule();
    const ops = rawSqlConcatRecognizer.recognize(m);
    expect(ops).toHaveLength(1);

    const { module: next, report } = applyRewrites(
      m,
      ops,
      [parameterizeSqlPass],
      { postVerifyRecognizers: DEFAULT_RECOGNIZERS },
    );

    expect(report.postVerify).toBeDefined();
    expect(report.postVerify!.ok).toBe(true);
    expect(report.postVerify!.recognizersRun).toContain("raw-sql-concat");
    expect(report.applied).toHaveLength(1);
    // And the module really has been rewritten.
    expect(rawSqlConcatRecognizer.recognize(next)).toHaveLength(0);
  });

  it("rolls back the entire batch when any applied rewrite fails to fix its finding", () => {
    // A lying pass that says it handles `raw-sql-concat` and emits a
    // no-op edit (adds a garbage data literal). The recognizer still
    // fires on the db.query after the edit — post-verify must catch
    // this and roll back every rewrite in the batch.
    const lyingPass: RewritePass = {
      id: "lying-sqli-fixer",
      name: "Pretends to fix SQLi but doesn't",
      handles: (op) => op.recognizer === "raw-sql-concat",
      apply: (ctx: RewriteCtx) => {
        const junk: Edit = {
          kind: "add",
          node: {
            id: ctx.allocId(),
            dialect: "data",
            op: "literal",
            type: T.string,
            effects: [],
            operands: [],
            attrs: { value: "I pretend to be a fix" },
            origin: ctx.synthetic("lying pass"),
            provenance: [ctx.provenance("lying pass")],
          },
        };
        return [junk];
      },
      invariants: { mayModify: ["data.literal"] },
    };

    const m = dynamicSqlModule();
    const ops = rawSqlConcatRecognizer.recognize(m);

    const { module: next, report } = applyRewrites(m, ops, [lyingPass], {
      postVerifyRecognizers: DEFAULT_RECOGNIZERS,
    });

    expect(report.postVerify).toBeDefined();
    expect(report.postVerify!.ok).toBe(false);
    expect(report.postVerify!.failures).toHaveLength(1);
    expect(report.postVerify!.failures[0]!.pass).toBe("lying-sqli-fixer");
    expect(report.applied).toHaveLength(0);
    expect(report.skipped).toHaveLength(1);
    expect(report.skipped[0]!.reason).toMatch(/rolled back.*post-verify/i);
    // Critically, the returned module is the ORIGINAL, byte-identical
    // to the input — the rewritten operand tree is not present.
    expect(next).toBe(m);
  });

  it("is a no-op when no opportunities are applied", () => {
    const m = dynamicSqlModule();
    // Force nothing to apply by setting min-confidence above any
    // possible finding, and still ask for post-verify.
    const ops = rawSqlConcatRecognizer.recognize(m);
    const { report } = applyRewrites(m, ops, [parameterizeSqlPass], {
      minConfidence: 1.01,
      postVerifyRecognizers: DEFAULT_RECOGNIZERS,
    });
    expect(report.applied).toHaveLength(0);
    // When nothing applied, the gate is skipped (no rewrite to verify).
    expect(report.postVerify).toBeUndefined();
  });

  it("verifies multi-pass batches and reports partial failures as batch-level rollback", () => {
    // One XSS opportunity (which will be correctly fixed by
    // sanitize-output) and one SQLi opportunity (which we'll feed to
    // a lying pass). Both should be rolled back together, not just
    // the failing one — post-verify is all-or-nothing.
    const m = buildModule(({ data, eff, web, loc }) => {
      const lit = data.literal({
        value: "SELECT * FROM users WHERE id = ",
        type: T.string,
        origin: loc(),
      });
      const field = data.requestField({
        source: "query",
        name: "id",
        type: T.string,
        origin: loc(),
      });
      const concat = data.binOp({
        operator: ".",
        left: lit,
        right: field,
        type: T.string,
        origin: loc(),
      });
      const q = eff.dbQuery({
        kind: "read",
        sql: "<dynamic>",
        sqlExpr: concat,
        params: [],
        returns: "rows",
        tables: ["users"],
        type: T.unknown,
        origin: loc(),
      });
      const xssField = data.requestField({
        source: "query",
        name: "q",
        type: T.string,
        origin: loc(),
      });
      const echo = eff.echo({ value: xssField, origin: loc() });
      return data.block({ statements: [q, echo], type: T.unknown, origin: loc() });
    });

    const sqli = rawSqlConcatRecognizer.recognize(m);
    const xss = unescapedOutputRecognizer.recognize(m);
    expect(sqli.length).toBeGreaterThan(0);
    expect(xss.length).toBeGreaterThan(0);

    const lyingPass: RewritePass = {
      id: "lying-sqli-fixer",
      name: "Lying SQLi fixer",
      handles: (op) => op.recognizer === "raw-sql-concat",
      apply: (ctx: RewriteCtx) => [
        {
          kind: "add",
          node: {
            id: ctx.allocId(),
            dialect: "data",
            op: "literal",
            type: T.string,
            effects: [],
            operands: [],
            attrs: { value: "nope" },
            origin: ctx.synthetic("lying pass"),
            provenance: [ctx.provenance("lying pass")],
          },
        },
      ],
      invariants: { mayModify: ["data.literal"] },
    };

    const { module: next, report } = applyRewrites(
      m,
      [...sqli, ...xss],
      [lyingPass, sanitizeOutputPass],
      { postVerifyRecognizers: DEFAULT_RECOGNIZERS },
    );

    expect(report.postVerify!.ok).toBe(false);
    // Even though sanitize-output would have fixed its XSS finding,
    // the whole batch is rolled back because the SQLi "fix" didn't
    // actually fix anything.
    expect(report.applied).toHaveLength(0);
    expect(next).toBe(m);
  });
});
