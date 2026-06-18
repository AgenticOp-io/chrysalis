#!/usr/bin/env node
/** Phase 2 Migration OS program close (G5820–G5823). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase2MigrationOsCloseGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE2_MIGRATION_OS_CLOSE_KIND =
  "chrysalis.hub.strategic-plan-phase2-migration-os-close-smoke";
export const HUB_STRATEGIC_PLAN_PHASE2_MIGRATION_OS_CLOSE_SCHEMA_VERSION = 1;

/** @param {{ skipMegaBatch?: boolean, skipStandaloneBatch?: boolean }} [opts] */
export async function runStrategicPlanPhase2MigrationOsCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase2-close");
  const t0 = progress.start("Migration OS Phase 2 close");
  const close = await runStrategicPlanPhase2MigrationOsCloseGate(opts);
  progress.end("Migration OS Phase 2 close", close.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE2_MIGRATION_OS_CLOSE_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE2_MIGRATION_OS_CLOSE_SCHEMA_VERSION,
    ok: close.ok === true,
    close,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase2MigrationOsCloseSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
