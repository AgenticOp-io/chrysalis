#!/usr/bin/env node
/** Phase 5 CWL runtime close (G5960–G5963). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase5CwlRuntimeCloseGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE5_CWL_RUNTIME_CLOSE_KIND =
  "chrysalis.hub.strategic-plan-phase5-cwl-runtime-close-smoke";
export const HUB_STRATEGIC_PLAN_PHASE5_CWL_RUNTIME_CLOSE_SCHEMA_VERSION = 1;

/** @param {{ skipEmitHttp?: boolean }} [opts] */
export async function runStrategicPlanPhase5CwlRuntimeCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase5-cwl-runtime-close");
  const t0 = progress.start("CWL runtime Phase 5 close");
  const close = await runStrategicPlanPhase5CwlRuntimeCloseGate(opts);
  progress.end("CWL runtime Phase 5 close", close.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE5_CWL_RUNTIME_CLOSE_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE5_CWL_RUNTIME_CLOSE_SCHEMA_VERSION,
    ok: close.ok === true,
    close,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase5CwlRuntimeCloseSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
