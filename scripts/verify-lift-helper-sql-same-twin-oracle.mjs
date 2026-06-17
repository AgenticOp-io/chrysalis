#!/usr/bin/env node
/**
 * B5.3 v5 oracle twin verify: capture /alpha + /beta, assert identical bodies + SQL,
 * then confirm semantic helper-lift aliases the lib twins.
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LIFT_HELPER_SQL_SAME_TWIN_ORACLE_CONFIG,
  runLiftHelperSqlTwinOracleVerify,
} from "./lift-helper-sql-twin-oracle-core.mjs";

export const LIFT_HELPER_SQL_SAME_TWIN_ORACLE_KIND = LIFT_HELPER_SQL_SAME_TWIN_ORACLE_CONFIG.kind;
export const LIFT_HELPER_SQL_SAME_TWIN_ORACLE_SCHEMA_VERSION =
  LIFT_HELPER_SQL_SAME_TWIN_ORACLE_CONFIG.schemaVersion;

export async function runLiftHelperSqlSameTwinOracleVerify(opts = {}) {
  return runLiftHelperSqlTwinOracleVerify(LIFT_HELPER_SQL_SAME_TWIN_ORACLE_CONFIG, opts);
}

async function main() {
  const report = await runLiftHelperSqlSameTwinOracleVerify();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && report.skip !== "no-php") process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
