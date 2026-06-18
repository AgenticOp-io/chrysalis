#!/usr/bin/env node
/** Phase 3 CWL RFC track (G5840–G5843). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase3CwlRfcGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE3_CWL_RFC_KIND =
  "chrysalis.hub.strategic-plan-phase3-cwl-rfc-smoke";
export const HUB_STRATEGIC_PLAN_PHASE3_CWL_RFC_SCHEMA_VERSION = 1;

/** @param {{ skipRoundtrip?: boolean }} [opts] */
export async function runStrategicPlanPhase3CwlRfcSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase3-rfc");
  const t0 = progress.start("CWL RFC Phase 3");
  const rfc = await runStrategicPlanPhase3CwlRfcGate(opts);
  progress.end("CWL RFC Phase 3", rfc.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE3_CWL_RFC_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE3_CWL_RFC_SCHEMA_VERSION,
    ok: rfc.ok === true,
    rfc,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase3CwlRfcSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
