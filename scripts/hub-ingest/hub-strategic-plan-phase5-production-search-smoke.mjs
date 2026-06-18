#!/usr/bin/env node
/** Phase 5 production search (G5940–G5943). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase5ProductionSearchGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE5_PRODUCTION_SEARCH_KIND =
  "chrysalis.hub.strategic-plan-phase5-production-search-smoke";
export const HUB_STRATEGIC_PLAN_PHASE5_PRODUCTION_SEARCH_SCHEMA_VERSION = 1;

export async function runStrategicPlanPhase5ProductionSearchSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase5-production-search");
  const t0 = progress.start("Production search Phase 5");
  const search = await runStrategicPlanPhase5ProductionSearchGate(opts);
  progress.end("Production search Phase 5", search.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE5_PRODUCTION_SEARCH_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE5_PRODUCTION_SEARCH_SCHEMA_VERSION,
    ok: search.ok === true,
    search,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase5ProductionSearchSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
