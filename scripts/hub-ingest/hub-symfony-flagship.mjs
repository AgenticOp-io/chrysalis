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

function runEmitParitySuites(suitePrefix) {
  /** @type {Record<string, boolean>} */
  const gold = {};
  /** @type {Record<string, boolean>} */
  const traceReplay = {};
  let emitParityOk = true;
  for (const target of ["hono", "fastify"]) {
    const suite = `${suitePrefix}-${target}`;
    const g = runJson(goldVerifyScript, ["--suite", suite]);
    const tr = runJson(traceReplayScript, ["--suite", suite]);
    gold[target] = g.status === 0;
    traceReplay[target] = tr.status === 0;
    if (g.status !== 0 || tr.status !== 0) emitParityOk = false;
  }
  return { gold, traceReplay, emitParityOk };
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

  const emitParity = runEmitParitySuites("symfony-flagship");

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
    emitParity: { ok: emitParity.emitParityOk, targets: ["hono", "fastify"] },
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
