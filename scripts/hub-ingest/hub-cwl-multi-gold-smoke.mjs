#!/usr/bin/env node
/** CWL RFC-0009 multi-file module gold smoke (G264). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlGoldRuntimeSmoke } from "./hub-cwl-gold-runtime-smoke.mjs";
import { resolveCwlModuleFromPath } from "./cwl-module-graph.mjs";

export const HUB_CWL_MULTI_GOLD_SMOKE_KIND = "chrysalis.hub.cwl-multi-gold-smoke";
export const HUB_CWL_MULTI_GOLD_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SUITE_IDS = ["cwl-multi-gold-hono"];

export async function runCwlMultiGoldSmoke(opts = {}) {
  const fixtureDir = resolve(opts.fixture ?? join(scriptRoot, "fixtures/hub-gold-cwl-multi"));
  const parsed = resolveCwlModuleFromPath(join(fixtureDir, "routes.cwl"));
  const report = await runCwlGoldRuntimeSmoke({
    kind: HUB_CWL_MULTI_GOLD_SMOKE_KIND,
    schemaVersion: HUB_CWL_MULTI_GOLD_SMOKE_SCHEMA_VERSION,
    fixtureRel: "fixtures/hub-gold-cwl-multi",
    rfc: "CWL-RFC-0009",
    suiteIds: SUITE_IDS,
    fixtureDir,
    projectionOk: (p) => p.holeFree === p.total && p.total >= 3,
  });
  return {
    ...report,
    imports: parsed.imports ?? [],
    moduleRouteCount: parsed.routes?.length ?? null,
  };
}

async function main() {
  const report = await runCwlMultiGoldSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
