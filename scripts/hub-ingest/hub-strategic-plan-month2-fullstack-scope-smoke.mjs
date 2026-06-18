#!/usr/bin/env node
/**
 * STRATEGIC-PLAN §12 Month 2 — full-stack CWL scope RFC (G5700–G5703).
 * See docs/CWL-FULLSTACK-SCOPE-RFC.md.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanMonth2FullstackScopeGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_MONTH2_FULLSTACK_SCOPE_KIND =
  "chrysalis.hub.strategic-plan-month2-fullstack-scope-smoke";
export const HUB_STRATEGIC_PLAN_MONTH2_FULLSTACK_SCOPE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** @param {object} [opts] */
export async function runStrategicPlanMonth2FullstackScopeSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-month2");
  const t0 = progress.start("full-stack scope RFC");
  const scope = await runStrategicPlanMonth2FullstackScopeGate();
  progress.end("full-stack scope RFC", scope.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_MONTH2_FULLSTACK_SCOPE_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_MONTH2_FULLSTACK_SCOPE_SCHEMA_VERSION,
    ok: scope.ok === true,
    scope,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanMonth2FullstackScopeSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
