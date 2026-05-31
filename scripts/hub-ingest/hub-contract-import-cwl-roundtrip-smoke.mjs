#!/usr/bin/env node
/** OpenAPI + HAR contract import → migration.cwl → CWL re-lift route-surface roundtrip (G591). */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportProjectMigrationCwlFromContractOrWebir } from "./hub-contract-cwl-import.mjs";

export const HUB_CONTRACT_IMPORT_CWL_ROUNDTRIP_KIND = "chrysalis.hub.contract-import-cwl-roundtrip-smoke";
export const HUB_CONTRACT_IMPORT_CWL_ROUNDTRIP_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");
const openapiFixture = join(scriptRoot, "fixtures/hub-gold-openapi-cwl");
const harFixture = join(scriptRoot, "fixtures/hub-gold-har-cwl");

function parseLiftJson(stdout) {
  const text = (stdout ?? "").trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return {};
      }
    }
  }
  return {};
}

/**
 * @param {string} projectDir
 * @param {{ source: string, fixture: string, minRoutes?: number }} base
 */
async function roundtripContractImport(projectDir, base) {
  const meta = await exportProjectMigrationCwlFromContractOrWebir(projectDir, { origin: "cwl" });
  const exportedRoutes = meta.routeCount ?? 0;
  const minRoutes = base.minRoutes ?? 1;
  const exportOk = meta.ok === true && meta.source === base.source && exportedRoutes >= minRoutes;
  if (!exportOk) {
    return {
      ...base,
      ok: false,
      skip: meta.ok ? "unexpected-source" : "import-failed",
      exportedRoutes,
      exportSource: meta.source ?? null,
      exportHoleCount: meta.holeCount ?? null,
    };
  }
  const lift = spawnSync(
    process.execPath,
    [liftScript, join(projectDir, ".chrysalis"), "--language", "cwl"],
    { cwd: scriptRoot, encoding: "utf8" },
  );
  const liftReport = parseLiftJson(lift.stdout);
  const roundRoutes = liftReport.routeCount ?? 0;
  const roundOk = lift.status === 0 && roundRoutes === exportedRoutes;
  return {
    ...base,
    ok: roundOk,
    exportedRoutes,
    roundRoutes,
    roundHoleCount: liftReport.holeCount ?? null,
    exportHoleCount: meta.holeCount ?? null,
  };
}

export async function runOpenApiImportCwlRoundtripSmoke() {
  const base = {
    source: "openapi-import",
    fixture: "fixtures/hub-gold-openapi-cwl",
    minRoutes: 7,
  };
  if (!existsSync(join(openapiFixture, "openapi.json"))) {
    return { ...base, ok: false, skip: "missing-openapi" };
  }
  const tmp = mkdtempSync(join(tmpdir(), "chrysalis-openapi-cwl-rt-"));
  try {
    cpSync(openapiFixture, tmp, { recursive: true });
    return await roundtripContractImport(tmp, base);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export async function runHarImportCwlRoundtripSmoke() {
  const base = {
    source: "har-import",
    fixture: "fixtures/hub-gold-har-cwl",
    minRoutes: 1,
  };
  const harPath = join(harFixture, "mini.har.json");
  if (!existsSync(harPath)) {
    return { ...base, ok: false, skip: "missing-har" };
  }
  const tmp = mkdtempSync(join(tmpdir(), "chrysalis-har-cwl-rt-"));
  try {
    writeFileSync(join(tmp, "mini.har.json"), readFileSync(harPath, "utf8"));
    return await roundtripContractImport(tmp, base);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export async function runContractImportCwlRoundtripSmoke() {
  const openapi = await runOpenApiImportCwlRoundtripSmoke();
  const har = await runHarImportCwlRoundtripSmoke();
  return {
    kind: HUB_CONTRACT_IMPORT_CWL_ROUNDTRIP_KIND,
    schemaVersion: HUB_CONTRACT_IMPORT_CWL_ROUNDTRIP_SCHEMA_VERSION,
    ok: openapi.ok === true && har.ok === true,
    openapi,
    har,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runContractImportCwlRoundtripSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.openapi?.skip && !report.har?.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
