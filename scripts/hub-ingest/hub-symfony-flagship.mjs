#!/usr/bin/env node
/**
 * Symfony 10-route flagship smoke (G118): ingest, gold, OpenAPI export.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportPhpHubWebir } from "./hub-php-hub-webir.mjs";
import { exportProjectOpenApi } from "./hub-cwl-openapi-export.mjs";
import { symfonyRouteManifestParity } from "./hub-symfony-routes.mjs";

export const HUB_SYMFONY_FLAGSHIP_KIND = "chrysalis.hub.symfony-flagship";
export const HUB_SYMFONY_FLAGSHIP_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-flagship-symfony");
const goldVerifyScript = join(scriptRoot, "scripts/hub-ingest/hub-gold-verify.mjs");
const traceReplayScript = join(scriptRoot, "scripts/hub-ingest/hub-gold-trace-replay.mjs");

function runJson(script, args) {
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  return { status: r.status ?? 1, stdout: r.stdout, stderr: r.stderr };
}

const prefixProbeFixture = join(scriptRoot, "fixtures/hub-symfony-attr-prefix");
const methodsProbeFixture = join(scriptRoot, "fixtures/hub-symfony-attr-methods");

async function main() {
  let routesParity = { ok: false, reason: "not-run" };
  try {
    routesParity = symfonyRouteManifestParity(fixture);
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

  const phpExport = await exportPhpHubWebir(fixture);
  const ingestOk = phpExport.ok === true;
  const routeCount = phpExport.routeCount ?? null;
  const holeCount = phpExport.holeCount ?? null;

  const honoGold = runJson(goldVerifyScript, ["--suite", "symfony-flagship-hono"]);
  const trace = runJson(traceReplayScript, ["--suite", "symfony-flagship-hono"]);

  let openapiExport = null;
  try {
    openapiExport = await exportProjectOpenApi(fixture, { origin: "php" });
  } catch {
    openapiExport = { ok: false, reason: "openapi-export-failed" };
  }

  const report = {
    kind: HUB_SYMFONY_FLAGSHIP_KIND,
    schemaVersion: HUB_SYMFONY_FLAGSHIP_SCHEMA_VERSION,
    ok:
      routesParity.ok === true &&
      attributePrefixProbe.ok === true &&
      attributeMethodsProbe.ok === true &&
      ingestOk &&
      honoGold.status === 0 &&
      trace.status === 0 &&
      openapiExport?.ok === true &&
      existsSync(openapiExport.openapiPath ?? ""),
    fixture: "fixtures/hub-flagship-symfony",
    routesParity,
    attributePrefixProbe,
    attributeMethodsProbe,
    ingest: { ok: ingestOk, routeCount, holeCount },
    cwlProjection: phpExport.cwlProjection ?? null,
    gold: { hono: honoGold.status === 0 },
    traceReplay: { hono: trace.status === 0 },
    openapi: openapiExport,
    generatedAt: new Date().toISOString(),
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
