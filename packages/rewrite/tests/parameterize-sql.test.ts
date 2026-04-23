import { describe, expect, it } from "vitest";
import { T, type NodeBase, type NodeId } from "@chrysalis/webir";
import { rawSqlConcatRecognizer } from "@chrysalis/insight";
import { applyRewrites, parameterizeSqlPass } from "../src/index.js";
import { buildModule } from "./helpers.js";

function findDbQuery(mod: ReturnType<typeof buildModule>): NodeBase {
  for (const n of mod.nodes.values()) {
    if (n.dialect === "effect" && n.op === "db.query") return n;
  }
  throw new Error("no db.query in module");
}

describe("rewrite engine — parameterize-sql", () => {
  it("lifts a tainted concat tail into a bound parameter", () => {
    // Mirrors fixtures/tiny-n1/pages/lookup.php:
    //   query_all("SELECT id, name FROM users WHERE id = " . $_GET['id'])
    const m = buildModule(({ data, eff, loc }) => {
      const lit = data.literal({
        value: "SELECT id, name FROM users WHERE id = ",
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

    const ops = rawSqlConcatRecognizer.recognize(m);
    expect(ops).toHaveLength(1);
    expect(ops[0]!.severity).toBe("strong");

    const { module: next, report } = applyRewrites(m, ops, [parameterizeSqlPass]);
    expect(report.applied).toHaveLength(1);
    expect(report.skipped).toHaveLength(0);

    const q = findDbQuery(next);
    expect(q.attrs).toMatchObject({
      sql: "SELECT id, name FROM users WHERE id = ?",
    });
    // The sqlExpr attr must be gone after rewrite — it's no longer the
    // source of truth for the SQL text.
    expect((q.attrs as Record<string, unknown>).sqlExpr).toBeUndefined();
    // The tainted leaf is now a bound parameter.
    expect(q.operands).toHaveLength(1);

    // Re-running the recognizer finds no SQLi — fix is complete.
    const after = rawSqlConcatRecognizer.recognize(next);
    expect(after).toHaveLength(0);
  });

  it("inlines clean string literals and only lifts non-literal leaves", () => {
    // Concat of a literal + literal + tainted expression: the literals
    // should stay inside the SQL text, only the tainted one becomes `?`.
    const m = buildModule(({ data, eff, loc }) => {
      const a = data.literal({ value: "SELECT * FROM t WHERE ", type: T.string, origin: loc() });
      const col = data.literal({ value: "id = ", type: T.string, origin: loc() });
      const ab = data.binOp({
        operator: ".",
        left: a,
        right: col,
        type: T.string,
        origin: loc(),
      });
      const field = data.requestField({
        source: "query",
        name: "id",
        type: T.string,
        origin: loc(),
      });
      const root = data.binOp({
        operator: ".",
        left: ab,
        right: field,
        type: T.string,
        origin: loc(),
      });
      return eff.dbQuery({
        kind: "read",
        sql: "<dynamic>",
        sqlExpr: root,
        params: [],
        returns: "rows",
        tables: ["t"],
        type: T.unknown,
        origin: loc(),
      });
    });

    const ops = rawSqlConcatRecognizer.recognize(m);
    const { module: next, report } = applyRewrites(m, ops, [parameterizeSqlPass]);
    expect(report.applied).toHaveLength(1);

    const q = findDbQuery(next);
    expect((q.attrs as { sql: string }).sql).toBe("SELECT * FROM t WHERE id = ?");
    expect(q.operands).toHaveLength(1);
  });

  it("skips the opportunity when sqlExpr was never preserved", () => {
    // Simulates a module ingested by an older version that didn't store
    // the concat tree. The pass has nothing to lift; it must fail
    // cleanly and record the reason, not crash.
    const m = buildModule(({ eff, loc }) => {
      return eff.dbQuery({
        kind: "read",
        sql: "<dynamic>",
        params: [],
        returns: "rows",
        tables: ["users"],
        type: T.unknown,
        origin: loc(),
      });
    });
    const ops = rawSqlConcatRecognizer.recognize(m);
    // Without taint sources the severity drops to "suggestion"
    // (confidence 0.55) which is below the default 0.75 threshold, so
    // to test the no-sqlExpr path we pass a custom threshold of 0.
    const { report } = applyRewrites(m, ops, [parameterizeSqlPass], {
      minConfidence: 0,
    });
    expect(report.applied).toHaveLength(0);
    expect(report.skipped).toHaveLength(1);
    expect(report.skipped[0]!.reason).toMatch(/sqlExpr/);
  });

  it("preserves pre-existing bound parameters alongside lifted ones", () => {
    // A query that already has one bound param AND a concatenated
    // tainted value. The rewrite must append — not replace — so the
    // original params keep their positions.
    const m = buildModule(({ data, eff, loc }) => {
      const orig = data.literal({ value: 42, type: T.int, origin: loc() });
      const a = data.literal({
        value: "SELECT * FROM t WHERE a = ? AND b = ",
        type: T.string,
        origin: loc(),
      });
      const field = data.requestField({
        source: "query",
        name: "b",
        type: T.string,
        origin: loc(),
      });
      const root = data.binOp({
        operator: ".",
        left: a,
        right: field,
        type: T.string,
        origin: loc(),
      });
      return eff.dbQuery({
        kind: "read",
        sql: "<dynamic>",
        sqlExpr: root,
        params: [orig],
        returns: "rows",
        tables: ["t"],
        type: T.unknown,
        origin: loc(),
      });
    });

    const ops = rawSqlConcatRecognizer.recognize(m);
    const { module: next, report } = applyRewrites(m, ops, [parameterizeSqlPass]);
    expect(report.applied).toHaveLength(1);

    const q = findDbQuery(next);
    expect((q.attrs as { sql: string }).sql).toBe("SELECT * FROM t WHERE a = ? AND b = ?");
    expect(q.operands).toHaveLength(2);
  });
});
