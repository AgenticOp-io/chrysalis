#!/usr/bin/env node
/** Phase 4 second oracle origin close (G5920–G5923). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase4SecondOracleOriginCloseGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE4_SECOND_ORACLE_ORIGIN_CLOSE_KIND =
  "chrysalis.hub.strategic-plan-phase4-second-oracle-origin-close-smoke";
export const HUB_STRATEGIC_PLAN_PHASE4_SECOND_ORACLE_ORIGIN_CLOSE_SCHEMA_VERSION = 1;

/** @param {{ skipOracleVerify?: boolean }} [opts] */
export async function runStrategicPlanPhase4SecondOracleOriginCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase4-second-oracle-close");
  const t0 = progress.start("Second oracle origin Phase 4 close");
  const close = await runStrategicPlanPhase4SecondOracleOriginCloseGate(opts);
  progress.end("Second oracle origin Phase 4 close", close.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE4_SECOND_ORACLE_ORIGIN_CLOSE_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE4_SECOND_ORACLE_ORIGIN_CLOSE_SCHEMA_VERSION,
    ok: close.ok === true,
    close,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase4SecondOracleOriginCloseSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
