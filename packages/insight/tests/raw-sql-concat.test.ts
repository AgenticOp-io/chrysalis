import { describe, expect, it } from "vitest";
import { T } from "@chrysalis/webir";
import { rawSqlConcatRecognizer } from "../src/recognizers/raw-sql-concat.js";
import { buildModule } from "./helpers.js";

describe("raw-sql-concat recognizer", () => {
  it("fires when a handler builds dynamic SQL and also reads a request field", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const field = data.requestField({ source: "query", name: "id", type: T.string, origin: loc() });
      const q = eff.dbQuery({
        kind: "read",
        sql: "<dynamic>",
        params: [field],
        returns: "rows",
        tables: ["users"],
        type: T.array(T.record({})),
        origin: loc(),
      });
      return data.block({ statements: [q], origin: loc() });
    });
    const ops = rawSqlConcatRecognizer.recognize(m);
    expect(ops).toHaveLength(1);
    expect(ops[0]!.severity).toBe("strong");
    expect(ops[0]!.confidence).toBeGreaterThanOrEqual(0.8);
    expect(ops[0]!.evidence["handlerHasTaintedInput"]).toBe(true);
  });

  it("reports suggestion severity when dynamic SQL has no tainted input in the handler", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const q = eff.dbQuery({
        kind: "read",
        sql: "<dynamic>",
        params: [],
        returns: "rows",
        tables: ["users"],
        type: T.array(T.record({})),
        origin: loc(),
      });
      return data.block({ statements: [q], origin: loc() });
    });
    const ops = rawSqlConcatRecognizer.recognize(m);
    expect(ops).toHaveLength(1);
    expect(ops[0]!.severity).toBe("suggestion");
  });

  it("does not fire when the query is parameterized with literal SQL", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const field = data.requestField({ source: "query", name: "id", type: T.string, origin: loc() });
      const q = eff.dbQuery({
        kind: "read",
        sql: "SELECT * FROM users WHERE id = ?",
        params: [field],
        returns: "rows",
        tables: ["users"],
        type: T.array(T.record({})),
        origin: loc(),
      });
      return data.block({ statements: [q], origin: loc() });
    });
    expect(rawSqlConcatRecognizer.recognize(m)).toHaveLength(0);
  });
});
