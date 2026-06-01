#!/usr/bin/env node
/**
 * CWL full-stack @page emit round-trip smoke (G1146).
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlRoundtripSmoke } from "./hub-cwl-roundtrip-smoke.mjs";

export const HUB_CWL_FULLSTACK_ROUNDTRIP_SMOKE_KIND = "chrysalis.hub.cwl-fullstack-roundtrip-smoke";
export const HUB_CWL_FULLSTACK_ROUNDTRIP_SMOKE_SCHEMA_VERSION = 1;

export async function runCwlFullstackRoundtripSmoke(opts = {}) {
  const report = await runCwlRoundtripSmoke({
    fixtureRel: "fixtures/hub-gold-cwl-fullstack",
    fixtureDir: opts.fixtureDir,
    rfc: "CWL-RFC-0010",
    moduleName: "fullstack",
    header: "# CWL full-stack round-trip",
    projectionOk: (p) => p.holeFree === p.total && p.total >= 2,
  });
  return {
    kind: HUB_CWL_FULLSTACK_ROUNDTRIP_SMOKE_KIND,
    schemaVersion: HUB_CWL_FULLSTACK_ROUNDTRIP_SMOKE_SCHEMA_VERSION,
    ...report,
  };
}

async function main() {
  const report = await runCwlFullstackRoundtripSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
