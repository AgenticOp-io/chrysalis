#!/usr/bin/env node
/**
 * Plain PHP 10-route flagship smoke (G116): ingest, gold, OpenAPI export.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportPhpHubWebir } from "./hub-php-hub-webir.mjs";
import { exportProjectOpenApi } from "./hub-cwl-openapi-export.mjs";
import { runFlagshipEmitParity } from "./hub-flagship-emit-parity.mjs";

export const HUB_PLAIN_PHP_FLAGSHIP_KIND = "chrysalis.hub.plain-php-flagship";
export const HUB_PLAIN_PHP_FLAGSHIP_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-flagship-plain-php");

export async function runPlainPhpFlagshipSmoke(projectDir = fixture) {
  const root = resolve(projectDir);
  const phpExport = await exportPhpHubWebir(root);
  const ingestOk = phpExport.ok === true;
  const routeCount = phpExport.routeCount ?? null;
  const holeCount = phpExport.holeCount ?? null;

  const emitParity = await runFlagshipEmitParity("plain-php-flagship");

  let openapiExport = null;
  try {
    openapiExport = await exportProjectOpenApi(root, { origin: "php" });
  } catch {
    openapiExport = { ok: false, reason: "openapi-export-failed" };
  }

  return {
    kind: HUB_PLAIN_PHP_FLAGSHIP_KIND,
    schemaVersion: HUB_PLAIN_PHP_FLAGSHIP_SCHEMA_VERSION,
    ok:
      ingestOk &&
      emitParity.emitParityOk &&
      openapiExport?.ok === true &&
      existsSync(openapiExport.openapiPath ?? ""),
    fixture: "fixtures/hub-flagship-plain-php",
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
  const report = await runPlainPhpFlagshipSmoke();
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
