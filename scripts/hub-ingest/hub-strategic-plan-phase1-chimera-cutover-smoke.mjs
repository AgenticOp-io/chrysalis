#!/usr/bin/env node
/**
 * Phase 1 — Chimera cutover runbooks + operator metrics (G5770–G5773).
 * See docs/CHIMERA-CUTOVER-PHASE-1.md.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase1ChimeraCutoverGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE1_CHIMERA_CUTOVER_KIND =
  "chrysalis.hub.strategic-plan-phase1-chimera-cutover-smoke";
export const HUB_STRATEGIC_PLAN_PHASE1_CHIMERA_CUTOVER_SCHEMA_VERSION = 1;

/** @param {{ skipOriginBatch?: boolean }} [opts] */
export async function runStrategicPlanPhase1ChimeraCutoverSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase1-chimera");
  const t0 = progress.start("Chimera cutover Phase 1");
  const cutover = await runStrategicPlanPhase1ChimeraCutoverGate(opts);
  progress.end("Chimera cutover Phase 1", cutover.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE1_CHIMERA_CUTOVER_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE1_CHIMERA_CUTOVER_SCHEMA_VERSION,
    ok: cutover.ok === true,
    cutover,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase1ChimeraCutoverSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
