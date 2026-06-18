#!/usr/bin/env node
/** Phase 3 CWL OpenAPI export (G5850–G5853). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase3CwlOpenapiExportGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE3_CWL_OPENAPI_EXPORT_KIND =
  "chrysalis.hub.strategic-plan-phase3-cwl-openapi-export-smoke";
export const HUB_STRATEGIC_PLAN_PHASE3_CWL_OPENAPI_EXPORT_SCHEMA_VERSION = 1;

export async function runStrategicPlanPhase3CwlOpenapiExportSmoke() {
  const progress = createSmokeProgress("strategic-plan-phase3-openapi");
  const t0 = progress.start("CWL OpenAPI export Phase 3");
  const openapi = await runStrategicPlanPhase3CwlOpenapiExportGate();
  progress.end("CWL OpenAPI export Phase 3", openapi.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE3_CWL_OPENAPI_EXPORT_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE3_CWL_OPENAPI_EXPORT_SCHEMA_VERSION,
    ok: openapi.ok === true,
    openapi,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase3CwlOpenapiExportSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
