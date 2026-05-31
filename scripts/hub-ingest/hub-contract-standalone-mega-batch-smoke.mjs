#!/usr/bin/env node
/** Contract standalone mega batch: contract CWL + contract roundtrip (G416). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runContractCwlStandaloneSmoke } from "./hub-contract-cwl-standalone-smoke.mjs";
import { runContractRoundtripStandaloneSmoke } from "./hub-contract-roundtrip-standalone-smoke.mjs";

export const HUB_CONTRACT_STANDALONE_MEGA_BATCH_KIND = "chrysalis.hub.contract-standalone-mega-batch-smoke";
export const HUB_CONTRACT_STANDALONE_MEGA_BATCH_SCHEMA_VERSION = 1;

export async function runContractStandaloneMegaBatchSmoke() {
  const contractCwl = await runContractCwlStandaloneSmoke();
  const contractRoundtrip = await runContractRoundtripStandaloneSmoke();
  return {
    kind: HUB_CONTRACT_STANDALONE_MEGA_BATCH_KIND,
    schemaVersion: HUB_CONTRACT_STANDALONE_MEGA_BATCH_SCHEMA_VERSION,
    ok: contractCwl.ok && contractRoundtrip.ok,
    contractCwl,
    contractRoundtrip,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runContractStandaloneMegaBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
