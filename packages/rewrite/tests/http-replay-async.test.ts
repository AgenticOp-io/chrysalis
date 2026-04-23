import { describe, expect, it } from "vitest";
import {
  SCHEMA_VERSION,
  type Trace,
  type TraceCorpus,
} from "@chrysalis/oracle";
import {
  DEFAULT_RECOGNIZERS,
  unescapedOutputRecognizer,
} from "@chrysalis/insight";
import { T } from "@chrysalis/webir";
import { applyRewritesAsync, sanitizeOutputPass } from "../src/index.js";
import { buildModule } from "./helpers.js";

function mkTrace(overrides: {
  traceId: string;
  startedAt: string;
  method: string;
  path: string;
  query?: Readonly<Record<string, string>>;
  expectedStatus: number;
  expectedBody: string;
  expectedHeaders?: Record<string, string>;
}): Trace {
  return {
    header: {
      type: "header",
      schemaVersion: SCHEMA_VERSION,
      traceId: overrides.traceId,
      startedAt: overrides.startedAt,
      php: { version: "8.3.0", sapi: "cli-server" },
      redaction: { configHash: "test", rules: [] },
    },
    events: [
      {
        type: "http.request",
        method: overrides.method,
        path: overrides.path,
        query: overrides.query ?? {},
        headers: {},
        cookies: {},
        post: {},
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
    createdAt: "2026-04-23T00:00:00Z",
    root: "/dev/null",
    traces,
  };
}

/** Single route GET / echoing a query field — produces unescaped-output. */
function echoQueryModule() {
  return buildModule(
    ({ data, eff, loc }) => {
      const q = data.requestField({
        source: "query",
        name: "x",
        type: T.string,
        origin: loc(),
      });
      return eff.echo({ value: q, origin: loc() });
    },
    { path: "/" },
  );
}

describe("applyRewritesAsync + http-replay (D20)", () => {
  it("runs replay after a successful batch and keeps commits when fetch matches corpus", async () => {
    const m = echoQueryModule();
    const ops = unescapedOutputRecognizer.recognize(m);
    const expectedHtml = "<p>hello</p>";
    const corpus = corpusOf([
      mkTrace({
        traceId: "t1",
        startedAt: "2026-04-23T00:00:01Z",
        method: "GET",
        path: "/",
        query: { x: "hello" },
        expectedStatus: 200,
        expectedBody: expectedHtml,
      }),
    ]);
    const fetchImpl: typeof fetch = async () =>
      new Response(expectedHtml, {
        status: 200,
        headers: { "content-type": "text/html" },
      });

    const result = await applyRewritesAsync(m, ops, [sanitizeOutputPass], {
      postVerifyRecognizers: DEFAULT_RECOGNIZERS,
      behaviorVerify: true,
      httpReplay: {
        corpus,
        baseUrl: "http://127.0.0.1",
        fetch: fetchImpl,
      },
    });

    expect(result.report.applied.length).toBeGreaterThan(0);
    expect(result.module).not.toBe(m);
    expect(result.report.httpReplayVerify?.ok).toBe(true);
    expect(result.report.httpReplayVerify?.outcomes).toHaveLength(1);
  });

  it("rolls back the full batch when replay diverges", async () => {
    const m = echoQueryModule();
    const ops = unescapedOutputRecognizer.recognize(m);
    const corpus = corpusOf([
      mkTrace({
        traceId: "t1",
        startedAt: "2026-04-23T00:00:01Z",
        method: "GET",
        path: "/",
        query: { x: "hello" },
        expectedStatus: 200,
        expectedBody: "expected-from-oracle",
      }),
    ]);
    const fetchImpl: typeof fetch = async () =>
      new Response("wrong-handler-output", {
        status: 200,
        headers: { "content-type": "text/html" },
      });

    const result = await applyRewritesAsync(m, ops, [sanitizeOutputPass], {
      postVerifyRecognizers: DEFAULT_RECOGNIZERS,
      behaviorVerify: true,
      httpReplay: {
        corpus,
        baseUrl: "http://127.0.0.1",
        fetch: fetchImpl,
      },
    });

    expect(result.report.httpReplayVerify?.ok).toBe(false);
    expect(result.report.applied).toHaveLength(0);
    expect(result.module).toBe(m);
    expect(
      result.report.skipped.some((s) => s.reason.includes("http-replay")),
    ).toBe(true);
  });

  it("uses resolveFetch(rewritten) when fetch is omitted", async () => {
    const m = echoQueryModule();
    const ops = unescapedOutputRecognizer.recognize(m);
    const expectedHtml = "<p>resolve</p>";
    const corpus = corpusOf([
      mkTrace({
        traceId: "t-rf",
        startedAt: "2026-04-23T00:00:02Z",
        method: "GET",
        path: "/",
        query: { x: "resolve" },
        expectedStatus: 200,
        expectedBody: expectedHtml,
      }),
    ]);
    let seenRewritten = false;
    const fetchImpl: typeof fetch = async () =>
      new Response(expectedHtml, {
        status: 200,
        headers: { "content-type": "text/html" },
      });

    const result = await applyRewritesAsync(m, ops, [sanitizeOutputPass], {
      postVerifyRecognizers: DEFAULT_RECOGNIZERS,
      behaviorVerify: true,
      httpReplay: {
        corpus,
        baseUrl: "http://127.0.0.1",
        resolveFetch: async (rewritten) => {
          seenRewritten = rewritten !== m;
          return fetchImpl;
        },
      },
    });

    expect(seenRewritten).toBe(true);
    expect(result.report.httpReplayVerify?.ok).toBe(true);
  });

  it("skips http-replay when nothing applied", async () => {
    const m = echoQueryModule();
    const ops = unescapedOutputRecognizer.recognize(m);
    const corpus = corpusOf([
      mkTrace({
        traceId: "t1",
        startedAt: "2026-04-23T00:00:01Z",
        method: "GET",
        path: "/",
        expectedStatus: 200,
        expectedBody: "x",
      }),
    ]);
    let fetchCalls = 0;
    const fetchImpl: typeof fetch = async () => {
      fetchCalls++;
      return new Response("x", { status: 200, headers: { "content-type": "text/html" } });
    };

    const result = await applyRewritesAsync(m, ops, [sanitizeOutputPass], {
      minConfidence: 2,
      httpReplay: { corpus, baseUrl: "http://x", fetch: fetchImpl },
    });

    expect(result.report.applied).toHaveLength(0);
    expect(result.report.httpReplayVerify).toBeUndefined();
    expect(fetchCalls).toBe(0);
  });
});
