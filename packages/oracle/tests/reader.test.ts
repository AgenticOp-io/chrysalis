import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_REDACTION,
  SCHEMA_VERSION,
  SchemaError,
  canonicalJSON,
  groupByRoute,
  parseEvent,
  parseTraceFile,
  readCorpus,
  redactionRecords,
} from "../src/index.js";

function header(overrides: Partial<Record<string, unknown>> = {}): unknown {
  return {
    type: "header",
    schemaVersion: SCHEMA_VERSION,
    traceId: "t-0001",
    startedAt: "2026-04-21T00:00:00Z",
    php: { version: "8.3.0", sapi: "cli-server" },
    redaction: {
      configHash: "deadbeef",
      rules: redactionRecords(DEFAULT_REDACTION),
    },
    ...overrides,
  };
}

function footer(overrides: Partial<Record<string, unknown>> = {}): unknown {
  return {
    type: "footer",
    endedAt: "2026-04-21T00:00:00.050Z",
    durationUs: 50000,
    eventCount: 3,
    exitStatus: 0,
    ...overrides,
  };
}

function reqEvent(): unknown {
  return {
    type: "http.request",
    method: "GET",
    path: "/",
    query: {},
    headers: { host: "localhost" },
    cookies: {},
    post: {},
    rawBody: null,
    session: {},
  };
}

function respEvent(): unknown {
  return {
    type: "http.response",
    status: 200,
    headers: { "content-type": "text/html" },
    body: "<h1>ok</h1>",
    bodyTruncated: false,
    session: {},
  };
}

describe("trace-schema", () => {
  it("accepts a well-formed header at the current version", () => {
    expect(() => parseEvent(header())).not.toThrow();
  });

  it("rejects a mismatched schema version", () => {
    expect(() => parseEvent(header({ schemaVersion: "0.0.0" }))).toThrow(SchemaError);
  });

  it("rejects unknown event types", () => {
    expect(() => parseEvent({ type: "nope" })).toThrow(SchemaError);
  });

  it("parses a sql.query event with mysqli driver and bound params", () => {
    const e = parseEvent({
      type: "sql.query",
      driver: "mysqli",
      sql: "SELECT id FROM users WHERE id = ?",
      params: [42],
      rowCount: 1,
      rowShape: [{ name: "id", typeTag: "mysqli:3" }],
      durationUs: 80,
      origin: { file: "db.php", line: 5 },
    });
    expect(e.type).toBe("sql.query");
    if (e.type === "sql.query") {
      expect(e.driver).toBe("mysqli");
      expect(e.params).toEqual([42]);
    }
  });

  it("parses a sql.query event with row shape", () => {
    const e = parseEvent({
      type: "sql.query",
      driver: "pdo",
      sql: "SELECT * FROM posts",
      params: [],
      rowCount: 2,
      rowShape: [
        { name: "id", typeTag: "int" },
        { name: "title", typeTag: "string" },
      ],
      durationUs: 120,
      origin: { file: "index.php", line: 10 },
    });
    expect(e.type).toBe("sql.query");
  });

  it("parses http.outbound", () => {
    const e = parseEvent({
      type: "http.outbound",
      method: "GET",
      url: "https://example.com/api",
      status: 200,
      responseBytes: 42,
      durationUs: 5000,
      origin: { file: "lib.php", line: 3 },
    });
    expect(e.type).toBe("http.outbound");
    if (e.type === "http.outbound") {
      expect(e.url).toBe("https://example.com/api");
      expect(e.responseBytes).toBe(42);
    }
  });

  it("parses mail.send", () => {
    const e = parseEvent({
      type: "mail.send",
      to: "a@example.com",
      subject: "hi",
      bodyBytes: 10,
      origin: { file: "notify.php", line: 1 },
    });
    expect(e.type).toBe("mail.send");
    if (e.type === "mail.send") {
      expect(e.bodyBytes).toBe(10);
    }
  });

  it("parses sql.query with optional rows", () => {
    const e = parseEvent({
      type: "sql.query",
      driver: "pdo",
      sql: "SELECT * FROM posts",
      params: [],
      rowCount: 1,
      rowShape: [{ name: "id", typeTag: "int" }],
      rows: [{ id: 1, title: "hi" }],
      rowsTruncated: false,
      durationUs: 120,
      origin: { file: "index.php", line: 10 },
    });
    expect(e.type).toBe("sql.query");
    if (e.type === "sql.query") {
      expect(e.rows).toEqual([{ id: 1, title: "hi" }]);
      expect(e.rowsTruncated).toBe(false);
    }
  });

  it("canonicalJSON produces stable output regardless of key order", () => {
    const a = canonicalJSON({ b: 1, a: 2 });
    const b = canonicalJSON({ a: 2, b: 1 });
    expect(a).toBe(b);
  });
});

describe("parseTraceFile", () => {
  it("reads a valid ndjson trace", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-oracle-"));
    const file = join(dir, "trace.ndjson");
    writeFileSync(
      file,
      [header(), reqEvent(), respEvent(), footer()]
        .map((o) => JSON.stringify(o))
        .join("\n"),
    );
    const trace = parseTraceFile(file);
    expect(trace.header.traceId).toBe("t-0001");
    expect(trace.events).toHaveLength(2);
    expect(trace.footer.exitStatus).toBe(0);
  });

  it("fails clearly when the first line is not a header", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-oracle-"));
    const file = join(dir, "trace.ndjson");
    writeFileSync(file, [reqEvent(), footer()].map((o) => JSON.stringify(o)).join("\n"));
    expect(() => parseTraceFile(file)).toThrow(/header/);
  });

  it("fails clearly on malformed JSON", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-oracle-"));
    const file = join(dir, "trace.ndjson");
    writeFileSync(file, "not json\nalso not json\n");
    expect(() => parseTraceFile(file)).toThrow(/invalid JSON/);
  });
});

describe("readCorpus + groupByRoute", () => {
  it("groups traces by METHOD path", () => {
    const root = mkdtempSync(join(tmpdir(), "chrysalis-corpus-"));
    const day = join(root, "2026-04-21");
    mkdirSync(day);

    for (const [i, path] of [["1", "/"], ["2", "/posts/1"], ["3", "/"]] as const) {
      writeFileSync(
        join(day, `${i}.ndjson`),
        [
          header({ traceId: `t-${i}`, startedAt: `2026-04-21T00:00:0${i}Z` }),
          { ...(reqEvent() as object), path },
          respEvent(),
          footer(),
        ]
          .map((o) => JSON.stringify(o))
          .join("\n"),
      );
    }

    const corpus = readCorpus({ root });
    expect(corpus.traces).toHaveLength(3);
    const grouped = groupByRoute(corpus);
    expect(grouped.get("GET /")).toHaveLength(2);
    expect(grouped.get("GET /posts/1")).toHaveLength(1);
  });
});
