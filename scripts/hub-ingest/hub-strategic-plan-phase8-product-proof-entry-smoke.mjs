#!/usr/bin/env node
/** Phase 8 product proof entry (G6050–G6053). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase8ProductProofEntryGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE8_PRODUCT_PROOF_ENTRY_KIND =
  "chrysalis.hub.strategic-plan-phase8-product-proof-entry-smoke";
export const HUB_STRATEGIC_PLAN_PHASE8_PRODUCT_PROOF_ENTRY_SCHEMA_VERSION = 1;

/** @param {import("./strategic-plan-skips.mjs").resolveStrategicPlanSkips extends (...a: infer _) => infer R ? Partial<R> : Record<string, boolean>} [opts] */
export async function runStrategicPlanPhase8ProductProofEntrySmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase8-product-proof-entry");
  const t0 = progress.start("Product proof Phase 8 entry");
  const entry = await runStrategicPlanPhase8ProductProofEntryGate(opts);
  progress.end("Product proof Phase 8 entry", entry.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE8_PRODUCT_PROOF_ENTRY_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE8_PRODUCT_PROOF_ENTRY_SCHEMA_VERSION,
    ok: entry.ok === true,
    entry,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase8ProductProofEntrySmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
