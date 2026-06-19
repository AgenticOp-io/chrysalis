#!/usr/bin/env node
/** Honest gaps program complete (G6262–G6270). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runHonestGapsProgramCompleteGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

/** @param {Record<string, unknown>} [opts] */
export async function runHonestGapsProgramCompleteSmoke(opts = {}) {
  const progress = createSmokeProgress("honest-gaps-program-complete");
  const t0 = progress.start("Honest gaps program complete");
  const gate = runHonestGapsProgramCompleteGate(opts);
  progress.end("Honest gaps program complete", gate.ok === true, t0);
  return {
    kind: "chrysalis.hub.honest-gaps-program-complete-smoke",
    schemaVersion: 1,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runHonestGapsProgramCompleteSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
