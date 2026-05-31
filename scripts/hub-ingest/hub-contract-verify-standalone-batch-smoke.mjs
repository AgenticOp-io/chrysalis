#!/usr/bin/env node
/** Contract + verify gaps standalone batch (G398). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runContractCwlStandaloneSmoke } from "./hub-contract-cwl-standalone-smoke.mjs";
import { runVerifyGapsIngestActionStandaloneSmoke } from "./hub-verify-gaps-ingest-action-standalone-smoke.mjs";

export const HUB_CONTRACT_VERIFY_STANDALONE_BATCH_KIND = "chrysalis.hub.contract-verify-standalone-batch-smoke";
export const HUB_CONTRACT_VERIFY_STANDALONE_BATCH_SCHEMA_VERSION = 1;

export async function runContractVerifyStandaloneBatchSmoke() {
  const contractCwl = await runContractCwlStandaloneSmoke();
  const verifyGapsAction = runVerifyGapsIngestActionStandaloneSmoke();
  return {
    kind: HUB_CONTRACT_VERIFY_STANDALONE_BATCH_KIND,
    schemaVersion: HUB_CONTRACT_VERIFY_STANDALONE_BATCH_SCHEMA_VERSION,
    ok: contractCwl.ok && verifyGapsAction.ok,
    contractCwl,
    verifyGapsAction,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runContractVerifyStandaloneBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
