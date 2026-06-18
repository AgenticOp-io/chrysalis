#!/usr/bin/env node
/** Phase 9 capability matrix + north-star (G6140–G6142). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase9CapabilityGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

/** @param {Record<string, boolean>} [opts] */
export async function runStrategicPlanPhase9CapabilitySmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase9-capability");
  const t0 = progress.start("Operational Phase 9 capability");
  const capability = await runStrategicPlanPhase9CapabilityGate(opts);
  progress.end("Operational Phase 9 capability", capability.ok === true, t0);
  return {
    kind: "chrysalis.hub.strategic-plan-phase9-capability-smoke",
    schemaVersion: 1,
    ok: capability.ok === true,
    capability,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase9CapabilitySmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
