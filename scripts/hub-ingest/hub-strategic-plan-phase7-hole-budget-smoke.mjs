#!/usr/bin/env node
/** Phase 7 hole budget (G6020–G6023). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase7HoleBudgetGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE7_HOLE_BUDGET_KIND =
  "chrysalis.hub.strategic-plan-phase7-hole-budget-smoke";
export const HUB_STRATEGIC_PLAN_PHASE7_HOLE_BUDGET_SCHEMA_VERSION = 1;

export async function runStrategicPlanPhase7HoleBudgetSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase7-hole-budget");
  const t0 = progress.start("Hole budget Phase 7");
  const holeBudget = await runStrategicPlanPhase7HoleBudgetGate(opts);
  progress.end("Hole budget Phase 7", holeBudget.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE7_HOLE_BUDGET_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE7_HOLE_BUDGET_SCHEMA_VERSION,
    ok: holeBudget.ok === true,
    holeBudget,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase7HoleBudgetSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
