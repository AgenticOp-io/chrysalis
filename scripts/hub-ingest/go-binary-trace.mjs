#!/usr/bin/env node
/**
 * D6601 behaviour half: run a black-box Go server binary on localhost, replay
 * each route from a routes JSON (HubNativeRoute shape), record oracle traces
 * (packages/oracle-node Recorder, validated by @chrysalis/oracle readCorpus),
 * and attach the observed response shape per route.
 *
 * Holes stay open (D6447): a recorded trace is evidence for
 * `legacy:go-binary-handler-body`, never a close. Request bodies come only from
 * operator samples; otherwise an empty body. Path-param routes without a
 * sample are skipped, not guessed.
 *
 * Usage:
 *   node scripts/hub-ingest/go-binary-trace.mjs <binary> --routes routes.json [--samples dir] [--out file.json]
 *
 * Samples: `<dir>/<METHOD>_<path>.json` (non-alphanumerics -> `_`, e.g.
 * `GET_items_id.json`) with `{ "path"?, "query"?, "headers"?, "body"? }`.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createServer, connect } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Recorder } from "../../packages/oracle-node/src/recorder.mjs";
import { readCorpus } from "../../packages/oracle/dist/index.js";

export const GO_BINARY_HANDLER_BODY_HOLE = "legacy:go-binary-handler-body";
const HOST = "127.0.0.1";

function freePort() {
  return new Promise((res, rej) => {
    const s = createServer();
    s.once("error", rej);
    s.listen(0, HOST, () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });
}

function canConnect(port) {
  return new Promise((res) => {
    const sock = connect({ host: HOST, port });
    sock.once("connect", () => {
      sock.destroy();
      res(true);
    });
    sock.once("error", () => res(false));
  });
}

async function waitListening(child, port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`binary exited (${child.exitCode}) before listening on ${port}`);
    if (await canConnect(port)) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`binary did not listen on ${HOST}:${port} within ${timeoutMs}ms`);
}

/** JSON type descriptor with sorted object keys; non-JSON bodies are "text". */
export function jsonShape(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return { array: v.length ? jsonShape(v[0]) : "unknown" };
  if (typeof v === "object") {
    return { object: Object.fromEntries(Object.keys(v).sort().map((k) => [k, jsonShape(v[k])])) };
  }
  return typeof v;
}

function sampleFileName(route) {
  return `${`${route.method}${route.path}`.replace(/[^A-Za-z0-9]+/g, "_").replace(/_+$/, "")}.json`;
}

async function loadSample(samplesDir, route) {
  if (!samplesDir) return null;
  const f = join(samplesDir, sampleFileName(route));
  return existsSync(f) ? JSON.parse(await readFile(f, "utf8")) : null;
}

