import { describe, expect, it } from "vitest";
import {
  domainTypesByTable,
  emitTypes,
  mergeSchema,
  parseSchema,
  summarizeShapes,
  extractTableNames,
  MAX_TRACE_STRING_ENUM_DISTINCT,
} from "../src/index.js";
import { SCHEMA_VERSION, type TraceCorpus } from "@chrysalis/oracle";

function corpus(
  events: Array<{
    sql: string;
    shape: Array<[string, string]>;
    rows?: ReadonlyArray<Readonly<Record<string, unknown>>>;
  }>,
): TraceCorpus {
  return {
    id: "test",
    createdAt: "2026-04-22T00:00:00Z",
    root: "/dev/null",
    traces: events.map((e, i) => ({
      header: {
        type: "header",
        schemaVersion: SCHEMA_VERSION,
        traceId: `t${i}`,
        startedAt: `2026-04-22T00:00:0${i}Z`,
        php: { version: "8.3.0", sapi: "cli-server" },
        redaction: { configHash: "h", rules: [] },
      },
      events: [
        {
          type: "sql.query",
          driver: "pdo",
          sql: e.sql,
          params: [],
          rowCount: e.rows?.length ?? 1,
          rowShape: e.shape.map(([name, typeTag]) => ({ name, typeTag })),
          ...(e.rows ? { rows: e.rows } : {}),
          durationUs: 100,
          origin: { file: "x.php", line: 1 },
        },
      ],
      footer: {
        type: "footer",
        endedAt: `2026-04-22T00:00:0${i}Z`,
        durationUs: 100,
        eventCount: 1,
        exitStatus: 0,
      },
    })),
  };
}

describe("extractTableNames", () => {
  it("finds FROM and JOIN", () => {
    expect(extractTableNames("SELECT * FROM users u JOIN posts p ON p.author_id = u.id")).toEqual([
      "users",
      "posts",
    ]);
  });
  it("ignores tokens inside string literals", () => {
    expect(extractTableNames("SELECT 'FROM fake_table' FROM real_table")).toEqual([
      "real_table",
    ]);
  });
  it("returns an empty list for non-SELECTs without FROM", () => {
    expect(extractTableNames("INSERT INTO users (id) VALUES (1)")).toEqual([]);
  });
});

