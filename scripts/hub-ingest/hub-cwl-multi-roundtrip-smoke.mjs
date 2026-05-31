#!/usr/bin/env node
/** CWL RFC-0009 multi-file roundtrip smoke (G265). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlRoundtripSmoke } from "./hub-cwl-roundtrip-smoke.mjs";
import { resolveCwlModuleFromPath } from "./cwl-module-graph.mjs";

export const HUB_CWL_MULTI_ROUNDTRIP_SMOKE_KIND = "chrysalis.hub.cwl-multi-roundtrip-smoke";
export const HUB_CWL_MULTI_ROUNDTRIP_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlMultiRoundtripSmoke() {
  const fixtureDir = join(scriptRoot, "fixtures/hub-gold-cwl-multi");
  const parsed = resolveCwlModuleFromPath(join(fixtureDir, "routes.cwl"));
  const report = await runCwlRoundtripSmoke({
    fixtureRel: "fixtures/hub-gold-cwl-multi",
    rfc: "CWL-RFC-0009",
    moduleName: "multi_gold",
    header: "# CWL multi-file gold (RFC-0009)",
    projectionOk: (p) => p.holeFree === p.total && p.total >= 3,
    fixtureDir,
  });
  return {
    kind: HUB_CWL_MULTI_ROUNDTRIP_SMOKE_KIND,
    schemaVersion: HUB_CWL_MULTI_ROUNDTRIP_SMOKE_SCHEMA_VERSION,
    ...report,
    imports: parsed.imports ?? [],
  };
}

async function main() {
  const report = await runCwlMultiRoundtripSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
