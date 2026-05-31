#!/usr/bin/env node
/** CWL path + query params runtime batch smoke (G275). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlPathParamsSmoke } from "./hub-cwl-path-params-smoke.mjs";
import { runCwlQueryParamsSmoke } from "./hub-cwl-query-params-smoke.mjs";

export const HUB_CWL_PARAMS_BATCH_SMOKE_KIND = "chrysalis.hub.cwl-params-batch-smoke";
export const HUB_CWL_PARAMS_BATCH_SMOKE_SCHEMA_VERSION = 1;

export async function runCwlParamsBatchSmoke() {
  const pathParams = await runCwlPathParamsSmoke();
  const queryParams = await runCwlQueryParamsSmoke();
  return {
    kind: HUB_CWL_PARAMS_BATCH_SMOKE_KIND,
    schemaVersion: HUB_CWL_PARAMS_BATCH_SMOKE_SCHEMA_VERSION,
    ok: pathParams.ok === true && queryParams.ok === true,
    pathParams,
    queryParams,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlParamsBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.pathParams?.skip && !report.queryParams?.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
