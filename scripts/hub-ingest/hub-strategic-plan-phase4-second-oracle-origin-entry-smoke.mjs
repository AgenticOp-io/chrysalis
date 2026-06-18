#!/usr/bin/env node
/** Phase 4 — second oracle origin entry (G5880–G5883). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase4SecondOracleOriginEntryGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE4_SECOND_ORACLE_ORIGIN_ENTRY_KIND =
  "chrysalis.hub.strategic-plan-phase4-second-oracle-origin-entry-smoke";
export const HUB_STRATEGIC_PLAN_PHASE4_SECOND_ORACLE_ORIGIN_ENTRY_SCHEMA_VERSION = 1;

/** @param {{ skipOracleVerify?: boolean }} [opts] */
export async function runStrategicPlanPhase4SecondOracleOriginEntrySmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase4-second-oracle");
  const t0 = progress.start("Second oracle origin Phase 4 entry");
  const entry = await runStrategicPlanPhase4SecondOracleOriginEntryGate(opts);
  progress.end("Second oracle origin Phase 4 entry", entry.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE4_SECOND_ORACLE_ORIGIN_ENTRY_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE4_SECOND_ORACLE_ORIGIN_ENTRY_SCHEMA_VERSION,
    ok: entry.ok === true,
    entry,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase4SecondOracleOriginEntrySmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
