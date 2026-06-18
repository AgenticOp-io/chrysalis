#!/usr/bin/env node
/** Phase 8 Hub operator proof (G6090–G6093). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase8HubOperatorProofGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE8_HUB_OPERATOR_PROOF_KIND =
  "chrysalis.hub.strategic-plan-phase8-hub-operator-proof-smoke";
export const HUB_STRATEGIC_PLAN_PHASE8_HUB_OPERATOR_PROOF_SCHEMA_VERSION = 1;

/** @param {Record<string, boolean>} [opts] */
export async function runStrategicPlanPhase8HubOperatorProofSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase8-hub-operator-proof");
  const t0 = progress.start("Product proof Phase 8 Hub operator");
  const hub = await runStrategicPlanPhase8HubOperatorProofGate(opts);
  progress.end("Product proof Phase 8 Hub operator", hub.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE8_HUB_OPERATOR_PROOF_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE8_HUB_OPERATOR_PROOF_SCHEMA_VERSION,
    ok: hub.ok === true,
    hub,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase8HubOperatorProofSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
