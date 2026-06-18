#!/usr/bin/env node
/**
 * STRATEGIC-PLAN §12 Month 2–3 — Node/Express oracle origin depth (G5710–G5713).
 * See docs/NODE-EXPRESS-ORACLE-ORIGIN-PLAN.md.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanMonth23ExpressOracleGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_MONTH23_EXPRESS_ORACLE_KIND =
  "chrysalis.hub.strategic-plan-month23-express-oracle-smoke";
export const HUB_STRATEGIC_PLAN_MONTH23_EXPRESS_ORACLE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** @param {{ skipOracleVerify?: boolean }} [opts] */
export async function runStrategicPlanMonth23ExpressOracleSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-month23");
  const t0 = progress.start("express oracle origin");
  const express = await runStrategicPlanMonth23ExpressOracleGate(opts);
  progress.end("express oracle origin", express.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_MONTH23_EXPRESS_ORACLE_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_MONTH23_EXPRESS_ORACLE_SCHEMA_VERSION,
    ok: express.ok === true,
    express,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanMonth23ExpressOracleSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