describe("mergeSchema", () => {
  const ddl = parseSchema(
    `
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL,
  password TEXT NOT NULL
);
CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  author_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL
);
`,
    "schema.sql",
  );

  it("merges DDL and observed shapes", () => {
    const c = corpus([
      { sql: "SELECT id, username FROM users", shape: [["id", "integer"], ["username", "text"]] },
      { sql: "SELECT id, title FROM posts", shape: [["id", "integer"], ["title", "text"]] },
    ]);
    const shapes = summarizeShapes(c);
    const report = mergeSchema(ddl, shapes);
    expect(report.entities.map((e) => e.name)).toEqual(["users", "posts"]);
    const users = report.entities.find((e) => e.name === "users")!;
    expect(users.typescriptName).toBe("User");
    const username = users.fields.find((f) => f.name === "username")!;
    expect(username.kind).toBe("ddl-and-observed");
    expect(username.provenance.some((p) => p.kind === "trace")).toBe(true);
  });

  it("flags observed-only fields not in DDL", () => {
    const c = corpus([
      { sql: "SELECT email FROM users", shape: [["email", "text"]] },
    ]);
    const shapes = summarizeShapes(c);
    const report = mergeSchema(ddl, shapes);
    const users = report.entities.find((e) => e.name === "users")!;
    const email = users.fields.find((f) => f.name === "email")!;
    expect(email.kind).toBe("observed-only");
    expect(email.typescriptType).toContain("string | null");
  });

  it("promotes plain TEXT to a string-literal union from sql.query.rows (v2)", () => {
    const ddl = parseSchema(
      `CREATE TABLE members (
        id INTEGER PRIMARY KEY,
        role TEXT NOT NULL
      );`,
      "schema.sql",
    );
    const c = corpus([
      {
        sql: "SELECT id, role FROM members",
        shape: [
          ["id", "integer"],
          ["role", "text"],
        ],
        rows: [
          { id: 1, role: "admin" },
          { id: 2, role: "member" },
        ],
      },
    ]);
    const report = mergeSchema(ddl, summarizeShapes(c));
    const role = report.entities[0]!.fields.find((f) => f.name === "role")!;
    expect(role.typescriptType).toBe(`"admin" | "member"`);
    expect(role.provenance.some((p) => p.detail.includes("literal union"))).toBe(true);
  });

  it("records a conflict when trace literals fall outside a DDL CHECK enum", () => {
    const ddl = parseSchema(
      `CREATE TABLE t (
        id INTEGER PRIMARY KEY,
        status TEXT NOT NULL CHECK (status IN ('on', 'off'))
      );`,
      "schema.sql",
    );
    const c = corpus([
      {
        sql: "SELECT status FROM t",
        shape: [["status", "text"]],
        rows: [{ status: "on" }, { status: "maybe" }],
      },
    ]);
    const report = mergeSchema(ddl, summarizeShapes(c));
    const f = report.entities[0]!.fields.find((x) => x.name === "status")!;
    expect(f.conflicts.some((c) => c.includes("maybe") && c.includes("not in DDL enum"))).toBe(
      true,
    );
  });

  it("drops trace literal sets above the cardinality cap", () => {
    const rows: Array<Record<string, unknown>> = [];
    for (let i = 0; i < MAX_TRACE_STRING_ENUM_DISTINCT + 2; i++) {
      rows.push({ tag: `v${i}` });
    }
    const ddl = parseSchema(
      `CREATE TABLE wide (id INTEGER PRIMARY KEY, tag TEXT NOT NULL);`,
      "s.sql",
    );
    const c = corpus([{ sql: "SELECT tag FROM wide", shape: [["tag", "text"]], rows }]);
    const shapes = summarizeShapes(c);
    const tagField = shapes.byTable.get("wide")!.fields.find((f) => f.name === "tag")!;
    expect(tagField.observedStringLiterals).toBeUndefined();
    const report = mergeSchema(ddl, shapes);
    const f = report.entities[0]!.fields.find((x) => x.name === "tag")!;
    expect(f.typescriptType).toBe("string");
  });
});

describe("emitTypes", () => {
  it("renders TypeScript interfaces with provenance", () => {
    const ddl = parseSchema(
      `CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
      "schema.sql",
    );
    const report = mergeSchema(ddl, { byTable: new Map(), orphan: [] });
    const src = emitTypes(report);
    expect(src).toContain("export interface User {");
    expect(src).toContain("@chrysalis-provenance schema schema.sql");
    expect(src).toContain("username: string");
  });

  it("surfaces orphan shapes and unknown DDL", () => {
    const parsed = parseSchema(`CREATE TABLE t (id INTEGER PRIMARY KEY);`);
    const c = corpus([
      { sql: "SELECT count(*) c FROM (SELECT 1)", shape: [["c", "integer"]] },
    ]);
    const shapes = summarizeShapes(c);
    const report = mergeSchema(parsed, shapes);
    const src = emitTypes(report);
    expect(src).toContain("orphan:");
  });

  it("domainTypesByTable maps DDL names to archaeology interface names", () => {
    const ddl = parseSchema(
      `CREATE TABLE users (id INTEGER PRIMARY KEY);
       CREATE TABLE posts (id INTEGER PRIMARY KEY);`,
      "schema.sql",
    );
    const report = mergeSchema(ddl, { byTable: new Map(), orphan: [] });
    expect(domainTypesByTable(report)).toEqual({
      users: "User",
      posts: "Post",
    });
  });
});
