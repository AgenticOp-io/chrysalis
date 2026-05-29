#!/usr/bin/env node
/**
 * Express 10-route flagship smoke (G110): lift, optional gold, OpenAPI export.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { exportProjectOpenApi } from "./hub-cwl-openapi-export.mjs";

export const HUB_EXPRESS_FLAGSHIP_KIND = "chrysalis.hub.express-flagship";
// v2: surfaces `cwlProjection` (G136) so completion/ci-gates can enforce a
// hole-free CWL projection for the JavaScript-origin flagship, matching PHP.
export const HUB_EXPRESS_FLAGSHIP_SCHEMA_VERSION = 2;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-flagship-express");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");
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

async function main() {
  const lift = runJson(liftScript, [fixture, "--language", "javascript"]);
  let liftOk = false;
  let routeCount = null;
  let holeCount = null;
  if (lift.status === 0) {
    try {
      const report = JSON.parse(lift.stdout.trim().split("\n").pop() ?? "{}");
      routeCount = report.routeCount ?? null;
      holeCount = report.holeCount ?? null;
      liftOk = report.holeCount === 0 && report.routeCount === 20;
    } catch {
      liftOk = false;
    }
  }

  let cwlProjection = null;
  const webirPath = join(fixture, ".chrysalis", "hub.javascript.webir.json");
  if (existsSync(webirPath)) {
    try {
      const { summarizeCwlProjection } = await import(
        pathToFileURL(join(scriptRoot, "scripts/hub-ingest/hub-webir-routes.mjs")).href
      );
      const webir = await import(
        pathToFileURL(join(scriptRoot, "packages/webir/dist/index.js")).href
      );
      const raw = JSON.parse(readFileSync(webirPath, "utf8"));
      cwlProjection = summarizeCwlProjection(webir.moduleFromGoldenSnapshot(raw));
    } catch {
      cwlProjection = null;
    }
  }

  const honoGold = runJson(goldVerifyScript, ["--suite", "express-flagship-hono"]);
  const trace = runJson(traceReplayScript, ["--suite", "express-flagship-hono"]);

  let openapiExport = null;
  try {
    openapiExport = await exportProjectOpenApi(fixture, { origin: "javascript" });
  } catch {
    openapiExport = { ok: false, reason: "openapi-export-failed" };
  }

  const report = {
    kind: HUB_EXPRESS_FLAGSHIP_KIND,
    schemaVersion: HUB_EXPRESS_FLAGSHIP_SCHEMA_VERSION,
    ok:
      liftOk &&
      honoGold.status === 0 &&
      trace.status === 0 &&
      openapiExport?.ok === true &&
      existsSync(openapiExport.openapiPath ?? ""),
    fixture: "fixtures/hub-flagship-express",
    lift: { ok: liftOk, routeCount, holeCount },
    cwlProjection,
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
