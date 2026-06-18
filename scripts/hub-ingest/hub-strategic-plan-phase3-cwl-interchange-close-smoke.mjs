#!/usr/bin/env node
/** Phase 3 CWL interchange program close (G5870–G5873). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase3CwlInterchangeCloseGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE3_CWL_INTERCHANGE_CLOSE_KIND =
  "chrysalis.hub.strategic-plan-phase3-cwl-interchange-close-smoke";
export const HUB_STRATEGIC_PLAN_PHASE3_CWL_INTERCHANGE_CLOSE_SCHEMA_VERSION = 1;

/** @param {{ skipRoundtrip?: boolean, skipRfcRoundtrip?: boolean }} [opts] */
export async function runStrategicPlanPhase3CwlInterchangeCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase3-close");
  const t0 = progress.start("CWL interchange Phase 3 close");
  const close = await runStrategicPlanPhase3CwlInterchangeCloseGate(opts);
  progress.end("CWL interchange Phase 3 close", close.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE3_CWL_INTERCHANGE_CLOSE_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE3_CWL_INTERCHANGE_CLOSE_SCHEMA_VERSION,
    ok: close.ok === true,
    close,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase3CwlInterchangeCloseSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
