#!/usr/bin/env node
/** Verify standalone mega batch: playbooks + post-translate verify + node express oracle (G415). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runVerifyPlaybooksStandaloneSmoke } from "./hub-verify-playbooks-standalone-smoke.mjs";
import { runPostTranslateVerifyStandaloneSmoke } from "./hub-post-translate-verify-standalone-smoke.mjs";
import { runNodeExpressOracleStandaloneSmoke } from "./hub-node-express-oracle-standalone-smoke.mjs";

export const HUB_VERIFY_STANDALONE_MEGA_BATCH_KIND = "chrysalis.hub.verify-standalone-mega-batch-smoke";
export const HUB_VERIFY_STANDALONE_MEGA_BATCH_SCHEMA_VERSION = 1;

export async function runVerifyStandaloneMegaBatchSmoke() {
  const playbooks = runVerifyPlaybooksStandaloneSmoke();
  const postTranslateVerify = await runPostTranslateVerifyStandaloneSmoke();
  const nodeExpressOracle = await runNodeExpressOracleStandaloneSmoke();
  return {
    kind: HUB_VERIFY_STANDALONE_MEGA_BATCH_KIND,
    schemaVersion: HUB_VERIFY_STANDALONE_MEGA_BATCH_SCHEMA_VERSION,
    ok:
      playbooks.ok &&
      (postTranslateVerify.ok === true || postTranslateVerify.skip != null) &&
      (nodeExpressOracle.ok === true || nodeExpressOracle.skip != null),
    playbooks,
    postTranslateVerify,
    nodeExpressOracle,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runVerifyStandaloneMegaBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
