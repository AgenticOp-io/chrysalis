#!/usr/bin/env node
/** Phase 4 Express depth batch (G5900–G5903). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase4ExpressDepthBatchGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE4_EXPRESS_DEPTH_BATCH_KIND =
  "chrysalis.hub.strategic-plan-phase4-express-depth-batch-smoke";
export const HUB_STRATEGIC_PLAN_PHASE4_EXPRESS_DEPTH_BATCH_SCHEMA_VERSION = 1;

export async function runStrategicPlanPhase4ExpressDepthBatchSmoke() {
  const progress = createSmokeProgress("strategic-plan-phase4-express-depth");
  const t0 = progress.start("Express depth batch Phase 4");
  const depth = await runStrategicPlanPhase4ExpressDepthBatchGate();
  progress.end("Express depth batch Phase 4", depth.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE4_EXPRESS_DEPTH_BATCH_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE4_EXPRESS_DEPTH_BATCH_SCHEMA_VERSION,
    ok: depth.ok === true,
    depth,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase4ExpressDepthBatchSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
