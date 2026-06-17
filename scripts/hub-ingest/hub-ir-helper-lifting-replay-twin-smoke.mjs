#!/usr/bin/env node
/** IR helper emit replay twin smoke — sql-same-twin + sql-case-twin (G2303). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runLiftHelperSqlSameTwinReplayVerify } from "../verify-lift-helper-sql-same-twin-replay.mjs";
import { runLiftHelperSqlCaseTwinReplayVerify } from "../verify-lift-helper-sql-case-twin-replay.mjs";

export const HUB_IR_HELPER_LIFTING_REPLAY_TWIN_KIND = "chrysalis.hub.ir-helper-lifting-replay-twin-smoke";
export const HUB_IR_HELPER_LIFTING_REPLAY_TWIN_SCHEMA_VERSION = 1;

function verifyOk(report) {
  return report.ok === true || report.skip === "no-php";
}

export async function runIrHelperLiftingReplayTwinSmoke() {
  const sameTwin = await runLiftHelperSqlSameTwinReplayVerify({ capture: true });
  const caseTwin = await runLiftHelperSqlCaseTwinReplayVerify({ capture: true });
  const ok = verifyOk(sameTwin) && verifyOk(caseTwin);
  return {
    kind: HUB_IR_HELPER_LIFTING_REPLAY_TWIN_KIND,
    schemaVersion: HUB_IR_HELPER_LIFTING_REPLAY_TWIN_SCHEMA_VERSION,
    ok,
    fixtures: [
      { id: "sql-same-twin", fixture: "fixtures/lift-helper-sql-same-twin", verify: sameTwin },
      { id: "sql-case-twin", fixture: "fixtures/lift-helper-sql-case-twin", verify: caseTwin },
    ],
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runIrHelperLiftingReplayTwinSmoke();
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
