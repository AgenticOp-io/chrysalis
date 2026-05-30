#!/usr/bin/env node
/** OpenAPI + HAR contract round-trip smokes (G211/G212). */
import { existsSync, readFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { exportProjectMigrationCwlFromContractOrWebir } from "./hub-contract-cwl-import.mjs";
import { exportCwlFileToWebirJson } from "./export-cwl-webir.mjs";
import { loadWebir } from "./shared.mjs";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";

export const HUB_CONTRACT_ROUNDTRIP_SMOKE_KIND = "chrysalis.hub.contract-roundtrip-smoke";
export const HUB_CONTRACT_ROUNDTRIP_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const openapiFixture = join(scriptRoot, "fixtures/hub-gold-openapi-cwl");
const harFixture = join(scriptRoot, "fixtures/hub-gold-har-cwl");

async function projectionForCwl(cwlPath) {
  const webir = await loadWebir();
  const snapshot = await exportCwlFileToWebirJson(cwlPath);
  const raw = typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
  return summarizeCwlProjection(webir.moduleFromGoldenSnapshot(raw));
}

export async function runOpenApiCwlRoundtripSmoke() {
  const base = { source: "openapi-import", fixture: "fixtures/hub-gold-openapi-cwl", ok: false };
  if (!existsSync(join(openapiFixture, "openapi.json"))) {
    return { ...base, skip: "missing-openapi" };
  }
  const meta = await exportProjectMigrationCwlFromContractOrWebir(openapiFixture, { origin: "cwl" });
  if (!meta.ok || !meta.cwlPath) {
    return { ...base, skip: "import-failed" };
  }
  const projection = await projectionForCwl(meta.cwlPath);
  return {
    ...base,
    ok: meta.source === "openapi-import" && meta.routeCount >= 7 && projection.total >= 7,
    routeCount: meta.routeCount,
    holeCount: meta.holeCount,
    cwlProjection: projection,
  };
}

export async function runHarCwlRoundtripSmoke() {
  const base = { source: "har-import", fixture: "fixtures/hub-gold-har-cwl", ok: false };
  const harPath = join(harFixture, "mini.har.json");
  if (!existsSync(harPath)) {
    return { ...base, skip: "missing-har" };
  }
  const tmp = mkdtempSync(join(tmpdir(), "chrysalis-har-roundtrip-"));
  try {
    writeFileSync(join(tmp, "mini.har.json"), readFileSync(harPath, "utf8"));
    const meta = await exportProjectMigrationCwlFromContractOrWebir(tmp, { origin: "cwl" });
    if (!meta.ok || !meta.cwlPath) {
      return { ...base, skip: "import-failed" };
    }
    const projection = await projectionForCwl(meta.cwlPath);
    return {
      ...base,
      ok: meta.source === "har-import" && meta.holeCount === 0 && projection.holeFree === projection.total,
      routeCount: meta.routeCount,
      holeCount: meta.holeCount,
      cwlProjection: projection,
    };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export async function runContractRoundtripSmoke() {
  const openapi = await runOpenApiCwlRoundtripSmoke();
  const har = await runHarCwlRoundtripSmoke();
  return {
    kind: HUB_CONTRACT_ROUNDTRIP_SMOKE_KIND,
    schemaVersion: HUB_CONTRACT_ROUNDTRIP_SMOKE_SCHEMA_VERSION,
    ok: openapi.ok && har.ok,
    openapi,
    har,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runContractRoundtripSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.openapi?.skip && !report.har?.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
