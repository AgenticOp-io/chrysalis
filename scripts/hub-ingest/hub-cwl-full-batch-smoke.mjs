#!/usr/bin/env node
/** CWL full batch: params + roundtrip + multi + interchange (G339). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlParamsBatchSmoke } from "./hub-cwl-params-batch-smoke.mjs";
import { runCwlParamsRoundtripBatchSmoke } from "./hub-cwl-params-roundtrip-batch-smoke.mjs";
import { runCwlMultiBatchSmoke } from "./hub-cwl-multi-batch-smoke.mjs";
import { runCwlInterchangeBatchSmoke } from "./hub-cwl-interchange-batch-smoke.mjs";

export const HUB_CWL_FULL_BATCH_KIND = "chrysalis.hub.cwl-full-batch-smoke";
export const HUB_CWL_FULL_BATCH_SCHEMA_VERSION = 1;

export async function runCwlFullBatchSmoke() {
  const params = await runCwlParamsBatchSmoke();
  const paramsRoundtrip = await runCwlParamsRoundtripBatchSmoke();
  const multi = await runCwlMultiBatchSmoke();
  const interchange = await runCwlInterchangeBatchSmoke();
  return {
    kind: HUB_CWL_FULL_BATCH_KIND,
    schemaVersion: HUB_CWL_FULL_BATCH_SCHEMA_VERSION,
    ok: params.ok && paramsRoundtrip.ok && multi.ok && interchange.ok,
    params,
    paramsRoundtrip,
    multi,
    interchange,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlFullBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
