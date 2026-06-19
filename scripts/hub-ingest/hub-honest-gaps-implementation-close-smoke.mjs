#!/usr/bin/env node
/** Honest gaps Phase 11 implementation close (G6290). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runHonestGapsImplementationCloseGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { resolveStrategicPlanSkips } from "./strategic-plan-skips.mjs";

/** @param {Record<string, unknown>} [opts] */
export async function runHonestGapsImplementationCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("honest-gaps-implementation-close");
  const t0 = progress.start("Honest gaps implementation close");
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
  const gate = await runHonestGapsImplementationCloseGate(skips);
  progress.end("Honest gaps implementation close", gate.ok === true, t0);
  return {
    kind: "chrysalis.hub.honest-gaps-implementation-close-smoke",
    schemaVersion: 1,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runHonestGapsImplementationCloseSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
