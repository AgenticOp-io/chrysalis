#!/usr/bin/env node
/** CWL multi gold + roundtrip batch smoke (G302). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlMultiGoldSmoke } from "./hub-cwl-multi-gold-smoke.mjs";
import { runCwlMultiRoundtripSmoke } from "./hub-cwl-multi-roundtrip-smoke.mjs";

export const HUB_CWL_MULTI_BATCH_KIND = "chrysalis.hub.cwl-multi-batch-smoke";
export const HUB_CWL_MULTI_BATCH_SCHEMA_VERSION = 1;

export async function runCwlMultiBatchSmoke() {
  const gold = await runCwlMultiGoldSmoke();
  const roundtrip = await runCwlMultiRoundtripSmoke();
  return {
    kind: HUB_CWL_MULTI_BATCH_KIND,
    schemaVersion: HUB_CWL_MULTI_BATCH_SCHEMA_VERSION,
    ok: gold.ok === true && roundtrip.ok === true,
    gold,
    roundtrip,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlMultiBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.gold?.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
