#!/usr/bin/env node
/** Phase 8 oracle proof (G6060–G6063). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase8OracleProofGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE8_ORACLE_PROOF_KIND =
  "chrysalis.hub.strategic-plan-phase8-oracle-proof-smoke";
export const HUB_STRATEGIC_PLAN_PHASE8_ORACLE_PROOF_SCHEMA_VERSION = 1;

/** @param {Record<string, boolean>} [opts] */
export async function runStrategicPlanPhase8OracleProofSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase8-oracle-proof");
  const t0 = progress.start("Product proof Phase 8 oracle");
  const oracle = await runStrategicPlanPhase8OracleProofGate(opts);
  progress.end("Product proof Phase 8 oracle", oracle.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE8_ORACLE_PROOF_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE8_ORACLE_PROOF_SCHEMA_VERSION,
    ok: oracle.ok === true,
    oracle,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase8OracleProofSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
