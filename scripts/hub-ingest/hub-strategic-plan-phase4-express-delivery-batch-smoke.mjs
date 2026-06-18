#!/usr/bin/env node
/** Phase 4 Express delivery batch (G5910–G5913). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase4ExpressDeliveryBatchGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE4_EXPRESS_DELIVERY_BATCH_KIND =
  "chrysalis.hub.strategic-plan-phase4-express-delivery-batch-smoke";
export const HUB_STRATEGIC_PLAN_PHASE4_EXPRESS_DELIVERY_BATCH_SCHEMA_VERSION = 1;

export async function runStrategicPlanPhase4ExpressDeliveryBatchSmoke() {
  const progress = createSmokeProgress("strategic-plan-phase4-express-delivery");
  const t0 = progress.start("Express delivery batch Phase 4");
  const delivery = await runStrategicPlanPhase4ExpressDeliveryBatchGate();
  progress.end("Express delivery batch Phase 4", delivery.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE4_EXPRESS_DELIVERY_BATCH_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE4_EXPRESS_DELIVERY_BATCH_SCHEMA_VERSION,
    ok: delivery.ok === true,
    delivery,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase4ExpressDeliveryBatchSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
