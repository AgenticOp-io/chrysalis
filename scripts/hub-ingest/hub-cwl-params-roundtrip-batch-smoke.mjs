#!/usr/bin/env node
/** CWL path + query params roundtrip batch smoke (G301). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlPathParamsRoundtripSmoke } from "./hub-cwl-path-params-roundtrip-smoke.mjs";
import { runCwlQueryParamsRoundtripSmoke } from "./hub-cwl-query-params-roundtrip-smoke.mjs";

export const HUB_CWL_PARAMS_ROUNDTRIP_BATCH_KIND = "chrysalis.hub.cwl-params-roundtrip-batch-smoke";
export const HUB_CWL_PARAMS_ROUNDTRIP_BATCH_SCHEMA_VERSION = 1;

export async function runCwlParamsRoundtripBatchSmoke() {
  const pathParams = await runCwlPathParamsRoundtripSmoke();
  const queryParams = await runCwlQueryParamsRoundtripSmoke();
  return {
    kind: HUB_CWL_PARAMS_ROUNDTRIP_BATCH_KIND,
    schemaVersion: HUB_CWL_PARAMS_ROUNDTRIP_BATCH_SCHEMA_VERSION,
    ok: pathParams.ok === true && queryParams.ok === true,
    pathParams,
    queryParams,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlParamsRoundtripBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
