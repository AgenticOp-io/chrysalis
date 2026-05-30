#!/usr/bin/env node
/**
 * CWL RFC-0005 request body runtime smoke (G182).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportCwlFileToWebirJson } from "./export-cwl-webir.mjs";
import { loadWebir } from "./shared.mjs";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";

export const HUB_CWL_REQUEST_BODY_SMOKE_KIND = "chrysalis.hub.cwl-request-body-smoke";
export const HUB_CWL_REQUEST_BODY_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const goldFixture = join(scriptRoot, "fixtures/hub-gold-cwl-request-body");
const traceReplayScript = join(scriptRoot, "scripts/hub-ingest/hub-gold-trace-replay.mjs");

const SUITE_IDS = ["cwl-request-body-hono", "cwl-request-body-fastify", "cwl-request-body-nextjs"];

async function loadCwlProjection(cwlPath) {
  const webir = await loadWebir();
  const snapshot = await exportCwlFileToWebirJson(cwlPath);
  const raw = typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
  return summarizeCwlProjection(webir.moduleFromGoldenSnapshot(raw));
}

/**
 * @param {object} [opts]
 */
export async function runCwlRequestBodySmoke(opts = {}) {
  const fixture = resolve(opts.fixture ?? goldFixture);
  const cwlPath = join(fixture, "routes.cwl");
  const base = {
    kind: HUB_CWL_REQUEST_BODY_SMOKE_KIND,
    schemaVersion: HUB_CWL_REQUEST_BODY_SMOKE_SCHEMA_VERSION,
    fixture: "fixtures/hub-gold-cwl-request-body",
    rfc: "CWL-RFC-0005",
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

  const bodyRoutesOk = (cwlProjection.total ?? 0) >= 2;
  const ok = bodyRoutesOk && traceOk;

  return {
    ...base,
    ok,
    cwlProjection,
    traceReplay,
    note: "trace replay is authoritative; body bindings may remain projection holes until full body lowering",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlRequestBodySmoke();
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
