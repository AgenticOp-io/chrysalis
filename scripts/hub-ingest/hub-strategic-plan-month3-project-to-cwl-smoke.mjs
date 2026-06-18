#!/usr/bin/env node
/**
 * STRATEGIC-PLAN §12 Month 3 — project-to-CWL + CWL diff on translate paths (G5720–G5723).
 * See docs/PROJECT-TO-CWL-TRANSLATE-PATH.md.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanMonth3ProjectToCwlGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_MONTH3_PROJECT_TO_CWL_KIND =
  "chrysalis.hub.strategic-plan-month3-project-to-cwl-smoke";
export const HUB_STRATEGIC_PLAN_MONTH3_PROJECT_TO_CWL_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** @param {{ skipRoundtrip?: boolean }} [opts] */
export async function runStrategicPlanMonth3ProjectToCwlSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-month3");
  const t0 = progress.start("project-to-cwl translate path");
  const projectToCwl = await runStrategicPlanMonth3ProjectToCwlGate(opts);
  progress.end("project-to-cwl translate path", projectToCwl.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_MONTH3_PROJECT_TO_CWL_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_MONTH3_PROJECT_TO_CWL_SCHEMA_VERSION,
    ok: projectToCwl.ok === true,
    projectToCwl,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanMonth3ProjectToCwlSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
