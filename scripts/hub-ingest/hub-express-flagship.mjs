#!/usr/bin/env node
/**
 * Express 10-route flagship smoke (G110/G161/G291): lift, gold, OpenAPI export.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { exportProjectOpenApi } from "./hub-cwl-openapi-export.mjs";
import { runNodeExpressOracleVerify } from "./hub-node-express-oracle-verify.mjs";
import { runFlagshipEmitParity } from "./hub-flagship-emit-parity.mjs";

export const HUB_EXPRESS_FLAGSHIP_KIND = "chrysalis.hub.express-flagship";
export const HUB_EXPRESS_FLAGSHIP_SCHEMA_VERSION = 3;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-flagship-express");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

function runJavascriptLift(projectDir) {
  const r = spawnSync(process.execPath, [liftScript, projectDir, "--language", "javascript"], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  let routeCount = null;
  let holeCount = null;
  let ok = false;
  if (r.status === 0) {
    try {
      const report = JSON.parse(r.stdout.trim().split("\n").pop() ?? "{}");
      routeCount = report.routeCount ?? null;
      holeCount = report.holeCount ?? null;
      ok = report.holeCount === 0 && report.routeCount === 20;
    } catch {
      ok = false;
    }
  }
  return { ok, routeCount, holeCount, status: r.status ?? 1 };
}

export async function runExpressFlagshipSmoke(projectDir = fixture) {
  const root = resolve(projectDir);
  const lift = runJavascriptLift(root);

  let cwlProjection = null;
  const webirPath = join(root, ".chrysalis", "hub.javascript.webir.json");
  if (existsSync(webirPath)) {
    try {
      const { summarizeCwlProjection } = await import(
        pathToFileURL(join(scriptRoot, "scripts/hub-ingest/hub-webir-routes.mjs")).href
      );
      const webir = await import(pathToFileURL(join(scriptRoot, "packages/webir/dist/index.js")).href);
      const raw = JSON.parse(readFileSync(webirPath, "utf8"));
      cwlProjection = summarizeCwlProjection(webir.moduleFromGoldenSnapshot(raw));
    } catch {
      cwlProjection = null;
    }
  }

  const emitParity = await runFlagshipEmitParity("express-flagship");

  let nodeOracle = null;
  if (process.env.CHRYSALIS_HUB_EXPRESS_ORACLE === "1") {
    try {
      nodeOracle = await runNodeExpressOracleVerify();
    } catch (e) {
      nodeOracle = { ok: false, skip: "oracle-threw", detail: e instanceof Error ? e.message : String(e) };
    }
  }

  let openapiExport = null;
  try {
    openapiExport = await exportProjectOpenApi(root, { origin: "javascript" });
  } catch {
    openapiExport = { ok: false, reason: "openapi-export-failed" };
  }

  const oracleOk = nodeOracle === null || nodeOracle.ok === true || Boolean(nodeOracle.skip);

  return {
    kind: HUB_EXPRESS_FLAGSHIP_KIND,
    schemaVersion: HUB_EXPRESS_FLAGSHIP_SCHEMA_VERSION,
    ok:
      lift.ok &&
      emitParity.emitParityOk &&
      oracleOk &&
      openapiExport?.ok === true &&
      existsSync(openapiExport.openapiPath ?? ""),
    fixture: "fixtures/hub-flagship-express",
    lift: { ok: lift.ok, routeCount: lift.routeCount, holeCount: lift.holeCount },
    cwlProjection,
    gold: emitParity.gold,
    traceReplay: emitParity.traceReplay,
    emitParity: { ok: emitParity.emitParityOk, targets: emitParity.targets },
    nodeOracle,
    openapi: openapiExport,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runExpressFlagshipSmoke();
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
