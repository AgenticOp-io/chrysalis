#!/usr/bin/env node
/** IR helper oracle twin verify smoke — sql-same-twin B5.3 v5 (G2293). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runLiftHelperSqlSameTwinOracleVerify } from "../verify-lift-helper-sql-same-twin-oracle.mjs";

export const HUB_IR_HELPER_LIFTING_ORACLE_TWIN_KIND = "chrysalis.hub.ir-helper-lifting-oracle-twin-smoke";
export const HUB_IR_HELPER_LIFTING_ORACLE_TWIN_SCHEMA_VERSION = 1;

export async function runIrHelperLiftingOracleTwinSmoke() {
  const report = await runLiftHelperSqlSameTwinOracleVerify({ capture: true });
  return {
    kind: HUB_IR_HELPER_LIFTING_ORACLE_TWIN_KIND,
    schemaVersion: HUB_IR_HELPER_LIFTING_ORACLE_TWIN_SCHEMA_VERSION,
    ok: report.ok === true || report.skip === "no-php",
    fixture: "fixtures/lift-helper-sql-same-twin",
    verify: report,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runIrHelperLiftingOracleTwinSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
