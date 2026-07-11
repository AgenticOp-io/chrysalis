#!/usr/bin/env node
/**
 * Enrich WISP pilot oracle traces with showcase hydrate-sample bodies (G9750).
 * Surface stubs become rich JSON so bind can hydrate without a separate samples dir
 * (samples dir remains as fallback / source of truth for the rewrite).
 */
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = join(root, "fixtures/hub-wisp-management");
const sampleDir = join(fixture, "hydrate-samples");
const outDir = join(fixture, "wisp-api-pilot-traces/enriched");

function slugToApiPath(slug) {
  const base = slug.replace(/\.json$/, "");
  /** Multi-segment API paths that are not a single hyphenated resource name. */
  const known = {
    "api-monitoring-graphs": "/api/monitoring/graphs",
  };
  if (known[base]) return known[base];
  // api-work-orders → /api/work-orders (keep hyphens inside the resource)
  if (base.startsWith("api-")) return `/api/${base.slice("api-".length)}`;
  return `/${base.replace(/-/g, "/")}`;
}

function writeTrace(apiPath, body) {
  const id = createHash("sha1").update(apiPath).digest("hex").slice(0, 32);
  const started = "2026-07-10T20:00:00.000Z";
  const bodyStr = JSON.stringify(body);
  const lines = [
    JSON.stringify({
      type: "header",
      schemaVersion: "1.0.0",
      traceId: id,
      startedAt: started,
      php: { version: "hub-node", sapi: "oracle-node" },
      redaction: { configHash: "oracle-node-min", rules: [] },
      enrichment: "chrysalis.wisp.hydrate-sample-trace",
    }),
    JSON.stringify({
      type: "http.request",
      method: "GET",
      path: apiPath,
      query: {},
      headers: { host: "127.0.0.1" },
      cookies: {},
      post: {},
      rawBody: null,
      session: {},
    }),
    JSON.stringify({
      type: "http.response",
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: bodyStr,
      bodyTruncated: false,
      session: {},
    }),
    JSON.stringify({
      type: "footer",
      endedAt: started,
      durationUs: 1000,
      eventCount: 2,
      exitStatus: 0,
    }),
  ];
  const file = join(outDir, `${id}.ndjson`);
  writeFileSync(file, `${lines.join("\n")}\n`, "utf8");
  return { apiPath, file, bytes: bodyStr.length };
}

export function enrichWispPilotTraces(opts = {}) {
  const samplesRoot = resolve(opts.sampleDir ?? sampleDir);
  const dest = resolve(opts.outDir ?? outDir);
  if (!existsSync(samplesRoot)) {
    return { ok: false, skip: "hydrate-samples-missing", samplesRoot };
  }
  mkdirSync(dest, { recursive: true });
  const written = [];
  for (const name of readdirSync(samplesRoot).filter((f) => f.endsWith(".json"))) {
    const raw = readFileSync(join(samplesRoot, name), "utf8").replace(/^\uFEFF/, "");
    const body = JSON.parse(raw);
    written.push(writeTrace(slugToApiPath(name), body));
  }
  const manifest = {
    kind: "chrysalis.wisp.enriched-pilot-traces",
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    count: written.length,
    outDir: dest,
    traces: written,
    note: "Showcase-enriched oracle traces from hydrate-samples — not live production traffic.",
  };
  writeFileSync(join(dest, "manifest.v1.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return { ok: true, ...manifest };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const r = enrichWispPilotTraces();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}
