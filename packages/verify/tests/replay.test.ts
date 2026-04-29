import { existsSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { AddressInfo } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SCHEMA_VERSION,
  type Trace,
  type TraceCorpus,
} from "@chrysalis/oracle";
import { buildReport, replayCorpus, traceDeterminismSeed } from "../src/index.js";

/** Built worker entry (present after `pnpm build` in `@chrysalis/verify`). */
const replayWorkerJs = join(dirname(fileURLToPath(import.meta.url)), "../dist/replay-worker.js");
const workerDistAvailable = existsSync(replayWorkerJs);

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
  let ts: TestServer | undefined;

  afterEach(async () => {
    if (ts) {
      await ts.stop();
      ts = undefined;
    }
  });

  it("injects chrysalis determinism headers from trace metadata by default", async () => {
    const corpus = corpusOf([
      mkTrace({
        traceId: "trace-seed-a",
        startedAt: "2026-05-01T12:34:56.789Z",
        method: "GET",
        path: "/x",
        expectedStatus: 200,
        expectedHeaders: { "content-type": "text/html" },
        expectedBody: "ok",
      }),
    ]);
    let sawNow = "";
    let sawSeed = "";
    const injectedFetch: typeof fetch = async (input, init) => {
      const r = new Request(input, init);
      sawNow = r.headers.get("x-chrysalis-now-iso") ?? "";
      sawSeed = r.headers.get("x-chrysalis-random-seed") ?? "";
      return new Response("ok", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    };
    await replayCorpus(corpus, { baseUrl: "http://unused.test", fetch: injectedFetch });
    expect(sawNow).toBe("2026-05-01T12:34:56.789Z");
    expect(sawSeed).toBe(String(traceDeterminismSeed("trace-seed-a")));
  });

  it("omits determinism headers when injectDeterminismHeaders is false", async () => {
    const corpus = corpusOf([
      mkTrace({
        traceId: "t-no-hdr",
        startedAt: "2026-05-01T00:00:00Z",
        method: "GET",
        path: "/x",
        expectedStatus: 200,
        expectedBody: "ok",
      }),
    ]);
    const injectedFetch: typeof fetch = async (input, init) => {
      const r = new Request(input, init);
      expect(r.headers.get("x-chrysalis-now-iso")).toBeNull();
      expect(r.headers.get("x-chrysalis-random-seed")).toBeNull();
      return new Response("ok", { status: 200, headers: { "content-type": "text/html" } });
    };
    await replayCorpus(corpus, {
      baseUrl: "http://unused.test",
      fetch: injectedFetch,
      injectDeterminismHeaders: false,
    });
  });

  it("honors an injected fetch (in-process handler) without a real server", async () => {
    const corpus = corpusOf([
      mkTrace({
        traceId: "t-injected",
        startedAt: "2026-04-22T00:00:00Z",
        method: "GET",
        path: "/foo",
        expectedStatus: 200,
        expectedHeaders: { "content-type": "text/html" },
        expectedBody: "injected-body",
      }),
    ]);
    const injectedFetch: typeof fetch = async (url, _init) => {
      void url;
      return new Response("injected-body", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    };
    const outcomes = await replayCorpus(corpus, {
      baseUrl: "http://unused.test",
      fetch: injectedFetch,
    });
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]!.ok).toBe(true);
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

  it("sends x-chrysalis-sql-tape when recordedSqlReplay and trace has complete sql rows", async () => {
    let seenTape: string | undefined;
    const injectedFetch: typeof fetch = async (input, init) => {
      const r = new Request(input, init);
      seenTape = r.headers.get("x-chrysalis-sql-tape") ?? undefined;
      return new Response("ok", { status: 200, headers: { "content-type": "text/html" } });
    };
    const trace: Trace = {
      header: {
        type: "header",
        schemaVersion: SCHEMA_VERSION,
        traceId: "t-sql",
        startedAt: "2026-04-22T00:00:00Z",
        php: { version: "8.3.0", sapi: "cli-server" },
        redaction: { configHash: "deadbeef", rules: [] },
      },
      events: [
        {
          type: "http.request",
          method: "GET",
          path: "/",
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
          sql: "SELECT 1 AS x",
          params: [],
          rowCount: 1,
          rowShape: [{ name: "x", typeTag: "integer" }],
          rows: [{ x: 1 }],
          durationUs: 10,
          origin: { file: "a.php", line: 2 },
        },
        {
          type: "http.response",
          status: 200,
          headers: { "content-type": "text/html" },
          body: "ok",
          bodyTruncated: false,
          session: {},
        },
      ],
      footer: {
        type: "footer",
        endedAt: "2026-04-22T00:00:01Z",
        durationUs: 1000,
        eventCount: 3,
        exitStatus: 0,
      },
    };
    await replayCorpus(corpusOf([trace]), {
      baseUrl: "http://unused.test",
      fetch: injectedFetch,
      recordedSqlReplay: true,
    });
    expect(seenTape).toBeDefined();
    const decoded = JSON.parse(Buffer.from(seenTape!, "base64url").toString("utf8")) as {
      queries: Array<{ sql: string; params: unknown[]; rows: Array<Record<string, unknown>> }>;
    };
    expect(decoded.queries).toEqual([
      { sql: "SELECT 1 AS x", params: [], rows: [{ x: 1 }] },
    ]);
  });

  it("omits sql tape when SELECT rows were not recorded", async () => {
    let seenTape: string | null | undefined = "sentinel";
    const injectedFetch: typeof fetch = async (input, init) => {
      const r = new Request(input, init);
      seenTape = r.headers.get("x-chrysalis-sql-tape");
      return new Response("ok", { status: 200, headers: { "content-type": "text/html" } });
    };
    const trace: Trace = {
      header: {
        type: "header",
        schemaVersion: SCHEMA_VERSION,
        traceId: "t-norows",
        startedAt: "2026-04-22T00:00:00Z",
        php: { version: "8.3.0", sapi: "cli-server" },
        redaction: { configHash: "deadbeef", rules: [] },
      },
      events: [
        {
          type: "http.request",
          method: "GET",
          path: "/",
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
          rowCount: 1,
          rowShape: [{ name: "x", typeTag: "integer" }],
          durationUs: 10,
          origin: { file: "a.php", line: 2 },
        },
        {
          type: "http.response",
          status: 200,
          headers: { "content-type": "text/html" },
          body: "ok",
          bodyTruncated: false,
          session: {},
        },
      ],
      footer: {
        type: "footer",
        endedAt: "2026-04-22T00:00:01Z",
        durationUs: 1000,
        eventCount: 3,
        exitStatus: 0,
      },
    };
    await replayCorpus(corpusOf([trace]), {
      baseUrl: "http://unused.test",
      fetch: injectedFetch,
      recordedSqlReplay: true,
    });
    expect(seenTape).toBeNull();
  });

  it("rejects concurrency>1 when cookie chaining is enabled", async () => {
    await expect(
      replayCorpus(
        corpusOf([
          mkTrace({
            traceId: "c1",
            startedAt: "2026-04-22T12:00:00Z",
            method: "GET",
            path: "/",
            expectedStatus: 200,
            expectedBody: "x",
          }),
        ]),
        {
          baseUrl: "http://unused.test",
          concurrency: 2,
          fetch: async () =>
            new Response("x", { status: 200, headers: { "content-type": "text/html" } }),
        },
      ),
    ).rejects.toThrow(/disableCookieChain/);
  });

  it("replays concurrently when disableCookieChain and concurrency>1", async () => {
    const t1 = mkTrace({
      traceId: "p1",
      startedAt: "2026-04-22T00:00:01Z",
      method: "GET",
      path: "/a",
      expectedStatus: 200,
      expectedBody: "ok",
    });
    const t2 = mkTrace({
      traceId: "p2",
      startedAt: "2026-04-22T00:00:02Z",
      method: "GET",
      path: "/b",
      expectedStatus: 200,
      expectedBody: "ok",
    });
    let inflight = 0;
    let maxInflight = 0;
    const fetchImpl: typeof fetch = async () => {
      inflight += 1;
      maxInflight = Math.max(maxInflight, inflight);
      await new Promise<void>((r) => setTimeout(r, 30));
      inflight -= 1;
      return new Response("ok", { status: 200, headers: { "content-type": "text/html" } });
    };
    const outcomes = await replayCorpus(corpusOf([t1, t2]), {
      baseUrl: "http://127.0.0.1",
      disableCookieChain: true,
      concurrency: 2,
      fetch: fetchImpl,
      injectDeterminismHeaders: false,
    });
    expect(maxInflight).toBe(2);
    expect(outcomes).toHaveLength(2);
    expect(outcomes.every((o) => o.ok)).toBe(true);
  });

  it("rejects workerThreads with injected fetch (remote replay requires global fetch)", async () => {
    await expect(
      replayCorpus(
        corpusOf([
          mkTrace({
            traceId: "w1",
            startedAt: "2026-04-22T12:00:00Z",
            method: "GET",
            path: "/",
            expectedStatus: 200,
            expectedBody: "x",
          }),
        ]),
        {
          baseUrl: "http://unused.test",
          disableCookieChain: true,
          concurrency: 2,
          workerThreads: true,
          fetch: async () =>
            new Response("x", { status: 200, headers: { "content-type": "text/html" } }),
        },
      ),
    ).rejects.toThrow(/workerThreads requires global fetch/);
  });

  it("rejects workerThreads with module attribution (global fetch)", async () => {
    const fakeModule = { id: "m", nodes: [] } as unknown as import("@chrysalis/webir").Module;
    const srv = await startTestServer(() => ({
      status: 200,
      headers: { "content-type": "text/html" },
      body: "x",
    }));
    try {
      await expect(
        replayCorpus(
          corpusOf([
            mkTrace({
              traceId: "w2",
              startedAt: "2026-04-22T12:00:01Z",
              method: "GET",
              path: "/",
              expectedStatus: 200,
              expectedBody: "x",
            }),
          ]),
          {
            baseUrl: srv.url,
            disableCookieChain: true,
            concurrency: 2,
            workerThreads: true,
            module: fakeModule,
            injectDeterminismHeaders: false,
          },
        ),
      ).rejects.toThrow(/IR module attribution/);
    } finally {
      await srv.stop();
    }
  });

  it("onlyRoute replays a subset of traces", async () => {
    const t1 = mkTrace({
      traceId: "f1",
      startedAt: "2026-04-22T00:00:01Z",
      method: "GET",
      path: "/a",
      expectedStatus: 200,
      expectedBody: "ok",
    });
    const t2 = mkTrace({
      traceId: "f2",
      startedAt: "2026-04-22T00:00:02Z",
      method: "POST",
      path: "/b",
      expectedStatus: 200,
      expectedBody: "ok",
    });
    ts = await startTestServer(() => ({
      status: 200,
      headers: { "content-type": "text/html" },
      body: "ok",
    }));
    const out = await replayCorpus(corpusOf([t1, t2]), {
      baseUrl: ts.url,
      onlyRoute: "POST /b",
      injectDeterminismHeaders: false,
    });
    expect(out).toHaveLength(1);
    expect(out[0]?.traceId).toBe("f2");
  });

  it("onlyTraceId selects a single trace", async () => {
    const t1 = mkTrace({
      traceId: "tid-a",
      startedAt: "2026-04-22T00:00:01Z",
      method: "GET",
      path: "/",
      expectedStatus: 200,
      expectedBody: "x",
    });
    const t2 = mkTrace({
      traceId: "tid-b",
      startedAt: "2026-04-22T00:00:02Z",
      method: "GET",
      path: "/",
      expectedStatus: 200,
      expectedBody: "x",
    });
    ts = await startTestServer(() => ({
      status: 200,
      headers: { "content-type": "text/html" },
      body: "x",
    }));
    const out = await replayCorpus(corpusOf([t1, t2]), {
      baseUrl: ts.url,
      onlyTraceId: "tid-b",
      injectDeterminismHeaders: false,
    });
    expect(out).toHaveLength(1);
    expect(out[0]?.traceId).toBe("tid-b");
  });

  it("throws when filters match no traces", async () => {
    const t1 = mkTrace({
      traceId: "z1",
      startedAt: "2026-04-22T00:00:01Z",
      method: "GET",
      path: "/",
      expectedStatus: 200,
      expectedBody: "x",
    });
    await expect(
      replayCorpus(corpusOf([t1]), {
        baseUrl: "http://127.0.0.1:9",
        onlyRoute: "GET /nope",
        injectDeterminismHeaders: false,
      }),
    ).rejects.toThrow(/no traces matched filters/);
  });
});

