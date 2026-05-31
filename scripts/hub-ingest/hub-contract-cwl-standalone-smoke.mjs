#!/usr/bin/env node
/** Contract CWL standalone smoke wrapper (G367). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runContractCwlSmoke } from "./hub-contract-cwl-smoke.mjs";

export const HUB_CONTRACT_CWL_STANDALONE_KIND = "chrysalis.hub.contract-cwl-standalone-smoke";
export const HUB_CONTRACT_CWL_STANDALONE_SCHEMA_VERSION = 1;

export async function runContractCwlStandaloneSmoke() {
  const contract = await runContractCwlSmoke();
  return {
    kind: HUB_CONTRACT_CWL_STANDALONE_KIND,
    schemaVersion: HUB_CONTRACT_CWL_STANDALONE_SCHEMA_VERSION,
    ok: contract.ok === true,
    openapiImport: contract.openapiImport ?? null,
    webirProjection: contract.webirProjection ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runContractCwlStandaloneSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
