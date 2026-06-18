#!/usr/bin/env node
/**
 * STRATEGIC-PLAN §12 Month 3–4 — full-stack flagship pilot + hole budget (G5730–G5733).
 * See docs/CWL-FULLSTACK-FLAGSHIP-PILOT.md.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanMonth34FullstackPilotGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_MONTH34_FULLSTACK_PILOT_KIND =
  "chrysalis.hub.strategic-plan-month34-fullstack-pilot-smoke";
export const HUB_STRATEGIC_PLAN_MONTH34_FULLSTACK_PILOT_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** @param {{ skipGoldVerify?: boolean }} [opts] */
export async function runStrategicPlanMonth34FullstackPilotSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-month34");
  const t0 = progress.start("full-stack flagship pilot");
  const pilot = await runStrategicPlanMonth34FullstackPilotGate(opts);
  progress.end("full-stack flagship pilot", pilot.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_MONTH34_FULLSTACK_PILOT_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_MONTH34_FULLSTACK_PILOT_SCHEMA_VERSION,
    ok: pilot.ok === true,
    pilot,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanMonth34FullstackPilotSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
