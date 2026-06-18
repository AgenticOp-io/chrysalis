#!/usr/bin/env node
/** Phase 6 production graduation (G5990–G5993). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase6ProductionGraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE6_PRODUCTION_GRADUATION_KIND =
  "chrysalis.hub.strategic-plan-phase6-production-graduation-smoke";
export const HUB_STRATEGIC_PLAN_PHASE6_PRODUCTION_GRADUATION_SCHEMA_VERSION = 1;

/** @param {{ skipEmitHttp?: boolean }} [opts] */
export async function runStrategicPlanPhase6ProductionGraduationSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase6-graduation");
  const t0 = progress.start("Production graduation Phase 6");
  const graduation = await runStrategicPlanPhase6ProductionGraduationGate(opts);
  progress.end("Production graduation Phase 6", graduation.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE6_PRODUCTION_GRADUATION_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE6_PRODUCTION_GRADUATION_SCHEMA_VERSION,
    ok: graduation.ok === true,
    graduation,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase6ProductionGraduationSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
