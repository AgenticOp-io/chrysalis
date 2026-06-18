#!/usr/bin/env node
/** Phase 9 operational entry (G6120–G6123). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase9OperationalEntryGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

const ALL_SKIPS = {
  strict: false,
  skipOracleVerify: true,
  skipEmitHttp: true,
  skipGoldVerify: true,
  skipProjectCwlRoundtrip: true,
  skipCwlRfcRoundtrip: true,
  skipLaravelLiveGaps: true,
  skipMigrationOsMegaBatch: true,
  skipMigrationOsStandaloneBatch: true,
  skipPhpWedgeFlagships: true,
  skipEmitParityFlagships: true,
  skipChimeraOriginBatch: true,
};

/** @param {Record<string, boolean>} [opts] */
export async function runStrategicPlanPhase9OperationalEntrySmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase9-operational-entry");
  const t0 = progress.start("Operational Phase 9 entry");
  const entry = await runStrategicPlanPhase9OperationalEntryGate({ ...ALL_SKIPS, ...opts });
  progress.end("Operational Phase 9 entry", entry.ok === true, t0);
  return {
    kind: "chrysalis.hub.strategic-plan-phase9-operational-entry-smoke",
    schemaVersion: 1,
    ok: entry.ok === true,
    entry,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase9OperationalEntrySmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
