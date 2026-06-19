#!/usr/bin/env node
/** Maintenance program complete (G6260–G6261). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runMaintenanceProgramCompleteGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { resolveStrategicPlanSkips } from "./strategic-plan-skips.mjs";

/** @param {Record<string, unknown>} [opts] */
export async function runMaintenanceProgramCompleteSmoke(opts = {}) {
  const progress = createSmokeProgress("maintenance-program-complete");
  const t0 = progress.start("Maintenance program complete");
  const skips = resolveStrategicPlanSkips({
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
    skipArtifact: true,
    ...opts,
  });
  const gate = await runMaintenanceProgramCompleteGate(skips);
  progress.end("Maintenance program complete", gate.ok === true, t0);
  return {
    kind: "chrysalis.hub.maintenance-program-complete-smoke",
    schemaVersion: 1,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runMaintenanceProgramCompleteSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
