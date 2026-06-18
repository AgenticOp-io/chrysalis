#!/usr/bin/env node
/** Phase 6 runtime at scale entry (G5970–G5973). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase6RuntimeScaleEntryGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE6_RUNTIME_SCALE_ENTRY_KIND =
  "chrysalis.hub.strategic-plan-phase6-runtime-scale-entry-smoke";
export const HUB_STRATEGIC_PLAN_PHASE6_RUNTIME_SCALE_ENTRY_SCHEMA_VERSION = 1;

/** @param {{ skipEmitHttp?: boolean }} [opts] */
export async function runStrategicPlanPhase6RuntimeScaleEntrySmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase6-runtime-scale");
  const t0 = progress.start("Runtime at scale Phase 6 entry");
  const entry = await runStrategicPlanPhase6RuntimeScaleEntryGate(opts);
  progress.end("Runtime at scale Phase 6 entry", entry.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE6_RUNTIME_SCALE_ENTRY_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE6_RUNTIME_SCALE_ENTRY_SCHEMA_VERSION,
    ok: entry.ok === true,
    entry,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase6RuntimeScaleEntrySmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
