#!/usr/bin/env node
/** Phase 2 delivery dashboard + hub-completion (G5810–G5813). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase2DeliveryDashboardGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE2_DELIVERY_DASHBOARD_KIND =
  "chrysalis.hub.strategic-plan-phase2-delivery-dashboard-smoke";
export const HUB_STRATEGIC_PLAN_PHASE2_DELIVERY_DASHBOARD_SCHEMA_VERSION = 1;

export async function runStrategicPlanPhase2DeliveryDashboardSmoke() {
  const progress = createSmokeProgress("strategic-plan-phase2-delivery");
  const t0 = progress.start("Delivery dashboard Phase 2");
  const delivery = await runStrategicPlanPhase2DeliveryDashboardGate();
  progress.end("Delivery dashboard Phase 2", delivery.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE2_DELIVERY_DASHBOARD_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE2_DELIVERY_DASHBOARD_SCHEMA_VERSION,
    ok: delivery.ok === true,
    delivery,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase2DeliveryDashboardSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
