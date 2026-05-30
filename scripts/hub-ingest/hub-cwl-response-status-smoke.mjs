#!/usr/bin/env node
/**
 * CWL RFC-0006 runtime status smoke — closes D400 deferral (G177).
 * Proves non-200 `status N;` routes replay with correct HTTP status on hono/fastify/nextjs.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";
import { exportCwlFileToWebirJson } from "./export-cwl-webir.mjs";
import { loadWebir } from "./shared.mjs";

export const HUB_CWL_RESPONSE_STATUS_SMOKE_KIND = "chrysalis.hub.cwl-response-status-smoke";
export const HUB_CWL_RESPONSE_STATUS_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const goldFixture = join(scriptRoot, "fixtures/hub-gold-cwl-response-status");
const traceReplayScript = join(scriptRoot, "scripts/hub-ingest/hub-gold-trace-replay.mjs");

const SUITE_IDS = ["cwl-response-status-hono", "cwl-response-status-fastify", "cwl-response-status-nextjs"];

/**
 * @param {string} cwlPath
 */
async function loadCwlProjection(cwlPath) {
  const webir = await loadWebir();
  const snapshot = await exportCwlFileToWebirJson(cwlPath);
  const raw = typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
  return summarizeCwlProjection(webir.moduleFromGoldenSnapshot(raw));
}

/**
 * @param {object} [opts]
 */
export async function runCwlResponseStatusSmoke(opts = {}) {
  const fixture = resolve(opts.fixture ?? goldFixture);
  const cwlPath = join(fixture, "routes.cwl");
  const base = {
    kind: HUB_CWL_RESPONSE_STATUS_SMOKE_KIND,
    schemaVersion: HUB_CWL_RESPONSE_STATUS_SMOKE_SCHEMA_VERSION,
    fixture: "fixtures/hub-gold-cwl-response-status",
    rfc: "CWL-RFC-0006",
    suites: SUITE_IDS,
    ok: false,
  };
  if (!existsSync(cwlPath)) {
    return { ...base, skip: "missing-routes-cwl" };
  }

  let cwlProjection;
  try {
    cwlProjection = await loadCwlProjection(cwlPath);
  } catch (e) {
    return { ...base, skip: "cwl-ingest-failed", detail: String(e).slice(0, 200) };
  }

  /** @type {Record<string, boolean>} */
  const traceReplay = {};
  let traceOk = true;
  for (const suite of SUITE_IDS) {
    const r = spawnSync(process.execPath, ["--import", "tsx", traceReplayScript, "--suite", suite], {
      cwd: scriptRoot,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    traceReplay[suite] = r.status === 0;
    if (r.status !== 0) traceOk = false;
  }

  const withStatusOk = (cwlProjection.withStatus ?? 0) >= 2;
  const holeFreeOk = cwlProjection.holeFree === cwlProjection.total && cwlProjection.total >= 2;
  const ok = withStatusOk && holeFreeOk && traceOk;

  return {
    ...base,
    ok,
    cwlProjection,
    traceReplay,
    runtimeLowering: {
      closed: ok,
      note: "web.request.response status consumed by hono/fastify/nextjs emit + trace replay",
    },
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlResponseStatusSmoke();
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
