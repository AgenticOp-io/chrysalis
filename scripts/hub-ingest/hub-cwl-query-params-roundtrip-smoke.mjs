#!/usr/bin/env node
/** CWL RFC-0003 query-parameter roundtrip smoke (G274). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlRoundtripSmoke } from "./hub-cwl-roundtrip-smoke.mjs";

export const HUB_CWL_QUERY_PARAMS_ROUNDTRIP_SMOKE_KIND = "chrysalis.hub.cwl-query-params-roundtrip-smoke";
export const HUB_CWL_QUERY_PARAMS_ROUNDTRIP_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlQueryParamsRoundtripSmoke() {
  return runCwlRoundtripSmoke({
    fixtureRel: "fixtures/hub-gold-cwl-query-params",
    rfc: "CWL-RFC-0003",
    moduleName: "query_params",
    header: "# CWL query params gold (RFC-0003)",
    projectionOk: (p) => p.holeFree === p.total && p.total >= 2 && (p.withParams ?? 0) >= 2,
    fixtureDir: join(scriptRoot, "fixtures/hub-gold-cwl-query-params"),
  });
}

async function main() {
  const report = await runCwlQueryParamsRoundtripSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
