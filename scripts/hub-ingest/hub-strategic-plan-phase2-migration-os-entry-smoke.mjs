#!/usr/bin/env node
/**
 * Phase 2 — Migration OS entry (G5780–G5783).
 * See docs/MIGRATION-OS-PHASE-2.md.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase2MigrationOsEntryGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE2_MIGRATION_OS_ENTRY_KIND =
  "chrysalis.hub.strategic-plan-phase2-migration-os-entry-smoke";
export const HUB_STRATEGIC_PLAN_PHASE2_MIGRATION_OS_ENTRY_SCHEMA_VERSION = 1;

/** @param {{ skipStandaloneBatch?: boolean }} [opts] */
export async function runStrategicPlanPhase2MigrationOsEntrySmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase2-migration-os");
  const t0 = progress.start("Migration OS Phase 2 entry");
  const entry = await runStrategicPlanPhase2MigrationOsEntryGate(opts);
  progress.end("Migration OS Phase 2 entry", entry.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE2_MIGRATION_OS_ENTRY_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE2_MIGRATION_OS_ENTRY_SCHEMA_VERSION,
    ok: entry.ok === true,
    entry,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase2MigrationOsEntrySmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
