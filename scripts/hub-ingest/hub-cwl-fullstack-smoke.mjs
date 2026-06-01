#!/usr/bin/env node
/**
 * CWL RFC-0010 full-stack page surface smoke (G1143).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCwlModule } from "./cwl-parser.mjs";
import { exportCwlFileToWebirJson } from "./export-cwl-webir.mjs";
import { loadWebir } from "./shared.mjs";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";

export const HUB_CWL_FULLSTACK_SMOKE_KIND = "chrysalis.hub.cwl-fullstack-smoke";
export const HUB_CWL_FULLSTACK_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const goldFixture = join(scriptRoot, "fixtures/hub-gold-cwl-fullstack");
const goldVerifyScript = join(scriptRoot, "scripts/hub-ingest/hub-gold-verify.mjs");
const traceReplayScript = join(scriptRoot, "scripts/hub-ingest/hub-gold-trace-replay.mjs");

const SUITE_IDS = ["cwl-fullstack-hono", "cwl-fullstack-fastify"];

async function loadCwlProjection(cwlPath) {
  const webir = await loadWebir();
  const snapshot = await exportCwlFileToWebirJson(cwlPath);
  const raw = typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
  return summarizeCwlProjection(webir.moduleFromGoldenSnapshot(raw));
}

/**
 * @param {object} [opts]
 */
export async function runCwlFullstackSmoke(opts = {}) {
  const fixture = resolve(opts.fixture ?? goldFixture);
  const cwlPath = join(fixture, "routes.cwl");
  const base = {
    kind: HUB_CWL_FULLSTACK_SMOKE_KIND,
    schemaVersion: HUB_CWL_FULLSTACK_SMOKE_SCHEMA_VERSION,
    fixture: "fixtures/hub-gold-cwl-fullstack",
    rfc: "CWL-RFC-0010",
    suites: SUITE_IDS,
    ok: false,
  };
  if (!existsSync(cwlPath)) {
    return { ...base, skip: "missing-routes-cwl" };
  }

  const src = await readFile(cwlPath, "utf8");
  const parsed = parseCwlModule(src, "routes.cwl");
  const pageRoutes = parsed.routes.filter((r) => r.surfaceKind === "page");
  const apiRoutes = parsed.routes.filter((r) => (r.surfaceKind ?? "api") === "api");
  if (pageRoutes.length < 1 || apiRoutes.length < 1) {
    return {
      ...base,
      skip: "expected-page-and-api-routes",
      pageCount: pageRoutes.length,
      apiCount: apiRoutes.length,
    };
  }
  const home = pageRoutes.find((r) => r.path === "/");
  if (home?.body.kind !== "html" || home.responseContentType !== "text/html; charset=utf-8") {
    return { ...base, skip: "invalid-page-html-surface" };
  }

  let cwlProjection;
  try {
    cwlProjection = await loadCwlProjection(cwlPath);
  } catch (e) {
    return { ...base, skip: "cwl-ingest-failed", detail: String(e).slice(0, 200) };
  }

  /** @type {Record<string, boolean>} */
  const goldVerify = {};
  /** @type {Record<string, boolean>} */
  const traceReplay = {};
  let goldOk = true;
  let traceOk = true;
  for (const suite of SUITE_IDS) {
    const gv = spawnSync(process.execPath, [goldVerifyScript, "--suite", suite], {
      cwd: scriptRoot,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    goldVerify[suite] = gv.status === 0;
    if (gv.status !== 0) goldOk = false;
    const r = spawnSync(process.execPath, ["--import", "tsx", traceReplayScript, "--suite", suite], {
      cwd: scriptRoot,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    traceReplay[suite] = r.status === 0;
    if (r.status !== 0) traceOk = false;
  }

  const surfaceOk = pageRoutes.length >= 1 && apiRoutes.length >= 1;
  const projectionOk = cwlProjection.holeFree === cwlProjection.total;
  const ok = surfaceOk && projectionOk && goldOk && traceOk;

  return {
    ...base,
    ok,
    routeCount: parsed.routes.length,
    pageCount: pageRoutes.length,
    apiCount: apiRoutes.length,
    cwlProjection,
    goldVerify,
    traceReplay,
    projectionOk,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlFullstackSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
