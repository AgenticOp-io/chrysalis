#!/usr/bin/env node
/** All CWL RFC round-trip batch including body + status + params + multi (G243/G276). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  runCwlRequestContextRoundtripSmoke,
  runCwlResponseContentTypeRoundtripSmoke,
  runCwlAuthEffectsRoundtripSmoke,
} from "./hub-cwl-rfc-roundtrip-smoke.mjs";
import { runCwlRoundtripSmoke } from "./hub-cwl-roundtrip-smoke.mjs";
import { runCwlPathParamsRoundtripSmoke } from "./hub-cwl-path-params-roundtrip-smoke.mjs";
import { runCwlQueryParamsRoundtripSmoke } from "./hub-cwl-query-params-roundtrip-smoke.mjs";
import { runCwlMultiRoundtripSmoke } from "./hub-cwl-multi-roundtrip-smoke.mjs";

export const HUB_CWL_ALL_RFC_ROUNDTRIP_SMOKE_KIND = "chrysalis.hub.cwl-all-rfc-roundtrip-smoke";
export const HUB_CWL_ALL_RFC_ROUNDTRIP_SMOKE_SCHEMA_VERSION = 2;

export async function runCwlStatusRoundtripSmoke() {
  return runCwlRoundtripSmoke({
    fixtureRel: "fixtures/hub-gold-cwl-response-status",
    rfc: "CWL-RFC-0006",
    moduleName: "response_status",
    header: "# CWL response status gold (RFC-0006)",
    projectionOk: (p) => p.holeFree === p.total && (p.withStatus ?? 0) >= 2,
  });
}

export async function runCwlBodyRoundtripDedicatedSmoke() {
  return runCwlRoundtripSmoke({
    fixtureRel: "fixtures/hub-gold-cwl-request-body",
    rfc: "CWL-RFC-0005",
    moduleName: "request_body",
    header: "# CWL request body gold (RFC-0005)",
    projectionOk: (p) => p.holeFree === p.total && (p.withBodyParams ?? 0) >= 2,
  });
}

export async function runCwlAllRfcRoundtripSmoke() {
  const reports = {
    requestContext: await runCwlRequestContextRoundtripSmoke(),
    responseContentType: await runCwlResponseContentTypeRoundtripSmoke(),
    authEffects: await runCwlAuthEffectsRoundtripSmoke(),
    requestBody: await runCwlBodyRoundtripDedicatedSmoke(),
    responseStatus: await runCwlStatusRoundtripSmoke(),
    pathParams: await runCwlPathParamsRoundtripSmoke(),
    queryParams: await runCwlQueryParamsRoundtripSmoke(),
    multiModule: await runCwlMultiRoundtripSmoke(),
  };
  const ok = Object.values(reports).every((r) => r.ok === true);
  return {
    kind: HUB_CWL_ALL_RFC_ROUNDTRIP_SMOKE_KIND,
    schemaVersion: HUB_CWL_ALL_RFC_ROUNDTRIP_SMOKE_SCHEMA_VERSION,
    ok,
    reports,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAllRfcRoundtripSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
