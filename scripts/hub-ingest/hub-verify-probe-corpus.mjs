#!/usr/bin/env node
/**
 * Probe emitted app in-process and build a TraceCorpus (G951 shared probe).
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { SCHEMA_VERSION } from "../../packages/oracle/dist/index.js";
import { hubGoldReplayFetchInit, hubMiddlewarePresetsFromModule } from "./hub-gold-replay-probe.mjs";
import { createChrysalisNextjsInProcessFetch } from "./hub-gold-nextjs-fetch.mjs";
import { listOpenApiFixtureRoutes } from "./hub-wptp-contract-gold.mjs";
import { listHubWebRoutes } from "./hub-webir-routes.mjs";

/** @type {Map<string, Promise<void>>} */
const tsImportGateTail = new Map();
/** @type {Promise<void>} */
let globalTsImportTail = Promise.resolve();

/**
 * Serialize tsx/esm server imports (per outDir + global) — avoids concurrent compile CPU hangs on GCE.
 * @param {string} outDir
 * @param {(parentURL: string) => Promise<unknown>} load
 */
async function withTsImportLock(outDir, load) {
  const key = resolve(outDir);
  const prevLocal = tsImportGateTail.get(key) ?? Promise.resolve();
  const prevGlobal = globalTsImportTail;
  /** @type {(v?: void) => void} */
  let releaseLocal;
  /** @type {(v?: void) => void} */
  let releaseGlobal;
  const gateLocal = new Promise((r) => {
    releaseLocal = r;
  });
  const gateGlobal = new Promise((r) => {
    releaseGlobal = r;
  });
  const tailLocal = prevLocal.then(() => gateLocal);
  const tailGlobal = Promise.all([prevGlobal, prevLocal]).then(() => gateGlobal);
  tsImportGateTail.set(key, tailLocal);
  globalTsImportTail = tailGlobal;
  await Promise.all([prevLocal, prevGlobal]);
  try {
    const parentURL = pathToFileURL(join(key, "package.json")).href;
    return await load(parentURL);
  } finally {
    releaseLocal();
    releaseGlobal();
    if (tsImportGateTail.get(key) === tailLocal) tsImportGateTail.delete(key);
    if (globalTsImportTail === tailGlobal) globalTsImportTail = Promise.resolve();
  }
}

/**
 * @param {object} o
 */
export function mkHubProbeTrace(o) {
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
        rawBody: o.rawBody ?? null,
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

/**
 * @param {string} fixtureDir
 * @param {string} origin
 * @param {string} target
 * @param {string} scriptRoot
 */
export async function loadHubProbeContext(fixtureDir, origin, target, scriptRoot) {
  const fixture = resolve(fixtureDir);
  const openapiPath = join(fixture, "openapi.json");
  const useOpenApiRoutes = existsSync(openapiPath);
  let webirPath = join(fixture, ".chrysalis", `hub.${origin}.webir.json`);
  if (!existsSync(webirPath)) {
    const ingested = join(fixture, ".chrysalis", "ingested.webir.json");
    if (existsSync(ingested)) webirPath = ingested;
  }
  const outDir = join(fixture, "generated", target);

  const webirMod = await import(pathToFileURL(join(scriptRoot, "packages/webir/dist/index.js")).href);
  /** @type {import('@chrysalis/webir').Module | null} */
  let mod = null;
  let middlewarePresets = new Set();
  if (!useOpenApiRoutes) {
    const raw = JSON.parse(await readFile(webirPath, "utf8"));
    mod = webirMod.moduleFromGoldenSnapshot(raw);
    middlewarePresets = hubMiddlewarePresetsFromModule(mod);
  }
  const routes = useOpenApiRoutes ? listOpenApiFixtureRoutes(fixture) : listHubWebRoutes(mod);

  /** @type {(url: string, init?: RequestInit) => Promise<Response>} */
  let inProcessFetch;
  if (target === "nextjs") {
    inProcessFetch = await createChrysalisNextjsInProcessFetch(outDir);
  } else {
    const serverMod = await withTsImportLock(outDir, async (parentURL) => {
      const { tsImport } = await import("tsx/esm/api");
      return tsImport("./src/server.ts", parentURL);
    });
    const fetchFn = serverMod.chrysalisInProcessFetch ?? serverMod.fetch;
    if (typeof fetchFn !== "function") {
      throw new Error(`hub-probe-corpus: ${target} server has no chrysalisInProcessFetch or fetch export`);
    }
    inProcessFetch = fetchFn.bind(serverMod);
  }

  return { fixture, outDir, routes, middlewarePresets, inProcessFetch };
}

/**
 * @param {{ routes: Array<{ method: string, path: string }>, middlewarePresets: Set<string>, inProcessFetch: (url: string, init?: RequestInit) => Promise<Response>, fixture: string, corpusId?: string }} ctx
 */
export async function probeHubGoldCorpus(ctx) {
  const traces = [];
  const startedAt = "2026-05-01T12:00:00.000Z";
  let i = 0;
  for (const r of ctx.routes) {
    const url = `http://127.0.0.1${r.path}`;
    const init = hubGoldReplayFetchInit(r.method, ctx.middlewarePresets);
    const resp = await ctx.inProcessFetch(url, init);
    const body = await resp.text();
    const headers = {};
    resp.headers.forEach((v, k) => {
      headers[k] = v;
    });
    const reqHeaders = { ...(init.headers ?? {}) };
    const rawBody = init.body && typeof init.body === "string" ? init.body : null;
    const ct = reqHeaders["content-type"] ?? "";
    const bodyIsSerialized = ct.includes("application/json") || ct.includes("urlencoded");
    let post = {};
    if (rawBody && ct.includes("application/json")) {
      try {
        post = JSON.parse(rawBody);
      } catch {
        post = {};
      }
    } else if (rawBody && ct.includes("urlencoded")) {
      post = Object.fromEntries(new URLSearchParams(rawBody));
    }
    traces.push(
      mkHubProbeTrace({
        traceId: `hub-probe-${i++}`,
        startedAt,
        method: r.method,
        path: r.path,
        reqHeaders,
        post: bodyIsSerialized ? {} : post,
        rawBody,
        expectedStatus: resp.status,
        expectedHeaders: headers,
        expectedBody: body,
      }),
    );
  }

  return {
    id: ctx.corpusId ?? "hub-probe-corpus",
    createdAt: startedAt,
    root: ctx.fixture,
    traces,
  };
}
