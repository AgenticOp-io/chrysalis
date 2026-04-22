import { createServer, type Server } from "node:http";
import { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SCHEMA_VERSION,
  type Trace,
  type TraceCorpus,
} from "@chrysalis/oracle";
import { buildReport, replayCorpus } from "../src/index.js";

function mkTrace(overrides: {
  traceId: string;
  startedAt: string;
  method: string;
  path: string;
  expectedStatus: number;
  expectedBody: string;
  expectedHeaders?: Record<string, string>;
  post?: Record<string, unknown>;
  cookies?: Record<string, string>;
}): Trace {
  return {
    header: {
      type: "header",
      schemaVersion: SCHEMA_VERSION,
      traceId: overrides.traceId,
      startedAt: overrides.startedAt,
      php: { version: "8.3.0", sapi: "cli-server" },
      redaction: { configHash: "deadbeef", rules: [] },
    },
    events: [
      {
        type: "http.request",
        method: overrides.method,
        path: overrides.path,
        query: {},
        headers: {},
        cookies: overrides.cookies ?? {},
        post: overrides.post ?? {},
        rawBody: null,
        session: {},
      },
      {
        type: "http.response",
        status: overrides.expectedStatus,
        headers: overrides.expectedHeaders ?? { "content-type": "text/html" },
        body: overrides.expectedBody,
        bodyTruncated: false,
        session: {},
      },
    ],
    footer: {
      type: "footer",
      endedAt: overrides.startedAt,
      durationUs: 1000,
      eventCount: 2,
      exitStatus: 0,
    },
  };
}

function corpusOf(traces: Trace[]): TraceCorpus {
  return {
    id: "test",
    createdAt: "2026-04-22T00:00:00Z",
    root: "/dev/null",
    traces,
  };
}

interface TestServer {
  url: string;
  stop: () => Promise<void>;
}

async function startTestServer(
  handler: (req: import("node:http").IncomingMessage, body: string) =>
    | { status: number; headers?: Record<string, string>; body: string }
    | Promise<{ status: number; headers?: Record<string, string>; body: string }>,
): Promise<TestServer> {
  const server: Server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk.toString();
    const out = await handler(req, body);
    res.writeHead(out.status, out.headers ?? { "content-type": "text/html" });
    res.end(out.body);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as AddressInfo).port;
  return {
    url: `http://127.0.0.1:${port}`,
    stop: () =>
      new Promise<void>((r, rej) => server.close((err) => (err ? rej(err) : r()))),
  };
}

describe("replayCorpus", () => {
  let ts: TestServer;

  afterEach(async () => {
    if (ts) await ts.stop();
  });

  it("reports ok for a perfectly matching mock server", async () => {
    ts = await startTestServer((req) => ({
      status: 200,
      body: `<h1>route=${req.url}</h1>`,
    }));
    const corpus = corpusOf([
      mkTrace({
        traceId: "t1",
        startedAt: "2026-04-22T00:00:00Z",
        method: "GET",
        path: "/",
        expectedStatus: 200,
        expectedBody: "<h1>route=/</h1>",
      }),
    ]);
    const outcomes = await replayCorpus(corpus, { baseUrl: ts.url });
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]!.ok).toBe(true);
    expect(outcomes[0]!.diff.bodySimilarity).toBe(1);
  });

  it("chains cookies across ordered traces", async () => {
    ts = await startTestServer((req) => {
      if (req.url === "/login") {
        return {
          status: 200,
          headers: {
            "content-type": "text/html",
            "set-cookie": "sid=XYZ; Path=/",
          },
          body: "ok",
        };
      }
      const cookie = req.headers.cookie ?? "";
      return { status: 200, body: `<p>cookie=${cookie}</p>` };
    });
    const corpus = corpusOf([
      mkTrace({
        traceId: "t1",
        startedAt: "2026-04-22T00:00:01Z",
        method: "GET",
        path: "/login",
        expectedStatus: 200,
        expectedHeaders: { "content-type": "text/html" }, // location absent = not compared strictly
        expectedBody: "ok",
      }),
      mkTrace({
        traceId: "t2",
        startedAt: "2026-04-22T00:00:02Z",
        method: "GET",
        path: "/me",
        expectedStatus: 200,
        expectedBody: "<p>cookie=sid=XYZ</p>",
      }),
    ]);
    const outcomes = await replayCorpus(corpus, { baseUrl: ts.url });
    expect(outcomes.map((o) => o.ok)).toEqual([true, true]);
  });

  it("detects a status-mismatch divergence", async () => {
    ts = await startTestServer(() => ({
      status: 500,
      body: "oops",
    }));
    const corpus = corpusOf([
      mkTrace({
        traceId: "t1",
        startedAt: "2026-04-22T00:00:00Z",
        method: "GET",
        path: "/",
        expectedStatus: 200,
        expectedBody: "ok",
      }),
    ]);
    const outcomes = await replayCorpus(corpus, { baseUrl: ts.url });
    expect(outcomes[0]!.ok).toBe(false);
    expect(outcomes[0]!.diff.divergences.map((d) => d.kind)).toContain(
      "status-mismatch",
    );
  });

  it("buildReport aggregates per-route scores", async () => {
    ts = await startTestServer((req) =>
      req.url === "/" ? { status: 200, body: "ok" } : { status: 500, body: "bad" },
    );
    const corpus = corpusOf([
      mkTrace({
        traceId: "t1",
        startedAt: "2026-04-22T00:00:01Z",
        method: "GET",
        path: "/",
        expectedStatus: 200,
        expectedBody: "ok",
      }),
      mkTrace({
        traceId: "t2",
        startedAt: "2026-04-22T00:00:02Z",
        method: "GET",
        path: "/broken",
        expectedStatus: 200,
        expectedBody: "ok",
      }),
    ]);
    const outcomes = await replayCorpus(corpus, { baseUrl: ts.url });
    const report = buildReport(outcomes);
    expect(report.aggregate.framesTotal).toBe(2);
    expect(report.aggregate.framesPassed).toBe(1);
    expect(report.aggregate.correctness).toBe(0.5);
    expect(report.endpoints).toHaveLength(2);
  });
});
