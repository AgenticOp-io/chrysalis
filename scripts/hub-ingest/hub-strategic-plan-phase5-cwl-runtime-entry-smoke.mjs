#!/usr/bin/env node
/** Phase 5 — CWL runtime entry (G5930–G5933). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase5CwlRuntimeEntryGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE5_CWL_RUNTIME_ENTRY_KIND =
  "chrysalis.hub.strategic-plan-phase5-cwl-runtime-entry-smoke";
export const HUB_STRATEGIC_PLAN_PHASE5_CWL_RUNTIME_ENTRY_SCHEMA_VERSION = 1;

/** @param {{ skipEmitHttp?: boolean }} [opts] */
export async function runStrategicPlanPhase5CwlRuntimeEntrySmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase5-cwl-runtime");
  const t0 = progress.start("CWL runtime Phase 5 entry");
  const entry = await runStrategicPlanPhase5CwlRuntimeEntryGate(opts);
  progress.end("CWL runtime Phase 5 entry", entry.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE5_CWL_RUNTIME_ENTRY_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE5_CWL_RUNTIME_ENTRY_SCHEMA_VERSION,
    ok: entry.ok === true,
    entry,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase5CwlRuntimeEntrySmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
