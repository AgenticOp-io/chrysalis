import { describe, expect, it } from "vitest";
import { T } from "@chrysalis/webir";
import type { TraceCorpus } from "@chrysalis/oracle";
import { boostWithCorpus } from "../src/framework.js";
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

  it("attaches corpus SQL evidence for matching-route traces (parameterize-sql gating)", () => {
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
    const [op] = rawSqlConcatRecognizer.recognize(m);
    expect(op).toBeDefined();
    const corpus: TraceCorpus = {
      id: "test",
      createdAt: "2026-01-01T00:00:00Z",
      root: "/tmp",
      traces: [
        {
          header: {
            type: "header",
            schemaVersion: "1.0.0",
            traceId: "a",
            startedAt: "2026-01-01T00:00:00Z",
            php: { version: "8.3", sapi: "cli-server" },
            redaction: { configHash: "x", rules: [] },
          },
          events: [
            {
              type: "http.request",
              method: "GET",
              path: "/x",
              query: {},
              headers: {},
              cookies: {},
              post: {},
              rawBody: null,
              session: {},
            },
            {
              type: "sql.query",
              driver: "sqlite",
              sql: "SELECT 1",
              params: [],
              rowCount: 0,
              rowShape: [],
              durationUs: 1,
              origin: { file: "t.php", line: 1 },
            },
          ],
          footer: {
            type: "footer",
            endedAt: "2026-01-01T00:00:01Z",
            durationUs: 1,
            eventCount: 2,
            exitStatus: 0,
          },
        },
      ],
    };
    const boosted = boostWithCorpus(op!, corpus);
    expect(boosted.evidence["corpusConfirmations"]).toBe(1);
    expect(boosted.evidence["observedMaxPerRequest"]).toBe(1);
    expect(boosted.confidence).toBeGreaterThan(op!.confidence);
  });
});
