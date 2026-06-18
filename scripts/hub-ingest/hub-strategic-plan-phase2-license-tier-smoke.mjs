#!/usr/bin/env node
/**
 * Phase 2 — Migration OS license tier alignment (G5790–G5793).
 * See docs/MIGRATION-OS-LICENSE-TIER-ALIGNMENT.md.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase2LicenseTierGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE2_LICENSE_TIER_KIND =
  "chrysalis.hub.strategic-plan-phase2-license-tier-smoke";
export const HUB_STRATEGIC_PLAN_PHASE2_LICENSE_TIER_SCHEMA_VERSION = 1;

export async function runStrategicPlanPhase2LicenseTierSmoke() {
  const progress = createSmokeProgress("strategic-plan-phase2-license");
  const t0 = progress.start("Migration OS license tiers");
  const license = await runStrategicPlanPhase2LicenseTierGate();
  progress.end("Migration OS license tiers", license.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE2_LICENSE_TIER_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE2_LICENSE_TIER_SCHEMA_VERSION,
    ok: license.ok === true,
    license,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase2LicenseTierSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