const describeWorkerDist = workerDistAvailable ? describe : describe.skip;

describeWorkerDist("replayCorpus workerThreads (dist/replay-worker.js)", () => {
  let ts: TestServer | undefined;

  afterEach(async () => {
    if (ts) {
      await ts.stop();
      ts = undefined;
    }
  });

  it("matches outcomes from the async concurrency pool", async () => {
    const t1 = mkTrace({
      traceId: "wt1",
      startedAt: "2026-04-22T00:00:01Z",
      method: "GET",
      path: "/x",
      expectedStatus: 200,
      expectedBody: "ok",
    });
    const t2 = mkTrace({
      traceId: "wt2",
      startedAt: "2026-04-22T00:00:02Z",
      method: "GET",
      path: "/y",
      expectedStatus: 200,
      expectedBody: "ok",
    });
    ts = await startTestServer((_req, _body) => ({
      status: 200,
      headers: { "content-type": "text/html" },
      body: "ok",
    }));
    const corpus = corpusOf([t1, t2]);
    const base = {
      baseUrl: ts.url,
      disableCookieChain: true as const,
      concurrency: 2,
      injectDeterminismHeaders: false as const,
    };
    const poolOut = await replayCorpus(corpus, { ...base });
    const workerOut = await replayCorpus(corpus, { ...base, workerThreads: true });
    expect(poolOut.map((o) => o.traceId)).toEqual(workerOut.map((o) => o.traceId));
    expect(poolOut.map((o) => o.ok)).toEqual(workerOut.map((o) => o.ok));
    expect(poolOut.every((o) => o.ok)).toBe(true);
  });
});
