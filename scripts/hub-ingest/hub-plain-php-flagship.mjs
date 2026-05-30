#!/usr/bin/env node
/**
 * Plain PHP 10-route flagship smoke (G116): ingest, gold, OpenAPI export.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportPhpHubWebir } from "./hub-php-hub-webir.mjs";
import { exportProjectOpenApi } from "./hub-cwl-openapi-export.mjs";

export const HUB_PLAIN_PHP_FLAGSHIP_KIND = "chrysalis.hub.plain-php-flagship";
export const HUB_PLAIN_PHP_FLAGSHIP_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-flagship-plain-php");
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
  for (const target of ["hono", "fastify", "nextjs"]) {
    const suite = `${suitePrefix}-${target}`;
    const g = runJson(goldVerifyScript, ["--suite", suite]);
    const tr = runJson(traceReplayScript, ["--suite", suite]);
    gold[target] = g.status === 0;
    traceReplay[target] = tr.status === 0;
    if (g.status !== 0 || tr.status !== 0) emitParityOk = false;
  }
  return { gold, traceReplay, emitParityOk };
}

async function main() {
  const phpExport = await exportPhpHubWebir(fixture);
  const ingestOk = phpExport.ok === true;
  const routeCount = phpExport.routeCount ?? null;
  const holeCount = phpExport.holeCount ?? null;

  const emitParity = runEmitParitySuites("plain-php-flagship");

  let openapiExport = null;
  try {
    openapiExport = await exportProjectOpenApi(fixture, { origin: "php" });
  } catch {
    openapiExport = { ok: false, reason: "openapi-export-failed" };
  }

  const report = {
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
    emitParity: { ok: emitParity.emitParityOk, targets: ["hono", "fastify", "nextjs"] },
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