function hasPathParam(path) {
  return /[:*{]/.test(path);
}

async function writeTrace(dayDir, trace) {
  const lines = [trace.header, ...trace.events, trace.footer].map((o) => JSON.stringify(o)).join("\n");
  await writeFile(join(dayDir, `${trace.header.traceId}.ndjson`), `${lines}\n`, "utf8");
}

/**
 * @param {{ binary: string, routes: any, samplesDir?: string, tracesDir?: string, args?: string[], startTimeoutMs?: number }} opts
 * `routes` is an array of HubNativeRoute or an object with a `routes` array.
 * Returns the same container with routes sorted and `observed` attached where a trace was recorded.
 */
export async function traceGoBinary(opts) {
  const list = Array.isArray(opts.routes) ? opts.routes : opts.routes.routes;
  if (!Array.isArray(list)) throw new Error("routes JSON must be an array or { routes: [...] }");
  const sorted = [...list].sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

  const tracesDir = opts.tracesDir ?? (await mkdtemp(join(tmpdir(), "chrysalis-go-binary-trace-")));
  const dayDir = join(tracesDir, "go-binary");
  await mkdir(dayDir, { recursive: true });

  const port = await freePort();
  const child = spawn(resolve(opts.binary), opts.args ?? [], {
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "ignore", "pipe"],
  });
  child.stderr.resume();
  const base = `http://${HOST}:${port}`;
  const recorded = new Map();
  const skipped = [];
  try {
    await waitListening(child, port, opts.startTimeoutMs ?? 15_000);
    for (const route of sorted) {
      const sample = await loadSample(opts.samplesDir, route);
      const reqPath = sample?.path ?? route.path;
      if (!sample?.path && hasPathParam(route.path)) {
        skipped.push({ method: route.method, path: route.path, reason: "path-param-without-sample" });
        continue;
      }
      const url = new URL(reqPath, base);
      for (const [k, v] of Object.entries(sample?.query ?? {})) url.searchParams.set(k, String(v));
      // Trust boundary: sample paths must not redirect the recorder off localhost.
      if (url.origin !== base) throw new Error(`sample path leaves localhost: ${reqPath}`);
      const headers = { ...(sample?.headers ?? {}) };
      let body;
      if (sample?.body !== undefined) {
        body = typeof sample.body === "string" ? sample.body : JSON.stringify(sample.body);
        if (typeof sample.body !== "string" && !Object.keys(headers).some((h) => h.toLowerCase() === "content-type")) {
          headers["content-type"] = "application/json";
        }
      } else if (!["GET", "HEAD", "DELETE", "OPTIONS"].includes(route.method)) {
        body = "";
      }
      let resp, text;
      try {
        resp = await fetch(url, { method: route.method, headers, body, signal: AbortSignal.timeout(15_000) });
        text = await resp.text();
      } catch (e) {
        skipped.push({ method: route.method, path: route.path, reason: `request-error: ${e?.message ?? e}` });
        continue;
      }
      const respHeaders = Object.fromEntries(resp.headers.entries());
      const rec = new Recorder();
      rec.onRequestStart(route.method, url.pathname, {
        headers: { host: url.host, ...headers },
        query: Object.fromEntries(url.searchParams.entries()),
      });
      rec.onResponse(resp.status, text, { headers: respHeaders });
      const trace = rec.buildTrace();
      // Stable id so output is reproducible run to run.
      const traceId = `go-binary-${route.method}${route.path}`.replace(/[^A-Za-z0-9-]+/g, "_");
      await writeTrace(dayDir, { ...trace, header: { ...trace.header, traceId } });
      recorded.set(traceId, route);
    }
  } finally {
    if (child.exitCode === null) {
      const exited = new Promise((r) => child.once("exit", r));
      child.kill();
      await exited;
    }
  }

  // Re-read through the oracle reader so every trace is schema-validated.
  const corpus = readCorpus({ root: tracesDir });
  const observedByRoute = new Map();
  for (const t of corpus.traces) {
    const route = recorded.get(t.header.traceId);
    const res = t.events.find((e) => e.type === "http.response");
    if (!route || !res) continue;
    let bodyShape = "text";
    try {
      bodyShape = res.body === "" ? "empty" : jsonShape(JSON.parse(res.body));
    } catch {
      /* non-JSON body stays "text" */
    }
    observedByRoute.set(route, {
      traceId: t.header.traceId,
      status: res.status,
      contentType: res.headers["content-type"] ?? null,
      bodyShape,
      ...(JSON.stringify(route).includes(GO_BINARY_HANDLER_BODY_HOLE)
        ? { evidenceFor: GO_BINARY_HANDLER_BODY_HOLE }
        : {}),
    });
  }

  const routes = sorted.map((r) => (observedByRoute.has(r) ? { ...r, observed: observedByRoute.get(r) } : r));
  const traceReport = { ...(opts.tracesDir ? { tracesRoot: tracesDir } : {}), recordedCount: observedByRoute.size, skipped };
  return Array.isArray(opts.routes)
    ? { routes, trace: traceReport }
    : { ...opts.routes, routes, trace: traceReport };
}

function parseArgs(argv) {
  const out = { binary: null, routes: null, samples: null, out: null, traces: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--routes") out.routes = argv[++i];
    else if (a === "--samples") out.samples = argv[++i];
    else if (a === "--out") out.out = argv[++i];
    else if (a === "--traces") out.traces = argv[++i];
    else if (!out.binary) out.binary = a;
  }
  return out;
}

async function main() {
  const a = parseArgs(process.argv);
  if (!a.binary || !a.routes) {
    console.error(
      "usage: go-binary-trace.mjs <binary> --routes routes.json [--samples dir] [--out file.json] [--traces dir]",
    );
    process.exit(2);
  }
  const result = await traceGoBinary({
    binary: a.binary,
    routes: JSON.parse(await readFile(resolve(a.routes), "utf8")),
    samplesDir: a.samples ? resolve(a.samples) : undefined,
    tracesDir: a.traces ? resolve(a.traces) : undefined,
  });
  const json = `${JSON.stringify(result, null, 2)}\n`;
  if (a.out) {
    await mkdir(dirname(resolve(a.out)), { recursive: true });
    await writeFile(resolve(a.out), json, "utf8");
  } else process.stdout.write(json);
  // Windows undici keep-alive handles can hold the loop open.
  process.exit(0);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
