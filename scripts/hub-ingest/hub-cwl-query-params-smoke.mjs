#!/usr/bin/env node
/** CWL RFC-0003 query-parameter runtime smoke (G263). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlGoldRuntimeSmoke } from "./hub-cwl-gold-runtime-smoke.mjs";

export const HUB_CWL_QUERY_PARAMS_SMOKE_KIND = "chrysalis.hub.cwl-query-params-smoke";
export const HUB_CWL_QUERY_PARAMS_SMOKE_SCHEMA_VERSION = 1;

const SUITE_IDS = ["cwl-query-params-hono", "cwl-query-params-fastify", "cwl-query-params-nextjs"];

export async function runCwlQueryParamsSmoke(opts = {}) {
  return runCwlGoldRuntimeSmoke({
    kind: HUB_CWL_QUERY_PARAMS_SMOKE_KIND,
    schemaVersion: HUB_CWL_QUERY_PARAMS_SMOKE_SCHEMA_VERSION,
    fixtureRel: "fixtures/hub-gold-cwl-query-params",
    rfc: "CWL-RFC-0003",
    suiteIds: SUITE_IDS,
    fixtureDir: opts.fixture,
    projectionOk: (p) => p.holeFree === p.total && p.total >= 2 && (p.withParams ?? 0) >= 2,
  });
}

async function main() {
  const report = await runCwlQueryParamsSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
