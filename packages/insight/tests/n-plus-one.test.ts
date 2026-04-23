import { describe, expect, it } from "vitest";
import { T } from "@chrysalis/webir";
import { nPlusOneRecognizer } from "../src/recognizers/n-plus-one.js";
import { boostWithCorpus } from "../src/framework.js";
import { buildModule } from "./helpers.js";
import type { TraceCorpus } from "@chrysalis/oracle";

describe("n-plus-one recognizer", () => {
  it("fires on a foreach with an inner db read", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const outer = eff.dbQuery({
        kind: "read",
        sql: "SELECT * FROM posts",
        params: [],
        returns: "rows",
        tables: ["posts"],
        type: T.array(T.record({})),
        origin: loc(),
      });
      const rowParam = data.param({ name: "row", type: T.record({}), origin: loc() });
      const pk = data.member({ obj: rowParam, key: "author_id", type: T.int, origin: loc() });
      const inner = eff.dbQuery({
        kind: "read",
        sql: "SELECT * FROM users WHERE id = ?",
        params: [pk],
        returns: "row-or-null",
        tables: ["users"],
        type: T.nullable(T.record({})),
        origin: loc(),
      });
      const body = data.block({ statements: [inner], origin: loc() });
      return data.foreach({
        iterable: outer,
        valueName: "row",
        body,
        origin: loc(),
      });
    });

    const opps = nPlusOneRecognizer.recognize(m);
    expect(opps).toHaveLength(1);
    const op = opps[0]!;
    expect(op.recognizer).toBe("n-plus-one-queries");
    expect(op.evidence["innerSql"]).toBe("SELECT * FROM users WHERE id = ?");
    expect(op.evidence["outerSql"]).toBe("SELECT * FROM posts");
    expect(op.route).toEqual({ method: "GET", path: "/x" });
    expect(op.confidence).toBeGreaterThan(0.5);
    expect(op.confidence).toBeLessThan(1);
  });

  it("does not fire when the loop body has no db.query", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const outer = eff.dbQuery({
        kind: "read",
        sql: "SELECT * FROM posts",
        params: [],
        returns: "rows",
        tables: ["posts"],
        type: T.array(T.record({})),
        origin: loc(),
      });
      const row = data.param({ name: "row", type: T.record({}), origin: loc() });
      const echo = eff.echo({ value: row, origin: loc() });
      const body = data.block({ statements: [echo], origin: loc() });
      return data.foreach({
        iterable: outer,
        valueName: "row",
        body,
        origin: loc(),
      });
    });
    expect(nPlusOneRecognizer.recognize(m)).toHaveLength(0);
  });

  it("boosts confidence when the trace corpus confirms repeated firings", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const outer = eff.dbQuery({
        kind: "read",
        sql: "SELECT * FROM posts",
        params: [],
        returns: "rows",
        tables: ["posts"],
        type: T.array(T.record({})),
        origin: loc(),
      });
      const rowParam = data.param({ name: "row", type: T.record({}), origin: loc() });
      const inner = eff.dbQuery({
        kind: "read",
        sql: "SELECT * FROM users WHERE id = ?",
        params: [rowParam],
        returns: "row-or-null",
        tables: ["users"],
        type: T.nullable(T.record({})),
        origin: loc(),
      });
      const body = data.block({ statements: [inner], origin: loc() });
      return data.foreach({
        iterable: outer,
        valueName: "row",
        body,
        origin: loc(),
      });
    });

    const [op] = nPlusOneRecognizer.recognize(m);
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
              sql: "SELECT * FROM users WHERE id = ?",
              params: [1],
              rowCount: 1,
              rowShape: [],
              durationUs: 1,
              origin: { file: "t.php", line: 1 },
            },
            {
              type: "sql.query",
              driver: "sqlite",
              sql: "SELECT * FROM users WHERE id = ?",
              params: [2],
              rowCount: 1,
              rowShape: [],
              durationUs: 1,
              origin: { file: "t.php", line: 1 },
            },
            {
              type: "sql.query",
              driver: "sqlite",
              sql: "SELECT * FROM users WHERE id = ?",
              params: [3],
              rowCount: 1,
              rowShape: [],
              durationUs: 1,
              origin: { file: "t.php", line: 1 },
            },
          ],
          footer: {
            type: "footer",
            endedAt: "2026-01-01T00:00:01Z",
            durationUs: 1,
            eventCount: 4,
            exitStatus: 0,
          },
        },
      ],
    };
    const boosted = boostWithCorpus(op!, corpus);
    expect(boosted.severity).toBe("strong");
    expect(boosted.confidence).toBeGreaterThan(op!.confidence);
    expect(boosted.evidence["corpusConfirmations"]).toBe(1);
    expect(boosted.evidence["observedMaxPerRequest"]).toBe(3);
  });
});
