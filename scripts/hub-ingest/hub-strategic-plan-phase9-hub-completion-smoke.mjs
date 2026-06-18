#!/usr/bin/env node
/** Phase 9 hub-completion wiring (G6130–G6133). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase9HubCompletionGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

const ALL_SKIPS = {
  skipArtifact: true,
};

/** @param {Record<string, boolean>} [opts] */
export async function runStrategicPlanPhase9HubCompletionSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase9-hub-completion");
  const t0 = progress.start("Operational Phase 9 hub-completion");
  const hubCompletion = await runStrategicPlanPhase9HubCompletionGate({ ...ALL_SKIPS, ...opts });
  progress.end("Operational Phase 9 hub-completion", hubCompletion.ok === true, t0);
  return {
    kind: "chrysalis.hub.strategic-plan-phase9-hub-completion-smoke",
    schemaVersion: 1,
    ok: hubCompletion.ok === true,
    hubCompletion,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase9HubCompletionSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
