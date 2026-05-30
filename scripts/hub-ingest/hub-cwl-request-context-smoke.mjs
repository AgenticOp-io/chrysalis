#!/usr/bin/env node
/** CWL RFC-0004 request context runtime smoke (G202). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlGoldRuntimeSmoke } from "./hub-cwl-gold-runtime-smoke.mjs";

export const HUB_CWL_REQUEST_CONTEXT_SMOKE_KIND = "chrysalis.hub.cwl-request-context-smoke";
export const HUB_CWL_REQUEST_CONTEXT_SMOKE_SCHEMA_VERSION = 1;

const SUITE_IDS = ["cwl-request-context-hono", "cwl-request-context-fastify", "cwl-request-context-nextjs"];

export async function runCwlRequestContextSmoke(opts = {}) {
  return runCwlGoldRuntimeSmoke({
    kind: HUB_CWL_REQUEST_CONTEXT_SMOKE_KIND,
    schemaVersion: HUB_CWL_REQUEST_CONTEXT_SMOKE_SCHEMA_VERSION,
    fixtureRel: "fixtures/hub-gold-cwl-request-context",
    rfc: "CWL-RFC-0004",
    suiteIds: SUITE_IDS,
    fixtureDir: opts.fixture,
    projectionOk: (p) =>
      p.holeFree === p.total &&
      p.total >= 2 &&
      (p.withHeaderParams ?? 0) >= 1 &&
      (p.withCookieParams ?? 0) >= 1,
  });
}

async function main() {
  const report = await runCwlRequestContextSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
