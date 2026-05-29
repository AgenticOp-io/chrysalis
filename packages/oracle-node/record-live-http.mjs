#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Recorder } from "./src/recorder.mjs";

function parseRoutes(text) {
  if (!text) return [{ method: "GET", path: "/health" }];
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const parts = entry.split(/\s+/);
      if (parts.length === 1) return { method: "GET", path: parts[0] };
      const method = parts[0].toUpperCase();
      const path = parts.slice(1).join(" ");
      return { method, path };
    });
}

function parseArgs(argv) {
  let out = resolve("trace.ndjson");
  let corpusDir = null;
  let baseUrl = "";
  let routes = parseRoutes("");
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--out" && argv[i + 1]) out = resolve(argv[++i]);
    else if (argv[i] === "--corpus-dir" && argv[i + 1]) corpusDir = resolve(argv[++i]);
    else if (argv[i] === "--base-url" && argv[i + 1]) baseUrl = argv[++i];
    else if (argv[i] === "--routes" && argv[i + 1]) routes = parseRoutes(argv[++i]);
  }
  return { out, corpusDir, baseUrl, routes };
}

function parseBody(text, headers) {
  const ct = String(headers["content-type"] ?? headers["Content-Type"] ?? "");
  if (ct.includes("application/json")) {
    try {
      return JSON.stringify(JSON.parse(text));
    } catch {
      return text;
    }
  }
  return text;
}

async function writeTraceFile(targetPath, trace) {
  const lines = [trace.header, ...trace.events, trace.footer].map((o) => JSON.stringify(o)).join("\n");
  await writeFile(targetPath, `${lines}\n`, "utf8");
}

async function main() {
  const { out, corpusDir, baseUrl, routes } = parseArgs(process.argv);
  if (!baseUrl) {
    throw new Error(
      "usage: record-live-http.mjs --base-url http://127.0.0.1:3000 (--out file.ndjson | --corpus-dir traces/) [--routes \"GET /a,POST /b\"]",
    );
  }
  const day = new Date().toISOString().slice(0, 10);
  let traceCount = 0;

  for (const route of routes) {
    const url = new URL(route.path, baseUrl).toString();
    const resp = await fetch(url, {
      method: route.method,
      signal: AbortSignal.timeout(15_000),
    });
    const body = await resp.text();
    const headers = Object.fromEntries(resp.headers.entries());

    const rec = new Recorder();
    rec.onRequestStart(route.method, new URL(url).pathname, {
      headers: { host: new URL(url).host },
    });
    rec.onResponse(resp.status, parseBody(body, headers), { headers });
    const trace = rec.buildTrace();

    if (corpusDir) {
      const dayDir = join(corpusDir, day);
      await mkdir(dayDir, { recursive: true });
      const file = join(dayDir, `${trace.header.traceId}.ndjson`);
      await writeTraceFile(file, trace);
    } else {
      const { appendFile, mkdir: mkdirp } = await import("node:fs/promises");
      const { dirname } = await import("node:path");
      await mkdirp(dirname(out), { recursive: true });
      if (traceCount === 0) {
        await writeFile(out, "", "utf8");
      }
      const lines = [trace.header, ...trace.events, trace.footer].map((o) => JSON.stringify(o)).join("\n");
      await appendFile(out, `${lines}\n`, "utf8");
    }
    traceCount += 1;
  }

  console.log(JSON.stringify({ ok: true, out: corpusDir ?? out, traceCount, baseUrl }, null, 2));
  // On Windows, Node's global fetch (undici) can keep handles alive; force exit for CLI usage.
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
