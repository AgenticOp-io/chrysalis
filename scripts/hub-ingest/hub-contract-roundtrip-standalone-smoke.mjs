#!/usr/bin/env node
/** Contract roundtrip standalone smoke (G336). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runContractRoundtripSmoke } from "./hub-contract-roundtrip-smoke.mjs";

export const HUB_CONTRACT_ROUNDTRIP_STANDALONE_KIND = "chrysalis.hub.contract-roundtrip-standalone-smoke";
export const HUB_CONTRACT_ROUNDTRIP_STANDALONE_SCHEMA_VERSION = 1;

export async function runContractRoundtripStandaloneSmoke() {
  const roundtrip = await runContractRoundtripSmoke();
  return {
    kind: HUB_CONTRACT_ROUNDTRIP_STANDALONE_KIND,
    schemaVersion: HUB_CONTRACT_ROUNDTRIP_STANDALONE_SCHEMA_VERSION,
    ok: roundtrip.ok === true,
    openapi: roundtrip.openapi ?? null,
    har: roundtrip.har ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runContractRoundtripStandaloneSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
