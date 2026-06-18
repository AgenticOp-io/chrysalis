#!/usr/bin/env node
/**
 * Phase 1 — Laravel verify gaps ingest depth (G5750–G5753).
 * See docs/LARAVEL-VERIFY-GAPS-INGEST-DEPTH.md.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase1LaravelIngestDepthGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE1_LARAVEL_INGEST_DEPTH_KIND =
  "chrysalis.hub.strategic-plan-phase1-laravel-ingest-depth-smoke";
export const HUB_STRATEGIC_PLAN_PHASE1_LARAVEL_INGEST_DEPTH_SCHEMA_VERSION = 1;

/** @param {{ skipLive?: boolean }} [opts] */
export async function runStrategicPlanPhase1LaravelIngestDepthSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase1-laravel");
  const t0 = progress.start("Laravel ingest depth");
  const depth = await runStrategicPlanPhase1LaravelIngestDepthGate(opts);
  progress.end("Laravel ingest depth", depth.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE1_LARAVEL_INGEST_DEPTH_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE1_LARAVEL_INGEST_DEPTH_SCHEMA_VERSION,
    ok: depth.ok === true,
    depth,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase1LaravelIngestDepthSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
