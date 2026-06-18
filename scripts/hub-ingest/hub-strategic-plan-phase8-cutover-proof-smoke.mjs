#!/usr/bin/env node
/** Phase 8 cutover proof (G6100–G6103). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase8CutoverProofGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE8_CUTOVER_PROOF_KIND =
  "chrysalis.hub.strategic-plan-phase8-cutover-proof-smoke";
export const HUB_STRATEGIC_PLAN_PHASE8_CUTOVER_PROOF_SCHEMA_VERSION = 1;

/** @param {Record<string, boolean>} [opts] */
export async function runStrategicPlanPhase8CutoverProofSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase8-cutover-proof");
  const t0 = progress.start("Product proof Phase 8 cutover");
  const cutover = await runStrategicPlanPhase8CutoverProofGate(opts);
  progress.end("Product proof Phase 8 cutover", cutover.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE8_CUTOVER_PROOF_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE8_CUTOVER_PROOF_SCHEMA_VERSION,
    ok: cutover.ok === true,
    cutover,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase8CutoverProofSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
