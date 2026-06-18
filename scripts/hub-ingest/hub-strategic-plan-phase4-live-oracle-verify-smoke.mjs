#!/usr/bin/env node
/** Phase 4 live oracle verify (G5890–G5893). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase4LiveOracleVerifyGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE4_LIVE_ORACLE_VERIFY_KIND =
  "chrysalis.hub.strategic-plan-phase4-live-oracle-verify-smoke";
export const HUB_STRATEGIC_PLAN_PHASE4_LIVE_ORACLE_VERIFY_SCHEMA_VERSION = 1;

/** @param {{ skipOracleVerify?: boolean }} [opts] */
export async function runStrategicPlanPhase4LiveOracleVerifySmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase4-live-oracle");
  const t0 = progress.start("Live oracle verify Phase 4");
  const liveVerify = await runStrategicPlanPhase4LiveOracleVerifyGate(opts);
  progress.end("Live oracle verify Phase 4", liveVerify.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE4_LIVE_ORACLE_VERIFY_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE4_LIVE_ORACLE_VERIFY_SCHEMA_VERSION,
    ok: liveVerify.ok === true,
    liveVerify,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase4LiveOracleVerifySmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
