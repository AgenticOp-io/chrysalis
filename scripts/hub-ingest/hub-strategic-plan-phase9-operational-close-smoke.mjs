#!/usr/bin/env node
/** Phase 9 operational close (G6150–G6153). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase9OperationalCloseGate } from "./hub-cwl-fullstack-gates.mjs";
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
  skipArtifact: true,
};

/** @param {Record<string, boolean>} [opts] */
export async function runStrategicPlanPhase9OperationalCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase9-operational-close");
  const t0 = progress.start("Operational Phase 9 close");
  const close = await runStrategicPlanPhase9OperationalCloseGate({ ...ALL_SKIPS, ...opts });
  progress.end("Operational Phase 9 close", close.ok === true, t0);
  return {
    kind: "chrysalis.hub.strategic-plan-phase9-operational-close-smoke",
    schemaVersion: 1,
    ok: close.ok === true,
    close,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase9OperationalCloseSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
