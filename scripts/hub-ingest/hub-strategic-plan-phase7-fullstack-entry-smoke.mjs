#!/usr/bin/env node
/** Phase 7 full-stack entry (G6010–G6013). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase7FullstackEntryGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE7_FULLSTACK_ENTRY_KIND =
  "chrysalis.hub.strategic-plan-phase7-fullstack-entry-smoke";
export const HUB_STRATEGIC_PLAN_PHASE7_FULLSTACK_ENTRY_SCHEMA_VERSION = 1;

/** @param {{ skipGoldVerify?: boolean }} [opts] */
export async function runStrategicPlanPhase7FullstackEntrySmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase7-fullstack");
  const t0 = progress.start("Full-stack Phase 7 entry");
  const entry = await runStrategicPlanPhase7FullstackEntryGate(opts);
  progress.end("Full-stack Phase 7 entry", entry.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE7_FULLSTACK_ENTRY_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE7_FULLSTACK_ENTRY_SCHEMA_VERSION,
    ok: entry.ok === true,
    entry,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase7FullstackEntrySmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
