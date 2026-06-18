#!/usr/bin/env node
/**
 * STRATEGIC-PLAN Phase 1 — PHP wedge depth entry (G5740–G5743).
 * See docs/PHP-WEDGE-PHASE-1.md.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase1PhpWedgeGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE1_PHP_WEDGE_KIND =
  "chrysalis.hub.strategic-plan-phase1-php-wedge-smoke";
export const HUB_STRATEGIC_PLAN_PHASE1_PHP_WEDGE_SCHEMA_VERSION = 1;

/** @param {{ skipFlagships?: boolean }} [opts] */
export async function runStrategicPlanPhase1PhpWedgeSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase1");
  const t0 = progress.start("PHP wedge Phase 1");
  const wedge = await runStrategicPlanPhase1PhpWedgeGate(opts);
  progress.end("PHP wedge Phase 1", wedge.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE1_PHP_WEDGE_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE1_PHP_WEDGE_SCHEMA_VERSION,
    ok: wedge.ok === true,
    wedge,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase1PhpWedgeSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
