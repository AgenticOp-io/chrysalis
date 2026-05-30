#!/usr/bin/env node
/** CWL RFC-0008 response content-type runtime smoke (G204). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlGoldRuntimeSmoke } from "./hub-cwl-gold-runtime-smoke.mjs";

export const HUB_CWL_RESPONSE_CONTENT_TYPE_SMOKE_KIND = "chrysalis.hub.cwl-response-content-type-smoke";
export const HUB_CWL_RESPONSE_CONTENT_TYPE_SMOKE_SCHEMA_VERSION = 1;

const SUITE_IDS = [
  "cwl-response-content-type-hono",
  "cwl-response-content-type-fastify",
  "cwl-response-content-type-nextjs",
];

export async function runCwlResponseContentTypeSmoke(opts = {}) {
  return runCwlGoldRuntimeSmoke({
    kind: HUB_CWL_RESPONSE_CONTENT_TYPE_SMOKE_KIND,
    schemaVersion: HUB_CWL_RESPONSE_CONTENT_TYPE_SMOKE_SCHEMA_VERSION,
    fixtureRel: "fixtures/hub-gold-cwl-response-content-type",
    rfc: "CWL-RFC-0008",
    suiteIds: SUITE_IDS,
    fixtureDir: opts.fixture,
    projectionOk: (p) => p.holeFree === p.total && p.total >= 3 && (p.withContentType ?? 0) >= 3,
  });
}

async function main() {
  const report = await runCwlResponseContentTypeSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
