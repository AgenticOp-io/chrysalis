#!/usr/bin/env node
/** Phase 10 WordPress vertical entry (G6210). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runWordPressVerticalPhase10EntryGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

/** @param {Record<string, unknown>} [opts] */
export async function runStrategicPlanPhase10WordpressEntrySmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase10-wordpress-entry");
  const t0 = progress.start("Phase 10 WordPress entry");
  const gate = await runWordPressVerticalPhase10EntryGate(opts);
  progress.end("Phase 10 WordPress entry", gate.ok === true, t0);
  return {
    kind: "chrysalis.hub.strategic-plan-phase10-wordpress-entry-smoke",
    schemaVersion: 1,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase10WordpressEntrySmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
