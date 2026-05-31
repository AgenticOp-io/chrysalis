#!/usr/bin/env node
/** Oracle standalone mega batch (G354). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runNodeExpressOracleStandaloneSmoke } from "./hub-node-express-oracle-standalone-smoke.mjs";
import { runWptpGoldStandaloneSmoke } from "./hub-wptp-gold-standalone-smoke.mjs";
import { runContractRoundtripStandaloneSmoke } from "./hub-contract-roundtrip-standalone-smoke.mjs";
import { runVerifyPlaybooksStandaloneSmoke } from "./hub-verify-playbooks-standalone-smoke.mjs";
import { runPostTranslateVerifyStandaloneSmoke } from "./hub-post-translate-verify-standalone-smoke.mjs";

export const HUB_ORACLE_STANDALONE_BATCH_KIND = "chrysalis.hub.oracle-standalone-batch-smoke";
export const HUB_ORACLE_STANDALONE_BATCH_SCHEMA_VERSION = 1;

export async function runOracleStandaloneBatchSmoke() {
  const nodeExpressOracle = await runNodeExpressOracleStandaloneSmoke();
  const wptpGold = runWptpGoldStandaloneSmoke();
  const contractRoundtrip = await runContractRoundtripStandaloneSmoke();
  const verifyPlaybooks = runVerifyPlaybooksStandaloneSmoke();
  const postTranslateVerify = await runPostTranslateVerifyStandaloneSmoke();
  return {
    kind: HUB_ORACLE_STANDALONE_BATCH_KIND,
    schemaVersion: HUB_ORACLE_STANDALONE_BATCH_SCHEMA_VERSION,
    ok:
      nodeExpressOracle.ok &&
      wptpGold.ok &&
      contractRoundtrip.ok &&
      verifyPlaybooks.ok &&
      postTranslateVerify.ok,
    nodeExpressOracle,
    wptpGold,
    contractRoundtrip,
    verifyPlaybooks,
    postTranslateVerify,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runOracleStandaloneBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
