#!/usr/bin/env node
/** Phase 12 pipeline smoke (G6320) — CI-safe: fixtures + gates, no GCE. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runWispCwlPipeline } from "../wisp-cwl-pipeline.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_CWL_PIPELINE_SMOKE_KIND = "chrysalis.wisp-cwl-pipeline-smoke";
export const WISP_CWL_PIPELINE_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** G6320 — automated WISP CWL pipeline (build + G6310 close, no GCE). */
export async function runWispCwlPipelineSmokeGate(opts = {}) {
  const progress = createSmokeProgress("wisp-cwl-pipeline");
  const t0 = progress.start("WISP CWL pipeline (ci)");
  const pipeline = await runWispCwlPipeline({
    ci: opts.ci !== false,
    skipLift: opts.skipLift !== false,
    deployGce: opts.deployGce === true,
    reportPath: opts.reportPath ?? resolve(scriptRoot, "reports/wisp/wisp-cwl-pipeline.json"),
  });
  progress.end("WISP CWL pipeline (ci)", pipeline.ok === true, t0);
  return {
    kind: WISP_CWL_PIPELINE_SMOKE_KIND,
    schemaVersion: WISP_CWL_PIPELINE_SMOKE_SCHEMA_VERSION,
    ok: pipeline.ok === true,
    pipeline,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const deployGce = process.argv.includes("--deploy-gce");
  const r = await runWispCwlPipelineSmokeGate({ deployGce });
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-pipeline-smoke")) main().catch((e) => { console.error(e); process.exit(1); });
