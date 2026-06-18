#!/usr/bin/env node
/** Phase 6 emit verify mega (G5980–G5983). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase6EmitVerifyMegaGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE6_EMIT_VERIFY_MEGA_KIND =
  "chrysalis.hub.strategic-plan-phase6-emit-verify-mega-smoke";
export const HUB_STRATEGIC_PLAN_PHASE6_EMIT_VERIFY_MEGA_SCHEMA_VERSION = 1;

/** @param {{ skipEmitHttp?: boolean }} [opts] */
export async function runStrategicPlanPhase6EmitVerifyMegaSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase6-emit-mega");
  const t0 = progress.start("Emit verify mega Phase 6");
  const mega = await runStrategicPlanPhase6EmitVerifyMegaGate(opts);
  progress.end("Emit verify mega Phase 6", mega.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE6_EMIT_VERIFY_MEGA_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE6_EMIT_VERIFY_MEGA_SCHEMA_VERSION,
    ok: mega.ok === true,
    mega,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase6EmitVerifyMegaSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
