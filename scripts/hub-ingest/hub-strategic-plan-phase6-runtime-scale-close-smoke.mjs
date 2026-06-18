#!/usr/bin/env node
/** Phase 6 runtime at scale close (G6000–G6003). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase6RuntimeScaleCloseGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE6_RUNTIME_SCALE_CLOSE_KIND =
  "chrysalis.hub.strategic-plan-phase6-runtime-scale-close-smoke";
export const HUB_STRATEGIC_PLAN_PHASE6_RUNTIME_SCALE_CLOSE_SCHEMA_VERSION = 1;

/** @param {{ skipEmitHttp?: boolean }} [opts] */
export async function runStrategicPlanPhase6RuntimeScaleCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase6-runtime-scale-close");
  const t0 = progress.start("Runtime at scale Phase 6 close");
  const close = await runStrategicPlanPhase6RuntimeScaleCloseGate(opts);
  progress.end("Runtime at scale Phase 6 close", close.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE6_RUNTIME_SCALE_CLOSE_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE6_RUNTIME_SCALE_CLOSE_SCHEMA_VERSION,
    ok: close.ok === true,
    close,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase6RuntimeScaleCloseSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
