#!/usr/bin/env node
/** Phase 2 multi-origin Migration OS mega batch (G5800–G5803). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase2MigrationOsMultiOriginGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE2_MIGRATION_OS_MULTI_ORIGIN_KIND =
  "chrysalis.hub.strategic-plan-phase2-migration-os-multi-origin-smoke";
export const HUB_STRATEGIC_PLAN_PHASE2_MIGRATION_OS_MULTI_ORIGIN_SCHEMA_VERSION = 1;

/** @param {{ skipMegaBatch?: boolean }} [opts] */
export async function runStrategicPlanPhase2MigrationOsMultiOriginSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase2-multi-origin");
  const t0 = progress.start("Migration OS multi-origin");
  const multiOrigin = await runStrategicPlanPhase2MigrationOsMultiOriginGate(opts);
  progress.end("Migration OS multi-origin", multiOrigin.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE2_MIGRATION_OS_MULTI_ORIGIN_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE2_MIGRATION_OS_MULTI_ORIGIN_SCHEMA_VERSION,
    ok: multiOrigin.ok === true,
    multiOrigin,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase2MigrationOsMultiOriginSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
