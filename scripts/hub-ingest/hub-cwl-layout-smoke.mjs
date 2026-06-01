#!/usr/bin/env node
/**
 * CWL RFC-0011 layout + page params smoke (G1145).
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCwlModuleResolved } from "./cwl-module-graph.mjs";
import { runCwlRoundtripSmoke } from "./hub-cwl-roundtrip-smoke.mjs";

export const HUB_CWL_LAYOUT_SMOKE_KIND = "chrysalis.hub.cwl-layout-smoke";
export const HUB_CWL_LAYOUT_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const goldFixture = join(scriptRoot, "fixtures/hub-gold-cwl-layout");

export async function runCwlLayoutSmoke(opts = {}) {
  const fixture = resolve(opts.fixture ?? goldFixture);
  const cwlPath = join(fixture, "routes.cwl");
  const base = {
    kind: HUB_CWL_LAYOUT_SMOKE_KIND,
    schemaVersion: HUB_CWL_LAYOUT_SMOKE_SCHEMA_VERSION,
    fixture: "fixtures/hub-gold-cwl-layout",
    rfc: "CWL-RFC-0011",
    ok: false,
  };
  if (!existsSync(cwlPath)) {
    return { ...base, skip: "missing-routes-cwl" };
  }

  const parsed = parseCwlModuleResolved(await readFile(cwlPath, "utf8"), "routes.cwl", { baseDir: fixture });
  const pageRoutes = parsed.routes.filter((r) => r.surfaceKind === "page");
  const withParams = pageRoutes.filter((r) => (r.handlerPathParams?.length ?? 0) > 0);
  const imported = (parsed.imports?.length ?? 0) > 0;
  const roundtrip = await runCwlRoundtripSmoke({
    fixtureRel: "fixtures/hub-gold-cwl-layout",
    rfc: "CWL-RFC-0011",
    moduleName: "docs",
    projectionOk: (p) => p.holeFree === p.total && p.total >= 3,
  });

  const ok = imported && withParams.length >= 1 && pageRoutes.length >= 1 && roundtrip.ok === true;
  return {
    ...base,
    ok,
    routeCount: parsed.routes.length,
    pageCount: pageRoutes.length,
    imports: parsed.imports ?? [],
    roundtrip,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlLayoutSmoke();
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
