#!/usr/bin/env node
/**
 * Phase 1 — PHP emit parity on oracle slice (G5760–G5763).
 * See docs/PHP-EMIT-PARITY-ORACLE-SLICE.md.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase1PhpEmitParityGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE1_PHP_EMIT_PARITY_KIND =
  "chrysalis.hub.strategic-plan-phase1-php-emit-parity-smoke";
export const HUB_STRATEGIC_PLAN_PHASE1_PHP_EMIT_PARITY_SCHEMA_VERSION = 1;

/** @param {{ skipFlagships?: boolean }} [opts] */
export async function runStrategicPlanPhase1PhpEmitParitySmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase1-emit-parity");
  const t0 = progress.start("PHP emit parity oracle slice");
  const parity = await runStrategicPlanPhase1PhpEmitParityGate(opts);
  progress.end("PHP emit parity oracle slice", parity.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE1_PHP_EMIT_PARITY_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE1_PHP_EMIT_PARITY_SCHEMA_VERSION,
    ok: parity.ok === true,
    parity,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase1PhpEmitParitySmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
