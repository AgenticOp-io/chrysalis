#!/usr/bin/env node
/** Phase 3 full-stack CWL alignment (G5860–G5863). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase3FullstackAlignmentGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE3_FULLSTACK_ALIGNMENT_KIND =
  "chrysalis.hub.strategic-plan-phase3-fullstack-alignment-smoke";
export const HUB_STRATEGIC_PLAN_PHASE3_FULLSTACK_ALIGNMENT_SCHEMA_VERSION = 1;

/** @param {Record<string, unknown>} [opts] */
export async function runStrategicPlanPhase3FullstackAlignmentSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase3-fullstack");
  const t0 = progress.start("Full-stack alignment Phase 3");
  const alignment = await runStrategicPlanPhase3FullstackAlignmentGate(opts);
  progress.end("Full-stack alignment Phase 3", alignment.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE3_FULLSTACK_ALIGNMENT_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE3_FULLSTACK_ALIGNMENT_SCHEMA_VERSION,
    ok: alignment.ok === true,
    alignment,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase3FullstackAlignmentSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
