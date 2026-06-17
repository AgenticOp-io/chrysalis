#!/usr/bin/env node
/** IR helper oracle twin verify smoke — sql-same-twin + sql-case-twin (G2293 v2). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runLiftHelperSqlSameTwinOracleVerify } from "../verify-lift-helper-sql-same-twin-oracle.mjs";
import { runLiftHelperSqlCaseTwinOracleVerify } from "../verify-lift-helper-sql-case-twin-oracle.mjs";

export const HUB_IR_HELPER_LIFTING_ORACLE_TWIN_KIND = "chrysalis.hub.ir-helper-lifting-oracle-twin-smoke";
export const HUB_IR_HELPER_LIFTING_ORACLE_TWIN_SCHEMA_VERSION = 2;

function verifyOk(report) {
  return report.ok === true || report.skip === "no-php";
}

export async function runIrHelperLiftingOracleTwinSmoke() {
  const sameTwin = await runLiftHelperSqlSameTwinOracleVerify({ capture: true });
  const caseTwin = await runLiftHelperSqlCaseTwinOracleVerify({ capture: true });
  const ok = verifyOk(sameTwin) && verifyOk(caseTwin);
  return {
    kind: HUB_IR_HELPER_LIFTING_ORACLE_TWIN_KIND,
    schemaVersion: HUB_IR_HELPER_LIFTING_ORACLE_TWIN_SCHEMA_VERSION,
    ok,
    fixtures: [
      { id: "sql-same-twin", fixture: "fixtures/lift-helper-sql-same-twin", verify: sameTwin },
      { id: "sql-case-twin", fixture: "fixtures/lift-helper-sql-case-twin", verify: caseTwin },
    ],
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
