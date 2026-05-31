#!/usr/bin/env node
/**
 * Symfony 10-route flagship smoke (G118): ingest, gold, OpenAPI export.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportPhpHubWebir } from "./hub-php-hub-webir.mjs";
import { exportProjectOpenApi } from "./hub-cwl-openapi-export.mjs";
import { symfonyRouteManifestParity } from "./hub-symfony-routes.mjs";
import { runFlagshipEmitParity } from "./hub-flagship-emit-parity.mjs";

export const HUB_SYMFONY_FLAGSHIP_KIND = "chrysalis.hub.symfony-flagship";
export const HUB_SYMFONY_FLAGSHIP_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-flagship-symfony");
const prefixProbeFixture = join(scriptRoot, "fixtures/hub-symfony-attr-prefix");
const methodsProbeFixture = join(scriptRoot, "fixtures/hub-symfony-attr-methods");

export async function runSymfonyFlagshipSmoke(projectDir = fixture) {
  const root = resolve(projectDir);

  let routesParity = { ok: false, reason: "not-run" };
  try {
    routesParity = symfonyRouteManifestParity(root);
  } catch (e) {
    routesParity = { ok: false, reason: "parity-threw", detail: String(e?.message ?? e) };
  }

  let attributePrefixProbe = { ok: false, reason: "not-run" };
  try {
    attributePrefixProbe = symfonyRouteManifestParity(prefixProbeFixture);
  } catch (e) {
    attributePrefixProbe = { ok: false, reason: "prefix-probe-threw", detail: String(e?.message ?? e) };
  }

  let attributeMethodsProbe = { ok: false, reason: "not-run" };
  try {
    attributeMethodsProbe = symfonyRouteManifestParity(methodsProbeFixture);
  } catch (e) {
    attributeMethodsProbe = { ok: false, reason: "methods-probe-threw", detail: String(e?.message ?? e) };
  }

  const phpExport = await exportPhpHubWebir(root);
  const ingestOk = phpExport.ok === true;
  const routeCount = phpExport.routeCount ?? null;
  const holeCount = phpExport.holeCount ?? null;

  const emitParity = await runFlagshipEmitParity("symfony-flagship");

  let openapiExport = null;
  try {
    openapiExport = await exportProjectOpenApi(root, { origin: "php" });
  } catch {
    openapiExport = { ok: false, reason: "openapi-export-failed" };
  }

  return {
    kind: HUB_SYMFONY_FLAGSHIP_KIND,
    schemaVersion: HUB_SYMFONY_FLAGSHIP_SCHEMA_VERSION,
    ok:
      routesParity.ok === true &&
      attributePrefixProbe.ok === true &&
      attributeMethodsProbe.ok === true &&
      ingestOk &&
      emitParity.emitParityOk &&
      openapiExport?.ok === true &&
      existsSync(openapiExport.openapiPath ?? ""),
    fixture: "fixtures/hub-flagship-symfony",
    routesParity,
    attributePrefixProbe,
    attributeMethodsProbe,
    ingest: { ok: ingestOk, routeCount, holeCount },
    cwlProjection: phpExport.cwlProjection ?? null,
    gold: emitParity.gold,
    traceReplay: emitParity.traceReplay,
    emitParity: { ok: emitParity.emitParityOk, targets: emitParity.targets },
    openapi: openapiExport,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSymfonyFlagshipSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
