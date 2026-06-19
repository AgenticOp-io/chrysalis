#!/usr/bin/env node
/** Phase 10 matrix expansion (G6220). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runMatrixExpansionPhase10Gate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

/** @param {Record<string, unknown>} [opts] */
export async function runStrategicPlanPhase10MatrixExpansionSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase10-matrix-expansion");
  const t0 = progress.start("Phase 10 matrix expansion");
  const gate = await runMatrixExpansionPhase10Gate(opts);
  progress.end("Phase 10 matrix expansion", gate.ok === true, t0);
  return {
    kind: "chrysalis.hub.strategic-plan-phase10-matrix-expansion-smoke",
    schemaVersion: 1,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase10MatrixExpansionSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
