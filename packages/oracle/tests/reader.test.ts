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
