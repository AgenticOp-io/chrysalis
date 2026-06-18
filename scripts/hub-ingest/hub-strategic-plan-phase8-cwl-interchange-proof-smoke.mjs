#!/usr/bin/env node
/** Phase 8 CWL interchange proof (G6080–G6083). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase8CwlInterchangeProofGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE8_CWL_INTERCHANGE_PROOF_KIND =
  "chrysalis.hub.strategic-plan-phase8-cwl-interchange-proof-smoke";
export const HUB_STRATEGIC_PLAN_PHASE8_CWL_INTERCHANGE_PROOF_SCHEMA_VERSION = 1;

/** @param {Record<string, boolean>} [opts] */
export async function runStrategicPlanPhase8CwlInterchangeProofSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase8-cwl-interchange-proof");
  const t0 = progress.start("Product proof Phase 8 CWL interchange");
  const cwl = await runStrategicPlanPhase8CwlInterchangeProofGate(opts);
  progress.end("Product proof Phase 8 CWL interchange", cwl.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE8_CWL_INTERCHANGE_PROOF_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE8_CWL_INTERCHANGE_PROOF_SCHEMA_VERSION,
    ok: cwl.ok === true,
    cwl,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase8CwlInterchangeProofSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
