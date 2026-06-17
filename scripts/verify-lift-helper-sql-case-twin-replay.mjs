#!/usr/bin/env node
/**
 * B5.5 v3 emit HTTP replay verify for sql-case-twin.
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LIFT_HELPER_SQL_CASE_TWIN_REPLAY_CONFIG,
  runLiftHelperSqlTwinReplayVerify,
} from "./lift-helper-sql-twin-replay-core.mjs";

export const LIFT_HELPER_SQL_CASE_TWIN_REPLAY_KIND = LIFT_HELPER_SQL_CASE_TWIN_REPLAY_CONFIG.kind;
export const LIFT_HELPER_SQL_CASE_TWIN_REPLAY_SCHEMA_VERSION =
  LIFT_HELPER_SQL_CASE_TWIN_REPLAY_CONFIG.schemaVersion;

export async function runLiftHelperSqlCaseTwinReplayVerify(opts = {}) {
  return runLiftHelperSqlTwinReplayVerify(LIFT_HELPER_SQL_CASE_TWIN_REPLAY_CONFIG, opts);
}

async function main() {
  const report = await runLiftHelperSqlCaseTwinReplayVerify();
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
