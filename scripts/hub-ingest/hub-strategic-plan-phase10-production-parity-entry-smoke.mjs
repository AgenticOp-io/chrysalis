#!/usr/bin/env node
/** Phase 10 production parity entry (G6200–G6205). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase10ProductionParityEntryGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

/** @param {Record<string, unknown>} [opts] */
export async function runStrategicPlanPhase10ProductionParityEntrySmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase10-production-parity-entry");
  const t0 = progress.start("Phase 10 production parity entry");
  const entry = await runStrategicPlanPhase10ProductionParityEntryGate(opts);
  progress.end("Phase 10 production parity entry", entry.ok === true, t0);
  return {
    kind: "chrysalis.hub.strategic-plan-phase10-production-parity-entry-smoke",
    schemaVersion: 1,
    ok: entry.ok === true,
    entry,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase10ProductionParityEntrySmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
