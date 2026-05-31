#!/usr/bin/env node
/** CWL mega batch: all RFC roundtrip + full batch (G365). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAllRfcRoundtripSmoke } from "./hub-cwl-all-rfc-roundtrip-smoke.mjs";
import { runCwlFullBatchSmoke } from "./hub-cwl-full-batch-smoke.mjs";

export const HUB_CWL_MEGA_BATCH_KIND = "chrysalis.hub.cwl-mega-batch-smoke";
export const HUB_CWL_MEGA_BATCH_SCHEMA_VERSION = 1;

export async function runCwlMegaBatchSmoke() {
  const allRfc = await runCwlAllRfcRoundtripSmoke();
  const full = await runCwlFullBatchSmoke();
  return {
    kind: HUB_CWL_MEGA_BATCH_KIND,
    schemaVersion: HUB_CWL_MEGA_BATCH_SCHEMA_VERSION,
    ok: allRfc.ok === true && full.ok === true,
    allRfc,
    full,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlMegaBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
