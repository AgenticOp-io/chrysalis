#!/usr/bin/env node
/** Phase 10 production parity close (G6250–G6253). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase10ProductionParityCloseGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { resolveStrategicPlanSkips } from "./strategic-plan-skips.mjs";

/** @param {Record<string, unknown>} [opts] */
export async function runStrategicPlanPhase10ProductionParityCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase10-production-parity-close");
  const t0 = progress.start("Phase 10 production parity close");
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
  const close = await runStrategicPlanPhase10ProductionParityCloseGate(skips);
  progress.end("Phase 10 production parity close", close.ok === true, t0);
  return {
    kind: "chrysalis.hub.strategic-plan-phase10-production-parity-close-smoke",
    schemaVersion: 1,
    ok: close.ok === true,
    close,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase10ProductionParityCloseSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
