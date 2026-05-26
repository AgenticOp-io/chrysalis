#!/usr/bin/env node
/**
 * Probe emitted Hono app and replay corpus in-process (hub trace oracle).
 * Usage: node --import tsx scripts/hub-ingest/hub-gold-replay-worker.mjs <fixtureDir>
 */
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SCHEMA_VERSION } from "../../packages/oracle/dist/index.js";
import { buildReport, replayCorpus } from "../../packages/verify/dist/index.js";
import { listHubWebRoutes } from "./hub-webir-routes.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * @param {object} o
 */
function mkTrace(o) {
  return {
    header: {
      type: "header",
      schemaVersion: SCHEMA_VERSION,
      traceId: o.traceId,
      startedAt: o.startedAt,
      php: { version: "8.3.0", sapi: "hub-gold" },
      redaction: { configHash: "hub-gold", rules: [] },
    },
    events: [
      {
        type: "http.request",
        method: o.method,
        path: o.path,
        query: {},
        headers: o.reqHeaders ?? {},
        cookies: {},
        post: o.post ?? {},
        rawBody: null,
        session: {},
      },
      {
        type: "http.response",
        status: o.expectedStatus,
        headers: o.expectedHeaders ?? { "content-type": "text/html; charset=UTF-8" },
        body: o.expectedBody,
        bodyTruncated: false,
        session: {},
      },
    ],
    footer: {
      type: "footer",
      endedAt: o.startedAt,
      durationUs: 1000,
      eventCount: 2,
      exitStatus: 0,
    },
  };
}

function parseArgs(argv) {
  let fixture = join(scriptRoot, "fixtures/hub-gold-js-literal");
  let origin = "javascript";
  let target = "hono";
  const positional = [];
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
    else if (argv[i] === "--target" && argv[i + 1]) target = argv[++i];
    else if (!argv[i].startsWith("-")) positional.push(argv[i]);
  }
  if (positional[0]) fixture = resolve(positional[0]);
  return { fixture, origin, target };
}

async function main() {
  const { fixture, origin, target } = parseArgs(process.argv);
  const webirPath = join(fixture, ".chrysalis", `hub.${origin}.webir.json`);
  const serverPath = join(fixture, "generated", target, "src/server.ts");

  const webirMod = await import(pathToFileURL(join(scriptRoot, "packages/webir/dist/index.js")).href);
  const raw = JSON.parse(await readFile(webirPath, "utf8"));
  const routes = listHubWebRoutes(webirMod.moduleFromGoldenSnapshot(raw));

  const { chrysalisInProcessFetch } = await import(pathToFileURL(serverPath).href);

  const traces = [];
  const startedAt = "2026-05-01T12:00:00.000Z";
  let i = 0;
  for (const r of routes) {
    const url = `http://127.0.0.1${r.path}`;
    const resp = await chrysalisInProcessFetch(url, { method: r.method });
    const body = await resp.text();
    const headers = {};
    resp.headers.forEach((v, k) => {
      headers[k] = v;
    });
    traces.push(
      mkTrace({
        traceId: `hub-gold-${i++}`,
        startedAt,
        method: r.method,
        path: r.path,
        expectedStatus: resp.status,
        expectedHeaders: headers,
        expectedBody: body,
      }),
    );
  }

  const corpus = {
    id: "hub-gold-probe",
    createdAt: startedAt,
    root: fixture,
    traces,
  };

  const outcomes = await replayCorpus(corpus, {
    baseUrl: "http://127.0.0.1",
    injectDeterminismHeaders: true,
    fetch: (url, init) => chrysalisInProcessFetch(url, init),
  });
  const report = buildReport(outcomes);
  const correctness = report.aggregate?.correctness ?? 0;

  console.log(
    JSON.stringify({
      kind: "chrysalis.hub.trace-replay",
      schemaVersion: 0,
      fixture,
      origin,
      emitTarget: target,
      routeCount: routes.length,
      traceCount: traces.length,
      correctness,
      ok: correctness >= 1,
      report,
    }),
  );
  if (correctness < 1) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
