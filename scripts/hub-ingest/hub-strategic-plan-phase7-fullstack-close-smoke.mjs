#!/usr/bin/env node
/** Phase 7 full-stack close (G6040–G6043). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase7FullstackCloseGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE7_FULLSTACK_CLOSE_KIND =
  "chrysalis.hub.strategic-plan-phase7-fullstack-close-smoke";
export const HUB_STRATEGIC_PLAN_PHASE7_FULLSTACK_CLOSE_SCHEMA_VERSION = 1;

/** @param {{ skipGoldVerify?: boolean }} [opts] */
export async function runStrategicPlanPhase7FullstackCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase7-fullstack-close");
  const t0 = progress.start("Full-stack Phase 7 close");
  const close = await runStrategicPlanPhase7FullstackCloseGate(opts);
  progress.end("Full-stack Phase 7 close", close.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE7_FULLSTACK_CLOSE_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE7_FULLSTACK_CLOSE_SCHEMA_VERSION,
    ok: close.ok === true,
    close,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase7FullstackCloseSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
