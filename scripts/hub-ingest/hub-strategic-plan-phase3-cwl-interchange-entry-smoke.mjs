#!/usr/bin/env node
/** Phase 3 — CWL interchange entry (G5830–G5833). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase3CwlInterchangeEntryGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE3_CWL_INTERCHANGE_ENTRY_KIND =
  "chrysalis.hub.strategic-plan-phase3-cwl-interchange-entry-smoke";
export const HUB_STRATEGIC_PLAN_PHASE3_CWL_INTERCHANGE_ENTRY_SCHEMA_VERSION = 1;

/** @param {{ skipRoundtrip?: boolean }} [opts] */
export async function runStrategicPlanPhase3CwlInterchangeEntrySmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase3-cwl");
  const t0 = progress.start("CWL interchange Phase 3 entry");
  const entry = await runStrategicPlanPhase3CwlInterchangeEntryGate(opts);
  progress.end("CWL interchange Phase 3 entry", entry.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE3_CWL_INTERCHANGE_ENTRY_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE3_CWL_INTERCHANGE_ENTRY_SCHEMA_VERSION,
    ok: entry.ok === true,
    entry,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase3CwlInterchangeEntrySmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
